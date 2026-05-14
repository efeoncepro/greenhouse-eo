import 'server-only'

import { query } from '@/lib/db'

import type { WorkforceIntakeStatus } from '@/types/people'

/**
 * TASK-873 Slice 1 — Cursor-paginated reader for `/admin/workforce/activation`.
 *
 * Keyset pagination on (`created_at ASC`, `member_id ASC`) — no OFFSET to keep
 * queries O(log N) at deep pagination. Cursor is the ISO timestamp + memberId
 * of the last row received. Initial page omits cursor; subsequent pages pass
 * the `createdAt + memberId` of the last row.
 *
 * Filters by `workforce_intake_status != 'completed' AND active = TRUE`. The
 * `statusFilter` parameter narrows further. Spec: TASK-873 Detailed Spec.
 *
 * Mirror del pattern canónico TASK-854 listRecentReleasesPaginated.
 *
 * TASK-873 V1.1 follow-up note: el response shape expone slots opcionales
 * `readinessStatus?`, `blockerCount?`, `topBlockerLane?` para que TASK-874
 * (Workforce Activation Readiness) populate sin breaking change del client
 * view ("thin adapter" que la spec de TASK-874 menciona). V1.0 los deja
 * undefined.
 */

export type WorkforceIntakeStatusFilter = WorkforceIntakeStatus | 'all'

export interface ListPendingIntakeMembersOptions {
  readonly cursor?: ListPendingIntakeMembersCursor | null
  readonly pageSize?: number
  readonly statusFilter?: WorkforceIntakeStatusFilter
}

export interface ListPendingIntakeMembersCursor {
  readonly createdAt: string
  readonly memberId: string
}

export interface PendingIntakeMemberRow {
  readonly memberId: string
  readonly displayName: string
  readonly primaryEmail: string | null
  readonly workforceIntakeStatus: WorkforceIntakeStatus
  readonly identityProfileId: string | null
  readonly createdAt: string
  readonly ageDays: number
  readonly active: boolean

  // Slots opcionales reservados para TASK-874 (Workforce Activation Readiness).
  // V1.0 always undefined. V1.1 (TASK-874) populate sin breaking change.
  readonly readinessStatus?:
    | 'pending_intake'
    | 'in_review'
    | 'blocked'
    | 'ready_to_complete'
    | 'completed'
  readonly blockerCount?: number
  readonly topBlockerLane?: string
}

export interface ListPendingIntakeMembersResult {
  readonly items: readonly PendingIntakeMemberRow[]
  readonly nextCursor: ListPendingIntakeMembersCursor | null
  readonly hasMore: boolean
  readonly totalApprox: number | null
}

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return new Date(value).toISOString()

  return new Date(0).toISOString()
}

const toInt = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }

  return 0
}

const toStatus = (value: unknown): WorkforceIntakeStatus => {
  // El filtro WHERE garantiza != 'completed' por defecto, pero defensive cast.
  if (value === 'pending_intake' || value === 'in_review' || value === 'completed') {
    return value
  }

  return 'pending_intake'
}

const rowToPendingIntakeMember = (row: Record<string, unknown>): PendingIntakeMemberRow => ({
  memberId: String(row.member_id),
  displayName: String(row.display_name ?? 'Sin nombre'),
  primaryEmail: row.primary_email != null ? String(row.primary_email) : null,
  workforceIntakeStatus: toStatus(row.workforce_intake_status),
  identityProfileId: row.identity_profile_id != null ? String(row.identity_profile_id) : null,
  createdAt: toIsoString(row.created_at),
  ageDays: toInt(row.age_days),
  active: Boolean(row.active)
})

/**
 * Cuenta aproximada de members con intake pendiente (no usa LIMIT). Se devuelve
 * SOLO en la primera página (cursor=null) para evitar full table scans cada
 * "Cargar más". El filtro `statusFilter` se aplica también al count.
 */
const countPendingApprox = async (statusFilter: WorkforceIntakeStatusFilter): Promise<number | null> => {
  try {
    const values: unknown[] = []

    const statusClause =
      statusFilter === 'all'
        ? `m.workforce_intake_status != 'completed'`
        : `m.workforce_intake_status = $${values.push(statusFilter)}`

    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.members m
       WHERE ${statusClause}
         AND m.active = TRUE`,
      values
    )

    return Number(rows[0]?.n ?? 0)
  } catch {
    // Degradación honesta — count opcional, queue funciona sin él.
    return null
  }
}

export const listPendingIntakeMembers = async (
  options: ListPendingIntakeMembersOptions = {}
): Promise<ListPendingIntakeMembersResult> => {
  const pageSize = Math.min(Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
  const statusFilter: WorkforceIntakeStatusFilter = options.statusFilter ?? 'all'
  const cursor = options.cursor ?? null
  const fetchLimit = pageSize + 1

  const values: unknown[] = []

  const statusClause =
    statusFilter === 'all'
      ? `m.workforce_intake_status != 'completed'`
      : `m.workforce_intake_status = $${values.push(statusFilter)}`

  const cursorClause = cursor
    ? `AND (m.created_at, m.member_id) > ($${values.push(cursor.createdAt)}::timestamptz, $${values.push(cursor.memberId)}::text)`
    : ''

  const limitParam = `$${values.push(fetchLimit)}::int`

  const rows = await query<Record<string, unknown>>(
    `SELECT
        m.member_id,
        m.display_name,
        m.primary_email,
        m.workforce_intake_status,
        m.identity_profile_id,
        m.created_at,
        m.active,
        EXTRACT(DAY FROM (NOW() - m.created_at))::int AS age_days
     FROM greenhouse_core.members m
     WHERE ${statusClause}
       AND m.active = TRUE
       ${cursorClause}
     ORDER BY m.created_at ASC, m.member_id ASC
     LIMIT ${limitParam}`,
    values
  )

  const hasMore = rows.length > pageSize
  const slicedRows = hasMore ? rows.slice(0, pageSize) : rows
  const items = slicedRows.map(rowToPendingIntakeMember)

  const lastItem = items.length > 0 ? items[items.length - 1] : null

  const nextCursor =
    hasMore && lastItem
      ? { createdAt: lastItem.createdAt, memberId: lastItem.memberId }
      : null

  const totalApprox = cursor === null ? await countPendingApprox(statusFilter) : null

  return { items, nextCursor, hasMore, totalApprox }
}
