import { randomUUID } from 'node:crypto'

import { afterAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

import {
  MemberIdentityDriftError,
  provisionInternalCollaboratorFromScim,
  type ProvisionInternalCollaboratorInput
} from './provisioning-internal-collaborator'

/**
 * TASK-872 Slice 2 — Live PG tests for the atomic primitive.
 *
 * Tests use unique externalId/email per test run (suffix uuid) to avoid
 * collisions. Cleanup via supersede where possible; some rows accumulate
 * intentionally (audit trail design).
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const RUN_ID = `t872p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const buildInput = (suffix: string, overrides: Partial<ProvisionInternalCollaboratorInput> = {}): ProvisionInternalCollaboratorInput => ({
  email: `${RUN_ID}-${suffix}@efeoncepro.com`,
  externalId: randomUUID(),
  displayName: `Test ${suffix}`,
  microsoftTenantId: 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
  microsoftEmail: `${RUN_ID}-${suffix}@efeoncepro.com`,
  tenantMappingId: 'scim-tm-efeonce',
  defaultRoleCode: 'collaborator',
  active: true,
  entraJobTitle: 'Test Role',
  eligibilityVerdict: { eligible: true, reason: 'human_collaborator' },
  ...overrides
})

const createdUserIds: string[] = []
const createdMemberIds: string[] = []

const trackResult = <T extends { userId: string; memberId: string }>(r: T): T => {
  createdUserIds.push(r.userId)
  createdMemberIds.push(r.memberId)

  return r
}

const cleanupTestData = async () => {
  // Soft-disable test users/members so they don't pollute production-like reads.
  for (const userId of createdUserIds) {
    try {
      await query(
        `UPDATE greenhouse_core.client_users SET active = FALSE, status = 'deactivated' WHERE user_id = $1`,
        [userId]
      )
    } catch {
      // best effort
    }
  }

  for (const memberId of createdMemberIds) {
    try {
      await query(
        `UPDATE greenhouse_core.members SET active = FALSE, status = 'inactive' WHERE member_id = $1`,
        [memberId]
      )
    } catch {
      // best effort
    }
  }
}

describe.skipIf(!hasPgConfig)('provisionInternalCollaboratorFromScim — live PG', () => {
  afterAll(async () => {
    await cleanupTestData()
  })

  describe('happy path — full provisioning', () => {
    it('creates 6 entities atomically + emits 3 outbox events', async () => {
      const input = buildInput('happy')

      const result = trackResult(await provisionInternalCollaboratorFromScim(input))

      expect(result.idempotent).toBe(false)
      expect(result.cascadeOutcome).toBe('created_new')
      expect(result.operatingEntityMembershipAction).toBe('created')
      expect(result.userId).toBeTypeOf('string')
      expect(result.identityProfileId).toBeTypeOf('string')
      expect(result.memberId).toBeTypeOf('string')

      // Verify all 6 entities exist + correctly linked
      const [user] = await query<{
        identity_profile_id: string | null
        member_id: string | null
        microsoft_oid: string
        tenant_type: string
      }>(
        `SELECT identity_profile_id, member_id, microsoft_oid, tenant_type
         FROM greenhouse_core.client_users WHERE user_id = $1`,
        [result.userId]
      )

      expect(user.identity_profile_id).toBe(result.identityProfileId)
      expect(user.member_id).toBe(result.memberId)
      expect(user.microsoft_oid).toBe(input.externalId)
      expect(user.tenant_type).toBe('efeonce_internal')

      const [profile] = await query<{ canonical_email: string; profile_type: string }>(
        `SELECT canonical_email, profile_type FROM greenhouse_core.identity_profiles WHERE profile_id = $1`,
        [result.identityProfileId]
      )

      expect(profile.canonical_email).toBe(input.email.toLowerCase())
      expect(profile.profile_type).toBe('efeonce_internal')

      const [member] = await query<{
        identity_profile_id: string | null
        azure_oid: string | null
        workforce_intake_status: string
        active: boolean
      }>(
        `SELECT identity_profile_id, azure_oid, workforce_intake_status, active
         FROM greenhouse_core.members WHERE member_id = $1`,
        [result.memberId]
      )

      expect(member.identity_profile_id).toBe(result.identityProfileId)
      expect(member.azure_oid).toBe(input.externalId)
      expect(member.workforce_intake_status).toBe('pending_intake')
      expect(member.active).toBe(true)

      // Source links × 2
      const sourceLinks = await query<{ source_system: string; source_object_type: string }>(
        `SELECT source_system, source_object_type FROM greenhouse_core.identity_profile_source_links
         WHERE profile_id = $1 ORDER BY source_system`,
        [result.identityProfileId]
      )

      const linkPairs = sourceLinks.map(s => `${s.source_system}/${s.source_object_type}`)

      expect(linkPairs).toContain('azure_ad/user')
      expect(linkPairs).toContain('greenhouse_auth/client_user')

      // Role assignment
      const roles = await query<{ role_code: string; active: boolean }>(
        `SELECT role_code, active FROM greenhouse_core.user_role_assignments
         WHERE user_id = $1 AND active = TRUE`,
        [result.userId]
      )

      expect(roles.some(r => r.role_code === 'collaborator')).toBe(true)

      // Operating entity membership (operating entity = Efeonce)
      const memberships = await query<{ is_primary: boolean; active: boolean }>(
        `SELECT pm.is_primary, pm.active
         FROM greenhouse_core.person_memberships pm
         JOIN greenhouse_core.organizations o ON o.organization_id = pm.organization_id
         WHERE pm.profile_id = $1 AND o.is_operating_entity = TRUE`,
        [result.identityProfileId]
      )

      expect(memberships.some(m => m.is_primary && m.active)).toBe(true)

      // Outbox events: scim.user.created + member.created + scim.internal_collaborator.provisioned
      const events = await query<{ event_type: string }>(
        `SELECT event_type FROM greenhouse_sync.outbox_events
         WHERE aggregate_id IN ($1, $2)
           AND event_type IN ('scim.user.created', 'member.created', 'scim.internal_collaborator.provisioned')
         ORDER BY event_type`,
        [result.userId, result.memberId]
      )

      const eventTypes = events.map(e => e.event_type)

      expect(eventTypes).toContain('scim.user.created')
      expect(eventTypes).toContain('member.created')
      expect(eventTypes).toContain('scim.internal_collaborator.provisioned')
    })
  })

  describe('idempotency gate', () => {
    it('returns idempotent: true on second call without re-emitting outbox', async () => {
      const input = buildInput('idempotent')

      const first = trackResult(await provisionInternalCollaboratorFromScim(input))

      const initialEventCount = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM greenhouse_sync.outbox_events
         WHERE aggregate_id IN ($1, $2)
           AND event_type = 'scim.internal_collaborator.provisioned'`,
        [first.userId, first.memberId]
      )

      const second = await provisionInternalCollaboratorFromScim(input)

      expect(second.idempotent).toBe(true)
      expect(second.userId).toBe(first.userId)
      expect(second.memberId).toBe(first.memberId)
      expect(second.identityProfileId).toBe(first.identityProfileId)

      // No new outbox events from second call
      const finalEventCount = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM greenhouse_sync.outbox_events
         WHERE aggregate_id IN ($1, $2)
           AND event_type = 'scim.internal_collaborator.provisioned'`,
        [first.userId, first.memberId]
      )

      expect(finalEventCount[0].count).toBe(initialEventCount[0].count)
    })
  })

  describe('atomicity rollback', () => {
    it('rolls back ALL writes if any step throws mid-tx', async () => {
      // Provoke drift: pre-insert a member with a different identity_profile_id linked to same azure_oid
      const externalId = randomUUID()
      const otherProfileId = `identity-test-drift-${randomUUID()}`
      const otherMemberId = randomUUID()

      // Seed the conflicting state
      await query(
        `INSERT INTO greenhouse_core.identity_profiles (
           profile_id, profile_type, canonical_email, full_name, status, active, default_auth_mode,
           primary_source_system, primary_source_object_type, primary_source_object_id,
           created_at, updated_at
         )
         VALUES ($1, 'efeonce_internal', $2, $3, 'active', TRUE, 'sso',
                 'greenhouse_auth', 'client_user', 'test-seed',
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (profile_id) DO NOTHING`,
        [otherProfileId, `${RUN_ID}-other@efeoncepro.com`, 'Other Person']
      )

      await query(
        `INSERT INTO greenhouse_core.members (
           member_id, display_name, primary_email, identity_profile_id, azure_oid,
           active, assignable, status, workforce_intake_status, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, 'active', 'completed',
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [otherMemberId, 'Other', `${RUN_ID}-other@efeoncepro.com`, otherProfileId, externalId]
      )

      const input = buildInput('drift', { externalId })

      // The primitive should throw drift error
      await expect(provisionInternalCollaboratorFromScim(input)).rejects.toThrow(MemberIdentityDriftError)

      // Verify NO client_user was created for this externalId
      const orphanUsers = await query<{ user_id: string }>(
        `SELECT user_id FROM greenhouse_core.client_users WHERE microsoft_oid = $1`,
        [externalId]
      )

      // Should be 0 — atomic rollback
      expect(orphanUsers).toHaveLength(0)

      // Cleanup seed
      createdMemberIds.push(otherMemberId)
    })
  })

  describe('cascade D-2 — reuse existing member by profile_id', () => {
    it('reuses member when identity_profile_id already linked (Felipe/Maria backfill case)', async () => {
      // Simula Felipe/Maria state: client_user + identity_profile + identity_profile_id linked
      // pero NO member existe todavía. Cascade #1 lookup va a NO encontrar match (no member with profileId).
      // Entonces cascade va a #4 (INSERT new member). Verify this path.
      const input = buildInput('cascade-fresh')

      const result = trackResult(await provisionInternalCollaboratorFromScim(input))

      expect(result.idempotent).toBe(false)
      expect(result.cascadeOutcome).toBe('created_new')

      // Re-run with same input → cascade #1 hits (member now has profileId) → reused_by_profile_id
      const second = await provisionInternalCollaboratorFromScim(input)

      expect(second.idempotent).toBe(true) // client_user has identity_profile_id + member_id
      expect(second.userId).toBe(result.userId)
      expect(second.memberId).toBe(result.memberId)
    })

    it('reuses member by profile_id when client_user already complete (backfill case)', async () => {
      // Simula Felipe state: client_user existe con identity_profile_id PERO sin member_id.
      // Pre-condición: provision normalmente para obtener IDs.
      const input = buildInput('cascade-backfill')
      const first = trackResult(await provisionInternalCollaboratorFromScim(input))

      expect(first.cascadeOutcome).toBe('created_new')

      // Clear member_id en el client_user para simular Felipe state (client_user + profile + member existen
      // pero client_user.member_id es NULL — backfill scenario).
      await query(
        `UPDATE greenhouse_core.client_users SET member_id = NULL WHERE user_id = $1`,
        [first.userId]
      )

      // Re-provision — el idempotency gate detecta missing member_id → continúa cascade.
      // Cascade #1 (identity_profile_id match) hits → reused_by_profile_id.
      const second = await provisionInternalCollaboratorFromScim(input)

      expect(second.idempotent).toBe(false)
      expect(second.cascadeOutcome).toBe('reused_by_profile_id')
      expect(second.memberId).toBe(first.memberId)
      expect(second.userId).toBe(first.userId)

      // Verify member_id ha sido backfilled en client_user
      const [user] = await query<{ member_id: string | null }>(
        `SELECT member_id FROM greenhouse_core.client_users WHERE user_id = $1`,
        [first.userId]
      )

      expect(user.member_id).toBe(first.memberId)
    })
  })
})
