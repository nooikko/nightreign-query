/**
 * Shared TypeScript types for Nightreign Quick Reference
 *
 * This package provides type-safe interfaces for all content types,
 * search functionality, and API responses across the monorepo.
 */

/**
 * The different types of game content available in Nightreign
 *
 * @example
 * const type: ContentType = 'boss';
 */
export type ContentType =
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

/**
 * Filters that can be applied to search queries
 */
export interface SearchFilters {
  /**
   * Filter results by specific content types
   *
   * @example
   * { type: ['boss', 'weapon'] }
   */
  readonly type?: ReadonlyArray<ContentType>

  /**
   * Filter results by tags (e.g., 'fire', 'melee', 'legendary')
   *
   * @example
   * { tags: ['fire', 'legendary'] }
   */
  readonly tags?: ReadonlyArray<string>
}

/**
 * A search query sent to the embedding search service
 *
 * @example
 * const query: SearchQuery = {
 *   query: "best weapons for fire damage",
 *   filters: { type: ['weapon'], tags: ['fire'] },
 *   limit: 10,
 *   format: true
 * };
 */
export interface SearchQuery {
  /**
   * The natural language search query
   */
  readonly query: string

  /**
   * Optional filters to narrow search results
   */
  readonly filters?: SearchFilters

  /**
   * Maximum number of results to return
   *
   * @default 10
   */
  readonly limit?: number

  /**
   * Whether to format results using AI
   *
   * @default false
   */
  readonly format?: boolean
}

/**
 * Performance timing information for search operations
 *
 * All times are in milliseconds
 */
export interface SearchTiming {
  /**
   * Time to generate embedding from query (ms)
   */
  readonly embedding: number

  /**
   * Time to perform vector search (ms)
   */
  readonly search: number

  /**
   * Time to format results with AI (ms)
   *
   * Only present when format=true in query
   */
  readonly format?: number

  /**
   * Total request time (ms)
   */
  readonly total: number
}

/**
 * A single chunk of content returned from vector search
 *
 * Each chunk represents a section of game content with its
 * relevance score and metadata.
 */
export interface ContentChunk {
  /**
   * Unique identifier for this content chunk
   */
  readonly id: string

  /**
   * The type of game content
   */
  readonly type: ContentType

  /**
   * Name of the content (e.g., "Godrick the Grafted", "Moonveil")
   */
  readonly name: string

  /**
   * Section within the content (e.g., "Phase 1", "Stats", "Location")
   */
  readonly section: string

  /**
   * The actual text content of this chunk
   */
  readonly content: string

  /**
   * Tags associated with this content for filtering
   *
   * @example
   * ['fire', 'katana', 'legendary']
   */
  readonly tags: ReadonlyArray<string>

  /**
   * Similarity score from vector search (0-1, higher is better)
   *
   * Represents how relevant this chunk is to the search query
   */
  readonly score: number
}

/**
 * The complete response from a search request
 *
 * @example
 * const response: SearchResult = {
 *   results: [...],
 *   timing: { embedding: 50, search: 100, total: 150 }
 * };
 */
export interface SearchResult {
  /**
   * Array of matching content chunks, ordered by relevance
   */
  readonly results: ReadonlyArray<ContentChunk>

  /**
   * Performance timing breakdown
   */
  readonly timing: SearchTiming

  /**
   * AI-formatted response (only present if format=true)
   *
   * A natural language summary or answer based on the search results
   */
  readonly formatted?: string
}

/**
 * Optional metadata for content items
 *
 * Extensible for additional content-specific properties
 */
export interface ContentMetadata {
  /**
   * When this content was added/updated
   */
  readonly updatedAt?: string

  /**
   * Source file or URL
   */
  readonly source?: string

  /**
   * Any additional metadata as key-value pairs
   */
  readonly [key: string]: unknown
}

// ============================================================================
// FEEDBACK SYSTEM TYPES
// ============================================================================

/**
 * Feedback submission for a search response
 *
 * Sent from the client when user provides thumbs up/down
 */
export interface FeedbackSubmission {
  /**
   * Optional session ID to group feedback from a game run
   */
  readonly sessionId?: string

  /**
   * The search query that was submitted
   */
  readonly query: string

  /**
   * Filter type used (boss, weapon, etc.) if any
   */
  readonly queryType?: ContentType

  /**
   * The response content being rated
   */
  readonly response: string

  /**
   * ID of specific result if rating individual result
   */
  readonly responseId?: string

  /**
   * Whether the response was helpful (true = thumbs up, false = thumbs down)
   */
  readonly helpful: boolean

  /**
   * Optional: Why the response was or wasn't helpful
   */
  readonly reason?: string

  /**
   * Optional: What the user expected to see instead
   */
  readonly expected?: string

  /**
   * Response latency in milliseconds (for performance tracking)
   */
  readonly latencyMs?: number
}

/**
 * Response from feedback submission API
 */
export interface FeedbackResponse {
  /**
   * Whether the feedback was saved successfully
   */
  readonly success: boolean

  /**
   * ID of the created feedback entry
   */
  readonly feedbackId?: string

  /**
   * Error message if submission failed
   */
  readonly error?: string
}

/**
 * A feedback session for grouping feedback from a game run
 */
export interface FeedbackSession {
  /**
   * Unique session ID
   */
  readonly id: string

  /**
   * Optional descriptive name (e.g., "Night 3 Training Run")
   */
  readonly name?: string

  /**
   * When the session started
   */
  readonly startedAt: string

  /**
   * When the session ended (null if still active)
   */
  readonly endedAt?: string

  /**
   * Session-level notes
   */
  readonly notes?: string
}

/**
 * Request to start a new feedback session
 */
export interface StartSessionRequest {
  /**
   * Optional name for the session
   */
  readonly name?: string
}

/**
 * Request to end a feedback session
 */
export interface EndSessionRequest {
  /**
   * The session ID to end
   */
  readonly sessionId: string

  /**
   * Optional notes about the session
   */
  readonly notes?: string
}

/**
 * Normalized content format for ingestion pipeline
 *
 * Used when processing raw content files into searchable chunks
 *
 * @example
 * const content: NormalizedContent = {
 *   type: 'boss',
 *   name: 'Godrick the Grafted',
 *   section: 'Strategy',
 *   content: 'Use fire damage in phase 2...',
 *   tags: ['boss', 'demigod', 'stormveil'],
 *   metadata: { source: 'bosses/godrick.md' }
 * };
 */
export interface NormalizedContent {
  /**
   * The type of game content
   */
  readonly type: ContentType

  /**
   * Name of the content item
   */
  readonly name: string

  /**
   * Section or subsection within the content
   */
  readonly section: string

  /**
   * The actual text content
   */
  readonly content: string

  /**
   * Tags for categorization and filtering
   */
  readonly tags: ReadonlyArray<string>

  /**
   * Optional metadata about this content
   */
  readonly metadata?: ContentMetadata
}
