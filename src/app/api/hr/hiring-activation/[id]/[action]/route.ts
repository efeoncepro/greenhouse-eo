import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringNotFoundResponse } from '@/lib/hiring'
import { HrCoreValidationError } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import {
  cancelHiringActivation,
  completeHiringActivation,
  createMemberForHiringActivation,
  getHiringActivationBlockerActionContract,
  isHiringActivationEnabled,
  isHiringActivationError,
  openOnboardingForHiringActivation,
  reviewHiringActivation,
  resolveHiringActivationBlocker,
} from '@/lib/workforce/hiring-activation'

export const dynamic = 'force-dynamic'

/**
 * TASK-770/1400 — Commands del bridge: POST /api/hr/hiring-activation/[id]/(review|
 * create-member|open-onboarding|resolve-blocker|complete|cancel). [id] = hiring_handoff_id
 * (UNIQUE del request).
 *
 * Capabilities least-privilege por acción (matriz TASK-873, sin proliferar):
 * - review / complete / cancel → `hiring.activation.review` (la única nueva de 770)
 * - create-member → `workforce.member.intake.update` (reusada — es trabajo de intake)
 * - open-onboarding → `hr.onboarding_instance` create (reusada, TASK-030)
 * - resolve-blocker → capability del action contract interno (`retry-*`, TASK-1400)
 *
 * La ACTIVACIÓN del colaborador NO vive acá: pasa por completeWorkforceMemberIntake +
 * readiness (path existente). `complete` solo cierra el bridge con evidencia.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const { id, action } = await params

  if (!isHiringActivationEnabled()) {
    return hiringNotFoundResponse('El bridge de activación no está habilitado.', 'hiring_activation_disabled')
  }

  let body: { reasonDetail?: string; blockerKey?: string; action?: string; payload?: unknown } = {}

  try {
    const raw = await request.text()

    body = raw ? (JSON.parse(raw) as { reasonDetail?: string }) : {}
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es JSON válido.', code: 'hiring_activation_invalid_input', actionable: false },
      { status: 400 },
    )
  }

  try {
    const actor = tenant.userId

    switch (action) {
      case 'review': {
        if (!can(tenant, 'hiring.activation.review', 'execute', 'tenant')) {
          return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.activation.review' } })
        }

        return NextResponse.json(await reviewHiringActivation({ hiringHandoffId: id, actorUserId: actor }))
      }

      case 'create-member': {
        if (!can(tenant, 'workforce.member.intake.update', 'update', 'tenant')) {
          return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'workforce.member.intake.update' } })
        }

        return NextResponse.json(await createMemberForHiringActivation({ hiringHandoffId: id, actorUserId: actor }))
      }

      case 'open-onboarding': {
        if (!can(tenant, 'hr.onboarding_instance', 'create', 'tenant')) {
          return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hr.onboarding_instance' } })
        }

        return NextResponse.json(await openOnboardingForHiringActivation({ hiringHandoffId: id, actorUserId: actor }))
      }

      case 'resolve-blocker': {
        const actionContract = getHiringActivationBlockerActionContract(body.action)

        if (!actionContract) {
          if (!can(tenant, 'hiring.activation.review', 'execute', 'tenant')) {
            return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.activation.review' } })
          }
        } else if (
          !can(
            tenant,
            actionContract.requiredCapability,
            actionContract.requiredCapabilityAction,
            actionContract.requiredScope,
          )
        ) {
          return canonicalErrorResponse('forbidden', {
            extra: {
              requiredCapability: actionContract.requiredCapability,
              requiredAction: actionContract.requiredCapabilityAction,
            },
          })
        }

        if (typeof body.blockerKey !== 'string' || !body.blockerKey.trim()) {
          return NextResponse.json(
            {
              error: 'Debes indicar blockerKey para resolver un blocker de activación.',
              code: 'hiring_activation_blocker_payload_invalid',
              actionable: false,
            },
            { status: 400 },
          )
        }

        if (typeof body.action !== 'string' || !body.action.trim()) {
          return NextResponse.json(
            {
              error: 'Debes indicar action para resolver un blocker de activación.',
              code: 'hiring_activation_blocker_payload_invalid',
              actionable: false,
            },
            { status: 400 },
          )
        }

        return NextResponse.json(
          await resolveHiringActivationBlocker({
            hiringHandoffId: id,
            actorUserId: actor,
            blockerKey: body.blockerKey,
            action: body.action,
            payload: body.payload,
          }),
        )
      }

      case 'complete': {
        if (!can(tenant, 'hiring.activation.review', 'execute', 'tenant')) {
          return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.activation.review' } })
        }

        return NextResponse.json(await completeHiringActivation({ hiringHandoffId: id, actorUserId: actor }))
      }

      case 'cancel': {
        if (!can(tenant, 'hiring.activation.review', 'execute', 'tenant')) {
          return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.activation.review' } })
        }

        return NextResponse.json(
          await cancelHiringActivation({ hiringHandoffId: id, actorUserId: actor, reasonDetail: body.reasonDetail }),
        )
      }

      default:
        return hiringNotFoundResponse('La acción de activación no existe.', 'hiring_activation_action_not_found')
    }
  } catch (error) {
    if (isHiringActivationError(error)) {
      const safeDetail =
        action === 'resolve-blocker' && error.code === 'hiring_activation_blocker_stale'
          ? (error.details as { detail?: unknown } | undefined)?.detail
          : undefined

      return NextResponse.json(
        { error: error.message, code: error.code, actionable: false, ...(safeDetail ? { detail: safeDetail } : {}) },
        { status: error.statusCode },
      )
    }

    if (error instanceof HrCoreValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code ?? 'hr_core_validation_error', actionable: false },
        { status: error.statusCode },
      )
    }

    captureWithDomain(error, 'workforce', { tags: { source: `hiring_activation:${action}` } })

    return NextResponse.json(
      {
        error: 'No se pudo completar la operación de activación.',
        code: 'hiring_activation_internal_error',
        actionable: true,
        detail: redactErrorForResponse(error),
      },
      { status: 500 },
    )
  }
}
