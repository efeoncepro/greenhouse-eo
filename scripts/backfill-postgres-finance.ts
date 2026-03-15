import { BigQuery } from '@google-cloud/bigquery'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '../src/lib/postgres/client'
import { resolveCanonicalProviderId } from '../src/lib/providers/postgres'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
const datasetId = process.env.GREENHOUSE_BIGQUERY_DATASET || 'greenhouse'
const bigQueryLocation = process.env.GREENHOUSE_BIGQUERY_LOCATION || 'US'

const bigQuery = new BigQuery({ projectId })

const tableRef = (tableName: string) => `\`${projectId}.${datasetId}.${tableName}\``

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed ? trimmed : null
  }

  if (typeof value === 'object' && value && 'value' in value) {
    return toNullableString((value as { value?: unknown }).value)
  }

  return String(value)
}

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  const normalized = toNullableString(value)
  const parsed = normalized ? Number(normalized) : Number.NaN

  return Number.isFinite(parsed) ? parsed : fallback
}

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return fallback
}

const queryBigQuery = async <T>(query: string) => {
  const [rows] = await bigQuery.query({
    query,
    location: bigQueryLocation
  })

  return rows as T[]
}

const backfillAccounts = async () => {
  const rows = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        account_id,
        account_name,
        bank_name,
        account_number,
        account_number_full,
        currency,
        account_type,
        country,
        is_active,
        opening_balance,
        opening_balance_date,
        notes,
        created_at,
        updated_at
      FROM ${tableRef('fin_accounts')}
    `
  )

  for (const row of rows) {
    await runGreenhousePostgresQuery(
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
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12, COALESCE($13::timestamptz, CURRENT_TIMESTAMP), COALESCE($14::timestamptz, CURRENT_TIMESTAMP))
        ON CONFLICT (account_id) DO UPDATE
        SET
          account_name = EXCLUDED.account_name,
          bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          account_number_full = EXCLUDED.account_number_full,
          currency = EXCLUDED.currency,
          account_type = EXCLUDED.account_type,
          country_code = EXCLUDED.country_code,
          is_active = EXCLUDED.is_active,
          opening_balance = EXCLUDED.opening_balance,
          opening_balance_date = EXCLUDED.opening_balance_date,
          notes = EXCLUDED.notes,
          updated_at = EXCLUDED.updated_at
      `,
      [
        toNullableString(row.account_id),
        toNullableString(row.account_name),
        toNullableString(row.bank_name),
        toNullableString(row.account_number),
        toNullableString(row.account_number_full),
        toNullableString(row.currency) || 'CLP',
        toNullableString(row.account_type) || 'checking',
        toNullableString(row.country) || 'CL',
        toBoolean(row.is_active, true),
        toNumber(row.opening_balance, 0),
        toNullableString(row.opening_balance_date),
        toNullableString(row.notes),
        toNullableString(row.created_at),
        toNullableString(row.updated_at)
      ]
    )
  }

  return rows.length
}

const backfillSuppliers = async () => {
  const rows = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        supplier_id,
        provider_id,
        legal_name,
        trade_name,
        tax_id,
        tax_id_type,
        country,
        category,
        service_type,
        is_international,
        primary_contact_name,
        primary_contact_email,
        primary_contact_phone,
        website,
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
        created_by,
        created_at,
        updated_at
      FROM ${tableRef('fin_suppliers')}
    `
  )

  for (const row of rows) {
    const supplierId = toNullableString(row.supplier_id)
    const legalName = toNullableString(row.legal_name)

    if (!supplierId || !legalName) {
      continue
    }

    const providerId = resolveCanonicalProviderId({
      supplierId,
      providerId: toNullableString(row.provider_id),
      legalName,
      tradeName: toNullableString(row.trade_name)
    })

    if (providerId) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_core.providers (
            provider_id,
            public_id,
            provider_name,
            legal_name,
            provider_type,
            website_url,
            status,
            active,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, 'financial_vendor', $5, CASE WHEN $6 THEN 'active' ELSE 'inactive' END, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (provider_id) DO UPDATE
          SET
            provider_name = EXCLUDED.provider_name,
            legal_name = COALESCE(EXCLUDED.legal_name, greenhouse_core.providers.legal_name),
            website_url = COALESCE(EXCLUDED.website_url, greenhouse_core.providers.website_url),
            status = EXCLUDED.status,
            active = EXCLUDED.active,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          providerId,
          `provider_${providerId}`,
          toNullableString(row.trade_name) || legalName,
          legalName,
          toNullableString(row.website),
          toBoolean(row.is_active, true)
        ]
      )
    }

    await runGreenhousePostgresQuery(
      `
        INSERT INTO greenhouse_finance.suppliers (
          supplier_id,
          provider_id,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, COALESCE($26::timestamptz, CURRENT_TIMESTAMP), COALESCE($27::timestamptz, CURRENT_TIMESTAMP)
        )
        ON CONFLICT (supplier_id) DO UPDATE
        SET
          provider_id = EXCLUDED.provider_id,
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
      `,
      [
        supplierId,
        providerId || null,
        legalName,
        toNullableString(row.trade_name),
        toNullableString(row.tax_id),
        toNullableString(row.tax_id_type),
        toNullableString(row.country) || 'CL',
        toNullableString(row.category) || 'other',
        toNullableString(row.service_type),
        toBoolean(row.is_international, false),
        toNullableString(row.primary_contact_name),
        toNullableString(row.primary_contact_email),
        toNullableString(row.primary_contact_phone),
        toNullableString(row.website),
        toNullableString(row.bank_name),
        toNullableString(row.bank_account_number),
        toNullableString(row.bank_account_type),
        toNullableString(row.bank_routing),
        toNullableString(row.payment_currency) || 'CLP',
        Math.trunc(toNumber(row.default_payment_terms, 30)),
        toNullableString(row.default_payment_method) || 'transfer',
        toBoolean(row.requires_po, false),
        toBoolean(row.is_active, true),
        toNullableString(row.notes),
        toNullableString(row.created_by),
        toNullableString(row.created_at),
        toNullableString(row.updated_at)
      ]
    )
  }

  return rows.length
}

const backfillExchangeRates = async () => {
  const rows = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        rate_id,
        from_currency,
        to_currency,
        rate,
        rate_date,
        source,
        created_at
      FROM ${tableRef('fin_exchange_rates')}
    `
  )

  for (const row of rows) {
    const rateId = toNullableString(row.rate_id)

    if (!rateId) {
      continue
    }

    await runGreenhousePostgresQuery(
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
        VALUES ($1, $2, $3, $4, $5::date, $6, COALESCE($7::timestamptz, CURRENT_TIMESTAMP), COALESCE($7::timestamptz, CURRENT_TIMESTAMP))
        ON CONFLICT (rate_id) DO UPDATE
        SET
          from_currency = EXCLUDED.from_currency,
          to_currency = EXCLUDED.to_currency,
          rate = EXCLUDED.rate,
          rate_date = EXCLUDED.rate_date,
          source = EXCLUDED.source,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        rateId,
        toNullableString(row.from_currency),
        toNullableString(row.to_currency),
        toNumber(row.rate, 0),
        toNullableString(row.rate_date),
        toNullableString(row.source) || 'manual',
        toNullableString(row.created_at)
      ]
    )
  }

  return rows.length
}

const main = async () => {
  const [accounts, suppliers, exchangeRates] = await Promise.all([
    backfillAccounts(),
    backfillSuppliers(),
    backfillExchangeRates()
  ])

  console.log(
    JSON.stringify(
      {
        backfilled: {
          accounts,
          suppliers,
          exchangeRates
        }
      },
      null,
      2
    )
  )
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
