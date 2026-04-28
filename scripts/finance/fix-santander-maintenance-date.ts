#!/usr/bin/env tsx
/**
 * One-time guarded data fix for Santander CLP COM.MANTENCION PLAN.
 *
 * Context: the bank statement row is dated 2026-03-27, but the canonical
 * expense_payment was recorded on 2026-04-08. Moving only this exact payment
 * closes the residual -$19,495 without touching unrelated bank fees.
 *
 * Dry-run:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/fix-santander-maintenance-date.ts
 *
 * Apply:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/fix-santander-maintenance-date.ts --apply
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

import { refreshMonthlyBatch } from '@/lib/finance/account-balances-monthly'
import { getCurrentAccountBalances, rematerializeAccountBalanceRange } from '@/lib/finance/account-balances-rematerialize'
import {
  closeGreenhousePostgres,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'

const TARGET = {
  accountId: 'santander-clp',
  paymentId: 'exp-pay-c15f6f51-bfa2-4cdb-9c22-df3e656e1bf5',
  expectedCurrentDate: '2026-04-08',
  targetDate: '2026-03-27',
  amount: 19495,
  statementRowId: 'sclp-20260327-com-19495',
  statementManifestPath: 'scripts/finance/conciliate-march-april-2026.ts',
  statementDescription: 'COM.MANTENCION PLAN',
  rematerializeSeedDate: '2026-02-28',
  rematerializeOpeningBalance: 5703909,
  expectedBankClosing: 4172563
} as const

type PaymentRow = {
  payment_id: string
  expense_id: string
  payment_date: string
  amount: string
  currency: string
  reference: string | null
  payment_method: string | null
  payment_source: string
  payment_account_id: string | null
  superseded_at: string | null
  superseded_by_payment_id: string | null
  superseded_by_otb_id: string | null
}

type SettlementLegRow = {
  settlement_leg_id: string
  settlement_group_id: string
  linked_payment_id: string | null
  linked_payment_type: string | null
  transaction_date: string | null
  amount: string
  instrument_id: string | null
  leg_type: string
  superseded_at: string | null
}

type StatementRow = {
  row_id: string
  period_id: string
  transaction_date: string
  amount: string
  description: string
  matched_payment_id: string | null
  matched_settlement_leg_id: string | null
  match_status: string
}

type DuplicatePaymentRow = {
  payment_id: string
  expense_id: string
  payment_date: string
  amount: string
  reference: string | null
  payment_source: string
  payment_account_id: string | null
  description: string | null
}

const shouldApply = process.argv.includes('--apply')

const toNumber = (value: string | number | null | undefined) => {
  const n = Number(value)

  return Number.isFinite(n) ? n : 0
}

const readPayment = async () => {
  const rows = await runGreenhousePostgresQuery<PaymentRow>(
    `SELECT
       payment_id,
       expense_id,
       payment_date::date::text AS payment_date,
       amount::text,
       currency,
       reference,
       payment_method,
       payment_source,
       payment_account_id,
       superseded_at::text,
       superseded_by_payment_id,
       superseded_by_otb_id
     FROM greenhouse_finance.expense_payments
     WHERE payment_id = $1`,
    [TARGET.paymentId]
  )

  return rows[0] ?? null
}

const readSettlementLegs = async () => {
  return runGreenhousePostgresQuery<SettlementLegRow>(
    `SELECT
       settlement_leg_id,
       settlement_group_id,
       linked_payment_id,
       linked_payment_type,
       transaction_date::date::text AS transaction_date,
       amount::text,
       instrument_id,
       leg_type,
       superseded_at::text
     FROM greenhouse_finance.settlement_legs
     WHERE linked_payment_type = 'expense_payment'
       AND linked_payment_id = $1
     ORDER BY settlement_leg_id`,
    [TARGET.paymentId]
  )
}

const readStatementRow = async () => {
  const rows = await runGreenhousePostgresQuery<StatementRow>(
    `SELECT
       row_id,
       period_id,
       transaction_date::date::text AS transaction_date,
       amount::text,
       description,
       matched_payment_id,
       matched_settlement_leg_id,
       match_status
     FROM greenhouse_finance.bank_statement_rows
     WHERE row_id = $1`,
    [TARGET.statementRowId]
  )

  return rows[0] ?? null
}

const readCanonicalDuplicate = async () => {
  const rows = await runGreenhousePostgresQuery<DuplicatePaymentRow>(
    `SELECT
       ep.payment_id,
       ep.expense_id,
       ep.payment_date::date::text AS payment_date,
       ep.amount::text,
       ep.reference,
       ep.payment_source,
       ep.payment_account_id,
       e.description
     FROM greenhouse_finance.expense_payments ep
     LEFT JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
     WHERE ep.payment_id <> $1
       AND ep.payment_account_id = $2
       AND ep.payment_date = $3::date
       AND ep.amount = $4::numeric
       AND ep.payment_source = 'bank_statement'
       AND ep.reference = $5
       AND ep.superseded_at IS NULL
       AND ep.superseded_by_payment_id IS NULL
       AND ep.superseded_by_otb_id IS NULL
     ORDER BY ep.created_at ASC
     LIMIT 1`,
    [TARGET.paymentId, TARGET.accountId, TARGET.targetDate, TARGET.amount, TARGET.statementRowId]
  )

  return rows[0] ?? null
}

const buildSupersedeReason = (replacement: DuplicatePaymentRow) =>
  `TASK-708d follow-up: duplicate manual/Nubox cash payment. Cash is already represented by bank_statement payment ${replacement.payment_id} (${TARGET.statementRowId}); keeping this row audit-only.`

const assertTargetIsSafe = (payment: PaymentRow, statement: StatementRow | null) => {
  const actualAmount = toNumber(payment.amount)

  if (payment.payment_account_id !== TARGET.accountId) {
    throw new Error(`Expected payment_account_id=${TARGET.accountId}, got ${payment.payment_account_id ?? 'NULL'}`)
  }

  if (Math.abs(actualAmount - TARGET.amount) > 0.001) {
    throw new Error(`Expected amount=${TARGET.amount}, got ${payment.amount}`)
  }

  const allowedDates: readonly string[] = [TARGET.expectedCurrentDate, TARGET.targetDate]

  if (!allowedDates.includes(payment.payment_date)) {
    throw new Error(`Expected payment_date ${TARGET.expectedCurrentDate} or ${TARGET.targetDate}, got ${payment.payment_date}`)
  }

  if (statement) {
    if (statement.transaction_date !== TARGET.targetDate) {
      throw new Error(`Expected statement date ${TARGET.targetDate}, got ${statement.transaction_date}`)
    }

    if (Math.abs(toNumber(statement.amount) + TARGET.amount) > 0.001) {
      throw new Error(`Expected statement amount -${TARGET.amount}, got ${statement.amount}`)
    }
  }
}

const refreshSnapshots = async () => {
  const endDate = new Date().toISOString().slice(0, 10)

  const result = await rematerializeAccountBalanceRange({
    accountId: TARGET.accountId,
    seedDate: TARGET.rematerializeSeedDate,
    openingBalance: TARGET.rematerializeOpeningBalance,
    endDate
  })

  const months: Array<{ accountId: string; year: number; month: number }> = []
  const start = new Date(Date.UTC(2026, 2, 1))
  const end = new Date(`${endDate}T00:00:00.000Z`)

  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
    months.push({
      accountId: TARGET.accountId,
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1
    })
  }

  const monthly = await refreshMonthlyBatch(months)
  const [balance] = await getCurrentAccountBalances(endDate).then(rows => rows.filter(row => row.account_id === TARGET.accountId))

  return { result, monthly, balance }
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const [payment, statement, legs, duplicate] = await Promise.all([
    readPayment(),
    readStatementRow(),
    readSettlementLegs(),
    readCanonicalDuplicate()
  ])

  if (!payment) {
    throw new Error(`Target payment ${TARGET.paymentId} not found.`)
  }

  assertTargetIsSafe(payment, statement)

  console.log('[target payment]')
  console.table([payment])

  console.log('[bank statement evidence]')
  console.table(statement ? [statement] : [])

  if (!statement) {
    console.log(
      `[bank statement evidence] row_id=${TARGET.statementRowId} is not imported in Postgres; ` +
        `using the versioned statement manifest ${TARGET.statementManifestPath} ` +
        `(${TARGET.targetDate}, -${TARGET.amount}, "${TARGET.statementDescription}") as the operator evidence for this one-time fix.`
    )
  }

  console.log('[linked settlement legs]')
  console.table(legs)

  console.log('[canonical bank_statement duplicate]')
  console.table(duplicate ? [duplicate] : [])

  if (!shouldApply) {
    if (payment.payment_date === TARGET.targetDate) {
      console.log(`[dry-run] Payment is already dated ${TARGET.targetDate}.`)
    } else {
      console.log(`[dry-run] Would update expense_payments.payment_date ${TARGET.expectedCurrentDate} -> ${TARGET.targetDate}.`)
      console.log('[dry-run] Would update linked settlement_legs.transaction_date on non-superseded rows with the old date.')
    }

    if (duplicate && !payment.superseded_at) {
      console.log(`[dry-run] Would mark ${TARGET.paymentId} audit-only because ${duplicate.payment_id} already represents the same bank_statement cash.`)
      console.log('[dry-run] Would cascade superseded_at to linked settlement_legs.')
    }

    console.log('[dry-run] Would rematerialize santander-clp daily snapshots and monthly read model.')

    return
  } else {
    await withGreenhousePostgresTransaction(async client => {
      let paymentDateUpdates = 0
      let legDateUpdates = 0

      if (payment.payment_date !== TARGET.targetDate) {
        const paymentUpdate = await client.query<{ payment_id: string }>(
          `UPDATE greenhouse_finance.expense_payments
           SET payment_date = $2::date
           WHERE payment_id = $1
             AND payment_date = $3::date
             AND payment_account_id = $4
             AND amount = $5::numeric
             AND superseded_at IS NULL
             AND superseded_by_payment_id IS NULL
             AND superseded_by_otb_id IS NULL
           RETURNING payment_id`,
          [TARGET.paymentId, TARGET.targetDate, TARGET.expectedCurrentDate, TARGET.accountId, TARGET.amount]
        )

        if (paymentUpdate.rowCount !== 1) {
          throw new Error(`Expected to update exactly one expense_payment; updated ${paymentUpdate.rowCount}.`)
        }

        paymentDateUpdates = paymentUpdate.rowCount ?? 0

        const legUpdate = await client.query<{ settlement_leg_id: string }>(
          `UPDATE greenhouse_finance.settlement_legs
           SET transaction_date = $2::date,
               updated_at = NOW()
           WHERE linked_payment_type = 'expense_payment'
             AND linked_payment_id = $1
             AND transaction_date = $3::date
             AND superseded_at IS NULL
           RETURNING settlement_leg_id`,
          [TARGET.paymentId, TARGET.targetDate, TARGET.expectedCurrentDate]
        )

        legDateUpdates = legUpdate.rowCount ?? 0
      }

      let supersededPayments = 0
      let supersededLegs = 0

      if (duplicate && !payment.superseded_at) {
        const reason = buildSupersedeReason(duplicate)

        const paymentSupersede = await client.query<{ payment_id: string }>(
          `UPDATE greenhouse_finance.expense_payments
           SET superseded_at = NOW(),
               superseded_reason = $2
           WHERE payment_id = $1
             AND superseded_at IS NULL
           RETURNING payment_id`,
          [TARGET.paymentId, reason]
        )

        supersededPayments = paymentSupersede.rowCount ?? 0

        const legSupersede = await client.query<{ settlement_leg_id: string }>(
          `UPDATE greenhouse_finance.settlement_legs
           SET superseded_at = NOW(),
               superseded_reason = $2,
               updated_at = NOW()
           WHERE linked_payment_type = 'expense_payment'
             AND linked_payment_id = $1
             AND superseded_at IS NULL
           RETURNING settlement_leg_id`,
          [TARGET.paymentId, reason]
        )

        supersededLegs = legSupersede.rowCount ?? 0
      }

      console.log(
        `[apply] Date updates: ${paymentDateUpdates} expense_payment, ${legDateUpdates} settlement_leg(s). ` +
          `Audit-only duplicate cleanup: ${supersededPayments} payment, ${supersededLegs} settlement_leg(s).`
      )
    })

    console.log('[apply] Rematerializing santander-clp snapshots...')
    const snapshots = await refreshSnapshots()

    console.log('[apply] Daily rematerialization')
    console.table([snapshots.result])

    console.log('[apply] Monthly refresh')
    console.table([snapshots.monthly])

    if (snapshots.balance) {
      const closing = toNumber(snapshots.balance.closing_balance)
      const drift = closing - TARGET.expectedBankClosing

      console.log('[apply] Final balance vs bank target')
      console.table([{
        account: snapshots.balance.account_id,
        balance_date: snapshots.balance.balance_date,
        greenhouse_closing: closing.toFixed(2),
        expected_bank_closing: TARGET.expectedBankClosing.toFixed(2),
        drift: drift.toFixed(2),
        status: Math.abs(drift) < 1 ? 'OK' : 'DRIFT'
      }])
    }
  }

  const [updatedPayment, updatedStatement, updatedLegs] = await Promise.all([
    readPayment(),
    readStatementRow(),
    readSettlementLegs()
  ])

  console.log('[post-check payment]')
  console.table(updatedPayment ? [updatedPayment] : [])

  console.log('[post-check bank statement evidence]')
  console.table(updatedStatement ? [updatedStatement] : [])

  console.log('[post-check linked settlement legs]')
  console.table(updatedLegs)
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
