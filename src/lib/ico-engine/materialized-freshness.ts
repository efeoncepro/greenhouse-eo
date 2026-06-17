export type MaterializedFreshnessStatus = 'fresh' | 'stale' | 'unknown'

export type MaterializedFreshnessReason =
  | 'historical_period'
  | 'incomplete_materialization'
  | 'missing_materialized_at'
  | 'source_snapshot_newer'
  | 'current_period_cache_too_old'
  | 'fresh_within_tolerance'
  | 'invalid_materialized_at'

export interface MaterializedFreshnessDecision {
  status: MaterializedFreshnessStatus
  reason: MaterializedFreshnessReason
  materializedAt: string | null
  sourceFreshnessAt: string | null
}

export interface EvaluateMemberMetricFreshnessInput {
  periodYear: number
  periodMonth: number
  materializedAt: string | { value?: string } | null | undefined
  sourceFreshnessAt?: string | { value?: string } | null
  now?: Date
  maxCurrentPeriodAgeMs?: number
  sourceFreshnessToleranceMs?: number
  timeZone?: string
}

export const CURRENT_PERIOD_MEMBER_METRIC_MAX_AGE_MS = 36 * 60 * 60 * 1000
export const SOURCE_FRESHNESS_TOLERANCE_MS = 10 * 60 * 1000
export const DEFAULT_ICO_FRESHNESS_TIME_ZONE = 'America/Santiago'

const toTimestampString = (value: string | { value?: string } | null | undefined): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value

  return typeof value.value === 'string' ? value.value : null
}

const toMillis = (value: string | null): number | null => {
  if (!value) return null

  const parsed = Date.parse(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const resolvePeriodInTimeZone = (
  now: Date = new Date(),
  timeZone = DEFAULT_ICO_FRESHNESS_TIME_ZONE
): { year: number; month: number } => {
  const formatted = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
  const match = formatted.match(/^(\d{4})-(\d{2})-\d{2}$/)

  if (!match) {
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    }
  }

  return {
    year: Number(match[1]),
    month: Number(match[2])
  }
}

export const isCurrentPeriod = ({
  periodYear,
  periodMonth,
  now = new Date(),
  timeZone = DEFAULT_ICO_FRESHNESS_TIME_ZONE
}: {
  periodYear: number
  periodMonth: number
  now?: Date
  timeZone?: string
}): boolean => {
  const current = resolvePeriodInTimeZone(now, timeZone)

  return current.year === periodYear && current.month === periodMonth
}

export const evaluateMemberMetricFreshness = ({
  periodYear,
  periodMonth,
  materializedAt,
  sourceFreshnessAt = null,
  now = new Date(),
  maxCurrentPeriodAgeMs = CURRENT_PERIOD_MEMBER_METRIC_MAX_AGE_MS,
  sourceFreshnessToleranceMs = SOURCE_FRESHNESS_TOLERANCE_MS,
  timeZone = DEFAULT_ICO_FRESHNESS_TIME_ZONE
}: EvaluateMemberMetricFreshnessInput): MaterializedFreshnessDecision => {
  const normalizedMaterializedAt = toTimestampString(materializedAt)
  const normalizedSourceFreshnessAt = toTimestampString(sourceFreshnessAt)
  const materializedMs = toMillis(normalizedMaterializedAt)
  const sourceMs = toMillis(normalizedSourceFreshnessAt)

  if (!normalizedMaterializedAt) {
    return {
      status: 'stale',
      reason: 'missing_materialized_at',
      materializedAt: null,
      sourceFreshnessAt: normalizedSourceFreshnessAt
    }
  }

  if (materializedMs === null) {
    return {
      status: 'unknown',
      reason: 'invalid_materialized_at',
      materializedAt: normalizedMaterializedAt,
      sourceFreshnessAt: normalizedSourceFreshnessAt
    }
  }

  if (sourceMs !== null && sourceMs - materializedMs > sourceFreshnessToleranceMs) {
    return {
      status: 'stale',
      reason: 'source_snapshot_newer',
      materializedAt: normalizedMaterializedAt,
      sourceFreshnessAt: normalizedSourceFreshnessAt
    }
  }

  const requestedPeriodIsCurrent = isCurrentPeriod({ periodYear, periodMonth, now, timeZone })

  if (!requestedPeriodIsCurrent) {
    return {
      status: 'fresh',
      reason: 'historical_period',
      materializedAt: normalizedMaterializedAt,
      sourceFreshnessAt: normalizedSourceFreshnessAt
    }
  }

  if (now.getTime() - materializedMs > maxCurrentPeriodAgeMs) {
    return {
      status: 'stale',
      reason: 'current_period_cache_too_old',
      materializedAt: normalizedMaterializedAt,
      sourceFreshnessAt: normalizedSourceFreshnessAt
    }
  }

  return {
    status: 'fresh',
    reason: 'fresh_within_tolerance',
    materializedAt: normalizedMaterializedAt,
    sourceFreshnessAt: normalizedSourceFreshnessAt
  }
}
