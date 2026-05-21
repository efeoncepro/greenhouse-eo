import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-912 — Reliability signals canonical del pipeline de captura de
 * transiciones de estado PRODUCTIVO (Efeonce + Sky). Subsystem rollup
 * `delivery` (mismo módulo que TASK-908 + demo signals TASK-910).
 *
 * Sibling de `notion-metrics-demo-signals.ts`. Pre-activación (kill-switch flag
 * `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` default OFF) los signals reportan
 * steady state (sin actividad). Cuando se active, detectan failure modes reales.
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
  source: 'notion-status-transitions-signal',
  label,
  severity: 'unknown',
  summary: 'No fue posible computar el signal — revisar logs.',
  observedAt,
  evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
})

// ════════════════════════════════════════════════════════════════════════════
// notion.task_status_transitions.ingestion_lag
// ════════════════════════════════════════════════════════════════════════════

export const NOTION_STATUS_TRANSITIONS_INGESTION_LAG_SIGNAL_ID =
  'notion.task_status_transitions.ingestion_lag'

// Threshold canonical: el webhook se procesa síncrono (ACK rápido). Un evento
// `failed`/`processing`/`pending` con edad > 5 min indica un problema real
// (handler lanzando — típicamente secret no configurado — o backlog).
const LAG_WARNING_SECONDS = 5 * 60
const LAG_ERROR_SECONDS = 60 * 60

/**
 * Detecta lag/fallas de ingestión del webhook productivo. Mide:
 * - `failed_count`: events del endpoint que el handler rechazó en últimas 24h
 *   (HMAC inválido, secret no configurado, error de emit). Pre-activación: 0.
 * - `oldest_unprocessed_seconds`: edad del evento más viejo sin procesar.
 *
 * Steady state (flag OFF o pipeline sano): ok. Cuando el secret no está
 * configurado y el flag se enciende, los events fallan → warning/error,
 * alertando al operador para completar el setup operador-side.
 */
export const getNotionStatusTransitionsIngestionLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ failed_count: string; oldest_unprocessed_seconds: string | null }>(
      `SELECT
          COUNT(*) FILTER (WHERE ie.status = 'failed')::text AS failed_count,
          MAX(EXTRACT(EPOCH FROM (NOW() - ie.received_at)))
            FILTER (WHERE ie.status IN ('failed', 'processing', 'pending'))::text
            AS oldest_unprocessed_seconds
       FROM greenhouse_sync.webhook_inbox_events ie
       JOIN greenhouse_sync.webhook_endpoints we
         ON we.webhook_endpoint_id = ie.webhook_endpoint_id
       WHERE we.endpoint_key = 'notion-status-transitions'
         AND ie.received_at >= NOW() - INTERVAL '24 hours'`
    )

    const failedCount = Number(rows[0]?.failed_count ?? 0)

    const oldestSeconds = rows[0]?.oldest_unprocessed_seconds
      ? Math.round(Number(rows[0].oldest_unprocessed_seconds))
      : 0

    let severity: ReliabilitySignal['severity'] = 'ok'

    if (failedCount > 5 || oldestSeconds > LAG_ERROR_SECONDS) {
      severity = 'error'
    } else if (failedCount > 0 || oldestSeconds > LAG_WARNING_SECONDS) {
      severity = 'warning'
    }

    return {
      signalId: NOTION_STATUS_TRANSITIONS_INGESTION_LAG_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'lag',
      source: 'getNotionStatusTransitionsIngestionLagSignal',
      label: 'Ingestión webhook transiciones Notion (Efeonce/Sky)',
      severity,
      summary:
        severity === 'ok'
          ? 'Steady state — sin fallas ni backlog de ingestión en últimas 24h.'
          : `${failedCount} events fallidos / evento más viejo sin procesar: ${oldestSeconds}s. Revisar secret NOTION_STATUS_TRANSITIONS_WEBHOOK_SIGNING_SECRET_REF + flag.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'failed_count_24h', value: String(failedCount) },
        { kind: 'metric', label: 'oldest_unprocessed_seconds', value: String(oldestSeconds) },
        { kind: 'doc', label: 'Handler', value: 'src/lib/webhooks/handlers/notion-status-transitions.ts' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_notion_status_transitions_ingestion_lag' }
    })

    return buildErrorSignal(
      NOTION_STATUS_TRANSITIONS_INGESTION_LAG_SIGNAL_ID,
      'Ingestión webhook transiciones Notion (Efeonce/Sky)',
      'lag',
      err,
      observedAt
    )
  }
}

// ════════════════════════════════════════════════════════════════════════════
// notion.task_status_transitions.refetch_failed
// ════════════════════════════════════════════════════════════════════════════

export const NOTION_STATUS_TRANSITIONS_REFETCH_FAILED_SIGNAL_ID =
  'notion.task_status_transitions.refetch_failed'

// handler key canonical en outbox_reactive_log = `<projection.name>:<triggerEvent>`
const CAPTURE_HANDLER = 'notion_status_transition_capture:notion.task.page_change_signal'

/**
 * TASK-912 — Detecta re-fetch failures exhaustos del capture consumer productivo.
 * El consumer re-fetchea la página Notion para resolver estado + workspace; si el
 * fetch falla persistente (429 sostenido, NOTION_TOKEN revocado, 5xx) agota los
 * retries del outbox y cae a dead-letter → la transición NUNCA se captura → RpA/CT
 * nunca se computan para esa task. Steady=0.
 */
export const getNotionStatusTransitionsCaptureRefetchFailedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
       FROM greenhouse_sync.outbox_reactive_log
       WHERE handler = $1
         AND result = 'dead-letter'
         AND acknowledged_at IS NULL
         AND recovered_at IS NULL`,
      [CAPTURE_HANDLER]
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: NOTION_STATUS_TRANSITIONS_REFETCH_FAILED_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'dead_letter',
      source: 'getNotionStatusTransitionsCaptureRefetchFailedSignal',
      label: 'Captura transiciones Notion: re-fetch dead-letter (Efeonce/Sky)',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Steady state — zero re-fetches en dead-letter. Captura de transiciones productiva sana.'
          : `${count} signals en dead-letter por re-fetch fallido. Revisar NOTION_TOKEN + rate limit + páginas borradas.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'dead_letter_count', value: String(count) },
        { kind: 'metric', label: 'handler', value: CAPTURE_HANDLER }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_notion_status_transitions_refetch_failed' }
    })

    return buildErrorSignal(
      NOTION_STATUS_TRANSITIONS_REFETCH_FAILED_SIGNAL_ID,
      'Captura transiciones Notion: re-fetch dead-letter (Efeonce/Sky)',
      'dead_letter',
      err,
      observedAt
    )
  }
}
