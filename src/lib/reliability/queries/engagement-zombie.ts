import 'server-only'

import {
  COMMERCIAL_HEALTH_ZOMBIE_DAYS,
  countCommercialEngagementZombie
} from '@/lib/commercial/sample-sprints/health'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const ENGAGEMENT_ZOMBIE_SIGNAL_ID = 'commercial.engagement.zombie'

export const getEngagementZombieSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = await countCommercialEngagementZombie()

    return {
      signalId: ENGAGEMENT_ZOMBIE_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementZombieSignal',
      label: 'Engagement zombie',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? `Sin engagements activos por más de ${COMMERCIAL_HEALTH_ZOMBIE_DAYS} días sin outcome ni lineage.`
          : `${count} ${count === 1 ? 'engagement activo lleva' : 'engagements activos llevan'} más de ${COMMERCIAL_HEALTH_ZOMBIE_DAYS} días sin outcome ni lineage.`,
      observedAt,
      evidence: [
        {
          kind: 'helper',
          label: 'Reader',
          value: 'countCommercialEngagementZombie'
        },
        {
          kind: 'metric',
          label: 'threshold_days',
          value: String(COMMERCIAL_HEALTH_ZOMBIE_DAYS)
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Runbook',
          value: 'docs/operations/runbooks/engagement-zombie-handling.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_engagement_zombie' }
    })

    return {
      signalId: ENGAGEMENT_ZOMBIE_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementZombieSignal',
      label: 'Engagement zombie',
      severity: 'unknown',
      summary: 'No fue posible leer el signal anti-zombie. Revisa los logs.',
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
