import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'
import { getGoogleCredentials } from '@/lib/google-credentials'

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0

  if (typeof v === 'object' && v !== null && 'valueOf' in v) {
    const prim = (v as { valueOf: () => unknown }).valueOf()


return typeof prim === 'number' ? prim : typeof prim === 'string' ? Number(prim) || 0 : 0
  }


return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null

return toNum(v)
}

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'object' && v !== null && 'value' in v) return toStr((v as { value?: unknown }).value)

return String(v)
}

const toDate = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.split('T')[0] || null
  if (typeof v === 'object' && v !== null && 'value' in v) return toDate((v as { value?: unknown }).value)

return null
}

const toTs = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v || null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object' && v !== null && 'value' in v) return toTs((v as { value?: unknown }).value)

return null
}

const toBool = (v: unknown): boolean => Boolean(v)

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const projectId = process.env.GCP_PROJECT!
  const credentials = getGoogleCredentials()

  const bq = new BigQuery({
    projectId,
    ...(credentials ? { credentials } : {})
  })

  try {
    // ─── 1. Compensation Versions ──────────────────────────────
    console.log('\n--- compensation_versions ---')

    const [compRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.compensation_versions\``
    })

    console.log(`  BigQuery: ${compRows.length} rows`)

    for (const r of compRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_payroll.compensation_versions (
          version_id, member_id, version, pay_regime, currency,
          base_salary, remote_allowance,
          bonus_otd_min, bonus_otd_max, bonus_rpa_min, bonus_rpa_max,
          afp_name, afp_rate, health_system, health_plan_uf,
          unemployment_rate, contract_type, has_apv, apv_amount,
          effective_from, effective_to, is_current,
          change_reason, created_by_user_id, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
        ON CONFLICT (version_id) DO NOTHING`,
        [
          toStr(r.version_id), toStr(r.member_id), toNum(r.version),
          toStr(r.pay_regime) || 'chile', toStr(r.currency) || 'CLP',
          toNum(r.base_salary), toNum(r.remote_allowance),
          toNum(r.bonus_otd_min), toNum(r.bonus_otd_max),
          toNum(r.bonus_rpa_min), toNum(r.bonus_rpa_max),
          toStr(r.afp_name), toNullNum(r.afp_rate),
          toStr(r.health_system), toNullNum(r.health_plan_uf),
          toNullNum(r.unemployment_rate),
          toStr(r.contract_type) || 'indefinido',
          toBool(r.has_apv), toNum(r.apv_amount),
          toDate(r.effective_from), toDate(r.effective_to),
          toBool(r.is_current),
          toStr(r.change_reason), toStr(r.created_by),
          toTs(r.created_at) || new Date().toISOString()
        ]
      )
    }

    console.log(`  Inserted: ${compRows.length}`)

    // ─── 2. Payroll Periods ────────────────────────────────────
    console.log('\n--- payroll_periods ---')

    const [periodRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.payroll_periods\``
    })

    console.log(`  BigQuery: ${periodRows.length} rows`)

    for (const r of periodRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_payroll.payroll_periods (
          period_id, year, month, status,
          calculated_at, calculated_by_user_id,
          approved_at, approved_by_user_id,
          exported_at, uf_value, tax_table_version, notes,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (period_id) DO NOTHING`,
        [
          toStr(r.period_id), toNum(r.year), toNum(r.month),
          toStr(r.status) || 'draft',
          toTs(r.calculated_at), toStr(r.calculated_by),
          toTs(r.approved_at), toStr(r.approved_by),
          toTs(r.exported_at), toNullNum(r.uf_value),
          toStr(r.tax_table_version), toStr(r.notes),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }

    console.log(`  Inserted: ${periodRows.length}`)

    // ─── 3. Payroll Entries ────────────────────────────────────
    console.log('\n--- payroll_entries ---')

    const [entryRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.payroll_entries\``
    })

    console.log(`  BigQuery: ${entryRows.length} rows`)

    for (const r of entryRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_payroll.payroll_entries (
          entry_id, period_id, member_id, compensation_version_id,
          pay_regime, currency, base_salary, remote_allowance,
          member_display_name,
          kpi_otd_percent, kpi_rpa_avg, kpi_otd_qualifies, kpi_rpa_qualifies,
          kpi_tasks_completed, kpi_data_source,
          bonus_otd_amount, bonus_rpa_amount, bonus_other_amount, bonus_other_description,
          gross_total,
          chile_afp_name, chile_afp_rate, chile_afp_amount,
          chile_health_system, chile_health_amount,
          chile_unemployment_rate, chile_unemployment_amount,
          chile_taxable_base, chile_tax_amount, chile_apv_amount,
          chile_uf_value, chile_total_deductions,
          net_total_calculated, net_total_override, net_total,
          manual_override, manual_override_note,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38)
        ON CONFLICT (entry_id) DO NOTHING`,
        [
          toStr(r.entry_id), toStr(r.period_id), toStr(r.member_id),
          toStr(r.compensation_version_id),
          toStr(r.pay_regime) || 'chile', toStr(r.currency) || 'CLP',
          toNum(r.base_salary), toNum(r.remote_allowance),
          toStr(r.member_display_name),
          toNullNum(r.kpi_otd_percent), toNullNum(r.kpi_rpa_avg),
          r.kpi_otd_qualifies != null ? toBool(r.kpi_otd_qualifies) : null,
          r.kpi_rpa_qualifies != null ? toBool(r.kpi_rpa_qualifies) : null,
          toNullNum(r.kpi_tasks_completed), toStr(r.kpi_data_source),
          toNum(r.bonus_otd_amount), toNum(r.bonus_rpa_amount),
          toNum(r.bonus_other_amount), toStr(r.bonus_other_description),
          toNum(r.gross_total),
          toStr(r.chile_afp_name), toNullNum(r.chile_afp_rate), toNullNum(r.chile_afp_amount),
          toStr(r.chile_health_system), toNullNum(r.chile_health_amount),
          toNullNum(r.chile_unemployment_rate), toNullNum(r.chile_unemployment_amount),
          toNullNum(r.chile_taxable_base), toNullNum(r.chile_tax_amount),
          toNullNum(r.chile_apv_amount), toNullNum(r.chile_uf_value),
          toNullNum(r.chile_total_deductions),
          toNullNum(r.net_total_calculated), toNullNum(r.net_total_override),
          toNum(r.net_total),
          toBool(r.manual_override), toStr(r.manual_override_note),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }

    console.log(`  Inserted: ${entryRows.length}`)

    // ─── 4. Bonus Config ───────────────────────────────────────
    console.log('\n--- payroll_bonus_config ---')

    const [configRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.payroll_bonus_config\``
    })

    console.log(`  BigQuery: ${configRows.length} rows`)

    for (const r of configRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_payroll.payroll_bonus_config (
          config_id,
          otd_threshold,
          rpa_threshold,
          otd_floor,
          rpa_full_payout_threshold,
          rpa_soft_band_end,
          rpa_soft_band_floor_factor,
          effective_from,
          created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (config_id, effective_from) DO UPDATE SET
          otd_threshold = EXCLUDED.otd_threshold,
          rpa_threshold = EXCLUDED.rpa_threshold,
          otd_floor = EXCLUDED.otd_floor,
          rpa_full_payout_threshold = EXCLUDED.rpa_full_payout_threshold,
          rpa_soft_band_end = EXCLUDED.rpa_soft_band_end,
          rpa_soft_band_floor_factor = EXCLUDED.rpa_soft_band_floor_factor`,
        [
          toStr(r.config_id) || 'default',
          toNum(r.otd_threshold),
          toNum(r.rpa_threshold),
          toNum(r.otd_floor) || 70,
          toNum(r.rpa_full_payout_threshold) || 1.7,
          toNum(r.rpa_soft_band_end) || 2,
          toNum(r.rpa_soft_band_floor_factor) || 0.8,
          toDate(r.effective_from) || '2026-01-01',
          toTs(r.created_at) || new Date().toISOString()
        ]
      )
    }

    console.log(`  Inserted: ${configRows.length}`)

    console.log('\n✅ Payroll backfill complete')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(err => {
  console.error('❌ Payroll backfill failed:', err)
  process.exit(1)
})
