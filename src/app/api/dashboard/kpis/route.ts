import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getDashboardOverview } from '@/lib/dashboard/get-dashboard-overview'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getDashboardOverview({
    clientId: session.user.clientId,
    projectIds: session.user.projectIds
  })

  return NextResponse.json(data)
}
