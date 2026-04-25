import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

vi.mock('../party-events', () => ({
  publishPartyPromoted: vi.fn(),
  publishPartyDemoted: vi.fn(),
  publishClientInstantiated: vi.fn(),
  publishPartyCreated: vi.fn()
}))

vi.mock('../commands/instantiate-client-for-party', () => ({
  instantiateClientForParty: vi.fn().mockResolvedValue({
    clientId: 'cli-new',
    clientProfileId: 'cp-new',
    organizationId: 'org-1',
    commercialPartyId: 'party-1'
  })
}))

import { withTransaction } from '@/lib/db'

import { promoteParty } from '../commands/promote-party'
import { instantiateClientForParty } from '../commands/instantiate-client-for-party'
import { publishPartyDemoted, publishPartyPromoted } from '../party-events'
import { InvalidTransitionError, OrganizationNotFoundError } from '../types'

const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>
const mockedPromoted = publishPartyPromoted as unknown as ReturnType<typeof vi.fn>
const mockedDemoted = publishPartyDemoted as unknown as ReturnType<typeof vi.fn>
const mockedInstantiate = instantiateClientForParty as unknown as ReturnType<typeof vi.fn>

const ORG_ROW_PROSPECT = {
  organization_id: 'org-1',
  organization_name: 'Acme',
  commercial_party_id: 'party-1',
  hubspot_company_id: 'hs-1',
  lifecycle_stage: 'prospect',
  lifecycle_stage_since: '2026-04-21T00:00:00Z',
  lifecycle_stage_source: 'bootstrap',
  lifecycle_stage_by: 'system',
  is_dual_role: false,
  organization_type: 'client'
}

type TxClient = NonNullable<Parameters<typeof promoteParty>[1]>

type FakeTxClient = TxClient & {
  query: ReturnType<typeof vi.fn>
}

const buildTxClient = (responses: Array<{ rows: unknown[] }>): FakeTxClient => {
  const queryMock = vi.fn(async () => responses.shift() ?? { rows: [] })

  return { query: queryMock } as unknown as FakeTxClient
}

describe('promoteParty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedWithTransaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) => run(undefined))
  })

  it('rejects transitions from unknown organizations', async () => {
    const txClient = buildTxClient([{ rows: [] }])

    await expect(
      promoteParty(
        {
          organizationId: 'org-missing',
          toStage: 'opportunity',
          source: 'manual',
          actor: { userId: 'u1' }
        },
        txClient
      )
    ).rejects.toBeInstanceOf(OrganizationNotFoundError)
  })

  it('rejects illegal transitions before touching the DB', async () => {
    const txClient = buildTxClient([{ rows: [ORG_ROW_PROSPECT] }])

    await expect(
      promoteParty(
        {
          organizationId: 'org-1',
          toStage: 'inactive',
          source: 'manual',
          actor: { userId: 'u1' }
        },
        txClient
      )
    ).rejects.toBeInstanceOf(InvalidTransitionError)

    expect(mockedPromoted).not.toHaveBeenCalled()
    expect(mockedDemoted).not.toHaveBeenCalled()
  })

  it('returns same-stage writes as a no-op without emitting events', async () => {
    const txClient = buildTxClient([{ rows: [ORG_ROW_PROSPECT] }])

    const result = await promoteParty(
      {
        organizationId: 'org-1',
        toStage: 'prospect',
        source: 'manual',
        actor: { userId: 'u1' }
      },
      txClient
    )

    expect(result.fromStage).toBe('prospect')
    expect(result.toStage).toBe('prospect')
    expect(result.historyId).toBe('')
    expect(mockedPromoted).not.toHaveBeenCalled()
    expect(mockedDemoted).not.toHaveBeenCalled()
  })

  it('inserts history, updates org, instantiates client, and emits promoted on active_client transition', async () => {
    const txClient = buildTxClient([
      { rows: [ORG_ROW_PROSPECT] },
      { rows: [{ history_id: 'hist-1', transitioned_at: '2026-04-21T10:00:00Z' }] },
      { rows: [] }
    ])

    const result = await promoteParty(
      {
        organizationId: 'org-1',
        toStage: 'active_client',
        source: 'deal_won',
        triggerEntity: { type: 'deal', id: 'deal-1' },
        actor: { userId: 'u1', reason: 'closed-won' }
      },
      txClient
    )

    expect(result.toStage).toBe('active_client')
    expect(result.historyId).toBe('hist-1')
    expect(mockedInstantiate).toHaveBeenCalledTimes(1)
    expect(mockedPromoted).toHaveBeenCalledTimes(1)
    expect(mockedDemoted).not.toHaveBeenCalled()

    const historyInsertCall = txClient.query.mock.calls[1] as [string, unknown[]]

    expect(historyInsertCall[0]).toContain('INSERT INTO greenhouse_core.organization_lifecycle_history')
    expect(historyInsertCall[1][2]).toBe('prospect') // from_stage
    expect(historyInsertCall[1][3]).toBe('active_client') // to_stage
  })

  it('emits demoted event when transition moves backwards in the funnel', async () => {
    const opportunityRow = { ...ORG_ROW_PROSPECT, lifecycle_stage: 'opportunity' }

    const txClient = buildTxClient([
      { rows: [opportunityRow] },
      { rows: [{ history_id: 'hist-2', transitioned_at: '2026-04-21T10:00:00Z' }] },
      { rows: [] }
    ])

    await promoteParty(
      {
        organizationId: 'org-1',
        toStage: 'prospect',
        source: 'deal_lost_sweep',
        actor: { userId: 'u1', system: false }
      },
      txClient
    )

    expect(mockedDemoted).toHaveBeenCalledTimes(1)
    expect(mockedPromoted).not.toHaveBeenCalled()
    expect(mockedInstantiate).not.toHaveBeenCalled()
  })

  it('swallows ORGANIZATION_ALREADY_HAS_CLIENT while still emitting promoted', async () => {
    mockedInstantiate.mockRejectedValueOnce({ code: 'ORGANIZATION_ALREADY_HAS_CLIENT' })

    const txClient = buildTxClient([
      { rows: [{ ...ORG_ROW_PROSPECT, lifecycle_stage: 'opportunity' }] },
      { rows: [{ history_id: 'hist-3', transitioned_at: '2026-04-21T10:00:00Z' }] },
      { rows: [] }
    ])

    const result = await promoteParty(
      {
        organizationId: 'org-1',
        toStage: 'active_client',
        source: 'contract_created',
        actor: { userId: 'u1' },
        triggerEntity: { type: 'contract', id: 'ctr-1' }
      },
      txClient
    )

    expect(result.toStage).toBe('active_client')
    expect(mockedPromoted).toHaveBeenCalledTimes(1)
  })
})
