import { NextResponse } from 'next/server'

import {
  listPricingCatalogAudit,
  type PricingCatalogEntityType
} from '@/lib/commercial/pricing-catalog-audit-store'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ENTITY_TYPES: readonly PricingCatalogEntityType[] = [
  'sellable_role',
  'tool_catalog',
  'overhead_addon',
  'role_tier_margin',
  'service_tier_margin',
  'commercial_model_multiplier',
  'country_pricing_factor',
  'fte_hours_guide',
  'employment_type'
]

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Forbidden — requires efeonce_admin or finance_admin' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const entityTypeParam = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  const actorUserId = searchParams.get('actorUserId')
  const limitParam = searchParams.get('limit')

  let entityType: PricingCatalogEntityType | undefined

  if (entityTypeParam) {
    if (!ENTITY_TYPES.includes(entityTypeParam as PricingCatalogEntityType)) {
      return NextResponse.json(
        { error: `entityType must be one of: ${ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    entityType = entityTypeParam as PricingCatalogEntityType
  }

  let limit: number | undefined

  if (limitParam) {
    const parsed = Number(limitParam)

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'limit must be a positive number.' }, { status: 400 })
    }

    limit = parsed
  }

  const items = await listPricingCatalogAudit({
    entityType,
    entityId: entityId ?? undefined,
    actorUserId: actorUserId ?? undefined,
    limit
  })

  return NextResponse.json({ items })
}
