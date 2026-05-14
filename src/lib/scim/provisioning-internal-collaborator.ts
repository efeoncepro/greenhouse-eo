import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { syncOperatingEntityMembershipForMember } from '@/lib/account-360/operating-entity-membership'
import { withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { EligibilityVerdict } from './eligibility'

/**
 * TASK-872 Slice 2 — Provision Internal Collaborator from SCIM (atomic primitive).
 *
 * Mirror pattern TASK-765 `markPaymentOrderPaidAtomic`. Single `withTransaction`
 * envuelve los 6 writes + 3 outbox events. Rollback completo si cualquier step
 * throws.
 *
 * Flow within tx:
 *   1. Idempotency gate: si client_user existe con identity_profile_id + member_id,
 *      retorna {idempotent: true, ...ids} sin emit outbox.
 *   2. UPSERT identity_profile (find by canonical_email or create).
 *   3. UPSERT source_links × 2 (azure_ad/user + greenhouse_auth/client_user).
 *   4. Cascade D-2 resolve member_id (con drift detection per cascade level).
 *   5. INSERT or backfill client_user with identity_profile_id + member_id.
 *   6. INSERT user_role_assignment (skip if existing).
 *   7. Sync operating entity membership (dual-mode helper, same tx).
 *   8. Publish 3 outbox events (scim.user.created + member.created si created_new
 *      + scim.internal_collaborator.provisioned v1).
 *
 * Validated by arch-architect 2026-05-13 (4-pillar Score + 6 issues fixed).
 * Spec: docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProvisionInternalCollaboratorInput {
  readonly email: string
  readonly externalId: string // Entra objectId UUID lowercase
  readonly displayName: string
  readonly microsoftTenantId: string | null
  readonly microsoftEmail: string
  readonly tenantMappingId: string
  readonly defaultRoleCode: string
  readonly active: boolean
  readonly entraJobTitle?: string | null
  readonly eligibilityVerdict: Extract<EligibilityVerdict, { eligible: true }>
}

export type MemberCascadeOutcome =
  | 'reused_by_profile_id'
  | 'reused_by_azure_oid'
  | 'reused_by_email_legacy'
  | 'created_new'
  | 'reactivated_via_oid_reuse'

export interface ProvisionInternalCollaboratorResult {
  readonly idempotent: boolean
  readonly userId: string
  readonly scimId: string
  readonly identityProfileId: string
  readonly memberId: string
  readonly cascadeOutcome: MemberCascadeOutcome
  readonly operatingEntityMembershipAction: 'created' | 'reactivated' | 'updated' | 'deactivated' | 'noop' | 'skipped'
}

export type MemberIdentityDriftKind = 'profile_oid_mismatch' | 'oid_profile_mismatch' | 'email_profile_mismatch'

export class MemberIdentityDriftError extends Error {
  readonly kind: MemberIdentityDriftKind
  readonly memberId: string
  readonly details: Record<string, unknown>

  constructor(input: { kind: MemberIdentityDriftKind; memberId: string; details: Record<string, unknown> }) {
    super(`SCIM provisioning member identity drift (kind=${input.kind}, memberId=${input.memberId})`)
    this.name = 'MemberIdentityDriftError'
    this.kind = input.kind
    this.memberId = input.memberId
    this.details = input.details
  }
}

// ── Row shapes (internal) ───────────────────────────────────────────────────

interface ExistingClientUserRow extends Record<string, unknown> {
  user_id: string
  scim_id: string
  identity_profile_id: string | null
  member_id: string | null
}

interface IdentityProfileRow extends Record<string, unknown> {
  profile_id: string
}

interface MemberRow extends Record<string, unknown> {
  member_id: string
  identity_profile_id: string | null
  azure_oid: string | null
  primary_email: string | null
  active: boolean
}

// ── Helper: identity_profile UPSERT ─────────────────────────────────────────

const buildIdentityProfileIdFromUserId = (userId: string): string =>
  `identity-greenhouse-auth-client-user-${userId}`

const upsertIdentityProfile = async (
  client: PoolClient,
  params: { email: string; displayName: string; entraJobTitle: string | null; clientUserId: string }
): Promise<string> => {
  // Find by canonical_email first
  const existing = await client.query<IdentityProfileRow>(
    `SELECT profile_id FROM greenhouse_core.identity_profiles
     WHERE lower(canonical_email) = lower($1)
     LIMIT 1`,
    [params.email]
  )

  if (existing.rows.length > 0) {
    return existing.rows[0].profile_id
  }

  // Create new — id derived from client_user_id for deterministic linking
  const profileId = buildIdentityProfileIdFromUserId(params.clientUserId)

  await client.query(
    `INSERT INTO greenhouse_core.identity_profiles (
       profile_id, profile_type, canonical_email, full_name, job_title,
       status, active, default_auth_mode,
       primary_source_system, primary_source_object_type, primary_source_object_id,
       created_at, updated_at
     )
     VALUES ($1, 'efeonce_internal', $2, $3, $4, 'active', TRUE, 'sso',
             'greenhouse_auth', 'client_user', $5,
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (profile_id) DO NOTHING`,
    [profileId, params.email.toLowerCase(), params.displayName, params.entraJobTitle, params.clientUserId]
  )

  // Re-SELECT to handle race (someone else INSERTed same profile_id between our SELECT and INSERT)
  const fetched = await client.query<IdentityProfileRow>(
    `SELECT profile_id FROM greenhouse_core.identity_profiles WHERE profile_id = $1`,
    [profileId]
  )

  if (fetched.rows.length === 0) {
    throw new Error(`upsertIdentityProfile: profile_id ${profileId} disappeared mid-tx`)
  }

  return fetched.rows[0].profile_id
}

// ── Helper: identity_profile_source_links UPSERT ────────────────────────────

const upsertSourceLink = async (
  client: PoolClient,
  params: {
    profileId: string
    sourceSystem: 'azure_ad' | 'greenhouse_auth'
    sourceObjectType: 'user' | 'client_user'
    sourceObjectId: string
    sourceEmail: string | null
    sourceDisplayName: string | null
  }
): Promise<void> => {
  const linkId = `identity-source-link-${params.sourceSystem}-${params.sourceObjectType}-${params.sourceObjectId}`

  await client.query(
    `INSERT INTO greenhouse_core.identity_profile_source_links (
       link_id, profile_id, source_system, source_object_type, source_object_id,
       source_user_id, source_email, source_display_name, active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
     ON CONFLICT (profile_id, source_system, source_object_type, source_object_id)
     DO UPDATE SET
       source_user_id = EXCLUDED.source_user_id,
       source_email = EXCLUDED.source_email,
       source_display_name = EXCLUDED.source_display_name,
       active = TRUE,
       updated_at = CURRENT_TIMESTAMP`,
    [
      linkId,
      params.profileId,
      params.sourceSystem,
      params.sourceObjectType,
      params.sourceObjectId,
      params.sourceObjectId,
      params.sourceEmail,
      params.sourceDisplayName
    ]
  )
}

// ── Helper: Cascade D-2 member resolution ───────────────────────────────────

interface MemberResolutionResult {
  readonly memberId: string
  readonly outcome: MemberCascadeOutcome
}

const resolveMemberIdCascade = async (
  client: PoolClient,
  params: {
    profileId: string
    externalId: string
    email: string
    displayName: string
    entraJobTitle: string | null
  }
): Promise<MemberResolutionResult> => {
  // Cascade #1 — find by identity_profile_id (strongest)
  const byProfile = await client.query<MemberRow>(
    `SELECT member_id, identity_profile_id, azure_oid, primary_email, active
     FROM greenhouse_core.members
     WHERE identity_profile_id = $1
     LIMIT 1`,
    [params.profileId]
  )

  if (byProfile.rows.length > 0) {
    const m = byProfile.rows[0]

    // Drift: profile match but azure_oid mismatch
    if (m.azure_oid && m.azure_oid.toLowerCase() !== params.externalId.toLowerCase()) {
      throw new MemberIdentityDriftError({
        kind: 'profile_oid_mismatch',
        memberId: m.member_id,
        details: { currentOid: m.azure_oid, expectedOid: params.externalId, profileId: params.profileId }
      })
    }

    // Backfill azure_oid if missing
    if (!m.azure_oid) {
      await client.query(
        `UPDATE greenhouse_core.members
         SET azure_oid = $1, updated_at = CURRENT_TIMESTAMP
         WHERE member_id = $2`,
        [params.externalId, m.member_id]
      )
    }

    return { memberId: m.member_id, outcome: 'reused_by_profile_id' }
  }

  // Cascade #2 — find by azure_oid
  const byOid = await client.query<MemberRow>(
    `SELECT member_id, identity_profile_id, azure_oid, primary_email, active
     FROM greenhouse_core.members
     WHERE lower(azure_oid) = lower($1)
     LIMIT 1`,
    [params.externalId]
  )

  if (byOid.rows.length > 0) {
    const m = byOid.rows[0]

    // Drift: oid match but identity_profile_id mismatch
    if (m.identity_profile_id && m.identity_profile_id !== params.profileId) {
      throw new MemberIdentityDriftError({
        kind: 'oid_profile_mismatch',
        memberId: m.member_id,
        details: { currentProfileId: m.identity_profile_id, expectedProfileId: params.profileId, azureOid: params.externalId }
      })
    }

    // Backfill identity_profile_id if missing
    if (!m.identity_profile_id) {
      await client.query(
        `UPDATE greenhouse_core.members
         SET identity_profile_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE member_id = $2`,
        [params.profileId, m.member_id]
      )
    }

    // Re-hire OID reuse case: member inactive + active=FALSE → reactivate
    if (!m.active) {
      await client.query(
        `UPDATE greenhouse_core.members
         SET active = TRUE,
             workforce_intake_status = 'pending_intake',
             updated_at = CURRENT_TIMESTAMP
         WHERE member_id = $1`,
        [m.member_id]
      )

      return { memberId: m.member_id, outcome: 'reactivated_via_oid_reuse' }
    }

    return { memberId: m.member_id, outcome: 'reused_by_azure_oid' }
  }

  // Cascade #3 — find by email + azure_oid IS NULL (legacy pre-SCIM member)
  const byEmail = await client.query<MemberRow>(
    `SELECT member_id, identity_profile_id, azure_oid, primary_email, active
     FROM greenhouse_core.members
     WHERE lower(primary_email) = lower($1)
       AND azure_oid IS NULL
     LIMIT 1`,
    [params.email]
  )

  if (byEmail.rows.length > 0) {
    const m = byEmail.rows[0]

    // Drift: email match but identity_profile_id mismatch
    if (m.identity_profile_id && m.identity_profile_id !== params.profileId) {
      throw new MemberIdentityDriftError({
        kind: 'email_profile_mismatch',
        memberId: m.member_id,
        details: { currentProfileId: m.identity_profile_id, expectedProfileId: params.profileId, email: params.email }
      })
    }

    // Backfill both azure_oid + identity_profile_id
    await client.query(
      `UPDATE greenhouse_core.members
       SET azure_oid = $1,
           identity_profile_id = COALESCE(identity_profile_id, $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE member_id = $3`,
      [params.externalId, params.profileId, m.member_id]
    )

    return { memberId: m.member_id, outcome: 'reused_by_email_legacy' }
  }

  // Cascade #4 — INSERT new member with opaque UUID
  const memberId = randomUUID()

  await client.query(
    `INSERT INTO greenhouse_core.members (
       member_id, display_name, primary_email, identity_profile_id, azure_oid,
       role_title, role_title_source, role_title_updated_at,
       active, assignable, status, workforce_intake_status,
       created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6::text, $7,
             CASE WHEN $6::text IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END,
             TRUE, TRUE, 'active', 'pending_intake',
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      memberId,
      params.displayName,
      params.email.toLowerCase(),
      params.profileId,
      params.externalId,
      params.entraJobTitle,
      params.entraJobTitle ? 'entra' : 'unset'
    ]
  )

  return { memberId, outcome: 'created_new' }
}

// ── Helper: client_user INSERT or backfill ──────────────────────────────────

interface ClientUserRow extends Record<string, unknown> {
  user_id: string
  scim_id: string
}

const insertOrBackfillClientUser = async (
  client: PoolClient,
  params: {
    existing: ExistingClientUserRow | null
    email: string
    displayName: string
    externalId: string
    microsoftTenantId: string | null
    microsoftEmail: string
    active: boolean
    identityProfileId: string
    memberId: string
  }
): Promise<{ userId: string; scimId: string; created: boolean }> => {
  if (params.existing) {
    // Backfill missing links
    if (!params.existing.identity_profile_id || !params.existing.member_id) {
      await client.query(
        `UPDATE greenhouse_core.client_users
         SET identity_profile_id = COALESCE(identity_profile_id, $1),
             member_id = COALESCE(member_id, $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [params.identityProfileId, params.memberId, params.existing.user_id]
      )
    }

    return { userId: params.existing.user_id, scimId: params.existing.scim_id, created: false }
  }

  const userId = randomUUID()
  const scimId = randomUUID()

  const result = await client.query<ClientUserRow>(
    `INSERT INTO greenhouse_core.client_users (
       user_id, scim_id, client_id, email, full_name,
       tenant_type, auth_mode, status, active,
       microsoft_oid, microsoft_tenant_id, microsoft_email,
       identity_profile_id, member_id,
       provisioned_by, provisioned_at, created_at, updated_at
     )
     VALUES (
       $1, $2, NULL, $3, $4,
       'efeonce_internal', 'microsoft_sso', 'active', $5,
       $6, $7, $8,
       $9, $10,
       'scim', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     )
     RETURNING user_id, scim_id`,
    [
      userId,
      scimId,
      params.email.toLowerCase(),
      params.displayName,
      params.active,
      params.externalId,
      params.microsoftTenantId,
      params.microsoftEmail.toLowerCase(),
      params.identityProfileId,
      params.memberId
    ]
  )

  return { userId: result.rows[0].user_id, scimId: result.rows[0].scim_id, created: true }
}

// ── Helper: role_assignment INSERT (idempotent) ─────────────────────────────

const ensureRoleAssignment = async (
  client: PoolClient,
  params: { userId: string; roleCode: string }
): Promise<void> => {
  // Idempotent: skip if already exists active for (user_id, role_code, client_id=NULL)
  const existing = await client.query<{ assignment_id: string }>(
    `SELECT assignment_id FROM greenhouse_core.user_role_assignments
     WHERE user_id = $1
       AND role_code = $2
       AND client_id IS NULL
       AND active = TRUE
     LIMIT 1`,
    [params.userId, params.roleCode]
  )

  if (existing.rows.length > 0) return

  await client.query(
    `INSERT INTO greenhouse_core.user_role_assignments (
       assignment_id, user_id, role_code, client_id,
       scope_level, status, active, effective_from,
       assigned_by_user_id, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, NULL,
       NULL, 'active', TRUE, CURRENT_TIMESTAMP,
       'scim-provisioning', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     )`,
    [`scim-role-${randomUUID()}`, params.userId, params.roleCode]
  )
}

// ── Main primitive ──────────────────────────────────────────────────────────

interface ScimInternalCollaboratorProvisionedPayloadV1 {
  schemaVersion: 1
  userId: string
  scimId: string
  identityProfileId: string
  memberId: string
  azureOid: string
  microsoftTenantId: string | null
  primaryEmail: string
  displayName: string
  roleCode: string
  workforceIntakeStatus: 'pending_intake'
  eligibilityVerdict: {
    eligible: true
    reason: 'human_collaborator' | 'admin_allowlist'
    overrideId?: string
  }
  cascadeOutcome: MemberCascadeOutcome
  operatingEntityMembershipAction: ProvisionInternalCollaboratorResult['operatingEntityMembershipAction']
  provisionedAt: string
}

export const provisionInternalCollaboratorFromScim = async (
  input: ProvisionInternalCollaboratorInput
): Promise<ProvisionInternalCollaboratorResult> => {
  return withTransaction(async client => {
    // ── Step 1 — Idempotency gate ──────────────────────────────────────────
    const idempotencyCheck = await client.query<ExistingClientUserRow>(
      `SELECT user_id, scim_id, identity_profile_id, member_id
       FROM greenhouse_core.client_users
       WHERE microsoft_oid = $1
         AND tenant_type = 'efeonce_internal'
       LIMIT 1`,
      [input.externalId]
    )

    const existing: ExistingClientUserRow | null = idempotencyCheck.rows[0] ?? null

    // Full idempotency: ya tiene los 3 IDs coherentes
    if (existing && existing.identity_profile_id && existing.member_id) {
      return {
        idempotent: true,
        userId: existing.user_id,
        scimId: existing.scim_id,
        identityProfileId: existing.identity_profile_id,
        memberId: existing.member_id,
        cascadeOutcome: 'reused_by_profile_id',
        operatingEntityMembershipAction: 'noop'
      }
    }

    // ── Step 2 — UPSERT identity_profile ───────────────────────────────────
    const clientUserIdForProfile = existing?.user_id ?? randomUUID()

    const profileId = await upsertIdentityProfile(client, {
      email: input.email,
      displayName: input.displayName,
      entraJobTitle: input.entraJobTitle ?? null,
      clientUserId: clientUserIdForProfile
    })

    // ── Step 3 — UPSERT source links × 2 ───────────────────────────────────
    await upsertSourceLink(client, {
      profileId,
      sourceSystem: 'azure_ad',
      sourceObjectType: 'user',
      sourceObjectId: input.externalId,
      sourceEmail: input.microsoftEmail.toLowerCase(),
      sourceDisplayName: input.displayName
    })

    // Source link for greenhouse_auth/client_user requires userId — we link
    // after step 5 if creating new (need the actual userId).

    // ── Step 4 — Cascade D-2 resolve member_id ─────────────────────────────
    const memberResolution = await resolveMemberIdCascade(client, {
      profileId,
      externalId: input.externalId,
      email: input.email,
      displayName: input.displayName,
      entraJobTitle: input.entraJobTitle ?? null
    })

    // ── Step 5 — INSERT or backfill client_user ────────────────────────────
    const clientUser = await insertOrBackfillClientUser(client, {
      existing,
      email: input.email,
      displayName: input.displayName,
      externalId: input.externalId,
      microsoftTenantId: input.microsoftTenantId,
      microsoftEmail: input.microsoftEmail,
      active: input.active,
      identityProfileId: profileId,
      memberId: memberResolution.memberId
    })

    // Now we can complete the second source link (greenhouse_auth/client_user)
    await upsertSourceLink(client, {
      profileId,
      sourceSystem: 'greenhouse_auth',
      sourceObjectType: 'client_user',
      sourceObjectId: clientUser.userId,
      sourceEmail: input.email.toLowerCase(),
      sourceDisplayName: input.displayName
    })

    // ── Step 6 — Role assignment ───────────────────────────────────────────
    await ensureRoleAssignment(client, { userId: clientUser.userId, roleCode: input.defaultRoleCode })

    // ── Step 7 — Sync operating entity membership ──────────────────────────
    const membershipResult = await syncOperatingEntityMembershipForMember(memberResolution.memberId, { client })

    // ── Step 8 — Publish outbox events ─────────────────────────────────────

    // Granular: scim.user.created (only if client_user is newly created)
    if (clientUser.created) {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.clientUser,
          aggregateId: clientUser.userId,
          eventType: EVENT_TYPES.scimUserCreated,
          payload: {
            userId: clientUser.userId,
            scimId: clientUser.scimId,
            email: input.email.toLowerCase(),
            microsoftOid: input.externalId,
            clientId: null,
            roleCode: input.defaultRoleCode,
            provisionedBy: 'scim'
          }
        },
        client
      )
    }

    // Granular: member.created (only if member is newly created)
    if (memberResolution.outcome === 'created_new') {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.member,
          aggregateId: memberResolution.memberId,
          eventType: EVENT_TYPES.memberCreated,
          payload: {
            memberId: memberResolution.memberId,
            identityProfileId: profileId,
            azureOid: input.externalId,
            displayName: input.displayName,
            primaryEmail: input.email.toLowerCase(),
            provisionedBy: 'scim',
            workforceIntakeStatus: 'pending_intake'
          }
        },
        client
      )
    }

    // Consolidated: scim.internal_collaborator.provisioned v1
    const consolidatedPayload: ScimInternalCollaboratorProvisionedPayloadV1 = {
      schemaVersion: 1,
      userId: clientUser.userId,
      scimId: clientUser.scimId,
      identityProfileId: profileId,
      memberId: memberResolution.memberId,
      azureOid: input.externalId,
      microsoftTenantId: input.microsoftTenantId,
      primaryEmail: input.email.toLowerCase(),
      displayName: input.displayName,
      roleCode: input.defaultRoleCode,
      workforceIntakeStatus: 'pending_intake',
      eligibilityVerdict: input.eligibilityVerdict,
      cascadeOutcome: memberResolution.outcome,
      operatingEntityMembershipAction: membershipResult.action,
      provisionedAt: new Date().toISOString()
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.clientUser,
        aggregateId: clientUser.userId,
        eventType: EVENT_TYPES.scimInternalCollaboratorProvisioned,
        payload: consolidatedPayload as unknown as Record<string, unknown>
      },
      client
    )

    return {
      idempotent: false,
      userId: clientUser.userId,
      scimId: clientUser.scimId,
      identityProfileId: profileId,
      memberId: memberResolution.memberId,
      cascadeOutcome: memberResolution.outcome,
      operatingEntityMembershipAction: membershipResult.action
    }
  })
}
