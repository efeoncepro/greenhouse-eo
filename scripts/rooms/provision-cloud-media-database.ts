/** TASK-2072. Exact Rooms database only; default read-only. Passwords never enter SQL or output. */
import { createHash, randomBytes } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { Client } from 'pg'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { getGreenhousePostgresPool, closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { createGoogleAuth } from '../../src/lib/google-credentials'

const PROJECT = 'efeonce-group', INSTANCE = 'efeonce-group:us-east4:greenhouse-pg-dev'
const DATABASE = 'rooms_production', ROLE = 'rooms_media_worker'
const SECRET = 'rooms-production-postgres-media-worker-password'
const repo = fileURLToPath(new URL('../../../efeonce-rooms/', import.meta.url))

const hashes: Record<string, string> = {
  '1792962301842_rooms-foundation.sql': '15d5e843ceeacd4c53417b6594283d109ebe9aa8891062e6362debe984c3600f',
  '1792963858690_rooms-content-v2.sql': '4e24b99b271769332ebd6a2d8fa5066be0356481b97f9a3b66404a7f551de36e',
  '1792964148932_rooms-oidc-consumer.sql': 'a11175aed58f15908102293bd382f7b9b3f8946e32dcf372dbe270cdc894539f',
  '1792964574644_rooms-invitations.sql': '95ba9935c4a855cdd99cbaba0a43d6f1ea93366b851c942da9c6ed7977e1516b',
  '1792964731337_rooms-invitation-issuer-binding.sql': 'c5ec49f2018306507d7adcc1eddff13ddd282021227647801a7030609ab2205a',
  '1792968329622_rooms-private-image-media.sql': 'f1ed5baccc9b5f087e550176eae7f82945f5dc7674c88b1a9b048cf311309fac',
  '1793022282668_rooms-media-storage-generations.sql': '0ab4c2095422117970b3ab238aaeccfb43851a8b3c16a9ec8dc85e08f8999a87',
}

let phase = 'arguments'
const fail = (code: string): never => { throw new Error(code) }
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`

async function validateFiles() {
  const names = (await readdir(resolve(repo, 'migrations'))).filter(n => n.endsWith('.sql')).sort()

  if (JSON.stringify(names) !== JSON.stringify(Object.keys(hashes))) fail('migration_inventory')
  for (const name of names) if (createHash('sha256').update(await readFile(resolve(repo, 'migrations', name))).digest('hex') !== hashes[name]) fail('migration_hash')
}

async function main() {
  const args = process.argv.slice(2)

  if (args.some(a => a !== '--apply') || args.length > 1) fail('arguments')
  const apply = args.includes('--apply')

  phase = 'migration-files'
  await validateFiles()
  phase = 'operator-environment'
  loadGreenhouseToolEnv()
  if (process.env.GCP_AUTH_PREFERENCE !== 'ambient_adc' || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON !== '' || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64 !== '') fail('explicit_operator_adc_required')
  phase = 'admin-profile'
  const profile = applyGreenhousePostgresProfile('admin')

  if (profile.instanceConnectionName !== INSTANCE || !['postgres', 'greenhouse_app'].includes(profile.database)) fail('admin_target')
  const auth = createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })

  const request = async <T>(url: string, method: 'GET' | 'POST' | 'PUT', data?: unknown): Promise<T> =>
    (await auth.request<T>({ url, method, ...(data === undefined ? {} : { data }), timeout: 20000, retry: false })).data

  const secretBase = `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets`

  const readPassword = async (name: string) => {
    const data = await request<{ name: string; payload: { data: string } }>(`${secretBase}/${name}/versions/1:access`, 'GET')

    if (data.name.replace('projects/183008134038/', `projects/${PROJECT}/`) !== `projects/${PROJECT}/secrets/${name}/versions/1`) fail('secret_identity')
    const value = Buffer.from(data.payload.data, 'base64').toString('utf8')

    if (!/^[A-Za-z0-9_-]{32,128}$/.test(value)) fail('secret_shape')

return value
  }

  const admin = await (await getGreenhousePostgresPool()).connect()
  const connector = new Connector({ auth })
  let driverReady = false, locked = false, created = false, actorName = ''
  const clients: Client[] = []

  try {
    phase = 'metadata'
    const actor = (await admin.query('SELECT current_user AS name,current_setting(\'server_version_num\')::int AS version')).rows[0]

    actorName = actor.name
    if (actor.version < 160000 || actor.version >= 170000) fail('engine')
    const database = (await admin.query('SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=$1', [DATABASE])).rows[0]

    if (database?.owner !== 'rooms_migrator') fail('database_owner')

    const readRole = async () => (await admin.query(`SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit,rolconnlimit,
      (SELECT count(*)::int FROM pg_auth_members WHERE member=r.oid) AS memberships
      FROM pg_roles r WHERE rolname=$1`, [ROLE])).rows[0]

    const assertRole = (r: Record<string, unknown>) => {
      if (!r || r.rolname !== ROLE || r.rolcanlogin !== true || r.rolconnlimit !== 2 || r.memberships !== 0 || ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','rolinherit'].some(k => r[k] !== false)) fail('worker_role_drift')
    }

    const initialRole = await readRole()

    if (initialRole) assertRole(initialRole)
    const driver = await connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC })

    driverReady = true

    const connect = async (user: string, password: string) => {
      const client = new Client({ ...driver, user, password, database: DATABASE, connectionTimeoutMillis: 10000,
        statement_timeout: 60000, options: '-c idle_session_timeout=60000', application_name: 'rooms-media-infra-task2072' })

      client.on('error', () => {})
      clients.push(client); await client.connect()
      const identity = (await client.query('SELECT current_user AS name,current_database() AS database')).rows[0]

      if (identity.name !== user || identity.database !== DATABASE) fail('connection_identity')

return client
    }

    phase = 'migrator-connect'
    const migrator = await connect('rooms_migrator', await readPassword('rooms-production-postgres-migrator-password'))
    const appliedBefore = (await migrator.query('SELECT name FROM public.rooms_migrations ORDER BY id')).rows.map(r => r.name as string)
    const allNames = Object.keys(hashes).map(n => n.replace('.sql', ''))

    if (![5,7].includes(appliedBefore.length) || JSON.stringify(appliedBefore) !== JSON.stringify(allNames.slice(0, appliedBefore.length))) fail('applied_inventory')

    const snapshot = async () => (await migrator.query(`SELECT
      (SELECT count(*)::int FROM rooms.rooms) AS rooms,
      (SELECT count(*)::int FROM rooms.drafts) AS drafts,
      (SELECT count(*)::int FROM rooms.editions) AS editions,
      (SELECT md5(COALESCE(string_agg(md5(snapshot::text),'' ORDER BY organization_id,room_id,id),'')) FROM rooms.editions) AS edition_hash`)).rows[0]

    const before = await snapshot()

    console.log(JSON.stringify({ phase: 'plan', apply, database: DATABASE, appliedBefore, workerRoleExists: !!initialRole, contentBefore: before, mutationsExecuted: false }))
    if (!apply) return
    phase = 'lock'
    if (!(await admin.query("SELECT pg_try_advisory_lock(hashtextextended('rooms-production-bootstrap',2069)) AS acquired")).rows[0].acquired) fail('bootstrap_busy')
    locked = true
    phase = 'migrations'
    const requireRooms = createRequire(resolve(repo, 'package.json'))
    const { runner } = requireRooms('node-pg-migrate') as { runner: (opts: Record<string, unknown>) => Promise<{name:string}[]> }

    const migrations = await runner({ dbClient: migrator, dir: resolve(repo, 'migrations'), direction: 'up',
      migrationsSchema: 'public', migrationsTable: 'rooms_migrations', count: Infinity, checkOrder: true,
      singleTransaction: true, log: () => {}, logger: { info: () => {}, warn: () => {}, error: () => {} } })

    if (JSON.stringify(await snapshot()) !== JSON.stringify(before)) fail('content_changed')
    const names = (await migrator.query('SELECT name FROM public.rooms_migrations ORDER BY id')).rows.map(r => r.name)

    if (JSON.stringify(names) !== JSON.stringify(allNames)) fail('migration_readback')
    phase = 'worker-role'
    let workerPassword: string

    if (initialRole) workerPassword = await readPassword(SECRET)
    else {
      // Reject partial/conflicting secret before creating any role; never rotate an existing credential.
      let secretExists = true

      try { await request(`${secretBase}/${SECRET}`, 'GET') }
      catch (e) { if ((e as {response?:{status?:number}}).response?.status === 404) secretExists = false; else throw e }

      if (secretExists) fail('secret_without_role_requires_review')
      workerPassword = randomBytes(48).toString('base64url')
      await request(`${secretBase}?secretId=${SECRET}`, 'POST', { replication: { automatic: {} }, labels: { product: 'rooms', purpose: 'media-worker' } })
      const version = await request<{name:string}>(`${secretBase}/${SECRET}:addVersion`, 'POST', { payload: { data: Buffer.from(workerPassword).toString('base64') } })

      if (!version.name.endsWith('/versions/1')) fail('unexpected_secret_version')
      await admin.query(`CREATE ROLE ${ROLE} LOGIN PASSWORD NULL NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 2`)
      created = true
      // Remove PostgreSQL16 creator membership; worker inherits no roles and owns no schema/database.
      const membership = (await admin.query('SELECT 1 FROM pg_auth_members WHERE roleid=(SELECT oid FROM pg_roles WHERE rolname=$1) AND member=(SELECT oid FROM pg_roles WHERE rolname=current_user)', [ROLE])).rowCount

      if (membership) await admin.query(`REVOKE ${ROLE} FROM ${quote(actorName)}`)
      phase = 'initialize-new-password-api'
      const base = `https://sqladmin.googleapis.com/v1/projects/${PROJECT}`
      const users = await request<{items?:{name:string;type?:string;databaseRoles?:string[]}[]}>(`${base}/instances/greenhouse-pg-dev/users`, 'GET')
      const found = users.items?.filter(u => u.name === ROLE) ?? []

      if (found.length !== 1 || (found[0].type && found[0].type !== 'BUILT_IN') || found[0].databaseRoles?.length) fail('new_user_visibility')
      let operation = await request<{name:string;status:string;error?:unknown}>(`${base}/instances/greenhouse-pg-dev/users?name=${ROLE}`, 'PUT', { name: ROLE, password: workerPassword })

      if (!/^[a-zA-Z0-9_-]+$/.test(operation.name)) fail('operation_identity')

      for (let attempt=0; operation.status !== 'DONE' && attempt<30; attempt++) {
        await new Promise(resolve => setTimeout(resolve,1000))
        operation = await request(`${base}/operations/${operation.name}`, 'GET')
      }

      if (operation.status !== 'DONE' || operation.error) fail('password_operation')
    }

    phase = 'worker-grants'
    await migrator.query('BEGIN')

    try {
      await migrator.query(`GRANT CONNECT ON DATABASE rooms_production TO ${ROLE}`)
      await migrator.query(`GRANT USAGE ON SCHEMA rooms TO ${ROLE}`)
      await migrator.query(`GRANT SELECT ON rooms.rooms,rooms.assets,rooms.asset_versions,rooms.upload_sessions,rooms.media_jobs,rooms.media_renditions TO ${ROLE}`)
      await migrator.query(`GRANT UPDATE(revision,updated_at) ON rooms.rooms TO ${ROLE}`)
      await migrator.query(`GRANT UPDATE(state,metadata,problem_code) ON rooms.asset_versions TO ${ROLE}`)
      await migrator.query(`GRANT UPDATE(state,receiving_nonce) ON rooms.upload_sessions TO ${ROLE}`)
      await migrator.query(`GRANT UPDATE(state,attempts,lease_token,lease_expires_at) ON rooms.media_jobs TO ${ROLE}`)
      await migrator.query(`GRANT INSERT ON rooms.media_renditions,rooms.audit,rooms.outbox TO ${ROLE}`)
      await migrator.query('COMMIT')
    } catch (e) { await migrator.query('ROLLBACK'); throw e }

    phase = 'readback'
    assertRole(await readRole())
    const worker = await connect(ROLE, workerPassword)

    for (const sql of ['CREATE TABLE rooms.__forbidden(id int)','SELECT * FROM rooms.sessions LIMIT 0','SELECT * FROM rooms.invitations LIMIT 0','SELECT * FROM rooms.identity_bindings LIMIT 0','UPDATE rooms.rooms SET lifecycle=lifecycle WHERE false','DELETE FROM rooms.media_renditions WHERE false']) {
      await worker.query('BEGIN')
      let denied = false

      try { await worker.query(sql) } catch(e) { denied = (e as {code?:string}).code === '42501' }
      finally { await worker.query('ROLLBACK') }

      if (!denied) fail('negative_acl')
    }

    await worker.query('SELECT asset_version_id FROM rooms.media_jobs WHERE state=\'queued\' LIMIT 1')
    await worker.query('BEGIN'); await worker.query('UPDATE rooms.rooms SET revision=revision WHERE false'); await worker.query('ROLLBACK')
    const grants = (await worker.query(`SELECT table_name,privilege_type FROM information_schema.table_privileges WHERE grantee=current_user AND table_schema='rooms' ORDER BY table_name,privilege_type`)).rows
    const columns = (await worker.query(`SELECT table_name,column_name FROM information_schema.column_privileges WHERE grantee=current_user AND table_schema='rooms' AND privilege_type='UPDATE' ORDER BY table_name,column_name`)).rows
    const tables = (await migrator.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='rooms'")).rows[0].count
    const receipt = { at:new Date().toISOString(),status:'applied_and_verified',instance:INSTANCE,database:DATABASE,tables,migrationsApplied:migrations.map(m=>m.name),migrations:names,contentPreserved:true,contentBefore:before,workerRole:await readRole(),workerConnection:'PASS',negativeAclChecks:6,grants,updateColumns:columns,secretVersion:`projects/${PROJECT}/secrets/${SECRET}/versions/1`,newPasswordInitialized:created,passwordsInSql:false,flagsChanged:false,publicConnectResidual:'Other databases retain inherited PUBLIC CONNECT/TEMP; no shared/global ACL change in this rollout.' }

    await writeFile(resolve('docs/audits/rooms/2026-10-26-media-database-infra.json'),JSON.stringify(receipt,null,2)+'\n')
    console.log(JSON.stringify(receipt))
  } finally {
    for (const c of clients) await c.end().catch(()=>{})
    if (driverReady) connector.close()
    if (locked) await admin.query("SELECT pg_advisory_unlock(hashtextextended('rooms-production-bootstrap',2069))").catch(()=>{})
    admin.release()
  }
}

main().catch(e=>{ console.error(JSON.stringify({status:'failed',phase,code:/^[A-Za-z0-9_]{1,80}$/.test((e as Error).message)?(e as Error).message:'sanitized_failure'}));process.exitCode=1 }).finally(closeGreenhousePostgres)
