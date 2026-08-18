import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import {
  confirmAssessmentAssignment,
  getCurrentAssignmentProposal,
  proposeAssessmentAssignment,
} from '@/lib/hiring/assessment/assignment-policy'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1719 Slice 2 — `GET/POST /api/hiring/applications/[id]/assessment-assignment`.
 *
 * GET (read): propuesta vigente de asignación + si el actor puede asignar.
 * POST {action:'propose'}: preview durable e idempotente por effect digest. No asigna nada.
 * POST {action:'confirm', proposalId}: confirmación humana one-shot; revalida digest y expiry
 * y ejecuta el command común en una sola transacción.
 *
 * El actor SIEMPRE sale de la sesión (`tenant.userId`), NUNCA del body. El caller nunca elige
 * plantilla: Greenhouse la resuelve desde la policy de la vacante (ADR D2).
 *
 * **La respuesta NUNCA incluye el token ni la URL del assessment** — el link viaja sólo por el
 * correo al candidato, que lo re-emite server-side justo antes del envío.
 */
export const dynamic = 'force-dynamic'

const READ_CAPABILITY = 'hiring.assessment.read'
const AUTHOR_CAPABILITY = 'hiring.assessment.author'

interface AssignmentBody {
  action?: 'propose' | 'confirm'
  proposalId?: string
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, READ_CAPABILITY, 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: READ_CAPABILITY } })
  }

  try {
    const { id } = await params
    const proposal = await getCurrentAssignmentProposal(id)

    return NextResponse.json({
      proposal,
      canAssign: can(tenant, AUTHOR_CAPABILITY, 'create', 'tenant'),
    })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_assignment_get')
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, AUTHOR_CAPABILITY, 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: AUTHOR_CAPABILITY } })
  }

  let body: AssignmentBody

  try {
    body = (await request.json()) as AssignmentBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const { id } = await params

    if (body.action === 'propose') {
      const { proposal, created } = await proposeAssessmentAssignment({
        applicationId: id,
        actorUserId: tenant.userId,
      })

      return NextResponse.json({ proposal }, { status: created ? 201 : 200 })
    }

    if (body.action === 'confirm') {
      if (!body.proposalId) return hiringInvalidBodyResponse()

      // El guardia de pertenencia vive DENTRO del command, bajo el mismo `FOR UPDATE` que la
      // transición: comprobarlo acá antes sería una ventana entre el chequeo y el confirm.
      const result = await confirmAssessmentAssignment({
        proposalId: body.proposalId,
        applicationId: id,
        actorUserId: tenant.userId,
      })

      return NextResponse.json({
        proposal: result.proposal,
        result: result.result,
        alreadyConfirmed: result.alreadyConfirmed,
        assignmentId: result.assignmentId,
      })
    }

    return hiringInvalidBodyResponse()
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_assignment_post')
  }
}
