import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { assignInterviewerScorecard, listAssessmentsForApplication } from '@/lib/hiring/assessment'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1360 — `GET/POST /api/hiring/assessments`.
 * GET (read): `?applicationId=` lista las instancias de una postulación.
 * POST (author): crea el scorecard del evaluador (`method=interviewer_scorecard`).
 *
 * **`method=candidate_test` quedó retirado (TASK-1747).** Devolvía el token crudo al caller y
 * dejaba que éste eligiera plantilla, sin política ni fila de ledger: las instancias que creaba
 * son invisibles para el ledger de asignación (ver `assignment-store.supersedeAssignmentsForAssessment`
 * y `cancel.ts`). Sacarlo de la UI no habría cerrado nada — bajo Full API Parity el contrato es la
 * capability, no la pantalla, y cualquier consumidor con `hiring.assessment.author` (Nexa, MCP, un
 * script) podía seguir pidiendo el token. El camino canónico es propose→confirm en
 * `POST /api/hiring/applications/[id]/assessment-assignment`, que resuelve la plantilla desde la
 * policy de la vacante y NUNCA expone el token: el enlace viaja sólo por el correo al candidato.
 */
export const dynamic = 'force-dynamic'

interface AssignBody {
  applicationId?: string
  method?: 'candidate_test' | 'interviewer_scorecard'
  evaluatorUserId?: string
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

    // Retirado: asignar un test al candidato pasa SIEMPRE por el camino gobernado.
    return NextResponse.json(
      {
        error:
          'Este camino para asignar tests quedó retirado. Asigna desde la ficha de la postulación, que aplica la política de la vacante y envía el enlace por correo.',
        code: 'assessment_legacy_assignment_retired',
        actionable: false,
      },
      { status: 410 },
    )
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_assign')
  }
}
