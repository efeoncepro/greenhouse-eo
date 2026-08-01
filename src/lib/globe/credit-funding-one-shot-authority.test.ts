import { describe, expect, it } from 'vitest'

import type { GlobeCreditFundingAuthorityError } from './credit-funding-one-shot-authority'
import { GlobeCreditFundingOneShotAuthorityStore } from './credit-funding-one-shot-authority'

const NOW = new Date('2026-08-01T12:00:00.000Z')

function harness() {
  let clock = NOW
  let authority: Record<string, unknown> | undefined
  let execution: Record<string, unknown> | undefined

  const query = async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM greenhouse_core.globe_credit_funding_authority_issuers')) {
      return {
        rows: [
          {
            active: true,
            max_target_available_credits: 2000,
            max_grant_credits: 1000,
            max_resulting_cap_credits: 4000,
            max_ttl_seconds: 900
          }
        ]
      }
    }

    if (sql.includes('FROM greenhouse_core.sister_platform_oauth_clients')) return { rows: [{ allowed: true }] }

    if (sql.includes('INSERT INTO greenhouse_core.globe_credit_funding_authority_auth_attestations')) {
      return { rows: [] }
    }

    if (sql.includes('INSERT INTO greenhouse_core.globe_credit_funding_one_shot_authorities')) {
      if (authority) return { rows: [] }
      authority = {
        authority_id: params[0],
        schema_version: '1',
        globe_workspace_id: params[1],
        operation_kind: 'ensure_funded',
        period_key: params[2],
        period_start: params[3],
        period_end: params[4],
        target_available_credits: params[5],
        max_grant_credits: params[6],
        max_resulting_cap_credits: params[7],
        issuer_user_id: params[8],
        executor_user_id: params[12],
        executor_oauth_client_id: params[13],
        executor_auth_mode: params[14],
        not_before: params[15],
        expires_at: params[16],
        max_executions: 1,
        operation_key: params[17],
        instruction_fingerprint: params[18],
        evidence_ref: params[19],
        issued_at: params[20]
      }

      return { rows: [authority] }
    }

    if (sql.includes('SELECT * FROM greenhouse_core.globe_credit_funding_one_shot_authorities')) {
      return { rows: authority ? [authority] : [] }
    }

    if (sql.includes('AS revoked')) return { rows: authority ? [{ ...authority, revoked: false }] : [] }

    if (sql.includes('SELECT * FROM greenhouse_core.globe_credit_funding_authority_executions')) {
      return { rows: execution ? [execution] : [] }
    }

    if (sql.includes('INSERT INTO greenhouse_core.globe_credit_funding_authority_executions')) {
      execution = {
        execution_id: params[0],
        authority_id: params[1],
        executor_user_id: params[2],
        executor_oauth_client_id: params[3],
        actor_auth_mode: params[5],
        execution_fingerprint: params[6],
        operation_key: params[7],
        state: 'claimed',
        propose_idempotency_key: params[9],
        confirm_idempotency_key: params[10],
        reconcile_idempotency_key: params[11],
        proposal_id: null,
        plan_fingerprint: null,
        globe_operation_id: null,
        outcome: null,
        claimed_at: params[12],
        updated_at: params[12],
        completed_at: null,
        dispatch_lease_owner: null,
        dispatch_lease_expires_at: null,
        dispatch_lease_generation: 0
      }

      return { rows: [execution] }
    }

    if (sql.includes('INSERT INTO greenhouse_core.globe_credit_funding_authority_execution_events')) {
      return { rows: [] }
    }

    if (sql.includes('dispatch_lease_generation=dispatch_lease_generation+1')) {
      const activeOtherLease =
        execution?.dispatch_lease_owner &&
        execution.dispatch_lease_owner !== params[1] &&
        Date.parse(String(execution.dispatch_lease_expires_at)) > Date.parse(String(params[3]))

      if (!execution || activeOtherLease) {
        return { rows: [] }
      }

      execution = {
        ...execution,
        dispatch_lease_owner: params[1],
        dispatch_lease_expires_at: params[2],
        dispatch_lease_generation: Number(execution.dispatch_lease_generation) + 1,
        updated_at: params[3]
      }

      return { rows: [execution] }
    }

    if (sql.includes('UPDATE greenhouse_core.globe_credit_funding_authority_executions')) {
      if (!execution || execution.state !== params[1]) return { rows: [] }
      if (params[9] && execution.dispatch_lease_owner !== params[9]) return { rows: [] }
      if (params[10] && execution.dispatch_lease_generation !== params[10]) return { rows: [] }

      if (params[9] && Date.parse(String(execution.dispatch_lease_expires_at)) <= Date.parse(String(params[8]))) {
        return { rows: [] }
      }

      execution = {
        ...execution,
        state: params[2],
        proposal_id: params[3] ?? execution.proposal_id,
        plan_fingerprint: params[4] ?? execution.plan_fingerprint,
        globe_operation_id: params[5] ?? execution.globe_operation_id,
        outcome: params[6] ?? execution.outcome,
        updated_at: params[8],
        completed_at: ['completed', 'failed_definitive', 'reconciled'].includes(String(params[2])) ? params[8] : null
      }

      return { rows: [execution] }
    }

    throw new Error(`unexpected_sql:${sql}`)
  }

  let id = 0

  const store = new GlobeCreditFundingOneShotAuthorityStore({
    now: () => clock,
    newId: () => `00000000-0000-4000-8000-00000000000${++id}`,
    transaction: async callback => callback({ query } as never)
  })

  return {
    store,
    setNow: (value: Date) => {
      clock = value
    }
  }
}

const issueInput = {
  globeWorkspaceId: 'greenhouse-org:efeonce',
  periodKey: '2026-08',
  periodStart: '2026-08-01T00:00:00Z',
  periodEnd: '2026-09-01T00:00:00Z',
  targetAvailableCredits: 800,
  maxGrantCredits: 500,
  maxResultingCapCredits: 1500,
  issuerUserId: 'user-efeonce-admin-julio-reyes',
  issuerEntitlement: 'platform.globe_credit_funding.authority.issue',
  issuerAuthMode: 'microsoft_sso',
  issuerAuthProvider: 'microsoft-entra-id',
  issuerAuthCorrelationId: 'correlation:issuer-1',
  executorUserId: 'user-agent-e2e-001',
  executorOauthClientId: 'greenhouse-admin-cli',
  executorAuthMode: 'agent',
  operationKey: 'fund-2026-08-evaluation',
  evidenceRef: 'codex-goal:TASK-1629'
} as const

describe('Globe credit funding one-shot authority', () => {
  it('replays issuance by operation key even when the HTTP retry arrives later', async () => {
    const { store, setNow } = harness()
    const first = await store.issue(issueInput)

    setNow(new Date('2026-08-01T12:05:00.000Z'))
    const replay = await store.issue(issueInput)

    expect(replay.authorityId).toBe(first.authorityId)
    expect(replay.expiresAt).toBe(first.expiresAt)
  })

  it('issues, claims once and resumes the same execution with deterministic keys', async () => {
    const { store } = harness()
    const authority = await store.issue(issueInput)

    const first = await store.claim({
      authorityId: authority.authorityId,
      executorUserId: issueInput.executorUserId,
      executorOauthClientId: issueInput.executorOauthClientId,
      oauthAccessTokenId: 'token:first',
      actorAuthMode: 'agent',
      correlationId: 'correlation:first',
      allowedGlobeWorkspaceIds: [issueInput.globeWorkspaceId]
    })

    const resumed = await store.claim({
      authorityId: authority.authorityId,
      executorUserId: issueInput.executorUserId,
      executorOauthClientId: issueInput.executorOauthClientId,
      oauthAccessTokenId: 'token:renewed',
      actorAuthMode: 'agent',
      correlationId: 'correlation:resume',
      allowedGlobeWorkspaceIds: [issueInput.globeWorkspaceId]
    })

    expect(resumed.execution.executionId).toBe(first.execution.executionId)
    expect(first.execution.proposeIdempotencyKey).not.toBe(first.execution.confirmIdempotencyKey)
    expect(first.execution.operationKey).toBe(issueInput.operationKey)
  })

  it('binds a Chrome-authenticated executor without relabeling it as an agent', async () => {
    const { store } = harness()

    const humanIssue = {
      ...issueInput,
      executorUserId: issueInput.issuerUserId,
      executorAuthMode: 'microsoft_sso'
    } as const

    const authority = await store.issue(humanIssue)

    const claimed = await store.claim({
      authorityId: authority.authorityId,
      executorUserId: humanIssue.executorUserId,
      executorOauthClientId: humanIssue.executorOauthClientId,
      oauthAccessTokenId: 'token:human',
      actorAuthMode: 'microsoft_sso',
      correlationId: 'correlation:human',
      allowedGlobeWorkspaceIds: [humanIssue.globeWorkspaceId]
    })

    expect(claimed.authority.executorAuthMode).toBe('microsoft_sso')
    expect(claimed.execution.actorAuthMode).toBe('microsoft_sso')
  })

  it('rejects agent issuance and wrong executor binding', async () => {
    const { store } = harness()

    await expect(store.issue({ ...issueInput, issuerAuthMode: 'agent' })).rejects.toMatchObject({
      code: 'issuer_not_allowed'
    } satisfies Partial<GlobeCreditFundingAuthorityError>)
    const authority = await store.issue(issueInput)

    await expect(
      store.claim({
        authorityId: authority.authorityId,
        executorUserId: 'another-agent',
        executorOauthClientId: issueInput.executorOauthClientId,
        oauthAccessTokenId: 'token:first',
        actorAuthMode: 'agent',
        correlationId: 'correlation:first',
        allowedGlobeWorkspaceIds: [issueInput.globeWorkspaceId]
      })
    ).rejects.toMatchObject({ code: 'authority_binding_mismatch' })
  })

  it('rejects a token that is not bound to the authority workspace', async () => {
    const { store } = harness()
    const authority = await store.issue(issueInput)

    await expect(
      store.claim({
        authorityId: authority.authorityId,
        executorUserId: issueInput.executorUserId,
        executorOauthClientId: issueInput.executorOauthClientId,
        oauthAccessTokenId: 'token:first',
        actorAuthMode: 'agent',
        correlationId: 'correlation:first',
        allowedGlobeWorkspaceIds: ['globe-workspace:other']
      })
    ).rejects.toMatchObject({ code: 'authority_binding_mismatch' })
  })

  it('resumes a consumed execution after the issuance TTL expires', async () => {
    const { store, setNow } = harness()
    const authority = await store.issue(issueInput)

    const claim = {
      authorityId: authority.authorityId,
      executorUserId: issueInput.executorUserId,
      executorOauthClientId: issueInput.executorOauthClientId,
      oauthAccessTokenId: 'token:first',
      actorAuthMode: 'agent',
      correlationId: 'correlation:first',
      allowedGlobeWorkspaceIds: [issueInput.globeWorkspaceId]
    } as const

    const first = await store.claim(claim)

    setNow(new Date('2026-08-01T13:00:00.000Z'))
    const resumed = await store.claim({ ...claim, oauthAccessTokenId: 'token:renewed' })

    expect(resumed.execution.executionId).toBe(first.execution.executionId)
  })

  it('allows only one active dispatch lease', async () => {
    const { store } = harness()
    const authority = await store.issue(issueInput)

    const { execution } = await store.claim({
      authorityId: authority.authorityId,
      executorUserId: issueInput.executorUserId,
      executorOauthClientId: issueInput.executorOauthClientId,
      oauthAccessTokenId: 'token:first',
      actorAuthMode: 'agent',
      correlationId: 'correlation:first',
      allowedGlobeWorkspaceIds: [issueInput.globeWorkspaceId]
    })

    await store.advance({
      executionId: execution.executionId,
      expectedState: 'claimed',
      state: 'proposed',
      proposalId: 'proposal-1',
      planFingerprint: 'plan-1',
      oauthAccessTokenId: 'token:first',
      correlationId: 'correlation:proposed'
    })
    await store.advance({
      executionId: execution.executionId,
      expectedState: 'proposed',
      state: 'confirming',
      oauthAccessTokenId: 'token:first',
      correlationId: 'correlation:confirming'
    })
    await store.acquireDispatchLease({
      executionId: execution.executionId,
      leaseOwnerId: 'lease:first',
      oauthAccessTokenId: 'token:first',
      correlationId: 'correlation:lease'
    })

    await expect(
      store.acquireDispatchLease({
        executionId: execution.executionId,
        leaseOwnerId: 'lease:other',
        oauthAccessTokenId: 'token:other',
        correlationId: 'correlation:other'
      })
    ).rejects.toMatchObject({ code: 'execution_busy' })
  })

  it('fences an expired lease owner after a newer generation is acquired', async () => {
    const { store, setNow } = harness()
    const authority = await store.issue(issueInput)

    const claimed = await store.claim({
      authorityId: authority.authorityId,
      executorUserId: issueInput.executorUserId,
      executorOauthClientId: issueInput.executorOauthClientId,
      oauthAccessTokenId: 'token:first',
      actorAuthMode: 'agent',
      correlationId: 'correlation:first',
      allowedGlobeWorkspaceIds: [issueInput.globeWorkspaceId]
    })

    await store.advance({
      executionId: claimed.execution.executionId,
      expectedState: 'claimed',
      state: 'proposed',
      proposalId: 'proposal-1',
      planFingerprint: 'plan-1',
      oauthAccessTokenId: 'token:first',
      correlationId: 'correlation:proposed'
    })
    await store.advance({
      executionId: claimed.execution.executionId,
      expectedState: 'proposed',
      state: 'confirming',
      oauthAccessTokenId: 'token:first',
      correlationId: 'correlation:confirming'
    })

    const staleLease = await store.acquireDispatchLease({
      executionId: claimed.execution.executionId,
      leaseOwnerId: 'lease:stale',
      oauthAccessTokenId: 'token:first',
      correlationId: 'correlation:stale',
      leaseSeconds: 30
    })

    setNow(new Date('2026-08-01T12:01:00.000Z'))
    await store.acquireDispatchLease({
      executionId: claimed.execution.executionId,
      leaseOwnerId: 'lease:new',
      oauthAccessTokenId: 'token:new',
      correlationId: 'correlation:new'
    })

    await expect(
      store.advance({
        executionId: claimed.execution.executionId,
        expectedState: 'confirming',
        state: 'completed',
        oauthAccessTokenId: 'token:first',
        correlationId: 'correlation:stale-settle',
        leaseOwnerId: 'lease:stale',
        leaseGeneration: staleLease.dispatchLeaseGeneration
      })
    ).rejects.toMatchObject({ code: 'invalid_transition' })
  })

  it('allows only explicit compare-and-set transitions', async () => {
    const { store } = harness()
    const authority = await store.issue(issueInput)

    const { execution } = await store.claim({
      authorityId: authority.authorityId,
      executorUserId: issueInput.executorUserId,
      executorOauthClientId: issueInput.executorOauthClientId,
      oauthAccessTokenId: 'token:first',
      actorAuthMode: 'agent',
      correlationId: 'correlation:first',
      allowedGlobeWorkspaceIds: [issueInput.globeWorkspaceId]
    })

    await expect(
      store.advance({
        executionId: execution.executionId,
        expectedState: 'claimed',
        state: 'confirming',
        oauthAccessTokenId: 'token:first',
        correlationId: 'correlation:bad'
      })
    ).rejects.toMatchObject({ code: 'invalid_transition' })

    const proposed = await store.advance({
      executionId: execution.executionId,
      expectedState: 'claimed',
      state: 'proposed',
      proposalId: 'proposal-1',
      planFingerprint: 'plan-1',
      oauthAccessTokenId: 'token:first',
      correlationId: 'correlation:proposed'
    })

    expect(proposed.state).toBe('proposed')
    expect(proposed.proposalId).toBe('proposal-1')
  })
})
