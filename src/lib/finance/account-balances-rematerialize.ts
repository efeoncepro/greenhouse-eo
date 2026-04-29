import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { materializeAccountBalance } from './account-balances'
import { getActiveOpeningTrialBalance } from './account-opening-trial-balance'

/**
 * Account Balances Rematerialization (TASK-702).
 * ===============================================
 *
 * Idempotente. NO toca income_payments / expense_payments (la ground truth
 * real). Reseta solo los snapshots diarios cuando vienen de un estado stale
 * (ej. transaction_count=0 frozen) y los recompone desde la realidad
 * canónica del ledger.
 *
 * Entradas:
 *   - openings: por cuenta, el saldo "verdad" al `seedDate`. Derivado de
 *     cartola bancaria al cierre del día anterior.
 *   - seedDate: la fecha "T-1" (típicamente último día del mes anterior al
 *     período que se va a re-materializar). El script inserta una fila
 *     account_balances para esta fecha con opening=closing=openingValue,
 *     y luego loopea día por día desde seedDate+1 hasta endDate llamando
 *     materializeAccountBalance, que toma como opening el closing del día
 *     anterior y suma/resta los payments del día.
 *
 * Reglas:
 *   - Períodos cerrados (`is_period_closed=true`) NO se sobreescriben. Si
 *     algún día en el rango está cerrado, el script aborta con error
 *     listando esos días — el operador debe re-abrir manualmente o
 *     ajustar el rango.
 *   - El delete antes del seed solo afecta filas con
 *     `is_period_closed=false`, garantizando que audit cerrados no se
 *     pisen accidentalmente.
 *   - Idempotente: re-correr produce los mismos snapshots dado el mismo
 *     ledger.
 */

export interface RematerializeAccountInput {
  accountId: string
  seedDate: string  // YYYY-MM-DD
  openingBalance: number
  endDate?: string  // YYYY-MM-DD; default today
  /**
   * `active_otb` rebuilds from the current opening trial balance when present.
   * Use it for full account replays and audited re-anchors.
   *
   * `explicit` respects the caller-provided seed exactly. Use it for rolling
   * jobs that seed from an already-materialized closing row; otherwise a daily
   * cron can accidentally widen a 7-day refresh into a full OTB replay.
   */
  seedMode?: 'active_otb' | 'explicit'
}

export interface RematerializeAccountResult {
  accountId: string
  seedDate: string
  endDate: string
  openingBalance: number
  finalClosingBalance: number
  daysMaterialized: number
  closedDaysSkipped: number
}

const ymd = (d: Date): string => {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')

  return `${y}-${m}-${day}`
}

const toUtcDate = (yyyyMmDd: string): Date => {
  const [y, m, d] = yyyyMmDd.split('-').map(s => parseInt(s, 10))

  return new Date(Date.UTC(y, m - 1, d))
}

const addDays = (d: Date, n: number): Date => {
  const out = new Date(d)

  out.setUTCDate(out.getUTCDate() + n)

  return out
}

const checkClosedDaysInRange = async (
  client: PoolClient,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<string[]> => {
  const result = await client.query<{ balance_date: Date }>(
    `SELECT balance_date::date AS balance_date
     FROM greenhouse_finance.account_balances
     WHERE account_id = $1
       AND balance_date >= $2::date
       AND balance_date <= $3::date
       AND is_period_closed = TRUE
     ORDER BY balance_date`,
    [accountId, startDate, endDate]
  )

  return result.rows.map(r => ymd(new Date(r.balance_date)))
}

const insertSeedRow = async (
  client: PoolClient,
  accountId: string,
  seedDate: string,
  openingBalance: number
): Promise<void> => {
  const balanceId = `acctbal-${accountId}-${seedDate}`

  // Get currency from accounts to populate snapshot row correctly
  const accountRow = await client.query<{ currency: string }>(
    `SELECT currency FROM greenhouse_finance.accounts WHERE account_id = $1`,
    [accountId]
  )

  if (accountRow.rows.length === 0) {
    throw new Error(`Account ${accountId} not found`)
  }

  const currency = accountRow.rows[0].currency

  await client.query(
    `INSERT INTO greenhouse_finance.account_balances (
       balance_id, account_id, balance_date, currency,
       opening_balance, period_inflows, period_outflows, closing_balance,
       closing_balance_clp, fx_rate_used, fx_gain_loss_clp,
       transaction_count, is_period_closed, computed_at, created_at, updated_at
     ) VALUES (
       $1, $2, $3::date, $4,
       $5::numeric, 0, 0, $5::numeric,
       CASE WHEN $4 = 'CLP' THEN $5::numeric ELSE NULL::numeric END,
       CASE WHEN $4 = 'CLP' THEN 1::numeric ELSE NULL::numeric END,
       0,
       0, FALSE, NOW(), NOW(), NOW()
     )
     ON CONFLICT (account_id, balance_date) DO UPDATE SET
       opening_balance = EXCLUDED.opening_balance,
       closing_balance = EXCLUDED.closing_balance,
       closing_balance_clp = EXCLUDED.closing_balance_clp,
       fx_rate_used = EXCLUDED.fx_rate_used,
       updated_at = NOW()
     WHERE greenhouse_finance.account_balances.is_period_closed = FALSE`,
    [balanceId, accountId, seedDate, currency, openingBalance]
  )
}

export const rematerializeAccountBalanceRange = async (
  input: RematerializeAccountInput
): Promise<RematerializeAccountResult> => {
  const seedMode = input.seedMode ?? 'active_otb'

  // Full replays prefer OTB declaration over the input seed — OTB is the
  // canonical opening source per TASK-703. Rolling/incremental jobs must
  // preserve their explicit seed so they do not rewrite historical periods.
  const otb = seedMode === 'active_otb'
    ? await getActiveOpeningTrialBalance(input.accountId)
    : null

  const seedDate = otb?.genesisDate ?? input.seedDate
  const openingBalance = otb?.openingBalance ?? input.openingBalance
  const endDate = input.endDate ?? ymd(new Date())

  if (seedDate > endDate) {
    throw new Error(`seedDate ${seedDate} must be <= endDate ${endDate}`)
  }

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    const closedDays = await checkClosedDaysInRange(client, input.accountId, seedDate, endDate)

    if (closedDays.length > 0) {
      throw new Error(
        `Account ${input.accountId} has closed period days in range [${seedDate}, ${endDate}]: ${closedDays.join(', ')}. ` +
          'Re-open them or shrink the range before rematerialize.'
      )
    }

    // Delete only non-closed snapshots in the range; insert seed
    await client.query(
      `DELETE FROM greenhouse_finance.account_balances
       WHERE account_id = $1
         AND balance_date >= $2::date
         AND balance_date <= $3::date
         AND is_period_closed = FALSE`,
      [input.accountId, seedDate, endDate]
    )

    await insertSeedRow(client, input.accountId, seedDate, openingBalance)

    if (seedMode === 'active_otb') {
      // Update accounts.opening_balance + opening_balance_date as a cache so
      // future snapshots have an anchor when no previous snapshot exists. The
      // OTB remains the source of truth (TASK-703). Rolling jobs intentionally
      // do not mutate this cache.
      await client.query(
        `UPDATE greenhouse_finance.accounts SET
           opening_balance = $1,
           opening_balance_date = $2::date,
           updated_at = NOW()
         WHERE account_id = $3`,
        [openingBalance, seedDate, input.accountId]
      )
    }

    let daysMaterialized = 0
    let cursor = addDays(toUtcDate(seedDate), 1)
    const stop = toUtcDate(endDate)
    let lastResult = null

    while (cursor.getTime() <= stop.getTime()) {
      lastResult = await materializeAccountBalance({
        accountId: input.accountId,
        balanceDate: ymd(cursor),
        client
      })
      daysMaterialized++
      cursor = addDays(cursor, 1)
    }

    const finalClosingBalance = lastResult ? Number(lastResult.closingBalance) : openingBalance

    return {
      accountId: input.accountId,
      seedDate,
      endDate,
      openingBalance,
      finalClosingBalance,
      daysMaterialized,
      closedDaysSkipped: closedDays.length
    }
  })
}

/**
 * Convenience: report current closing balance per account for a given date.
 * Read-only; safe to call from health endpoints.
 */
export const getCurrentAccountBalances = async (asOfDate?: string) => {
  const targetDate = asOfDate ?? ymd(new Date())

  return runGreenhousePostgresQuery<{
    account_id: string
    bank_name: string
    currency: string
    balance_date: string
    closing_balance: string
    closing_balance_clp: string | null
    is_period_closed: boolean
  }>(
    `SELECT DISTINCT ON (a.account_id)
       a.account_id, a.bank_name, a.currency,
       ab.balance_date::text, ab.closing_balance::text,
       ab.closing_balance_clp::text, ab.is_period_closed
     FROM greenhouse_finance.accounts a
     LEFT JOIN greenhouse_finance.account_balances ab
       ON ab.account_id = a.account_id AND ab.balance_date <= $1::date
     WHERE a.is_active = TRUE
     ORDER BY a.account_id, ab.balance_date DESC NULLS LAST`,
    [targetDate]
  )
}
