/**
 * Search Module
 *
 * Exports Orama search index and hybrid search functionality.
 */

export {
  OramaIndex,
  getOramaIndex,
  createOramaIndex,
  EMBEDDING_DIMENSIONS,
  type OramaDocument,
  type OramaSearchResult,
  type SearchOptions,
} from './orama'

export {
  HybridSearch,
  getHybridSearch,
  createHybridSearch,
  type HybridSearchQuery,
  type HybridSearchResult,
  type HybridSearchResponse,
  type SearchTiming,
} from './hybrid'

export {
  QueryEmbedder,
  getQueryEmbedder,
  createQueryEmbedder,
  embedQuery,
  QUERY_EMBEDDING_DIMENSIONS,
} from './embeddings'

export {
  Reranker,
  getReranker,
  createReranker,
  rerankResults,
  type RerankItem,
  type RerankResult,
} from './reranker'

export {
  PREWARM_QUERIES,
  prewarmEmbeddingCache,
  getCacheStats,
} from './prewarm'

export {
  isSearchDebugEnabled,
  logQueryPreprocess,
  logEmbedding,
  logSearchExecution,
  logSearchResults,
  logReranking,
  logIndexStats,
  logPipelineSummary,
  type QueryPreprocessLog,
  type EmbeddingLog,
  type SearchExecutionLog,
  type SearchResultItem,
  type SearchResultsLog,
  type RerankingLog,
  type IndexStatsLog,
  type SearchPipelineSummary,
} from './debug-logger'
