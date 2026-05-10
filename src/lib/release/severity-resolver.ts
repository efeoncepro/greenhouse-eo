/**
 * TASK-849 — Severity ladder canonico para watchdog findings.
 *
 * Reglas estables que aplican a los 3 detectores (`stale_approval`,
 * `pending_without_jobs`, `worker_revision_drift`). Centralizadas para que
 * cualquier cambio de threshold sea single-line update + tests anti-regresion.
 *
 * **Severity ladder operativo** (per spec V1):
 *   - `ok`: sin blockers detectados.
 *   - `warning`: stale approval > 2h (preflight visible, no escalation).
 *   - `error`: stale approval > 24h o pending-without-jobs > 30min.
 *   - `critical`: stale approval > 7d o worker revision drift confirmado.
 *
 * Los readers reliability (V1.0) usan thresholds mas conservadores
 * (warning=24h, error=7d) porque su consumer es un dashboard, no un
 * canal de alerta. El watchdog (TASK-849) usa este ladder mas agresivo
 * porque su consumer es el operador via Teams.
 *
 * Spec: docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9 +
 * TASK-849 §Detailed-Spec §Severity.
 */

import type { ReliabilitySeverity } from '@/types/reliability'

export type WatchdogFindingKind =
  | 'stale_approval'
  | 'pending_without_jobs'
  | 'worker_revision_drift'

/**
 * Watchdog severity es un superset de ReliabilitySeverity con `critical`
 * adicional. Map:
 *   ok → ok
 *   warning → warning
 *   error → error
 *   critical → error (para reliability signal)
 */
export type WatchdogSeverity = 'ok' | 'warning' | 'error' | 'critical'

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

/**
 * Thresholds canonicos del watchdog. Modificar SOLO con justificacion en
 * spec + tests anti-regresion + Delta arch doc.
 */
export const WATCHDOG_THRESHOLDS = Object.freeze({
  /** Stale `Production` approval: warning >2h, error >24h, critical >7d. */
  staleApprovalWarningMs: 2 * HOUR_MS,
  staleApprovalErrorMs: 24 * HOUR_MS,
  staleApprovalCriticalMs: 7 * 24 * HOUR_MS,

  /** Pending sin jobs: warning >5min, error >30min. */
  pendingWithoutJobsWarningMs: 5 * MINUTE_MS,
  pendingWithoutJobsErrorMs: 30 * MINUTE_MS,

  /** Worker revision drift: cualquier drift confirmado = critical. */
  // No threshold ms — es boolean: drift detected (true) = critical.
})

/**
 * Resuelve severity para stale approval segun edad.
 *
 * Edad por debajo de `warningMs` = `ok` (no es blocker visible aun).
 */
export const resolveStaleApprovalSeverity = (ageMs: number): WatchdogSeverity => {
  if (ageMs >= WATCHDOG_THRESHOLDS.staleApprovalCriticalMs) return 'critical'
  if (ageMs >= WATCHDOG_THRESHOLDS.staleApprovalErrorMs) return 'error'
  if (ageMs >= WATCHDOG_THRESHOLDS.staleApprovalWarningMs) return 'warning'

  return 'ok'
}

/**
 * Resuelve severity para pending sin jobs segun edad.
 */
export const resolvePendingWithoutJobsSeverity = (ageMs: number): WatchdogSeverity => {
  if (ageMs >= WATCHDOG_THRESHOLDS.pendingWithoutJobsErrorMs) return 'error'
  if (ageMs >= WATCHDOG_THRESHOLDS.pendingWithoutJobsWarningMs) return 'warning'

  return 'ok'
}

/**
 * Resuelve severity para worker revision drift.
 *
 * Drift confirmado = revision Cloud Run no matchea SHA del ultimo workflow
 * run success. Eso significa: deploy mas reciente fallo silente o alguien
 * deployo manualmente sin pasar por workflow. Critical inmediato — no hay
 * gradacion de "drift menor".
 */
export const resolveWorkerRevisionDriftSeverity = (
  hasDrift: boolean
): WatchdogSeverity => {
  return hasDrift ? 'critical' : 'ok'
}

/**
 * Reduce N severities a la maxima — para subsystem rollup. Orden:
 * critical > error > warning > ok.
 */
export const aggregateMaxSeverity = (severities: WatchdogSeverity[]): WatchdogSeverity => {
  if (severities.includes('critical')) return 'critical'
  if (severities.includes('error')) return 'error'
  if (severities.includes('warning')) return 'warning'

  return 'ok'
}

/**
 * Map watchdog severity → ReliabilitySeverity (para signal kind=drift).
 * Critical colapsa a 'error' porque el reliability registry no expone
 * critical como tier separado (steady=0, severity error es el peor).
 */
export const watchdogSeverityToReliabilitySeverity = (
  severity: WatchdogSeverity
): ReliabilitySeverity => {
  if (severity === 'critical') return 'error'
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'

  return 'ok'
}

/**
 * Severity ranking helper (para escalation detection en alert dedup).
 * Mayor numero = mayor severity.
 */
export const severityRank = (severity: WatchdogSeverity): number => {
  if (severity === 'critical') return 4
  if (severity === 'error') return 3
  if (severity === 'warning') return 2

  return 1 // ok
}

/**
 * Detecta si una severity nueva es escalation de la anterior.
 * Para alert dedup: solo re-alert cuando el operador necesita re-atencion.
 */
export const isSeverityEscalation = (
  previous: WatchdogSeverity | null,
  current: WatchdogSeverity
): boolean => {
  if (current === 'ok') return false // no escalation hacia OK; emitir recovery alert es decision separada
  if (previous === null) return true // primer alert es por definicion escalation
  
return severityRank(current) > severityRank(previous)
}
