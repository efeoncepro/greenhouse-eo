import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { finalizeAssessment, getAssessmentById, recordHumanScore } from '@/lib/hiring/assessment'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1360 — `POST /api/hiring/assessments/[id]/score` (corrección humana, capability score).
 * Body `{ responseId, score }` corrige una respuesta abierta/situacional (o confirma la sugerencia
 * IA de TASK-1361). Body `{ action: 'finalize' }` materializa competency_result + status scored +
 * rollup ADVISORY al application (falla si quedan pendientes). El score NUNCA auto-rechaza.
 */
export const dynamic = 'force-dynamic'

interface ScoreBody {
  action?: 'rate' | 'finalize'
  responseId?: string
  score?: number
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.score', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.score' } })
  }

  let body: ScoreBody

  try {
    body = (await request.json()) as ScoreBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const { id } = await params

    if (body.action === 'finalize') {
      await finalizeAssessment(id, tenant.userId)
      const assessment = await getAssessmentById(id)

      
return NextResponse.json({ assessment })
    }

    if (!body.responseId || typeof body.score !== 'number') {
      return NextResponse.json(
        { error: 'responseId y score (número) son obligatorios.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    await recordHumanScore(body.responseId, body.score, tenant.userId)
    
return NextResponse.json({ ok: true })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_score')
  }
}
