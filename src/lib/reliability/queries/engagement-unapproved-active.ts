import 'server-only'

import { countCommercialEngagementUnapprovedActive } from '@/lib/commercial/sample-sprints/health'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const ENGAGEMENT_UNAPPROVED_ACTIVE_SIGNAL_ID = 'commercial.engagement.unapproved_active'

export const getEngagementUnapprovedActiveSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = await countCommercialEngagementUnapprovedActive()

    return {
      signalId: ENGAGEMENT_UNAPPROVED_ACTIVE_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementUnapprovedActiveSignal',
      label: 'Engagement unapproved active',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin engagements activos fuera de pending_approval sin approval aprobado.'
          : `${count} ${count === 1 ? 'engagement activo no tiene' : 'engagements activos no tienen'} approval aprobado.`,
      observedAt,
      evidence: [
        {
          kind: 'helper',
          label: 'Reader',
          value: 'countCommercialEngagementUnapprovedActive'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Runbook',
          value: 'Volver a pending_approval o registrar approval aprobado antes de consumir capacidad/costo.'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_engagement_unapproved_active' }
    })

    return {
      signalId: ENGAGEMENT_UNAPPROVED_ACTIVE_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getEngagementUnapprovedActiveSignal',
      label: 'Engagement unapproved active',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de unapproved active. Revisa los logs.',
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
