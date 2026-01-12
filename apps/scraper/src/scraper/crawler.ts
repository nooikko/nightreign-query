/**
 * Recursive Web Crawler for Fextralife Wiki
 *
 * Implements BFS (Breadth-First Search) crawling with:
 * - URL normalization for deduplication
 * - Visited URL tracking (persists across sessions via cache)
 * - Rate limiting integration
 * - Progress tracking and resume capability
 */

import { load } from 'cheerio'
import { createLogger } from '@utils/logger'
import type { Cache } from './cache'
import type { Scraper, ScrapeOutcome } from './fextralife'
import {
  isValidWikiUrl,
  normalizeUrl,
  toAbsoluteUrl,
} from './url-normalizer'

const log = createLogger('crawler')

/** Configuration for the recursive crawler */
export interface CrawlConfig {
  /** Initial URLs to start crawling from */
  seeds: string[]
  /** Maximum depth to crawl (undefined = no limit) */
  maxDepth?: number
  /** Maximum total pages to crawl (undefined = no limit) */
  maxPages?: number
  /** Custom filter function for URLs */
  shouldVisit?: (url: string) => boolean
  /** Progress callback */
  onProgress?: (progress: CrawlProgress) => void
  /** How often to call onProgress (in pages) */
  progressInterval?: number
}

/** Progress information during crawl */
export interface CrawlProgress {
  /** Total unique URLs discovered */
  totalDiscovered: number
  /** Total pages successfully visited */
  totalVisited: number
  /** URLs still in queue */
  totalQueued: number
  /** Current crawl depth being processed */
  currentDepth: number
  /** Pages scraped in this session */
  pagesScraped: number
  /** Pages served from cache */
  pagesFromCache: number
  /** Number of errors encountered */
  errorCount: number
  /** Start timestamp */
  startTime: number
  /** Estimated pages per second */
  pagesPerSecond: number
}

/** Result of a crawl operation */
export interface CrawlResult {
  /** All scrape outcomes */
  results: ScrapeOutcome[]
  /** All visited URLs (normalized) */
  visited: string[]
  /** Errors encountered */
  errors: Array<{ url: string; error: string }>
  /** Statistics */
  stats: {
    totalPages: number
    newPages: number
    cachedPages: number
    errorPages: number
    duration: number
    maxDepthReached: number
  }
}

/** Queue item for BFS traversal */
interface QueueItem {
  url: string
  depth: number
}

/**
 * Extract all internal wiki links from HTML content
 *
 * Searches multiple selectors to catch links in:
 * - Main content area
 * - Tables (common in wiki pages)
 * - Infoboxes
 * - Navigation elements
 */
export function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const $ = load(html)
  const links = new Set<string>()

  // Selectors that typically contain content links
  const selectors = [
    '#wiki-content-block a',
    'table.wiki_table a',
    '.infobox a',
    '.wiki-content a',
    'article a',
    '#tagged-pages a',
    '.page-content a',
  ]

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const href = $(element).attr('href')
      if (!href) return

      // Skip anchors, javascript, mailto, etc.
      if (
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return
      }

      // Convert to absolute URL
      let absoluteUrl: string
      if (href.startsWith('/')) {
        absoluteUrl = toAbsoluteUrl(href)
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        absoluteUrl = href
      } else {
        // Relative path - resolve against base URL
        try {
          absoluteUrl = new URL(href, baseUrl).href
        } catch {
          return // Invalid URL
        }
      }

      // Validate and normalize
      if (isValidWikiUrl(absoluteUrl)) {
        links.add(normalizeUrl(absoluteUrl))
      }
    })
  }

  return Array.from(links)
}

/**
 * Create a recursive crawler that uses an existing scraper and cache
 */
export function createCrawler(scraper: Scraper, cache: Cache) {
  /**
   * Crawl pages starting from seed URLs using BFS
   */
  async function crawl(config: CrawlConfig): Promise<CrawlResult> {
    const startTime = Date.now()
    const {
      seeds,
      maxDepth,
      maxPages,
      shouldVisit,
      onProgress,
      progressInterval = 10,
    } = config

    // Initialize visited set from cache (for resume capability)
    const visited = new Set<string>()
    const cacheUrls = cache.getAllUrls()
    for (const url of cacheUrls) {
      visited.add(normalizeUrl(url))
    }
    log.info('Initialized visited set from cache', {
      cachedUrls: cacheUrls.length,
    })

    // Initialize queue with seeds
    const queue: QueueItem[] = []
    for (const seed of seeds) {
      const normalized = normalizeUrl(seed)
      if (!visited.has(normalized)) {
        queue.push({ url: normalized, depth: 0 })
      }
    }

    // Track all discovered URLs (for stats)
    const discovered = new Set<string>(visited)
    for (const item of queue) {
      discovered.add(item.url)
    }

    const results: ScrapeOutcome[] = []
    const errors: Array<{ url: string; error: string }> = []
    let pagesScraped = 0
    let pagesFromCache = 0
    let maxDepthReached = 0

    log.info('Starting crawl', {
      seeds: seeds.length,
      maxDepth,
      maxPages,
      initialQueue: queue.length,
      alreadyVisited: visited.size,
    })

    // BFS loop
    while (queue.length > 0) {
      // Check max pages limit
      if (maxPages !== undefined && results.length >= maxPages) {
        log.info('Max pages limit reached', { maxPages })
        break
      }

      const item = queue.shift()
      if (!item) continue
      const { url, depth } = item

      // Skip if already visited (could happen with duplicate queue entries)
      if (visited.has(url)) {
        continue
      }

      // Check depth limit
      if (maxDepth !== undefined && depth > maxDepth) {
        continue
      }

      // Check custom filter
      if (shouldVisit && !shouldVisit(url)) {
        continue
      }

      // Mark as visited
      visited.add(url)
      maxDepthReached = Math.max(maxDepthReached, depth)

      // Scrape the page (uses cache if available)
      const result = await scraper.scrapePage(url)
      results.push(result)

      if (result.success) {
        if (result.cached) {
          pagesFromCache++
        } else {
          pagesScraped++
        }

        // Extract links and add to queue
        const links = extractLinksFromHtml(result.html, url)
        let newLinksFound = 0

        for (const link of links) {
          if (!discovered.has(link)) {
            discovered.add(link)
            queue.push({ url: link, depth: depth + 1 })
            newLinksFound++
          }
        }

        log.debug('Page processed', {
          url,
          depth,
          linksFound: links.length,
          newLinks: newLinksFound,
          queueSize: queue.length,
        })
      } else {
        errors.push({ url, error: result.error })
        log.warn('Page scrape failed', { url, error: result.error })
      }

      // Progress callback
      if (onProgress && results.length % progressInterval === 0) {
        const elapsed = (Date.now() - startTime) / 1000
        onProgress({
          totalDiscovered: discovered.size,
          totalVisited: visited.size,
          totalQueued: queue.length,
          currentDepth: depth,
          pagesScraped,
          pagesFromCache,
          errorCount: errors.length,
          startTime,
          pagesPerSecond: results.length / elapsed,
        })
      }
    }

    const duration = Date.now() - startTime

    log.info('Crawl complete', {
      totalPages: results.length,
      newPages: pagesScraped,
      cachedPages: pagesFromCache,
      errors: errors.length,
      duration: `${(duration / 1000).toFixed(1)}s`,
      maxDepthReached,
      totalDiscovered: discovered.size,
    })

    return {
      results,
      visited: Array.from(visited),
      errors,
      stats: {
        totalPages: results.length,
        newPages: pagesScraped,
        cachedPages: pagesFromCache,
        errorPages: errors.length,
        duration,
        maxDepthReached,
      },
    }
  }

  /**
   * Crawl starting from all pages currently in the cache
   *
   * This extracts links from cached HTML and crawls any new URLs found.
   */
  async function crawlFromCache(options?: {
    maxDepth?: number
    maxPages?: number
    onProgress?: (progress: CrawlProgress) => void
  }): Promise<CrawlResult> {
    const cacheUrls = cache.getAllUrls()

    log.info('Starting crawl from cache', {
      cachedPages: cacheUrls.length,
    })

    // First, extract all links from cached pages without re-fetching
    const allLinks = new Set<string>()
    let processedCount = 0

    for (const url of cacheUrls) {
      const cached = await cache.get(url)
      if (cached) {
        const links = extractLinksFromHtml(cached.html, url)
        for (const link of links) {
          allLinks.add(link)
        }
      }
      processedCount++

      if (processedCount % 100 === 0) {
        log.info('Extracting links from cache', {
          processed: processedCount,
          total: cacheUrls.length,
          linksFound: allLinks.size,
        })
      }
    }

    log.info('Link extraction from cache complete', {
      totalLinksFound: allLinks.size,
      cachedPages: cacheUrls.length,
    })

    // Find URLs that aren't in the cache yet
    const cachedNormalized = new Set(cacheUrls.map(normalizeUrl))
    const newUrls = Array.from(allLinks).filter(
      (link) => !cachedNormalized.has(link)
    )

    log.info('New URLs to crawl', {
      newUrls: newUrls.length,
      alreadyCached: allLinks.size - newUrls.length,
    })

    if (newUrls.length === 0) {
      log.info('No new URLs to crawl - cache is complete')
      return {
        results: [],
        visited: Array.from(cachedNormalized),
        errors: [],
        stats: {
          totalPages: 0,
          newPages: 0,
          cachedPages: cacheUrls.length,
          errorPages: 0,
          duration: 0,
          maxDepthReached: 0,
        },
      }
    }

    // Crawl the new URLs (they become seeds, depth starts at 1 since they're linked from cached pages)
    return crawl({
      seeds: newUrls,
      maxDepth: options?.maxDepth,
      maxPages: options?.maxPages,
      onProgress: options?.onProgress,
    })
  }

  /**
   * Get statistics about potential new URLs in cached pages
   */
  async function analyzeCacheLinks(): Promise<{
    totalCachedPages: number
    totalLinksFound: number
    newUrlsToDiscover: number
    urlsByDomain: Map<string, number>
  }> {
    const cacheUrls = cache.getAllUrls()
    const allLinks = new Set<string>()
    const urlsByDomain = new Map<string, number>()

    for (const url of cacheUrls) {
      const cached = await cache.get(url)
      if (cached) {
        const links = extractLinksFromHtml(cached.html, url)
        for (const link of links) {
          allLinks.add(link)

          // Track by domain
          try {
            const domain = new URL(link).hostname
            urlsByDomain.set(domain, (urlsByDomain.get(domain) || 0) + 1)
          } catch {
            // Ignore invalid URLs
          }
        }
      }
    }

    const cachedNormalized = new Set(cacheUrls.map(normalizeUrl))
    const newUrls = Array.from(allLinks).filter(
      (link) => !cachedNormalized.has(link)
    )

    return {
      totalCachedPages: cacheUrls.length,
      totalLinksFound: allLinks.size,
      newUrlsToDiscover: newUrls.length,
      urlsByDomain,
    }
  }

  return {
    crawl,
    crawlFromCache,
    analyzeCacheLinks,
    extractLinksFromHtml,
  }
}

export type Crawler = ReturnType<typeof createCrawler>
