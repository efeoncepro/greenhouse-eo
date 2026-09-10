#!/usr/bin/env tsx
/**
 * CLI — Conciliar filas de cartola sin calce creando los artefactos
 * canónicos que faltan (transferencias internas, pagos anclados, cuotas de
 * crédito, impuestos, tarjeta, factoring, nómina internacional, desembolsos)
 * y vinculándolos a la fila (`manual_matched`, confianza 1.0).
 *
 * Es data-driven: un plan JSON declara, fila por fila, la acción a aplicar.
 * Los commands son los mismos que usan las rutas API (Full API Parity); el
 * plan es el juicio humano registrado (qué es cada movimiento).
 *
 *   pnpm finance:reconcile-rows --plan scripts/finance/reconciliation-plans/2026-08-09.json [--apply] [--only <periodId>]
 *
 * Sin `--apply` imprime el reporte de clasificación y no escribe.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'
import { recordFactoringOperation } from '@/lib/finance/factoring'
import { createLoanAccount, recordLoanDisbursementSettlement, type CreateLoanAccountInput } from '@/lib/finance/loans'
import {
  createBankFeeExpensePayment,
  createCompanyCardExpense,
  createFxConversionSettlement,
  createInternalTransferSettlement,
  createInternationalPayrollSettlement,
  createLoanCuotaExpensePayment,
  createTaxExpensePayment
} from '@/lib/finance/payment-instruments/anchored-payments'
import {
  listUnmatchedStatementRowsFromPostgres,
  setReconciliationLinkInPostgres,
  updateStatementRowMatchInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ─── Plan contract ──────────────────────────────────────────────────────────

interface RowSelector {
  periodId: string
  date: string
  amount: number
  /** regex (case-insensitive) sobre la descripción; obligatorio cuando hay ambigüedad */
  description?: string
  /** 1-based, para filas idénticas el mismo día */
  ordinal?: number
}

type PlanAction =
  | { type: 'internal_transfer'; sourceAccountId: string; destinationAccountId: string; paymentDate?: string; destinationDate?: string; counterpart?: RowSelector; notes?: string }
  | { type: 'pay_expense'; expenseId: string; notes?: string }
  | { type: 'loan_installment'; loanAccountId: string; installmentLabel?: string }
  | { type: 'tax'; taxType: string; taxPeriod: string; taxFormNumber?: string; description?: string }
  | { type: 'bank_fee'; description: string; miscellaneousCategory?: string }
  | { type: 'card_expense'; supplierName: string; description?: string; toolCatalogId?: string | null; cardLastFour?: string }
  | { type: 'factoring_inflow'; incomeId: string; factoringProviderId: string; nominalAmount: number; externalReference?: string }
  | {
      type: 'international_payroll'
      payrollEntryId: string
      beneficiaryName: string
      beneficiaryCountry: string
      beneficiaryAccount?: string
      receivedRow: RowSelector
      feeRow?: RowSelector
      sourceRow?: RowSelector
    }
  | { type: 'fx_conversion'; sourceRow: RowSelector; sourceAccountId: string; sourceCurrency: 'USD' | 'CLP' | 'MXN'; destinationAccountId: string; destinationCurrency: 'USD' | 'CLP' | 'MXN'; notes?: string }
  | { type: 'loan_disbursement'; loan: CreateLoanAccountInput; notes?: string }
  | { type: 'skip'; reason: string }

interface PlanEntry {
  row: RowSelector
  action: PlanAction
}

interface ReconciliationPlan {
  actor: string
  entries: PlanEntry[]
}

interface UnmatchedRow {
  row_id: string
  period_id: string
  transaction_date: string | Date
  description: string
  reference: string | null
  amount: unknown
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const ymd = (value: string | Date): string => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10))
const fmt = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 2 })
const abs = (n: number) => Math.abs(n)

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const args: Record<string, string | boolean> = {}

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (!token.startsWith('--')) continue

    const next = argv[i + 1]

    if (next === undefined || next.startsWith('--')) args[token.slice(2)] = true
    else {
      args[token.slice(2)] = next
      i++
    }
  }

  return args
}

class RowIndex {
  private readonly byPeriod = new Map<string, UnmatchedRow[]>()
  private readonly consumed = new Set<string>()

  async load(periodIds: string[]) {
    for (const periodId of periodIds) {
      const rows = (await listUnmatchedStatementRowsFromPostgres(periodId)) as unknown as UnmatchedRow[]

      this.byPeriod.set(periodId, rows)
    }
  }

  find(selector: RowSelector): UnmatchedRow | null {
    const rows = this.byPeriod.get(selector.periodId) ?? []
    const pattern = selector.description ? new RegExp(selector.description, 'i') : null

    // El ordinal se resuelve sobre TODAS las filas idénticas (consumidas o no):
    // así `ordinal: 2` sigue apuntando a la segunda aunque la primera ya se
    // haya tomado en una entrada anterior del plan.
    const candidates = rows
      .filter(row => ymd(row.transaction_date) === selector.date)
      .filter(row => Math.abs(Number(row.amount) - selector.amount) < 0.005)
      .filter(row => (pattern ? pattern.test(row.description) : true))
      .sort((left, right) => left.row_id.localeCompare(right.row_id))

    const pick = candidates[(selector.ordinal ?? 1) - 1] ?? null

    if (!pick || this.consumed.has(pick.row_id)) return null

    this.consumed.add(pick.row_id)

    return pick
  }

  periods() {
    return [...this.byPeriod.keys()]
  }

  remaining(periodId: string) {
    return (this.byPeriod.get(periodId) ?? []).filter(row => !this.consumed.has(row.row_id))
  }
}

const accountOfPeriod = (periodId: string) => periodId.replace(/_\d{4}_\d{2}$/, '')

const accountCurrencyCache = new Map<string, string>()

const accountCurrency = async (accountId: string) => {
  if (!accountCurrencyCache.has(accountId)) {
    const rows = await runGreenhousePostgresQuery<{ currency: string }>(
      `SELECT currency FROM greenhouse_finance.accounts WHERE account_id = $1`,
      [accountId]
    )

    accountCurrencyCache.set(accountId, rows[0]?.currency ?? 'CLP')
  }

  return accountCurrencyCache.get(accountId) as string
}

const paymentIdForExpense = async (expenseId: string, reference?: string | null): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ payment_id: string }>(
    `SELECT payment_id FROM greenhouse_finance.expense_payments
     WHERE expense_id = $1 AND superseded_at IS NULL AND superseded_by_payment_id IS NULL
       AND ($2::text IS NULL OR reference = $2)
     ORDER BY created_at DESC LIMIT 1`,
    [expenseId, reference ?? null]
  )

  return rows[0]?.payment_id ?? null
}

type Link =
  | { kind: 'expense'; expenseId: string; paymentId: string | null }
  | { kind: 'income'; incomeId: string; paymentId: string }
  | { kind: 'settlement'; settlementLegId: string; settlementGroupId: string }

const linkRow = async (row: UnmatchedRow, link: Link, actor: string) => {
  const matchedType = link.kind === 'settlement' ? 'settlement' : link.kind
  const matchedId = link.kind === 'expense' ? link.expenseId : link.kind === 'income' ? link.incomeId : link.settlementGroupId
  const matchedPaymentId = link.kind === 'settlement' ? null : link.paymentId
  const matchedSettlementLegId = link.kind === 'settlement' ? link.settlementLegId : null

  await updateStatementRowMatchInPostgres(row.row_id, row.period_id, {
    matchStatus: 'manual_matched',
    matchedType,
    matchedId,
    matchedPaymentId,
    matchedSettlementLegId,
    matchConfidence: 1,
    matchedByUserId: actor
  })

  if (link.kind !== 'settlement' && matchedPaymentId) {
    await setReconciliationLinkInPostgres({
      matchedType: link.kind,
      matchedId,
      matchedPaymentId,
      matchedSettlementLegId: null,
      rowId: row.row_id,
      matchedBy: actor
    })
  }

  if (link.kind === 'settlement') {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.settlement_legs
       SET is_reconciled = TRUE, reconciliation_row_id = $2, reconciled_at = NOW(), updated_at = NOW()
       WHERE settlement_leg_id = $1`,
      [link.settlementLegId, row.row_id]
    )
  }
}

// ─── Actions ────────────────────────────────────────────────────────────────

interface Ctx {
  actor: string
  apply: boolean
  index: RowIndex
  log: (line: string) => void
}

const ref = (row: UnmatchedRow) => `recon:${row.row_id}`

const applyEntry = async (entry: PlanEntry, ctx: Ctx): Promise<void> => {
  const row = ctx.index.find(entry.row)
  const label = `${entry.row.periodId} ${entry.row.date} ${fmt(entry.row.amount)}`

  if (!row) {
    ctx.log(`  ? no encontrada (o ya conciliada): ${label} ${entry.row.description ?? ''}`)

    return
  }

  const amount = Number(row.amount)
  const date = ymd(row.transaction_date)
  const account = accountOfPeriod(row.period_id)
  const a = entry.action

  ctx.log(`  · ${label}  ${row.description}  →  ${a.type}${'expenseId' in a ? ` ${a.expenseId}` : ''}${'payrollEntryId' in a ? ` ${a.payrollEntryId}` : ''}`)

  if (!ctx.apply) {
    if (a.type === 'internal_transfer' && a.counterpart) ctx.index.find(a.counterpart)

    if (a.type === 'international_payroll') {
      ctx.index.find(a.receivedRow)
      if (a.feeRow) ctx.index.find(a.feeRow)
      if (a.sourceRow) ctx.index.find(a.sourceRow)
    }

    if (a.type === 'fx_conversion') ctx.index.find(a.sourceRow)

    return
  }

  switch (a.type) {
    case 'skip':
      ctx.log(`    ↷ omitida: ${a.reason}`)

      return

    case 'internal_transfer': {
      const isSource = amount < 0
      const counterpart = a.counterpart ? ctx.index.find(a.counterpart) : null
      const sourceRow = isSource ? row : counterpart
      const destinationRow = isSource ? counterpart : row
      const paymentDate = a.paymentDate ?? (sourceRow ? ymd(sourceRow.transaction_date) : date)
      const destinationDate = a.destinationDate ?? (destinationRow ? ymd(destinationRow.transaction_date) : null)

      const r = await createInternalTransferSettlement({
        paymentDate,
        destinationDate,
        amount: abs(amount),
        sourceAccountId: a.sourceAccountId,
        destinationAccountId: a.destinationAccountId,
        reference: ref(sourceRow ?? row),
        notes: a.notes ?? `Traspaso ${a.sourceAccountId} → ${a.destinationAccountId} (cartola ${date})`,
        actorUserId: ctx.actor,
        sourceReconciliationRowId: sourceRow?.row_id ?? null,
        destinationReconciliationRowId: destinationRow?.row_id ?? null
      })

      if (sourceRow) await linkRow(sourceRow, { kind: 'settlement', settlementLegId: r.outgoingLegId, settlementGroupId: r.settlementGroupId }, ctx.actor)
      if (destinationRow) await linkRow(destinationRow, { kind: 'settlement', settlementLegId: r.incomingLegId, settlementGroupId: r.settlementGroupId }, ctx.actor)

      ctx.log(`    ✓ ${r.settlementGroupId}${counterpart ? ' (+ contraparte)' : ''}`)

      return
    }

    case 'pay_expense': {
      const r = await recordExpensePayment({
        expenseId: a.expenseId,
        paymentDate: date,
        amount: abs(amount),
        currency: await accountCurrency(account),
        reference: ref(row),
        paymentMethod: 'bank_transfer',
        paymentAccountId: account,
        paymentSource: 'bank_statement',
        notes: a.notes ?? `Conciliado desde cartola: ${row.description}`,
        actorUserId: ctx.actor
      })

      await linkRow(row, { kind: 'expense', expenseId: a.expenseId, paymentId: r.payment.paymentId }, ctx.actor)
      ctx.log(`    ✓ pago ${r.payment.paymentId} sobre ${a.expenseId} (${r.paymentStatus})`)

      return
    }

    case 'loan_installment': {
      const r = await createLoanCuotaExpensePayment({
        loanAccountId: a.loanAccountId,
        paymentDate: date,
        amount: abs(amount),
        paymentAccountId: account,
        reference: ref(row),
        installmentLabel: a.installmentLabel ?? row.description,
        actorUserId: ctx.actor,
        reconciliationRowId: row.row_id
      })

      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_finance.loan_accounts SET installments_paid = installments_paid + 1, updated_at = NOW() WHERE loan_id = $1`,
        [a.loanAccountId]
      )
      await linkRow(row, { kind: 'expense', expenseId: r.expenseId, paymentId: r.paymentId || null }, ctx.actor)
      ctx.log(`    ✓ cuota ${r.expenseId}`)

      return
    }

    case 'tax': {
      const r = await createTaxExpensePayment({
        taxType: a.taxType,
        taxPeriod: a.taxPeriod,
        taxFormNumber: a.taxFormNumber ?? null,
        description: a.description ?? `${row.description} — ${a.taxType} ${a.taxPeriod}`,
        paymentDate: date,
        amount: abs(amount),
        paymentAccountId: account,
        reference: ref(row),
        actorUserId: ctx.actor,
        reconciliationRowId: row.row_id
      })

      await linkRow(row, { kind: 'expense', expenseId: r.expenseId, paymentId: r.paymentId || null }, ctx.actor)
      ctx.log(`    ✓ impuesto ${r.expenseId}`)

      return
    }

    case 'bank_fee': {
      const r = await createBankFeeExpensePayment({
        description: a.description,
        miscellaneousCategory: a.miscellaneousCategory ?? 'bank_fee',
        paymentDate: date,
        amount: abs(amount),
        paymentAccountId: account,
        reference: ref(row),
        actorUserId: ctx.actor,
        reconciliationRowId: row.row_id
      })

      await linkRow(row, { kind: 'expense', expenseId: r.expenseId, paymentId: r.paymentId || null }, ctx.actor)
      ctx.log(`    ✓ comisión ${r.expenseId}`)

      return
    }

    case 'card_expense': {
      const r = await createCompanyCardExpense({
        description: a.description ?? `${a.supplierName} — cargo TC ${date}`,
        supplierName: a.supplierName,
        toolCatalogId: a.toolCatalogId ?? null,
        cardLastFour: a.cardLastFour ?? '2505',
        currency: 'CLP',
        paymentDate: date,
        amount: abs(amount),
        paymentAccountId: account,
        reference: ref(row),
        actorUserId: ctx.actor,
        reconciliationRowId: row.row_id
      })

      await linkRow(row, { kind: 'expense', expenseId: r.expenseId, paymentId: r.paymentId || null }, ctx.actor)
      ctx.log(`    ✓ cargo TC ${r.expenseId}`)

      return
    }

    case 'factoring_inflow': {
      const advance = abs(amount)
      const interest = Math.max(0, a.nominalAmount - advance)

      const r = await recordFactoringOperation({
        incomeId: a.incomeId,
        factoringProviderId: a.factoringProviderId,
        nominalAmount: a.nominalAmount,
        advanceAmount: advance,
        interestAmount: interest,
        advisoryFeeAmount: 0,
        feeRate: a.nominalAmount > 0 ? Math.round((interest / a.nominalAmount) * 10000) / 10000 : 0,
        operationDate: date,
        settlementDate: date,
        externalReference: a.externalReference ?? row.description,
        paymentAccountId: account,
        actorUserId: ctx.actor
      })

      await linkRow(row, { kind: 'income', incomeId: a.incomeId, paymentId: r.paymentId }, ctx.actor)
      ctx.log(`    ✓ factoring ${r.operationId} (anticipo ${fmt(advance)}, costo ${fmt(interest)})`)

      return
    }

    case 'international_payroll': {
      const received = ctx.index.find(a.receivedRow)
      const fee = a.feeRow ? ctx.index.find(a.feeRow) : null
      const source = a.sourceRow ? ctx.index.find(a.sourceRow) : null

      if (!received) throw new Error(`international_payroll ${a.payrollEntryId}: no se encontró la fila de recepción en tránsito`)

      const sourceAmount = Number(received.amount)
      const fxFeeAmount = fee ? abs(Number(fee.amount)) : 0

      if (Math.abs(sourceAmount - (abs(amount) + fxFeeAmount)) > 1) {
        throw new Error(`international_payroll ${a.payrollEntryId}: recibido ${fmt(sourceAmount)} ≠ envío ${fmt(abs(amount))} + fee ${fmt(fxFeeAmount)}`)
      }

      const r = await createInternationalPayrollSettlement({
        payrollEntryId: a.payrollEntryId,
        paymentDate: ymd(received.transaction_date),
        sourceDate: source ? ymd(source.transaction_date) : null,
        sourceAccountId: source ? accountOfPeriod(source.period_id) : 'santander-clp',
        transitAccountId: account,
        beneficiaryName: a.beneficiaryName,
        beneficiaryAccount: a.beneficiaryAccount ?? null,
        beneficiaryCountry: a.beneficiaryCountry,
        sourceAmount,
        fxFeeAmount,
        notes: `Cartola: ${row.description}`,
        actorUserId: ctx.actor,
        sourceReconciliationRowId: source?.row_id ?? null,
        transitReconciliationRowId: received.row_id
      })

      const payrollPaymentId = await paymentIdForExpense(r.payrollExpenseId)
      const feePaymentId = r.feeExpenseId ? await paymentIdForExpense(r.feeExpenseId) : null

      await linkRow(row, { kind: 'expense', expenseId: r.payrollExpenseId, paymentId: payrollPaymentId }, ctx.actor)
      await linkRow(received, { kind: 'settlement', settlementLegId: `stlleg-${r.settlementGroupId}-transit-in`, settlementGroupId: r.settlementGroupId }, ctx.actor)
      if (source) await linkRow(source, { kind: 'settlement', settlementLegId: `stlleg-${r.settlementGroupId}-source-out`, settlementGroupId: r.settlementGroupId }, ctx.actor)
      if (fee && r.feeExpenseId) await linkRow(fee, { kind: 'expense', expenseId: r.feeExpenseId, paymentId: feePaymentId }, ctx.actor)

      ctx.log(`    ✓ nómina internacional ${r.settlementGroupId} → ${r.payrollExpenseId}${r.feeExpenseId ? ` + fee ${r.feeExpenseId}` : ''}`)

      return
    }

    case 'fx_conversion': {
      const sourceRow = ctx.index.find(a.sourceRow)

      if (!sourceRow) throw new Error('fx_conversion: no se encontró la fila origen')

      const sourceAmount = abs(Number(sourceRow.amount))
      const destinationAmount = abs(amount)

      const r = await createFxConversionSettlement({
        paymentDate: date,
        sourceAccountId: a.sourceAccountId,
        destinationAccountId: a.destinationAccountId,
        sourceAmount,
        sourceCurrency: a.sourceCurrency,
        destinationAmount,
        destinationCurrency: a.destinationCurrency,
        fxRate: Math.round((destinationAmount / sourceAmount) * 1e6) / 1e6,
        reference: ref(row),
        notes: a.notes ?? `Conversión ${a.sourceCurrency}→${a.destinationCurrency} Global66 (${date})`,
        actorUserId: ctx.actor,
        sourceReconciliationRowId: sourceRow.row_id,
        destinationReconciliationRowId: row.row_id
      })

      await linkRow(sourceRow, { kind: 'settlement', settlementLegId: `stlleg-${r.settlementGroupId}-out`, settlementGroupId: r.settlementGroupId }, ctx.actor)
      await linkRow(row, { kind: 'settlement', settlementLegId: `stlleg-${r.settlementGroupId}-in`, settlementGroupId: r.settlementGroupId }, ctx.actor)
      ctx.log(`    ✓ conversión ${r.settlementGroupId}`)

      return
    }

    case 'loan_disbursement': {
      const loan = await createLoanAccount(a.loan)

      const r = await recordLoanDisbursementSettlement({
        loanId: loan.loanId,
        paymentDate: date,
        amount: abs(amount),
        reference: ref(row),
        notes: a.notes ?? `Desembolso ${a.loan.lenderName} ${a.loan.externalReference}: ${row.description}`,
        actorUserId: ctx.actor,
        reconciliationRowId: row.row_id
      })

      await linkRow(row, { kind: 'settlement', settlementLegId: r.settlementLegId, settlementGroupId: r.settlementGroupId }, ctx.actor)
      ctx.log(`    ✓ crédito ${loan.loanId}${loan.created ? ' (creado)' : ''} · desembolso ${r.settlementGroupId}`)

      return
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()
  const planPath = typeof args.plan === 'string' ? path.resolve(args.plan) : null

  if (!planPath) throw new Error('--plan <ruta.json> es obligatorio')

  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as ReconciliationPlan
  const apply = args.apply === true
  const only = typeof args.only === 'string' ? args.only : null

  const periodIds = [...new Set(plan.entries.flatMap(e => {
    const ids = [e.row.periodId]

    if (e.action.type === 'internal_transfer' && e.action.counterpart) ids.push(e.action.counterpart.periodId)
    if (e.action.type === 'international_payroll') ids.push(e.action.receivedRow.periodId, e.action.feeRow?.periodId ?? '', e.action.sourceRow?.periodId ?? '')
    if (e.action.type === 'fx_conversion') ids.push(e.action.sourceRow.periodId)

    return ids.filter(Boolean)
  }))]

  const index = new RowIndex()

  await index.load(periodIds)

  const ctx: Ctx = { actor: plan.actor, apply, index, log: line => console.log(line) }

  console.log(`[reconcile] plan ${path.basename(planPath)} · ${plan.entries.length} entradas · ${apply ? 'APPLY' : 'dry-run'}`)

  let failures = 0

  for (const entry of plan.entries) {
    if (only && entry.row.periodId !== only) continue

    try {
      await applyEntry(entry, ctx)
    } catch (err) {
      failures++
      console.error(`    ✗ ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('\n[reconcile] filas que siguen sin calce:')

  for (const periodId of index.periods()) {
    for (const row of index.remaining(periodId)) {
      console.log(`  ${periodId}  ${ymd(row.transaction_date)}  ${fmt(Number(row.amount)).padStart(14)}  ${row.description}`)
    }
  }

  if (failures > 0) throw new Error(`${failures} entradas fallaron`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
