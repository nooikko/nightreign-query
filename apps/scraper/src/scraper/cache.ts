/**
 * HTML cache for scraped pages
 *
 * Caches raw HTML to filesystem to:
 * - Avoid re-scraping unchanged pages
 * - Allow re-processing without hitting the server
 * - Support incremental updates
 */

import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface CacheEntry {
  html: string
  url: string
  timestamp: number
  etag?: string
  lastModified?: string
}

export interface CacheMetadata {
  url: string
  timestamp: number
  contentHash: string
  etag?: string
  lastModified?: string
}

export interface CacheConfig {
  /** Directory to store cached HTML files */
  cacheDir: string
  /** Time-to-live in milliseconds (default: 24 hours) */
  ttlMs: number
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  cacheDir: './cache',
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
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
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Create an HTML cache manager
 */
export function createCache(config: Partial<CacheConfig> = {}) {
  const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config }
  const metadataPath = join(finalConfig.cacheDir, 'metadata.json')

  // Ensure cache directory exists
  if (!existsSync(finalConfig.cacheDir)) {
    mkdirSync(finalConfig.cacheDir, { recursive: true })
  }

  // Load or initialize metadata
  let metadata: Map<string, CacheMetadata>
  try {
    if (existsSync(metadataPath)) {
      const data = JSON.parse(readFileSync(metadataPath, 'utf-8')) as Record<
        string,
        CacheMetadata
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
   * Get cached HTML for a URL (async for non-blocking I/O)
   */
  async function get(url: string): Promise<CacheEntry | null> {
    const meta = metadata.get(url)
    if (!meta) return null

    // Check if cache is expired
    if (Date.now() - meta.timestamp > finalConfig.ttlMs) {
      return null
    }

    const filename = urlToFilename(url)
    const filepath = join(finalConfig.cacheDir, `${filename}.html`)

    if (!existsSync(filepath)) {
      metadata.delete(url)
      saveMetadata()
      return null
    }

    try {
      // Use async readFile to avoid blocking the event loop
      const html = await readFile(filepath, 'utf-8')
      return {
        html,
        url,
        timestamp: meta.timestamp,
        etag: meta.etag,
        lastModified: meta.lastModified,
      }
    } catch {
      metadata.delete(url)
      saveMetadata()
      return null
    }
  }

  /**
   * Store HTML in cache
   */
  function set(
    url: string,
    html: string,
    options: { etag?: string; lastModified?: string } = {},
  ): void {
    const filename = urlToFilename(url)
    const filepath = join(finalConfig.cacheDir, `${filename}.html`)

    // Ensure directory exists
    const dir = dirname(filepath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Write HTML file
    writeFileSync(filepath, html)

    // Update metadata
    metadata.set(url, {
      url,
      timestamp: Date.now(),
      contentHash: hashContent(html),
      etag: options.etag,
      lastModified: options.lastModified,
    })
    saveMetadata()
  }

  /**
   * Check if URL is cached and not expired
   */
  function has(url: string): boolean {
    const meta = metadata.get(url)
    if (!meta) return false
    return Date.now() - meta.timestamp <= finalConfig.ttlMs
  }

  /**
   * Check if content has changed (by hash comparison)
   */
  function hasChanged(url: string, newHtml: string): boolean {
    const meta = metadata.get(url)
    if (!meta) return true
    return hashContent(newHtml) !== meta.contentHash
  }

  /**
   * Get metadata for a URL
   */
  function getMeta(url: string): CacheMetadata | undefined {
    return metadata.get(url)
  }

  /**
   * Get all cached URLs
   */
  function getAllUrls(): string[] {
    return Array.from(metadata.keys())
  }

  /**
   * Clear cache for a specific URL
   */
  function remove(url: string): void {
    metadata.delete(url)
    saveMetadata()
  }

  /**
   * Clear all cached data
   */
  function clear(): void {
    metadata.clear()
    saveMetadata()
  }

  /**
   * Get cache statistics
   *
   * Uses statSync for file sizes instead of reading entire file contents,
   * significantly improving performance for large caches.
   */
  function getStats(): {
    totalEntries: number
    expiredEntries: number
    totalSizeBytes: number
  } {
    let expiredEntries = 0
    let totalSizeBytes = 0
    const now = Date.now()

    for (const [url, meta] of metadata) {
      if (now - meta.timestamp > finalConfig.ttlMs) {
        expiredEntries++
      }

      const filename = urlToFilename(url)
      const filepath = join(finalConfig.cacheDir, `${filename}.html`)
      try {
        // Use statSync to get file size without reading entire contents
        // This is much faster than readFileSync for large files
        const stats = statSync(filepath)
        totalSizeBytes += stats.size
      } catch {
        // Ignore stat errors (file may not exist or be inaccessible)
      }
    }

    return {
      totalEntries: metadata.size,
      expiredEntries,
      totalSizeBytes,
    }
  }

  return {
    get,
    set,
    has,
    hasChanged,
    getMeta,
    getAllUrls,
    remove,
    clear,
    getStats,
    config: finalConfig,
  }
}

export type Cache = ReturnType<typeof createCache>
