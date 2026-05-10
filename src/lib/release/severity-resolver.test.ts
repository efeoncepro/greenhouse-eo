import { describe, expect, it } from 'vitest'

import {
  WATCHDOG_THRESHOLDS,
  aggregateMaxSeverity,
  isSeverityEscalation,
  resolvePendingWithoutJobsSeverity,
  resolveStaleApprovalSeverity,
  resolveWorkerRevisionDriftSeverity,
  severityRank,
  watchdogSeverityToReliabilitySeverity
} from './severity-resolver'

describe('severity-resolver — stale approval', () => {
  it('returns ok when age < 2h', () => {
    expect(resolveStaleApprovalSeverity(0)).toBe('ok')
    expect(resolveStaleApprovalSeverity(60 * 60 * 1000)).toBe('ok') // 1h
    expect(resolveStaleApprovalSeverity(WATCHDOG_THRESHOLDS.staleApprovalWarningMs - 1)).toBe('ok')
  })

  it('returns warning when age >= 2h and < 24h', () => {
    expect(resolveStaleApprovalSeverity(WATCHDOG_THRESHOLDS.staleApprovalWarningMs)).toBe('warning')
    expect(resolveStaleApprovalSeverity(12 * 60 * 60 * 1000)).toBe('warning') // 12h
    expect(resolveStaleApprovalSeverity(WATCHDOG_THRESHOLDS.staleApprovalErrorMs - 1)).toBe('warning')
  })

  it('returns error when age >= 24h and < 7d', () => {
    expect(resolveStaleApprovalSeverity(WATCHDOG_THRESHOLDS.staleApprovalErrorMs)).toBe('error')
    expect(resolveStaleApprovalSeverity(3 * 24 * 60 * 60 * 1000)).toBe('error') // 3 days
    expect(resolveStaleApprovalSeverity(WATCHDOG_THRESHOLDS.staleApprovalCriticalMs - 1)).toBe('error')
  })

  it('returns critical when age >= 7d', () => {
    expect(resolveStaleApprovalSeverity(WATCHDOG_THRESHOLDS.staleApprovalCriticalMs)).toBe('critical')
    expect(resolveStaleApprovalSeverity(14 * 24 * 60 * 60 * 1000)).toBe('critical') // 14d
    // Real incident fixture: 24970337613 was waiting since 2026-04-26 (~14 days).
    expect(resolveStaleApprovalSeverity(14 * 24 * 60 * 60 * 1000)).toBe('critical')
    // Real incident: 24594085240 since 2026-04-18 (~22 days).
    expect(resolveStaleApprovalSeverity(22 * 24 * 60 * 60 * 1000)).toBe('critical')
  })
})

describe('severity-resolver — pending without jobs', () => {
  it('returns ok when age < 5min', () => {
    expect(resolvePendingWithoutJobsSeverity(0)).toBe('ok')
    expect(resolvePendingWithoutJobsSeverity(60 * 1000)).toBe('ok') // 1 min
    expect(resolvePendingWithoutJobsSeverity(WATCHDOG_THRESHOLDS.pendingWithoutJobsWarningMs - 1)).toBe('ok')
  })

  it('returns warning when age >= 5min and < 30min', () => {
    expect(resolvePendingWithoutJobsSeverity(WATCHDOG_THRESHOLDS.pendingWithoutJobsWarningMs)).toBe('warning')
    expect(resolvePendingWithoutJobsSeverity(15 * 60 * 1000)).toBe('warning') // 15 min
    expect(resolvePendingWithoutJobsSeverity(WATCHDOG_THRESHOLDS.pendingWithoutJobsErrorMs - 1)).toBe('warning')
  })

  it('returns error when age >= 30min', () => {
    expect(resolvePendingWithoutJobsSeverity(WATCHDOG_THRESHOLDS.pendingWithoutJobsErrorMs)).toBe('error')
    expect(resolvePendingWithoutJobsSeverity(60 * 60 * 1000)).toBe('error') // 1h
  })

  it('does NOT escalate to critical (only stale_approval and worker_drift do)', () => {
    expect(resolvePendingWithoutJobsSeverity(7 * 24 * 60 * 60 * 1000)).toBe('error') // 7d
  })
})

describe('severity-resolver — worker revision drift', () => {
  it('returns ok when no drift', () => {
    expect(resolveWorkerRevisionDriftSeverity(false)).toBe('ok')
  })

  it('returns critical when drift detected', () => {
    expect(resolveWorkerRevisionDriftSeverity(true)).toBe('critical')
  })
})

describe('severity-resolver — aggregateMaxSeverity', () => {
  it('returns ok for empty array', () => {
    expect(aggregateMaxSeverity([])).toBe('ok')
  })

  it('returns ok when all are ok', () => {
    expect(aggregateMaxSeverity(['ok', 'ok', 'ok'])).toBe('ok')
  })

  it('promotes to warning when any warning', () => {
    expect(aggregateMaxSeverity(['ok', 'warning', 'ok'])).toBe('warning')
  })

  it('promotes to error over warning', () => {
    expect(aggregateMaxSeverity(['warning', 'error', 'ok'])).toBe('error')
  })

  it('promotes to critical over error', () => {
    expect(aggregateMaxSeverity(['error', 'critical', 'warning'])).toBe('critical')
  })
})

describe('severity-resolver — watchdogSeverityToReliabilitySeverity', () => {
  it('maps ok/warning/error 1:1', () => {
    expect(watchdogSeverityToReliabilitySeverity('ok')).toBe('ok')
    expect(watchdogSeverityToReliabilitySeverity('warning')).toBe('warning')
    expect(watchdogSeverityToReliabilitySeverity('error')).toBe('error')
  })

  it('collapses critical to error (registry no expone critical tier)', () => {
    expect(watchdogSeverityToReliabilitySeverity('critical')).toBe('error')
  })
})

describe('severity-resolver — severityRank', () => {
  it('ranks ok < warning < error < critical', () => {
    expect(severityRank('ok')).toBe(1)
    expect(severityRank('warning')).toBe(2)
    expect(severityRank('error')).toBe(3)
    expect(severityRank('critical')).toBe(4)
  })
})

describe('severity-resolver — isSeverityEscalation', () => {
  it('returns true when previous is null and current is alert', () => {
    expect(isSeverityEscalation(null, 'warning')).toBe(true)
    expect(isSeverityEscalation(null, 'error')).toBe(true)
    expect(isSeverityEscalation(null, 'critical')).toBe(true)
  })

  it('returns false when current is ok (recovery handled separately)', () => {
    expect(isSeverityEscalation('warning', 'ok')).toBe(false)
    expect(isSeverityEscalation('critical', 'ok')).toBe(false)
    expect(isSeverityEscalation(null, 'ok')).toBe(false)
  })

  it('returns true on warning → error', () => {
    expect(isSeverityEscalation('warning', 'error')).toBe(true)
  })

  it('returns true on error → critical', () => {
    expect(isSeverityEscalation('error', 'critical')).toBe(true)
  })

  it('returns false on same severity (no spam re-alert)', () => {
    expect(isSeverityEscalation('warning', 'warning')).toBe(false)
    expect(isSeverityEscalation('error', 'error')).toBe(false)
    expect(isSeverityEscalation('critical', 'critical')).toBe(false)
  })

  it('returns false on de-escalation (warning de critical no es alert nueva)', () => {
    expect(isSeverityEscalation('critical', 'warning')).toBe(false)
    expect(isSeverityEscalation('error', 'warning')).toBe(false)
  })
})
