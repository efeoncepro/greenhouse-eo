import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  FinanceValidationError,
  assertDateString,
  normalizeString,
  resolveExchangeRate,
  roundCurrency,
  toDateString,
  toNumber,
  type FinanceCurrency
} from '@/lib/finance/shared'
import { rematerializeAccountBalancesFromDate } from '@/lib/finance/account-balances'

type QueryableClient = Pick<PoolClient, 'query'>

type AccountRow = {
  account_id: string
  account_name: string
  currency: string
  is_active: boolean
}

type SettlementGroupRow = {
  settlement_group_id: string
  group_direction: string
  settlement_mode: string
  primary_instrument_id: string | null
}

type SettlementLegRow = {
  settlement_leg_id: string
  settlement_group_id: string
  leg_type: string
  direction: string
  instrument_id: string | null
  counterparty_instrument_id: string | null
  amount: unknown
  currency: string
  amount_clp: unknown
  fx_rate: unknown
  provider_reference: string | null
  provider_status: string
  transaction_date: string | Date | null
}

export type RecordInternalTransferInput = {
  fromAccountId: string
  toAccountId: string
  amount: number
  currency?: string | null
  transferDate: string
  reference?: string | null
  notes?: string | null
  exchangeRateOverride?: number | null
  actorUserId?: string | null
}

export type InternalTransferRecord = {
  settlementGroupId: string
  transferReference: string | null
  transferDate: string
  fromAccountId: string
  toAccountId: string
  fromCurrency: string
  toCurrency: string
  amount: number
  convertedAmount: number
  exchangeRate: number | null
  legs: Array<{
    settlementLegId: string
    legType: string
    direction: string
    instrumentId: string | null
    counterpartyInstrumentId: string | null
    amount: number
    currency: string
    amountClp: number | null
    exchangeRate: number | null
    providerReference: string | null
    providerStatus: string
    transactionDate: string | null
  }>
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

  return query<T>(text, values)
}

const getAccount = async (accountId: string, client?: QueryableClient) => {
  const rows = await queryRows<AccountRow>(
    `
      SELECT account_id, account_name, currency, is_active
      FROM greenhouse_finance.accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId],
    client
  )

  const account = rows[0]

  if (!account) {
    throw new FinanceValidationError(`Account "${accountId}" not found.`, 404)
  }

  if (!account.is_active) {
    throw new FinanceValidationError(`Account "${accountId}" is inactive.`, 409)
  }

  return account
}

const buildLegId = (groupId: string, suffix: string) => `${groupId}-${suffix}`

const mapSettlementLeg = (row: SettlementLegRow) => ({
  settlementLegId: normalizeString(row.settlement_leg_id),
  legType: normalizeString(row.leg_type),
  direction: normalizeString(row.direction),
  instrumentId: row.instrument_id ? normalizeString(row.instrument_id) : null,
  counterpartyInstrumentId: row.counterparty_instrument_id ? normalizeString(row.counterparty_instrument_id) : null,
  amount: roundCurrency(toNumber(row.amount)),
  currency: normalizeString(row.currency),
  amountClp: row.amount_clp != null ? roundCurrency(toNumber(row.amount_clp)) : null,
  exchangeRate: row.fx_rate != null ? toNumber(row.fx_rate) : null,
  providerReference: row.provider_reference ? normalizeString(row.provider_reference) : null,
  providerStatus: normalizeString(row.provider_status),
  transactionDate: toDateString(row.transaction_date)
})

export const recordInternalTransfer = async (
  input: RecordInternalTransferInput
): Promise<InternalTransferRecord> => {
  const transferDate = assertDateString(input.transferDate, 'transferDate')
  const amount = roundCurrency(toNumber(input.amount))

  if (amount <= 0) {
    throw new FinanceValidationError('amount must be greater than zero.')
  }

  if (input.fromAccountId === input.toAccountId) {
    throw new FinanceValidationError('fromAccountId and toAccountId must be different.')
  }

  return withTransaction(async client => {
    const [fromAccount, toAccount] = await Promise.all([
      getAccount(input.fromAccountId, client),
      getAccount(input.toAccountId, client)
    ])

    const sourceCurrency = normalizeString(input.currency || fromAccount.currency || 'CLP') as FinanceCurrency
    const fromCurrency = normalizeString(fromAccount.currency || 'CLP') as FinanceCurrency
    const toCurrency = normalizeString(toAccount.currency || 'CLP') as FinanceCurrency

    if (sourceCurrency !== fromCurrency) {
      throw new FinanceValidationError(
        `Transfer currency "${sourceCurrency}" must match source account currency "${fromCurrency}".`
      )
    }

    const exchangeRate = fromCurrency === toCurrency
      ? 1
      : await resolveExchangeRate({
          fromCurrency,
          toCurrency,
          requestedRate: input.exchangeRateOverride ?? null
        })

    const convertedAmount = fromCurrency === toCurrency
      ? amount
      : roundCurrency(amount * exchangeRate)

    const amountClp = fromCurrency === 'CLP'
      ? amount
      : roundCurrency(
          amount * await resolveExchangeRate({
            fromCurrency,
            toCurrency: 'CLP',
            requestedRate: fromCurrency === 'USD' ? input.exchangeRateOverride ?? null : null
          })
        )

    const settlementGroupId = `stlgrp-trf-${randomUUID()}`
    const transferReference = normalizeString(input.reference) || null

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
        VALUES (
          $1,
          'internal',
          'internal_transfer',
          NULL,
          NULL,
          $2,
          $3,
          'pending',
          $4,
          $5,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING settlement_group_id, group_direction, settlement_mode, primary_instrument_id
      `,
      [settlementGroupId, input.fromAccountId, transferReference, input.notes || null, input.actorUserId || null],
      client
    )

    void groupRows

    const legsToInsert = [
      {
        settlementLegId: buildLegId(settlementGroupId, 'out'),
        legType: 'internal_transfer',
        direction: 'outgoing',
        instrumentId: input.fromAccountId,
        counterpartyInstrumentId: input.toAccountId,
        amount,
        currency: fromCurrency,
        amountClp,
        fxRate: fromCurrency === 'CLP' ? 1 : null
      },
      {
        settlementLegId: buildLegId(settlementGroupId, 'in'),
        legType: 'internal_transfer',
        direction: 'incoming',
        instrumentId: input.toAccountId,
        counterpartyInstrumentId: input.fromAccountId,
        amount: convertedAmount,
        currency: toCurrency,
        amountClp: toCurrency === 'CLP' ? convertedAmount : amountClp,
        fxRate: fromCurrency === toCurrency ? 1 : exchangeRate
      }
    ]

    if (fromCurrency !== toCurrency) {
      legsToInsert.push(
        {
          settlementLegId: buildLegId(settlementGroupId, 'fx-out'),
          legType: 'fx_conversion',
          direction: 'outgoing',
          instrumentId: input.fromAccountId,
          counterpartyInstrumentId: input.toAccountId,
          amount,
          currency: fromCurrency,
          amountClp,
          fxRate: exchangeRate
        },
        {
          settlementLegId: buildLegId(settlementGroupId, 'fx-in'),
          legType: 'fx_conversion',
          direction: 'incoming',
          instrumentId: input.toAccountId,
          counterpartyInstrumentId: input.fromAccountId,
          amount: convertedAmount,
          currency: toCurrency,
          amountClp: toCurrency === 'CLP' ? convertedAmount : amountClp,
          fxRate: exchangeRate
        }
      )
    }

    const recordedLegs: SettlementLegRow[] = []

    for (const leg of legsToInsert) {
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
          VALUES (
            $1, $2, NULL, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12::date, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          RETURNING
            settlement_leg_id,
            settlement_group_id,
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
            transaction_date
        `,
        [
          leg.settlementLegId,
          settlementGroupId,
          leg.legType,
          leg.direction,
          leg.instrumentId,
          leg.counterpartyInstrumentId,
          leg.currency,
          leg.amount,
          leg.amountClp,
          leg.fxRate,
          transferReference,
          transferDate,
          input.notes || null,
          input.actorUserId || null
        ],
        client
      )

      recordedLegs.push(legRows[0])

      await publishOutboxEvent(
        {
          aggregateType: 'finance_settlement_leg',
          aggregateId: leg.settlementLegId,
          eventType: 'finance.settlement_leg.recorded',
          payload: {
            settlementGroupId,
            settlementLegId: leg.settlementLegId,
            legType: leg.legType,
            direction: leg.direction,
            instrumentId: leg.instrumentId,
            counterpartyInstrumentId: leg.counterpartyInstrumentId,
            transactionDate: transferDate,
            amount: leg.amount,
            currency: leg.currency,
            amountClp: leg.amountClp,
            exchangeRate: leg.fxRate,
            reference: transferReference
          }
        },
        client
      )
    }

    await publishOutboxEvent(
      {
        aggregateType: 'finance_settlement_group',
        aggregateId: settlementGroupId,
        eventType: 'finance.internal_transfer.recorded',
        payload: {
          settlementGroupId,
          transferDate,
          reference: transferReference,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          fromCurrency,
          toCurrency,
          amount,
          convertedAmount,
          exchangeRate: fromCurrency === toCurrency ? null : exchangeRate
        }
      },
      client
    )

    if (fromCurrency !== toCurrency) {
      await publishOutboxEvent(
        {
          aggregateType: 'finance_settlement_group',
          aggregateId: settlementGroupId,
          eventType: 'finance.fx_conversion.recorded',
          payload: {
            settlementGroupId,
            transferDate,
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            fromCurrency,
            toCurrency,
            amount,
            convertedAmount,
            exchangeRate
          }
        },
        client
      )
    }

    await rematerializeAccountBalancesFromDate({
      accountId: input.fromAccountId,
      fromDate: transferDate,
      actorUserId: input.actorUserId || null,
      client
    })

    await rematerializeAccountBalancesFromDate({
      accountId: input.toAccountId,
      fromDate: transferDate,
      actorUserId: input.actorUserId || null,
      client
    })

    return {
      settlementGroupId,
      transferReference,
      transferDate,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount,
      exchangeRate: fromCurrency === toCurrency ? null : exchangeRate,
      legs: recordedLegs.map(mapSettlementLeg)
    }
  })
}
