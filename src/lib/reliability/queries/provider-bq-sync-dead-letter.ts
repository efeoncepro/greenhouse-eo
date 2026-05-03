import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-771 Slice 4 — Reliability signal reader.
 *
 * Cuenta entries dead-letter en `outbox_reactive_log` para el handler crítico
 * `provider_bq_sync:provider.upserted` — la projection canónica que mantiene
 * `greenhouse.providers` (BQ) y `greenhouse.fin_suppliers.provider_id` (BQ)
 * sincronizados desde Postgres.
 *
 * Si esta projection se queda en dead-letter:
 *   - AI Tooling deja de ver providers nuevos (4 LEFT JOINs en
 *     src/lib/ai-tools/service.ts).
 *   - Los suppliers creados en PG quedan sin proyectar a BQ → drift PG↔BQ
 *     que crece silenciosamente.
 *
 * Solo cuenta dead-letters NO acknowledged y NO recovered, alineado con
 * `outbox_reactive_log_active_dead_letters_idx` (TASK 2026-04-26) y mismo
 * patrón que `getPaymentOrdersDeadLetterSignal` (TASK-765).
 *
 * **Kind**: `dead_letter`. Steady state esperado = 0.
 * **Severidad**: `error` cuando count > 0. Significa que el reactor llegó al
 * límite de retries (maxRetries=3) y nadie acuso recibo aún — el path está
 * roto y el operador necesita actuar (típicamente: corregir permisos ADC del
 * runtime, schema BQ, o re-ejecutar la projection contra el supplier afectado).
 */
export const PROVIDER_BQ_SYNC_DEAD_LETTER_SIGNAL_ID =
  'finance.providers.bq_sync_drift'

const HANDLER = 'provider_bq_sync:provider.upserted'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_reactive_log
  WHERE handler = $1
    AND result = 'dead-letter'
    AND acknowledged_at IS NULL
    AND recovered_at IS NULL
`

export const getProviderBqSyncDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL, [HANDLER])
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: PROVIDER_BQ_SYNC_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'dead_letter',
      source: 'getProviderBqSyncDeadLetterSignal',
      label: 'Provider BQ sync dead-letter',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin dead-letters en provider_bq_sync. Drift PG↔BQ controlado.'
          : `${count} ${count === 1 ? 'entry' : 'entries'} en dead-letter. Drift PG↔BQ activo: AI Tooling y consumers BQ verán datos stale hasta resolver.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `greenhouse_sync.outbox_reactive_log WHERE handler='${HANDLER}'`
        },
        {
          kind: 'metric',
          label: 'handler',
          value: HANDLER
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value:
            'docs/tasks/in-progress/TASK-771-finance-supplier-write-decoupling-bq-projection.md (slice 4)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_provider_bq_sync_dead_letter' }
    })

    return {
      signalId: PROVIDER_BQ_SYNC_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'dead_letter',
      source: 'getProviderBqSyncDeadLetterSignal',
      label: 'Provider BQ sync dead-letter',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
