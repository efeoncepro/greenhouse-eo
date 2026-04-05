import { describe, expect, it } from 'vitest'

import { computeReactiveLagHours, deriveReactiveBacklogStatus } from './reactive-backlog'

describe('reactive-backlog helpers', () => {
  it('returns healthy when there is no hidden reactive backlog', () => {
    expect(
      deriveReactiveBacklogStatus({
        totalUnreacted: 0,
        last24hUnreacted: 0,
        lagHours: 72
      })
    ).toBe('healthy')
  })

  it('returns degraded for residual hidden backlog without fresh accumulation', () => {
    expect(
      deriveReactiveBacklogStatus({
        totalUnreacted: 12,
        last24hUnreacted: 0,
        lagHours: 8
      })
    ).toBe('degraded')
  })

  it('returns down when new hidden backlog keeps arriving while the reactor is stale', () => {
    expect(
      deriveReactiveBacklogStatus({
        totalUnreacted: 128,
        last24hUnreacted: 128,
        lagHours: 49
      })
    ).toBe('down')
  })

  it('computes rounded lag hours from the last reacted timestamp', () => {
    expect(computeReactiveLagHours('2026-04-05T08:00:00.000Z', new Date('2026-04-05T13:29:00.000Z').getTime())).toBe(5)
  })

  it('returns null lag for missing last reacted timestamp', () => {
    expect(computeReactiveLagHours(null)).toBeNull()
  })
})
