import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'

const HUMAN_AUTH_MODES = new Set(['credentials', 'both', 'microsoft_sso', 'google_sso'])
const EXECUTOR_AUTH_MODES = new Set([...HUMAN_AUTH_MODES, 'agent'])
const EXECUTOR_CHANNELS = new Set(['oauth', 'browser'])
const GREENHOUSE_BROWSER_CLIENT_ID = 'greenhouse-portal'
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,511}$/

const TRANSITIONS = {
  claimed: new Set(['proposed', 'completed', 'failed_definitive']),
  proposed: new Set(['confirming', 'failed_definitive']),
  confirming: new Set(['completed', 'outcome_unknown', 'failed_definitive']),
  outcome_unknown: new Set(['completed', 'failed_definitive', 'reconciled']),
  completed: new Set<string>(),
  failed_definitive: new Set<string>(),
  reconciled: new Set<string>()
} as const

export type GlobeCreditFundingAuthorityExecutionState = keyof typeof TRANSITIONS
export type GlobeCreditFundingExecutorChannel = 'oauth' | 'browser'

export type GlobeCreditFundingOneShotAuthority = Readonly<{
  schemaVersion: '1'
  authorityId: string
  globeWorkspaceId: string
  operationKind: 'ensure_funded'
  periodKey: string
  periodStart: string
  periodEnd: string
  targetAvailableCredits: number
  maxGrantCredits: number
  maxResultingCapCredits: number
  issuerUserId: string
  issuerAuthEvidenceRef: string
  executorUserId: string
  executorChannel: GlobeCreditFundingExecutorChannel
  executorClientId: string
  executorAuthMode: string
  notBefore: string
  expiresAt: string
  maxExecutions: 1
  operationKey: string
  instructionFingerprint: string
  evidenceRef: string
  issuedAt: string
}>

export type GlobeCreditFundingAuthorityExecution = Readonly<{
  schemaVersion: '1'
  executionId: string
  authorityId: string
  operationKey: string
  executionFingerprint: string
  state: GlobeCreditFundingAuthorityExecutionState
  executorChannel: GlobeCreditFundingExecutorChannel
  executorClientId: string
  actorAuthMode: string
  proposeIdempotencyKey: string
  confirmIdempotencyKey: string
  reconcileIdempotencyKey: string
  proposalId?: string
  planFingerprint?: string
  globeOperationId?: string
  outcome?: string
  dispatchLeaseGeneration?: number
  dispatchLeaseExpiresAt?: string
  claimedAt: string
  updatedAt: string
  completedAt?: string
}>

export class GlobeCreditFundingAuthorityError extends Error {
  constructor(
    readonly code:
      | 'invalid_request'
      | 'issuer_not_allowed'
      | 'authority_not_found'
      | 'authority_not_active'
      | 'authority_binding_mismatch'
      | 'authority_fingerprint_mismatch'
      | 'execution_busy'
      | 'invalid_transition'
  ) {
    super(code)
    this.name = 'GlobeCreditFundingAuthorityError'
  }
}

type TransactionClient = Pick<PoolClient, 'query'>
type TransactionRunner = <T>(callback: (client: TransactionClient) => Promise<T>) => Promise<T>

export class GlobeCreditFundingOneShotAuthorityStore {
  constructor(
    private readonly dependencies: Readonly<{
      transaction?: TransactionRunner
      now?: () => Date
      newId?: () => string
    }> = {}
  ) {}

  async issue(
    input: Readonly<{
      globeWorkspaceId: string
      periodKey: string
      periodStart: string
      periodEnd: string
      targetAvailableCredits: number
      maxGrantCredits: number
      maxResultingCapCredits: number
      issuerUserId: string
      issuerEntitlement: string
      issuerAuthMode: string
      issuerAuthProvider: string
      issuerAuthCorrelationId: string
      executorUserId: string
      executorChannel: GlobeCreditFundingExecutorChannel
      executorClientId: string
      executorAuthMode: string
      operationKey: string
      evidenceRef: string
      ttlSeconds?: number
    }>
  ): Promise<GlobeCreditFundingOneShotAuthority> {
    const normalized = parseIssue(input, this.now())
    const run = this.dependencies.transaction ?? (withTransaction as TransactionRunner)

    return run(async client => {
      const issuerResult = await client.query<{
        active: boolean
        max_target_available_credits: number
        max_grant_credits: number
        max_resulting_cap_credits: number
        max_ttl_seconds: number
      }>(
        `SELECT active, max_target_available_credits, max_grant_credits,
                 max_resulting_cap_credits, max_ttl_seconds
           FROM greenhouse_core.globe_credit_funding_authority_issuers
           WHERE globe_workspace_id = $1 AND issuer_user_id = $2
             AND NOT EXISTS (
               SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_issuer_revocations revoked
                WHERE revoked.globe_workspace_id = globe_credit_funding_authority_issuers.globe_workspace_id
                  AND revoked.issuer_user_id = globe_credit_funding_authority_issuers.issuer_user_id
             )
           FOR SHARE`,
        [normalized.globeWorkspaceId, normalized.issuerUserId]
      )

      const issuer = issuerResult.rows[0]

      if (
        !issuer?.active ||
        normalized.targetAvailableCredits > issuer.max_target_available_credits ||
        normalized.maxGrantCredits > issuer.max_grant_credits ||
        normalized.maxResultingCapCredits > issuer.max_resulting_cap_credits ||
        normalized.ttlSeconds > issuer.max_ttl_seconds
      ) {
        throw new GlobeCreditFundingAuthorityError('issuer_not_allowed')
      }

      if (normalized.executorChannel === 'oauth') {
        const executorClient = await client.query<{ allowed: boolean }>(
          `SELECT EXISTS (
            SELECT 1 FROM greenhouse_core.sister_platform_oauth_clients
             WHERE client_id = $1 AND client_status = 'active' AND client_type = 'public'
               AND metadata_json->>'workspaceBindingProvider' = 'globe'
          ) AS allowed`,
          [normalized.executorClientId]
        )

        if (!executorClient.rows[0]?.allowed) {
          throw new GlobeCreditFundingAuthorityError('authority_binding_mismatch')
        }
      }

      const instructionFingerprint = fingerprint({
        schemaVersion: '1',
        globeWorkspaceId: normalized.globeWorkspaceId,
        operationKind: 'ensure_funded',
        periodKey: normalized.periodKey,
        periodStart: normalized.periodStart,
        periodEnd: normalized.periodEnd,
        targetAvailableCredits: normalized.targetAvailableCredits,
        maxGrantCredits: normalized.maxGrantCredits,
        maxResultingCapCredits: normalized.maxResultingCapCredits,
        issuerUserId: normalized.issuerUserId,
        issuerEntitlement: normalized.issuerEntitlement,
        issuerAuthMode: normalized.issuerAuthMode,
        issuerAuthProvider: normalized.issuerAuthProvider,
        executorUserId: normalized.executorUserId,
        executorChannel: normalized.executorChannel,
        executorClientId: normalized.executorClientId,
        executorAuthMode: normalized.executorAuthMode,
        ttlSeconds: normalized.ttlSeconds,
        maxExecutions: 1,
        operationKey: normalized.operationKey,
        evidenceRefDigest: fingerprint(normalized.evidenceRef)
      })

      const replay = await client.query<AuthorityRow>(
        `SELECT * FROM greenhouse_core.globe_credit_funding_one_shot_authorities
          WHERE globe_workspace_id = $1 AND operation_key = $2 FOR SHARE`,
        [normalized.globeWorkspaceId, normalized.operationKey]
      )

      if (replay.rows[0]) {
        if (replay.rows[0].instruction_fingerprint !== instructionFingerprint) {
          throw new GlobeCreditFundingAuthorityError('authority_fingerprint_mismatch')
        }

        return authority(replay.rows[0])
      }

      const authorityId = this.dependencies.newId?.() ?? randomUUID()
      const issuedAt = normalized.issuedAt
      const expiresAt = new Date(Date.parse(issuedAt) + normalized.ttlSeconds * 1000).toISOString()
      const issuerAuthEvidenceRef = `gh-credit-auth:${instructionFingerprint}`

      await client.query(
        `INSERT INTO greenhouse_core.globe_credit_funding_authority_auth_attestations
          (attestation_id, issuer_user_id, auth_provider, auth_mode, correlation_id, attested_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (attestation_id) DO NOTHING`,
        [
          issuerAuthEvidenceRef,
          normalized.issuerUserId,
          normalized.issuerAuthProvider,
          normalized.issuerAuthMode,
          normalized.issuerAuthCorrelationId,
          issuedAt
        ]
      )

      const inserted = await client.query<AuthorityRow>(
        `INSERT INTO greenhouse_core.globe_credit_funding_one_shot_authorities
        (authority_id, globe_workspace_id, period_key, period_start, period_end, target_available_credits,
         max_grant_credits, max_resulting_cap_credits, issuer_user_id, issuer_entitlement, issuer_auth_mode,
         issuer_auth_evidence_ref, executor_user_id, executor_channel, executor_client_id, executor_auth_mode,
         not_before, expires_at, operation_key, instruction_fingerprint, evidence_ref, issued_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT (globe_workspace_id, operation_key) DO NOTHING RETURNING *`,
        [
          authorityId,
          normalized.globeWorkspaceId,
          normalized.periodKey,
          normalized.periodStart,
          normalized.periodEnd,
          normalized.targetAvailableCredits,
          normalized.maxGrantCredits,
          normalized.maxResultingCapCredits,
          normalized.issuerUserId,
          normalized.issuerEntitlement,
          normalized.issuerAuthMode,
          issuerAuthEvidenceRef,
          normalized.executorUserId,
          normalized.executorChannel,
          normalized.executorClientId,
          normalized.executorAuthMode,
          issuedAt,
          expiresAt,
          normalized.operationKey,
          instructionFingerprint,
          normalized.evidenceRef,
          issuedAt
        ]
      )

      if (inserted.rows[0]) return authority(inserted.rows[0])

      const concurrentReplay = await client.query<AuthorityRow>(
        `SELECT * FROM greenhouse_core.globe_credit_funding_one_shot_authorities
        WHERE globe_workspace_id = $1 AND operation_key = $2`,
        [normalized.globeWorkspaceId, normalized.operationKey]
      )

      if (!concurrentReplay.rows[0] || concurrentReplay.rows[0].instruction_fingerprint !== instructionFingerprint) {
        throw new GlobeCreditFundingAuthorityError('authority_fingerprint_mismatch')
      }

      return authority(concurrentReplay.rows[0])
    })
  }

  async claim(
    input: Readonly<{
      authorityId: string
      executorUserId: string
      executorChannel: GlobeCreditFundingExecutorChannel
      executorClientId: string
      authEvidenceRef: string
      actorAuthMode: string
      correlationId: string
      allowedGlobeWorkspaceIds: readonly string[]
    }>
  ): Promise<
    Readonly<{ authority: GlobeCreditFundingOneShotAuthority; execution: GlobeCreditFundingAuthorityExecution }>
  > {
    refs(
      input.authorityId,
      input.executorUserId,
      input.executorChannel,
      input.executorClientId,
      input.authEvidenceRef,
      input.correlationId
    )
    input.allowedGlobeWorkspaceIds.forEach(value => refs(value))

    if (!EXECUTOR_CHANNELS.has(input.executorChannel) || !EXECUTOR_AUTH_MODES.has(input.actorAuthMode)) {
      throw new GlobeCreditFundingAuthorityError('authority_binding_mismatch')
    }

    const run = this.dependencies.transaction ?? (withTransaction as TransactionRunner)

    return run(async client => {
      const result = await client.query<AuthorityRow & { revoked: boolean }>(
        `SELECT authority.*,
          EXISTS (SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_revocations revocation
                   WHERE revocation.authority_id = authority.authority_id) AS revoked
        FROM greenhouse_core.globe_credit_funding_one_shot_authorities authority
        WHERE authority.authority_id = $1 FOR UPDATE`,
        [input.authorityId]
      )

      const row = result.rows[0]

      if (!row) throw new GlobeCreditFundingAuthorityError('authority_not_found')

      if (
        row.executor_user_id !== input.executorUserId ||
        row.executor_channel !== input.executorChannel ||
        row.executor_client_id !== input.executorClientId ||
        row.executor_auth_mode !== input.actorAuthMode ||
        (input.executorChannel === 'browser' && row.issuer_auth_evidence_ref !== input.authEvidenceRef)
      ) {
        throw new GlobeCreditFundingAuthorityError('authority_binding_mismatch')
      }

      if (!input.allowedGlobeWorkspaceIds.includes(row.globe_workspace_id)) {
        throw new GlobeCreditFundingAuthorityError('authority_binding_mismatch')
      }

      const existing = await client.query<ExecutionRow>(
        `SELECT * FROM greenhouse_core.globe_credit_funding_authority_executions
        WHERE authority_id = $1`,
        [input.authorityId]
      )

      if (existing.rows[0]) {
        if (
          existing.rows[0].executor_user_id !== input.executorUserId ||
          existing.rows[0].executor_channel !== input.executorChannel ||
          existing.rows[0].executor_client_id !== input.executorClientId ||
          existing.rows[0].actor_auth_mode !== input.actorAuthMode
        ) {
          throw new GlobeCreditFundingAuthorityError('authority_binding_mismatch')
        }

        await insertEvent(client, existing.rows[0], 'claimed', input.authEvidenceRef, input.correlationId, {
          resumed: true
        })

        return { authority: authority(row), execution: execution(existing.rows[0]) }
      }

      const now = this.now().toISOString()

      if (row.revoked || now < iso(row.not_before) || now >= iso(row.expires_at)) {
        throw new GlobeCreditFundingAuthorityError('authority_not_active')
      }

      const executionId = this.dependencies.newId?.() ?? randomUUID()

      const executionFingerprint = fingerprint({
        authorityId: row.authority_id,
        instructionFingerprint: row.instruction_fingerprint,
        operationKey: row.operation_key,
        executorUserId: input.executorUserId,
        executorChannel: input.executorChannel,
        executorClientId: input.executorClientId,
        executorAuthMode: input.actorAuthMode
      })

      const keyBase = `gh:credit:${row.authority_id}`

      const inserted = await client.query<ExecutionRow>(
        `INSERT INTO greenhouse_core.globe_credit_funding_authority_executions
        (execution_id, authority_id, executor_user_id, executor_channel, executor_client_id, first_auth_evidence_ref,
         actor_auth_mode, execution_fingerprint, operation_key, correlation_id, propose_idempotency_key,
         confirm_idempotency_key, reconcile_idempotency_key, claimed_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14) RETURNING *`,
        [
          executionId,
          row.authority_id,
          input.executorUserId,
          input.executorChannel,
          input.executorClientId,
          input.authEvidenceRef,
          input.actorAuthMode,
          executionFingerprint,
          row.operation_key,
          input.correlationId,
          `${keyBase}:propose:v1`,
          `${keyBase}:confirm:v1`,
          `${keyBase}:reconcile:v1`,
          now
        ]
      )

      await insertEvent(client, inserted.rows[0]!, 'claimed', input.authEvidenceRef, input.correlationId, {})

      return { authority: authority(row), execution: execution(inserted.rows[0]!) }
    })
  }

  async revoke(
    input: Readonly<{
      authorityId: string
      revokedByUserId: string
      revokedByEntitlement: string
      revokedByAuthMode: string
      authEvidenceRef: string
      reasonCode: 'operator_revoked' | 'scope_changed' | 'security_response'
      correlationId: string
    }>
  ): Promise<Readonly<{ authorityId: string; revoked: true; revokedAt: string }>> {
    refs(
      input.authorityId,
      input.revokedByUserId,
      input.revokedByEntitlement,
      input.authEvidenceRef,
      input.correlationId
    )

    if (!HUMAN_AUTH_MODES.has(input.revokedByAuthMode)) {
      throw new GlobeCreditFundingAuthorityError('issuer_not_allowed')
    }

    const run = this.dependencies.transaction ?? (withTransaction as TransactionRunner)

    return run(async client => {
      const authorityResult = await client.query<AuthorityRow>(
        `SELECT *
        FROM greenhouse_core.globe_credit_funding_one_shot_authorities WHERE authority_id=$1 FOR UPDATE`,
        [input.authorityId]
      )

      const row = authorityResult.rows[0]

      if (!row) throw new GlobeCreditFundingAuthorityError('authority_not_found')

      const issuer = await client.query<{ active: boolean }>(
        `SELECT active
        FROM greenhouse_core.globe_credit_funding_authority_issuers
        WHERE globe_workspace_id=$1 AND issuer_user_id=$2
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_issuer_revocations revoked
             WHERE revoked.globe_workspace_id = globe_credit_funding_authority_issuers.globe_workspace_id
               AND revoked.issuer_user_id = globe_credit_funding_authority_issuers.issuer_user_id
          )
        FOR SHARE`,
        [row.globe_workspace_id, input.revokedByUserId]
      )

      if (!issuer.rows[0]?.active) throw new GlobeCreditFundingAuthorityError('issuer_not_allowed')

      const claimed = await client.query<{ claimed: boolean }>(
        `SELECT EXISTS (
        SELECT 1 FROM greenhouse_core.globe_credit_funding_authority_executions WHERE authority_id=$1
      ) AS claimed`,
        [input.authorityId]
      )

      if (claimed.rows[0]?.claimed) throw new GlobeCreditFundingAuthorityError('authority_not_active')
      const revokedAt = this.now().toISOString()

      const inserted = await client.query<{ revoked_at: string | Date }>(
        `INSERT INTO greenhouse_core.globe_credit_funding_authority_revocations
        (authority_id,revoked_at,revoked_by_user_id,revoked_by_entitlement,auth_evidence_ref,reason_code,correlation_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (authority_id) DO NOTHING RETURNING revoked_at`,
        [
          input.authorityId,
          revokedAt,
          input.revokedByUserId,
          input.revokedByEntitlement,
          input.authEvidenceRef,
          input.reasonCode,
          input.correlationId
        ]
      )

      if (inserted.rows[0])
        return { authorityId: input.authorityId, revoked: true, revokedAt: iso(inserted.rows[0].revoked_at) }

      const existing = await client.query<{ revoked_at: string | Date }>(
        `SELECT revoked_at
        FROM greenhouse_core.globe_credit_funding_authority_revocations WHERE authority_id=$1`,
        [input.authorityId]
      )

      if (!existing.rows[0]) throw new GlobeCreditFundingAuthorityError('authority_not_active')

      return { authorityId: input.authorityId, revoked: true, revokedAt: iso(existing.rows[0].revoked_at) }
    })
  }

  async advance(
    input: Readonly<{
      executionId: string
      expectedState: GlobeCreditFundingAuthorityExecutionState
      state: GlobeCreditFundingAuthorityExecutionState
      authEvidenceRef: string
      correlationId: string
      proposalId?: string
      planFingerprint?: string
      globeOperationId?: string
      outcome?: string
      receiptDigest?: string
      leaseOwnerId?: string
      leaseGeneration?: number
    }>
  ): Promise<GlobeCreditFundingAuthorityExecution> {
    if (!TRANSITIONS[input.expectedState].has(input.state)) {
      throw new GlobeCreditFundingAuthorityError('invalid_transition')
    }

    refs(input.executionId, input.authEvidenceRef, input.correlationId)

    if (input.leaseOwnerId) refs(input.leaseOwnerId)

    if (
      ['confirming', 'outcome_unknown'].includes(input.expectedState) &&
      (!input.leaseOwnerId || !Number.isSafeInteger(input.leaseGeneration) || (input.leaseGeneration ?? 0) <= 0)
    ) {
      throw new GlobeCreditFundingAuthorityError('invalid_transition')
    }

    const run = this.dependencies.transaction ?? (withTransaction as TransactionRunner)

    return run(async client => {
      const now = this.now().toISOString()

      const result = await client.query<ExecutionRow>(
        `UPDATE greenhouse_core.globe_credit_funding_authority_executions
        SET state=$3, proposal_id=COALESCE($4,proposal_id), plan_fingerprint=COALESCE($5,plan_fingerprint),
            globe_operation_id=COALESCE($6,globe_operation_id), outcome=COALESCE($7,outcome),
            receipt_digest=COALESCE($8,receipt_digest), updated_at=$9,
            completed_at=CASE WHEN $3 IN ('completed','failed_definitive','reconciled') THEN $9 ELSE completed_at END,
            dispatch_lease_owner=CASE WHEN $3 = 'confirming' THEN dispatch_lease_owner ELSE NULL END,
            dispatch_lease_expires_at=CASE WHEN $3 = 'confirming' THEN dispatch_lease_expires_at ELSE NULL END
        WHERE execution_id=$1 AND state=$2
          AND ($10::text IS NULL OR (
            dispatch_lease_owner=$10
            AND dispatch_lease_generation=$11
            AND dispatch_lease_expires_at > $9
          ))
        RETURNING *`,
        [
          input.executionId,
          input.expectedState,
          input.state,
          input.proposalId ?? null,
          input.planFingerprint ?? null,
          input.globeOperationId ?? null,
          input.outcome ?? null,
          input.receiptDigest ?? null,
          now,
          input.leaseOwnerId ?? null,
          input.leaseGeneration ?? null
        ]
      )

      if (!result.rows[0]) throw new GlobeCreditFundingAuthorityError('invalid_transition')
      await insertEvent(client, result.rows[0], input.state, input.authEvidenceRef, input.correlationId, {
        ...(input.proposalId ? { proposalId: input.proposalId } : {}),
        ...(input.globeOperationId ? { globeOperationId: input.globeOperationId } : {}),
        ...(input.outcome ? { outcome: input.outcome } : {})
      })

      return execution(result.rows[0])
    })
  }

  async acquireDispatchLease(
    input: Readonly<{
      executionId: string
      leaseOwnerId: string
      authEvidenceRef: string
      correlationId: string
      leaseSeconds?: number
    }>
  ): Promise<GlobeCreditFundingAuthorityExecution> {
    refs(input.executionId, input.leaseOwnerId, input.authEvidenceRef, input.correlationId)
    const leaseSeconds = input.leaseSeconds ?? 240

    if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 600) {
      throw new GlobeCreditFundingAuthorityError('invalid_request')
    }

    const run = this.dependencies.transaction ?? (withTransaction as TransactionRunner)

    return run(async client => {
      const now = this.now()
      const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString()

      const result = await client.query<ExecutionRow>(
        `UPDATE greenhouse_core.globe_credit_funding_authority_executions
            SET dispatch_lease_owner=$2, dispatch_lease_expires_at=$3,
                dispatch_lease_generation=dispatch_lease_generation+1, updated_at=$4
          WHERE execution_id=$1
            AND state IN ('confirming','outcome_unknown')
            AND (dispatch_lease_owner IS NULL OR dispatch_lease_owner=$2 OR dispatch_lease_expires_at <= $4)
          RETURNING *`,
        [input.executionId, input.leaseOwnerId, expiresAt, now.toISOString()]
      )

      if (!result.rows[0]) throw new GlobeCreditFundingAuthorityError('execution_busy')
      await insertEvent(client, result.rows[0], 'lease_acquired', input.authEvidenceRef, input.correlationId, {
        leaseGeneration: result.rows[0].dispatch_lease_generation
      })

      return execution(result.rows[0])
    })
  }

  private now() {
    return this.dependencies.now?.() ?? new Date()
  }
}

type AuthorityRow = Readonly<
  Record<string, unknown> & {
    authority_id: string
    schema_version: '1'
    globe_workspace_id: string
    operation_kind: 'ensure_funded'
    period_key: string
    period_start: string | Date
    period_end: string | Date
    target_available_credits: number
    max_grant_credits: number
    max_resulting_cap_credits: number
    issuer_user_id: string
    issuer_auth_evidence_ref: string
    executor_user_id: string
    executor_channel: GlobeCreditFundingExecutorChannel
    executor_client_id: string
    executor_auth_mode: string
    not_before: string | Date
    expires_at: string | Date
    max_executions: 1
    operation_key: string
    instruction_fingerprint: string
    evidence_ref: string
    issued_at: string | Date
  }
>
type ExecutionRow = Readonly<
  Record<string, unknown> & {
    execution_id: string
    authority_id: string
    executor_user_id: string
    executor_channel: GlobeCreditFundingExecutorChannel
    executor_client_id: string
    actor_auth_mode: string
    execution_fingerprint: string
    operation_key: string
    state: GlobeCreditFundingAuthorityExecutionState
    propose_idempotency_key: string
    confirm_idempotency_key: string
    reconcile_idempotency_key: string
    proposal_id: string | null
    plan_fingerprint: string | null
    globe_operation_id: string | null
    outcome: string | null
    claimed_at: string | Date
    updated_at: string | Date
    completed_at: string | Date | null
    dispatch_lease_owner: string | null
    dispatch_lease_expires_at: string | Date | null
    dispatch_lease_generation: number
  }
>

async function insertEvent(
  client: TransactionClient,
  row: ExecutionRow,
  eventType: string,
  authEvidenceRef: string,
  correlationId: string,
  evidence: Record<string, unknown>
) {
  const eventFingerprint = fingerprint({
    executionId: row.execution_id,
    eventType,
    state: row.state,
    authEvidenceRef,
    correlationId,
    evidence
  })

  await client.query(
    `INSERT INTO greenhouse_core.globe_credit_funding_authority_execution_events
    (execution_id,event_type,event_fingerprint,correlation_id,auth_evidence_ref,evidence)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT (execution_id,event_fingerprint) DO NOTHING`,
    [row.execution_id, eventType, eventFingerprint, correlationId, authEvidenceRef, JSON.stringify(evidence)]
  )
}

function parseIssue(input: Parameters<GlobeCreditFundingOneShotAuthorityStore['issue']>[0], now: Date) {
  refs(
    input.globeWorkspaceId,
    input.periodKey,
    input.issuerUserId,
    input.issuerEntitlement,
    input.issuerAuthProvider,
    input.issuerAuthCorrelationId,
    input.executorUserId,
    input.executorChannel,
    input.executorClientId,
    input.operationKey,
    input.evidenceRef
  )
  if (!HUMAN_AUTH_MODES.has(input.issuerAuthMode)) throw new GlobeCreditFundingAuthorityError('issuer_not_allowed')

  if (!EXECUTOR_AUTH_MODES.has(input.executorAuthMode)) {
    throw new GlobeCreditFundingAuthorityError('authority_binding_mismatch')
  }

  if (!EXECUTOR_CHANNELS.has(input.executorChannel)) {
    throw new GlobeCreditFundingAuthorityError('authority_binding_mismatch')
  }

  if (
    input.executorChannel === 'browser' &&
    (input.executorClientId !== GREENHOUSE_BROWSER_CLIENT_ID ||
      input.executorUserId !== input.issuerUserId ||
      !HUMAN_AUTH_MODES.has(input.executorAuthMode))
  ) {
    throw new GlobeCreditFundingAuthorityError('authority_binding_mismatch')
  }

  const periodStart = iso(input.periodStart)
  const periodEnd = iso(input.periodEnd)

  if (periodStart >= periodEnd) invalid()

  for (const amount of [input.targetAvailableCredits, input.maxGrantCredits, input.maxResultingCapCredits]) {
    if (!Number.isSafeInteger(amount) || amount <= 0) invalid()
  }

  if (input.targetAvailableCredits > input.maxResultingCapCredits) invalid()
  const ttlSeconds = input.ttlSeconds ?? 900

  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) invalid()

  return { ...input, periodStart, periodEnd, ttlSeconds, issuedAt: now.toISOString() }
}

function authority(row: AuthorityRow): GlobeCreditFundingOneShotAuthority {
  return {
    schemaVersion: '1',
    authorityId: row.authority_id,
    globeWorkspaceId: row.globe_workspace_id,
    operationKind: 'ensure_funded',
    periodKey: row.period_key,
    periodStart: iso(row.period_start),
    periodEnd: iso(row.period_end),
    targetAvailableCredits: row.target_available_credits,
    maxGrantCredits: row.max_grant_credits,
    maxResultingCapCredits: row.max_resulting_cap_credits,
    issuerUserId: row.issuer_user_id,
    issuerAuthEvidenceRef: row.issuer_auth_evidence_ref,
    executorUserId: row.executor_user_id,
    executorChannel: row.executor_channel,
    executorClientId: row.executor_client_id,
    executorAuthMode: row.executor_auth_mode,
    notBefore: iso(row.not_before),
    expiresAt: iso(row.expires_at),
    maxExecutions: 1,
    operationKey: row.operation_key,
    instructionFingerprint: row.instruction_fingerprint,
    evidenceRef: row.evidence_ref,
    issuedAt: iso(row.issued_at)
  }
}

function execution(row: ExecutionRow): GlobeCreditFundingAuthorityExecution {
  return {
    schemaVersion: '1',
    executionId: row.execution_id,
    authorityId: row.authority_id,
    operationKey: row.operation_key,
    executionFingerprint: row.execution_fingerprint,
    state: row.state,
    executorChannel: row.executor_channel,
    executorClientId: row.executor_client_id,
    actorAuthMode: row.actor_auth_mode,
    proposeIdempotencyKey: row.propose_idempotency_key,
    confirmIdempotencyKey: row.confirm_idempotency_key,
    reconcileIdempotencyKey: row.reconcile_idempotency_key,
    ...(row.proposal_id ? { proposalId: row.proposal_id } : {}),
    ...(row.plan_fingerprint ? { planFingerprint: row.plan_fingerprint } : {}),
    ...(row.globe_operation_id ? { globeOperationId: row.globe_operation_id } : {}),
    ...(row.outcome ? { outcome: row.outcome } : {}),
    ...(row.dispatch_lease_generation > 0 ? { dispatchLeaseGeneration: row.dispatch_lease_generation } : {}),
    ...(row.dispatch_lease_expires_at ? { dispatchLeaseExpiresAt: iso(row.dispatch_lease_expires_at) } : {}),
    claimedAt: iso(row.claimed_at),
    updatedAt: iso(row.updated_at),
    ...(row.completed_at ? { completedAt: iso(row.completed_at) } : {})
  }
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(stable(value)).digest('hex')
}

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
    .join(',')}}`
}

function refs(...values: string[]) {
  if (values.some(value => !SAFE_REF.test(value))) invalid()
}

function iso(value: string | Date): string {
  const parsed = value instanceof Date ? value : new Date(value)

  if (!Number.isFinite(parsed.getTime())) invalid()

  return parsed.toISOString()
}

function invalid(): never {
  throw new GlobeCreditFundingAuthorityError('invalid_request')
}
