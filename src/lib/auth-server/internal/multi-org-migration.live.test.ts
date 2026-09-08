/** TASK-1844: execute the actual pending DDL against PG TEMP tables, never the shared auth schema.
 * Run with pnpm test:live. Rollback preserves the live schema, contexts, roles and flags.
 */
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { getGreenhousePostgresPool } from '@/lib/db'
import { server } from '@/mocks/node'
import { PostgresInternalContextStore } from './postgres-store'
import type { InternalAuthorizationContext } from './context'
import type { query } from '@/lib/db'

const hasPgConfig = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('TASK-1844 actual migration SQL and writer on temporary PostgreSQL tables', () => {
  it('expands safely, retains old writer compatibility, separates v1/v2 after contract and prevents promotion', async () => {
    server.close()
    const pool = await getGreenhousePostgresPool()
    const client = await pool.connect()

    const ddl = async (phase: string) => {
      const pending = await readFile(`docs/tasks/pending-migrations/TASK-1844-internal-context-version-${phase}.sql.pending`, 'utf8')

      // Exact SQL except the destination: PG's private temporary namespace cannot touch shared data.
      return pending.split('-- Up Migration')[1].split('-- Down Migration')[0].replaceAll('greenhouse_auth.', 'pg_temp.')
    }

    try {
      await client.query('BEGIN')
      await client.query("SET LOCAL statement_timeout='10s'")
      await client.query('CREATE TEMP TABLE authorization_contexts (LIKE greenhouse_auth.authorization_contexts INCLUDING DEFAULTS INCLUDING CONSTRAINTS) ON COMMIT DROP')
      await client.query(`CREATE UNIQUE INDEX authorization_contexts_session_client_uidx ON authorization_contexts
        (session_hash,client_id,binding_id,issuer,audience) WHERE revoked_at IS NULL`)
      const readQuery: typeof query = async (sql, values) => (await client.query(sql.replaceAll('greenhouse_auth.', 'pg_temp.'), values)).rows
      const store = new PostgresInternalContextStore(readQuery)
      const now = new Date()

      const context: InternalAuthorizationContext = { id: randomUUID(), version: 1,
        issuer: 'https://task1844.invalid', environmentId: 'task1844', subject: 'task1844', profileId: 'task1844', clientId: 'task1844',
        audience: 'https://mcp.invalid/mcp', organizationId: 'task1844-anchor', bindingId: 'task1844-binding',
        sessionHash: 'a'.repeat(64), upstreamLinkId: 'task1844-upstream', authTime: now, createdAt: now,
        expiresAt: new Date(now.getTime()+3600000), revokedAt: null }

      const v1 = await store.insert(context)

      await client.query(await ddl('expand'))
      expect((await store.insert({ ...context, id: randomUUID() })).id).toBe(v1.id)
      // The still-present legacy unique index must not silently attach a v2 request to v1.
      await expect(store.insert({ ...context, id: randomUUID(), version: 2 })).rejects.toThrow()
      await client.query(await ddl('contract'))
      const v2 = await store.insert({ ...context, id: randomUUID(), version: 2 })

      expect(v2.version).toBe(2)
      expect(v2.id).not.toBe(v1.id)
      expect((await store.insert({ ...context, id: randomUUID(), version: 2 })).id).toBe(v2.id)
      expect((await store.get(v1.id))?.version).toBe(1)
      await client.query('SAVEPOINT immutable_version')
      await expect(client.query('UPDATE pg_temp.authorization_contexts SET context_version=2 WHERE context_id=$1', [v1.id])).rejects.toThrow('authorization_context_version_immutable')
      await client.query('ROLLBACK TO SAVEPOINT immutable_version')
      expect((await store.get(v1.id))?.version).toBe(1)
      expect((await client.query('SELECT count(*)::int AS total FROM pg_temp.authorization_contexts')).rows[0].total).toBe(2)
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  }, 30000)
})
