/** Execute production SQL on transaction-local tables; never alter real audit or authority rows. */
import type { PoolClient } from 'pg'
import { describe, expect, it, vi } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'

const state = vi.hoisted(() => ({ client: null as PoolClient | null }))

vi.mock('@/lib/db', async original => ({
  ...(await original<Record<string, unknown>>()),
  query: async (sql: string, values?: unknown[]) => {
    if (!state.client) throw new Error('fixture_not_ready')

    return (await state.client.query(sql.replaceAll('greenhouse_core.', 'pg_temp.'), values)).rows
  }
}))
import { getGreenhousePostgresPool } from '@/lib/db'
import { server } from '@/mocks/node'
import { getExternalBindingUnauditedWriteSignal } from './external-identity-binding-signals'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

describe.skipIf(!configured)('unaudited external authority SQL', () => {
  it('requires exact applied creation audit and excludes revoked/expired authority', async () => {
    server.close()
    applyGreenhousePostgresProfile('ops')
    const client = await (await getGreenhousePostgresPool()).connect()

    state.client = client

    try {
      await client.query('BEGIN')
      await client.query(
        'CREATE TEMP TABLE external_organization_bindings ON COMMIT DROP AS SELECT binding_id,status FROM greenhouse_core.external_organization_bindings WITH NO DATA'
      )
      await client.query(
        'CREATE TEMP TABLE external_capability_grants ON COMMIT DROP AS SELECT grant_id,binding_id,status,expires_at FROM greenhouse_core.external_capability_grants WITH NO DATA'
      )
      await client.query(
        'CREATE TEMP TABLE external_identity_audit_log ON COMMIT DROP AS SELECT binding_id,grant_id,event_type,outcome,metadata_json FROM greenhouse_core.external_identity_audit_log WITH NO DATA'
      )
      await client.query(
        `INSERT INTO pg_temp.external_organization_bindings VALUES ('binding','active'),('revoked','revoked')`
      )
      await client.query(`INSERT INTO pg_temp.external_capability_grants VALUES
        ('grant','binding','active',NULL),('future','binding','active',NOW()+INTERVAL '1 hour'),
        ('expired','binding','active',NOW()-INTERVAL '1 second'),('boundary','binding','active',NOW()),
        ('revoked','binding','revoked',NULL)`)

      const count = async () =>
        (await getExternalBindingUnauditedWriteSignal()).evidence.find(e => e.kind === 'metric')?.value

      expect(await count()).toBe('3')
      await client.query(`INSERT INTO pg_temp.external_identity_audit_log(binding_id,grant_id,event_type,outcome) VALUES
        ('other',NULL,'organization_bound','applied'),('binding',NULL,'organization_bound','denied'),
        ('binding',NULL,'capability_granted','applied'),('other','grant','capability_granted','applied'),
        ('binding','grant','capability_revoked','applied'),('binding','future','capability_granted','denied')`)
      expect(await count()).toBe('3')
      await client.query(`INSERT INTO pg_temp.external_identity_audit_log(binding_id,grant_id,event_type,outcome) VALUES
        ('binding',NULL,'organization_bound','applied'),('binding','grant','capability_granted','applied'),
        ('binding','future','capability_granted','applied')`)
      expect(await getExternalBindingUnauditedWriteSignal()).toMatchObject({ severity: 'ok' })
      expect(await count()).toBe('0')
      // Delete only TEMP evidence to exercise reconciliation independently from creation.
      await client.query('DELETE FROM pg_temp.external_identity_audit_log')
      await client.query(`INSERT INTO pg_temp.external_identity_audit_log VALUES
        ('binding',NULL,'binding_reconciled','applied','{"population":"external","reconciliationVersion":1}'),
        ('binding','grant','grant_reconciled','applied','{"population":"internal","reconciliationVersion":2}'),
        ('binding','future','grant_reconciled','applied','{}'),
        ('binding','future','grant_reconciled','applied','{"population":"internal","reconciliationVersion":"1"}'),
        ('binding','grant','capability_revoked','applied','{"population":"internal","reconciliationVersion":1}'),
        ('other','grant','grant_reconciled','applied','{"population":"internal","reconciliationVersion":1}'),
        ('binding','future','binding_reconciled','denied','{"population":"internal","reconciliationVersion":1}')`)
      expect(await count()).toBe('3')
      await client.query(`INSERT INTO pg_temp.external_identity_audit_log VALUES
        ('binding',NULL,'binding_reconciled','applied','{"population":"internal","reconciliationVersion":1}'),
        ('binding','grant','grant_reconciled','applied','{"population":"internal","reconciliationVersion":1}'),
        ('binding','future','grant_reconciled','applied','{"population":"internal","reconciliationVersion":1}')`)
      expect(await count()).toBe('0')
    } finally {
      await client.query('ROLLBACK')
      state.client = null
      client.release()
    }
  })
})
