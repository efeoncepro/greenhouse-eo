import { NextResponse } from 'next/server'

import { requireHrTenantContext } from '@/lib/tenant/authorization'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  CONTRACTOR_ENGAGEMENT_PAYROLL_VIA,
  CONTRACTOR_ENGAGEMENT_STATUSES,
  CONTRACTOR_ENGAGEMENT_SUBTYPES,
  CONTRACTOR_PAYMENT_CADENCES,
  CONTRACTOR_PAYMENT_MODELS,
  CONTRACTOR_RATE_TYPES,
  CONTRACTOR_BONUS_POLICIES,
  CONTRACTOR_CLASSIFICATION_RISK_STATUSES,
  CONTRACTOR_TAX_COMPLIANCE_OWNERS,
  ContractorEngagementValidationError
} from '@/lib/contractor-engagements'
import {
  createContractorEngagement,
  listContractorEngagements,
  listContractorEngagementsByProfile
} from '@/lib/contractor-engagements/store'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'

export const dynamic = 'force-dynamic'

const isMember = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ContractorEngagementValidationError(
      `El campo ${field} es obligatorio.`,
      'missing_required_field'
    )
  }

  return value.trim()
}

const requireEnum = <T extends string>(
  values: readonly T[],
  value: unknown,
  field: string
): T => {
  if (!isMember(values, value)) {
    throw new ContractorEngagementValidationError(
      `El campo ${field} tiene un valor no permitido.`,
      'invalid_enum_value'
    )
  }

  return value
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_engagement', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')

    if (profileId) {
      const items = await listContractorEngagementsByProfile(profileId)

      return NextResponse.json({ items })
    }

    const statusParam = searchParams.get('status')
    const riskParam = searchParams.get('classificationRiskStatus')
    const limit = Number(searchParams.get('limit') ?? '50')
    const offset = Number(searchParams.get('offset') ?? '0')

    const items = await listContractorEngagements({
      status: isMember(CONTRACTOR_ENGAGEMENT_STATUSES, statusParam) ? statusParam : undefined,
      classificationRiskStatus: isMember(CONTRACTOR_CLASSIFICATION_RISK_STATUSES, riskParam)
        ? riskParam
        : undefined,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0
    })

    return NextResponse.json({ items })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'contractor_engagements_api', stage: 'list' }
    })

    return toContractorEngagementErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_engagement', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      throw new ContractorEngagementValidationError(
        'El cuerpo de la solicitud es inválido.',
        'invalid_body'
      )
    }

    const engagement = await createContractorEngagement({
      profileId: requireString(body.profileId, 'profileId'),
      memberId: typeof body.memberId === 'string' ? body.memberId : null,
      personLegalEntityRelationshipId: requireString(
        body.personLegalEntityRelationshipId,
        'personLegalEntityRelationshipId'
      ),
      legalEntityOrganizationId: requireString(
        body.legalEntityOrganizationId,
        'legalEntityOrganizationId'
      ),
      countryCode: requireString(body.countryCode, 'countryCode'),
      taxResidencyCountryCode:
        typeof body.taxResidencyCountryCode === 'string' ? body.taxResidencyCountryCode : null,
      relationshipSubtype: requireEnum(
        CONTRACTOR_ENGAGEMENT_SUBTYPES,
        body.relationshipSubtype,
        'relationshipSubtype'
      ),
      payrollVia: requireEnum(CONTRACTOR_ENGAGEMENT_PAYROLL_VIA, body.payrollVia, 'payrollVia'),
      currency: requireString(body.currency, 'currency'),
      paymentCurrency: typeof body.paymentCurrency === 'string' ? body.paymentCurrency : null,
      fxPolicyCode: typeof body.fxPolicyCode === 'string' ? body.fxPolicyCode : null,
      providerContractId:
        typeof body.providerContractId === 'string' ? body.providerContractId : null,
      providerWorkerId: typeof body.providerWorkerId === 'string' ? body.providerWorkerId : null,
      paymentModel: requireEnum(CONTRACTOR_PAYMENT_MODELS, body.paymentModel, 'paymentModel'),
      rateType: requireEnum(CONTRACTOR_RATE_TYPES, body.rateType, 'rateType'),
      rateAmount: typeof body.rateAmount === 'number' ? body.rateAmount : null,
      paymentCadence: requireEnum(
        CONTRACTOR_PAYMENT_CADENCES,
        body.paymentCadence,
        'paymentCadence'
      ),
      requiresInvoice: typeof body.requiresInvoice === 'boolean' ? body.requiresInvoice : undefined,
      requiresWorkApproval:
        typeof body.requiresWorkApproval === 'boolean' ? body.requiresWorkApproval : undefined,
      taxComplianceOwner: isMember(CONTRACTOR_TAX_COMPLIANCE_OWNERS, body.taxComplianceOwner)
        ? body.taxComplianceOwner
        : undefined,
      bonusPolicy: isMember(CONTRACTOR_BONUS_POLICIES, body.bonusPolicy)
        ? body.bonusPolicy
        : undefined,
      classificationRiskFactors:
        body.classificationRiskFactors && typeof body.classificationRiskFactors === 'object'
          ? (body.classificationRiskFactors as Record<string, boolean>)
          : undefined,
      startDate: requireString(body.startDate, 'startDate'),
      endDate: typeof body.endDate === 'string' ? body.endDate : null,
      metadata:
        body.metadata && typeof body.metadata === 'object'
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      // TASK-985 — onboarding deja el engagement activo si la clasificación no es
      // bloqueante; queda retenido (`draft`) solo ante riesgo bloqueante.
      activateWhenClassificationNotBlocking: true,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ engagement }, { status: 201 })
  } catch (error) {
    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'contractor_engagements_api', stage: 'create' }
      })
    }

    return toContractorEngagementErrorResponse(error)
  }
}
