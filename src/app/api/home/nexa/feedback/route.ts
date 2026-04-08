import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import type { NexaFeedbackRequest, NexaFeedbackResponse } from '@/lib/nexa/nexa-contract'
import { persistNexaFeedback } from '@/lib/nexa/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as NexaFeedbackRequest

  if (!body.responseId?.trim()) {
    return NextResponse.json({ error: 'Missing responseId' }, { status: 400 })
  }

  if (body.sentiment !== 'positive' && body.sentiment !== 'negative') {
    return NextResponse.json({ error: 'Invalid sentiment' }, { status: 400 })
  }

  await persistNexaFeedback({
    userId: session.user.userId,
    clientId: session.user.clientId,
    feedback: body
  })

  const response: NexaFeedbackResponse = { ok: true }

  return NextResponse.json(response)
}
