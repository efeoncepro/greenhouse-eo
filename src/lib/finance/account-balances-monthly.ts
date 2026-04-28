import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

/**
 * TASK-705 Slice 2 — account_balances_monthly aggregator + reader.
 * ===================================================================
 *
 * Read model agregado por (account_id, balance_year, balance_month). Es
 * proyeccion derivada de account_balances daily — NO source of truth. Se
 * refresca:
 *
 *   1. Reactivamente cuando se materializa un dia (accountBalancesMonthlyProjection
 *      consume `finance.account_balance.materialized` events).
 *   2. Operativamente vía ops-worker /finance/rematerialize-balances (cron 5:00 CLT).
 *   3. Manualmente via aggregateMonthlyFromDaily(accountId, year, month).
 *
 * Reglas duras:
 *   - UPSERT atómico via UNIQUE constraint (idempotente).
 *   - opening_balance = closing del primer dia del mes con snapshot.
 *   - closing_balance = closing del ultimo dia del mes con snapshot.
 *   - SUMs (period_inflows, period_outflows, fx_*) acumulados de los dias.
 *   - last_transaction_at = MAX de los dias.
 *   - Si el mes no tiene days en account_balances, el aggregator NO inserta
 *     ni borra (no-op silencioso) — el reader maneja gaps con LEFT JOIN sobre
 *     array de meses esperados.
 *
 * Source of truth: src/lib/finance/account-balances.ts (daily). Este modulo
 * NO debe duplicar logica de calculo de FX o opening — solo agregar.
 */

export type MonthlyAccountBalanceRecord = {
  balanceId: string
  accountId: string
  spaceId: string | null
  balanceYear: number
  balanceMonth: number
  currency: string
  openingBalance: number
  closingBalance: number
  closingBalanceClp: number | null
  periodInflows: number
  periodOutflows: number
  fxGainLossClp: number
  fxGainLossRealizedClp: number
  fxGainLossTranslationClp: number
  transactionCount: number
  lastTransactionAt: string | null
  computedAt: string
}

interface MonthlyRowSql {
  balance_id: string
  account_id: string
  space_id: string | null
  balance_year: number
  balance_month: number
  currency: string
  opening_balance: string
  closing_balance: string
  closing_balance_clp: string | null
  period_inflows: string
  period_outflows: string
  fx_gain_loss_clp: string
  fx_gain_loss_realized_clp: string
  fx_gain_loss_translation_clp: string
  transaction_count: number
  last_transaction_at: string | null
  computed_at: string
}

const toNumber = (raw: string | null | undefined, fallback = 0): number => {
  if (raw === null || raw === undefined) return fallback
  const parsed = Number(raw)

  return Number.isFinite(parsed) ? parsed : fallback
}

const toNullableNumber = (raw: string | null | undefined): number | null => {
  if (raw === null || raw === undefined) return null
  const parsed = Number(raw)

  return Number.isFinite(parsed) ? parsed : null
}

const mapRow = (row: MonthlyRowSql & Record<string, unknown>): MonthlyAccountBalanceRecord => ({
  balanceId: row.balance_id,
  accountId: row.account_id,
  spaceId: row.space_id,
  balanceYear: row.balance_year,
  balanceMonth: row.balance_month,
  currency: row.currency,
  openingBalance: toNumber(row.opening_balance),
  closingBalance: toNumber(row.closing_balance),
  closingBalanceClp: toNullableNumber(row.closing_balance_clp),
  periodInflows: toNumber(row.period_inflows),
  periodOutflows: toNumber(row.period_outflows),
  fxGainLossClp: toNumber(row.fx_gain_loss_clp),
  fxGainLossRealizedClp: toNumber(row.fx_gain_loss_realized_clp),
  fxGainLossTranslationClp: toNumber(row.fx_gain_loss_translation_clp),
  transactionCount: row.transaction_count,
  lastTransactionAt: row.last_transaction_at,
  computedAt: row.computed_at
})

const buildBalanceId = (accountId: string, year: number, month: number): string =>
  `acctbal-mo-${accountId}-${year}-${String(month).padStart(2, '0')}`

/**
 * Ejecuta el INSERT ON CONFLICT atomico para un (account_id, year, month). Si
 * el cliente provee un PoolClient, usa esa conexion (transaccion compartida);
 * sino abre una transaccion propia.
 *
 * Retorna `null` si el mes no tiene daily snapshots (no-op silencioso).
 */
export const aggregateMonthlyFromDaily = async (input: {
  accountId: string
  year: number
  month: number
  client?: PoolClient
}): Promise<MonthlyAccountBalanceRecord | null> => {
  const upsertSql = `
    WITH monthly_buckets AS (
      SELECT
        account_id,
        space_id,
        currency,
        balance_date,
        opening_balance,
        closing_balance,
        closing_balance_clp,
        period_inflows,
        period_outflows,
        fx_gain_loss_clp,
        fx_gain_loss_realized_clp,
        fx_gain_loss_translation_clp,
        transaction_count,
        last_transaction_at
      FROM greenhouse_finance.account_balances
      WHERE account_id = $1
        AND EXTRACT(YEAR FROM balance_date)::int = $2
        AND EXTRACT(MONTH FROM balance_date)::int = $3
    ),
    opening_row AS (
      SELECT opening_balance
      FROM monthly_buckets
      ORDER BY balance_date ASC
      LIMIT 1
    ),
    closing_row AS (
      SELECT space_id, currency, closing_balance, closing_balance_clp
      FROM monthly_buckets
      ORDER BY balance_date DESC
      LIMIT 1
    ),
    sums AS (
      SELECT
        SUM(period_inflows)::numeric AS period_inflows,
        SUM(period_outflows)::numeric AS period_outflows,
        SUM(fx_gain_loss_clp)::numeric AS fx_gain_loss_clp,
        SUM(fx_gain_loss_realized_clp)::numeric AS fx_gain_loss_realized_clp,
        SUM(fx_gain_loss_translation_clp)::numeric AS fx_gain_loss_translation_clp,
        SUM(transaction_count)::int AS transaction_count,
        MAX(last_transaction_at) AS last_transaction_at
      FROM monthly_buckets
    )
    INSERT INTO greenhouse_finance.account_balances_monthly (
      balance_id, account_id, space_id, balance_year, balance_month, currency,
      opening_balance, closing_balance, closing_balance_clp,
      period_inflows, period_outflows,
      fx_gain_loss_clp, fx_gain_loss_realized_clp, fx_gain_loss_translation_clp,
      transaction_count, last_transaction_at, computed_at
    )
    SELECT
      $4 AS balance_id,
      $1 AS account_id,
      cr.space_id,
      $2 AS balance_year,
      $3 AS balance_month,
      cr.currency,
      orow.opening_balance,
      cr.closing_balance,
      cr.closing_balance_clp,
      s.period_inflows,
      s.period_outflows,
      s.fx_gain_loss_clp,
      s.fx_gain_loss_realized_clp,
      s.fx_gain_loss_translation_clp,
      s.transaction_count,
      s.last_transaction_at,
      NOW()
    FROM closing_row cr, opening_row orow, sums s
    ON CONFLICT (account_id, balance_year, balance_month) DO UPDATE
    SET
      space_id = EXCLUDED.space_id,
      currency = EXCLUDED.currency,
      opening_balance = EXCLUDED.opening_balance,
      closing_balance = EXCLUDED.closing_balance,
      closing_balance_clp = EXCLUDED.closing_balance_clp,
      period_inflows = EXCLUDED.period_inflows,
      period_outflows = EXCLUDED.period_outflows,
      fx_gain_loss_clp = EXCLUDED.fx_gain_loss_clp,
      fx_gain_loss_realized_clp = EXCLUDED.fx_gain_loss_realized_clp,
      fx_gain_loss_translation_clp = EXCLUDED.fx_gain_loss_translation_clp,
      transaction_count = EXCLUDED.transaction_count,
      last_transaction_at = EXCLUDED.last_transaction_at,
      computed_at = NOW()
    RETURNING *
  `

  const balanceId = buildBalanceId(input.accountId, input.year, input.month)

  const params = [input.accountId, input.year, input.month, balanceId]

  if (input.client) {
    const result = await input.client.query<MonthlyRowSql>(upsertSql, params)

    return result.rows[0] ? mapRow(result.rows[0] as MonthlyRowSql & Record<string, unknown>) : null
  }

  const rows = await runGreenhousePostgresQuery<MonthlyRowSql & Record<string, unknown>>(upsertSql, params)

  return rows[0] ? mapRow(rows[0]) : null
}

/**
 * Lee el histórico de los ultimos N meses para una cuenta. Si un mes no tiene
 * snapshot mensual (e.g., cuenta nueva sin actividad ese mes), simplemente no
 * aparece en el array — el caller maneja gaps con UI logic.
 *
 * El reader es read-only: NO dispara aggregateMonthlyFromDaily si falta. Para
 * eso esta la lane reactiva o ops-worker.
 */
export const listMonthlyHistoryForAccount = async (input: {
  accountId: string
  fromYear: number
  fromMonth: number
  toYear: number
  toMonth: number
}): Promise<MonthlyAccountBalanceRecord[]> => {
  const sql = `
    SELECT *
    FROM greenhouse_finance.account_balances_monthly
    WHERE account_id = $1
      AND (balance_year * 100 + balance_month) BETWEEN ($2 * 100 + $3) AND ($4 * 100 + $5)
    ORDER BY balance_year ASC, balance_month ASC
  `

  const rows = await runGreenhousePostgresQuery<MonthlyRowSql & Record<string, unknown>>(
    sql,
    [input.accountId, input.fromYear, input.fromMonth, input.toYear, input.toMonth]
  )

  return rows.map(mapRow)
}

/**
 * Refresca múltiples (account_id, year, month) en una sola transacción.
 * Útil para ops-worker batch refresh. Si un mes no tiene daily snapshots,
 * se skipea silenciosamente (returns count 0 para ese mes).
 *
 * Returns: counts.refreshed = meses que sí tenían daily snapshots y
 * resultaron en UPSERT atómico. counts.skipped = meses sin snapshots daily.
 */
export const refreshMonthlyBatch = async (
  items: Array<{ accountId: string; year: number; month: number }>
): Promise<{ refreshed: number; skipped: number; errors: number }> => {
  if (items.length === 0) {
    return { refreshed: 0, skipped: 0, errors: 0 }
  }

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    let refreshed = 0
    let skipped = 0
    let errors = 0

    for (const item of items) {
      try {
        const result = await aggregateMonthlyFromDaily({ ...item, client })

        if (result) refreshed++
        else skipped++
      } catch {
        errors++
      }
    }

    return { refreshed, skipped, errors }
  })
}
