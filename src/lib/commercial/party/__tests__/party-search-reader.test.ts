import { describe, expect, it } from 'vitest'

import { mergePartySearchItems } from '../party-search-reader'

describe('mergePartySearchItems', () => {
  it('prefers materialized parties over HubSpot candidates with the same company id', () => {
    const merged = mergePartySearchItems(
      [
        {
          kind: 'party',
          organizationId: 'org-1',
          commercialPartyId: 'party-1',
          hubspotCompanyId: 'hs-1',
          displayName: 'Acme Chile',
          lifecycleStage: 'opportunity',
          canAdopt: false
        }
      ],
      [
        {
          kind: 'hubspot_candidate',
          hubspotCompanyId: 'hs-1',
          displayName: 'Acme Prospect',
          lifecycleStage: 'prospect',
          canAdopt: true
        }
      ]
    )

    expect(merged).toHaveLength(1)
    expect(merged[0]).toEqual(
      expect.objectContaining({
        kind: 'party',
        organizationId: 'org-1'
      })
    )
  })

  it('orders materialized organizations ahead of candidates', () => {
    const merged = mergePartySearchItems(
      [
        {
          kind: 'party',
          organizationId: 'org-1',
          commercialPartyId: 'party-1',
          displayName: 'Acme Cliente',
          lifecycleStage: 'active_client',
          canAdopt: false
        },
        {
          kind: 'party',
          organizationId: 'org-2',
          commercialPartyId: 'party-2',
          displayName: 'Acme Oportunidad',
          lifecycleStage: 'opportunity',
          canAdopt: false
        }
      ],
      [
        {
          kind: 'hubspot_candidate',
          hubspotCompanyId: 'hs-9',
          displayName: 'Acme Candidate',
          lifecycleStage: 'prospect',
          canAdopt: true
        }
      ]
    )

    expect(merged.map(item => item.kind)).toEqual([
      'party',
      'party',
      'hubspot_candidate'
    ])
  })
})
