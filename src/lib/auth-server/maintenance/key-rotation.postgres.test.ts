/** TASK-1833: real ledger DDL, concurrent claims, and registry/ledger rollback. */
import { realpathSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { Pool, type PoolClient } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ pool: null as Pool | null }))

vi.mock('@/lib/db', () => ({
  query: async (sql: string, values?: unknown[]) => {
    if (!state.pool) throw new Error('local_postgres_not_ready')

    return (await state.pool.query(sql, values)).rows
  },
  withTransaction: async <T>(work: (client: PoolClient) => Promise<T>): Promise<T> => {
    if (!state.pool) throw new Error('local_postgres_not_ready')
    const client = await state.pool.connect()

    try {
      await client.query('BEGIN')
      const result = await work(client)

      await client.query('COMMIT')

      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}))

import {
  activateRotationOperation,
  attestExistingRotationBaseline,
  claimRotationOperation,
  readRotationSnapshot,
  reconcileBlockedPublication,
  reconcileUncertainCreation,
  transitionRotationOperation
} from './key-rotation-store'

const socket = process.env.AUTH_ROTATION_LOCAL_POSTGRES_SOCKET
const port = Number(process.env.AUTH_ROTATION_LOCAL_POSTGRES_PORT)
const keyName = 'projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256'
const now = new Date('2027-02-01T12:00:00.000Z')

describe.skipIf(!socket)('TASK-1833 key rotation on disposable PostgreSQL', () => {
  beforeAll(() => {
    const directory = realpathSync(socket!)
    const info = statSync(directory)

    if (!/^\/(?:private\/)?tmp\/auth-rotation-smoke\.[A-Za-z0-9]+$/.test(directory) ||
        !info.isDirectory() || (info.mode & 0o077) !== 0 || info.uid !== process.getuid?.() ||
        !Number.isInteger(port) || port < 1 || port > 65535 ||
        !statSync(join(directory, `.s.PGSQL.${port}`)).isSocket()) {
      throw new Error('Rotation test requires an owned private disposable PostgreSQL socket')
    }

    state.pool = new Pool({ host: directory, port, database: 'auth_rotation_local', max: 4 })
  })

  afterAll(async () => {
    await state.pool?.end()
    state.pool = null
  })

  beforeEach(async () => {
    await state.pool!.query(`TRUNCATE greenhouse_auth.signing_key_rotation_events,
      greenhouse_auth.signing_key_rotation_operations, greenhouse_auth.signing_key_events,
      greenhouse_auth.signing_keys CASCADE`)
    await state.pool!.query(`INSERT INTO greenhouse_auth.signing_keys
      (kid,kms_key_version,public_jwk,state,activated_at,retiring_at,retired_at,created_by)
      VALUES ('old-kid',$1,'{"kty":"EC","crv":"P-256","x":"x","y":"y"}'::jsonb,
                'retired',now()-interval '200 days',now()-interval '110 days',now()-interval '100 days','test'),
             ('active-kid',$2,'{"kty":"EC","crv":"P-256","x":"x","y":"y"}'::jsonb,
                'active',now()-interval '100 days',NULL,NULL,'test')`,
      [`${keyName}/cryptoKeyVersions/1`, `${keyName}/cryptoKeyVersions/2`])
  })

  const baseline = () => attestExistingRotationBaseline({
    keyName, predecessorKid: 'old-kid', activeKid: 'active-kid',
    evidenceRef: 'docs/audits/auth-server/rotation-baseline-local.md',
    actor: 'operator:test', executionId: 'local-test'
  })

  it('requires explicit baseline evidence and enforces a narrow role', async () => {
    await expect(attestExistingRotationBaseline({
      keyName, predecessorKid: 'old-kid', activeKid: 'active-kid', evidenceRef: '../unsafe',
      actor: 'test', executionId: 'test'
    })).rejects.toThrow('audit markdown reference')
    expect((await readRotationSnapshot(keyName)).lastVerifiedAt).toBeNull()
    await baseline()
    expect((await readRotationSnapshot(keyName)).lastVerifiedAt).not.toBeNull()
    await expect(baseline()).rejects.toThrow('already exists')

    const grants = await state.pool!.query(`SELECT
      has_table_privilege('greenhouse_auth_key_maintenance','greenhouse_auth.signing_keys','UPDATE') AS keys_update,
      has_table_privilege('greenhouse_auth_key_maintenance','greenhouse_auth.signing_key_rotation_operations','UPDATE') AS operations_update,
      has_table_privilege('greenhouse_auth_key_maintenance','greenhouse_auth.signing_key_events','DELETE') AS events_delete,
      has_table_privilege('greenhouse_auth_key_maintenance','greenhouse_auth.oauth_clients','SELECT') AS oauth_clients_read,
      has_table_privilege('greenhouse_auth_key_maintenance','greenhouse_auth.refresh_tokens','UPDATE') AS refresh_tokens_update`)

    expect(grants.rows[0]).toEqual({ keys_update: true, operations_update: true, events_delete: false,
      oauth_clients_read: false, refresh_tokens_update: false })

    const login = new Pool({ host: socket!, port, database: 'auth_rotation_local',
      user: 'auth_key_maintenance', max: 1 })

    try {
      const identity = await login.query('SELECT current_user')

      expect(identity.rows[0].current_user).toBe('auth_key_maintenance')
      expect((await login.query('SELECT kid FROM greenhouse_auth.signing_keys ORDER BY kid')).rows).toHaveLength(2)
      await expect(login.query('DELETE FROM greenhouse_auth.signing_key_events')).rejects.toThrow('permission denied')
    } finally {
      await login.end()
    }
  })

  it('serializes concurrent ticks and never repeats an uncertain create', async () => {
    await baseline()
    const input = { keyName, actor: 'job:test', executionId: 'test', now }

    const [a, b] = await Promise.all([
      claimRotationOperation({ ...input, owner: '11111111-1111-4111-8111-111111111111' }),
      claimRotationOperation({ ...input, owner: '22222222-2222-4222-8222-222222222222' })
    ])

    expect([a.kind, b.kind].sort()).toEqual(['busy', 'claimed'])
    const claimed = a.operation ?? b.operation!

    await transitionRotationOperation({ operation: claimed, from: 'planned', to: 'creating',
      actor: 'job:test', executionId: 'test', result: 'intent_persisted' })

    const later = await claimRotationOperation({ ...input, owner: '33333333-3333-4333-8333-333333333333',
      now: new Date(now.getTime() + 9 * 60 * 1000) })

    expect(later.kind).toBe('blocked')
    const snapshot = await readRotationSnapshot(keyName)

    expect(snapshot.open?.phase).toBe('create_uncertain')
    expect((await claimRotationOperation({ ...input, owner: '44444444-4444-4444-8444-444444444444',
      now: new Date(now.getTime() + 24 * 60 * 60 * 1000) })).kind).toBe('blocked')

    await expect(reconcileUncertainCreation({ operationId: snapshot.open!.id, keyName,
      versionName: 'projects/other/locations/us-east4/keyRings/x/cryptoKeys/y/cryptoKeyVersions/3',
      evidenceRef: 'docs/audits/auth-server/recovery-review-local.md', actor: 'operator:test',
      executionId: 'local-recovery'
    })).rejects.toThrow('allowlisted key')

    const recovered = await reconcileUncertainCreation({ operationId: snapshot.open!.id, keyName,
      versionName: `${keyName}/cryptoKeyVersions/3`,
      evidenceRef: 'docs/audits/auth-server/recovery-review-local.md', actor: 'operator:test',
      executionId: 'local-recovery' })

    expect(recovered.phase).toBe('version_created')
    expect(recovered.kmsVersion).toBe(`${keyName}/cryptoKeyVersions/3`)
    expect((await claimRotationOperation({ ...input, owner: '55555555-5555-4555-8555-555555555555',
      now: new Date(now.getTime() + 24 * 60 * 60 * 1000) })).operation?.kmsVersion)
      .toBe(`${keyName}/cryptoKeyVersions/3`)
  })

  it('reconciles only a candidate that is already active after publication failure', async () => {
    await state.pool!.query(`UPDATE greenhouse_auth.signing_keys
      SET state = 'retired', retiring_at = now()-interval '2 days', retired_at = now()-interval '1 day'
      WHERE kid = 'active-kid'`)
    await state.pool!.query(`INSERT INTO greenhouse_auth.signing_keys
      (kid,kms_key_version,public_jwk,state,created_by)
      VALUES ('new-kid',$1,'{"kty":"EC","crv":"P-256","x":"x","y":"y"}'::jsonb,'active','test')`,
      [`${keyName}/cryptoKeyVersions/3`])

    const inserted = await state.pool!.query(`INSERT INTO greenhouse_auth.signing_key_rotation_operations
      (key_name,predecessor_kid,phase,kms_version,candidate_kid)
      VALUES ($1,'active-kid','blocked',$2,'new-kid') RETURNING operation_id`,
      [keyName, `${keyName}/cryptoKeyVersions/3`])

    const operationId = inserted.rows[0].operation_id as string

    await expect(reconcileBlockedPublication({ operationId, keyName, candidateKid: 'wrong-kid',
      evidenceRef: 'docs/audits/auth-server/publication-recovery-local.md', actor: 'operator:test',
      executionId: 'local-recovery' })).rejects.toThrow('publication failure')

    const result = await reconcileBlockedPublication({ operationId, keyName, candidateKid: 'new-kid',
      evidenceRef: 'docs/audits/auth-server/publication-recovery-local.md', actor: 'operator:test',
      executionId: 'local-recovery' })

    expect(result.phase).toBe('verified')
    expect(result.verifiedAt).not.toBeNull()
    expect((await readRotationSnapshot(keyName)).open).toBeNull()
  })

  it('rolls registry, key events and ledger back together when activation audit fails', async () => {
    await baseline()

    const claimed = await claimRotationOperation({ keyName, owner: '11111111-1111-4111-8111-111111111111',
      actor: 'job:test', executionId: 'test', now })

    expect(claimed.operation).toBeDefined()
    let op = claimed.operation!

    op = await transitionRotationOperation({ operation: op, from: 'planned', to: 'creating',
      actor: 'job:test', executionId: 'test', result: 'intent_persisted' })
    op = await transitionRotationOperation({ operation: op, from: 'creating', to: 'version_created',
      actor: 'job:test', executionId: 'test', result: 'version_recorded',
      kmsVersion: `${keyName}/cryptoKeyVersions/3` })
    op = await transitionRotationOperation({ operation: op, from: 'version_created', to: 'preverified',
      actor: 'job:test', executionId: 'test', result: 'candidate_signature_verified', candidateKid: 'new-kid' })

    await state.pool!.query(`CREATE FUNCTION greenhouse_auth.reject_activated_event() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type = 'activated' THEN
        RAISE EXCEPTION 'local_reject_activation_audit'; END IF; RETURN NEW; END $$`)
    await state.pool!.query(`CREATE TRIGGER local_reject_activated_event BEFORE INSERT
      ON greenhouse_auth.signing_key_events FOR EACH ROW
      EXECUTE FUNCTION greenhouse_auth.reject_activated_event()`)

    try {
      await expect(activateRotationOperation({ operation: op,
        prepared: { versionName: `${keyName}/cryptoKeyVersions/3`, kid: 'new-kid',
          publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' } },
        actor: 'job:test', executionId: 'test'
      })).rejects.toThrow('local_reject_activation_audit')
      const keys = await state.pool!.query(`SELECT kid,state FROM greenhouse_auth.signing_keys ORDER BY kid`)

      expect(keys.rows).toEqual([{ kid: 'active-kid', state: 'active' }, { kid: 'old-kid', state: 'retired' }])
      expect((await readRotationSnapshot(keyName)).open?.phase).toBe('preverified')
    } finally {
      await state.pool!.query('DROP TRIGGER local_reject_activated_event ON greenhouse_auth.signing_key_events')
      await state.pool!.query('DROP FUNCTION greenhouse_auth.reject_activated_event()')
    }
  })
})
