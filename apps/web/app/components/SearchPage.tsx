'use client'

import type { SearchResult } from '@nightreign/types'
import { useCallback, useRef, useState } from 'react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { Results } from './Results'
import { SearchBar, type SearchBarRef } from './SearchBar'

/**
 * SearchPage Component
 *
 * A client component that integrates SearchBar and Results components
 * to create a complete search experience. Manages state for search results,
 * loading, and errors.
 *
 * Features:
 * - SearchBar: Handles user input and triggers searches
 * - Results: Displays search results with streaming support
 * - Keyboard shortcuts: "/" to focus, "Esc" to clear
 *
 * @example
 * ```tsx
 * // In a Server Component page:
 * export default function Page() {
 *   return <SearchPage />
 * }
 * ```
 */
export function SearchPage() {
  const searchBarRef = useRef<SearchBarRef>(null)
  const [results, setResults] = useState<SearchResult | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [currentQuery, setCurrentQuery] = useState<string>('')
  const [isFormatted, setIsFormatted] = useState(false)

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => {
      searchBarRef.current?.focus()
    },
    onEscape: () => {
      searchBarRef.current?.clear()
      setResults(undefined)
      setError(undefined)
      setCurrentQuery('')
    },
  })

  /**
   * Handle successful search results
   */
  const handleSearchResults = useCallback((searchResults: SearchResult) => {
    setResults(searchResults)
    setError(undefined)
    setIsLoading(false)
  }, [])

  /**
   * Handle search errors
   */
  const handleSearchError = useCallback((searchError: Error) => {
    setError(searchError)
    setResults(undefined)
    setIsLoading(false)
  }, [])

  /**
   * Retry current search
   */
  const handleRetry = useCallback(() => {
    setError(undefined)
    setResults(undefined)
    // SearchBar's debounce will retrigger the search
  }, [])

  /**
   * Clear search
   */
  const handleClear = useCallback(() => {
    setResults(undefined)
    setError(undefined)
    setCurrentQuery('')
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Nightreign Quick Reference
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Local-first semantic search for Elden Ring Nightreign. Ask questions
            in natural language or search for specific content.
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          ref={searchBarRef}
          onSearchResults={handleSearchResults}
          onSearchError={handleSearchError}
          initialQuery={currentQuery}
          initialFormat={isFormatted}
        />

        {/* Results */}
        <Results
          results={results}
          isFormatted={isFormatted}
          query={currentQuery}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
        />
      </main>
    </div>
  )
}
