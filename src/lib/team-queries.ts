import 'server-only'

import { buildAccountTeam } from '@/lib/dashboard/tenant-dashboard-overrides'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type {
  TeamByProjectMember,
  TeamByProjectPayload,
  TeamBySprintMember,
  TeamBySprintPayload,
  TeamCapacityMember,
  TeamCapacityPayload,
  TeamContactChannel,
  TeamDataSource,
  TeamMemberResponse,
  TeamMembersPayload,
  TeamRoleCategory
} from '@/types/team'

type TeamQueryViewer = {
  clientId: string
  projectIds: string[]
  businessLines: string[]
  serviceModules: string[]
}

type TeamAssignmentRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  role_title: string | null
  role_category: string | null
  relevance_note: string | null
  contact_channel: string | null
  contact_handle: string | null
  fte_allocation: number | string | null
  start_date: { value?: string } | string | null
  notion_display_name: string | null
  notion_user_id: string | null
}

type TeamAssignment = {
  memberId: string
  displayName: string
  email: string
  avatarUrl: string | null
  roleTitle: string
  roleCategory: TeamRoleCategory
  relevanceNote: string | null
  contactChannel: TeamContactChannel
  contactHandle: string | null
  fteAllocation: number
  startDate: string | null
  notionDisplayName: string | null
  notionUserId: string | null
}

type OperationalLoadRow = {
  responsable_nombre: string | null
  responsable_email: string | null
  responsable_notion_id: string | null
  total_assets: number | string | null
  active_assets: number | string | null
  completed_assets: number | string | null
  avg_rpa: number | string | null
  project_count: number | string | null
}

type ProjectBreakdownRow = {
  responsable_nombre: string | null
  responsable_email: string | null
  responsable_notion_id: string | null
  project_id: string | null
  project_name: string | null
  asset_count: number | string | null
  active_count: number | string | null
}

type ProjectTeamRow = {
  responsable_nombre: string | null
  responsable_email: string | null
  responsable_notion_id: string | null
  total_assets: number | string | null
  active_assets: number | string | null
  completed_assets: number | string | null
  avg_rpa: number | string | null
  in_review: number | string | null
  changes_requested: number | string | null
}

type SprintContextRow = {
  notion_page_id: string | null
  sprint_name: string | null
  sprint_status: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  total_tasks: number | string | null
  completed_tasks: number | string | null
}

type SprintTeamRow = {
  responsable_nombre: string | null
  responsable_email: string | null
  responsable_notion_id: string | null
  total_in_sprint: number | string | null
  completed: number | string | null
  pending: number | string | null
  avg_rpa: number | string | null
}

const roleOrder: Record<TeamRoleCategory, number> = {
  account: 1,
  operations: 2,
  strategy: 3,
  design: 4,
  development: 5,
  media: 6,
  unknown: 7
}

const throughputBenchmarks: Record<TeamRoleCategory, number> = {
  account: 30,
  operations: 30,
  strategy: 16,
  design: 20,
  development: 14,
  media: 24,
  unknown: 18
}

const completedStatuses = ['Listo', 'Done', 'Finalizado', 'Completado']
const inactiveStatuses = [...completedStatuses, 'Cancelado', 'Cancelada', 'Cancelled', 'Canceled']

const periodFormatter = new Intl.DateTimeFormat('es-CL', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Santiago'
})

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDateString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  return typeof value.value === 'string' ? value.value.slice(0, 10) : null
}

const roundToTenths = (value: number) => Math.round(value * 10) / 10

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

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

const toContactChannel = (value: string | null | undefined): TeamContactChannel => {
  if (value === 'slack' || value === 'email') {
    return value
  }

  return 'teams'
}

const sortAssignments = <T extends { roleCategory: TeamRoleCategory; displayName: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const roleDelta = roleOrder[left.roleCategory] - roleOrder[right.roleCategory]

    return roleDelta !== 0 ? roleDelta : left.displayName.localeCompare(right.displayName, 'es')
  })

const toLegacyMemberResponse = (viewer: TeamQueryViewer): TeamMembersPayload => {
  const legacy = buildAccountTeam(viewer.clientId, [])

  const members: TeamMemberResponse[] = legacy.members.map(member => ({
    memberId: member.id,
    displayName: member.name,
    email: '',
    avatarUrl: member.avatarPath || null,
    roleTitle: member.role,
    roleCategory: inferRoleCategory(member.role),
    relevanceNote: null,
    contactChannel: 'teams',
    contactHandle: null,
    fteAllocation: roundToTenths((member.monthlyHours || 0) / 160),
    startDate: null
  }))

  return {
    members: sortAssignments(members),
    footer: {
      serviceLines: viewer.businessLines,
      modality: viewer.serviceModules.length > 0 ? 'On-Going' : null,
      totalFte: roundToTenths(legacy.totalMonthlyHours / 160)
    },
    source: 'legacy_override'
  }
}

const toCapacityFallback = (viewer: TeamQueryViewer): TeamCapacityPayload => {
  const legacy = buildAccountTeam(viewer.clientId, [])
  const legacyMembers = toLegacyMemberResponse(viewer)
  const totalHoursMonth = Math.round(legacyMembers.footer.totalFte * 160)
  const utilizationPercent = clampPercent(legacy.averageAllocationPct || 0)

  const members: TeamCapacityMember[] = legacyMembers.members.map(member => ({
    memberId: member.memberId,
    displayName: member.displayName,
    avatarUrl: member.avatarUrl,
    roleTitle: member.roleTitle,
    roleCategory: member.roleCategory,
    fteAllocation: member.fteAllocation,
    activeAssets: 0,
    completedAssets: 0,
    avgRpa: null,
    projectCount: 0,
    projectBreakdown: []
  }))

  return {
    summary: {
      totalFte: legacyMembers.footer.totalFte,
      totalHoursMonth,
      utilizedHoursMonth: Math.round((totalHoursMonth * utilizationPercent) / 100),
      utilizationPercent,
      memberCount: members.length
    },
    members,
    period: periodFormatter.format(new Date()),
    source: 'legacy_override',
    hasOperationalMetrics: false
  }
}

const createSyntheticMemberId = (displayName: string, email: string | null) => {
  const base = normalizeMatchValue(email || displayName).replace(/[^a-z0-9]+/g, '-')

  return base ? `team-${base}` : 'team-unknown'
}

const isMissingBigQueryEntityError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : ''

  return code === '404' || /not found: table/i.test(message) || /dataset .* was not found/i.test(message)
}

const runQuery = async <T>(query: string, params: Record<string, unknown>) => {
  const [rows] = await getBigQueryClient().query({
    query,
    params
  })

  return rows as T[]
}

const getTableColumns = async (dataset: string, tableName: string) => {
  const projectId = getBigQueryProjectId()

  try {
    const rows = await runQuery<{ column_name: string | null }>(
      `
        SELECT column_name
        FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = @tableName
      `,
      { tableName }
    )

    return new Set(rows.map(row => row.column_name || '').filter(Boolean))
  } catch (error) {
    if (isMissingBigQueryEntityError(error)) {
      return new Set<string>()
    }

    throw error
  }
}

const getAssignmentRows = async (clientId: string) => {
  const projectId = getBigQueryProjectId()

  return runQuery<TeamAssignmentRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.email,
        m.avatar_url,
        COALESCE(a.role_title_override, m.role_title) AS role_title,
        m.role_category,
        COALESCE(a.relevance_note_override, m.relevance_note) AS relevance_note,
        COALESCE(a.contact_channel_override, m.contact_channel) AS contact_channel,
        COALESCE(a.contact_handle_override, m.contact_handle) AS contact_handle,
        a.fte_allocation,
        a.start_date,
        m.notion_display_name,
        m.notion_user_id
      FROM \`${projectId}.greenhouse.client_team_assignments\` AS a
      INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = a.member_id
      WHERE a.client_id = @clientId
        AND a.active = TRUE
        AND m.active = TRUE
        AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE())
      ORDER BY
        CASE m.role_category
          WHEN 'account' THEN 1
          WHEN 'operations' THEN 2
          WHEN 'strategy' THEN 3
          WHEN 'design' THEN 4
          WHEN 'development' THEN 5
          WHEN 'media' THEN 6
          ELSE 7
        END,
        m.display_name
    `,
    { clientId }
  )
}

const toAssignments = (rows: TeamAssignmentRow[]): TeamAssignment[] =>
  rows.map(row => ({
    memberId: row.member_id || createSyntheticMemberId(row.display_name || '', row.email),
    displayName: row.display_name || row.email || 'Efeonce Team',
    email: row.email || '',
    avatarUrl: row.avatar_url || null,
    roleTitle: row.role_title || 'Efeonce Team',
    roleCategory: inferRoleCategory(row.role_category || row.role_title),
    relevanceNote: row.relevance_note || null,
    contactChannel: toContactChannel(row.contact_channel),
    contactHandle: row.contact_handle || null,
    fteAllocation: roundToTenths(toNumber(row.fte_allocation)),
    startDate: toDateString(row.start_date),
    notionDisplayName: row.notion_display_name || null,
    notionUserId: row.notion_user_id || null
  }))

const buildLookup = (assignments: TeamAssignment[]) => {
  const lookup = new Map<string, TeamAssignment>()

  for (const assignment of assignments) {
    const keys = [
      assignment.notionUserId,
      assignment.email,
      assignment.notionDisplayName,
      assignment.displayName
    ]

    for (const key of keys) {
      const normalized = normalizeMatchValue(key)

      if (normalized && !lookup.has(normalized)) {
        lookup.set(normalized, assignment)
      }
    }
  }

  return lookup
}

const matchAssignment = (
  lookup: Map<string, TeamAssignment>,
  signal: { responsableNombre: string | null; responsableEmail: string | null; responsableNotionId: string | null }
) => {
  const keys = [signal.responsableNotionId, signal.responsableEmail, signal.responsableNombre]

  for (const key of keys) {
    const normalized = normalizeMatchValue(key)

    if (normalized && lookup.has(normalized)) {
      return lookup.get(normalized) || null
    }
  }

  return null
}

const getOperationalColumns = async () => getTableColumns('notion_ops', 'tareas')

const hasOperationalColumns = (columns: Set<string>) => columns.has('responsables_names') || columns.has('responsable_texto')

const buildResponsableSignals = (columns: Set<string>) => {
  const responsableNombreExpr = columns.has('responsables_names')
    ? columns.has('responsable_texto')
      ? 'COALESCE(t.responsables_names[SAFE_OFFSET(0)], t.responsable_texto)'
      : 't.responsables_names[SAFE_OFFSET(0)]'
    : 't.responsable_texto'

  const responsableEmailSelect = 'CAST(NULL AS STRING) AS responsable_email,'

  const responsableNotionIdSelect = columns.has('responsables_ids')
    ? 't.responsables_ids[SAFE_OFFSET(0)] AS responsable_notion_id,'
    : 'CAST(NULL AS STRING) AS responsable_notion_id,'

  return {
    responsableNombreExpr,
    responsableNombreSelect: `${responsableNombreExpr} AS responsable_nombre,`,
    responsableEmailSelect,
    responsableNotionIdSelect
  }
}

const getOperationalLoadRows = async (projectIds: string[], columns: Set<string>) => {
  if (projectIds.length === 0 || !hasOperationalColumns(columns)) {
    return [] as OperationalLoadRow[]
  }

  const projectId = getBigQueryProjectId()

  const {
    responsableNombreExpr,
    responsableNombreSelect,
    responsableEmailSelect,
    responsableNotionIdSelect
  } = buildResponsableSignals(columns)

  return runQuery<OperationalLoadRow>(
    `
      SELECT
        ${responsableNombreSelect}
        ${responsableEmailSelect}
        ${responsableNotionIdSelect}
        COUNT(*) AS total_assets,
        COUNTIF(t.estado NOT IN UNNEST(@inactiveStatuses)) AS active_assets,
        COUNTIF(t.estado IN UNNEST(@completedStatuses)) AS completed_assets,
        ROUND(AVG(CASE WHEN SAFE_CAST(t.frame_versions AS FLOAT64) > 0 THEN SAFE_CAST(t.frame_versions AS FLOAT64) END), 2) AS avg_rpa,
        COUNT(DISTINCT t.proyecto) AS project_count
      FROM \`${projectId}.notion_ops.tareas\` AS t
      WHERE t.proyecto IN UNNEST(@projectIds)
        AND ${responsableNombreExpr} IS NOT NULL
        AND TRIM(${responsableNombreExpr}) != ''
      GROUP BY responsable_nombre, responsable_email, responsable_notion_id
    `,
    {
      projectIds,
      inactiveStatuses,
      completedStatuses
    }
  )
}

const getProjectBreakdownRows = async (projectIds: string[], columns: Set<string>) => {
  if (projectIds.length === 0 || !hasOperationalColumns(columns)) {
    return [] as ProjectBreakdownRow[]
  }

  const projectId = getBigQueryProjectId()

  const {
    responsableNombreExpr,
    responsableNombreSelect,
    responsableEmailSelect,
    responsableNotionIdSelect
  } = buildResponsableSignals(columns)

  return runQuery<ProjectBreakdownRow>(
    `
      SELECT
        ${responsableNombreSelect}
        ${responsableEmailSelect}
        ${responsableNotionIdSelect}
        t.proyecto AS project_id,
        COALESCE(p.nombre_del_proyecto, t.proyecto) AS project_name,
        COUNT(*) AS asset_count,
        COUNTIF(t.estado NOT IN UNNEST(@inactiveStatuses)) AS active_count
      FROM \`${projectId}.notion_ops.tareas\` AS t
      LEFT JOIN \`${projectId}.notion_ops.proyectos\` AS p
        ON p.notion_page_id = t.proyecto
      WHERE t.proyecto IN UNNEST(@projectIds)
        AND ${responsableNombreExpr} IS NOT NULL
        AND TRIM(${responsableNombreExpr}) != ''
      GROUP BY responsable_nombre, responsable_email, responsable_notion_id, project_id, project_name
      ORDER BY responsable_nombre, active_count DESC, asset_count DESC
    `,
    {
      projectIds,
      inactiveStatuses
    }
  )
}

const buildCapacityMembers = (
  assignments: TeamAssignment[],
  loadRows: OperationalLoadRow[],
  projectBreakdownRows: ProjectBreakdownRow[]
) => {
  const lookup = buildLookup(assignments)
  const breakdownByMemberId = new Map<string, TeamCapacityMember['projectBreakdown']>()

  for (const row of projectBreakdownRows) {
    const assignment = matchAssignment(lookup, {
      responsableNombre: row.responsable_nombre,
      responsableEmail: row.responsable_email,
      responsableNotionId: row.responsable_notion_id
    })

    if (!assignment) {
      continue
    }

    const current = breakdownByMemberId.get(assignment.memberId) || []

    current.push({
      projectId: row.project_id,
      projectName: row.project_name || row.project_id || 'Proyecto',
      assetCount: toNumber(row.asset_count),
      activeCount: toNumber(row.active_count)
    })

    breakdownByMemberId.set(assignment.memberId, current)
  }

  return sortAssignments(
    assignments.map(assignment => {
      const loadRow =
        loadRows.find(row => {
          const matched = matchAssignment(lookup, {
            responsableNombre: row.responsable_nombre,
            responsableEmail: row.responsable_email,
            responsableNotionId: row.responsable_notion_id
          })

          return matched?.memberId === assignment.memberId
        }) || null

      const projectBreakdown = breakdownByMemberId.get(assignment.memberId) || []

      return {
        memberId: assignment.memberId,
        displayName: assignment.displayName,
        avatarUrl: assignment.avatarUrl,
        roleTitle: assignment.roleTitle,
        roleCategory: assignment.roleCategory,
        fteAllocation: assignment.fteAllocation,
        activeAssets: toNumber(loadRow?.active_assets),
        completedAssets: toNumber(loadRow?.completed_assets),
        avgRpa: toNullableNumber(loadRow?.avg_rpa),
        projectCount: Math.max(projectBreakdown.length, toNumber(loadRow?.project_count)),
        projectBreakdown
      }
    })
  )
}

const getUtilizationPercent = (members: TeamCapacityMember[]) => {
  const activeAssets = members.reduce((sum, member) => sum + member.activeAssets, 0)

  const expectedMonthlyThroughput = members.reduce(
    (sum, member) => sum + member.fteAllocation * throughputBenchmarks[member.roleCategory],
    0
  )

  if (expectedMonthlyThroughput <= 0) {
    return 0
  }

  return clampPercent((activeAssets / expectedMonthlyThroughput) * 100)
}

const getProjectName = async (projectIdValue: string) => {
  const projectId = getBigQueryProjectId()

  const rows = await runQuery<{ project_name: string | null }>(
    `
      SELECT COALESCE(nombre_del_proyecto, notion_page_id) AS project_name
      FROM \`${projectId}.notion_ops.proyectos\`
      WHERE notion_page_id = @projectId
      LIMIT 1
    `,
    { projectId: projectIdValue }
  )

  return rows[0]?.project_name || null
}

const getProjectTeamRows = async (projectIdValue: string, columns: Set<string>) => {
  if (!hasOperationalColumns(columns)) {
    return [] as ProjectTeamRow[]
  }

  const projectId = getBigQueryProjectId()

  const {
    responsableNombreExpr,
    responsableNombreSelect,
    responsableEmailSelect,
    responsableNotionIdSelect
  } = buildResponsableSignals(columns)

  return runQuery<ProjectTeamRow>(
    `
      SELECT
        ${responsableNombreSelect}
        ${responsableEmailSelect}
        ${responsableNotionIdSelect}
        COUNT(*) AS total_assets,
        COUNTIF(t.estado NOT IN UNNEST(@inactiveStatuses)) AS active_assets,
        COUNTIF(t.estado IN UNNEST(@completedStatuses)) AS completed_assets,
        ROUND(AVG(CASE WHEN SAFE_CAST(t.frame_versions AS FLOAT64) > 0 THEN SAFE_CAST(t.frame_versions AS FLOAT64) END), 2) AS avg_rpa,
        COUNTIF(t.estado IN ('Listo para revisión', 'Listo para revision')) AS in_review,
        COUNTIF(t.estado = 'Cambios Solicitados') AS changes_requested
      FROM \`${projectId}.notion_ops.tareas\` AS t
      WHERE t.proyecto = @projectId
        AND ${responsableNombreExpr} IS NOT NULL
        AND TRIM(${responsableNombreExpr}) != ''
      GROUP BY responsable_nombre, responsable_email, responsable_notion_id
      ORDER BY active_assets DESC, total_assets DESC
    `,
    {
      projectId: projectIdValue,
      inactiveStatuses,
      completedStatuses
    }
  )
}

const enrichProjectMember = (
  row: ProjectTeamRow,
  lookup: Map<string, TeamAssignment>
): TeamByProjectMember => {
  const assignment = matchAssignment(lookup, {
    responsableNombre: row.responsable_nombre,
    responsableEmail: row.responsable_email,
    responsableNotionId: row.responsable_notion_id
  })

  return {
    memberId: assignment?.memberId || createSyntheticMemberId(row.responsable_nombre || '', row.responsable_email),
    displayName: assignment?.displayName || row.responsable_nombre || 'Efeonce Team',
    email: assignment?.email || row.responsable_email || null,
    avatarUrl: assignment?.avatarUrl || null,
    roleTitle: assignment?.roleTitle || 'Efeonce Team',
    roleCategory: assignment?.roleCategory || 'unknown',
    totalAssets: toNumber(row.total_assets),
    activeAssets: toNumber(row.active_assets),
    completedAssets: toNumber(row.completed_assets),
    avgRpa: toNullableNumber(row.avg_rpa),
    inReview: toNumber(row.in_review),
    changesRequested: toNumber(row.changes_requested)
  }
}

const getSprintContext = async (sprintId: string, projectIds: string[]) => {
  const projectId = getBigQueryProjectId()

  const rows = await runQuery<SprintContextRow>(
    `
      WITH sprint_tasks AS (
        SELECT
          COUNT(*) AS total_tasks,
          COUNTIF(t.estado IN UNNEST(@completedStatuses)) AS completed_tasks
        FROM \`${projectId}.notion_ops.tareas\` AS t
        WHERE t.proyecto IN UNNEST(@projectIds)
          AND (
            @sprintId IN UNNEST(IFNULL(t.sprint_ids, ARRAY<STRING>[]))
            OR t.sprint = @sprintId
          )
      )
      SELECT
        s.notion_page_id,
        s.nombre_del_sprint AS sprint_name,
        s.estado_del_sprint AS sprint_status,
        s.fechas AS start_date,
        s.fechas_end AS end_date,
        COALESCE(st.total_tasks, 0) AS total_tasks,
        COALESCE(st.completed_tasks, 0) AS completed_tasks
      FROM \`${projectId}.notion_ops.sprints\` AS s
      CROSS JOIN sprint_tasks AS st
      WHERE s.notion_page_id = @sprintId
      LIMIT 1
    `,
    {
      sprintId,
      projectIds,
      completedStatuses
    }
  )

  return rows[0] || null
}

const getSprintTeamRows = async (sprintId: string, projectIds: string[], columns: Set<string>) => {
  if (projectIds.length === 0 || !hasOperationalColumns(columns)) {
    return [] as SprintTeamRow[]
  }

  const projectId = getBigQueryProjectId()

  const {
    responsableNombreExpr,
    responsableNombreSelect,
    responsableEmailSelect,
    responsableNotionIdSelect
  } = buildResponsableSignals(columns)

  return runQuery<SprintTeamRow>(
    `
      SELECT
        ${responsableNombreSelect}
        ${responsableEmailSelect}
        ${responsableNotionIdSelect}
        COUNT(*) AS total_in_sprint,
        COUNTIF(t.estado IN UNNEST(@completedStatuses)) AS completed,
        COUNTIF(t.estado NOT IN UNNEST(@inactiveStatuses)) AS pending,
        ROUND(AVG(CASE WHEN SAFE_CAST(t.frame_versions AS FLOAT64) > 0 THEN SAFE_CAST(t.frame_versions AS FLOAT64) END), 2) AS avg_rpa
      FROM \`${projectId}.notion_ops.tareas\` AS t
      WHERE t.proyecto IN UNNEST(@projectIds)
        AND (
          @sprintId IN UNNEST(IFNULL(t.sprint_ids, ARRAY<STRING>[]))
          OR t.sprint = @sprintId
        )
        AND ${responsableNombreExpr} IS NOT NULL
        AND TRIM(${responsableNombreExpr}) != ''
      GROUP BY responsable_nombre, responsable_email, responsable_notion_id
      ORDER BY completed DESC, total_in_sprint DESC
    `,
    {
      sprintId,
      projectIds,
      completedStatuses,
      inactiveStatuses
    }
  )
}

const enrichSprintMember = (row: SprintTeamRow, lookup: Map<string, TeamAssignment>): TeamBySprintMember => {
  const assignment = matchAssignment(lookup, {
    responsableNombre: row.responsable_nombre,
    responsableEmail: row.responsable_email,
    responsableNotionId: row.responsable_notion_id
  })

  return {
    memberId: assignment?.memberId || createSyntheticMemberId(row.responsable_nombre || '', row.responsable_email),
    displayName: assignment?.displayName || row.responsable_nombre || 'Efeonce Team',
    email: assignment?.email || row.responsable_email || null,
    avatarUrl: assignment?.avatarUrl || null,
    roleTitle: assignment?.roleTitle || 'Efeonce Team',
    roleCategory: assignment?.roleCategory || 'unknown',
    totalInSprint: toNumber(row.total_in_sprint),
    completed: toNumber(row.completed),
    pending: toNumber(row.pending),
    avgRpa: toNullableNumber(row.avg_rpa)
  }
}

const getAssignmentsOrFallback = async (viewer: TeamQueryViewer): Promise<{ assignments: TeamAssignment[]; source: TeamDataSource }> => {
  try {
    const assignments = toAssignments(await getAssignmentRows(viewer.clientId))

    return {
      assignments,
      source: 'team_assignments'
    }
  } catch (error) {
    if (!isMissingBigQueryEntityError(error)) {
      throw error
    }

    const fallback = toLegacyMemberResponse(viewer)

    return {
      assignments: fallback.members.map(member => ({
        memberId: member.memberId,
        displayName: member.displayName,
        email: member.email,
        avatarUrl: member.avatarUrl,
        roleTitle: member.roleTitle,
        roleCategory: member.roleCategory,
        relevanceNote: member.relevanceNote,
        contactChannel: member.contactChannel,
        contactHandle: member.contactHandle,
        fteAllocation: member.fteAllocation,
        startDate: member.startDate,
        notionDisplayName: null,
        notionUserId: null
      })),
      source: 'legacy_override'
    }
  }
}

export const getTeamMembers = async (viewer: TeamQueryViewer): Promise<TeamMembersPayload> => {
  try {
    const rows = await getAssignmentRows(viewer.clientId)
    const assignments = toAssignments(rows)

    return {
      members: assignments.map(assignment => ({
        memberId: assignment.memberId,
        displayName: assignment.displayName,
        email: assignment.email,
        avatarUrl: assignment.avatarUrl,
        roleTitle: assignment.roleTitle,
        roleCategory: assignment.roleCategory,
        relevanceNote: assignment.relevanceNote,
        contactChannel: assignment.contactChannel,
        contactHandle: assignment.contactHandle,
        fteAllocation: assignment.fteAllocation,
        startDate: assignment.startDate
      })),
      footer: {
        serviceLines: viewer.businessLines,
        modality: viewer.serviceModules.length > 0 ? 'On-Going' : null,
        totalFte: roundToTenths(assignments.reduce((sum, assignment) => sum + assignment.fteAllocation, 0))
      },
      source: 'team_assignments'
    }
  } catch (error) {
    if (!isMissingBigQueryEntityError(error)) {
      throw error
    }

    return toLegacyMemberResponse(viewer)
  }
}

export const getTeamCapacity = async (viewer: TeamQueryViewer): Promise<TeamCapacityPayload> => {
  const { assignments, source } = await getAssignmentsOrFallback(viewer)

  if (assignments.length === 0 && source === 'legacy_override') {
    return toCapacityFallback(viewer)
  }

  const operationalColumns = await getOperationalColumns()
  const loadRows = await getOperationalLoadRows(viewer.projectIds, operationalColumns)
  const projectBreakdownRows = await getProjectBreakdownRows(viewer.projectIds, operationalColumns)
  const members = buildCapacityMembers(assignments, loadRows, projectBreakdownRows)
  const totalFte = roundToTenths(members.reduce((sum, member) => sum + member.fteAllocation, 0))
  const totalHoursMonth = Math.round(totalFte * 160)
  const utilizationPercent = getUtilizationPercent(members)

  return {
    summary: {
      totalFte,
      totalHoursMonth,
      utilizedHoursMonth: Math.round((totalHoursMonth * utilizationPercent) / 100),
      utilizationPercent,
      memberCount: members.length
    },
    members,
    period: periodFormatter.format(new Date()),
    source,
    hasOperationalMetrics: hasOperationalColumns(operationalColumns)
  }
}

export const getTeamByProject = async (
  viewer: TeamQueryViewer,
  projectIdValue: string
): Promise<TeamByProjectPayload> => {
  const { assignments } = await getAssignmentsOrFallback(viewer)
  const lookup = buildLookup(assignments)
  const operationalColumns = await getOperationalColumns()

  if (!hasOperationalColumns(operationalColumns)) {
    return {
      projectId: projectIdValue,
      projectName: await getProjectName(projectIdValue),
      memberCount: 0,
      members: [],
      hasOperationalMetrics: false
    }
  }

  const [projectName, rows] = await Promise.all([getProjectName(projectIdValue), getProjectTeamRows(projectIdValue, operationalColumns)])
  const members = rows.map(row => enrichProjectMember(row, lookup))

  return {
    projectId: projectIdValue,
    projectName,
    memberCount: members.length,
    members,
    hasOperationalMetrics: true
  }
}

export const getTeamBySprint = async (
  viewer: TeamQueryViewer,
  sprintId: string
): Promise<TeamBySprintPayload> => {
  const { assignments } = await getAssignmentsOrFallback(viewer)
  const lookup = buildLookup(assignments)
  const operationalColumns = await getOperationalColumns()
  const sprintContext = await getSprintContext(sprintId, viewer.projectIds)

  if (!hasOperationalColumns(operationalColumns)) {
    return {
      sprintId,
      sprintName: sprintContext?.sprint_name || null,
      sprintStatus: sprintContext?.sprint_status || null,
      startDate: toDateString(sprintContext?.start_date || null),
      endDate: toDateString(sprintContext?.end_date || null),
      totalTasks: toNumber(sprintContext?.total_tasks),
      completedTasks: toNumber(sprintContext?.completed_tasks),
      memberCount: 0,
      members: [],
      hasOperationalMetrics: false
    }
  }

  const rows = await getSprintTeamRows(sprintId, viewer.projectIds, operationalColumns)
  const members = rows.map(row => enrichSprintMember(row, lookup))

  return {
    sprintId,
    sprintName: sprintContext?.sprint_name || null,
    sprintStatus: sprintContext?.sprint_status || null,
    startDate: toDateString(sprintContext?.start_date || null),
    endDate: toDateString(sprintContext?.end_date || null),
    totalTasks: toNumber(sprintContext?.total_tasks),
    completedTasks: toNumber(sprintContext?.completed_tasks),
    memberCount: members.length,
    members,
    hasOperationalMetrics: true
  }
}
