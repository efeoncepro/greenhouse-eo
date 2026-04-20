import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetAllBreakers,
  getBreakerSnapshot,
  isBreakerOpen,
  recordFailure,
  recordSuccess
} from '@/lib/finance/fx/circuit-breaker'

describe('circuit-breaker', () => {
  beforeEach(() => {
    __resetAllBreakers()
    vi.useRealTimers()
  })

  it('is closed by default', () => {
    expect(isBreakerOpen('mindicador')).toBe(false)
  })

  it('stays closed after a single failure', () => {
    const result = recordFailure('banxico_sie')

    expect(result.opened).toBe(false)
    expect(isBreakerOpen('banxico_sie')).toBe(false)
  })

  it('opens after 3 failures within the 5min window', () => {
    recordFailure('frankfurter')
    recordFailure('frankfurter')
    const third = recordFailure('frankfurter')

    expect(third.opened).toBe(true)
    expect(isBreakerOpen('frankfurter')).toBe(true)
  })

  it('success resets the counter and closes the breaker', () => {
    recordFailure('fawaz_ahmed')
    recordFailure('fawaz_ahmed')

    recordSuccess('fawaz_ahmed')

    const next = recordFailure('fawaz_ahmed')

    expect(next.opened).toBe(false)

    recordFailure('fawaz_ahmed')
    const third = recordFailure('fawaz_ahmed')

    expect(third.opened).toBe(true)
  })

  it('resets the counter if failures are outside the 5min window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-19T10:00:00Z'))

    recordFailure('apis_net_pe_sunat')
    recordFailure('apis_net_pe_sunat')

    // Jump past the 5-min window
    vi.setSystemTime(new Date('2026-04-19T10:06:00Z'))

    const third = recordFailure('apis_net_pe_sunat')

    // Third failure, but window was reset → not open yet
    expect(third.opened).toBe(false)
    expect(isBreakerOpen('apis_net_pe_sunat')).toBe(false)
  })

  it('stays open for 15 minutes after tripping', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-19T10:00:00Z'))

    recordFailure('datos_gov_co_trm')
    recordFailure('datos_gov_co_trm')
    recordFailure('datos_gov_co_trm')

    expect(isBreakerOpen('datos_gov_co_trm')).toBe(true)

    // 14 min later — still open
    vi.setSystemTime(new Date('2026-04-19T10:14:00Z'))
    expect(isBreakerOpen('datos_gov_co_trm')).toBe(true)

    // 16 min later — closed
    vi.setSystemTime(new Date('2026-04-19T10:16:00Z'))
    expect(isBreakerOpen('datos_gov_co_trm')).toBe(false)
  })

  it('breakers are isolated per provider', () => {
    recordFailure('mindicador')
    recordFailure('mindicador')
    recordFailure('mindicador')

    expect(isBreakerOpen('mindicador')).toBe(true)
    expect(isBreakerOpen('banxico_sie')).toBe(false)
    expect(isBreakerOpen('open_er_api')).toBe(false)
  })

  it('getBreakerSnapshot exposes state', () => {
    recordFailure('bcrp')

    const snap = getBreakerSnapshot('bcrp')

    expect(snap.failures).toBe(1)
    expect(snap.isOpen).toBe(false)
    expect(snap.openUntil).toBe(0)
  })
})
