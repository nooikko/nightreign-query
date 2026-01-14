/**
 * Query Embedding Service
 *
 * Generates embeddings for search queries using bge-large-en-v1.5.
 * Uses the same model as content embeddings for consistency.
 *
 * Supports GPU acceleration via CUDA when available.
 * Configure with EMBEDDING_DEVICE=cuda or USE_GPU=true environment variables.
 */

import { pipeline as createPipeline } from '@huggingface/transformers'
import {
  getGpuConfig,
  getPipelineOptions,
  configureTransformersEnv,
} from '../config'
import { logEmbedding } from './debug-logger'

/** Type for the pipeline function result */
type ExtractionPipeline = (
  input: string | string[],
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ tolist: () => number[][] }>

/** Model to use for embedding generation (same as content embeddings) */
const MODEL_NAME = 'BAAI/bge-large-en-v1.5'

/** Embedding dimensions (fixed for bge-large-en-v1.5) */
export const QUERY_EMBEDDING_DIMENSIONS = 1024

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
    // Configure Transformers.js environment
    configureTransformersEnv()

    const gpuConfig = getGpuConfig()
    const pipelineOptions = getPipelineOptions()

    console.log(
      `Loading query embedding model: ${MODEL_NAME} (device: ${gpuConfig.device})...`,
    )
    const startTime = Date.now()

    // Use unknown intermediate cast to handle complex union type
    this.pipeline = (await createPipeline('feature-extraction', MODEL_NAME, {
      dtype: pipelineOptions.dtype,
      device: pipelineOptions.device,
    })) as unknown as ExtractionPipeline

    const loadTime = Date.now() - startTime
    console.log(
      `Query embedding model loaded in ${loadTime}ms (device: ${gpuConfig.device})`,
    )
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
   * @returns 1024-dimensional embedding as number array
   * @throws Error if embedding dimensions don't match expected size
   */
  async embed(query: string): Promise<number[]> {
    // Normalize query for cache lookup (trim and lowercase)
    const cacheKey = query.trim().toLowerCase()
    const startTime = Date.now()

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached) {
      // Log cache hit
      logEmbedding({
        query,
        cacheHit: true,
        durationMs: Date.now() - startTime,
        dimensions: cached.length,
        firstValues: cached.slice(0, 5),
      })
      return cached
    }

    const extractor = await this.ensureInitialized()

    try {
      const output = await extractor(query, {
        pooling: 'mean',
        normalize: true,
      })

      // Extract the embedding from the output tensor
      const embedding = output.tolist()[0]

      // Validate embedding dimensions to catch model/pipeline issues early
      if (!embedding || !Array.isArray(embedding)) {
        const error = `Invalid embedding: expected array, got ${typeof embedding}`
        logEmbedding({
          query,
          cacheHit: false,
          durationMs: Date.now() - startTime,
          error,
        })
        throw new Error(error)
      }

      if (embedding.length !== QUERY_EMBEDDING_DIMENSIONS) {
        const error = `Invalid embedding dimensions: expected ${QUERY_EMBEDDING_DIMENSIONS}, got ${embedding.length}`
        logEmbedding({
          query,
          cacheHit: false,
          durationMs: Date.now() - startTime,
          dimensions: embedding.length,
          error,
        })
        throw new Error(error)
      }

      // Store in cache
      this.cache.set(cacheKey, embedding)

      const embedTime = Date.now() - startTime

      // Log successful embedding generation
      logEmbedding({
        query,
        cacheHit: false,
        durationMs: embedTime,
        dimensions: embedding.length,
        firstValues: embedding.slice(0, 5),
      })

      if (embedTime > 100) {
        console.warn(`Query embedding took ${embedTime}ms (target: <100ms)`)
      }

      return embedding
    } catch (error) {
      // Log embedding error
      logEmbedding({
        query,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
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
