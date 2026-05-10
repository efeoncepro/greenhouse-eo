import 'server-only'

import { query } from '@/lib/db'

import type { ReleaseManifest } from './manifest-store'
import type { ReleaseState } from './state-machine'

/**
 * TASK-854 Slice 1 — Cursor-paginated reader for /admin/releases dashboard.
 *
 * Keyset pagination on `started_at DESC` (no offset → no slow queries on
 * deep pagination). Cursor is the ISO timestamp of the last row's
 * `started_at`. Initial page omits the cursor; subsequent pages pass the
 * `started_at` of the last row received.
 *
 * Different from `listRecentReleases` (manifest-store helper TASK-848 V1.0):
 *   - Supports cursor pagination (this helper)
 *   - Returns also a hasMore flag + next cursor for UI rendering
 *
 * Default page size: 30. Max: 100.
 */

export interface ListRecentReleasesPaginatedOptions {
  readonly targetBranch?: string
  readonly cursor?: string | null
  readonly pageSize?: number
}

export interface ListRecentReleasesPaginatedResult {
  readonly releases: readonly ReleaseManifest[]
  readonly nextCursor: string | null
  readonly hasMore: boolean
}

const DEFAULT_PAGE_SIZE = 30
const MAX_PAGE_SIZE = 100

const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return new Date(value).toISOString()

  return new Date(0).toISOString()
}

const rowToManifest = (row: Record<string, unknown>): ReleaseManifest => ({
  releaseId: String(row.release_id),
  targetSha: String(row.target_sha),
  sourceBranch: String(row.source_branch),
  targetBranch: String(row.target_branch),
  state: row.state as ReleaseState,
  attemptN: Number(row.attempt_n),
  triggeredBy: String(row.triggered_by),
  operatorMemberId: row.operator_member_id != null ? String(row.operator_member_id) : null,
  startedAt: toIsoString(row.started_at),
  completedAt: row.completed_at != null ? toIsoString(row.completed_at) : null,
  vercelDeploymentUrl:
    row.vercel_deployment_url != null ? String(row.vercel_deployment_url) : null,
  previousVercelDeploymentUrl:
    row.previous_vercel_deployment_url != null
      ? String(row.previous_vercel_deployment_url)
      : null,
  workerRevisions: (row.worker_revisions as Record<string, unknown>) ?? {},
  previousWorkerRevisions:
    (row.previous_worker_revisions as Record<string, unknown>) ?? {},
  workflowRuns: (row.workflow_runs as unknown[]) ?? [],
  preflightResult: (row.preflight_result as Record<string, unknown>) ?? {},
  postReleaseHealth: (row.post_release_health as Record<string, unknown>) ?? {},
  rollbackPlan: (row.rollback_plan as Record<string, unknown>) ?? {}
})

export const listRecentReleasesPaginated = async (
  options: ListRecentReleasesPaginatedOptions = {}
): Promise<ListRecentReleasesPaginatedResult> => {
  const targetBranch = options.targetBranch ?? 'main'
  const pageSize = Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  const cursor = options.cursor ?? null

  // Fetch pageSize + 1 to detect hasMore without a separate COUNT query.
  const fetchLimit = pageSize + 1

  const rows = cursor
    ? await query<Record<string, unknown>>(
        `SELECT release_id, target_sha, source_branch, target_branch,
                state, attempt_n, triggered_by, operator_member_id,
                started_at, completed_at, vercel_deployment_url,
                previous_vercel_deployment_url, worker_revisions,
                previous_worker_revisions, workflow_runs,
                preflight_result, post_release_health, rollback_plan
           FROM greenhouse_sync.release_manifests
           WHERE target_branch = $1
             AND started_at < $2::timestamptz
           ORDER BY started_at DESC
           LIMIT $3`,
        [targetBranch, cursor, fetchLimit]
      )
    : await query<Record<string, unknown>>(
        `SELECT release_id, target_sha, source_branch, target_branch,
                state, attempt_n, triggered_by, operator_member_id,
                started_at, completed_at, vercel_deployment_url,
                previous_vercel_deployment_url, worker_revisions,
                previous_worker_revisions, workflow_runs,
                preflight_result, post_release_health, rollback_plan
           FROM greenhouse_sync.release_manifests
           WHERE target_branch = $1
           ORDER BY started_at DESC
           LIMIT $2`,
        [targetBranch, fetchLimit]
      )

  const hasMore = rows.length > pageSize
  const slicedRows = hasMore ? rows.slice(0, pageSize) : rows
  const releases = slicedRows.map(rowToManifest)

  const nextCursor =
    hasMore && releases.length > 0 ? releases[releases.length - 1]?.startedAt ?? null : null

  return { releases, nextCursor, hasMore }
}
