import { describe, expect, it } from 'vitest'

import { toDateString, toTimestampString } from '@/lib/finance/shared'

describe('finance shared date normalization', () => {
  it('normalizes Date instances to YYYY-MM-DD', () => {
    expect(toDateString(new Date('2026-03-06T03:00:00.000Z'))).toBe('2026-03-06')
  })

  it('normalizes Date instances to ISO timestamps', () => {
    expect(toTimestampString(new Date('2026-03-06T00:00:00.000Z'))).toBe('2026-03-06T00:00:00.000Z')
  })
})
