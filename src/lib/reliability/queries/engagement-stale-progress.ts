import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const ENGAGEMENT_STALE_PROGRESS_SIGNAL_ID = 'commercial.engagement.stale_progress'

const STALE_PROGRESS_DAYS = 10

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM (
    SELECT s.service_id, MAX(ps.snapshot_date) AS last_snapshot
    FROM greenhouse_core.services s
    LEFT JOIN greenhouse_commercial.engagement_progress_snapshots ps
      ON ps.service_id = s.service_id
    WHERE s.active = TRUE
      AND s.status = 'active'
      AND s.engagement_kind != 'regular'
      AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
    GROUP BY s.service_id
    HAVING MAX(ps.snapshot_date) IS NULL
       OR MAX(ps.snapshot_date) < CURRENT_DATE - INTERVAL '${STALE_PROGRESS_DAYS} days'
  ) stale
`

export const getEngagementStaleProgressSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: ENGAGEMENT_STALE_PROGRESS_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementStaleProgressSignal',
      label: 'Engagement stale progress',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? `Engagements activos con snapshot de progreso al día (≤ ${STALE_PROGRESS_DAYS} días).`
          : `${count} ${count === 1 ? 'engagement activo' : 'engagements activos'} sin snapshot de progreso reciente (> ${STALE_PROGRESS_DAYS} días).`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'services active non-regular LEFT JOIN engagement_progress_snapshots latest snapshot'
        },
        {
          kind: 'metric',
          label: 'threshold_days',
          value: String(STALE_PROGRESS_DAYS)
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-805-engagement-progress-snapshots.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_engagement_stale_progress' }
    })

    return {
      signalId: ENGAGEMENT_STALE_PROGRESS_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementStaleProgressSignal',
      label: 'Engagement stale progress',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de stale progress. Revisa los logs.',
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
