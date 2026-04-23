import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockWithTransaction = vi.fn(async (callback: () => Promise<unknown>) => callback())

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: (callback: () => Promise<unknown>) => mockWithTransaction(callback)
}))

const mockCreateHubSpotDeal = vi.fn()
const mockEnsureHubSpotDealMetadataFresh = vi.fn()
const mockResolveHubSpotBusinessLine = vi.fn()

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  createHubSpotGreenhouseDeal: (...args: unknown[]) => mockCreateHubSpotDeal(...args)
}))

vi.mock('@/lib/business-line/hubspot', () => ({
  resolveHubSpotBusinessLine: (...args: unknown[]) => mockResolveHubSpotBusinessLine(...args)
}))

vi.mock('@/lib/commercial/deal-metadata-sync', () => ({
  ensureHubSpotDealMetadataFresh: (...args: unknown[]) => mockEnsureHubSpotDealMetadataFresh(...args)
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
  DealCreateSelectionInvalidError,
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

// TASK-571: the command now queries the pipeline registry + defaults policy
// table (`getDealCreationContext`) between rate-limit enforcement and the
// pending-attempt insert. Tests that run the happy path must feed those two
// queries ahead of the INSERT mock, in that exact order.
const stubPipelineStructureRows = () => [
  {
    pipeline_id: 'default',
    pipeline_label: 'Default',
    pipeline_display_order: 1,
    pipeline_active: true,
    stage_id: 'appointmentscheduled',
    stage_label: 'Appointment scheduled',
    stage_display_order: 1,
    is_open_selectable: true,
    is_closed: false,
    is_won: false,
    is_default_for_create: true
  }
]

const stubPipelineDefaultRows = () => [] as Array<{
  scope: string
  scope_key: string
  pipeline_id: string
  stage_id: string | null
  deal_type: string | null
  priority: string | null
  owner_hubspot_user_id: string | null
}>

const stubPropertyRows = () => []

const mockPipelineContextQueries = () => {
  mockQuery.mockResolvedValueOnce(stubPipelineStructureRows())
  mockQuery.mockResolvedValueOnce(stubPipelineDefaultRows())
  mockQuery.mockResolvedValueOnce(stubPropertyRows())
}

const baseInput = {
  organizationId: 'org-1',
  dealName: 'Campaña Q3',
  amount: 5_000_000,
  amountClp: 5_000_000,
  currency: 'CLP',
  pipelineId: 'default',
  stageId: 'appointmentscheduled',
  ownerHubspotUserId: 'hs-owner-request',
  actor: { userId: 'user-1', tenantScope: 'efeonce_internal:efeonce' }
}

describe('createDealFromQuoteContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureHubSpotDealMetadataFresh.mockResolvedValue(null)
    mockResolveHubSpotBusinessLine.mockResolvedValue(null)
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

    mockPipelineContextQueries()
    mockQuery.mockResolvedValueOnce([{ count: '20' }]) // user rate limit hit

    await expect(
      createDealFromQuoteContext({ ...baseInput, idempotencyKey: null })
    ).rejects.toBeInstanceOf(DealCreateRateLimitError)

    expect(mockCreateHubSpotDeal).not.toHaveBeenCalled()
  })

  it('persists pending_approval status and skips Cloud Run when amount > 50M CLP', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([]) // fingerprint

    mockPipelineContextQueries()
    mockQuery
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

    mockPipelineContextQueries()
    mockQuery
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

    mockPipelineContextQueries()
    mockQuery
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

    mockPipelineContextQueries()
    mockQuery
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
      }),
      undefined
    )

    expect(mockPublishDealCreated).toHaveBeenCalledTimes(1)
    expect(mockPublishDealCreatedFromGreenhouse).toHaveBeenCalledTimes(1)
  })

  it('maps a canonical commercial business line into the HubSpot enum before POST /deals', async () => {
    mockResolveHubSpotBusinessLine.mockResolvedValueOnce({
      moduleCode: 'globe',
      hubspotEnumValue: 'globe',
      label: 'Globe'
    })

    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([])

    mockPipelineContextQueries()
    mockQuery
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ attempt_id: 'attempt-business-line' }])
      .mockResolvedValueOnce([{ deal_id: 'deal-business-line' }])
      .mockResolvedValueOnce(undefined)

    mockCreateHubSpotDeal.mockResolvedValueOnce({
      status: 'created',
      hubspotDealId: 'hs-deal-business-line',
      pipelineUsed: 'default',
      stageUsed: 'appointmentscheduled',
      ownerUsed: 'hs-user-1'
    })

    await createDealFromQuoteContext({
      ...baseInput,
      businessLineCode: 'globe',
      idempotencyKey: null
    })

    expect(mockCreateHubSpotDeal).toHaveBeenCalledWith(
      expect.objectContaining({
        businessLineCode: 'globe'
      })
    )
  })

  it('omits non-commercial tenant business lines instead of forwarding invalid HubSpot values', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([])

    mockPipelineContextQueries()
    mockQuery
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ attempt_id: 'attempt-no-business-line' }])
      .mockResolvedValueOnce([{ deal_id: 'deal-no-business-line' }])
      .mockResolvedValueOnce(undefined)

    mockCreateHubSpotDeal.mockResolvedValueOnce({
      status: 'created',
      hubspotDealId: 'hs-deal-no-business-line',
      pipelineUsed: 'default',
      stageUsed: 'appointmentscheduled',
      ownerUsed: 'hs-user-1'
    })

    await createDealFromQuoteContext({
      ...baseInput,
      actor: {
        ...baseInput.actor,
        businessLineCode: 'growth'
      },
      idempotencyKey: null
    })

    expect(mockCreateHubSpotDeal).toHaveBeenCalledWith(
      expect.objectContaining({
        businessLineCode: null
      })
    )
  })

  it('rejects when stageId does not belong to pipelineId (TASK-571 validation)', async () => {
    mockQuery
      .mockResolvedValueOnce([ORG_WITH_HUBSPOT])
      .mockResolvedValueOnce([]) // fingerprint

    mockPipelineContextQueries()

    await expect(
      createDealFromQuoteContext({
        ...baseInput,
        stageId: 'stage-that-does-not-exist',
        idempotencyKey: null
      })
    ).rejects.toBeInstanceOf(DealCreateSelectionInvalidError)

    expect(mockCreateHubSpotDeal).not.toHaveBeenCalled()
  })

  it('does NOT promote when org is already in opportunity stage', async () => {
    mockQuery
      .mockResolvedValueOnce([{ ...ORG_WITH_HUBSPOT, lifecycle_stage: 'opportunity' }])
      .mockResolvedValueOnce([])

    mockPipelineContextQueries()
    mockQuery
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
