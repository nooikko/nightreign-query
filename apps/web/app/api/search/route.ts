/**
 * Search API Route
 *
 * POST /api/search
 *
 * Performs hybrid semantic + keyword search using the @nightreign/database
 * search service. Supports both JSON and streaming responses.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import {
  type HybridSearchQuery,
  type HybridSearchResponse,
  embedQuery,
  getHybridSearch,
  getQueryEmbedder,
} from '@nightreign/database'
import type {
  ContentChunk,
  ContentType,
  SearchQuery,
  SearchResult,
  SearchTiming,
} from '@nightreign/types'

/**
 * Valid ContentType values for runtime validation
 */
const VALID_CONTENT_TYPES = new Set<ContentType>([
  'boss',
  'weapon',
  'relic',
  'nightfarer',
  'skill',
  'talisman',
  'spell',
  'armor',
  'shield',
  'enemy',
  'npc',
  'merchant',
  'location',
  'expedition',
  'guide',
])

/**
 * Validate and return a ContentType, falling back to 'guide' for invalid values
 *
 * This prevents type corruption from propagating through the system if
 * invalid data enters the Orama index or database.
 */
function validateContentType(type: unknown): ContentType {
  if (typeof type === 'string' && VALID_CONTENT_TYPES.has(type as ContentType)) {
    return type as ContentType
  }
  // Fall back to 'guide' as a safe default for unknown types
  // This allows the system to continue functioning while logging can catch issues
  console.warn(`Invalid ContentType encountered: ${String(type)}, falling back to 'guide'`)
  return 'guide'
}
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createStreamingCompletion, isGroqAvailable } from '../../../lib/groq'
import {
  PerformanceTimer,
  generateRequestId,
  logSearchError,
  logSearchPerformance,
} from '../../../lib/logger'
import {
  buildPrompt,
  detectQueryType,
  formatResultsAsContext,
} from '../../../lib/templates'

/**
 * Zod schema for validating SearchQuery
 */
const SearchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Query must not be empty')
    .max(500, 'Query must be less than 500 characters'),
  filters: z
    .object({
      type: z
        .array(
          z.enum([
            'boss',
            'weapon',
            'relic',
            'nightfarer',
            'skill',
            'talisman',
            'spell',
            'armor',
            'shield',
            'enemy',
            'npc',
            'merchant',
            'location',
            'expedition',
            'guide',
          ]),
        )
        .optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
  format: z.boolean().optional().default(false),
}) satisfies z.ZodType<SearchQuery>
/**
 * Format search results using AI (placeholder for Claude integration)
 *
 * For now, returns a simple formatted string. In the future, this could
 * integrate with Anthropic's Claude API to generate natural language
 * summaries of the search results.
 */
function formatResults(results: ContentChunk[], query: string): string {
  if (results.length === 0) {
    return `No results found for "${query}".`
  }

  const topResults = results.slice(0, 3)
  const summary = topResults
    .map(
      (chunk, i) =>
        `${i + 1}. **${chunk.name}** (${chunk.type})\n   ${chunk.section}: ${chunk.content.substring(0, 150)}...`,
    )
    .join('\n\n')

  return `Found ${results.length} results for "${query}":\n\n${summary}\n\n${
    results.length > 3 ? `...and ${results.length - 3} more results.` : ''
  }`
}

/**
 * Add CORS headers to a response if the origin is allowed
 */
function addCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  const allowedOrigin = getAllowedOrigin(origin)
  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  }
  return response
}

/**
 * POST /api/search
 *
 * Performs hybrid search and returns results as JSON or streaming response.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const timer = new PerformanceTimer()
  let embeddingSuccess = true
  let searchMode: 'hybrid' | 'vector' | 'fulltext' = 'fulltext'
  let resultCount = 0
  let queryText = ''
  const origin = request.headers.get('origin')

  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = SearchQuerySchema.safeParse(body)

    if (!validationResult.success) {
      logSearchError({
        requestId,
        error: 'Validation failed',
        phase: 'validation',
      })
      return addCorsHeaders(
        NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.issues.map((e: z.ZodIssue) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 },
        ),
        origin,
      )
    }

    const searchQuery: SearchQuery = validationResult.data
    queryText = searchQuery.query

    // Initialize search service and embedder
    const hybridSearch = getHybridSearch()
    const embedder = getQueryEmbedder()

    // Ensure services are initialized
    await Promise.all([hybridSearch.initialize(), embedder.initialize()])

    // Generate query embedding
    timer.start('embedding')
    let queryEmbedding: number[] | undefined

    try {
      queryEmbedding = await embedQuery(searchQuery.query)
      timer.end('embedding')
    } catch (error) {
      timer.end('embedding')
      embeddingSuccess = false
      logSearchError({
        requestId,
        error:
          error instanceof Error ? error.message : 'Unknown embedding error',
        phase: 'embedding',
        stack: error instanceof Error ? error.stack : undefined,
      })
      // Fall back to text-only search if embedding fails
      queryEmbedding = undefined
    }

    // Build hybrid search query
    // Spread readonly array to mutable (Zod returns readonly, HybridSearchQuery expects mutable)
    const hybridQuery: HybridSearchQuery = {
      query: searchQuery.query,
      embedding: queryEmbedding,
      types: searchQuery.filters?.type ? [...searchQuery.filters.type] : undefined,
      limit: searchQuery.limit,
    }

    // Execute search
    timer.start('search')
    const hybridResponse = await hybridSearch.search(hybridQuery)
    timer.end('search')

    searchMode = hybridResponse.mode
    resultCount = hybridResponse.count

    // Transform results once - reuse for both JSON and formatted responses
    const searchResults: ContentChunk[] = hybridResponse.results.map((r) => ({
      id: r.id,
      type: validateContentType(r.type),
      name: r.name,
      section: r.section,
      content: r.content,
      tags: r.tags,
      score: r.score,
    }))

    // Handle non-formatted response (JSON)
    if (!searchQuery.format) {
      const timing: SearchTiming = {
        embedding: timer.getDuration('embedding'),
        search: timer.getDuration('search'),
        total: timer.getTotal(),
      }

      // Log performance data
      logSearchPerformance({
        requestId,
        query: queryText,
        mode: searchMode,
        resultCount,
        timing: {
          embedding: timing.embedding,
          search: timing.search,
          total: timing.total,
        },
        embeddingSuccess,
        formatRequested: false,
      })

      const result: SearchResult = {
        results: searchResults,
        timing,
      }
      const response = NextResponse.json(result, {
        headers: {
          'Content-Type': 'application/json',
          'X-Search-Mode': hybridResponse.mode,
          'X-Total-Time': timing.total.toString(),
          'X-Request-Id': requestId,
        },
      })
      return addCorsHeaders(response, origin)
    }

    // Handle formatted response (streaming with Groq LLM)
    timer.start('format')

    // Check if Groq is available
    const useGroq = isGroqAvailable()

    // Detect query type and build prompt
    const queryType = detectQueryType(searchResults.map((r) => r.type))
    const context = formatResultsAsContext(searchResults)
    const { systemPrompt, userMessage } = buildPrompt(
      searchQuery.query,
      context,
      queryType,
    )

    // For streaming, we'll use Server-Sent Events (SSE)
    // Create an AbortController to handle client disconnection
    const abortController = new AbortController()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial timing data (before LLM response)
          const initialTiming: SearchTiming = {
            embedding: timer.getDuration('embedding'),
            search: timer.getDuration('search'),
            total: timer.getTotal(),
          }
          const timingData = `data: ${JSON.stringify({ type: 'timing', timing: initialTiming })}\n\n`
          controller.enqueue(encoder.encode(timingData))

          if (useGroq && searchResults.length > 0) {
            // Stream from Groq LLM with abort signal for cancellation
            const groqStream = createStreamingCompletion({
              systemPrompt,
              userMessage,
              maxTokens: 200,
              temperature: 0.7,
              signal: abortController.signal,
            })

            let firstChunkReceived = false
            for await (const chunk of groqStream) {
              // Check if we've been aborted
              if (abortController.signal.aborted) {
                break
              }
              if (!firstChunkReceived) {
                firstChunkReceived = true
                timer.end('format')
              }
              const eventData = `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`
              controller.enqueue(encoder.encode(eventData))
            }

            if (!firstChunkReceived) {
              timer.end('format')
            }
          } else {
            // Fallback to simple formatting if Groq is unavailable
            const formatted = formatResults(searchResults, searchQuery.query)
            timer.end('format')

            // Send formatted text in chunks using substring (more efficient than split/join)
            const CHUNK_SIZE = 80 // ~10 words average
            for (let i = 0; i < formatted.length; i += CHUNK_SIZE) {
              if (abortController.signal.aborted) {
                break
              }
              const chunk = formatted.slice(i, i + CHUNK_SIZE)
              const eventData = `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`
              controller.enqueue(encoder.encode(eventData))
            }
          }

          // Only send final events if not aborted
          if (!abortController.signal.aborted) {
            // Send final timing update
            const finalTiming: SearchTiming = {
              embedding: timer.getDuration('embedding'),
              search: timer.getDuration('search'),
              format: timer.getDuration('format'),
              total: timer.getTotal(),
            }

            // Log performance data
            logSearchPerformance({
              requestId,
              query: queryText,
              mode: searchMode,
              resultCount,
              timing: {
                embedding: finalTiming.embedding,
                search: finalTiming.search,
                format: finalTiming.format,
                total: finalTiming.total,
              },
              embeddingSuccess,
              formatRequested: true,
            })

            // Send completion event with final timing
            const doneData = `data: ${JSON.stringify({ type: 'done', timing: finalTiming })}\n\n`
            controller.enqueue(encoder.encode(doneData))
          }

          controller.close()
        } catch (error) {
          // Don't log abort errors as they're expected on client disconnect
          if (error instanceof Error && error.message === 'Request aborted') {
            controller.close()
            return
          }

          logSearchError({
            requestId,
            error: error instanceof Error ? error.message : 'Stream error',
            phase: 'format',
            stack: error instanceof Error ? error.stack : undefined,
          })

          // Send error event to client (only if not aborted)
          if (!abortController.signal.aborted) {
            const errorData = `data: ${JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Stream error',
            })}\n\n`
            controller.enqueue(encoder.encode(errorData))
          }

          controller.close()
        }
      },
      cancel() {
        // Called when the client disconnects
        // This triggers the abort signal which stops the Groq stream
        abortController.abort()
      },
    })

    const streamResponse = new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Search-Mode': hybridResponse.mode,
        'X-Request-Id': requestId,
        'X-Format-Provider': useGroq ? 'groq' : 'fallback',
      },
    })
    return addCorsHeaders(streamResponse, origin)
  } catch (error) {
    // Handle specific error types
    if (error instanceof SyntaxError) {
      logSearchError({
        requestId,
        error: 'Invalid JSON',
        phase: 'validation',
      })
      return addCorsHeaders(
        NextResponse.json(
          {
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON',
          },
          { status: 400 },
        ),
        origin,
      )
    }

    if (error instanceof Error && error.message.includes('embedding')) {
      logSearchError({
        requestId,
        error: error.message,
        phase: 'embedding',
        stack: error.stack,
      })
      return addCorsHeaders(
        NextResponse.json(
          {
            error: 'Embedding service unavailable',
            message:
              'The embedding model is not available. Please try again or use text-only search.',
            details: error.message,
          },
          { status: 503 },
        ),
        origin,
      )
    }

    // Log generic server error
    logSearchError({
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      phase: 'unknown',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return addCorsHeaders(
      NextResponse.json(
        {
          error: 'Internal server error',
          message:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        },
        { status: 500 },
      ),
      origin,
    )
  }
}

/**
 * Cached allowed origins - computed once at module load, not per-request
 * This eliminates repeated string splitting in the hot path
 */
const CACHED_ALLOWED_ORIGINS: Set<string> = new Set([
  ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
  // Always include localhost in development
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:3001']
    : []),
])

/** Default origin for CORS (first configured origin) */
const DEFAULT_ORIGIN = process.env.ALLOWED_ORIGINS?.split(',')[0] || ''

/**
 * Get allowed CORS origin based on environment
 * Uses cached Set for O(1) lookup instead of O(n) array.includes()
 */
function getAllowedOrigin(requestOrigin: string | null): string {
  // Fast Set lookup instead of array parsing + includes
  if (requestOrigin && CACHED_ALLOWED_ORIGINS.has(requestOrigin)) {
    return requestOrigin
  }
  return DEFAULT_ORIGIN
}

/**
 * OPTIONS /api/search
 *
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigin = getAllowedOrigin(origin)

  // Only set CORS headers if origin is allowed
  if (!allowedOrigin) {
    return new NextResponse(null, { status: 204 })
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
