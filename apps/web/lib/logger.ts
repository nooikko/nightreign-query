/**
 * Structured Logger for Performance Instrumentation
 *
 * Provides structured logging with timing data that can be
 * parsed and analyzed for p50/p95 latency calculations.
 */

export interface PerformanceLog {
  /** Log type identifier */
  type: 'search_performance'
  /** Timestamp in ISO format */
  timestamp: string
  /** Request identifier for correlation */
  requestId: string
  /** Query text (truncated for privacy) */
  query: string
  /** Search mode used */
  mode: 'hybrid' | 'vector' | 'fulltext'
  /** Number of results returned */
  resultCount: number
  /** Timing breakdown in milliseconds */
  timing: {
    embedding: number
    search: number
    format?: number
    total: number
  }
  /** Whether embedding succeeded */
  embeddingSuccess: boolean
  /** Whether formatting was requested */
  formatRequested: boolean
}

export interface ErrorLog {
  /** Log type identifier */
  type: 'search_error'
  /** Timestamp in ISO format */
  timestamp: string
  /** Request identifier for correlation */
  requestId: string
  /** Error message */
  error: string
  /** Error phase */
  phase: 'validation' | 'embedding' | 'search' | 'format' | 'unknown'
  /** Stack trace if available */
  stack?: string
}

/**
 * Generate a unique request ID for correlation
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Maximum length for logged query strings (privacy protection)
 * Queries longer than this are truncated to prevent sensitive data in logs
 */
const LOG_QUERY_MAX_LENGTH = 100

/**
 * Truncate query for logging (privacy)
 */
function truncateQuery(
  query: string,
  maxLength = LOG_QUERY_MAX_LENGTH,
): string {
  if (query.length <= maxLength) return query
  return `${query.substring(0, maxLength)}...`
}

/**
 * Log search performance data in structured format
 *
 * Output is JSON for easy parsing with tools like jq:
 * - Get all p50: `grep search_performance logs | jq '.timing.total' | sort -n | awk 'NR==int(NR*0.5)'`
 * - Get all p95: `grep search_performance logs | jq '.timing.total' | sort -n | awk 'NR==int(NR*0.95)'`
 */
export function logSearchPerformance(
  log: Omit<PerformanceLog, 'type' | 'timestamp'>,
): void {
  const entry: PerformanceLog = {
    type: 'search_performance',
    timestamp: new Date().toISOString(),
    ...log,
    query: truncateQuery(log.query),
  }

  // Output as JSON for structured logging
  console.log(JSON.stringify(entry))

  // Also log human-readable summary if total time is high
  if (log.timing.total > 500) {
    console.warn(
      `[SLOW SEARCH] ${log.timing.total}ms - embedding: ${log.timing.embedding}ms, search: ${log.timing.search}ms${log.timing.format ? `, format: ${log.timing.format}ms` : ''}`,
    )
  }
}

/**
 * Log search error in structured format
 */
export function logSearchError(
  log: Omit<ErrorLog, 'type' | 'timestamp'>,
): void {
  const entry: ErrorLog = {
    type: 'search_error',
    timestamp: new Date().toISOString(),
    ...log,
  }

  console.error(JSON.stringify(entry))
}

/**
 * Performance timer utility for measuring pipeline stages
 */
export class PerformanceTimer {
  private stages: Map<string, { start: number; end?: number }> = new Map()
  private overallStart: number

  constructor() {
    this.overallStart = Date.now()
  }

  /**
   * Start timing a stage
   */
  start(stage: string): void {
    this.stages.set(stage, { start: Date.now() })
  }

  /**
   * End timing a stage
   */
  end(stage: string): number {
    const stageData = this.stages.get(stage)
    if (!stageData) {
      console.warn(`Stage '${stage}' was never started`)
      return 0
    }
    stageData.end = Date.now()
    return stageData.end - stageData.start
  }

  /**
   * Get duration of a completed stage
   */
  getDuration(stage: string): number {
    const stageData = this.stages.get(stage)
    if (!stageData?.end) return 0
    return stageData.end - stageData.start
  }

  /**
   * Get total elapsed time
   */
  getTotal(): number {
    return Date.now() - this.overallStart
  }

  /**
   * Get all timing data
   */
  getTimings(): Record<string, number> {
    const timings: Record<string, number> = {}
    for (const [stage, data] of this.stages) {
      timings[stage] = data.end
        ? data.end - data.start
        : Date.now() - data.start
    }
    timings.total = this.getTotal()
    return timings
  }
}
