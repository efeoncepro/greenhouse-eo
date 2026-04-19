import { NextResponse } from 'next/server'

import { previewPricingCatalogImpact } from '@/lib/commercial/pricing-catalog-impact-analysis'
import { query } from '@/lib/db'
import { resolveFinanceQuoteTenantSpaceIds } from '@/lib/finance/quotation-canonical-store'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RoleSelectorRow extends Record<string, unknown> {
  role_id: string
  role_code: string
  role_sku: string
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

  const rows = await query<RoleSelectorRow>(
    `SELECT role_id, role_code, role_sku
       FROM greenhouse_commercial.sellable_roles
       WHERE role_id = $1
       LIMIT 1`,
    [id]
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  let body: { changeset?: unknown; asOfDate?: unknown; sampleLimit?: unknown } = {}

  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }

  const spaceIds = await resolveFinanceQuoteTenantSpaceIds(tenant)
  const role = rows[0]

  const result = await previewPricingCatalogImpact({
    spaceIds,
    entityType: 'sellable_role',
    entityId: role.role_id,
    entityCode: role.role_code,
    entitySku: role.role_sku,
    asOfDate: typeof body.asOfDate === 'string' ? body.asOfDate : null,
    sampleLimit: typeof body.sampleLimit === 'number' ? body.sampleLimit : null
  })

  return NextResponse.json(result)
}
