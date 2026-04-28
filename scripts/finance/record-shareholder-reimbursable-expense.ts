#!/usr/bin/env tsx
/**
 * TASK-714c — Record Shareholder Reimbursable Expense (manual canonical entry).
 *
 * USE CASE
 * ────────
 * Un accionista paga una factura/recibo de un proveedor (HubSpot, Deel, etc.)
 * desde su tarjeta personal. La empresa le reembolsa el monto via transferencia
 * bancaria. El reembolso queda visible en cartola Santander como
 * `Transf a <accionista>`.
 *
 * Para que el ledger refleje correctamente este flujo SIN duplicar cash:
 *
 *   1. El expense del proveedor queda con `payment_account_id=<CCA accionista>`
 *      → outflow del CCA AUMENTA closing (la empresa contrae deuda con el
 *      accionista por lo que él financió).
 *   2. La transferencia Santander → CCA ya viene como `internal_transfer`
 *      settlement_group (Santander outflow + CCA incoming) → reduce closing
 *      (la empresa devuelve la deuda).
 *   3. Saldo neto del CCA = aportes del accionista pendientes de reembolso.
 *
 * MODOS DE EJECUCIÓN
 * ──────────────────
 *
 * Modo A — link-existing: el expense ya existe en `expenses` (sync Nubox /
 *                          backfill). Solo crea el expense_payment cargado al
 *                          CCA, sin tocar el expense.
 *
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/record-shareholder-reimbursable-expense.ts \
 *     --link-existing-expense EXP-NB-22793816 \
 *     --shareholder-account sha-cca-julio-reyes-clp \
 *     --reimbursement-date 2025-09-01 \
 *     --reference "<fecha real de la transferencia>" \
 *     --apply
 *
 * Modo B — create-new: el expense NO existe en BD. Crea el expense + el
 *                       expense_payment atómicamente.
 *
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/record-shareholder-reimbursable-expense.ts \
 *     --supplier-id sup-2979848d-f5b6-439d-acb0-c33960f562a5 \
 *     --document-number 46679051 \
 *     --document-date 2026-04-25 \
 *     --currency USD \
 *     --amount-original 1215.00 \
 *     --amount-clp-paid 1106321 \
 *     --card-last-four 1879 \
 *     --shareholder-account sha-cca-julio-reyes-clp \
 *     --reimbursement-date 2026-04-27 \
 *     --description "HubSpot — Marketing Hub Starter..." \
 *     --period-year 2026 --period-month 4 \
 *     --recurrence quarterly \
 *     --apply
 *
 * IDEMPOTENCIA
 * ────────────
 * - create-new: si existe expense con (supplier_id, document_number), skip.
 * - link-existing: si ya hay expense_payment para ese expense_id con
 *                  (payment_account_id=CCA, payment_date=reimbursement-date), skip.
 * - Re-runs son seguros, devuelven `alreadyApplied=true`.
 *
 * VERIFICACIÓN POST-APPLY
 * ───────────────────────
 * - Re-rematerializa account_balances del CCA desde la fecha del reimbursement.
 * - Imprime closing_balance final.
 * - El operador verifica que el balance refleje su narrativa (e.g. "empresa
 *   debe a accionista $X" o "cuenta saldada").
 */

import { randomUUID } from 'node:crypto'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

import { rematerializeAccountBalancesFromDate } from '@/lib/finance/account-balances'
import {
  closeGreenhousePostgres,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

interface CliArgs {
  // Modo A
  linkExistingExpense: string | null

  // Modo B
  supplierId: string | null
  documentNumber: string | null
  documentDate: string | null
  currency: string | null
  amountOriginal: number | null
  amountClpPaid: number | null
  cardLastFour: string | null
  description: string | null
  periodYear: number | null
  periodMonth: number | null
  recurrence: string | null

  // Comunes
  shareholderAccount: string
  reimbursementDate: string
  reference: string | null
  apply: boolean
}

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2)

  const get = (flag: string): string | null => {
    const idx = argv.indexOf(flag)

    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : null
  }

  const args: CliArgs = {
    linkExistingExpense: get('--link-existing-expense'),
    supplierId: get('--supplier-id'),
    documentNumber: get('--document-number'),
    documentDate: get('--document-date'),
    currency: get('--currency'),
    amountOriginal: get('--amount-original') ? Number(get('--amount-original')) : null,
    amountClpPaid: get('--amount-clp-paid') ? Number(get('--amount-clp-paid')) : null,
    cardLastFour: get('--card-last-four'),
    description: get('--description'),
    periodYear: get('--period-year') ? Number(get('--period-year')) : null,
    periodMonth: get('--period-month') ? Number(get('--period-month')) : null,
    recurrence: get('--recurrence'),
    shareholderAccount: get('--shareholder-account') ?? '',
    reimbursementDate: get('--reimbursement-date') ?? '',
    reference: get('--reference'),
    apply: argv.includes('--apply')
  }

  if (!args.shareholderAccount) {
    throw new Error('--shareholder-account is required (e.g. sha-cca-julio-reyes-clp)')
  }

  if (!args.reimbursementDate) {
    throw new Error('--reimbursement-date is required (YYYY-MM-DD)')
  }

  if (args.linkExistingExpense) {
    // Modo A — todos los campos del expense vienen de la tabla.
    return args
  }

  // Modo B — los campos del expense son obligatorios.
  const required: Array<[keyof CliArgs, string]> = [
    ['supplierId', '--supplier-id'],
    ['documentNumber', '--document-number'],
    ['documentDate', '--document-date'],
    ['currency', '--currency'],
    ['amountClpPaid', '--amount-clp-paid'],
    ['shareholderAccount', '--shareholder-account']
  ]

  for (const [key, flag] of required) {
    if (!args[key]) throw new Error(`${flag} is required (mode B)`)
  }

  return args
}

interface ResolvedExpense {
  expenseId: string
  totalAmountClp: number
  supplierId: string
  supplierName: string | null
  description: string
  alreadyHadPaymentForReimbursement: boolean
}

const resolveOrCreateExpense = async (args: CliArgs, client: { query: typeof runGreenhousePostgresQuery }): Promise<ResolvedExpense> => {
  if (args.linkExistingExpense) {
    const rows = await client.query<{
      expense_id: string
      total_amount_clp: string
      supplier_id: string | null
      supplier_name: string | null
      description: string
      payment_status: string
    }>(
      `SELECT expense_id, total_amount_clp::text, supplier_id, supplier_name, description, payment_status
       FROM greenhouse_finance.expenses
       WHERE expense_id = $1`,
      [args.linkExistingExpense]
    )

    if (rows.length === 0) {
      throw new Error(`Expense ${args.linkExistingExpense} not found.`)
    }

    const row = rows[0]

    // Idempotency: ¿ya hay expense_payment de este expense en este CCA en esta fecha?
    const existingPayments = await client.query<{ payment_id: string }>(
      `SELECT payment_id FROM greenhouse_finance.expense_payments
       WHERE expense_id = $1
         AND payment_account_id = $2
         AND payment_date = $3::date
         AND superseded_at IS NULL
         AND superseded_by_payment_id IS NULL
         AND superseded_by_otb_id IS NULL`,
      [row.expense_id, args.shareholderAccount, args.reimbursementDate]
    )

    return {
      expenseId: row.expense_id,
      totalAmountClp: Number(row.total_amount_clp),
      supplierId: row.supplier_id ?? '',
      supplierName: row.supplier_name,
      description: row.description,
      alreadyHadPaymentForReimbursement: existingPayments.length > 0
    }
  }

  // Modo B — buscar idempotencia por (supplier_id, document_number)
  const existing = await client.query<{
    expense_id: string
    total_amount_clp: string
  }>(
    `SELECT expense_id, total_amount_clp::text FROM greenhouse_finance.expenses
     WHERE supplier_id = $1 AND document_number = $2 AND is_annulled = FALSE`,
    [args.supplierId, args.documentNumber]
  )

  if (existing.length > 0) {
    const existingPayments = await client.query<{ payment_id: string }>(
      `SELECT payment_id FROM greenhouse_finance.expense_payments
       WHERE expense_id = $1
         AND payment_account_id = $2
         AND payment_date = $3::date
         AND superseded_at IS NULL`,
      [existing[0].expense_id, args.shareholderAccount, args.reimbursementDate]
    )

    return {
      expenseId: existing[0].expense_id,
      totalAmountClp: Number(existing[0].total_amount_clp),
      supplierId: args.supplierId ?? '',
      supplierName: null,
      description: args.description ?? '',
      alreadyHadPaymentForReimbursement: existingPayments.length > 0
    }
  }

  // Crear el expense fresh
  const expenseId = `EXP-SHA-${args.documentNumber}`

  const exchangeRate = args.currency === 'CLP'
    ? 1.0
    : (args.amountClpPaid && args.amountOriginal
      ? args.amountClpPaid / args.amountOriginal
      : 1.0)

  // total_amount queda en moneda original; total_amount_clp en CLP (lo que se reembolsó)
  const totalAmountOriginal = args.amountOriginal ?? args.amountClpPaid ?? 0
  const totalAmountClp = args.amountClpPaid ?? 0

  const cardSuffix = args.cardLastFour ? `tarjeta personal ****${args.cardLastFour}` : 'tarjeta personal'

  const fullDescription = args.description
    ? `${args.description} (pagado por accionista con ${cardSuffix}, reembolsado vía CCA)`
    : `Aporte del accionista — ${cardSuffix}, reembolsado vía CCA`

  const notesValue = `TASK-714c — Aporte reembolsable del accionista. ` +
    `Pagado por accionista con ${cardSuffix} ` +
    `(${args.currency} ${totalAmountOriginal.toLocaleString('en-US', { minimumFractionDigits: 2 })}, ` +
    `rate efectivo ${exchangeRate.toFixed(4)} CLP/${args.currency}). ` +
    `Reembolsado vía CCA ${args.shareholderAccount} el ${args.reimbursementDate}. ` +
    `Documento N° ${args.documentNumber}.`

  await client.query(
    `INSERT INTO greenhouse_finance.expenses (
       expense_id, expense_type, description,
       currency, subtotal, tax_rate, tax_amount, total_amount,
       exchange_rate_to_clp, total_amount_clp,
       payment_date, payment_status, payment_method, payment_account_id,
       document_number, document_date,
       supplier_id, period_year, period_month,
       cost_category, cost_is_direct, direct_overhead_scope,
       direct_overhead_kind,
       is_recurring, recurrence_frequency, is_reconciled,
       notes, source_type, amount_paid,
       created_at, updated_at
     ) VALUES (
       $1, 'supplier', $2,
       $3, $4, 0, 0, $5,
       $6, $7,
       $8, 'paid', 'bank_transfer', $9,
       $10, $11::date,
       $12, $13, $14,
       'operational', FALSE, 'shared',
       NULL,
       $15, $16, FALSE,
       $17, 'manual_receipt', $7,
       NOW(), NOW()
     )`,
    [
      expenseId,
      fullDescription,
      args.currency,
      totalAmountOriginal,
      totalAmountOriginal,
      exchangeRate,
      totalAmountClp,
      args.reimbursementDate,
      args.shareholderAccount,
      args.documentNumber,
      args.documentDate,
      args.supplierId,
      args.periodYear,
      args.periodMonth,
      args.recurrence ? true : false,
      args.recurrence,
      notesValue
    ]
  )

  return {
    expenseId,
    totalAmountClp,
    supplierId: args.supplierId ?? '',
    supplierName: null,
    description: fullDescription,
    alreadyHadPaymentForReimbursement: false
  }
}

const createExpensePayment = async (
  expense: ResolvedExpense,
  args: CliArgs,
  client: { query: typeof runGreenhousePostgresQuery }
): Promise<string> => {
  const paymentId = `exp-pay-sha-${args.documentNumber ?? expense.expenseId}-${randomUUID().slice(0, 8)}`

  const reference = args.reference
    ?? `shareholder-reimbursement-${args.documentNumber ?? expense.expenseId}`

  const cardSuffix = args.cardLastFour ? `tarjeta personal ****${args.cardLastFour}` : 'tarjeta personal'

  const notes = `TASK-714c — Aporte del accionista financiado con ${cardSuffix}. ` +
    `Reembolsado por la empresa el ${args.reimbursementDate} (transferencia Santander → ${args.shareholderAccount}).`

  await client.query(
    `INSERT INTO greenhouse_finance.expense_payments (
       payment_id, expense_id, payment_date, amount, currency,
       exchange_rate_at_payment, amount_clp,
       payment_method, payment_account_id, payment_source,
       reference, notes,
       is_reconciled, recorded_at, created_at
     ) VALUES (
       $1, $2, $3::date, $4, 'CLP',
       1.0, $4,
       'bank_transfer', $5, 'manual',
       $6, $7,
       FALSE, NOW(), NOW()
     )`,
    [
      paymentId,
      expense.expenseId,
      args.reimbursementDate,
      expense.totalAmountClp,
      args.shareholderAccount,
      reference,
      notes
    ]
  )

  return paymentId
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()

  console.log('[task-714c] mode:', args.linkExistingExpense ? 'link-existing' : 'create-new')
  console.log('[task-714c] shareholderAccount:', args.shareholderAccount)
  console.log('[task-714c] reimbursementDate:', args.reimbursementDate)
  console.log('[task-714c] apply:', args.apply)

  // Pre-flight: validar que la cuenta CCA existe y es shareholder_account
  const accountRows = await runGreenhousePostgresQuery<{
    account_id: string
    instrument_category: string | null
    account_kind: string | null
    currency: string
  }>(
    `SELECT account_id, instrument_category, account_kind, currency
     FROM greenhouse_finance.accounts WHERE account_id = $1`,
    [args.shareholderAccount]
  )

  if (accountRows.length === 0) {
    throw new Error(`Shareholder account ${args.shareholderAccount} not found.`)
  }

  const account = accountRows[0]

  if (account.instrument_category !== 'shareholder_account') {
    throw new Error(
      `Account ${args.shareholderAccount} is not a shareholder_account ` +
        `(category=${account.instrument_category}). Refusing to record reimbursement.`
    )
  }

  if (!args.apply) {
    console.log('\n[dry-run] would resolve/create expense + create expense_payment + rematerialize CCA.')
    console.log('[dry-run] account verified:', JSON.stringify(account))
    console.log('[dry-run] re-run with --apply to execute.')

    return
  }

  const result = await withGreenhousePostgresTransaction(async client => {
    const expense = await resolveOrCreateExpense(args, client)

    if (expense.alreadyHadPaymentForReimbursement) {
      console.log('[task-714c] already applied (idempotent skip):', expense.expenseId)

      return { expenseId: expense.expenseId, paymentId: null, alreadyApplied: true, totalClp: expense.totalAmountClp }
    }

    const paymentId = await createExpensePayment(expense, args, client)

    await publishOutboxEvent(
      {
        aggregateType: 'finance.expense',
        aggregateId: expense.expenseId,
        eventType: 'finance.expense.shareholder_reimbursed',
        payload: {
          expenseId: expense.expenseId,
          paymentId,
          shareholderAccount: args.shareholderAccount,
          reimbursementDate: args.reimbursementDate,
          totalAmountClp: expense.totalAmountClp,
          supplierId: expense.supplierId,
          documentNumber: args.documentNumber,
          cardLastFour: args.cardLastFour,
          mode: args.linkExistingExpense ? 'link_existing' : 'create_new'
        }
      },
      client
    )

    console.log(`[task-714c] applied: expense=${expense.expenseId}, payment=${paymentId}, CLP=${expense.totalAmountClp}`)

    return { expenseId: expense.expenseId, paymentId, alreadyApplied: false, totalClp: expense.totalAmountClp }
  })

  if (!result.alreadyApplied) {
    console.log('[task-714c] rematerializing CCA from', args.reimbursementDate, '...')
    await rematerializeAccountBalancesFromDate({
      accountId: args.shareholderAccount,
      fromDate: args.reimbursementDate
    })
  }

  // Verificación final
  const balances = await runGreenhousePostgresQuery<{
    balance_date: string
    closing_balance: string
    period_inflows: string
    period_outflows: string
  }>(
    `SELECT balance_date::text, closing_balance::text, period_inflows::text, period_outflows::text
     FROM greenhouse_finance.account_balances
     WHERE account_id = $1
     ORDER BY balance_date DESC LIMIT 5`,
    [args.shareholderAccount]
  )

  console.log('\n[task-714c] CCA balance trend (last 5 days):')
  for (const row of balances) console.log(JSON.stringify(row))
}

main()
  .catch(err => {
    console.error('[task-714c] FAILED:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
