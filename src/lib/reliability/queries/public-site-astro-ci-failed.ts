import 'server-only'

import { composePublicSiteGithubControlPlanePacket } from '@/lib/public-site/astro/github-control-plane'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const PUBLIC_SITE_ASTRO_CI_FAILED_SIGNAL_ID = 'public_site.astro_ci_failed'

const isActiveRunStatus = (status: string | null): boolean => {
  return status === 'queued' || status === 'in_progress' || status === 'waiting' || status === 'requested'
}

const severityForRun = ({
  conclusion,
  status,
  correlationStatus
}: {
  conclusion: string | null
  status: string | null
  correlationStatus: string
}): ReliabilitySeverity => {
  if (isActiveRunStatus(status)) return 'unknown'

  if (conclusion === 'success') {
    return correlationStatus === 'deploy_behind_main' || correlationStatus === 'deploy_sha_mismatch'
      ? 'warning'
      : 'ok'
  }

  if (conclusion === 'failure' || conclusion === 'cancelled' || conclusion === 'timed_out') return 'error'

  if (conclusion) return 'warning'

  return 'unknown'
}

export const getPublicSiteAstroCiFailedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const packet = await composePublicSiteGithubControlPlanePacket()
    const ciRuns = packet.runs.filter(run => run.workflowName === 'CI' && run.branch === 'main')
    const latest = ciRuns[0] ?? packet.runs.find(run => run.branch === 'main') ?? null

    if (!latest) {
      return {
        signalId: PUBLIC_SITE_ASTRO_CI_FAILED_SIGNAL_ID,
        moduleKey: 'platform',
        kind: 'runtime',
        source: 'getPublicSiteAstroCiFailedSignal',
        label: 'Public Site Astro CI failed',
        severity: 'unknown',
        summary: 'No se encontró un run reciente de CI para efeonce-web main.',
        observedAt,
        evidence: [
          { kind: 'metric', label: 'repository', value: 'efeoncepro/efeonce-web' },
          { kind: 'metric', label: 'confidence', value: packet.confidence },
          {
            kind: 'doc',
            label: 'Spec',
            value: 'docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_GITHUB_CONTROL_PLANE_V1.md'
          }
        ]
      }
    }

    const severity = severityForRun({
      conclusion: latest.conclusion,
      status: latest.status,
      correlationStatus: packet.commitCorrelation.status
    })

    const summary =
      severity === 'ok'
        ? `Public Site CI en main sano: run ${latest.id} (${latest.shortHeadSha ?? 'sha desconocido'}).`
        : `Public Site CI main requiere atención: run ${latest.id}, status=${latest.status ?? 'unknown'}, conclusion=${latest.conclusion ?? 'unknown'}, correlation=${packet.commitCorrelation.status}.`

    return {
      signalId: PUBLIC_SITE_ASTRO_CI_FAILED_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'runtime',
      source: 'getPublicSiteAstroCiFailedSignal',
      label: 'Public Site Astro CI failed',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'repository', value: 'efeoncepro/efeonce-web' },
        { kind: 'metric', label: 'run_id', value: String(latest.id) },
        { kind: 'metric', label: 'workflow', value: latest.workflowName ?? 'unknown' },
        { kind: 'metric', label: 'branch', value: latest.branch ?? 'unknown' },
        { kind: 'metric', label: 'status', value: latest.status ?? 'unknown' },
        { kind: 'metric', label: 'conclusion', value: latest.conclusion ?? 'unknown' },
        { kind: 'metric', label: 'head_sha', value: latest.shortHeadSha ?? 'unknown' },
        { kind: 'metric', label: 'correlation', value: packet.commitCorrelation.status },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_GITHUB_CONTROL_PLANE_V1.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_public_site_astro_ci_failed' }
    })

    return {
      signalId: PUBLIC_SITE_ASTRO_CI_FAILED_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'runtime',
      source: 'getPublicSiteAstroCiFailedSignal',
      label: 'Public Site Astro CI failed',
      severity: 'unknown',
      summary: `No fue posible consultar el estado GitHub del Public Site Astro: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'repository', value: 'efeoncepro/efeonce-web' },
        { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
      ]
    }
  }
}
