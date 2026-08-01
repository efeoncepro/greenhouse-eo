import { describe, expect, it } from 'vitest'

import {
  GlobeCreditFundingOperationError,
  parseGlobeCreditFundingOperation,
  parseGlobeCreditFundingOperationPage,
  readGreenhouseCreditFundingIntentEvidence
} from './credit-funding-operations'

const operation = {
  schemaVersion: '1', operationId: 'proposal-1', proposalId: 'proposal-1', workspaceId: 'must-not-leak',
  state: 'reconciled', fingerprint: 'must-not-leak',
  proposedBy: { principalId: 'must-not-leak', entitlement: 'hidden', at: '2026-08-01T12:00:00Z' },
  plan: { schemaVersion: '1', workspaceId: 'must-not-leak', poolId: 'pool-1', grantCredits: 100,
    monthlyCapAfter: 500, monthlyCapBefore: 400, spentInPeriod: 80, policyAvailableBefore: 320,
    policyAvailableAfter: 420, periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-09-01T00:00:00Z' },
  receipt: { schemaVersion: '1', outcome: 'completed', grantId: 'must-not-leak',
    reconciledAt: '2026-08-01T12:01:00Z', reasonCode: 'confirmed_effects_complete' },
  expiresAt: '2026-08-01T12:10:00Z', createdAt: '2026-08-01T12:00:00Z', updatedAt: '2026-08-01T12:01:00Z'
}

describe('Globe credit funding operation projection', () => {
  it('returns the operational receipt while stripping identities and internal effect ids', () => {
    const parsed = parseGlobeCreditFundingOperation(operation)

    expect(parsed.operationId).toBe('proposal-1')
    expect(parsed.receipt?.outcome).toBe('completed')
    expect(JSON.stringify(parsed)).not.toContain('must-not-leak')
  })

  it('parses a bounded page and preserves its opaque cursor', () => {
    const parsed = parseGlobeCreditFundingOperationPage({ schemaVersion: '1', items: [operation], nextCursor: 'opaque' })

    expect(parsed.items).toHaveLength(1)
    expect(parsed.nextCursor).toBe('opaque')
  })

  it('fails closed on unknown states and outcomes', () => {
    expect(() => parseGlobeCreditFundingOperation({ ...operation, state: 'surprise' }))
      .toThrow(GlobeCreditFundingOperationError)
    expect(() => parseGlobeCreditFundingOperation({ ...operation,
      receipt: { schemaVersion: '1', outcome: 'rerun_money' } }))
      .toThrow(GlobeCreditFundingOperationError)
  })

  it('joins only Greenhouse-owned attribution without inferring the Globe state', async () => {
    const runQuery = (async () => [{
      proposal_id: 'proposal-1', phase: 'confirmed' as const, actor_user_id: 'user-1',
      actor_entitlement: 'platform.globe_credit_funding.confirm', actor_auth_mode: 'agent',
      correlation_id: 'correlation-1', created_at: new Date('2026-08-01T12:00:00Z')
    }]) as Parameters<typeof readGreenhouseCreditFundingIntentEvidence>[2]

    const evidence = await readGreenhouseCreditFundingIntentEvidence('workspace-1', ['proposal-1'], runQuery)

    expect(evidence.get('proposal-1')).toEqual([expect.objectContaining({ phase: 'confirmed', actorUserId: 'user-1' })])
  })
})
