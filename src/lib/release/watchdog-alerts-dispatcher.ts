import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { sendManualTeamsAnnouncement } from '@/lib/communications/manual-teams-announcements'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  isSeverityEscalation,
  type WatchdogFindingKind,
  type WatchdogSeverity
} from './severity-resolver'

/**
 * TASK-849 Slice 5 — Teams alerts dispatcher con dedup canonico.
 *
 * Single source of truth para enviar alertas Teams del watchdog. Garantiza:
 *
 * 1. NO spam: alertar SOLO cuando (a) blocker nuevo, (b) escalation severity
 *    (warning→error→critical), o (c) ultimo alert > 24h (daily reminder).
 * 2. Dedup state via `greenhouse_sync.release_watchdog_alert_state` UPSERT
 *    atomic per finding.
 * 3. Recovery alerts: cuando blocker se resuelve, emit `severity=ok` alert
 *    + DELETE row dedup. Operador sabe que el incidente cerro.
 * 4. Degradacion honesta: si Teams send falla, captureWithDomain + return
 *    {dispatched: false, error}. NO crashear el watchdog.
 *
 * Patron canonico: replica el shape de TASK-808 reactive consumers
 * (idempotente, atomic UPSERT, retry-safe).
 *
 * Spec: docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9 +
 * docs/tasks/in-progress/TASK-849-production-release-watchdog-alerts.md
 * §Slice 3.
 */

const DAILY_REMINDER_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h

export interface WatchdogFinding {
  workflowName: string
  runId: number
  alertKind: WatchdogFindingKind
  severity: WatchdogSeverity
  htmlUrl: string
  branch: string
  sha: string
  ageLabel: string // e.g. "14d" or "5h"
  detail: string // sumary humano del finding
  recommendedAction: string // comando exacto para remediar
}

export interface DispatchResult {
  workflowName: string
  runId: number
  alertKind: WatchdogFindingKind
  decision: 'sent' | 'skipped_dedup' | 'sent_recovery' | 'failed'
  reason: string
  errorMessage?: string
}

interface DedupRow extends Record<string, unknown> {
  workflow_name: string
  run_id: string // BIGINT lo retorna pg como string para precision safety
  alert_kind: string
  last_alerted_severity: 'warning' | 'error' | 'critical'
  last_alerted_at: string
  alert_count: number
}

/**
 * Lookup dedup state per (workflow_name, run_id, alert_kind).
 * Returns null si no existe row (primera alert para este blocker).
 */
const lookupDedupRow = async (
  workflowName: string,
  runId: number,
  alertKind: WatchdogFindingKind
): Promise<DedupRow | null> => {
  const rows = await query<DedupRow>(
    `SELECT workflow_name, run_id::text AS run_id, alert_kind,
            last_alerted_severity, last_alerted_at::text AS last_alerted_at,
            alert_count
       FROM greenhouse_sync.release_watchdog_alert_state
       WHERE workflow_name = $1 AND run_id = $2 AND alert_kind = $3`,
    [workflowName, runId, alertKind]
  )

  return rows[0] ?? null
}

/**
 * Decide si la alerta debe enviarse:
 *   - Sin row existente → primera alerta, enviar.
 *   - Row existe + severity escalation → enviar.
 *   - Row existe + same severity + last_alerted > 24h → daily reminder, enviar.
 *   - Row existe + same severity + last_alerted < 24h → SKIP (dedup).
 */
const shouldDispatchAlert = (
  finding: WatchdogFinding,
  dedupRow: DedupRow | null
): { shouldDispatch: boolean; reason: string } => {
  if (!dedupRow) {
    return { shouldDispatch: true, reason: 'first alert for this finding' }
  }

  if (finding.severity === 'ok') {
    // No deberia llegar aqui — recovery se maneja en flow separado.
    return { shouldDispatch: false, reason: 'severity=ok handled via recovery flow' }
  }

  if (isSeverityEscalation(dedupRow.last_alerted_severity, finding.severity)) {
    return {
      shouldDispatch: true,
      reason: `escalation ${dedupRow.last_alerted_severity} → ${finding.severity}`
    }
  }

  const ageMs = Date.now() - new Date(dedupRow.last_alerted_at).getTime()

  if (ageMs >= DAILY_REMINDER_THRESHOLD_MS) {
    return {
      shouldDispatch: true,
      reason: `daily reminder (last alert ${Math.round(ageMs / (60 * 60 * 1000))}h ago)`
    }
  }

  return {
    shouldDispatch: false,
    reason: `dedup hit (same severity ${finding.severity}, last alert <24h ago)`
  }
}

/**
 * UPSERT dedup state atomically. Increments alert_count.
 */
const upsertDedupRow = async (
  finding: WatchdogFinding,
  txClient?: { query: (sql: string, params: unknown[]) => Promise<unknown> }
): Promise<void> => {
  // severity 'ok' nunca llega al UPSERT (recovery borra row), pero defense
  // in depth: el CHECK constraint solo acepta warning|error|critical.
  const severity =
    finding.severity === 'ok' ? 'warning' : finding.severity

  const sql = `
    INSERT INTO greenhouse_sync.release_watchdog_alert_state
      (workflow_name, run_id, alert_kind, last_alerted_severity,
       last_alerted_at, first_observed_at, alert_count, metadata_json)
    VALUES ($1, $2, $3, $4, NOW(), NOW(), 1, $5::jsonb)
    ON CONFLICT (workflow_name, run_id, alert_kind) DO UPDATE SET
      last_alerted_severity = EXCLUDED.last_alerted_severity,
      last_alerted_at = NOW(),
      alert_count = release_watchdog_alert_state.alert_count + 1,
      metadata_json = EXCLUDED.metadata_json
  `

  const params = [
    finding.workflowName,
    finding.runId,
    finding.alertKind,
    severity,
    JSON.stringify({
      htmlUrl: finding.htmlUrl,
      branch: finding.branch,
      sha: finding.sha,
      ageLabel: finding.ageLabel
    })
  ]

  if (txClient) {
    await txClient.query(sql, params)
  } else {
    await query(sql, params)
  }
}

/**
 * Borra row dedup cuando blocker se resuelve. Idempotente.
 */
export const clearDedupRow = async (
  workflowName: string,
  runId: number,
  alertKind: WatchdogFindingKind
): Promise<void> => {
  await query(
    `DELETE FROM greenhouse_sync.release_watchdog_alert_state
       WHERE workflow_name = $1 AND run_id = $2 AND alert_kind = $3`,
    [workflowName, runId, alertKind]
  )
}

const buildAlertTitle = (finding: WatchdogFinding): string => {
  const kindLabel = {
    stale_approval: 'Approval pendiente production',
    pending_without_jobs: 'Deploy pending sin jobs (concurrency deadlock)',
    worker_revision_drift: 'Worker revision drift'
  }[finding.alertKind]

  return `[${finding.severity.toUpperCase()}] ${kindLabel} — ${finding.workflowName}`
}

const buildAlertParagraphs = (finding: WatchdogFinding): string[] => {
  return [
    finding.detail,
    `Workflow: ${finding.workflowName}\nRun ID: ${finding.runId}\nBranch: ${finding.branch}\nSHA: ${finding.sha.slice(0, 12)}\nEdad: ${finding.ageLabel}`,
    `Accion recomendada: ${finding.recommendedAction}`
  ]
}

/**
 * Dispatcher canonico per finding: lookup dedup → decide → send Teams →
 * UPSERT dedup. Atomic via transaction (Teams send es side effect externo
 * pero el UPSERT solo ocurre si Teams send tuvo exito — at-least-once
 * delivery aceptable para alertas).
 */
export const dispatchWatchdogAlert = async (
  finding: WatchdogFinding,
  options?: { destinationKey?: string }
): Promise<DispatchResult> => {
  const destinationKey = options?.destinationKey ?? 'production-release-alerts'

  try {
    const dedupRow = await lookupDedupRow(
      finding.workflowName,
      finding.runId,
      finding.alertKind
    )

    const { shouldDispatch, reason } = shouldDispatchAlert(finding, dedupRow)

    if (!shouldDispatch) {
      return {
        workflowName: finding.workflowName,
        runId: finding.runId,
        alertKind: finding.alertKind,
        decision: 'skipped_dedup',
        reason
      }
    }

    // Send Teams primero — si falla, NO actualizamos dedup (re-try en next
    // watchdog run). Aceptable: at-least-once delivery vs at-most-once
    // (preferimos alert duplicado a alert perdido).
    await sendManualTeamsAnnouncement({
      destinationKey,
      title: buildAlertTitle(finding),
      paragraphs: buildAlertParagraphs(finding),
      ctaUrl: finding.htmlUrl,
      ctaLabel: 'Ver run en GitHub',
      triggeredBy: 'production-release-watchdog',
      correlationId: `watchdog-${finding.workflowName}-${finding.runId}-${finding.alertKind}`,
      sourceObjectId: `${finding.workflowName}/${finding.runId}`
    })

    // Solo si Teams send fue exitoso, UPSERT dedup state.
    await upsertDedupRow(finding)

    return {
      workflowName: finding.workflowName,
      runId: finding.runId,
      alertKind: finding.alertKind,
      decision: 'sent',
      reason
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: {
        source: 'production_release_watchdog',
        stage: 'dispatch_alert',
        alert_kind: finding.alertKind
      },
      extra: {
        workflowName: finding.workflowName,
        runId: finding.runId
      }
    })

    return {
      workflowName: finding.workflowName,
      runId: finding.runId,
      alertKind: finding.alertKind,
      decision: 'failed',
      reason: 'Teams send or dedup write failed',
      errorMessage: redactErrorForResponse(error)
    }
  }
}

/**
 * Recovery alert: cuando blocker se resuelve (run completa, cancela o
 * aprueba), enviar `severity=ok` alert + DELETE row dedup.
 *
 * Atomic: DELETE solo si Teams send tuvo exito.
 */
export const dispatchWatchdogRecovery = async (
  recovery: {
    workflowName: string
    runId: number
    alertKind: WatchdogFindingKind
    htmlUrl: string
    branch: string
    sha: string
  },
  options?: { destinationKey?: string }
): Promise<DispatchResult> => {
  const destinationKey = options?.destinationKey ?? 'production-release-alerts'

  try {
    // Solo enviar recovery si existe dedup row activo (sino, no hay nada
    // que recovery-ar — el blocker nunca alerto).
    const dedupRow = await lookupDedupRow(
      recovery.workflowName,
      recovery.runId,
      recovery.alertKind
    )

    if (!dedupRow) {
      return {
        workflowName: recovery.workflowName,
        runId: recovery.runId,
        alertKind: recovery.alertKind,
        decision: 'skipped_dedup',
        reason: 'no active alert to recover'
      }
    }

    await sendManualTeamsAnnouncement({
      destinationKey,
      title: `[RECOVERED] ${recovery.alertKind} — ${recovery.workflowName}`,
      paragraphs: [
        `Run ${recovery.runId} ya no es blocker. Resuelto despues de ${dedupRow.alert_count} alert(s).`,
        `Workflow: ${recovery.workflowName}\nBranch: ${recovery.branch}\nSHA: ${recovery.sha.slice(0, 12)}`,
        'Watchdog reanudo deteccion normal para este workflow.'
      ],
      ctaUrl: recovery.htmlUrl,
      ctaLabel: 'Ver run en GitHub',
      triggeredBy: 'production-release-watchdog-recovery',
      correlationId: `watchdog-recovery-${recovery.workflowName}-${recovery.runId}-${recovery.alertKind}`,
      sourceObjectId: `${recovery.workflowName}/${recovery.runId}`
    })

    await clearDedupRow(recovery.workflowName, recovery.runId, recovery.alertKind)

    return {
      workflowName: recovery.workflowName,
      runId: recovery.runId,
      alertKind: recovery.alertKind,
      decision: 'sent_recovery',
      reason: `recovery alert sent + dedup row cleared (was ${dedupRow.alert_count} alerts)`
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: {
        source: 'production_release_watchdog',
        stage: 'dispatch_recovery',
        alert_kind: recovery.alertKind
      }
    })

    return {
      workflowName: recovery.workflowName,
      runId: recovery.runId,
      alertKind: recovery.alertKind,
      decision: 'failed',
      reason: 'Teams send or dedup delete failed',
      errorMessage: redactErrorForResponse(error)
    }
  }
}

/**
 * Garantiza acceso transaccional al PG. Helper exportado para tests + future
 * batch dispatchers.
 */
export const __internalForTests = {
  lookupDedupRow,
  shouldDispatchAlert,
  upsertDedupRow,
  withTransaction
}
