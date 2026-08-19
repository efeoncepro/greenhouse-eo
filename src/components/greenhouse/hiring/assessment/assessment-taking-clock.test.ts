import { afterEach, describe, expect, it, vi } from 'vitest'

import { projectAssessmentDatabaseNow, resolveTimerTotalSeconds } from './assessment-taking-clock'

describe('TASK-1746 authoritative assessment client clock', () => {
  afterEach(() => vi.useRealTimers())

  it.each([
    ['one hour behind', '2026-08-19T09:00:00.000Z'],
    ['one hour ahead', '2026-08-19T11:00:00.000Z'],
  ])('ignores a browser wall clock %s', (_label, browserNow) => {
    vi.useFakeTimers()
    vi.setSystemTime(browserNow)

    expect(projectAssessmentDatabaseNow({
      databaseNowMs: Date.parse('2026-08-19T10:00:00.000Z'),
      monotonicStartedMs: 500,
    }, 2_000)).toBe(Date.parse('2026-08-19T10:00:01.500Z'))
  })
})

describe('TASK-1746 assessment timer total', () => {
  it('uses effective timed minutes including accommodation', () => {
    expect(resolveTimerTotalSeconds('answering', { hasTimeLimit: true, effectiveMinutes: 65 }))
      .toBe(65 * 60)
  })

  it('uses exactly 30 minutes during submit grace', () => {
    expect(resolveTimerTotalSeconds('submit_grace', { hasTimeLimit: true, effectiveMinutes: 65 }))
      .toBe(1_800)
  })

  it('uses exactly 24 hours for no-limit assessments', () => {
    expect(resolveTimerTotalSeconds('answering', { hasTimeLimit: false, effectiveMinutes: 0 }))
      .toBe(86_400)
  })
})
