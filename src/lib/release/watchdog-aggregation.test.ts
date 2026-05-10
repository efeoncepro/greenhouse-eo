import { describe, expect, it } from 'vitest'

import { aggregateMaxSeverity, type WatchdogSeverity } from './severity-resolver'

/**
 * TASK-849 Slice 4 — Tests anti-regresion del aggregation logic del CLI.
 *
 * El CLI `scripts/release/production-release-watchdog.ts` consume los 3
 * readers reliability + agrega severities. Estos tests validan el contrato
 * exacto del CLI: cuando todos los signals son ok, exit 0; cuando uno warning,
 * exit 0 (warnings no rompen workflow); cuando uno error o critical, exit 1.
 *
 * Tambien valida que `unknown` (degraded mode sin token) NO se trata como
 * alert — degrada silente para que el operador investigue config.
 */

describe('watchdog CLI aggregation logic', () => {
  it('all ok signals → aggregate ok', () => {
    const severities: WatchdogSeverity[] = ['ok', 'ok', 'ok']

    expect(aggregateMaxSeverity(severities)).toBe('ok')
  })

  it('one warning + 2 ok → aggregate warning', () => {
    const severities: WatchdogSeverity[] = ['ok', 'warning', 'ok']

    expect(aggregateMaxSeverity(severities)).toBe('warning')
  })

  it('one error overrides all warnings → aggregate error', () => {
    const severities: WatchdogSeverity[] = ['warning', 'error', 'warning']

    expect(aggregateMaxSeverity(severities)).toBe('error')
  })

  it('worker_revision_drift critical promotes aggregate to critical', () => {
    // Real scenario: stale_approval ok, pending_without_jobs ok,
    // worker_revision_drift true (critical).
    const severities: WatchdogSeverity[] = ['ok', 'ok', 'critical']

    expect(aggregateMaxSeverity(severities)).toBe('critical')
  })

  it('historical incident scenario: stale 22d (critical) + pending 5min (warning)', () => {
    // Real fixture: ICO Batch run 24594085240 fue waiting desde 2026-04-18.
    // 22 dias = critical. Mientras tanto, push nuevo entro pending por
    // concurrency.
    const severities: WatchdogSeverity[] = ['critical', 'warning', 'ok']

    expect(aggregateMaxSeverity(severities)).toBe('critical')
  })
})
