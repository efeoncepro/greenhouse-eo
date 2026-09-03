import 'server-only'

import type { PoolClient } from 'pg'

import { query } from '@/lib/db'

/**
 * TASK-1349 — Ownership predicate shared by the identity bridges (SCIM
 * re-activation by OID, BigQuery canonical-360 backfill): does Greenhouse
 * hold an EXECUTED real termination for this member whose last working day
 * is already in the past?
 *
 * When it does, the offboarding domain OWNS `members.active`: no projection
 * or upstream signal may flip it back to `true` on its own. A genuine re-hire
 * is a new episode declared through the governed intake/activation commands,
 * never a silent resurrection.
 *
 * `identity_only` cases are excluded on purpose — an access-only closure is
 * not a labor fact and must not block a legitimate account re-enable.
 */
export type ExecutedRealExitFact = {
  offboardingCaseId: string
  publicId: string
  ruleLane: string
  lastWorkingDay: string
  executedAt: string
}

const SQL = `
  SELECT
    offboarding_case_id,
    public_id,
    rule_lane,
    last_working_day::text AS last_working_day,
    executed_at::text AS executed_at
  FROM greenhouse_hr.work_relationship_offboarding_cases
  WHERE member_id = $1
    AND status = 'executed'
    AND rule_lane <> 'identity_only'
    AND separation_type <> 'identity_only'
    AND last_working_day IS NOT NULL
    AND last_working_day <= CURRENT_DATE
  ORDER BY last_working_day DESC, executed_at DESC
  LIMIT 1
`

type Row = {
  offboarding_case_id: string
  public_id: string
  rule_lane: string
  last_working_day: string
  executed_at: string
}

const mapRow = (row: Row | undefined): ExecutedRealExitFact | null =>
  row
    ? {
        offboardingCaseId: row.offboarding_case_id,
        publicId: row.public_id,
        ruleLane: row.rule_lane,
        lastWorkingDay: row.last_working_day.slice(0, 10),
        executedAt: row.executed_at
      }
    : null

export const findExecutedRealExitForMember = async (
  memberId: string,
  client?: PoolClient
): Promise<ExecutedRealExitFact | null> => {
  if (client) {
    const result = await client.query<Row>(SQL, [memberId])

    return mapRow(result.rows[0])
  }

  const rows = await query<Row>(SQL, [memberId])

  return mapRow(rows[0])
}
