import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  FinanceValidationError,
  normalizeString,
  resolveExchangeRateToClp,
  roundCurrency,
  toDateString,
  toNumber,
  type FinanceCurrency
} from '@/lib/finance/shared'

type QueryableClient = Pick<PoolClient, 'query'>

type SettlementPaymentType = 'income_payment' | 'expense_payment'
type SettlementDirection = 'incoming' | 'outgoing'
type SettlementMode = 'direct' | 'via_intermediary' | 'mixed'
export type SettlementLegType = 'receipt' | 'payout' | 'internal_transfer' | 'funding' | 'fx_conversion' | 'fee'

type PaymentSettlementContextRow = {
  payment_id: string
  payment_date: string | Date | null
  amount: unknown
  currency: string | null
  reference: string | null
  payment_source: string | null
  payment_account_id: string | null
  amount_clp: unknown
  exchange_rate_at_payment: unknown
  notes: string | null
}

export interface SettlementConfigurationInput {
  settlementMode?: SettlementMode | null
  fundingInstrumentId?: string | null
  intermediaryInstrumentId?: string | null
  intermediaryMode?: 'counterparty_only' | 'funding_balance' | null
  feeAmount?: number | null
  feeCurrency?: string | null
  feeReference?: string | null
}

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
  settlementConfig?: SettlementConfigurationInput | null
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

export interface SettlementGroupRecord {
  settlementGroupId: string
  groupDirection: string
  settlementMode: string
  sourcePaymentType: string | null
  sourcePaymentId: string | null
  primaryInstrumentId: string | null
  providerReference: string | null
  providerStatus: string
  notes: string | null
}

export interface SettlementLegRecord {
  settlementLegId: string
  settlementGroupId: string
  linkedPaymentType: string | null
  linkedPaymentId: string | null
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
  isReconciled: boolean
  reconciliationRowId: string | null
  notes: string | null
}

export interface SettlementPaymentDetail {
  paymentType: 'income' | 'expense'
  paymentId: string
  settlementGroup: SettlementGroupRecord
  settlementLegs: SettlementLegRecord[]
}

export interface RecordSupplementalSettlementLegInput {
  client?: QueryableClient
  paymentType: 'income' | 'expense'
  paymentId: string
  legType: Exclude<SettlementLegType, 'receipt' | 'payout'>
  direction?: SettlementDirection | null
  instrumentId?: string | null
  counterpartyInstrumentId?: string | null
  amount: number
  currency?: string | null
  amountClp?: number | null
  exchangeRate?: number | null
  providerReference?: string | null
  providerStatus?: string | null
  transactionDate?: string | null
  actorUserId?: string | null
  notes?: string | null
}

type SettlementLegDraft = {
  settlementLegId: string
  legType: SettlementLegType
  direction: SettlementDirection
  instrumentId: string | null
  counterpartyInstrumentId: string | null
  currency: string
  amount: number
  amountClp: number | null
  exchangeRate: number | null
  providerReference: string | null
  providerStatus: string
  transactionDate: string | null
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

const mapSettlementGroup = (group: SettlementGroupRow): SettlementGroupRecord => ({
  settlementGroupId: normalizeString(group.settlement_group_id),
  groupDirection: normalizeString(group.group_direction),
  settlementMode: normalizeString(group.settlement_mode),
  sourcePaymentType: str(group.source_payment_type),
  sourcePaymentId: str(group.source_payment_id),
  primaryInstrumentId: str(group.primary_instrument_id),
  providerReference: str(group.provider_reference),
  providerStatus: normalizeString(group.provider_status),
  notes: str(group.notes)
})

const directionForPayment = (paymentType: SettlementPaymentType): SettlementDirection =>
  paymentType === 'income_payment' ? 'incoming' : 'outgoing'

const legTypeForPayment = (paymentType: SettlementPaymentType): SettlementLegType =>
  paymentType === 'income_payment' ? 'receipt' : 'payout'

const buildLegId = (paymentId: string, suffix?: string | null) =>
  suffix ? `stlleg-${paymentId}-${suffix}` : `stlleg-${paymentId}`

const getManagedSettlementLegIds = (paymentId: string) => [
  buildLegId(paymentId),
  buildLegId(paymentId, 'funding'),
  buildLegId(paymentId, 'fx'),
  buildLegId(paymentId, 'fee')
]

const computeClpAmount = ({
  amount,
  amountClp,
  exchangeRate,
  currency
}: {
  amount: number
  amountClp?: number | null
  exchangeRate?: number | null
  currency: string
}) => {
  if (amountClp != null) {
    return roundCurrency(amountClp)
  }

  if (currency === 'CLP') {
    return roundCurrency(amount)
  }

  if (exchangeRate != null) {
    return roundCurrency(amount * exchangeRate)
  }

  return null
}

const loadInstrumentCurrencies = async (
  instrumentIds: string[],
  client?: QueryableClient
) => {
  const uniqueIds = [...new Set(instrumentIds.map(id => normalizeString(id)).filter(Boolean))]

  if (uniqueIds.length === 0) {
    return new Map<string, string>()
  }

  const rows = await queryRows<{ account_id: string; currency: string | null }>(
    `
      SELECT account_id, currency
      FROM greenhouse_finance.accounts
      WHERE account_id = ANY($1::text[])
    `,
    [uniqueIds],
    client
  )

  return new Map(
    rows.map(row => [normalizeString(row.account_id), normalizeString(row.currency || 'CLP') || 'CLP'])
  )
}

const buildSettlementLegPlan = async (
  paymentType: SettlementPaymentType,
  input: EnsureSettlementInput
) => {
  const paymentDirection = directionForPayment(paymentType)
  const baseLegType = legTypeForPayment(paymentType)
  const transactionDate = input.paymentDate ? toDateString(input.paymentDate) : null
  const currency = str(input.currency) || 'CLP'
  const amount = roundCurrency(input.amount)

  const amountClp = computeClpAmount({
    amount,
    amountClp: input.amountClp,
    exchangeRate: input.exchangeRate,
    currency
  })

  const exchangeRate = input.exchangeRate != null ? toNumber(input.exchangeRate) : (currency === 'CLP' ? 1 : null)

  const settlementMode = normalizeString(input.settlementConfig?.settlementMode) === 'via_intermediary'
    ? 'via_intermediary'
    : 'direct'

  const fundingInstrumentId = str(input.settlementConfig?.fundingInstrumentId)
  const mainInstrumentId = str(input.paymentAccountId)
  const intermediaryInstrumentId = str(input.settlementConfig?.intermediaryInstrumentId)

  const intermediaryMode = normalizeString(input.settlementConfig?.intermediaryMode) === 'funding_balance'
    ? 'funding_balance'
    : 'counterparty_only'

  // TASK-708 Slice 4 — invariante de defensa estructural: cualquier payment
  // canónico (income_payment / expense_payment) que llega aca DEBE traer su
  // payment_account_id resuelto. Eso ya esta garantizado por:
  //   - el CHECK income/expense_payments_account_required_after_cutover (Slice 0)
  //   - la firma RecordPaymentInput con AccountId branded (Slice 4 sigue)
  // Pero defendemos aca tambien antes de construir la leg principal — el
  // CHECK SQL settlement_legs_principal_requires_instrument lo rechazaria de
  // todas formas, pero la guarda explicita produce error mensajes mas claros.
  if (!mainInstrumentId) {
    throw new FinanceValidationError(
      `TASK-708 Slice 4: cannot build settlement plan for ${paymentType} ${input.paymentId} — paymentAccountId (instrumentId) is required for receipt/payout legs.`,
      400
    )
  }

  const instrumentCurrencyMap = await loadInstrumentCurrencies(
    [fundingInstrumentId, mainInstrumentId, intermediaryInstrumentId].filter((value): value is string => Boolean(value)),
    input.client
  )

  const legs: SettlementLegDraft[] = []

  if (
    paymentType === 'expense_payment'
    && settlementMode === 'via_intermediary'
    && fundingInstrumentId
    && mainInstrumentId
    && fundingInstrumentId !== mainInstrumentId
    && intermediaryMode === 'funding_balance'
  ) {
    const fundingCurrency = instrumentCurrencyMap.get(fundingInstrumentId) || 'CLP'

    legs.push({
      settlementLegId: buildLegId(input.paymentId, 'funding'),
      legType: 'funding',
      direction: 'outgoing',
      instrumentId: fundingInstrumentId,
      counterpartyInstrumentId: mainInstrumentId,
      currency: fundingCurrency,
      amount: fundingCurrency === currency && amountClp == null ? amount : roundCurrency(amountClp ?? amount),
      amountClp: amountClp ?? (fundingCurrency === 'CLP' ? amount : null),
      exchangeRate,
      providerReference: input.providerReference || null,
      providerStatus: 'pending',
      transactionDate,
      notes: input.notes || null
    })

    if (fundingCurrency !== currency) {
      legs.push({
        settlementLegId: buildLegId(input.paymentId, 'fx'),
        legType: 'fx_conversion',
        direction: 'outgoing',
        instrumentId: mainInstrumentId,
        counterpartyInstrumentId: fundingInstrumentId,
        currency,
        amount,
        amountClp,
        exchangeRate,
        providerReference: input.providerReference || null,
        providerStatus: 'pending',
        transactionDate,
        notes: input.notes || null
      })
    }
  }

  legs.push({
    settlementLegId: buildLegId(input.paymentId),
    legType: baseLegType,
    direction: paymentDirection,
    instrumentId: mainInstrumentId,
    counterpartyInstrumentId: settlementMode === 'via_intermediary'
      ? intermediaryInstrumentId ?? fundingInstrumentId
      : null,
    currency,
    amount,
    amountClp,
    exchangeRate,
    providerReference: input.providerReference || null,
    providerStatus: 'pending',
    transactionDate,
    notes: input.notes || null
  })

  const feeAmount = input.settlementConfig?.feeAmount != null
    ? roundCurrency(toNumber(input.settlementConfig.feeAmount))
    : 0

  if (feeAmount > 0) {
    const feeCurrency = str(input.settlementConfig?.feeCurrency) || currency

    legs.push({
      settlementLegId: buildLegId(input.paymentId, 'fee'),
      legType: 'fee',
      direction: 'outgoing',
      instrumentId: mainInstrumentId,
      counterpartyInstrumentId: null,
      currency: feeCurrency,
      amount: feeAmount,
      amountClp: computeClpAmount({
        amount: feeAmount,
        exchangeRate,
        currency: feeCurrency
      }),
      exchangeRate: feeCurrency === 'CLP' ? 1 : exchangeRate,
      providerReference: str(input.settlementConfig?.feeReference) || input.providerReference || null,
      providerStatus: 'pending',
      transactionDate,
      notes: 'Settlement fee'
    })
  }

  const resolvedMode: SettlementMode = settlementMode === 'via_intermediary' || legs.length > 1 ? 'mixed' : 'direct'

  return {
    settlementMode: resolvedMode,
    primaryInstrumentId: mainInstrumentId || fundingInstrumentId || null,
    legs
  }
}

const mapSettlementLeg = (leg: SettlementLegRow): SettlementLegRecord => ({
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
})

const getPaymentContextForSettlement = async (
  paymentType: SettlementPaymentType,
  paymentId: string,
  client?: QueryableClient
) => {
  const tableName = paymentType === 'income_payment'
    ? 'greenhouse_finance.income_payments'
    : 'greenhouse_finance.expense_payments'

  const rows = await queryRows<PaymentSettlementContextRow>(
    `
      SELECT
        payment_id,
        payment_date,
        amount,
        currency,
        reference,
        payment_source,
        payment_account_id,
        amount_clp,
        exchange_rate_at_payment,
        notes
      FROM ${tableName}
      WHERE payment_id = $1
      LIMIT 1
    `,
    [paymentId],
    client
  )

  if (rows.length === 0) {
    throw new FinanceValidationError(`Payment "${paymentId}" not found.`, 404)
  }

  return rows[0]
}

const listSettlementLegRows = async (settlementGroupId: string, client?: QueryableClient) =>
  queryRows<SettlementLegRow>(
    `
      SELECT
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
      FROM greenhouse_finance.settlement_legs
      WHERE settlement_group_id = $1
      ORDER BY
        CASE leg_type
          WHEN 'receipt' THEN 0
          WHEN 'payout' THEN 0
          WHEN 'funding' THEN 1
          WHEN 'internal_transfer' THEN 2
          WHEN 'fx_conversion' THEN 3
          WHEN 'fee' THEN 4
          ELSE 5
        END,
        transaction_date ASC NULLS LAST,
        created_at ASC
    `,
    [settlementGroupId],
    client
  )

const ensureSettlementForPayment = async (
  paymentType: SettlementPaymentType,
  input: EnsureSettlementInput
) => {
  const settlementGroupId = `stlgrp-${input.paymentId}`
  const direction = directionForPayment(paymentType)
  const { settlementMode, primaryInstrumentId, legs } = await buildSettlementLegPlan(paymentType, input)
  const managedLegIds = getManagedSettlementLegIds(input.paymentId)

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
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (settlement_group_id)
      DO UPDATE SET
        settlement_mode = EXCLUDED.settlement_mode,
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
      settlementMode,
      paymentType,
      input.paymentId,
      primaryInstrumentId,
      input.providerReference || null,
      input.notes || null,
      input.actorUserId || null
    ],
    input.client
  )

  const desiredLegIds = legs.map(leg => leg.settlementLegId)

  await queryRows(
    `
      DELETE FROM greenhouse_finance.settlement_legs
      WHERE settlement_group_id = $1
        AND settlement_leg_id = ANY($2::text[])
        AND NOT (settlement_leg_id = ANY($3::text[]))
    `,
    [settlementGroupId, managedLegIds, desiredLegIds],
    input.client
  )

  const legRows: SettlementLegRow[] = []

  for (const leg of legs) {
    const rows = await queryRows<SettlementLegRow>(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (settlement_leg_id)
        DO UPDATE SET
          leg_type = EXCLUDED.leg_type,
          direction = EXCLUDED.direction,
          instrument_id = EXCLUDED.instrument_id,
          counterparty_instrument_id = EXCLUDED.counterparty_instrument_id,
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
        leg.settlementLegId,
        settlementGroupId,
        paymentType,
        input.paymentId,
        leg.legType,
        leg.direction,
        leg.instrumentId,
        leg.counterpartyInstrumentId,
        leg.currency,
        leg.amount,
        leg.amountClp,
        leg.exchangeRate,
        leg.providerReference,
        leg.providerStatus,
        leg.transactionDate,
        leg.notes,
        input.actorUserId || null
      ],
      input.client
    )

    legRows.push(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: 'finance_settlement_leg',
        aggregateId: leg.settlementLegId,
        eventType: 'finance.settlement_leg.recorded',
        payload: {
          settlementGroupId,
          settlementLegId: leg.settlementLegId,
          paymentType,
          paymentId: input.paymentId,
          legType: leg.legType,
          direction: leg.direction,
          instrumentId: leg.instrumentId,
          counterpartyInstrumentId: leg.counterpartyInstrumentId,
          transactionDate: leg.transactionDate,
          amount: leg.amount,
          currency: leg.currency,
          amountClp: leg.amountClp,
          exchangeRate: leg.exchangeRate,
          reference: leg.providerReference,
          paymentSource: input.paymentSource || null
        }
      },
      input.client
    )
  }

  const paymentTable = paymentType === 'income_payment'
    ? 'greenhouse_finance.income_payments'
    : 'greenhouse_finance.expense_payments'

  await queryRows(
    `UPDATE ${paymentTable} SET settlement_group_id = $2 WHERE payment_id = $1`,
    [input.paymentId, settlementGroupId],
    input.client
  )

  const allLegRows = await listSettlementLegRows(settlementGroupId, input.client)
  const effectiveSettlementMode: SettlementMode = allLegRows.length > 1 ? 'mixed' : settlementMode

  if (effectiveSettlementMode !== normalizeString(groupRows[0]?.settlement_mode)) {
    await queryRows(
      `
        UPDATE greenhouse_finance.settlement_groups
        SET
          settlement_mode = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE settlement_group_id = $1
      `,
      [settlementGroupId, effectiveSettlementMode],
      input.client
    )
  }

  const group = {
    ...groupRows[0],
    settlement_mode: effectiveSettlementMode
  }

  return {
    settlementGroup: mapSettlementGroup(group),
    settlementLeg: mapSettlementLeg(legRows[0]),
    settlementLegs: allLegRows.map(mapSettlementLeg)
  }
}

export const ensureSettlementForIncomePayment = (input: EnsureSettlementInput) =>
  ensureSettlementForPayment('income_payment', input)

export const ensureSettlementForExpensePayment = (input: EnsureSettlementInput) =>
  ensureSettlementForPayment('expense_payment', input)

export const getSettlementDetailForPayment = async ({
  paymentType,
  paymentId,
  client
}: {
  paymentType: 'income' | 'expense'
  paymentId: string
  client?: QueryableClient
}): Promise<SettlementPaymentDetail> => {
  const canonicalPaymentType = paymentType === 'income' ? 'income_payment' : 'expense_payment'
  const payment = await getPaymentContextForSettlement(canonicalPaymentType, paymentId, client)

  const ensured = canonicalPaymentType === 'income_payment'
    ? await ensureSettlementForIncomePayment({
        client,
        paymentId,
        paymentAccountId: str(payment.payment_account_id),
        paymentDate: toDateString(payment.payment_date as string | { value?: string } | null),
        amount: toNumber(payment.amount),
        currency: str(payment.currency),
        amountClp: payment.amount_clp != null ? toNumber(payment.amount_clp) : null,
        exchangeRate: payment.exchange_rate_at_payment != null ? toNumber(payment.exchange_rate_at_payment) : null,
        providerReference: str(payment.reference),
        paymentSource: str(payment.payment_source),
        notes: str(payment.notes)
      })
    : await ensureSettlementForExpensePayment({
        client,
        paymentId,
        paymentAccountId: str(payment.payment_account_id),
        paymentDate: toDateString(payment.payment_date as string | { value?: string } | null),
        amount: toNumber(payment.amount),
        currency: str(payment.currency),
        amountClp: payment.amount_clp != null ? toNumber(payment.amount_clp) : null,
        exchangeRate: payment.exchange_rate_at_payment != null ? toNumber(payment.exchange_rate_at_payment) : null,
        providerReference: str(payment.reference),
        paymentSource: str(payment.payment_source),
        notes: str(payment.notes)
      })

  const legs = await listSettlementLegRows(ensured.settlementGroup.settlementGroupId, client)

  return {
    paymentType,
    paymentId,
    settlementGroup: ensured.settlementGroup,
    settlementLegs: legs.map(mapSettlementLeg)
  }
}

export const recordSupplementalSettlementLegForPayment = async (
  input: RecordSupplementalSettlementLegInput
): Promise<SettlementPaymentDetail> => {
  const canonicalPaymentType = input.paymentType === 'income' ? 'income_payment' : 'expense_payment'
  const payment = await getPaymentContextForSettlement(canonicalPaymentType, input.paymentId, input.client)

  const ensured = await getSettlementDetailForPayment({
    paymentType: input.paymentType,
    paymentId: input.paymentId,
    client: input.client
  })

  const direction = input.direction || directionForPayment(canonicalPaymentType)
  const currency = str(input.currency) || str(payment.currency) || 'CLP'
  const amount = roundCurrency(input.amount)

  const transactionDate = input.transactionDate
    ? toDateString(input.transactionDate)
    : toDateString(payment.payment_date as string | { value?: string } | null)

  const exchangeRate = input.exchangeRate != null
    ? toNumber(input.exchangeRate)
    : currency === 'CLP'
      ? 1
      : await resolveExchangeRateToClp({
          currency: currency as FinanceCurrency,
          requestedRate: null
        })

  const amountClp = input.amountClp != null
    ? roundCurrency(input.amountClp)
    : computeClpAmount({
        amount,
        exchangeRate,
        currency
      })

  const settlementLegId = buildLegId(input.paymentId, normalizeString(`${input.legType}-${Date.now()}`))

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
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
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
      ensured.settlementGroup.settlementGroupId,
      canonicalPaymentType,
      input.paymentId,
      input.legType,
      direction,
      input.instrumentId || null,
      input.counterpartyInstrumentId || null,
      currency,
      amount,
      amountClp,
      exchangeRate,
      input.providerReference || null,
      input.providerStatus || 'pending',
      transactionDate,
      input.notes || null,
      input.actorUserId || null
    ],
    input.client
  )

  await queryRows(
    `
      UPDATE greenhouse_finance.settlement_groups
      SET
        settlement_mode = CASE
          WHEN settlement_mode = 'direct' THEN 'mixed'
          ELSE settlement_mode
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE settlement_group_id = $1
    `,
    [ensured.settlementGroup.settlementGroupId],
    input.client
  )

  const recordedLeg = legRows[0]

  await publishOutboxEvent(
    {
      aggregateType: 'finance_settlement_leg',
      aggregateId: settlementLegId,
      eventType: 'finance.settlement_leg.recorded',
      payload: {
        settlementGroupId: ensured.settlementGroup.settlementGroupId,
        settlementLegId,
        paymentType: canonicalPaymentType,
        paymentId: input.paymentId,
        legType: input.legType,
        direction,
        instrumentId: input.instrumentId || null,
        counterpartyInstrumentId: input.counterpartyInstrumentId || null,
        transactionDate,
        amount,
        currency,
        amountClp,
        exchangeRate,
        reference: input.providerReference || null
      }
    },
    input.client
  )

  if (input.legType === 'internal_transfer' || input.legType === 'funding') {
    await publishOutboxEvent(
      {
        aggregateType: 'finance_settlement_leg',
        aggregateId: settlementLegId,
        eventType: 'finance.internal_transfer.recorded',
        payload: {
          settlementGroupId: ensured.settlementGroup.settlementGroupId,
          settlementLegId,
          paymentType: canonicalPaymentType,
          paymentId: input.paymentId,
          legType: input.legType,
          direction,
          instrumentId: input.instrumentId || null,
          counterpartyInstrumentId: input.counterpartyInstrumentId || null,
          amount,
          currency,
          amountClp,
          exchangeRate
        }
      },
      input.client
    )
  }

  if (input.legType === 'fx_conversion') {
    await publishOutboxEvent(
      {
        aggregateType: 'finance_settlement_leg',
        aggregateId: settlementLegId,
        eventType: 'finance.fx_conversion.recorded',
        payload: {
          settlementGroupId: ensured.settlementGroup.settlementGroupId,
          settlementLegId,
          paymentType: canonicalPaymentType,
          paymentId: input.paymentId,
          instrumentId: input.instrumentId || null,
          amount,
          currency,
          amountClp,
          exchangeRate
        }
      },
      input.client
    )
  }

  void recordedLeg

  return getSettlementDetailForPayment({
    paymentType: input.paymentType,
    paymentId: input.paymentId,
    client: input.client
  })
}
