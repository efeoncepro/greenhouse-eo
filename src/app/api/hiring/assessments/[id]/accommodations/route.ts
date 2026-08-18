import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { grantAssessmentAccommodation } from '@/lib/hiring/assessment/accommodations'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1719 — `POST /api/hiring/assessments/[id]/accommodations`.
 *
 * Otorga un ajuste razonable (tiempo extra) sobre un candidate_test. Cierra la Open Question 7
 * del ADR de assignment policy. El actor SIEMPRE sale de la sesión (`tenant.userId`), nunca del
 * body. NO se gatea por flag: acomodar a una persona no puede depender de una variable de
 * entorno.
 *
 * Body: `{ extraMinutes }`. NO acepta —ni aceptará— un campo con el MOTIVO del ajuste: eso
 * revelaría condición de discapacidad (categoría protegida). Ver el command.
 *
 * La respuesta NUNCA incluye el token de acceso (el view model del store ya lo excluye).
 *
 * ⚠️ El segmento dinámico es `[id]` y no `[assessmentId]` por obligación de Next.js: el árbol
 * ya tiene `src/app/api/hiring/assessments/[id]/route.ts`, y dos nombres de slug distintos en
 * el mismo nivel rompen el build.
 */
export const dynamic = 'force-dynamic'

interface GrantAccommodationBody {
  extraMinutes?: number
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.grant_accommodation', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.assessment.grant_accommodation' },
    })
  }

  const { id } = await params

  let body: GrantAccommodationBody

  try {
    body = (await request.json()) as GrantAccommodationBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const result = await grantAssessmentAccommodation({
      assessmentId: id,
      extraMinutes: body.extraMinutes as number,
      actorUserId: tenant.userId,
    })

    return NextResponse.json(result)
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_grant_accommodation')
  }
}
