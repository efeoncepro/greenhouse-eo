import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  listNuboxSales,
  listNuboxPurchases,
  listNuboxExpenses,
  listNuboxIncomes,
  fetchAllPages
} from '@/lib/nubox/client'
import { commitNuboxSyncPlan, resolveNuboxSyncPlan } from '@/lib/nubox/sync-plan'
import {
  mapSaleToRawRow,
  mapPurchaseToRawRow,
  mapExpenseToRawRow,
  mapIncomeToRawRow
} from '@/lib/nubox/mappers'
import type { NuboxRawSnapshotRow } from '@/lib/nubox/types'

// ─── Types ──────────────────────────────────────────────────────────────────

export type SyncNuboxRawResult = {
  syncRunId: string
  periods: string[]
  hotPeriods: string[]
  historicalPeriods: string[]
  salesFetched: number
  purchasesFetched: number
  expensesFetched: number
  incomesFetched: number
  totalWrittenRaw: number
  durationMs: number
  errors: string[]
}

// ─── Sync Run Tracking ──────────────────────────────────────────────────────

const writeSyncRun = async ({
  runId,
  objectType,
  status,
  watermarkKey,
  watermarkStartValue,
  watermarkEndValue,
  recordsRead = 0,
  recordsWrittenRaw = 0,
  notes
}: {
  runId: string
  objectType: string
  status: 'running' | 'succeeded' | 'failed' | 'partial'
  watermarkKey?: string | null
  watermarkStartValue?: string | null
  watermarkEndValue?: string | null
  recordsRead?: number
  recordsWrittenRaw?: number
  notes?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id, source_system, source_object_type, sync_mode,
      status, watermark_key, watermark_start_value, watermark_end_value,
      records_read, records_written_raw, triggered_by, notes, finished_at
    )
    VALUES ($1, 'nubox', $2, 'poll', $3, $4, $5, $6, $7, $8, 'nubox_sync', $9,
      CASE WHEN $3 = 'running' THEN NULL ELSE CURRENT_TIMESTAMP END)
    ON CONFLICT (sync_run_id) DO UPDATE SET
      status = EXCLUDED.status,
      watermark_key = EXCLUDED.watermark_key,
      watermark_start_value = EXCLUDED.watermark_start_value,
      watermark_end_value = EXCLUDED.watermark_end_value,
      records_read = EXCLUDED.records_read,
      records_written_raw = EXCLUDED.records_written_raw,
      notes = EXCLUDED.notes,
      finished_at = EXCLUDED.finished_at`,
    [
      runId,
      objectType,
      status,
      watermarkKey || null,
      watermarkStartValue || null,
      watermarkEndValue || null,
      recordsRead,
      recordsWrittenRaw,
      notes || null
    ]
  )
}

const writeSyncFailure = async ({
  runId,
  errorMessage,
  payload
}: {
  runId: string
  errorMessage: string
  payload?: Record<string, unknown>
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_failures (
      sync_failure_id, sync_run_id, source_system, source_object_type,
      error_message, payload_json, retryable
    )
    VALUES ($1, $2, 'nubox', 'raw_sync', $3, $4::jsonb, TRUE)`,
    [
      `fail-${randomUUID()}`,
      runId,
      errorMessage.slice(0, 2000),
      JSON.stringify(payload || {})
    ]
  )
}

// ─── BigQuery Insert ────────────────────────────────────────────────────────

const insertRawSnapshots = async (tableName: string, rows: NuboxRawSnapshotRow[]) => {
  if (rows.length === 0) return 0

  const bigQuery = getBigQueryClient()

  await bigQuery.dataset('greenhouse_raw').table(tableName).insert(rows)

  return rows.length
}

// ─── Main Sync Function ────────────────────────────────────────────────────

export const syncNuboxToRaw = async (options?: {
  periods?: string[]
}): Promise<SyncNuboxRawResult> => {
  const startMs = Date.now()
  const syncRunId = `nubox-raw-${randomUUID()}`
  const errors: string[] = []

  const manualPeriods = options?.periods?.map(period => period.trim()).filter(Boolean) || null

  const plan = manualPeriods
    ? {
        periods: Array.from(new Set(manualPeriods)),
        hotPeriods: Array.from(new Set(manualPeriods)),
        historicalPeriods: [] as string[],
        nextHistoricalCursor: null as string | null,
        windowStartPeriod: Array.from(new Set(manualPeriods)).sort()[0] || null,
        windowEndPeriod: Array.from(new Set(manualPeriods)).sort().slice(-1)[0] || null
      }
    : await resolveNuboxSyncPlan()

  const periods = plan.periods

  await writeSyncRun({
    runId: syncRunId,
    objectType: 'raw_sync',
    status: 'running',
    watermarkKey: 'period_window',
    watermarkStartValue: plan.windowStartPeriod,
    watermarkEndValue: plan.windowEndPeriod,
    notes: `Periods: ${periods.join(', ')}`
  })

  let salesFetched = 0
  let purchasesFetched = 0
  let expensesFetched = 0
  let incomesFetched = 0
  let totalWrittenRaw = 0

  // ── Sales ──
  try {
    for (const period of periods) {
      const sales = await fetchAllPages(listNuboxSales, period)
      const rows = sales.map(s => mapSaleToRawRow(s, syncRunId))

      totalWrittenRaw += await insertRawSnapshots('nubox_sales_snapshots', rows)
      salesFetched += sales.length
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    errors.push(`sales: ${msg}`)
    await writeSyncFailure({ runId: syncRunId, errorMessage: `sales sync failed: ${msg}` }).catch(() => {})
  }

  // ── Purchases ──
  try {
    for (const period of periods) {
      const purchases = await fetchAllPages(listNuboxPurchases, period)
      const rows = purchases.map(p => mapPurchaseToRawRow(p, syncRunId))

      totalWrittenRaw += await insertRawSnapshots('nubox_purchases_snapshots', rows)
      purchasesFetched += purchases.length
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    errors.push(`purchases: ${msg}`)
    await writeSyncFailure({ runId: syncRunId, errorMessage: `purchases sync failed: ${msg}` }).catch(() => {})
  }

  // ── Expenses ──
  try {
    for (const period of periods) {
      const expenses = await fetchAllPages(listNuboxExpenses, period)
      const rows = expenses.map(e => mapExpenseToRawRow(e, syncRunId))

      totalWrittenRaw += await insertRawSnapshots('nubox_expenses_snapshots', rows)
      expensesFetched += expenses.length
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    errors.push(`expenses: ${msg}`)
    await writeSyncFailure({ runId: syncRunId, errorMessage: `expenses sync failed: ${msg}` }).catch(() => {})
  }

  // ── Incomes ──
  try {
    for (const period of periods) {
      const incomes = await fetchAllPages(listNuboxIncomes, period)
      const rows = incomes.map(i => mapIncomeToRawRow(i, syncRunId))

      totalWrittenRaw += await insertRawSnapshots('nubox_incomes_snapshots', rows)
      incomesFetched += incomes.length
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    errors.push(`incomes: ${msg}`)
    await writeSyncFailure({ runId: syncRunId, errorMessage: `incomes sync failed: ${msg}` }).catch(() => {})
  }

  // ── Finalize ──
  const totalRead = salesFetched + purchasesFetched + expensesFetched + incomesFetched

  const finalStatus: 'succeeded' | 'partial' | 'failed' =
    errors.length === 0 ? 'succeeded' : (totalWrittenRaw > 0 ? 'partial' : 'failed')

  const planNotes = [
    `Periods: ${periods.join(', ')}`,
    plan.historicalPeriods.length > 0 ? `Historical sweep: ${plan.historicalPeriods.join(', ')}` : null,
    errors.length > 0 ? `Errors: ${errors.join('; ')}` : null
  ]
    .filter(Boolean)
    .join(' | ')

  await writeSyncRun({
    runId: syncRunId,
    objectType: 'raw_sync',
    status: finalStatus,
    watermarkKey: 'period_window',
    watermarkStartValue: plan.windowStartPeriod,
    watermarkEndValue: plan.windowEndPeriod,
    recordsRead: totalRead,
    recordsWrittenRaw: totalWrittenRaw,
    notes: planNotes || null
  })

  if (!manualPeriods && finalStatus === 'succeeded') {
    await commitNuboxSyncPlan({
      syncRunId,
      nextHistoricalCursor: plan.nextHistoricalCursor
    })
  }

  return {
    syncRunId,
    periods,
    hotPeriods: plan.hotPeriods,
    historicalPeriods: plan.historicalPeriods,
    salesFetched,
    purchasesFetched,
    expensesFetched,
    incomesFetched,
    totalWrittenRaw,
    durationMs: Date.now() - startMs,
    errors
  }
}
