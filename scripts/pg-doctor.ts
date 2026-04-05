import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv, type PostgresProfile } from './lib/load-greenhouse-tool-env'

const parseProfile = (): PostgresProfile => {
  const profileArg = process.argv.find(argument => argument.startsWith('--profile='))
  const value = profileArg?.slice('--profile='.length).trim() || 'runtime'

  if (value === 'runtime' || value === 'migrator' || value === 'admin' || value === 'ops') {
    return value
  }

  throw new Error(`Unsupported Postgres profile "${value}". Use runtime, migrator, admin or ops.`)
}

const main = async () => {
  loadGreenhouseToolEnv()

  const profile = parseProfile()
  const applied = applyGreenhousePostgresProfile(profile)
  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  try {
    const [identity] = await runGreenhousePostgresQuery<{
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

    const schemata = await runGreenhousePostgresQuery<{
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

    const roleMemberships = await runGreenhousePostgresQuery<{
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

    // ── Superadmin health check ──
    const superadminCheck = await runGreenhousePostgresQuery<{
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

    const superadminCount = Number(superadminCheck[0]?.active_superadmin_count ?? 0)

    console.log(
      JSON.stringify(
        {
          appliedProfile: applied.profile,
          connection: {
            user: applied.user,
            database: applied.database,
            instanceConnectionName: applied.instanceConnectionName || null,
            host: applied.host
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
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
