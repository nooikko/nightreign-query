/**
 * Hybrid Search Service
 *
 * Combines vector (semantic) search with full-text (keyword) search
 * for optimal results using Orama's hybrid search mode.
 *
 * Optionally includes a reranking step using bge-reranker-base for
 * improved relevance scoring on the top candidates.
 */

import { type SearchOptions, getOramaIndex } from './orama'
import { getReranker } from './reranker'

/** Content type (duplicated here to avoid cross-package import issues) */
type ContentType =
  | 'boss'
  | 'weapon'
  | 'relic'
  | 'nightfarer'
  | 'skill'
  | 'talisman'
  | 'spell'
  | 'armor'
  | 'shield'
  | 'enemy'
  | 'npc'
  | 'merchant'
  | 'location'
  | 'expedition'
  | 'guide'

/** Hybrid search query options */
export interface HybridSearchQuery {
  /** Natural language search query */
  query: string
  /** Optional: pre-computed embedding vector (if not provided, text search only) */
  embedding?: number[]
  /** Filter by content types */
  types?: ContentType[]
  /** Maximum results to return (default: 10) */
  limit?: number
  /** Boost factor for vector results (0-1, default: 0.5) */
  vectorBoost?: number
  /** Enable reranking for improved relevance (default: true) */
  rerank?: boolean
}

/** Search result with additional metadata */
export interface HybridSearchResult {
  /** Unique identifier */
  id: string
  /** Content type */
  type: ContentType
  /** Name of the content item */
  name: string
  /** Section within the content */
  section: string
  /** Text content snippet */
  content: string
  /** Tags for filtering */
  tags: string[]
  /** Source URL if available */
  sourceUrl: string
  /** Combined relevance score (0-1) */
  score: number
  /** How the result was found */
  matchType: 'hybrid' | 'vector' | 'fulltext'
}

/** Search timing information */
export interface SearchTiming {
  /** Total search time in ms */
  total: number
  /** Embedding generation time in ms (if applicable) */
  embedding?: number
  /** Search execution time in ms */
  search: number
  /** Reranking time in ms (if applicable) */
  rerank?: number
}

/** Complete search response */
export interface HybridSearchResponse {
  /** Search results ordered by relevance */
  results: HybridSearchResult[]
  /** Total number of matches */
  count: number
  /** Performance timing */
  timing: SearchTiming
  /** Search mode used */
  mode: 'hybrid' | 'vector' | 'fulltext'
}

/**
 * HybridSearch class for performing semantic + keyword search
 */
export class HybridSearch {
  private orama = getOramaIndex()

  /**
   * Initialize the search index (call before first search)
   */
  async initialize(): Promise<void> {
    await this.orama.initialize()
  }

  /**
   * Perform hybrid search combining vector and full-text search
   *
   * @param query - Search query options
   * @returns Search results with timing information
   */
  async search(query: HybridSearchQuery): Promise<HybridSearchResponse> {
    const startTime = Date.now()
    const requestedLimit = query.limit || 10
    const shouldRerank = query.rerank !== false // Default to true

    // Validate query
    if (!query.query && !query.embedding) {
      return {
        results: [],
        count: 0,
        timing: { total: 0, search: 0 },
        mode: 'fulltext',
      }
    }

    // Determine search mode
    let mode: 'hybrid' | 'vector' | 'fulltext'
    if (query.embedding && query.query) {
      mode = 'hybrid'
    } else if (query.embedding) {
      mode = 'vector'
    } else {
      mode = 'fulltext'
    }

    // Build search options
    // Fetch more results for reranking: 3x requested limit
    // This gives enough candidates for reranking while keeping latency reasonable
    const searchLimit = shouldRerank
      ? requestedLimit * 3
      : requestedLimit

    const searchOptions: SearchOptions = {
      query: query.query,
      vector: query.embedding,
      types: query.types,
      limit: searchLimit,
      mode,
    }

    // Execute search
    const searchStart = Date.now()
    const oramaResults = await this.orama.search(searchOptions)
    const searchTime = Date.now() - searchStart

    // Transform results
    let results: HybridSearchResult[] = oramaResults.map((result) => ({
      id: result.id,
      type: result.type,
      name: result.name,
      section: result.section,
      content: result.content,
      tags: result.tags,
      sourceUrl: result.sourceUrl,
      score: result.score,
      matchType: mode,
    }))

    // Rerank results for improved relevance
    let rerankTime: number | undefined
    if (shouldRerank && results.length > 0 && query.query) {
      const rerankStart = Date.now()

      try {
        const reranker = getReranker()
        await reranker.initialize()

        // Prepare items for reranking
        const rerankItems = results.map((r) => ({
          id: r.id,
          content: `${r.name} (${r.section}): ${r.content}`,
          originalScore: r.score,
        }))

        // Rerank and get top results
        const reranked = await reranker.rerank(query.query, rerankItems, requestedLimit)

        // Build lookup map for O(1) access instead of O(n) find() calls
        const resultsById = new Map(results.map((r) => [r.id, r]))

        // Rebuild results in reranked order - now O(n) instead of O(n*m)
        const rerankedResults: HybridSearchResult[] = []
        for (const item of reranked) {
          const original = resultsById.get(item.id)
          if (original) {
            rerankedResults.push({
              ...original,
              // Normalize reranker score to 0-1 range using sigmoid
              score: 1 / (1 + Math.exp(-item.score)),
            })
          }
        }

        results = rerankedResults
        rerankTime = Date.now() - rerankStart
      } catch (error) {
        // If reranking fails, fall back to original results
        console.warn('Reranking failed, using original results:', error)
        results = results.slice(0, requestedLimit)
      }
    } else {
      // No reranking, just limit results
      results = results.slice(0, requestedLimit)
    }

    const totalTime = Date.now() - startTime

    return {
      results,
      count: results.length,
      timing: {
        total: totalTime,
        search: searchTime,
        rerank: rerankTime,
      },
      mode,
    }
  }

  /**
   * Perform full-text only search (no embedding required)
   *
   * @param query - Text query
   * @param options - Search options
   * @returns Search results
   */
  async textSearch(
    query: string,
    options?: { types?: ContentType[]; limit?: number },
  ): Promise<HybridSearchResponse> {
    return this.search({
      query,
      types: options?.types,
      limit: options?.limit,
    })
  }

  /**
   * Perform vector-only search (requires embedding)
   *
   * @param embedding - Query embedding vector (384 dimensions)
   * @param options - Search options
   * @returns Search results
   */
  async vectorSearch(
    embedding: number[],
    options?: { types?: ContentType[]; limit?: number },
  ): Promise<HybridSearchResponse> {
    return this.search({
      query: '',
      embedding,
      types: options?.types,
      limit: options?.limit,
    })
  }

  /**
   * Search for similar content to a given item
   *
   * @param id - ID of the content item
   * @param options - Search options
   * @returns Similar content results
   */
  async findSimilar(
    embedding: number[],
    options?: { types?: ContentType[]; limit?: number; excludeId?: string },
  ): Promise<HybridSearchResponse> {
    const response = await this.vectorSearch(embedding, {
      types: options?.types,
      limit: (options?.limit || 5) + 1, // Get extra to account for self-match
    })

    // Filter out the source item if specified
    if (options?.excludeId) {
      response.results = response.results.filter(
        (r) => r.id !== options.excludeId,
      )
      response.count = response.results.length
    }

    // Limit to requested count
    if (options?.limit && response.results.length > options.limit) {
      response.results = response.results.slice(0, options.limit)
      response.count = response.results.length
    }

    return response
  }

  /**
   * Get the number of indexed documents
   */
  async getDocumentCount(): Promise<number> {
    return this.orama.count()
  }
}

/** Singleton instance */
let searchInstance: HybridSearch | null = null

/**
 * Get the singleton hybrid search instance
 */
export function getHybridSearch(): HybridSearch {
  if (!searchInstance) {
    searchInstance = new HybridSearch()
  }
  return searchInstance
}

/**
 * Create a new hybrid search instance
 */
export function createHybridSearch(): HybridSearch {
  return new HybridSearch()
}
