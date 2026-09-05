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
import { enrollInternalNativeIdentity, revokeInternalNativeIdentity, setInternalCapabilityGrant } from './commands'
import { resolveEnrolledInternalIdentity, resolveInternalAuthority } from './store'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

const profileId = 'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes'

describe.skipIf(!configured)('internal identity real SQL canonical canary snapshot', () => {
  it('dry-runs, enrolls idempotently without grants, delegates bounded authority, rechecks revocation and retains audit', async () => {
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
        'internal_native_enrollments',
        'internal_native_access_audit'
      ]

      for (const table of core)
        await client.query(`CREATE TEMP TABLE ${table}(LIKE greenhouse_core.${table} INCLUDING ALL) ON COMMIT DROP`)
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

      const input = {
        environmentId,
        profileId,
        tenantId,
        objectId,
        issuer,
        actorId: 'test-operator',
        reason: 'Rollback-only approved canary snapshot'
      }

      const deps = { authorize: async () => true, canDelegate: async () => true }

      expect(await enrollInternalNativeIdentity({ ...input, dryRun: true }, deps)).toMatchObject({
        applied: false,
        idempotent: false
      })
      expect(
        Number((await client.query('SELECT count(*) AS count FROM pg_temp.internal_native_enrollments')).rows[0].count)
      ).toBe(0)
      const enrolled = await enrollInternalNativeIdentity(input, deps)

      expect(enrolled.applied).toBe(true)
      expect(await enrollInternalNativeIdentity(input, deps)).toMatchObject({
        applied: false,
        idempotent: true,
        enrollmentId: enrolled.enrollmentId
      })
      const identity = await resolveEnrolledInternalIdentity(input)

      expect(identity?.profileId).toBe(profileId)
      expect(await resolveEnrolledInternalIdentity({ ...input, tenantId: randomUUID() })).toBeNull()
      const authorityInput = { environmentId, profileId, subject: identity!.subject, bindingId: identity!.bindingId }

      expect((await resolveInternalAuthority(authorityInput))?.capabilities).toEqual([])
      await setInternalCapabilityGrant(
        {
          enrollmentId: enrolled.enrollmentId!,
          capability: 'identity.external_binding.read',
          active: true,
          expiresAt: new Date(Date.now() + 3600000),
          actorId: input.actorId,
          reason: input.reason
        },
        deps
      )
      expect((await resolveInternalAuthority(authorityInput))?.capabilities).toEqual(['identity.external_binding.read'])
      await client.query('UPDATE pg_temp.identity_profiles SET active=FALSE WHERE profile_id=$1', [profileId])
      expect(await resolveInternalAuthority(authorityInput)).toBeNull()
      await client.query('UPDATE pg_temp.identity_profiles SET active=TRUE WHERE profile_id=$1', [profileId])
      await revokeInternalNativeIdentity(
        { enrollmentId: enrolled.enrollmentId!, actorId: input.actorId, reason: input.reason },
        deps
      )
      expect(await resolveInternalAuthority(authorityInput)).toBeNull()
      expect(await resolveEnrolledInternalIdentity(input)).toBeNull()
      expect(
        (
          await client.query('SELECT event_type FROM pg_temp.internal_native_access_audit ORDER BY created_at,audit_id')
        ).rows
          .map(r => r.event_type)
          .sort()
      ).toEqual(['capability_granted', 'enrolled', 'revoked'])
      expect(Number((await client.query('SELECT count(*) AS count FROM pg_temp.outbox_events')).rows[0].count)).toBe(3)
    } finally {
      await client.query('ROLLBACK')
      state.client = null
      client.release()
    }
  }, 30000)
})
