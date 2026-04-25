import type {
  ReliabilityConfidence,
  ReliabilitySeverity,
  ReliabilitySignal
} from '@/types/reliability'

import type { CloudHealthStatus, CloudPostureStatus, CloudSentryIncidentLevel } from '@/lib/cloud/contracts'
import type {
  IntegrationDataQualityCheckSeverity,
  IntegrationDataQualityStatus
} from '@/types/integration-data-quality'
import type { OperationsHealthStatus } from '@/lib/operations/get-operations-overview'

const SEVERITY_RANK: Record<ReliabilitySeverity, number> = {
  ok: 0,
  awaiting_data: 1,
  unknown: 2,
  not_configured: 3,
  warning: 4,
  error: 5
}

const RANK_TO_SEVERITY: ReliabilitySeverity[] = [
  'ok',
  'awaiting_data',
  'unknown',
  'not_configured',
  'warning',
  'error'
]

export const compareSeverity = (a: ReliabilitySeverity, b: ReliabilitySeverity): number =>
  SEVERITY_RANK[a] - SEVERITY_RANK[b]

export const fromCloudHealthStatus = (status: CloudHealthStatus): ReliabilitySeverity => {
  switch (status) {
    case 'ok':
      return 'ok'
    case 'degraded':
      return 'warning'
    case 'error':
      return 'error'
    case 'not_configured':
      return 'not_configured'
  }
}

export const fromCloudPostureStatus = (status: CloudPostureStatus): ReliabilitySeverity => {
  switch (status) {
    case 'ok':
      return 'ok'
    case 'warning':
      return 'warning'
    case 'unconfigured':
      return 'not_configured'
  }
}

export const fromOperationsHealth = (status: OperationsHealthStatus): ReliabilitySeverity => {
  switch (status) {
    case 'healthy':
      return 'ok'
    case 'degraded':
      return 'warning'
    case 'down':
      return 'error'
    case 'not_configured':
      return 'not_configured'
    case 'idle':
      return 'awaiting_data'
  }
}

export const fromDataQualityStatus = (status: IntegrationDataQualityStatus): ReliabilitySeverity => {
  switch (status) {
    case 'healthy':
      return 'ok'
    case 'degraded':
      return 'warning'
    case 'broken':
      return 'error'
    case 'unknown':
      return 'unknown'
  }
}

export const fromDataQualityCheckSeverity = (
  severity: IntegrationDataQualityCheckSeverity
): ReliabilitySeverity => {
  switch (severity) {
    case 'ok':
      return 'ok'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
  }
}

export const fromSentryLevel = (level: CloudSentryIncidentLevel): ReliabilitySeverity => {
  switch (level) {
    case 'fatal':
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'ok'
    case 'unknown':
      return 'unknown'
  }
}

/**
 * Aggregate the worst severity from a set of signals to produce the module
 * status. `not_configured` and `awaiting_data` should NEVER mask real
 * `warning`/`error` signals — that's the whole point of separating them.
 */
export const aggregateModuleStatus = (signals: ReliabilitySignal[]): ReliabilitySeverity => {
  if (signals.length === 0) return 'unknown'

  let worstRank = SEVERITY_RANK.ok

  for (const signal of signals) {
    const rank = SEVERITY_RANK[signal.severity]

    if (rank > worstRank) worstRank = rank
  }

  return RANK_TO_SEVERITY[worstRank]
}

/**
 * Confidence reflects how much real evidence backs the module status.
 *
 *  - high: every expected signal kind has a concrete signal with `ok`/`warning`/`error`
 *  - medium: most expected signals are present, but some are still pending
 *  - low: more than half of expected signals are missing or `not_configured`
 *  - unknown: no signals available at all
 */
export const computeConfidence = (
  totalExpected: number,
  totalPresent: number,
  totalConcrete: number
): ReliabilityConfidence => {
  if (totalExpected === 0) return 'unknown'
  if (totalPresent === 0) return 'unknown'

  const concreteRatio = totalConcrete / totalExpected

  if (concreteRatio >= 0.8) return 'high'
  if (concreteRatio >= 0.5) return 'medium'

  return 'low'
}

export const isConcreteSeverity = (severity: ReliabilitySeverity): boolean =>
  severity === 'ok' || severity === 'warning' || severity === 'error'
