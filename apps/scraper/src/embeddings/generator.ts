/**
 * Embedding Generator using bge-large-en-v1.5
 *
 * Generates 1024-dimensional embeddings for content chunks using
 * the Hugging Face Transformers.js library with ONNX runtime.
 *
 * Supports GPU acceleration via CUDA when available.
 * Configure with EMBEDDING_DEVICE=cuda or USE_GPU=true environment variables.
 */

import {
  type FeatureExtractionPipeline,
  pipeline,
} from '@huggingface/transformers'
import {
  getGpuConfig,
  getPipelineOptions,
  configureTransformersEnv,
} from '@nightreign/database/config'

/** Model to use for embedding generation */
const MODEL_NAME = 'BAAI/bge-large-en-v1.5'

/** Embedding dimensions (fixed for bge-large-en-v1.5) */
export const EMBEDDING_DIMENSIONS = 1024

/** Batch size for processing multiple texts */
const BATCH_SIZE = 32

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  /** Text that was embedded */
  text: string
  /** 1024-dimensional embedding vector */
  embedding: Float32Array
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  /** Successfully embedded texts */
  results: EmbeddingResult[]
  /** Any errors encountered */
  errors: Array<{ text: string; error: string }>
  /** Total processing time in ms */
  processingTimeMs: number
}

/**
 * EmbeddingGenerator class for generating text embeddings
 *
 * Uses a singleton pattern to cache the model pipeline and avoid
 * reloading the model on every request.
 */
export class EmbeddingGenerator {
  private pipeline: FeatureExtractionPipeline | null = null
  private initPromise: Promise<void> | null = null
  private isInitialized = false

  /**
   * Initialize the embedding pipeline
   *
   * This is called automatically on first use, but can be called
   * explicitly to preload the model at application startup.
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
      `Loading embedding model: ${MODEL_NAME} (device: ${gpuConfig.device})...`,
    )
    const startTime = Date.now()

    this.pipeline = await pipeline('feature-extraction', MODEL_NAME, {
      dtype: pipelineOptions.dtype,
      device: pipelineOptions.device,
    })

    const loadTime = Date.now() - startTime
    console.log(
      `Embedding model loaded in ${loadTime}ms (device: ${gpuConfig.device})`,
    )
  }

  /**
   * Ensure the pipeline is initialized
   */
  private async ensureInitialized(): Promise<FeatureExtractionPipeline> {
    if (!this.pipeline) {
      await this.initialize()
    }
    if (!this.pipeline) {
      throw new Error('Failed to initialize embedding pipeline')
    }
    return this.pipeline
  }

  /**
   * Dispose of the pipeline to free memory
   *
   * Call this when the embedding generator is no longer needed,
   * such as at application shutdown or when switching models.
   */
  dispose(): void {
    this.pipeline = null
    this.initPromise = null
    this.isInitialized = false
  }

  /**
   * Check if the generator is ready for use
   */
  isReady(): boolean {
    return this.isInitialized && this.pipeline !== null
  }

  /**
   * Generate embedding for a single text
   *
   * @param text - Text to embed
   * @returns 1024-dimensional embedding as Float32Array
   */
  async embed(text: string): Promise<Float32Array> {
    const extractor = await this.ensureInitialized()

    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    })

    // Extract the embedding from the output tensor
    // The output is a 2D tensor of shape [1, 1024]
    const embedding = output.tolist()[0] as number[]
    return new Float32Array(embedding)
  }

  /**
   * Generate embeddings for multiple texts in batch
   *
   * @param texts - Array of texts to embed
   * @param onProgress - Optional callback for progress updates
   * @returns Batch result with embeddings and any errors
   */
  async embedBatch(
    texts: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now()
    const results: EmbeddingResult[] = []
    const errors: Array<{ text: string; error: string }> = []

    const extractor = await this.ensureInitialized()

    // Process in batches
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)

      try {
        const output = await extractor(batch, {
          pooling: 'mean',
          normalize: true,
        })

        // Extract embeddings from batch output
        // Shape is [batch_size, 1024]
        const embeddings = output.tolist() as number[][]

        for (let j = 0; j < batch.length; j++) {
          const text = batch[j]
          const embeddingData = embeddings[j]
          if (text !== undefined && embeddingData !== undefined) {
            results.push({
              text,
              embedding: new Float32Array(embeddingData),
            })
          }
        }
      } catch (error) {
        // If batch fails, try individual texts
        for (const text of batch) {
          try {
            const embedding = await this.embed(text)
            results.push({ text, embedding })
          } catch (individualError) {
            errors.push({
              text,
              error:
                individualError instanceof Error
                  ? individualError.message
                  : 'Unknown error',
            })
          }
        }
      }

      onProgress?.(Math.min(i + BATCH_SIZE, texts.length), texts.length)
    }

    return {
      results,
      errors,
      processingTimeMs: Date.now() - startTime,
    }
  }

  /**
   * Convert Float32Array embedding to Bytes for Prisma storage
   *
   * @param embedding - Float32Array embedding
   * @returns Buffer for Prisma Bytes storage
   */
  static toBytes(embedding: Float32Array): Buffer {
    return Buffer.from(embedding.buffer)
  }

  /**
   * Convert Bytes from Prisma to Float32Array embedding
   *
   * @param bytes - Buffer from Prisma Bytes field
   * @returns Float32Array embedding
   */
  static fromBytes(bytes: Buffer): Float32Array {
    return new Float32Array(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength / Float32Array.BYTES_PER_ELEMENT,
    )
  }

  /**
   * Calculate cosine similarity between two embeddings
   *
   * @param a - First embedding
   * @param b - Second embedding
   * @returns Cosine similarity score (0-1)
   */
  static cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0
      const bVal = b[i] ?? 0
      dotProduct += aVal * bVal
      normA += aVal * aVal
      normB += bVal * bVal
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}

/**
 * Singleton instance of the embedding generator
 */
let generatorInstance: EmbeddingGenerator | null = null

/**
 * Get the singleton embedding generator instance
 */
export function getEmbeddingGenerator(): EmbeddingGenerator {
  if (!generatorInstance) {
    generatorInstance = new EmbeddingGenerator()
  }
  return generatorInstance
}

/**
 * Create a new embedding generator instance
 *
 * Use this if you need a separate instance for testing or isolation.
 */
export function createEmbeddingGenerator(): EmbeddingGenerator {
  return new EmbeddingGenerator()
}

/**
 * Dispose of the singleton embedding generator instance
 *
 * Call this at application shutdown or when the generator is no longer needed
 * to free up memory used by the embedding model.
 */
export function disposeEmbeddingGenerator(): void {
  if (generatorInstance) {
    generatorInstance.dispose()
    generatorInstance = null
  }
}
