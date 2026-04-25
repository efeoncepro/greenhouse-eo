import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

vi.mock('../party-events', () => ({
  publishPartyCreated: vi.fn(),
  publishPartyPromoted: vi.fn(),
  publishPartyDemoted: vi.fn(),
  publishClientInstantiated: vi.fn()
}))

import { withTransaction } from '@/lib/db'

import {
  createPartyFromHubSpotCompany,
  mapHubSpotStage
} from '../commands/create-party-from-hubspot-company'
import { publishPartyCreated } from '../party-events'

const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>
const mockedPartyCreated = publishPartyCreated as unknown as ReturnType<typeof vi.fn>

type TxClient = NonNullable<Parameters<typeof createPartyFromHubSpotCompany>[1]>

type FakeTxClient = TxClient & {
  query: ReturnType<typeof vi.fn>
}

const buildTxClient = (responses: Array<{ rows: unknown[] }>): FakeTxClient => {
  const queryMock = vi.fn(async () => responses.shift() ?? { rows: [] })

  return { query: queryMock } as unknown as FakeTxClient
}

describe('mapHubSpotStage', () => {
  it('maps canonical HubSpot stages to Greenhouse stages (§4.5)', () => {
    expect(mapHubSpotStage('subscriber')).toBe('prospect')
    expect(mapHubSpotStage('lead')).toBe('prospect')
    expect(mapHubSpotStage('marketingqualifiedlead')).toBe('prospect')
    expect(mapHubSpotStage('salesqualifiedlead')).toBe('prospect')
    expect(mapHubSpotStage('opportunity')).toBe('opportunity')
    expect(mapHubSpotStage('customer')).toBe('active_client')
    expect(mapHubSpotStage('evangelist')).toBe('active_client')
    expect(mapHubSpotStage('other')).toBe('churned')
  })

  it('defaults unknown input to prospect', () => {
    expect(mapHubSpotStage(null)).toBe('prospect')
    expect(mapHubSpotStage(undefined)).toBe('prospect')
    expect(mapHubSpotStage('')).toBe('prospect')
    expect(mapHubSpotStage('randomstage')).toBe('prospect')
    expect(mapHubSpotStage('CUSTOMER')).toBe('active_client')
  })
})

describe('createPartyFromHubSpotCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedWithTransaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) => run(undefined))
  })

  it('returns the existing party on idempotent hit without emitting events', async () => {
    const txClient = buildTxClient([
      {
        rows: [{
          organization_id: 'org-1',
          organization_name: 'Acme',
          commercial_party_id: 'party-1',
          hubspot_company_id: 'hs-1',
          lifecycle_stage: 'opportunity',
          lifecycle_stage_since: '2026-04-21T00:00:00Z',
          lifecycle_stage_source: 'hubspot_sync',
          lifecycle_stage_by: 'hubspot_sync',
          is_dual_role: false,
          organization_type: 'client'
        }]
      }
    ])

    const result = await createPartyFromHubSpotCompany(
      {
        hubspotCompanyId: 'hs-1',
        actor: { system: true }
      },
      txClient
    )

    expect(result.created).toBe(false)
    expect(result.organizationId).toBe('org-1')
    expect(result.commercialPartyId).toBe('party-1')
    expect(result.lifecycleStage).toBe('opportunity')
    expect(mockedPartyCreated).not.toHaveBeenCalled()

    // Only the idempotent lookup ran.
    expect(txClient.query).toHaveBeenCalledTimes(1)
  })

  it('creates org, history row and emits commercial.party.created on first sync', async () => {
    const txClient = buildTxClient([
      { rows: [] },
      { rows: [{ organization_id: 'org-2', commercial_party_id: 'party-2' }] },
      { rows: [] }
    ])

    const result = await createPartyFromHubSpotCompany(
      {
        hubspotCompanyId: 'hs-2',
        hubspotLifecycleStage: 'customer',
        defaultName: 'Globex SA',
        actor: { system: true }
      },
      txClient
    )

    expect(result.created).toBe(true)
    expect(result.lifecycleStage).toBe('active_client')
    expect(mockedPartyCreated).toHaveBeenCalledTimes(1)
    expect(mockedPartyCreated.mock.calls[0][0]).toMatchObject({
      commercialPartyId: 'party-2',
      organizationId: 'org-2',
      initialStage: 'active_client',
      source: 'hubspot_sync',
      hubspotCompanyId: 'hs-2'
    })

    const insertOrgCall = txClient.query.mock.calls[1] as [string, unknown[]]

    expect(insertOrgCall[0]).toContain('INSERT INTO greenhouse_core.organizations')
    expect(insertOrgCall[1][1]).toBe('Globex SA')
    expect(insertOrgCall[1][2]).toBe('hs-2')
    expect(insertOrgCall[1][3]).toBe('active_client')

    const insertHistoryCall = txClient.query.mock.calls[2] as [string, unknown[]]

    expect(insertHistoryCall[0]).toContain('INSERT INTO greenhouse_core.organization_lifecycle_history')
  })

  it('rejects empty hubspotCompanyId', async () => {
    await expect(
      createPartyFromHubSpotCompany({
        hubspotCompanyId: '   ',
        actor: { system: true }
      })
    ).rejects.toThrow(/hubspotCompanyId is required/)
  })
})
