import { NextResponse } from 'next/server'

import { requireHrTenantContext } from '@/lib/tenant/authorization'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  CONTRACTOR_BONUS_POLICIES,
  CONTRACTOR_ENGAGEMENT_STATUSES,
  CONTRACTOR_PAYMENT_CADENCES,
  CONTRACTOR_PAYMENT_MODELS,
  CONTRACTOR_RATE_TYPES,
  ContractorEngagementValidationError
} from '@/lib/contractor-engagements'
import {
  getContractorEngagementById,
  reviewContractorClassification,
  transitionContractorEngagement,
  updateContractorEngagement
} from '@/lib/contractor-engagements/store'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'

export const dynamic = 'force-dynamic'

const isMember = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_engagement', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const { id } = await params

  try {
    const engagement = await getContractorEngagementById(id)

    if (!engagement) {
      return NextResponse.json(
        { error: 'El engagement no existe.', code: 'engagement_not_found', actionable: false },
        { status: 404 }
      )
    }

    return NextResponse.json({ engagement })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'contractor_engagements_api', stage: 'get' }
    })

    return toContractorEngagementErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)
  const { id } = await params

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      throw new ContractorEngagementValidationError(
        'El cuerpo de la solicitud es inválido.',
        'invalid_body'
      )
    }

    const action = body.action

    if (action === 'review_classification') {
      // Classification review is legal-sensitive: dedicated capability.
      if (!can(subject, 'hr.contractor_classification', 'approve', 'tenant')) {
        return canonicalErrorResponse('forbidden')
      }

      const engagement = await reviewContractorClassification({
        contractorEngagementId: id,
        factors:
          body.factors && typeof body.factors === 'object'
            ? (body.factors as Record<string, boolean>)
            : {},
        reviewed: body.reviewed === true,
        block: body.block === true,
        reason: typeof body.reason === 'string' ? body.reason : null,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ engagement })
    }

    // Lifecycle + economic-term mutations require manage (update).
    if (!can(subject, 'hr.contractor_engagement', 'update', 'tenant')) {
      return canonicalErrorResponse('forbidden')
    }

    if (action === 'transition') {
      const engagement = await transitionContractorEngagement({
        contractorEngagementId: id,
        targetStatus: isMember(CONTRACTOR_ENGAGEMENT_STATUSES, body.targetStatus)
          ? body.targetStatus
          : (() => {
              throw new ContractorEngagementValidationError(
                'targetStatus inválido.',
                'invalid_target_status'
              )
            })(),
        reason: typeof body.reason === 'string' ? body.reason : null,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ engagement })
    }

    if (action === 'update' || action === undefined) {
      const engagement = await updateContractorEngagement({
        contractorEngagementId: id,
        paymentModel: isMember(CONTRACTOR_PAYMENT_MODELS, body.paymentModel)
          ? body.paymentModel
          : undefined,
        rateType: isMember(CONTRACTOR_RATE_TYPES, body.rateType) ? body.rateType : undefined,
        rateAmount: typeof body.rateAmount === 'number' ? body.rateAmount : undefined,
        paymentCadence: isMember(CONTRACTOR_PAYMENT_CADENCES, body.paymentCadence)
          ? body.paymentCadence
          : undefined,
        paymentCurrency: typeof body.paymentCurrency === 'string' ? body.paymentCurrency : undefined,
        fxPolicyCode: typeof body.fxPolicyCode === 'string' ? body.fxPolicyCode : undefined,
        providerContractId:
          typeof body.providerContractId === 'string' ? body.providerContractId : undefined,
        providerWorkerId:
          typeof body.providerWorkerId === 'string' ? body.providerWorkerId : undefined,
        requiresInvoice:
          typeof body.requiresInvoice === 'boolean' ? body.requiresInvoice : undefined,
        requiresWorkApproval:
          typeof body.requiresWorkApproval === 'boolean' ? body.requiresWorkApproval : undefined,
        bonusPolicy: isMember(CONTRACTOR_BONUS_POLICIES, body.bonusPolicy)
          ? body.bonusPolicy
          : undefined,
        endDate: typeof body.endDate === 'string' ? body.endDate : undefined,
        metadataPatch:
          body.metadataPatch && typeof body.metadataPatch === 'object'
            ? (body.metadataPatch as Record<string, unknown>)
            : undefined,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ engagement })
    }

    throw new ContractorEngagementValidationError(
      `Acción no soportada: ${String(action)}.`,
      'unsupported_action'
    )
  } catch (error) {
    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'contractor_engagements_api', stage: 'patch' }
      })
    }

    return toContractorEngagementErrorResponse(error)
  }
}
