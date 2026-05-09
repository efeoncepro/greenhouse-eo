import { NextResponse } from 'next/server'

import { convertEngagement } from '@/lib/commercial/sample-sprints/conversion'
import { recordOutcome, type EngagementOutcomeKind } from '@/lib/commercial/sample-sprints/outcomes'

import { mapSampleSprintError, parseJsonBody, requireSampleSprintEntitlement } from '../../access'

export const dynamic = 'force-dynamic'

interface OutcomeBody {
  outcomeKind?: EngagementOutcomeKind
  decisionDate?: string
  decisionRationale?: string
  reportAssetId?: string | null
  metrics?: Record<string, unknown> | null
  cancellationReason?: string | null
  nextServiceId?: string | null
  nextQuotationId?: string | null
  transitionReason?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement('commercial.engagement.record_outcome', 'update')

  if (!tenant) return errorResponse

  const body = await parseJsonBody<OutcomeBody>(request)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const { serviceId } = await params
  const decisionDate = body.decisionDate || new Date().toISOString().slice(0, 10)

  try {
    if (body.outcomeKind === 'converted') {
      const result = await convertEngagement({
        serviceId,
        decisionDate,
        decisionRationale: body.decisionRationale || '',
        decidedBy: tenant.userId,
        reportAssetId: body.reportAssetId ?? null,
        metrics: body.metrics ?? null,
        nextServiceId: body.nextServiceId ?? null,
        nextQuotationId: body.nextQuotationId ?? null,
        transitionReason: body.transitionReason ?? null
      })

      return NextResponse.json(result, { status: 201 })
    }

    const result = await recordOutcome({
      serviceId,
      outcomeKind: body.outcomeKind || 'adjusted',
      decisionDate,
      decisionRationale: body.decisionRationale || '',
      decidedBy: tenant.userId,
      reportAssetId: body.reportAssetId ?? null,
      metrics: body.metrics ?? null,
      cancellationReason: body.cancellationReason ?? null,
      nextServiceId: body.nextServiceId ?? null,
      nextQuotationId: body.nextQuotationId ?? null
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return mapSampleSprintError(error)
  }
}
