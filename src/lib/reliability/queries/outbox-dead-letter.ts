import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-773 Slice 4 — Reliability signal: outbox dead-letter.
 *
 * Cuenta filas en `greenhouse_sync.outbox_events` con `status='dead_letter'`.
 * Estos events alcanzaron `OUTBOX_MAX_PUBLISH_ATTEMPTS` (5) intentos sin éxito
 * y requieren intervención humana — el path automático de retry los abandonó.
 *
 * **Por qué importa**: dead-letter no se recupera solo. Cada entry significa
 * un evento con payload válido pero un side effect persistentemente roto en
 * BQ raw insert (schema mismatch, permisos, dataset missing, etc.). Si nadie
 * lo recupera o lo descarta explícitamente, queda en limbo permanente.
 *
 * **Kind**: `dead_letter`. Steady state esperado = 0.
 * **Severidad**: `error` cuando count > 0. Operador debe decidir: replay
 * (UPDATE status='pending'), descartar (UPDATE status='archived' en task
 * derivada), o investigar root cause y arreglar BQ schema/permisos.
 *
 * Pattern reference: TASK-765 Slice 7 + TASK-771 Slice 4.
 */
export const OUTBOX_DEAD_LETTER_SIGNAL_ID = 'sync.outbox.dead_letter'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_events
  WHERE status = 'dead_letter'
`

export const getOutboxDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: OUTBOX_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'dead_letter',
      source: 'getOutboxDeadLetterSignal',
      label: 'Outbox events en dead-letter',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin events en dead-letter. Publisher saludable.'
          : `${count} event${count === 1 ? '' : 's'} en dead-letter (${count === 1 ? 'agotó' : 'agotaron'} retries). Replay manual o investigación root cause requerida.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: "greenhouse_sync.outbox_events WHERE status='dead_letter'"
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
      tags: { source: 'reliability_signal_outbox_dead_letter' }
    })

    return {
      signalId: OUTBOX_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'dead_letter',
      source: 'getOutboxDeadLetterSignal',
      label: 'Outbox events en dead-letter',
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
