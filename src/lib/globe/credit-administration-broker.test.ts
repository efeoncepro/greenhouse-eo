import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  dispatchCommand: vi.fn()
}))

vi.mock('@/lib/db', () => ({ query: mocks.query }))
vi.mock('./client', () => ({
  createGreenhouseGlobeClient: vi.fn(() => ({
    client: { dispatchCommand: mocks.dispatchCommand }
  }))
}))

const { confirmGlobeCreditFunding, ensureGlobeCreditFundingPlan, proposeGlobeCreditFunding } =
  await import('./credit-administration-broker')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Globe delegated agent funding evidence', () => {
  it('preserves Globe durable no-effect operation evidence for an already-funded ensure', async () => {
    mocks.dispatchCommand.mockResolvedValue({
      outcome: {
        schemaVersion: '1',
        status: 'already_funded',
        effectiveAvailable: 900,
        asOf: '2026-08-01T00:01:00.000Z',
        operation: {
          schemaVersion: '1',
          operationId: 'operation-no-effect-1',
          proposalId: 'operation-no-effect-1',
          state: 'completed',
          plan: {
            schemaVersion: '1',
            grantCredits: 0,
            monthlyCapBefore: 1200,
            spentInPeriod: 300,
            policyAvailableBefore: 900,
            policyAvailableAfter: 900,
            periodStart: '2026-08-01T00:00:00.000Z',
            periodEnd: '2026-09-01T00:00:00.000Z'
          },
          receipt: { schemaVersion: '1', outcome: 'no_effect', reasonCode: 'confirmed_no_effect' },
          expiresAt: '2026-08-01T00:11:00.000Z',
          createdAt: '2026-08-01T00:01:00.000Z',
          updatedAt: '2026-08-01T00:01:00.000Z'
        }
      }
    })

    const result = await ensureGlobeCreditFundingPlan({
      globeWorkspaceId: 'greenhouse-org:efeonce',
      targetAvailableCredits: 800,
      maxGrantCredits: 500,
      maxResultingCapCredits: 1500,
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-09-01T00:00:00.000Z',
      actor: {
        userId: 'agent-1',
        entitlement: 'platform.globe_credit_funding.ensure',
        authMode: 'agent'
      },
      idempotencyKey: 'ensure-key',
      authority: { authorityId: 'authority-1', executionId: 'execution-1' }
    })

    expect(result).toMatchObject({
      status: 'already_funded',
      operation: { operationId: 'operation-no-effect-1', receipt: { outcome: 'no_effect' } }
    })
  })

  it('persists authenticated agent provenance with the proposal intent', async () => {
    mocks.dispatchCommand.mockResolvedValue({
      outcome: { proposalId: 'proposal-1', fingerprint: 'fp-1', plan: { grantCredits: 500 } }
    })
    mocks.query.mockResolvedValue([])

    await proposeGlobeCreditFunding({
      globeWorkspaceId: 'greenhouse-org:efeonce',
      poolId: 'pool-1',
      grantCredits: 500,
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-09-01T00:00:00.000Z',
      actor: {
        userId: 'user-agent-e2e-001',
        entitlement: 'platform.globe_credit_funding.propose',
        authMode: 'agent'
      },
      idempotencyKey: 'proposal-key'
    })

    const insertCall = mocks.query.mock.calls.find(([sql]) => String(sql).includes('globe_credit_funding_intents'))

    expect(insertCall?.[1]).toEqual(
      expect.arrayContaining(['user-agent-e2e-001', 'platform.globe_credit_funding.propose', 'agent'])
    )
  })

  it.each([
    ['globe_credit_funding_agent_confirmation_forbidden', 'agent_confirmation_forbidden'],
    ['globe_credit_funding_agent_limit_exceeded', 'agent_funding_limit_exceeded']
  ])('maps database policy denial %s to a bounded broker code', async (databaseCode, brokerCode) => {
    mocks.query
      .mockResolvedValueOnce([
        { actor_user_id: 'user-agent-e2e-001', plan_fingerprint: 'fp-1', plan: { grantCredits: 500 } }
      ])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error(databaseCode))

    await expect(
      confirmGlobeCreditFunding({
        globeWorkspaceId: 'greenhouse-org:efeonce',
        proposalId: 'proposal-1',
        fingerprint: 'fp-1',
        actor: {
          userId: 'user-agent-e2e-001',
          entitlement: 'platform.globe_credit_funding.confirm',
          authMode: 'agent'
        },
        idempotencyKey: 'confirm-key'
      })
    ).rejects.toMatchObject({ code: brokerCode })

    expect(mocks.dispatchCommand).not.toHaveBeenCalled()
  })

  it('rejects a fingerprint that differs from the durable proposal before recording confirmation', async () => {
    mocks.query.mockResolvedValueOnce([
      { actor_user_id: 'proposer-1', plan_fingerprint: 'fp-original', plan: { grantCredits: 500 } }
    ])

    await expect(
      confirmGlobeCreditFunding({
        globeWorkspaceId: 'greenhouse-org:efeonce',
        proposalId: 'proposal-1',
        fingerprint: 'fp-tampered',
        actor: {
          userId: 'agent-1',
          entitlement: 'platform.globe_credit_funding.confirm',
          authMode: 'agent'
        },
        idempotencyKey: 'confirm-key'
      })
    ).rejects.toMatchObject({ code: 'fingerprint_mismatch' })

    expect(mocks.query).toHaveBeenCalledTimes(1)
    expect(mocks.dispatchCommand).not.toHaveBeenCalled()
  })

  it('resumes an ambiguous confirmation with the original upstream idempotency key', async () => {
    mocks.query
      .mockResolvedValueOnce([{ actor_user_id: 'proposer-1', plan_fingerprint: 'fp-1', plan: { grantCredits: 500 } }])
      .mockResolvedValueOnce([
        {
          phase: 'confirmed',
          actor_user_id: 'agent-1',
          actor_auth_mode: 'agent',
          plan_fingerprint: 'fp-1',
          plan: { grantCredits: 500 },
          idempotency_key: 'original-confirm-key'
        }
      ])
      .mockResolvedValueOnce([])
    mocks.dispatchCommand.mockResolvedValue({ outcome: { state: 'completed', grantId: 'grant-1' } })

    await confirmGlobeCreditFunding({
      globeWorkspaceId: 'greenhouse-org:efeonce',
      proposalId: 'proposal-1',
      fingerprint: 'fp-1',
      actor: {
        userId: 'agent-1',
        entitlement: 'platform.globe_credit_funding.confirm',
        authMode: 'agent'
      },
      idempotencyKey: 'retry-request-key'
    })

    expect(mocks.dispatchCommand).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ idempotencyKey: 'original-confirm-key' })
    )
    expect(mocks.query.mock.calls.at(-1)?.[1]).toEqual(expect.arrayContaining(['completed']))
  })
})
