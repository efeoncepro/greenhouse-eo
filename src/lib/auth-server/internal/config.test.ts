import { describe, expect, it } from 'vitest'

import { internalMultiOrgIssuanceEnabled, internalMultiOrgReaderEnabled } from './config'

describe('TASK-1844 gates default closed', () => {
  it('requires flag plus an exact cohort; rejects empty/wildcard/malformed cohorts', () => {
    expect(internalMultiOrgIssuanceEnabled('profile-A', {})).toBe(false)

    for (const cohort of ['', '*', 'profile-A,*', 'profile-A,', 'profile B']) {
      expect(internalMultiOrgIssuanceEnabled('profile-A', { AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED: 'true', AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS: cohort })).toBe(false)
    }

    const env = { AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED: 'true', AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS: 'profile-A,profile-B' }

    expect(internalMultiOrgIssuanceEnabled('profile-A', env)).toBe(true)
    expect(internalMultiOrgIssuanceEnabled('profile-C', env)).toBe(false)
    expect(internalMultiOrgReaderEnabled({})).toBe(false)
    expect(internalMultiOrgReaderEnabled({ IDENTITY_INTERNAL_MULTI_ORG_ENABLED: 'true' })).toBe(true)
  })
})
