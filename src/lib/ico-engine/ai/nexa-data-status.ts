import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { captureWithDomain } from '@/lib/observability/capture'

// ─── TASK-946 — Nexa Insights honest degradation canonical ─────────────────
//
// Resuelve el `dataStatus` canonical del bento `NexaInsightsBlock` desde el
// servidor para que la UI distinga honestamente entre 4 estados sin colapsar
// a un "EmptyState" ambiguo (anti-pattern raíz UX de ISSUE-082).
//
// 4 estados canonical retornados por el server:
//
//   - `ready`           — hay insights LLM frescos en PG serving + cron OK.
//                         UI muestra el render normal del bento.
//   - `empty-pending`   — período actual; el cron diario aún no corrió (sin
//                         observaciones BQ todavía). UI muestra empty con
//                         icon clock + "Volvé en unas horas".
//   - `empty-positive`  — cron OK + 0 anomalías detectadas (señal de salud
//                         operativa POSITIVA, NO error). UI muestra empty
//                         con icon check + "Sin anomalías".
//   - `stale-degraded`  — pipeline puede estar roto: signal eligible pero
//                         serving vacío (falso-sano ISSUE-082), o cron caído
//                         hace >24h. UI muestra banner warning honesto.
//
// El cliente añade un 5to estado local `loading` mientras el fetch está in-flight.
//
// Pattern fuente: TASK-941 S5 (freshness signal) + TASK-943 S5 (heartbeat).
// Reuso: `MAX(generated_at) FROM ai_signals WHERE period` para lastCronRun.

export const NEXA_INSIGHTS_DATA_STATUSES = [
  'ready',
  'empty-pending',
  'empty-positive',
  'stale-degraded'
] as const

export type NexaInsightsDataStatus = (typeof NEXA_INSIGHTS_DATA_STATUSES)[number]

/**
 * Threshold canonical para `stale-degraded` cuando el cron del período actual
 * NO ha corrido en las últimas N horas. Alineado con TASK-943 S5
 * `nexa.insights.no_new_signals_in_24h` (warning >24h).
 */
const STALE_THRESHOLD_HOURS = 24

export interface ResolveNexaInsightsDataStatusInput {
  /** Número de insights LLM enriched que el surface ya tiene cargados en PG. */
  insightsCount: number
  /** Año del período observado. */
  periodYear: number
  /** Mes (1-12) del período observado. */
  periodMonth: number
}

interface BqStatusRow {
  last_generated_at?: string | { value?: string } | null
  signal_count?: number | string | null
}

const toIso = (value: BqStatusRow['last_generated_at']): string | null => {
  if (typeof value === 'string') return value || null

  if (value && typeof value === 'object' && 'value' in value) {
    const inner = value.value

    return typeof inner === 'string' && inner.trim() ? inner : null
  }

  return null
}

const toCount = (value: BqStatusRow['signal_count']): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

/**
 * Helper canonical para resolver el `dataStatus` server-side. Lee BQ append-only
 * `ico_engine.ai_signals` (TASK-943) para detectar lastCronRun + eligibleCount
 * del período observado, y combina con el `insightsCount` PG serving que el
 * surface ya tiene.
 *
 * Lógica canonical (en orden):
 *
 *   1. Si `insightsCount > 0`                       → `ready`
 *   2. Si `lastCronRun === null` (sin cron run)     → `empty-pending`
 *   3. Si `lastCronRun > 24h` ago                   → `stale-degraded` (cron caído)
 *   4. Si `eligibleCount === 0` (cron OK, 0 obs)    → `empty-positive` (salud)
 *   5. Si `eligibleCount > 0` && `insightsCount === 0` → `stale-degraded`
 *      (falso-sano ISSUE-082: signals eligible pero serving vacío)
 *   6. Default fallback                              → `empty-pending`
 *
 * Honest degradation: si BQ falla, retorna `ready` cuando hay insights, o
 * `empty-pending` cuando no — NUNCA inventa `empty-positive` ni `stale-degraded`
 * sin evidencia. `captureWithDomain('delivery')` registra el fallo.
 */
export const resolveNexaInsightsDataStatus = async (
  input: ResolveNexaInsightsDataStatusInput
): Promise<NexaInsightsDataStatus> => {
  const { insightsCount, periodYear, periodMonth } = input

  // Fast path: ya hay insights → ready inmediato (cero BQ query).
  if (insightsCount > 0) {
    return 'ready'
  }

  try {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    const [rows] = await bigQuery.query({
      query: `
        SELECT
          MAX(generated_at) AS last_generated_at,
          COUNT(*) AS signal_count
        FROM \`${projectId}.ico_engine.ai_signals\`
        WHERE period_year = @periodYear
          AND period_month = @periodMonth
      `,
      params: { periodYear, periodMonth },
      types: { periodYear: 'INT64', periodMonth: 'INT64' }
    })

    const row = (rows as BqStatusRow[])[0]
    const lastCronRunIso = toIso(row?.last_generated_at)
    const eligibleCount = toCount(row?.signal_count)

    if (!lastCronRunIso) {
      // Sin observaciones BQ en este período = cron diario aún no ha corrido.
      return 'empty-pending'
    }

    const lastCronRunMs = new Date(lastCronRunIso).getTime()

    if (!Number.isFinite(lastCronRunMs)) {
      // Parse falló → degradar honest a empty-pending (no inventar stale).
      return 'empty-pending'
    }

    const ageHours = (Date.now() - lastCronRunMs) / (1000 * 60 * 60)

    if (ageHours > STALE_THRESHOLD_HOURS) {
      // Cron caído sostenido: signal `nexa.insights.no_new_signals_in_24h`
      // estaría warning/error. UI muestra banner honesto.
      return 'stale-degraded'
    }

    if (eligibleCount === 0) {
      // Cron corrió, 0 anomalías detectadas = salud operativa positiva.
      return 'empty-positive'
    }

    // eligibleCount > 0 && insightsCount === 0 (fast path arriba ya descartó >0)
    // = falso-sano ISSUE-082 (signals eligible pero LLM serving vacío). El signal
    // `nexa.insights.stale_with_eligible_signals` estaría error.
    return 'stale-degraded'
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'nexa_data_status', stage: 'bq_read' }
    })

    // Honest degradation cuando BQ falla: insightsCount ya fue 0 (fast path
    // descartó >0), pero sin evidencia BQ NO podemos afirmar stale-degraded
    // ni empty-positive. Default canonical: empty-pending (estado más conservador).
    return 'empty-pending'
  }
}
