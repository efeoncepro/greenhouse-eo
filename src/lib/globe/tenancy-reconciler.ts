import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { GLOBE_CAPABILITIES, type GlobeCapability } from '@efeonce-globe/contracts'
import type {
  BrokerBindingStateV1,
  BrokerTenancySnapshotV2,
  ProjectedMemberStateV1
} from '@efeonce-globe/contracts/tenancy'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type GlobeProjectedBindingState = BrokerBindingStateV1
export type GlobeProjectedMemberState = ProjectedMemberStateV1

export type GlobeDesiredMember = Readonly<{
  identitySubject: string
  state: GlobeProjectedMemberState
  desiredCapabilities: readonly GlobeCapability[]
}>

export type GlobeDesiredWorkspace = Readonly<{
  workspaceId: string
  brokerBindingId: string
  bindingState: GlobeProjectedBindingState
  members: readonly GlobeDesiredMember[]
}>

export type GlobeTenancySnapshotV2 = BrokerTenancySnapshotV2

type MemberCursor = Readonly<{ fingerprint: string; revision: number }>
type MemberCursorMap = Readonly<Record<string, MemberCursor>>

export type GlobeReconciliationClaim = Readonly<{
  leaseToken: string
  workspaceRevision: number
  workspaceFingerprint: string
  memberCursors: MemberCursorMap
}>

export type GlobeTenancyReconcileCommand = (input: Readonly<{
  workspaceId: string
  idempotencyKey: string
  correlationId: string
  snapshot: GlobeTenancySnapshotV2
}>) => Promise<void>

export type GlobeTenancyReconcilerDependencies = Readonly<{
  loadDesiredWorkspaces: () => Promise<readonly GlobeDesiredWorkspace[]>
  claimWorkspace: (workspace: GlobeDesiredWorkspace) => Promise<GlobeReconciliationClaim | null>
  completeWorkspace: (
    workspaceId: string,
    claim: GlobeReconciliationClaim,
    reconciliationId: string
  ) => Promise<void>
  failWorkspace: (workspaceId: string, leaseToken: string, errorCode: string) => Promise<void>
  reconcile: GlobeTenancyReconcileCommand
  now?: () => Date
  randomId?: () => string
}>

export type GlobeTenancyReconciliationResult = Readonly<{
  discovered: number
  reconciled: number
  contended: number
  failed: number
}>

const SNAPSHOT_LEASE_MS = 12 * 60 * 1000
const CLAIM_LEASE_MS = 4 * 60 * 1000
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/
const KNOWN_GLOBE_CAPABILITIES = new Set<string>(GLOBE_CAPABILITIES)

export async function runGlobeTenancyReconciliation(
  dependencies: GlobeTenancyReconcilerDependencies
): Promise<GlobeTenancyReconciliationResult> {
  const workspaces = normalizeDesiredWorkspaces(await dependencies.loadDesiredWorkspaces())
  let reconciled = 0
  let contended = 0
  let failed = 0

  for (const workspace of workspaces) {
    const claim = await dependencies.claimWorkspace(workspace)

    if (!claim) {
      contended += 1
      continue
    }

    const now = dependencies.now?.() ?? new Date()
    const reconciliationId = dependencies.randomId?.() ?? randomUUID()
    const snapshot = buildSnapshot(workspace, claim, reconciliationId, now)
    const correlationId = `globe-tenancy-${reconciliationId}`
    const idempotencyKey = buildIdempotencyKey(workspace.workspaceId, reconciliationId)

    try {
      await dependencies.reconcile({
        workspaceId: workspace.workspaceId,
        idempotencyKey,
        correlationId,
        snapshot
      })
      await dependencies.completeWorkspace(workspace.workspaceId, claim, reconciliationId)
      reconciled += 1
    } catch (error) {
      failed += 1
      await dependencies
        .failWorkspace(workspace.workspaceId, claim.leaseToken, sanitizeErrorCode(error))
        .catch(() => undefined)
    }
  }

  return { discovered: workspaces.length, reconciled, contended, failed }
}

export function buildSnapshot(
  workspace: GlobeDesiredWorkspace,
  claim: GlobeReconciliationClaim,
  reconciliationId: string,
  now: Date
): GlobeTenancySnapshotV2 {
  const issuedAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + SNAPSHOT_LEASE_MS).toISOString()

  return {
    schemaVersion: '2',
    brokerBindingId: workspace.brokerBindingId,
    bindingState: workspace.bindingState,
    workspaceRevision: claim.workspaceRevision,
    reconciliationId,
    issuedAt,
    expiresAt,
    members: workspace.members.map(member => ({
      identityIssuer: 'greenhouse',
      identitySubject: member.identitySubject,
      state: member.state,
      memberRevision: requireMemberCursor(claim.memberCursors, member.identitySubject).revision,
      desiredCapabilities: member.desiredCapabilities,
      expiresAt
    }))
  }
}

export function planSemanticCursor(
  workspace: GlobeDesiredWorkspace,
  previous: Readonly<{
    workspaceRevision: number
    workspaceFingerprint: string | null
    memberCursors: MemberCursorMap
  }>
): Omit<GlobeReconciliationClaim, 'leaseToken'> {
  // Retain absent subjects as durable tombstones. A later re-add must continue
  // its monotonic member revision and must not replay the revision Globe
  // already revoked when the subject disappeared from a full snapshot.
  const memberCursors: Record<string, MemberCursor> = { ...previous.memberCursors }
  const presentSubjects = new Set(workspace.members.map(member => member.identitySubject))

  for (const [subject, prior] of Object.entries(previous.memberCursors)) {
    if (presentSubjects.has(subject)) continue

    const fingerprint = fingerprintAbsentMember(subject)

    memberCursors[subject] = {
      fingerprint,
      revision:
        prior.fingerprint === fingerprint
          ? prior.revision
          : incrementRevision(prior.revision, 'member')
    }
  }

  for (const member of workspace.members) {
    const fingerprint = fingerprintMember(member)
    const prior = previous.memberCursors[member.identitySubject]

    memberCursors[member.identitySubject] = {
      fingerprint,
      revision:
        prior?.fingerprint === fingerprint
          ? prior.revision
          : incrementRevision(prior?.revision ?? 0, 'member')
    }
  }

  const workspaceFingerprint = fingerprintWorkspace(workspace, memberCursors)

  return {
    workspaceFingerprint,
    workspaceRevision:
      previous.workspaceFingerprint === workspaceFingerprint
        ? previous.workspaceRevision
        : incrementRevision(previous.workspaceRevision, 'workspace'),
    memberCursors
  }
}

export async function loadCanonicalGlobeDesiredWorkspaces(): Promise<readonly GlobeDesiredWorkspace[]> {
  const rows = await runGreenhousePostgresQuery<DesiredWorkspaceRow>(DESIRED_WORKSPACES_SQL)
  const policy = parsePolicy(rows[0]?.policy_json)
  const byWorkspace = new Map<string, GlobeDesiredWorkspace>()

  for (const row of rows) {
    const workspaceId = normalizeId(row.workspace_id, 'workspace_id')
    const brokerBindingId = normalizeId(row.broker_binding_id, 'broker_binding_id')
    const bindingState = normalizeBindingState(row.binding_status)
    const existing = byWorkspace.get(workspaceId)

    const members =
      bindingState === 'active'
        ? parseIdentitySubjects(row.identity_subjects)
            .filter(subject => policy.allowedTenantSubjects.has(subject.tenantType))
            .map(subject => ({
              identitySubject: `greenhouse:user:${subject.userId}`,
              state: 'active' as const,
              desiredCapabilities: policy.capabilities
            }))
        : []

    const workspace: GlobeDesiredWorkspace = {
      workspaceId,
      brokerBindingId,
      bindingState,
      members
    }

    if (existing && JSON.stringify(existing) !== JSON.stringify(workspace)) {
      throw new Error('globe_tenancy_duplicate_workspace_binding')
    }

    byWorkspace.set(workspaceId, workspace)
  }

  return [...byWorkspace.values()]
}

export async function claimCanonicalGlobeWorkspace(
  workspace: GlobeDesiredWorkspace
): Promise<GlobeReconciliationClaim | null> {
  const leaseToken = randomUUID()

  const rows = await runGreenhousePostgresQuery<ReconciliationStateRow>(
    CLAIM_WORKSPACE_SQL,
    [workspace.workspaceId, workspace.brokerBindingId, leaseToken, CLAIM_LEASE_MS]
  )

  const row = rows[0]

  if (!row) return null

  const prior = {
    workspaceRevision: toNonNegativeInteger(row.workspace_revision),
    workspaceFingerprint: row.workspace_fingerprint,
    memberCursors: parseMemberCursors(row.member_revisions)
  }

  const planned = planSemanticCursor(workspace, prior)

  return { leaseToken, ...planned }
}

export async function completeCanonicalGlobeWorkspace(
  workspaceId: string,
  claim: GlobeReconciliationClaim,
  reconciliationId: string
): Promise<void> {
  const rows = await runGreenhousePostgresQuery<{ workspace_id: string }>(
    COMPLETE_WORKSPACE_SQL,
    [
      workspaceId,
      claim.leaseToken,
      claim.workspaceRevision,
      claim.workspaceFingerprint,
      JSON.stringify(claim.memberCursors),
      reconciliationId
    ]
  )

  if (rows.length !== 1) throw new Error('globe_tenancy_reconciliation_lease_lost')
}

export async function failCanonicalGlobeWorkspace(
  workspaceId: string,
  leaseToken: string,
  errorCode: string
): Promise<void> {
  await runGreenhousePostgresQuery(FAIL_WORKSPACE_SQL, [workspaceId, leaseToken, errorCode])
}

function normalizeDesiredWorkspaces(input: readonly GlobeDesiredWorkspace[]) {
  return [...input]
    .map(workspace => {
      const members = [...workspace.members]
        .map(member => ({
          identitySubject: normalizeId(member.identitySubject, 'identity_subject'),
          state: member.state,
          desiredCapabilities: [...new Set(member.desiredCapabilities)].sort().map(normalizeCapability)
        }))
        .sort((left, right) => left.identitySubject.localeCompare(right.identitySubject))

      if (members.some((member, index) => member.identitySubject === members[index - 1]?.identitySubject)) {
        throw new Error('globe_tenancy_duplicate_member')
      }

      return {
        workspaceId: normalizeId(workspace.workspaceId, 'workspace_id'),
        brokerBindingId: normalizeId(workspace.brokerBindingId, 'broker_binding_id'),
        bindingState: workspace.bindingState,
        members
      }
    })
    .sort((left, right) => left.workspaceId.localeCompare(right.workspaceId))
}

function fingerprintMember(member: GlobeDesiredMember) {
  return sha256(JSON.stringify([member.identitySubject, member.state, [...member.desiredCapabilities].sort()]))
}

function fingerprintAbsentMember(identitySubject: string) {
  return sha256(JSON.stringify([identitySubject, 'absent']))
}

function fingerprintWorkspace(workspace: GlobeDesiredWorkspace, cursors: MemberCursorMap) {
  return sha256(
    JSON.stringify([
      workspace.brokerBindingId,
      workspace.bindingState,
      workspace.members.map(member => [member.identitySubject, cursors[member.identitySubject]?.fingerprint])
    ])
  )
}

function buildIdempotencyKey(workspaceId: string, reconciliationId: string) {
  return `gh-globe-tenancy-v2:${sha256(`${workspaceId}:${reconciliationId}`)}`
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeId(value: string, field: string) {
  const normalized = value.trim()

  if (!SAFE_ID.test(normalized)) throw new Error(`globe_tenancy_${field}_invalid`)

  return normalized
}

function normalizeCapability(value: string): GlobeCapability {
  const normalized = value.trim()

  if (!KNOWN_GLOBE_CAPABILITIES.has(normalized)) throw new Error('globe_tenancy_capability_invalid')

  return normalized as GlobeCapability
}

function normalizeBindingState(value: string): GlobeProjectedBindingState {
  if (value === 'active') return 'active'
  if (value === 'suspended') return 'suspended'

  return 'revoked'
}

function requireMemberCursor(cursors: MemberCursorMap, subject: string) {
  const cursor = cursors[subject]

  if (!cursor) throw new Error('globe_tenancy_member_cursor_missing')

  return cursor
}

function toNonNegativeInteger(value: string | number) {
  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('globe_tenancy_cursor_invalid')

  return parsed
}

function toPositiveInteger(value: string | number) {
  const parsed = toNonNegativeInteger(value)

  if (parsed === 0) throw new Error('globe_tenancy_member_cursor_invalid')

  return parsed
}

function incrementRevision(value: number, scope: 'workspace' | 'member') {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw new Error(`globe_tenancy_${scope}_revision_exhausted`)
  }

  return value + 1
}

function parseMemberCursors(value: unknown): MemberCursorMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const result: Record<string, MemberCursor> = {}

  for (const [subject, candidate] of Object.entries(value)) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('globe_tenancy_member_cursor_invalid')
    }

    const fingerprint = 'fingerprint' in candidate ? candidate.fingerprint : undefined
    const revision = 'revision' in candidate ? candidate.revision : undefined

    if (typeof fingerprint !== 'string') throw new Error('globe_tenancy_member_cursor_invalid')
    result[normalizeId(subject, 'identity_subject')] = {
      fingerprint,
      revision: toPositiveInteger(revision as number)
    }
  }

  return result
}

function sanitizeErrorCode(error: unknown) {
  const raw =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'unexpected_error'

  const normalized = raw.toLowerCase().replace(/[^a-z0-9._-]+/g, '_').slice(0, 96)

  return normalized || 'unknown'
}

type DesiredWorkspaceRow = {
  workspace_id: string
  broker_binding_id: string
  binding_status: string
  identity_subjects: unknown
  policy_json: unknown
}

type ReconciliationStateRow = {
  workspace_revision: string | number
  workspace_fingerprint: string | null
  member_revisions: unknown
}

function parsePolicy(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('globe_tenancy_oauth_policy_missing')
  }

  const policy = value as Record<string, unknown>

  const capabilities = Array.isArray(policy.capabilityScopes)
    ? policy.capabilityScopes.map(item => {
        if (typeof item !== 'string') throw new Error('globe_tenancy_oauth_policy_invalid')

        return normalizeCapability(item)
      })
    : []

  const audience = policy.audience

  const audienceRecord =
    audience && typeof audience === 'object' && !Array.isArray(audience)
      ? (audience as Record<string, unknown>)
      : null

  const tenantTypes =
    audienceRecord && Array.isArray(audienceRecord.tenantTypes)
      ? audienceRecord.tenantTypes
      : []

  if (capabilities.length === 0 || tenantTypes.length === 0) {
    throw new Error('globe_tenancy_oauth_policy_invalid')
  }

  return {
    capabilities: [...new Set(capabilities)].sort(),
    allowedTenantSubjects: new Set(
      tenantTypes.map((value: unknown) => {
        if (value !== 'efeonce_internal' && value !== 'client') {
          throw new Error('globe_tenancy_oauth_policy_invalid')
        }

        return value
      })
    )
  }
}

function parseIdentitySubjects(value: unknown): Array<{ userId: string; tenantType: 'efeonce_internal' | 'client' }> {
  if (!Array.isArray(value)) throw new Error('globe_tenancy_identity_projection_invalid')

  return value.map(candidate => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('globe_tenancy_identity_projection_invalid')
    }

    const userId = 'userId' in candidate ? candidate.userId : undefined
    const tenantType = 'tenantType' in candidate ? candidate.tenantType : undefined

    if (typeof userId !== 'string' || (tenantType !== 'efeonce_internal' && tenantType !== 'client')) {
      throw new Error('globe_tenancy_identity_projection_invalid')
    }

    return { userId: normalizeId(userId, 'user_id'), tenantType }
  })
}

const DESIRED_WORKSPACES_SQL = `
  WITH globe_policy AS (
    SELECT policy_json
    FROM greenhouse_core.sister_platform_oauth_clients
    WHERE lower(client_id) = 'globe'
      AND client_status = 'active'
    LIMIT 1
  ),
  active_admins AS (
    SELECT DISTINCT user_id
    FROM greenhouse_core.user_role_assignments
    WHERE role_code = 'efeonce_admin'
      AND COALESCE(active, TRUE) = TRUE
      AND status = 'active'
      AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
      AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
  ),
  active_assignments AS (
    SELECT DISTINCT member_id, client_id
    FROM greenhouse_core.client_team_assignments
    WHERE COALESCE(active, TRUE) = TRUE
      AND (start_date IS NULL OR start_date <= CURRENT_DATE)
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ),
  current_bindings AS (
    SELECT
      b.external_scope_id AS workspace_id,
      b.external_scope_id AS broker_binding_id,
      b.binding_status,
      b.greenhouse_scope_type,
      b.organization_id,
      b.client_id,
      b.space_id
    FROM greenhouse_core.sister_platform_bindings AS b
    WHERE b.sister_platform_key = 'globe'
      AND b.binding_status IN ('active', 'suspended', 'deprecated')
  ),
  binding_subjects AS (
    SELECT
      b.workspace_id,
      jsonb_agg(
        DISTINCT jsonb_build_object('userId', cu.user_id, 'tenantType', cu.tenant_type)
      ) FILTER (WHERE cu.user_id IS NOT NULL) AS identity_subjects
    FROM current_bindings AS b
    LEFT JOIN greenhouse_core.client_users AS cu
      ON COALESCE(cu.active, TRUE) = TRUE
      AND cu.status IN ('active', 'invited')
      AND (
        (b.greenhouse_scope_type = 'internal' AND cu.tenant_type = 'efeonce_internal')
        OR cu.user_id IN (SELECT user_id FROM active_admins)
        OR (
          b.greenhouse_scope_type = 'organization'
          AND EXISTS (
            SELECT 1
            FROM greenhouse_core.spaces AS organization_space
            WHERE organization_space.organization_id = b.organization_id
              AND organization_space.client_id = cu.client_id
              AND COALESCE(organization_space.active, TRUE) = TRUE
          )
        )
        OR (
          b.greenhouse_scope_type = 'client'
          AND (
            cu.client_id = b.client_id
            OR EXISTS (
              SELECT 1 FROM active_assignments AS assignment
              WHERE assignment.member_id = cu.member_id
                AND assignment.client_id = b.client_id
            )
          )
        )
        OR (
          b.greenhouse_scope_type = 'space'
          AND (
            cu.client_id = b.client_id
            OR EXISTS (
              SELECT 1 FROM active_assignments AS assignment
              WHERE assignment.member_id = cu.member_id
                AND assignment.client_id = b.client_id
            )
          )
        )
      )
    GROUP BY b.workspace_id
  ),
  removed_bindings AS (
    SELECT
      state.workspace_id,
      state.broker_binding_id,
      'deprecated'::text AS binding_status,
      '[]'::jsonb AS identity_subjects
    FROM greenhouse_sync.globe_tenancy_reconciliation_state AS state
    WHERE NOT EXISTS (
      SELECT 1 FROM current_bindings AS current
      WHERE current.workspace_id = state.workspace_id
    )
  )
  SELECT
    current.workspace_id,
    current.broker_binding_id,
    current.binding_status,
    COALESCE(subjects.identity_subjects, '[]'::jsonb) AS identity_subjects,
    policy.policy_json
  FROM current_bindings AS current
  LEFT JOIN binding_subjects AS subjects USING (workspace_id)
  CROSS JOIN globe_policy AS policy
  UNION ALL
  SELECT
    removed.workspace_id,
    removed.broker_binding_id,
    removed.binding_status,
    removed.identity_subjects,
    policy.policy_json
  FROM removed_bindings AS removed
  CROSS JOIN globe_policy AS policy
  ORDER BY workspace_id
`

const CLAIM_WORKSPACE_SQL = `
  INSERT INTO greenhouse_sync.globe_tenancy_reconciliation_state (
    workspace_id,
    broker_binding_id,
    lease_token,
    lease_expires_at
  )
  VALUES ($1, $2, $3::uuid, CURRENT_TIMESTAMP + ($4::bigint * INTERVAL '1 millisecond'))
  ON CONFLICT (workspace_id) DO UPDATE SET
    broker_binding_id = EXCLUDED.broker_binding_id,
    lease_token = EXCLUDED.lease_token,
    lease_expires_at = EXCLUDED.lease_expires_at,
    updated_at = CURRENT_TIMESTAMP
  WHERE globe_tenancy_reconciliation_state.lease_expires_at IS NULL
     OR globe_tenancy_reconciliation_state.lease_expires_at <= CURRENT_TIMESTAMP
  RETURNING workspace_revision, workspace_fingerprint, member_revisions
`

const COMPLETE_WORKSPACE_SQL = `
  UPDATE greenhouse_sync.globe_tenancy_reconciliation_state
  SET
    workspace_revision = $3,
    workspace_fingerprint = $4,
    member_revisions = $5::jsonb,
    lease_token = NULL,
    lease_expires_at = NULL,
    last_reconciliation_id = $6::uuid,
    last_reconciled_at = CURRENT_TIMESTAMP,
    last_error_code = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE workspace_id = $1
    AND lease_token = $2::uuid
  RETURNING workspace_id
`

const FAIL_WORKSPACE_SQL = `
  UPDATE greenhouse_sync.globe_tenancy_reconciliation_state
  SET
    lease_token = NULL,
    lease_expires_at = NULL,
    last_error_code = $3,
    updated_at = CURRENT_TIMESTAMP
  WHERE workspace_id = $1
    AND lease_token = $2::uuid
`
