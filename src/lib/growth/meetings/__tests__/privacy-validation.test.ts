import { describe, expect, it } from 'vitest'

import { createMeetingPrivacyHasher } from '../privacy'
import { parseMeetingBookingRequest } from '../validation'

const secret = 'a-secure-test-secret-that-is-at-least-thirty-two-bytes'

describe('meeting privacy and validation boundary', () => {
  it('domain-separates HMACs and never returns the raw identifier', () => {
    const hasher = createMeetingPrivacyHasher(secret)
    const email = 'person@example.com'

    expect(hasher.hmac('email', email)).toMatch(/^[a-f0-9]{64}$/)
    expect(hasher.hmac('email', email)).not.toBe(hasher.hmac('ip', email))
    expect(hasher.hmac('email', email)).not.toContain(email)
  })

  it('produces stable fingerprints independent of object key order', () => {
    const hasher = createMeetingPrivacyHasher(secret)

    expect(hasher.fingerprint({ b: 2, a: { z: 1, y: 0 } })).toBe(
      hasher.fingerprint({ a: { y: 0, z: 1 }, b: 2 }),
    )
  })

  it('rejects unknown fields and unsafe attribution values', () => {
    const base = {
      schedulerKey: 'discovery',
      surfaceId: 'fhsf-public-test',
      idempotencyKey: 'booking_12345678',
      slot: { startsAt: '2026-07-22T13:15:00.000Z', durationMinutes: 30, timezone: 'America/Santiago' },
      locale: 'es',
      contact: { email: 'person@example.com', firstName: 'Ada', lastName: 'Lovelace', company: 'Engines' },
      consent: { processingAccepted: true, communicationKeys: [] },
      captchaToken: 'captcha',
    }

    expect(parseMeetingBookingRequest(base)).not.toBeNull()
    expect(parseMeetingBookingRequest({ ...base, providerSlug: 'secret' })).toBeNull()
    expect(parseMeetingBookingRequest({ ...base, attribution: { utmCampaign: 'email=person@example.com' } })).toBeNull()
  })
})
