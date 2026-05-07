import 'server-only'

import {
  COMMERCIAL_HEALTH_BUDGET_OVERRUN_MULTIPLIER,
  countCommercialEngagementBudgetOverrun
} from '@/lib/commercial/sample-sprints/health'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const ENGAGEMENT_BUDGET_OVERRUN_SIGNAL_ID = 'commercial.engagement.budget_overrun'

export const getEngagementBudgetOverrunSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = await countCommercialEngagementBudgetOverrun()

    return {
      signalId: ENGAGEMENT_BUDGET_OVERRUN_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementBudgetOverrunSignal',
      label: 'Engagement budget overrun',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? `Sin engagements aprobados sobre ${COMMERCIAL_HEALTH_BUDGET_OVERRUN_MULTIPLIER}x del costo esperado.`
          : `${count} ${count === 1 ? 'engagement aprobado supera' : 'engagements aprobados superan'} ${COMMERCIAL_HEALTH_BUDGET_OVERRUN_MULTIPLIER}x del costo esperado.`,
      observedAt,
      evidence: [
        {
          kind: 'helper',
          label: 'Reader',
          value: 'countCommercialEngagementBudgetOverrun'
        },
        {
          kind: 'sql',
          label: 'Actual cost source',
          value: 'greenhouse_serving.commercial_cost_attribution_v2 grouped by service_id'
        },
        {
          kind: 'metric',
          label: 'multiplier',
          value: String(COMMERCIAL_HEALTH_BUDGET_OVERRUN_MULTIPLIER)
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Runbook',
          value: 'Revisar budget aprobado vs attribution actual; ajustar scope o registrar outcome.'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_engagement_budget_overrun' }
    })

    return {
      signalId: ENGAGEMENT_BUDGET_OVERRUN_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementBudgetOverrunSignal',
      label: 'Engagement budget overrun',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de budget overrun. Revisa los logs.',
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
