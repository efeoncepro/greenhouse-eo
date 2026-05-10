import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { listRecentReleases } from '@/lib/release/manifest-store'
import type { ReleaseManifest } from '@/lib/release/manifest-store'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * TASK-854 Slice 0 — Reliability signal: release last status drift.
 *
 * Lee el ultimo release de `main` (started_at DESC limit 1) y reporta
 * severity segun su estado:
 *   - released → ok (steady)
 *   - degraded | aborted | rolled_back en ultimas 24h → error (incident reciente)
 *   - degraded | aborted | rolled_back entre 24h y 7d → warning
 *   - degraded | aborted | rolled_back > 7d → ok (resolved historicamente)
 *   - state activo (preflight/ready/deploying/verifying) → unknown (release in-flight)
 *   - sin releases en historial → unknown (pipeline aun no usado)
 *
 * **Steady state esperado**: ok (last release = released exitoso).
 *
 * **Kind**: `drift`. **Subsystem**: `Platform Release`.
 *
 * Spec: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` §2.9 +
 * `docs/tasks/in-progress/TASK-854-release-deploy-duration-last-status-signals.md`.
 */
export const RELEASE_LAST_STATUS_SIGNAL_ID = 'platform.release.last_status'

const RECENT_INCIDENT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h
const ELEVATED_INCIDENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7d

const isProblematicTerminalState = (state: string): boolean => {
  return state === 'degraded' || state === 'aborted' || state === 'rolled_back'
}

const isActiveState = (state: string): boolean => {
  return (
    state === 'preflight' ||
    state === 'ready' ||
    state === 'deploying' ||
    state === 'verifying'
  )
}

const computeSeverity = (latest: ReleaseManifest | null, now: number): ReliabilitySeverity => {
  if (!latest) return 'unknown'
  if (isActiveState(latest.state)) return 'unknown'
  if (latest.state === 'released') return 'ok'

  if (isProblematicTerminalState(latest.state)) {
    const completedAtMs = latest.completedAt ? Date.parse(latest.completedAt) : null

    if (!completedAtMs) return 'warning' // sin completed_at, conservador

    const ageMs = now - completedAtMs

    if (ageMs <= RECENT_INCIDENT_WINDOW_MS) return 'error'
    if (ageMs <= ELEVATED_INCIDENT_WINDOW_MS) return 'warning'
    
return 'ok' // > 7d resolved historicamente
  }

  return 'unknown'
}

const formatAgeLabel = (ms: number): string => {
  const hours = Math.round(ms / (60 * 60 * 1000))

  if (hours >= 48) {
    const days = Math.round(hours / 24)

    return `${days}d`
  }

  return `${hours}h`
}

const buildSummary = (latest: ReleaseManifest | null, now: number): string => {
  if (!latest) return 'Sin releases en historial. Pipeline aun no ha sido usado.'

  if (isActiveState(latest.state)) {
    return `Release ${latest.releaseId.slice(0, 12)} en estado ${latest.state} (in-flight).`
  }

  if (latest.state === 'released') {
    const completedAtMs = latest.completedAt ? Date.parse(latest.completedAt) : null
    const ageLabel = completedAtMs ? formatAgeLabel(now - completedAtMs) : 'desconocido'

    return `Ultimo release ${latest.releaseId.slice(0, 12)} = released (hace ${ageLabel}).`
  }

  if (isProblematicTerminalState(latest.state)) {
    const completedAtMs = latest.completedAt ? Date.parse(latest.completedAt) : null
    const ageLabel = completedAtMs ? formatAgeLabel(now - completedAtMs) : 'desconocido'

    return `Ultimo release ${latest.releaseId.slice(0, 12)} = ${latest.state} (hace ${ageLabel}). Operador debe inspeccionar manifest + decidir rollback o forward-fix.`
  }

  return `Ultimo release ${latest.releaseId.slice(0, 12)} en estado inesperado: ${latest.state}.`
}

export const getReleaseLastStatusSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const now = Date.now()

  try {
    const recent = await listRecentReleases({ targetBranch: 'main', limit: 1 })
    const latest = recent[0] ?? null
    const severity = computeSeverity(latest, now)
    const summary = buildSummary(latest, now)

    return {
      signalId: RELEASE_LAST_STATUS_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseLastStatusSignal',
      label: 'Production release last status',
      severity,
      summary,
      observedAt,
      evidence: latest
        ? [
            { kind: 'metric', label: 'last_state', value: latest.state },
            { kind: 'metric', label: 'last_release_id', value: latest.releaseId },
            { kind: 'metric', label: 'last_target_sha', value: latest.targetSha.slice(0, 12) },
            ...(latest.completedAt
              ? [{ kind: 'metric' as const, label: 'last_completed_at', value: latest.completedAt }]
              : []),
            {
              kind: 'doc',
              label: 'Spec',
              value: 'docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9'
            }
          ]
        : [
            { kind: 'metric', label: 'count', value: '0' },
            {
              kind: 'doc',
              label: 'Spec',
              value: 'docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9'
            }
          ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_release_last_status' }
    })

    return {
      signalId: RELEASE_LAST_STATUS_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseLastStatusSignal',
      label: 'Production release last status',
      severity: 'unknown',
      summary: `No fue posible consultar last status: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
      ]
    }
  }
}
