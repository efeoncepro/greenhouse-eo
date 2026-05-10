import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { listRecentReleases } from '@/lib/release/manifest-store'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * TASK-854 Slice 0 — Reliability signal: release deploy duration p95.
 *
 * Lee `release_manifests` ventana 30 dias y computa p95 del tiempo
 * `completed_at - started_at` para releases en estado terminal exitoso
 * (`released`). Severity:
 *   - ok: p95 < 30 min
 *   - warning: 30 min <= p95 < 60 min (release lentos pero funcional)
 *   - error: p95 >= 60 min (sintoma de degradacion del pipeline)
 *   - unknown: 0 releases en ventana, o todos en estado no-terminal
 *
 * **Steady state esperado**: ok (p95 < 30 min). El orquestador TASK-851 V1.1
 * tiene 8 jobs canonicos cuyo critical path teorico es ~5-15 min P95
 * (preflight 1-2 + workers 5-10 parallel + vercel wait 1-3 + health 30s +
 * transitions 30s). Si subimos a >30 min, hay degradacion del pipeline.
 *
 * **Kind**: `lag`. **Subsystem**: `Platform Release`.
 *
 * Spec: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` §2.9 +
 * `docs/tasks/in-progress/TASK-854-release-deploy-duration-last-status-signals.md`.
 */
export const RELEASE_DEPLOY_DURATION_SIGNAL_ID =
  'platform.release.deploy_duration_p95'

const WINDOW_DAYS = 30
const WARNING_THRESHOLD_MS = 30 * 60 * 1000 // 30 min
const ERROR_THRESHOLD_MS = 60 * 60 * 1000 // 60 min

const computePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  const clamped = Math.max(0, Math.min(index, sorted.length - 1))

  return sorted[clamped] ?? 0
}

const computeSeverity = (p95Ms: number, sampleCount: number): ReliabilitySeverity => {
  if (sampleCount === 0) return 'unknown'
  if (p95Ms >= ERROR_THRESHOLD_MS) return 'error'
  if (p95Ms >= WARNING_THRESHOLD_MS) return 'warning'

  return 'ok'
}

const formatDurationLabel = (ms: number): string => {
  if (ms === 0) return '0s'
  const minutes = Math.round(ms / 60000)

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}m` : `${hours}h`
  }

  return `${minutes}min`
}

export const getReleaseDeployDurationSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // Pull last 30 days. listRecentReleases returns up to limit; we filter
    // by started_at >= now-30d in the helper itself once we have data.
    const recent = await listRecentReleases({ targetBranch: 'main', limit: 100 })
    const cutoffMs = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000

    const completedReleases = recent.filter(
      release =>
        release.state === 'released' &&
        release.completedAt !== null &&
        Date.parse(release.startedAt) >= cutoffMs
    )

    const durationsMs = completedReleases
      .map(release => Date.parse(release.completedAt ?? '') - Date.parse(release.startedAt))
      .filter(ms => Number.isFinite(ms) && ms >= 0)

    const p95Ms = computePercentile(durationsMs, 95)
    const severity = computeSeverity(p95Ms, durationsMs.length)
    const sampleCount = durationsMs.length

    const summary =
      sampleCount === 0
        ? `Sin releases terminales en ventana ${WINDOW_DAYS}d. Pipeline aun no ha generado data suficiente.`
        : `p95 deploy duration ${formatDurationLabel(p95Ms)} sobre ${sampleCount} release${sampleCount === 1 ? '' : 's'} ventana ${WINDOW_DAYS}d (steady < 30min).`

    return {
      signalId: RELEASE_DEPLOY_DURATION_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'lag',
      source: 'getReleaseDeployDurationSignal',
      label: 'Production release deploy duration p95',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'p95_ms', value: String(p95Ms) },
        { kind: 'metric', label: 'p95_label', value: formatDurationLabel(p95Ms) },
        { kind: 'metric', label: 'sample_count', value: String(sampleCount) },
        { kind: 'metric', label: 'window_days', value: String(WINDOW_DAYS) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_release_deploy_duration' }
    })

    return {
      signalId: RELEASE_DEPLOY_DURATION_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'lag',
      source: 'getReleaseDeployDurationSignal',
      label: 'Production release deploy duration p95',
      severity: 'unknown',
      summary: `No fue posible computar deploy duration p95: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
      ]
    }
  }
}
