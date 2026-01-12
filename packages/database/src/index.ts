export * from '../generated/prisma'
export { prisma, PrismaClient } from './client'

// Search module
export {
  OramaIndex,
  getOramaIndex,
  createOramaIndex,
  EMBEDDING_DIMENSIONS,
  type OramaDocument,
  type OramaSearchResult,
  type SearchOptions,
  HybridSearch,
  getHybridSearch,
  createHybridSearch,
  type HybridSearchQuery,
  type HybridSearchResult,
  type HybridSearchResponse,
  type SearchTiming,
  QueryEmbedder,
  getQueryEmbedder,
  createQueryEmbedder,
  embedQuery,
  QUERY_EMBEDDING_DIMENSIONS,
  // Pre-warming utilities
  PREWARM_QUERIES,
  prewarmEmbeddingCache,
  getCacheStats,
} from './search'

// Storage module
export {
  storeBoss,
  storeWeapon,
  storeRelic,
  storeNightfarer,
  storeSkill,
  storeContentChunk,
  rebuildOramaIndex,
  saveOramaIndex,
  bufferToEmbedding,
  type StorageOptions,
  type StorageResult,
  type BatchStorageResult,
} from './storage'
