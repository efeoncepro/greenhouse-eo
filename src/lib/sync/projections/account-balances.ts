import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { query } from '@/lib/db'
import { rematerializeAccountBalancesFromDate } from '@/lib/finance/account-balances'
import { normalizeString, toDateString } from '@/lib/finance/shared'

const refreshAccountFromDate = async (accountId: string | null, date: string | null) => {
  if (!accountId || !date) {
    return null
  }

  await rematerializeAccountBalancesFromDate({
    accountId,
    fromDate: date
  })

  return { accountId, date }
}

const refreshFromPayment = async (
  paymentType: 'income' | 'expense',
  paymentId: string | null
) => {
  if (!paymentId) return null

  const tableName = paymentType === 'income'
    ? 'greenhouse_finance.income_payments'
    : 'greenhouse_finance.expense_payments'

  const rows = await query<{ payment_account_id: string | null; payment_date: string | Date | null }>(
    `
      SELECT payment_account_id, payment_date
      FROM ${tableName}
      WHERE payment_id = $1
      LIMIT 1
    `,
    [paymentId]
  )

  const row = rows[0]

  return refreshAccountFromDate(
    row?.payment_account_id ? normalizeString(row.payment_account_id) : null,
    toDateString(row?.payment_date || null)
  )
}

const refreshFromSettlementLeg = async (settlementLegId: string | null) => {
  if (!settlementLegId) return null

  const rows = await query<{
    instrument_id: string | null
    counterparty_instrument_id: string | null
    transaction_date: string | Date | null
  }>(
    `
      SELECT instrument_id, counterparty_instrument_id, transaction_date
      FROM greenhouse_finance.settlement_legs
      WHERE settlement_leg_id = $1
      LIMIT 1
    `,
    [settlementLegId]
  )

  const row = rows[0]
  const transactionDate = toDateString(row?.transaction_date || null)

  const results = await Promise.all([
    refreshAccountFromDate(
      row?.instrument_id ? normalizeString(row.instrument_id) : null,
      transactionDate
    ),
    refreshAccountFromDate(
      row?.counterparty_instrument_id ? normalizeString(row.counterparty_instrument_id) : null,
      transactionDate
    )
  ])

  return results.filter(Boolean)
}

export const ACCOUNT_BALANCE_TRIGGER_EVENTS = [
  'finance.income_payment.recorded',
  'finance.expense_payment.recorded',
  'finance.settlement_leg.recorded',
  'finance.settlement_leg.reconciled',
  'finance.settlement_leg.unreconciled',
  'finance.internal_transfer.recorded',
  'finance.fx_conversion.recorded',
  'finance.reconciliation_period.reconciled',
  'finance.reconciliation_period.closed'
] as const

export const accountBalancesProjection: ProjectionDefinition = {
  name: 'account_balances',
  description: 'Materialize daily treasury balances by payment instrument',
  domain: 'finance',
  triggerEvents: [...ACCOUNT_BALANCE_TRIGGER_EVENTS],
  extractScope: payload => {
    const settlementLegId = typeof payload.settlementLegId === 'string' ? payload.settlementLegId : null
    const paymentId = typeof payload.paymentId === 'string' ? payload.paymentId : null

    const accountId = typeof payload.accountId === 'string'
      ? payload.accountId
      : typeof payload.instrumentId === 'string'
        ? payload.instrumentId
        : typeof payload.fromAccountId === 'string'
          ? payload.fromAccountId
          : null

    return {
      entityType: settlementLegId
        ? 'finance_settlement_leg'
        : paymentId
          ? 'finance_payment'
          : 'finance_account',
      entityId: settlementLegId || paymentId || accountId || 'finance-account-balances'
    }
  },
  refresh: async (_scope, payload) => {
    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

    if (eventType === 'finance.income_payment.recorded') {
      const result = await refreshFromPayment(
        'income',
        typeof payload.paymentId === 'string' ? payload.paymentId : null
      )

      return result
        ? `materialized account_balances for ${result.accountId} from ${result.date} via ${eventType}`
        : null
    }

    if (eventType === 'finance.expense_payment.recorded') {
      const result = await refreshFromPayment(
        'expense',
        typeof payload.paymentId === 'string' ? payload.paymentId : null
      )

      return result
        ? `materialized account_balances for ${result.accountId} from ${result.date} via ${eventType}`
        : null
    }

    if (
      eventType === 'finance.settlement_leg.recorded'
      || eventType === 'finance.settlement_leg.reconciled'
      || eventType === 'finance.settlement_leg.unreconciled'
    ) {
      const settlementResult = await refreshFromSettlementLeg(
        typeof payload.settlementLegId === 'string' ? payload.settlementLegId : null
      )

      if (settlementResult?.length) {
        return `materialized account_balances for ${settlementResult.length} instrument(s) via ${eventType}`
      }
    }

    if (eventType === 'finance.internal_transfer.recorded' || eventType === 'finance.fx_conversion.recorded') {
      const transferDate = typeof payload.transferDate === 'string'
        ? payload.transferDate
        : typeof payload.transactionDate === 'string'
          ? payload.transactionDate
          : null

      const results = await Promise.all([
        refreshAccountFromDate(
          typeof payload.fromAccountId === 'string' ? payload.fromAccountId : null,
          transferDate
        ),
        refreshAccountFromDate(
          typeof payload.toAccountId === 'string'
            ? payload.toAccountId
            : typeof payload.counterpartyInstrumentId === 'string'
              ? payload.counterpartyInstrumentId
              : null,
          transferDate
        )
      ])

      const refreshed = results.filter(Boolean)

      return refreshed.length
        ? `materialized account_balances for ${refreshed.length} instrument(s) via ${eventType}`
        : null
    }

    if (
      eventType === 'finance.reconciliation_period.reconciled'
      || eventType === 'finance.reconciliation_period.closed'
    ) {
      const accountId = typeof payload.accountId === 'string' ? payload.accountId : null
      const year = typeof payload.year === 'number' ? payload.year : null
      const month = typeof payload.month === 'number' ? payload.month : null

      if (accountId && year && month) {
        const periodDate = `${year}-${String(month).padStart(2, '0')}-01`
        const result = await refreshAccountFromDate(accountId, periodDate)

        return result
          ? `materialized account_balances for ${result.accountId} from ${result.date} via ${eventType}`
          : null
      }
    }

    return null
  },
  maxRetries: 2
}
