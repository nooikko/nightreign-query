/**
 * Query Embedding Service
 *
 * Generates embeddings for search queries using bge-small-en-v1.5.
 * Uses the same model as content embeddings for consistency.
 */

import { pipeline as createPipeline } from '@huggingface/transformers'

/** Type for the pipeline function result */
type ExtractionPipeline = (
  input: string | string[],
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ tolist: () => number[][] }>

/** Model to use for embedding generation (same as content embeddings) */
const MODEL_NAME = 'BAAI/bge-small-en-v1.5'

/** Embedding dimensions (fixed for bge-small-en-v1.5) */
export const QUERY_EMBEDDING_DIMENSIONS = 384

/** Cache configuration */
const CACHE_MAX_SIZE = 100 // Maximum number of cached embeddings
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL

/** Cache entry with timestamp for TTL */
interface CacheEntry {
  embedding: number[]
  timestamp: number
}

/**
 * Simple LRU-like cache for query embeddings
 * Uses Map's insertion order for approximate LRU behavior
 */
class EmbeddingCache {
  private cache = new Map<string, CacheEntry>()

  get(query: string): number[] | null {
    const entry = this.cache.get(query)
    if (!entry) return null

    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(query)
      return null
    }

    // Move to end for LRU (delete and re-add)
    this.cache.delete(query)
    this.cache.set(query, entry)
    return entry.embedding
  }

  set(query: string, embedding: number[]): void {
    // Evict oldest entries if at capacity
    while (this.cache.size >= CACHE_MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(query, {
      embedding,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/**
 * QueryEmbedder class for generating search query embeddings
 *
 * Uses a singleton pattern to cache the model pipeline and avoid
 * reloading the model on every request.
 */
export class QueryEmbedder {
  private pipeline: ExtractionPipeline | null = null
  private initPromise: Promise<void> | null = null
  private isInitialized = false
  private cache = new EmbeddingCache()

  /**
   * Initialize the embedding pipeline
   *
   * Call this at application startup to preload the model
   * and avoid first-request latency.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.loadPipeline()
    await this.initPromise
    this.isInitialized = true
  }

  /**
   * Load the embedding pipeline
   */
  private async loadPipeline(): Promise<void> {
    console.log(`Loading query embedding model: ${MODEL_NAME}...`)
    const startTime = Date.now()

    // Use unknown intermediate cast to handle complex union type
    this.pipeline = (await createPipeline('feature-extraction', MODEL_NAME, {
      dtype: 'fp32',
    })) as unknown as ExtractionPipeline

    const loadTime = Date.now() - startTime
    console.log(`Query embedding model loaded in ${loadTime}ms`)
  }

  /**
   * Ensure the pipeline is initialized
   */
  private async ensureInitialized(): Promise<ExtractionPipeline> {
    if (!this.pipeline) {
      await this.initialize()
    }
    if (!this.pipeline) {
      throw new Error('Failed to initialize embedding pipeline')
    }
    return this.pipeline
  }

  /**
   * Generate embedding for a search query
   *
   * Uses an LRU cache to avoid re-computing embeddings for repeated queries.
   * Cache entries expire after 5 minutes to ensure freshness.
   *
   * @param query - Search query text
   * @returns 384-dimensional embedding as number array
   * @throws Error if embedding dimensions don't match expected size
   */
  async embed(query: string): Promise<number[]> {
    // Normalize query for cache lookup (trim and lowercase)
    const cacheKey = query.trim().toLowerCase()

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const startTime = Date.now()
    const extractor = await this.ensureInitialized()

    const output = await extractor(query, {
      pooling: 'mean',
      normalize: true,
    })

    // Extract the embedding from the output tensor
    const embedding = output.tolist()[0]

    // Validate embedding dimensions to catch model/pipeline issues early
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error(
        `Invalid embedding: expected array, got ${typeof embedding}`,
      )
    }

    if (embedding.length !== QUERY_EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid embedding dimensions: expected ${QUERY_EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
      )
    }

    // Store in cache
    this.cache.set(cacheKey, embedding)

    const embedTime = Date.now() - startTime
    if (embedTime > 100) {
      console.warn(`Query embedding took ${embedTime}ms (target: <100ms)`)
    }

    return embedding
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get the current cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }

  /**
   * Check if the embedder is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.pipeline !== null
  }
}

/** Singleton instance */
let embedderInstance: QueryEmbedder | null = null

/**
 * Get the singleton query embedder instance
 */
export function getQueryEmbedder(): QueryEmbedder {
  if (!embedderInstance) {
    embedderInstance = new QueryEmbedder()
  }
  return embedderInstance
}

/**
 * Create a new query embedder instance
 */
export function createQueryEmbedder(): QueryEmbedder {
  return new QueryEmbedder()
}

/**
 * Generate embedding for a search query (convenience function)
 *
 * @param query - Search query text
 * @returns 384-dimensional embedding as number array
 */
export async function embedQuery(query: string): Promise<number[]> {
  const embedder = getQueryEmbedder()
  return embedder.embed(query)
}
