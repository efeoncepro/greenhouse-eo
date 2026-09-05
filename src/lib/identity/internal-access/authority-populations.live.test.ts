/** Runs the real migration against connection-local PostgreSQL fixtures; never mutates canonical tables. */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { PoolClient } from 'pg'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'
import { getGreenhousePostgresPool } from '@/lib/db'
import { server } from '@/mocks/node'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

const tables = [
  'organizations',
  'client_users',
  'identity_profile_source_links',
  'internal_native_enrollments',
  'external_organization_bindings',
  'external_capability_grants',
  'external_member_invitations',
  'internal_native_access_audit',
  'external_identity_audit_log',
  'external_access_resolution_log'
] as const

const tenant = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const object = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

let client: PoolClient | undefined
let migration: string
let downMigration: string

const db = () => {
  if (!client) throw new Error('fixture_not_ready')

  return client
}

const expectStatementRejected = async (sql: string, message: string) => {
  await db().query('SAVEPOINT expected_rejection')
  await expect(db().query(sql)).rejects.toThrow(message)
  await db().query('ROLLBACK TO SAVEPOINT expected_rejection')
  await db().query('RELEASE SAVEPOINT expected_rejection')
}

describe.skipIf(!configured)('authority population migration real PostgreSQL', () => {
  beforeEach(async () => {
    server.close()
    applyGreenhousePostgresProfile('ops')
    client = await (await getGreenhousePostgresPool()).connect()
    await db().query('BEGIN')

    for (const table of tables) {
      // Copy types, not data/defaults/triggers. All writes below and in the migration address pg_temp.
      await db().query(
        `CREATE TEMP TABLE ${table} ON COMMIT DROP AS SELECT * FROM greenhouse_core.${table} WITH NO DATA`
      )
    }

    // Supports running the fixture after the production migration too: reconstruct its input shape locally.
    await db().query('ALTER TABLE pg_temp.external_organization_bindings DROP COLUMN IF EXISTS population')
    await db().query(
      "ALTER TABLE pg_temp.external_identity_audit_log ADD CONSTRAINT external_identity_audit_log_event_type_valid CHECK(event_type IN ('organization_bound','capability_granted','invitation_linked'))"
    )

    await db().query(
      "ALTER TABLE pg_temp.external_access_resolution_log ADD CONSTRAINT external_access_resolution_log_outcome_valid CHECK(outcome IN ('bound','unbound','revoked','environment_inactive','profile_inactive'))"
    )

    const source = await readFile(
      resolve(process.cwd(), 'migrations/20260905183812333_task-1836-authority-populations.sql'),
      'utf8'
    )

    downMigration = source.split('-- Down Migration')[1]!
    migration = source
      .split('-- Up Migration')[1]!
      .split('-- Down Migration')[0]!
      .replaceAll('greenhouse_core.', 'pg_temp.')
    await db().query(
      "INSERT INTO pg_temp.organizations(organization_id,public_id,is_operating_entity) VALUES('org','EO-ORG-0007',TRUE)"
    )
    await db().query(
      "INSERT INTO pg_temp.client_users(identity_profile_id,microsoft_tenant_id,microsoft_oid) VALUES('person',$1,$2)",
      [tenant, object]
    )
    await db().query(
      "INSERT INTO pg_temp.external_organization_bindings(binding_id,organization_id,environment_id,grants_version,status) VALUES('internal','org','env',2,'active'),('external','org-external','env',8,'active')"
    )
    await db().query(
      "INSERT INTO pg_temp.identity_profile_source_links(link_id,profile_id,source_system,source_object_type,source_object_id,active) VALUES('native','person','external_idp:env','subject','opaque',TRUE),('upstream','person','azure_ad','user',$1,TRUE)",
      [object]
    )
    await db().query(
      "INSERT INTO pg_temp.internal_native_enrollments(enrollment_id,environment_id,profile_id,binding_id,upstream_link_id,native_link_id,tenant_id,object_id,status) VALUES('enrollment','env','person','internal','upstream','native',$1,$2,'active')",
      [tenant, object]
    )
    await db().query(
      "INSERT INTO pg_temp.external_capability_grants(grant_id,binding_id,profile_id,status,capability,expires_at) VALUES('grant','internal','person','active','growth.seo.observation.read','2026-09-12T15:00:00Z')"
    )
    await db().query(
      "INSERT INTO pg_temp.internal_native_access_audit(audit_id,created_at,enrollment_id,event_type,metadata_json) VALUES('audit-enrolled',NOW(),'enrollment','enrolled','{}'),('audit-grant',NOW(),'enrollment','capability_granted','{\"grantId\":\"grant\",\"capability\":\"growth.seo.observation.read\",\"expiresAt\":\"2026-09-12T15:00:00Z\"}')"
    )
  })

  afterEach(async () => {
    if (!client) return

    try {
      await client.query('ROLLBACK')
    } finally {
      client.release()
      client = undefined
    }
  })

  it('classifies proved internal authority, retains external defaults, bumps gv once and enforces immutability', async () => {
    await db().query(migration)
    await expectStatementRejected(downMigration, 'TASK-1836 is forward-only')
    expect(
      (
        await db().query(
          'SELECT binding_id,population,grants_version FROM pg_temp.external_organization_bindings ORDER BY binding_id'
        )
      ).rows
    ).toEqual([
      { binding_id: 'external', population: 'external', grants_version: 8 },
      { binding_id: 'internal', population: 'internal', grants_version: 3 }
    ])
    await expectStatementRejected(
      "UPDATE pg_temp.external_organization_bindings SET population='external' WHERE binding_id='internal'",
      'authority population is immutable'
    )
    await db().query(
      "UPDATE pg_temp.external_organization_bindings SET population='internal' WHERE binding_id='internal'"
    )
    // Re-run the actual migration: already classified bindings must not receive another version bump.
    await db().query(migration)
    expect(
      (
        await db().query(
          "SELECT grants_version FROM pg_temp.external_organization_bindings WHERE binding_id='internal'"
        )
      ).rows[0].grants_version
    ).toBe(3)
    await db().query(
      "INSERT INTO pg_temp.external_identity_audit_log(event_type) VALUES('binding_reconciled'),('grant_reconciled'),('internal_member_linked')"
    )
    await db().query("INSERT INTO pg_temp.external_access_resolution_log(outcome) VALUES('internal_population')")
    await expectStatementRejected("INSERT INTO pg_temp.external_access_resolution_log(outcome) VALUES('invented_population')", 'external_access_resolution_log_outcome_valid')
    await expectStatementRejected(
      "INSERT INTO pg_temp.external_identity_audit_log(event_type) VALUES('invented_history')",
      'external_identity_audit_log_event_type_valid'
    )
  })

  it('classifies revoked history from durable evidence without requiring active source links', async () => {
    await db().query(
      "UPDATE pg_temp.internal_native_enrollments SET status='revoked',revoked_at=NOW(),revoked_by='operator'"
    )
    await db().query("UPDATE pg_temp.external_organization_bindings SET status='revoked' WHERE binding_id='internal'")
    await db().query("UPDATE pg_temp.external_capability_grants SET status='revoked'")
    await db().query('UPDATE pg_temp.identity_profile_source_links SET active=FALSE')
    await db().query(migration)
    expect(
      (
        await db().query(
          "SELECT population,grants_version FROM pg_temp.external_organization_bindings WHERE binding_id='internal'"
        )
      ).rows[0]
    ).toEqual({ population: 'internal', grants_version: 3 })
  })

  it.each([
    "DELETE FROM pg_temp.internal_native_access_audit WHERE event_type='capability_granted'",
    'UPDATE pg_temp.internal_native_access_audit SET metadata_json=\'{"grantId":"foreign"}\' WHERE event_type=\'capability_granted\'',
    'UPDATE pg_temp.external_capability_grants SET profile_id=NULL',
    'UPDATE pg_temp.external_capability_grants SET expires_at=NULL',
    "UPDATE pg_temp.external_capability_grants SET capability='different.capability'",
    "UPDATE pg_temp.external_capability_grants SET expires_at=expires_at+INTERVAL '1 day'",
    "UPDATE pg_temp.external_capability_grants SET profile_id='foreign'",
    "INSERT INTO pg_temp.external_member_invitations(binding_id) VALUES('internal')",
    "INSERT INTO pg_temp.external_identity_audit_log(binding_id,event_type) VALUES('internal','organization_bound')"
  ])('rejects ambiguous grant/binding provenance atomically: %s', async mutation => {
    await db().query(mutation)
    await expectStatementRejected(migration, 'mixed authority population')
    expect(
      (
        await db().query(
          "SELECT grants_version FROM pg_temp.external_organization_bindings WHERE binding_id='internal'"
        )
      ).rows[0].grants_version
    ).toBe(2)
    expect(
      (
        await db().query(
          "SELECT count(*)::int AS count FROM pg_attribute WHERE attrelid='pg_temp.external_organization_bindings'::regclass AND attname='population' AND NOT attisdropped"
        )
      ).rows[0].count
    ).toBe(0)
  })

  it.each([
    "DELETE FROM pg_temp.internal_native_access_audit WHERE event_type='enrolled'",
    "UPDATE pg_temp.identity_profile_source_links SET profile_id='foreign' WHERE link_id='native'",
    "UPDATE pg_temp.identity_profile_source_links SET source_system='other' WHERE link_id='upstream'",
    "UPDATE pg_temp.client_users SET microsoft_tenant_id='cccccccc-cccc-cccc-cccc-cccccccccccc'",
    "UPDATE pg_temp.organizations SET public_id='EO-ORG-OTHER'"
  ])('rejects missing or incoherent enrollment evidence: %s', async mutation => {
    await db().query(mutation)
    await expectStatementRejected(migration, 'reconciled enrollment evidence')
  })
})
