import { NextResponse } from 'next/server'

import { previewPricingCatalogImpact } from '@/lib/commercial/pricing-catalog-impact-analysis'
import { query } from '@/lib/db'
import {
  resolveFinanceQuoteTenantOrganizationIds,
  resolveFinanceQuoteTenantSpaceIds
} from '@/lib/finance/quotation-canonical-store'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface AddonSelectorRow extends Record<string, unknown> {
  addon_id: string
  addon_sku: string
  addon_name: string
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden — requires efeonce_admin or finance_admin' }, { status: 403 })
  }

  const { id } = await params

  const rows = await query<AddonSelectorRow>(
    `SELECT addon_id, addon_sku, addon_name
       FROM greenhouse_commercial.overhead_addons
       WHERE addon_id = $1
       LIMIT 1`,
    [id]
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Overhead addon not found.' }, { status: 404 })
  }

  let body: { changeset?: unknown; asOfDate?: unknown; sampleLimit?: unknown } = {}

  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }

  const [spaceIds, organizationIds] = await Promise.all([
    resolveFinanceQuoteTenantSpaceIds(tenant),
    resolveFinanceQuoteTenantOrganizationIds(tenant)
  ])

  const addon = rows[0]

  const result = await previewPricingCatalogImpact({
    spaceIds,
    organizationIds,
    entityType: 'overhead_addon',
    entityId: addon.addon_id,
    entitySku: addon.addon_sku,
    entityCode: addon.addon_name,
    asOfDate: typeof body.asOfDate === 'string' ? body.asOfDate : null,
    sampleLimit: typeof body.sampleLimit === 'number' ? body.sampleLimit : null
  })

  return NextResponse.json(result)
}
