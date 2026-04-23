import { NextResponse } from 'next/server'

import { listCommercialDealsForOrganization } from '@/lib/commercial/deals-store'
import {
  buildTenantEntitlementSubject,
  createDealFromQuoteContext,
  DealCreateContextEmptyError,
  DealCreateError,
  DealCreateGovernanceIncompleteError,
  DealCreateInsufficientPermissionsError,
  DealCreateMappingMissingError,
  DealCreateRateLimitError,
  DealCreateSelectionInvalidError,
  DealCreateValidationError,
  OrganizationHasNoCompanyError
} from '@/lib/commercial/party'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { resolveFinanceQuoteTenantOrganizationIds } from '@/lib/finance/quotation-canonical-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: organizationId } = await params
  const normalizedOrganizationId = organizationId?.trim()

  if (!normalizedOrganizationId) {
    return NextResponse.json({ error: 'organization id is required' }, { status: 400 })
  }

  const visibleOrgIds = await resolveFinanceQuoteTenantOrganizationIds(tenant)

  if (!visibleOrgIds.includes(normalizedOrganizationId)) {
    return NextResponse.json({ error: 'Organization not visible to this tenant.' }, { status: 403 })
  }

  const items = await listCommercialDealsForOrganization(normalizedOrganizationId)

  return NextResponse.json({ items, total: items.length })
}

// TASK-539: inline deal creation from the Quote Builder.
// POST /api/commercial/organizations/:id/deals
//
// Auth: `requireFinanceTenantContext` + capability `commercial.deal.create`.
// Tenant isolation: organization must be in the caller's visible set
// (`resolveFinanceQuoteTenantOrganizationIds`).
// Rate limit + idempotency are enforced by the command itself via
// `greenhouse_commercial.deal_create_attempts`.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: organizationId } = await params
  const normalizedOrganizationId = organizationId?.trim()

  if (!normalizedOrganizationId) {
    return NextResponse.json({ error: 'organization id is required' }, { status: 400 })
  }

  // Capability gate.
  const subject = buildTenantEntitlementSubject(tenant)
  const canCreateDeal = hasEntitlement(subject, 'commercial.deal.create', 'create')

  if (!canCreateDeal) {
    return NextResponse.json(
      { error: 'Missing capability commercial.deal.create' },
      { status: 403 }
    )
  }

  // Tenant isolation.
  const visibleOrgIds = await resolveFinanceQuoteTenantOrganizationIds(tenant)

  if (!visibleOrgIds.includes(normalizedOrganizationId)) {
    return NextResponse.json({ error: 'Organization not visible to this tenant.' }, { status: 403 })
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 })
  }

  const dealName = typeof body.dealName === 'string' ? body.dealName.trim() : ''

  if (!dealName) {
    return NextResponse.json({ error: 'dealName is required' }, { status: 400 })
  }

  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  const tenantScope = `${tenant.tenantType}:${tenant.clientId || 'system'}`

  try {
    const result = await createDealFromQuoteContext({
      organizationId: normalizedOrganizationId,
      dealName,
      amount: toNumber(body.amount),
      amountClp: toNumber(body.amountClp),
      currency: typeof body.currency === 'string' ? body.currency : null,
      pipelineId: typeof body.pipelineId === 'string' ? body.pipelineId : null,
      stageId: typeof body.stageId === 'string' ? body.stageId : null,
      dealType: typeof body.dealType === 'string' ? body.dealType : null,
      priority: typeof body.priority === 'string' ? body.priority : null,
      ownerHubspotUserId:
        typeof body.ownerHubspotUserId === 'string' ? body.ownerHubspotUserId : null,
      contactIdentityProfileId:
        typeof body.contactIdentityProfileId === 'string'
          ? body.contactIdentityProfileId
          : null,
      closeDateHint:
        typeof body.closeDateHint === 'string' ? body.closeDateHint : null,
      businessLineCode:
        typeof body.businessLineCode === 'string' ? body.businessLineCode : null,
      quotationId: typeof body.quotationId === 'string' ? body.quotationId : null,
      idempotencyKey:
        typeof body.idempotencyKey === 'string' ? body.idempotencyKey : null,
      actor: {
        userId: tenant.userId,
        tenantScope,
        businessLineCode: tenant.businessLines[0] ?? null,
        memberId: tenant.memberId ?? null,
        identityProfileId: tenant.identityProfileId ?? null
      }
    })

    const httpStatus = result.status === 'completed' ? 201 : 202

    return NextResponse.json(result, { status: httpStatus })
  } catch (error) {
    if (error instanceof DealCreateRateLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryAfterSeconds: error.retryAfterSeconds
        },
        {
          status: error.statusCode,
          headers: { 'Retry-After': String(error.retryAfterSeconds) }
        }
      )
    }

    if (
      error instanceof DealCreateValidationError ||
      error instanceof OrganizationHasNoCompanyError ||
      error instanceof DealCreateInsufficientPermissionsError ||
      error instanceof DealCreateSelectionInvalidError ||
      error instanceof DealCreateContextEmptyError ||
      error instanceof DealCreateGovernanceIncompleteError ||
      error instanceof DealCreateMappingMissingError
    ) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details ?? null },
        { status: error.statusCode }
      )
    }

    if (error instanceof DealCreateError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error('[api/commercial/organizations/deals] unexpected error', error)

    return NextResponse.json(
      { error: 'Failed to create deal', code: 'DEAL_CREATE_UNEXPECTED' },
      { status: 500 }
    )
  }
}
