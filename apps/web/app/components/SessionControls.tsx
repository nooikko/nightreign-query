'use client'

import { useState, useCallback } from 'react'
import type { FeedbackSession } from '@nightreign/types'

interface SessionControlsProps {
  /** Callback when session state changes */
  onSessionChange?: (session: FeedbackSession | null) => void
}

export function SessionControls({ onSessionChange }: SessionControlsProps) {
  const [session, setSession] = useState<FeedbackSession | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [endNotes, setEndNotes] = useState('')
  const [showEndNotes, setShowEndNotes] = useState(false)

  const startSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start-session',
          name: sessionName || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.session) {
          setSession(data.session)
          onSessionChange?.(data.session)
          setShowNameInput(false)
          setSessionName('')
        }
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    } finally {
      setIsLoading(false)
    }
  }, [sessionName, onSessionChange])

  const endSession = useCallback(async () => {
    if (!session) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end-session',
          sessionId: session.id,
          notes: endNotes || undefined,
        }),
      })

      if (res.ok) {
        setSession(null)
        onSessionChange?.(null)
        setShowEndNotes(false)
        setEndNotes('')
      }
    } catch (error) {
      console.error('Failed to end session:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session, endNotes, onSessionChange])

  // No active session - show "Start Run" button
  if (!session) {
    return (
      <div className="flex items-center gap-2">
        {showNameInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Run name (optional)"
              className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') startSession()
                if (e.key === 'Escape') setShowNameInput(false)
              }}
            />
            <button
              type="button"
              onClick={startSession}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 rounded font-medium transition-colors"
            >
              {isLoading ? 'Starting...' : 'Start'}
            </button>
            <button
              type="button"
              onClick={() => setShowNameInput(false)}
              className="px-2 py-1 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNameInput(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-green-900/50 hover:text-green-400 border border-zinc-700 hover:border-green-700 rounded transition-colors"
          >
            <span>🎮</span>
            <span>Start Run</span>
          </button>
        )}
      </div>
    )
  }

  // Active session - show session info and "End Run" button
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-700/50 rounded text-sm">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-green-400">
          {session.name || 'Active Run'}
        </span>
      </div>

      {showEndNotes ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={endNotes}
            onChange={(e) => setEndNotes(e.target.value)}
            placeholder="Run notes (optional)"
            className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') endSession()
              if (e.key === 'Escape') setShowEndNotes(false)
            }}
          />
          <button
            type="button"
            onClick={endSession}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 rounded font-medium transition-colors"
          >
            {isLoading ? 'Ending...' : 'End Run'}
          </button>
          <button
            type="button"
            onClick={() => setShowEndNotes(false)}
            className="px-2 py-1 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowEndNotes(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-red-900/50 hover:text-red-400 border border-zinc-700 hover:border-red-700 rounded transition-colors"
        >
          <span>🏁</span>
          <span>End Run</span>
        </button>
      )}
    </div>
  )
}
