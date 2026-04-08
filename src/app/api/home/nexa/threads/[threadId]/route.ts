import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { getNexaThreadDetail } from '@/lib/nexa/store'

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
