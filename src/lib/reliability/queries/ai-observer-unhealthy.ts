import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import {
  getRecentAiObserverRuns,
  type AiObserverRunRecord
} from '@/lib/reliability/ai/ai-observer-run-tracker'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * TASK-937 Slice 3 — Reliability signal del propio AI Observer.
 *
 * Cierra el gap canónico "every async path ships a signal": el AI Observer
 * (TASK-638) corría sin señal propia, por eso falló ciego durante días. Lee el
 * heartbeat (`source_sync_runs` source_system='reliability_ai_observer',
 * TASK-937 Slice 2) — NO la frescura de las observaciones. Esto desacopla
 * "¿el observer corre/está sano?" de "¿hay narrativa fresca?".
 *
 * Severidad (steady=0 ⇒ ok):
 *   - sin runs nunca           → awaiting_data (pipeline no usado / nunca activado)
 *   - último run > 2.5h        → error (cron horario caído / worker down)
 *   - último run cancelled+disabled → not_configured (kill-switch OFF, opt-in)
 *   - ≥4 runs recientes failed → error (modelo roto — JSON truncado sostenido)
 *   - 1-3 runs recientes failed→ warning (degradación temprana)
 *   - caso normal              → ok
 *   - query falla              → unknown (degradación honesta)
 *
 * Roll up bajo moduleKey 'cloud' (corre en ops-worker/Cloud Run, dominio
 * observability — mismo rollup que observability.cloud_run.silent_failure_rate).
 *
 * Pattern reference: cloud-run-silent-observability.ts (TASK-844 Slice 5).
 */
export const AI_OBSERVER_UNHEALTHY_SIGNAL_ID = 'reliability.ai_observer.unhealthy'

/** Cron es horario; >2.5h sin heartbeat ⇒ se perdieron 2+ corridas. */
const STALE_THRESHOLD_MS = 2.5 * 60 * 60 * 1000

/** Ventana de runs recientes a evaluar para el streak de fallas. */
const RECENT_RUNS_WINDOW = 6

/** Streak de fallas consecutivas que escala a error (modelo roto sostenido). */
const FAILED_STREAK_ERROR_THRESHOLD = 4

const isDisabledRun = (run: AiObserverRunRecord): boolean =>
  run.status === 'cancelled' && (run.notes?.startsWith('disabled') ?? false)

const countLeadingFailed = (runs: AiObserverRunRecord[]): number => {
  let n = 0

  for (const run of runs) {
    if (run.status === 'failed') n += 1
    else break
  }

  return n
}

interface EvaluatedSignal {
  severity: ReliabilitySeverity
  summary: string
}

/**
 * Lógica pura de severidad — testable sin PG. `now` inyectable para tests.
 */
export const evaluateAiObserverHealth = (
  runs: AiObserverRunRecord[],
  now: number = Date.now()
): EvaluatedSignal => {
  if (runs.length === 0) {
    return {
      severity: 'awaiting_data',
      summary: 'AI Observer sin corridas registradas todavía. Activar con RELIABILITY_AI_OBSERVER_ENABLED=true en ops-worker.'
    }
  }

  const last = runs[0]
  const ageMs = now - Date.parse(last.startedAt)

  if (Number.isFinite(ageMs) && ageMs > STALE_THRESHOLD_MS) {
    const ageHours = Math.round(ageMs / 3_600_000)

    return {
      severity: 'error',
      summary: `AI Observer sin heartbeat hace ~${ageHours}h (cron horario esperado). Verificar Cloud Scheduler ops-reliability-ai-watch + ops-worker.`
    }
  }

  if (isDisabledRun(last)) {
    return {
      severity: 'not_configured',
      summary: 'AI Observer apagado (kill-switch OFF). Corriendo pero sin generar resúmenes — RELIABILITY_AI_OBSERVER_ENABLED=false.'
    }
  }

  const failedStreak = countLeadingFailed(runs)

  if (failedStreak >= FAILED_STREAK_ERROR_THRESHOLD) {
    return {
      severity: 'error',
      summary: `AI Observer falló ${failedStreak} corridas seguidas (JSON inválido). Revisar finishReason en source_sync_runs.notes y la config del modelo.`
    }
  }

  if (failedStreak >= 1) {
    return {
      severity: 'warning',
      summary: `AI Observer falló las últimas ${failedStreak} corrida${failedStreak === 1 ? '' : 's'} (JSON inválido). Degradación temprana — monitorear.`
    }
  }

  return {
    severity: 'ok',
    summary: 'AI Observer corriendo y produciendo observaciones (último heartbeat sano).'
  }
}

export const getAiObserverUnhealthySignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const runs = await getRecentAiObserverRuns(RECENT_RUNS_WINDOW)
    const { severity, summary } = evaluateAiObserverHealth(runs)
    const last = runs[0] ?? null

    return {
      signalId: AI_OBSERVER_UNHEALTHY_SIGNAL_ID,
      moduleKey: 'cloud',
      kind: 'drift',
      source: 'getAiObserverUnhealthySignal',
      label: 'AI Observer salud (heartbeat)',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Detector',
          value: "source_sync_runs WHERE source_system='reliability_ai_observer' ORDER BY started_at DESC"
        },
        { kind: 'metric', label: 'recent_runs', value: String(runs.length) },
        { kind: 'metric', label: 'last_status', value: last?.status ?? 'none' },
        { kind: 'metric', label: 'last_notes', value: last?.notes ?? 'none' },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-937-ai-observer-reliability-hardening.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_ai_observer_unhealthy' }
    })

    return {
      signalId: AI_OBSERVER_UNHEALTHY_SIGNAL_ID,
      moduleKey: 'cloud',
      kind: 'drift',
      source: 'getAiObserverUnhealthySignal',
      label: 'AI Observer salud (heartbeat)',
      severity: 'unknown',
      summary: 'Detector falló — no se pudo evaluar la salud del AI Observer. Revisar source_sync_runs.',
      observedAt,
      evidence: []
    }
  }
}
