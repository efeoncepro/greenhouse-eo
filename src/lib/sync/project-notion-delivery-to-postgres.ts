import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

/**
 * Notion conformed → PostgreSQL projection
 * =========================================
 *
 * **The canonical PG writer for `greenhouse_delivery.{projects,tasks,sprints}`.**
 *
 * BEFORE this module: PG was only updated by the manual ad-hoc script
 * `pnpm sync:source-runtime-projections`, which had no schedule. PG drifted
 * 24+ days behind BQ conformed (e.g. 3,041 Sky tasks looked "untitled" in PG
 * because the projection never ran post `2026-04-02`, even though BQ conformed
 * had the resolved titles via the cascade).
 *
 * AFTER: this module is invoked by `runNotionConformedCycle()` immediately
 * after the BQ-conformed staged-swap write succeeds. One source of truth, one
 * cycle, no manual scripts to keep in sync.
 *
 * **Idempotent** via `ON CONFLICT (notion_*_id) DO UPDATE`. Re-running on the
 * same data is a no-op (rows that already match the latest payload_hash skip
 * the column writes and only bump `updated_at`).
 *
 * **Two write modes**:
 *  - `replaceAll: true` — wipes PG-side rows for the synced spaces before
 *    upserting (matches the BQ staged-swap semantics — anything not in the
 *    fresh batch is considered deleted in source). DEFAULT for full syncs.
 *  - `replaceAll: false` — pure UPSERT, no deletes. Used for partial syncs
 *    or recovery runs that touch a subset of spaces and shouldn't disturb
 *    the rest.
 *
 * **Order matters**: projects → sprints → tasks. Tasks reference both, sprints
 * reference projects. The FKs are NULLable so a wrong order would still write,
 * but the relations would be broken until the next cycle.
 *
 * **Safe under concurrent writers**: each entity uses its own UPSERT so other
 * processes (e.g. reactive event handlers that touch a single row) can interleave
 * without lock contention beyond per-row scope.
 */

export interface ProjectProjectionRow {
  project_source_id: string | null
  space_id: string | null
  client_id: string | null
  module_id: string | null
  project_database_source_id: string | null
  project_name: string | null
  project_status: string | null
  project_summary: string | null
  completion_label: string | null
  on_time_pct_source: number | null
  avg_rpa_source: number | null
  project_phase: string | null
  owner_member_id: string | null
  start_date: string | null
  end_date: string | null
  page_url: string | null
  is_deleted: boolean
  last_edited_time: string | null
  synced_at: string
  sync_run_id: string
  payload_hash: string
}

export interface SprintProjectionRow {
  sprint_source_id: string | null
  project_source_id: string | null
  space_id: string | null
  project_database_source_id: string | null
  sprint_name: string | null
  sprint_status: string | null
  start_date: string | null
  end_date: string | null
  completed_tasks_count: number | null
  total_tasks_count: number | null
  completion_pct_source: number | null
  page_url: string | null
  is_deleted: boolean
  last_edited_time: string | null
  synced_at: string
  sync_run_id: string
  payload_hash: string
}

export interface TaskProjectionRow {
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
  days_late: number | null
  rescheduled_days: number | null
  is_rescheduled: boolean
  performance_indicator_label: string | null
  performance_indicator_code: string | null
  client_change_round_label: string | null
  client_change_round_final: number | null
  rpa_semaphore_source: string | null
  rpa_value: number | null
  frame_versions: number | null
  frame_comments: number | null
  open_frame_comments: number | null
  client_review_open: boolean
  workflow_review_open: boolean
  blocker_count: number
  last_frame_comment: string | null
  tarea_principal_ids: string[] | null
  subtareas_ids: string[] | null
  original_due_date: string | null
  execution_time_label: string | null
  changes_time_label: string | null
  review_time_label: string | null
  workflow_change_round: number | null
  due_date: string | null
  completed_at: string | null
  page_url: string | null
  is_deleted: boolean
  last_edited_time: string | null
  synced_at: string
  sync_run_id: string
  payload_hash: string
  created_at: string | null
}

export interface ProjectNotionDeliveryToPostgresInput {
  syncRunId: string
  projects: ProjectProjectionRow[]
  sprints: SprintProjectionRow[]
  tasks: TaskProjectionRow[]

  /**
   * Spaces touched by this sync run. When `replaceMissingForSpaces` is true,
   * any PG row that belongs to a space in `targetSpaceIds` but is not in the
   * incoming batch is marked deleted (mirrors the BQ staged-swap semantics).
   *
   * `null` means "treat the input as the universe of all active spaces" — use
   * with care, only for full syncs.
   */
  targetSpaceIds: string[] | null
  replaceMissingForSpaces?: boolean
}

export interface ProjectNotionDeliveryToPostgresResult {
  projectsWritten: number
  sprintsWritten: number
  tasksWritten: number
  projectsMarkedDeleted: number
  sprintsMarkedDeleted: number
  tasksMarkedDeleted: number
  durationMs: number
}

const upsertProjects = async (
  syncRunId: string,
  projects: ProjectProjectionRow[]
): Promise<number> => {
  if (projects.length === 0) return 0
  const db = await getDb()
  let written = 0

  // One UPSERT per row keeps the SQL simple and uses the existing
  // `ON CONFLICT (notion_project_id)` index. Volume is bounded by the
  // number of active projects (~hundreds), so per-row overhead is negligible.
  for (const project of projects) {
    if (!project.project_source_id) continue

    await sql`
      INSERT INTO greenhouse_delivery.projects (
        project_record_id, space_id, client_id, module_id,
        project_database_source_id, notion_project_id, project_name,
        project_status, project_summary, completion_label,
        on_time_pct_source, avg_rpa_source, project_phase,
        owner_member_id, start_date, end_date, page_url, active,
        is_deleted, source_updated_at, synced_at, sync_run_id, payload_hash
      )
      VALUES (
        ${`project-${project.project_source_id}`},
        ${project.space_id}, ${project.client_id}, ${project.module_id},
        ${project.project_database_source_id}, ${project.project_source_id},
        ${project.project_name}, ${project.project_status},
        ${project.project_summary}, ${project.completion_label},
        ${project.on_time_pct_source}, ${project.avg_rpa_source},
        ${project.project_phase}, ${project.owner_member_id},
        ${project.start_date}::date, ${project.end_date}::date,
        ${project.page_url}, TRUE, ${project.is_deleted},
        ${project.last_edited_time}::timestamptz,
        ${project.synced_at}::timestamptz, ${syncRunId},
        ${project.payload_hash}
      )
      ON CONFLICT (notion_project_id) DO UPDATE SET
        space_id = EXCLUDED.space_id,
        client_id = EXCLUDED.client_id,
        module_id = EXCLUDED.module_id,
        project_database_source_id = EXCLUDED.project_database_source_id,
        project_name = EXCLUDED.project_name,
        project_status = EXCLUDED.project_status,
        project_summary = EXCLUDED.project_summary,
        completion_label = EXCLUDED.completion_label,
        on_time_pct_source = EXCLUDED.on_time_pct_source,
        avg_rpa_source = EXCLUDED.avg_rpa_source,
        project_phase = EXCLUDED.project_phase,
        owner_member_id = EXCLUDED.owner_member_id,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        page_url = EXCLUDED.page_url,
        active = EXCLUDED.active,
        is_deleted = EXCLUDED.is_deleted,
        source_updated_at = EXCLUDED.source_updated_at,
        synced_at = EXCLUDED.synced_at,
        sync_run_id = EXCLUDED.sync_run_id,
        payload_hash = EXCLUDED.payload_hash,
        updated_at = CURRENT_TIMESTAMP
    `.execute(db)
    written += 1
  }

  return written
}

const upsertSprints = async (
  syncRunId: string,
  sprints: SprintProjectionRow[]
): Promise<number> => {
  if (sprints.length === 0) return 0
  const db = await getDb()
  let written = 0

  for (const sprint of sprints) {
    if (!sprint.sprint_source_id) continue

    await sql`
      INSERT INTO greenhouse_delivery.sprints (
        sprint_record_id, project_record_id, space_id,
        project_database_source_id, notion_sprint_id, sprint_name,
        sprint_status, start_date, end_date, completed_tasks_count,
        total_tasks_count, completion_pct_source, page_url, is_deleted,
        source_updated_at, synced_at, sync_run_id, payload_hash
      )
      VALUES (
        ${`sprint-${sprint.sprint_source_id}`},
        ${sprint.project_source_id ? `project-${sprint.project_source_id}` : null},
        ${sprint.space_id}, ${sprint.project_database_source_id},
        ${sprint.sprint_source_id}, ${sprint.sprint_name},
        ${sprint.sprint_status}, ${sprint.start_date}::date,
        ${sprint.end_date}::date, ${sprint.completed_tasks_count},
        ${sprint.total_tasks_count}, ${sprint.completion_pct_source},
        ${sprint.page_url}, ${sprint.is_deleted},
        ${sprint.last_edited_time}::timestamptz,
        ${sprint.synced_at}::timestamptz, ${syncRunId},
        ${sprint.payload_hash}
      )
      ON CONFLICT (notion_sprint_id) DO UPDATE SET
        project_record_id = EXCLUDED.project_record_id,
        space_id = EXCLUDED.space_id,
        project_database_source_id = EXCLUDED.project_database_source_id,
        sprint_name = EXCLUDED.sprint_name,
        sprint_status = EXCLUDED.sprint_status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        completed_tasks_count = EXCLUDED.completed_tasks_count,
        total_tasks_count = EXCLUDED.total_tasks_count,
        completion_pct_source = EXCLUDED.completion_pct_source,
        page_url = EXCLUDED.page_url,
        is_deleted = EXCLUDED.is_deleted,
        source_updated_at = EXCLUDED.source_updated_at,
        synced_at = EXCLUDED.synced_at,
        sync_run_id = EXCLUDED.sync_run_id,
        payload_hash = EXCLUDED.payload_hash,
        updated_at = CURRENT_TIMESTAMP
    `.execute(db)
    written += 1
  }

  return written
}

const upsertTasks = async (
  syncRunId: string,
  tasks: TaskProjectionRow[]
): Promise<number> => {
  if (tasks.length === 0) return 0
  const db = await getDb()
  let written = 0

  for (const task of tasks) {
    if (!task.task_source_id) continue

    await sql`
      INSERT INTO greenhouse_delivery.tasks (
        task_record_id, project_record_id, sprint_record_id, space_id, client_id,
        module_id, assignee_member_id, assignee_source_id, assignee_member_ids,
        project_database_source_id, notion_task_id, notion_project_id,
        project_source_ids, notion_sprint_id, task_name, task_status, task_phase,
        task_priority, completion_label, delivery_compliance, days_late,
        rescheduled_days, is_rescheduled, performance_indicator_label,
        performance_indicator_code, client_change_round_label,
        client_change_round_final, rpa_semaphore_source, rpa_value, frame_versions,
        frame_comments, open_frame_comments, client_review_open,
        workflow_review_open, blocker_count, last_frame_comment,
        tarea_principal_ids, subtareas_ids, original_due_date, execution_time_label,
        changes_time_label, review_time_label, workflow_change_round, due_date,
        completed_at, page_url, is_deleted, source_updated_at, synced_at,
        sync_run_id, payload_hash
      )
      VALUES (
        ${`task-${task.task_source_id}`},
        ${task.project_source_id ? `project-${task.project_source_id}` : null},
        ${task.sprint_source_id ? `sprint-${task.sprint_source_id}` : null},
        ${task.space_id}, ${task.client_id}, ${task.module_id},
        ${task.assignee_member_id}, ${task.assignee_source_id},
        ${task.assignee_member_ids}::text[], ${task.project_database_source_id},
        ${task.task_source_id}, ${task.project_source_id},
        ${task.project_source_ids}::text[], ${task.sprint_source_id},
        ${task.task_name}, ${task.task_status}, ${task.task_phase},
        ${task.task_priority}, ${task.completion_label}, ${task.delivery_compliance},
        ${task.days_late}, ${task.rescheduled_days}, ${task.is_rescheduled},
        ${task.performance_indicator_label}, ${task.performance_indicator_code},
        ${task.client_change_round_label}, ${task.client_change_round_final},
        ${task.rpa_semaphore_source}, ${task.rpa_value}, ${task.frame_versions},
        ${task.frame_comments}, ${task.open_frame_comments},
        ${task.client_review_open}, ${task.workflow_review_open},
        ${task.blocker_count}, ${task.last_frame_comment},
        ${task.tarea_principal_ids}::text[], ${task.subtareas_ids}::text[],
        ${task.original_due_date}::date, ${task.execution_time_label},
        ${task.changes_time_label}, ${task.review_time_label},
        ${task.workflow_change_round}, ${task.due_date}::date,
        ${task.completed_at}::timestamptz, ${task.page_url}, ${task.is_deleted},
        ${task.last_edited_time}::timestamptz, ${task.synced_at}::timestamptz,
        ${syncRunId}, ${task.payload_hash}
      )
      ON CONFLICT (notion_task_id) DO UPDATE SET
        project_record_id = EXCLUDED.project_record_id,
        sprint_record_id = EXCLUDED.sprint_record_id,
        space_id = EXCLUDED.space_id,
        client_id = EXCLUDED.client_id,
        module_id = EXCLUDED.module_id,
        assignee_member_id = EXCLUDED.assignee_member_id,
        assignee_source_id = EXCLUDED.assignee_source_id,
        assignee_member_ids = EXCLUDED.assignee_member_ids,
        project_database_source_id = EXCLUDED.project_database_source_id,
        notion_project_id = EXCLUDED.notion_project_id,
        project_source_ids = EXCLUDED.project_source_ids,
        notion_sprint_id = EXCLUDED.notion_sprint_id,
        task_name = EXCLUDED.task_name,
        task_status = EXCLUDED.task_status,
        task_phase = EXCLUDED.task_phase,
        task_priority = EXCLUDED.task_priority,
        completion_label = EXCLUDED.completion_label,
        delivery_compliance = EXCLUDED.delivery_compliance,
        days_late = EXCLUDED.days_late,
        rescheduled_days = EXCLUDED.rescheduled_days,
        is_rescheduled = EXCLUDED.is_rescheduled,
        performance_indicator_label = EXCLUDED.performance_indicator_label,
        performance_indicator_code = EXCLUDED.performance_indicator_code,
        client_change_round_label = EXCLUDED.client_change_round_label,
        client_change_round_final = EXCLUDED.client_change_round_final,
        rpa_semaphore_source = EXCLUDED.rpa_semaphore_source,
        rpa_value = EXCLUDED.rpa_value,
        frame_versions = EXCLUDED.frame_versions,
        frame_comments = EXCLUDED.frame_comments,
        open_frame_comments = EXCLUDED.open_frame_comments,
        client_review_open = EXCLUDED.client_review_open,
        workflow_review_open = EXCLUDED.workflow_review_open,
        blocker_count = EXCLUDED.blocker_count,
        last_frame_comment = EXCLUDED.last_frame_comment,
        tarea_principal_ids = EXCLUDED.tarea_principal_ids,
        subtareas_ids = EXCLUDED.subtareas_ids,
        original_due_date = EXCLUDED.original_due_date,
        execution_time_label = EXCLUDED.execution_time_label,
        changes_time_label = EXCLUDED.changes_time_label,
        review_time_label = EXCLUDED.review_time_label,
        workflow_change_round = EXCLUDED.workflow_change_round,
        due_date = EXCLUDED.due_date,
        completed_at = EXCLUDED.completed_at,
        page_url = EXCLUDED.page_url,
        is_deleted = EXCLUDED.is_deleted,
        source_updated_at = EXCLUDED.source_updated_at,
        synced_at = EXCLUDED.synced_at,
        sync_run_id = EXCLUDED.sync_run_id,
        payload_hash = EXCLUDED.payload_hash,
        updated_at = CURRENT_TIMESTAMP
    `.execute(db)
    written += 1
  }

  return written
}

/**
 * Mark rows for the synced spaces that were NOT in the incoming batch as
 * deleted. Mirrors the BQ staged-swap semantics where any source page that
 * disappears from the cycle's input is dropped from the canonical store.
 */
const markMissingDeleted = async ({
  syncRunId,
  presentTaskIds,
  presentProjectIds,
  presentSprintIds,
  targetSpaceIds
}: {
  syncRunId: string
  presentTaskIds: string[]
  presentProjectIds: string[]
  presentSprintIds: string[]
  targetSpaceIds: string[]
}): Promise<{ tasks: number; projects: number; sprints: number }> => {
  if (targetSpaceIds.length === 0) return { tasks: 0, projects: 0, sprints: 0 }

  const db = await getDb()

  const tasksResult = await sql<{ count: string }>`
    WITH updated AS (
      UPDATE greenhouse_delivery.tasks
         SET is_deleted = TRUE,
             sync_run_id = ${syncRunId},
             synced_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
       WHERE space_id = ANY(${targetSpaceIds}::text[])
         AND COALESCE(is_deleted, FALSE) = FALSE
         AND notion_task_id <> ALL(${presentTaskIds}::text[])
       RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
  `.execute(db)

  const projectsResult = await sql<{ count: string }>`
    WITH updated AS (
      UPDATE greenhouse_delivery.projects
         SET is_deleted = TRUE,
             sync_run_id = ${syncRunId},
             synced_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
       WHERE space_id = ANY(${targetSpaceIds}::text[])
         AND COALESCE(is_deleted, FALSE) = FALSE
         AND notion_project_id <> ALL(${presentProjectIds}::text[])
       RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
  `.execute(db)

  const sprintsResult = await sql<{ count: string }>`
    WITH updated AS (
      UPDATE greenhouse_delivery.sprints
         SET is_deleted = TRUE,
             sync_run_id = ${syncRunId},
             synced_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
       WHERE space_id = ANY(${targetSpaceIds}::text[])
         AND COALESCE(is_deleted, FALSE) = FALSE
         AND notion_sprint_id <> ALL(${presentSprintIds}::text[])
       RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
  `.execute(db)

  return {
    tasks: Number(tasksResult.rows[0]?.count ?? 0),
    projects: Number(projectsResult.rows[0]?.count ?? 0),
    sprints: Number(sprintsResult.rows[0]?.count ?? 0)
  }
}

export const projectNotionDeliveryToPostgres = async ({
  syncRunId,
  projects,
  sprints,
  tasks,
  targetSpaceIds,
  replaceMissingForSpaces = true
}: ProjectNotionDeliveryToPostgresInput): Promise<ProjectNotionDeliveryToPostgresResult> => {
  const startedAt = Date.now()

  // Order: projects → sprints → tasks. Tasks reference both, sprints reference
  // projects. The FKs are NULLable so the writes succeed regardless, but this
  // order ensures the joined queries see consistent state at every step.
  const projectsWritten = await upsertProjects(syncRunId, projects)
  const sprintsWritten = await upsertSprints(syncRunId, sprints)
  const tasksWritten = await upsertTasks(syncRunId, tasks)

  let projectsMarkedDeleted = 0
  let sprintsMarkedDeleted = 0
  let tasksMarkedDeleted = 0

  if (replaceMissingForSpaces && targetSpaceIds && targetSpaceIds.length > 0) {
    const presentTaskIds = tasks
      .map(t => t.task_source_id)
      .filter((id): id is string => Boolean(id))

    const presentProjectIds = projects
      .map(p => p.project_source_id)
      .filter((id): id is string => Boolean(id))

    const presentSprintIds = sprints
      .map(s => s.sprint_source_id)
      .filter((id): id is string => Boolean(id))

    const deleted = await markMissingDeleted({
      syncRunId,
      presentTaskIds,
      presentProjectIds,
      presentSprintIds,
      targetSpaceIds
    })

    tasksMarkedDeleted = deleted.tasks
    projectsMarkedDeleted = deleted.projects
    sprintsMarkedDeleted = deleted.sprints
  }

  return {
    projectsWritten,
    sprintsWritten,
    tasksWritten,
    projectsMarkedDeleted,
    sprintsMarkedDeleted,
    tasksMarkedDeleted,
    durationMs: Date.now() - startedAt
  }
}
