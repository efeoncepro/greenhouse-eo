import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

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
  const bq = new BigQuery({ projectId })

  try {
    // ─── 1. Client Profiles ────────────────────────────────────
    console.log('\n--- client_profiles ---')
    const [cpRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.fin_client_profiles\``
    })
    console.log(`  BigQuery: ${cpRows.length} rows`)

    for (const r of cpRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_finance.client_profiles (
          client_profile_id, client_id, hubspot_company_id, tax_id, tax_id_type,
          legal_name, billing_address, billing_country, payment_terms_days,
          payment_currency, requires_po, requires_hes, current_po_number,
          current_hes_number, finance_contacts, special_conditions,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (client_profile_id) DO NOTHING`,
        [
          toStr(r.client_profile_id), toStr(r.client_id), toStr(r.hubspot_company_id),
          toStr(r.tax_id), toStr(r.tax_id_type), toStr(r.legal_name),
          toStr(r.billing_address), toStr(r.billing_country),
          toNullNum(r.payment_terms_days), toStr(r.payment_currency),
          toBool(r.requires_po), toBool(r.requires_hes),
          toStr(r.current_po_number), toStr(r.current_hes_number),
          r.finance_contacts ? JSON.stringify(r.finance_contacts) : null,
          toStr(r.special_conditions),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Inserted: ${cpRows.length}`)

    // ─── 2. Income ─────────────────────────────────────────────
    console.log('\n--- income ---')
    const [incRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.fin_income\``
    })
    console.log(`  BigQuery: ${incRows.length} rows`)

    for (const r of incRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_finance.income (
          income_id, client_id, client_profile_id, hubspot_company_id, hubspot_deal_id,
          client_name, invoice_number, invoice_date, due_date, description,
          currency, subtotal, tax_rate, tax_amount, total_amount,
          exchange_rate_to_clp, total_amount_clp, payment_status, amount_paid,
          po_number, hes_number, service_line, income_type,
          is_reconciled, reconciliation_id, notes,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
        ON CONFLICT (income_id) DO NOTHING`,
        [
          toStr(r.income_id), toStr(r.client_id), toStr(r.client_profile_id),
          toStr(r.hubspot_company_id), toStr(r.hubspot_deal_id),
          toStr(r.client_name) || 'Unknown', toStr(r.invoice_number),
          toDate(r.invoice_date), toDate(r.due_date), toStr(r.description),
          toStr(r.currency) || 'CLP', toNum(r.subtotal),
          toNullNum(r.tax_rate), toNum(r.tax_amount), toNum(r.total_amount),
          toNullNum(r.exchange_rate_to_clp), toNum(r.total_amount_clp),
          toStr(r.payment_status) || 'pending', toNum(r.amount_paid),
          toStr(r.po_number), toStr(r.hes_number), toStr(r.service_line),
          toStr(r.income_type) || 'service_fee',
          toBool(r.is_reconciled), toStr(r.reconciliation_id), toStr(r.notes),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Inserted: ${incRows.length}`)

    // ─── 2b. Income Payments (from JSON field) ──────────────────
    console.log('\n--- income_payments (from JSON) ---')
    let paymentCount = 0
    for (const r of incRows as any[]) {
      const payments = r.payments_received
      if (!payments) continue

      let parsed: any[]
      try {
        parsed = typeof payments === 'string' ? JSON.parse(payments) : Array.isArray(payments) ? payments : []
      } catch {
        continue
      }

      for (const p of parsed) {
        if (!p || typeof p !== 'object') continue
        const paymentId = toStr(p.paymentId) || `legacy_${toStr(r.income_id)}_${paymentCount}`

        await runGreenhousePostgresQuery(
          `INSERT INTO greenhouse_finance.income_payments (
            payment_id, income_id, payment_date, amount, currency, reference,
            payment_method, payment_account_id, payment_source, notes,
            recorded_at, is_reconciled, reconciliation_row_id, reconciled_at,
            created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (payment_id) DO NOTHING`,
          [
            paymentId, toStr(r.income_id), toDate(p.paymentDate),
            toNum(p.amount), toStr(p.currency), toStr(p.reference),
            toStr(p.paymentMethod), toStr(p.paymentAccountId),
            'client_direct', toStr(p.notes),
            toTs(p.recordedAt), toBool(p.isReconciled),
            toStr(p.reconciliationRowId), toTs(p.reconciledAt),
            toTs(p.recordedAt) || new Date().toISOString()
          ]
        )
        paymentCount++
      }
    }
    console.log(`  Inserted: ${paymentCount}`)

    // ─── 3. Expenses ───────────────────────────────────────────
    console.log('\n--- expenses ---')
    const [expRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.fin_expenses\``
    })
    console.log(`  BigQuery: ${expRows.length} rows`)

    for (const r of expRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_finance.expenses (
          expense_id, client_id, expense_type, description, currency,
          subtotal, tax_rate, tax_amount, total_amount,
          exchange_rate_to_clp, total_amount_clp,
          payment_date, payment_status, payment_method, payment_account_id, payment_reference,
          document_number, document_date, due_date,
          supplier_id, supplier_name, supplier_invoice_number,
          payroll_period_id, payroll_entry_id, member_id, member_name,
          social_security_type, social_security_institution, social_security_period,
          tax_type, tax_period, tax_form_number,
          miscellaneous_category, service_line, is_recurring, recurrence_frequency,
          is_reconciled, reconciliation_id, notes,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41)
        ON CONFLICT (expense_id) DO NOTHING`,
        [
          toStr(r.expense_id), toStr(r.client_id),
          toStr(r.expense_type) || 'miscellaneous', toStr(r.description) || 'No description',
          toStr(r.currency) || 'CLP',
          toNum(r.subtotal), toNullNum(r.tax_rate), toNullNum(r.tax_amount),
          toNum(r.total_amount), toNullNum(r.exchange_rate_to_clp), toNum(r.total_amount_clp),
          toDate(r.payment_date), toStr(r.payment_status) || 'pending',
          toStr(r.payment_method), toStr(r.payment_account_id), toStr(r.payment_reference),
          toStr(r.document_number), toDate(r.document_date), toDate(r.due_date),
          toStr(r.supplier_id), toStr(r.supplier_name), toStr(r.supplier_invoice_number),
          toStr(r.payroll_period_id), toStr(r.payroll_entry_id),
          toStr(r.member_id), toStr(r.member_name),
          toStr(r.social_security_type), toStr(r.social_security_institution),
          toStr(r.social_security_period),
          toStr(r.tax_type), toStr(r.tax_period), toStr(r.tax_form_number),
          toStr(r.miscellaneous_category), toStr(r.service_line),
          toBool(r.is_recurring), toStr(r.recurrence_frequency),
          toBool(r.is_reconciled), toStr(r.reconciliation_id), toStr(r.notes),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Inserted: ${expRows.length}`)

    // ─── 4. Reconciliation Periods ─────────────────────────────
    console.log('\n--- reconciliation_periods ---')
    const [recRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.fin_reconciliation_periods\``
    })
    console.log(`  BigQuery: ${recRows.length} rows`)

    for (const r of recRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_finance.reconciliation_periods (
          period_id, account_id, year, month,
          opening_balance, closing_balance_bank, closing_balance_system, difference,
          status, statement_imported, statement_imported_at, statement_row_count,
          notes, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (period_id) DO NOTHING`,
        [
          toStr(r.period_id), toStr(r.account_id),
          toNum(r.year), toNum(r.month),
          toNum(r.opening_balance), toNullNum(r.closing_balance_bank),
          toNullNum(r.closing_balance_system), toNullNum(r.difference),
          toStr(r.status) || 'draft', toBool(r.statement_imported),
          toTs(r.statement_imported_at), toNullNum(r.statement_row_count),
          toStr(r.notes),
          toTs(r.created_at) || new Date().toISOString(),
          toTs(r.updated_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Inserted: ${recRows.length}`)

    // ─── 5. Bank Statement Rows ────────────────────────────────
    console.log('\n--- bank_statement_rows ---')
    const [bsRows] = await bq.query({
      query: `SELECT * FROM \`${projectId}.greenhouse.fin_bank_statement_rows\``
    })
    console.log(`  BigQuery: ${bsRows.length} rows`)

    for (const r of bsRows as any[]) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_finance.bank_statement_rows (
          row_id, period_id, transaction_date, value_date,
          description, reference, amount, balance,
          match_status, matched_type, matched_id, matched_payment_id,
          match_confidence, notes, matched_at, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (row_id) DO NOTHING`,
        [
          toStr(r.row_id), toStr(r.period_id),
          toDate(r.transaction_date), toDate(r.value_date),
          toStr(r.description) || '', toStr(r.reference),
          toNum(r.amount), toNullNum(r.balance),
          toStr(r.match_status) || 'unmatched',
          toStr(r.matched_type), toStr(r.matched_id), toStr(r.matched_payment_id),
          toNullNum(r.match_confidence), toStr(r.notes),
          toTs(r.matched_at),
          toTs(r.created_at) || new Date().toISOString()
        ]
      )
    }
    console.log(`  Inserted: ${bsRows.length}`)

    // ─── Summary ───────────────────────────────────────────────
    console.log('\n=== Backfill complete ===')
    console.log(`  client_profiles: ${cpRows.length}`)
    console.log(`  income: ${incRows.length}`)
    console.log(`  income_payments: ${paymentCount}`)
    console.log(`  expenses: ${expRows.length}`)
    console.log(`  reconciliation_periods: ${recRows.length}`)
    console.log(`  bank_statement_rows: ${bsRows.length}`)
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
