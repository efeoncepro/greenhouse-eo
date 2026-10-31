/** TASK-2069. Read-only plan by default. No secret values, SQL text or provider errors in output. --resume-initial-passwords is an explicit, reviewed partial-bootstrap reconciliation only. */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { Client, type PoolClient } from 'pg'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { getGreenhousePostgresPool, closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { createGoogleAuth } from '../../src/lib/google-credentials'

const INSTANCE = 'efeonce-group:us-east4:greenhouse-pg-dev'
const DATABASE = 'rooms_production'
const ROLES = ['rooms_runtime', 'rooms_migrator'] as const
const LIMITS = { rooms_runtime: 8, rooms_migrator: 1 } as const

const REFS = {
  rooms_runtime: 'projects/efeonce-group/secrets/rooms-production-postgres-runtime-password/versions/1',
  rooms_migrator: 'projects/efeonce-group/secrets/rooms-production-postgres-migrator-password/versions/1'
} as const

const MIGRATIONS = {
  '1792962301842_rooms-foundation.sql': '15d5e843ceeacd4c53417b6594283d109ebe9aa8891062e6362debe984c3600f',
  '1792963858690_rooms-content-v2.sql': '4e24b99b271769332ebd6a2d8fa5066be0356481b97f9a3b66404a7f551de36e',
  '1792964148932_rooms-oidc-consumer.sql': 'a11175aed58f15908102293bd382f7b9b3f8946e32dcf372dbe270cdc894539f',
  '1792964574644_rooms-invitations.sql': '95ba9935c4a855cdd99cbaba0a43d6f1ea93366b851c942da9c6ed7977e1516b',
  '1792964731337_rooms-invitation-issuer-binding.sql':
    'c5ec49f2018306507d7adcc1eddff13ddd282021227647801a7030609ab2205a'
} as const

const TABLES = [
  'audit',
  'auth_events',
  'auth_transactions',
  'command_receipts',
  'drafts',
  'editions',
  'grants',
  'identity_bindings',
  'internal_notes',
  'invitation_proofs',
  'invitation_rate_limits',
  'invitation_sessions',
  'invitation_transactions',
  'invitations',
  'memberships',
  'outbox',
  'principals',
  'rooms',
  'sessions'
]

const EXPECTED_PRIVILEGES: Record<string, string[]> = {
  audit: ['INSERT', 'SELECT'],
  auth_events: ['DELETE', 'INSERT', 'SELECT'],
  auth_transactions: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  command_receipts: ['INSERT', 'SELECT'],
  drafts: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  editions: ['INSERT', 'SELECT'],
  grants: ['INSERT', 'SELECT', 'UPDATE'],
  identity_bindings: ['SELECT'],
  internal_notes: ['SELECT'],
  invitation_proofs: ['INSERT', 'SELECT'],
  invitation_rate_limits: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  invitation_sessions: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  invitation_transactions: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  invitations: ['INSERT', 'SELECT', 'UPDATE'],
  memberships: ['SELECT'],
  outbox: ['INSERT', 'SELECT'],
  principals: ['SELECT'],
  rooms: ['INSERT', 'SELECT', 'UPDATE'],
  sessions: ['DELETE', 'INSERT', 'SELECT', 'UPDATE']
}

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)))

const roomsRepo = resolve(repo, '../efeonce-rooms'),
  migrationDir = resolve(roomsRepo, 'migrations')

const quote = (value: string) => `"${value.replaceAll('"', '""')}"`

const fail = (code: string): never => {
  throw new Error(code)
}

type Db = Pick<Client, 'query'> | Pick<PoolClient, 'query'>
type RoleRow = {
  rolname: string
  rolsuper: boolean
  rolcreatedb: boolean
  rolcreaterole: boolean
  rolreplication: boolean
  rolbypassrls: boolean
  rolinherit: boolean
  rolcanlogin: boolean
  rolconnlimit: number
  memberships: number
  members: number
}
let phase = 'arguments'

async function readRoles(db: Db) {
  return (
    await db.query<RoleRow>(
      `SELECT r.rolname,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,
 r.rolbypassrls,r.rolinherit,r.rolcanlogin,r.rolconnlimit,
 (SELECT count(*)::int FROM pg_auth_members WHERE member=r.oid) AS memberships,
 (SELECT count(*)::int FROM pg_auth_members WHERE roleid=r.oid) AS members
 FROM pg_roles r WHERE rolname=ANY($1) ORDER BY rolname`,
      [[...ROLES]]
    )
  ).rows
}

function assertRole(row: RoleRow) {
  if (
    !ROLES.includes(row.rolname as (typeof ROLES)[number]) ||
    !row.rolcanlogin ||
    row.rolsuper ||
    row.rolcreatedb ||
    row.rolcreaterole ||
    row.rolreplication ||
    row.rolbypassrls ||
    row.rolinherit ||
    row.memberships !== 0 ||
    row.members !== 0 ||
    row.rolconnlimit !== LIMITS[row.rolname as (typeof ROLES)[number]]
  )
    fail('role_drift')
}

async function validateFiles() {
  const files = (await readdir(migrationDir)).filter(name => name.endsWith('.sql')).sort()

  if (JSON.stringify(files) !== JSON.stringify(Object.keys(MIGRATIONS).sort())) fail('migration_inventory_drift')
  for (const [name, expected] of Object.entries(MIGRATIONS))
    if (
      createHash('sha256')
        .update(await readFile(resolve(migrationDir, name)))
        .digest('hex') !== expected
    )
      fail('migration_hash_drift')
}

/** Password updates use the documented control-plane API, never SQL text/parameters/GUCs.
 * https://docs.cloud.google.com/sql/docs/postgres/create-manage-users#change_a_user_password
 * https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1/users/update
 * Only newly-created roles enter by default. A reviewed partial bootstrap may explicitly resume initialization; retries never rotate passwords automatically.
 * A partial bootstrap that left a passwordless role requires explicit operator reconciliation.
 */
async function initializePasswords(
  created: readonly (typeof ROLES)[number][],
  passwords: Record<(typeof ROLES)[number], string>,
  admin: PoolClient
) {
  if (!created.length) return
  const auth = createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const base = 'https://sqladmin.googleapis.com/v1/projects/efeonce-group'
  const usersUrl = `${base}/instances/greenhouse-pg-dev/users`
  const before = await readRoles(admin)

  if (before.length !== ROLES.length) fail('role_inventory_mismatch')
  for (const row of before) assertRole(row)

  // SQL-created users must be visible as built-in users before a password is submitted.
  // Do not infer visibility or create a replacement via users.insert.
  const listed = await auth.request<{ items?: { name?: string; type?: string; databaseRoles?: string[] }[] }>({
    url: usersUrl,
    method: 'GET',
    timeout: 10000,
    retry: false,
    responseType: 'json'
  })

  for (const role of created) {
    const matches = listed.data.items?.filter(user => user.name === role) ?? []

    if (
      matches.length !== 1 ||
      (matches[0].type !== undefined && matches[0].type !== 'BUILT_IN') ||
      (matches[0].databaseRoles?.length ?? 0) !== 0
    )
      fail('created_user_not_visible_or_role_drift')
  }

  type Operation = {
    name?: string
    status?: string
    operationType?: string
    targetProject?: string
    targetId?: string
    error?: unknown
  }

  for (const role of created) {
    // Deliberately omit databaseRoles/revokeExistingRoles/passwordPolicy/type. No privilege mutation.
    // No automatic retry after an ambiguous response: inspect first, never rotate an existing role.
    const response = await auth.request<Operation>({
      url: `${usersUrl}?name=${role}`,
      method: 'PUT',
      data: { name: role, password: passwords[role] },
      timeout: 15000,
      retry: false,
      responseType: 'json'
    })

    let operation = response.data
    const operationName = operation.name

    if (!operationName || !/^[A-Za-z0-9_-]{1,200}$/.test(operationName)) fail('password_operation_invalid')
    const deadline = Date.now() + 120000

    while (true) {
      if (
        operation.name !== operationName ||
        operation.targetProject !== 'efeonce-group' ||
        operation.targetId !== 'greenhouse-pg-dev' ||
        operation.operationType !== 'UPDATE_USER' ||
        operation.error
      )
        fail('password_operation_failed')
      if (operation.status === 'DONE') break
      if (!['PENDING', 'RUNNING'].includes(operation.status ?? '') || Date.now() >= deadline)
        fail('password_operation_incomplete_requires_review')
      await new Promise(resolve => setTimeout(resolve, 1000))
      operation = (
        await auth.request<Operation>({
          url: `${base}/operations/${operationName}`,
          method: 'GET',
          timeout: 10000,
          retry: false,
          responseType: 'json'
        })
      ).data
    }

    const after = await readRoles(admin)

    for (const row of after) assertRole(row)
    if (JSON.stringify(after) !== JSON.stringify(before)) fail('password_update_changed_roles')
  }
}

async function getPasswords() {
  const auth = createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const passwords = {} as Record<(typeof ROLES)[number], string>

  for (const role of ROLES) {
    const ref = REFS[role]

    const result = await auth.request<{ name: string; payload: { data: string } }>({
      url: `https://secretmanager.googleapis.com/v1/${ref}:access`,
      method: 'GET',
      timeout: 5000,
      retry: false,
      responseType: 'json'
    })

    const returned = result.data.name.replace('projects/183008134038/', 'projects/efeonce-group/')

    if (returned !== ref || typeof result.data.payload?.data !== 'string') fail('secret_reference_mismatch')
    const password = Buffer.from(result.data.payload.data, 'base64').toString('utf8')

    if (!/^[A-Za-z0-9_-]{32,128}$/.test(password)) fail('password_shape')
    passwords[role] = password
  }

  if (passwords.rooms_runtime === passwords.rooms_migrator) fail('passwords_not_independent')

  return passwords
}

async function negativeRuntime(client: Client) {
  const attempts = [
    'CREATE TABLE rooms.__qa_forbidden(id integer)',
    'CREATE SCHEMA rooms_qa_forbidden',
    'UPDATE rooms.identity_bindings SET status=status WHERE false',
    'UPDATE rooms.principals SET status=status WHERE false',
    'UPDATE rooms.memberships SET status=status WHERE false',
    'UPDATE rooms.editions SET id=id WHERE false',
    'DELETE FROM rooms.audit WHERE false',
    'DELETE FROM rooms.invitation_proofs WHERE false'
  ]

  for (const sql of attempts) {
    await client.query('BEGIN')
    let denied = false

    try {
      await client.query(sql)
    } catch (error) {
      denied = Boolean(error && typeof error === 'object' && 'code' in error && error.code === '42501')
    } finally {
      await client.query('ROLLBACK')
    }

    if (!denied) fail('runtime_negative_acl_failed')
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (
    new Set(args).size !== args.length ||
    args.some(arg => !['--apply', '--help', '--resume-initial-passwords'].includes(arg))
  )
    fail('invalid_arguments')
  if (args.includes('--resume-initial-passwords') && !args.includes('--apply')) fail('resume_requires_apply')

  if (args[0] === '--help') {
    console.log(
      'Usage: node --conditions=react-server --import tsx scripts/rooms/provision-cloud-database.ts [--apply]. Default: read-only plan; --apply creates only Rooms DB/roles and runs five pinned migrations.'
    )

    return
  }

  const apply = args.includes('--apply')
  // Explicit reconciliation only after inspecting a run-owned partial bootstrap; never an automatic retry.
  const resumeInitialPasswords = args.includes('--resume-initial-passwords')

  await validateFiles()
  phase = 'admin-profile'
  loadGreenhouseToolEnv()
  const profile = applyGreenhousePostgresProfile('admin')

  if (
    profile.instanceConnectionName !== INSTANCE ||
    !['postgres', 'greenhouse_app'].includes(profile.database) ||
    ROLES.includes(profile.user as (typeof ROLES)[number])
  )
    fail('admin_target_mismatch')

  const pool = await getGreenhousePostgresPool(),
    admin = await pool.connect()

  let lock = false,
    transactionOpen = false
  const addedMemberships = new Set<string>()
  let adminName = ''
  let connector: Connector | undefined,
    connectorReady = false
  let connectorClosing = false
  const clients: Client[] = []

  try {
    phase = 'metadata'
    await admin.query('BEGIN READ ONLY')
    transactionOpen = true
    await admin.query("SET LOCAL statement_timeout='5000ms'")

    const actor = (
      await admin.query(
        "SELECT current_user AS name,current_setting('server_version_num')::int AS version,r.rolcreatedb,r.rolcreaterole,r.rolsuper FROM pg_roles r WHERE rolname=current_user"
      )
    ).rows[0]

    adminName = actor.name
    if (actor.version < 160000 || actor.version >= 170000) fail('engine_not_16')

    const roles = await readRoles(admin),
      database = (
        await admin.query('SELECT oid,pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=$1', [DATABASE])
      ).rows[0]

    for (const role of roles) assertRole(role)
    if (database && database.owner !== 'rooms_migrator') fail('database_owner_drift')
    if (resumeInitialPasswords && (!database || roles.length !== ROLES.length)) fail('resume_inventory_mismatch')

    const existingAdminMemberships = (
      await admin.query(
        'SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles a ON a.oid=m.member WHERE a.rolname=current_user AND r.rolname=ANY($1)',
        [[...ROLES]]
      )
    ).rows.map(row => row.rolname as string)

    if (existingAdminMemberships.length) fail('preexisting_admin_membership_requires_review')

    const foreignOwnership = (
      await admin.query(
        `SELECT count(*)::int AS count FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid
   WHERE d.refclassid='pg_authid'::regclass AND d.deptype='o' AND r.rolname=ANY($1)
   AND (r.rolname='rooms_runtime' OR NOT ((d.dbid=$2::oid) OR (d.dbid=0 AND d.classid='pg_database'::regclass AND d.objid=$2::oid)))`,
        [[...ROLES], database?.oid ?? 0]
      )
    ).rows[0].count

    if (foreignOwnership) fail('foreign_ownership')
    await admin.query('ROLLBACK')
    transactionOpen = false
    console.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'plan',
        instance: INSTANCE,
        database: DATABASE,
        databaseExists: Boolean(database),
        roles,
        desiredLimits: LIMITS,
        migrations: Object.keys(MIGRATIONS),
        passwordInitialization: 'users.update-only-for-roles-created-this-run',
        existingPasswords: resumeInitialPasswords
          ? 'explicit-run-owned-initialization-reconciliation'
          : 'never-rotated',
        secretRefs: REFS,
        adminCanCreateDatabase: actor.rolcreatedb || actor.rolsuper,
        adminCanCreateRoles: actor.rolcreaterole || actor.rolsuper,
        mutationsExecuted: false
      })
    )
    if (!apply) return
    if (!(actor.rolcreatedb || actor.rolsuper) || !(actor.rolcreaterole || actor.rolsuper))
      fail('admin_privileges_missing')
    phase = 'secrets'
    const passwords = await getPasswords()

    phase = 'bootstrap-lock'

    const acquired = (
      await admin.query("SELECT pg_try_advisory_lock(hashtextextended('rooms-production-bootstrap',2069)) AS acquired")
    ).rows[0].acquired

    if (!acquired) fail('bootstrap_busy')
    lock = true
    // Re-read after lock. Concurrent or foreign provisioning is a stop, not permission to alter an existing role.
    if (JSON.stringify(await readRoles(admin)) !== JSON.stringify(roles)) fail('concurrent_role_change')
    phase = 'create-roles'
    await admin.query('BEGIN')
    transactionOpen = true

    const createdRoles = ROLES.filter(role => !roles.some(row => row.rolname === role))

    for (const role of createdRoles)
      await admin.query(
        `CREATE ROLE ${role} LOGIN PASSWORD NULL NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT ${LIMITS[role]}`
      )

    await admin.query('COMMIT')
    transactionOpen = false
    // PG16 CREATEROLE may automatically add creator membership. Remove only grants absent before this command.
    for (const row of (
      await admin.query(
        'SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles a ON a.oid=m.member WHERE a.rolname=current_user AND r.rolname=ANY($1)',
        [[...ROLES]]
      )
    ).rows)
      addedMemberships.add(row.rolname)
    phase = 'create-database'

    if (!actor.rolsuper) {
      await admin.query(`GRANT rooms_migrator TO ${quote(adminName)} WITH INHERIT FALSE, SET TRUE`)
      addedMemberships.add('rooms_migrator')
    }

    if (!database) {
      await admin.query("CREATE DATABASE rooms_production OWNER rooms_migrator TEMPLATE template0 ENCODING 'UTF8'")
    }

    if (!actor.rolsuper) await admin.query('SET ROLE rooms_migrator')
    await admin.query('REVOKE ALL ON DATABASE rooms_production FROM PUBLIC')
    await admin.query('GRANT CONNECT ON DATABASE rooms_production TO rooms_runtime,rooms_migrator')
    if (!actor.rolsuper) await admin.query('RESET ROLE')

    for (const role of addedMemberships) {
      await admin.query(`REVOKE ${quote(role)} FROM ${quote(adminName)}`)
      addedMemberships.delete(role)
    }

    phase = 'initialize-passwords-api'
    await initializePasswords(resumeInitialPasswords ? ROLES : createdRoles, passwords, admin)

    phase = 'migrator-connect'
    connector = new Connector({
      auth: createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/sqlservice.admin'] })
    })
    const pendingDriver = connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC })
    const activeConnector = connector

    void pendingDriver
      .then(
        () => {
          connectorReady = true
          if (connectorClosing) activeConnector.close()
        },
        () => {}
      )
      .catch(() => {})
    let timer: ReturnType<typeof setTimeout> | undefined
    let driver: Awaited<ReturnType<Connector['getOptions']>>

    try {
      driver = await Promise.race([
        pendingDriver,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('connector_deadline')), 15000)
        })
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }

    const connect = async (user: (typeof ROLES)[number]) => {
      const client = new Client({
        ...driver,
        user,
        password: passwords[user],
        database: DATABASE,
        connectionTimeoutMillis: 10000,
        statement_timeout: 60000,
        options: '-c idle_session_timeout=60000',
        application_name: 'rooms-provision-task2069'
      })

      client.on('error', () => {})
      clients.push(client)
      await client.connect()

      return client
    }

    const migrator = await connect('rooms_migrator')
    const identity = (await migrator.query('SELECT current_database() AS database,current_user AS username')).rows[0]

    if (identity.database !== DATABASE || identity.username !== 'rooms_migrator') fail('migrator_identity_mismatch')
    phase = 'migrations'
    await migrator.query('REVOKE ALL ON SCHEMA public FROM PUBLIC')
    const roomsRequire = createRequire(resolve(roomsRepo, 'package.json'))

    const { runner } = roomsRequire('node-pg-migrate') as {
      runner: (options: Record<string, unknown>) => Promise<{ name: string }[]>
    }

    await validateFiles()

    const applied = await runner({
      dbClient: migrator,
      dir: migrationDir,
      direction: 'up',
      migrationsSchema: 'public',
      migrationsTable: 'rooms_migrations',
      count: Infinity,
      checkOrder: true,
      singleTransaction: true,
      log: () => {},
      logger: { info: () => {}, warn: () => {}, error: () => {} }
    })

    phase = 'readback'

    const tables = (
      await migrator.query("SELECT tablename FROM pg_tables WHERE schemaname='rooms' ORDER BY tablename")
    ).rows.map(row => row.tablename as string)

    if (JSON.stringify(tables) !== JSON.stringify(TABLES)) fail('table_inventory_mismatch')
    for (const row of await readRoles(admin)) assertRole(row)
    const runtime = await connect('rooms_runtime')

    await negativeRuntime(runtime)

    const grants = (
      await runtime.query(
        `SELECT table_name,privilege_type FROM information_schema.table_privileges WHERE grantee=current_user AND table_schema='rooms' ORDER BY table_name,privilege_type`
      )
    ).rows

    const expectedGrants = TABLES.flatMap(table_name =>
      EXPECTED_PRIVILEGES[table_name].map(privilege_type => ({ table_name, privilege_type }))
    )

    if (JSON.stringify(grants) !== JSON.stringify(expectedGrants)) fail('runtime_acl_mismatch')
    console.log(
      JSON.stringify({
        status: 'applied_and_verified',
        database: DATABASE,
        tables: tables.length,
        appliedMigrations: applied.map(item => item.name),
        roles: await readRoles(admin),
        runtimeNegativeChecks: 8,
        passwordsInitializedByApi: resumeInitialPasswords ? [...ROLES] : createdRoles,
        credentialBearingSql: false,
        grants,
        secretValuesPrinted: false
      })
    )
  } finally {
    let cleanupFailed = false

    if (transactionOpen) await admin.query('ROLLBACK').catch(() => {})
    await admin.query('RESET ROLE').catch(() => {
      cleanupFailed = true
    })
    for (const role of addedMemberships)
      await admin.query(`REVOKE ${quote(role)} FROM ${quote(adminName)}`).catch(() => {
        cleanupFailed = true
      })
    for (const client of clients) await client.end().catch(() => {})
    // Connector1.x initial rejection has an upstream close/unhandled-rejection bug; no sockets before readiness.
    connectorClosing = true
    if (connectorReady) connector?.close()
    if (lock)
      await admin.query("SELECT pg_advisory_unlock(hashtextextended('rooms-production-bootstrap',2069))").catch(() => {
        cleanupFailed = true
      })
    admin.release(cleanupFailed)

    if (cleanupFailed) {
      phase = 'cleanup_requires_review'
      fail('cleanup_failed')
    }
  }
}

main()
  .catch(() => {
    console.error(
      JSON.stringify({
        status: 'failed',
        phase,
        rawErrorOmitted: true,
        action: 'Inspect exact Rooms resources; no automatic database/role deletion or password rotation.'
      })
    )
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
