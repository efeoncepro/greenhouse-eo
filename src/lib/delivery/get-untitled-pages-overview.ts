import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

/**
 * Untitled Notion pages overview — operational hygiene reader.
 *
 * Queries `greenhouse_delivery.{tasks,projects,sprints}` directly for rows
 * whose canonical `*_name` is currently NULL (the TASK-588 contract for "title
 * unknown") and joins with the latest `source_sync_failures` row that emitted
 * an `error_code='sync_warning_missing_title'` warning so the admin can see
 * when the page first started lacking a title.
 *
 * The output drives the `/admin/data-quality/notion-titles` view: a queue of
 * pending pages the team can clean up directly in Notion via `page_url`. Once
 * fixed in Notion, the next conformed sync replaces NULL with the resolved
 * title and the row drops off the list automatically.
 *
 * Cheap: scans the small subset (rows with NULL name) plus an indexed lookup
 * into the warnings table. Safe to call from a per-request admin endpoint.
 */

export type UntitledEntityKind = 'task' | 'project' | 'sprint'

export interface UntitledPageRow {
  kind: UntitledEntityKind
  sourceId: string
  spaceId: string | null
  spaceName: string | null
  clientId: string | null
  pageUrl: string | null
  lastEditedTime: string | null
  syncedAt: string | null
  warningFirstSeenAt: string | null
}

export interface UntitledPagesBySpace {
  spaceId: string | null
  spaceName: string | null
  clientId: string | null
  totalCount: number
  taskCount: number
  projectCount: number
  sprintCount: number
}

export interface UntitledPagesOverview {
  generatedAt: string
  totals: {
    totalPages: number
    taskCount: number
    projectCount: number
    sprintCount: number
    affectedSpaces: number
  }
  bySpace: UntitledPagesBySpace[]
  recentRows: UntitledPageRow[]
}

const toIsoString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) return null

    const parsed = new Date(trimmed)

    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString()
  }

  return String(value)
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

interface RowShape {
  kind: string
  source_id: string
  space_id: string | null
  space_name: string | null
  client_id: string | null
  page_url: string | null
  last_edited_time: Date | string | null
  synced_at: Date | string | null
  warning_first_seen_at: Date | string | null
}

const mapRow = (row: RowShape): UntitledPageRow => ({
  kind: row.kind as UntitledEntityKind,
  sourceId: row.source_id,
  spaceId: row.space_id,
  spaceName: row.space_name,
  clientId: row.client_id,
  pageUrl: row.page_url,
  lastEditedTime: toIsoString(row.last_edited_time),
  syncedAt: toIsoString(row.synced_at),
  warningFirstSeenAt: toIsoString(row.warning_first_seen_at)
})

export const getUntitledPagesOverview = async ({
  recentLimit = 50
}: {
  recentLimit?: number
} = {}): Promise<UntitledPagesOverview> => {
  const db = await getDb()
  const limit = Math.max(1, Math.min(recentLimit, 500))

  // Inline UNION across the 3 entity tables — small payload, single round-trip.
  // Each branch joins to the latest matching warning row (when one exists) so
  // the admin can see "first observed missing on YYYY-MM-DD".
  const result = await sql<RowShape>`
    WITH untitled AS (
      SELECT
        'task'::text AS kind,
        t.notion_task_id AS source_id,
        t.space_id,
        t.page_url,
        t.source_updated_at AS last_edited_time,
        t.synced_at
      FROM greenhouse_delivery.tasks t
      WHERE t.task_name IS NULL
        AND COALESCE(t.is_deleted, FALSE) = FALSE

      UNION ALL

      SELECT
        'project'::text AS kind,
        p.notion_project_id AS source_id,
        p.space_id,
        p.page_url,
        p.source_updated_at AS last_edited_time,
        p.synced_at
      FROM greenhouse_delivery.projects p
      WHERE p.project_name IS NULL
        AND COALESCE(p.is_deleted, FALSE) = FALSE

      UNION ALL

      SELECT
        'sprint'::text AS kind,
        s.notion_sprint_id AS source_id,
        s.space_id,
        s.page_url,
        s.source_updated_at AS last_edited_time,
        s.synced_at
      FROM greenhouse_delivery.sprints s
      WHERE s.sprint_name IS NULL
        AND COALESCE(s.is_deleted, FALSE) = FALSE
    ),
    latest_warning AS (
      SELECT DISTINCT ON (source_object_id)
        source_object_id,
        created_at AS warning_first_seen_at
      FROM greenhouse_sync.source_sync_failures
      WHERE error_code = 'sync_warning_missing_title'
      ORDER BY source_object_id, created_at ASC
    )
    SELECT
      u.kind,
      u.source_id,
      u.space_id,
      sp.space_name,
      sp.client_id,
      u.page_url,
      u.last_edited_time,
      u.synced_at,
      lw.warning_first_seen_at
    FROM untitled u
    LEFT JOIN greenhouse_core.spaces sp ON sp.space_id = u.space_id
    LEFT JOIN latest_warning lw ON lw.source_object_id = u.source_id
    ORDER BY u.last_edited_time DESC NULLS LAST
    LIMIT ${limit}
  `.execute(db)

  const recentRows = result.rows.map(mapRow)

  // Aggregate counts per space (run as a separate cheap query so totals stay
  // honest even when `recentLimit` clips the row list).
  const totalsResult = await sql<{
    space_id: string | null
    space_name: string | null
    client_id: string | null
    task_count: string
    project_count: string
    sprint_count: string
  }>`
    WITH untitled AS (
      SELECT 'task'::text AS kind, t.space_id, t.notion_task_id AS source_id
        FROM greenhouse_delivery.tasks t
        WHERE t.task_name IS NULL AND COALESCE(t.is_deleted, FALSE) = FALSE
      UNION ALL
      SELECT 'project'::text AS kind, p.space_id, p.notion_project_id AS source_id
        FROM greenhouse_delivery.projects p
        WHERE p.project_name IS NULL AND COALESCE(p.is_deleted, FALSE) = FALSE
      UNION ALL
      SELECT 'sprint'::text AS kind, s.space_id, s.notion_sprint_id AS source_id
        FROM greenhouse_delivery.sprints s
        WHERE s.sprint_name IS NULL AND COALESCE(s.is_deleted, FALSE) = FALSE
    )
    SELECT
      u.space_id,
      sp.space_name,
      sp.client_id,
      COUNT(*) FILTER (WHERE u.kind = 'task')::text AS task_count,
      COUNT(*) FILTER (WHERE u.kind = 'project')::text AS project_count,
      COUNT(*) FILTER (WHERE u.kind = 'sprint')::text AS sprint_count
    FROM untitled u
    LEFT JOIN greenhouse_core.spaces sp ON sp.space_id = u.space_id
    GROUP BY u.space_id, sp.space_name, sp.client_id
    ORDER BY COUNT(*) DESC, sp.space_name ASC NULLS LAST
  `.execute(db)

  const bySpace: UntitledPagesBySpace[] = totalsResult.rows.map(row => {
    const taskCount = toNumber(row.task_count)
    const projectCount = toNumber(row.project_count)
    const sprintCount = toNumber(row.sprint_count)

    return {
      spaceId: row.space_id,
      spaceName: row.space_name,
      clientId: row.client_id,
      taskCount,
      projectCount,
      sprintCount,
      totalCount: taskCount + projectCount + sprintCount
    }
  })

  const totals = {
    taskCount: bySpace.reduce((sum, row) => sum + row.taskCount, 0),
    projectCount: bySpace.reduce((sum, row) => sum + row.projectCount, 0),
    sprintCount: bySpace.reduce((sum, row) => sum + row.sprintCount, 0),
    totalPages: bySpace.reduce((sum, row) => sum + row.totalCount, 0),
    affectedSpaces: bySpace.length
  }

  return {
    generatedAt: new Date().toISOString(),
    totals,
    bySpace,
    recentRows
  }
}
