/**
 * TASK-1310 — sonda read-only de POBLACIÓN (no de un tenant).
 *
 * ¿Cuántas orgs tienen target SEO, cuántas tienen más de uno, y qué cobertura
 * temporal real tienen? Responde si la superficie cliente está diseñada para la
 * población o sólo para el tenant con historia backfilleada.
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const main = async () => {
  const targets = await runGreenhousePostgresQuery<{
    organization_id: string
    active_targets: string
    domains: string
  }>(
    `SELECT organization_id,
            COUNT(*)::text AS active_targets,
            string_agg(root_domain, ', ' ORDER BY created_at DESC) AS domains
       FROM greenhouse_growth.seo_targets
      WHERE status = 'active'
      GROUP BY organization_id
      ORDER BY COUNT(*) DESC`,
    []
  )

  console.log('--- orgs con seo_target activo ---')

  for (const row of targets) {
    console.log(`${row.organization_id} · targets=${row.active_targets} · ${row.domains}`)
  }

  const coverage = await runGreenhousePostgresQuery<{
    seo_target_id: string
    keywords: string
    days_with_data: string
    first_capture: string | null
    last_capture: string | null
  }>(
    `SELECT seo_target_id,
            COUNT(DISTINCT keyword)::text AS keywords,
            COUNT(DISTINCT capture_date)::text AS days_with_data,
            MIN(capture_date)::text AS first_capture,
            MAX(capture_date)::text AS last_capture
       FROM greenhouse_growth.seo_rank_snapshots
      GROUP BY seo_target_id
      ORDER BY COUNT(DISTINCT capture_date) DESC`,
    []
  )

  console.log('\n--- cobertura real por target (rank snapshots) ---')

  for (const row of coverage) {
    console.log(
      `${row.seo_target_id} · keywords=${row.keywords} · dias=${row.days_with_data} · ${row.first_capture} -> ${row.last_capture}`
    )
  }

  const modules = await runGreenhousePostgresQuery<{ organization_id: string; module_key: string; status: string }>(
    `SELECT organization_id, module_key, status
       FROM greenhouse_client_portal.module_assignments
      WHERE module_key LIKE 'seo%'
      ORDER BY organization_id`,
    []
  )

  console.log('\n--- module_assignments SEO ---')

  for (const row of modules) {
    console.log(`${row.organization_id} · ${row.module_key} · ${row.status}`)
  }

  const gsc = await runGreenhousePostgresQuery<{ organization_id: string; days: string; last_capture: string | null }>(
    `SELECT organization_id,
            COUNT(DISTINCT capture_date)::text AS days,
            MAX(capture_date)::text AS last_capture
       FROM greenhouse_growth.seo_gsc_daily
      GROUP BY organization_id
      ORDER BY COUNT(DISTINCT capture_date) DESC`,
    []
  )

  console.log('\n--- cobertura GSC por org ---')

  for (const row of gsc) {
    console.log(`${row.organization_id} · dias=${row.days} · ultimo=${row.last_capture}`)
  }

  // `greenhouse_serving.session_360` es la proyección canónica de sesión: ya cruza usuario ↔
  // organización, que es justo el mapeo que no vive en `client_users`/`clients`/`organizations`.
  const sessionUsers = await runGreenhousePostgresQuery<{
    email: string
    organization_id: string
    tenant_type: string
    active: boolean
  }>(
    `SELECT email, organization_id, tenant_type, active
       FROM greenhouse_serving.session_360
      WHERE organization_id IN (
        SELECT DISTINCT organization_id FROM greenhouse_growth.seo_targets WHERE status = 'active'
      )
      ORDER BY organization_id, tenant_type, email`,
    []
  )

  console.log('\n--- usuarios de orgs con SEO (session_360) ---')

  for (const row of sessionUsers) {
    console.log(`${row.organization_id} · ${row.tenant_type} · ${row.email} · active=${row.active}`)
  }

  const linkColumns = await runGreenhousePostgresQuery<{ table_schema: string; table_name: string; column_name: string }>(
    `SELECT table_schema, table_name, column_name
       FROM information_schema.columns
      WHERE table_name IN ('client_users', 'clients', 'organizations')
        AND (column_name LIKE '%organization%' OR column_name LIKE '%client_id%' OR column_name = 'email')
      ORDER BY table_schema, table_name, column_name`,
    []
  )

  console.log('\n--- columnas de enlace reales (information_schema) ---')

  for (const row of linkColumns) {
    console.log(`${row.table_schema}.${row.table_name}.${row.column_name}`)
  }

  // Por qué la introspección de arriba está acá: buscar el usuario cliente de una organización
  // en `client_users`/`clients`/`organizations` es un callejón sin salida — `client_users` enlaza
  // por `client_id` y ninguna de las otras dos expone la FK del otro lado. El mapeo vive en
  // `greenhouse_serving.session_360`, que es donde el runtime mismo lo resuelve
  // (`identity-store.ts`). Con eso se emite la sesión de agente para verificar una superficie
  // client-gated (ver TASK-1310).
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
