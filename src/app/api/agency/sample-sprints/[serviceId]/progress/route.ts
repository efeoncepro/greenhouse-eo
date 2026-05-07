import { NextResponse } from 'next/server'

import { recordProgressSnapshot } from '@/lib/commercial/sample-sprints/progress-recorder'

import { mapSampleSprintError, parseJsonBody, requireSampleSprintEntitlement } from '../../access'

export const dynamic = 'force-dynamic'

interface ProgressBody {
  snapshotDate?: string
  metricsJson?: Record<string, unknown>
  qualitativeNotes?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement('commercial.engagement.record_progress', 'update')

  if (!tenant) return errorResponse

  const body = await parseJsonBody<ProgressBody>(request)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const { serviceId } = await params

  try {
    const result = await recordProgressSnapshot({
      serviceId,
      snapshotDate: body.snapshotDate || new Date().toISOString().slice(0, 10),
      metricsJson: body.metricsJson ?? {},
      qualitativeNotes: body.qualitativeNotes ?? null,
      recordedBy: tenant.userId
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return mapSampleSprintError(error)
  }
}
