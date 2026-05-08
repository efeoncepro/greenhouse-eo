#!/usr/bin/env tsx
/**
 * Operator tool — list account_balances con FX drift activo en los últimos 90
 * días, devolviendo detalle por (account_id, balance_date) para decidir backfill
 * targeted via scripts/finance/backfill-account-balances-fx-fix.ts.
 *
 * Mismo SQL que el reader del reliability signal `finance.account_balances.fx_drift`
 * (TASK-774 Slice 4) pero retorna detalle por fila en lugar de COUNT.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/diagnose-fx-drift.ts
 *
 * Output: una línea por (account, fecha) drifteando, ordenadas por magnitud
 * descendiente. Cuando count = 0 (steady state), output vacío.
 *
 * Non-destructivo: solo SELECT.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { query } from '@/lib/db'

const SQL = `
  WITH expected_per_day AS (
    SELECT
      ab.account_id,
      ab.balance_date,
      ab.period_inflows,
      ab.period_outflows,
      a.account_name,
      a.currency AS account_currency,
      COALESCE(SUM(CASE WHEN sl.direction = 'incoming'
        THEN COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)
        ELSE 0 END), 0) AS expected_settlement_in,
      COALESCE(SUM(CASE WHEN sl.direction = 'outgoing'
        THEN COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)
        ELSE 0 END), 0) AS expected_settlement_out
    FROM greenhouse_finance.account_balances ab
    INNER JOIN greenhouse_finance.accounts a ON a.account_id = ab.account_id
    LEFT JOIN greenhouse_finance.settlement_legs sl
      ON sl.instrument_id = ab.account_id
      AND sl.transaction_date = ab.balance_date
      AND sl.superseded_at IS NULL
      AND sl.superseded_by_otb_id IS NULL
    WHERE ab.balance_date >= CURRENT_DATE - INTERVAL '90 days'
      AND a.currency = 'CLP'
    GROUP BY ab.account_id, ab.balance_date, ab.period_inflows, ab.period_outflows,
             a.account_name, a.currency
  ),
  expected_payments AS (
    SELECT
      epd.*,
      COALESCE((
        SELECT SUM(ipn.payment_amount_clp)
        FROM greenhouse_finance.income_payments_normalized ipn
        WHERE ipn.payment_account_id = epd.account_id
          AND ipn.payment_date = epd.balance_date
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_finance.settlement_legs sl2
            WHERE sl2.linked_payment_type = 'income_payment'
              AND sl2.linked_payment_id = ipn.payment_id
              AND sl2.instrument_id = epd.account_id
              AND sl2.superseded_at IS NULL
              AND sl2.superseded_by_otb_id IS NULL
          )
      ), 0) AS expected_payment_in,
      COALESCE((
        SELECT SUM(epn.payment_amount_clp)
        FROM greenhouse_finance.expense_payments_normalized epn
        WHERE epn.payment_account_id = epd.account_id
          AND epn.payment_date = epd.balance_date
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_finance.settlement_legs sl3
            WHERE sl3.linked_payment_type = 'expense_payment'
              AND sl3.linked_payment_id = epn.payment_id
              AND sl3.instrument_id = epd.account_id
              AND sl3.superseded_at IS NULL
              AND sl3.superseded_by_otb_id IS NULL
          )
      ), 0) AS expected_payment_out
    FROM expected_per_day epd
  )
  SELECT
    account_id,
    account_name,
    account_currency,
    balance_date::text AS balance_date,
    period_inflows::text AS persisted_inflows,
    period_outflows::text AS persisted_outflows,
    (expected_settlement_in + expected_payment_in)::text AS expected_in,
    (expected_settlement_out + expected_payment_out)::text AS expected_out,
    ((expected_settlement_in + expected_payment_in)
      - (expected_settlement_out + expected_payment_out)
      - (period_inflows - period_outflows))::text AS drift_clp
  FROM expected_payments
  WHERE ABS(
    (expected_settlement_in + expected_payment_in)
    - (expected_settlement_out + expected_payment_out)
    - (period_inflows - period_outflows)
  ) > 1
  ORDER BY ABS((expected_settlement_in + expected_payment_in)
            - (expected_settlement_out + expected_payment_out)
            - (period_inflows - period_outflows)) DESC
`

const main = async () => {
  console.log('\n─── account_balances FX drift detail (últimos 90 días) ───\n')

  const rows = await query<Record<string, string>>(SQL)

  if (rows.length === 0) {
    console.log('✓ Sin drift detectado. Steady state.')
    process.exit(0)
  }

  console.log(`⚠️  ${rows.length} account_balance${rows.length === 1 ? '' : 's'} con drift activo:\n`)

  for (const row of rows) {
    console.log(`  account: ${row.account_id} (${row.account_name}, ${row.account_currency})`)
    console.log(`  date:    ${row.balance_date}`)
    console.log(`  persisted: in=${row.persisted_inflows} out=${row.persisted_outflows}`)
    console.log(`  expected:  in=${row.expected_in} out=${row.expected_out}`)
    console.log(`  drift_clp: ${row.drift_clp}`)
    console.log(`  recovery:  pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/backfill-account-balances-fx-fix.ts --account-id=${row.account_id} --from-date=${row.balance_date}`)
    console.log('')
  }

  process.exit(0)
}

main().catch(err => {
  console.error('error:', err.message)
  process.exit(1)
})
