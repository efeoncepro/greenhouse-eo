import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { listNexaThreads } from '@/lib/nexa/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threads = await listNexaThreads({
    userId: session.user.userId,
    clientId: session.user.clientId,
    limit: 20
  })

  return NextResponse.json(threads)
}
