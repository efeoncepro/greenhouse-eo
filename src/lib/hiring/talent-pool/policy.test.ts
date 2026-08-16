import { describe, expect, it } from 'vitest'

import { deriveTalentPoolAccess } from './policy'

const now = new Date('2026-08-16T00:00:00.000Z')

describe('deriveTalentPoolAccess', () => {
  it('keeps active-process profiles discoverable but not contactable', () => {
    expect(deriveTalentPoolAccess({ lifecycleStatus: 'active_process', futureConsentExpiresAt: null, now })).toEqual({
      discoverable: true,
      contactable: false,
      allowedActions: ['read', 'update_availability', 'grant_future_consent'],
      reasonCodes: ['active_application_only']
    })
  })

  it('allows invite only with current explicit future consent', () => {
    const result = deriveTalentPoolAccess({
      lifecycleStatus: 'pool_eligible',
      futureConsentExpiresAt: '2027-01-01T00:00:00.000Z',
      now
    })

    expect(result.contactable).toBe(true)
    expect(result.allowedActions).toContain('invite')
  })

  it.each(['withdrawn', 'expired'] as const)('fails closed for %s', lifecycleStatus => {
    const result = deriveTalentPoolAccess({ lifecycleStatus, futureConsentExpiresAt: null, now })

    expect(result.discoverable).toBe(false)
    expect(result.contactable).toBe(false)
    expect(result.allowedActions).toEqual([])
  })

  it('treats a past expiry as expired even when the projection has not reconciled yet', () => {
    const result = deriveTalentPoolAccess({
      lifecycleStatus: 'pool_eligible',
      futureConsentExpiresAt: '2026-01-01T00:00:00.000Z',
      now
    })

    expect(result.reasonCodes).toEqual(['future_consent_expired'])
    expect(result.contactable).toBe(false)
  })

  it('keeps an active application readable when a separate future-opportunity lease is stale', () => {
    const result = deriveTalentPoolAccess({
      lifecycleStatus: 'active_process',
      futureConsentExpiresAt: '2026-01-01T00:00:00.000Z',
      now
    })

    expect(result).toEqual({
      discoverable: true,
      contactable: false,
      allowedActions: ['read', 'update_availability', 'grant_future_consent'],
      reasonCodes: ['active_application_only']
    })
  })
})
