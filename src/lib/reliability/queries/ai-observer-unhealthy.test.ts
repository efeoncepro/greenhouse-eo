import { describe, expect, it } from 'vitest'

import type { AiObserverRunRecord } from '@/lib/reliability/ai/ai-observer-run-tracker'

import { evaluateAiObserverHealth } from './ai-observer-unhealthy'

const NOW = Date.parse('2026-05-26T12:00:00.000Z')

const run = (overrides: Partial<AiObserverRunRecord> = {}): AiObserverRunRecord => ({
  runId: 'ai-observer-test',
  status: 'succeeded',
  triggeredBy: 'cloud_scheduler',
  notes: 'persisted=1 evaluated=5 dedup_skipped=4',
  startedAt: new Date(NOW - 5 * 60 * 1000).toISOString(), // 5 min ago (fresh)
  finishedAt: new Date(NOW - 4 * 60 * 1000).toISOString(),
  ...overrides
})

describe('evaluateAiObserverHealth (TASK-937 signal severity)', () => {
  it('awaiting_data when there are no runs (never activated)', () => {
    const out = evaluateAiObserverHealth([], NOW)

    expect(out.severity).toBe('awaiting_data')
  })

  it('error when the last heartbeat is older than 2.5h (cron/worker down)', () => {
    const stale = run({ startedAt: new Date(NOW - 3 * 60 * 60 * 1000).toISOString() })
    const out = evaluateAiObserverHealth([stale], NOW)

    expect(out.severity).toBe('error')
    expect(out.summary).toContain('heartbeat')
  })

  it('not_configured when the last fresh run is cancelled+disabled (kill-switch OFF)', () => {
    const disabled = run({ status: 'cancelled', notes: 'disabled:kill-switch-off' })
    const out = evaluateAiObserverHealth([disabled], NOW)

    expect(out.severity).toBe('not_configured')
  })

  it('error when 4+ consecutive recent runs failed (model broken)', () => {
    const failed = run({ status: 'failed', notes: 'parse_failed:MAX_TOKENS — ...' })
    const out = evaluateAiObserverHealth([failed, failed, failed, failed, run()], NOW)

    expect(out.severity).toBe('error')
    expect(out.summary).toContain('4')
  })

  it('warning when 1-3 recent runs failed (early degradation)', () => {
    const failed = run({ status: 'failed', notes: 'parse_failed:MAX_TOKENS — ...' })
    const out = evaluateAiObserverHealth([failed, run(), run()], NOW)

    expect(out.severity).toBe('warning')
  })

  it('ok when the last run succeeded and is fresh', () => {
    const out = evaluateAiObserverHealth([run(), run()], NOW)

    expect(out.severity).toBe('ok')
  })

  it('stale takes precedence over a disabled last run (cron stopped writing heartbeats)', () => {
    const staleDisabled = run({
      status: 'cancelled',
      notes: 'disabled:kill-switch-off',
      startedAt: new Date(NOW - 5 * 60 * 60 * 1000).toISOString()
    })

    const out = evaluateAiObserverHealth([staleDisabled], NOW)

    expect(out.severity).toBe('error')
  })
})
