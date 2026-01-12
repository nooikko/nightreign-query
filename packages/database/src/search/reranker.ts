/**
 * Reranker Service
 *
 * Uses bge-reranker-base to rerank search results for improved relevance.
 * Cross-encoders like this one score query-document pairs together,
 * providing more accurate relevance than bi-encoder similarity alone.
 */

import { AutoModelForSequenceClassification, AutoTokenizer } from '@huggingface/transformers'

/** Model to use for reranking */
const RERANKER_MODEL = 'BAAI/bge-reranker-base'

/** Item to be reranked */
export interface RerankItem {
  /** Unique identifier */
  id: string
  /** Text content to compare against query */
  content: string
  /** Original score from initial search (optional, for comparison) */
  originalScore?: number
}

/** Reranked result */
export interface RerankResult {
  /** Unique identifier */
  id: string
  /** Reranker relevance score (higher = more relevant) */
  score: number
  /** Original score from initial search */
  originalScore?: number
}

/**
 * Reranker class for improving search result relevance
 *
 * Uses a cross-encoder model that scores query-document pairs
 * together for more accurate relevance scoring than embedding
 * similarity alone.
 */
export class Reranker {
  private model: Awaited<ReturnType<typeof AutoModelForSequenceClassification.from_pretrained>> | null = null
  private tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | null = null
  private initPromise: Promise<void> | null = null
  private isInitialized = false

  /**
   * Initialize the reranker model
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

    this.initPromise = this.loadModel()
    await this.initPromise
    this.isInitialized = true
  }

  /**
   * Load the reranker model and tokenizer
   */
  private async loadModel(): Promise<void> {
    console.log(`Loading reranker model: ${RERANKER_MODEL}...`)
    const startTime = Date.now()

    // Load model and tokenizer in parallel
    const [model, tokenizer] = await Promise.all([
      AutoModelForSequenceClassification.from_pretrained(RERANKER_MODEL, {
        dtype: 'fp32',
      }),
      AutoTokenizer.from_pretrained(RERANKER_MODEL),
    ])

    this.model = model
    this.tokenizer = tokenizer

    const loadTime = Date.now() - startTime
    console.log(`Reranker model loaded in ${loadTime}ms`)
  }

  /**
   * Ensure the model is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.model || !this.tokenizer) {
      await this.initialize()
    }
    if (!this.model || !this.tokenizer) {
      throw new Error('Failed to initialize reranker model')
    }
  }

  /**
   * Rerank a list of items based on relevance to a query
   *
   * Uses batch processing to minimize model inference calls.
   * Instead of N separate calls, we batch tokenize and run inference once.
   *
   * @param query - The search query
   * @param items - Items to rerank
   * @param topK - Number of top results to return (default: all)
   * @returns Reranked items sorted by relevance score
   */
  async rerank(
    query: string,
    items: RerankItem[],
    topK?: number
  ): Promise<RerankResult[]> {
    if (items.length === 0) {
      return []
    }

    await this.ensureInitialized()

    const startTime = Date.now()
    const tokenizer = this.tokenizer
    const model = this.model

    if (!tokenizer || !model) {
      throw new Error('Reranker not initialized')
    }

    // Batch process all items together for much better performance
    // Process in batches to avoid memory issues with large result sets
    const BATCH_SIZE = 8
    const scores: number[] = new Array(items.length)

    for (let batchStart = 0; batchStart < items.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, items.length)
      const batchItems = items.slice(batchStart, batchEnd)

      // Process batch items in parallel
      const batchPromises = batchItems.map(async (item, batchIndex) => {
        const inputs = tokenizer(query, {
          text_pair: item.content,
          padding: true,
          truncation: true,
          max_length: 512,
          return_tensors: 'pt',
        })

        const outputs = await model(inputs)
        const logits = outputs.logits.data as Float32Array
        return { index: batchStart + batchIndex, score: logits[0] ?? 0 }
      })

      const batchResults = await Promise.all(batchPromises)
      for (const result of batchResults) {
        scores[result.index] = result.score
      }
    }

    // Create results with scores
    const results: RerankResult[] = items.map((item, i) => ({
      id: item.id,
      score: scores[i] ?? 0,
      originalScore: item.originalScore,
    }))

    // Sort by reranker score (descending)
    results.sort((a, b) => b.score - a.score)

    // Limit to topK if specified
    const finalResults = topK ? results.slice(0, topK) : results

    const rerankTime = Date.now() - startTime
    if (rerankTime > 500) {
      console.log(`Reranking took ${rerankTime}ms for ${items.length} items`)
    }

    return finalResults
  }

  /**
   * Check if the reranker is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null && this.tokenizer !== null
  }
}

/** Singleton instance */
let rerankerInstance: Reranker | null = null

/**
 * Get the singleton reranker instance
 */
export function getReranker(): Reranker {
  if (!rerankerInstance) {
    rerankerInstance = new Reranker()
  }
  return rerankerInstance
}

/**
 * Create a new reranker instance
 */
export function createReranker(): Reranker {
  return new Reranker()
}

/**
 * Rerank search results (convenience function)
 *
 * @param query - Search query
 * @param items - Items to rerank
 * @param topK - Number of results to return
 * @returns Reranked results
 */
export async function rerankResults(
  query: string,
  items: RerankItem[],
  topK?: number
): Promise<RerankResult[]> {
  const reranker = getReranker()
  return reranker.rerank(query, items, topK)
}
