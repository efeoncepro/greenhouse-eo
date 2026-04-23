import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { getDealCreationContext } from '@/lib/commercial/deals-store'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { resolveFinanceQuoteTenantOrganizationIds } from '@/lib/finance/quotation-canonical-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// TASK-571: GET /api/commercial/organizations/:id/deal-creation-context
//
// Returns the pipelines + stages + defaults that govern deal creation for a
// given organization from the Quote Builder. The payload is backed by the
// local registry (`greenhouse_commercial.hubspot_deal_pipeline_config` +
// `hubspot_deal_pipeline_defaults`) so the drawer never has to query HubSpot
// live.
export async function GET(
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

  const subject = buildTenantEntitlementSubject(tenant)

  if (!hasEntitlement(subject, 'commercial.deal.create', 'create')) {
    return NextResponse.json(
      { error: 'Missing capability commercial.deal.create' },
      { status: 403 }
    )
  }

  const visibleOrgIds = await resolveFinanceQuoteTenantOrganizationIds(tenant)

  if (!visibleOrgIds.includes(normalizedOrganizationId)) {
    return NextResponse.json({ error: 'Organization not visible to this tenant.' }, { status: 403 })
  }

  const orgRows = await query<{
    organization_id: string
    hubspot_company_id: string | null
    organization_name: string | null
  }>(
    `SELECT organization_id, hubspot_company_id, organization_name
       FROM greenhouse_core.organizations
      WHERE organization_id = $1
      LIMIT 1`,
    [normalizedOrganizationId]
  )

  if (orgRows.length === 0) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
  }

  const tenantScope = `${tenant.tenantType}:${tenant.clientId || 'system'}`
  const { searchParams } = new URL(request.url)
  const requestedBusinessLineCode = searchParams.get('businessLineCode')?.trim() || null
  const businessLineCode = requestedBusinessLineCode || tenant.businessLines[0] || null

  const context = await getDealCreationContext({ tenantScope, businessLineCode })
  const organizationHasHubSpotCompany = Boolean(orgRows[0].hubspot_company_id)

  const blockingIssues = organizationHasHubSpotCompany
    ? context.blockingIssues
    : [...context.blockingIssues, 'organization_missing_hubspot_company']

  return NextResponse.json({
    organizationId: orgRows[0].organization_id,
    organizationName: orgRows[0].organization_name ?? null,
    hubspotCompanyId: orgRows[0].hubspot_company_id,
    ...context,
    readyToCreate: context.readyToCreate && organizationHasHubSpotCompany,
    blockingIssues
  })
}
