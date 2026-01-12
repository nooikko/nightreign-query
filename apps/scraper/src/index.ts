#!/usr/bin/env node

/**
 * Nightreign Scraper CLI
 *
 * Scrapes Fextralife wiki data and normalizes it using Claude API
 * for the Nightreign Quick Reference application.
 */

import 'dotenv/config'
import type { ContentType } from '@nightreign/types'
import { getEmbeddingGenerator } from '@embeddings/generator'
import {
  createNormalizedCache,
  SCHEMA_VERSION,
} from '@normalizer/cache'
import { createNormalizer } from '@normalizer/claude'
import {
  normalizeDirect,
  supportsDirectNormalization,
} from '@normalizer/direct'
import { parseContent } from '@normalizer/parser'
import type { ParsedContent } from '@normalizer/types'
import { createCrawler, type CrawlProgress } from '@scraper/crawler'
import {
  CATEGORY_URLS,
  type ContentCategory,
  createScraper,
} from '@scraper/fextralife'
import {
  type Logger,
  configureLogger,
  createLogger,
  getDefaultLogPath,
} from '@utils/logger'

/** Global logger instance */
let log: Logger

/** Default cache directory for scraped HTML files */
const DEFAULT_CACHE_DIR = './apps/scraper/cache/html'

const COMMANDS = {
  scrape: 'Scrape a single category or URL from Fextralife wiki',
  'scrape:all': 'Scrape all categories from Fextralife wiki',
  crawl: 'Recursively crawl from cached pages, discovering new URLs',
  'crawl:analyze': 'Analyze cached pages for undiscovered URLs',
  parse: 'Parse a cached HTML page into structured data',
  'parse:all': 'Parse all cached HTML pages for a category',
  'cache:stats': 'Show cache statistics',
  'cache:clear': 'Clear the HTML cache',
  normalize: 'Normalize scraped data using Claude API',
  'normalize:all': 'Normalize all scraped data for a category using Claude',
  embed: 'Generate embeddings for text (test command)',
  'embed:test': 'Test embedding generation with sample texts',
  import: 'Import normalized data into SQLite database',
  index: 'Build Orama search index with embeddings',
} as const

/** Map scraper categories to content types */
const CATEGORY_TO_CONTENT_TYPE: Record<ContentCategory, ContentType> = {
  bosses: 'boss',
  weapons: 'weapon',
  relics: 'relic',
  skills: 'skill',
  nightfarers: 'nightfarer',
  talismans: 'talisman',
  spells: 'spell',
  armor: 'armor',
  shields: 'shield',
  enemies: 'enemy',
  npcs: 'npc',
  merchants: 'merchant',
  locations: 'location',
  expeditions: 'expedition',
}

function printHelp(): void {
  console.log('Nightreign Scraper CLI')
  console.log('======================')
  console.log('')
  console.log('Commands:')
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(15)} - ${desc}`)
  }
  console.log('')
  console.log('Usage:')
  console.log('  pnpm --filter scraper run start <command> [options]')
  console.log('')
  console.log('Options:')
  console.log('  --debug, -d     Enable debug logging')
  console.log(
    '  --log-file, -l  Write logs to file (auto-enabled for scrape:all, normalize:all)',
  )
  console.log('')
  console.log('Examples:')
  console.log('  pnpm --filter scraper run start scrape bosses')
  console.log('  pnpm --filter scraper run start scrape:all')
  console.log('  pnpm --filter scraper run start scrape:all --debug')
  console.log('  pnpm --filter scraper run start cache:stats')
  console.log('')
  console.log('Categories:')
  for (const category of Object.keys(CATEGORY_URLS)) {
    console.log(`  ${category}`)
  }
}

async function handleScrape(args: string[]): Promise<void> {
  const target = args[0]

  if (!target) {
    console.error('Error: Please specify a category or URL to scrape')
    console.log('')
    console.log('Available categories:')
    for (const category of Object.keys(CATEGORY_URLS)) {
      console.log(`  ${category}`)
    }
    process.exit(1)
  }

  const scraper = await createScraper({
    cache: {
      cacheDir: DEFAULT_CACHE_DIR,
    },
  })

  try {
    await scraper.initialize()

    // Check if it's a category
    if (target in CATEGORY_URLS) {
      console.log(`\nScraping category: ${target}`)
      console.log('='.repeat(40))

      const result = await scraper.scrapeCategory(target as ContentCategory)

      console.log('')
      console.log('Summary:')
      console.log(`  Category: ${result.category}`)
      console.log(`  Total pages: ${result.totalPages}`)
      console.log(`  Successful: ${result.successCount}`)
      console.log(`  Errors: ${result.errorCount}`)
    } else if (target.startsWith('http')) {
      // It's a URL
      console.log(`\nScraping URL: ${target}`)
      console.log('='.repeat(40))

      const result = await scraper.scrapePage(target)

      if (result.success) {
        console.log('')
        console.log('Success!')
        console.log(`  Title: ${result.title}`)
        console.log(`  Cached: ${result.cached}`)
        console.log(`  HTML length: ${result.html.length} bytes`)
      } else {
        console.error(`Failed: ${result.error}`)
        process.exit(1)
      }
    } else {
      console.error(`Error: Unknown category "${target}"`)
      console.log('')
      console.log('Available categories:')
      for (const category of Object.keys(CATEGORY_URLS)) {
        console.log(`  ${category}`)
      }
      process.exit(1)
    }
  } finally {
    await scraper.close()
  }
}

async function handleScrapeAll(): Promise<void> {
  const scraper = await createScraper({
    cache: {
      cacheDir: DEFAULT_CACHE_DIR,
    },
  })

  try {
    await scraper.initialize()

    console.log('\nScraping all categories...')
    console.log('='.repeat(40))

    const startTime = Date.now()
    const result = await scraper.scrapeAllCategories()
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('')
    console.log('='.repeat(40))
    console.log('Final Summary:')
    console.log(`  Duration: ${duration}s`)
    console.log(`  Total pages: ${result.totalPages}`)
    console.log(`  Successful: ${result.successCount}`)
    console.log(`  Errors: ${result.errorCount}`)
    console.log('')
    console.log('By category:')
    for (const cat of result.categories) {
      console.log(`  ${cat.category}: ${cat.successCount}/${cat.totalPages}`)
    }
  } finally {
    await scraper.close()
  }
}

async function handleCacheStats(): Promise<void> {
  const scraper = await createScraper({
    cache: {
      cacheDir: DEFAULT_CACHE_DIR,
    },
  })

  const stats = scraper.getCacheStats()

  console.log('\nCache Statistics:')
  console.log('='.repeat(40))
  console.log(`  Total entries: ${stats.totalEntries}`)
  console.log(`  Expired entries: ${stats.expiredEntries}`)
  console.log(
    `  Total size: ${(stats.totalSizeBytes / 1024 / 1024).toFixed(2)} MB`,
  )
}

async function handleCacheClear(): Promise<void> {
  const scraper = await createScraper({
    cache: {
      cacheDir: DEFAULT_CACHE_DIR,
    },
  })

  const statsBefore = scraper.getCacheStats()
  scraper.cache.clear()

  console.log('\nCache cleared!')
  console.log(`  Removed ${statsBefore.totalEntries} entries`)
}

async function handleParse(args: string[]): Promise<void> {
  const [category, url] = args

  if (!category) {
    console.error('Error: Please specify a category')
    console.log('')
    console.log('Usage: parse <category> [url]')
    console.log('')
    console.log('Categories:')
    for (const cat of Object.keys(CATEGORY_URLS)) {
      console.log(`  ${cat}`)
    }
    process.exit(1)
  }

  if (!(category in CATEGORY_URLS)) {
    console.error(`Error: Unknown category "${category}"`)
    process.exit(1)
  }

  const contentType = CATEGORY_TO_CONTENT_TYPE[category as ContentCategory]
  const scraper = await createScraper({
    cache: {
      cacheDir: DEFAULT_CACHE_DIR,
    },
  })

  try {
    await scraper.initialize()

    if (url) {
      // Parse a single URL
      console.log(`\nParsing: ${url}`)
      console.log('='.repeat(40))

      const result = await scraper.scrapePage(url)

      if (!result.success) {
        console.error(`Failed to fetch page: ${result.error}`)
        process.exit(1)
      }

      const parseResult = parseContent(result.html, url, contentType)

      if (parseResult.success) {
        console.log('\nParsed successfully!')
        console.log(JSON.stringify(parseResult.data, null, 2))

        if (parseResult.data.parseWarnings.length > 0) {
          console.log('\nWarnings:')
          for (const warning of parseResult.data.parseWarnings) {
            console.log(`  - ${warning}`)
          }
        }
      } else {
        console.error(`Parse failed: ${parseResult.error}`)
        process.exit(1)
      }
    } else {
      // Parse all cached pages for the category
      console.log(`\nParsing all cached pages for category: ${category}`)
      console.log('='.repeat(40))

      // First get links from category page
      const categoryUrl = CATEGORY_URLS[category as ContentCategory]
      const links = await scraper.extractLinksFromCategory(categoryUrl)

      console.log(`Found ${links.length} pages to parse`)

      let successCount = 0
      let errorCount = 0
      const results: ParsedContent[] = []

      for (const pageUrl of links) {
        const pageResult = await scraper.scrapePage(pageUrl)

        if (!pageResult.success) {
          console.log(`[SKIP] ${pageUrl}: ${pageResult.error}`)
          errorCount++
          continue
        }

        const parseResult = parseContent(pageResult.html, pageUrl, contentType)

        if (parseResult.success) {
          console.log(`[OK] ${parseResult.data.name}`)
          results.push(parseResult.data)
          successCount++
        } else {
          console.log(`[FAIL] ${pageUrl}: ${parseResult.error}`)
          errorCount++
        }
      }

      console.log('')
      console.log('='.repeat(40))
      console.log('Summary:')
      console.log(`  Total: ${links.length}`)
      console.log(`  Parsed: ${successCount}`)
      console.log(`  Errors: ${errorCount}`)
      console.log('')
      console.log(`Parsed ${results.length} ${contentType} entries`)
    }
  } finally {
    await scraper.close()
  }
}

async function handleCrawl(args: string[]): Promise<void> {
  const maxDepthArg = args.find((a) => a.startsWith('--depth='))
  const maxPagesArg = args.find((a) => a.startsWith('--max='))

  const maxDepth = maxDepthArg
    ? Number.parseInt(maxDepthArg.split('=')[1] ?? '3', 10)
    : 3
  const maxPages = maxPagesArg
    ? Number.parseInt(maxPagesArg.split('=')[1] ?? '0', 10) || undefined
    : undefined

  const scraper = await createScraper({
    cache: {
      cacheDir: DEFAULT_CACHE_DIR,
    },
  })

  const crawler = createCrawler(scraper, scraper.cache)

  try {
    await scraper.initialize()

    console.log('\nRecursive Crawler')
    console.log('='.repeat(50))
    console.log(`  Max depth: ${maxDepth}`)
    console.log(`  Max pages: ${maxPages || 'unlimited'}`)
    console.log('')

    // First analyze what we'll be crawling
    console.log('Analyzing cache for new URLs...')
    const analysis = await crawler.analyzeCacheLinks()
    console.log(`  Cached pages: ${analysis.totalCachedPages}`)
    console.log(`  Total links found: ${analysis.totalLinksFound}`)
    console.log(`  New URLs to crawl: ${analysis.newUrlsToDiscover}`)
    console.log('')

    if (analysis.newUrlsToDiscover === 0) {
      console.log('No new URLs to crawl - cache appears complete!')
      return
    }

    console.log('Starting crawl...')
    console.log('')

    const startTime = Date.now()
    let lastProgressTime = startTime

    const result = await crawler.crawlFromCache({
      maxDepth,
      maxPages,
      onProgress: (progress: CrawlProgress) => {
        const now = Date.now()
        // Only log every 2 seconds to avoid spam
        if (now - lastProgressTime < 2000) return
        lastProgressTime = now

        const elapsed = ((now - startTime) / 1000).toFixed(1)
        console.log(
          `  [${elapsed}s] Pages: ${progress.pagesScraped + progress.pagesFromCache} | ` +
            `Queue: ${progress.totalQueued} | ` +
            `Depth: ${progress.currentDepth} | ` +
            `Rate: ${progress.pagesPerSecond.toFixed(1)}/s`
        )
      },
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('')
    console.log('='.repeat(50))
    console.log('Crawl Complete!')
    console.log('')
    console.log('Statistics:')
    console.log(`  Duration: ${duration}s`)
    console.log(`  Total pages processed: ${result.stats.totalPages}`)
    console.log(`  New pages scraped: ${result.stats.newPages}`)
    console.log(`  Pages from cache: ${result.stats.cachedPages}`)
    console.log(`  Errors: ${result.stats.errorPages}`)
    console.log(`  Max depth reached: ${result.stats.maxDepthReached}`)
    console.log(`  Total visited URLs: ${result.visited.length}`)

    if (result.errors.length > 0) {
      console.log('')
      console.log('Errors:')
      for (const err of result.errors.slice(0, 10)) {
        console.log(`  - ${err.url}: ${err.error}`)
      }
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`)
      }
    }
  } finally {
    await scraper.close()
  }
}

async function handleCrawlAnalyze(): Promise<void> {
  const scraper = await createScraper({
    cache: {
      cacheDir: DEFAULT_CACHE_DIR,
    },
  })

  const crawler = createCrawler(scraper, scraper.cache)

  console.log('\nAnalyzing cached pages for undiscovered URLs...')
  console.log('='.repeat(50))
  console.log('')

  const analysis = await crawler.analyzeCacheLinks()

  console.log('Results:')
  console.log(`  Cached pages: ${analysis.totalCachedPages}`)
  console.log(`  Total links found in content: ${analysis.totalLinksFound}`)
  console.log(`  New URLs to discover: ${analysis.newUrlsToDiscover}`)
  console.log('')

  if (analysis.urlsByDomain.size > 0) {
    console.log('URLs by domain:')
    const sorted = Array.from(analysis.urlsByDomain.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    for (const [domain, count] of sorted) {
      console.log(`  ${domain}: ${count}`)
    }
  }

  console.log('')
  if (analysis.newUrlsToDiscover > 0) {
    console.log('Run "crawl" to scrape the new URLs:')
    console.log('  pnpm --filter scraper run start crawl')
    console.log('')
    console.log('Options:')
    console.log('  --depth=N   Maximum crawl depth (default: 3)')
    console.log('  --max=N     Maximum pages to scrape')
  } else {
    console.log('Cache appears complete - no new URLs to discover!')
  }
}

async function handleEmbed(args: string[]): Promise<void> {
  const testText = args.join(' ') || 'How do I defeat Maris in phase 2?'

  console.log('\nEmbedding Generator Test')
  console.log('='.repeat(50))
  console.log('Model: BAAI/bge-small-en-v1.5')
  console.log('Dimensions: 384')
  console.log('')

  const generator = getEmbeddingGenerator()

  console.log('Initializing model (first load may take a moment)...')
  const initStart = Date.now()
  await generator.initialize()
  console.log(`Model initialized in ${Date.now() - initStart}ms`)
  console.log('')

  // Test single embedding
  console.log('Test 1: Single embedding')
  console.log(`  Text: "${testText}"`)
  const singleStart = Date.now()
  const embedding = await generator.embed(testText)
  const singleTime = Date.now() - singleStart
  console.log(`  Time: ${singleTime}ms`)
  console.log(`  Dimensions: ${embedding.length}`)
  console.log(
    `  First 5 values: [${Array.from(embedding.slice(0, 5))
      .map((v) => v.toFixed(4))
      .join(', ')}]`,
  )
  console.log('')

  // Test batch embedding
  const testTexts = [
    'How do I defeat Maris in phase 2?',
    'Best weapons for fire damage',
    'Guardian class passive ability',
    'Relic effects for spell damage',
    'Moonveil katana scaling',
  ]

  console.log('Test 2: Batch embedding (5 texts)')
  const batchResult = await generator.embedBatch(testTexts)
  console.log(`  Time: ${batchResult.processingTimeMs}ms`)
  console.log(`  Results: ${batchResult.results.length}`)
  console.log(`  Errors: ${batchResult.errors.length}`)
  console.log('')

  // Test similarity
  console.log('Test 3: Cosine similarity')
  const { EmbeddingGenerator } = await import('./embeddings/generator.js')
  const text1 = 'fire damage weapons'
  const text2 = 'weapons that deal fire damage'
  const text3 = 'healing spells and magic'

  const emb1 = await generator.embed(text1)
  const emb2 = await generator.embed(text2)
  const emb3 = await generator.embed(text3)

  const sim12 = EmbeddingGenerator.cosineSimilarity(emb1, emb2)
  const sim13 = EmbeddingGenerator.cosineSimilarity(emb1, emb3)

  console.log(
    `  "${text1}" vs "${text2}": ${sim12.toFixed(4)} (should be high)`,
  )
  console.log(`  "${text1}" vs "${text3}": ${sim13.toFixed(4)} (should be low)`)
  console.log('')

  // Test Bytes conversion
  console.log('Test 4: Bytes conversion (for Prisma storage)')
  const bytes = EmbeddingGenerator.toBytes(embedding)
  const recovered = EmbeddingGenerator.fromBytes(bytes)
  const bytesMatch = embedding.every((v, i) => v === recovered[i])
  console.log(`  Original size: ${embedding.length * 4} bytes`)
  console.log(`  Buffer size: ${bytes.length} bytes`)
  console.log(`  Roundtrip match: ${bytesMatch ? 'OK' : 'FAIL'}`)
  console.log('')

  console.log('='.repeat(50))
  console.log('All tests completed successfully!')
}

async function handleNormalize(args: string[]): Promise<void> {
  const category = args[0]
  const forceReprocess = args.includes('--force') || args.includes('-f')

  if (!category) {
    console.error('Error: Please specify a category')
    console.log('')
    console.log('Usage: normalize <category> [options]')
    console.log('')
    console.log('Options:')
    console.log('  --force, -f   Re-normalize all items (ignore cache)')
    console.log('')
    console.log('Categories:')
    for (const cat of Object.keys(CATEGORY_URLS)) {
      console.log(`  ${cat}`)
    }
    console.log('')
    console.log('Environment:')
    console.log('  ANTHROPIC_API_KEY must be set')
    process.exit(1)
  }

  if (!(category in CATEGORY_URLS)) {
    console.error(`Error: Unknown category "${category}"`)
    process.exit(1)
  }

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set')
    console.log('')
    console.log('Set your Anthropic API key:')
    console.log('  export ANTHROPIC_API_KEY=<your-api-key>')
    console.log('')
    console.log('Get your API key at https://console.anthropic.com/')
    process.exit(1)
  }

  const contentType = CATEGORY_TO_CONTENT_TYPE[category as ContentCategory]
  const scraper = await createScraper({
    cache: {
      cacheDir: DEFAULT_CACHE_DIR,
    },
  })

  const normalizer = createNormalizer()
  const normalizedCache = createNormalizedCache()

  try {
    await scraper.initialize()

    console.log(`\nNormalizing category: ${category}`)
    console.log('='.repeat(50))
    console.log(`  Schema version: ${SCHEMA_VERSION}`)
    console.log(`  Force reprocess: ${forceReprocess}`)

    // Show cache stats
    const cacheStats = normalizedCache.getStats()
    console.log(`  Cached normalizations: ${cacheStats.successfulEntries}`)
    console.log('')

    // First get links from category page
    const categoryUrl = CATEGORY_URLS[category as ContentCategory]
    const links = await scraper.extractLinksFromCategory(categoryUrl)

    console.log(`Found ${links.length} pages in category`)
    console.log('')

    // Parse all pages and check cache
    interface ParsedItem {
      parsed: ParsedContent
      html: string
      url: string
      needsNormalization: boolean
    }
    const parsedItems: ParsedItem[] = []
    let parseSuccess = 0
    let parseError = 0
    let skippedFromCache = 0

    console.log('Step 1: Parsing HTML pages and checking cache...')
    for (const pageUrl of links) {
      const pageResult = await scraper.scrapePage(pageUrl)

      if (!pageResult.success) {
        parseError++
        continue
      }

      const parseResult = parseContent(pageResult.html, pageUrl, contentType)

      if (parseResult.success) {
        const needsNorm = normalizedCache.needsNormalization(
          pageUrl,
          pageResult.html,
          { forceReprocess },
        )

        if (!needsNorm) {
          skippedFromCache++
        }

        parsedItems.push({
          parsed: parseResult.data,
          html: pageResult.html,
          url: pageUrl,
          needsNormalization: needsNorm,
        })
        parseSuccess++
      } else {
        parseError++
      }
    }

    console.log(`  Parsed: ${parseSuccess}, Errors: ${parseError}`)
    console.log(`  Already normalized (cached): ${skippedFromCache}`)
    console.log('')

    // Filter to items needing normalization
    const itemsToNormalize = parsedItems.filter((item) => item.needsNormalization)

    if (itemsToNormalize.length === 0) {
      console.log('All items are already normalized!')
      console.log('')
      console.log('Use --force to re-normalize all items:')
      console.log(`  pnpm start normalize ${category} --force`)
      return
    }

    console.log(`Items to normalize: ${itemsToNormalize.length}`)
    console.log('')

    // Determine if we can use direct normalization
    const useDirect = supportsDirectNormalization(contentType)

    if (useDirect) {
      console.log('Step 2: Normalizing directly (no Claude API)...')
      console.log('  Mode: Deterministic')
      console.log('')
    } else {
      console.log('Step 2: Normalizing with Claude API...')
      console.log('  Model: claude-3-5-haiku-20241022')
      console.log('  Rate limit: 2 req/sec, 5 concurrent')
      console.log('')
    }

    const startTime = Date.now()
    let normalizeSuccess = 0
    let normalizeError = 0
    let directCount = 0
    let claudeCount = 0

    // Process items one at a time to store results immediately
    let completed = 0
    for (const item of itemsToNormalize) {
      let result: { success: true; data: unknown; chunks: unknown[] } | { success: false; error: string }

      // Try direct normalization first for supported types
      if (useDirect) {
        const directResult = normalizeDirect(item.parsed)
        if (directResult.success) {
          result = directResult as typeof result
          directCount++
        } else if (directResult.needsClaude) {
          // Fall back to Claude
          result = await normalizer.normalize(item.parsed)
          claudeCount++
        } else {
          result = directResult
        }
      } else {
        // Use Claude for unsupported types
        result = await normalizer.normalize(item.parsed)
        claudeCount++
      }

      completed++

      const pct = Math.round((completed / itemsToNormalize.length) * 100)
      process.stdout.write(
        `\r  Progress: ${completed}/${itemsToNormalize.length} (${pct}%)`,
      )

      if (result.success) {
        normalizeSuccess++
        // Store in cache
        normalizedCache.set(
          item.url,
          contentType,
          result.data as import('@normalizer/claude').NormalizedContent,
          result.chunks as import('@normalizer/schemas').ContentChunk[],
          item.html,
          useDirect && directCount > claudeCount ? 'direct' : 'claude-3-5-haiku-20241022',
        )
      } else {
        normalizeError++
        // Record failure
        normalizedCache.setFailed(item.url, contentType, item.html, result.error)
        console.log(`\n  [FAIL] ${item.parsed.name}: ${result.error}`)
      }

      // Only add delay for Claude API calls
      if (!useDirect || claudeCount > directCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }

    console.log('') // New line after progress

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('')
    console.log('='.repeat(50))
    console.log('Summary:')
    console.log(`  Duration: ${duration}s`)
    console.log(`  Total items in category: ${parsedItems.length}`)
    console.log(`  Already cached (skipped): ${skippedFromCache}`)
    console.log(`  Normalized this run: ${normalizeSuccess}`)
    if (directCount > 0 || claudeCount > 0) {
      console.log(`    - Direct (no API): ${directCount}`)
      console.log(`    - Claude API: ${claudeCount}`)
    }
    console.log(`  Errors this run: ${normalizeError}`)
    console.log('')

    // Show updated cache stats
    const newCacheStats = normalizedCache.getStats()
    console.log('Cache Statistics:')
    console.log(`  Total cached: ${newCacheStats.successfulEntries}`)
    console.log(`  Failed: ${newCacheStats.failedEntries}`)
    console.log(`  Outdated (old schema): ${newCacheStats.outdatedEntries}`)
    console.log(
      `  Size: ${(newCacheStats.totalSizeBytes / 1024 / 1024).toFixed(2)} MB`,
    )

    if (normalizeError > 0) {
      console.log('')
      console.log('To retry failed items, run the command again.')
      console.log('Failed items are automatically retried on next run.')
    }
  } finally {
    await scraper.close()
  }
}

/**
 * Import normalized data into SQLite database
 */
async function handleImport(): Promise<void> {
  // Dynamic import to avoid loading Prisma unless needed
  const { prisma } = await import('@nightreign/database')
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const normalizedDir = './apps/scraper/cache/normalized'

  console.log('\nImporting normalized data to SQLite')
  console.log('='.repeat(50))
  console.log('')

  // Read all JSON files except metadata.json
  const files = await fs.readdir(normalizedDir)
  const jsonFiles = files.filter(
    (f) => f.endsWith('.json') && f !== 'metadata.json'
  )

  console.log(`Found ${jsonFiles.length} normalized files`)
  console.log('')

  // Group by content type
  const byType: Record<string, string[]> = {}
  for (const file of jsonFiles) {
    const filePath = path.join(normalizedDir, file)
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'))
    const type = content.contentType as string
    if (!byType[type]) byType[type] = []
    byType[type].push(filePath)
  }

  console.log('By content type:')
  for (const [type, paths] of Object.entries(byType)) {
    console.log(`  ${type}: ${paths.length}`)
  }
  console.log('')

  const startTime = Date.now()
  let total = 0
  let success = 0
  let errors = 0
  const errorList: Array<{ name: string; type: string; error: string }> = []

  // Import each content type
  for (const [type, paths] of Object.entries(byType)) {
    console.log(`Importing ${type}...`)

    for (const filePath of paths) {
      total++
      try {
        const content = JSON.parse(await fs.readFile(filePath, 'utf-8'))
        const data = content.data

        // Skip items with missing required data
        if (!data || !data.name) {
          errors++
          errorList.push({ name: filePath, type, error: 'Missing name' })
          continue
        }

        // Import based on content type
        switch (type) {
          case 'boss':
            await prisma.boss.upsert({
              where: { name: data.name },
              update: {
                category: data.category || 'Unknown',
                location: data.location || '',
                weaknesses: data.weaknesses || [],
                phases: data.phases || [],
                strategies: data.strategies || '',
                rewards: data.rewards || '',
                hpByPlayerCount: data.hpByPlayerCount,
                stance: data.stance,
                parryInfo: data.parryInfo,
                damageNegation: data.damageNegation,
                statusResistances: data.statusResistances,
                strongerVs: data.strongerVs,
                damageTypesDealt: data.damageTypesDealt,
                statusEffectsInflicted: data.statusEffectsInflicted,
                tags: data.tags,
              },
              create: {
                name: data.name,
                category: data.category || 'Unknown',
                location: data.location || '',
                weaknesses: data.weaknesses || [],
                phases: data.phases || [],
                strategies: data.strategies || '',
                rewards: data.rewards || '',
                hpByPlayerCount: data.hpByPlayerCount,
                stance: data.stance,
                parryInfo: data.parryInfo,
                damageNegation: data.damageNegation,
                statusResistances: data.statusResistances,
                strongerVs: data.strongerVs,
                damageTypesDealt: data.damageTypesDealt,
                statusEffectsInflicted: data.statusEffectsInflicted,
                tags: data.tags,
              },
            })
            break

          case 'weapon':
            await prisma.weapon.upsert({
              where: { name: data.name },
              update: {
                type: data.type || 'Unknown',
                stats: data.stats || {},
                statusBuildup: data.statusBuildup,
                scaling: data.scaling || {},
                skill: data.skill || '',
                description: data.description || '',
                passiveBenefits: data.passiveBenefits,
                uniqueEffect: data.uniqueEffect,
                tags: data.tags,
              },
              create: {
                name: data.name,
                type: data.type || 'Unknown',
                stats: data.stats || {},
                statusBuildup: data.statusBuildup,
                scaling: data.scaling || {},
                skill: data.skill || '',
                description: data.description || '',
                passiveBenefits: data.passiveBenefits,
                uniqueEffect: data.uniqueEffect,
                tags: data.tags,
              },
            })
            break

          case 'relic':
            await prisma.relic.upsert({
              where: { name: data.name },
              update: {
                color: data.color || 'Unknown',
                tier: data.tier || '',
                effects: data.effects || [],
                tags: data.tags,
              },
              create: {
                name: data.name,
                color: data.color || 'Unknown',
                tier: data.tier || '',
                effects: data.effects || [],
                tags: data.tags,
              },
            })
            break

          case 'nightfarer':
            await prisma.nightfarer.upsert({
              where: { name: data.name },
              update: {
                stats: data.stats || {},
                passive: data.passive,
                skill: data.skill,
                ultimate: data.ultimate,
                vessel: data.vessel,
                tags: data.tags,
              },
              create: {
                name: data.name,
                stats: data.stats || {},
                passive: data.passive,
                skill: data.skill,
                ultimate: data.ultimate,
                vessel: data.vessel,
                tags: data.tags,
              },
            })
            break

          case 'skill':
            await prisma.skill.upsert({
              where: { name: data.name },
              update: {
                fpCost: data.fpCost || 0,
                weaponTypes: data.weaponTypes || [],
                effect: data.effect || '',
                tags: data.tags,
              },
              create: {
                name: data.name,
                fpCost: data.fpCost || 0,
                weaponTypes: data.weaponTypes || [],
                effect: data.effect || '',
                tags: data.tags,
              },
            })
            break

          case 'talisman':
            await prisma.talisman.upsert({
              where: { name: data.name },
              update: {
                effect: data.effect || '',
                weight: data.weight,
                location: data.location || '',
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                effect: data.effect || '',
                weight: data.weight,
                location: data.location || '',
                tags: data.tags || [],
              },
            })
            break

          case 'spell':
            await prisma.spell.upsert({
              where: { name: data.name },
              update: {
                spellType: data.spellType || 'Unknown',
                fpCost: data.fpCost || 0,
                slots: data.slots || 1,
                effect: data.effect || '',
                requirements: data.requirements || '',
                location: data.location || '',
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                spellType: data.spellType || 'Unknown',
                fpCost: data.fpCost || 0,
                slots: data.slots || 1,
                effect: data.effect || '',
                requirements: data.requirements || '',
                location: data.location || '',
                tags: data.tags || [],
              },
            })
            break

          case 'armor':
            await prisma.armor.upsert({
              where: { name: data.name },
              update: {
                slot: data.slot || 'Unknown',
                weight: data.weight,
                poise: data.poise,
                damageNegation: data.damageNegation || '',
                resistance: data.resistance || '',
                location: data.location || '',
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                slot: data.slot || 'Unknown',
                weight: data.weight,
                poise: data.poise,
                damageNegation: data.damageNegation || '',
                resistance: data.resistance || '',
                location: data.location || '',
                tags: data.tags || [],
              },
            })
            break

          case 'shield':
            await prisma.shield.upsert({
              where: { name: data.name },
              update: {
                shieldType: data.shieldType || 'Unknown',
                weight: data.weight,
                guardBoost: data.guardBoost,
                skill: data.skill || '',
                requirements: data.requirements || '',
                location: data.location || '',
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                shieldType: data.shieldType || 'Unknown',
                weight: data.weight,
                guardBoost: data.guardBoost,
                skill: data.skill || '',
                requirements: data.requirements || '',
                location: data.location || '',
                tags: data.tags || [],
              },
            })
            break

          case 'enemy':
            await prisma.enemy.upsert({
              where: { name: data.name },
              update: {
                category: data.category || 'Unknown',
                locations: data.locations || [],
                weaknesses: data.weaknesses || [],
                drops: data.drops || [],
                strategies: data.strategies || '',
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                category: data.category || 'Unknown',
                locations: data.locations || [],
                weaknesses: data.weaknesses || [],
                drops: data.drops || [],
                strategies: data.strategies || '',
                tags: data.tags || [],
              },
            })
            break

          case 'npc':
            await prisma.nPC.upsert({
              where: { name: data.name },
              update: {
                role: data.role || 'Unknown',
                location: data.location || '',
                quests: data.quests || [],
                services: data.services || [],
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                role: data.role || 'Unknown',
                location: data.location || '',
                quests: data.quests || [],
                services: data.services || [],
                tags: data.tags || [],
              },
            })
            break

          case 'merchant':
            await prisma.merchant.upsert({
              where: { name: data.name },
              update: {
                location: data.location || '',
                inventory: data.inventory || '',
                notableItems: data.notableItems || [],
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                location: data.location || '',
                inventory: data.inventory || '',
                notableItems: data.notableItems || [],
                tags: data.tags || [],
              },
            })
            break

          case 'location':
            await prisma.location.upsert({
              where: { name: data.name },
              update: {
                region: data.region || '',
                description: data.description || '',
                elementalAffinity: data.elementalAffinity,
                notableItems: data.notableItems || [],
                enemies: data.enemies || [],
                bosses: data.bosses || [],
                connections: data.connections || [],
                crystalTypes: data.crystalTypes,
                favor: data.favor,
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                region: data.region || '',
                description: data.description || '',
                elementalAffinity: data.elementalAffinity,
                notableItems: data.notableItems || [],
                enemies: data.enemies || [],
                bosses: data.bosses || [],
                connections: data.connections || [],
                crystalTypes: data.crystalTypes,
                favor: data.favor,
                tags: data.tags || [],
              },
            })
            break

          case 'expedition':
            await prisma.expedition.upsert({
              where: { name: data.name },
              update: {
                difficulty: data.difficulty || 'Unknown',
                recommendedLevel: data.recommendedLevel,
                objectives: data.objectives || [],
                rewards: data.rewards || [],
                locations: data.locations || [],
                strategies: data.strategies || '',
                tags: data.tags || [],
              },
              create: {
                name: data.name,
                difficulty: data.difficulty || 'Unknown',
                recommendedLevel: data.recommendedLevel,
                objectives: data.objectives || [],
                rewards: data.rewards || [],
                locations: data.locations || [],
                strategies: data.strategies || '',
                tags: data.tags || [],
              },
            })
            break

          default:
            // Skip unknown types
            errors++
            errorList.push({ name: data.name, type, error: 'Unknown type' })
            continue
        }

        success++
      } catch (e) {
        errors++
        const errorMsg = e instanceof Error ? e.message : String(e)
        errorList.push({ name: filePath, type, error: errorMsg })
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('')
  console.log('='.repeat(50))
  console.log('Import Complete!')
  console.log(`  Duration: ${duration}s`)
  console.log(`  Total: ${total}`)
  console.log(`  Success: ${success}`)
  console.log(`  Errors: ${errors}`)

  if (errorList.length > 0 && errorList.length <= 10) {
    console.log('')
    console.log('Errors:')
    for (const err of errorList) {
      console.log(`  [${err.type}] ${err.name}: ${err.error}`)
    }
  } else if (errorList.length > 10) {
    console.log('')
    console.log(`First 10 errors (${errorList.length} total):`)
    for (const err of errorList.slice(0, 10)) {
      console.log(`  [${err.type}] ${err.name}: ${err.error}`)
    }
  }

  // Show database counts
  console.log('')
  console.log('Database counts:')
  const counts = await Promise.all([
    prisma.boss.count(),
    prisma.weapon.count(),
    prisma.relic.count(),
    prisma.nightfarer.count(),
    prisma.skill.count(),
    prisma.talisman.count(),
    prisma.spell.count(),
    prisma.armor.count(),
    prisma.shield.count(),
    prisma.enemy.count(),
    prisma.nPC.count(),
    prisma.merchant.count(),
    prisma.location.count(),
    prisma.expedition.count(),
  ])
  const labels = [
    'boss', 'weapon', 'relic', 'nightfarer', 'skill', 'talisman',
    'spell', 'armor', 'shield', 'enemy', 'npc', 'merchant',
    'location', 'expedition'
  ]
  for (let i = 0; i < labels.length; i++) {
    const count = counts[i]
    if (count !== undefined && count > 0) {
      console.log(`  ${labels[i]}: ${count}`)
    }
  }

  await prisma.$disconnect()
}

/**
 * Build Orama search index with embeddings
 */
async function handleIndex(): Promise<void> {
  const { prisma, createOramaIndex } = await import('@nightreign/database')
  const generator = getEmbeddingGenerator()

  console.log('\nBuilding Orama Search Index')
  console.log('='.repeat(50))
  console.log('')

  // Initialize embedding generator
  console.log('Initializing embedding model...')
  await generator.initialize()
  console.log('')

  // Create fresh Orama index
  // Use absolute path relative to project root to ensure consistency
  const path = await import('node:path')
  const projectRoot = process.cwd()
  const indexPath = path.join(projectRoot, 'packages', 'database', 'data', 'orama-index.json')
  console.log(`Index will be saved to: ${indexPath}`)
  const orama = createOramaIndex(indexPath)
  await orama.initialize()
  orama.clear()

  const startTime = Date.now()
  let totalDocs = 0
  let indexed = 0
  let errors = 0

  // Helper to create searchable content and add to index
  async function indexItems<T extends { name: string }>(
    type: string,
    items: T[],
    contentFn: (item: T) => string,
    tagsFn: (item: T) => string[]
  ): Promise<void> {
    console.log(`Indexing ${items.length} ${type}s...`)
    totalDocs += items.length

    const texts = items.map(contentFn)
    const embedResult = await generator.embedBatch(texts, (done, total) => {
      process.stdout.write(`\r  Progress: ${done}/${total}`)
    })
    console.log('')

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const embedding = embedResult.results.find(r => r.text === texts[i])

      if (!item || !embedding) {
        errors++
        continue
      }

      try {
        await orama.add({
          type,
          name: item.name,
          section: 'overview',
          content: texts[i] || '',
          tags: tagsFn(item),
          sourceUrl: '',
          embedding: Array.from(embedding.embedding),
        })
        indexed++
      } catch {
        errors++
      }
    }
  }

  // Index bosses - chunk by section (overview, strategy, weaknesses, rewards)
  const bosses = await prisma.boss.findMany()
  console.log(`Indexing ${bosses.length} bosses (chunked by section)...`)

  interface BossChunk {
    name: string
    section: string
    content: string
    tags: string[]
  }

  const bossChunks: BossChunk[] = []

  for (const b of bosses) {
    const baseTags = ['boss', b.category.toLowerCase(), ...(b.tags as string[] || [])]

    // Overview chunk
    bossChunks.push({
      name: b.name,
      section: 'overview',
      content: `${b.name} is a ${b.category} boss in Elden Ring Nightreign.`,
      tags: [...baseTags, 'overview'],
    })

    // Strategy chunk
    if (b.strategies) {
      bossChunks.push({
        name: b.name,
        section: 'strategy',
        content: `How to defeat ${b.name}: ${b.strategies}`,
        tags: [...baseTags, 'strategy', 'guide', 'how-to'],
      })
    }

    // Weaknesses chunk
    const weaknesses = b.weaknesses as string[] || []
    if (weaknesses.length > 0) {
      bossChunks.push({
        name: b.name,
        section: 'weaknesses',
        content: `${b.name}'s weaknesses: ${weaknesses.join(', ')}`,
        tags: [...baseTags, 'weakness', 'damage-type'],
      })
    }

    // Rewards chunk
    if (b.rewards) {
      bossChunks.push({
        name: b.name,
        section: 'rewards',
        content: `${b.name} drops: ${b.rewards}`,
        tags: [...baseTags, 'rewards', 'drops', 'loot'],
      })
    }
  }

  // Index all boss chunks
  totalDocs += bossChunks.length
  const bossTexts = bossChunks.map(c => c.content)
  const bossEmbedResult = await generator.embedBatch(bossTexts, (done, total) => {
    process.stdout.write(`\r  Progress: ${done}/${total}`)
  })
  console.log('')

  for (let i = 0; i < bossChunks.length; i++) {
    const chunk = bossChunks[i]
    const embedding = bossEmbedResult.results.find(r => r.text === bossTexts[i])

    if (!chunk || !embedding) {
      errors++
      continue
    }

    try {
      await orama.add({
        type: 'boss',
        name: chunk.name,
        section: chunk.section,
        content: chunk.content,
        tags: chunk.tags,
        sourceUrl: '',
        embedding: Array.from(embedding.embedding),
      })
      indexed++
    } catch {
      errors++
    }
  }

  // Index weapons
  const weapons = await prisma.weapon.findMany()
  await indexItems(
    'weapon',
    weapons,
    (w) => `${w.name} is a ${w.type}. ${w.description}. Skill: ${w.skill}`,
    (w) => ['weapon', w.type.toLowerCase(), ...(w.tags as string[] || [])]
  )

  // Index relics
  const relics = await prisma.relic.findMany()
  await indexItems(
    'relic',
    relics,
    (r) => `${r.name} is a ${r.color} ${r.tier} relic. Effects: ${(r.effects as string[]).join(', ')}`,
    (r) => ['relic', r.color.toLowerCase(), ...(r.tags as string[] || [])]
  )

  // Index nightfarers - chunk by section for precise retrieval
  // Instead of one doc per nightfarer, create separate docs for skill/passive/ultimate
  const nightfarers = await prisma.nightfarer.findMany()
  console.log(`Indexing ${nightfarers.length} nightfarers (chunked by section)...`)

  // Build chunks for each nightfarer
  interface NightfarerChunk {
    name: string
    section: string
    content: string
    tags: string[]
  }

  const nightfarerChunks: NightfarerChunk[] = []

  for (const n of nightfarers) {
    const baseTags = ['nightfarer', 'class', n.name.toLowerCase(), ...(n.tags as string[] || [])]

    // Overview chunk - brief intro
    nightfarerChunks.push({
      name: n.name,
      section: 'overview',
      content: `${n.name} is a playable nightfarer class in Elden Ring Nightreign.`,
      tags: [...baseTags, 'overview'],
    })

    // Skill chunk - the active ability (grappling claw, etc.)
    if (n.skill) {
      nightfarerChunks.push({
        name: n.name,
        section: 'skill',
        content: `${n.name}'s skill ability: ${n.skill}`,
        tags: [...baseTags, 'skill', 'ability', 'active'],
      })
    }

    // Passive chunk - the passive ability
    if (n.passive) {
      nightfarerChunks.push({
        name: n.name,
        section: 'passive',
        content: `${n.name}'s passive ability: ${n.passive}`,
        tags: [...baseTags, 'passive', 'ability'],
      })
    }

    // Ultimate chunk - the ultimate ability
    if (n.ultimate) {
      nightfarerChunks.push({
        name: n.name,
        section: 'ultimate',
        content: `${n.name}'s ultimate ability: ${n.ultimate}`,
        tags: [...baseTags, 'ultimate', 'ability', 'art'],
      })
    }

    // Equipment/vessel chunk - starting equipment
    if (n.vessel) {
      nightfarerChunks.push({
        name: n.name,
        section: 'equipment',
        content: `${n.name}'s starting equipment (vessel): ${n.vessel}`,
        tags: [...baseTags, 'equipment', 'vessel', 'starting-gear'],
      })
    }
  }

  // Now index all the chunks
  totalDocs += nightfarerChunks.length
  const nightfarerTexts = nightfarerChunks.map(c => c.content)
  const nightfarerEmbedResult = await generator.embedBatch(nightfarerTexts, (done, total) => {
    process.stdout.write(`\r  Progress: ${done}/${total}`)
  })
  console.log('')

  for (let i = 0; i < nightfarerChunks.length; i++) {
    const chunk = nightfarerChunks[i]
    const embedding = nightfarerEmbedResult.results.find(r => r.text === nightfarerTexts[i])

    if (!chunk || !embedding) {
      errors++
      continue
    }

    try {
      await orama.add({
        type: 'nightfarer',
        name: chunk.name,
        section: chunk.section,
        content: chunk.content,
        tags: chunk.tags,
        sourceUrl: '',
        embedding: Array.from(embedding.embedding),
      })
      indexed++
    } catch {
      errors++
    }
  }

  // Index skills
  const skills = await prisma.skill.findMany()
  await indexItems(
    'skill',
    skills,
    (s) => `${s.name} costs ${s.fpCost} FP. ${s.effect}. Compatible with: ${(s.weaponTypes as string[]).join(', ')}`,
    (s) => ['skill', ...(s.tags as string[] || [])]
  )

  // Index talismans
  const talismans = await prisma.talisman.findMany()
  await indexItems(
    'talisman',
    talismans,
    (t) => `${t.name} talisman. ${t.effect}. Found at: ${t.location}`,
    (t) => ['talisman', ...(t.tags as string[] || [])]
  )

  // Index spells
  const spells = await prisma.spell.findMany()
  await indexItems(
    'spell',
    spells,
    (s) => `${s.name} is a ${s.spellType} that costs ${s.fpCost} FP and uses ${s.slots} slot(s). ${s.effect}. Requirements: ${s.requirements}`,
    (s) => ['spell', s.spellType.toLowerCase(), ...(s.tags as string[] || [])]
  )

  // Index armor
  const armors = await prisma.armor.findMany()
  await indexItems(
    'armor',
    armors,
    (a) => `${a.name} is ${a.slot} armor. ${a.damageNegation}. ${a.resistance}`,
    (a) => ['armor', a.slot.toLowerCase(), ...(a.tags as string[] || [])]
  )

  // Index shields
  const shields = await prisma.shield.findMany()
  await indexItems(
    'shield',
    shields,
    (s) => `${s.name} is a ${s.shieldType} shield. Skill: ${s.skill}. Requirements: ${s.requirements}`,
    (s) => ['shield', s.shieldType.toLowerCase(), ...(s.tags as string[] || [])]
  )

  // Index enemies
  const enemies = await prisma.enemy.findMany()
  await indexItems(
    'enemy',
    enemies,
    (e) => `${e.name} is a ${e.category} enemy. ${e.strategies} Weaknesses: ${(e.weaknesses as string[]).join(', ')}. Drops: ${(e.drops as string[]).join(', ')}`,
    (e) => ['enemy', e.category.toLowerCase(), ...(e.tags as string[] || [])]
  )

  // Index NPCs
  const npcs = await prisma.nPC.findMany()
  await indexItems(
    'npc',
    npcs,
    (n) => `${n.name} is a ${n.role}. Located at ${n.location}. Services: ${(n.services as string[]).join(', ')}`,
    (n) => ['npc', n.role.toLowerCase(), ...(n.tags as string[] || [])]
  )

  // Index merchants
  const merchants = await prisma.merchant.findMany()
  await indexItems(
    'merchant',
    merchants,
    (m) => `${m.name} merchant at ${m.location}. ${m.inventory}. Notable items: ${(m.notableItems as string[]).join(', ')}`,
    (m) => ['merchant', ...(m.tags as string[] || [])]
  )

  // Index locations
  const locations = await prisma.location.findMany()
  await indexItems(
    'location',
    locations,
    (l) => `${l.name} is in ${l.region}. ${l.description}. Bosses: ${(l.bosses as string[]).join(', ')}. Enemies: ${(l.enemies as string[]).join(', ')}`,
    (l) => ['location', l.region.toLowerCase(), ...(l.tags as string[] || [])]
  )

  // Index expeditions
  const expeditions = await prisma.expedition.findMany()
  await indexItems(
    'expedition',
    expeditions,
    (e) => `${e.name} is a ${e.difficulty} expedition. ${e.strategies} Objectives: ${(e.objectives as string[]).join(', ')}. Rewards: ${(e.rewards as string[]).join(', ')}`,
    (e) => ['expedition', e.difficulty.toLowerCase(), ...(e.tags as string[] || [])]
  )

  // Save the index
  console.log('')
  console.log('Saving index to file...')
  await orama.saveToFile()

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('')
  console.log('='.repeat(50))
  console.log('Index Build Complete!')
  console.log(`  Duration: ${duration}s`)
  console.log(`  Total documents: ${totalDocs}`)
  console.log(`  Indexed: ${indexed}`)
  console.log(`  Errors: ${errors}`)
  console.log(`  Index saved to: ${indexPath}`)

  await prisma.$disconnect()
}

/**
 * Initialize logging for the CLI
 */
function initializeLogging(command: string): void {
  const isDebug =
    process.argv.includes('--debug') || process.argv.includes('-d')
  const logToFile =
    process.argv.includes('--log-file') || process.argv.includes('-l')

  const config: Parameters<typeof configureLogger>[0] = {
    level: isDebug ? 'debug' : 'info',
    colors: true,
  }

  // Enable file logging for long-running operations
  if (logToFile || ['scrape:all', 'normalize:all'].includes(command)) {
    config.logFile = getDefaultLogPath()
  }

  configureLogger(config)
  log = createLogger('cli')

  if (config.logFile) {
    log.info(`Logging to file: ${config.logFile}`)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  if (
    !command ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    printHelp()
    return
  }

  // Initialize logging
  initializeLogging(command)
  log.info(`Starting command: ${command}`, { args: args.slice(1) })

  const startTime = Date.now()

  try {
    switch (command) {
      case 'scrape':
        await handleScrape(args.slice(1))
        break

      case 'scrape:all':
        await handleScrapeAll()
        break

      case 'crawl':
        await handleCrawl(args.slice(1))
        break

      case 'crawl:analyze':
        await handleCrawlAnalyze()
        break

      case 'cache:stats':
        await handleCacheStats()
        break

      case 'cache:clear':
        await handleCacheClear()
        break

      case 'parse':
      case 'parse:all':
        await handleParse(args.slice(1))
        break

      case 'normalize':
      case 'normalize:all':
        await handleNormalize(args.slice(1))
        break

      case 'embed':
      case 'embed:test':
        await handleEmbed(args.slice(1))
        break

      case 'import':
        await handleImport()
        break

      case 'index':
        await handleIndex()
        break

      default:
        log.error(`Unknown command: ${command}`)
        printHelp()
        process.exit(1)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    log.info('Command completed successfully', {
      command,
      durationSec: duration,
    })
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    log.error(`Command failed: ${command}`, error, { durationSec: duration })
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  // Fallback if logging isn't initialized yet
  if (log) {
    log.error('Fatal error', error)
  } else {
    console.error('Fatal error:', error)
  }
  process.exit(1)
})
