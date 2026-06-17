import 'server-only'

import { composeKortexGithubControlPlanePacket } from '@/lib/kortex/github-control-plane'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const KORTEX_GITHUB_CI_LAST_STATUS_SIGNAL_ID = 'platform.kortex.github.ci_last_status'

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
    return correlationStatus === 'mismatch' ? 'warning' : 'ok'
  }

  if (conclusion === 'failure' || conclusion === 'cancelled' || conclusion === 'timed_out') return 'error'

  if (conclusion) return 'warning'

  return 'unknown'
}

export const getKortexGithubCiLastStatusSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const packet = await composeKortexGithubControlPlanePacket()
    const ciRuns = packet.runs.filter(run => run.workflowName === 'CI' && run.branch === 'main')
    const latest = ciRuns[0] ?? packet.runs.find(run => run.branch === 'main') ?? null

    if (!latest) {
      return {
        signalId: KORTEX_GITHUB_CI_LAST_STATUS_SIGNAL_ID,
        moduleKey: 'platform',
        kind: 'runtime',
        source: 'getKortexGithubCiLastStatusSignal',
        label: 'Kortex GitHub CI last status',
        severity: 'unknown',
        summary: 'No se encontró un run reciente de CI para Kortex main.',
        observedAt,
        evidence: [
          { kind: 'metric', label: 'repository', value: 'efeoncepro/kortex' },
          { kind: 'metric', label: 'confidence', value: packet.confidence },
          {
            kind: 'doc',
            label: 'Spec',
            value: 'docs/architecture/GREENHOUSE_KORTEX_GITHUB_CONTROL_PLANE_V1.md'
          }
        ]
      }
    }

    const severity = severityForRun({
      conclusion: latest.conclusion,
      status: latest.status,
      correlationStatus: packet.runtimeCorrelation.status
    })

    const summary =
      severity === 'ok'
        ? `Kortex CI en main sano: run ${latest.id} (${latest.shortHeadSha ?? 'sha desconocido'}).`
        : `Kortex CI main requiere atención: run ${latest.id}, status=${latest.status ?? 'unknown'}, conclusion=${latest.conclusion ?? 'unknown'}, correlation=${packet.runtimeCorrelation.status}.`

    return {
      signalId: KORTEX_GITHUB_CI_LAST_STATUS_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'runtime',
      source: 'getKortexGithubCiLastStatusSignal',
      label: 'Kortex GitHub CI last status',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'repository', value: 'efeoncepro/kortex' },
        { kind: 'metric', label: 'run_id', value: String(latest.id) },
        { kind: 'metric', label: 'workflow', value: latest.workflowName ?? 'unknown' },
        { kind: 'metric', label: 'branch', value: latest.branch ?? 'unknown' },
        { kind: 'metric', label: 'status', value: latest.status ?? 'unknown' },
        { kind: 'metric', label: 'conclusion', value: latest.conclusion ?? 'unknown' },
        { kind: 'metric', label: 'head_sha', value: latest.shortHeadSha ?? 'unknown' },
        { kind: 'metric', label: 'correlation', value: packet.runtimeCorrelation.status },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_KORTEX_GITHUB_CONTROL_PLANE_V1.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'integrations.kortex', {
      tags: { source: 'reliability_signal_kortex_github_ci_last_status' }
    })

    return {
      signalId: KORTEX_GITHUB_CI_LAST_STATUS_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'runtime',
      source: 'getKortexGithubCiLastStatusSignal',
      label: 'Kortex GitHub CI last status',
      severity: 'unknown',
      summary: `No fue posible consultar el estado GitHub de Kortex: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'repository', value: 'efeoncepro/kortex' },
        { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
      ]
    }
  }
}
