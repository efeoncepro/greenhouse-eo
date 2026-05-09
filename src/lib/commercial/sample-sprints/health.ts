import 'server-only'

import { query } from '@/lib/db'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

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

/**
 * TASK-835 Slice 4 — tenant scope opcional.
 *
 * Cuando `options.tenantContext` está presente, agrega el mismo predicate
 * que `store.tenantScopePredicate` para filtrar por `space_id` (cuando el
 * subject tiene uno asignado) y/o `client_id` (cuando el subject es de
 * tenant_type='client').
 *
 * Cuando ausente: comportamiento global preservado 100% — el reliability
 * dashboard `/admin/operations` y todos los consumers actuales siguen igual.
 *
 * Si el subject es Efeonce admin sin spaceId asignado, el predicate queda
 * vacío y la query devuelve los counts globales — exactamente lo que un
 * admin esperaría ver.
 */
export interface CommercialHealthScopeOptions {
  tenantContext?: TenantContext | null
}

interface ScopePredicate {
  /** SQL fragment to append at the end of the WHERE clause. May be empty. */
  sql: string
  /** Values to append to the params array. */
  values: unknown[]
}

const buildHealthTenantScope = (
  options: CommercialHealthScopeOptions | undefined,
  startIndex: number,
  servicesAlias = 's'
): ScopePredicate => {
  const tenant = options?.tenantContext

  if (!tenant) return { sql: '', values: [] }

  const values: unknown[] = []
  const clauses: string[] = []

  if (tenant.spaceId) {
    values.push(tenant.spaceId)
    clauses.push(`${servicesAlias}.space_id = $${startIndex + values.length - 1}`)
  }

  if (tenant.tenantType === 'client' && tenant.clientId) {
    values.push(tenant.clientId)
    clauses.push(`EXISTS (
      SELECT 1
      FROM greenhouse_core.spaces sp_scope
      WHERE sp_scope.space_id = ${servicesAlias}.space_id
        AND sp_scope.client_id = $${startIndex + values.length - 1}
    )`)
  }

  if (clauses.length === 0) return { sql: '', values: [] }

  return { sql: `AND ${clauses.join(' AND ')}`, values }
}

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

const countFromSql = async (sql: string, params: unknown[] = []): Promise<number> => {
  const rows = params.length > 0 ? await query<CountRow>(sql, params) : await query<CountRow>(sql)

  return toNumber(rows[0]?.n)
}

export const countCommercialEngagementOverdueDecision = async (
  options?: CommercialHealthScopeOptions
): Promise<number> => {
  const scope = buildHealthTenantScope(options, 1)

  return countFromSql(`
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
      ${scope.sql}
  `, scope.values)
}

export const countCommercialEngagementBudgetOverrun = async (
  options?: CommercialHealthScopeOptions
): Promise<number> => {
  const scope = buildHealthTenantScope(options, 1)

  return countFromSql(`
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
      ${scope.sql}
  `, scope.values)
}

export const countCommercialEngagementZombie = async (
  options?: CommercialHealthScopeOptions
): Promise<number> => {
  const scope = buildHealthTenantScope(options, 1)

  return countFromSql(`
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
      ${scope.sql}
  `, scope.values)
}

export const countCommercialEngagementUnapprovedActive = async (
  options?: CommercialHealthScopeOptions
): Promise<number> => {
  const scope = buildHealthTenantScope(options, 1)

  return countFromSql(`
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
      ${scope.sql}
  `, scope.values)
}

export const countCommercialEngagementStaleProgress = async (
  options?: CommercialHealthScopeOptions
): Promise<number> => {
  const scope = buildHealthTenantScope(options, 1)

  return countFromSql(`
    SELECT COUNT(*)::int AS n
    FROM (
      SELECT s.service_id, MAX(ps.snapshot_date) AS last_snapshot
      FROM greenhouse_core.services s
      LEFT JOIN greenhouse_commercial.engagement_progress_snapshots ps
        ON ps.service_id = s.service_id
      WHERE ${ACTIVE_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE}
        AND s.status = 'active'
        ${scope.sql}
      GROUP BY s.service_id
      HAVING MAX(ps.snapshot_date) IS NULL
         OR MAX(ps.snapshot_date) < CURRENT_DATE - INTERVAL '${COMMERCIAL_HEALTH_STALE_PROGRESS_DAYS} days'
    ) stale
  `, scope.values)
}

export interface CommercialEngagementConversionRateSnapshot {
  totalOutcomes: number
  convertedOutcomes: number
  conversionRate: number
}

export const getCommercialEngagementConversionRateSnapshot = async (
  options?: CommercialHealthScopeOptions
): Promise<CommercialEngagementConversionRateSnapshot> => {
  const scope = buildHealthTenantScope(options, 1)

  const sql = `SELECT
     COUNT(*)::int AS total_outcomes,
     COUNT(*) FILTER (WHERE o.outcome_kind = 'converted')::int AS converted_outcomes
   FROM greenhouse_commercial.engagement_outcomes o
   JOIN greenhouse_core.services s
     ON s.service_id = o.service_id
   WHERE ${OUTCOME_ELIGIBLE_NON_REGULAR_SERVICE_PREDICATE}
     AND o.decision_date >= CURRENT_DATE - INTERVAL '${COMMERCIAL_HEALTH_CONVERSION_WINDOW_MONTHS} months'
     ${scope.sql}`

  const rows = scope.values.length > 0
    ? await query<ConversionRateRow>(sql, scope.values)
    : await query<ConversionRateRow>(sql)

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

export const getCommercialHealthCounts = async (
  options?: CommercialHealthScopeOptions
): Promise<CommercialHealthCounts> => {
  const [overdueDecision, budgetOverrun, zombie, unapprovedActive, staleProgress, conversion] = await Promise.all([
    countCommercialEngagementOverdueDecision(options),
    countCommercialEngagementBudgetOverrun(options),
    countCommercialEngagementZombie(options),
    countCommercialEngagementUnapprovedActive(options),
    countCommercialEngagementStaleProgress(options),
    getCommercialEngagementConversionRateSnapshot(options)
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
