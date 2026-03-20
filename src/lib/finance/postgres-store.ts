import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import {
  FinanceValidationError,
  normalizeString,
  roundCurrency,
  toDateString,
  toNumber,
  toTimestampString,
  type AccountType,
  type FinanceCurrency,
  type PaymentMethod,
  type SupplierCategory,
  type TaxIdType
} from '@/lib/finance/shared'
import { upsertProviderFromFinanceSupplierInPostgres } from '@/lib/providers/postgres'

type QueryableClient = Pick<PoolClient, 'query'>

type PostgresFinanceAccountRow = {
  account_id: string
  account_name: string
  bank_name: string
  account_number: string | null
  account_number_full: string | null
  currency: string
  account_type: string
  country_code: string
  is_active: boolean
  opening_balance: unknown
  opening_balance_date: string | Date | null
  notes: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type PostgresFinanceSupplierRow = {
  supplier_id: string
  provider_id: string | null
  organization_id: string | null
  legal_name: string
  trade_name: string | null
  tax_id: string | null
  tax_id_type: string | null
  country_code: string
  category: string
  service_type: string | null
  is_international: boolean
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  website_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_type: string | null
  bank_routing: string | null
  payment_currency: string
  default_payment_terms: unknown
  default_payment_method: string | null
  requires_po: boolean
  is_active: boolean
  notes: string | null
  created_by_user_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type PostgresFinanceExchangeRateRow = {
  rate_id: string
  from_currency: string
  to_currency: string
  rate: unknown
  rate_date: string | Date
  source: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

export type FinanceAccountRecord = {
  accountId: string
  accountName: string
  bankName: string
  accountNumber: string | null
  accountNumberFull: string | null
  currency: FinanceCurrency
  accountType: AccountType | string
  country: string
  isActive: boolean
  openingBalance: number
  openingBalanceDate: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type FinanceSupplierRecord = {
  supplierId: string
  providerId: string | null
  organizationId: string | null
  legalName: string
  tradeName: string | null
  taxId: string | null
  taxIdType: TaxIdType | string | null
  country: string
  category: SupplierCategory | string
  serviceType: string | null
  isInternational: boolean
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
  website: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountType: string | null
  bankRouting: string | null
  paymentCurrency: FinanceCurrency | string
  defaultPaymentTerms: number
  defaultPaymentMethod: PaymentMethod | string | null
  requiresPo: boolean
  isActive: boolean
  notes: string | null
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type FinanceExchangeRateRecord = {
  rateId: string
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
  rate: number
  rateDate: string
  source: string
  createdAt: string | null
  updatedAt: string | null
}

const FINANCE_POSTGRES_REQUIRED_TABLES = [
  'greenhouse_core.providers',
  'greenhouse_sync.outbox_events',
  'greenhouse_finance.accounts',
  'greenhouse_finance.suppliers',
  'greenhouse_finance.exchange_rates'
] as const

let financePostgresReadyPromise: Promise<void> | null = null
let financePostgresReadyAt = 0

const FINANCE_POSTGRES_READY_TTL_MS = 60_000

const mapAccount = (row: PostgresFinanceAccountRow): FinanceAccountRecord => ({
  accountId: normalizeString(row.account_id),
  accountName: normalizeString(row.account_name),
  bankName: normalizeString(row.bank_name),
  accountNumber: row.account_number ? normalizeString(row.account_number) : null,
  accountNumberFull: row.account_number_full ? normalizeString(row.account_number_full) : null,
  currency: normalizeString(row.currency) as FinanceCurrency,
  accountType: normalizeString(row.account_type),
  country: normalizeString(row.country_code) || 'CL',
  isActive: Boolean(row.is_active),
  openingBalance: toNumber(row.opening_balance),
  openingBalanceDate: toDateString(row.opening_balance_date as string | { value?: string } | null),
  notes: row.notes ? normalizeString(row.notes) : null,
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

const mapSupplier = (row: PostgresFinanceSupplierRow): FinanceSupplierRecord => ({
  supplierId: normalizeString(row.supplier_id),
  providerId: row.provider_id ? normalizeString(row.provider_id) : null,
  organizationId: row.organization_id ? normalizeString(row.organization_id) : null,
  legalName: normalizeString(row.legal_name),
  tradeName: row.trade_name ? normalizeString(row.trade_name) : null,
  taxId: row.tax_id ? normalizeString(row.tax_id) : null,
  taxIdType: row.tax_id_type ? normalizeString(row.tax_id_type) : null,
  country: normalizeString(row.country_code) || 'CL',
  category: normalizeString(row.category),
  serviceType: row.service_type ? normalizeString(row.service_type) : null,
  isInternational: Boolean(row.is_international),
  primaryContactName: row.primary_contact_name ? normalizeString(row.primary_contact_name) : null,
  primaryContactEmail: row.primary_contact_email ? normalizeString(row.primary_contact_email) : null,
  primaryContactPhone: row.primary_contact_phone ? normalizeString(row.primary_contact_phone) : null,
  website: row.website_url ? normalizeString(row.website_url) : null,
  bankName: row.bank_name ? normalizeString(row.bank_name) : null,
  bankAccountNumber: row.bank_account_number ? normalizeString(row.bank_account_number) : null,
  bankAccountType: row.bank_account_type ? normalizeString(row.bank_account_type) : null,
  bankRouting: row.bank_routing ? normalizeString(row.bank_routing) : null,
  paymentCurrency: normalizeString(row.payment_currency) as FinanceCurrency,
  defaultPaymentTerms: toNumber(row.default_payment_terms),
  defaultPaymentMethod: row.default_payment_method ? normalizeString(row.default_payment_method) : null,
  requiresPo: Boolean(row.requires_po),
  isActive: Boolean(row.is_active),
  notes: row.notes ? normalizeString(row.notes) : null,
  createdBy: row.created_by_user_id ? normalizeString(row.created_by_user_id) : null,
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

const mapExchangeRate = (row: PostgresFinanceExchangeRateRow): FinanceExchangeRateRecord => ({
  rateId: normalizeString(row.rate_id),
  fromCurrency: normalizeString(row.from_currency) as FinanceCurrency,
  toCurrency: normalizeString(row.to_currency) as FinanceCurrency,
  rate: roundCurrency(toNumber(row.rate)),
  rateDate: toDateString(row.rate_date as string | { value?: string } | null) || '',
  source: row.source ? normalizeString(row.source) : 'manual',
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: QueryableClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const getExistingFinanceTables = async () => {
  const rows = await runGreenhousePostgresQuery<{ qualified_name: string }>(
    `
      SELECT schemaname || '.' || tablename AS qualified_name
      FROM pg_tables
      WHERE schemaname = ANY($1::text[])
    `,
    [['greenhouse_core', 'greenhouse_sync', 'greenhouse_finance']]
  )

  return new Set(rows.map(row => row.qualified_name))
}

const publishFinanceOutboxEvent = async ({
  client,
  aggregateType,
  aggregateId,
  eventType,
  payload
}: {
  client: QueryableClient
  aggregateType: string
  aggregateId: string
  eventType: string
  payload: Record<string, unknown>
}) => {
  await queryRows(
    `
      INSERT INTO greenhouse_sync.outbox_events (
        event_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload_json,
        status,
        occurred_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', CURRENT_TIMESTAMP)
    `,
    [randomUUID(), aggregateType, aggregateId, eventType, JSON.stringify(payload)],
    client
  )
}

export const isFinancePostgresEnabled = () => isGreenhousePostgresConfigured()

export const assertFinancePostgresReady = async () => {
  if (!isFinancePostgresEnabled()) {
    throw new FinanceValidationError(
      'Finance Postgres store is not configured in this environment.',
      503,
      { missingConfig: true },
      'FINANCE_POSTGRES_NOT_CONFIGURED'
    )
  }

  if (Date.now() - financePostgresReadyAt < FINANCE_POSTGRES_READY_TTL_MS) {
    return
  }

  if (financePostgresReadyPromise) {
    return financePostgresReadyPromise
  }

  financePostgresReadyPromise = (async () => {
    const existingTables = await getExistingFinanceTables()
    const missingTables = FINANCE_POSTGRES_REQUIRED_TABLES.filter(tableName => !existingTables.has(tableName))

    if (missingTables.length > 0) {
      throw new FinanceValidationError(
        'Finance Postgres schema is not ready in this environment. Run the PostgreSQL finance bootstrap before using this slice.',
        503,
        { missingTables },
        'FINANCE_POSTGRES_SCHEMA_NOT_READY'
      )
    }

    financePostgresReadyAt = Date.now()
  })().catch(error => {
    financePostgresReadyPromise = null
    throw error
  })

  return financePostgresReadyPromise.finally(() => {
    financePostgresReadyPromise = null
  })
}

export const shouldFallbackFromFinancePostgres = (error: unknown) => {
  if (error instanceof FinanceValidationError) {
    return error.code === 'FINANCE_POSTGRES_NOT_CONFIGURED' || error.code === 'FINANCE_POSTGRES_SCHEMA_NOT_READY'
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  return (
    message.includes('finance postgres store is not configured') ||
    message.includes('finance postgres schema is not ready') ||
    message.includes('greenhouse postgres is not configured') ||
    message.includes('cloud sql') ||
    message.includes('cloudsql') ||
    message.includes('not authorized') ||
    message.includes('econnrefused') ||
    message.includes('timeout') ||
    message.includes('connect')
  )
}

export const listFinanceAccountsFromPostgres = async ({ includeInactive = false }: { includeInactive?: boolean } = {}) => {
  await assertFinancePostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresFinanceAccountRow>(
    `
      SELECT
        account_id,
        account_name,
        bank_name,
        account_number,
        account_number_full,
        currency,
        account_type,
        country_code,
        is_active,
        opening_balance,
        opening_balance_date,
        notes,
        created_at,
        updated_at
      FROM greenhouse_finance.accounts
      WHERE ($1::boolean = TRUE OR is_active = TRUE)
      ORDER BY account_name ASC
    `,
    [includeInactive]
  )

  return rows.map(mapAccount)
}

export const getFinanceAccountFromPostgres = async (accountId: string) => {
  await assertFinancePostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresFinanceAccountRow>(
    `
      SELECT
        account_id,
        account_name,
        bank_name,
        account_number,
        account_number_full,
        currency,
        account_type,
        country_code,
        is_active,
        opening_balance,
        opening_balance_date,
        notes,
        created_at,
        updated_at
      FROM greenhouse_finance.accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId]
  )

  return rows[0] ? mapAccount(rows[0]) : null
}

export const createFinanceAccountInPostgres = async ({
  accountId,
  accountName,
  bankName,
  accountNumber,
  accountNumberFull,
  currency,
  accountType,
  country,
  openingBalance,
  openingBalanceDate,
  notes,
  actorUserId
}: {
  accountId: string
  accountName: string
  bankName: string
  accountNumber: string | null
  accountNumberFull: string | null
  currency: FinanceCurrency
  accountType: AccountType
  country: string
  openingBalance: number
  openingBalanceDate: string | null
  notes: string | null
  actorUserId: string | null
}) => {
  await assertFinancePostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    const existing = await queryRows<{ account_id: string }>(
      'SELECT account_id FROM greenhouse_finance.accounts WHERE account_id = $1 LIMIT 1',
      [accountId],
      client
    )

    if (existing.length > 0) {
      throw new FinanceValidationError(`Account ${accountId} already exists.`, 409)
    }

    const rows = await queryRows<PostgresFinanceAccountRow>(
      `
        INSERT INTO greenhouse_finance.accounts (
          account_id,
          account_name,
          bank_name,
          account_number,
          account_number_full,
          currency,
          account_type,
          country_code,
          is_active,
          opening_balance,
          opening_balance_date,
          notes,
          created_by_user_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10::date, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING
          account_id,
          account_name,
          bank_name,
          account_number,
          account_number_full,
          currency,
          account_type,
          country_code,
          is_active,
          opening_balance,
          opening_balance_date,
          notes,
          created_at,
          updated_at
      `,
      [
        accountId,
        accountName,
        bankName,
        accountNumber,
        accountNumberFull,
        currency,
        accountType,
        country,
        openingBalance,
        openingBalanceDate,
        notes,
        actorUserId
      ],
      client
    )

    const created = mapAccount(rows[0])

    await publishFinanceOutboxEvent({
      client,
      aggregateType: 'finance_account',
      aggregateId: accountId,
      eventType: 'finance.account.created',
      payload: created
    })

    return created
  })
}

export const updateFinanceAccountInPostgres = async ({
  accountId,
  accountName,
  bankName,
  currency,
  accountType,
  country,
  isActive,
  openingBalance,
  openingBalanceDate,
  accountNumber,
  accountNumberFull,
  notes
}: {
  accountId: string
  accountName?: string
  bankName?: string
  currency?: FinanceCurrency
  accountType?: AccountType
  country?: string
  isActive?: boolean
  openingBalance?: number
  openingBalanceDate?: string | null
  accountNumber?: string | null
  accountNumberFull?: string | null
  notes?: string | null
}) => {
  await assertFinancePostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    const existing = await queryRows<{ account_id: string }>(
      'SELECT account_id FROM greenhouse_finance.accounts WHERE account_id = $1 LIMIT 1',
      [accountId],
      client
    )

    if (existing.length === 0) {
      throw new FinanceValidationError('Account not found', 404)
    }

    const updates: string[] = []
    const values: unknown[] = [accountId]

    const pushUpdate = (column: string, value: unknown) => {
      values.push(value)
      updates.push(`${column} = $${values.length}`)
    }

    if (accountName !== undefined) pushUpdate('account_name', accountName)
    if (bankName !== undefined) pushUpdate('bank_name', bankName)
    if (currency !== undefined) pushUpdate('currency', currency)
    if (accountType !== undefined) pushUpdate('account_type', accountType)
    if (country !== undefined) pushUpdate('country_code', country)
    if (isActive !== undefined) pushUpdate('is_active', isActive)
    if (openingBalance !== undefined) pushUpdate('opening_balance', openingBalance)
    if (openingBalanceDate !== undefined) pushUpdate('opening_balance_date', openingBalanceDate)
    if (accountNumber !== undefined) pushUpdate('account_number', accountNumber)
    if (accountNumberFull !== undefined) pushUpdate('account_number_full', accountNumberFull)
    if (notes !== undefined) pushUpdate('notes', notes)

    if (updates.length === 0) {
      throw new FinanceValidationError('No fields to update')
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')

    const rows = await queryRows<PostgresFinanceAccountRow>(
      `
        UPDATE greenhouse_finance.accounts
        SET ${updates.join(', ')}
        WHERE account_id = $1
        RETURNING
          account_id,
          account_name,
          bank_name,
          account_number,
          account_number_full,
          currency,
          account_type,
          country_code,
          is_active,
          opening_balance,
          opening_balance_date,
          notes,
          created_at,
          updated_at
      `,
      values,
      client
    )

    const updated = mapAccount(rows[0])

    await publishFinanceOutboxEvent({
      client,
      aggregateType: 'finance_account',
      aggregateId: accountId,
      eventType: 'finance.account.updated',
      payload: updated
    })

    return updated
  })
}

export const listFinanceSuppliersFromPostgres = async ({
  category,
  country,
  international,
  active = true
}: {
  category?: string | null
  country?: string | null
  international?: boolean | null
  active?: boolean | null
} = {}) => {
  await assertFinancePostgresReady()

  const values: unknown[] = [category || null, country || null, international, active]

  const rows = await runGreenhousePostgresQuery<PostgresFinanceSupplierRow>(
    `
      SELECT
        supplier_id,
        provider_id,
        organization_id,
        legal_name,
        trade_name,
        tax_id,
        tax_id_type,
        country_code,
        category,
        service_type,
        is_international,
        primary_contact_name,
        primary_contact_email,
        primary_contact_phone,
        website_url,
        bank_name,
        bank_account_number,
        bank_account_type,
        bank_routing,
        payment_currency,
        default_payment_terms,
        default_payment_method,
        requires_po,
        is_active,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      FROM greenhouse_finance.suppliers
      WHERE ($1::text IS NULL OR category = $1)
        AND ($2::text IS NULL OR country_code = $2)
        AND ($3::boolean IS NULL OR is_international = $3)
        AND ($4::boolean IS NULL OR is_active = $4)
      ORDER BY COALESCE(trade_name, legal_name) ASC
    `,
    values
  )

  return rows.map(mapSupplier)
}

export const listFinanceExchangeRatesFromPostgres = async ({
  fromDate,
  toDate
}: {
  fromDate?: string | null
  toDate?: string | null
} = {}) => {
  await assertFinancePostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresFinanceExchangeRateRow>(
    `
      SELECT
        rate_id,
        from_currency,
        to_currency,
        rate,
        rate_date,
        source,
        created_at,
        updated_at
      FROM greenhouse_finance.exchange_rates
      WHERE ($1::date IS NULL OR rate_date >= $1::date)
        AND ($2::date IS NULL OR rate_date <= $2::date)
      ORDER BY rate_date DESC, from_currency ASC, to_currency ASC
      LIMIT 200
    `,
    [fromDate || null, toDate || null]
  )

  return rows.map(mapExchangeRate)
}

export const getLatestFinanceExchangeRateFromPostgres = async ({
  fromCurrency,
  toCurrency
}: {
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
}) => {
  await assertFinancePostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresFinanceExchangeRateRow>(
    `
      SELECT
        rate_id,
        from_currency,
        to_currency,
        rate,
        rate_date,
        source,
        created_at,
        updated_at
      FROM greenhouse_finance.exchange_rates
      WHERE from_currency = $1 AND to_currency = $2
      ORDER BY rate_date DESC
      LIMIT 1
    `,
    [fromCurrency, toCurrency]
  )

  return rows[0] ? mapExchangeRate(rows[0]) : null
}

export const upsertFinanceExchangeRateInPostgres = async ({
  rateId,
  fromCurrency,
  toCurrency,
  rate,
  rateDate,
  source
}: {
  rateId: string
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
  rate: number
  rateDate: string
  source: string
}) => {
  await assertFinancePostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    const rows = await queryRows<PostgresFinanceExchangeRateRow>(
      `
        INSERT INTO greenhouse_finance.exchange_rates (
          rate_id,
          from_currency,
          to_currency,
          rate,
          rate_date,
          source,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5::date, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (rate_id) DO UPDATE
        SET
          from_currency = EXCLUDED.from_currency,
          to_currency = EXCLUDED.to_currency,
          rate = EXCLUDED.rate,
          rate_date = EXCLUDED.rate_date,
          source = EXCLUDED.source,
          updated_at = CURRENT_TIMESTAMP
        RETURNING
          rate_id,
          from_currency,
          to_currency,
          rate,
          rate_date,
          source,
          created_at,
          updated_at
      `,
      [rateId, fromCurrency, toCurrency, rate, rateDate, source],
      client
    )

    const persisted = mapExchangeRate(rows[0])

    await publishFinanceOutboxEvent({
      client,
      aggregateType: 'finance_exchange_rate',
      aggregateId: rateId,
      eventType: 'finance.exchange_rate.upserted',
      payload: persisted
    })

    return persisted
  })
}

export const seedFinanceSupplierInPostgres = async ({
  supplierId,
  providerId,
  organizationId,
  legalName,
  tradeName,
  taxId,
  taxIdType,
  country,
  category,
  serviceType,
  isInternational,
  primaryContactName,
  primaryContactEmail,
  primaryContactPhone,
  website,
  bankName,
  bankAccountNumber,
  bankAccountType,
  bankRouting,
  paymentCurrency,
  defaultPaymentTerms,
  defaultPaymentMethod,
  requiresPo,
  isActive,
  notes,
  createdBy,
  createdAt,
  updatedAt
}: {
  supplierId: string
  providerId?: string | null
  organizationId?: string | null
  legalName: string
  tradeName?: string | null
  taxId?: string | null
  taxIdType?: string | null
  country?: string | null
  category: string
  serviceType?: string | null
  isInternational?: boolean
  primaryContactName?: string | null
  primaryContactEmail?: string | null
  primaryContactPhone?: string | null
  website?: string | null
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountType?: string | null
  bankRouting?: string | null
  paymentCurrency?: string | null
  defaultPaymentTerms?: number
  defaultPaymentMethod?: string | null
  requiresPo?: boolean
  isActive?: boolean
  notes?: string | null
  createdBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}) => {
  await assertFinancePostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    const provider = await upsertProviderFromFinanceSupplierInPostgres(
      {
        supplierId,
        providerId,
        legalName,
        tradeName,
        website,
        isActive
      },
      client
    )

    const rows = await queryRows<PostgresFinanceSupplierRow>(
      `
        INSERT INTO greenhouse_finance.suppliers (
          supplier_id,
          provider_id,
          organization_id,
          legal_name,
          trade_name,
          tax_id,
          tax_id_type,
          country_code,
          category,
          service_type,
          is_international,
          primary_contact_name,
          primary_contact_email,
          primary_contact_phone,
          website_url,
          bank_name,
          bank_account_number,
          bank_account_type,
          bank_routing,
          payment_currency,
          default_payment_terms,
          default_payment_method,
          requires_po,
          is_active,
          notes,
          created_by_user_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, COALESCE($27::timestamptz, CURRENT_TIMESTAMP), COALESCE($28::timestamptz, CURRENT_TIMESTAMP)
        )
        ON CONFLICT (supplier_id) DO UPDATE
        SET
          provider_id = EXCLUDED.provider_id,
          organization_id = COALESCE(EXCLUDED.organization_id, greenhouse_finance.suppliers.organization_id),
          legal_name = EXCLUDED.legal_name,
          trade_name = EXCLUDED.trade_name,
          tax_id = EXCLUDED.tax_id,
          tax_id_type = EXCLUDED.tax_id_type,
          country_code = EXCLUDED.country_code,
          category = EXCLUDED.category,
          service_type = EXCLUDED.service_type,
          is_international = EXCLUDED.is_international,
          primary_contact_name = EXCLUDED.primary_contact_name,
          primary_contact_email = EXCLUDED.primary_contact_email,
          primary_contact_phone = EXCLUDED.primary_contact_phone,
          website_url = EXCLUDED.website_url,
          bank_name = EXCLUDED.bank_name,
          bank_account_number = EXCLUDED.bank_account_number,
          bank_account_type = EXCLUDED.bank_account_type,
          bank_routing = EXCLUDED.bank_routing,
          payment_currency = EXCLUDED.payment_currency,
          default_payment_terms = EXCLUDED.default_payment_terms,
          default_payment_method = EXCLUDED.default_payment_method,
          requires_po = EXCLUDED.requires_po,
          is_active = EXCLUDED.is_active,
          notes = EXCLUDED.notes,
          created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, greenhouse_finance.suppliers.created_by_user_id),
          updated_at = COALESCE(EXCLUDED.updated_at, CURRENT_TIMESTAMP)
        RETURNING
          supplier_id,
          provider_id,
          organization_id,
          legal_name,
          trade_name,
          tax_id,
          tax_id_type,
          country_code,
          category,
          service_type,
          is_international,
          primary_contact_name,
          primary_contact_email,
          primary_contact_phone,
          website_url,
          bank_name,
          bank_account_number,
          bank_account_type,
          bank_routing,
          payment_currency,
          default_payment_terms,
          default_payment_method,
          requires_po,
          is_active,
          notes,
          created_by_user_id,
          created_at,
          updated_at
      `,
      [
        supplierId,
        provider?.providerId ?? providerId ?? null,
        organizationId ?? null,
        legalName,
        tradeName ?? null,
        taxId ?? null,
        taxIdType ?? null,
        country ?? 'CL',
        category,
        serviceType ?? null,
        isInternational ?? false,
        primaryContactName ?? null,
        primaryContactEmail ?? null,
        primaryContactPhone ?? null,
        website ?? null,
        bankName ?? null,
        bankAccountNumber ?? null,
        bankAccountType ?? null,
        bankRouting ?? null,
        paymentCurrency ?? 'CLP',
        defaultPaymentTerms ?? 30,
        defaultPaymentMethod ?? 'transfer',
        requiresPo ?? false,
        isActive ?? true,
        notes ?? null,
        createdBy ?? null,
        createdAt ?? null,
        updatedAt ?? null
      ],
      client
    )

    return mapSupplier(rows[0])
  })
}
