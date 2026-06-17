import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { deleteNexaThread, getNexaThreadDetail, renameNexaThread } from '@/lib/nexa/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ threadId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return canonicalErrorResponse('unauthorized')
  }

  const { threadId } = await context.params

  if (!threadId?.trim()) {
    return NextResponse.json({ error: 'Missing threadId' }, { status: 400 })
  }

  try {
    const detail = await getNexaThreadDetail({
      threadId,
      userId: session.user.userId,
      clientId: session.user.clientId
    })

    if (!detail) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    captureWithDomain(error, 'home', {
      tags: { source: 'nexa_thread_detail_endpoint' },
      extra: { detail: redactErrorForResponse(error), userId: session.user.userId }
    })

    return canonicalErrorResponse('internal_error')
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ threadId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return canonicalErrorResponse('unauthorized')
  }

  const { threadId } = await context.params

  if (!threadId?.trim()) {
    return NextResponse.json({ error: 'Missing threadId' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''

  if (!title) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }

  try {
    const renamed = await renameNexaThread({
      threadId,
      userId: session.user.userId,
      clientId: session.user.clientId,
      title
    })

    if (!renamed) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    return NextResponse.json({ threadId, title })
  } catch (error) {
    captureWithDomain(error, 'home', {
      tags: { source: 'nexa_thread_rename_endpoint' },
      extra: { detail: redactErrorForResponse(error), userId: session.user.userId }
    })

    return canonicalErrorResponse('internal_error')
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ threadId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return canonicalErrorResponse('unauthorized')
  }

  const { threadId } = await context.params

  if (!threadId?.trim()) {
    return NextResponse.json({ error: 'Missing threadId' }, { status: 400 })
  }

  try {
    const deleted = await deleteNexaThread({
      threadId,
      userId: session.user.userId,
      clientId: session.user.clientId
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    return NextResponse.json({ threadId, deleted: true })
  } catch (error) {
    captureWithDomain(error, 'home', {
      tags: { source: 'nexa_thread_delete_endpoint' },
      extra: { detail: redactErrorForResponse(error), userId: session.user.userId }
    })

    return canonicalErrorResponse('internal_error')
  }
}
