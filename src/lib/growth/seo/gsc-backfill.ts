/**
 * TASK-1655 — Backfill del histórico GSC de una organización hacia BigQuery.
 *
 * La API de Search Console retiene **16 meses**; el módulo nació forward-only y nunca los
 * trajo. Este command recorre el rango día a día con el MISMO fetch paginado del
 * materializer (consumer del reader per-org de TASK-1282 — cero cliente GSC nuevo) y
 * escribe **directo a BigQuery**: meter el pasado en la tabla caliente de PG recrearía el
 * problema de tamaño que el split OLTP/OLAP existe para evitar.
 *
 * Robustez:
 * - **Resumible**: los días ya presentes en BQ se saltan (una sola query de fechas al
 *   inicio). Re-correr el backfill tras un corte retoma donde quedó.
 * - **Idempotente**: el MERGE comparte clave con el UPSERT de PG; re-procesar corrige,
 *   nunca duplica.
 * - **Honest degradation**: un día cuyo fetch degrada se reporta `degraded` con su
 *   errorCode y el loop sigue — NUNCA se escribe un día vacío que se confunda con "no
 *   hubo tráfico", y el resumen final distingue días con datos, sin datos y fallidos.
 * - **Throttle**: pausa corta entre días para no saturar la cuota de la API (Google
 *   aplica QPS por propiedad); el costo monetario es $0.
 */

import 'server-only'

import { readSearchConsoleAnalytics } from '@/lib/growth/search-console'
import { captureWithDomain } from '@/lib/observability/capture'

import { isSeoModuleEnabled } from './flags'
import { listGscHistoryDates, mergeGscHistoryRowsToBq, type GscHistoryRow } from './gsc-history-bq-mirror'

/** Máximo que acepta la Search Analytics API en una sola llamada (mismo techo del materializer). */
const GSC_MAX_ROWS_PER_PAGE = 25_000

/** Techo de páginas por día (espejo del materializer: freno duro, no truncamiento silencioso). */
const MAX_PAGES_PER_DAY = 20

/** Pausa entre días. La cuota QPS de GSC es por propiedad; el backfill no es urgente. */
const THROTTLE_MS = 250

export type GscBackfillDayStatus = 'materialized' | 'empty' | 'skipped_existing' | 'degraded' | 'failed'

export interface GscBackfillDayOutcome {
  captureDate: string
  status: GscBackfillDayStatus
  rowsWritten: number
  truncated: boolean
  errorCode: string | null
}

export interface GscBackfillResult {
  ok: true
  organizationId: string
  fromDate: string
  toDate: string
  days: number
  materialized: number
  empty: number
  skippedExisting: number
  degraded: number
  failed: number
  rowsWritten: number
  outcomes: GscBackfillDayOutcome[]
}

const shiftIsoDate = (isoDate: string, deltaDays: number): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  date.setUTCDate(date.getUTCDate() + deltaDays)

  return date.toISOString().slice(0, 10)
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Fetch paginado de un día (query×page), sin escribir — el destino lo decide el caller. */
const fetchGscDay = async (
  organizationId: string,
  captureDate: string
): Promise<
  | { ok: true; siteUrl: string; rows: GscHistoryRow[]; truncated: boolean }
  | { ok: false; errorCode: string }
> => {
  let startRow = 0
  let pagesFetched = 0
  let truncated = false
  let siteUrl = ''
  const rows: GscHistoryRow[] = []

  while (pagesFetched < MAX_PAGES_PER_DAY) {
    const result = await readSearchConsoleAnalytics(organizationId, {
      range: { startDate: captureDate, endDate: captureDate },
      dimensions: ['query', 'page'],
      rowLimit: GSC_MAX_ROWS_PER_PAGE,
      startRow
    })

    if (!result.ok) {
      // Con páginas ya leídas el día queda incompleto: preferimos reportarlo degradado y
      // NO escribirlo — medio día escrito parecería un día completo con menos tráfico.
      return { ok: false, errorCode: result.errorCode }
    }

    siteUrl = result.siteUrl
    pagesFetched += 1

    if (result.rows.length === 0) break

    for (const row of result.rows) {
      const query = row.keys[0] ?? ''
      const page = row.keys[1] ?? ''

      // `position > 0`: GSC normaliza nulos a 0 y esa fila no es una medición real
      // (mismo filtro del materializer — los dos stores ven el mismo criterio).
      if (query !== '' && page !== '' && row.position > 0) {
        rows.push({
          query,
          page,
          clicks: Math.max(0, Math.round(row.clicks)),
          impressions: Math.max(0, Math.round(row.impressions)),
          ctr: row.ctr,
          position: row.position
        })
      }
    }

    if (result.rows.length < GSC_MAX_ROWS_PER_PAGE) break

    startRow += GSC_MAX_ROWS_PER_PAGE

    if (pagesFetched >= MAX_PAGES_PER_DAY) {
      truncated = true
    }
  }

  return { ok: true, siteUrl, rows, truncated }
}

/**
 * Backfill de `[fromDate, toDate]` (inclusive) para una organización, directo a BQ.
 *
 * `onProgress` permite al runner (script/endpoint) reportar avance sin acoplar el command
 * a un transporte concreto.
 */
export const backfillGscHistory = async (
  organizationId: string,
  options: {
    fromDate: string
    toDate: string
    onProgress?: (outcome: GscBackfillDayOutcome) => void
  }
): Promise<GscBackfillResult | { ok: false; errorCode: 'disabled' | 'invalid_range' }> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled' }
  }

  if (options.fromDate > options.toDate) {
    return { ok: false, errorCode: 'invalid_range' }
  }

  // Resumibilidad: una sola query de fechas existentes; el loop salta lo ya hecho.
  const existingDates = await listGscHistoryDates(organizationId)

  const outcomes: GscBackfillDayOutcome[] = []
  let current = options.fromDate

  while (current <= options.toDate) {
    const captureDate = current

    current = shiftIsoDate(current, 1)

    if (existingDates.has(captureDate)) {
      const outcome: GscBackfillDayOutcome = {
        captureDate,
        status: 'skipped_existing',
        rowsWritten: 0,
        truncated: false,
        errorCode: null
      }

      outcomes.push(outcome)
      options.onProgress?.(outcome)
      continue
    }

    try {
      const day = await fetchGscDay(organizationId, captureDate)

      if (!day.ok) {
        const outcome: GscBackfillDayOutcome = {
          captureDate,
          status: 'degraded',
          rowsWritten: 0,
          truncated: false,
          errorCode: day.errorCode
        }

        outcomes.push(outcome)
        options.onProgress?.(outcome)
        continue
      }

      if (day.rows.length === 0) {
        // "GSC respondió sin filas" es un hecho (día sin tráfico o fuera de retención),
        // distinto de un fallo — y no deja fila fantasma en BQ.
        const outcome: GscBackfillDayOutcome = {
          captureDate,
          status: 'empty',
          rowsWritten: 0,
          truncated: false,
          errorCode: null
        }

        outcomes.push(outcome)
        options.onProgress?.(outcome)
        continue
      }

      const rowsWritten = await mergeGscHistoryRowsToBq({
        organizationId,
        siteUrl: day.siteUrl,
        captureDate,
        rows: day.rows
      })

      const outcome: GscBackfillDayOutcome = {
        captureDate,
        status: 'materialized',
        rowsWritten,
        truncated: day.truncated,
        errorCode: null
      }

      outcomes.push(outcome)
      options.onProgress?.(outcome)
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_gsc_backfill' },
        extra: { organizationId, captureDate }
      })

      const outcome: GscBackfillDayOutcome = {
        captureDate,
        status: 'failed',
        rowsWritten: 0,
        truncated: false,
        errorCode: 'unexpected_error'
      }

      outcomes.push(outcome)
      options.onProgress?.(outcome)
    }

    await sleep(THROTTLE_MS)
  }

  const count = (status: GscBackfillDayStatus) => outcomes.filter(outcome => outcome.status === status).length

  return {
    ok: true,
    organizationId,
    fromDate: options.fromDate,
    toDate: options.toDate,
    days: outcomes.length,
    materialized: count('materialized'),
    empty: count('empty'),
    skippedExisting: count('skipped_existing'),
    degraded: count('degraded'),
    failed: count('failed'),
    rowsWritten: outcomes.reduce((total, outcome) => total + outcome.rowsWritten, 0),
    outcomes
  }
}
