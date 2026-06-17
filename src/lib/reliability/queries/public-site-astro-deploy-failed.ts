import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  getPublicSiteAstroProductionDeploymentStatus,
  readPublicSiteAstroBinding
} from '@/lib/public-site/astro'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const PUBLIC_SITE_ASTRO_DEPLOY_FAILED_SIGNAL_ID = 'public_site.astro_deploy_failed'

const severityForStatus = (status: string | null): ReliabilitySeverity => {
  if (status === 'ERROR') return 'error'
  if (status === 'BUILDING' || status === 'QUEUED') return 'unknown'
  if (status === 'EMPTY') return 'awaiting_data'

  return 'ok'
}

export const getPublicSiteAstroDeployFailedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const packet = await readPublicSiteAstroBinding()
    const production = getPublicSiteAstroProductionDeploymentStatus(packet)
    const status = production?.status ?? null
    const severity = severityForStatus(status)

    return {
      signalId: PUBLIC_SITE_ASTRO_DEPLOY_FAILED_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'incident',
      source: 'getPublicSiteAstroDeployFailedSignal',
      label: 'Public Site Astro deploy failed',
      severity,
      summary:
        severity === 'error'
          ? `El último deploy Production de efeonce-web está en ERROR (${production?.uid ?? 'uid desconocido'}).`
          : `El último deploy Production de efeonce-web no está fallido (status=${status ?? 'unknown'}).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'project', value: packet.binding.vercel.projectName },
        { kind: 'metric', label: 'project_id', value: packet.binding.vercel.projectId },
        { kind: 'metric', label: 'production_status', value: status ?? 'unknown' },
        { kind: 'metric', label: 'deployment_uid', value: production?.uid ?? 'none' },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_BINDING_READER_V1.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_public_site_astro_deploy_failed' }
    })

    return {
      signalId: PUBLIC_SITE_ASTRO_DEPLOY_FAILED_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'incident',
      source: 'getPublicSiteAstroDeployFailedSignal',
      label: 'Public Site Astro deploy failed',
      severity: 'unknown',
      summary: `No fue posible consultar el deploy Astro/Vercel del sitio público: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'project', value: 'efeonce-web' },
        { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
      ]
    }
  }
}
