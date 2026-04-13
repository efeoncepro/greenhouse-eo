import { describe, expect, it } from 'vitest'

import { REACTIVE_EVENT_TYPES } from '@/lib/sync/event-catalog'
import { getAllTriggerEventTypes } from '@/lib/sync/projection-registry'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'

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

describe('reactive-backlog event type filtering', () => {
  it('only counts events that have at least one registered projection handler', () => {
    ensureProjectionsRegistered()
    const handled = new Set(getAllTriggerEventTypes())

    const cataloguedButUnhandled = REACTIVE_EVENT_TYPES.filter(eventType => !handled.has(eventType))

    // Sister platform binding events are forward-declared in REACTIVE_EVENT_TYPES
    // but have no consumer yet — they must NOT inflate the Ops Health backlog.
    expect(cataloguedButUnhandled).toEqual(
      expect.arrayContaining([
        'sister_platform_binding.created',
        'sister_platform_binding.updated',
        'sister_platform_binding.activated',
        'sister_platform_binding.suspended',
        'sister_platform_binding.deprecated'
      ])
    )

    for (const eventType of cataloguedButUnhandled) {
      expect(handled.has(eventType)).toBe(false)
    }
  })
})
