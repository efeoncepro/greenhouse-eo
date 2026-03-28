import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

let ensurePayrollInfrastructurePromise: Promise<void> | null = null

const buildStatements = (projectId: string) => [
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.compensation_versions\` (
      version_id STRING NOT NULL,
      member_id STRING NOT NULL,
      version INT64 NOT NULL,
      pay_regime STRING NOT NULL,
      currency STRING NOT NULL,
      base_salary FLOAT64 NOT NULL,
      remote_allowance FLOAT64,
      colacion_amount FLOAT64 DEFAULT 0,
      movilizacion_amount FLOAT64 DEFAULT 0,
      fixed_bonus_label STRING,
      fixed_bonus_amount FLOAT64,
      bonus_otd_min FLOAT64,
      bonus_otd_max FLOAT64,
      bonus_rpa_min FLOAT64,
      bonus_rpa_max FLOAT64,
      gratificacion_legal_mode STRING,
      afp_name STRING,
      afp_rate FLOAT64,
      afp_cotizacion_rate FLOAT64,
      afp_comision_rate FLOAT64,
      health_system STRING,
      health_plan_uf FLOAT64,
      unemployment_rate FLOAT64,
      contract_type STRING,
      has_apv BOOL,
      apv_amount FLOAT64,
      effective_from DATE NOT NULL,
      effective_to DATE,
      is_current BOOL,
      change_reason STRING,
      created_by STRING,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.payroll_periods\` (
      period_id STRING NOT NULL,
      year INT64 NOT NULL,
      month INT64 NOT NULL,
      status STRING NOT NULL,
      calculated_at TIMESTAMP,
      calculated_by STRING,
      approved_at TIMESTAMP,
      approved_by STRING,
      exported_at TIMESTAMP,
      uf_value FLOAT64,
      tax_table_version STRING,
      notes STRING,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.payroll_entries\` (
      entry_id STRING NOT NULL,
      period_id STRING NOT NULL,
      member_id STRING NOT NULL,
      compensation_version_id STRING NOT NULL,
      pay_regime STRING NOT NULL,
      currency STRING NOT NULL,
      base_salary FLOAT64 NOT NULL,
      remote_allowance FLOAT64,
      colacion_amount FLOAT64 DEFAULT 0,
      movilizacion_amount FLOAT64 DEFAULT 0,
      fixed_bonus_label STRING,
      fixed_bonus_amount FLOAT64,
      kpi_otd_percent FLOAT64,
      kpi_rpa_avg FLOAT64,
      kpi_otd_qualifies BOOL,
      kpi_rpa_qualifies BOOL,
      kpi_tasks_completed INT64,
      kpi_data_source STRING,
      bonus_otd_amount FLOAT64,
      bonus_rpa_amount FLOAT64,
      bonus_other_amount FLOAT64,
      bonus_other_description STRING,
      gross_total FLOAT64 NOT NULL,
      chile_gratificacion_legal FLOAT64,
      chile_colacion_amount FLOAT64,
      chile_movilizacion_amount FLOAT64,
      chile_afp_name STRING,
      chile_afp_rate FLOAT64,
      chile_afp_amount FLOAT64,
      chile_afp_cotizacion_amount FLOAT64,
      chile_afp_comision_amount FLOAT64,
      chile_health_system STRING,
      chile_health_amount FLOAT64,
      chile_health_obligatoria_amount FLOAT64,
      chile_health_voluntaria_amount FLOAT64,
      chile_employer_sis_amount FLOAT64,
      chile_employer_cesantia_amount FLOAT64,
      chile_employer_mutual_amount FLOAT64,
      chile_employer_total_cost FLOAT64,
      chile_unemployment_rate FLOAT64,
      chile_unemployment_amount FLOAT64,
      chile_taxable_base FLOAT64,
      chile_tax_amount FLOAT64,
      chile_apv_amount FLOAT64,
      chile_uf_value FLOAT64,
      chile_total_deductions FLOAT64,
      net_total_calculated FLOAT64,
      net_total_override FLOAT64,
      net_total FLOAT64 NOT NULL,
      manual_override BOOL,
      manual_override_note STRING,
      adjusted_colacion_amount FLOAT64,
      adjusted_movilizacion_amount FLOAT64,
      adjusted_fixed_bonus_amount FLOAT64,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
    )
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.compensation_versions\`
    ADD COLUMN IF NOT EXISTS afp_cotizacion_rate FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.compensation_versions\`
    ADD COLUMN IF NOT EXISTS afp_comision_rate FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.compensation_versions\`
    ADD COLUMN IF NOT EXISTS colacion_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.compensation_versions\`
    ADD COLUMN IF NOT EXISTS movilizacion_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_afp_cotizacion_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_afp_comision_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS colacion_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS movilizacion_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_colacion_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_movilizacion_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_health_obligatoria_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_health_voluntaria_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_employer_sis_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_employer_cesantia_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_employer_mutual_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS chile_employer_total_cost FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS adjusted_colacion_amount FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_entries\`
    ADD COLUMN IF NOT EXISTS adjusted_movilizacion_amount FLOAT64
  `,
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.payroll_bonus_config\` (
      config_id STRING NOT NULL,
      otd_threshold FLOAT64 NOT NULL,
      rpa_threshold FLOAT64 NOT NULL,
      otd_floor FLOAT64 NOT NULL,
      rpa_full_payout_threshold FLOAT64 NOT NULL,
      rpa_soft_band_end FLOAT64 NOT NULL,
      rpa_soft_band_floor_factor FLOAT64 NOT NULL,
      effective_from DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
    )
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_bonus_config\`
    ADD COLUMN IF NOT EXISTS otd_floor FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_bonus_config\`
    ADD COLUMN IF NOT EXISTS rpa_full_payout_threshold FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_bonus_config\`
    ADD COLUMN IF NOT EXISTS rpa_soft_band_end FLOAT64
  `,
  `
    ALTER TABLE \`${projectId}.greenhouse.payroll_bonus_config\`
    ADD COLUMN IF NOT EXISTS rpa_soft_band_floor_factor FLOAT64
  `,
  `
    UPDATE \`${projectId}.greenhouse.payroll_bonus_config\`
    SET
      otd_floor = COALESCE(otd_floor, 70.0),
      rpa_full_payout_threshold = COALESCE(rpa_full_payout_threshold, 1.7),
      rpa_soft_band_end = COALESCE(rpa_soft_band_end, 2.0),
      rpa_soft_band_floor_factor = COALESCE(rpa_soft_band_floor_factor, 0.8)
    WHERE
      otd_floor IS NULL
      OR rpa_full_payout_threshold IS NULL
      OR rpa_soft_band_end IS NULL
      OR rpa_soft_band_floor_factor IS NULL
  `,
  `
    MERGE \`${projectId}.greenhouse.payroll_bonus_config\` AS target
    USING (
      SELECT
        'default' AS config_id,
        89.0 AS otd_threshold,
        3.0 AS rpa_threshold,
        70.0 AS otd_floor,
        1.7 AS rpa_full_payout_threshold,
        2.0 AS rpa_soft_band_end,
        0.8 AS rpa_soft_band_floor_factor,
        DATE '2026-01-01' AS effective_from,
        CURRENT_TIMESTAMP() AS created_at
    ) AS source
    ON target.config_id = source.config_id AND target.effective_from = source.effective_from
    WHEN MATCHED THEN
      UPDATE SET
        otd_threshold = source.otd_threshold,
        rpa_threshold = source.rpa_threshold,
        otd_floor = source.otd_floor,
        rpa_full_payout_threshold = source.rpa_full_payout_threshold,
        rpa_soft_band_end = source.rpa_soft_band_end,
        rpa_soft_band_floor_factor = source.rpa_soft_band_floor_factor,
        created_at = source.created_at
    WHEN NOT MATCHED THEN
      INSERT (
        config_id,
        otd_threshold,
        rpa_threshold,
        otd_floor,
        rpa_full_payout_threshold,
        rpa_soft_band_end,
        rpa_soft_band_floor_factor,
        effective_from,
        created_at
      )
      VALUES (
        source.config_id,
        source.otd_threshold,
        source.rpa_threshold,
        source.otd_floor,
        source.rpa_full_payout_threshold,
        source.rpa_soft_band_end,
        source.rpa_soft_band_floor_factor,
        source.effective_from,
        source.created_at
      )
  `,
  `
    MERGE \`${projectId}.greenhouse.roles\` AS target
    USING (
      SELECT
        'hr_payroll' AS role_code,
        'HR Payroll' AS role_name,
        'internal' AS role_family,
        'Specialized payroll access for human resources operations.' AS description,
        'efeonce_internal' AS tenant_type,
        FALSE AS is_admin,
        TRUE AS is_internal,
        ['internal', 'hr'] AS route_group_scope,
        CURRENT_TIMESTAMP() AS created_at,
        CURRENT_TIMESTAMP() AS updated_at
    ) AS source
    ON target.role_code = source.role_code
    WHEN MATCHED THEN
      UPDATE SET
        role_name = source.role_name,
        role_family = source.role_family,
        description = source.description,
        tenant_type = source.tenant_type,
        is_admin = source.is_admin,
        is_internal = source.is_internal,
        route_group_scope = source.route_group_scope,
        updated_at = CURRENT_TIMESTAMP()
    WHEN NOT MATCHED THEN
      INSERT (
        role_code,
        role_name,
        role_family,
        description,
        tenant_type,
        is_admin,
        is_internal,
        route_group_scope,
        created_at,
        updated_at
      )
      VALUES (
        source.role_code,
        source.role_name,
        source.role_family,
        source.description,
        source.tenant_type,
        source.is_admin,
        source.is_internal,
        source.route_group_scope,
        source.created_at,
        source.updated_at
      )
  `
]

export const ensurePayrollInfrastructure = async () => {
  if (ensurePayrollInfrastructurePromise) {
    return ensurePayrollInfrastructurePromise
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  ensurePayrollInfrastructurePromise = (async () => {
    for (const query of buildStatements(projectId)) {
      await bigQuery.query({ query })
    }
  })().catch(error => {
    ensurePayrollInfrastructurePromise = null
    throw error
  })

  return ensurePayrollInfrastructurePromise
}
