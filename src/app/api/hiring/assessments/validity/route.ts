import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import { getAssessmentValidity } from '@/lib/hiring/assessment/validity/get-validity'
import { persistValidityEvidence } from '@/lib/hiring/assessment/validity/evidence'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-1364 — Validez predictiva del assessment (agregados, sin PII per-candidato).
 * GET = reporte read-only (capability hiring.assessment.read).
 * POST = persistir snapshot como evidencia AI-Act append-only (capability hiring.assessment.score
 * — tier de gobernanza; documentar evidencia es acto de gobernanza, no lectura casual).
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.read' } })
  }

  try {
    const url = new URL(request.url)

    const report = await getAssessmentValidity({
      templateId: url.searchParams.get('templateId'),
      competencyKey: url.searchParams.get('competencyKey'),
      windowMonths: Number(url.searchParams.get('windowMonths') ?? 3) || 3,
    })

    return NextResponse.json(report)
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_validity')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.score', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.score' } })
  }

  try {
    let body: { templateId?: string; competencyKey?: string; windowMonths?: number } = {}

    try {
      const raw = await request.text()

      body = raw ? JSON.parse(raw) : {}
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud no es JSON válido.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    const report = await getAssessmentValidity(body)
    const evidence = await persistValidityEvidence(report, tenant.userId)

    return NextResponse.json({ evidence, report }, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_validity_evidence')
  }
}
