/**
 * Feedback API Endpoint
 *
 * Handles feedback submissions and session management for quality tracking.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nightreign/database'
import type {
  FeedbackSubmission,
  FeedbackResponse,
  StartSessionRequest,
  EndSessionRequest,
  FeedbackSession,
} from '@nightreign/types'

/**
 * POST /api/feedback
 *
 * Submit feedback for a search response
 */
export async function POST(request: NextRequest): Promise<NextResponse<FeedbackResponse>> {
  try {
    const body = await request.json()

    // Check if this is a session action
    if (body.action === 'start-session') {
      return handleStartSession(body as StartSessionRequest)
    }

    if (body.action === 'end-session') {
      return handleEndSession(body as EndSessionRequest)
    }

    // Otherwise, it's a feedback submission
    const submission = body as FeedbackSubmission

    // Validate required fields
    if (!submission.query || submission.helpful === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: query and helpful' },
        { status: 400 }
      )
    }

    // Create feedback entry
    const feedback = await prisma.feedback.create({
      data: {
        sessionId: submission.sessionId || null,
        query: submission.query,
        queryType: submission.queryType || null,
        responseId: submission.responseId || null,
        response: submission.response || '',
        helpful: submission.helpful,
        reason: submission.reason || null,
        expected: submission.expected || null,
        latencyMs: submission.latencyMs || null,
      },
    })

    console.log(
      `[Feedback] ${submission.helpful ? '👍' : '👎'} for "${submission.query.slice(0, 50)}..."${
        submission.reason ? ` - Reason: ${submission.reason.slice(0, 100)}` : ''
      }`
    )

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    })
  } catch (error) {
    console.error('[Feedback] Error saving feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}

/**
 * Start a new feedback session
 */
async function handleStartSession(
  request: StartSessionRequest
): Promise<NextResponse<FeedbackResponse & { session?: FeedbackSession }>> {
  try {
    const session = await prisma.feedbackSession.create({
      data: {
        name: request.name || null,
      },
    })

    console.log(`[Feedback] Started session: ${session.id}${request.name ? ` (${request.name})` : ''}`)

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        name: session.name || undefined,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        notes: session.notes || undefined,
      },
    })
  } catch (error) {
    console.error('[Feedback] Error starting session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start session' },
      { status: 500 }
    )
  }
}

/**
 * End a feedback session
 */
async function handleEndSession(
  request: EndSessionRequest
): Promise<NextResponse<FeedbackResponse & { session?: FeedbackSession }>> {
  try {
    if (!request.sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    const session = await prisma.feedbackSession.update({
      where: { id: request.sessionId },
      data: {
        endedAt: new Date(),
        notes: request.notes || null,
      },
      include: {
        feedback: {
          select: { id: true, helpful: true },
        },
      },
    })

    const helpful = session.feedback.filter((f) => f.helpful).length
    const unhelpful = session.feedback.filter((f) => !f.helpful).length

    console.log(
      `[Feedback] Ended session: ${session.id} - ${session.feedback.length} feedback items (${helpful} 👍, ${unhelpful} 👎)`
    )

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        name: session.name || undefined,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        notes: session.notes || undefined,
      },
    })
  } catch (error) {
    console.error('[Feedback] Error ending session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to end session' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/feedback
 *
 * Export feedback data for analysis
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10)

    const where = sessionId ? { sessionId } : {}

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        session: {
          select: { id: true, name: true, startedAt: true, endedAt: true },
        },
      },
    })

    // Calculate summary stats
    const total = feedback.length
    const helpful = feedback.filter((f) => f.helpful).length
    const unhelpful = total - helpful

    return NextResponse.json({
      summary: {
        total,
        helpful,
        unhelpful,
        helpfulRate: total > 0 ? `${(helpful / total * 100).toFixed(1)}%` : 'N/A',
      },
      feedback: feedback.map((f) => ({
        id: f.id,
        query: f.query,
        queryType: f.queryType,
        helpful: f.helpful,
        reason: f.reason,
        expected: f.expected,
        latencyMs: f.latencyMs,
        createdAt: f.createdAt.toISOString(),
        session: f.session
          ? {
              id: f.session.id,
              name: f.session.name,
            }
          : null,
      })),
    })
  } catch (error) {
    console.error('[Feedback] Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
