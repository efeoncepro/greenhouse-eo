import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { proposeQuestionsForCompetency } from '@/lib/hiring/assessment/ai'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { QuestionLevel } from '@/types/hiring-assessment'

/**
 * TASK-1361 — `POST /api/hiring/assessments/ai/questions/propose` (capability ai_assist).
 * PROPONE borradores de pregunta por competencia+nivel; ninguno entra al banco sin confirmar.
 * Flag-gated (`HIRING_ASSESSMENT_AI_ENABLED`): con el feature OFF devuelve 409 `assessment_ai_disabled`.
 */
export const dynamic = 'force-dynamic'

interface ProposeBody {
  competencyKey?: string
  level?: QuestionLevel
  count?: number
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.ai_assist', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.ai_assist' } })
  }

  let body: ProposeBody

  try {
    body = (await request.json()) as ProposeBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    if (!body.competencyKey || !body.level) {
      return NextResponse.json(
        { error: 'competencyKey y level son obligatorios.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    const result = await proposeQuestionsForCompetency(
      { competencyKey: body.competencyKey, level: body.level, count: body.count },
      tenant.userId,
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_ai_questions_propose')
  }
}
