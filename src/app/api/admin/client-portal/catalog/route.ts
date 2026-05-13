import 'server-only'

import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type ModuleCatalogRow = {
  module_key: string
  display_label: string
  display_label_client: string
  description: string | null
  applicability_scope: string
  tier: string
  view_codes: string[]
  capabilities: string[]
  data_sources: string[]
  pricing_kind: string
  effective_from: string | Date
  effective_to: string | Date | null
  created_at: string | Date
} & Record<string, unknown>

const toIsoString = (value: string | Date | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

/**
 * GET /api/admin/client-portal/catalog
 *
 * V1.0 read-only listing del catálogo `greenhouse_client_portal.modules` activo.
 * Operator-facing surface para visualizar los 10 módulos canónicos sin permitir
 * mutación (POST/PUT bloqueado en V1.0, V1.1 con feature flag dedicada).
 *
 * Capability: `client_portal.catalog.manage` (scope='all', EFEONCE_ADMIN).
 */
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'client_portal.catalog.manage', 'read', 'all')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rows = await query<ModuleCatalogRow>(`
      SELECT
        module_key,
        display_label,
        display_label_client,
        description,
        applicability_scope,
        tier,
        view_codes,
        capabilities,
        data_sources,
        pricing_kind,
        effective_from,
        effective_to,
        created_at
      FROM greenhouse_client_portal.modules
      WHERE effective_to IS NULL
      ORDER BY applicability_scope, tier, module_key
    `)

    const items = rows.map(row => ({
      moduleKey: row.module_key,
      displayLabel: row.display_label,
      displayLabelClient: row.display_label_client,
      description: row.description,
      applicabilityScope: row.applicability_scope,
      tier: row.tier,
      viewCodes: row.view_codes ?? [],
      capabilities: row.capabilities ?? [],
      dataSources: row.data_sources ?? [],
      pricingKind: row.pricing_kind,
      effectiveFrom: toIsoString(row.effective_from),
      effectiveTo: toIsoString(row.effective_to),
      createdAt: toIsoString(row.created_at)
    }))

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'client_portal', {
      tags: { source: 'api_admin_catalog_list', stage: 'select_modules' }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
