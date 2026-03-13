import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export interface AdminUserRow {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  clientName: string
  tenantType: 'client' | 'efeonce_internal'
  status: string
  active: boolean
  authMode: string
  roleCodes: string[]
  routeGroups: string[]
  projectScopeCount: number
  lastLoginAt: string | null
  portalHomePath: string
}

export interface AdminRoleRow {
  roleCode: string
  roleName: string
  tenantType: 'client' | 'efeonce_internal'
  isAdmin: boolean
  isInternal: boolean
  routeGroups: string[]
  assignedUsers: number
  assignedClients: number
}

export interface AdminAccessOverview {
  totals: {
    totalUsers: number
    activeUsers: number
    invitedUsers: number
    internalUsers: number
    clientUsers: number
  }
  users: AdminUserRow[]
  roles: AdminRoleRow[]
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

export const getAdminAccessOverview = async (): Promise<AdminAccessOverview> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [userRows, roleRows, totalRows] = await Promise.all([
    bigQuery.query({
      query: `
        SELECT
          cu.user_id,
          cu.full_name,
          cu.email,
          cu.avatar_url,
          COALESCE(c.client_name, cu.client_id) AS client_name,
          cu.tenant_type,
          cu.status,
          cu.active,
          cu.auth_mode,
          cu.default_portal_home_path,
          cu.last_login_at,
          ARRAY_AGG(DISTINCT ura.role_code IGNORE NULLS ORDER BY ura.role_code) AS role_codes,
          ARRAY_AGG(DISTINCT route_group IGNORE NULLS ORDER BY route_group) AS route_groups,
          COUNT(DISTINCT IF(ups.active = TRUE, ups.project_id, NULL)) AS project_scope_count
        FROM \`${projectId}.greenhouse.client_users\` AS cu
        LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
          ON c.client_id = cu.client_id
        LEFT JOIN \`${projectId}.greenhouse.user_role_assignments\` AS ura
          ON ura.user_id = cu.user_id
         AND ura.active = TRUE
        LEFT JOIN \`${projectId}.greenhouse.roles\` AS roles
          ON roles.role_code = ura.role_code
        LEFT JOIN UNNEST(COALESCE(roles.route_group_scope, [])) AS route_group
        LEFT JOIN \`${projectId}.greenhouse.user_project_scopes\` AS ups
          ON ups.user_id = cu.user_id
        GROUP BY
          cu.user_id,
          cu.full_name,
          cu.email,
          cu.avatar_url,
          client_name,
          cu.tenant_type,
          cu.status,
          cu.active,
          cu.auth_mode,
          cu.default_portal_home_path,
          cu.last_login_at
        ORDER BY cu.tenant_type DESC, cu.active DESC, cu.full_name ASC
      `
    }),
    bigQuery.query({
      query: `
        SELECT
          roles.role_code,
          roles.role_name,
          roles.tenant_type,
          roles.is_admin,
          roles.is_internal,
          roles.route_group_scope,
          COUNT(DISTINCT IF(ura.active = TRUE, ura.user_id, NULL)) AS assigned_users,
          COUNT(DISTINCT IF(ura.active = TRUE, ura.client_id, NULL)) AS assigned_clients
        FROM \`${projectId}.greenhouse.roles\` AS roles
        LEFT JOIN \`${projectId}.greenhouse.user_role_assignments\` AS ura
          ON ura.role_code = roles.role_code
        GROUP BY
          roles.role_code,
          roles.role_name,
          roles.tenant_type,
          roles.is_admin,
          roles.is_internal,
          roles.route_group_scope
        ORDER BY roles.tenant_type DESC, roles.role_code
      `
    }),
    bigQuery.query({
      query: `
        SELECT
          COUNT(*) AS total_users,
          COUNTIF(active = TRUE) AS active_users,
          COUNTIF(status = 'invited') AS invited_users,
          COUNTIF(tenant_type = 'efeonce_internal') AS internal_users,
          COUNTIF(tenant_type = 'client') AS client_users
        FROM \`${projectId}.greenhouse.client_users\`
      `
    })
  ])

  const totalsRow = (totalRows[0] as Array<Record<string, unknown>>)[0] ?? {}

  return {
    totals: {
      totalUsers: toNumber(totalsRow.total_users),
      activeUsers: toNumber(totalsRow.active_users),
      invitedUsers: toNumber(totalsRow.invited_users),
      internalUsers: toNumber(totalsRow.internal_users),
      clientUsers: toNumber(totalsRow.client_users)
    },
    users: (userRows[0] as Array<Record<string, unknown>>).map(row => ({
      userId: String(row.user_id || ''),
      fullName: String(row.full_name || 'Sin nombre'),
      email: String(row.email || ''),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      clientName: String(row.client_name || ''),
      tenantType: (row.tenant_type as AdminUserRow['tenantType']) || 'client',
      status: String(row.status || ''),
      active: Boolean(row.active),
      authMode: String(row.auth_mode || ''),
      roleCodes: normalizeStringArray(row.role_codes),
      routeGroups: normalizeStringArray(row.route_groups),
      projectScopeCount: toNumber(row.project_scope_count),
      lastLoginAt:
        row.last_login_at && typeof row.last_login_at === 'object' && 'value' in (row.last_login_at as Record<string, unknown>)
          ? String((row.last_login_at as { value?: string }).value || '')
          : row.last_login_at
            ? String(row.last_login_at)
            : null,
      portalHomePath: String(row.default_portal_home_path || '')
    })),
    roles: (roleRows[0] as Array<Record<string, unknown>>).map(row => ({
      roleCode: String(row.role_code || ''),
      roleName: String(row.role_name || ''),
      tenantType: (row.tenant_type as AdminRoleRow['tenantType']) || 'client',
      isAdmin: Boolean(row.is_admin),
      isInternal: Boolean(row.is_internal),
      routeGroups: normalizeStringArray(row.route_group_scope),
      assignedUsers: toNumber(row.assigned_users),
      assignedClients: toNumber(row.assigned_clients)
    }))
  }
}
