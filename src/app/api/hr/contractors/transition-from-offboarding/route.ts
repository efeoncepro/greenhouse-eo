import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { ContractorEngagementValidationError } from '@/lib/contractor-engagements'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import {
  CONTRACTOR_PAYMENT_CADENCES,
  CONTRACTOR_PAYMENT_MODELS,
  CONTRACTOR_RATE_TYPES,
  CONTRACTOR_TAX_COMPLIANCE_OWNERS,
  CONTRACTOR_ENGAGEMENT_PAYROLL_VIA
} from '@/lib/contractor-engagements/types'
import { transitionEmployeeToContractorEngagement } from '@/lib/contractor-engagements/transition-from-employee'
import { can } from '@/lib/entitlements/runtime'
import { HrCoreValidationError } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-956 — `POST /api/hr/contractors/transition-from-offboarding`.
 *
 * Entry point del comando conectado employee → contractor engagement. Cablea el
 * seam huérfano: cierra la relación employee + abre la contractor + crea el
 * ContractorEngagement, atómico (TASK-789 + TASK-790 dual-mode en una tx).
 *
 * Auth: requireHrTenantContext + capability `hr.contractor_engagement:manage`
 * (reuse — su contrato canónico ya incluye "transition"; misma autoridad HR; sin
 * proliferar capability). La precondición (offboarding case `executed`) + el
 * classification-risk gate los enforce el comando/store en código.
 *
 * HARD RULE (CLAUDE.md): read-only/append-only sobre finiquito + offboarding. El
 * comando NUNCA muta member.contract_type, final_settlements ni el status del
 * offboarding (solo el evento append-only de TASK-789).
 */

const isMember = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ContractorEngagementValidationError(`El campo ${field} es obligatorio.`, 'missing_required_field')
  }

  return value.trim()
}

const optionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  // Reuse: manage ya cubre la transición del engagement (contrato TASK-790).
  if (!can(subject, 'hr.contractor_engagement', 'manage', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      throw new ContractorEngagementValidationError('El cuerpo de la solicitud es inválido.', 'invalid_body')
    }

    const offboardingCaseId = requireString(body.offboardingCaseId, 'offboardingCaseId')
    const contractorEffectiveFrom = requireString(body.contractorEffectiveFrom, 'contractorEffectiveFrom')
    const reason = requireString(body.reason, 'reason')

    if (!isMember(['contractor', 'honorarios'] as const, body.contractorSubtype)) {
      throw new ContractorEngagementValidationError(
        'contractorSubtype debe ser "contractor" u "honorarios".',
        'invalid_contractor_subtype'
      )
    }

    const e = (body.engagement && typeof body.engagement === 'object' ? body.engagement : {}) as Record<
      string,
      unknown
    >

    if (!isMember(CONTRACTOR_ENGAGEMENT_PAYROLL_VIA, e.payrollVia)) {
      throw new ContractorEngagementValidationError('engagement.payrollVia inválido.', 'invalid_payroll_via')
    }

    if (!isMember(CONTRACTOR_PAYMENT_MODELS, e.paymentModel)) {
      throw new ContractorEngagementValidationError('engagement.paymentModel inválido.', 'invalid_payment_model')
    }

    if (!isMember(CONTRACTOR_RATE_TYPES, e.rateType)) {
      throw new ContractorEngagementValidationError('engagement.rateType inválido.', 'invalid_rate_type')
    }

    if (!isMember(CONTRACTOR_PAYMENT_CADENCES, e.paymentCadence)) {
      throw new ContractorEngagementValidationError('engagement.paymentCadence inválido.', 'invalid_payment_cadence')
    }

    const taxComplianceOwner =
      e.taxComplianceOwner === undefined || e.taxComplianceOwner === null
        ? undefined
        : isMember(CONTRACTOR_TAX_COMPLIANCE_OWNERS, e.taxComplianceOwner)
          ? e.taxComplianceOwner
          : null

    if (taxComplianceOwner === null) {
      throw new ContractorEngagementValidationError(
        'engagement.taxComplianceOwner inválido.',
        'invalid_tax_compliance_owner'
      )
    }

    const result = await transitionEmployeeToContractorEngagement({
      offboardingCaseId,
      contractorEffectiveFrom,
      contractorSubtype: body.contractorSubtype,
      reason,
      actorUserId: tenant.userId,
      engagement: {
        payrollVia: e.payrollVia,
        paymentModel: e.paymentModel,
        paymentCadence: e.paymentCadence,
        rateType: e.rateType,
        rateAmount: optionalNumber(e.rateAmount),
        currency: typeof e.currency === 'string' && e.currency.trim() ? e.currency.trim() : 'CLP',
        requiresInvoice: e.requiresInvoice === undefined ? undefined : e.requiresInvoice === true,
        requiresWorkApproval: e.requiresWorkApproval === undefined ? undefined : e.requiresWorkApproval === true,
        taxComplianceOwner
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof HrCoreValidationError) {
      return NextResponse.json(
        { error: error.message, code: 'transition_validation_error', actionable: false },
        { status: error.statusCode }
      )
    }

    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'contractor_transition_from_offboarding', stage: 'POST' }
      })

      return NextResponse.json(
        { error: redactErrorForResponse(error), code: 'internal_error', actionable: true },
        { status: 500 }
      )
    }

    return toContractorEngagementErrorResponse(error)
  }
}
