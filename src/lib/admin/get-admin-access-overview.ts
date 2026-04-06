import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { isRoleCode } from '@/config/role-codes'
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

// ── PostgreSQL-first implementation (real-time data) ──

type PgUserRow = {
  user_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  client_name: string | null
  tenant_type: string
  status: string
  active: boolean
  auth_mode: string | null
  default_portal_home_path: string | null
  last_login_at: string | null
  role_codes: string[] | null
  route_groups: string[] | null
  project_scope_count: string
}

type PgRoleRow = {
  role_code: string
  role_name: string
  tenant_type: string | null
  is_admin: boolean
  is_internal: boolean
  route_group_scope: string[] | null
  assigned_users: string
  assigned_clients: string
}

type PgTotalsRow = {
  total_users: string
  active_users: string
  invited_users: string
  internal_users: string
  client_users: string
}

const getAdminAccessOverviewPostgres = async (): Promise<AdminAccessOverview> => {
  const [userRows, roleRows, totalsRows] = await Promise.all([
    runGreenhousePostgresQuery<PgUserRow>(`
      SELECT
        cu.user_id,
        cu.full_name,
        cu.email,
        cu.avatar_url,
        COALESCE(c.client_name, CASE WHEN cu.tenant_type = 'efeonce_internal' THEN 'Efeonce Internal' ELSE cu.client_id END) AS client_name,
        cu.tenant_type,
        cu.status,
        cu.active,
        cu.auth_mode,
        cu.default_portal_home_path,
        cu.last_login_at,
        COALESCE(
          (SELECT ARRAY_AGG(DISTINCT ura.role_code ORDER BY ura.role_code)
           FROM greenhouse_core.user_role_assignments ura
           WHERE ura.user_id = cu.user_id AND ura.active = true),
          ARRAY[]::text[]
        ) AS role_codes,
        COALESCE(
          (SELECT ARRAY_AGG(DISTINCT rg ORDER BY rg)
           FROM greenhouse_core.user_role_assignments ura2
           INNER JOIN greenhouse_core.roles r2 ON r2.role_code = ura2.role_code
           CROSS JOIN LATERAL unnest(COALESCE(r2.route_group_scope, ARRAY[]::text[])) AS rg
           WHERE ura2.user_id = cu.user_id AND ura2.active = true),
          ARRAY[]::text[]
        ) AS route_groups,
        (SELECT COUNT(*)::text FROM greenhouse_core.user_project_scopes ups
         WHERE ups.user_id = cu.user_id AND ups.active = true) AS project_scope_count
      FROM greenhouse_core.client_users cu
      LEFT JOIN greenhouse_core.clients c ON c.client_id = cu.client_id
      ORDER BY cu.tenant_type DESC, cu.active DESC, cu.full_name ASC
    `),
    runGreenhousePostgresQuery<PgRoleRow>(`
      SELECT
        r.role_code,
        r.role_name,
        r.tenant_type,
        r.is_admin,
        r.is_internal,
        r.route_group_scope,
        COUNT(DISTINCT CASE WHEN ura.active THEN ura.user_id END)::text AS assigned_users,
        COUNT(DISTINCT CASE WHEN ura.active THEN ura.client_id END)::text AS assigned_clients
      FROM greenhouse_core.roles r
      LEFT JOIN greenhouse_core.user_role_assignments ura ON ura.role_code = r.role_code
      GROUP BY r.role_code, r.role_name, r.tenant_type, r.is_admin, r.is_internal, r.route_group_scope
      ORDER BY r.tenant_type DESC, r.role_code
    `),
    runGreenhousePostgresQuery<PgTotalsRow>(`
      SELECT
        COUNT(*)::text AS total_users,
        COUNT(*) FILTER (WHERE active = true)::text AS active_users,
        COUNT(*) FILTER (WHERE status = 'invited')::text AS invited_users,
        COUNT(*) FILTER (WHERE tenant_type = 'efeonce_internal')::text AS internal_users,
        COUNT(*) FILTER (WHERE tenant_type = 'client')::text AS client_users
      FROM greenhouse_core.client_users
    `)
  ])

  const t = totalsRows[0]

  return {
    totals: {
      totalUsers: Number(t?.total_users ?? 0),
      activeUsers: Number(t?.active_users ?? 0),
      invitedUsers: Number(t?.invited_users ?? 0),
      internalUsers: Number(t?.internal_users ?? 0),
      clientUsers: Number(t?.client_users ?? 0)
    },
    users: userRows.map(row => ({
      userId: row.user_id,
      fullName: row.full_name || 'Sin nombre',
      email: row.email || '',
      avatarUrl: row.avatar_url,
      clientName: row.client_name || '',
      tenantType: (row.tenant_type as AdminUserRow['tenantType']) || 'client',
      status: row.status || '',
      active: row.active,
      authMode: row.auth_mode || '',
      roleCodes: (row.role_codes || []).filter(c => isRoleCode(c)),
      routeGroups: row.route_groups || [],
      projectScopeCount: Number(row.project_scope_count ?? 0),
      lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
      portalHomePath: row.default_portal_home_path || ''
    })),
    roles: roleRows
      .filter(row => isRoleCode(row.role_code))
      .map(row => ({
        roleCode: row.role_code,
        roleName: row.role_name,
        tenantType: (row.tenant_type as AdminRoleRow['tenantType']) || 'client',
        isAdmin: row.is_admin,
        isInternal: row.is_internal,
        routeGroups: row.route_group_scope || [],
        assignedUsers: Number(row.assigned_users ?? 0),
        assignedClients: Number(row.assigned_clients ?? 0)
      }))
  }
}

// ── Main entry point: PG first, BQ fallback ──

export const getAdminAccessOverview = async (): Promise<AdminAccessOverview> => {
  try {
    return await getAdminAccessOverviewPostgres()
  } catch (error) {
    console.warn('[admin-access-overview] PG failed, falling back to BigQuery:', error instanceof Error ? error.message : error)
  }

  return getAdminAccessOverviewBigQuery()
}

// ── BigQuery fallback ──

const getAdminAccessOverviewBigQuery = async (): Promise<AdminAccessOverview> => {
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
