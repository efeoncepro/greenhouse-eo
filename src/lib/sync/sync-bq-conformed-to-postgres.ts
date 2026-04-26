import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

import {
  projectNotionDeliveryToPostgres,
  type ProjectProjectionRow,
  type SprintProjectionRow,
  type TaskProjectionRow
} from './project-notion-delivery-to-postgres'

/**
 * Drain BQ `greenhouse_conformed.delivery_*` → Postgres `greenhouse_delivery.*`
 * **independently** of whether the upstream BQ raw → conformed cycle ran.
 *
 * This step closes a real architectural gap: `runNotionConformedCycle()`
 * short-circuits when BQ conformed is already up to date for the requested
 * spaces (`"Conformed sync already current for requested spaces; write
 * skipped"`). Any PG-projection step nested inside that path is also skipped —
 * leaving PG stale even when BQ is fresh. Before this module, the workaround
 * was the manual ad-hoc script `pnpm sync:source-runtime-projections` which
 * had no schedule, so PG drifted 24+ days behind in production.
 *
 * Use cases:
 *  - **Daily backfill**: ops-worker `/notion-conformed/sync` invokes this AFTER
 *    `runNotionSyncOrchestration()` regardless of whether BQ was written.
 *  - **Recovery**: re-run on demand to bring PG in sync without re-pulling
 *    Notion raw or rewriting BQ conformed.
 *  - **Standalone**: callable from any admin/cron path that needs PG fresh.
 *
 * **Idempotent** — UPSERT by `notion_*_id` makes re-runs a no-op for
 * unchanged rows. Safe to chain after the BQ-side cycle without race risk.
 *
 * **Safe under concurrent writers**: per-row UPSERTs, no table locks.
 *
 * **Defaults to all active spaces** when `targetSpaceIds` is null.
 */

interface BqProjectRow {
  project_source_id: string | null
  project_database_source_id: string | null
  space_id: string | null
  client_id: string | null
  module_code: string | null
  module_id: string | null
  project_name: string | null
  project_status: string | null
  project_summary: string | null
  completion_label: string | null
  on_time_pct_source: string | number | null
  avg_rpa_source: string | number | null
  project_phase: string | null
  owner_member_id: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  page_url: string | null
  is_deleted: boolean | null
  last_edited_time: { value?: string } | string | null
  synced_at: { value?: string } | string | null
  payload_hash: string | null
}

interface BqSprintRow {
  sprint_source_id: string | null
  project_source_id: string | null
  project_database_source_id: string | null
  space_id: string | null
  sprint_name: string | null
  sprint_status: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  completed_tasks_count: string | number | null
  total_tasks_count: string | number | null
  completion_pct_source: string | number | null
  page_url: string | null
  is_deleted: boolean | null
  last_edited_time: { value?: string } | string | null
  synced_at: { value?: string } | string | null
  payload_hash: string | null
}

interface BqTaskRow {
  task_source_id: string | null
  project_source_id: string | null
  project_source_ids: string[] | null
  sprint_source_id: string | null
  space_id: string | null
  client_id: string | null
  module_id: string | null
  module_code: string | null
  assignee_member_id: string | null
  assignee_source_id: string | null
  assignee_member_ids: string[] | null
  project_database_source_id: string | null
  task_name: string | null
  task_status: string | null
  task_phase: string | null
  task_priority: string | null
  completion_label: string | null
  delivery_compliance: string | null
  days_late: string | number | null
  rescheduled_days: string | number | null
  is_rescheduled: boolean | null
  performance_indicator_label: string | null
  performance_indicator_code: string | null
  client_change_round_label: string | null
  client_change_round_final: string | number | null
  rpa_semaphore_source: string | null
  rpa_value: string | number | null
  frame_versions: string | number | null
  frame_comments: string | number | null
  open_frame_comments: string | number | null
  client_review_open: boolean | null
  workflow_review_open: boolean | null
  blocker_count: string | number | null
  last_frame_comment: string | null
  tarea_principal_ids: string[] | null
  subtareas_ids: string[] | null
  original_due_date: { value?: string } | string | null
  execution_time_label: string | null
  changes_time_label: string | null
  review_time_label: string | null
  workflow_change_round: string | number | null
  due_date: { value?: string } | string | null
  completed_at: { value?: string } | string | null
  page_url: string | null
  is_deleted: boolean | null
  last_edited_time: { value?: string } | string | null
  synced_at: { value?: string } | string | null
  payload_hash: string | null
  created_at: { value?: string } | string | null
}

const toIsoString = (value: { value?: string } | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value || null

  return typeof value.value === 'string' ? value.value : null
}

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

/**
 * BQ stores some Notion-derived metrics as STRING (formulas) which can be
 * fractional (e.g. `days_late = 0.1176...`). The PG `greenhouse_delivery.*`
 * tables type these as INTEGER, so we truncate at the writer boundary. Using
 * `Math.trunc` (not `Math.round`) to preserve the "days passed so far" semantic
 * for `days_late` — `0.5` should be `0 days late`, not `1`.
 */
const toInteger = (value: string | number | null | undefined): number | null => {
  const n = toNumber(value)

  if (n === null) return null

  return Math.trunc(n)
}

const toBool = (value: boolean | null | undefined): boolean => {
  if (value === true) return true

  return false
}

const buildSpaceFilter = (column: string, spaceIds: string[] | null): string => {
  if (!spaceIds || spaceIds.length === 0) return ''
  const escaped = spaceIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')

  return ` AND ${column} IN (${escaped})`
}

export interface SyncBqConformedToPostgresInput {
  syncRunId?: string
  targetSpaceIds?: string[] | null
  replaceMissingForSpaces?: boolean
}

export interface SyncBqConformedToPostgresResult {
  syncRunId: string
  bqProjectsRead: number
  bqSprintsRead: number
  bqTasksRead: number
  pgProjectsWritten: number
  pgSprintsWritten: number
  pgTasksWritten: number
  pgProjectsMarkedDeleted: number
  pgSprintsMarkedDeleted: number
  pgTasksMarkedDeleted: number
  durationMs: number
}

export const syncBqConformedToPostgres = async ({
  syncRunId = `bq-pg-${randomUUID()}`,
  targetSpaceIds = null,
  replaceMissingForSpaces = true
}: SyncBqConformedToPostgresInput = {}): Promise<SyncBqConformedToPostgresResult> => {
  const startedAt = Date.now()
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const projectsFilter = buildSpaceFilter('space_id', targetSpaceIds)
  const sprintsFilter = buildSpaceFilter('space_id', targetSpaceIds)
  const tasksFilter = buildSpaceFilter('space_id', targetSpaceIds)

  const [bqProjects, bqSprints, bqTasks] = await Promise.all([
    bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse_conformed.delivery_projects\` WHERE TRUE${projectsFilter}`
    }).then(([rows]) => rows as BqProjectRow[]),
    bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse_conformed.delivery_sprints\` WHERE TRUE${sprintsFilter}`
    }).then(([rows]) => rows as BqSprintRow[]),
    bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` WHERE TRUE${tasksFilter}`
    }).then(([rows]) => rows as BqTaskRow[])
  ])

  const projects: ProjectProjectionRow[] = bqProjects.map(row => ({
    project_source_id: row.project_source_id,
    space_id: row.space_id,
    client_id: row.client_id,
    module_id: row.module_id ?? null,
    project_database_source_id: row.project_database_source_id,
    project_name: row.project_name,
    project_status: row.project_status,
    project_summary: row.project_summary,
    completion_label: row.completion_label,
    on_time_pct_source: toNumber(row.on_time_pct_source),
    avg_rpa_source: toNumber(row.avg_rpa_source),
    project_phase: row.project_phase,
    owner_member_id: row.owner_member_id,
    start_date: toIsoString(row.start_date),
    end_date: toIsoString(row.end_date),
    page_url: row.page_url,
    is_deleted: toBool(row.is_deleted),
    last_edited_time: toIsoString(row.last_edited_time),
    synced_at: toIsoString(row.synced_at) ?? new Date().toISOString(),
    sync_run_id: syncRunId,
    payload_hash: row.payload_hash ?? ''
  }))

  const sprints: SprintProjectionRow[] = bqSprints.map(row => ({
    sprint_source_id: row.sprint_source_id,
    project_source_id: row.project_source_id,
    space_id: row.space_id,
    project_database_source_id: row.project_database_source_id,
    sprint_name: row.sprint_name,
    sprint_status: row.sprint_status,
    start_date: toIsoString(row.start_date),
    end_date: toIsoString(row.end_date),
    completed_tasks_count: toInteger(row.completed_tasks_count),
    total_tasks_count: toInteger(row.total_tasks_count),
    completion_pct_source: toNumber(row.completion_pct_source),
    page_url: row.page_url,
    is_deleted: toBool(row.is_deleted),
    last_edited_time: toIsoString(row.last_edited_time),
    synced_at: toIsoString(row.synced_at) ?? new Date().toISOString(),
    sync_run_id: syncRunId,
    payload_hash: row.payload_hash ?? ''
  }))

  const tasks: TaskProjectionRow[] = bqTasks.map(row => ({
    task_source_id: row.task_source_id,
    project_source_id: row.project_source_id,
    project_source_ids: row.project_source_ids,
    sprint_source_id: row.sprint_source_id,
    space_id: row.space_id,
    client_id: row.client_id,
    module_id: row.module_id,
    module_code: row.module_code,
    assignee_member_id: row.assignee_member_id,
    assignee_source_id: row.assignee_source_id,
    assignee_member_ids: row.assignee_member_ids,
    project_database_source_id: row.project_database_source_id,
    task_name: row.task_name,
    task_status: row.task_status,
    task_phase: row.task_phase,
    task_priority: row.task_priority,
    completion_label: row.completion_label,
    delivery_compliance: row.delivery_compliance,
    days_late: toInteger(row.days_late),
    rescheduled_days: toInteger(row.rescheduled_days),
    is_rescheduled: toBool(row.is_rescheduled),
    performance_indicator_label: row.performance_indicator_label,
    performance_indicator_code: row.performance_indicator_code,
    client_change_round_label: row.client_change_round_label,
    client_change_round_final: toInteger(row.client_change_round_final),
    rpa_semaphore_source: row.rpa_semaphore_source,
    rpa_value: toNumber(row.rpa_value),
    frame_versions: toInteger(row.frame_versions),
    frame_comments: toInteger(row.frame_comments),
    open_frame_comments: toInteger(row.open_frame_comments),
    client_review_open: toBool(row.client_review_open),
    workflow_review_open: toBool(row.workflow_review_open),
    blocker_count: toInteger(row.blocker_count) ?? 0,
    last_frame_comment: row.last_frame_comment,
    tarea_principal_ids: row.tarea_principal_ids,
    subtareas_ids: row.subtareas_ids,
    original_due_date: toIsoString(row.original_due_date),
    execution_time_label: row.execution_time_label,
    changes_time_label: row.changes_time_label,
    review_time_label: row.review_time_label,
    workflow_change_round: toInteger(row.workflow_change_round),
    due_date: toIsoString(row.due_date),
    completed_at: toIsoString(row.completed_at),
    page_url: row.page_url,
    is_deleted: toBool(row.is_deleted),
    last_edited_time: toIsoString(row.last_edited_time),
    synced_at: toIsoString(row.synced_at) ?? new Date().toISOString(),
    sync_run_id: syncRunId,
    payload_hash: row.payload_hash ?? '',
    created_at: toIsoString(row.created_at)
  }))

  const pgResult = await projectNotionDeliveryToPostgres({
    syncRunId,
    projects,
    sprints,
    tasks,
    targetSpaceIds,
    replaceMissingForSpaces
  })

  return {
    syncRunId,
    bqProjectsRead: bqProjects.length,
    bqSprintsRead: bqSprints.length,
    bqTasksRead: bqTasks.length,
    pgProjectsWritten: pgResult.projectsWritten,
    pgSprintsWritten: pgResult.sprintsWritten,
    pgTasksWritten: pgResult.tasksWritten,
    pgProjectsMarkedDeleted: pgResult.projectsMarkedDeleted,
    pgSprintsMarkedDeleted: pgResult.sprintsMarkedDeleted,
    pgTasksMarkedDeleted: pgResult.tasksMarkedDeleted,
    durationMs: Date.now() - startedAt
  }
}
