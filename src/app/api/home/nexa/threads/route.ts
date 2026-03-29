import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { listNexaThreads } from '@/lib/nexa/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

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
