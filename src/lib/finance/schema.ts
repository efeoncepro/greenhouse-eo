import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { FinanceValidationError } from '@/lib/finance/shared'

let ensureFinanceInfrastructurePromise: Promise<void> | null = null
const financeBigQueryReadinessPromises = new Map<string, Promise<void>>()
const financeBigQueryReadinessCache = new Map<string, number>()
const FINANCE_BIGQUERY_READINESS_TTL_MS = 60_000

const FINANCE_TABLE_DEFINITIONS: Record<string, string> = {
  fin_accounts: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_accounts\` (
      account_id STRING NOT NULL,
      account_name STRING NOT NULL,
      bank_name STRING NOT NULL,
      account_number STRING,
      account_number_full STRING,
      currency STRING NOT NULL,
      account_type STRING NOT NULL,
      country STRING NOT NULL,
      is_active BOOL,
      opening_balance NUMERIC,
      opening_balance_date DATE,
      notes STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  fin_suppliers: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_suppliers\` (
      supplier_id STRING NOT NULL,
      provider_id STRING,
      legal_name STRING NOT NULL,
      trade_name STRING,
      tax_id STRING,
      tax_id_type STRING,
      country STRING NOT NULL,
      category STRING NOT NULL,
      service_type STRING,
      is_international BOOL,
      primary_contact_name STRING,
      primary_contact_email STRING,
      primary_contact_phone STRING,
      website STRING,
      bank_name STRING,
      bank_account_number STRING,
      bank_account_type STRING,
      bank_routing STRING,
      payment_currency STRING,
      default_payment_terms INT64,
      default_payment_method STRING,
      requires_po BOOL,
      is_active BOOL,
      notes STRING,
      created_by STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  fin_client_profiles: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_client_profiles\` (
      client_profile_id STRING NOT NULL,
      client_id STRING,
      hubspot_company_id STRING NOT NULL,
      tax_id STRING,
      tax_id_type STRING,
      legal_name STRING,
      billing_address STRING,
      billing_country STRING,
      payment_terms_days INT64,
      payment_currency STRING,
      requires_po BOOL,
      requires_hes BOOL,
      current_po_number STRING,
      current_hes_number STRING,
      finance_contacts JSON,
      special_conditions STRING,
      created_by STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  fin_income: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_income\` (
      income_id STRING NOT NULL,
      client_id STRING,
      client_profile_id STRING,
      hubspot_company_id STRING,
      hubspot_deal_id STRING,
      client_name STRING NOT NULL,
      invoice_number STRING,
      invoice_date DATE NOT NULL,
      due_date DATE,
      currency STRING NOT NULL,
      subtotal NUMERIC NOT NULL,
      tax_rate NUMERIC,
      tax_amount NUMERIC NOT NULL,
      tax_code STRING,
      tax_rate_snapshot NUMERIC,
      tax_amount_snapshot NUMERIC,
      tax_snapshot_json JSON,
      is_tax_exempt BOOL,
      tax_snapshot_frozen_at TIMESTAMP,
      total_amount NUMERIC NOT NULL,
      exchange_rate_to_clp NUMERIC,
      total_amount_clp NUMERIC NOT NULL,
      payment_status STRING NOT NULL,
      amount_paid NUMERIC,
      payments_received JSON,
      po_number STRING,
      hes_number STRING,
      service_line STRING,
      income_type STRING,
      description STRING,
      is_reconciled BOOL,
      reconciliation_id STRING,
      notes STRING,
      created_by STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  fin_expenses: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_expenses\` (
      expense_id STRING NOT NULL,
      client_id STRING,
      space_id STRING,
      expense_type STRING NOT NULL,
      source_type STRING,
      description STRING NOT NULL,
      currency STRING NOT NULL,
      subtotal NUMERIC NOT NULL,
      tax_rate NUMERIC,
      tax_amount NUMERIC,
      tax_code STRING,
      tax_recoverability STRING,
      tax_rate_snapshot NUMERIC,
      tax_amount_snapshot NUMERIC,
      tax_snapshot_json JSON,
      is_tax_exempt BOOL,
      tax_snapshot_frozen_at TIMESTAMP,
      recoverable_tax_amount NUMERIC,
      recoverable_tax_amount_clp NUMERIC,
      non_recoverable_tax_amount NUMERIC,
      non_recoverable_tax_amount_clp NUMERIC,
      effective_cost_amount NUMERIC,
      effective_cost_amount_clp NUMERIC,
      total_amount NUMERIC NOT NULL,
      exchange_rate_to_clp NUMERIC,
      total_amount_clp NUMERIC NOT NULL,
      payment_date DATE,
      payment_status STRING NOT NULL,
      payment_method STRING,
      payment_provider STRING,
      payment_rail STRING,
      payment_account_id STRING,
      payment_reference STRING,
      document_number STRING,
      document_date DATE,
      due_date DATE,
      supplier_id STRING,
      supplier_name STRING,
      supplier_invoice_number STRING,
      payroll_period_id STRING,
      payroll_entry_id STRING,
      member_id STRING,
      member_name STRING,
      receipt_date DATE,
      purchase_type STRING,
      vat_unrecoverable_amount NUMERIC,
      vat_fixed_assets_amount NUMERIC,
      vat_common_use_amount NUMERIC,
      dte_type_code STRING,
      dte_folio STRING,
      exempt_amount NUMERIC,
      other_taxes_amount NUMERIC,
      withholding_amount NUMERIC,
      social_security_type STRING,
      social_security_institution STRING,
      social_security_period STRING,
      tax_type STRING,
      tax_period STRING,
      tax_form_number STRING,
      miscellaneous_category STRING,
      service_line STRING,
      is_recurring BOOL,
      recurrence_frequency STRING,
      is_reconciled BOOL,
      reconciliation_id STRING,
      notes STRING,
      created_by STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  fin_exchange_rates: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_exchange_rates\` (
      rate_id STRING NOT NULL,
      from_currency STRING NOT NULL,
      to_currency STRING NOT NULL,
      rate NUMERIC NOT NULL,
      rate_date DATE NOT NULL,
      source STRING,
      created_at TIMESTAMP
    )
  `,
  fin_economic_indicators: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_economic_indicators\` (
      indicator_id STRING NOT NULL,
      indicator_code STRING NOT NULL,
      indicator_date DATE NOT NULL,
      value NUMERIC NOT NULL,
      source STRING,
      unit STRING,
      frequency STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `
}

const FINANCE_COLUMN_REQUIREMENTS: Record<string, Record<string, string>> = {
  fin_suppliers: {
    provider_id: 'ALTER TABLE `{projectId}.greenhouse.fin_suppliers` ADD COLUMN IF NOT EXISTS provider_id STRING'
  },
  fin_client_profiles: {
    client_id: 'ALTER TABLE `{projectId}.greenhouse.fin_client_profiles` ADD COLUMN IF NOT EXISTS client_id STRING'
  },
  fin_income: {
    client_id: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS client_id STRING',
    nubox_document_id: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS nubox_document_id STRING',
    nubox_sii_track_id: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS nubox_sii_track_id STRING',
    nubox_emission_status: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS nubox_emission_status STRING',
    dte_type_code: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS dte_type_code STRING',
    dte_folio: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS dte_folio STRING',
    nubox_emitted_at: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS nubox_emitted_at TIMESTAMP',
    nubox_last_synced_at: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS nubox_last_synced_at TIMESTAMP',
    tax_code: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS tax_code STRING',
    tax_rate_snapshot: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS tax_rate_snapshot NUMERIC',
    tax_amount_snapshot: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS tax_amount_snapshot NUMERIC',
    tax_snapshot_json: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS tax_snapshot_json JSON',
    is_tax_exempt: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS is_tax_exempt BOOL',
    tax_snapshot_frozen_at: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS tax_snapshot_frozen_at TIMESTAMP'
  },
  fin_expenses: {
    client_id: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS client_id STRING',
    space_id: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS space_id STRING',
    source_type: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS source_type STRING',
    tax_code: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS tax_code STRING',
    tax_recoverability: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS tax_recoverability STRING',
    tax_rate_snapshot: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS tax_rate_snapshot NUMERIC',
    tax_amount_snapshot: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS tax_amount_snapshot NUMERIC',
    tax_snapshot_json: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS tax_snapshot_json JSON',
    is_tax_exempt: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS is_tax_exempt BOOL',
    tax_snapshot_frozen_at: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS tax_snapshot_frozen_at TIMESTAMP',
    recoverable_tax_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS recoverable_tax_amount NUMERIC',
    recoverable_tax_amount_clp: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS recoverable_tax_amount_clp NUMERIC',
    non_recoverable_tax_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS non_recoverable_tax_amount NUMERIC',
    non_recoverable_tax_amount_clp: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS non_recoverable_tax_amount_clp NUMERIC',
    effective_cost_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS effective_cost_amount NUMERIC',
    effective_cost_amount_clp: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS effective_cost_amount_clp NUMERIC',
    payment_provider: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS payment_provider STRING',
    payment_rail: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS payment_rail STRING',
    receipt_date: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS receipt_date DATE',
    purchase_type: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS purchase_type STRING',
    vat_unrecoverable_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS vat_unrecoverable_amount NUMERIC',
    vat_fixed_assets_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS vat_fixed_assets_amount NUMERIC',
    vat_common_use_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS vat_common_use_amount NUMERIC',
    dte_type_code: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS dte_type_code STRING',
    dte_folio: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS dte_folio STRING',
    exempt_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS exempt_amount NUMERIC',
    other_taxes_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS other_taxes_amount NUMERIC',
    withholding_amount: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS withholding_amount NUMERIC',
    nubox_purchase_id: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_purchase_id STRING',
    nubox_document_status: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_document_status STRING',
    nubox_supplier_rut: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_supplier_rut STRING',
    nubox_origin: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_origin STRING',
    nubox_last_synced_at: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_last_synced_at TIMESTAMP'
  },
}

/** @deprecated Seed kept for backwards compat. Canonical role is finance_admin (TASK-228). */
const FINANCE_MANAGER_ROLE_INSERT = `
  INSERT INTO \`{projectId}.greenhouse.roles\` (
    role_code, role_name, role_family, description, tenant_type,
    is_admin, is_internal, route_group_scope, created_at, updated_at
  )
  VALUES (
    'finance_manager',
    'Finance Manager',
    'internal',
    'Removed — migrated to finance_admin (TASK-248). Retained in BigQuery for historical reference.',
    'efeonce_internal',
    FALSE,
    TRUE,
    ['internal', 'finance'],
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  )
`

const formatProjectStatement = (statement: string, projectId: string) =>
  statement.replaceAll('{projectId}', projectId)

const getExistingFinanceTables = async (projectId: string) => {
  const bigQuery = getBigQueryClient()
  const tableNames = Object.keys(FINANCE_TABLE_DEFINITIONS)

  const [rows] = await bigQuery.query({
    query: `
      SELECT table_name
      FROM \`${projectId}.greenhouse.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name IN UNNEST(@tableNames)
    `,
    params: { tableNames }
  })

  return new Set((rows as Array<{ table_name: string }>).map(row => row.table_name))
}

const getExistingFinanceColumns = async (projectId: string) => {
  const bigQuery = getBigQueryClient()
  const tableNames = Object.keys(FINANCE_COLUMN_REQUIREMENTS)

  const [rows] = await bigQuery.query({
    query: `
      SELECT table_name, column_name
      FROM \`${projectId}.greenhouse.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name IN UNNEST(@tableNames)
    `,
    params: { tableNames }
  })

  return new Set((rows as Array<{ table_name: string; column_name: string }>).map(row => `${row.table_name}.${row.column_name}`))
}

type FinanceBigQueryTableName = keyof typeof FINANCE_TABLE_DEFINITIONS

type AssertFinanceBigQueryReadinessOptions = {
  tables: FinanceBigQueryTableName[]
  includeRequiredColumns?: boolean
}

const getFinanceReadinessKey = (tables: FinanceBigQueryTableName[], includeRequiredColumns: boolean) =>
  `${includeRequiredColumns ? 'with-columns' : 'tables-only'}:${[...new Set(tables)].sort().join(',')}`

export const assertFinanceBigQueryReadiness = async ({
  tables,
  includeRequiredColumns = true
}: AssertFinanceBigQueryReadinessOptions) => {
  const normalizedTables = [...new Set(tables)].sort() as FinanceBigQueryTableName[]

  if (normalizedTables.length === 0) {
    return
  }

  const cacheKey = getFinanceReadinessKey(normalizedTables, includeRequiredColumns)
  const cachedAt = financeBigQueryReadinessCache.get(cacheKey) ?? 0

  if (Date.now() - cachedAt < FINANCE_BIGQUERY_READINESS_TTL_MS) {
    return
  }

  const existingPromise = financeBigQueryReadinessPromises.get(cacheKey)

  if (existingPromise) {
    return existingPromise
  }

  const readinessPromise = (async () => {
    const projectId = getBigQueryProjectId()
    const existingTables = await getExistingFinanceTables(projectId)

    const missingTables = normalizedTables.filter(tableName => !existingTables.has(tableName))

    let missingColumns: string[] = []

    if (includeRequiredColumns && missingTables.length === 0) {
      const existingColumns = await getExistingFinanceColumns(projectId)

      missingColumns = normalizedTables.flatMap(tableName =>
        Object.keys(FINANCE_COLUMN_REQUIREMENTS[tableName] ?? {}).filter(
          columnName => !existingColumns.has(`${tableName}.${columnName}`)
        ).map(columnName => `${tableName}.${columnName}`)
      )
    }

    if (missingTables.length > 0 || missingColumns.length > 0) {
      throw new FinanceValidationError(
        'Finance BigQuery legacy schema is not ready for runtime reads. Run the explicit Finance provisioning lane before using the BigQuery fallback.',
        503,
        { missingTables, missingColumns },
        'FINANCE_BIGQUERY_SCHEMA_NOT_READY'
      )
    }

    financeBigQueryReadinessCache.set(cacheKey, Date.now())
  })().catch(error => {
    financeBigQueryReadinessCache.delete(cacheKey)
    throw error
  }).finally(() => {
    financeBigQueryReadinessPromises.delete(cacheKey)
  })

  financeBigQueryReadinessPromises.set(cacheKey, readinessPromise)

  return readinessPromise
}

const ensureFinanceManagerRole = async (projectId: string) => {
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT role_code
      FROM \`${projectId}.greenhouse.roles\`
      WHERE role_code = 'finance_manager'
      LIMIT 1
    `
  })

  if ((rows as Array<{ role_code: string }>).length === 0) {
    await bigQuery.query({ query: formatProjectStatement(FINANCE_MANAGER_ROLE_INSERT, projectId) })
  }
}

export const ensureFinanceInfrastructure = async () => {
  if (ensureFinanceInfrastructurePromise) {
    return ensureFinanceInfrastructurePromise
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  ensureFinanceInfrastructurePromise = (async () => {
    const existingTables = await getExistingFinanceTables(projectId)

    for (const [tableName, statement] of Object.entries(FINANCE_TABLE_DEFINITIONS)) {
      if (!existingTables.has(tableName)) {
        await bigQuery.query({ query: formatProjectStatement(statement, projectId) })
      }
    }

    const existingColumns = await getExistingFinanceColumns(projectId)

    for (const [tableName, columns] of Object.entries(FINANCE_COLUMN_REQUIREMENTS)) {
      for (const [columnName, statement] of Object.entries(columns)) {
        if (!existingColumns.has(`${tableName}.${columnName}`)) {
          await bigQuery.query({ query: formatProjectStatement(statement, projectId) })
        }
      }
    }

    await ensureFinanceManagerRole(projectId)
  })().catch(error => {
    ensureFinanceInfrastructurePromise = null
    throw error
  })

  return ensureFinanceInfrastructurePromise
}
