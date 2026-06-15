import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import type { NexaFeedbackRequest, NexaFeedbackResponse } from '@/lib/nexa/nexa-contract'
import { persistNexaFeedback } from '@/lib/nexa/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return canonicalErrorResponse('unauthorized')
  }

  const body = await request.json() as NexaFeedbackRequest

  if (!body.responseId?.trim()) {
    return NextResponse.json({ error: 'Missing responseId' }, { status: 400 })
  }

  if (body.sentiment !== 'positive' && body.sentiment !== 'negative') {
    return NextResponse.json({ error: 'Invalid sentiment' }, { status: 400 })
  }

  try {
    await persistNexaFeedback({
      userId: session.user.userId,
      clientId: session.user.clientId,
      feedback: body
    })

    const response: NexaFeedbackResponse = { ok: true }

    return NextResponse.json(response)
  } catch (error) {
    captureWithDomain(error, 'home', {
      tags: { source: 'nexa_feedback_endpoint' },
      extra: { detail: redactErrorForResponse(error), userId: session.user.userId }
    })

    return canonicalErrorResponse('internal_error')
  }
}
