import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-773 Slice 4 — Reliability signal: outbox lag.
 *
 * Cuenta filas en `greenhouse_sync.outbox_events` con `status IN ('pending', 'failed')`
 * y `occurred_at < NOW() - INTERVAL '10 minutes'`. Steady state esperado = 0.
 *
 * **Por qué importa**: el outbox publisher (ops-worker `/outbox/publish-batch`,
 * Cloud Scheduler `ops-outbox-publish` cada 2 min) mueve eventos de PG → BQ raw
 * y los marca como `published`. Si está caído o un batch persiste fallando, los
 * eventos se acumulan en `pending`/`failed`. El reactive consumer
 * (`/reactive/process-domain`) filtra por `status='published'` → si el publisher
 * está roto, NINGUNA projection corre, NINGUN account_balance se rematerializa,
 * NINGUN downstream side effect ocurre.
 *
 * Este signal vuelve invisible imposible: cualquier instancia (staging, prod,
 * o futuro environment nuevo) donde el publisher se rompa emite señal automática
 * en `/admin/operations`.
 *
 * **Threshold**: 10 minutos. Cloud Scheduler corre cada 2 min → 10 min cubre 5
 * ciclos antes de alarmar. Sub-threshold transient lag no dispara false positives.
 *
 * **Kind**: `lag` (event time vs processing time).
 * **Severidad**: `error` cuando count > 0. Bug crítico — flow async finance roto.
 *
 * Pattern reference: TASK-765 Slice 7 (payment-orders-paid-without-expense-payment.ts).
 */
export const OUTBOX_UNPUBLISHED_LAG_SIGNAL_ID = 'sync.outbox.unpublished_lag'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_events
  WHERE status IN ('pending', 'failed')
    AND occurred_at < NOW() - INTERVAL '10 minutes'
`

export const getOutboxUnpublishedLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: OUTBOX_UNPUBLISHED_LAG_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'lag',
      source: 'getOutboxUnpublishedLagSignal',
      label: 'Outbox events sin publicar (lag > 10 min)',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Outbox publisher al día. Ningún event acumulado > 10 min.'
          : `${count} outbox event${count === 1 ? '' : 's'} acumulado${count === 1 ? '' : 's'} > 10 min. Publisher caído o falla persistente — flujos async finance pueden estar bloqueados.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'greenhouse_sync.outbox_events WHERE status IN (pending, failed) AND occurred_at < NOW() - 10 min'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-773-outbox-publisher-cloud-scheduler-cutover.md (slice 4)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'sync', {
      tags: { source: 'reliability_signal_outbox_unpublished_lag' }
    })

    return {
      signalId: OUTBOX_UNPUBLISHED_LAG_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'lag',
      source: 'getOutboxUnpublishedLagSignal',
      label: 'Outbox events sin publicar (lag > 10 min)',
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
