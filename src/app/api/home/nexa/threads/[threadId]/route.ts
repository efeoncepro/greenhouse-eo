import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { deleteNexaThread, getNexaThreadDetail, renameNexaThread } from '@/lib/nexa/store'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ threadId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { threadId } = await context.params

  if (!threadId?.trim()) {
    return NextResponse.json({ error: 'Missing threadId' }, { status: 400 })
  }

  const detail = await getNexaThreadDetail({
    threadId,
    userId: session.user.userId,
    clientId: session.user.clientId
  })

  if (!detail) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  return NextResponse.json(detail)
}

export async function PATCH(req: Request, context: { params: Promise<{ threadId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
}

export async function DELETE(_: Request, context: { params: Promise<{ threadId: string }> }) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { threadId } = await context.params

  if (!threadId?.trim()) {
    return NextResponse.json({ error: 'Missing threadId' }, { status: 400 })
  }

  const deleted = await deleteNexaThread({
    threadId,
    userId: session.user.userId,
    clientId: session.user.clientId
  })

  if (!deleted) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  return NextResponse.json({ threadId, deleted: true })
}
