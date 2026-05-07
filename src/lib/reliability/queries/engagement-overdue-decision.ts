import 'server-only'

import {
  COMMERCIAL_HEALTH_OVERDUE_DECISION_DAYS,
  countCommercialEngagementOverdueDecision
} from '@/lib/commercial/sample-sprints/health'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const ENGAGEMENT_OVERDUE_DECISION_SIGNAL_ID = 'commercial.engagement.overdue_decision'

export const getEngagementOverdueDecisionSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = await countCommercialEngagementOverdueDecision()

    return {
      signalId: ENGAGEMENT_OVERDUE_DECISION_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementOverdueDecisionSignal',
      label: 'Engagement overdue decision',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? `Sin engagements con reporting cerrado hace más de ${COMMERCIAL_HEALTH_OVERDUE_DECISION_DAYS} días sin outcome.`
          : `${count} ${count === 1 ? 'engagement tiene' : 'engagements tienen'} reporting cerrado hace más de ${COMMERCIAL_HEALTH_OVERDUE_DECISION_DAYS} días sin outcome.`,
      observedAt,
      evidence: [
        {
          kind: 'helper',
          label: 'Reader',
          value: 'countCommercialEngagementOverdueDecision'
        },
        {
          kind: 'metric',
          label: 'threshold_days',
          value: String(COMMERCIAL_HEALTH_OVERDUE_DECISION_DAYS)
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Runbook',
          value: 'Registrar outcome o corregir fase reporting del Sample Sprint.'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_engagement_overdue_decision' }
    })

    return {
      signalId: ENGAGEMENT_OVERDUE_DECISION_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementOverdueDecisionSignal',
      label: 'Engagement overdue decision',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de overdue decision. Revisa los logs.',
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
