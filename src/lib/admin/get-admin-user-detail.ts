import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export interface AdminUserProjectScope {
  projectId: string
  projectName: string
  accessLevel: string
  pageUrl: string | null
}

export interface AdminUserCampaignScope {
  campaignId: string
  accessLevel: string
}

export interface AdminUserDetail {
  userId: string
  fullName: string
  email: string
  jobTitle: string | null
  tenantType: 'client' | 'efeonce_internal'
  status: string
  active: boolean
  authMode: string
  passwordAlgorithm: string | null
  defaultPortalHomePath: string
  timezone: string | null
  locale: string | null
  lastLoginAt: string | null
  invitedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  client: {
    clientId: string
    clientName: string
    primaryContactEmail: string | null
    hubspotCompanyId: string | null
    featureFlags: string[]
  }
  roleCodes: string[]
  routeGroups: string[]
  projectScopes: AdminUserProjectScope[]
  campaignScopes: AdminUserCampaignScope[]
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

export const getAdminUserDetail = async (userId: string): Promise<AdminUserDetail | null> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [userRows, projectScopeRows, campaignScopeRows] = await Promise.all([
    bigQuery.query({
      query: `
        SELECT
          cu.user_id,
          cu.full_name,
          cu.email,
          cu.job_title,
          cu.tenant_type,
          cu.status,
          cu.active,
          cu.auth_mode,
          cu.password_hash_algorithm,
          cu.default_portal_home_path,
          cu.timezone,
          cu.locale,
          cu.last_login_at,
          cu.invited_at,
          cu.created_at,
          cu.updated_at,
          cu.client_id,
          c.client_name,
          c.primary_contact_email,
          c.hubspot_company_id,
          c.feature_flags,
          ARRAY_AGG(DISTINCT ura.role_code IGNORE NULLS ORDER BY ura.role_code) AS role_codes,
          ARRAY_AGG(DISTINCT route_group IGNORE NULLS ORDER BY route_group) AS route_groups
        FROM \`${projectId}.greenhouse.client_users\` AS cu
        LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
          ON c.client_id = cu.client_id
        LEFT JOIN \`${projectId}.greenhouse.user_role_assignments\` AS ura
          ON ura.user_id = cu.user_id
         AND ura.active = TRUE
        LEFT JOIN \`${projectId}.greenhouse.roles\` AS roles
          ON roles.role_code = ura.role_code
        LEFT JOIN UNNEST(COALESCE(roles.route_group_scope, [])) AS route_group
        WHERE cu.user_id = @userId
        GROUP BY
          cu.user_id,
          cu.full_name,
          cu.email,
          cu.job_title,
          cu.tenant_type,
          cu.status,
          cu.active,
          cu.auth_mode,
          cu.password_hash_algorithm,
          cu.default_portal_home_path,
          cu.timezone,
          cu.locale,
          cu.last_login_at,
          cu.invited_at,
          cu.created_at,
          cu.updated_at,
          cu.client_id,
          c.client_name,
          c.primary_contact_email,
          c.hubspot_company_id,
          c.feature_flags
        LIMIT 1
      `,
      params: { userId }
    }),
    bigQuery.query({
      query: `
        SELECT
          ups.project_id,
          ups.access_level,
          COALESCE(p.nombre_del_proyecto, ups.project_id) AS project_name,
          p.page_url
        FROM \`${projectId}.greenhouse.user_project_scopes\` AS ups
        LEFT JOIN \`${projectId}.notion_ops.proyectos\` AS p
          ON p.notion_page_id = ups.project_id
        WHERE ups.user_id = @userId
          AND ups.active = TRUE
        ORDER BY project_name
      `,
      params: { userId }
    }),
    bigQuery.query({
      query: `
        SELECT
          campaign_id,
          access_level
        FROM \`${projectId}.greenhouse.user_campaign_scopes\`
        WHERE user_id = @userId
          AND active = TRUE
        ORDER BY campaign_id
      `,
      params: { userId }
    })
  ])

  const row = (userRows[0] as Array<Record<string, unknown>>)[0]

  if (!row) {
    return null
  }

  return {
    userId: String(row.user_id || ''),
    fullName: String(row.full_name || 'Sin nombre'),
    email: String(row.email || ''),
    jobTitle: row.job_title ? String(row.job_title) : null,
    tenantType: (row.tenant_type as AdminUserDetail['tenantType']) || 'client',
    status: String(row.status || ''),
    active: Boolean(row.active),
    authMode: String(row.auth_mode || ''),
    passwordAlgorithm: row.password_hash_algorithm ? String(row.password_hash_algorithm) : null,
    defaultPortalHomePath: String(row.default_portal_home_path || ''),
    timezone: row.timezone ? String(row.timezone) : null,
    locale: row.locale ? String(row.locale) : null,
    lastLoginAt: toIsoString(row.last_login_at),
    invitedAt: toIsoString(row.invited_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    client: {
      clientId: String(row.client_id || ''),
      clientName: String(row.client_name || row.client_id || ''),
      primaryContactEmail: row.primary_contact_email ? String(row.primary_contact_email) : null,
      hubspotCompanyId: row.hubspot_company_id ? String(row.hubspot_company_id) : null,
      featureFlags: normalizeStringArray(row.feature_flags)
    },
    roleCodes: normalizeStringArray(row.role_codes),
    routeGroups: normalizeStringArray(row.route_groups),
    projectScopes: (projectScopeRows[0] as Array<Record<string, unknown>>).map(scopeRow => ({
      projectId: String(scopeRow.project_id || ''),
      projectName: String(scopeRow.project_name || scopeRow.project_id || ''),
      accessLevel: String(scopeRow.access_level || ''),
      pageUrl: scopeRow.page_url ? String(scopeRow.page_url) : null
    })),
    campaignScopes: (campaignScopeRows[0] as Array<Record<string, unknown>>).map(scopeRow => ({
      campaignId: String(scopeRow.campaign_id || ''),
      accessLevel: String(scopeRow.access_level || '')
    }))
  }
}
