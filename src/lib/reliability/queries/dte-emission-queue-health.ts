import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const DTE_EMISSION_QUEUE_HEALTH_SIGNAL_ID = 'finance.dte_emission_queue.health'

type DteEmissionQueueHealthRow = {
  pending_count: number | string | null
  stale_pending_count: number | string | null
  retry_due_count: number | string | null
  emitting_stale_count: number | string | null
  dead_letter_count: number | string | null
  failed_count: number | string | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const getDteEmissionQueueHealthSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<DteEmissionQueueHealthRow>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
         COUNT(*) FILTER (
           WHERE status = 'pending'
             AND created_at < NOW() - INTERVAL '20 minutes'
         )::int AS stale_pending_count,
         COUNT(*) FILTER (
           WHERE status = 'retry_scheduled'
             AND COALESCE(next_retry_at, updated_at) <= NOW()
         )::int AS retry_due_count,
         COUNT(*) FILTER (
           WHERE status = 'emitting'
             AND updated_at < NOW() - INTERVAL '10 minutes'
         )::int AS emitting_stale_count,
         COUNT(*) FILTER (WHERE status = 'dead_letter')::int AS dead_letter_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
       FROM greenhouse_finance.dte_emission_queue`
    )

    const row = rows[0]
    const pendingCount = toNumber(row?.pending_count)
    const stalePendingCount = toNumber(row?.stale_pending_count)
    const retryDueCount = toNumber(row?.retry_due_count)
    const emittingStaleCount = toNumber(row?.emitting_stale_count)
    const deadLetterCount = toNumber(row?.dead_letter_count)
    const failedCount = toNumber(row?.failed_count)
    const actionableCount = stalePendingCount + retryDueCount + emittingStaleCount + deadLetterCount
    const severity = deadLetterCount > 0 ? 'error' : actionableCount > 0 ? 'warning' : 'ok'

    return {
      signalId: DTE_EMISSION_QUEUE_HEALTH_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'dead_letter',
      source: 'getDteEmissionQueueHealthSignal',
      label: 'DTE emission queue health',
      severity,
      summary:
        severity === 'ok'
          ? 'DTE retry queue sin pendientes vencidos ni dead letters.'
          : deadLetterCount > 0
            ? `${deadLetterCount} DTE en dead-letter; revisar Nubox/emision antes de prometer facturacion completa.`
            : `${actionableCount} DTE requieren accion del retry scheduler: pending viejo=${stalePendingCount}, retry vencido=${retryDueCount}, emitting atascado=${emittingStaleCount}.`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'pending_count',
          value: String(pendingCount)
        },
        {
          kind: 'metric',
          label: 'stale_pending_count',
          value: String(stalePendingCount)
        },
        {
          kind: 'metric',
          label: 'retry_due_count',
          value: String(retryDueCount)
        },
        {
          kind: 'metric',
          label: 'emitting_stale_count',
          value: String(emittingStaleCount)
        },
        {
          kind: 'metric',
          label: 'dead_letter_count',
          value: String(deadLetterCount)
        },
        {
          kind: 'metric',
          label: 'failed_count',
          value: String(failedCount)
        },
        {
          kind: 'doc',
          label: 'Task',
          value: 'docs/tasks/in-progress/TASK-1194-finance-sync-materializer-http-boundary-hardening.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_dte_emission_queue_health' }
    })

    return {
      signalId: DTE_EMISSION_QUEUE_HEALTH_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'dead_letter',
      source: 'getDteEmissionQueueHealthSignal',
      label: 'DTE emission queue health',
      severity: 'unknown',
      summary: 'No fue posible leer la cola de retry DTE. Revisa los logs.',
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
