import 'server-only'

import {
  COMMERCIAL_HEALTH_CONVERSION_RATE_THRESHOLD_ENV,
  COMMERCIAL_HEALTH_CONVERSION_WINDOW_MONTHS,
  getCommercialEngagementConversionRateSnapshot,
  resolveCommercialEngagementConversionRateThreshold
} from '@/lib/commercial/sample-sprints/health'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const ENGAGEMENT_CONVERSION_RATE_DROP_SIGNAL_ID = 'commercial.engagement.conversion_rate_drop'

const formatRate = (value: number): string => `${Math.round(value * 1000) / 10}%`

export const getEngagementConversionRateDropSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const threshold = resolveCommercialEngagementConversionRateThreshold()

  try {
    const snapshot = await getCommercialEngagementConversionRateSnapshot()
    const isBelowThreshold = snapshot.totalOutcomes > 0 && snapshot.conversionRate < threshold

    return {
      signalId: ENGAGEMENT_CONVERSION_RATE_DROP_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementConversionRateDropSignal',
      label: 'Engagement conversion rate drop',
      severity: isBelowThreshold ? 'warning' : 'ok',
      summary:
        snapshot.totalOutcomes === 0
          ? `Sin outcomes terminales en los últimos ${COMMERCIAL_HEALTH_CONVERSION_WINDOW_MONTHS} meses; no hay caída de conversión evaluable.`
          : isBelowThreshold
            ? `Conversion rate trailing ${COMMERCIAL_HEALTH_CONVERSION_WINDOW_MONTHS}m en ${formatRate(snapshot.conversionRate)}, bajo threshold ${formatRate(threshold)}.`
            : `Conversion rate trailing ${COMMERCIAL_HEALTH_CONVERSION_WINDOW_MONTHS}m en ${formatRate(snapshot.conversionRate)}, sobre threshold ${formatRate(threshold)}.`,
      observedAt,
      evidence: [
        {
          kind: 'helper',
          label: 'Reader',
          value: 'getCommercialEngagementConversionRateSnapshot'
        },
        {
          kind: 'metric',
          label: 'window_months',
          value: String(COMMERCIAL_HEALTH_CONVERSION_WINDOW_MONTHS)
        },
        {
          kind: 'metric',
          label: 'threshold',
          value: String(threshold)
        },
        {
          kind: 'metric',
          label: 'threshold_env',
          value: COMMERCIAL_HEALTH_CONVERSION_RATE_THRESHOLD_ENV
        },
        {
          kind: 'metric',
          label: 'total_outcomes',
          value: String(snapshot.totalOutcomes)
        },
        {
          kind: 'metric',
          label: 'converted_outcomes',
          value: String(snapshot.convertedOutcomes)
        },
        {
          kind: 'metric',
          label: 'conversion_rate',
          value: String(snapshot.conversionRate)
        },
        {
          kind: 'doc',
          label: 'Runbook',
          value: 'Revisar calidad de intake, success criteria y motivos de drop/cancelación en outcomes.'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_engagement_conversion_rate_drop' }
    })

    return {
      signalId: ENGAGEMENT_CONVERSION_RATE_DROP_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementConversionRateDropSignal',
      label: 'Engagement conversion rate drop',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de conversion rate. Revisa los logs.',
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
