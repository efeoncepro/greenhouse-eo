import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const DESIGN_HANDOFF_STALE_ENTRIES_SIGNAL_ID = 'design_system.handoff.stale_entries'

const STALE_DAYS = 14

const severityForCount = (count: number): ReliabilitySeverity => (count === 0 ? 'ok' : count > 10 ? 'error' : 'warning')

export const getDesignHandoffStaleEntriesSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<{ stale_count: number; oldest_at: string | null }>(
      `SELECT COUNT(*)::int AS stale_count,
              MIN(updated_at)::text AS oldest_at
         FROM greenhouse_core.design_handoff_entries
        WHERE status IN ('proposed', 'in_implementation')
          AND updated_at < NOW() - ($1::int * INTERVAL '1 day')`,
      [STALE_DAYS]
    )

    const count = rows[0]?.stale_count ?? 0
    const oldestAt = rows[0]?.oldest_at ?? null

    return {
      signalId: DESIGN_HANDOFF_STALE_ENTRIES_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getDesignHandoffStaleEntriesSignal',
      label: 'Design handoff stale entries',
      severity: severityForCount(count),
      summary:
        count === 0
          ? `Sin handoffs de diseño estancados por más de ${STALE_DAYS} días.`
          : `${count} handoff${count === 1 ? '' : 's'} de diseño lleva${count === 1 ? '' : 'n'} más de ${STALE_DAYS} días sin avanzar.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'stale_count', value: String(count) },
        { kind: 'metric', label: 'stale_days_threshold', value: String(STALE_DAYS) },
        { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_entries' },
        ...(oldestAt ? [{ kind: 'metric' as const, label: 'oldest_updated_at', value: oldestAt }] : [])
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'platform', { tags: { source: 'reliability_signal_design_handoff_stale_entries' } })

    return {
      signalId: DESIGN_HANDOFF_STALE_ENTRIES_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getDesignHandoffStaleEntriesSignal',
      label: 'Design handoff stale entries',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de handoffs de diseño estancados. Revisa logs y migración TASK-1120.',
      observedAt,
      evidence: [{ kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_entries' }]
    }
  }
}
