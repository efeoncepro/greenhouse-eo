import { NextResponse } from 'next/server'

import {
  previewPricingCatalogImpact,
  type PricingCatalogImpactEntityType
} from '@/lib/commercial/pricing-catalog-impact-analysis'
import {
  resolveFinanceQuoteTenantOrganizationIds,
  resolveFinanceQuoteTenantSpaceIds
} from '@/lib/finance/quotation-canonical-store'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type GovernanceImpactType =
  | 'role_tier_margin'
  | 'commercial_model_multiplier'
  | 'country_pricing_factor'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden — requires efeonce_admin or finance_admin' }, { status: 403 })
  }

  let body: {
    type?: unknown
    id?: unknown
    code?: unknown
    sku?: unknown
    changeset?: unknown
    asOfDate?: unknown
    sampleLimit?: unknown
  }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const type = typeof body.type === 'string' ? body.type : ''
  const entityType = type as GovernanceImpactType

  if (!['role_tier_margin', 'commercial_model_multiplier', 'country_pricing_factor'].includes(entityType)) {
    return NextResponse.json(
      { error: 'type must be one of: role_tier_margin, commercial_model_multiplier, country_pricing_factor' },
      { status: 400 }
    )
  }

  const selector =
    (typeof body.code === 'string' && body.code.trim()) ||
    (typeof body.sku === 'string' && body.sku.trim()) ||
    (typeof body.id === 'string' && body.id.trim()) ||
    ''

  if (!selector) {
    return NextResponse.json({ error: 'id, code, or sku is required.' }, { status: 400 })
  }

  const [spaceIds, organizationIds] = await Promise.all([
    resolveFinanceQuoteTenantSpaceIds(tenant),
    resolveFinanceQuoteTenantOrganizationIds(tenant)
  ])

  const result = await previewPricingCatalogImpact({
    spaceIds,
    organizationIds,
    entityType: entityType as PricingCatalogImpactEntityType,
    entityId: selector,
    entityCode: selector,
    entitySku: selector,
    asOfDate: typeof body.asOfDate === 'string' ? body.asOfDate : null,
    sampleLimit: typeof body.sampleLimit === 'number' ? body.sampleLimit : null
  })

  return NextResponse.json(result)
}
