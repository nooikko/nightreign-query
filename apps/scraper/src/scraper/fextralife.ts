/**
 * Fextralife Wiki Scraper for Elden Ring Nightreign
 *
 * Uses Playwright to navigate and render wiki pages,
 * then extracts raw HTML for further processing.
 */

import {
  type Browser,
  type BrowserContext,
  type Page,
  chromium,
} from 'playwright'
import { createLogger } from '@utils/logger'
import { stripHtml } from '../normalizer/utils'
import { type CacheConfig, createCache } from './cache'
import { type RateLimiterConfig, createRateLimiter } from './rate-limiter'
import {
  isValidWikiUrl,
  shouldExcludeFromCategory,
} from './url-normalizer'

/** Logger for scraper operations */
const log = createLogger('scraper')

/** Base URL for the Fextralife Nightreign wiki */
export const WIKI_BASE_URL = 'https://eldenringnightreign.wiki.fextralife.com'

/** Content category URLs to scrape */
export const CATEGORY_URLS = {
  bosses: `${WIKI_BASE_URL}/Bosses`,
  weapons: `${WIKI_BASE_URL}/Weapons`,
  relics: `${WIKI_BASE_URL}/Relics`,
  skills: `${WIKI_BASE_URL}/Skills`,
  nightfarers: `${WIKI_BASE_URL}/Nightfarers+(Classes)`,
  talismans: `${WIKI_BASE_URL}/Talismans`,
  spells: `${WIKI_BASE_URL}/Magic+Spells`,
  armor: `${WIKI_BASE_URL}/Armor`,
  shields: `${WIKI_BASE_URL}/Shields`,
  enemies: `${WIKI_BASE_URL}/Creatures+and+Enemies`,
  npcs: `${WIKI_BASE_URL}/NPCs`,
  merchants: `${WIKI_BASE_URL}/Merchants`,
  locations: `${WIKI_BASE_URL}/Locations`,
  expeditions: `${WIKI_BASE_URL}/Expeditions`,
  items: `${WIKI_BASE_URL}/Items`,
} as const

export type ContentCategory = keyof typeof CATEGORY_URLS

/** Scrape result for a single page */
export interface ScrapeResult {
  url: string
  html: string
  title: string
  success: true
  cached: boolean
  timestamp: number
}

/** Scrape error for a failed page */
export interface ScrapeError {
  url: string
  success: false
  error: string
  timestamp: number
}

export type ScrapeOutcome = ScrapeResult | ScrapeError

/** Scraper configuration */
export interface ScraperConfig {
  /** Rate limiter settings */
  rateLimiter?: Partial<RateLimiterConfig>
  /** Cache settings */
  cache?: Partial<CacheConfig>
  /** Browser timeout in milliseconds */
  pageTimeoutMs?: number
  /** Whether to use cache */
  useCache?: boolean
  /** User agent string */
  userAgent?: string
}

const DEFAULT_SCRAPER_CONFIG: Required<ScraperConfig> = {
  rateLimiter: {
    maxConcurrent: 5,
    delayMs: 500,
    maxRetries: 3,
    backoffBaseMs: 1000,
  },
  cache: {
    cacheDir: './cache/html',
    ttlMs: 24 * 60 * 60 * 1000,
  },
  pageTimeoutMs: 30000,
  useCache: true,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

/**
 * Create a Fextralife wiki scraper
 */
export async function createScraper(config: ScraperConfig = {}) {
  const finalConfig = {
    ...DEFAULT_SCRAPER_CONFIG,
    ...config,
    rateLimiter: {
      ...DEFAULT_SCRAPER_CONFIG.rateLimiter,
      ...config.rateLimiter,
    },
    cache: { ...DEFAULT_SCRAPER_CONFIG.cache, ...config.cache },
  }

  const rateLimiter = createRateLimiter(finalConfig.rateLimiter)
  const cache = createCache(finalConfig.cache)

  let browser: Browser | null = null
  let context: BrowserContext | null = null

  /**
   * Initialize the browser
   */
  async function initialize(): Promise<void> {
    if (browser) return

    browser = await chromium.launch({
      headless: true,
    })

    context = await browser.newContext({
      userAgent: finalConfig.userAgent,
      viewport: { width: 1920, height: 1080 },
    })
  }

  /**
   * Close the browser and cleanup resources
   */
  async function close(): Promise<void> {
    if (context) {
      await context.close()
      context = null
    }
    if (browser) {
      await browser.close()
      browser = null
    }
  }

  /**
   * Get a new page from the browser context
   */
  async function getPage(): Promise<Page> {
    if (!context) {
      throw new Error('Browser not initialized. Call initialize() first.')
    }
    const page = await context.newPage()
    page.setDefaultTimeout(finalConfig.pageTimeoutMs)
    return page
  }

  /**
   * Scrape a single page and return its HTML
   */
  async function scrapePage(url: string): Promise<ScrapeOutcome> {
    const timestamp = Date.now()

    // Check cache first (async to avoid blocking)
    if (finalConfig.useCache) {
      const cached = await cache.get(url)
      if (cached) {
        log.debug('Cache hit', { url })
        return {
          url,
          html: cached.html,
          title: extractTitleFromHtml(cached.html),
          success: true,
          cached: true,
          timestamp,
        }
      }
    }

    // Scrape the page
    return rateLimiter
      .executeWithRetry(
        async () => {
          const page = await getPage()

          try {
            log.info('Scraping page', { url })

            // Navigate to the page
            // Using 'domcontentloaded' instead of 'networkidle' because Fextralife
            // has many ads/scripts that prevent network from ever going idle
            const response = await page.goto(url, {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            })

            if (!response) {
              throw new Error(`No response received for ${url}`)
            }

            const status = response.status()
            if (status === 404) {
              throw new Error(`Page not found (404): ${url}`)
            }
            if (status >= 400) {
              throw new Error(`HTTP error ${status} for ${url}`)
            }

            // Wait for main content to load
            await page
              .waitForSelector('#wiki-content-block', { timeout: 10000 })
              .catch(() => {
                // Some pages might not have this selector, continue anyway
              })

            // Get the page HTML
            const rawHtml = await page.content()
            const title = await page.title()

            // Strip unnecessary HTML (nav, scripts, styles) before caching
            // This reduces file size by ~70-80% and token usage significantly
            const html = stripHtml(rawHtml)

            // Store in cache
            if (finalConfig.useCache) {
              const headers = response.headers()
              const etag = headers.etag
              const lastModified = headers['last-modified']
              cache.set(url, html, { etag, lastModified })
            }

            log.info('Page scraped successfully', {
              url,
              title,
              htmlSize: html.length,
              rawSize: rawHtml.length,
              reduction: `${Math.round((1 - html.length / rawHtml.length) * 100)}%`,
            })

            return {
              url,
              html,
              title,
              success: true as const,
              cached: false,
              timestamp,
            }
          } finally {
            await page.close()
          }
        },
        {
          onRetry: (attempt, error) => {
            log.warn(`Retrying page scrape (attempt ${attempt})`, {
              url,
              error: error.message,
            })
          },
        },
      )
      .catch((error) => {
        log.error('Failed to scrape page', error, { url })
        return {
          url,
          success: false as const,
          error: error instanceof Error ? error.message : String(error),
          timestamp,
        }
      })
  }

  /**
   * Scrape multiple pages in parallel with rate limiting
   */
  async function scrapePages(urls: string[]): Promise<ScrapeOutcome[]> {
    // Fire off all requests - the rate limiter's pLimit handles concurrency
    return Promise.all(urls.map((url) => scrapePage(url)))
  }

  /**
   * Extract links to individual pages from a category page
   *
   * @param categoryUrl - URL of the category page to extract links from
   * @param category - Content category for filtering (optional)
   * @param maxLinks - Maximum number of links to extract (default: 1000)
   */
  async function extractLinksFromCategory(
    categoryUrl: string,
    category?: ContentCategory,
    maxLinks = 1000,
  ): Promise<string[]> {
    const result = await scrapePage(categoryUrl)

    if (!result.success) {
      throw new Error(`Failed to scrape category page: ${result.error}`)
    }

    // Import cheerio dynamically to parse HTML
    const { load } = await import('cheerio')
    const $ = load(result.html)

    const links: string[] = []
    const linkSet = new Set<string>() // Use Set for O(1) duplicate checking
    let excludedCount = 0

    /**
     * Helper to add a link if valid and under limit
     */
    const addLink = (href: string | undefined): boolean => {
      if (links.length >= maxLinks) {
        return false // Stop collecting
      }
      if (href?.startsWith('/') && !href.includes('#') && !href.includes(':')) {
        const fullUrl = `${WIKI_BASE_URL}${href}`

        // Skip if already seen
        if (linkSet.has(fullUrl)) {
          return true
        }

        // Validate URL is a proper wiki page
        if (!isValidWikiUrl(fullUrl)) {
          return true // Skip invalid URLs but continue iteration
        }

        // Apply category-specific filtering if category is provided
        if (category && shouldExcludeFromCategory(fullUrl, category)) {
          excludedCount++
          return true // Skip excluded URLs but continue iteration
        }

        linkSet.add(fullUrl)
        links.push(fullUrl)
      }
      return true // Continue collecting
    }

    // Find all links in the wiki content area
    $('#wiki-content-block a').each((_, element): boolean => {
      const href = $(element).attr('href')
      // Return false to stop iteration, true to continue
      return addLink(href)
    })

    // Also check table links which are common in category pages
    if (links.length < maxLinks) {
      $('table.wiki_table a').each((_, element): boolean => {
        const href = $(element).attr('href')
        // Return false to stop iteration, true to continue
        return addLink(href)
      })
    }

    if (links.length === maxLinks) {
      log.warn('Link extraction limit reached', { categoryUrl, maxLinks })
    }

    if (excludedCount > 0) {
      log.info('Filtered out unrelated links', { category, excludedCount })
    }

    return links
  }

  /**
   * Scrape all pages in a category
   */
  async function scrapeCategory(category: ContentCategory): Promise<{
    category: ContentCategory
    categoryUrl: string
    pages: ScrapeOutcome[]
    totalPages: number
    successCount: number
    errorCount: number
  }> {
    const categoryUrl = CATEGORY_URLS[category]
    log.info('Starting category scrape', { category, categoryUrl })

    // First, scrape the category page to get links (with category filtering)
    const links = await extractLinksFromCategory(categoryUrl, category)
    log.info('Found links in category', { category, linkCount: links.length })

    // Scrape all pages
    const pages = await scrapePages(links)

    const successCount = pages.filter((p) => p.success).length
    const errorCount = pages.filter((p) => !p.success).length

    log.info('Category scrape complete', {
      category,
      successCount,
      errorCount,
      totalPages: links.length,
    })

    return {
      category,
      categoryUrl,
      pages,
      totalPages: links.length,
      successCount,
      errorCount,
    }
  }

  /**
   * Scrape all categories
   */
  async function scrapeAllCategories(): Promise<{
    categories: Awaited<ReturnType<typeof scrapeCategory>>[]
    totalPages: number
    successCount: number
    errorCount: number
  }> {
    const categories: Awaited<ReturnType<typeof scrapeCategory>>[] = []

    for (const category of Object.keys(CATEGORY_URLS) as ContentCategory[]) {
      const result = await scrapeCategory(category)
      categories.push(result)
    }

    const totalPages = categories.reduce((sum, c) => sum + c.totalPages, 0)
    const successCount = categories.reduce((sum, c) => sum + c.successCount, 0)
    const errorCount = categories.reduce((sum, c) => sum + c.errorCount, 0)

    return {
      categories,
      totalPages,
      successCount,
      errorCount,
    }
  }

  /**
   * Get cache statistics
   */
  function getCacheStats() {
    return cache.getStats()
  }

  return {
    initialize,
    close,
    scrapePage,
    scrapePages,
    extractLinksFromCategory,
    scrapeCategory,
    scrapeAllCategories,
    getCacheStats,
    cache,
    rateLimiter,
    config: finalConfig,
  }
}

/**
 * Helper to extract title from HTML
 */
function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.trim() ?? 'Unknown'
}

export type Scraper = Awaited<ReturnType<typeof createScraper>>
