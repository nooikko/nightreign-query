'use client'

import { useState, useCallback } from 'react'
import type { FeedbackSubmission, ContentType } from '@nightreign/types'

interface FeedbackButtonsProps {
  /** The search query that produced this response */
  query: string
  /** Filter type used (boss, weapon, etc.) */
  queryType?: ContentType
  /** The response content being rated */
  response: string
  /** Optional ID of specific result */
  responseId?: string
  /** Response latency for tracking */
  latencyMs?: number
  /** Optional session ID for grouping */
  sessionId?: string
  /** Callback when feedback is submitted */
  onFeedbackSubmitted?: (helpful: boolean) => void
}

type FeedbackState = 'none' | 'helpful' | 'unhelpful'

export function FeedbackButtons({
  query,
  queryType,
  response,
  responseId,
  latencyMs,
  sessionId,
  onFeedbackSubmitted,
}: FeedbackButtonsProps) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('none')
  const [showDetails, setShowDetails] = useState(false)
  const [reason, setReason] = useState('')
  const [expected, setExpected] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detailsSubmitted, setDetailsSubmitted] = useState(false)

  const submitFeedback = useCallback(
    async (helpful: boolean, includeDetails = false) => {
      setIsSubmitting(true)

      const submission: FeedbackSubmission = {
        sessionId,
        query,
        queryType,
        response: response.slice(0, 5000), // Limit stored response size
        responseId,
        helpful,
        reason: includeDetails && reason ? reason : undefined,
        expected: includeDetails && expected ? expected : undefined,
        latencyMs,
      }

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
        })

        if (res.ok) {
          setFeedbackState(helpful ? 'helpful' : 'unhelpful')
          if (includeDetails) {
            setDetailsSubmitted(true)
            setShowDetails(false)
          }
          onFeedbackSubmitted?.(helpful)
        } else {
          console.error('Failed to submit feedback')
        }
      } catch (error) {
        console.error('Error submitting feedback:', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [query, queryType, response, responseId, latencyMs, sessionId, reason, expected, onFeedbackSubmitted]
  )

  const handleThumbsUp = () => {
    if (feedbackState === 'none') {
      submitFeedback(true)
    }
  }

  const handleThumbsDown = () => {
    if (feedbackState === 'none') {
      setFeedbackState('unhelpful')
      setShowDetails(true)
      // Submit initial thumbs down, details can be added after
      submitFeedback(false)
    }
  }

  const handleSubmitDetails = () => {
    if (reason || expected) {
      submitFeedback(feedbackState === 'helpful', true)
    }
  }

  // Already submitted feedback
  if (feedbackState !== 'none' && !showDetails) {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-700/50">
        <span className="text-sm text-zinc-400">
          {feedbackState === 'helpful' ? '👍 Thanks for the feedback!' : '👎 Thanks for the feedback!'}
        </span>
        {feedbackState === 'unhelpful' && !detailsSubmitted && (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Add details
          </button>
        )}
        {detailsSubmitted && (
          <span className="text-sm text-zinc-500">Details saved</span>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-zinc-700/50">
      {/* Thumbs buttons */}
      {feedbackState === 'none' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 mr-2">Was this helpful?</span>
          <button
            type="button"
            onClick={handleThumbsUp}
            disabled={isSubmitting}
            className="flex items-center gap-1 px-2 py-1 rounded text-sm bg-zinc-800 hover:bg-green-900/50 hover:text-green-400 transition-colors disabled:opacity-50"
            aria-label="Thumbs up - helpful"
          >
            <span>👍</span>
            <span className="text-zinc-400">Yes</span>
          </button>
          <button
            type="button"
            onClick={handleThumbsDown}
            disabled={isSubmitting}
            className="flex items-center gap-1 px-2 py-1 rounded text-sm bg-zinc-800 hover:bg-red-900/50 hover:text-red-400 transition-colors disabled:opacity-50"
            aria-label="Thumbs down - not helpful"
          >
            <span>👎</span>
            <span className="text-zinc-400">No</span>
          </button>
        </div>
      )}

      {/* Details form (shown after thumbs down) */}
      {showDetails && (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="feedback-reason" className="block text-sm text-zinc-400 mb-1">
              Why wasn't this helpful? (optional)
            </label>
            <input
              id="feedback-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Missing weakness info, wrong boss..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="feedback-expected" className="block text-sm text-zinc-400 mb-1">
              What did you expect to see? (optional)
            </label>
            <input
              id="feedback-expected"
              type="text"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="e.g., Fire and Strike weaknesses, parry timing..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmitDetails}
              disabled={isSubmitting || (!reason && !expected)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Details'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDetails(false)
                setDetailsSubmitted(false)
              }}
              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
