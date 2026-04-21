import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetPartySyncConflictById = vi.fn()
const mockUpdatePartySyncConflictResolution = vi.fn()
const mockMaterializePartyLifecycleSnapshot = vi.fn()
const mockResolvePartyLifecycleOrganizationId = vi.fn()
const mockUpdateHubSpotGreenhouseCompanyLifecycle = vi.fn()
const mockGetHubSpotCandidateByCompanyId = vi.fn()
const mockPromoteParty = vi.fn()

vi.mock('../sync-conflicts-store', () => ({
  getPartySyncConflictById: (...args: unknown[]) => mockGetPartySyncConflictById(...args),
  updatePartySyncConflictResolution: (...args: unknown[]) =>
    mockUpdatePartySyncConflictResolution(...args)
}))

vi.mock('../party-lifecycle-snapshot-store', () => ({
  materializePartyLifecycleSnapshot: (...args: unknown[]) =>
    mockMaterializePartyLifecycleSnapshot(...args),
  resolvePartyLifecycleOrganizationId: (...args: unknown[]) =>
    mockResolvePartyLifecycleOrganizationId(...args)
}))

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  updateHubSpotGreenhouseCompanyLifecycle: (...args: unknown[]) =>
    mockUpdateHubSpotGreenhouseCompanyLifecycle(...args)
}))

vi.mock('../hubspot-candidate-reader', () => ({
  getHubSpotCandidateByCompanyId: (...args: unknown[]) =>
    mockGetHubSpotCandidateByCompanyId(...args)
}))

vi.mock('../commands/promote-party', () => ({
  promoteParty: (...args: unknown[]) => mockPromoteParty(...args)
}))

import { resolvePartySyncConflict } from '../commands/resolve-party-sync-conflict'

describe('resolvePartySyncConflict', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolvePartyLifecycleOrganizationId.mockResolvedValue('org-1')
    mockGetPartySyncConflictById.mockResolvedValue({
      conflictId: 'conf-1',
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      hubspotCompanyId: 'hs-1',
      conflictType: 'field_authority',
      detectedAt: '2026-04-21T10:00:00.000Z',
      conflictingFields: { lifecyclestage: 'opportunity' },
      resolutionStatus: 'pending',
      resolutionAppliedAt: null,
      resolvedBy: null,
      metadata: {}
    })
  })

  it('forces outbound and marks greenhouse as winner', async () => {
    mockMaterializePartyLifecycleSnapshot.mockResolvedValue({
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      hubspotCompanyId: 'hs-1',
      lifecycleStage: 'opportunity',
      lastQuoteAt: '2026-04-20T00:00:00.000Z',
      lastContractAt: null,
      activeContractsCount: 0
    })
    mockUpdateHubSpotGreenhouseCompanyLifecycle.mockResolvedValue({
      status: 'updated',
      hubspotCompanyId: 'hs-1',
      fieldsWritten: ['lifecyclestage']
    })
    mockUpdatePartySyncConflictResolution.mockResolvedValue({
      conflictId: 'conf-1',
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      hubspotCompanyId: 'hs-1',
      conflictType: 'field_authority',
      detectedAt: '2026-04-21T10:00:00.000Z',
      conflictingFields: { lifecyclestage: 'opportunity' },
      resolutionStatus: 'resolved_greenhouse_wins',
      resolutionAppliedAt: '2026-04-21T11:00:00.000Z',
      resolvedBy: 'usr-1',
      metadata: {}
    })

    const result = await resolvePartySyncConflict({
      conflictId: 'conf-1',
      action: 'force_outbound',
      actor: { userId: 'usr-1' },
      reason: 'Operator replay'
    })

    expect(mockUpdateHubSpotGreenhouseCompanyLifecycle).toHaveBeenCalledWith(
      'hs-1',
      expect.objectContaining({
        organizationId: 'org-1',
        commercialPartyId: 'party-1',
        lifecycleStage: 'opportunity'
      })
    )
    expect(result.outboundStatus).toBe('updated')
    expect(result.conflict.resolutionStatus).toBe('resolved_greenhouse_wins')
  })

  it('forces inbound and promotes local lifecycle from the HubSpot mirror', async () => {
    mockMaterializePartyLifecycleSnapshot.mockResolvedValue({
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      hubspotCompanyId: 'hs-1',
      lifecycleStage: 'prospect'
    })
    mockGetHubSpotCandidateByCompanyId.mockResolvedValue({
      hubspotCompanyId: 'hs-1',
      displayName: 'Acme',
      lifecycleStage: 'opportunity',
      hubspotLifecycleStage: 'opportunity',
      domain: 'acme.com',
      lastActivityAt: '2026-04-21T10:00:00.000Z'
    })
    mockPromoteParty.mockResolvedValue({
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      fromStage: 'prospect',
      toStage: 'opportunity',
      transitionedAt: '2026-04-21T11:00:00.000Z',
      historyId: 'hist-1'
    })
    mockUpdatePartySyncConflictResolution.mockResolvedValue({
      conflictId: 'conf-1',
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      hubspotCompanyId: 'hs-1',
      conflictType: 'field_authority',
      detectedAt: '2026-04-21T10:00:00.000Z',
      conflictingFields: { lifecyclestage: 'prospect' },
      resolutionStatus: 'resolved_hubspot_wins',
      resolutionAppliedAt: '2026-04-21T11:00:00.000Z',
      resolvedBy: 'usr-1',
      metadata: {}
    })

    const result = await resolvePartySyncConflict({
      conflictId: 'conf-1',
      action: 'force_inbound',
      actor: { userId: 'usr-1' }
    })

    expect(mockPromoteParty).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        toStage: 'opportunity',
        source: 'hubspot_sync'
      })
    )
    expect(result.transition).toEqual(
      expect.objectContaining({
        toStage: 'opportunity'
      })
    )
    expect(result.conflict.resolutionStatus).toBe('resolved_hubspot_wins')
  })
})
