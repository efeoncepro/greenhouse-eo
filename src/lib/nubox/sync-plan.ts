import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/
const DEFAULT_HISTORY_START_PERIOD = '2023-01'
const DEFAULT_HOT_WINDOW_MONTHS = 3
const DEFAULT_HISTORICAL_BATCH_MONTHS = 1
const WATERMARK_KEY = 'historical_period_cursor'

export type NuboxSyncPlan = {
  periods: string[]
  hotPeriods: string[]
  historicalPeriods: string[]
  nextHistoricalCursor: string | null
  windowStartPeriod: string | null
  windowEndPeriod: string | null
}

type ResolvedPlanConfig = {
  historyStartPeriod: string
  hotWindowMonths: number
  historicalBatchMonths: number
}

const normalizePositiveInt = (value: string | undefined, fallback: number, min = 1, max = 24) => {
  const parsed = Number.parseInt((value || '').trim(), 10)

  if (!Number.isFinite(parsed)) return fallback

  return Math.max(min, Math.min(max, parsed))
}

export const normalizePeriod = (period: string | null | undefined): string | null => {
  const value = period?.trim()

  if (!value || !PERIOD_REGEX.test(value)) {
    return null
  }

  return value
}

export const formatPeriod = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

export const addMonthsToPeriod = (period: string, offset: number) => {
  const normalized = normalizePeriod(period)

  if (!normalized) {
    throw new Error(`Invalid Nubox sync period: ${period}`)
  }

  const [year, month] = normalized.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))

  return formatPeriod(date.getUTCFullYear(), date.getUTCMonth() + 1)
}

export const comparePeriods = (left: string, right: string) => {
  if (left === right) return 0

  return left < right ? -1 : 1
}

const uniquePeriods = (periods: string[]) => Array.from(new Set(periods))

export const getCurrentPeriod = (now = new Date()) => formatPeriod(now.getUTCFullYear(), now.getUTCMonth() + 1)

export const buildNuboxSyncPlan = ({
  now = new Date(),
  historyStartPeriod,
  hotWindowMonths,
  historicalBatchMonths,
  historicalCursorPeriod
}: {
  now?: Date
  historyStartPeriod: string
  hotWindowMonths: number
  historicalBatchMonths: number
  historicalCursorPeriod?: string | null
}): NuboxSyncPlan => {
  const currentPeriod = getCurrentPeriod(now)
  const normalizedHistoryStart = normalizePeriod(historyStartPeriod)

  if (!normalizedHistoryStart) {
    throw new Error(`Invalid NUBOX_SYNC_HISTORY_START_PERIOD: ${historyStartPeriod}`)
  }

  const safeHotWindowMonths = Math.max(1, hotWindowMonths)
  const hotPeriods = Array.from({ length: safeHotWindowMonths }, (_, index) => addMonthsToPeriod(currentPeriod, -index))
  const oldestHotPeriod = hotPeriods[hotPeriods.length - 1]
  const historicalMaxPeriod = addMonthsToPeriod(oldestHotPeriod, -1)

  const historicalPeriods: string[] = []
  let nextHistoricalCursor: string | null = null

  if (historicalBatchMonths > 0 && comparePeriods(normalizedHistoryStart, historicalMaxPeriod) <= 0) {
    let cursor = normalizePeriod(historicalCursorPeriod) || normalizedHistoryStart

    if (
      comparePeriods(cursor, normalizedHistoryStart) < 0 ||
      comparePeriods(cursor, historicalMaxPeriod) > 0
    ) {
      cursor = normalizedHistoryStart
    }

    for (let offset = 0; offset < historicalBatchMonths; offset++) {
      const candidate = addMonthsToPeriod(cursor, offset)

      if (comparePeriods(candidate, historicalMaxPeriod) > 0) {
        break
      }

      historicalPeriods.push(candidate)
    }

    const advancedCursor = addMonthsToPeriod(cursor, historicalPeriods.length || 1)

    nextHistoricalCursor =
      comparePeriods(advancedCursor, historicalMaxPeriod) <= 0
        ? advancedCursor
        : normalizedHistoryStart
  }

  const periods = uniquePeriods([...hotPeriods, ...historicalPeriods]).sort((left, right) => comparePeriods(right, left))

  return {
    periods,
    hotPeriods,
    historicalPeriods,
    nextHistoricalCursor,
    windowStartPeriod: periods[periods.length - 1] || null,
    windowEndPeriod: periods[0] || null
  }
}

const resolvePlanConfig = (): ResolvedPlanConfig => ({
  historyStartPeriod: normalizePeriod(process.env.NUBOX_SYNC_HISTORY_START_PERIOD) || DEFAULT_HISTORY_START_PERIOD,
  hotWindowMonths: normalizePositiveInt(
    process.env.NUBOX_SYNC_HOT_WINDOW_MONTHS,
    DEFAULT_HOT_WINDOW_MONTHS,
    1,
    12
  ),
  historicalBatchMonths: normalizePositiveInt(
    process.env.NUBOX_SYNC_HISTORICAL_BATCH_MONTHS,
    DEFAULT_HISTORICAL_BATCH_MONTHS,
    0,
    12
  )
})

const readHistoricalCursor = async () => {
  const rows = await runGreenhousePostgresQuery<{ watermark_value: string | null }>(
    `SELECT watermark_value
     FROM greenhouse_sync.source_sync_watermarks
     WHERE source_system = 'nubox'
       AND source_object_type = 'raw_sync'
       AND watermark_key = $1
     LIMIT 1`,
    [WATERMARK_KEY]
  )

  return rows[0]?.watermark_value || null
}

export const resolveNuboxSyncPlan = async (now = new Date()) => {
  const config = resolvePlanConfig()
  const historicalCursor = await readHistoricalCursor()

  const plan = buildNuboxSyncPlan({
    now,
    historyStartPeriod: config.historyStartPeriod,
    hotWindowMonths: config.hotWindowMonths,
    historicalBatchMonths: config.historicalBatchMonths,
    historicalCursorPeriod: historicalCursor
  })

  return {
    ...plan,
    config
  }
}

export const commitNuboxSyncPlan = async ({
  syncRunId,
  nextHistoricalCursor
}: {
  syncRunId: string
  nextHistoricalCursor: string | null
}) => {
  if (!nextHistoricalCursor) {
    return
  }

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_watermarks (
      watermark_id, source_system, source_object_type, watermark_key,
      watermark_value, watermark_updated_at, sync_run_id, updated_at
    )
    VALUES ($1, 'nubox', 'raw_sync', $2, $3, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (source_system, source_object_type, watermark_key)
    DO UPDATE SET
      watermark_value = EXCLUDED.watermark_value,
      watermark_updated_at = EXCLUDED.watermark_updated_at,
      sync_run_id = EXCLUDED.sync_run_id,
      updated_at = CURRENT_TIMESTAMP`,
    [`wm-${randomUUID()}`, WATERMARK_KEY, nextHistoricalCursor, syncRunId]
  )
}
