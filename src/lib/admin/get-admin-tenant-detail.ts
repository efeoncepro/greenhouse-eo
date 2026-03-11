import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { getTenantCapabilityState } from '@/lib/admin/tenant-capabilities'
import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'

export interface AdminTenantUserRow {
  userId: string
  fullName: string
  email: string
  status: string
  active: boolean
  authMode: string
  roleCodes: string[]
  routeGroups: string[]
  projectScopeCount: number
  lastLoginAt: string | null
}

export interface AdminTenantProjectRow {
  projectId: string
  projectName: string
  pageUrl: string | null
  assignedUsers: number
}

export interface AdminTenantFeatureFlagRow {
  featureCode: string
  status: string
  active: boolean
  rolloutNotes: string | null
}

export interface AdminTenantDetail {
  clientId: string
  clientName: string
  status: string
  active: boolean
  primaryContactEmail: string | null
  hubspotCompanyId: string | null
  authMode: string
  portalHomePath: string
  timezone: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
  lastLoginAt: string | null
  notionProjectCount: number
  scopedProjects: number
  activeUsers: number
  invitedUsers: number
  businessLines: string[]
  serviceModules: string[]
  capabilities: TenantCapabilityRecord[]
  featureFlags: AdminTenantFeatureFlagRow[]
  users: AdminTenantUserRow[]
  projects: AdminTenantProjectRow[]
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

export const getAdminTenantDetail = async (clientId: string): Promise<AdminTenantDetail | null> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [tenantRows, userRows, projectRows, featureFlagRows, capabilityState] = await Promise.all([
    bigQuery.query({
      query: `
        SELECT
          c.client_id,
          c.client_name,
          c.status,
          c.active,
          c.primary_contact_email,
          c.hubspot_company_id,
          c.auth_mode,
          c.portal_home_path,
          c.timezone,
          c.notes,
          c.created_at,
          c.updated_at,
          c.last_login_at,
          ARRAY_LENGTH(COALESCE(c.notion_project_ids, [])) AS notion_project_count,
          COUNT(DISTINCT IF(cu.active = TRUE, cu.user_id, NULL)) AS active_users,
          COUNT(DISTINCT IF(cu.status = 'invited', cu.user_id, NULL)) AS invited_users,
          COUNT(DISTINCT IF(ups.active = TRUE, ups.project_id, NULL)) AS scoped_projects,
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
        WHERE c.client_id = @clientId
        GROUP BY
          c.client_id,
          c.client_name,
          c.status,
          c.active,
          c.primary_contact_email,
          c.hubspot_company_id,
          c.auth_mode,
          c.portal_home_path,
          c.timezone,
          c.notes,
          c.created_at,
          c.updated_at,
          c.last_login_at,
          notion_project_count
        LIMIT 1
      `,
      params: { clientId }
    }),
    bigQuery.query({
      query: `
        SELECT
          cu.user_id,
          cu.full_name,
          cu.email,
          cu.status,
          cu.active,
          cu.auth_mode,
          cu.last_login_at,
          ARRAY_AGG(DISTINCT ura.role_code IGNORE NULLS ORDER BY ura.role_code) AS role_codes,
          ARRAY_AGG(DISTINCT route_group IGNORE NULLS ORDER BY route_group) AS route_groups,
          COUNT(DISTINCT IF(ups.active = TRUE, ups.project_id, NULL)) AS project_scope_count
        FROM \`${projectId}.greenhouse.client_users\` AS cu
        LEFT JOIN \`${projectId}.greenhouse.user_role_assignments\` AS ura
          ON ura.user_id = cu.user_id
         AND ura.active = TRUE
        LEFT JOIN \`${projectId}.greenhouse.roles\` AS roles
          ON roles.role_code = ura.role_code
        LEFT JOIN UNNEST(COALESCE(roles.route_group_scope, [])) AS route_group
        LEFT JOIN \`${projectId}.greenhouse.user_project_scopes\` AS ups
          ON ups.user_id = cu.user_id
         AND ups.active = TRUE
        WHERE cu.client_id = @clientId
        GROUP BY
          cu.user_id,
          cu.full_name,
          cu.email,
          cu.status,
          cu.active,
          cu.auth_mode,
          cu.last_login_at
        ORDER BY cu.active DESC, cu.full_name ASC
      `,
      params: { clientId }
    }),
    bigQuery.query({
      query: `
        WITH tenant_project_ids AS (
          SELECT project_id
          FROM \`${projectId}.greenhouse.clients\` AS c,
          UNNEST(COALESCE(c.notion_project_ids, [])) AS project_id
          WHERE c.client_id = @clientId

          UNION DISTINCT

          SELECT ups.project_id
          FROM \`${projectId}.greenhouse.user_project_scopes\` AS ups
          INNER JOIN \`${projectId}.greenhouse.client_users\` AS cu
            ON cu.user_id = ups.user_id
          WHERE cu.client_id = @clientId
            AND ups.active = TRUE
        )
        SELECT
          tp.project_id,
          COALESCE(p.nombre_del_proyecto, tp.project_id) AS project_name,
          p.page_url,
          COUNT(DISTINCT cu.user_id) AS assigned_users
        FROM tenant_project_ids AS tp
        LEFT JOIN \`${projectId}.notion_ops.proyectos\` AS p
          ON p.notion_page_id = tp.project_id
        LEFT JOIN \`${projectId}.greenhouse.user_project_scopes\` AS ups
          ON ups.project_id = tp.project_id
         AND ups.active = TRUE
        LEFT JOIN \`${projectId}.greenhouse.client_users\` AS cu
          ON cu.user_id = ups.user_id
         AND cu.client_id = @clientId
        GROUP BY tp.project_id, project_name, p.page_url
        ORDER BY project_name
      `,
      params: { clientId }
    }),
    bigQuery.query({
      query: `
        SELECT
          feature_code,
          status,
          active,
          rollout_notes
        FROM \`${projectId}.greenhouse.client_feature_flags\`
        WHERE client_id = @clientId
        ORDER BY feature_code
      `,
      params: { clientId }
    }),
    getTenantCapabilityState(clientId)
  ])

  const tenantRow = (tenantRows[0] as Array<Record<string, unknown>>)[0]

  if (!tenantRow) {
    return null
  }

  return {
    clientId: String(tenantRow.client_id || ''),
    clientName: String(tenantRow.client_name || ''),
    status: String(tenantRow.status || ''),
    active: Boolean(tenantRow.active),
    primaryContactEmail: tenantRow.primary_contact_email ? String(tenantRow.primary_contact_email) : null,
    hubspotCompanyId: tenantRow.hubspot_company_id ? String(tenantRow.hubspot_company_id) : null,
    authMode: String(tenantRow.auth_mode || ''),
    portalHomePath: String(tenantRow.portal_home_path || ''),
    timezone: tenantRow.timezone ? String(tenantRow.timezone) : null,
    notes: tenantRow.notes ? String(tenantRow.notes) : null,
    createdAt: toIsoString(tenantRow.created_at),
    updatedAt: toIsoString(tenantRow.updated_at),
    lastLoginAt: toIsoString(tenantRow.last_login_at),
    notionProjectCount: toNumber(tenantRow.notion_project_count),
    scopedProjects: toNumber(tenantRow.scoped_projects),
    activeUsers: toNumber(tenantRow.active_users),
    invitedUsers: toNumber(tenantRow.invited_users),
    businessLines: normalizeStringArray(tenantRow.business_lines),
    serviceModules: normalizeStringArray(tenantRow.service_modules),
    capabilities: capabilityState.capabilities,
    featureFlags: (featureFlagRows[0] as Array<Record<string, unknown>>).map(row => ({
      featureCode: String(row.feature_code || ''),
      status: String(row.status || ''),
      active: Boolean(row.active),
      rolloutNotes: row.rollout_notes ? String(row.rollout_notes) : null
    })),
    users: (userRows[0] as Array<Record<string, unknown>>).map(row => ({
      userId: String(row.user_id || ''),
      fullName: String(row.full_name || ''),
      email: String(row.email || ''),
      status: String(row.status || ''),
      active: Boolean(row.active),
      authMode: String(row.auth_mode || ''),
      roleCodes: normalizeStringArray(row.role_codes),
      routeGroups: normalizeStringArray(row.route_groups),
      projectScopeCount: toNumber(row.project_scope_count),
      lastLoginAt: toIsoString(row.last_login_at)
    })),
    projects: (projectRows[0] as Array<Record<string, unknown>>).map(row => ({
      projectId: String(row.project_id || ''),
      projectName: String(row.project_name || row.project_id || ''),
      pageUrl: row.page_url ? String(row.page_url) : null,
      assignedUsers: toNumber(row.assigned_users)
    }))
  }
}
