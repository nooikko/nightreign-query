'use client'

import type { ContentChunk } from '@nightreign/types'

/**
 * Props for the ResultCard component
 */
interface ResultCardProps {
  /**
   * The content chunk to display
   */
  readonly chunk: ContentChunk

  /**
   * Optional rank number (1-indexed) to display
   */
  readonly rank?: number
}

/**
 * Maps content types to display colors for visual categorization
 */
const TYPE_COLORS: Record<string, string> = {
  boss: 'bg-red-900/30 text-red-400 border-red-800',
  weapon: 'bg-blue-900/30 text-blue-400 border-blue-800',
  relic: 'bg-purple-900/30 text-purple-400 border-purple-800',
  nightfarer: 'bg-green-900/30 text-green-400 border-green-800',
  skill: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  talisman: 'bg-orange-900/30 text-orange-400 border-orange-800',
  guide: 'bg-cyan-900/30 text-cyan-400 border-cyan-800',
}

/**
 * ResultCard Component
 *
 * Displays a single search result chunk with metadata including type, name,
 * section, content, tags, and relevance score. Provides visual categorization
 * through color-coded type badges.
 *
 * Features:
 * - Color-coded type badges for quick visual scanning
 * - Score indicator with percentage display
 * - Tag display with pill styling
 * - Section context information
 * - Dark theme gaming aesthetic
 * - Optional rank indicator
 *
 * @example
 * ```tsx
 * <ResultCard chunk={contentChunk} rank={1} />
 * ```
 */
export function ResultCard({ chunk, rank }: ResultCardProps) {
  const typeColor =
    TYPE_COLORS[chunk.type] || 'bg-gray-900/30 text-gray-400 border-gray-800'
  const scorePercentage = Math.round(chunk.score * 100)

  return (
    <article
      className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
      aria-label={`Search result: ${chunk.name}`}
    >
      {/* Header with type badge and score */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {rank !== undefined && (
            <span
              className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold"
              aria-label={`Rank ${rank}`}
            >
              {rank}
            </span>
          )}
          <span
            className={`flex-shrink-0 px-2 py-1 rounded border text-xs font-semibold uppercase tracking-wide ${typeColor}`}
            aria-label={`Type: ${chunk.type}`}
          >
            {chunk.type}
          </span>
          <h3
            className="text-lg font-semibold text-foreground truncate"
            title={chunk.name}
          >
            {chunk.name}
          </h3>
        </div>
        <div
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-muted/50 rounded"
          title="Relevance score"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-primary"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
              clipRule="evenodd"
            />
          </svg>
          <span
            className="text-xs font-medium text-foreground"
            aria-label={`Score: ${scorePercentage}%`}
          >
            {scorePercentage}%
          </span>
        </div>
      </div>

      {/* Section information */}
      {chunk.section && (
        <div className="mb-2">
          <span className="text-sm text-muted-foreground">
            <span className="font-medium">Section:</span> {chunk.section}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {chunk.content}
        </p>
      </div>

      {/* Tags */}
      {chunk.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Tags">
          {chunk.tags.map((tag) => (
            <span
              key={`${chunk.id}-tag-${tag}`}
              className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full border border-border"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
