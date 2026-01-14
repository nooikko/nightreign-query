/**
 * Orama Search Index
 *
 * Manages the Orama search index for hybrid (vector + full-text) search.
 * Supports persistence to JSON file and rebuilding from SQLite.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type AnyOrama,
  create,
  insert,
  insertMultiple,
  search,
} from '@orama/orama'
import { persist, restore } from '@orama/plugin-data-persistence'
import {
  logSearchExecution,
  logSearchResults,
  logIndexStats,
  isSearchDebugEnabled,
} from './debug-logger'

/** Content type (duplicated here to avoid cross-package import issues) */
type ContentType =
  | 'boss'
  | 'weapon'
  | 'relic'
  | 'nightfarer'
  | 'skill'
  | 'talisman'
  | 'spell'
  | 'armor'
  | 'shield'
  | 'enemy'
  | 'npc'
  | 'merchant'
  | 'location'
  | 'expedition'
  | 'item'
  | 'guide'

/** Embedding dimensions (matches bge-small-en-v1.5) */
export const EMBEDDING_DIMENSIONS = 384

/** Orama schema for content chunks */
const oramaSchema = {
  id: 'string',
  type: 'string',
  name: 'string',
  section: 'string',
  content: 'string',
  tags: 'string[]',
  sourceUrl: 'string',
  embedding: `vector[${EMBEDDING_DIMENSIONS}]`,
} as const

/** Document type for our schema */
export interface OramaDocument {
  id: string
  type: string
  name: string
  section: string
  content: string
  tags: string[]
  sourceUrl: string
  embedding: number[]
}

/** Search result from Orama */
export interface OramaSearchResult {
  id: string
  type: ContentType
  name: string
  section: string
  content: string
  tags: string[]
  sourceUrl: string
  score: number
}

/** Options for search */
export interface SearchOptions {
  /** Natural language query */
  query?: string
  /** Vector for similarity search */
  vector?: number[]
  /** Filter by content type */
  types?: ContentType[]
  /** Maximum results to return */
  limit?: number
  /** Search mode: hybrid, vector, or fulltext */
  mode?: 'hybrid' | 'vector' | 'fulltext'
}

/**
 * Field boosting configuration for relevance tuning.
 * Higher values = more importance for matches in that field.
 *
 * Rationale:
 * - name (5.0): Entity names are the strongest signal ("Wylder" → Wylder results)
 * - content (2.0): Full content contains detailed info - boost since this is where
 *                  the actual answer lives (skill descriptions, abilities, etc.)
 * - tags (1.5): Tags provide categorical hints (e.g., "grappler" tag on Wylder)
 * - section (1.0): Baseline - section headers provide context
 * - type (0.3): Heavily de-prioritize type field - it's categorical, not searchable text.
 *              "skill" in a query usually means "character's skill ability", not type:skill.
 *              Users should filter by type explicitly, not via text search.
 */
const FIELD_BOOST = {
  name: 5.0,
  content: 2.0,
  tags: 1.5,
  section: 1.0,
  type: 0.3,
} as const

/** Default path for Orama index file */
// Use fileURLToPath for ESM-compatible __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// Navigate from src/search/ to data/ (two directories up)
const DEFAULT_INDEX_PATH = join(__dirname, '..', '..', 'data', 'orama-index.json')

/**
 * OramaIndex class for managing the search index
 */
export class OramaIndex {
  private db: AnyOrama | null = null
  private indexPath: string
  private isInitialized = false

  constructor(indexPath: string = DEFAULT_INDEX_PATH) {
    this.indexPath = indexPath
  }

  /**
   * Initialize the Orama index
   *
   * Tries to restore from file if it exists, otherwise creates a new index.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return
    }

    // Try to restore from file
    if (existsSync(this.indexPath)) {
      try {
        const data = readFileSync(this.indexPath, 'utf-8')
        const parsed = JSON.parse(data)
        this.db = await restore('json', parsed)
        this.isInitialized = true
        // TODO: Replace console.log with structured logger when available
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Orama index restored from ${this.indexPath}`)
        }

        // Log index stats on initialization
        const docCount = await this.count()
        logIndexStats({
          documentCount: docCount,
          indexPath: this.indexPath,
          initialized: true,
        })

        return
      } catch (error) {
        // TODO: Replace console.warn with structured logger when available
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            'Failed to restore Orama index, creating new one:',
            error,
          )
        }
      }
    }

    // Create new index
    this.db = create({
      schema: oramaSchema,
    })
    this.isInitialized = true
    // TODO: Replace console.log with structured logger when available
    if (process.env.NODE_ENV !== 'production') {
      console.log('Created new Orama index')
    }
  }

  /**
   * Ensure the index is initialized
   */
  private ensureInitialized(): AnyOrama {
    if (!this.db) {
      // Synchronous fallback - create new index
      this.db = create({
        schema: oramaSchema,
      })
      this.isInitialized = true
    }
    return this.db
  }

  /**
   * Add a single document to the index
   */
  async add(doc: Omit<OramaDocument, 'id'> & { id?: string }): Promise<string> {
    const db = this.ensureInitialized()
    const id = doc.id || crypto.randomUUID()
    await insert(db, { ...doc, id })
    return id
  }

  /**
   * Add multiple documents to the index
   */
  async addBatch(
    docs: Array<Omit<OramaDocument, 'id'> & { id?: string }>,
  ): Promise<string[]> {
    const db = this.ensureInitialized()

    const docsWithIds = docs.map((doc) => ({
      ...doc,
      id: doc.id || crypto.randomUUID(),
    }))

    await insertMultiple(db, docsWithIds)
    return docsWithIds.map((d) => d.id)
  }

  /**
   * Search the index
   */
  async search(options: SearchOptions): Promise<OramaSearchResult[]> {
    const db = this.ensureInitialized()
    const searchStartTime = Date.now()

    // Build search parameters with field boosting for better relevance
    const searchParams: Record<string, unknown> = {
      limit: options.limit || 10,
      boost: FIELD_BOOST,
    }

    // Determine search mode for logging
    let determinedMode: 'hybrid' | 'vector' | 'fulltext' = 'fulltext'

    // Set search mode and parameters based on options
    // Priority: explicit mode > hybrid (if both query+vector) > vector-only > fulltext-only
    if (options.mode === 'vector' && options.vector) {
      searchParams.mode = 'vector'
      determinedMode = 'vector'
      searchParams.vector = {
        value: options.vector,
        property: 'embedding',
      }
    } else if (options.mode === 'fulltext' && options.query) {
      searchParams.mode = 'fulltext'
      determinedMode = 'fulltext'
      searchParams.term = options.query
    } else if (options.query && options.vector) {
      // Hybrid mode requires BOTH query and vector
      searchParams.mode = 'hybrid'
      determinedMode = 'hybrid'
      searchParams.term = options.query
      searchParams.vector = {
        value: options.vector,
        property: 'embedding',
      }
    } else if (options.vector) {
      // Vector-only search
      searchParams.mode = 'vector'
      determinedMode = 'vector'
      searchParams.vector = {
        value: options.vector,
        property: 'embedding',
      }
    } else if (options.query) {
      // Fulltext-only search (no vector provided)
      searchParams.mode = 'fulltext'
      determinedMode = 'fulltext'
      searchParams.term = options.query
    }

    // Add type filter if specified
    if (options.types && options.types.length > 0) {
      searchParams.where = {
        type: options.types,
      }
    }

    // Log search execution parameters
    logSearchExecution({
      mode: determinedMode,
      query: options.query,
      hasVector: !!options.vector,
      vectorDimensions: options.vector?.length,
      typeFilters: options.types,
      requestedLimit: options.limit || 10,
      actualSearchLimit: options.limit || 10,
    })

    const results = await search(db, searchParams)
    const searchDuration = Date.now() - searchStartTime

    // Transform results
    const transformedResults = results.hits.map((hit) => {
      // Type guard to validate document structure from Orama
      const doc = hit.document as Record<string, unknown>

      // Validate required fields exist and have correct types
      const id = typeof doc.id === 'string' ? doc.id : ''
      const type = typeof doc.type === 'string' ? doc.type : ''
      const name = typeof doc.name === 'string' ? doc.name : ''
      const section = typeof doc.section === 'string' ? doc.section : ''
      const content = typeof doc.content === 'string' ? doc.content : ''
      const tags = Array.isArray(doc.tags) ? (doc.tags as string[]) : []
      const sourceUrl = typeof doc.sourceUrl === 'string' ? doc.sourceUrl : ''

      return {
        id,
        type: type as ContentType,
        name,
        section,
        content,
        tags,
        sourceUrl,
        score: hit.score,
      }
    })

    // Log search results
    const scores = transformedResults.map((r) => r.score)
    logSearchResults({
      mode: determinedMode,
      totalResults: transformedResults.length,
      durationMs: searchDuration,
      results: transformedResults.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        score: r.score,
        section: r.section,
      })),
      topScores: scores.slice(0, 10),
      scoreRange: scores.length > 0
        ? { min: Math.min(...scores), max: Math.max(...scores) }
        : undefined,
    })

    return transformedResults
  }

  /**
   * Persist the index to file
   */
  async saveToFile(): Promise<void> {
    const db = this.ensureInitialized()

    // Ensure directory exists
    const dir = dirname(this.indexPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const data = await persist(db, 'json')
    // Compact JSON (no pretty-printing) for smaller file size and faster I/O
    writeFileSync(this.indexPath, JSON.stringify(data))
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Orama index saved to ${this.indexPath}`)
    }
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.db = create({
      schema: oramaSchema,
    })
    this.isInitialized = true
  }

  /**
   * Get the number of documents in the index
   */
  async count(): Promise<number> {
    const db = this.ensureInitialized()
    // Search with empty query to get all documents
    const results = await search(db, { limit: 0 })
    return results.count
  }
}

/** Singleton instance */
let indexInstance: OramaIndex | null = null

/**
 * Get the singleton Orama index instance
 */
export function getOramaIndex(indexPath?: string): OramaIndex {
  if (!indexInstance) {
    indexInstance = new OramaIndex(indexPath)
  }
  return indexInstance
}

/**
 * Create a new Orama index instance
 */
export function createOramaIndex(indexPath?: string): OramaIndex {
  return new OramaIndex(indexPath)
}
