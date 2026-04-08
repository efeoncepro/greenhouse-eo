import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  normalizeString,
  roundCurrency,
  toDateString,
  toNumber
} from '@/lib/finance/shared'

type QueryableClient = Pick<PoolClient, 'query'>

type SettlementPaymentType = 'income_payment' | 'expense_payment'
type SettlementDirection = 'incoming' | 'outgoing'

interface EnsureSettlementInput {
  client?: QueryableClient
  paymentId: string
  paymentAccountId?: string | null
  paymentDate?: string | null
  amount: number
  currency?: string | null
  amountClp?: number | null
  exchangeRate?: number | null
  providerReference?: string | null
  paymentSource?: string | null
  actorUserId?: string | null
  notes?: string | null
}

interface SettlementGroupRow {
  [key: string]: unknown
  settlement_group_id: string
  group_direction: string
  settlement_mode: string
  source_payment_type: string
  source_payment_id: string | null
  primary_instrument_id: string | null
  provider_reference: string | null
  provider_status: string
  notes: string | null
}

interface SettlementLegRow {
  [key: string]: unknown
  settlement_leg_id: string
  settlement_group_id: string
  leg_type: string
  direction: string
  linked_payment_type: string | null
  linked_payment_id: string | null
  instrument_id: string | null
  counterparty_instrument_id: string | null
  amount: unknown
  currency: string
  amount_clp: unknown
  fx_rate: unknown
  provider_reference: string | null
  provider_status: string
  transaction_date: string | Date | null
  is_reconciled: boolean
  reconciliation_row_id: string | null
  notes: string | null
}

const queryRows = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: QueryableClient
) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const str = (value: unknown) => {
  const normalized = normalizeString(value)

  return normalized || null
}

const directionForPayment = (paymentType: SettlementPaymentType): SettlementDirection =>
  paymentType === 'income_payment' ? 'incoming' : 'outgoing'

const legTypeForPayment = (paymentType: SettlementPaymentType) =>
  paymentType === 'income_payment' ? 'receipt' : 'payout'

const ensureSettlementForPayment = async (
  paymentType: SettlementPaymentType,
  input: EnsureSettlementInput
) => {
  const settlementGroupId = `stlgrp-${input.paymentId}`
  const settlementLegId = `stlleg-${input.paymentId}`
  const direction = directionForPayment(paymentType)
  const legType = legTypeForPayment(paymentType)
  const currency = str(input.currency) || 'CLP'
  const transactionDate = input.paymentDate ? toDateString(input.paymentDate) : null
  const amount = roundCurrency(input.amount)
  const amountClp = input.amountClp != null ? roundCurrency(input.amountClp) : (currency === 'CLP' ? amount : null)
  const exchangeRate = input.exchangeRate != null ? toNumber(input.exchangeRate) : (currency === 'CLP' ? 1 : null)

  const groupRows = await queryRows<SettlementGroupRow>(
    `
      INSERT INTO greenhouse_finance.settlement_groups (
        settlement_group_id,
        group_direction,
        settlement_mode,
        source_payment_type,
        source_payment_id,
        primary_instrument_id,
        provider_reference,
        provider_status,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, 'direct', $3, $4, $5, $6, 'pending', $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (settlement_group_id)
      DO UPDATE SET
        primary_instrument_id = EXCLUDED.primary_instrument_id,
        provider_reference = EXCLUDED.provider_reference,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        settlement_group_id,
        group_direction,
        settlement_mode,
        source_payment_type,
        source_payment_id,
        primary_instrument_id,
        provider_reference,
        provider_status,
        notes
    `,
    [
      settlementGroupId,
      direction,
      paymentType,
      input.paymentId,
      input.paymentAccountId || null,
      input.providerReference || null,
      input.notes || null,
      input.actorUserId || null
    ],
    input.client
  )

  const legRows = await queryRows<SettlementLegRow>(
    `
      INSERT INTO greenhouse_finance.settlement_legs (
        settlement_leg_id,
        settlement_group_id,
        linked_payment_type,
        linked_payment_id,
        leg_type,
        direction,
        instrument_id,
        counterparty_instrument_id,
        currency,
        amount,
        amount_clp,
        fx_rate,
        provider_reference,
        provider_status,
        transaction_date,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, $11, $12, 'pending', $13::date, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (settlement_leg_id)
      DO UPDATE SET
        instrument_id = EXCLUDED.instrument_id,
        currency = EXCLUDED.currency,
        amount = EXCLUDED.amount,
        amount_clp = EXCLUDED.amount_clp,
        fx_rate = EXCLUDED.fx_rate,
        provider_reference = EXCLUDED.provider_reference,
        transaction_date = EXCLUDED.transaction_date,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        settlement_leg_id,
        settlement_group_id,
        linked_payment_type,
        linked_payment_id,
        leg_type,
        direction,
        instrument_id,
        counterparty_instrument_id,
        amount,
        currency,
        amount_clp,
        fx_rate,
        provider_reference,
        provider_status,
        transaction_date,
        is_reconciled,
        reconciliation_row_id,
        notes
    `,
    [
      settlementLegId,
      settlementGroupId,
      paymentType,
      input.paymentId,
      legType,
      direction,
      input.paymentAccountId || null,
      currency,
      amount,
      amountClp,
      exchangeRate,
      input.providerReference || null,
      transactionDate,
      input.notes || null,
      input.actorUserId || null
    ],
    input.client
  )

  const paymentTable = paymentType === 'income_payment'
    ? 'greenhouse_finance.income_payments'
    : 'greenhouse_finance.expense_payments'

  await queryRows(
    `UPDATE ${paymentTable} SET settlement_group_id = $2 WHERE payment_id = $1`,
    [input.paymentId, settlementGroupId],
    input.client
  )

  const group = groupRows[0]
  const leg = legRows[0]

  await publishOutboxEvent(
    {
      aggregateType: 'finance_settlement_leg',
      aggregateId: settlementLegId,
      eventType: 'finance.settlement_leg.recorded',
      payload: {
        settlementGroupId,
        settlementLegId,
        paymentType,
        paymentId: input.paymentId,
        legType,
        direction,
        instrumentId: input.paymentAccountId || null,
        transactionDate,
        amount,
        currency,
        amountClp,
        exchangeRate,
        reference: input.providerReference || null,
        paymentSource: input.paymentSource || null
      }
    },
    input.client
  )

  return {
    settlementGroup: {
      settlementGroupId: normalizeString(group.settlement_group_id),
      groupDirection: normalizeString(group.group_direction),
      settlementMode: normalizeString(group.settlement_mode),
      sourcePaymentType: normalizeString(group.source_payment_type),
      sourcePaymentId: str(group.source_payment_id),
      primaryInstrumentId: str(group.primary_instrument_id),
      providerReference: str(group.provider_reference),
      providerStatus: normalizeString(group.provider_status),
      notes: str(group.notes)
    },
    settlementLeg: {
      settlementLegId: normalizeString(leg.settlement_leg_id),
      settlementGroupId: normalizeString(leg.settlement_group_id),
      linkedPaymentType: str(leg.linked_payment_type),
      linkedPaymentId: str(leg.linked_payment_id),
      legType: normalizeString(leg.leg_type),
      direction: normalizeString(leg.direction),
      instrumentId: str(leg.instrument_id),
      counterpartyInstrumentId: str(leg.counterparty_instrument_id),
      amount: toNumber(leg.amount),
      currency: normalizeString(leg.currency),
      amountClp: leg.amount_clp != null ? toNumber(leg.amount_clp) : null,
      exchangeRate: leg.fx_rate != null ? toNumber(leg.fx_rate) : null,
      providerReference: str(leg.provider_reference),
      providerStatus: normalizeString(leg.provider_status),
      transactionDate: toDateString(leg.transaction_date as string | { value?: string } | null),
      isReconciled: Boolean(leg.is_reconciled),
      reconciliationRowId: str(leg.reconciliation_row_id),
      notes: str(leg.notes)
    }
  }
}

export const ensureSettlementForIncomePayment = (input: EnsureSettlementInput) =>
  ensureSettlementForPayment('income_payment', input)

export const ensureSettlementForExpensePayment = (input: EnsureSettlementInput) =>
  ensureSettlementForPayment('expense_payment', input)
