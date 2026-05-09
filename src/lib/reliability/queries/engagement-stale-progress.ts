import 'server-only'

import {
  COMMERCIAL_HEALTH_STALE_PROGRESS_DAYS,
  countCommercialEngagementStaleProgress
} from '@/lib/commercial/sample-sprints/health'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const ENGAGEMENT_STALE_PROGRESS_SIGNAL_ID = 'commercial.engagement.stale_progress'

export const getEngagementStaleProgressSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = await countCommercialEngagementStaleProgress()

    return {
      signalId: ENGAGEMENT_STALE_PROGRESS_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementStaleProgressSignal',
      label: 'Engagement stale progress',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? `Engagements activos con snapshot de progreso al día (≤ ${COMMERCIAL_HEALTH_STALE_PROGRESS_DAYS} días).`
          : `${count} ${count === 1 ? 'engagement activo' : 'engagements activos'} sin snapshot de progreso reciente (> ${COMMERCIAL_HEALTH_STALE_PROGRESS_DAYS} días).`,
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
          value: String(COMMERCIAL_HEALTH_STALE_PROGRESS_DAYS)
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
