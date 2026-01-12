/**
 * Rate limiter for web scraping
 *
 * Implements:
 * - Request throttling (configurable delay between requests)
 * - Concurrent request limiting (max parallel requests)
 * - Exponential backoff for retries
 */

import pLimit from 'p-limit'

export interface RateLimiterConfig {
  /** Maximum concurrent requests */
  maxConcurrent: number
  /** Delay between requests in milliseconds */
  delayMs: number
  /** Maximum retry attempts on failure */
  maxRetries: number
  /** Base delay for exponential backoff in milliseconds */
  backoffBaseMs: number
}

export const DEFAULT_CONFIG: RateLimiterConfig = {
  maxConcurrent: 5,
  delayMs: 500, // 2 requests per second
  maxRetries: 3,
  backoffBaseMs: 1000,
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
export function getBackoffDelay(attempt: number, baseMs: number): number {
  return 2 ** attempt * baseMs
}

/**
 * Create a rate-limited request executor
 */
export function createRateLimiter(config: Partial<RateLimiterConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const limit = pLimit(finalConfig.maxConcurrent)

  /**
   * Execute a function with rate limiting
   */
  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    return limit(async () => {
      await delay(finalConfig.delayMs)
      return fn()
    })
  }

  /**
   * Execute a function with rate limiting and retry logic
   */
  async function executeWithRetry<T>(
    fn: () => Promise<T>,
    options: { onRetry?: (attempt: number, error: Error) => void } = {},
  ): Promise<T> {
    return limit(async () => {
      await delay(finalConfig.delayMs)

      let lastError: Error | undefined

      for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
        try {
          return await fn()
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          if (attempt < finalConfig.maxRetries - 1) {
            const backoffDelay = getBackoffDelay(
              attempt,
              finalConfig.backoffBaseMs,
            )
            options.onRetry?.(attempt + 1, lastError)
            await delay(backoffDelay)
          }
        }
      }

      throw lastError
    })
  }

  /**
   * Execute multiple requests in parallel with rate limiting
   */
  async function executeAll<T>(fns: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(fns.map((fn) => execute(fn)))
  }

  /**
   * Execute multiple requests in parallel with rate limiting and retry
   */
  async function executeAllWithRetry<T>(
    fns: Array<() => Promise<T>>,
    options: {
      onRetry?: (url: string, attempt: number, error: Error) => void
    } = {},
  ): Promise<
    Array<{ success: true; result: T } | { success: false; error: Error }>
  > {
    return Promise.all(
      fns.map(async (fn) => {
        try {
          const result = await executeWithRetry(fn, {
            onRetry: (attempt, error) =>
              options.onRetry?.('unknown', attempt, error),
          })
          return { success: true as const, result }
        } catch (error) {
          return {
            success: false as const,
            error: error instanceof Error ? error : new Error(String(error)),
          }
        }
      }),
    )
  }

  return {
    execute,
    executeWithRetry,
    executeAll,
    executeAllWithRetry,
    config: finalConfig,
  }
}

export type RateLimiter = ReturnType<typeof createRateLimiter>
