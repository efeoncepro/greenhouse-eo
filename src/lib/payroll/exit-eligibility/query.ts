import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/db'

import type { ExitCaseFacts } from './policy'
import type { ExitLane, ExitStatus } from './types'

type ExitEligibilityRow = {
  member_id: string
  member_active: boolean
  offboarding_case_id: string | null
  public_id: string | null
  rule_lane: string | null
  status: string | null
  last_working_day: string | null
  effective_date: string | null
}

const VALID_LANES: ReadonlySet<ExitLane> = new Set<ExitLane>([
  'internal_payroll',
  'external_payroll',
  'non_payroll',
  'identity_only',
  'relationship_transition',
  'unknown'
])

const VALID_STATUSES: ReadonlySet<ExitStatus> = new Set<ExitStatus>([
  'draft',
  'needs_review',
  'approved',
  'scheduled',
  'blocked',
  'executed',
  'cancelled'
])

const normalizeLane = (value: string | null): ExitLane | null => {
  if (!value) return null

  return VALID_LANES.has(value as ExitLane) ? (value as ExitLane) : 'unknown'
}

const normalizeStatus = (value: string | null): ExitStatus | null => {
  if (!value) return null

  return VALID_STATUSES.has(value as ExitStatus) ? (value as ExitStatus) : null
}

const normalizeDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

/**
 * Picks the most relevant offboarding case per member via LATERAL JOIN.
 *
 * Priority order:
 * 1. executed (terminal, highest signal of exit)
 * 2. scheduled (LWD locked in)
 * 3. approved (decision firmada)
 * 4. blocked
 * 5. needs_review
 * 6. draft
 *
 * Cancelled cases are excluded — they represent decisions the operator reverted.
 * The schema's partial UNIQUE INDEX guarantees at most ONE active (non-executed,
 * non-cancelled) case per (member, relationship), so the priority is mostly
 * useful for ordering executed-vs-historical correctly.
 */
const FETCH_EXIT_CASE_FACTS_SQL = `
  SELECT
    m.member_id,
    m.active AS member_active,
    oc.offboarding_case_id,
    oc.public_id,
    oc.rule_lane,
    oc.status,
    oc.last_working_day::text AS last_working_day,
    oc.effective_date::text AS effective_date
  FROM greenhouse_core.members AS m
  LEFT JOIN LATERAL (
    SELECT
      oc.offboarding_case_id,
      oc.public_id,
      oc.rule_lane,
      oc.status,
      oc.last_working_day,
      oc.effective_date
    FROM greenhouse_hr.work_relationship_offboarding_cases AS oc
    WHERE oc.member_id = m.member_id
      AND oc.status <> 'cancelled'
    ORDER BY
      CASE oc.status
        WHEN 'executed' THEN 1
        WHEN 'scheduled' THEN 2
        WHEN 'approved' THEN 3
        WHEN 'blocked' THEN 4
        WHEN 'needs_review' THEN 5
        WHEN 'draft' THEN 6
        ELSE 7
      END,
      oc.created_at DESC
    LIMIT 1
  ) AS oc ON TRUE
  WHERE m.member_id = ANY($1::text[])
`

/**
 * Fetch case facts for a batch of members. Bulk-first: cost is O(N) with
 * `WHERE m.member_id = ANY($1)`. Index coverage on `members(member_id)` PK
 * plus the LATERAL subquery uses `(member_id, created_at DESC)` from
 * TASK-760 migration.
 */
export const fetchExitCaseFactsForMembers = async (
  memberIds: ReadonlyArray<string>
): Promise<Map<string, ExitCaseFacts>> => {
  if (memberIds.length === 0) return new Map()

  const rows = await runGreenhousePostgresQuery<ExitEligibilityRow>(FETCH_EXIT_CASE_FACTS_SQL, [
    [...memberIds]
  ])

  const facts = new Map<string, ExitCaseFacts>()

  for (const row of rows) {
    facts.set(row.member_id, {
      memberId: row.member_id,
      memberActive: Boolean(row.member_active),
      exitCaseId: row.offboarding_case_id,
      exitCasePublicId: row.public_id,
      exitLane: normalizeLane(row.rule_lane),
      exitStatus: normalizeStatus(row.status),
      lastWorkingDay: normalizeDate(row.last_working_day),
      effectiveDate: normalizeDate(row.effective_date)
    })
  }

  return facts
}
