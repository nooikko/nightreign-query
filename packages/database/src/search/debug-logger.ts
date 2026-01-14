/**
 * Search Debug Logger
 *
 * Provides detailed structured logging for the search pipeline.
 * Enable with SEARCH_DEBUG=true environment variable.
 *
 * Logs include:
 * - Query preprocessing details
 * - Embedding generation stats
 * - Vector/BM25 search results breakdown
 * - Fusion and ranking details
 * - Zero-results diagnostics
 */

/** Check if debug logging is enabled */
export function isSearchDebugEnabled(): boolean {
  return process.env.SEARCH_DEBUG === 'true'
}

/** Log level for search debugging */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Structured log entry */
interface DebugLogEntry {
  timestamp: string
  level: LogLevel
  stage: string
  message: string
  data?: Record<string, unknown>
}

/**
 * Log a debug message with structured data
 */
function logDebug(
  level: LogLevel,
  stage: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!isSearchDebugEnabled()) return

  const entry: DebugLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    stage,
    message,
    data,
  }

  const prefix = `[SEARCH:${stage.toUpperCase()}]`

  switch (level) {
    case 'error':
      console.error(prefix, message, data ? JSON.stringify(data, null, 2) : '')
      break
    case 'warn':
      console.warn(prefix, message, data ? JSON.stringify(data, null, 2) : '')
      break
    case 'info':
      console.info(prefix, message, data ? JSON.stringify(data, null, 2) : '')
      break
    default:
      console.log(prefix, message, data ? JSON.stringify(data, null, 2) : '')
  }
}

/** Query preprocessing log data */
export interface QueryPreprocessLog {
  original: string
  normalized?: string
  charCount: number
  wordCount: number
  filters?: {
    types?: string[]
    limit?: number
  }
}

/**
 * Log query preprocessing details
 */
export function logQueryPreprocess(data: QueryPreprocessLog): void {
  logDebug('debug', 'query', 'Query received', {
    original: data.original,
    normalized: data.normalized,
    charCount: data.charCount,
    wordCount: data.wordCount,
    filters: data.filters,
    isEmpty: data.charCount === 0,
    isShort: data.wordCount < 2,
  })
}

/** Embedding generation log data */
export interface EmbeddingLog {
  query: string
  cacheHit: boolean
  durationMs: number
  dimensions?: number
  firstValues?: number[]
  error?: string
}

/**
 * Log embedding generation details
 */
export function logEmbedding(data: EmbeddingLog): void {
  const level = data.error ? 'error' : 'debug'
  logDebug(level, 'embedding', data.cacheHit ? 'Cache hit' : 'Generated embedding', {
    query: data.query.substring(0, 50) + (data.query.length > 50 ? '...' : ''),
    cacheHit: data.cacheHit,
    durationMs: data.durationMs,
    dimensions: data.dimensions,
    firstValues: data.firstValues?.slice(0, 5),
    error: data.error,
  })
}

/** Search execution log data */
export interface SearchExecutionLog {
  mode: 'hybrid' | 'vector' | 'fulltext'
  query?: string
  hasVector: boolean
  vectorDimensions?: number
  typeFilters?: string[]
  requestedLimit: number
  actualSearchLimit: number
}

/**
 * Log search execution parameters
 */
export function logSearchExecution(data: SearchExecutionLog): void {
  logDebug('debug', 'search', `Executing ${data.mode} search`, {
    mode: data.mode,
    query: data.query?.substring(0, 50),
    hasVector: data.hasVector,
    vectorDimensions: data.vectorDimensions,
    typeFilters: data.typeFilters,
    requestedLimit: data.requestedLimit,
    actualSearchLimit: data.actualSearchLimit,
  })
}

/** Search result item for logging */
export interface SearchResultItem {
  id: string
  name: string
  type: string
  score: number
  section?: string
}

/** Search results log data */
export interface SearchResultsLog {
  mode: 'hybrid' | 'vector' | 'fulltext'
  totalResults: number
  durationMs: number
  results: SearchResultItem[]
  topScores: number[]
  scoreRange?: { min: number; max: number }
}

/**
 * Log search results details
 */
export function logSearchResults(data: SearchResultsLog): void {
  const level = data.totalResults === 0 ? 'warn' : 'debug'

  logDebug(level, 'results', `Found ${data.totalResults} results`, {
    mode: data.mode,
    totalResults: data.totalResults,
    durationMs: data.durationMs,
    topScores: data.topScores.slice(0, 5),
    scoreRange: data.scoreRange,
    topResults: data.results.slice(0, 5).map((r) => ({
      name: r.name,
      type: r.type,
      score: r.score.toFixed(4),
      section: r.section,
    })),
  })

  // Extra diagnostics for zero results
  if (data.totalResults === 0) {
    logDebug('warn', 'diagnostic', 'ZERO RESULTS - Potential issues:', {
      possibleCauses: [
        'Query terms not in index',
        'Embedding similarity too low',
        'Type filters excluding all matches',
        'Index may be empty or corrupted',
      ],
      suggestions: [
        'Check index document count',
        'Try broader search terms',
        'Remove type filters',
        'Verify index was built correctly',
      ],
    })
  }
}

/** Reranking log data */
export interface RerankingLog {
  inputCount: number
  outputCount: number
  durationMs: number
  scoreChanges?: Array<{
    id: string
    name: string
    originalScore: number
    rerankedScore: number
  }>
}

/**
 * Log reranking details
 */
export function logReranking(data: RerankingLog): void {
  logDebug('debug', 'rerank', `Reranked ${data.inputCount} → ${data.outputCount} results`, {
    inputCount: data.inputCount,
    outputCount: data.outputCount,
    durationMs: data.durationMs,
    topScoreChanges: data.scoreChanges?.slice(0, 3).map((s) => ({
      name: s.name,
      before: s.originalScore.toFixed(4),
      after: s.rerankedScore.toFixed(4),
    })),
  })
}

/** Index statistics log data */
export interface IndexStatsLog {
  documentCount: number
  indexPath?: string
  initialized: boolean
}

/**
 * Log index statistics
 */
export function logIndexStats(data: IndexStatsLog): void {
  logDebug('info', 'index', 'Index statistics', {
    documentCount: data.documentCount,
    indexPath: data.indexPath,
    initialized: data.initialized,
    isEmpty: data.documentCount === 0,
  })
}

/** Complete search pipeline summary */
export interface SearchPipelineSummary {
  requestId: string
  query: string
  totalDurationMs: number
  stages: {
    embedding?: { durationMs: number; cacheHit: boolean }
    search: { durationMs: number; mode: string; resultCount: number }
    rerank?: { durationMs: number; inputCount: number; outputCount: number }
  }
  finalResultCount: number
  hasResults: boolean
}

/**
 * Log complete pipeline summary
 */
export function logPipelineSummary(data: SearchPipelineSummary): void {
  const level = data.hasResults ? 'info' : 'warn'

  logDebug(level, 'summary', `Search completed: ${data.finalResultCount} results in ${data.totalDurationMs}ms`, {
    requestId: data.requestId,
    query: data.query.substring(0, 50) + (data.query.length > 50 ? '...' : ''),
    totalDurationMs: data.totalDurationMs,
    stages: data.stages,
    finalResultCount: data.finalResultCount,
    hasResults: data.hasResults,
  })

  // Log warning banner for zero results
  if (!data.hasResults) {
    const separator = '='.repeat(60)
    console.warn(`\n${separator}`)
    console.warn('⚠️  ZERO RESULTS for query:', data.query)
    console.warn(separator)
    console.warn('Timing breakdown:')
    if (data.stages.embedding) {
      console.warn(`  - Embedding: ${data.stages.embedding.durationMs}ms (cache: ${data.stages.embedding.cacheHit})`)
    }
    console.warn(`  - Search: ${data.stages.search.durationMs}ms (mode: ${data.stages.search.mode})`)
    if (data.stages.rerank) {
      console.warn(`  - Rerank: ${data.stages.rerank.durationMs}ms`)
    }
    console.warn(`${separator}\n`)
  }
}
