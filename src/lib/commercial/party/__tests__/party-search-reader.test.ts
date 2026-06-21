import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

import { mergePartySearchItems, searchParties } from '../party-search-reader'

beforeEach(() => {
  vi.clearAllMocks()
  mockQuery.mockResolvedValue([])
})

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

describe('searchParties tenant scoping', () => {
  it('searches internal tenants without materializing all visible organization ids', async () => {
    await searchParties('sky', {
      tenant: {
        tenantType: 'efeonce_internal',
        userId: 'usr-1',
        clientId: 'cli-1'
      } as TenantContext,
      includeStages: ['active_client'],
      allowHubspotCandidates: false
    })

    const [sql, values] = mockQuery.mock.calls[0] as [string, unknown[]]

    expect(sql).not.toContain('organization_id = ANY')
    expect(values).toEqual([['active_client'], '%sky%', 40])
  })

  it('scopes client tenants through active spaces instead of passing broad id arrays', async () => {
    await searchParties('sky', {
      tenant: {
        tenantType: 'client',
        userId: 'usr-1',
        clientId: 'cli-1'
      } as TenantContext,
      includeStages: ['active_client', 'opportunity'],
      allowHubspotCandidates: false,
      limit: 10
    })

    const [sql, values] = mockQuery.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('EXISTS')
    expect(sql).toContain('greenhouse_core.spaces')
    expect(sql).not.toContain('organization_id = ANY')
    expect(values).toEqual([['active_client', 'opportunity'], '%sky%', 'cli-1', 20])
  })
})
