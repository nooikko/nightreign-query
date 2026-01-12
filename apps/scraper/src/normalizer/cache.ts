/**
 * Normalized Data Cache
 *
 * Stores normalized content to filesystem to:
 * - Avoid re-normalizing unchanged content (saves API costs)
 * - Support incremental normalization (resume on failure)
 * - Enable re-processing only failed/changed items
 * - Track schema version for cache invalidation
 */

import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ContentType } from '@nightreign/types'
import type { NormalizedContent } from './claude'
import type { ContentChunk } from './schemas'

/**
 * Schema version - increment when schemas change to invalidate cache
 * v2: Improved infobox extraction (weakness, drops from Fextralife structure)
 * v3: Added boss combat data (HP per player, stance, parry, damage negation, status resistances)
 * v4: Updated Claude prompt to include new boss combat fields in output schema
 * v5: Fixed null handling - Claude instructed to omit optional fields instead of using null
 * v6: Added boilerplate text filtering, fixed chunk generation for empty values
 * v7: Direct normalization (no Claude) for bosses, weapons, enemies
 * v8: Fixed "Weaker to" extraction (was only matching "Weak to")
 */
export const SCHEMA_VERSION = 8

/**
 * Cached normalized entry
 */
export interface NormalizedCacheEntry {
  /** Source URL that was normalized */
  url: string
  /** Content type */
  contentType: ContentType
  /** Normalized data */
  data: NormalizedContent
  /** Generated content chunks */
  chunks: ContentChunk[]
  /** Hash of source HTML (to detect changes) */
  sourceHash: string
  /** Schema version used for normalization */
  schemaVersion: number
  /** Timestamp when normalized */
  timestamp: number
  /** Claude model used */
  model: string
}

/**
 * Cache metadata for quick lookups
 */
export interface NormalizedCacheMetadata {
  url: string
  contentType: ContentType
  sourceHash: string
  schemaVersion: number
  timestamp: number
  success: boolean
  errorMessage?: string
}

/**
 * Cache configuration
 */
export interface NormalizedCacheConfig {
  /** Directory to store normalized data */
  cacheDir: string
}

const DEFAULT_CONFIG: NormalizedCacheConfig = {
  cacheDir: './apps/scraper/cache/normalized',
}

/**
 * Generate a safe filename from a URL
 */
function urlToFilename(url: string): string {
  const hash = createHash('md5').update(url).digest('hex').slice(0, 8)
  const safeName = url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 100)
  return `${safeName}_${hash}`
}

/**
 * Hash content for change detection
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Create a normalized data cache manager
 */
export function createNormalizedCache(
  config: Partial<NormalizedCacheConfig> = {},
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const metadataPath = join(finalConfig.cacheDir, 'metadata.json')

  // Ensure cache directory exists
  if (!existsSync(finalConfig.cacheDir)) {
    mkdirSync(finalConfig.cacheDir, { recursive: true })
  }

  // Load or initialize metadata
  let metadata: Map<string, NormalizedCacheMetadata>
  try {
    if (existsSync(metadataPath)) {
      const data = JSON.parse(readFileSync(metadataPath, 'utf-8')) as Record<
        string,
        NormalizedCacheMetadata
      >
      metadata = new Map(Object.entries(data))
    } else {
      metadata = new Map()
    }
  } catch {
    metadata = new Map()
  }

  /**
   * Save metadata to disk
   */
  function saveMetadata(): void {
    const data = Object.fromEntries(metadata)
    writeFileSync(metadataPath, JSON.stringify(data, null, 2))
  }

  /**
   * Check if URL needs normalization
   *
   * Returns true if:
   * - Not in cache
   * - Source HTML has changed
   * - Schema version has changed
   * - Previous normalization failed
   */
  function needsNormalization(
    url: string,
    sourceHtml: string,
    options: { forceReprocess?: boolean } = {},
  ): boolean {
    if (options.forceReprocess) return true

    const meta = metadata.get(url)
    if (!meta) return true

    // Re-normalize if previous attempt failed
    if (!meta.success) return true

    // Re-normalize if schema version changed
    if (meta.schemaVersion !== SCHEMA_VERSION) return true

    // Re-normalize if source HTML changed
    const currentHash = hashContent(sourceHtml)
    if (meta.sourceHash !== currentHash) return true

    return false
  }

  /**
   * Get cached normalized data for a URL
   */
  async function get(url: string): Promise<NormalizedCacheEntry | null> {
    const meta = metadata.get(url)
    if (!meta || !meta.success) return null

    const filename = urlToFilename(url)
    const filepath = join(finalConfig.cacheDir, `${filename}.json`)

    if (!existsSync(filepath)) {
      metadata.delete(url)
      saveMetadata()
      return null
    }

    try {
      const content = await readFile(filepath, 'utf-8')
      return JSON.parse(content) as NormalizedCacheEntry
    } catch {
      metadata.delete(url)
      saveMetadata()
      return null
    }
  }

  /**
   * Store normalized data in cache
   */
  function set(
    url: string,
    contentType: ContentType,
    data: NormalizedContent,
    chunks: ContentChunk[],
    sourceHtml: string,
    model: string,
  ): void {
    const filename = urlToFilename(url)
    const filepath = join(finalConfig.cacheDir, `${filename}.json`)

    const entry: NormalizedCacheEntry = {
      url,
      contentType,
      data,
      chunks,
      sourceHash: hashContent(sourceHtml),
      schemaVersion: SCHEMA_VERSION,
      timestamp: Date.now(),
      model,
    }

    // Write normalized data
    writeFileSync(filepath, JSON.stringify(entry, null, 2))

    // Update metadata
    metadata.set(url, {
      url,
      contentType,
      sourceHash: entry.sourceHash,
      schemaVersion: SCHEMA_VERSION,
      timestamp: entry.timestamp,
      success: true,
    })
    saveMetadata()
  }

  /**
   * Record a failed normalization attempt
   */
  function setFailed(
    url: string,
    contentType: ContentType,
    sourceHtml: string,
    errorMessage: string,
  ): void {
    metadata.set(url, {
      url,
      contentType,
      sourceHash: hashContent(sourceHtml),
      schemaVersion: SCHEMA_VERSION,
      timestamp: Date.now(),
      success: false,
      errorMessage,
    })
    saveMetadata()
  }

  /**
   * Check if URL has successful cached normalization
   */
  function has(url: string): boolean {
    const meta = metadata.get(url)
    return meta?.success === true && meta.schemaVersion === SCHEMA_VERSION
  }

  /**
   * Get all cached URLs
   */
  function getAllUrls(): string[] {
    return Array.from(metadata.keys())
  }

  /**
   * Get URLs that need normalization from a list
   */
  function getUrlsNeedingNormalization(
    urls: Array<{ url: string; html: string }>,
    options: { forceReprocess?: boolean } = {},
  ): Array<{ url: string; html: string }> {
    return urls.filter(({ url, html }) =>
      needsNormalization(url, html, options),
    )
  }

  /**
   * Clear cache for a specific URL
   */
  function remove(url: string): void {
    const filename = urlToFilename(url)
    const filepath = join(finalConfig.cacheDir, `${filename}.json`)

    try {
      if (existsSync(filepath)) {
        require('node:fs').unlinkSync(filepath)
      }
    } catch {
      // Ignore deletion errors
    }

    metadata.delete(url)
    saveMetadata()
  }

  /**
   * Clear all cached data
   */
  function clear(): void {
    // Delete all JSON files
    try {
      const files = readdirSync(finalConfig.cacheDir)
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'metadata.json') {
          require('node:fs').unlinkSync(join(finalConfig.cacheDir, file))
        }
      }
    } catch {
      // Ignore errors
    }

    metadata.clear()
    saveMetadata()
  }

  /**
   * Get cache statistics
   */
  function getStats(): {
    totalEntries: number
    successfulEntries: number
    failedEntries: number
    outdatedEntries: number
    totalSizeBytes: number
    byContentType: Record<string, { success: number; failed: number }>
  } {
    let successfulEntries = 0
    let failedEntries = 0
    let outdatedEntries = 0
    let totalSizeBytes = 0
    const byContentType: Record<string, { success: number; failed: number }> =
      {}

    for (const [url, meta] of metadata) {
      // Initialize content type stats
      if (!byContentType[meta.contentType]) {
        byContentType[meta.contentType] = { success: 0, failed: 0 }
      }

      const typeStats = byContentType[meta.contentType]
      if (meta.schemaVersion !== SCHEMA_VERSION) {
        outdatedEntries++
      } else if (meta.success) {
        successfulEntries++
        if (typeStats) typeStats.success++
      } else {
        failedEntries++
        if (typeStats) typeStats.failed++
      }

      // Get file size
      const filename = urlToFilename(url)
      const filepath = join(finalConfig.cacheDir, `${filename}.json`)
      try {
        if (existsSync(filepath)) {
          const stats = statSync(filepath)
          totalSizeBytes += stats.size
        }
      } catch {
        // Ignore stat errors
      }
    }

    return {
      totalEntries: metadata.size,
      successfulEntries,
      failedEntries,
      outdatedEntries,
      totalSizeBytes,
      byContentType,
    }
  }

  /**
   * Get all successfully normalized entries for a content type
   */
  async function getAllByType(
    contentType: ContentType,
  ): Promise<NormalizedCacheEntry[]> {
    const entries: NormalizedCacheEntry[] = []

    for (const [url, meta] of metadata) {
      if (
        meta.contentType === contentType &&
        meta.success &&
        meta.schemaVersion === SCHEMA_VERSION
      ) {
        const entry = await get(url)
        if (entry) {
          entries.push(entry)
        }
      }
    }

    return entries
  }

  return {
    get,
    set,
    setFailed,
    has,
    needsNormalization,
    getUrlsNeedingNormalization,
    getAllUrls,
    getAllByType,
    remove,
    clear,
    getStats,
    config: finalConfig,
    schemaVersion: SCHEMA_VERSION,
  }
}

export type NormalizedCache = ReturnType<typeof createNormalizedCache>
