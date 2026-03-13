import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { buildTenantPublicId } from '@/lib/ids/greenhouse-ids'

export interface AdminTenantRow {
  clientId: string
  publicId: string
  clientName: string
  logoUrl: string | null
  status: string
  active: boolean
  primaryContactEmail: string | null
  hubspotCompanyId: string | null
  authMode: string
  portalHomePath: string
  timezone: string | null
  notionProjectCount: number
  scopedProjects: number
  activeUsers: number
  invitedUsers: number
  featureFlagCount: number
  businessLines: string[]
  serviceModules: string[]
  updatedAt: string | null
  lastLoginAt: string | null
}

export interface AdminTenantsOverview {
  totals: {
    totalTenants: number
    activeTenants: number
    tenantsWithCredentials: number
    tenantsPendingReset: number
    tenantsWithScopedProjects: number
  }
  tenants: AdminTenantRow[]
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const toIsoString = (value: unknown) => {
  if (!value) return null
  if (typeof value === 'string') return value

  if (typeof value === 'object' && value !== null && 'value' in (value as Record<string, unknown>)) {
    const rawValue = (value as { value?: unknown }).value

    return typeof rawValue === 'string' ? rawValue : null
  }

  return null
}

export const getAdminTenantsOverview = async (): Promise<AdminTenantsOverview> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [tenantRows, totalsRows] = await Promise.all([
    bigQuery.query({
      query: `
        SELECT
          c.client_id,
          c.client_name,
          JSON_VALUE(TO_JSON_STRING(c), '$.logo_url') AS logo_url,
          c.status,
          c.active,
          c.primary_contact_email,
          c.hubspot_company_id,
          c.auth_mode,
          c.portal_home_path,
          c.timezone,
          c.updated_at,
          c.last_login_at,
          ARRAY_LENGTH(COALESCE(c.notion_project_ids, [])) AS notion_project_count,
          COUNT(DISTINCT IF(cu.active = TRUE, cu.user_id, NULL)) AS active_users,
          COUNT(DISTINCT IF(cu.status = 'invited', cu.user_id, NULL)) AS invited_users,
          COUNT(DISTINCT IF(ups.active = TRUE, ups.project_id, NULL)) AS scoped_projects,
          COUNT(DISTINCT IF(cff.active = TRUE AND cff.status IN ('enabled', 'staged'), cff.feature_code, NULL)) AS feature_flag_count,
          ARRAY_AGG(DISTINCT IF(sm.module_kind = 'business_line', csm.module_code, NULL) IGNORE NULLS ORDER BY IF(sm.module_kind = 'business_line', csm.module_code, NULL)) AS business_lines,
          ARRAY_AGG(DISTINCT IF(sm.module_kind = 'service_module', csm.module_code, NULL) IGNORE NULLS ORDER BY IF(sm.module_kind = 'service_module', csm.module_code, NULL)) AS service_modules
        FROM \`${projectId}.greenhouse.clients\` AS c
        LEFT JOIN \`${projectId}.greenhouse.client_users\` AS cu
          ON cu.client_id = c.client_id
        LEFT JOIN \`${projectId}.greenhouse.user_project_scopes\` AS ups
          ON ups.user_id = cu.user_id
         AND ups.active = TRUE
        LEFT JOIN \`${projectId}.greenhouse.client_service_modules\` AS csm
          ON csm.client_id = c.client_id
         AND csm.active = TRUE
        LEFT JOIN \`${projectId}.greenhouse.service_modules\` AS sm
          ON sm.module_code = csm.module_code
         AND sm.active = TRUE
        LEFT JOIN \`${projectId}.greenhouse.client_feature_flags\` AS cff
          ON cff.client_id = c.client_id
        GROUP BY
          c.client_id,
          c.client_name,
          logo_url,
          c.status,
          c.active,
          c.primary_contact_email,
          c.hubspot_company_id,
          c.auth_mode,
          c.portal_home_path,
          c.timezone,
          c.updated_at,
          c.last_login_at,
          notion_project_count
        ORDER BY c.active DESC, c.client_name ASC
      `
    }),
    bigQuery.query({
      query: `
        WITH tenant_summary AS (
          SELECT
            c.client_id,
            c.active,
            c.auth_mode,
            COUNT(DISTINCT IF(ups.active = TRUE, ups.project_id, NULL)) AS scoped_projects
          FROM \`${projectId}.greenhouse.clients\` AS c
          LEFT JOIN \`${projectId}.greenhouse.client_users\` AS cu
            ON cu.client_id = c.client_id
          LEFT JOIN \`${projectId}.greenhouse.user_project_scopes\` AS ups
            ON ups.user_id = cu.user_id
           AND ups.active = TRUE
          GROUP BY c.client_id, c.active, c.auth_mode
        )
        SELECT
          COUNT(*) AS total_tenants,
          COUNTIF(active = TRUE) AS active_tenants,
          COUNTIF(auth_mode = 'credentials') AS tenants_with_credentials,
          COUNTIF(auth_mode = 'password_reset_pending') AS tenants_pending_reset,
          COUNTIF(scoped_projects > 0) AS tenants_with_scoped_projects
        FROM tenant_summary
      `
    })
  ])

  const totalsRow = (totalsRows[0] as Array<Record<string, unknown>>)[0] ?? {}

  return {
    totals: {
      totalTenants: toNumber(totalsRow.total_tenants),
      activeTenants: toNumber(totalsRow.active_tenants),
      tenantsWithCredentials: toNumber(totalsRow.tenants_with_credentials),
      tenantsPendingReset: toNumber(totalsRow.tenants_pending_reset),
      tenantsWithScopedProjects: toNumber(totalsRow.tenants_with_scoped_projects)
    },
    tenants: (tenantRows[0] as Array<Record<string, unknown>>).map(row => ({
      clientId: String(row.client_id || ''),
      publicId: buildTenantPublicId({
        clientId: String(row.client_id || ''),
        hubspotCompanyId: row.hubspot_company_id ? String(row.hubspot_company_id) : null
      }),
      clientName: String(row.client_name || ''),
      logoUrl: row.logo_url ? String(row.logo_url) : null,
      status: String(row.status || ''),
      active: Boolean(row.active),
      primaryContactEmail: row.primary_contact_email ? String(row.primary_contact_email) : null,
      hubspotCompanyId: row.hubspot_company_id ? String(row.hubspot_company_id) : null,
      authMode: String(row.auth_mode || ''),
      portalHomePath: String(row.portal_home_path || ''),
      timezone: row.timezone ? String(row.timezone) : null,
      notionProjectCount: toNumber(row.notion_project_count),
      scopedProjects: toNumber(row.scoped_projects),
      activeUsers: toNumber(row.active_users),
      invitedUsers: toNumber(row.invited_users),
      featureFlagCount: toNumber(row.feature_flag_count),
      businessLines: normalizeStringArray(row.business_lines),
      serviceModules: normalizeStringArray(row.service_modules),
      updatedAt: toIsoString(row.updated_at),
      lastLoginAt: toIsoString(row.last_login_at)
    }))
  }
}
