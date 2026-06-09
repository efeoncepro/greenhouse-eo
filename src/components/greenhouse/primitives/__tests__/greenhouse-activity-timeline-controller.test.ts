import { describe, expect, it } from 'vitest'

import { GREENHOUSE_ACTIVITY_TIMELINE_TOKENS } from '../greenhouse-activity-timeline-controller'

describe('greenhouse-activity-timeline-controller', () => {
  it('centralizes reusable activity timeline chrome tokens', () => {
    expect(GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.card).toEqual({
      compactMaxInlineSize: 460,
      maxInlineSize: 554
    })
    expect(GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.dot).toMatchObject({
      railInlineSize: 18,
      size: 18,
      innerSize: 10
    })
    expect(GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.avatar.cluster).toBe(34)
    expect(GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.opacity.border).toBe(0.08)
  })
})
