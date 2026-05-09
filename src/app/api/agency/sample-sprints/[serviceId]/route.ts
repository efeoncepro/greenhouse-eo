import { NextResponse } from 'next/server'

import { resolveSampleSprintRuntimeProjection } from '@/lib/commercial/sample-sprints/runtime-projection'
import { getSampleSprintDetail, listSampleSprints } from '@/lib/commercial/sample-sprints/store'

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

  // TASK-835 Slice 5 — Runtime projection adjunta al detail. Reusa el detail
  // ya fetcheado para enriquecer team + capacity sin doble fetch.
  const items = await listSampleSprints({ tenant })

  const runtime = await resolveSampleSprintRuntimeProjection({
    tenant,
    selectedServiceId: serviceId,
    prefetchedItems: items,
    prefetchedDetail: detail
  })

  return NextResponse.json({ ...detail, runtime })
}
