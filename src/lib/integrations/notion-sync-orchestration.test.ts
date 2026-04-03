import { describe, expect, it } from 'vitest'

import {
  buildRetrySchedule,
  computeRetryDelayMinutes
} from '@/lib/integrations/notion-sync-orchestration'

describe('notion sync orchestration', () => {
  it('builds exponential retry windows capped at 60 minutes', () => {
    expect(computeRetryDelayMinutes(0)).toBe(15)
    expect(computeRetryDelayMinutes(1)).toBe(15)
    expect(computeRetryDelayMinutes(2)).toBe(30)
    expect(computeRetryDelayMinutes(3)).toBe(60)
    expect(computeRetryDelayMinutes(5)).toBe(60)
  })

  it('returns a deterministic next retry timestamp from the provided clock', () => {
    const schedule = buildRetrySchedule({
      retryAttempt: 2,
      now: new Date('2026-04-03T06:20:00.000Z')
    })

    expect(schedule).toEqual({
      retryAttempt: 2,
      delayMinutes: 30,
      nextRetryAt: '2026-04-03T06:50:00.000Z'
    })
  })
})
