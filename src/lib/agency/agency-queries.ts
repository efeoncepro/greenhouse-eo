import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { TeamRoleCategory } from '@/types/team'

export interface AgencySpaceHealth {
  clientId: string
  clientName: string
  businessLines: string[]
  rpaAvg: number | null
  otdPct: number | null
  assetsActivos: number
  feedbackPendiente: number
  projectCount: number
  notionProjectCount: number
  scopedProjectCount: number
  assignedMembers: number
  allocatedFte: number
  totalUsers: number
  activeUsers: number
  isInternal: boolean
}

export interface AgencyPulseKpis {
  rpaGlobal: number | null
  assetsActivos: number
  otdPctGlobal: number | null
  feedbackPendiente: number
  totalSpaces: number
  totalProjects: number
  lastSyncedAt: string | null
}

export interface AgencyChartWeeklyPoint {
  weekStart: string
  completed: number
}

export interface AgencyChartSpaceRpa {
  clientId: string
  clientName: string
  rpaAvg: number | null
}

export interface AgencyChartStatusItem {
  key: string
  label: string
  value: number
}

export interface AgencyCapacityMember {
  memberId: string
  displayName: string
  avatarUrl: string | null
  roleTitle: string
  roleCategory: TeamRoleCategory
  fteAllocation: number
  spaceAllocations: { clientId: string; clientName: string; fte: number }[]
}

export interface AgencyCapacityOverview {
  totalFte: number
  allocatedFte: number
  utilizationPct: number
  monthlyHours: number
  members: AgencyCapacityMember[]
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIsoString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const inner = (value as { value?: unknown }).value

    return typeof inner === 'string' ? inner : null
  }

  return null
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
}

const normalizeMatchValue = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\|/g, ' ')
    .replace(/[^a-z0-9@._\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const inferRoleCategory = (value: string | null | undefined): TeamRoleCategory => {
  const normalized = normalizeMatchValue(value)

  if (normalized.includes('account')) return 'account'
  if (normalized.includes('operat')) return 'operations'
  if (normalized.includes('strateg')) return 'strategy'
  if (normalized.includes('design') || normalized.includes('creative')) return 'design'
  if (normalized.includes('develop') || normalized.includes('web')) return 'development'
  if (normalized.includes('media')) return 'media'

  return 'unknown'
}

const getAgencyClientScopeCtes = (projectId: string) => `
  WITH active_clients AS (
    SELECT
      c.client_id,
      c.client_name,
      COALESCE(c.notion_project_ids, []) AS notion_project_ids
    FROM \`${projectId}.greenhouse.clients\` c
    WHERE c.active = TRUE
  ),
  user_summary AS (
    SELECT
      cu.client_id,
      COUNT(DISTINCT cu.user_id) AS total_users,
      COUNT(DISTINCT IF(cu.last_login_at IS NOT NULL, cu.user_id, NULL)) AS active_users
    FROM \`${projectId}.greenhouse.client_users\` cu
    WHERE cu.client_id IS NOT NULL
      AND cu.tenant_type = 'client'
    GROUP BY cu.client_id
  ),
  scoped_project_ids AS (
    SELECT
      cu.client_id,
      ups.project_id
    FROM \`${projectId}.greenhouse.client_users\` cu
    INNER JOIN \`${projectId}.greenhouse.user_project_scopes\` ups
      ON ups.user_id = cu.user_id
     AND ups.active = TRUE
    WHERE cu.client_id IS NOT NULL
      AND cu.tenant_type = 'client'
    GROUP BY cu.client_id, ups.project_id
  ),
  client_project_ids AS (
    SELECT
      client_rows.client_id,
      client_rows.client_name,
      client_rows.project_id
    FROM (
      SELECT
        ac.client_id,
        ac.client_name,
        project_id
      FROM active_clients ac, UNNEST(ac.notion_project_ids) AS project_id

      UNION DISTINCT

      SELECT
        ac.client_id,
        ac.client_name,
        sp.project_id
      FROM active_clients ac
      INNER JOIN scoped_project_ids sp
        ON sp.client_id = ac.client_id
    ) AS client_rows
  ),
  project_inventory AS (
    SELECT
      ac.client_id,
      ARRAY_LENGTH(ac.notion_project_ids) AS notion_project_count,
      COUNT(DISTINCT sp.project_id) AS scoped_project_count,
      COUNT(DISTINCT cp.project_id) AS project_count
    FROM active_clients ac
    LEFT JOIN scoped_project_ids sp
      ON sp.client_id = ac.client_id
    LEFT JOIN client_project_ids cp
      ON cp.client_id = ac.client_id
    GROUP BY ac.client_id, ARRAY_LENGTH(ac.notion_project_ids)
  ),
  assignment_summary AS (
    SELECT
      ta.client_id,
      COUNT(DISTINCT ta.member_id) AS assigned_members,
      SUM(COALESCE(ta.fte_allocation, 0)) AS allocated_fte
    FROM \`${projectId}.greenhouse.client_team_assignments\` ta
    WHERE ta.active = TRUE
    GROUP BY ta.client_id
  )
`

export const getAgencyPulseKpis = async (): Promise<AgencyPulseKpis> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      ${getAgencyClientScopeCtes(projectId)},
      task_agg AS (
        SELECT
          AVG(SAFE_CAST(t.rpa AS FLOAT64)) AS rpa_global,
          COUNTIF(t.estado NOT IN ('Listo', 'Cancelado')) AS assets_activos,
          COUNTIF(SAFE_CAST(t.open_frame_comments AS INT64) > 0) AS feedback_pendiente,
          MAX(t.last_edited_time) AS last_synced_at
        FROM \`${projectId}.notion_ops.tareas\` t
        WHERE t.proyecto IN (SELECT project_id FROM client_project_ids)
      ),
      project_agg AS (
        SELECT
          COUNT(DISTINCT cp.project_id) AS total_projects,
          AVG(SAFE_CAST(REGEXP_REPLACE(COALESCE(pr.pct_on_time, ''), r'[^0-9.]', '') AS FLOAT64)) AS otd_pct_global
        FROM client_project_ids cp
        LEFT JOIN \`${projectId}.notion_ops.proyectos\` pr
          ON pr.notion_page_id = cp.project_id
      )
      SELECT
        ta.rpa_global,
        ta.assets_activos,
        ta.feedback_pendiente,
        ta.last_synced_at,
        pa.total_projects,
        pa.otd_pct_global,
        (SELECT COUNT(*) FROM active_clients) AS total_spaces
      FROM task_agg ta
      CROSS JOIN project_agg pa
    `
  })

  const row = rows?.[0] as Record<string, unknown> | undefined

  return {
    rpaGlobal: row ? toNullableNumber(row.rpa_global) : null,
    assetsActivos: row ? toNumber(row.assets_activos) : 0,
    otdPctGlobal: row ? toNullableNumber(row.otd_pct_global) : null,
    feedbackPendiente: row ? toNumber(row.feedback_pendiente) : 0,
    totalSpaces: row ? toNumber(row.total_spaces) : 0,
    totalProjects: row ? toNumber(row.total_projects) : 0,
    lastSyncedAt: row ? toIsoString(row.last_synced_at) : null
  }
}

export const getAgencySpacesHealth = async (): Promise<AgencySpaceHealth[]> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      ${getAgencyClientScopeCtes(projectId)},
      task_health AS (
        SELECT
          cp.client_id,
          AVG(SAFE_CAST(t.rpa AS FLOAT64)) AS rpa_avg,
          COUNTIF(t.estado NOT IN ('Listo', 'Cancelado')) AS assets_activos,
          COUNTIF(SAFE_CAST(t.open_frame_comments AS INT64) > 0) AS feedback_pendiente
        FROM client_project_ids cp
        LEFT JOIN \`${projectId}.notion_ops.tareas\` t
          ON t.proyecto = cp.project_id
        GROUP BY cp.client_id
      ),
      project_health AS (
        SELECT
          cp.client_id,
          AVG(SAFE_CAST(REGEXP_REPLACE(COALESCE(pr.pct_on_time, ''), r'[^0-9.]', '') AS FLOAT64)) AS otd_pct
        FROM client_project_ids cp
        LEFT JOIN \`${projectId}.notion_ops.proyectos\` pr
          ON pr.notion_page_id = cp.project_id
        GROUP BY cp.client_id
      ),
      module_agg AS (
        SELECT
          csm.client_id,
          ARRAY_AGG(DISTINCT csm.module_code IGNORE NULLS ORDER BY csm.module_code) AS business_lines
        FROM \`${projectId}.greenhouse.client_service_modules\` csm
        INNER JOIN \`${projectId}.greenhouse.service_modules\` sm
          ON sm.module_code = csm.module_code
         AND sm.module_kind = 'business_line'
         AND sm.active = TRUE
        WHERE csm.active = TRUE
        GROUP BY csm.client_id
      )
      SELECT
        ac.client_id,
        ac.client_name,
        COALESCE(ma.business_lines, []) AS business_lines,
        th.rpa_avg,
        ph.otd_pct,
        COALESCE(th.assets_activos, 0) AS assets_activos,
        COALESCE(th.feedback_pendiente, 0) AS feedback_pendiente,
        COALESCE(pi.project_count, 0) AS project_count,
        COALESCE(pi.notion_project_count, 0) AS notion_project_count,
        COALESCE(pi.scoped_project_count, 0) AS scoped_project_count,
        COALESCE(asg.assigned_members, 0) AS assigned_members,
        COALESCE(asg.allocated_fte, 0) AS allocated_fte,
        COALESCE(us.total_users, 0) AS total_users,
        COALESCE(us.active_users, 0) AS active_users
      FROM active_clients ac
      LEFT JOIN task_health th
        ON th.client_id = ac.client_id
      LEFT JOIN project_health ph
        ON ph.client_id = ac.client_id
      LEFT JOIN project_inventory pi
        ON pi.client_id = ac.client_id
      LEFT JOIN assignment_summary asg
        ON asg.client_id = ac.client_id
      LEFT JOIN user_summary us
        ON us.client_id = ac.client_id
      LEFT JOIN module_agg ma
        ON ma.client_id = ac.client_id
      ORDER BY
        COALESCE(pi.project_count, 0) DESC,
        COALESCE(asg.allocated_fte, 0) DESC,
        ac.client_name ASC
    `
  })

  return (rows as Record<string, unknown>[]).map(row => {
    const clientId = String(row.client_id ?? '')
    const clientName = String(row.client_name ?? '')
    const normalizedSpace = `${clientId} ${clientName}`.toLowerCase()

    return {
      clientId,
      clientName,
      businessLines: normalizeStringArray(row.business_lines),
      rpaAvg: toNullableNumber(row.rpa_avg),
      otdPct: toNullableNumber(row.otd_pct),
      assetsActivos: toNumber(row.assets_activos),
      feedbackPendiente: toNumber(row.feedback_pendiente),
      projectCount: toNumber(row.project_count),
      notionProjectCount: toNumber(row.notion_project_count),
      scopedProjectCount: toNumber(row.scoped_project_count),
      assignedMembers: toNumber(row.assigned_members),
      allocatedFte: Number(toNumber(row.allocated_fte).toFixed(1)),
      totalUsers: toNumber(row.total_users),
      activeUsers: toNumber(row.active_users),
      isInternal: normalizedSpace.includes('efeonce')
    }
  })
}

export const getAgencyWeeklyActivity = async (): Promise<AgencyChartWeeklyPoint[]> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      ${getAgencyClientScopeCtes(projectId)}
      SELECT
        DATE_TRUNC(DATE(t.fecha_de_completado), WEEK(MONDAY)) AS week_start,
        COUNT(*) AS completed
      FROM \`${projectId}.notion_ops.tareas\` t
      WHERE t.proyecto IN (SELECT project_id FROM client_project_ids)
        AND t.estado = 'Listo'
        AND t.fecha_de_completado IS NOT NULL
        AND DATE(t.fecha_de_completado) >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 WEEK)
      GROUP BY week_start
      ORDER BY week_start ASC
    `
  })

  return (rows as Record<string, unknown>[]).map(row => ({
    weekStart: toIsoString(row.week_start) ?? '',
    completed: toNumber(row.completed)
  }))
}

export const getAgencyStatusMix = async (): Promise<AgencyChartStatusItem[]> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const STATUS_MAP: Record<string, string> = {
    'En Curso': 'active',
    'Listo para Revision': 'review',
    'Cambios Solicitados': 'changes',
    'Listo': 'completed'
  }

  const [rows] = await bq.query({
    query: `
      ${getAgencyClientScopeCtes(projectId)}
      SELECT
        t.estado AS group_key,
        COUNT(*) AS item_count
      FROM \`${projectId}.notion_ops.tareas\` t
      WHERE t.proyecto IN (SELECT project_id FROM client_project_ids)
        AND t.estado IN ('En Curso', 'Listo para Revision', 'Cambios Solicitados', 'Listo')
      GROUP BY t.estado
    `
  })

  const LABELS: Record<string, string> = {
    active: 'En Curso',
    review: 'En Revisión',
    changes: 'Cambios',
    completed: 'Listo'
  }

  return (rows as Record<string, unknown>[])
    .map(row => ({
      key: STATUS_MAP[String(row.group_key)] ?? 'other',
      label: LABELS[STATUS_MAP[String(row.group_key)] ?? ''] ?? String(row.group_key),
      value: toNumber(row.item_count)
    }))
    .filter(item => item.key !== 'other')
}

export const getAgencyCapacity = async (): Promise<AgencyCapacityOverview> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  try {
    const [rows] = await bq.query({
      query: `
        WITH member_assignments AS (
          SELECT
            tm.member_id,
            tm.display_name,
            tm.avatar_url,
            tm.role_title,
            tm.role_category,
            ta.client_id,
            c.client_name,
            COALESCE(ta.fte_allocation, 0) AS fte_allocation
          FROM \`${projectId}.greenhouse.team_members\` tm
          LEFT JOIN \`${projectId}.greenhouse.client_team_assignments\` ta
            ON ta.member_id = tm.member_id
           AND ta.active = TRUE
          LEFT JOIN \`${projectId}.greenhouse.clients\` c
            ON c.client_id = ta.client_id
          WHERE tm.active = TRUE
        )
        SELECT
          member_id,
          display_name,
          avatar_url,
          role_title,
          role_category,
          COALESCE(SUM(fte_allocation), 0) AS fte_allocation,
          ARRAY_AGG(
            IF(
              client_id IS NULL,
              NULL,
              STRUCT(
                client_id AS client_id,
                COALESCE(client_name, client_id) AS client_name,
                fte_allocation AS fte
              )
            )
            IGNORE NULLS
            ORDER BY fte_allocation DESC, client_name ASC
          ) AS space_allocations
        FROM member_assignments
        GROUP BY member_id, display_name, avatar_url, role_title, role_category
        ORDER BY fte_allocation DESC, display_name ASC
      `
    })

    const members: AgencyCapacityMember[] = (rows as Record<string, unknown>[]).map(row => ({
      memberId: String(row.member_id ?? ''),
      displayName: String(row.display_name ?? ''),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      roleTitle: String(row.role_title ?? ''),
      roleCategory: inferRoleCategory(String(row.role_category ?? row.role_title ?? '')),
      fteAllocation: Number(toNumber(row.fte_allocation).toFixed(1)),
      spaceAllocations: Array.isArray(row.space_allocations)
        ? row.space_allocations
            .map(item => {
              const allocation = item as Record<string, unknown>

              return {
                clientId: String(allocation.client_id ?? ''),
                clientName: String(allocation.client_name ?? ''),
                fte: Number(toNumber(allocation.fte).toFixed(1))
              }
            })
            .filter(item => item.clientId)
        : []
    }))

    const totalFte = Number(members.reduce((sum, member) => sum + member.fteAllocation, 0).toFixed(1))
    const maxFte = members.length
    const utilizationPct = maxFte > 0 ? Math.round((totalFte / maxFte) * 100) : 0

    return {
      totalFte,
      allocatedFte: totalFte,
      utilizationPct,
      monthlyHours: Math.round(totalFte * 160),
      members
    }
  } catch {
    return {
      totalFte: 0,
      allocatedFte: 0,
      utilizationPct: 0,
      monthlyHours: 0,
      members: []
    }
  }
}
