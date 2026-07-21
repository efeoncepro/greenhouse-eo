import { describe, expect, it } from 'vitest'

import { canonicalizeMeetingTimezone, isSupportedMeetingTimezone, resolveMeetingTimezone } from '../timezone'

describe('meeting timezone policy', () => {
  it.each(['America/Santiago', 'America/Lima', 'America/New_York', 'Europe/Madrid', 'Asia/Tokyo', 'UTC'])(
    'acepta la zona IANA %s',
    timezone => expect(isSupportedMeetingTimezone(timezone)).toBe(true),
  )

  it.each(['GMT-4', '+02:00', 'Santiago', 'javascript:alert(1)', '', 'A'.repeat(65)])(
    'rechaza la zona no IANA %s',
    timezone => expect(canonicalizeMeetingTimezone(timezone)).toBeNull(),
  )

  it('canonicaliza aliases admitidos por el runtime y usa fallback seguro', () => {
    expect(canonicalizeMeetingTimezone('US/Pacific')).toBeTruthy()
    expect(resolveMeetingTimezone('invalid', 'America/Santiago')).toBe('America/Santiago')
    expect(resolveMeetingTimezone('invalid', 'invalid')).toBe('UTC')
  })
})
