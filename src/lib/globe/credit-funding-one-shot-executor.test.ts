import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const broker = vi.hoisted(() => ({ ensure: vi.fn(), confirm: vi.fn() }))
const operations = vi.hoisted(() => ({ get: vi.fn(), reconcile: vi.fn() }))

vi.mock('./credit-administration-broker', () => ({
  ensureGlobeCreditFundingPlan: broker.ensure,
  confirmGlobeCreditFunding: broker.confirm,
  GlobeCreditFundingBrokerError: class GlobeCreditFundingBrokerError extends Error {
    constructor(readonly code: string) {
      super(code)
    }
  }
}))
vi.mock('./credit-funding-operations', () => ({
  getGlobeCreditFundingOperation: operations.get,
  reconcileGlobeCreditFundingOperation: operations.reconcile
}))

const { executeOneShotGlobeCreditFunding } = await import('./credit-funding-one-shot-executor')

const authority = {
  schemaVersion: '1',
  authorityId: 'authority-1',
  globeWorkspaceId: 'greenhouse-org:efeonce',
  operationKind: 'ensure_funded',
  periodKey: '2026-08',
  periodStart: '2026-08-01T00:00:00.000Z',
  periodEnd: '2026-09-01T00:00:00.000Z',
  targetAvailableCredits: 800,
  maxGrantCredits: 500,
  maxResultingCapCredits: 1500,
  issuerUserId: 'ceo-1',
  issuerAuthEvidenceRef: 'gh-credit-auth:fixture',
  executorUserId: 'agent-1',
  executorChannel: 'oauth',
  executorClientId: 'greenhouse-admin-cli',
  executorAuthMode: 'agent',
  notBefore: '2026-08-01T00:00:00.000Z',
  expiresAt: '2026-08-01T00:15:00.000Z',
  maxExecutions: 1,
  operationKey: 'fund-august',
  instructionFingerprint: 'a'.repeat(64),
  evidenceRef: 'instruction:1',
  issuedAt: '2026-08-01T00:00:00.000Z'
} as const

const execution = {
  schemaVersion: '1',
  executionId: 'execution-1',
  authorityId: 'authority-1',
  operationKey: 'fund-august',
  executionFingerprint: 'b'.repeat(64),
  state: 'claimed',
  executorChannel: 'oauth',
  executorClientId: 'greenhouse-admin-cli',
  actorAuthMode: 'agent',
  proposeIdempotencyKey: 'propose-key',
  confirmIdempotencyKey: 'confirm-key',
  reconcileIdempotencyKey: 'reconcile-key',
  claimedAt: '2026-08-01T00:01:00.000Z',
  updatedAt: '2026-08-01T00:01:00.000Z'
} as const

const input = {
  authorityId: 'authority-1',
  executorUserId: 'agent-1',
  executorChannel: 'oauth',
  executorClientId: 'greenhouse-admin-cli',
  authEvidenceRef: 'token-1',
  actorAuthMode: 'agent',
  correlationId: 'correlation-1',
  allowedGlobeWorkspaceIds: ['greenhouse-org:efeonce']
} as const

function store(initial = execution) {
  let current: Record<string, unknown> = { ...initial }

  return {
    claim: vi.fn(async () => ({ authority, execution: current })),
    acquireDispatchLease: vi.fn(async () => {
      current = {
        ...current,
        dispatchLeaseGeneration: Number(current.dispatchLeaseGeneration ?? 0) + 1,
        dispatchLeaseExpiresAt: '2026-08-01T00:05:00.000Z'
      }

      return current
    }),
    advance: vi.fn(async (change: Record<string, unknown>) => {
      if (current.state !== change.expectedState) throw new Error('invalid_transition')
      current = {
        ...current,
        state: change.state,
        ...(change.proposalId ? { proposalId: change.proposalId } : {}),
        ...(change.planFingerprint ? { planFingerprint: change.planFingerprint } : {}),
        ...(change.globeOperationId ? { globeOperationId: change.globeOperationId } : {}),
        ...(change.outcome ? { outcome: change.outcome } : {})
      }

      return current
    })
  }
}

describe('one-shot Globe credit funding executor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('closes as no-effect when Globe is already at the authorized target', async () => {
    const fake = store()

    broker.ensure.mockResolvedValue({
      status: 'already_funded',
      effectiveAvailable: 900,
      asOf: '2026-08-01T00:01:00Z',
      operation: {
        operationId: 'no-effect-operation-1',
        receipt: { outcome: 'no_effect' }
      }
    })

    const result = await executeOneShotGlobeCreditFunding(input, { store: fake as never })

    expect(result.outcome).toBe('no_effect')
    expect(result.operationId).toBe('no-effect-operation-1')
    expect(fake.advance).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedState: 'claimed',
        state: 'completed',
        outcome: 'no_effect',
        globeOperationId: 'no-effect-operation-1'
      })
    )
    expect(broker.confirm).not.toHaveBeenCalled()
  })

  it('proposes and confirms with deterministic keys from the claimed execution', async () => {
    const fake = store()

    broker.ensure.mockResolvedValue({ status: 'proposed', proposalId: 'proposal-1', fingerprint: 'fp-1', plan: {} })
    broker.confirm.mockResolvedValue({ outcome: { state: 'completed' } })

    const result = await executeOneShotGlobeCreditFunding(input, { store: fake as never })

    expect(result.outcome).toBe('completed')
    expect(broker.ensure).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'propose-key' }), undefined)
    expect(broker.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: 'proposal-1',
        fingerprint: 'fp-1',
        idempotencyKey: 'confirm-key',
        authority: { authorityId: 'authority-1', executionId: 'execution-1' }
      }),
      undefined
    )
  })

  it('reads Globe before resuming a confirmation and does not dispatch it twice when completed', async () => {
    const fake = store({
      ...execution,
      state: 'confirming',
      proposalId: 'proposal-1',
      planFingerprint: 'fp-1'
    } as never)

    operations.get.mockResolvedValue({
      schemaVersion: '1',
      operationId: 'proposal-1',
      proposalId: 'proposal-1',
      state: 'completed',
      plan: {},
      receipt: { outcome: 'completed' }
    })

    const result = await executeOneShotGlobeCreditFunding(input, { store: fake as never })

    expect(result.outcome).toBe('completed')
    expect(operations.get).toHaveBeenCalledOnce()
    expect(broker.confirm).not.toHaveBeenCalled()
  })

  it('never redispatches confirm when readback and reconcile remain outcome-unknown', async () => {
    const fake = store({
      ...execution,
      state: 'confirming',
      proposalId: 'proposal-1',
      planFingerprint: 'fp-1'
    } as never)

    operations.get.mockResolvedValue({
      schemaVersion: '1',
      operationId: 'proposal-1',
      proposalId: 'proposal-1',
      state: 'outcome_unknown',
      plan: {},
      receipt: { outcome: 'outcome_unknown' }
    })
    operations.reconcile.mockResolvedValue({
      schemaVersion: '1',
      operationId: 'proposal-1',
      proposalId: 'proposal-1',
      state: 'outcome_unknown',
      plan: {},
      receipt: { outcome: 'outcome_unknown' }
    })

    const result = await executeOneShotGlobeCreditFunding(input, { store: fake as never })

    expect(result.outcome).toBe('outcome_unknown')
    expect(operations.reconcile).toHaveBeenCalledOnce()
    expect(broker.confirm).not.toHaveBeenCalled()
  })

  it('keeps MCP retries on the same authority execution and performs readback before any redispatch', async () => {
    const mcpAuthority = {
      ...authority,
      executorChannel: 'mcp',
      executorClientId: 'efeonce-mcp-gateway'
    } as const

    const mcpExecution = {
      ...execution,
      state: 'confirming',
      proposalId: 'proposal-mcp-1',
      planFingerprint: 'fp-mcp-1',
      executorChannel: 'mcp',
      executorClientId: 'efeonce-mcp-gateway'
    } as const

    const fake = store(mcpExecution as never)

    fake.claim.mockResolvedValue({ authority: mcpAuthority, execution: mcpExecution } as never)
    operations.get.mockResolvedValue({
      schemaVersion: '1',
      operationId: 'proposal-mcp-1',
      proposalId: 'proposal-mcp-1',
      state: 'completed',
      plan: {},
      receipt: { outcome: 'completed' }
    })

    const result = await executeOneShotGlobeCreditFunding(
      {
        ...input,
        executorChannel: 'mcp',
        executorClientId: 'efeonce-mcp-gateway'
      },
      { store: fake as never }
    )

    expect(result.outcome).toBe('completed')
    expect(fake.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        authorityId: 'authority-1',
        executorChannel: 'mcp',
        executorClientId: 'efeonce-mcp-gateway'
      })
    )
    expect(operations.get).toHaveBeenCalledOnce()
    expect(broker.confirm).not.toHaveBeenCalled()
  })
})
