import 'server-only'

import { query } from '@/lib/db'

const ACTIVE_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE = `
  s.active = TRUE
  AND s.status != 'legacy_seed_archived'
  AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
  AND s.engagement_kind != 'regular'
`

const OUTCOME_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE = `
  s.status != 'legacy_seed_archived'
  AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
  AND s.engagement_kind != 'regular'
`

export const COMMERCIAL_HEALTH_OVERDUE_DECISION_DAYS = 14
export const COMMERCIAL_HEALTH_BUDGET_OVERRUN_MULTIPLIER = 1.2
export const COMMERCIAL_HEALTH_ZOMBIE_DAYS = 90
export const COMMERCIAL_HEALTH_STALE_PROGRESS_DAYS = 10
export const COMMERCIAL_HEALTH_CONVERSION_WINDOW_MONTHS = 6
export const COMMERCIAL_HEALTH_DEFAULT_CONVERSION_RATE_THRESHOLD = 0.3
export const COMMERCIAL_HEALTH_CONVERSION_RATE_THRESHOLD_ENV =
  'GREENHOUSE_COMMERCIAL_ENGAGEMENT_CONVERSION_RATE_THRESHOLD'

interface CountRow extends Record<string, unknown> {
  n: number | string
}

interface ConversionRateRow extends Record<string, unknown> {
  total_outcomes: number | string
  converted_outcomes: number | string
}

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

export const resolveCommercialEngagementConversionRateThreshold = (
  env: NodeJS.ProcessEnv = process.env
): number => {
  const raw = env[COMMERCIAL_HEALTH_CONVERSION_RATE_THRESHOLD_ENV]?.trim()

  if (!raw) return COMMERCIAL_HEALTH_DEFAULT_CONVERSION_RATE_THRESHOLD

  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return COMMERCIAL_HEALTH_DEFAULT_CONVERSION_RATE_THRESHOLD
  }

  return parsed > 1 ? parsed / 100 : parsed
}

const countFromSql = async (sql: string): Promise<number> => {
  const rows = await query<CountRow>(sql)

  return toNumber(rows[0]?.n)
}

export const countCommercialEngagementOverdueDecision = async (): Promise<number> =>
  countFromSql(`
    SELECT COUNT(DISTINCT s.service_id)::int AS n
    FROM greenhouse_core.services s
    JOIN greenhouse_commercial.engagement_phases p
      ON p.service_id = s.service_id
    WHERE ${ACTIVE_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE}
      AND p.phase_kind = 'reporting'
      AND p.status = 'completed'
      AND p.completed_at < NOW() - INTERVAL '${COMMERCIAL_HEALTH_OVERDUE_DECISION_DAYS} days'
      AND NOT EXISTS (
        SELECT 1
        FROM greenhouse_commercial.engagement_outcomes o
        WHERE o.service_id = s.service_id
      )
  `)

export const countCommercialEngagementBudgetOverrun = async (): Promise<number> =>
  countFromSql(`
    WITH actuals AS (
      SELECT
        service_id,
        COALESCE(SUM(amount_clp), 0)::numeric AS actual_internal_cost_clp
      FROM greenhouse_serving.commercial_cost_attribution_v2
      WHERE service_id IS NOT NULL
        AND attribution_intent IN ('pilot', 'trial', 'poc', 'discovery')
      GROUP BY service_id
    )
    SELECT COUNT(*)::int AS n
    FROM greenhouse_core.services s
    JOIN greenhouse_commercial.engagement_approvals a
      ON a.service_id = s.service_id
     AND a.status = 'approved'
    JOIN actuals ac
      ON ac.service_id = s.service_id
    WHERE ${ACTIVE_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE}
      AND ac.actual_internal_cost_clp > (
        a.expected_internal_cost_clp * ${COMMERCIAL_HEALTH_BUDGET_OVERRUN_MULTIPLIER}
      )
  `)

export const countCommercialEngagementZombie = async (): Promise<number> =>
  countFromSql(`
    SELECT COUNT(*)::int AS n
    FROM greenhouse_core.services s
    WHERE ${ACTIVE_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE}
      AND s.status = 'active'
      AND s.start_date < CURRENT_DATE - INTERVAL '${COMMERCIAL_HEALTH_ZOMBIE_DAYS} days'
      AND NOT EXISTS (
        SELECT 1
        FROM greenhouse_commercial.engagement_outcomes o
        WHERE o.service_id = s.service_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM greenhouse_commercial.engagement_lineage l
        WHERE l.parent_service_id = s.service_id
           OR l.child_service_id = s.service_id
      )
  `)

export const countCommercialEngagementUnapprovedActive = async (): Promise<number> =>
  countFromSql(`
    SELECT COUNT(*)::int AS n
    FROM greenhouse_core.services s
    WHERE ${ACTIVE_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE}
      AND s.status != 'pending_approval'
      AND NOT EXISTS (
        SELECT 1
        FROM greenhouse_commercial.engagement_approvals a
        WHERE a.service_id = s.service_id
          AND a.status = 'approved'
      )
  `)

export const countCommercialEngagementStaleProgress = async (): Promise<number> =>
  countFromSql(`
    SELECT COUNT(*)::int AS n
    FROM (
      SELECT s.service_id, MAX(ps.snapshot_date) AS last_snapshot
      FROM greenhouse_core.services s
      LEFT JOIN greenhouse_commercial.engagement_progress_snapshots ps
        ON ps.service_id = s.service_id
      WHERE ${ACTIVE_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE}
        AND s.status = 'active'
      GROUP BY s.service_id
      HAVING MAX(ps.snapshot_date) IS NULL
         OR MAX(ps.snapshot_date) < CURRENT_DATE - INTERVAL '${COMMERCIAL_HEALTH_STALE_PROGRESS_DAYS} days'
    ) stale
  `)

export interface CommercialEngagementConversionRateSnapshot {
  totalOutcomes: number
  convertedOutcomes: number
  conversionRate: number
}

export const getCommercialEngagementConversionRateSnapshot =
  async (): Promise<CommercialEngagementConversionRateSnapshot> => {
    const rows = await query<ConversionRateRow>(
      `SELECT
         COUNT(*)::int AS total_outcomes,
         COUNT(*) FILTER (WHERE o.outcome_kind = 'converted')::int AS converted_outcomes
       FROM greenhouse_commercial.engagement_outcomes o
       JOIN greenhouse_core.services s
         ON s.service_id = o.service_id
       WHERE ${OUTCOME_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE}
         AND o.decision_date >= CURRENT_DATE - INTERVAL '${COMMERCIAL_HEALTH_CONVERSION_WINDOW_MONTHS} months'`
    )

    const totalOutcomes = toNumber(rows[0]?.total_outcomes)
    const convertedOutcomes = toNumber(rows[0]?.converted_outcomes)

    return {
      totalOutcomes,
      convertedOutcomes,
      conversionRate: totalOutcomes > 0 ? convertedOutcomes / totalOutcomes : 1
    }
  }

export interface CommercialHealthCounts {
  overdueDecision: number
  budgetOverrun: number
  zombie: number
  unapprovedActive: number
  staleProgress: number
  conversion: CommercialEngagementConversionRateSnapshot
}

export const getCommercialHealthCounts = async (): Promise<CommercialHealthCounts> => {
  const [overdueDecision, budgetOverrun, zombie, unapprovedActive, staleProgress, conversion] = await Promise.all([
    countCommercialEngagementOverdueDecision(),
    countCommercialEngagementBudgetOverrun(),
    countCommercialEngagementZombie(),
    countCommercialEngagementUnapprovedActive(),
    countCommercialEngagementStaleProgress(),
    getCommercialEngagementConversionRateSnapshot()
  ])

  return {
    overdueDecision,
    budgetOverrun,
    zombie,
    unapprovedActive,
    staleProgress,
    conversion
  }
}
