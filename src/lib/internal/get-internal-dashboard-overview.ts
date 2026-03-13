import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export interface InternalDashboardClientRow {
  clientId: string
  clientName: string
  logoUrl: string | null
  status: string
  active: boolean
  primaryContactEmail: string | null
  authMode: string
  createdAt: string | null
  updatedAt: string | null
  lastLoginAt: string | null
  lastActivityAt: string | null
  notionProjectCount: number
  scopedProjects: number
  trackedOtdProjects: number
  avgOnTimePct: number | null
  totalUsers: number
  activeUsers: number
  invitedUsers: number
  pendingResetUsers: number
  featureFlagCount: number
  businessLines: string[]
  serviceModules: string[]
}

export interface InternalDashboardOverview {
  totals: {
    internalAdmins: number
    totalClients: number
  }
  clients: InternalDashboardClientRow[]
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
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

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export const getInternalDashboardOverview = async (): Promise<InternalDashboardOverview> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [clientRows, totalRows] = await Promise.all([
    bigQuery.query({
      query: `
        WITH client_base AS (
          SELECT
            c.client_id,
            c.client_name,
            JSON_VALUE(TO_JSON_STRING(c), '$.logo_url') AS logo_url,
            c.status,
            c.active,
            c.primary_contact_email,
            c.auth_mode,
            c.created_at,
            c.updated_at,
            c.last_login_at,
            ARRAY_LENGTH(COALESCE(c.notion_project_ids, [])) AS notion_project_count
          FROM \`${projectId}.greenhouse.clients\` AS c
          WHERE c.active = TRUE
        ),
        user_summary AS (
          SELECT
            cu.client_id,
            COUNT(DISTINCT cu.user_id) AS total_users,
            COUNT(DISTINCT IF(cu.last_login_at IS NOT NULL, cu.user_id, NULL)) AS active_users,
            COUNT(DISTINCT IF(cu.status = 'invited' AND cu.last_login_at IS NULL, cu.user_id, NULL)) AS invited_users,
            COUNT(DISTINCT IF(cu.auth_mode = 'password_reset_pending', cu.user_id, NULL)) AS pending_reset_users
          FROM \`${projectId}.greenhouse.client_users\` AS cu
          WHERE cu.client_id IS NOT NULL
            AND cu.tenant_type = 'client'
          GROUP BY cu.client_id
        ),
        client_project_scopes AS (
          SELECT
            cu.client_id,
            ups.project_id
          FROM \`${projectId}.greenhouse.client_users\` AS cu
          INNER JOIN \`${projectId}.greenhouse.user_project_scopes\` AS ups
            ON ups.user_id = cu.user_id
           AND ups.active = TRUE
          WHERE cu.client_id IS NOT NULL
            AND cu.tenant_type = 'client'
          GROUP BY cu.client_id, ups.project_id
        ),
        project_health AS (
          SELECT
            scoped_project_rows.client_id,
            COUNT(DISTINCT scoped_project_rows.project_id) AS scoped_projects,
            COUNT(DISTINCT IF(safe_on_time_pct IS NOT NULL, scoped_project_rows.project_id, NULL)) AS tracked_otd_projects,
            AVG(safe_on_time_pct) AS avg_on_time_pct
          FROM (
            SELECT
              cps.client_id,
              cps.project_id,
              SAFE_CAST(REGEXP_REPLACE(COALESCE(p.pct_on_time, ''), r'[^0-9.]', '') AS FLOAT64) AS safe_on_time_pct
            FROM client_project_scopes AS cps
            LEFT JOIN \`${projectId}.notion_ops.proyectos\` AS p
              ON p.notion_page_id = cps.project_id
          ) AS scoped_project_rows
          GROUP BY scoped_project_rows.client_id
        ),
        feature_summary AS (
          SELECT
            cff.client_id,
            COUNT(DISTINCT IF(cff.active = TRUE AND cff.status IN ('enabled', 'staged'), cff.feature_code, NULL)) AS feature_flag_count
          FROM \`${projectId}.greenhouse.client_feature_flags\` AS cff
          GROUP BY cff.client_id
        ),
        module_summary AS (
          SELECT
            csm.client_id,
            ARRAY_AGG(
              DISTINCT IF(sm.module_kind = 'business_line', csm.module_code, NULL)
              IGNORE NULLS
              ORDER BY IF(sm.module_kind = 'business_line', csm.module_code, NULL)
            ) AS business_lines,
            ARRAY_AGG(
              DISTINCT IF(sm.module_kind = 'service_module', csm.module_code, NULL)
              IGNORE NULLS
              ORDER BY IF(sm.module_kind = 'service_module', csm.module_code, NULL)
            ) AS service_modules
          FROM \`${projectId}.greenhouse.client_service_modules\` AS csm
          LEFT JOIN \`${projectId}.greenhouse.service_modules\` AS sm
            ON sm.module_code = csm.module_code
           AND sm.active = TRUE
          WHERE csm.active = TRUE
          GROUP BY csm.client_id
        )
        SELECT
          client_base.client_id,
          client_base.client_name,
          client_base.logo_url,
          client_base.status,
          client_base.active,
          client_base.primary_contact_email,
          client_base.auth_mode,
          client_base.created_at,
          client_base.updated_at,
          client_base.last_login_at,
          GREATEST(
            COALESCE(client_base.last_login_at, TIMESTAMP '1970-01-01 00:00:00 UTC'),
            COALESCE(client_base.updated_at, TIMESTAMP '1970-01-01 00:00:00 UTC'),
            COALESCE(client_base.created_at, TIMESTAMP '1970-01-01 00:00:00 UTC')
          ) AS last_activity_at,
          client_base.notion_project_count,
          COALESCE(project_health.scoped_projects, 0) AS scoped_projects,
          COALESCE(project_health.tracked_otd_projects, 0) AS tracked_otd_projects,
          project_health.avg_on_time_pct,
          COALESCE(user_summary.total_users, 0) AS total_users,
          COALESCE(user_summary.active_users, 0) AS active_users,
          COALESCE(user_summary.invited_users, 0) AS invited_users,
          COALESCE(user_summary.pending_reset_users, 0) AS pending_reset_users,
          COALESCE(feature_summary.feature_flag_count, 0) AS feature_flag_count,
          module_summary.business_lines,
          module_summary.service_modules
        FROM client_base
        LEFT JOIN user_summary
          ON user_summary.client_id = client_base.client_id
        LEFT JOIN project_health
          ON project_health.client_id = client_base.client_id
        LEFT JOIN feature_summary
          ON feature_summary.client_id = client_base.client_id
        LEFT JOIN module_summary
          ON module_summary.client_id = client_base.client_id
        ORDER BY client_base.client_name ASC
      `
    }),
    bigQuery.query({
      query: `
        SELECT
          COUNTIF(tenant_type = 'efeonce_internal' AND active = TRUE AND status = 'active') AS internal_admins
        FROM \`${projectId}.greenhouse.client_users\`
      `
    })
  ])

  const totalsRow = ((totalRows[0] as Array<{ internal_admins: number | string }>)[0] ?? {
    internal_admins: 0
  }) as {
    internal_admins: number | string
  }

  const clients = (clientRows[0] as Array<Record<string, unknown>>).map(row => ({
    clientId: String(row.client_id || ''),
    clientName: String(row.client_name || ''),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    status: String(row.status || ''),
    active: Boolean(row.active),
    primaryContactEmail: row.primary_contact_email ? String(row.primary_contact_email) : null,
    authMode: String(row.auth_mode || ''),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    lastLoginAt: toIsoString(row.last_login_at),
    lastActivityAt: toIsoString(row.last_activity_at),
    notionProjectCount: toNumber(row.notion_project_count),
    scopedProjects: toNumber(row.scoped_projects),
    trackedOtdProjects: toNumber(row.tracked_otd_projects),
    avgOnTimePct: toNullableNumber(row.avg_on_time_pct),
    totalUsers: toNumber(row.total_users),
    activeUsers: toNumber(row.active_users),
    invitedUsers: toNumber(row.invited_users),
    pendingResetUsers: toNumber(row.pending_reset_users),
    featureFlagCount: toNumber(row.feature_flag_count),
    businessLines: normalizeStringArray(row.business_lines),
    serviceModules: normalizeStringArray(row.service_modules)
  }))

  return {
    totals: {
      internalAdmins: Number(totalsRow.internal_admins || 0),
      totalClients: clients.length
    },
    clients
  }
}
