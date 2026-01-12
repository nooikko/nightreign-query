'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Keyboard shortcut definitions
 */
export interface KeyboardShortcuts {
  /**
   * Callback when "/" is pressed (focus search)
   */
  onFocusSearch?: () => void

  /**
   * Callback when "Esc" is pressed (clear/escape)
   */
  onEscape?: () => void
}

/**
 * Check if the current focus is in an input element
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    activeElement.getAttribute('contenteditable') === 'true'
  )
}

/**
 * Custom hook for global keyboard shortcuts
 *
 * Implements:
 * - "/" to focus search input (only when not in an input field)
 * - "Esc" to clear/escape (works always)
 *
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null)
 *
 * useKeyboardShortcuts({
 *   onFocusSearch: () => inputRef.current?.focus(),
 *   onEscape: () => {
 *     setQuery('')
 *     inputRef.current?.blur()
 *   }
 * })
 * ```
 */
export function useKeyboardShortcuts({
  onFocusSearch,
  onEscape,
}: KeyboardShortcuts): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Handle "/" key - focus search (only when not in input)
      if (event.key === '/' && !isInputFocused()) {
        event.preventDefault()
        onFocusSearch?.()
      }

      // Handle "Escape" key - works in all contexts
      if (event.key === 'Escape') {
        onEscape?.()
      }
    },
    [onFocusSearch, onEscape],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

/**
 * Ref type for the SearchBar component's keyboard shortcut integration
 */
export interface SearchBarRef {
  focus: () => void
  clear: () => void
  getQuery: () => string
}

/**
 * Hook to create a ref-based integration for SearchBar keyboard shortcuts
 *
 * Returns a ref that can be passed to SearchBar, and callbacks for shortcuts
 *
 * @example
 * ```tsx
 * const { searchRef, focusSearch, clearSearch } = useSearchBarShortcuts()
 *
 * useKeyboardShortcuts({
 *   onFocusSearch: focusSearch,
 *   onEscape: clearSearch,
 * })
 *
 * return <SearchBar ref={searchRef} ... />
 * ```
 */
export function useSearchBarShortcuts() {
  const inputRef = useRef<HTMLInputElement>(null)
  const clearCallbackRef = useRef<(() => void) | null>(null)

  const focusSearch = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const clearSearch = useCallback(() => {
    if (clearCallbackRef.current) {
      clearCallbackRef.current()
    }
    inputRef.current?.blur()
  }, [])

  const registerClearCallback = useCallback((callback: () => void) => {
    clearCallbackRef.current = callback
  }, [])

  return {
    inputRef,
    focusSearch,
    clearSearch,
    registerClearCallback,
  }
}
