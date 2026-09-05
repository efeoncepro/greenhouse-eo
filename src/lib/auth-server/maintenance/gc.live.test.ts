/** Real PostgreSQL SQL/constraints on temporary clones, never production deletes. pnpm test:live only. */
import { randomBytes, randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'

import { getGreenhousePostgresPool } from '@/lib/db'
import { server } from '@/mocks/node'
import type { AuthGcResult } from './gc'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

const tables = [
  'passkey_challenges',
  'magic_link_tokens',
  'auth_rate_limits',
  'internal_login_transactions',
  'authorization_codes',
  'access_tokens',
  'refresh_tokens',
  'client_consents',
  'authorization_contexts',
  'corporate_session_evidence',
  'sessions'
]

describe.skipIf(!configured)('auth GC real PostgreSQL predicates and FK ordering', () => {
  it('preserves live refresh ancestry and session evidence, removes expired context dependency chains, and dry run does not delete', async () => {
    server.close()
    applyGreenhousePostgresProfile('ops')

    const pool = await getGreenhousePostgresPool(),
      client = await pool.connect()

    try {
      await client.query('BEGIN')

      const security = (
        await client.query(`SELECT p.prosecdef,r.rolname AS owner,p.proconfig,
 has_function_privilege('greenhouse_app',p.oid,'EXECUTE') AS app_execute,
 has_function_privilege('greenhouse_runtime',p.oid,'EXECUTE') AS runtime_execute,
 has_table_privilege('greenhouse_app','greenhouse_auth.client_consents','DELETE') AS app_delete,
 EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
 WHERE p.oid='greenhouse_auth.gc_ephemeral_state(integer,integer,boolean)'::regprocedure`)
      ).rows[0]

      expect(security).toMatchObject({
        prosecdef: true,
        owner: 'greenhouse_ops',
        app_execute: true,
        runtime_execute: true,
        app_delete: false,
        public_execute: false
      })
      expect(security.proconfig).toContain('search_path=pg_catalog')

      for (const table of tables)
        await client.query(`CREATE TEMP TABLE ${table} (LIKE greenhouse_auth.${table} INCLUDING ALL) ON COMMIT DROP`)
      await client.query(
        'ALTER TABLE pg_temp.corporate_session_evidence ADD FOREIGN KEY(session_hash) REFERENCES pg_temp.sessions(session_hash) ON DELETE RESTRICT'
      )
      await client.query(
        'ALTER TABLE pg_temp.authorization_contexts ADD FOREIGN KEY(session_hash) REFERENCES pg_temp.corporate_session_evidence(session_hash) ON DELETE RESTRICT'
      )
      for (const table of ['authorization_codes', 'access_tokens', 'refresh_tokens', 'client_consents'])
        await client.query(
          `ALTER TABLE pg_temp.${table} ADD FOREIGN KEY(authorization_context_id) REFERENCES pg_temp.authorization_contexts(context_id) ON DELETE RESTRICT`
        )

      const old = new Date(Date.now() - 90 * 86400000),
        expired = new Date(Date.now() - 60 * 86400000),
        future = new Date(Date.now() + 86400000)

      const oldContext = randomUUID(),
        liveContext = randomUUID(),
        oldSession = randomBytes(32).toString('hex'),
        liveSession = randomBytes(32).toString('hex')

      for (const [context, session] of [
        [oldContext, oldSession],
        [liveContext, liveSession]
      ]) {
        await client.query(
          `INSERT INTO pg_temp.sessions(session_hash,subject,environment_id,profile_id,link_id,amr,auth_time,created_at,last_seen_at,expires_at,absolute_expires_at)
 VALUES($1,'fixture','fixture','fixture','fixture',ARRAY['entra_oidc'],$2,$2,$2,$3,$3)`,
          [session, old, expired]
        )
        await client.query(
          `INSERT INTO pg_temp.corporate_session_evidence(session_hash,upstream_link_id,tenant_id,object_id,upstream_issuer,authenticated_at) VALUES($1,'fixture',$2,$3,'https://issuer.invalid',$4)`,
          [session, randomUUID(), randomUUID(), old]
        )
        await client.query(
          `INSERT INTO pg_temp.authorization_contexts(context_id,context_version,issuer,environment_id,subject,profile_id,client_id,audience,organization_id,binding_id,session_hash,upstream_link_id,auth_time,created_at,expires_at)
 VALUES($1,1,'https://issuer.invalid','fixture','fixture','fixture','fixture','https://mcp.invalid','fixture','fixture',$2,'fixture',$3,$3,$4)`,
          [context, session, old, context === oldContext ? expired : future]
        )
      }

      await client.query(
        `INSERT INTO pg_temp.client_consents(consent_id,subject,environment_id,client_id,scope,granted_via,granted_by,authorization_context_id,granted_at) VALUES('dead-consent','fixture','fixture','fixture','efeonce.mcp.read','fixture','fixture',$1,$2)`,
        [oldContext, old]
      )

      for (const [hash, grant, status, expiry, context] of [
        ['old-parent', 'live-family', 'rotated', expired, liveContext],
        ['live-child', 'live-family', 'active', future, liveContext],
        ['dead-token', 'dead-family', 'active', expired, oldContext]
      ] as const) {
        await client.query(
          `INSERT INTO pg_temp.refresh_tokens(token_hash,grant_id,client_id,subject,environment_id,scopes,status,rotated_to_hash,expires_at,absolute_expires_at,created_at,authorization_context_id)
 VALUES($1,$2,'fixture','fixture','fixture',ARRAY['efeonce.mcp.read'],$3,$4,$5,$5,$6,$7)`,
          [hash, grant, status, status === 'rotated' ? 'live-child' : null, expiry, old, context]
        )
      }

      const challenge = randomBytes(32).toString('hex')

      await client.query(
        `INSERT INTO pg_temp.passkey_challenges(challenge_hash,purpose,environment_id,created_at,expires_at) VALUES($1,'authentication','fixture',$2,$3)`,
        [challenge, old, expired]
      )

      const definition = (
        await client.query(
          "SELECT pg_get_functiondef('greenhouse_auth.gc_ephemeral_state(integer,integer,boolean)'::regprocedure) AS definition"
        )
      ).rows[0].definition as string

      // Exercise the INSTALLED normative body against temporary clones, including restrictive dependency FKs.
      await client.query(definition.replaceAll('greenhouse_auth.', 'pg_temp.'))

      const run = async (dryRun: boolean) =>
        (
          await client.query<{ result: AuthGcResult }>('SELECT pg_temp.gc_ephemeral_state(500,30,$1) AS result', [
            dryRun
          ])
        ).rows[0].result

      const dry = await run(true)

      expect(dry.counts.refresh_tokens).toBe(1)
      expect(Number((await client.query('SELECT COUNT(*) AS count FROM pg_temp.refresh_tokens')).rows[0].count)).toBe(3)
      const applied = await run(false)

      expect(applied.counts.refresh_tokens).toBe(1)
      expect(applied.counts.client_consents).toBe(1)
      expect(applied.counts.authorization_contexts).toBe(1)
      expect(applied.counts.corporate_session_evidence).toBe(1)
      expect(applied.counts.sessions).toBe(1)
      expect(applied.counts.passkey_challenges).toBe(1)
      expect(
        (await client.query('SELECT token_hash FROM pg_temp.refresh_tokens ORDER BY token_hash')).rows.map(
          row => row.token_hash
        )
      ).toEqual(['live-child', 'old-parent'])
      expect((await client.query('SELECT session_hash FROM pg_temp.sessions')).rows).toEqual([
        { session_hash: liveSession }
      ])
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  }, 30000)
})
