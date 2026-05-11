#!/usr/bin/env tsx
/**
 * TASK-849 Slice 4 — Production Release Watchdog CLI.
 *
 * Detector canonico que consulta los 3 readers reliability + emite alertas
 * Teams cuando severity > threshold. Diseñado para correr en GitHub Actions
 * scheduled (`'*\/30 * * * *'`) y como CLI local (`pnpm release:watchdog`).
 *
 * Output formats:
 *   - default: human-readable summary + tabla per-finding
 *   - --json: machine-readable JSON consumible por workflow CI step o
 *     preflight CLI futuro (TASK-850)
 *   - --fail-on-error: exit 1 si severity in {error, critical}
 *
 * Alertas Teams:
 *   - Solo se emiten cuando ENABLE_TEAMS_DISPATCH=true (default false en CLI
 *     local; true en workflow GH Actions).
 *   - Dedup state via tabla `greenhouse_sync.release_watchdog_alert_state`.
 *   - Solo alerta cuando: (a) blocker nuevo, (b) escalation severity,
 *     (c) ultimo alert > 24h.
 *   - Cuando blocker se resuelve: emite recovery alert + borra row dedup.
 *
 * Degradacion honesta:
 *   - Sin GITHUB_TOKEN → readers degradan a severity=unknown, watchdog
 *     reporta + exit 0 (no es bug del watchdog, es config faltante).
 *   - Sin Teams secret disponible → degradar a console.log + workflow summary,
 *     NO crashear (operador ve la alerta al revisar el run).
 *   - Sin PG (CLI local sin proxy) → degradar dedup a in-memory (re-alert
 *     spam aceptable en local, no es scenario producivo).
 *
 * Spec: docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9 +
 * docs/tasks/in-progress/TASK-849-production-release-watchdog-alerts.md
 * §Slice 1.
 */

import 'server-only'

import { argv, exit } from 'node:process'

import { getReleasePendingWithoutJobsSignal } from '@/lib/reliability/queries/release-pending-without-jobs'
import { getReleaseStaleApprovalSignal } from '@/lib/reliability/queries/release-stale-approval'
import { getReleaseWorkerRevisionDriftSignal } from '@/lib/reliability/queries/release-worker-revision-drift'
import { aggregateMaxSeverity, type WatchdogSeverity } from '@/lib/release/severity-resolver'
import {
  dispatchWatchdogAlert,
  type DispatchResult,
  type WatchdogFinding
} from '@/lib/release/watchdog-alerts-dispatcher'
import type { ReliabilitySeverity, ReliabilitySignal } from '@/types/reliability'

interface CliOptions {
  json: boolean
  failOnError: boolean
  enableTeams: boolean
  dryRun: boolean
}

interface WatchdogReport {
  observedAt: string
  signals: ReliabilitySignal[]
  aggregateSeverity: WatchdogSeverity
  exitCode: number
  teamsDispatched: boolean
  teamsSkippedReason: string | null
}

const parseArgs = (): CliOptions => {
  const args = new Set(argv.slice(2))

  return {
    json: args.has('--json'),
    failOnError: args.has('--fail-on-error'),
    enableTeams:
      args.has('--enable-teams') || process.env.ENABLE_TEAMS_DISPATCH === 'true',
    dryRun: args.has('--dry-run')
  }
}

const reliabilityToWatchdogSeverity = (
  severity: ReliabilitySeverity
): WatchdogSeverity => {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  if (severity === 'unknown') return 'ok' // unknown != alert; degraded mode

  return 'ok'
}

const fetchAllSignals = async (): Promise<ReliabilitySignal[]> => {
  const results = await Promise.all([
    getReleaseStaleApprovalSignal().catch((error) => buildFailureSignal('stale_approval', error)),
    getReleasePendingWithoutJobsSignal().catch((error) =>
      buildFailureSignal('pending_without_jobs', error)
    ),
    getReleaseWorkerRevisionDriftSignal().catch((error) =>
      buildFailureSignal('worker_revision_drift', error)
    )
  ])

  return results
}

const buildFailureSignal = (kind: string, error: unknown): ReliabilitySignal => ({
  signalId: `platform.release.${kind}`,
  moduleKey: 'platform',
  kind: 'drift',
  source: `getRelease${kind.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())}Signal`,
  label: `Release watchdog ${kind} reader fallo`,
  severity: 'unknown',
  summary: `Reader fallo: ${error instanceof Error ? error.message : String(error)}`,
  observedAt: new Date().toISOString(),
  evidence: []
})

const printHumanReport = (report: WatchdogReport): void => {
  console.log('=== PRODUCTION RELEASE WATCHDOG ===')
  console.log(`Observed at  : ${report.observedAt}`)
  console.log(`Aggregate    : ${report.aggregateSeverity.toUpperCase()}`)
  console.log(`Exit code    : ${report.exitCode}`)
  console.log(`Teams alerts : ${report.teamsDispatched ? 'sent' : `skipped (${report.teamsSkippedReason ?? 'no alerts to send'})`}`)
  console.log('')
  console.log('--- Findings ---')

  for (const signal of report.signals) {
    const status =
      signal.severity === 'ok'
        ? '✓'
        : signal.severity === 'warning'
          ? '⚠'
          : signal.severity === 'error'
            ? '✗'
            : '?'

    console.log(`${status} ${signal.signalId} [${signal.severity}]`)
    console.log(`  ${signal.summary}`)
  }

  console.log('')
  console.log('=== END WATCHDOG ===')
}

const printJsonReport = (report: WatchdogReport): void => {
  console.log(
    JSON.stringify(
      {
        observedAt: report.observedAt,
        aggregateSeverity: report.aggregateSeverity,
        exitCode: report.exitCode,
        teamsDispatched: report.teamsDispatched,
        teamsSkippedReason: report.teamsSkippedReason,
        signals: report.signals.map((s) => ({
          signalId: s.signalId,
          severity: s.severity,
          summary: s.summary,
          evidence: s.evidence
        }))
      },
      null,
      2
    )
  )
}

/**
 * Computa exit code segun severity + flag --fail-on-error.
 * Critical (no expuesto en ReliabilitySeverity, lo decidimos del summary)
 * tambien fail.
 */
const computeExitCode = (
  aggregateSeverity: WatchdogSeverity,
  failOnError: boolean
): number => {
  if (!failOnError) return 0
  if (aggregateSeverity === 'critical' || aggregateSeverity === 'error') return 1

  return 0
}

const evidenceValue = (signal: ReliabilitySignal, label: string): string | null => {
  return signal.evidence?.find((entry) => entry.label === label)?.value ?? null
}

const defaultRecommendedAction = (findingKind: string): string => {
  if (findingKind === 'worker_revision_drift') {
    return 'Revisar evidence.detail y runbook de production release; re-deployar solo el service drifted con expected_sha del release canonico, luego correr watchdog.'
  }

  return 'Revisar /admin/operations subsystem Platform Release y ejecutar `gh run cancel <id>` segun runbook.'
}

const dispatchTeamsAlerts = async (
  signals: ReliabilitySignal[],
  options: CliOptions
): Promise<{ dispatched: boolean; skippedReason: string | null }> => {
  const alertable = signals.filter((s) => s.severity === 'error' || s.severity === 'warning')

  if (alertable.length === 0) {
    return { dispatched: false, skippedReason: 'no findings con severity > ok' }
  }

  if (!options.enableTeams) {
    return {
      dispatched: false,
      skippedReason:
        '--enable-teams no presente y ENABLE_TEAMS_DISPATCH != true (CLI local default)'
    }
  }

  if (options.dryRun) {
    console.log('[dry-run] Teams alerts que se enviarian:')

    for (const signal of alertable) {
      console.log(`  - ${signal.signalId} [${signal.severity}]: ${signal.summary}`)
    }

    return { dispatched: false, skippedReason: 'dry-run mode' }
  }

  // V1: Slice 5 final wiring. Dispatcher consume signals + extracts findings
  // del evidence array + invoca dispatchWatchdogAlert() per finding (con dedup
  // automatico contra greenhouse_sync.release_watchdog_alert_state).
  //
  // Decisiones:
  // - Por signal aggregate, NO per-finding individual (V1 tradeoff): el
  //   watchdog scheduled run alerta sobre el signal status global, no per
  //   workflow_name+run_id. Si emerge necesidad de per-finding granular
  //   alerts, agregar parser de evidence en Slice 6 V1.1.
  // - Synthetic finding `signalId` como placeholder de workflow_name + 0 como
  //   run_id sintetico — preserva contract tabla pero opera en granularity de
  //   signal. Cuando Slice 6 V1.1 expanda findings parseados, el contract
  //   cambia naturalmente a (workflow_name, run_id) reales por finding.

  const results: DispatchResult[] = []

  for (const signal of alertable) {
    const findingKind = signal.signalId.replace('platform.release.', '')

    if (
      findingKind !== 'stale_approval' &&
      findingKind !== 'pending_without_jobs' &&
      findingKind !== 'worker_revision_drift'
    ) {
      continue
    }

    const synthetic: WatchdogFinding = {
      workflowName: 'aggregate',
      runId: 0,
      alertKind: findingKind,
      severity: signal.severity === 'error' ? 'error' : 'warning',
      htmlUrl: 'https://github.com/efeoncepro/greenhouse-eo/actions',
      branch: 'main',
      sha: 'aggregate',
      ageLabel: 'see signal evidence',
      detail: signal.summary,
      recommendedAction:
        evidenceValue(signal, 'recommended_action') ?? defaultRecommendedAction(findingKind)
    }

    const result = await dispatchWatchdogAlert(synthetic)

    results.push(result)
  }

  const dispatched = results.some((r) => r.decision === 'sent')

  const decisions = results.map((r) => `${r.alertKind}=${r.decision}`).join(' ')

  return {
    dispatched,
    skippedReason: dispatched ? null : `dispatcher decisions: ${decisions || 'none'}`
  }
}

const main = async (): Promise<void> => {
  const options = parseArgs()
  const observedAt = new Date().toISOString()

  const signals = await fetchAllSignals()

  const watchdogSeverities = signals.map((s) => reliabilityToWatchdogSeverity(s.severity))
  const aggregateSeverity = aggregateMaxSeverity(watchdogSeverities)

  const teamsResult = await dispatchTeamsAlerts(signals, options)

  const exitCode = computeExitCode(aggregateSeverity, options.failOnError)

  const report: WatchdogReport = {
    observedAt,
    signals,
    aggregateSeverity,
    exitCode,
    teamsDispatched: teamsResult.dispatched,
    teamsSkippedReason: teamsResult.skippedReason
  }

  if (options.json) {
    printJsonReport(report)
  } else {
    printHumanReport(report)
  }

  exit(exitCode)
}

main().catch((error) => {
  console.error('Production Release Watchdog CRASHED:', error)
  exit(2)
})
