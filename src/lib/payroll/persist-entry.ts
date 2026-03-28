import 'server-only'

import type { PayrollEntry } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import { buildPayrollQueryTypes, runPayrollQuery } from '@/lib/payroll/shared'
import { isPayrollPostgresEnabled, pgUpsertPayrollEntry } from '@/lib/payroll/postgres-store'

const getProjectId = () => getBigQueryProjectId()

const PAYROLL_ENTRY_MUTATION_TYPES = {
  kpiOtdPercent: 'FLOAT64',
  kpiRpaAvg: 'FLOAT64',
  kpiTasksCompleted: 'INT64',
  fixedBonusLabel: 'STRING',
  bonusOtherDescription: 'STRING',
  chileAfpName: 'STRING',
  chileAfpRate: 'FLOAT64',
  chileAfpAmount: 'FLOAT64',
  chileGratificacionLegalAmount: 'FLOAT64',
  chileHealthSystem: 'STRING',
  chileHealthAmount: 'FLOAT64',
  chileUnemploymentRate: 'FLOAT64',
  chileUnemploymentAmount: 'FLOAT64',
  chileTaxableBase: 'FLOAT64',
  chileTaxAmount: 'FLOAT64',
  chileApvAmount: 'FLOAT64',
  chileUfValue: 'FLOAT64',
  chileTotalDeductions: 'FLOAT64',
  netTotalCalculated: 'FLOAT64',
  netTotalOverride: 'FLOAT64',
  adjustedFixedBonusAmount: 'FLOAT64',
  manualOverrideNote: 'STRING'
} as const

export const upsertPayrollEntry = async (entry: PayrollEntry) => {
  if (isPayrollPostgresEnabled()) {
    return pgUpsertPayrollEntry(entry)
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()
  const entryParams = entry as unknown as Record<string, unknown>

  await runPayrollQuery(
    `
      MERGE \`${projectId}.greenhouse.payroll_entries\` AS target
      USING (
        SELECT
          @entryId AS entry_id,
          @periodId AS period_id,
          @memberId AS member_id,
          @compensationVersionId AS compensation_version_id,
          @payRegime AS pay_regime,
          @currency AS currency,
          @baseSalary AS base_salary,
          @remoteAllowance AS remote_allowance,
          @fixedBonusLabel AS fixed_bonus_label,
          @fixedBonusAmount AS fixed_bonus_amount,
          @kpiOtdPercent AS kpi_otd_percent,
          @kpiRpaAvg AS kpi_rpa_avg,
          @kpiOtdQualifies AS kpi_otd_qualifies,
          @kpiRpaQualifies AS kpi_rpa_qualifies,
          @kpiTasksCompleted AS kpi_tasks_completed,
          @kpiDataSource AS kpi_data_source,
          @bonusOtdAmount AS bonus_otd_amount,
          @bonusRpaAmount AS bonus_rpa_amount,
          @bonusOtherAmount AS bonus_other_amount,
          @bonusOtherDescription AS bonus_other_description,
          @grossTotal AS gross_total,
          @chileAfpName AS chile_afp_name,
          @chileAfpRate AS chile_afp_rate,
          @chileAfpAmount AS chile_afp_amount,
          @chileGratificacionLegalAmount AS chile_gratificacion_legal,
          @chileHealthSystem AS chile_health_system,
          @chileHealthAmount AS chile_health_amount,
          @chileUnemploymentRate AS chile_unemployment_rate,
          @chileUnemploymentAmount AS chile_unemployment_amount,
          @chileTaxableBase AS chile_taxable_base,
          @chileTaxAmount AS chile_tax_amount,
          @chileApvAmount AS chile_apv_amount,
          @chileUfValue AS chile_uf_value,
          @chileTotalDeductions AS chile_total_deductions,
          @netTotalCalculated AS net_total_calculated,
          @netTotalOverride AS net_total_override,
          @netTotal AS net_total,
          @adjustedFixedBonusAmount AS adjusted_fixed_bonus_amount,
          @manualOverride AS manual_override,
          @manualOverrideNote AS manual_override_note
      ) AS source
      ON target.entry_id = source.entry_id
      WHEN MATCHED THEN
        UPDATE SET
          period_id = source.period_id,
          member_id = source.member_id,
          compensation_version_id = source.compensation_version_id,
          pay_regime = source.pay_regime,
          currency = source.currency,
          base_salary = source.base_salary,
          remote_allowance = source.remote_allowance,
          fixed_bonus_label = source.fixed_bonus_label,
          fixed_bonus_amount = source.fixed_bonus_amount,
          kpi_otd_percent = source.kpi_otd_percent,
          kpi_rpa_avg = source.kpi_rpa_avg,
          kpi_otd_qualifies = source.kpi_otd_qualifies,
          kpi_rpa_qualifies = source.kpi_rpa_qualifies,
          kpi_tasks_completed = source.kpi_tasks_completed,
          kpi_data_source = source.kpi_data_source,
          bonus_otd_amount = source.bonus_otd_amount,
          bonus_rpa_amount = source.bonus_rpa_amount,
          bonus_other_amount = source.bonus_other_amount,
          bonus_other_description = source.bonus_other_description,
          gross_total = source.gross_total,
          chile_afp_name = source.chile_afp_name,
          chile_afp_rate = source.chile_afp_rate,
          chile_afp_amount = source.chile_afp_amount,
          chile_gratificacion_legal = source.chile_gratificacion_legal,
          chile_health_system = source.chile_health_system,
          chile_health_amount = source.chile_health_amount,
          chile_unemployment_rate = source.chile_unemployment_rate,
          chile_unemployment_amount = source.chile_unemployment_amount,
          chile_taxable_base = source.chile_taxable_base,
          chile_tax_amount = source.chile_tax_amount,
          chile_apv_amount = source.chile_apv_amount,
          chile_uf_value = source.chile_uf_value,
          chile_total_deductions = source.chile_total_deductions,
          net_total_calculated = source.net_total_calculated,
          net_total_override = source.net_total_override,
          net_total = source.net_total,
          adjusted_fixed_bonus_amount = source.adjusted_fixed_bonus_amount,
          manual_override = source.manual_override,
          manual_override_note = source.manual_override_note,
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (
          entry_id,
          period_id,
          member_id,
          compensation_version_id,
          pay_regime,
          currency,
          base_salary,
          remote_allowance,
          fixed_bonus_label,
          fixed_bonus_amount,
          kpi_otd_percent,
          kpi_rpa_avg,
          kpi_otd_qualifies,
          kpi_rpa_qualifies,
          kpi_tasks_completed,
          kpi_data_source,
          bonus_otd_amount,
          bonus_rpa_amount,
          bonus_other_amount,
          bonus_other_description,
          gross_total,
          chile_afp_name,
          chile_afp_rate,
          chile_afp_amount,
          chile_gratificacion_legal,
          chile_health_system,
          chile_health_amount,
          chile_unemployment_rate,
          chile_unemployment_amount,
          chile_taxable_base,
          chile_tax_amount,
          chile_apv_amount,
          chile_uf_value,
          chile_total_deductions,
          net_total_calculated,
          net_total_override,
          net_total,
          adjusted_fixed_bonus_amount,
          manual_override,
          manual_override_note,
          created_at,
          updated_at
        )
        VALUES (
          source.entry_id,
          source.period_id,
          source.member_id,
          source.compensation_version_id,
          source.pay_regime,
          source.currency,
          source.base_salary,
          source.remote_allowance,
          source.fixed_bonus_label,
          source.fixed_bonus_amount,
          source.kpi_otd_percent,
          source.kpi_rpa_avg,
          source.kpi_otd_qualifies,
          source.kpi_rpa_qualifies,
          source.kpi_tasks_completed,
          source.kpi_data_source,
          source.bonus_otd_amount,
          source.bonus_rpa_amount,
          source.bonus_other_amount,
          source.bonus_other_description,
          source.gross_total,
          source.chile_afp_name,
          source.chile_afp_rate,
          source.chile_afp_amount,
          source.chile_gratificacion_legal,
          source.chile_health_system,
          source.chile_health_amount,
          source.chile_unemployment_rate,
          source.chile_unemployment_amount,
          source.chile_taxable_base,
          source.chile_tax_amount,
          source.chile_apv_amount,
          source.chile_uf_value,
          source.chile_total_deductions,
          source.net_total_calculated,
          source.net_total_override,
          source.net_total,
          source.adjusted_fixed_bonus_amount,
          source.manual_override,
          source.manual_override_note,
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
    `,
    entryParams,
    buildPayrollQueryTypes(entryParams, PAYROLL_ENTRY_MUTATION_TYPES)
  )
}
