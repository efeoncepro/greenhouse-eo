import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const DESIGN_HANDOFF_NODE_DRIFT_SIGNAL_ID = 'design_system.handoff.node_drift'

const SNAPSHOT_STALE_DAYS = 30

type NodeDriftRow = {
  active_count: number
  drift_count: number
  missing_snapshot_count: number
  non_reachable_count: number
  stale_snapshot_count: number
}

const severityForCount = (count: number): ReliabilitySeverity => (count === 0 ? 'ok' : count > 5 ? 'error' : 'warning')

export const getDesignHandoffNodeDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<NodeDriftRow>(
      `WITH active_entries AS (
         SELECT entry_id
           FROM greenhouse_core.design_handoff_entries
          WHERE status <> 'archived'
       ),
       latest_snapshots AS (
         SELECT DISTINCT ON (entry_id)
                entry_id,
                node_status,
                created_at
           FROM greenhouse_core.design_handoff_node_snapshots
          ORDER BY entry_id, created_at DESC
       ),
       classified AS (
         SELECT e.entry_id,
                s.node_status,
                s.created_at AS snapshot_at,
                (s.entry_id IS NULL) AS missing_snapshot,
                (s.entry_id IS NOT NULL AND COALESCE(s.node_status, 'unknown') <> 'reachable') AS non_reachable,
                (s.entry_id IS NOT NULL AND s.created_at < NOW() - ($1::int * INTERVAL '1 day')) AS stale_snapshot
           FROM active_entries e
           LEFT JOIN latest_snapshots s ON s.entry_id = e.entry_id
       )
       SELECT COUNT(*)::int AS active_count,
              COUNT(*) FILTER (WHERE missing_snapshot OR non_reachable OR stale_snapshot)::int AS drift_count,
              COUNT(*) FILTER (WHERE missing_snapshot)::int AS missing_snapshot_count,
              COUNT(*) FILTER (WHERE non_reachable)::int AS non_reachable_count,
              COUNT(*) FILTER (WHERE stale_snapshot)::int AS stale_snapshot_count
         FROM classified`,
      [SNAPSHOT_STALE_DAYS]
    )

    const activeCount = rows[0]?.active_count ?? 0
    const driftCount = rows[0]?.drift_count ?? 0
    const missingSnapshotCount = rows[0]?.missing_snapshot_count ?? 0
    const nonReachableCount = rows[0]?.non_reachable_count ?? 0
    const staleSnapshotCount = rows[0]?.stale_snapshot_count ?? 0

    return {
      signalId: DESIGN_HANDOFF_NODE_DRIFT_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getDesignHandoffNodeDriftSignal',
      label: 'Design handoff node drift',
      severity: severityForCount(driftCount),
      summary:
        driftCount === 0
          ? `${activeCount} handoff${activeCount === 1 ? '' : 's'} activo${activeCount === 1 ? '' : 's'} con snapshot Figma vigente y reachable.`
          : `${driftCount} de ${activeCount} handoff${activeCount === 1 ? '' : 's'} activo${activeCount === 1 ? '' : 's'} tienen nodo sin snapshot, no reachable o snapshot stale.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'drift_count', value: String(driftCount) },
        { kind: 'metric', label: 'active_count', value: String(activeCount) },
        { kind: 'metric', label: 'missing_snapshot_count', value: String(missingSnapshotCount) },
        { kind: 'metric', label: 'non_reachable_count', value: String(nonReachableCount) },
        { kind: 'metric', label: 'stale_snapshot_count', value: String(staleSnapshotCount) },
        { kind: 'metric', label: 'snapshot_stale_days', value: String(SNAPSHOT_STALE_DAYS) },
        { kind: 'metric', label: 'steady_state', value: '0' },
        { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_node_snapshots' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'platform', {
      tags: { source: 'reliability_signal_design_handoff_node_drift' }
    })

    return {
      signalId: DESIGN_HANDOFF_NODE_DRIFT_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getDesignHandoffNodeDriftSignal',
      label: 'Design handoff node drift',
      severity: 'unknown',
      summary:
        'No fue posible leer el signal de drift de nodos Figma. Verifica que la migracion V2 de TASK-1175 este aplicada.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'steady_state', value: '0' },
        { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_node_snapshots' }
      ]
    }
  }
}
