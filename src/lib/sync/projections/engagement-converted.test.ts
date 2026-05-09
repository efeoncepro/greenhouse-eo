import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunQuery = vi.fn()
const mockPromoteParty = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunQuery(...args)
}))

vi.mock('@/lib/commercial/party/commands/promote-party', () => ({
  promoteParty: (...args: unknown[]) => mockPromoteParty(...args)
}))

import { engagementConvertedProjection } from './engagement-converted'

describe('engagementConvertedProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts service scope from v1 converted payload', () => {
    expect(engagementConvertedProjection.extractScope({ version: 1, serviceId: 'SVC-HS-123' }))
      .toEqual({ entityType: 'service', entityId: 'SVC-HS-123' })
  })

  it('promotes the owning organization through promoteParty', async () => {
    mockRunQuery.mockResolvedValueOnce([
      {
        service_id: 'SVC-HS-123',
        organization_id: 'org-1',
        engagement_kind: 'pilot',
        hubspot_deal_id: null
      }
    ])
    mockPromoteParty.mockResolvedValueOnce({
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      fromStage: 'opportunity',
      toStage: 'active_client',
      transitionedAt: '2026-05-07T00:00:00.000Z',
      historyId: 'history-1'
    })

    await expect(
      engagementConvertedProjection.refresh(
        { entityType: 'service', entityId: 'SVC-HS-123' },
        {
          version: 1,
          serviceId: 'SVC-HS-123',
          actorUserId: 'user-1',
          nextServiceId: 'SVC-HS-456',
          nextQuotationId: 'quote-1'
        }
      )
    ).resolves.toContain('promoted opportunity -> active_client')

    expect(mockPromoteParty).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      toStage: 'active_client',
      source: 'quote_converted',
      actor: expect.objectContaining({ userId: 'user-1' }),
      triggerEntity: { type: 'quote', id: 'quote-1' }
    }))
  })

  it('fails loudly when a converted service has no organization', async () => {
    mockRunQuery.mockResolvedValueOnce([
      {
        service_id: 'SVC-HS-123',
        organization_id: null,
        engagement_kind: 'pilot',
        hubspot_deal_id: null
      }
    ])

    await expect(
      engagementConvertedProjection.refresh(
        { entityType: 'service', entityId: 'SVC-HS-123' },
        { version: 1, serviceId: 'SVC-HS-123' }
      )
    ).rejects.toThrow('has no organization_id')
  })
})
