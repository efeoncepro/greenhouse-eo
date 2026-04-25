import { describe, expect, it } from 'vitest'

import { resolvePartyFieldAuthority } from '@/lib/sync/field-authority'

describe('resolvePartyFieldAuthority', () => {
  it('assigns lifecyclestage to HubSpot before Greenhouse has active quote or contract', () => {
    expect(
      resolvePartyFieldAuthority('lifecyclestage', { hasActiveQuoteOrContract: false })
    ).toBe('hubspot')
  })

  it('assigns lifecyclestage to Greenhouse when there is active quote or contract', () => {
    expect(
      resolvePartyFieldAuthority('lifecyclestage', { hasActiveQuoteOrContract: true })
    ).toBe('greenhouse')
  })

  it('keeps Greenhouse as owner for custom gh_* fields', () => {
    expect(
      resolvePartyFieldAuthority('gh_last_contract_at', { hasActiveQuoteOrContract: false })
    ).toBe('greenhouse')
  })
})
