import { NextResponse } from 'next/server'

import {
  OFFBOARDING_CASE_STATUSES,
  transitionOffboardingCase,
  type OffboardingCaseStatus,
  type TransitionOffboardingCaseInput
} from '@/lib/workforce/offboarding'
import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

// TASK-890 Slice 4 — minimum reason length canonico para external_provider close.
// Bar `>=10 chars` validado por arch-architect (mid-blast one-way-door). Patron
// fuente TASK-859 (PR drift). Aplica solo cuando body indica external_provider
// intent (flag `externalProviderCloseReason` distinto del campo `reason` genérico).
const MIN_EXTERNAL_PROVIDER_CLOSE_REASON_CHARS = 10

const actionForStatus = (status: OffboardingCaseStatus) => {
  if (status === 'approved') return 'approve'
  if (status === 'executed' || status === 'cancelled') return 'manage'

  return 'update'
}

/**
 * TASK-890 Slice 4 — external provider close intent shape.
 *
 * Cuando body trae `externalProviderCloseReason` (>= 10 chars), el route handler
 * requiere capability granular `workforce.offboarding.close_external_provider`
 * ADEMAS del check existente `hr.offboarding_case`. El reason se merge al campo
 * `reason` que `transitionOffboardingCase` persiste en
 * `work_relationship_offboarding_case_events` (audit append-only).
 *
 * Spec: docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md §6
 */
type ExternalProviderCloseIntent = {
  externalProviderCloseReason?: string
  externalProviderRef?: string
}

const extractExternalProviderIntent = (
  body: unknown
): ExternalProviderCloseIntent | null => {
  if (!body || typeof body !== 'object') return null

  const raw = (body as Record<string, unknown>).externalProviderCloseReason

  if (typeof raw !== 'string') return null

  const ref = (body as Record<string, unknown>).externalProviderRef
  const refStr = typeof ref === 'string' ? ref : undefined

  return {
    externalProviderCloseReason: raw,
    externalProviderRef: refStr
  }
}

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = (await request.json().catch(() => null)) as
      | (TransitionOffboardingCaseInput & ExternalProviderCloseIntent)
      | null

    if (!rawBody || !OFFBOARDING_CASE_STATUSES.includes(rawBody.status as never)) {
      return NextResponse.json({ error: 'Invalid transition payload.' }, { status: 400 })
    }

    // TASK-890 — detect external provider close intent + validate.
    const externalIntent = extractExternalProviderIntent(rawBody)

    if (externalIntent) {
      const reason = externalIntent.externalProviderCloseReason?.trim() ?? ''

      if (reason.length < MIN_EXTERNAL_PROVIDER_CLOSE_REASON_CHARS) {
        return NextResponse.json(
          {
            error: `El motivo del cierre con proveedor externo debe tener al menos ${MIN_EXTERNAL_PROVIDER_CLOSE_REASON_CHARS} caracteres.`,
            code: 'external_provider_close_reason_too_short',
            actionable: true
          },
          { status: 400 }
        )
      }

      // Granular capability gate per TASK-890 ADR §6.
      assertHrEntitlement({
        tenant,
        capability: 'workforce.offboarding.close_external_provider',
        action: 'update',
        scope: 'tenant'
      })
    }

    // Existing capability gate (state-machine action-based).
    assertHrEntitlement({
      tenant,
      capability: 'hr.offboarding_case',
      action: actionForStatus(rawBody.status),
      scope: 'tenant'
    })

    const { caseId } = await context.params

    // Build canonical input. External intent merges its reason into the
    // generic `reason` field (which `transitionOffboardingCase` persists in
    // the append-only audit table).
    const input: TransitionOffboardingCaseInput = externalIntent
      ? {
          ...rawBody,
          reason: externalIntent.externalProviderCloseReason?.trim() ?? rawBody.reason
        }
      : rawBody

    const updated = await transitionOffboardingCase({
      caseId,
      input,
      actorUserId: tenant.userId
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to transition offboarding case.')
  }
}
