import { redirect } from 'next/navigation'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { query } from '@/lib/db'
import ClientPortalCatalogView from '@/views/greenhouse/admin/client-portal/ClientPortalCatalogView'

/**
 * TASK-826 Slice 7 — /admin/client-portal/catalog server page.
 *
 * V1.0 read-only listing del catálogo `greenhouse_client_portal.modules`. NO
 * permite POST/PUT (V1.1 con feature flag dedicada). EFEONCE_ADMIN-only via
 * `client_portal.catalog.manage` (scope=all).
 */

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

const toIso = (value: string | Date | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const Page = async () => {
  await requireServerSession()
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'client_portal.catalog.manage', 'read', 'all')) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

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
  `).catch(() => [] as ModuleCatalogRow[])

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
    effectiveFrom: toIso(row.effective_from),
    effectiveTo: toIso(row.effective_to),
    createdAt: toIso(row.created_at)
  }))

  return <ClientPortalCatalogView items={items} />
}

export default Page
