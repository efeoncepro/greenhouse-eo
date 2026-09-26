/** Real PostgreSQL predicates on temporary clones only; the transaction always rolls back. */
import type { PoolClient } from 'pg'

import { describe, expect, it } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'

import { getGreenhousePostgresPool } from '@/lib/db'
import { server } from '@/mocks/node'

import { deleteExternalCanaryAuthArtifacts } from './external-canary-cleanup'

const configured = Boolean(
  process.env.GREENHOUSE_POSTGRES_HOST || process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
)

const tables = [
  'oauth_clients',
  'authorization_codes',
  'refresh_tokens',
  'access_tokens',
  'client_consents',
  'authorization_contexts',
  'passkey_challenges',
  'totp_backup_codes',
  'totp_enrollments',
  'passkey_credentials',
  'magic_link_tokens',
  'sessions'
]

describe.skipIf(!configured)('TASK-1832 shared OAuth cleanup real PostgreSQL predicates', () => {
  it('deletes a run-owned DCR and only the exact canary slice of a shared CIMD client', async () => {
    server.close()
    applyGreenhousePostgresProfile('ops')

    const pool = await getGreenhousePostgresPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const table of tables)
        await client.query(`CREATE TEMP TABLE ${table} (LIKE greenhouse_auth.${table} INCLUDING ALL) ON COMMIT DROP`)

      const insertClient = async (clientId: string, kind: 'dcr' | 'cimd') =>
        client.query(
          `INSERT INTO pg_temp.oauth_clients(
             client_id,registration_kind,client_type,client_name,redirect_uris,grant_types,response_types,
             token_endpoint_auth_method,status,metadata_json,created_by
           ) VALUES($1,$2,'public',$1,ARRAY['https://client.invalid/callback'],ARRAY['authorization_code'],
                    ARRAY['code'],'none','active','{}'::jsonb,'fixture')`,
          [clientId, kind]
        )

      const ownedClientId = 'dcr-task-1832-owned'
      const sharedClientId = 'https://chatgpt.com/oauth/codex/client.json'

      await insertClient(ownedClientId, 'dcr')
      await insertClient(sharedClientId, 'cimd')

      const now = new Date()
      const future = new Date(now.getTime() + 86_400_000)

      const rows = [
        { key: 'owned-other-subject', clientId: ownedClientId, environmentId: 'efeonce-auth', subject: 'subject-real' },
        { key: 'shared-canary', clientId: sharedClientId, environmentId: 'efeonce-auth', subject: 'subject-canary' },
        { key: 'shared-real', clientId: sharedClientId, environmentId: 'efeonce-auth', subject: 'subject-real' },
        {
          key: 'shared-other-environment',
          clientId: sharedClientId,
          environmentId: 'other-auth',
          subject: 'subject-canary'
        }
      ]

      for (const row of rows) {
        await client.query(
          `INSERT INTO pg_temp.authorization_codes(
             code_hash,client_id,subject,environment_id,grant_id,redirect_uri,scopes,code_challenge,
             auth_time,grants_version,expires_at,created_at
           ) VALUES($1,$2,$3,$4,$5,'https://client.invalid/callback',ARRAY['efeonce.mcp.read'],
                    repeat('a',43),$6,1,$7,$6)`,
          [`code-${row.key}`, row.clientId, row.subject, row.environmentId, `grant-${row.key}`, now, future]
        )
        await client.query(
          `INSERT INTO pg_temp.refresh_tokens(
             token_hash,grant_id,client_id,subject,environment_id,scopes,status,expires_at,absolute_expires_at,created_at
           ) VALUES($1,$2,$3,$4,$5,ARRAY['efeonce.mcp.read'],'active',$6,$6,$7)`,
          [`refresh-${row.key}`, `grant-${row.key}`, row.clientId, row.subject, row.environmentId, future, now]
        )
        await client.query(
          `INSERT INTO pg_temp.access_tokens(
             jti,grant_id,client_id,subject,environment_id,scopes,issued_at,expires_at
           ) VALUES($1,$2,$3,$4,$5,ARRAY['efeonce.mcp.read'],$6,$7)`,
          [`access-${row.key}`, `grant-${row.key}`, row.clientId, row.subject, row.environmentId, now, future]
        )
        await client.query(
          `INSERT INTO pg_temp.client_consents(
             consent_id,subject,environment_id,client_id,scope,status,granted_via,granted_by,granted_at
           ) VALUES($1,$2,$3,$4,'efeonce.mcp.read','active','fixture','fixture',$5)`,
          [`consent-${row.key}`, row.subject, row.environmentId, row.clientId, now]
        )
      }

      const contexts = [
        ...rows.map(row => ({ ...row, bindingId: 'binding-other' })),
        {
          key: 'shared-canary-binding',
          clientId: sharedClientId,
          environmentId: 'efeonce-auth',
          subject: 'subject-real',
          bindingId: 'binding-canary'
        }
      ]

      for (const [index, row] of contexts.entries())
        await client.query(
          `INSERT INTO pg_temp.authorization_contexts(
             context_id,context_version,issuer,environment_id,subject,profile_id,client_id,audience,
             organization_id,binding_id,session_hash,upstream_link_id,auth_time,created_at,expires_at
           ) VALUES($1,1,'https://auth.efeonce.org',$2,$3,$4,$5,'https://mcp.efeonce.org',
                    'org-fixture',$6,$7,'link-fixture',$8,$8,$9)`,
          [
            `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
            row.environmentId,
            row.subject,
            `profile-${row.key}`,
            row.clientId,
            row.bindingId,
            `session-${row.key}`,
            now,
            future
          ]
        )

      const tempClient = {
        query: (sql: string, params?: unknown[]) => client.query(sql.replaceAll('greenhouse_auth.', 'pg_temp.'), params)
      } as unknown as PoolClient

      await deleteExternalCanaryAuthArtifacts(tempClient, {
        environmentId: 'efeonce-auth',
        subjects: ['subject-canary'],
        runId: 'task-1832-canary-test',
        bindingIds: ['binding-canary'],
        ownedOauthClientIds: [ownedClientId],
        sharedOauthClientIds: [sharedClientId]
      })

      expect((await client.query('SELECT client_id FROM pg_temp.oauth_clients ORDER BY client_id')).rows).toEqual([
        { client_id: sharedClientId }
      ])

      for (const [table, primaryKey] of [
        ['authorization_codes', 'code_hash'],
        ['refresh_tokens', 'token_hash'],
        ['access_tokens', 'jti'],
        ['client_consents', 'consent_id']
      ] as const) {
        const remaining = (
          await client.query(
            `SELECT ${primaryKey} AS key,environment_id,subject FROM pg_temp.${table} ORDER BY ${primaryKey}`
          )
        ).rows

        expect(remaining).toEqual([
          expect.objectContaining({ environment_id: 'other-auth', subject: 'subject-canary' }),
          expect.objectContaining({ environment_id: 'efeonce-auth', subject: 'subject-real' })
        ])
      }

      expect(
        (
          await client.query(
            'SELECT environment_id,subject,binding_id FROM pg_temp.authorization_contexts ORDER BY environment_id,subject'
          )
        ).rows
      ).toEqual([
        { environment_id: 'efeonce-auth', subject: 'subject-real', binding_id: 'binding-other' },
        { environment_id: 'other-auth', subject: 'subject-canary', binding_id: 'binding-other' }
      ])
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  }, 30_000)
})
