import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-916 Slice 5 — Reliability signals canonical del pipeline RpA V2
 * PRODUCTIVO writeback (Efeonce + Sky). Siblings físicamente separados de los
 * signals demo (`notion-metrics-demo-signals.ts`, sufijo `_demo`). Subsystem
 * rollup `delivery` (mismo módulo que TASK-908 + TASK-912 + demo).
 *
 * Pre-flip (`NOTION_RPA_WRITEBACK_ENABLED` default OFF) los signals reportan
 * steady state (zero snapshots en dead-letter/lag, ya que el writeback skipea
 * honest sin tocar `notion_writeback_attempt_count`). Cuando el writeback se
 * active (TASK-917 Flip A), detectan failure modes reales.
 *
 * - `notion.metrics.writeback_dead_letter` — snapshots con writeback exhausto
 *   (attempt_count >= 4) AND last_error NOT NULL AND aún no written.
 * - `notion.metrics.writeback_lag` — snapshots writable pending writeback con
 *   lag > 30 min (consumer caído o token revocado).
 *
 * Pattern fuente: `notion-metrics-demo-signals.ts` §4/§4b (TASK-913 Slice 3).
 */

const MODULE_KEY = 'delivery' as const

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
  source: 'notion-metrics-rpa-signal',
  label,
  severity: 'unknown',
  summary: 'No fue posible computar el signal — revisar logs.',
  observedAt,
  evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
})

// ════════════════════════════════════════════════════════════════════════════
// notion.metrics.writeback_dead_letter
// ════════════════════════════════════════════════════════════════════════════

export const WRITEBACK_DEAD_LETTER_SIGNAL_ID = 'notion.metrics.writeback_dead_letter'

// Dead-letter threshold canonical: notion-rpa-writeback projection maxRetries=4
// → snapshot con attempt_count >= 4 está exhausto.
const WRITEBACK_DEAD_LETTER_THRESHOLD = 4

export const getNotionMetricsWritebackDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ count: string; latest_error: string | null }>(
      `SELECT
          COUNT(*)::text AS count,
          MAX(notion_writeback_last_error) AS latest_error
       FROM greenhouse_delivery.task_rpa_snapshots
       WHERE notion_writeback_attempt_count >= $1
         AND notion_writeback_last_error IS NOT NULL
         AND written_to_notion_at IS NULL`,
      [WRITEBACK_DEAD_LETTER_THRESHOLD]
    )

    const count = Number(rows[0]?.count ?? 0)
    const latestError = rows[0]?.latest_error ?? null

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : 'error'

    return {
      signalId: WRITEBACK_DEAD_LETTER_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionMetricsWritebackDeadLetterSignal',
      label: 'Writeback dead-letter RpA V2 (Efeonce/Sky)',
      severity,
      summary:
        count === 0
          ? 'Steady state — zero snapshots en dead-letter (attempt_count >= 4).'
          : `${count} snapshots en dead-letter. Revisar NOTION_TOKEN + propiedad [GH] RpA v2 (Efeonce/Sky) + rate limit.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'dead_letter_count', value: String(count) },
        { kind: 'metric', label: 'threshold_attempts', value: String(WRITEBACK_DEAD_LETTER_THRESHOLD) },
        { kind: 'metric', label: 'latest_error', value: latestError?.slice(0, 200) ?? 'none' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_writeback_dead_letter' }
    })

    return buildErrorSignal(
      WRITEBACK_DEAD_LETTER_SIGNAL_ID,
      'Writeback dead-letter RpA V2 (Efeonce/Sky)',
      'drift',
      err,
      observedAt
    )
  }
}

// ════════════════════════════════════════════════════════════════════════════
// notion.metrics.writeback_lag
// ════════════════════════════════════════════════════════════════════════════

export const WRITEBACK_LAG_SIGNAL_ID = 'notion.metrics.writeback_lag'

// Threshold canonical: reactive consumer corre cada 5 min + Notion API latency
// <1s → un snapshot pending > 30 min indica un problema real (consumer caído,
// token corrupto, snapshot fuera del happy path).
const WRITEBACK_LAG_THRESHOLD_MIN = 30

export const getNotionMetricsWritebackLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ count: string; oldest_age_minutes: string | null }>(
      `SELECT
          COUNT(*)::text AS count,
          MAX(EXTRACT(EPOCH FROM (NOW() - computed_at)) / 60)::text AS oldest_age_minutes
       FROM greenhouse_delivery.task_rpa_snapshots
       WHERE rpa_data_status = 'valid'
         AND rpa_value IS NOT NULL
         AND written_to_notion_at IS NULL
         AND notion_writeback_attempt_count < $1
         AND computed_at < NOW() - INTERVAL '${WRITEBACK_LAG_THRESHOLD_MIN} minutes'`,
      [WRITEBACK_DEAD_LETTER_THRESHOLD]
    )

    const count = Number(rows[0]?.count ?? 0)
    const oldestAgeMin = rows[0]?.oldest_age_minutes ? Math.round(Number(rows[0].oldest_age_minutes)) : 0

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : count <= 3 ? 'warning' : 'error'

    return {
      signalId: WRITEBACK_LAG_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'lag',
      source: 'getNotionMetricsWritebackLagSignal',
      label: 'Writeback lag RpA V2 (Efeonce/Sky)',
      severity,
      summary:
        count === 0
          ? `Steady state — zero snapshots con lag > ${WRITEBACK_LAG_THRESHOLD_MIN}min.`
          : `${count} snapshots pending writeback > ${WRITEBACK_LAG_THRESHOLD_MIN}min (oldest=${oldestAgeMin}min). Reactive consumer puede estar caído, flag OFF o token revocado.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'lag_count', value: String(count) },
        { kind: 'metric', label: 'threshold_minutes', value: String(WRITEBACK_LAG_THRESHOLD_MIN) },
        { kind: 'metric', label: 'oldest_age_minutes', value: String(oldestAgeMin) }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_writeback_lag' }
    })

    return buildErrorSignal(
      WRITEBACK_LAG_SIGNAL_ID,
      'Writeback lag RpA V2 (Efeonce/Sky)',
      'lag',
      err,
      observedAt
    )
  }
}
