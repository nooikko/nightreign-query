'use client'

import type { ContentType, SearchQuery, SearchResult } from '@nightreign/types'
import {
  type FormEvent,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

/**
 * Content type options for the filter dropdown
 */
const CONTENT_TYPES: ReadonlyArray<{ value: ContentType; label: string }> = [
  { value: 'boss', label: 'Boss' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'relic', label: 'Relic' },
  { value: 'nightfarer', label: 'Nightfarer' },
  { value: 'skill', label: 'Skill' },
  { value: 'talisman', label: 'Talisman' },
  { value: 'guide', label: 'Guide' },
] as const

/**
 * Methods exposed by SearchBar via ref
 */
export interface SearchBarRef {
  /** Focus the search input */
  focus: () => void
  /** Clear the search input */
  clear: () => void
  /** Get the current query value */
  getQuery: () => string
}

interface SearchBarProps {
  /**
   * Callback invoked when search results are received
   */
  readonly onSearchResults: (results: SearchResult) => void

  /**
   * Callback invoked when a search error occurs
   */
  readonly onSearchError?: (error: Error) => void

  /**
   * Optional initial query value
   */
  readonly initialQuery?: string

  /**
   * Optional initial format preference
   */
  readonly initialFormat?: boolean

  /**
   * Maximum character limit for queries
   * @default 500
   */
  readonly maxLength?: number
}

/**
 * SearchBar Component
 *
 * A client component for search input with type filtering and format toggle.
 * Submits queries to /api/search on Enter or button click.
 *
 * Features:
 * - Natural language query input (up to 500 chars)
 * - Search on Enter key or button click
 * - Content type filtering
 * - Format toggle (AI-formatted vs raw results)
 * - Accessible form controls with ARIA labels
 * - Loading state management
 * - Dark theme styling for gaming aesthetic
 * - Keyboard shortcuts via ref (focus, clear)
 *
 * @example
 * ```tsx
 * const searchRef = useRef<SearchBarRef>(null)
 *
 * // Focus search with "/" key
 * useEffect(() => {
 *   const handleKey = (e) => {
 *     if (e.key === '/' && !isInputFocused()) {
 *       e.preventDefault()
 *       searchRef.current?.focus()
 *     }
 *   }
 *   document.addEventListener('keydown', handleKey)
 *   return () => document.removeEventListener('keydown', handleKey)
 * }, [])
 *
 * return (
 *   <SearchBar
 *     ref={searchRef}
 *     onSearchResults={(results) => setResults(results)}
 *     onSearchError={(error) => console.error(error)}
 *   />
 * )
 * ```
 */
export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(
  function SearchBar(
    {
      onSearchResults,
      onSearchError,
      initialQuery = '',
      initialFormat = false,
      maxLength = 500,
    },
    ref,
  ) {
    // Form state
    const [query, setQuery] = useState(initialQuery)
    const [selectedType, setSelectedType] = useState<ContentType | ''>('')
    const [format, setFormat] = useState(initialFormat)
    const [isLoading, setIsLoading] = useState(false)

    // Refs for abort control and input element
    const inputRef = useRef<HTMLInputElement>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          inputRef.current?.focus()
        },
        clear: () => {
          setQuery('')
          setSelectedType('')
          inputRef.current?.blur()
        },
        getQuery: () => query,
      }),
      [query],
    )

    /**
     * Executes the search API call
     */
    const executeSearch = useCallback(
      async (
        searchQuery: string,
        searchType: ContentType | '',
        searchFormat: boolean,
      ) => {
        // Don't search if query is empty
        if (!searchQuery.trim()) {
          return
        }

        // Cancel any pending requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        // Create new abort controller for this request
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        setIsLoading(true)

        try {
          // Build search query payload
          const payload: SearchQuery = {
            query: searchQuery.trim(),
            filters: searchType ? { type: [searchType] } : undefined,
            format: searchFormat,
          }

          const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: abortController.signal,
          })

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: 'Search failed' }))
            throw new Error(
              errorData.error || `Search failed with status ${response.status}`,
            )
          }

          // Check if this is a streaming response (format: true)
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('text/event-stream')) {
            // Handle SSE streaming response
            const reader = response.body?.getReader()
            if (!reader) {
              throw new Error('Failed to get response reader')
            }

            const decoder = new TextDecoder()
            let formattedContent = ''
            let timing: SearchResult['timing'] | undefined

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    if (data.type === 'chunk') {
                      formattedContent += data.content
                    } else if (data.type === 'timing') {
                      timing = data.timing
                    } else if (data.type === 'done') {
                      timing = data.timing
                    } else if (data.type === 'error') {
                      throw new Error(data.error)
                    }
                  } catch (parseError) {
                    // Skip malformed JSON lines
                    if (parseError instanceof SyntaxError) continue
                    throw parseError
                  }
                }
              }
            }

            // Return formatted content as a special result
            onSearchResults({
              results: [],
              timing: timing || { embedding: 0, search: 0, total: 0 },
              formatted: formattedContent,
            } as SearchResult & { formatted: string })
          } else {
            // Handle regular JSON response
            const data = (await response.json()) as SearchResult
            onSearchResults(data)
          }
        } catch (error) {
          // Ignore abort errors (they're intentional)
          if (error instanceof Error && error.name === 'AbortError') {
            return
          }

          const searchError =
            error instanceof Error
              ? error
              : new Error('An unknown error occurred')
          onSearchError?.(searchError)
        } finally {
          // Only clear loading if this is still the active request
          if (abortControllerRef.current === abortController) {
            setIsLoading(false)
            abortControllerRef.current = null
          }
        }
      },
      [onSearchResults, onSearchError],
    )


    /**
     * Handle form submission (Enter key or button click)
     */
    const handleSubmit = useCallback(
      (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        executeSearch(query, selectedType, format)
      },
      [query, selectedType, format, executeSearch],
    )

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
      return () => {
        // Cancel any pending requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
    }, [])

    return (
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl mx-auto space-y-4"
        aria-label="Search Nightreign content"
      >
        {/* Main search input and button */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about Nightreign... (e.g., 'best weapons for fire damage')"
              maxLength={maxLength}
              disabled={isLoading}
              className="w-full px-4 py-3 pr-16 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Search query"
              aria-describedby="search-hint"
            />
            {query.length > 0 && (
              <span
                className={`absolute right-3 top-3 text-xs ${
                  query.length >= maxLength
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
                aria-live="polite"
              >
                {query.length}/{maxLength}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Submit search"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Searching
              </span>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {/* Filters and options */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Content type filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="type-filter"
              className="text-sm font-medium text-muted-foreground"
            >
              Type:
            </label>
            <select
              id="type-filter"
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value as ContentType | '')
              }
              disabled={isLoading}
              className="px-3 py-1.5 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Filter by content type"
            >
              <option value="">All Types</option>
              {CONTENT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Format toggle */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="format-toggle"
              className="text-sm font-medium text-muted-foreground"
            >
              AI Format:
            </label>
            <button
              type="button"
              id="format-toggle"
              role="switch"
              aria-checked={format}
              onClick={() => setFormat(!format)}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
                format ? 'bg-primary' : 'bg-muted'
              }`}
              aria-label="Toggle AI formatting"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  format ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-muted-foreground">
              {format ? 'Formatted' : 'Raw'}
            </span>
          </div>

          {/* Search hint with keyboard shortcut */}
          <p
            id="search-hint"
            className="text-xs text-muted-foreground ml-auto flex items-center gap-2"
          >
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono">
              /
            </kbd>
            <span>to focus</span>
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono">
              Esc
            </kbd>
            <span>to clear</span>
          </p>
        </div>
      </form>
    )
  },
)
