/**
 * Warmup API Route
 *
 * POST /api/warmup
 *
 * Triggers pre-warming of the embedding cache with popular queries.
 * Call this on server startup or as a health check to ensure the
 * cache is populated before user traffic arrives.
 *
 * This is also useful for serverless deployments where cold starts
 * need to warm up the ML models quickly.
 */

import { getCacheStats, prewarmEmbeddingCache } from '@nightreign/database'
import { NextResponse } from 'next/server'

/**
 * POST /api/warmup
 *
 * Triggers cache pre-warming with popular queries.
 * Returns statistics about the warming process.
 */
export async function POST() {
  try {
    const startTime = Date.now()

    // Run pre-warming
    const result = await prewarmEmbeddingCache()

    // Get current cache stats
    const cacheStats = getCacheStats()

    const response = {
      status: 'success',
      message: `Pre-warmed ${result.success} queries in ${result.durationMs}ms`,
      details: {
        queriesWarmed: result.success,
        queriesFailed: result.failed,
        warmupDurationMs: result.durationMs,
        cacheSize: cacheStats.size,
        cacheMaxSize: cacheStats.maxSize,
        totalTimeMs: Date.now() - startTime,
      },
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Warmup failed:', error)

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/warmup
 *
 * Returns current cache statistics without triggering warming.
 * Useful for monitoring cache health.
 */
export async function GET() {
  try {
    const cacheStats = getCacheStats()

    return NextResponse.json({
      status: 'ok',
      cache: {
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        utilization: `${Math.round((cacheStats.size / cacheStats.maxSize) * 100)}%`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
