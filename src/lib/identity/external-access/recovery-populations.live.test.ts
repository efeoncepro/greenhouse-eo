/** SQL verification on transaction-local clones of the explicitly approved canary. No runtime changes. */
import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'
import { describe, expect, it, vi } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'

const state = vi.hoisted(() => ({ client: null as PoolClient | null }))

vi.mock('@/lib/db', async original => {
  const actual = await original<Record<string, unknown>>()

  const rewrite = (sql: string) =>
    sql.replaceAll('greenhouse_core.', 'pg_temp.').replaceAll('greenhouse_sync.', 'pg_temp.')

  return {
    ...actual,
    query: async (sql: string, values?: unknown[]) => {
      if (!state.client) throw new Error('fixture_not_ready')

      return (await state.client.query(rewrite(sql), values)).rows
    },
    withTransaction: async <T>(work: (client: PoolClient) => Promise<T>) => {
      if (!state.client) throw new Error('fixture_not_ready')
      await state.client.query('SAVEPOINT internal_command')

      try {
        const result = await work({
          query: (sql: string, values?: unknown[]) => state.client!.query(rewrite(sql), values)
        } as PoolClient)

        await state.client.query('RELEASE SAVEPOINT internal_command')

        return result
      } catch (error) {
        await state.client.query('ROLLBACK TO SAVEPOINT internal_command')
        throw error
      }
    }
  }
})
import { getGreenhousePostgresPool } from '@/lib/db'
import { server } from '@/mocks/node'
import { enrollInternalNativeIdentity } from '../internal-access/commands'
import { resolveExternalAccess } from './resolve-external-access'
import {
  bindExternalOrganization,
  issueExternalInvitation,
  acceptExternalInvitation,
  grantExternalCapability
} from './commands'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

const profileId = 'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes'

describe.skipIf(!configured)('TASK-1836 recovery population isolation with real SQL', () => {
  it('replaces external subjects and atomically rejects recovery over active corporate enrollment', async () => {
    server.close()
    applyGreenhousePostgresProfile('ops')
    const client = await (await getGreenhousePostgresPool()).connect()

    state.client = client

    try {
      await client.query('BEGIN')

      const core = [
        'identity_profiles',
        'client_users',
        'members',
        'identity_profile_source_links',
        'organizations',
        'person_memberships',
        'person_legal_entity_relationships',
        'external_identity_environments',
        'external_organization_bindings',
        'external_capability_grants',
        'external_member_invitations',
        'external_identity_audit_log',
        'external_access_resolution_log',
        'internal_native_enrollments',
        'internal_native_access_audit'
      ]

      for (const table of core)
        await client.query(`CREATE TEMP TABLE ${table}(LIKE greenhouse_core.${table} INCLUDING ALL) ON COMMIT DROP`)
      await client.query(
        "ALTER TABLE pg_temp.external_organization_bindings ADD COLUMN IF NOT EXISTS population text NOT NULL DEFAULT 'external'"
      )
      await client.query(
        'ALTER TABLE pg_temp.external_identity_audit_log DROP CONSTRAINT external_identity_audit_log_event_type_valid'
      )
      await client.query(
        'ALTER TABLE pg_temp.external_access_resolution_log DROP CONSTRAINT external_access_resolution_log_outcome_valid'
      )
      await client.query(
        "ALTER TABLE pg_temp.external_access_resolution_log ADD CONSTRAINT external_access_resolution_log_outcome_valid CHECK(outcome IN ('bound','unbound','revoked','environment_inactive','profile_inactive','internal_population'))"
      )
      await client.query(
        'CREATE TEMP TABLE outbox_events(LIKE greenhouse_sync.outbox_events INCLUDING ALL) ON COMMIT DROP'
      )
      for (const [table, column] of [
        ['identity_profiles', 'profile_id'],
        ['client_users', 'identity_profile_id'],
        ['members', 'identity_profile_id'],
        ['identity_profile_source_links', 'profile_id'],
        ['person_memberships', 'profile_id'],
        ['person_legal_entity_relationships', 'profile_id']
      ])
        await client.query(`INSERT INTO pg_temp.${table} SELECT * FROM greenhouse_core.${table} WHERE ${column}=$1`, [
          profileId
        ])
      await client.query(
        "INSERT INTO pg_temp.organizations SELECT * FROM greenhouse_core.organizations WHERE public_id='EO-ORG-0007'"
      )
      await client.query(
        'ALTER TABLE pg_temp.internal_native_enrollments ADD FOREIGN KEY(native_link_id) REFERENCES pg_temp.identity_profile_source_links(link_id)'
      )
      await client.query(
        'ALTER TABLE pg_temp.internal_native_enrollments ADD FOREIGN KEY(binding_id) REFERENCES pg_temp.external_organization_bindings(binding_id)'
      )
      await client.query(
        'ALTER TABLE pg_temp.external_capability_grants ADD FOREIGN KEY(binding_id) REFERENCES pg_temp.external_organization_bindings(binding_id)'
      )

      const u = (
        await client.query<{ microsoft_tenant_id: string; microsoft_oid: string }>(
          'SELECT microsoft_tenant_id,microsoft_oid FROM pg_temp.client_users WHERE identity_profile_id=$1 AND active=TRUE',
          [profileId]
        )
      ).rows

      expect(u).toHaveLength(1)

      const environmentId = `t1836-${randomUUID().slice(0, 8)}`,
        tenantId = u[0].microsoft_tenant_id,
        objectId = u[0].microsoft_oid,
        issuer = `https://login.microsoftonline.com/${tenantId.toLowerCase()}/v2.0`

      await client.query(
        `INSERT INTO pg_temp.external_identity_environments(environment_id,display_name,provider,issuer_url,jwks_uri,audience,issuer_class,status)
 VALUES($1,'Internal SQL fixture','test','https://fixture.invalid','https://fixture.invalid/jwks','https://mcp.invalid','external','active')`,
        [environmentId]
      )

      const customer = 'org-ddd962ae-6417-4325-92d0-f1994dc06cc5'

      await client.query(
        'INSERT INTO pg_temp.organizations SELECT * FROM greenhouse_core.organizations WHERE organization_id=$1',
        [customer]
      )
      expect(
        (await client.query('SELECT organization_id FROM pg_temp.organizations WHERE organization_id=$1', [customer]))
          .rows
      ).toHaveLength(1)
      const externalProfile = `recovery-${randomUUID()}`
      const oldSubject = `old-${randomUUID()}`
      const newSubject = `new-${randomUUID()}`
      const email = 'recovery@efeonce.invalid'
      const actor = { actorId: 'test-operator' }

      await client.query(
        `INSERT INTO pg_temp.identity_profiles(profile_id,profile_type,canonical_email,full_name,status,active,data_origin)
        VALUES($1,'external_contact',$2,'Temporary recovery control','active',TRUE,'smoke_test')`,
        [externalProfile, email]
      )

      const { binding } = await bindExternalOrganization(
        {
          environmentId,
          organizationId: customer,
          externalOrganizationRef: 'recovery-control',
          reason: 'Temporary recovery population control'
        },
        actor
      )

      const invitationInput = {
        bindingId: binding.bindingId,
        profileId: externalProfile,
        email,
        reason: 'Temporary recovery population control',
        expiresInHours: 1
      }

      const initial = await issueExternalInvitation(invitationInput, actor)

      expect(initial.token).toBeTruthy()

      const original = await acceptExternalInvitation(
        { environmentId, subject: oldSubject, token: initial.token!, verifiedEmail: email },
        actor
      )

      await grantExternalCapability(
        {
          bindingId: binding.bindingId,
          profileId: externalProfile,
          capability: 'growth.seo.observation.read',
          reason: invitationInput.reason
        },
        actor
      )
      expect(await resolveExternalAccess({ environmentId, subject: oldSubject })).toMatchObject({
        outcome: 'bound',
        profileId: externalProfile
      })
      const recovery = await issueExternalInvitation(invitationInput, actor)

      expect(recovery.token).toBeTruthy()

      const recovered = await acceptExternalInvitation(
        { environmentId, subject: newSubject, token: recovery.token!, verifiedEmail: email },
        actor
      )

      expect(recovered.supersededSubjects).toEqual([oldSubject])
      expect(recovered.profileId).toBe(externalProfile)
      expect(recovered.linkId).not.toBe(original.linkId)

      const links = (
        await client.query(
          'SELECT source_object_id,active,is_login_identity FROM pg_temp.identity_profile_source_links WHERE profile_id=$1 ORDER BY source_object_id',
          [externalProfile]
        )
      ).rows

      expect(links).toEqual(
        expect.arrayContaining([
          { source_object_id: oldSubject, active: false, is_login_identity: false },
          { source_object_id: newSubject, active: true, is_login_identity: true }
        ])
      )
      expect(links).toHaveLength(2)
      expect(
        (
          await client.query(
            'SELECT status,revoke_reason FROM pg_temp.external_member_invitations WHERE invitation_id=$1',
            [initial.invitation.invitationId]
          )
        ).rows[0]
      ).toEqual({ status: 'revoked', revoke_reason: 'superseded_by_reinvitation' })
      expect(await resolveExternalAccess({ environmentId, subject: oldSubject })).toMatchObject({
        outcome: 'revoked',
        memberships: []
      })
      expect(await resolveExternalAccess({ environmentId, subject: newSubject })).toMatchObject({
        outcome: 'bound',
        profileId: externalProfile,
        memberships: [
          expect.objectContaining({ bindingId: binding.bindingId, grants: ['growth.seo.observation.read'] })
        ]
      })
      expect(
        (
          await client.query(
            "SELECT metadata_json FROM pg_temp.external_identity_audit_log WHERE event_type='invitation_linked' AND invitation_id=$1",
            [recovery.invitation.invitationId]
          )
        ).rows[0].metadata_json
      ).toMatchObject({
        linkId: recovered.linkId,
        supersededInvitationIds: [initial.invitation.invitationId]
      })

      // The same command must roll back before changing corporate provenance, even though
      // an operator has issued a valid external invitation for that canonical person.
      const enrolled = await enrollInternalNativeIdentity(
        {
          environmentId,
          profileId,
          tenantId,
          objectId,
          issuer,
          actorId: actor.actorId,
          reason: 'Rollback-only approved canary snapshot'
        },
        { authorize: async () => true }
      )

      expect(enrolled.applied).toBe(true)

      const internalInvitation = await issueExternalInvitation(
        { ...invitationInput, profileId, email: 'corporate@efeonce.invalid' },
        actor
      )

      expect(internalInvitation.token).toBeTruthy()

      const snapshot = async () => {
        const result: Record<string, unknown[]> = {}

        for (const [table, key] of [
          ['identity_profile_source_links', 'link_id'],
          ['external_member_invitations', 'invitation_id'],
          ['internal_native_enrollments', 'enrollment_id'],
          ['external_identity_audit_log', 'audit_id'],
          ['internal_native_access_audit', 'audit_id'],
          ['outbox_events', 'event_id'],
          ['external_organization_bindings', 'binding_id']
        ])
          result[table] = (await client.query(`SELECT * FROM pg_temp.${table} ORDER BY ${key}`)).rows

        return result
      }

      const before = await snapshot()
      const attemptedSubject = `forbidden-${randomUUID()}`

      await expect(
        acceptExternalInvitation(
          {
            environmentId,
            subject: attemptedSubject,
            token: internalInvitation.token!,
            verifiedEmail: 'corporate@efeonce.invalid'
          },
          actor
        )
      ).rejects.toMatchObject({ code: 'conflict' })
      expect(await snapshot()).toEqual(before)
      expect(
        (
          await client.query(
            'SELECT active,is_login_identity FROM pg_temp.identity_profile_source_links WHERE link_id=$1',
            [enrolled.nativeLinkId]
          )
        ).rows
      ).toEqual([{ active: true, is_login_identity: true }])
      expect(
        (
          await client.query('SELECT link_id FROM pg_temp.identity_profile_source_links WHERE source_object_id=$1', [
            attemptedSubject
          ])
        ).rows
      ).toEqual([])
    } finally {
      await client.query('ROLLBACK')
      state.client = null
      client.release()
    }
  }, 120000)
})
