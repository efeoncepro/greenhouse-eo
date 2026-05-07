import { NextResponse } from 'next/server'

import { getSampleSprintDetail } from '@/lib/commercial/sample-sprints/store'

import { requireSampleSprintEntitlement } from '../access'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement('commercial.engagement.read', 'read')

  if (!tenant) return errorResponse

  const { serviceId } = await params
  const detail = await getSampleSprintDetail({ tenant, serviceId })

  if (!detail) {
    return NextResponse.json({ error: 'Sample Sprint not found.' }, { status: 404 })
  }

  return NextResponse.json(detail)
}
