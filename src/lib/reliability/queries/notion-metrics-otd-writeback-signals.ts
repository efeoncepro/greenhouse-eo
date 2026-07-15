import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { NOTION_TERMINAL_ARCHIVED_BLOCK_ERROR_PREFIX } from '@/lib/space-notion/notion-errors'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-927 Slice 4 — Reliability signals del writeback del bucket OTD a Notion
 * (`[GH] OTD`). Subsystem rollup `delivery`. Clone del patrón RpA/FTR writeback
 * signals (`notion-metrics-rpa-signals.ts`), reapuntado a
 * `greenhouse_delivery.task_otd_writeback_snapshots`.
 *
 * Diferencia clave: el writeback OTD es un BATCH DIARIO (no reactivo cada 5 min).
 * Por eso los thresholds son por-ciclo-diario, no por-minutos:
 *
 * - `notion.metrics.otd_writeback_dead_letter` — snapshots writable pending con
 *   error persistente > 3 días (falla a través de ≥3 ciclos diarios). steady=0.
 * - `notion.metrics.otd_writeback_lag` — snapshots writable pending sin escribir
 *   > 26 h (se perdió ≥1 ciclo diario: batch caído, flag OFF tras estar ON, o
 *   gate ISSUE-098 bloqueando). steady=0.
 *
 * Pre-flip (`NOTION_OTD_WRITEBACK_ENABLED` default OFF) la tabla está vacía →
 * ambos reportan steady (ok). Cero EXTRACT(EPOCH) sobre date-subtraction
 * (computed_at es TIMESTAMPTZ → NOW()-computed_at = interval; gate TASK-893 OK).
 */

const MODULE_KEY = 'delivery' as const
const TERMINAL_NOTION_WRITEBACK_ERROR_PATTERN = `${NOTION_TERMINAL_ARCHIVED_BLOCK_ERROR_PREFIX}%`

const buildErrorSignal = (
  signalId: string,
  label: string,
  kind: ReliabilitySignal['kind'],
  err: unknown,
  observedAt: string
): ReliabilitySignal => ({
  signalId,
  moduleKey: MODULE_KEY,
  kind,
  source: 'notion-metrics-otd-writeback-signal',
  label,
  severity: 'unknown',
  summary: 'No fue posible computar el signal — revisar logs.',
  observedAt,
  evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
})

// ════════════════════════════════════════════════════════════════════════════
// notion.metrics.otd_writeback_dead_letter
// ════════════════════════════════════════════════════════════════════════════

export const OTD_WRITEBACK_DEAD_LETTER_SIGNAL_ID = 'notion.metrics.otd_writeback_dead_letter'

export const getNotionMetricsOtdWritebackDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ count: string; latest_error: string | null }>(
      `SELECT
          COUNT(*)::text AS count,
          MAX(notion_writeback_last_error) AS latest_error
       FROM greenhouse_delivery.task_otd_writeback_snapshots
       WHERE written_to_notion_at IS NULL
         AND notion_writeback_last_error IS NOT NULL
         AND otd_data_status = 'valid'
         AND computed_at < NOW() - INTERVAL '3 days'
         AND COALESCE(notion_writeback_last_error, '') NOT LIKE $1`,
      [TERMINAL_NOTION_WRITEBACK_ERROR_PATTERN]
    )

    const count = Number(rows[0]?.count ?? 0)
    const latestError = rows[0]?.latest_error ?? null

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : 'error'

    return {
      signalId: OTD_WRITEBACK_DEAD_LETTER_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionMetricsOtdWritebackDeadLetterSignal',
      label: 'Writeback dead-letter OTD ([GH] OTD, Efeonce/Sky)',
      severity,
      summary:
        count === 0
          ? 'Steady state — zero snapshots OTD con error persistente (> 3 ciclos diarios).'
          : `${count} snapshots OTD fallando > 3 días. Revisar NOTION_TOKEN + propiedad [GH] OTD (Efeonce/Sky) + rate limit.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'dead_letter_count', value: String(count) },
        { kind: 'metric', label: 'latest_error', value: latestError?.slice(0, 200) ?? 'none' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_otd_writeback_dead_letter' }
    })

    return buildErrorSignal(
      OTD_WRITEBACK_DEAD_LETTER_SIGNAL_ID,
      'Writeback dead-letter OTD ([GH] OTD, Efeonce/Sky)',
      'drift',
      err,
      observedAt
    )
  }
}

// ════════════════════════════════════════════════════════════════════════════
// notion.metrics.otd_writeback_lag
// ════════════════════════════════════════════════════════════════════════════

export const OTD_WRITEBACK_LAG_SIGNAL_ID = 'notion.metrics.otd_writeback_lag'

export const getNotionMetricsOtdWritebackLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ count: string; oldest_age_hours: string | null }>(
      `SELECT
          COUNT(*)::text AS count,
          MAX(EXTRACT(EPOCH FROM (NOW() - computed_at)) / 3600)::text AS oldest_age_hours
       FROM greenhouse_delivery.task_otd_writeback_snapshots
       WHERE written_to_notion_at IS NULL
         AND otd_data_status = 'valid'
         AND otd_bucket IS NOT NULL
         AND computed_at < NOW() - INTERVAL '26 hours'
         AND COALESCE(notion_writeback_last_error, '') NOT LIKE $1`,
      [TERMINAL_NOTION_WRITEBACK_ERROR_PATTERN]
    )

    const count = Number(rows[0]?.count ?? 0)
    const oldestAgeHours = rows[0]?.oldest_age_hours ? Math.round(Number(rows[0].oldest_age_hours)) : 0

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : count <= 5 ? 'warning' : 'error'

    return {
      signalId: OTD_WRITEBACK_LAG_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'lag',
      source: 'getNotionMetricsOtdWritebackLagSignal',
      label: 'Writeback lag OTD ([GH] OTD, Efeonce/Sky)',
      severity,
      summary:
        count === 0
          ? 'Steady state — zero snapshots OTD writable pendientes > 26h (ciclo diario al día).'
          : `${count} snapshots OTD writable pendientes > 26h (oldest=${oldestAgeHours}h). Batch diario caído, flag apagado tras estar ON, o gate ISSUE-098 bloqueando.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'lag_count', value: String(count) },
        { kind: 'metric', label: 'threshold_hours', value: '26' },
        { kind: 'metric', label: 'oldest_age_hours', value: String(oldestAgeHours) }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_otd_writeback_lag' }
    })

    return buildErrorSignal(
      OTD_WRITEBACK_LAG_SIGNAL_ID,
      'Writeback lag OTD ([GH] OTD, Efeonce/Sky)',
      'lag',
      err,
      observedAt
    )
  }
}
