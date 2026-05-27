import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-903 Slice 3 — Reliability signals canonical del pipeline FTR writeback
 * PRODUCTIVO (Efeonce + Sky). Siblings físicamente separados de los signals RpA
 * (`notion-metrics-rpa-signals.ts`). Subsystem rollup `delivery` (mismo módulo
 * que TASK-908 + TASK-912 + TASK-916).
 *
 * Pre-flip (`NOTION_FTR_WRITEBACK_ENABLED` default OFF) los signals reportan
 * steady state (zero snapshots en dead-letter/lag, ya que el writeback skipea
 * honest sin tocar `notion_writeback_attempt_count`). Cuando el writeback se
 * active (flip gated), detectan failure modes reales.
 *
 * - `notion.metrics.ftr_writeback_dead_letter` — snapshots con writeback exhausto
 *   (attempt_count >= 4) AND last_error NOT NULL AND aún no written.
 * - `notion.metrics.ftr_writeback_lag` — snapshots writable pending writeback con
 *   lag > 30 min (consumer caído o token revocado).
 *
 * **Nota paridad**: NO se crea un `notion.metrics.shadow_paridad_ftr` standalone.
 * FTR es derivada pura de RpA (`FTR pass ⇔ RpA===0`) y no tiene fórmula Notion
 * legacy sincronizada que diffear — su paridad queda cubierta por construcción vía
 * el signal RpA `notion.metrics.shadow_paridad_rpa` (TASK-916): si RpA paridad
 * ≥95%, FTR paridad ≥95% trivialmente. Crear un signal FTR sin comparando sería
 * un placeholder no-funcional. Se evalúa al flip si emerge necesidad real.
 *
 * Pattern fuente: `notion-metrics-rpa-signals.ts` (TASK-916 Slice 5).
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
  source: 'notion-metrics-ftr-signal',
  label,
  severity: 'unknown',
  summary: 'No fue posible computar el signal — revisar logs.',
  observedAt,
  evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
})

// ════════════════════════════════════════════════════════════════════════════
// notion.metrics.ftr_writeback_dead_letter
// ════════════════════════════════════════════════════════════════════════════

export const FTR_WRITEBACK_DEAD_LETTER_SIGNAL_ID = 'notion.metrics.ftr_writeback_dead_letter'

// Dead-letter threshold canonical: notion-ftr-writeback projection maxRetries=4
// → snapshot con attempt_count >= 4 está exhausto.
const FTR_WRITEBACK_DEAD_LETTER_THRESHOLD = 4

export const getNotionMetricsFtrWritebackDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ count: string; latest_error: string | null }>(
      `SELECT
          COUNT(*)::text AS count,
          MAX(notion_writeback_last_error) AS latest_error
       FROM greenhouse_delivery.task_ftr_snapshots
       WHERE notion_writeback_attempt_count >= $1
         AND notion_writeback_last_error IS NOT NULL
         AND written_to_notion_at IS NULL`,
      [FTR_WRITEBACK_DEAD_LETTER_THRESHOLD]
    )

    const count = Number(rows[0]?.count ?? 0)
    const latestError = rows[0]?.latest_error ?? null

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : 'error'

    return {
      signalId: FTR_WRITEBACK_DEAD_LETTER_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionMetricsFtrWritebackDeadLetterSignal',
      label: 'Writeback dead-letter FTR (Efeonce/Sky)',
      severity,
      summary:
        count === 0
          ? 'Steady state — zero snapshots FTR en dead-letter (attempt_count >= 4).'
          : `${count} snapshots FTR en dead-letter. Revisar NOTION_TOKEN + propiedad [GH] FTR (Efeonce/Sky) + rate limit.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'dead_letter_count', value: String(count) },
        { kind: 'metric', label: 'threshold_attempts', value: String(FTR_WRITEBACK_DEAD_LETTER_THRESHOLD) },
        { kind: 'metric', label: 'latest_error', value: latestError?.slice(0, 200) ?? 'none' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_ftr_writeback_dead_letter' }
    })

    return buildErrorSignal(
      FTR_WRITEBACK_DEAD_LETTER_SIGNAL_ID,
      'Writeback dead-letter FTR (Efeonce/Sky)',
      'drift',
      err,
      observedAt
    )
  }
}

// ════════════════════════════════════════════════════════════════════════════
// notion.metrics.ftr_writeback_lag
// ════════════════════════════════════════════════════════════════════════════

export const FTR_WRITEBACK_LAG_SIGNAL_ID = 'notion.metrics.ftr_writeback_lag'

// Threshold canonical: reactive consumer corre cada 5 min + Notion API latency
// <1s → un snapshot pending > 30 min indica un problema real (consumer caído,
// token corrupto, snapshot fuera del happy path).
const FTR_WRITEBACK_LAG_THRESHOLD_MIN = 30

const PRODUCTIVE_WORKSPACE_IDS = ['EFEONCE', 'SKY'] as const

const isAnyFtrWritebackFlagEnabled = (): boolean => {
  if (process.env.NOTION_FTR_WRITEBACK_ENABLED === 'true') return true

  return PRODUCTIVE_WORKSPACE_IDS.some(
    workspaceId => process.env[`NOTION_FTR_WRITEBACK_ENABLED_${workspaceId}`] === 'true'
  )
}

export const getNotionMetricsFtrWritebackLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ count: string; oldest_age_minutes: string | null }>(
      `SELECT
          COUNT(*)::text AS count,
          MAX(EXTRACT(EPOCH FROM (NOW() - computed_at)) / 60)::text AS oldest_age_minutes
       FROM greenhouse_delivery.task_ftr_snapshots
       WHERE ftr_data_status = 'valid'
         AND ftr_value IS NOT NULL
         AND written_to_notion_at IS NULL
         AND notion_writeback_attempt_count < $1
         AND computed_at < NOW() - INTERVAL '${FTR_WRITEBACK_LAG_THRESHOLD_MIN} minutes'`,
      [FTR_WRITEBACK_DEAD_LETTER_THRESHOLD]
    )

    const count = Number(rows[0]?.count ?? 0)
    const oldestAgeMin = rows[0]?.oldest_age_minutes ? Math.round(Number(rows[0].oldest_age_minutes)) : 0
    const writebackEnabled = isAnyFtrWritebackFlagEnabled()

    if (!writebackEnabled) {
      return {
        signalId: FTR_WRITEBACK_LAG_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'lag',
        source: 'getNotionMetricsFtrWritebackLagSignal',
        label: 'Writeback lag FTR (Efeonce/Sky)',
        severity: 'ok',
        summary:
          'Writeback FTR deshabilitado por flag — snapshots pendientes se reportan como backlog dormido, no como lag operativo.',
        observedAt,
        evidence: [
          { kind: 'metric', label: 'lag_count_if_enabled', value: String(count) },
          { kind: 'metric', label: 'threshold_minutes', value: String(FTR_WRITEBACK_LAG_THRESHOLD_MIN) },
          { kind: 'metric', label: 'oldest_age_minutes', value: String(oldestAgeMin) },
          { kind: 'metric', label: 'NOTION_FTR_WRITEBACK_ENABLED', value: process.env.NOTION_FTR_WRITEBACK_ENABLED ?? 'unset' },
          {
            kind: 'metric',
            label: 'NOTION_FTR_WRITEBACK_ENABLED_EFEONCE',
            value: process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE ?? 'unset'
          },
          {
            kind: 'metric',
            label: 'NOTION_FTR_WRITEBACK_ENABLED_SKY',
            value: process.env.NOTION_FTR_WRITEBACK_ENABLED_SKY ?? 'unset'
          }
        ]
      }
    }

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : count <= 3 ? 'warning' : 'error'

    return {
      signalId: FTR_WRITEBACK_LAG_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'lag',
      source: 'getNotionMetricsFtrWritebackLagSignal',
      label: 'Writeback lag FTR (Efeonce/Sky)',
      severity,
      summary:
        count === 0
          ? `Steady state — zero snapshots FTR con lag > ${FTR_WRITEBACK_LAG_THRESHOLD_MIN}min.`
          : `${count} snapshots FTR pending writeback > ${FTR_WRITEBACK_LAG_THRESHOLD_MIN}min (oldest=${oldestAgeMin}min). Reactive consumer puede estar caído, flag OFF o token revocado.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'lag_count', value: String(count) },
        { kind: 'metric', label: 'threshold_minutes', value: String(FTR_WRITEBACK_LAG_THRESHOLD_MIN) },
        { kind: 'metric', label: 'oldest_age_minutes', value: String(oldestAgeMin) }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_ftr_writeback_lag' }
    })

    return buildErrorSignal(
      FTR_WRITEBACK_LAG_SIGNAL_ID,
      'Writeback lag FTR (Efeonce/Sky)',
      'lag',
      err,
      observedAt
    )
  }
}
