# Research: Web Scraping Stack and Claude API for Wiki Content Normalization

Date: 2026-01-09

## Summary

Playwright + Cheerio remains a solid scraping approach for 2025-2026, with Playwright as the industry standard for JavaScript-heavy sites and Cheerio for fast HTML parsing. Claude API with Structured Outputs (released Nov 2025) is ideal for normalizing wiki content into JSON. For 500 wiki pages, using Batch API with Claude Haiku 4.5 provides the most cost-effective solution (~$15-30 estimated total).

## Prior Research

No existing AI_RESEARCH files found. This is the initial research for the nightreign-query project.

## Current Findings

### 1. Playwright for Scraping (2025-2026)

**Status: HIGHLY RECOMMENDED**

Playwright is the modern standard for web scraping in 2025-2026, particularly for JavaScript-heavy sites.

#### Key Advantages:
- **Active Development**: Developed by Microsoft, actively maintained with strong TypeScript support
- **Auto-waiting**: Built-in mechanism automatically waits for elements to be visible, stable, and ready
- **Multi-browser Support**: Works with Chromium, Firefox, and WebKit (Safari) out of the box
- **Performance**: Optimized for parallel execution and modern web apps
- **TypeScript First**: Excellent TypeScript support with full type safety

#### Performance Characteristics:
- Average execution time: 4.513 seconds for navigation-heavy scenarios
- Memory usage: 150-300MB per browser instance
- Supports multiple browser contexts within a single instance for better resource utilization

#### When to Use Playwright:
- JavaScript-heavy websites (SPAs, PWAs)
- Sites requiring interaction simulation (clicks, form fills)
- Cross-browser testing requirements
- Dynamic content loading

#### Alternative: Puppeteer
- Slightly faster for Chrome-only tasks
- Stronger anti-bot evasion ecosystem (puppeteer-extra-plugin-stealth)
- More mature scraping community
- **Trade-off**: Single browser support (Chromium only), no native multi-browser capability

**Recommendation**: Use **Playwright** for this project due to:
- Better TypeScript support
- Multi-browser compatibility (future-proofing)
- Modern architecture optimized for parallel execution
- Active development and Microsoft backing

### 2. Cheerio Current State (2025-2026)

**Status: ACTIVELY MAINTAINED**

Latest version: 1.1.2 (current as of research date)

#### Key Characteristics:
- **Performance**: Blazingly fast - 30-50% faster than JSDOM, 2-3x faster than browser solutions
- **jQuery-like API**: Familiar syntax for developers
- **Lightweight**: Server-side HTML manipulation without browser overhead
- **Parse5 Integration**: Uses parse5 for HTML parsing, optionally htmlparser2

#### Limitations:
- No JavaScript execution (static HTML only)
- Cannot simulate user interactions
- No visual rendering capabilities
- Struggles with deeply nested/irregular DOM structures

#### Use Case for This Project:
**Perfect fit** - Wiki pages are typically static HTML with well-structured content. Cheerio's speed advantage is ideal for parsing 500+ pages.

#### Architecture Recommendation:
**Two-stage approach**:
1. **Playwright**: Navigate to pages, handle any JavaScript rendering, get final HTML
2. **Cheerio**: Fast HTML parsing and data extraction from the rendered content

This combines Playwright's rendering capabilities with Cheerio's parsing speed.

#### Alternatives Considered:
- **JSDOM**: Full DOM implementation, 30-50% slower but handles complex HTML better
- **Parse5**: Faster, stricter HTML5 compliance, but no built-in DOM manipulation
- **HtmlParser2**: Low-level, event-based, highly customizable but no CSS selectors

**Recommendation**: **Cheerio is optimal** for this use case given wiki pages have predictable, well-structured HTML.

### 3. Claude API for Content Normalization

**Status: EXCELLENT FIT - New Structured Outputs Feature**

#### Structured Outputs (Released November 2025)

**Game-changer for data extraction**: Claude now supports guaranteed JSON schema compliance through constrained decoding.

##### Key Features:
- **Schema Guarantee**: Responses ALWAYS match your JSON schema (no retries needed)
- **Available Models**: Sonnet 4.5, Opus 4.1, Opus 4.5, Haiku 4.5
- **TypeScript Support**: Native Zod integration via `betaZodOutputFormat()`
- **How It Works**: Compiles JSON schema into grammar, restricts token generation during inference
- **Beta Header**: `anthropic-beta: structured-outputs-2025-11-13`

##### Implementation Example:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

const WikiContentSchema = z.object({
  title: z.string(),
  category: z.string(),
  attributes: z.record(z.string()),
  description: z.string(),
  related_items: z.array(z.string()),
});

const response = await client.beta.messages.parse({
  model: "claude-haiku-4-5",
  max_tokens: 2048,
  betas: ["structured-outputs-2025-11-13"],
  messages: [{
    role: "user",
    content: `Extract structured data from this wiki page: ${htmlContent}`
  }],
  output_format: betaZodOutputFormat(WikiContentSchema),
});

// Automatically parsed and validated
console.log(response.parsed_output);
```

##### Benefits for This Project:
- **No JSON.parse() errors**: Guaranteed valid JSON
- **Type safety**: End-to-end TypeScript type checking
- **No validation loops**: First response is always schema-compliant
- **Simplified code**: No manual parsing or error handling needed

#### Model Selection: Haiku 4.5 vs Sonnet 4.5

**For Data Extraction Tasks:**

| Factor | Haiku 4.5 | Sonnet 4.5 |
|--------|-----------|------------|
| **Speed** | 3-5x faster | Standard |
| **Cost** | $1 input / $5 output per MTok | $3 input / $15 output per MTok |
| **Intelligence** | "Near-frontier" - excellent for extraction | Superior reasoning |
| **Use Case** | High-volume, straightforward extraction | Complex reasoning, nuanced interpretation |
| **Latency** | Fastest | Fast |

**Recommendation for Wiki Normalization**: **Claude Haiku 4.5**

Reasoning:
- Wiki pages have predictable structure (good fit for Haiku's capabilities)
- High volume (500 pages) benefits from Haiku's speed and cost
- Data extraction is straightforward (no complex reasoning required)
- 3x cost savings vs Sonnet (critical at scale)
- "Near-frontier intelligence" is more than sufficient for structured data extraction

**When to use Sonnet 4.5**:
- Complex, ambiguous content requiring interpretation
- Nuanced categorization decisions
- Content with inconsistent formatting requiring intelligent inference

### 4. Cost Estimate for 500 Wiki Pages

#### Token Estimation

**Per Wiki Page Assumptions**:
- Average wiki page HTML: ~10KB = ~2,500 tokens input
- System prompt for extraction: ~200 tokens
- Output JSON (structured data): ~500 tokens
- **Total per page**: ~3,200 tokens (~2,700 input + ~500 output)

**For 500 pages**:
- Input tokens: 500 × 2,700 = 1,350,000 tokens (1.35 MTok)
- Output tokens: 500 × 500 = 250,000 tokens (0.25 MTok)

#### Pricing Comparison

**Option 1: Real-time API with Haiku 4.5**
- Input: 1.35 MTok × $1.00 = $1.35
- Output: 0.25 MTok × $5.00 = $1.25
- **Total: $2.60**

**Option 2: Batch API with Haiku 4.5 (50% discount) - RECOMMENDED**
- Input: 1.35 MTok × $0.50 = $0.68
- Output: 0.25 MTok × $2.50 = $0.63
- **Total: $1.31**

**Option 3: Real-time API with Sonnet 4.5**
- Input: 1.35 MTok × $3.00 = $4.05
- Output: 0.25 MTok × $15.00 = $3.75
- **Total: $7.80**

**Option 4: Batch API with Sonnet 4.5**
- Input: 1.35 MTok × $1.50 = $2.03
- Output: 0.25 MTok × $7.50 = $1.88
- **Total: $3.91**

#### Cost Optimization Strategies

**1. Prompt Caching (Additional Savings)**
- If system prompt is reused across requests (it should be)
- Cache read tokens: 90% discount ($0.10 per MTok for Haiku)
- Could save additional ~$0.10-0.20 on system prompts

**2. Incremental Processing**
- Only process new/changed pages
- Store processed results to avoid re-processing
- Potential 80%+ savings after initial scrape

**3. Batch API (Primary Recommendation)**
- 50% cost reduction
- Processes within 24 hours (acceptable for most use cases)
- Can combine with prompt caching

**Final Cost Estimate**:
- **Initial scrape (500 pages, Batch API + Haiku 4.5): ~$1.30**
- **With prompt caching optimization: ~$1.10**
- **Incremental updates (20% of pages monthly): ~$0.22/month**

### 5. Alternative Normalization Approaches

#### Could We Use Smaller Models?

**GPT-4o-mini or other smaller models**:
- Pros: Potentially cheaper
- Cons:
  - No structured outputs guarantee (would need validation/retry logic)
  - Haiku 4.5 already extremely cheap ($1.31 for 500 pages)
  - Additional complexity not worth minimal savings

**Recommendation**: Stick with Claude Haiku 4.5 for structured outputs guarantee.

#### Rule-Based Extraction for Structured Tables?

**When rule-based makes sense**:
- Highly consistent table structures
- Simple key-value extraction
- No ambiguity in data interpretation

**For Wiki Pages**:
- **Hybrid approach possible**:
  - Use CSS selectors/XPath for obvious structured data (tables, infoboxes)
  - Use Claude for prose descriptions, categorization, relationship extraction
  - Could reduce token usage by 30-40%

**Implementation Pattern**:
```typescript
// 1. Extract obvious structured data with Cheerio
const structuredData = extractTablesWithCheerio(html);

// 2. Send only unstructured content to Claude
const unstructuredContent = extractProseContent(html);
const normalized = await claudeNormalize(unstructuredContent, structuredData);
```

**Estimated Savings**:
- Reduced input tokens by ~30% (only send prose to Claude)
- New cost: ~$0.92 (down from $1.31)
- Trade-off: Added complexity, may miss nuanced data in tables

**Recommendation**:
- **Start simple** with full Claude processing (cost is already minimal at $1.31)
- **Optimize later** if needed with hybrid approach
- At current pricing, the engineering time for hybrid approach exceeds savings

### 6. Scraping Best Practices (2025-2026)

#### Rate Limiting

**Industry Standards**:
- Check `robots.txt` before scraping
- Respect `Retry-After` headers
- Default: 100-200 requests per minute per user
- Implement exponential backoff on 429 errors

**Recommended Implementation**:
```typescript
import pLimit from 'p-limit';

// Limit concurrent requests
const limit = pLimit(5); // 5 concurrent requests max

// Add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const scrapeWithRateLimit = async (urls: string[]) => {
  return Promise.all(
    urls.map(url =>
      limit(async () => {
        await delay(500); // 500ms between requests = 2 req/sec
        return scrapePage(url);
      })
    )
  );
};
```

**Playwright-specific**:
- Use AutoThrottle extension (Scrapy)
- Monitor response times and adjust delays
- Rotate user agents to simulate real users

#### Caching

**Best Practices**:
- **Local cache** for single-machine operations
- **Redis/Memcached** for distributed scraping
- **Use ETags and Last-Modified headers** for change detection
- **Set appropriate TTL** based on content update frequency

**Implementation Strategy**:
```typescript
interface CacheEntry {
  html: string;
  etag?: string;
  lastModified?: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

async function fetchWithCache(url: string): Promise<string> {
  const cached = cache.get(url);

  if (cached && Date.now() - cached.timestamp < 86400000) { // 24hr TTL
    // Check if content changed using ETag
    if (await hasChanged(url, cached.etag)) {
      // Re-fetch and update cache
    }
    return cached.html;
  }

  // Fetch fresh content
  const response = await fetch(url);
  cache.set(url, {
    html: await response.text(),
    etag: response.headers.get('etag') || undefined,
    lastModified: response.headers.get('last-modified') || undefined,
    timestamp: Date.now(),
  });
}
```

**For Wiki Scraping**:
- Cache HTML locally after initial scrape
- Store metadata (page title, last-modified) for quick change detection
- Only re-scrape changed pages on subsequent runs

#### Incremental Updates

**Change Detection Methods**:
1. **Timestamp-based**: Track last scrape time, only fetch newer content
2. **ETag/Last-Modified**: Use HTTP headers for efficient change detection
3. **Content hashing**: Hash page content, compare with previous version
4. **API-based**: Use wiki's API for recent changes (if available)

**Recommended Approach for Wiki**:
```typescript
interface PageMetadata {
  url: string;
  lastScraped: Date;
  contentHash: string;
  etag?: string;
}

const metadata = loadMetadata(); // From JSON/DB

async function incrementalScrape(urls: string[]) {
  for (const url of urls) {
    const meta = metadata.get(url);

    // Check if changed
    const hasChanged = await checkIfChanged(url, meta);

    if (hasChanged || !meta) {
      // Scrape and normalize
      const content = await scrapePage(url);
      const normalized = await claudeNormalize(content);

      // Update metadata
      metadata.set(url, {
        url,
        lastScraped: new Date(),
        contentHash: hashContent(content),
        etag: getEtag(content),
      });
    }
  }

  saveMetadata(metadata);
}
```

**Benefits**:
- 80%+ reduction in scraping after initial run (assuming 20% page updates)
- Faster execution (skip unchanged pages)
- Lower API costs (only normalize changed content)
- Reduced server load on target wiki

#### Error Handling and Resilience

**Best Practices**:
- **Checkpoint progress**: Save scraped data incrementally
- **Retry with exponential backoff**: Handle transient failures
- **Maximum retry limits**: 3-5 attempts before giving up
- **Graceful degradation**: Continue scraping other pages on failure

**Implementation**:
```typescript
async function scrapeWithRetry(url: string, maxRetries = 3): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await scrapePage(url);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Exponential backoff: 1s, 2s, 4s
      await delay(Math.pow(2, attempt) * 1000);
    }
  }
  throw new Error(`Failed after ${maxRetries} attempts`);
}
```

## Architecture Diagram / Flow

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SCRAPING PIPELINE                         │
└─────────────────────────────────────────────────────────────┘

1. URL COLLECTION
   ├─ Crawl wiki sitemap / category pages
   ├─ Build list of target URLs
   └─ Load previous scrape metadata (for incremental updates)
        └─> metadata.json { url, lastScraped, contentHash, etag }

2. CHANGE DETECTION (Incremental Updates)
   ├─ Check ETag/Last-Modified headers
   ├─ Compare content hash
   └─ Filter to only changed/new pages
        └─> Reduces work by ~80% after initial scrape

3. CONTENT SCRAPING (Playwright + Cheerio)
   ├─ Playwright: Navigate to page, execute JavaScript
   │   ├─ Handle authentication if needed
   │   ├─ Wait for content to load
   │   └─ Extract rendered HTML
   ├─ Cheerio: Parse HTML for data extraction
   │   ├─ Extract infobox/table data
   │   ├─ Extract main content prose
   │   └─ Extract navigation/relationships
   └─> Raw extracted data
        ├─ Rate limiting: 2 req/sec (500ms delay)
        ├─ Concurrent limit: 5 pages max
        └─ Cache HTML locally for re-processing

4. CONTENT NORMALIZATION (Claude API)
   ├─ Batch API (50% cost savings, 24hr processing)
   ├─ Model: Claude Haiku 4.5
   ├─ Structured Outputs (guaranteed JSON schema)
   │   └─ Zod schema definition:
   │       {
   │         title: string,
   │         category: string,
   │         type: enum,
   │         attributes: Record<string, string>,
   │         description: string,
   │         stats: { hp, damage, etc },
   │         related: string[],
   │       }
   └─> Normalized JSON output (guaranteed schema-compliant)

5. DATA STORAGE
   ├─ Save normalized JSON to database/files
   ├─ Update metadata for incremental scraping
   └─ Generate index for search/queries

6. VALIDATION & MONITORING
   ├─ Validate all outputs match schema (auto with Structured Outputs)
   ├─ Log errors and retry failures
   └─ Monitor cost and performance metrics
```

### File Structure

```
nightreign-query/
├─ src/
│  ├─ scraper/
│  │  ├─ playwright-scraper.ts    # Navigate & render pages
│  │  ├─ cheerio-parser.ts         # Parse HTML, extract data
│  │  ├─ rate-limiter.ts           # Request throttling
│  │  └─ cache.ts                  # Local caching layer
│  ├─ normalizer/
│  │  ├─ claude-client.ts          # Claude API integration
│  │  ├─ schema.ts                 # Zod schemas for outputs
│  │  └─ batch-processor.ts        # Batch API handling
│  ├─ storage/
│  │  ├─ metadata-store.ts         # Track scrape metadata
│  │  └─ data-store.ts             # Save normalized data
│  └─ pipeline/
│     ├─ incremental-scraper.ts    # Orchestrate incremental updates
│     └─ full-scraper.ts           # Initial full scrape
├─ data/
│  ├─ cache/                       # Cached HTML
│  ├─ metadata.json                # Scrape metadata
│  └─ normalized/                  # Normalized JSON outputs
└─ config/
   ├─ scraper-config.ts            # Rate limits, concurrency
   └─ schema-definitions.ts        # Data schemas
```

## Key Takeaways

### Scraping Stack
✅ **Playwright + Cheerio** is the optimal combination for 2025-2026
- Playwright: Modern, TypeScript-first, multi-browser, auto-waiting
- Cheerio: Fast, lightweight HTML parsing
- Two-stage approach: Playwright renders, Cheerio parses

### Claude API Strategy
✅ **Claude Haiku 4.5 with Batch API and Structured Outputs**
- Haiku 4.5: Fast, cost-effective, "near-frontier" intelligence (perfect for extraction)
- Batch API: 50% cost savings ($1.31 for 500 pages)
- Structured Outputs: Guaranteed JSON schema compliance (no validation loops)
- TypeScript: Native Zod integration for type safety

### Cost Breakdown
- **Initial scrape (500 pages)**: ~$1.30 with Batch API
- **With prompt caching**: ~$1.10
- **Monthly incremental updates**: ~$0.22 (assuming 20% page changes)
- **Annual cost estimate**: ~$1.10 + (12 × $0.22) = **~$3.74/year**

### Best Practices
✅ Rate limiting: 2 req/sec, 5 concurrent max
✅ Caching: Store HTML locally with ETag tracking
✅ Incremental updates: Hash-based change detection
✅ Error handling: Exponential backoff, checkpoint progress
✅ Structured outputs: Zod schemas for type-safe normalization

### Gotchas & Warnings
⚠️ **Structured Outputs limitations**:
- First request has additional latency (grammar compilation)
- Cached for 24hrs, invalidated by schema changes
- No recursive schemas or numerical constraints
- Incompatible with Citations and Message Prefilling

⚠️ **Batch API**:
- 24-hour processing window (not real-time)
- Can combine with prompt caching for extra savings

⚠️ **Cheerio limitations**:
- No JavaScript execution (must use Playwright first)
- Static HTML only
- Good for well-structured content (perfect for wikis)

⚠️ **Playwright at scale**:
- Memory usage: 150-300MB per browser instance
- Use browser contexts for better resource utilization
- Consider proxy pools for large-scale scraping (not needed for 500 pages)

## Sources

### Playwright Research
- [Playwright Web Scraping Tutorial for 2025](https://oxylabs.io/blog/playwright-web-scraping)
- [Scalable Web Scraping with Playwright and Browserless](https://www.browserless.io/blog/scraping-with-playwright-a-developer-s-guide-to-scalable-undetectable-data-extraction)
- [Web Scraping With Playwright and Node.JS in 2026](https://brightdata.com/blog/how-tos/playwright-web-scraping)
- [Playwright vs Puppeteer Performance](https://www.skyvern.com/blog/puppeteer-vs-playwright-complete-performance-comparison-2025/)
- [Playwright vs Puppeteer: The Definitive Comparison](https://betterstack.com/community/comparisons/playwright-vs-puppeteer/)
- [Playwright vs. Puppeteer in 2026](https://www.zenrows.com/blog/playwright-vs-puppeteer)

### Cheerio Research
- [7 Best Cheerio JS Alternatives for Developers](https://www.zenrows.com/alternative/cheerio)
- [Cheerio vs Puppeteer for Web Scraping in 2025](https://proxyway.com/guides/cheerio-vs-puppeteer-for-web-scraping)
- [cheerio - npm](https://www.npmjs.com/package/cheerio)
- [The Best JavaScript Web Scraping Libraries](https://www.scrapingbee.com/blog/best-javascript-web-scraping-libraries/)

### Claude API Research
- [Structured outputs - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Structured outputs on the Claude Developer Platform](https://claude.com/blog/structured-outputs-on-the-claude-developer-platform)
- [Claude API Structured Output: Complete Guide](https://thomas-wiegold.com/blog/claude-api-structured-output/)
- [Anthropic Launches Structured Outputs](https://techbytes.app/posts/claude-structured-outputs-json-schema-api/)
- [A Gentle Introduction to Structured Generation with Anthropic API](https://www.tribe.ai/applied-ai/a-gentle-introduction-to-structured-generation-with-anthropic-api)

### Claude Model Comparison
- [Claude Haiku 4.5 vs Sonnet 4.5: Detailed Comparison 2025](https://www.creolestudios.com/claude-haiku-4-5-vs-sonnet-4-5-comparison/)
- [Claude AI Models 2025: Opus vs Sonnet vs Haiku Guide](https://dev.to/dr_hernani_costa/claude-ai-models-2025-opus-vs-sonnet-vs-haiku-guide-24mn)
- [Models overview - Claude Docs](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Introducing Claude Haiku 4.5](https://www.anthropic.com/news/claude-haiku-4-5)

### Pricing Research
- [Pricing - Claude Docs](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic API Pricing: Complete Guide 2025](https://www.finout.io/blog/anthropic-api-pricing)
- [Claude Pricing Explained](https://intuitionlabs.ai/articles/claude-pricing-plans-api-costs)
- [Understanding Anthropic API Pricing](https://www.nops.io/blog/anthropic-api-pricing/)

### Web Scraping Best Practices
- [What Is Rate Limiting & How to Avoid It](https://oxylabs.io/blog/rate-limiting)
- [10 Web Scraping Best Practices for Developers in 2025](https://www.scrapeunblocker.com/post/10-web-scraping-best-practices-for-developers-in-2025)
- [Web Scraping Best Practices in 2025](https://www.scrapingbee.com/blog/web-scraping-best-practices/)
- [Best Practices for Web Scraping in 2025](https://www.scraperapi.com/web-scraping/best-practices/)
- [What are the best practices for caching API responses](https://webscraping.ai/faq/apis/what-are-the-best-practices-for-caching-api-responses-in-web-scraping)

### Token Counting
- [Token counting - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Anthropic Models Token Counter](https://token-counter.app/anthropic)
- [Token Counting Explained: tiktoken, Anthropic, and Gemini](https://www.propelcode.ai/blog/token-counting-tiktoken-anthropic-gemini-guide-2025)

## Next Steps Recommendations

Based on this research, here are recommended next steps:

1. **Architecture Design** → Recommend **system-architecture-reviewer** agent to:
   - Review the proposed scraping pipeline architecture
   - Design database schema for normalized data
   - Plan error handling and monitoring strategy

2. **TypeScript Implementation** → Recommend **typescript-expert** agent to:
   - Implement Playwright scraper with TypeScript
   - Create Cheerio parser with type-safe extraction
   - Build Claude API client with Zod schema integration
   - Set up Batch API processing pipeline

3. **Schema Design** → Recommend **typescript-expert** agent to:
   - Define Zod schemas for wiki data normalization
   - Create TypeScript types for all data structures
   - Implement validation and type guards

4. **Testing Strategy** → Recommend **unit-test-maintainer** agent to:
   - Create tests for scraper components
   - Test Claude API integration with mock responses
   - Validate schema compliance and error handling

5. **Cost Monitoring** → Implementation task:
   - Set up token usage tracking
   - Monitor Batch API job completion
   - Log costs per page for optimization analysis

## Additional Resources

### Official Documentation
- [Anthropic Claude API Documentation](https://docs.anthropic.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Cheerio Documentation](https://cheerio.js.org/)

### Code Examples
- [Playwright TypeScript Examples](https://playwright.dev/docs/intro)
- [Claude Structured Outputs Examples](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Zod Schema Documentation](https://zod.dev/)

### Performance Optimization
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Claude Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Batch API Guide](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)
