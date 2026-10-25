/** TASK-2069: metadata-only audit. Never reads business rows or changes neighboring ACLs.
 * Uses operator ADC for Connector/Secret Manager and the Rooms runtime SQL role for every query.
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { Client } from 'pg'

import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { createGoogleAuth } from '../../src/lib/google-credentials'

const INSTANCE = 'efeonce-group:us-east4:greenhouse-pg-dev'
const SECRET_REF = 'projects/efeonce-group/secrets/rooms-production-postgres-runtime-password/versions/1'

type Database = 'rooms_production' | 'greenhouse_app'
type DatabasePrivileges = { datname: string; can_connect: boolean; can_create_schema: boolean; can_temp: boolean }
type SchemaPrivileges = { nspname: string; can_use: boolean; can_create: boolean }
type TablePrivileges = {
  nspname: string
  relation_count: number
  select_count: number
  insert_count: number
  update_count: number
  delete_count: number
  truncate_count: number
}
type FunctionPrivileges = { nspname: string; callable_security_definer_count: number }
type Role = { username: string; database: string; observed_at: Date }
type GreenhouseResult =
  | { connected: false }
  | { connected: true; schemas: SchemaPrivileges[]; tables: TablePrivileges[]; functions: FunctionPrivileges[] }
let phase = 'arguments'

/** Read-only transactions are a second boundary in addition to these fixed catalog statements. */
async function readOnly<T>(client: Client, run: () => Promise<T>): Promise<T> {
  await client.query('BEGIN READ ONLY')

  try {
    const result = await run()

    await client.query('COMMIT')

    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some(arg => arg !== '--help')) throw new Error('invalid_arguments')

  if (args[0] === '--help') {
    console.log(
      "Usage: GOOGLE_APPLICATION_CREDENTIALS_JSON='' GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64='' GCP_AUTH_PREFERENCE=ambient_adc node --conditions=react-server --import tsx scripts/rooms/audit-cloud-isolation.ts. Read-only catalog audit; no business data, ACL changes, mail or provisioning."
    )

    return
  }

  phase = 'operator-adc-preflight'
  loadGreenhouseToolEnv()
  // The shared auth helper can select legacy JSON credentials even with ambient_adc preference.
  // Do not silently clear shared configuration: the operator must scope these empty values to this process.
  if (
    process.env.GCP_AUTH_PREFERENCE !== 'ambient_adc' ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON !== '' ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64 !== ''
  )
    throw new Error('explicit_operator_adc_required')
  let connector: Connector | undefined
  let ready = false,
    closing = false,
    closed = false
  const clients: Client[] = []

  const closeConnector = () => {
    if (ready && !closed && connector) {
      closed = true
      connector.close()
    }
  }

  try {
    phase = 'secret-read'
    const auth = createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })

    const response = await auth.request<{ name: string; payload: { data: string } }>({
      url: `https://secretmanager.googleapis.com/v1/${SECRET_REF}:access`,
      method: 'GET',
      timeout: 5000,
      retry: false,
      responseType: 'json'
    })

    if (
      response.data.name?.replace('projects/183008134038/', 'projects/efeonce-group/') !== SECRET_REF ||
      typeof response.data.payload?.data !== 'string'
    )
      throw new Error('secret_reference_mismatch')
    const password = Buffer.from(response.data.payload.data, 'base64').toString('utf8')

    if (!/^[A-Za-z0-9_-]{32,128}$/.test(password)) throw new Error('secret_shape')
    phase = 'connector'
    connector = new Connector({
      auth: createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/sqlservice.admin'] })
    })
    const pending = connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC })

    // Connector1.x cannot safely close an instance whose initial getOptions rejected.
    // Fixed PUBLIC instance has no scheduled refresh/socket until initialization succeeds.
    void pending
      .then(
        () => {
          ready = true
          if (closing) closeConnector()
        },
        () => {}
      )
      .catch(() => {})
    let timer: ReturnType<typeof setTimeout> | undefined

    const driver = await Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('connector_deadline')), 15000)
      })
    ]).finally(() => {
      if (timer) clearTimeout(timer)
    })

    const connect = async (database: Database) => {
      const client = new Client({
        ...driver,
        user: 'rooms_runtime',
        password,
        database,
        connectionTimeoutMillis: 8000,
        statement_timeout: 5000,
        options: '-c idle_session_timeout=60000',
        application_name: 'rooms-crossdb-metadata-task2069'
      })

      client.on('error', () => {})
      clients.push(client)
      await client.connect()

      return client
    }

    phase = 'rooms-catalog'
    const rooms = await connect('rooms_production')

    const { databases, role } = await readOnly(rooms, async () => {
      const databases = (
        await rooms.query<DatabasePrivileges>(
          `SELECT datname,has_database_privilege(current_user,oid,'CONNECT') AS can_connect,has_database_privilege(current_user,oid,'CREATE') AS can_create_schema,has_database_privilege(current_user,oid,'TEMP') AS can_temp FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname`
        )
      ).rows

      const role = (
        await rooms.query<Role>(
          'SELECT current_user AS username,current_database() AS database,clock_timestamp() AS observed_at'
        )
      ).rows[0]

      if (!role || role.username !== 'rooms_runtime' || role.database !== 'rooms_production')
        throw new Error('sql_identity_mismatch')

      return { databases, role }
    })

    phase = 'greenhouse-catalog'
    let greenhouse: GreenhouseResult = { connected: false }

    if (databases.some(row => row.datname === 'greenhouse_app' && row.can_connect)) {
      const client = await connect('greenhouse_app')

      greenhouse = await readOnly(client, async () => {
        const schemas = (
          await client.query<SchemaPrivileges>(
            `SELECT nspname,has_schema_privilege(current_user,oid,'USAGE') AS can_use,has_schema_privilege(current_user,oid,'CREATE') AS can_create FROM pg_namespace WHERE nspname IN ('public','greenhouse_core','greenhouse_auth') ORDER BY nspname`
          )
        ).rows

        const tables = (
          await client.query<TablePrivileges>(
            `SELECT n.nspname,count(*)::int AS relation_count,count(*)FILTER(WHERE has_table_privilege(current_user,c.oid,'SELECT'))::int AS select_count,count(*)FILTER(WHERE has_table_privilege(current_user,c.oid,'INSERT'))::int AS insert_count,count(*)FILTER(WHERE has_table_privilege(current_user,c.oid,'UPDATE'))::int AS update_count,count(*)FILTER(WHERE has_table_privilege(current_user,c.oid,'DELETE'))::int AS delete_count,count(*)FILTER(WHERE has_table_privilege(current_user,c.oid,'TRUNCATE'))::int AS truncate_count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('greenhouse_core','greenhouse_auth') AND c.relkind IN ('r','p','v','m','f') GROUP BY n.nspname ORDER BY n.nspname`
          )
        ).rows

        const functions = (
          await client.query<FunctionPrivileges>(
            `SELECT n.nspname,count(*)FILTER(WHERE p.prosecdef AND has_schema_privilege(current_user,n.oid,'USAGE') AND has_function_privilege(current_user,p.oid,'EXECUTE'))::int AS callable_security_definer_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','greenhouse_core','greenhouse_auth') GROUP BY n.nspname ORDER BY n.nspname`
          )
        ).rows

        return { connected: true, schemas, tables, functions }
      })
    }

    console.log(
      JSON.stringify({
        status: 'metadata_read_only_complete',
        role,
        databases,
        greenhouse,
        businessRowsRead: 0,
        writes: 0
      })
    )
  } finally {
    for (const client of clients) await client.end().catch(() => {})
    closing = true
    closeConnector()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error(JSON.stringify({ status: 'failed_sanitized', phase, businessRowsRead: 0, writes: 0 }))
    process.exitCode = 1
  })
}
