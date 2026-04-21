import { describe, expect, it, vi } from 'vitest'

import {
  wasWrittenByGreenhouseRecently,
  wasWrittenByHubSpotRecently
} from '@/lib/sync/anti-ping-pong'

describe('anti-ping-pong helpers', () => {
  it('returns true when greenhouse write is inside the default 60s window', () => {
    const now = new Date('2026-04-21T22:00:00.000Z').getTime()

    expect(
      wasWrittenByGreenhouseRecently('2026-04-21T21:59:30.000Z', 60, now)
    ).toBe(true)
  })

  it('returns false when hubspot write is older than the window', () => {
    const now = new Date('2026-04-21T22:00:00.000Z').getTime()

    expect(
      wasWrittenByHubSpotRecently('2026-04-21T21:58:30.000Z', 60, now)
    ).toBe(false)
  })

  it('returns false for null timestamps', () => {
    expect(wasWrittenByHubSpotRecently(null, 60, vi.getRealSystemTime())).toBe(false)
  })
})
