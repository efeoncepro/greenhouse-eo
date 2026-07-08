import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { proposeScoreForResponse } from '@/lib/hiring/assessment/ai'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1361 — `POST /api/hiring/assessments/ai/score/propose` (capability ai_assist).
 * SUGIERE un puntaje para una respuesta abierta/situacional; el score canónico solo se aplica al
 * confirmar (recordHumanScore). El LLM nunca escribe el score. Flag-gated.
 */
export const dynamic = 'force-dynamic'

interface ProposeScoreBody {
  responseId?: string
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.ai_assist', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.ai_assist' } })
  }

  let body: ProposeScoreBody

  try {
    body = (await request.json()) as ProposeScoreBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    if (!body.responseId) {
      return NextResponse.json(
        { error: 'responseId es obligatorio.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    const result = await proposeScoreForResponse(body.responseId, tenant.userId)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_ai_score_propose')
  }
}
