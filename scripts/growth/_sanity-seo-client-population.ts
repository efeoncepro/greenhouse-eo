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

  // El mapeo organización↔cliente NO está en estas dos tablas: `client_users` enlaza por
  // `client_id`, y ni `greenhouse_core.clients` ni `greenhouse_core.organizations` exponen la FK
  // del otro. Queda como pendiente para emitir una sesión de cliente de la organización
  // contratada (ver TASK-1310, Delta 2026-08-12); la introspección de arriba es el punto de
  // partida para quien lo retome.

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
