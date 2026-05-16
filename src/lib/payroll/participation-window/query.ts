import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Per-member facts the policy resolver needs from PG, hydrated in a single
 * bulk query for the period's roster.
 *
 * The query is **observe-without-consume** for onboarding source dates: the
 * LEFT JOIN against `work_relationship_onboarding_cases` populates
 * `onboardingStartDate` so the policy can emit a `source_date_disagreement`
 * warning, but V1 NEVER uses it for the canonical `eligibleFrom` decision.
 * That hard rule is documented in the ADR §"Source Precedence — V1 explicit
 * single entry source".
 */
export type ParticipationFactsRow = {
  memberId: string
  compensationEffectiveFrom: string
  compensationEffectiveTo: string | null
  onboardingStartDate: string | null
}

type DbRow = {
  member_id: string
  compensation_effective_from: string
  compensation_effective_to: string | null
  onboarding_start_date: string | null
}

const FETCH_PARTICIPATION_FACTS_SQL = `
  WITH active_comp AS (
    SELECT DISTINCT ON (cv.member_id)
      cv.member_id,
      cv.effective_from AS compensation_effective_from,
      cv.effective_to AS compensation_effective_to
    FROM greenhouse_payroll.compensation_versions cv
    WHERE cv.member_id = ANY($1::text[])
      AND cv.effective_from <= $3::date
      AND (cv.effective_to IS NULL OR cv.effective_to >= $2::date)
    ORDER BY cv.member_id, cv.effective_from DESC
  ),
  /*
   * Most-recent non-cancelled onboarding case per member. Observe-only: the
   * policy resolver consumes \`start_date\` ONLY to emit the V1.1 drift signal.
   * NEVER feed this into \`eligibleFrom\` directly in V1.
   *
   * "Most recent" = highest start_date (NULLS LAST) among non-cancelled cases.
   */
  recent_onboarding AS (
    SELECT DISTINCT ON (o.member_id)
      o.member_id,
      o.start_date
    FROM greenhouse_hr.work_relationship_onboarding_cases o
    WHERE o.member_id = ANY($1::text[])
      AND COALESCE(o.status, '') NOT IN ('cancelled')
      AND o.start_date IS NOT NULL
    ORDER BY o.member_id, o.start_date DESC, o.created_at DESC
  )
  SELECT
    ac.member_id,
    TO_CHAR(ac.compensation_effective_from, 'YYYY-MM-DD') AS compensation_effective_from,
    CASE WHEN ac.compensation_effective_to IS NULL THEN NULL
         ELSE TO_CHAR(ac.compensation_effective_to, 'YYYY-MM-DD')
    END AS compensation_effective_to,
    CASE WHEN ro.start_date IS NULL THEN NULL
         ELSE TO_CHAR(ro.start_date, 'YYYY-MM-DD')
    END AS onboarding_start_date
  FROM active_comp ac
  LEFT JOIN recent_onboarding ro ON ro.member_id = ac.member_id
`

/**
 * Bulk fetch participation facts for the given members + period.
 *
 * Returns a Map keyed by `memberId`. Members without an applicable
 * compensation version are **silently absent** from the map — the upstream
 * roster gate (`pgGetApplicableCompensationVersionsForPeriod`) is the source
 * of truth for who enters payroll, and this query should never reach members
 * outside that roster.
 *
 * Defensive degradation: if the query throws, the resolver wrapper (Slice 2
 * `resolver.ts`) catches and degrades per-member by emitting an
 * `exit_resolver_failed`-shaped warning — but for participation FACTS the
 * failure surfaces as throwing. The Slice 3 integration is responsible for
 * catch + fall-back-to-legacy at the consumer boundary.
 */
export const fetchParticipationFactsForMembers = async (
  memberIds: ReadonlyArray<string>,
  periodStart: string,
  periodEnd: string
): Promise<Map<string, ParticipationFactsRow>> => {
  if (memberIds.length === 0) {
    return new Map()
  }

  const rows = await runGreenhousePostgresQuery<DbRow>(FETCH_PARTICIPATION_FACTS_SQL, [
    [...memberIds],
    periodStart,
    periodEnd
  ])

  const out = new Map<string, ParticipationFactsRow>()

  for (const row of rows) {
    out.set(row.member_id, {
      memberId: row.member_id,
      compensationEffectiveFrom: row.compensation_effective_from,
      compensationEffectiveTo: row.compensation_effective_to,
      onboardingStartDate: row.onboarding_start_date
    })
  }

  return out
}
