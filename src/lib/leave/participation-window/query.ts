import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { LeaveAccrualCompensationFact } from './types'

/**
 * Bulk query that returns ALL compensation_versions overlapping a target year
 * for the given members. The policy resolver then filters to "dependent CL"
 * rows (`contract_type IN ('indefinido','plazo_fijo') AND pay_regime='chile'
 * AND payroll_via='internal'`) and computes accrual eligibility per ADR
 * §"Leave Accrual Participation-Aware".
 *
 * NEVER filter inside the SQL: the policy needs to OBSERVE non-dependent rows
 * to emit `contractor_to_dependent_transition` reason codes correctly (forensic
 * audit trail). The TS-side filter is the canonical decision boundary.
 */

type DbRow = {
  member_id: string
  version_id: string
  effective_from: string
  effective_to: string | null
  contract_type: string
  pay_regime: string
  payroll_via: string | null
}

const FETCH_COMPENSATION_FACTS_SQL = `
  SELECT
    cv.member_id,
    cv.version_id,
    TO_CHAR(cv.effective_from, 'YYYY-MM-DD') AS effective_from,
    CASE WHEN cv.effective_to IS NULL THEN NULL
         ELSE TO_CHAR(cv.effective_to, 'YYYY-MM-DD')
    END AS effective_to,
    cv.contract_type,
    cv.pay_regime,
    cv.payroll_via
  FROM greenhouse_payroll.compensation_versions cv
  WHERE cv.member_id = ANY($1::text[])
    AND cv.effective_from <= $3::date
    AND (cv.effective_to IS NULL OR cv.effective_to >= $2::date)
  ORDER BY cv.member_id, cv.effective_from ASC
`

/**
 * Bulk fetch compensation facts for the given members overlapping the year
 * bounds [yearStart, yearEnd]. Returns a Map keyed by `memberId` with
 * `LeaveAccrualCompensationFact[]` array sorted ASC by `effectiveFrom`.
 *
 * Members with no compensation_versions overlapping the year are absent from
 * the map — the policy resolver treats absence as `policy='no_dependent'`
 * (zero eligibility).
 */
export const fetchCompensationFactsForLeaveAccrual = async (
  memberIds: ReadonlyArray<string>,
  yearStart: string,
  yearEnd: string
): Promise<Map<string, ReadonlyArray<LeaveAccrualCompensationFact>>> => {
  if (memberIds.length === 0) {
    return new Map()
  }

  const rows = await runGreenhousePostgresQuery<DbRow>(FETCH_COMPENSATION_FACTS_SQL, [
    [...memberIds],
    yearStart,
    yearEnd
  ])

  const out = new Map<string, LeaveAccrualCompensationFact[]>()

  for (const row of rows) {
    const fact: LeaveAccrualCompensationFact = {
      memberId: row.member_id,
      versionId: row.version_id,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      contractType: row.contract_type,
      payRegime: row.pay_regime,
      payrollVia: row.payroll_via
    }

    const existing = out.get(row.member_id)

    if (existing) {
      existing.push(fact)
    } else {
      out.set(row.member_id, [fact])
    }
  }

  return out
}
