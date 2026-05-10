import process from 'node:process'

import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { Client } from 'pg'

import { createGoogleAuth } from '@/lib/google-credentials'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv, type PostgresProfile } from './lib/load-greenhouse-tool-env'

const parseProfile = (): PostgresProfile => {
  const profileArg = process.argv.find(argument => argument.startsWith('--profile='))
  const value = profileArg?.slice('--profile='.length).trim() || 'runtime'

  if (value === 'runtime' || value === 'migrator' || value === 'admin' || value === 'ops') {
    return value
  }

  throw new Error(`Unsupported Postgres profile "${value}". Use runtime, migrator, admin or ops.`)
}

const toIpType = (value: string | undefined) => {
  switch ((value || '').trim().toUpperCase()) {
    case 'PRIVATE':
      return IpAddressTypes.PRIVATE
    case 'PSC':
      return IpAddressTypes.PSC
    default:
      return IpAddressTypes.PUBLIC
  }
}

const normalizeNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value?.trim() || fallback)

  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeBoolean = (value: string | undefined) => value?.trim().toLowerCase() === 'true'

const normalizeSecretValue = (value: string | undefined) => {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  const withoutQuotes = trimmed.replace(/^['"]+|['"]+$/g, '').trim()
  const withoutLiteralLineEndings = withoutQuotes.replace(/(?:\\r|\\n)+$/g, '').trim()

  return withoutLiteralLineEndings ? withoutLiteralLineEndings : null
}

// Password resolution canonica: env-first → Secret Manager via resolver
// canonico (src/lib/secrets/secret-manager.ts). El resolver maneja
// normalizacion (incluyendo shorthand `<name>:<version>`), caching,
// auth via createGoogleAuth + scopes correctos, y sanitization.
// Anti-mirror: NO duplicar normalizeSecretRef aqui (arch-architect verdict
// 2026-05-10, ver CLAUDE.md "Secret Manager Hygiene").
const resolvePassword = async () => {
  const envPassword = normalizeSecretValue(process.env.GREENHOUSE_POSTGRES_PASSWORD)

  if (envPassword) {
    return { value: envPassword, source: 'env' as const, secretRef: null as string | null }
  }

  const rawSecretRef = process.env.GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF?.trim()

  if (!rawSecretRef) {
    return { value: null, source: 'unconfigured' as const, secretRef: null as string | null }
  }

  const value = await resolveSecretByRef(rawSecretRef)

  return {
    value: normalizeSecretValue(value ?? undefined),
    source: 'secret_manager' as const,
    secretRef: rawSecretRef
  }
}

const createDoctorClient = async () => {
  const passwordResolution = await resolvePassword()
  const database = process.env.GREENHOUSE_POSTGRES_DATABASE?.trim()
  const user = process.env.GREENHOUSE_POSTGRES_USER?.trim()

  if (!database || !user || !passwordResolution.value) {
    throw new Error('Greenhouse Postgres doctor is not configured. Missing database, user or password.')
  }

  const baseOptions = {
    user,
    password: passwordResolution.value,
    database,
    connectionTimeoutMillis: 15_000
  }

  const instanceConnectionName = process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME?.trim()

  if (instanceConnectionName) {
    const connector = new Connector({
      auth: createGoogleAuth({
        scopes: ['https://www.googleapis.com/auth/sqlservice.admin']
      })
    })

    const connectorOptions = await connector.getOptions({
      instanceConnectionName,
      ipType: toIpType(process.env.GREENHOUSE_POSTGRES_IP_TYPE)
    })

    const client = new Client({
      ...baseOptions,
      ...connectorOptions
    })

    return { client, closeConnector: () => connector.close(), passwordSource: passwordResolution.source }
  }

  const client = new Client({
    ...baseOptions,
    host: process.env.GREENHOUSE_POSTGRES_HOST?.trim() || undefined,
    port: normalizeNumber(process.env.GREENHOUSE_POSTGRES_PORT, 5432),
    ssl: normalizeBoolean(process.env.GREENHOUSE_POSTGRES_SSL) ? { rejectUnauthorized: false } : undefined
  })

  return { client, closeConnector: async () => undefined, passwordSource: passwordResolution.source }
}

const main = async () => {
  loadGreenhouseToolEnv()

  const profile = parseProfile()
  const applied = applyGreenhousePostgresProfile(profile)
  const { client, closeConnector, passwordSource } = await createDoctorClient()

  await client.connect()

  try {
    const identityResult = await client.query<{
      current_user: string
      session_user: string
      runtime_role_exists: boolean
      migrator_role_exists: boolean
      is_runtime_member: boolean
      is_migrator_member: boolean
    }>(
      `
        SELECT
          current_user,
          session_user,
          to_regrole('greenhouse_runtime') IS NOT NULL AS runtime_role_exists,
          to_regrole('greenhouse_migrator') IS NOT NULL AS migrator_role_exists,
          CASE
            WHEN to_regrole('greenhouse_runtime') IS NULL THEN FALSE
            ELSE pg_has_role(current_user, 'greenhouse_runtime', 'member')
          END AS is_runtime_member,
          CASE
            WHEN to_regrole('greenhouse_migrator') IS NULL THEN FALSE
            ELSE pg_has_role(current_user, 'greenhouse_migrator', 'member')
          END AS is_migrator_member
      `
    )

    const [identity] = identityResult.rows

    const schemataResult = await client.query<{
      schema_name: string
      schema_owner: string
      can_usage: boolean
      can_create: boolean
    }>(
      `
        SELECT
          n.nspname AS schema_name,
          r.rolname AS schema_owner,
          has_schema_privilege(current_user, n.nspname, 'USAGE') AS can_usage,
          has_schema_privilege(current_user, n.nspname, 'CREATE') AS can_create
        FROM pg_namespace n
        JOIN pg_roles r ON r.oid = n.nspowner
        WHERE n.nspname IN (
          'greenhouse_core',
          'greenhouse_serving',
          'greenhouse_sync',
          'greenhouse_hr',
          'greenhouse_payroll',
          'greenhouse_finance',
          'greenhouse_cost_intelligence',
          'greenhouse_ai',
          'greenhouse_crm',
          'greenhouse_delivery',
          'greenhouse_notifications'
        )
        ORDER BY n.nspname
      `
    )

    const schemata = schemataResult.rows

    const roleMembershipsResult = await client.query<{
      role_name: string
      role_exists: boolean
      is_member: boolean
    }>(
      `
        SELECT
          'greenhouse_runtime' AS role_name,
          to_regrole('greenhouse_runtime') IS NOT NULL AS role_exists,
          CASE
            WHEN to_regrole('greenhouse_runtime') IS NULL THEN FALSE
            ELSE pg_has_role(current_user, 'greenhouse_runtime', 'member')
          END AS is_member
        UNION ALL
        SELECT
          'greenhouse_migrator' AS role_name,
          to_regrole('greenhouse_migrator') IS NOT NULL AS role_exists,
          CASE
            WHEN to_regrole('greenhouse_migrator') IS NULL THEN FALSE
            ELSE pg_has_role(current_user, 'greenhouse_migrator', 'member')
          END AS is_member
      `
    )

    const roleMemberships = roleMembershipsResult.rows

    // ── Superadmin health check ──
    const superadminCheckResult = await client.query<{
      active_superadmin_count: string
      superadmin_users: string | null
    }>(
      `
        SELECT
          COUNT(DISTINCT ura.user_id)::text AS active_superadmin_count,
          STRING_AGG(DISTINCT cu.email, ', ') AS superadmin_users
        FROM greenhouse_core.user_role_assignments ura
        INNER JOIN greenhouse_core.client_users cu ON cu.user_id = ura.user_id
        WHERE ura.role_code = 'efeonce_admin'
          AND ura.active = TRUE
          AND cu.status = 'active'
      `
    )

    const superadminCheck = superadminCheckResult.rows

    const superadminCount = Number(superadminCheck[0]?.active_superadmin_count ?? 0)

    console.log(
      JSON.stringify(
        {
          appliedProfile: applied.profile,
          connection: {
            user: applied.user,
            database: applied.database,
            instanceConnectionName: applied.instanceConnectionName || null,
            host: applied.host,
            passwordSource
          },
          identity,
          roleMemberships,
          schemata,
          superadminHealth: {
            activeSuperadminCount: superadminCount,
            healthy: superadminCount >= 1,
            users: superadminCheck[0]?.superadmin_users || null,
            warning: superadminCount === 0 ? 'No active Superadministrador found. System needs at least one.' : null
          }
        },
        null,
        2
      )
    )
  } finally {
    await client.end()
    await closeConnector()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
