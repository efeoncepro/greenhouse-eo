/** Execute production SQL on transaction-local tables; never alter real audit or authority rows. */
import type { PoolClient } from 'pg'
import { describe, expect, it, vi } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'

const state = vi.hoisted(() => ({ client: null as PoolClient | null }))

vi.mock('@/lib/db', async original => ({
  ...(await original<Record<string, unknown>>()),
  query: async (sql: string, values?: unknown[]) => {
    if (!state.client) throw new Error('fixture_not_ready')

    return (await state.client.query(sql.replaceAll('greenhouse_core.', 'pg_temp.').replaceAll('greenhouse_sync.', 'pg_temp.'), values)).rows
  }
}))
import { getGreenhousePostgresPool } from '@/lib/db'
import { server } from '@/mocks/node'
import { getExternalBindingMixedPopulationSignal, getExternalBindingUnauditedWriteSignal } from './external-identity-binding-signals'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

// Each scenario executes many serial TEMP-table roundtrips against Cloud SQL; scope the budget to these tests.
describe.skipIf(!configured)('unaudited external authority SQL', () => {
  it('requires dimension-correlated audit plus outbox and preserves legacy external creation', async () => {
    server.close()
    applyGreenhousePostgresProfile('ops')
    const client = await (await getGreenhousePostgresPool()).connect()

    state.client = client

    try {
      await client.query('BEGIN')
      await client.query(`CREATE TEMP TABLE external_organization_bindings (
        binding_id text, status text, environment_id text, organization_id text, population text
      ) ON COMMIT DROP`)
      await client.query(`CREATE TEMP TABLE external_capability_grants ON COMMIT DROP AS
        SELECT grant_id,binding_id,status,expires_at,profile_id,capability FROM greenhouse_core.external_capability_grants WITH NO DATA`)
      await client.query(`CREATE TEMP TABLE external_identity_audit_log ON COMMIT DROP AS
        SELECT binding_id,grant_id,event_type,outcome,metadata_json,environment_id,organization_id,profile_id
        FROM greenhouse_core.external_identity_audit_log WITH NO DATA`)
      await client.query(`CREATE TEMP TABLE outbox_events ON COMMIT DROP AS
        SELECT aggregate_type,aggregate_id,event_type,payload_json FROM greenhouse_sync.outbox_events WITH NO DATA`)
      await client.query(`INSERT INTO pg_temp.external_organization_bindings VALUES
        ('binding','active','env','org','internal'),('revoked','revoked','env','org','internal')`)
      await client.query(`INSERT INTO pg_temp.external_capability_grants VALUES
        ('grant','binding','active',NOW()+INTERVAL '1 hour','person','read'),
        ('expired','binding','active',NOW()-INTERVAL '1 second','person','read'),
        ('boundary','binding','active',NOW(),'person','read'),
        ('revoked','binding','revoked',NULL,'person','read')`)

      const count = async () => {
        const signal = await getExternalBindingUnauditedWriteSignal()

        expect(signal.severity).not.toBe('unknown')

        return signal.evidence.find(e => e.kind === 'metric')?.value
      }

      expect(await count()).toBe('2')
      await client.query(`INSERT INTO pg_temp.external_identity_audit_log VALUES
        ('binding',NULL,'organization_bound','applied','{"population":"internal","grantsVersion":1}','env','org',NULL)`)
      await client.query(`INSERT INTO pg_temp.external_identity_audit_log
        SELECT 'binding','grant','capability_granted','applied',
          jsonb_build_object('population','internal','grantsVersion',2,'capability','read',
            'expiresAt',to_char(expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'env','org','person'
        FROM pg_temp.external_capability_grants WHERE grant_id='grant'`)
      expect(await count()).toBe('2')
      await client.query(`INSERT INTO pg_temp.outbox_events
        SELECT 'external_identity_binding',a.binding_id,
          CASE WHEN a.grant_id IS NULL THEN 'identity.external_binding.bound' ELSE 'identity.external_grant.granted' END,
          a.metadata_json || jsonb_build_object('schemaVersion',1,'bindingId','binding','environmentId','env',
            'organizationId','org','grantId',a.grant_id,'profileId',a.profile_id)
        FROM pg_temp.external_identity_audit_log a`)
      expect(await count()).toBe('0')

      const corruptions = [
        `UPDATE pg_temp.external_identity_audit_log SET environment_id='other'`,
        `UPDATE pg_temp.external_identity_audit_log SET organization_id='other'`,
        `UPDATE pg_temp.external_identity_audit_log SET outcome='denied'`,
        `UPDATE pg_temp.external_identity_audit_log SET metadata_json=metadata_json || '{"population":"external"}'`,
        `UPDATE pg_temp.outbox_events SET aggregate_id='other'`,
        `UPDATE pg_temp.outbox_events SET aggregate_type='other'`,
        `UPDATE pg_temp.outbox_events SET event_type='other'`,
        ...['environmentId','organizationId','bindingId','population','grantsVersion','schemaVersion'].map(key =>
          `UPDATE pg_temp.outbox_events SET payload_json=payload_json || jsonb_build_object('${key}','other')`),
        `DELETE FROM pg_temp.outbox_events`
      ]

      for (const mutation of corruptions) {
        await client.query('SAVEPOINT isolated_defect')
        await client.query(mutation)
        expect(await count(), mutation).toBe('2')
        await client.query('ROLLBACK TO SAVEPOINT isolated_defect')
      }

      for (const mutation of [
        `UPDATE pg_temp.external_identity_audit_log SET profile_id='other' WHERE grant_id='grant'`,
        ...['capability','expiresAt'].map(key =>
          `UPDATE pg_temp.external_identity_audit_log SET metadata_json=metadata_json || jsonb_build_object('${key}','other') WHERE grant_id='grant'`),
        ...['grantId','profileId','capability'].map(key =>
          `UPDATE pg_temp.outbox_events SET payload_json=payload_json || jsonb_build_object('${key}','other') WHERE event_type='identity.external_grant.granted'`)
      ]) {
        await client.query('SAVEPOINT isolated_grant')
        await client.query(mutation)
        expect(await count(), mutation).toBe('1')
        await client.query('ROLLBACK TO SAVEPOINT isolated_grant')
      }

      await client.query(`UPDATE pg_temp.external_identity_audit_log SET event_type=CASE WHEN grant_id IS NULL
        THEN 'binding_reconciled' ELSE 'grant_reconciled' END,
        metadata_json=metadata_json || '{"reconciliationVersion":1,"reconciliationId":"repair"}'`)
      await client.query(`UPDATE pg_temp.outbox_events SET event_type=replace(event_type,'.bound','.reconciled'),
        payload_json=payload_json || '{"reconciliationVersion":1,"reconciliationId":"repair"}'`)
      await client.query(`UPDATE pg_temp.outbox_events SET event_type=replace(event_type,'.granted','.reconciled')`)
      expect(await count()).toBe('0')

      for (const mutation of [
        `UPDATE pg_temp.external_identity_audit_log SET metadata_json=metadata_json || '{"reconciliationVersion":"1"}'`,
        `UPDATE pg_temp.outbox_events SET payload_json=payload_json || '{"reconciliationVersion":2}'`,
        `UPDATE pg_temp.outbox_events SET payload_json=payload_json || '{"reconciliationId":"other"}'`
      ]) {
        await client.query('SAVEPOINT isolated_repair')
        await client.query(mutation)
        expect(await count(), mutation).toBe('2')
        await client.query('ROLLBACK TO SAVEPOINT isolated_repair')
      }

      // Original external writer had no population or binding audit version, nor grant audit expiry.
      await client.query(`UPDATE pg_temp.external_organization_bindings SET population='external'`)
      await client.query(`UPDATE pg_temp.external_identity_audit_log SET event_type=CASE WHEN grant_id IS NULL
        THEN 'organization_bound' ELSE 'capability_granted' END,
        metadata_json=metadata_json-'population'-'expiresAt'-'reconciliationVersion'-'reconciliationId'`)
      await client.query(`UPDATE pg_temp.external_identity_audit_log SET metadata_json=metadata_json-'grantsVersion' WHERE grant_id IS NULL`)
      await client.query(`UPDATE pg_temp.outbox_events SET event_type=CASE WHEN payload_json->>'grantId' IS NULL
        THEN 'identity.external_binding.bound' ELSE 'identity.external_grant.granted' END,
        payload_json=payload_json-'population'-'reconciliationVersion'-'reconciliationId'`)
      expect(await count()).toBe('0')
      // Legacy binding-wide grant is also valid with null person in both audit and event.
      await client.query(`UPDATE pg_temp.external_capability_grants SET profile_id=NULL,expires_at=NULL WHERE grant_id='grant'`)
      await client.query(`UPDATE pg_temp.external_identity_audit_log SET profile_id=NULL WHERE grant_id='grant'`)
      await client.query(`UPDATE pg_temp.outbox_events SET payload_json=payload_json || '{"profileId":null}' WHERE event_type='identity.external_grant.granted'`)
      expect(await count()).toBe('0')
    } finally {
      await client.query('ROLLBACK')
      state.client = null
      client.release()
    }
  }, 120_000)
})

describe.skipIf(!configured)('mixed population structural SQL', () => {
  it('detects each structural predicate, deduplicates bindings and preserves valid lifecycle history', async () => {
    server.close()
    applyGreenhousePostgresProfile('ops')
    const client = await (await getGreenhousePostgresPool()).connect()

    state.client = client

    try {
      await client.query('BEGIN')
      // Population is additive and may not be deployed yet. All fixtures are TEMP, without production writes.
      await client.query(`CREATE TEMP TABLE external_organization_bindings (
        binding_id text, environment_id text, organization_id text, population text, status text
      ) ON COMMIT DROP`)
      await client.query(`CREATE TEMP TABLE external_member_invitations (
        binding_id text, status text
      ) ON COMMIT DROP`)
      await client.query(`CREATE TEMP TABLE external_capability_grants (
        binding_id text, profile_id text, expires_at timestamptz, status text
      ) ON COMMIT DROP`)
      await client.query(`CREATE TEMP TABLE internal_native_enrollments ON COMMIT DROP AS
        SELECT enrollment_id, binding_id, environment_id, profile_id, native_link_id, upstream_link_id,
          tenant_id, object_id, status FROM greenhouse_core.internal_native_enrollments WITH NO DATA`)
      await client.query(`CREATE TEMP TABLE organizations ON COMMIT DROP AS
        SELECT organization_id, public_id, is_operating_entity FROM greenhouse_core.organizations WITH NO DATA`)
      await client.query(`CREATE TEMP TABLE identity_profile_source_links ON COMMIT DROP AS
        SELECT link_id, profile_id, source_system, source_object_type, source_object_id, active
          FROM greenhouse_core.identity_profile_source_links WITH NO DATA`)
      await client.query(`CREATE TEMP TABLE client_users ON COMMIT DROP AS
        SELECT identity_profile_id, microsoft_tenant_id, microsoft_oid FROM greenhouse_core.client_users WITH NO DATA`)
      await client.query(`INSERT INTO pg_temp.external_organization_bindings VALUES
        ('internal','env','org','internal','active'), ('external','env','customer','external','active')`)
      await client.query(`INSERT INTO pg_temp.organizations VALUES ('org','EO-ORG-0007',TRUE)`)
      await client.query(`INSERT INTO pg_temp.identity_profile_source_links VALUES
        ('native','person','external_idp:env','subject','opaque-subject',TRUE),
        ('upstream','person','azure_ad','user','BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB',TRUE)`)
      await client.query(`INSERT INTO pg_temp.client_users VALUES
        ('person','AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA','BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB')`)
      await client.query(`INSERT INTO pg_temp.internal_native_enrollments VALUES
        ('enrollment','internal','env','person','native','upstream',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','active')`)
      await client.query(`INSERT INTO pg_temp.external_capability_grants VALUES
        ('internal','person',NOW()+INTERVAL '1 hour','active'),('external',NULL,NULL,'active')`)
      await client.query(`INSERT INTO pg_temp.external_member_invitations VALUES ('external','linked')`)

      const count = async () => {
        const signal = await getExternalBindingMixedPopulationSignal()

        expect(signal.severity).not.toBe('unknown')

        return signal.evidence.find(e => e.kind === 'metric')?.value
      }

      expect(await count()).toBe('0')

      // Each mutation isolates a behavioral predicate; roll back the fixture after each case.
      const corruptions = [
        `INSERT INTO pg_temp.external_member_invitations VALUES ('internal','revoked')`,
        `UPDATE pg_temp.external_capability_grants SET profile_id=NULL WHERE binding_id='internal'`,
        `UPDATE pg_temp.external_capability_grants SET profile_id='outsider' WHERE binding_id='internal'`,
        `UPDATE pg_temp.external_capability_grants SET expires_at=NULL WHERE binding_id='internal'`,
        `UPDATE pg_temp.external_organization_bindings SET population='external' WHERE binding_id='internal'`,
        `DELETE FROM pg_temp.external_organization_bindings WHERE binding_id='internal'`,
        `UPDATE pg_temp.external_organization_bindings SET environment_id='other' WHERE binding_id='internal'`,
        `UPDATE pg_temp.organizations SET public_id='CUSTOMER'`,
        `UPDATE pg_temp.organizations SET is_operating_entity=FALSE`,
        `DELETE FROM pg_temp.organizations`,
        `DELETE FROM pg_temp.identity_profile_source_links WHERE link_id='native'`,
        `UPDATE pg_temp.identity_profile_source_links SET profile_id='outsider' WHERE link_id='native'`,
        `UPDATE pg_temp.identity_profile_source_links SET source_system='external_idp:other' WHERE link_id='native'`,
        `UPDATE pg_temp.identity_profile_source_links SET source_object_type='user' WHERE link_id='native'`,
        `DELETE FROM pg_temp.identity_profile_source_links WHERE link_id='upstream'`,
        `UPDATE pg_temp.identity_profile_source_links SET profile_id='outsider' WHERE link_id='upstream'`,
        `UPDATE pg_temp.identity_profile_source_links SET source_system='other' WHERE link_id='upstream'`,
        `UPDATE pg_temp.identity_profile_source_links SET source_object_type='subject' WHERE link_id='upstream'`,
        `UPDATE pg_temp.identity_profile_source_links SET source_object_id='other' WHERE link_id='upstream'`,
        `UPDATE pg_temp.client_users SET identity_profile_id='outsider'`,
        `UPDATE pg_temp.client_users SET microsoft_tenant_id='other'`,
        `UPDATE pg_temp.client_users SET microsoft_oid='other'`,
        `DELETE FROM pg_temp.client_users`
      ]

      for (const mutation of corruptions) {
        await client.query('SAVEPOINT isolated_defect')
        await client.query(mutation)
        expect(await count(), mutation).toBe('1')
        await client.query('ROLLBACK TO SAVEPOINT isolated_defect')
      }

      await client.query(`INSERT INTO pg_temp.external_member_invitations VALUES ('internal','linked'),('internal','revoked')`)
      await client.query(`UPDATE pg_temp.external_capability_grants SET profile_id=NULL WHERE binding_id='internal'`)
      expect(await count()).toBe('1')
      await client.query(`UPDATE pg_temp.internal_native_enrollments SET binding_id='missing'`)
      expect(await count()).toBe('2')
      await client.query(`DELETE FROM pg_temp.external_member_invitations WHERE binding_id='internal'`)
      await client.query(`UPDATE pg_temp.external_capability_grants SET profile_id='person', status='revoked',
        expires_at=NOW()-INTERVAL '1 second' WHERE binding_id='internal'`)
      await client.query(`UPDATE pg_temp.internal_native_enrollments SET binding_id='internal',status='revoked'`)
      await client.query(`UPDATE pg_temp.external_organization_bindings SET status='revoked' WHERE binding_id='internal'`)
      await client.query(`UPDATE pg_temp.identity_profile_source_links SET active=FALSE`)
      expect(await count()).toBe('0')
    } finally {
      await client.query('ROLLBACK')
      state.client = null
      client.release()
    }
  }, 120_000)
})
