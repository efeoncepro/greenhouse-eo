import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgencySpaceHealth {
  clientId: string
  clientName: string
  businessLines: string[]
  rpaAvg: number | null
  otdPct: number | null
  assetsActivos: number
  feedbackPendiente: number
  projectCount: number
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
  roleTitle: string
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0 }
  return 0
}

const toNullableNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = toNumber(v)
  return Number.isFinite(n) ? n : null
}

const toIsoString = (v: unknown): string | null => {
  if (!v) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && 'value' in v) {
    const inner = (v as { value?: unknown }).value
    return typeof inner === 'string' ? inner : null
  }
  return null
}

const normalizeStringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return []
  return v.map(i => (typeof i === 'string' ? i.trim() : '')).filter(Boolean)
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getAgencyPulseKpis = async (): Promise<AgencyPulseKpis> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      WITH active_clients AS (
        SELECT
          c.client_id,
          c.client_name,
          c.notion_project_ids
        FROM \`${projectId}.greenhouse.clients\` c
        WHERE c.active = TRUE AND c.tenant_type = 'client'
      ),
      project_ids AS (
        SELECT c.client_id, p AS project_id
        FROM active_clients c, UNNEST(c.notion_project_ids) AS p
      ),
      task_agg AS (
        SELECT
          AVG(SAFE_CAST(t.rpa AS FLOAT64)) AS rpa_global,
          COUNTIF(t.estado NOT IN ('Listo', 'Cancelado')) AS assets_activos,
          COUNTIF(t.open_frame_comments > 0) AS feedback_pendiente,
          MAX(t.updated_at) AS last_synced_at
        FROM \`${projectId}.notion_ops.tareas\` t
        WHERE t.proyecto IN (SELECT project_id FROM project_ids)
      ),
      project_agg AS (
        SELECT
          COUNT(DISTINCT p.project_id) AS total_projects,
          AVG(SAFE_CAST(REGEXP_REPLACE(COALESCE(pr.pct_on_time, ''), r'[^0-9.]', '') AS FLOAT64)) AS otd_pct_global
        FROM project_ids p
        LEFT JOIN \`${projectId}.notion_ops.proyectos\` pr
          ON pr.notion_page_id = p.project_id
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
      WITH active_clients AS (
        SELECT
          c.client_id,
          c.client_name,
          c.notion_project_ids
        FROM \`${projectId}.greenhouse.clients\` c
        WHERE c.active = TRUE AND c.tenant_type = 'client'
      ),
      project_ids AS (
        SELECT c.client_id, c.client_name, p AS project_id
        FROM active_clients c, UNNEST(c.notion_project_ids) AS p
      ),
      task_health AS (
        SELECT
          pi.client_id,
          AVG(SAFE_CAST(t.rpa AS FLOAT64)) AS rpa_avg,
          COUNTIF(t.estado NOT IN ('Listo', 'Cancelado')) AS assets_activos,
          COUNTIF(t.open_frame_comments > 0) AS feedback_pendiente
        FROM project_ids pi
        LEFT JOIN \`${projectId}.notion_ops.tareas\` t
          ON t.proyecto = pi.project_id
        GROUP BY pi.client_id
      ),
      project_health AS (
        SELECT
          pi.client_id,
          COUNT(DISTINCT pi.project_id) AS project_count,
          AVG(SAFE_CAST(REGEXP_REPLACE(COALESCE(pr.pct_on_time, ''), r'[^0-9.]', '') AS FLOAT64)) AS otd_pct
        FROM project_ids pi
        LEFT JOIN \`${projectId}.notion_ops.proyectos\` pr
          ON pr.notion_page_id = pi.project_id
        GROUP BY pi.client_id
      ),
      module_agg AS (
        SELECT
          csm.client_id,
          ARRAY_AGG(DISTINCT csm.module_code IGNORE NULLS ORDER BY csm.module_code) AS business_lines
        FROM \`${projectId}.greenhouse.client_service_modules\` csm
        INNER JOIN \`${projectId}.greenhouse.service_modules\` sm
          ON sm.module_code = csm.module_code AND sm.module_kind = 'business_line' AND sm.active = TRUE
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
        COALESCE(ph.project_count, 0) AS project_count
      FROM active_clients ac
      LEFT JOIN task_health th ON th.client_id = ac.client_id
      LEFT JOIN project_health ph ON ph.client_id = ac.client_id
      LEFT JOIN module_agg ma ON ma.client_id = ac.client_id
      ORDER BY th.rpa_avg DESC NULLS LAST
    `
  })

  return (rows as Record<string, unknown>[]).map(row => ({
    clientId: String(row.client_id ?? ''),
    clientName: String(row.client_name ?? ''),
    businessLines: normalizeStringArray(row.business_lines),
    rpaAvg: toNullableNumber(row.rpa_avg),
    otdPct: toNullableNumber(row.otd_pct),
    assetsActivos: toNumber(row.assets_activos),
    feedbackPendiente: toNumber(row.feedback_pendiente),
    projectCount: toNumber(row.project_count),
    isInternal: String(row.client_id ?? '') === 'efeonce'
  }))
}

export const getAgencyWeeklyActivity = async (): Promise<AgencyChartWeeklyPoint[]> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      WITH active_clients AS (
        SELECT notion_project_ids FROM \`${projectId}.greenhouse.clients\`
        WHERE active = TRUE AND tenant_type = 'client'
      ),
      project_ids AS (
        SELECT p AS project_id
        FROM active_clients, UNNEST(notion_project_ids) AS p
      )
      SELECT
        DATE_TRUNC(DATE(t.done_at), WEEK(MONDAY)) AS week_start,
        COUNT(*) AS completed
      FROM \`${projectId}.notion_ops.tareas\` t
      WHERE t.proyecto IN (SELECT project_id FROM project_ids)
        AND t.estado = 'Listo'
        AND t.done_at IS NOT NULL
        AND DATE(t.done_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 WEEK)
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
      WITH active_clients AS (
        SELECT notion_project_ids FROM \`${projectId}.greenhouse.clients\`
        WHERE active = TRUE AND tenant_type = 'client'
      ),
      project_ids AS (
        SELECT p AS project_id FROM active_clients, UNNEST(notion_project_ids) AS p
      )
      SELECT
        t.estado AS group_key,
        COUNT(*) AS item_count
      FROM \`${projectId}.notion_ops.tareas\` t
      WHERE t.proyecto IN (SELECT project_id FROM project_ids)
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
        SELECT
          tm.member_id,
          tm.display_name,
          tm.role_title,
          COALESCE(SUM(ta.fte_allocation), 0) AS fte_allocation
        FROM \`${projectId}.greenhouse.team_members\` tm
        LEFT JOIN \`${projectId}.greenhouse.client_team_assignments\` ta
          ON ta.member_id = tm.member_id AND ta.active = TRUE
        WHERE tm.active = TRUE
        GROUP BY tm.member_id, tm.display_name, tm.role_title
        ORDER BY fte_allocation DESC
      `
    })

    const members: AgencyCapacityMember[] = (rows as Record<string, unknown>[]).map(row => ({
      memberId: String(row.member_id ?? ''),
      displayName: String(row.display_name ?? ''),
      roleTitle: String(row.role_title ?? ''),
      fteAllocation: toNumber(row.fte_allocation),
      spaceAllocations: []
    }))

    const totalFte = Number(members.reduce((sum, m) => sum + m.fteAllocation, 0).toFixed(1))
    const maxFte = members.length * 1.0
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
