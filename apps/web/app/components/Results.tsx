'use client'

import type {
  ContentChunk,
  SearchResult,
  SearchTiming,
} from '@nightreign/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ResultCard } from './ResultCard'

/**
 * SSE event types from the streaming API
 */
type SSEEventType = 'timing' | 'chunk' | 'done' | 'error'

/**
 * Base SSE event structure
 */
interface SSEEvent {
  readonly type: SSEEventType
}

/**
 * Timing event with performance metrics
 */
interface TimingEvent extends SSEEvent {
  readonly type: 'timing'
  readonly timing: SearchTiming
}

/**
 * Text chunk event for streaming formatted responses
 */
interface ChunkEvent extends SSEEvent {
  readonly type: 'chunk'
  readonly content: string
}

/**
 * Completion event
 */
interface DoneEvent extends SSEEvent {
  readonly type: 'done'
}

/**
 * Error event
 */
interface ErrorEvent extends SSEEvent {
  readonly type: 'error'
  readonly error: string
}

/**
 * Union type for all SSE events
 */
type StreamEvent = TimingEvent | ChunkEvent | DoneEvent | ErrorEvent

/**
 * Props for the Results component
 */
interface ResultsProps {
  /**
   * Search results to display (for non-streaming mode)
   */
  readonly results?: SearchResult

  /**
   * Whether the current search is in formatted/streaming mode
   */
  readonly isFormatted?: boolean

  /**
   * Current search query (used for streaming requests)
   */
  readonly query?: string

  /**
   * Content type filter (used for streaming requests)
   */
  readonly typeFilter?: string

  /**
   * Loading state
   */
  readonly isLoading?: boolean

  /**
   * Error state
   */
  readonly error?: Error

  /**
   * Callback to retry the search
   */
  readonly onRetry?: () => void
}

/**
 * Results Component
 *
 * A client component that displays search results with support for both:
 * 1. Raw result cards (format=false): Displays ContentChunk cards
 * 2. Streaming formatted responses (format=true): Renders markdown via SSE
 *
 * Features:
 * - Server-Sent Events (SSE) streaming for formatted responses
 * - Markdown rendering with syntax highlighting
 * - Raw result cards with type categorization
 * - Performance timing display
 * - Empty state handling
 * - Error state with retry option
 * - Loading states
 * - Dark theme gaming aesthetic
 *
 * SSE Event Flow:
 * 1. `timing` event - Initial performance metrics
 * 2. `chunk` events - Incremental text chunks (formatted mode only)
 * 3. `done` event - Stream completion
 * 4. `error` event - Error occurred
 *
 * @example
 * ```tsx
 * <Results
 *   results={searchResults}
 *   isFormatted={false}
 *   isLoading={false}
 *   error={undefined}
 *   onRetry={() => handleRetry()}
 * />
 * ```
 */
export function Results({
  results,
  isFormatted = false,
  query,
  typeFilter,
  isLoading = false,
  error,
  onRetry,
}: ResultsProps) {
  // Streaming state
  const [streamedContent, setStreamedContent] = useState<string>('')
  const [streamTiming, setStreamTiming] = useState<SearchTiming | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Handles SSE streaming for formatted responses
   */
  const startStreaming = useCallback(
    async (searchQuery: string, searchTypeFilter?: string) => {
      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Reset state
      setStreamedContent('')
      setStreamTiming(null)
      setStreamError(null)
      setIsStreaming(true)

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Track consecutive parse errors to detect stream corruption
      let parseErrorCount = 0
      const MAX_PARSE_ERRORS = 3

      // Stream timeout: abort if no data received for 30 seconds
      const STREAM_TIMEOUT_MS = 30000
      let timeoutId: NodeJS.Timeout | null = null

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          abortController.abort()
          setStreamError('Stream timed out. The server may be unresponsive.')
          setIsStreaming(false)
        }, STREAM_TIMEOUT_MS)
      }

      try {
        // Build request body for POST
        const requestBody = {
          query: searchQuery,
          format: true,
          filters: searchTypeFilter ? { type: [searchTypeFilter] } : undefined,
        }

        // Start the timeout before making the request
        resetTimeout()

        // Use POST method to match API handler
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Stream failed with status ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Response body is not readable')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        // Read stream
        while (true) {
          const { done, value } = await reader.read()

          // Reset timeout on each chunk received (server is responsive)
          resetTimeout()

          if (done) {
            break
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true })

          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) {
              continue
            }

            try {
              const eventData = JSON.parse(line.slice(6)) as StreamEvent
              // Reset error count on successful parse
              parseErrorCount = 0

              switch (eventData.type) {
                case 'timing':
                  setStreamTiming(eventData.timing)
                  break

                case 'chunk':
                  setStreamedContent((prev) => prev + eventData.content)
                  break

                case 'done':
                  setIsStreaming(false)
                  break

                case 'error':
                  setStreamError(eventData.error)
                  setIsStreaming(false)
                  break
              }
            } catch (parseError) {
              parseErrorCount++
              console.error('Failed to parse SSE event:', parseError, { line })

              // If too many consecutive parse errors, abort the stream
              if (parseErrorCount >= MAX_PARSE_ERRORS) {
                setStreamError(
                  'Stream data corrupted. Please retry your search.',
                )
                setIsStreaming(false)
                reader.cancel()
                return
              }
            }
          }
        }

        // Clear timeout when stream completes successfully
        if (timeoutId) clearTimeout(timeoutId)
        setIsStreaming(false)
      } catch (err) {
        // Clear timeout on any error
        if (timeoutId) clearTimeout(timeoutId)

        // Ignore abort errors (they're intentional, including timeout aborts)
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Stream failed'
        setStreamError(errorMessage)
        setIsStreaming(false)
      }
    },
    [],
  )

  /**
   * Start streaming when component mounts with formatted mode
   */
  useEffect(() => {
    if (isFormatted && query && !results) {
      startStreaming(query, typeFilter)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isFormatted, query, typeFilter, results, startStreaming])

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <output className="flex flex-col items-center justify-center py-16 space-y-4">
        <svg
          className="animate-spin h-10 w-10 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-muted-foreground" aria-live="polite">
          Searching...
        </p>
      </output>
    )
  }

  /**
   * Error state
   */
  if (error || streamError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 space-y-4"
        role="alert"
      >
        <div className="flex items-center gap-2 text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="text-lg font-semibold">Search Failed</h3>
        </div>
        <p className="text-muted-foreground text-center max-w-md">
          {error?.message || streamError || 'An unexpected error occurred'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          >
            Retry Search
          </button>
        )}
      </div>
    )
  }

  /**
   * Empty state - no query executed yet
   */
  if (!results && !streamedContent && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-16 h-16 text-muted-foreground"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" strokeWidth="2" />
          <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h3 className="text-xl font-semibold text-foreground">
          Start Your Search
        </h3>
        <p className="text-muted-foreground max-w-md">
          Enter a query above to search through Nightreign content. Try asking
          about weapons, bosses, or game strategies.
        </p>
      </div>
    )
  }

  /**
   * No results found
   */
  if (results && results.results.length === 0 && !results.formatted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-16 h-16 text-muted-foreground"
          aria-hidden="true"
        >
          <path
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <h3 className="text-xl font-semibold text-foreground">
          No Results Found
        </h3>
        <p className="text-muted-foreground max-w-md">
          We couldn't find any content matching your query. Try different
          keywords or remove filters.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          >
            Clear Search
          </button>
        )}
      </div>
    )
  }

  /**
   * Streaming formatted response
   */
  if (isFormatted && (isStreaming || streamedContent)) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span aria-live="polite">Generating response...</span>
          </div>
        )}

        {/* Formatted content */}
        {streamedContent && (
          <article
            className="prose prose-invert prose-sm max-w-none bg-card border border-border rounded-lg p-6"
            aria-label="Formatted search response"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {streamedContent}
            </ReactMarkdown>
          </article>
        )}

        {/* Timing information */}
        {streamTiming && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-4">
            <div>
              <span className="font-medium">Embedding:</span>{' '}
              {streamTiming.embedding}ms
            </div>
            <div>
              <span className="font-medium">Search:</span> {streamTiming.search}
              ms
            </div>
            {streamTiming.format !== undefined && (
              <div>
                <span className="font-medium">Format:</span>{' '}
                {streamTiming.format}ms
              </div>
            )}
            <div className="font-semibold">
              <span className="font-medium">Total:</span> {streamTiming.total}ms
            </div>
          </div>
        )}
      </div>
    )
  }

  /**
   * Formatted results display (from SearchBar SSE parsing)
   */
  if (results && 'formatted' in results && results.formatted) {
    const formatted = results.formatted as string
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Formatted content */}
        <article
          className="prose prose-invert prose-sm max-w-none bg-card border border-border rounded-lg p-6"
          aria-label="Formatted search response"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{formatted}</ReactMarkdown>
        </article>

        {/* Timing information */}
        {results.timing && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-4">
            <div>
              <span className="font-medium">Embedding:</span>{' '}
              {results.timing.embedding}ms
            </div>
            <div>
              <span className="font-medium">Search:</span> {results.timing.search}
              ms
            </div>
            {results.timing.format !== undefined && (
              <div>
                <span className="font-medium">Format:</span>{' '}
                {results.timing.format}ms
              </div>
            )}
            <div className="font-semibold">
              <span className="font-medium">Total:</span> {results.timing.total}ms
            </div>
          </div>
        )}
      </div>
    )
  }

  /**
   * Raw results display
   */
  if (results) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Results header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {results.results.length}{' '}
            {results.results.length === 1 ? 'Result' : 'Results'}
          </h2>
          <div className="text-sm text-muted-foreground">
            Found in {results.timing.total}ms
          </div>
        </div>

        {/* Result cards */}
        <ul className="space-y-4 list-none" aria-label="Search results">
          {results.results.map((chunk, index) => (
            <li key={chunk.id}>
              <ResultCard chunk={chunk} rank={index + 1} />
            </li>
          ))}
        </ul>

        {/* Timing information */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-4">
          <div>
            <span className="font-medium">Embedding:</span>{' '}
            {results.timing.embedding}ms
          </div>
          <div>
            <span className="font-medium">Search:</span> {results.timing.search}
            ms
          </div>
          {results.timing.format !== undefined && (
            <div>
              <span className="font-medium">Format:</span>{' '}
              {results.timing.format}ms
            </div>
          )}
          <div className="font-semibold">
            <span className="font-medium">Total:</span> {results.timing.total}ms
          </div>
        </div>
      </div>
    )
  }

  return null
}
