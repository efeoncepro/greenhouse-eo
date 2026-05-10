/**
 * TASK-850 — Output formatters for the production-preflight CLI.
 *
 * Two surfaces:
 *   - JSON machine-readable (for CI workflow steps + future TASK-851
 *     orchestrator + dashboard UI consumption)
 *   - Human-readable summary in es-CL for operator running CLI locally
 */

import type {
  PreflightCheckResult,
  PreflightSeverity,
  ProductionPreflightV1
} from './types'

const severityIcon = (severity: PreflightSeverity): string => {
  if (severity === 'ok') return '✓'
  if (severity === 'warning') return '⚠'
  if (severity === 'error') return '✗'

  return '?'
}

const overallIcon = (status: string): string => {
  if (status === 'healthy') return '✓ READY'
  if (status === 'degraded') return '⚠ DEGRADED'
  if (status === 'blocked') return '✗ BLOCKED'

  return '? UNKNOWN'
}

export const formatPreflightAsJson = (payload: ProductionPreflightV1): string => {
  return JSON.stringify(payload, null, 2)
}

const formatCheck = (check: PreflightCheckResult): string => {
  const icon = severityIcon(check.severity)
  const lines = [`  ${icon} [${check.severity.padEnd(7)}] ${check.checkId}`, `      ${check.summary}`]

  if (check.recommendation) {
    lines.push(`      → ${check.recommendation}`)
  }

  return lines.join('\n')
}

export const formatPreflightAsHuman = (payload: ProductionPreflightV1): string => {
  const lines: string[] = []

  lines.push('═'.repeat(72))
  lines.push(`Production Preflight — ${payload.contractVersion}`)
  lines.push('═'.repeat(72))
  lines.push('')
  lines.push(`Target SHA       : ${payload.targetSha.slice(0, 12)}`)
  lines.push(`Target Branch    : ${payload.targetBranch}`)
  lines.push(`Triggered By     : ${payload.triggeredBy ?? '(no triggerer)'}`)
  lines.push(`Started          : ${payload.startedAt}`)
  lines.push(`Completed        : ${payload.completedAt}`)
  lines.push(`Duration         : ${payload.durationMs}ms`)
  lines.push('')
  lines.push(`Overall Status   : ${overallIcon(payload.overallStatus)}`)
  lines.push(`Confidence       : ${payload.confidence}`)
  lines.push(`Ready to Deploy  : ${payload.readyToDeploy ? 'SI' : 'NO'}`)
  lines.push('')

  if (payload.degradedSources.length > 0) {
    lines.push('Degraded Sources:')

    for (const source of payload.degradedSources) {
      lines.push(`  - ${source.checkId} [${source.status}]: ${source.summary}`)
    }

    lines.push('')
  }

  lines.push('Checks (12):')
  lines.push('')

  for (const check of payload.checks) {
    lines.push(formatCheck(check))
    lines.push('')
  }

  lines.push('═'.repeat(72))

  return lines.join('\n')
}
