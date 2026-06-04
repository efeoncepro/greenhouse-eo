import 'server-only'

/**
 * TASK-991 Slice 0 — Inventario read-only de organizations a medio cocinar.
 *
 * NO muta nada. Lista cuántas organizations están en cada estado de drift de
 * nacimiento, para dimensionar la remediación (TASK-991 Slice 3) antes de actuar.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/inventory-half-baked-orgs.ts
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

type Row = Record<string, unknown>

const section = async (label: string, sql: string): Promise<void> => {
  const rows = await runGreenhousePostgresQuery<Row>(sql)

  console.log(`\n=== ${label} ===`)
  console.log(JSON.stringify(rows, null, 2))
}

const main = async () => {
  await section(
    'A. active_client con organization_type inconsistente (type_lifecycle_drift)',
    `SELECT organization_id, organization_name, organization_type, lifecycle_stage,
            hubspot_company_id, country, tax_id
       FROM greenhouse_core.organizations
      WHERE lifecycle_stage = 'active_client'
        AND COALESCE(organization_type,'other') NOT IN ('client','both')
      ORDER BY updated_at DESC`
  )

  await section(
    'B. client-grade sin identidad tributaria (incomplete_identity)',
    `SELECT organization_id, organization_name, organization_type, lifecycle_stage,
            hubspot_company_id, country,
            (tax_id IS NULL) AS tax_id_missing,
            (NULLIF(TRIM(legal_name),'') IS NULL) AS legal_name_missing
       FROM greenhouse_core.organizations
      WHERE (lifecycle_stage = 'active_client'
             OR COALESCE(organization_type,'other') IN ('client','both'))
        AND (tax_id IS NULL OR NULLIF(TRIM(legal_name),'') IS NULL)
      ORDER BY updated_at DESC`
  )

  await section(
    'C. active_client sin client_profile (active_without_profile)',
    `SELECT o.organization_id, o.organization_name, o.hubspot_company_id
       FROM greenhouse_core.organizations o
       LEFT JOIN greenhouse_finance.client_profiles cp ON cp.organization_id = o.organization_id
      WHERE o.lifecycle_stage = 'active_client' AND cp.organization_id IS NULL
      ORDER BY o.updated_at DESC`
  )

  await section(
    'D. active_client sin Space (active_without_space)',
    `SELECT o.organization_id, o.organization_name, o.hubspot_company_id
       FROM greenhouse_core.organizations o
       LEFT JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id
      WHERE o.lifecycle_stage = 'active_client' AND s.organization_id IS NULL
      ORDER BY o.updated_at DESC`
  )

  await section(
    'E. Resumen agregado',
    `SELECT
       (SELECT COUNT(*)::int FROM greenhouse_core.organizations
         WHERE lifecycle_stage='active_client'
           AND COALESCE(organization_type,'other') NOT IN ('client','both')) AS type_lifecycle_drift,
       (SELECT COUNT(*)::int FROM greenhouse_core.organizations
         WHERE (lifecycle_stage='active_client' OR COALESCE(organization_type,'other') IN ('client','both'))
           AND (tax_id IS NULL OR NULLIF(TRIM(legal_name),'') IS NULL)) AS incomplete_identity,
       (SELECT COUNT(*)::int FROM greenhouse_core.organizations o
         LEFT JOIN greenhouse_finance.client_profiles cp ON cp.organization_id=o.organization_id
         WHERE o.lifecycle_stage='active_client' AND cp.organization_id IS NULL) AS active_without_profile,
       (SELECT COUNT(*)::int FROM greenhouse_core.organizations o
         LEFT JOIN greenhouse_core.spaces s ON s.organization_id=o.organization_id
         WHERE o.lifecycle_stage='active_client' AND s.organization_id IS NULL) AS active_without_space`
  )
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
