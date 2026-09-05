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
import { enrollInternalNativeIdentity, setInternalCapabilityGrant } from './commands'
import { reconcileInternalAuthority } from './reconcile'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

const profileId = 'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes'

describe.skipIf(!configured)('internal authority reconciliation real SQL in transaction-local canonical clones', () => {
  it('reconciles exact evidence atomically, repairs incomplete outbox and rejects drift and denied actors', async () => {
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

      const enrolled = await enrollInternalNativeIdentity(input, deps)

      if (!('enrollmentId' in enrolled) || !enrolled.enrollmentId || !('bindingId' in enrolled) || !enrolled.bindingId)
        throw new Error('fixture_enrollment_missing')

      const grant = await setInternalCapabilityGrant(
        {
          enrollmentId: enrolled.enrollmentId,
          capability: 'growth.seo.observation.read',
          active: true,
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
          actorId: input.actorId,
          reason: input.reason
        },
        deps
      )

      const repair = { bindingId: enrolled.bindingId, actorId: input.actorId, reason: input.reason, dryRun: false }

      const snapshot = async () =>
        (
          await client.query(
            `SELECT
        (SELECT count(*)::int FROM pg_temp.external_identity_audit_log) AS audits,
        (SELECT count(*)::int FROM pg_temp.outbox_events) AS events,
        (SELECT grants_version FROM pg_temp.external_organization_bindings WHERE binding_id=$1) AS gv`,
            [repair.bindingId]
          )
        ).rows[0]

      // Exact canonical creation evidence is already complete and must remain untouched.
      expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({
        applied: false,
        bindingRecords: 0,
        grantRecords: 0
      })
      // Reproduce the historical omission only inside TEMP tables; durable history is never edited.
      await client.query('DELETE FROM pg_temp.external_identity_audit_log')
      await client.query('DELETE FROM pg_temp.outbox_events')
      const initial = await snapshot()

      expect(await reconcileInternalAuthority({ ...repair, dryRun: true }, deps)).toMatchObject({
        applied: false,
        bindingRecords: 1,
        grantRecords: 1
      })
      expect(await snapshot()).toEqual(initial)
      await expect(
        reconcileInternalAuthority(repair, { authorize: async (_actor, cap) => cap.endsWith('.enroll') })
      ).rejects.toMatchObject({ code: 'forbidden' })
      expect(await snapshot()).toEqual(initial)

      // Force a REAL SQL failure after the first audit INSERT and prove the transaction savepoint rolls it back.
      await client.query(
        "ALTER TABLE pg_temp.outbox_events ADD CONSTRAINT reject_repair CHECK(event_type <> 'identity.external_binding.reconciled')"
      )
      await expect(reconcileInternalAuthority(repair, deps)).rejects.toThrow()
      expect(await snapshot()).toEqual(initial)
      await client.query('ALTER TABLE pg_temp.outbox_events DROP CONSTRAINT reject_repair')

      expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({
        applied: true,
        bindingRecords: 1,
        grantRecords: 1
      })
      const repaired = await snapshot()

      expect(repaired).toMatchObject({ audits: 2, events: 2, gv: initial.gv })
      expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({
        applied: false,
        bindingRecords: 0,
        grantRecords: 0
      })
      expect(await snapshot()).toEqual(repaired)
      // Existing audit WITHOUT its correlated outbox must produce a current reconciliation pair.
      await client.query("DELETE FROM pg_temp.outbox_events WHERE event_type='identity.external_grant.reconciled'")
      expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({
        applied: true,
        bindingRecords: 0,
        grantRecords: 1
      })
      expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({ applied: false })

      // Corrupt only TEMP evidence: matching ids with wrong dimensions must not certify completion.
      await client.query(
        "UPDATE pg_temp.external_identity_audit_log SET organization_id='wrong' WHERE event_type='grant_reconciled'"
      )
      expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({
        applied: true,
        bindingRecords: 0,
        grantRecords: 1
      })
      expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({ applied: false })

      // The shared evidence predicate rejects malformed but mutually matching audit/event pairs.
      for (const malformed of [
        { audit: null, payload: { schemaVersion: '1' } },
        { audit: { grantsVersion: '3' }, payload: { grantsVersion: '3' } },
        { audit: { grantsVersion: 0 }, payload: { grantsVersion: 0 } },
        { audit: { reconciliationId: '' }, payload: { reconciliationId: '' } }
      ]) {
        await client.query('SAVEPOINT malformed_pair')
        if (malformed.audit)
          await client.query(
            "UPDATE pg_temp.external_identity_audit_log SET metadata_json=metadata_json || $1::jsonb WHERE event_type='grant_reconciled'",
            [JSON.stringify(malformed.audit)]
          )
        await client.query(
          "UPDATE pg_temp.outbox_events SET payload_json=payload_json || $1::jsonb WHERE event_type='identity.external_grant.reconciled'",
          [JSON.stringify(malformed.payload)]
        )
        const before = await snapshot()

        expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({
          applied: true,
          bindingRecords: 0,
          grantRecords: 1
        })
        expect(await snapshot()).toMatchObject({ audits: before.audits + 1, events: before.events + 1, gv: before.gv })
        expect(await reconcileInternalAuthority(repair, deps)).toMatchObject({
          applied: false,
          bindingRecords: 0,
          grantRecords: 0
        })
        await client.query('ROLLBACK TO SAVEPOINT malformed_pair')
        await client.query('RELEASE SAVEPOINT malformed_pair')
      }

      const complete = await snapshot()

      for (const mutation of [
        'UPDATE pg_temp.external_capability_grants SET expires_at=NULL',
        "UPDATE pg_temp.external_capability_grants SET expires_at=expires_at+INTERVAL '1 day'",
        "UPDATE pg_temp.external_capability_grants SET capability='another.capability'",
        "UPDATE pg_temp.client_users SET microsoft_tenant_id='00000000-0000-4000-8000-000000000000'"
      ]) {
        await client.query('SAVEPOINT corrupt_evidence')
        await client.query(mutation)
        await expect(reconcileInternalAuthority(repair, deps)).rejects.toMatchObject({
          code: expect.stringMatching(/conflict|ineligible/)
        })
        expect(await snapshot()).toEqual(complete)
        await client.query('ROLLBACK TO SAVEPOINT corrupt_evidence')
        await client.query('RELEASE SAVEPOINT corrupt_evidence')
      }

      expect(grant.grantId).toBeTruthy()
    } finally {
      await client.query('ROLLBACK')
      state.client = null
      client.release()
    }
  }, 120000)
})
