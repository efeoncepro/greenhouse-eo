/** TASK-1836 shared grant expiry: execute the production grant SELECT on a transaction-local table.
 * Identity fixtures isolate this regression; no assertion depends on the SQL's textual predicate.
 */
import type { PoolClient } from 'pg'
import { describe, expect, it, vi } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'

const state = vi.hoisted(() => ({ client: null as PoolClient | null }))

vi.mock('@/lib/db', async original => ({
  ...(await original<Record<string, unknown>>()),
  query: async (sql: string, values?: unknown[]) => {
    if (sql.includes('FROM greenhouse_core.external_capability_grants')) {
      if (!state.client) throw new Error('fixture_not_ready')

      return (
        await state.client.query(
          sql.replaceAll('greenhouse_core.external_capability_grants', 'pg_temp.external_capability_grants'),
          values
        )
      ).rows
    }

    if (sql.includes('FROM greenhouse_core.external_identity_environments'))
      return [{ environment_id: 'efeonce-auth', issuer_class: 'external', status: 'active' }]
    if (sql.includes('FROM greenhouse_core.identity_profile_source_links l'))
      return [
        {
          profile_id: 'person',
          link_active: true,
          profile_active: true,
          profile_status: 'active',
          merged_into_profile_id: null
        }
      ]
    if (sql.includes('FROM greenhouse_core.external_member_invitations i'))
      return [
        {
          binding_id: 'binding',
          organization_id: 'organization',
          external_organization_ref: 'external',
          binding_status: 'active',
          grants_version: 3,
          designated_admin_profile_id: null,
          revoked_at: null
        }
      ]
    throw new Error('unexpected_fixture_query')
  }
}))
import { getGreenhousePostgresPool } from '@/lib/db'
import { server } from '@/mocks/node'
import { resolveExternalAccess } from './resolve-external-access'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

describe.skipIf(!configured)('TASK-1836 external grants expiry real SQL', () => {
  it('excludes expired/equal-now grants while retaining future and legacy NULL grants per person/binding', async () => {
    server.close()
    applyGreenhousePostgresProfile('ops')
    const client = await (await getGreenhousePostgresPool()).connect()

    state.client = client

    try {
      await client.query('BEGIN')
      // Copy only the column types from the installed schema, never runtime rows.
      await client.query(
        'CREATE TEMP TABLE external_capability_grants ON COMMIT DROP AS SELECT binding_id,capability,status,profile_id,expires_at FROM greenhouse_core.external_capability_grants WITH NO DATA'
      )
      await client.query(`INSERT INTO pg_temp.external_capability_grants(binding_id,capability,status,profile_id,expires_at) VALUES
        ('binding','legacy.binding','active',NULL,NULL),
        ('binding','legacy.person','active','person',NULL),
        ('binding','future.person','active','person',NOW()+INTERVAL '1 hour'),
        ('binding','future.binding','active',NULL,NOW()+INTERVAL '1 hour'),
        ('binding','expired.person','active','person',NOW()-INTERVAL '1 second'),
        ('binding','expired.binding','active',NULL,NOW()-INTERVAL '1 second'),
        ('binding','boundary.person','active','person',NOW()),
        ('binding','other.person','active','other',NULL),
        ('binding','revoked.person','revoked','person',NULL),
        ('other-binding','other.binding','active','person',NULL)`)
      const result = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'subject' })

      expect(result.outcome).toBe('bound')
      expect(result.memberships).toHaveLength(1)
      expect(result.memberships[0]?.grants).toEqual([
        'future.binding',
        'future.person',
        'legacy.binding',
        'legacy.person'
      ])
      // Expiration takes effect on the next read even without a status mutation/version bump.
      await client.query(
        "UPDATE pg_temp.external_capability_grants SET expires_at=NOW()-INTERVAL '1 second' WHERE capability='future.person'"
      )
      const next = await resolveExternalAccess({ environmentId: 'efeonce-auth', subject: 'subject' })

      expect(next.memberships[0]?.grants).toEqual(['future.binding', 'legacy.binding', 'legacy.person'])
    } finally {
      await client.query('ROLLBACK')
      state.client = null
      client.release()
    }
  })
})
