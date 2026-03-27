import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type {
  PeriodStatus,
  ProjectedPayrollPromotion,
  ProjectedPayrollPromotionRecord,
  ProjectionMode
} from '@/types/payroll'

import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

type PgPromotionRow = {
  promotion_id: string
  period_id: string
  period_year: number | string
  period_month: number | string
  projection_mode: string
  as_of_date: string | Date
  source_snapshot_count: number | string
  promoted_entry_count: number | string
  source_period_status: string | null
  actor_user_id: string | null
  actor_identifier: string | null
  promotion_status: string
  promoted_at: string | Date | null
  failure_reason: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

let ensured = false

const toDateString = (value: string | Date | null | undefined) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return typeof value === 'string' ? value.slice(0, 10) : null
}

const toTimestampString = (value: string | Date | null | undefined) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return typeof value === 'string' ? value : null
}

const toNumber = (value: number | string) => Number(value)

const normalizePeriodStatus = (value: string | null): PeriodStatus | null => {
  if (value === 'draft' || value === 'calculated' || value === 'approved' || value === 'exported') {
    return value
  }

  return null
}

const normalizeProjectionMode = (value: string): ProjectionMode =>
  value === 'actual_to_date' ? 'actual_to_date' : 'projected_month_end'

const normalizePromotionStatus = (value: string): ProjectedPayrollPromotionRecord['promotionStatus'] => {
  if (value === 'completed' || value === 'failed') {
    return value
  }

  return 'started'
}

const mapPromotionRow = (row: PgPromotionRow): ProjectedPayrollPromotionRecord => ({
  promotionId: row.promotion_id,
  periodId: row.period_id,
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  projectionMode: normalizeProjectionMode(row.projection_mode),
  asOfDate: toDateString(row.as_of_date) || '',
  sourceSnapshotCount: toNumber(row.source_snapshot_count),
  promotedEntryCount: toNumber(row.promoted_entry_count),
  sourcePeriodStatus: normalizePeriodStatus(row.source_period_status),
  actorUserId: row.actor_user_id,
  actorIdentifier: row.actor_identifier,
  promotionStatus: normalizePromotionStatus(row.promotion_status),
  promotedAt: toTimestampString(row.promoted_at),
  failureReason: row.failure_reason,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const ensureSchema = async () => {
  if (ensured || !isGreenhousePostgresConfigured()) {
    return
  }

  await runGreenhousePostgresQuery(`
    CREATE TABLE IF NOT EXISTS greenhouse_payroll.projected_payroll_promotions (
      promotion_id TEXT PRIMARY KEY,
      period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
      period_year INT NOT NULL,
      period_month INT NOT NULL,
      projection_mode TEXT NOT NULL CHECK (projection_mode IN ('actual_to_date', 'projected_month_end')),
      as_of_date DATE NOT NULL,
      source_snapshot_count INT NOT NULL DEFAULT 0,
      promoted_entry_count INT NOT NULL DEFAULT 0,
      source_period_status TEXT,
      actor_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
      actor_identifier TEXT,
      promotion_status TEXT NOT NULL DEFAULT 'started' CHECK (promotion_status IN ('started', 'completed', 'failed')),
      promoted_at TIMESTAMPTZ,
      failure_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_projected_payroll_promotions_period
      ON greenhouse_payroll.projected_payroll_promotions (period_year, period_month, projection_mode);
  `)

  ensured = true
}

type CreatePromotionInput = {
  periodId: string
  periodYear: number
  periodMonth: number
  projectionMode: ProjectionMode
  asOfDate: string
  sourceSnapshotCount: number
  sourcePeriodStatus: PeriodStatus | null
  actorUserId: string | null
  actorIdentifier: string | null
}

export const pgCreateProjectedPayrollPromotion = async (
  input: CreatePromotionInput
): Promise<ProjectedPayrollPromotionRecord> => {
  await ensureSchema()

  return withGreenhousePostgresTransaction(async client => {
    const promotionId = `projprom_${randomUUID()}`

    const [row] = await client.query<PgPromotionRow>(
      `
        INSERT INTO greenhouse_payroll.projected_payroll_promotions (
          promotion_id,
          period_id,
          period_year,
          period_month,
          projection_mode,
          as_of_date,
          source_snapshot_count,
          promoted_entry_count,
          source_period_status,
          actor_user_id,
          actor_identifier,
          promotion_status
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, $7, 0, $8, $9, $10, 'started')
        RETURNING *
      `,
      [
        promotionId,
        input.periodId,
        input.periodYear,
        input.periodMonth,
        input.projectionMode,
        input.asOfDate,
        input.sourceSnapshotCount,
        input.sourcePeriodStatus,
        input.actorUserId,
        input.actorIdentifier
      ]
    ).then(result => result.rows)

    return mapPromotionRow(row)
  })
}

const updatePromotionStatus = async ({
  promotionId,
  status,
  promotedEntryCount,
  failureReason
}: {
  promotionId: string
  status: ProjectedPayrollPromotionRecord['promotionStatus']
  promotedEntryCount: number
  failureReason?: string | null
}) => {
  await ensureSchema()

  const [row] = await runGreenhousePostgresQuery<PgPromotionRow>(
    `
      UPDATE greenhouse_payroll.projected_payroll_promotions
      SET
        promotion_status = $2,
        promoted_entry_count = $3,
        promoted_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE promoted_at END,
        failure_reason = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE promotion_id = $1
      RETURNING *
    `,
    [promotionId, status, promotedEntryCount, failureReason ?? null]
  )

  return row ? mapPromotionRow(row) : null
}

export const pgMarkProjectedPayrollPromotionCompleted = async ({
  promotionId,
  promotedEntryCount
}: {
  promotionId: string
  promotedEntryCount: number
}) => updatePromotionStatus({
  promotionId,
  status: 'completed',
  promotedEntryCount,
  failureReason: null
})

export const pgMarkProjectedPayrollPromotionFailed = async ({
  promotionId,
  failureReason
}: {
  promotionId: string
  failureReason: string
}) => updatePromotionStatus({
  promotionId,
  status: 'failed',
  promotedEntryCount: 0,
  failureReason
})

export const pgGetLatestProjectedPayrollPromotion = async ({
  year,
  month,
  mode
}: {
  year: number
  month: number
  mode: ProjectionMode
}): Promise<ProjectedPayrollPromotion | null> => {
  await ensureSchema()

  const [row] = await runGreenhousePostgresQuery<PgPromotionRow>(
    `
      SELECT *
      FROM greenhouse_payroll.projected_payroll_promotions
      WHERE period_year = $1
        AND period_month = $2
        AND projection_mode = $3
        AND promotion_status = 'completed'
      ORDER BY promoted_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `,
    [year, month, mode]
  )

  if (!row) {
    return null
  }

  const mapped = mapPromotionRow(row)

  return {
    promotionId: mapped.promotionId,
    periodId: mapped.periodId,
    periodYear: mapped.periodYear,
    periodMonth: mapped.periodMonth,
    projectionMode: mapped.projectionMode,
    asOfDate: mapped.asOfDate,
    sourceSnapshotCount: mapped.sourceSnapshotCount,
    promotedEntryCount: mapped.promotedEntryCount,
    promotedByUserId: mapped.actorUserId,
    promotedByActor: mapped.actorIdentifier,
    createdAt: mapped.createdAt
  }
}

export const publishProjectedPayrollPromotionEvents = async ({
  promotion,
  periodId,
  periodStatus,
  promotedEntryCount
}: {
  promotion: ProjectedPayrollPromotionRecord
  periodId: string
  periodStatus: PeriodStatus
  promotedEntryCount: number
}) => {
  await withGreenhousePostgresTransaction(async client => {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.projectedPayroll,
        aggregateId: `${promotion.periodYear}-${String(promotion.periodMonth).padStart(2, '0')}`,
        eventType: EVENT_TYPES.projectedPayrollPromotedToOfficialDraft,
        payload: {
          promotionId: promotion.promotionId,
          periodId,
          periodYear: promotion.periodYear,
          periodMonth: promotion.periodMonth,
          projectionMode: promotion.projectionMode,
          asOfDate: promotion.asOfDate,
          sourceSnapshotCount: promotion.sourceSnapshotCount,
          promotedEntryCount
        }
      },
      client as unknown as PoolClient
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.payrollPeriod,
        aggregateId: periodId,
        eventType: EVENT_TYPES.payrollPeriodRecalculatedFromProjection,
        payload: {
          promotionId: promotion.promotionId,
          periodId,
          periodStatus,
          projectionMode: promotion.projectionMode,
          asOfDate: promotion.asOfDate,
          promotedEntryCount
        }
      },
      client as unknown as PoolClient
    )
  })
}
