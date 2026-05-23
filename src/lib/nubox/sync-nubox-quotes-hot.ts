import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient } from '@/lib/bigquery'
import {
  listNuboxSales,
  fetchAllPages,
  NuboxApiError
} from '@/lib/nubox/client'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  buildNuboxIncomeByNuboxIdMap,
  buildNuboxOrgByRutMap,
  writeNuboxConformedSales
} from '@/lib/nubox/sync-nubox-conformed'
import { mapSaleToConformed, mapSaleToRawRow } from '@/lib/nubox/mappers'
import { addMonthsToPeriod, getCurrentPeriod } from '@/lib/nubox/sync-plan'
import {
  upsertNuboxQuoteFromSale,
  type NuboxProjectionSale
} from '@/lib/nubox/sync-nubox-to-postgres'
import { getGreenhousePostgresPool, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { NuboxRawSnapshotRow, NuboxSale } from '@/lib/nubox/types'

const LOCK_KEY = 'greenhouse:nubox:quotes_hot_sync:v1'
const DEFAULT_HOT_WINDOW_MONTHS = 2
const MAX_HOT_WINDOW_MONTHS = 6

export type SyncNuboxQuotesHotResult = {
  syncRunId: string
  skipped: boolean
  skipReason?: string
  periods: string[]
  salesFetched: number
  quoteSalesFetched: number
  rawWritten: number
  conformedWritten: number
  quotesCreated: number
  quotesUpdated: number
  quotesSkipped: number
  durationMs: number
}

const normalizePositiveInt = (value: string | undefined, fallback: number, min = 1, max = MAX_HOT_WINDOW_MONTHS) => {
  const parsed = Number.parseInt((value || '').trim(), 10)

  if (!Number.isFinite(parsed)) return fallback

  return Math.max(min, Math.min(max, parsed))
}

const resolveHotPeriods = (periods?: string[]) => {
  const manualPeriods = periods?.map(period => period.trim()).filter(Boolean)

  if (manualPeriods?.length) {
    return Array.from(new Set(manualPeriods)).sort().reverse()
  }

  const windowMonths = normalizePositiveInt(
    process.env.NUBOX_QUOTES_HOT_WINDOW_MONTHS,
    DEFAULT_HOT_WINDOW_MONTHS
  )

  const currentPeriod = getCurrentPeriod()

  return Array.from({ length: windowMonths }, (_, index) => addMonthsToPeriod(currentPeriod, -index))
}

const isQuoteSale = (sale: NuboxSale) => {
  const legalCode = sale.type?.legalCode?.trim()
  const abbreviation = sale.type?.abbreviation?.trim().toUpperCase()
  const typeName = sale.type?.name?.trim().toLowerCase()

  return legalCode === '52' || legalCode === 'COT' || abbreviation === 'COT' || typeName?.includes('cotiz')
}

const writeSyncRun = async ({
  runId,
  status,
  periods,
  recordsRead = 0,
  recordsWrittenRaw = 0,
  recordsWrittenConformed = 0,
  recordsProjectedPostgres = 0,
  notes
}: {
  runId: string
  status: 'running' | 'succeeded' | 'failed' | 'partial'
  periods: string[]
  recordsRead?: number
  recordsWrittenRaw?: number
  recordsWrittenConformed?: number
  recordsProjectedPostgres?: number
  notes?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id, source_system, source_object_type, sync_mode,
      status, watermark_key, watermark_start_value, watermark_end_value,
      records_read, records_written_raw, records_written_conformed, records_projected_postgres,
      triggered_by, notes, finished_at
    )
    VALUES ($1, 'nubox', 'quotes_hot_sync', 'incremental',
      $2, 'period_window', $3, $4,
      $5, $6, $7, $8,
      'nubox_quotes_hot_sync', $9,
      CASE WHEN $2 = 'running' THEN NULL ELSE CURRENT_TIMESTAMP END)
    ON CONFLICT (sync_run_id) DO UPDATE SET
      status = EXCLUDED.status,
      watermark_start_value = EXCLUDED.watermark_start_value,
      watermark_end_value = EXCLUDED.watermark_end_value,
      records_read = EXCLUDED.records_read,
      records_written_raw = EXCLUDED.records_written_raw,
      records_written_conformed = EXCLUDED.records_written_conformed,
      records_projected_postgres = EXCLUDED.records_projected_postgres,
      notes = EXCLUDED.notes,
      finished_at = EXCLUDED.finished_at`,
    [
      runId,
      status,
      periods[periods.length - 1] || null,
      periods[0] || null,
      recordsRead,
      recordsWrittenRaw,
      recordsWrittenConformed,
      recordsProjectedPostgres,
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
      error_code, error_message, payload_json, retryable
    )
    VALUES ($1, $2, 'nubox', 'quotes_hot_sync',
      'nubox_quotes_hot_sync_failed', $3, $4::jsonb, TRUE)`,
    [
      `fail-${randomUUID()}`,
      runId,
      errorMessage.slice(0, 2000),
      JSON.stringify(payload || {})
    ]
  )
}

const insertRawSnapshots = async (rows: NuboxRawSnapshotRow[]) => {
  if (rows.length === 0) return 0

  const bigQuery = getBigQueryClient()

  await bigQuery.dataset('greenhouse_raw').table('nubox_sales_snapshots').insert(rows)

  return rows.length
}

const tryRunWithLock = async <T>(callback: () => Promise<T>) =>
{
  const pool = await getGreenhousePostgresPool()
  const client = await pool.connect()

  try {
    const lockResult = await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock(hashtext($1)) AS acquired`,
      [LOCK_KEY]
    )

    if (!lockResult.rows[0]?.acquired) {
      return null
    }

    return callback()
  } finally {
    await client.query(`SELECT pg_advisory_unlock(hashtext($1))`, [LOCK_KEY]).catch(() => undefined)
    client.release()
  }
}

export const syncNuboxQuotesHot = async (options?: { periods?: string[] }): Promise<SyncNuboxQuotesHotResult> => {
  const startMs = Date.now()
  const syncRunId = `nubox-quotes-hot-${randomUUID()}`
  const periods = resolveHotPeriods(options?.periods)

  const result = await tryRunWithLock(async () => {
    await writeSyncRun({
      runId: syncRunId,
      status: 'running',
      periods,
      notes: `Hot quote periods: ${periods.join(', ')}`
    })

    try {
      const salesById = new Map<string, NuboxSale>()
      let salesFetched = 0
      const failedPeriods: Array<{ period: string; message: string }> = []

      // Per-period isolation: a transient failure on one period must not sink
      // the others. A NON-transient failure (auth / 4xx / schema) is systemic
      // — same credentials and endpoint for every period — so it pages loud
      // immediately rather than masquerading as a partial result.
      for (const period of periods) {
        try {
          const sales = await fetchAllPages(listNuboxSales, period)

          salesFetched += sales.length

          for (const sale of sales) {
            if (isQuoteSale(sale)) {
              salesById.set(String(sale.id), sale)
            }
          }
        } catch (error) {
          if (!(error instanceof NuboxApiError && error.transient)) {
            throw error
          }

          failedPeriods.push({
            period,
            message: error instanceof Error ? error.message : String(error)
          })
        }
      }

      // Every period failed transiently → nothing fetched. Degrade honestly:
      // record failed, capture warning, return skipped so the cron returns 200.
      // The */15min cadence + freshness signal (TASK-841) are the backstop.
      if (failedPeriods.length === periods.length && periods.length > 0) {
        await writeSyncFailure({
          runId: syncRunId,
          errorMessage: `All periods failed transiently: ${failedPeriods.map(f => `${f.period} (${f.message})`).join('; ')}`,
          payload: { periods }
        }).catch(() => {})
        await writeSyncRun({
          runId: syncRunId,
          status: 'failed',
          periods,
          notes: `All ${periods.length} periods failed transiently — recovers next cycle.`.slice(0, 500)
        }).catch(() => {})

        captureWithDomain(new Error('nubox_quotes_hot_all_periods_transient_failure'), 'finance', {
          level: 'warning',
          tags: { source: 'nubox_quotes_hot_sync', kind: 'all_periods_transient' },
          extra: { periods, failedPeriods, syncRunId }
        })

        return {
          syncRunId,
          skipped: true,
          skipReason: 'nubox_transient_all_periods',
          periods,
          salesFetched: 0,
          quoteSalesFetched: 0,
          rawWritten: 0,
          conformedWritten: 0,
          quotesCreated: 0,
          quotesUpdated: 0,
          quotesSkipped: 0,
          durationMs: Date.now() - startMs
        }
      }

      const quoteSales = [...salesById.values()]
      const rawRows = quoteSales.map(sale => mapSaleToRawRow(sale, syncRunId))
      const rawWritten = await insertRawSnapshots(rawRows)
      const sourceLastIngestedAtById = new Map(rawRows.map(row => [row.source_object_id, row.ingested_at]))

      const [orgByRut, incomeByNuboxId] = await Promise.all([
        buildNuboxOrgByRutMap(),
        buildNuboxIncomeByNuboxIdMap()
      ])

      const conformedRows = quoteSales.map(sale =>
        mapSaleToConformed(sale, syncRunId, { orgByRut, incomeByNuboxId })
      )

      await writeNuboxConformedSales(conformedRows)

      let quotesCreated = 0
      let quotesUpdated = 0
      let quotesSkipped = 0

      for (const row of conformedRows) {
        const projectionSale: NuboxProjectionSale = {
          ...row,
          source_last_ingested_at: sourceLastIngestedAtById.get(row.nubox_sale_id) || row.synced_at
        }

        const action = await upsertNuboxQuoteFromSale(projectionSale)

        if (action === 'created') quotesCreated++
        else if (action === 'updated') quotesUpdated++
        else quotesSkipped++
      }

      // Partial when some periods failed transiently (we still persisted the
      // good ones) OR when some quotes were skipped during projection.
      const status = failedPeriods.length > 0 || quotesSkipped > 0 ? 'partial' : 'succeeded'

      const notes = [
        `Hot quote periods: ${periods.join(', ')}`,
        `Sales fetched: ${salesFetched}`,
        `Quote sales: ${quoteSales.length}`,
        `Quotes: ${quotesCreated} created, ${quotesUpdated} updated, ${quotesSkipped} skipped`,
        ...(failedPeriods.length > 0
          ? [`Failed periods (transient, retry next cycle): ${failedPeriods.map(f => f.period).join(', ')}`]
          : [])
      ].join(' | ')

      // Surface the partial fetch as a warning (not a page) so it is visible
      // without alert fatigue; persistent staleness escalates via the freshness
      // signal (TASK-841).
      if (failedPeriods.length > 0) {
        captureWithDomain(new Error('nubox_quotes_hot_partial_periods'), 'finance', {
          level: 'warning',
          tags: { source: 'nubox_quotes_hot_sync', kind: 'partial_periods' },
          extra: { periods, failedPeriods, syncRunId }
        })
      }

      await writeSyncRun({
        runId: syncRunId,
        status,
        periods,
        recordsRead: salesFetched,
        recordsWrittenRaw: rawWritten,
        recordsWrittenConformed: conformedRows.length,
        recordsProjectedPostgres: quotesCreated + quotesUpdated,
        notes
      })

      return {
        syncRunId,
        skipped: false,
        periods,
        salesFetched,
        quoteSalesFetched: quoteSales.length,
        rawWritten,
        conformedWritten: conformedRows.length,
        quotesCreated,
        quotesUpdated,
        quotesSkipped,
        durationMs: Date.now() - startMs
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const transient = error instanceof NuboxApiError && error.transient

      await writeSyncFailure({
        runId: syncRunId,
        errorMessage: message,
        payload: { periods }
      }).catch(() => {})
      await writeSyncRun({
        runId: syncRunId,
        status: 'failed',
        periods,
        notes: message.slice(0, 500)
      }).catch(() => {})

      if (transient) {
        // Transient Nubox connectivity/timeout. This sync runs every 15 min and
        // is idempotent (advisory lock + UPSERT), so the next cycle recovers.
        // Persistent failure surfaces via the Nubox source freshness signal
        // (TASK-841) — the staleness backstop. Degrade honestly instead of
        // paging: capture as WARNING (no high-priority page) and return a
        // skipped result so the cron returns 200, not a 502 error.
        const kind = error instanceof NuboxApiError ? error.kind : 'unknown'

        captureWithDomain(error, 'finance', {
          level: 'warning',
          tags: { source: 'nubox_quotes_hot_sync', kind },
          extra: { periods, syncRunId }
        })

        return {
          syncRunId,
          skipped: true,
          skipReason: `nubox_transient_${kind}`,
          periods,
          salesFetched: 0,
          quoteSalesFetched: 0,
          rawWritten: 0,
          conformedWritten: 0,
          quotesCreated: 0,
          quotesUpdated: 0,
          quotesSkipped: 0,
          durationMs: Date.now() - startMs
        }
      }

      // Non-transient (auth, 4xx, schema, PG write failure): page loud.
      throw error
    }
  })

  if (result) return result

  return {
    syncRunId,
    skipped: true,
    skipReason: 'lock_not_acquired',
    periods,
    salesFetched: 0,
    quoteSalesFetched: 0,
    rawWritten: 0,
    conformedWritten: 0,
    quotesCreated: 0,
    quotesUpdated: 0,
    quotesSkipped: 0,
    durationMs: Date.now() - startMs
  }
}
