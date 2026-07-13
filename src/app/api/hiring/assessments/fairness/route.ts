import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import {
  getSelectionFairness,
  persistFairnessEvidence,
  type FairnessReportableStage,
} from '@/lib/hiring/assessment/fairness'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const readInput = (url: URL) => ({
  stage: (url.searchParams.get('stage') ?? 'selected') as FairnessReportableStage,
  templateId: url.searchParams.get('templateId'),
  windowMonths: Number(url.searchParams.get('windowMonths') ?? 3) || 3,
})

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.fairness_read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.assessment.fairness_read' },
    })
  }

  try {
    return NextResponse.json(await getSelectionFairness(readInput(new URL(request.url))))
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_fairness')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.fairness_read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.assessment.fairness_read' },
    })
  }

  try {
    let body: { stage?: FairnessReportableStage; templateId?: string | null; windowMonths?: number } = {}

    try {
      const raw = await request.text()

      body = raw ? JSON.parse(raw) : {}
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud no es JSON válido.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    const report = await getSelectionFairness(body)
    const evidence = await persistFairnessEvidence(report, tenant.userId)

    return NextResponse.json({ evidence, report }, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_fairness_evidence')
  }
}
