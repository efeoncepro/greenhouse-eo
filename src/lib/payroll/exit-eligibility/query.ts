import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ContractType } from '@/types/hr-contracts'

import type { ExitCaseFacts } from './policy'
import type { ExitLane, ExitStatus } from './types'

type ExitEligibilityRow = {
  member_id: string
  member_active: boolean
  offboarding_case_id: string | null
  public_id: string | null
  rule_lane: string | null
  status: string | null
  source: string | null
  contract_type_snapshot: string | null
  last_working_day: string | null
  effective_date: string | null
  signal_date: string | null
  reentered_after_exit: boolean | null
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
 * Picks the offboarding case that GOVERNS the requested period per member via
 * LATERAL JOIN (TASK-890 foundation, temporal selection corrected by TASK-1349).
 *
 * Selection order (first wins):
 * 1. Cases relevant to the period — `COALESCE(last_working_day, effective_date,
 *    created_at::date) <= periodEnd`. A signal that arrives after the period
 *    ends cannot govern it (a June exit signalled in July still governs June
 *    because its cutoff is in June).
 * 2. Decided cases (`approved`/`scheduled`/`executed`) before unresolved ones.
 * 3. Latest episode first (cutoff/signal DESC) — a re-hire's newer case wins
 *    over the exit of a previous episode.
 * 4. Status priority (executed > scheduled > approved > blocked > needs_review
 *    > draft), then `created_at DESC`.
 *
 * Cancelled cases are excluded — they represent decisions the operator reverted.
 *
 * `reentered_after_exit` is computed only for decided cases with a cutoff: a
 * compensation version that starts AFTER that cutoff and on/before `periodEnd`
 * proves a new payroll episode, so the previous exit must not exclude it.
 *
 * `contract_type_snapshot` is re-selected in the outer SELECT on purpose: the
 * pre-2026-09-03 query computed it inside the LATERAL and dropped it, which
 * made the `international_internal` threshold unreachable (audit 2026-09-03).
 */
const FETCH_EXIT_CASE_FACTS_SQL = `
  SELECT
    m.member_id,
    m.active AS member_active,
    oc.offboarding_case_id,
    oc.public_id,
    oc.rule_lane,
    oc.status,
    oc.source,
    oc.contract_type_snapshot,
    oc.last_working_day::text AS last_working_day,
    oc.effective_date::text AS effective_date,
    oc.signal_date::text AS signal_date,
    CASE
      WHEN oc.offboarding_case_id IS NULL THEN NULL
      WHEN oc.status NOT IN ('approved', 'scheduled', 'executed') THEN FALSE
      WHEN oc.cutoff IS NULL THEN FALSE
      ELSE EXISTS (
        SELECT 1
        FROM greenhouse_payroll.compensation_versions AS cv
        WHERE cv.member_id = m.member_id
          AND cv.effective_from > oc.cutoff
          AND cv.effective_from <= $2::date
      )
    END AS reentered_after_exit
  FROM greenhouse_core.members AS m
  LEFT JOIN LATERAL (
    SELECT
      oc.offboarding_case_id,
      oc.public_id,
      oc.rule_lane,
      oc.status,
      oc.source,
      oc.contract_type_snapshot,
      oc.last_working_day,
      oc.effective_date,
      oc.created_at::date AS signal_date,
      COALESCE(oc.last_working_day, oc.effective_date) AS cutoff
    FROM greenhouse_hr.work_relationship_offboarding_cases AS oc
    WHERE oc.member_id = m.member_id
      AND oc.status <> 'cancelled'
    ORDER BY
      CASE
        WHEN COALESCE(oc.last_working_day, oc.effective_date, oc.created_at::date) <= $2::date THEN 0
        ELSE 1
      END,
      CASE WHEN oc.status IN ('approved', 'scheduled', 'executed') THEN 0 ELSE 1 END,
      COALESCE(oc.last_working_day, oc.effective_date, oc.created_at::date) DESC,
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

const isContractTypeSnapshot = (value: string | null): value is ContractType =>
  value === 'indefinido' ||
  value === 'plazo_fijo' ||
  value === 'honorarios' ||
  value === 'contractor' ||
  value === 'eor' ||
  value === 'international_internal'

/**
 * Fetch case facts for a batch of members and a period window. Bulk-first:
 * cost is O(N) with `WHERE m.member_id = ANY($1)`. Index coverage on
 * `members(member_id)` PK plus the LATERAL subquery uses
 * `(member_id, created_at DESC)` from TASK-760 migration.
 *
 * `periodStart` is accepted for symmetry with the resolver contract; the
 * SQL binds only `periodEnd` ($2) to decide relevance and re-entry.
 */
export const fetchExitCaseFactsForMembers = async (
  memberIds: ReadonlyArray<string>,
  periodStart: string,
  periodEnd: string
): Promise<Map<string, ExitCaseFacts>> => {
  if (memberIds.length === 0) return new Map()

  // `periodStart` is part of the resolver contract (symmetry + future use);
  // the SQL only binds `periodEnd` — an unbound parameter makes PG fail with
  // 42P18 (`could not determine data type`), caught by the real-PG smoke.
  void periodStart

  const rows = await runGreenhousePostgresQuery<ExitEligibilityRow>(FETCH_EXIT_CASE_FACTS_SQL, [
    [...memberIds],
    periodEnd
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
      exitSource: row.source,
      contractTypeSnapshot: isContractTypeSnapshot(row.contract_type_snapshot) ? row.contract_type_snapshot : null,
      lastWorkingDay: normalizeDate(row.last_working_day),
      effectiveDate: normalizeDate(row.effective_date),
      caseSignalDate: normalizeDate(row.signal_date),
      reenteredAfterExit: row.reentered_after_exit === true
    })
  }

  return facts
}
