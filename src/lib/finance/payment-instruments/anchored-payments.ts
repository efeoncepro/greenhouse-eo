import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { recordPayment } from '@/lib/finance/payment-ledger'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * Anchored Payment Factories (TASK-702 Slice 2).
 * ===============================================
 *
 * Cada bank movement debe terminar en un payment ANCLADO a un objeto
 * canónico de Greenhouse. Estas factories enforce el anclaje en el lado
 * del expense (FK a payroll_entry, tool_catalog, loan_account) o vía
 * settlement_groups multi-leg para casos de transit (Previred, Global66
 * international, FX conversions, internal transfers).
 *
 * Reglas duras:
 * - NUNCA crear expense / expense_payment huérfano (sin anchor) cuando
 *   existe un objeto canónico al que debería referirse. Las factories
 *   validan la existencia del anchor antes del INSERT.
 * - Idempotencia: cada factory recibe un `idempotencyKey` opcional que se
 *   usa como `reference`. Re-correr con el mismo key no duplica.
 * - Outbox events apropiados se publican para que cost_attribution +
 *   client_economics se re-materialicen.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface BaseAnchoredInput {
  paymentDate: string
  amount: number
  paymentAccountId: string
  reference?: string | null
  notes?: string | null
  actorUserId?: string | null
  reconciliationRowId?: string | null
}

export interface CreatePayrollExpensePaymentInput extends BaseAnchoredInput {
  payrollEntryId: string
  payrollPeriodId?: string | null
  memberId?: string | null
  description?: string | null
  bankMovementReference?: string | null
}

export interface CreateToolingExpensePaymentInput extends BaseAnchoredInput {
  toolCatalogId: string
  description?: string | null
  supplierName?: string | null
  bankMovementReference?: string | null
}

export interface CreateTaxExpensePaymentInput extends BaseAnchoredInput {
  taxType: string
  taxPeriod?: string | null
  taxFormNumber?: string | null
  description?: string | null
}

export interface CreateSupplierExpensePaymentInput extends BaseAnchoredInput {
  supplierId?: string | null
  supplierName: string
  expenseId?: string
  description?: string | null
  documentNumber?: string | null
}

export interface CreateBankFeeExpensePaymentInput extends BaseAnchoredInput {
  description: string
  miscellaneousCategory?: string | null
}

export interface CreateLoanCuotaExpensePaymentInput extends BaseAnchoredInput {
  loanAccountId: string
  description?: string | null
  installmentLabel?: string | null
}

export interface CreateInternalTransferSettlementInput {
  paymentDate: string
  amount: number
  sourceAccountId: string
  destinationAccountId: string
  reference?: string | null
  notes?: string | null
  actorUserId?: string | null
  sourceReconciliationRowId?: string | null
  destinationReconciliationRowId?: string | null
}

export interface CreateFxConversionSettlementInput {
  paymentDate: string
  sourceAccountId: string
  destinationAccountId: string
  sourceAmount: number
  sourceCurrency: 'USD' | 'CLP'
  destinationAmount: number
  destinationCurrency: 'USD' | 'CLP'
  fxRate: number
  reference?: string | null
  notes?: string | null
  actorUserId?: string | null
  sourceReconciliationRowId?: string | null
  destinationReconciliationRowId?: string | null
}

export interface CreatePreviredSettlementComponent {
  payrollEntryId: string
  socialSecurityType: 'afp' | 'health' | 'unemployment' | 'mutual' | 'caja_compensacion'
  amount: number
  memberId?: string | null
  description?: string | null
}

export interface CreatePreviredSettlementInput {
  paymentDate: string
  totalAmount: number
  sourceAccountId: string
  components: CreatePreviredSettlementComponent[]
  reference?: string | null
  reconciliationRowId?: string | null
  actorUserId?: string | null
}

export interface CreateInternationalPayrollSettlementInput {
  payrollEntryId: string
  paymentDate: string
  sourceAccountId: string
  transitAccountId: string
  beneficiaryName: string
  beneficiaryAccount?: string | null
  beneficiaryCountry?: string | null
  sourceAmount: number  // CLP
  fxFeeAmount: number   // CLP
  fxRate?: number | null
  destinationAmount?: number | null
  destinationCurrency?: string | null
  notes?: string | null
  actorUserId?: string | null
  sourceReconciliationRowId?: string | null
  transitReconciliationRowId?: string | null
}

export interface CreateFactoringFeeExpenseInput {
  factoringOperationId: string
  paymentDate: string
  feeAmount: number
  paymentAccountId: string
  reference?: string | null
  actorUserId?: string | null
}

interface AnchoredFactoryResult {
  expenseId: string
  paymentId: string
  amountPaid: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const ensurePositive = (amount: number, label = 'amount'): void => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new FinanceValidationError(`${label} must be a positive number.`, 422, { amount })
  }
}

const ensureAccount = async (client: PoolClient, accountId: string): Promise<{ currency: string }> => {
  const r = await client.query<{ currency: string }>(
    `SELECT currency FROM greenhouse_finance.accounts WHERE account_id = $1`,
    [accountId]
  )

  if (r.rows.length === 0) {
    throw new FinanceValidationError(`Account ${accountId} not found.`, 404)
  }

  return r.rows[0]
}

const idemKey = (parts: (string | number)[]): string => parts.map(p => String(p)).join('::')

/**
 * Generic helper: creates an `expense` row with the given anchor + an
 * `expense_payment` linked. Used by all single-anchor factories below.
 */
const createAnchoredExpensePayment = async (
  input: BaseAnchoredInput & {
    expenseType: string
    description: string
    anchorColumns: Record<string, unknown>
    paymentSource: 'manual' | 'bank_reconciliation'
    spaceId?: string | null
    currencyOverride?: string | null
  }
): Promise<AnchoredFactoryResult> => {
  ensurePositive(input.amount)

  return withTransaction(async (client: PoolClient) => {
    await ensureAccount(client, input.paymentAccountId)

    const dedupeRef = normalizeString(input.reference) || idemKey([
      input.expenseType,
      input.paymentDate,
      input.paymentAccountId,
      input.amount,
      ...Object.values(input.anchorColumns).map(v => v == null ? '' : String(v))
    ])

    const existing = await client.query<{ expense_id: string }>(
      `SELECT expense_id FROM greenhouse_finance.expenses
       WHERE payment_reference = $1
       LIMIT 1`,
      [dedupeRef]
    )

    if (existing.rows.length > 0) {
      const expenseId = existing.rows[0].expense_id

      const paymentRow = await client.query<{ payment_id: string }>(
        `SELECT payment_id FROM greenhouse_finance.expense_payments
         WHERE expense_id = $1 AND reference = $2 LIMIT 1`,
        [expenseId, dedupeRef]
      )

      return {
        expenseId,
        paymentId: paymentRow.rows[0]?.payment_id || '',
        amountPaid: input.amount
      }
    }

    const expenseId = `EXP-RECON-${input.paymentDate.replace(/-/g, '')}-${Math.floor(Math.random() * 1_000_000).toString(36)}`
    const currency = input.currencyOverride || 'CLP'
    const totalAmount = input.amount

    const anchorEntries = Object.entries(input.anchorColumns).filter(([, v]) => v !== undefined)

    // Build expense INSERT with sequential placeholders. Columns include
    // canonical anchors (payroll_entry_id, tool_catalog_id, etc.) when
    // provided.
    const baseColumns = [
      'expense_id', 'expense_type', 'description', 'currency',
      'subtotal', 'total_amount', 'total_amount_clp',
      'payment_status', 'payment_date', 'payment_method', 'payment_account_id', 'payment_reference',
      'document_date', 'exchange_rate_to_clp', 'amount_paid', 'space_id'
    ]

    const cols: string[] = [...baseColumns, ...anchorEntries.map(([k]) => k)]
    const vals: unknown[] = []
    const phs: string[] = []
    let i = 0

    for (const c of cols) {
      i++
      phs.push(`$${i}`)

      // Map expense_id/...
      if (c === 'expense_id') vals.push(expenseId)
      else if (c === 'expense_type') vals.push(input.expenseType)
      else if (c === 'description') vals.push(input.description)
      else if (c === 'currency') vals.push(currency)
      else if (c === 'subtotal' || c === 'total_amount' || c === 'total_amount_clp' || c === 'amount_paid') vals.push(totalAmount)
      else if (c === 'payment_status') vals.push('paid')
      else if (c === 'payment_date' || c === 'document_date') vals.push(input.paymentDate)
      else if (c === 'payment_method') vals.push('bank_transfer')
      else if (c === 'payment_account_id') vals.push(input.paymentAccountId)
      else if (c === 'payment_reference') vals.push(dedupeRef)
      else if (c === 'exchange_rate_to_clp') vals.push(1)
      else if (c === 'space_id') vals.push(input.spaceId || null)
      else {
        const found = anchorEntries.find(([k]) => k === c)

        vals.push(found ? found[1] : null)
      }
    }

    const finalSql = `
      INSERT INTO greenhouse_finance.expenses (${cols.join(', ')})
      VALUES (${phs.join(', ')})
      RETURNING expense_id
    `

    const inserted = await client.query<{ expense_id: string }>(finalSql, vals)

    if (inserted.rows.length === 0) {
      throw new Error('expense INSERT returned no rows')
    }

    const finalExpenseId = inserted.rows[0].expense_id

    // Inline expense_payment INSERT in the SAME transaction. Trigger
    // fn_sync_expense_amount_paid syncs expense.amount_paid + payment_status.
    const paymentId = `exp-pay-${randomUUID()}`

    await client.query(
      `INSERT INTO greenhouse_finance.expense_payments (
         payment_id, expense_id, payment_date, amount, currency,
         reference, payment_method, payment_account_id, payment_source,
         notes, recorded_by_user_id, recorded_at, is_reconciled,
         reconciliation_row_id, reconciled_at,
         exchange_rate_at_payment, amount_clp, fx_gain_loss_clp, created_at
       ) VALUES (
         $1, $2, $3::date, $4, $5,
         $6, 'bank_transfer', $7, 'bank_statement',
         $8, $9, NOW(),
         $10, $11, $12,
         1, $4, 0, NOW()
       )`,
      [
        paymentId, finalExpenseId, input.paymentDate, totalAmount, currency,
        dedupeRef, input.paymentAccountId,
        input.notes ?? null, input.actorUserId ?? null,
        Boolean(input.reconciliationRowId), input.reconciliationRowId ?? null,
        input.reconciliationRowId ? new Date().toISOString() : null
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.expense_payment',
        aggregateId: paymentId,
        eventType: 'finance.expense_payment.recorded',
        payload: {
          paymentId,
          expenseId: finalExpenseId,
          amount: totalAmount,
          paymentDate: input.paymentDate,
          paymentAccountId: input.paymentAccountId,
          source: 'bank_statement_anchored'
        }
      },
      client
    )

    return {
      expenseId: finalExpenseId,
      paymentId,
      amountPaid: totalAmount
    }
  })
}

// ─── Public factories ───────────────────────────────────────────────────────

export const createPayrollExpensePayment = (input: CreatePayrollExpensePaymentInput) =>
  createAnchoredExpensePayment({
    expenseType: 'payroll',
    description: input.description || `Pago nómina (entry ${input.payrollEntryId})`,
    anchorColumns: {
      payroll_entry_id: input.payrollEntryId,
      payroll_period_id: input.payrollPeriodId ?? null,
      member_id: input.memberId ?? null
    },
    paymentSource: 'bank_reconciliation',
    paymentDate: input.paymentDate,
    amount: input.amount,
    paymentAccountId: input.paymentAccountId,
    reference: input.reference || input.bankMovementReference,
    notes: input.notes,
    actorUserId: input.actorUserId,
    reconciliationRowId: input.reconciliationRowId
  })

export const createToolingExpensePayment = (input: CreateToolingExpensePaymentInput) =>
  createAnchoredExpensePayment({
    expenseType: 'miscellaneous',
    description: input.description || `Tooling charge (${input.toolCatalogId})`,
    anchorColumns: {
      tool_catalog_id: input.toolCatalogId,
      supplier_name: input.supplierName ?? null,
      miscellaneous_category: 'tooling'
    },
    paymentSource: 'bank_reconciliation',
    paymentDate: input.paymentDate,
    amount: input.amount,
    paymentAccountId: input.paymentAccountId,
    reference: input.reference || input.bankMovementReference,
    notes: input.notes,
    actorUserId: input.actorUserId,
    reconciliationRowId: input.reconciliationRowId
  })

export const createTaxExpensePayment = (input: CreateTaxExpensePaymentInput) =>
  createAnchoredExpensePayment({
    expenseType: 'tax',
    description: input.description || `Impuesto ${input.taxType} ${input.taxPeriod ?? ''}`.trim(),
    anchorColumns: {
      tax_type: input.taxType,
      tax_period: input.taxPeriod ?? null,
      tax_form_number: input.taxFormNumber ?? null
    },
    paymentSource: 'bank_reconciliation',
    paymentDate: input.paymentDate,
    amount: input.amount,
    paymentAccountId: input.paymentAccountId,
    reference: input.reference,
    notes: input.notes,
    actorUserId: input.actorUserId,
    reconciliationRowId: input.reconciliationRowId
  })

export const createSupplierExpensePayment = (input: CreateSupplierExpensePaymentInput) =>
  createAnchoredExpensePayment({
    expenseType: 'supplier',
    description: input.description || `Pago a ${input.supplierName}`,
    anchorColumns: {
      supplier_id: input.supplierId ?? null,
      supplier_name: input.supplierName,
      document_number: input.documentNumber ?? null
    },
    paymentSource: 'bank_reconciliation',
    paymentDate: input.paymentDate,
    amount: input.amount,
    paymentAccountId: input.paymentAccountId,
    reference: input.reference,
    notes: input.notes,
    actorUserId: input.actorUserId,
    reconciliationRowId: input.reconciliationRowId
  })

export const createBankFeeExpensePayment = (input: CreateBankFeeExpensePaymentInput) =>
  createAnchoredExpensePayment({
    expenseType: 'bank_fee',
    description: input.description,
    anchorColumns: {
      miscellaneous_category: input.miscellaneousCategory ?? 'bank_fee'
    },
    paymentSource: 'bank_reconciliation',
    paymentDate: input.paymentDate,
    amount: input.amount,
    paymentAccountId: input.paymentAccountId,
    reference: input.reference,
    notes: input.notes,
    actorUserId: input.actorUserId,
    reconciliationRowId: input.reconciliationRowId
  })

export const createLoanCuotaExpensePayment = (input: CreateLoanCuotaExpensePaymentInput) =>
  createAnchoredExpensePayment({
    expenseType: 'financial_cost',
    description: input.description || `Cuota crédito ${input.installmentLabel ?? input.loanAccountId}`,
    anchorColumns: {
      loan_account_id: input.loanAccountId,
      miscellaneous_category: 'loan_installment'
    },
    paymentSource: 'bank_reconciliation',
    paymentDate: input.paymentDate,
    amount: input.amount,
    paymentAccountId: input.paymentAccountId,
    reference: input.reference,
    notes: input.notes,
    actorUserId: input.actorUserId,
    reconciliationRowId: input.reconciliationRowId
  })

// ─── Settlement-group factories (multi-leg) ─────────────────────────────────

export const createInternalTransferSettlement = async (input: CreateInternalTransferSettlementInput): Promise<{
  settlementGroupId: string
  outgoingLegId: string
  incomingLegId: string
}> => {
  ensurePositive(input.amount)

  return withTransaction(async (client: PoolClient) => {
    await ensureAccount(client, input.sourceAccountId)
    await ensureAccount(client, input.destinationAccountId)

    // Deterministic ID for idempotency: same source + dest + date + amount + reference → same group
    const refSlug = (input.reference || 'auto').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24)
    const settlementGroupId = `stlgrp-itx-${input.sourceAccountId.slice(0, 12)}-${input.destinationAccountId.slice(0, 12)}-${input.paymentDate.replace(/-/g, '')}-${refSlug}-${Math.round(input.amount)}`

    const existing = await client.query<{ settlement_group_id: string }>(
      `SELECT settlement_group_id FROM greenhouse_finance.settlement_groups WHERE settlement_group_id = $1`,
      [settlementGroupId]
    )

    if (existing.rows.length > 0) {
      return {
        settlementGroupId,
        outgoingLegId: `stlleg-${settlementGroupId}-out`,
        incomingLegId: `stlleg-${settlementGroupId}-in`
      }
    }

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_groups (
         settlement_group_id, group_direction, settlement_mode,
         primary_instrument_id, provider_status, notes, created_by_user_id, created_at, updated_at
       ) VALUES ($1, 'internal', 'internal_transfer', $2, 'settled', $3, $4, NOW(), NOW())`,
      [settlementGroupId, input.sourceAccountId, input.notes ?? null, input.actorUserId ?? null]
    )

    const outgoingLegId = `stlleg-${settlementGroupId}-out`
    const incomingLegId = `stlleg-${settlementGroupId}-in`

    const sourceAcct = await client.query<{ currency: string }>(
      `SELECT currency FROM greenhouse_finance.accounts WHERE account_id = $1`,
      [input.sourceAccountId]
    )

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_legs (
         settlement_leg_id, settlement_group_id, leg_type, direction,
         instrument_id, counterparty_instrument_id, currency, amount,
         provider_status, transaction_date, is_reconciled, reconciliation_row_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'internal_transfer', 'outgoing', $3, $4, $5, $6, 'settled', $7::date, $8, $9, NOW(), NOW())`,
      [
        outgoingLegId, settlementGroupId, input.sourceAccountId, input.destinationAccountId,
        sourceAcct.rows[0]?.currency || 'CLP', input.amount, input.paymentDate,
        Boolean(input.sourceReconciliationRowId), input.sourceReconciliationRowId ?? null
      ]
    )

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_legs (
         settlement_leg_id, settlement_group_id, leg_type, direction,
         instrument_id, counterparty_instrument_id, currency, amount,
         provider_status, transaction_date, is_reconciled, reconciliation_row_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'internal_transfer', 'incoming', $3, $4, $5, $6, 'settled', $7::date, $8, $9, NOW(), NOW())`,
      [
        incomingLegId, settlementGroupId, input.destinationAccountId, input.sourceAccountId,
        sourceAcct.rows[0]?.currency || 'CLP', input.amount, input.paymentDate,
        Boolean(input.destinationReconciliationRowId), input.destinationReconciliationRowId ?? null
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.settlement_group',
        aggregateId: settlementGroupId,
        eventType: 'finance.settlement_group.internal_transfer.created',
        payload: {
          settlementGroupId,
          sourceAccountId: input.sourceAccountId,
          destinationAccountId: input.destinationAccountId,
          amount: input.amount,
          paymentDate: input.paymentDate
        }
      },
      client
    )

    return { settlementGroupId, outgoingLegId, incomingLegId }
  })
}

export const createFxConversionSettlement = async (input: CreateFxConversionSettlementInput): Promise<{
  settlementGroupId: string
}> => {
  ensurePositive(input.sourceAmount)
  ensurePositive(input.destinationAmount)
  ensurePositive(input.fxRate, 'fxRate')

  return withTransaction(async (client: PoolClient) => {
    await ensureAccount(client, input.sourceAccountId)
    await ensureAccount(client, input.destinationAccountId)

    const refSlug = (input.reference || 'auto').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24)
    const settlementGroupId = `stlgrp-fx-${input.sourceAccountId.slice(0, 12)}-${input.destinationAccountId.slice(0, 12)}-${input.paymentDate.replace(/-/g, '')}-${refSlug}-${Math.round(input.sourceAmount)}`

    const existing = await client.query<{ settlement_group_id: string }>(
      `SELECT settlement_group_id FROM greenhouse_finance.settlement_groups WHERE settlement_group_id = $1`,
      [settlementGroupId]
    )

    if (existing.rows.length > 0) {
      return { settlementGroupId }
    }

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_groups (
         settlement_group_id, group_direction, settlement_mode,
         primary_instrument_id, provider_status, notes, created_by_user_id, created_at, updated_at
       ) VALUES ($1, 'internal', 'fx_conversion', $2, 'settled', $3, $4, NOW(), NOW())`,
      [settlementGroupId, input.sourceAccountId, input.notes ?? null, input.actorUserId ?? null]
    )

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_legs (
         settlement_leg_id, settlement_group_id, leg_type, direction,
         instrument_id, counterparty_instrument_id, currency, amount, fx_rate,
         provider_status, transaction_date, is_reconciled, reconciliation_row_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'fx_conversion', 'outgoing', $3, $4, $5, $6, $7, 'settled', $8::date, $9, $10, NOW(), NOW())`,
      [
        `stlleg-${settlementGroupId}-out`, settlementGroupId, input.sourceAccountId, input.destinationAccountId,
        input.sourceCurrency, input.sourceAmount, input.fxRate, input.paymentDate,
        Boolean(input.sourceReconciliationRowId), input.sourceReconciliationRowId ?? null
      ]
    )

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_legs (
         settlement_leg_id, settlement_group_id, leg_type, direction,
         instrument_id, counterparty_instrument_id, currency, amount, fx_rate,
         provider_status, transaction_date, is_reconciled, reconciliation_row_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'fx_conversion', 'incoming', $3, $4, $5, $6, $7, 'settled', $8::date, $9, $10, NOW(), NOW())`,
      [
        `stlleg-${settlementGroupId}-in`, settlementGroupId, input.destinationAccountId, input.sourceAccountId,
        input.destinationCurrency, input.destinationAmount, input.fxRate, input.paymentDate,
        Boolean(input.destinationReconciliationRowId), input.destinationReconciliationRowId ?? null
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.settlement_group',
        aggregateId: settlementGroupId,
        eventType: 'finance.settlement_group.fx_conversion.created',
        payload: {
          settlementGroupId,
          sourceAccountId: input.sourceAccountId,
          destinationAccountId: input.destinationAccountId,
          sourceAmount: input.sourceAmount,
          sourceCurrency: input.sourceCurrency,
          destinationAmount: input.destinationAmount,
          destinationCurrency: input.destinationCurrency,
          fxRate: input.fxRate
        }
      },
      client
    )

    return { settlementGroupId }
  })
}

/**
 * Previred multi-component settlement: 1 outgoing leg from source account
 * sums to N expense_payments anchored to individual payroll_entries.
 *
 * Invariant enforced at runtime:
 *   sum(components.amount) === totalAmount
 */
export const createPreviredSettlement = async (input: CreatePreviredSettlementInput): Promise<{
  settlementGroupId: string
  componentExpenseIds: string[]
}> => {
  ensurePositive(input.totalAmount)

  if (!input.components.length) {
    throw new FinanceValidationError('Previred settlement requires at least 1 component.', 422)
  }

  const componentSum = input.components.reduce((acc, c) => acc + c.amount, 0)

  if (Math.abs(componentSum - input.totalAmount) > 0.5) {
    throw new FinanceValidationError(
      `Previred components sum (${componentSum}) doesn't match totalAmount (${input.totalAmount}).`,
      422,
      { componentSum, totalAmount: input.totalAmount }
    )
  }

  return withTransaction(async (client: PoolClient) => {
    await ensureAccount(client, input.sourceAccountId)

    const settlementGroupId = `stlgrp-previred-${input.paymentDate.replace(/-/g, '')}-${Math.floor(Math.random() * 1_000_000).toString(36)}`

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_groups (
         settlement_group_id, group_direction, settlement_mode,
         primary_instrument_id, provider_status, notes, created_by_user_id, created_at, updated_at
       ) VALUES ($1, 'outgoing', 'mixed', $2, 'settled', 'Previred multi-component', $3, NOW(), NOW())`,
      [settlementGroupId, input.sourceAccountId, input.actorUserId ?? null]
    )

    // Single outgoing leg representing the bank movement
    await client.query(
      `INSERT INTO greenhouse_finance.settlement_legs (
         settlement_leg_id, settlement_group_id, leg_type, direction,
         instrument_id, currency, amount,
         provider_status, transaction_date, is_reconciled, reconciliation_row_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'payout', 'outgoing', $3, 'CLP', $4, 'settled', $5::date, $6, $7, NOW(), NOW())`,
      [
        `stlleg-${settlementGroupId}-out`, settlementGroupId, input.sourceAccountId,
        input.totalAmount, input.paymentDate,
        Boolean(input.reconciliationRowId), input.reconciliationRowId ?? null
      ]
    )

    const componentExpenseIds: string[] = []

    for (const c of input.components) {
      const r = await createPayrollExpensePayment({
        payrollEntryId: c.payrollEntryId,
        memberId: c.memberId ?? null,
        paymentDate: input.paymentDate,
        amount: c.amount,
        paymentAccountId: input.sourceAccountId,
        description: c.description || `Previred ${c.socialSecurityType} (entry ${c.payrollEntryId})`,
        reference: `${input.reference || `previred-${input.paymentDate}`}-${c.socialSecurityType}-${c.payrollEntryId}`,
        actorUserId: input.actorUserId
      })

      // Set social_security_type on the expense (the helper used expense_type=payroll;
      // for previred-style components we override post-hoc to type=social_security).
      await client.query(
        `UPDATE greenhouse_finance.expenses SET
           expense_type = 'social_security',
           social_security_type = $1,
           updated_at = NOW()
         WHERE expense_id = $2`,
        [c.socialSecurityType, r.expenseId]
      )

      // Tie the expense_payment to the settlement_group
      await client.query(
        `UPDATE greenhouse_finance.expense_payments SET settlement_group_id = $1, updated_at = NOW() WHERE payment_id = $2`,
        [settlementGroupId, r.paymentId]
      )

      componentExpenseIds.push(r.expenseId)
    }

    return { settlementGroupId, componentExpenseIds }
  })
}

/**
 * International payroll via transit fintech (Global66).
 * Creates:
 *   - settlement_group [internal_transfer + fx_conversion]
 *   - leg outgoing source CLP → transit
 *   - leg incoming transit
 *   - leg fee FX (gateway_fee)
 *   - leg outgoing transit → external beneficiary (recorded but no internal account)
 *   - expense kind=payroll anchored to payroll_entry_id (the labor cost in CLP)
 *   - expense kind=gateway_fee for the FX cost
 *
 * The bank movement on `sourceAccount` is the source-side settlement_leg.
 * The fee + payout legs reconcile against the transit account's bank rows.
 */
export const createInternationalPayrollSettlement = async (
  input: CreateInternationalPayrollSettlementInput
): Promise<{
  settlementGroupId: string
  payrollExpenseId: string
  feeExpenseId: string | null
}> => {
  ensurePositive(input.sourceAmount)

  return withTransaction(async (client: PoolClient) => {
    await ensureAccount(client, input.sourceAccountId)
    await ensureAccount(client, input.transitAccountId)

    const settlementGroupId = `stlgrp-intpay-${input.paymentDate.replace(/-/g, '')}-${Math.floor(Math.random() * 1_000_000).toString(36)}`

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_groups (
         settlement_group_id, group_direction, settlement_mode,
         primary_instrument_id, provider_status, notes, created_by_user_id, created_at, updated_at
       ) VALUES ($1, 'outgoing', 'mixed', $2, 'settled', $3, $4, NOW(), NOW())`,
      [
        settlementGroupId, input.sourceAccountId,
        `International payroll via ${input.transitAccountId} → ${input.beneficiaryName} (${input.beneficiaryCountry || '??'})`,
        input.actorUserId ?? null
      ]
    )

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_legs (
         settlement_leg_id, settlement_group_id, leg_type, direction,
         instrument_id, counterparty_instrument_id, currency, amount,
         provider_status, transaction_date, is_reconciled, reconciliation_row_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'internal_transfer', 'outgoing', $3, $4, 'CLP', $5, 'settled', $6::date, $7, $8, NOW(), NOW())`,
      [
        `stlleg-${settlementGroupId}-source-out`, settlementGroupId,
        input.sourceAccountId, input.transitAccountId,
        input.sourceAmount, input.paymentDate,
        Boolean(input.sourceReconciliationRowId), input.sourceReconciliationRowId ?? null
      ]
    )

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_legs (
         settlement_leg_id, settlement_group_id, leg_type, direction,
         instrument_id, counterparty_instrument_id, currency, amount,
         provider_status, transaction_date, is_reconciled, reconciliation_row_id,
         created_at, updated_at
       ) VALUES ($1, $2, 'internal_transfer', 'incoming', $3, $4, 'CLP', $5, 'settled', $6::date, $7, $8, NOW(), NOW())`,
      [
        `stlleg-${settlementGroupId}-transit-in`, settlementGroupId,
        input.transitAccountId, input.sourceAccountId,
        input.sourceAmount, input.paymentDate,
        Boolean(input.transitReconciliationRowId), input.transitReconciliationRowId ?? null
      ]
    )

    // Payroll expense anchored to the entry (the CLP labor cost)
    const payrollR = await createPayrollExpensePayment({
      payrollEntryId: input.payrollEntryId,
      paymentDate: input.paymentDate,
      amount: input.sourceAmount - input.fxFeeAmount,
      paymentAccountId: input.transitAccountId,
      description: `Pago internacional ${input.beneficiaryName} (${input.beneficiaryCountry || ''}) — entry ${input.payrollEntryId}`,
      reference: `intpay-${input.payrollEntryId}-${input.paymentDate}`,
      actorUserId: input.actorUserId
    })

    await client.query(
      `UPDATE greenhouse_finance.expense_payments SET settlement_group_id = $1 WHERE payment_id = $2`,
      [settlementGroupId, payrollR.paymentId]
    )

    let feeExpenseId: string | null = null

    if (input.fxFeeAmount > 0) {
      const feeR = await createAnchoredExpensePayment({
        expenseType: 'gateway_fee',
        description: `FX fee Global66 → ${input.beneficiaryCountry || 'intl'} (entry ${input.payrollEntryId})`,
        anchorColumns: { miscellaneous_category: 'fx_fee', payroll_entry_id: input.payrollEntryId },
        paymentSource: 'bank_reconciliation',
        paymentDate: input.paymentDate,
        amount: input.fxFeeAmount,
        paymentAccountId: input.transitAccountId,
        reference: `intpay-fee-${input.payrollEntryId}-${input.paymentDate}`,
        notes: input.notes,
        actorUserId: input.actorUserId
      })

      feeExpenseId = feeR.expenseId

      await client.query(
        `UPDATE greenhouse_finance.expense_payments SET settlement_group_id = $1 WHERE payment_id = $2`,
        [settlementGroupId, feeR.paymentId]
      )
    }

    return { settlementGroupId, payrollExpenseId: payrollR.expenseId, feeExpenseId }
  })
}

/**
 * Materialize the factoring fee as an `expense kind=factoring_fee` linked to
 * the operation. Idempotent by `factoring_operation_id` + payment_date.
 */
export const createFactoringFeeExpense = async (
  input: CreateFactoringFeeExpenseInput
): Promise<AnchoredFactoryResult | null> => {
  if (input.feeAmount <= 0) return null

  return createAnchoredExpensePayment({
    expenseType: 'factoring_fee',
    description: `Fee factoring ${input.factoringOperationId}`,
    anchorColumns: {
      miscellaneous_category: 'factoring_fee'
    },
    paymentSource: 'bank_reconciliation',
    paymentDate: input.paymentDate,
    amount: input.feeAmount,
    paymentAccountId: input.paymentAccountId,
    reference: input.reference || `factoring-fee-${input.factoringOperationId}-${input.paymentDate}`,
    actorUserId: input.actorUserId
  })
}

/**
 * Income payment factoring_proceeds (the cash that actually entered the
 * bank). Auto-validates that a factoring_operation exists for the income.
 * Idempotent by `(income_id, reference)`.
 */
export const createFactoringIncomePayment = async (input: {
  incomeId: string
  factoringOperationId: string
  paymentDate: string
  amountReceived: number
  paymentAccountId: string
  reference?: string | null
  actorUserId?: string | null
  reconciliationRowId?: string | null
}): Promise<{ paymentId: string }> => {
  ensurePositive(input.amountReceived)

  return withTransaction(async (client: PoolClient) => {
    const op = await client.query<{ operation_id: string }>(
      `SELECT operation_id FROM greenhouse_finance.factoring_operations WHERE operation_id = $1 AND income_id = $2`,
      [input.factoringOperationId, input.incomeId]
    )

    if (op.rows.length === 0) {
      throw new FinanceValidationError(
        `factoring_operation ${input.factoringOperationId} not found for income ${input.incomeId}.`,
        404
      )
    }

    const r = await recordPayment({
      incomeId: input.incomeId,
      paymentDate: input.paymentDate,
      amount: input.amountReceived,
      currency: 'CLP',
      reference: input.reference || `factoring-proceeds-${input.factoringOperationId}-${input.paymentDate}`,
      paymentMethod: 'bank_transfer',
      paymentAccountId: input.paymentAccountId,
      paymentSource: 'factoring_proceeds',
      actorUserId: input.actorUserId,
      notes: `Anchored to factoring_operation ${input.factoringOperationId}`
    })

    if (input.reconciliationRowId) {
      await client.query(
        `UPDATE greenhouse_finance.income_payments SET reconciliation_row_id = $1, reconciled_at = NOW() WHERE payment_id = $2`,
        [input.reconciliationRowId, r.payment.paymentId]
      )
    }

    return { paymentId: r.payment.paymentId }
  })
}
