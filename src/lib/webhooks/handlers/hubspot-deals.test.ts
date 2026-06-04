import { describe, expect, it, vi, beforeEach } from 'vitest'

// TASK-1010 Slice 3 — HubSpot deals webhook → semi-automatic onboarding case.
// Mocks: PG query (deal + org lookups), provisionClientLifecycle, the flag.

const h = vi.hoisted(() => ({
  pgQueryMock: vi.fn(),
  provisionMock: vi.fn().mockResolvedValue({ caseId: 'clc-test', status: 'draft', checklistItems: [], blockers: [], idempotent: false }),
  captureMock: vi.fn(),
  flag: { enabled: true }
}))

const { pgQueryMock, provisionMock, captureMock } = h

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => h.pgQueryMock(...args)
}))

vi.mock('@/lib/client-lifecycle/commands/provision-client-lifecycle', () => ({
  provisionClientLifecycle: (...args: unknown[]) => h.provisionMock(...args)
}))

vi.mock('@/lib/client-lifecycle/flags', () => ({
  isClientLifecycleHubspotDealTriggerEnabled: () => h.flag.enabled
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => h.captureMock(...args)
}))

vi.mock('@/lib/webhooks/inbound', () => ({
  registerInboundHandler: () => {}
}))

import {
  isHubSpotDealEvent,
  processClosedWonDeal,
  processHubSpotDealEvents
} from './hubspot-deals'

beforeEach(() => {
  pgQueryMock.mockReset()
  provisionMock.mockClear()
  captureMock.mockClear()
  h.flag.enabled = true
})

describe('isHubSpotDealEvent (dual-format classifier)', () => {
  it('matches legacy deal.* subscription types', () => {
    expect(isHubSpotDealEvent({ subscriptionType: 'deal.creation' })).toBe(true)
    expect(isHubSpotDealEvent({ subscriptionType: 'deal.propertyChange' })).toBe(true)
    expect(isHubSpotDealEvent({ subscriptionType: '0-3.creation' })).toBe(true)
  })

  it('matches Developer Platform 2025.2 object.* with objectTypeId 0-3 or objectType deal', () => {
    expect(isHubSpotDealEvent({ subscriptionType: 'object.propertyChange', objectTypeId: '0-3' })).toBe(true)
    expect(isHubSpotDealEvent({ subscriptionType: 'object.creation', objectType: 'deal' })).toBe(true)
  })

  it('ignores non-deal events (company, service, unknown object type)', () => {
    expect(isHubSpotDealEvent({ subscriptionType: 'company.creation' })).toBe(false)
    expect(isHubSpotDealEvent({ subscriptionType: 'p_services.creation' })).toBe(false)
    expect(isHubSpotDealEvent({ subscriptionType: 'object.creation', objectTypeId: '0-2' })).toBe(false)
    expect(isHubSpotDealEvent({})).toBe(false)
  })
})

describe('processClosedWonDeal', () => {
  it('opens a draft onboarding case for a closed-won deal with a resolvable org', async () => {
    pgQueryMock
      .mockResolvedValueOnce([{ hubspot_company_id: '55405407542', is_closed_won: true }]) // deal lookup
      .mockResolvedValueOnce([{ organization_id: 'org-123' }]) // org lookup

    const result = await processClosedWonDeal('deal-1')

    expect(result).toBe('opened')
    expect(provisionMock).toHaveBeenCalledTimes(1)
    expect(provisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-123',
        caseKind: 'onboarding',
        triggerSource: 'hubspot_deal',
        triggeredByUserId: null,
        hubspotDealId: 'deal-1'
      })
    )
  })

  it('returns idempotent when the command reports an existing active case', async () => {
    pgQueryMock
      .mockResolvedValueOnce([{ hubspot_company_id: '999', is_closed_won: true }])
      .mockResolvedValueOnce([{ organization_id: 'org-9' }])
    provisionMock.mockResolvedValueOnce({ caseId: 'clc-x', status: 'draft', checklistItems: [], blockers: [], idempotent: true })

    expect(await processClosedWonDeal('deal-2')).toBe('idempotent')
  })

  it('skips honestly when the deal is not yet synced to greenhouse_crm.deals', async () => {
    pgQueryMock.mockResolvedValueOnce([]) // deal lookup empty

    expect(await processClosedWonDeal('deal-unsynced')).toBe('skipped')
    expect(provisionMock).not.toHaveBeenCalled()
  })

  it('skips honestly when the deal is not closed-won', async () => {
    pgQueryMock.mockResolvedValueOnce([{ hubspot_company_id: '1', is_closed_won: false }])

    expect(await processClosedWonDeal('deal-open')).toBe('skipped')
    expect(provisionMock).not.toHaveBeenCalled()
  })

  it('skips honestly when the deal has no associated company', async () => {
    pgQueryMock.mockResolvedValueOnce([{ hubspot_company_id: null, is_closed_won: true }])

    expect(await processClosedWonDeal('deal-no-company')).toBe('skipped')
    expect(provisionMock).not.toHaveBeenCalled()
  })

  it('skips honestly when the canonical organization does not exist yet', async () => {
    pgQueryMock
      .mockResolvedValueOnce([{ hubspot_company_id: '777', is_closed_won: true }])
      .mockResolvedValueOnce([]) // org lookup empty

    expect(await processClosedWonDeal('deal-no-org')).toBe('skipped')
    expect(provisionMock).not.toHaveBeenCalled()
  })
})

describe('processHubSpotDealEvents', () => {
  it('no-ops entirely when the flag is OFF (does not even query PG)', async () => {
    h.flag.enabled = false

    await processHubSpotDealEvents([{ subscriptionType: 'deal.propertyChange', objectId: 'deal-1' }])

    expect(pgQueryMock).not.toHaveBeenCalled()
    expect(provisionMock).not.toHaveBeenCalled()
  })

  it('processes deal events when the flag is ON', async () => {
    pgQueryMock
      .mockResolvedValueOnce([{ hubspot_company_id: '1', is_closed_won: true }])
      .mockResolvedValueOnce([{ organization_id: 'org-1' }])

    await processHubSpotDealEvents([{ subscriptionType: 'deal.propertyChange', objectId: 'deal-1' }])

    expect(provisionMock).toHaveBeenCalledTimes(1)
  })

  it('captures a failure to Sentry without re-throwing (other deals keep going)', async () => {
    // First deal throws on org lookup; second deal succeeds.
    pgQueryMock
      .mockResolvedValueOnce([{ hubspot_company_id: '1', is_closed_won: true }])
      .mockRejectedValueOnce(new Error('pg down'))
      .mockResolvedValueOnce([{ hubspot_company_id: '2', is_closed_won: true }])
      .mockResolvedValueOnce([{ organization_id: 'org-2' }])

    await expect(
      processHubSpotDealEvents([
        { subscriptionType: 'deal.propertyChange', objectId: 'deal-a' },
        { subscriptionType: 'deal.propertyChange', objectId: 'deal-b' }
      ])
    ).resolves.toBeUndefined()

    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(provisionMock).toHaveBeenCalledTimes(1) // deal-b succeeded
  })

  it('ignores non-deal events in a mixed batch', async () => {
    await processHubSpotDealEvents([{ subscriptionType: 'company.creation', objectId: 'co-1' }])

    expect(pgQueryMock).not.toHaveBeenCalled()
    expect(provisionMock).not.toHaveBeenCalled()
  })
})
