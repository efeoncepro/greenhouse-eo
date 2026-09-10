import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * Créditos bancarios — primer consumer runtime del scaffold TASK-702
 * (`greenhouse_finance.loan_accounts`).
 *
 * Modelo V1 (decisión 2026-09-10, recuperación conciliación ago–sep):
 *   - `loan_accounts` es el registro del pasivo (monto, cuota, plazo, cuenta
 *     de abono). NO es un instrumento de `accounts`: el saldo insoluto se
 *     deriva de `original_amount` menos el capital de las cuotas pagadas.
 *   - El DESEMBOLSO entra a la cuenta bancaria como settlement `funding`
 *     (pata incoming en la cuenta de abono). No es ingreso: no toca `income`
 *     ni `economic_category`; el pasivo es el `loan_account`.
 *   - Cada CUOTA es `createLoanCuotaExpensePayment` (expense `financial_cost`
 *     anclado por `loan_account_id`).
 */

export interface CreateLoanAccountInput {
  loanId: string
  lenderName: string
  externalReference: string
  currency: 'CLP' | 'USD' | 'MXN'
  originalAmount: number
  monthlyInstallment: number
  installmentCount: number
  fundingAccountId: string
  startedAt: string
  endsAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export const createLoanAccount = async (input: CreateLoanAccountInput): Promise<{ loanId: string; created: boolean }> =>
  withTransaction(async (client: PoolClient) => {
    const existing = await client.query<{ loan_id: string }>(
      `SELECT loan_id FROM greenhouse_finance.loan_accounts WHERE loan_id = $1 OR external_reference = $2 LIMIT 1`,
      [input.loanId, input.externalReference]
    )

    if (existing.rows.length > 0) {
      return { loanId: existing.rows[0].loan_id, created: false }
    }

    const funding = await client.query<{ account_id: string }>(
      `SELECT account_id FROM greenhouse_finance.accounts WHERE account_id = $1`,
      [input.fundingAccountId]
    )

    if (funding.rows.length === 0) {
      throw new FinanceValidationError(`Cuenta de abono ${input.fundingAccountId} no existe.`, 404)
    }

    await client.query(
      `INSERT INTO greenhouse_finance.loan_accounts (
         loan_id, lender_name, external_reference, currency, original_amount,
         monthly_installment, installment_count, installments_paid, funding_account_id,
         started_at, ends_at, status, notes, metadata_json, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9::date, $10::date, 'active', $11, $12::jsonb, NOW(), NOW())`,
      [
        input.loanId,
        input.lenderName,
        input.externalReference,
        input.currency,
        input.originalAmount,
        input.monthlyInstallment,
        input.installmentCount,
        input.fundingAccountId,
        input.startedAt,
        input.endsAt ?? null,
        normalizeString(input.notes) || null,
        JSON.stringify(input.metadata ?? {})
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.loan_account',
        aggregateId: input.loanId,
        eventType: 'finance.loan_account.created',
        payload: {
          loanId: input.loanId,
          lenderName: input.lenderName,
          originalAmount: input.originalAmount,
          installmentCount: input.installmentCount,
          fundingAccountId: input.fundingAccountId
        }
      },
      client
    )

    return { loanId: input.loanId, created: true }
  })

export interface RecordLoanDisbursementInput {
  loanId: string
  paymentDate: string
  /** monto líquido abonado en la cuenta (neto de impuestos y gastos descontados por el banco) */
  amount: number
  reference?: string | null
  notes?: string | null
  actorUserId?: string | null
  reconciliationRowId?: string | null
}

/**
 * Desembolso del crédito: settlement group `funding` con una pata incoming en
 * la cuenta de abono declarada en el loan. Idempotente por (loan, fecha, monto).
 */
export const recordLoanDisbursementSettlement = async (
  input: RecordLoanDisbursementInput
): Promise<{ settlementGroupId: string; settlementLegId: string; created: boolean }> =>
  withTransaction(async (client: PoolClient) => {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new FinanceValidationError('El desembolso debe ser un monto positivo.', 422)
    }

    const loan = await client.query<{ loan_id: string; funding_account_id: string | null; currency: string }>(
      `SELECT loan_id, funding_account_id, currency FROM greenhouse_finance.loan_accounts WHERE loan_id = $1`,
      [input.loanId]
    )

    if (loan.rows.length === 0) {
      throw new FinanceValidationError(`Crédito ${input.loanId} no existe.`, 404)
    }

    const fundingAccountId = loan.rows[0].funding_account_id

    if (!fundingAccountId) {
      throw new FinanceValidationError(`Crédito ${input.loanId} no tiene cuenta de abono (funding_account_id).`, 422)
    }

    const settlementGroupId = `stlgrp-loan-${input.loanId.slice(0, 40)}-${input.paymentDate.replace(/-/g, '')}-${Math.round(input.amount)}`
    const settlementLegId = `stlleg-${settlementGroupId}-in`

    const existing = await client.query<{ settlement_group_id: string }>(
      `SELECT settlement_group_id FROM greenhouse_finance.settlement_groups WHERE settlement_group_id = $1`,
      [settlementGroupId]
    )

    if (existing.rows.length > 0) {
      return { settlementGroupId, settlementLegId, created: false }
    }

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_groups (
         settlement_group_id, group_direction, settlement_mode,
         primary_instrument_id, provider_status, notes, created_by_user_id, created_at, updated_at
       ) VALUES ($1, 'incoming', 'funding', $2, 'settled', $3, $4, NOW(), NOW())`,
      [
        settlementGroupId,
        fundingAccountId,
        normalizeString(input.notes) || `Desembolso crédito ${input.loanId}`,
        input.actorUserId ?? null
      ]
    )

    await client.query(
      `INSERT INTO greenhouse_finance.settlement_legs (
         settlement_leg_id, settlement_group_id, leg_type, direction,
         instrument_id, currency, amount, amount_clp, provider_reference,
         provider_status, transaction_date, is_reconciled, reconciliation_row_id,
         notes, created_by_user_id, created_at, updated_at
       ) VALUES ($1, $2, 'funding', 'incoming', $3, $4, $5, $6, $7, 'settled', $8::date, $9, $10, $11, $12, NOW(), NOW())`,
      [
        settlementLegId,
        settlementGroupId,
        fundingAccountId,
        loan.rows[0].currency,
        input.amount,
        loan.rows[0].currency === 'CLP' ? input.amount : null,
        normalizeString(input.reference) || null,
        input.paymentDate,
        Boolean(input.reconciliationRowId),
        input.reconciliationRowId ?? null,
        `loan_id=${input.loanId}`,
        input.actorUserId ?? null
      ]
    )

    await client.query(
      `UPDATE greenhouse_finance.loan_accounts
       SET metadata_json = metadata_json || $2::jsonb, updated_at = NOW()
       WHERE loan_id = $1`,
      [
        input.loanId,
        JSON.stringify({ disbursement: { settlementGroupId, date: input.paymentDate, amount: input.amount } })
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.loan_account',
        aggregateId: input.loanId,
        eventType: 'finance.loan_account.disbursed',
        payload: { loanId: input.loanId, settlementGroupId, amount: input.amount, paymentDate: input.paymentDate, fundingAccountId }
      },
      client
    )

    return { settlementGroupId, settlementLegId, created: true }
  })
