import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { assignCandidateTest, assignInterviewerScorecard, listAssessmentsForApplication } from '@/lib/hiring/assessment'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1360 — `GET/POST /api/hiring/assessments`.
 * GET (read): `?applicationId=` lista las instancias de una postulación.
 * POST (author): asigna una instancia. `method=candidate_test` devuelve el token UNA vez (para el
 * link tokenizado que consume TASK-1363); `interviewer_scorecard` crea el scorecard del evaluador.
 */
export const dynamic = 'force-dynamic'

interface AssignBody {
  applicationId?: string
  templateId?: string
  method?: 'candidate_test' | 'interviewer_scorecard'
  evaluatorUserId?: string
  timeLimitMinutes?: number
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.read' } })
  }

  try {
    const applicationId = new URL(request.url).searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Falta el parámetro applicationId.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    const items = await listAssessmentsForApplication(applicationId)

    
return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessments_list')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.author', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.author' } })
  }

  let body: AssignBody

  try {
    body = (await request.json()) as AssignBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    if (body.method === 'interviewer_scorecard') {
      if (!body.applicationId || !body.evaluatorUserId) {
        return NextResponse.json(
          { error: 'applicationId y evaluatorUserId son obligatorios.', code: 'hiring_invalid_input', actionable: false },
          { status: 400 },
        )
      }

      const assessment = await assignInterviewerScorecard(body.applicationId, body.evaluatorUserId, tenant.userId)

      
return NextResponse.json(assessment, { status: 201 })
    }

    if (!body.applicationId || !body.templateId) {
      return NextResponse.json(
        { error: 'applicationId y templateId son obligatorios.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    const result = await assignCandidateTest(
      { applicationId: body.applicationId, templateId: body.templateId, timeLimitMinutes: body.timeLimitMinutes ?? null },
      tenant.userId,
    )

    // El token crudo se devuelve UNA vez (para construir el link). No se persiste en claro.
    return NextResponse.json({ assessment: result.assessment, token: result.token }, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_assign')
  }
}
