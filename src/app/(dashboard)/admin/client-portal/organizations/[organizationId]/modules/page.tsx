import { redirect } from 'next/navigation'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { query } from '@/lib/db'
import OrganizationModulesView from '@/views/greenhouse/admin/client-portal/OrganizationModulesView'

/**
 * TASK-826 Slice 7 — /admin/client-portal/organizations/[organizationId]/modules
 *
 * Server page que renderiza listing de assignments + acciones admin per row
 * (enable/pause/resume/expire/churn).
 *
 * Capability gating canónico:
 *   - `client_portal.module.read_assignment` (read, tenant) para acceder al listing
 *   - Las mutations adicionales son gated server-side en los endpoints
 *     (`POST/PATCH/DELETE /api/admin/client-portal/...`).
 */

export const dynamic = 'force-dynamic'

type AssignmentRow = {
  assignment_id: string
  organization_id: string
  module_key: string
  status: string
  source: string
  effective_from: string | Date
  effective_to: string | Date | null
  expires_at: string | Date | null
  approved_by_user_id: string | null
  approved_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
  module_display_label: string | null
  module_applicability_scope: string | null
  module_tier: string | null
} & Record<string, unknown>

type CatalogRow = {
  module_key: string
  display_label: string
  applicability_scope: string
  tier: string
} & Record<string, unknown>

type OrgRow = {
  organization_id: string
  legal_name: string | null
  display_name: string | null
} & Record<string, unknown>

const toIso = (value: string | Date | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const Page = async ({ params }: { params: Promise<{ organizationId: string }> }) => {
  await requireServerSession()
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'client_portal.module.read_assignment', 'read', 'tenant')) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const { organizationId } = await params

  const [orgRow, assignmentRows, catalogRows] = await Promise.all([
    query<OrgRow>(`
      SELECT organization_id, legal_name, display_name
      FROM greenhouse_core.organizations
      WHERE organization_id = $1
    `, [organizationId])
      .then(rows => rows[0] ?? null)
      .catch(() => null),

    query<AssignmentRow>(`
      SELECT
        a.assignment_id,
        a.organization_id,
        a.module_key,
        a.status,
        a.source,
        a.effective_from,
        a.effective_to,
        a.expires_at,
        a.approved_by_user_id,
        a.approved_at,
        a.created_at,
        a.updated_at,
        m.display_label    AS module_display_label,
        m.applicability_scope AS module_applicability_scope,
        m.tier             AS module_tier
      FROM greenhouse_client_portal.module_assignments a
      LEFT JOIN greenhouse_client_portal.modules m ON m.module_key = a.module_key
      WHERE a.organization_id = $1
      ORDER BY a.created_at DESC
    `, [organizationId])
      .catch(() => [] as AssignmentRow[]),

    query<CatalogRow>(`
      SELECT module_key, display_label, applicability_scope, tier
      FROM greenhouse_client_portal.modules
      WHERE effective_to IS NULL
      ORDER BY applicability_scope, tier, module_key
    `).catch(() => [] as CatalogRow[])
  ])

  const orgName = orgRow?.display_name ?? orgRow?.legal_name ?? organizationId

  const assignments = assignmentRows.map(row => ({
    assignmentId: row.assignment_id,
    organizationId: row.organization_id,
    moduleKey: row.module_key,
    moduleDisplayLabel: row.module_display_label,
    moduleApplicabilityScope: row.module_applicability_scope,
    moduleTier: row.module_tier,
    status: row.status,
    source: row.source,
    effectiveFrom: toIso(row.effective_from),
    effectiveTo: toIso(row.effective_to),
    expiresAt: toIso(row.expires_at),
    approvedByUserId: row.approved_by_user_id,
    approvedAt: toIso(row.approved_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  }))

  const catalog = catalogRows.map(row => ({
    moduleKey: row.module_key,
    displayLabel: row.display_label,
    applicabilityScope: row.applicability_scope,
    tier: row.tier
  }))

  return (
    <OrganizationModulesView
      organizationId={organizationId}
      organizationName={orgName}
      initialAssignments={assignments}
      catalog={catalog}
    />
  )
}

export default Page
