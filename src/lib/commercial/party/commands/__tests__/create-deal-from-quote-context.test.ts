import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockWithTransaction = vi.fn(async (callback: () => Promise<unknown>) => callback())

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: (callback: () => Promise<unknown>) => mockWithTransaction(callback)
}))

const mockCreateHubSpotDeal = vi.fn()

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  createHubSpotGreenhouseDeal: (...args: unknown[]) => mockCreateHubSpotDeal(...args)
}))

const mockPublishDealCreated = vi.fn()
const mockPublishDealCreatedFromGreenhouse = vi.fn()
const mockPublishDealCreateRequested = vi.fn()
const mockPublishDealCreateApprovalRequested = vi.fn()

vi.mock('@/lib/commercial/deal-events', () => ({
  publishDealCreated: (...args: unknown[]) => mockPublishDealCreated(...args),
  publishDealCreatedFromGreenhouse: (...args: unknown[]) => mockPublishDealCreatedFromGreenhouse(...args),
  publishDealCreateRequested: (...args: unknown[]) => mockPublishDealCreateRequested(...args),
  publishDealCreateApprovalRequested: (...args: unknown[]) => mockPublishDealCreateApprovalRequested(...args)
}))

const mockPromoteParty = vi.fn()

vi.mock('../promote-party', () => ({
  promoteParty: (...args: unknown[]) => mockPromoteParty(...args)
}))

import {
  DealCreateRateLimitError,
  DealCreateValidationError,
  OrganizationHasNoCompanyError
} from '../create-deal-types'
import { createDealFromQuoteContext } from '../create-deal-from-quote-context'

const ORG_WITH_HUBSPOT = {
  organization_id: 'org-1',
  organization_name: 'Acme Corp',
  hubspot_company_id: 'hs-company-1',
  lifecycle_stage: 'prospect',
  client_id: null,
  space_id: null
}

const baseInput = {
  organizationId: 'org-1',
  dealName: 'Campaña Q3',
  amount: 5_000_000,
  amountClp: 5_000_000,
  currency: 'CLP',
  actor: { userId: 'user-1', tenantScope: 'efeonce_internal:efeonce' }
}

describe('createDealFromQuoteContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects when organizationId or dealName is missing', async () => {
    await expect(
      createDealFromQuoteContext({ ...baseInput, dealName: '   ' })
    ).rejects.toBeInstanceOf(DealCreateValidationError)

    await expect(
      createDealFromQuoteContext({ ...baseInput, organizationId: '' })
    ).rejects.toBeInstanceOf(DealCreateValidationError)
  })

  it('rejects when organization has no hubspot_company_id', async () => {
    mockQuery.mockResolvedValueOnce([
      { ...ORG_WITH_HUBSPOT, hubspot_company_id: null }
    ])

    await expect(createDealFromQuoteContext(baseInput)).rejects.toBeInstanceOf(
      OrganizationHasNoCompanyError
    )
  })

  it('short-circuits on idempotency key hit', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT]) // loadOrganization
      .mockResolvedValueOnce([
        {
          attempt_id: 'attempt-existing',
          status: 'completed',
          hubspot_deal_id: 'hs-deal-1',
          deal_id: 'deal-1',
          approval_id: null,
          created_at: '2026-04-21T10:00:00Z',
          completed_at: '2026-04-21T10:00:05Z'
        }
      ])

    const result = await createDealFromQuoteContext({
      ...baseInput,
      idempotencyKey: 'key-123'
    })

    expect(result.status).toBe('completed')
    expect(result.attemptId).toBe('attempt-existing')
    expect(result.hubspotDealId).toBe('hs-deal-1')
    expect(mockCreateHubSpotDeal).not.toHaveBeenCalled()
  })

  it('throws rate limit error when user exceeds 20/min', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([]) // no fingerprint
      .mockResolvedValueOnce([{ count: '20' }]) // user rate limit hit

    await expect(
      createDealFromQuoteContext({ ...baseInput, idempotencyKey: null })
    ).rejects.toBeInstanceOf(DealCreateRateLimitError)

    expect(mockCreateHubSpotDeal).not.toHaveBeenCalled()
  })

  it('persists pending_approval status and skips Cloud Run when amount > 50M CLP', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([]) // fingerprint
      .mockResolvedValueOnce([{ count: '0' }]) // user
      .mockResolvedValueOnce([{ count: '0' }]) // tenant
      .mockResolvedValueOnce([{ attempt_id: 'attempt-hi' }]) // insertPendingAttempt
      .mockResolvedValueOnce(undefined) // finalizeAttempt

    const result = await createDealFromQuoteContext({
      ...baseInput,
      amount: 75_000_000,
      amountClp: 75_000_000,
      idempotencyKey: null
    })

    expect(result.status).toBe('pending_approval')
    expect(result.requiresApproval).toBe(true)
    expect(result.approvalId).toMatch(/^deal-approval-/)
    expect(mockCreateHubSpotDeal).not.toHaveBeenCalled()
    expect(mockPublishDealCreateApprovalRequested).toHaveBeenCalledTimes(1)
  })

  it('records endpoint_not_deployed without throwing when Cloud Run route is missing', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ attempt_id: 'attempt-stub' }])
      .mockResolvedValueOnce(undefined)

    mockCreateHubSpotDeal.mockResolvedValueOnce({
      status: 'endpoint_not_deployed',
      hubspotDealId: null,
      message: 'Cloud Run /deals not deployed'
    })

    const result = await createDealFromQuoteContext({ ...baseInput, idempotencyKey: null })

    expect(result.status).toBe('endpoint_not_deployed')
    expect(result.dealId).toBeNull()
    expect(mockPublishDealCreated).not.toHaveBeenCalled()
  })

  it('marks attempt failed and rethrows when Cloud Run errors out', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ attempt_id: 'attempt-fail' }])
      .mockResolvedValueOnce(undefined) // finalizeAttempt(failed)

    mockCreateHubSpotDeal.mockRejectedValueOnce(new Error('HubSpot 503'))

    await expect(createDealFromQuoteContext({ ...baseInput, idempotencyKey: null })).rejects.toThrow(
      /HubSpot 503/
    )

    // Last query call should be the UPDATE setting status='failed'
    const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]

    expect(lastCall[1]).toContain('failed')
  })

  it('happy path: creates deal, promotes prospect→opportunity, emits events', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ attempt_id: 'attempt-happy' }])
      .mockResolvedValueOnce([{ deal_id: 'deal-new' }]) // insertOrUpdateDealRow
      .mockResolvedValueOnce(undefined) // finalizeAttempt(completed)

    mockCreateHubSpotDeal.mockResolvedValueOnce({
      status: 'created',
      hubspotDealId: 'hs-deal-new',
      pipelineUsed: 'default',
      stageUsed: 'appointmentscheduled',
      ownerUsed: 'hs-user-1'
    })

    mockPromoteParty.mockResolvedValueOnce({ ok: true })

    const result = await createDealFromQuoteContext({ ...baseInput, idempotencyKey: null })

    expect(result.status).toBe('completed')
    expect(result.dealId).toBe('deal-new')
    expect(result.hubspotDealId).toBe('hs-deal-new')
    expect(result.organizationPromoted).toBe(true)

    expect(mockPromoteParty).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        toStage: 'opportunity',
        triggerEntity: { type: 'deal', id: 'deal-new' }
      })
    )

    expect(mockPublishDealCreated).toHaveBeenCalledTimes(1)
    expect(mockPublishDealCreatedFromGreenhouse).toHaveBeenCalledTimes(1)
  })

  it('does NOT promote when org is already in opportunity stage', async () => {
    mockQuery
      .mockResolvedValueOnce([{ ...ORG_WITH_HUBSPOT, lifecycle_stage: 'opportunity' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ attempt_id: 'attempt-noprom' }])
      .mockResolvedValueOnce([{ deal_id: 'deal-2' }])
      .mockResolvedValueOnce(undefined)

    mockCreateHubSpotDeal.mockResolvedValueOnce({
      status: 'created',
      hubspotDealId: 'hs-deal-2',
      pipelineUsed: 'default',
      stageUsed: 'appointmentscheduled',
      ownerUsed: null
    })

    const result = await createDealFromQuoteContext({ ...baseInput, idempotencyKey: null })

    expect(result.status).toBe('completed')
    expect(result.organizationPromoted).toBe(false)
    expect(mockPromoteParty).not.toHaveBeenCalled()
  })
})
