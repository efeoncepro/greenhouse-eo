import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { cancelCandidateTest } from '@/lib/hiring/assessment/cancel'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { AssessmentCancellationReasonCode, AssessmentStatus } from '@/types/hiring-assessment'

/**
 * TASK-1719 Slice 3 — `POST /api/hiring/assessments/[id]/cancel`.
 *
 * Cancelación gobernada de un candidate_test que el candidato AÚN no comenzó. El actor
 * SIEMPRE sale de la sesión (`tenant.userId`), nunca del body. NO se gatea por flag: drenar
 * la recuperación siempre debe poder.
 *
 * Body: `{ reasonCode, note?, expectedStatus? }`.
 * La respuesta NUNCA incluye el token de acceso (el view model del store ya lo excluye).
 *
 * ⚠️ El segmento dinámico es `[id]` y no `[assessmentId]` por obligación de Next.js: el
 * árbol ya tiene `src/app/api/hiring/assessments/[id]/route.ts`, y dos nombres de slug
 * distintos en el mismo nivel rompen el build ("You cannot use different slug names for
 * the same dynamic path").
 */
export const dynamic = 'force-dynamic'

interface CancelBody {
  reasonCode?: AssessmentCancellationReasonCode
  note?: string | null
  expectedStatus?: AssessmentStatus | null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  // Autorar la evaluación incluye retirarla antes de que el candidato la rinda.
  if (!can(tenant, 'hiring.assessment.author', 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.author' } })
  }

  const { id } = await params

  let body: CancelBody

  try {
    body = (await request.json()) as CancelBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const result = await cancelCandidateTest(
      {
        assessmentId: id,
        reasonCode: body.reasonCode as AssessmentCancellationReasonCode,
        note: body.note ?? null,
        expectedStatus: body.expectedStatus ?? null,
      },
      tenant.userId,
    )

    return NextResponse.json(result)
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_cancel')
  }
}
