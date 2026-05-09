import { NextResponse } from 'next/server'

import { listSampleSprints } from '@/lib/commercial/sample-sprints/store'
import { requireSampleSprintEntitlement } from '@/app/api/agency/sample-sprints/access'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement('commercial.engagement.approve', 'approve')

  if (!tenant) return errorResponse

  const items = await listSampleSprints({ tenant, status: 'pending_approval' })

  return NextResponse.json({ items, count: items.length })
}
