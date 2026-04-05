import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

let ensureFinanceInfrastructurePromise: Promise<void> | null = null

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
      expense_type STRING NOT NULL,
      description STRING NOT NULL,
      currency STRING NOT NULL,
      subtotal NUMERIC NOT NULL,
      tax_rate NUMERIC,
      tax_amount NUMERIC,
      total_amount NUMERIC NOT NULL,
      exchange_rate_to_clp NUMERIC,
      total_amount_clp NUMERIC NOT NULL,
      payment_date DATE,
      payment_status STRING NOT NULL,
      payment_method STRING,
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
  fin_reconciliation_periods: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_reconciliation_periods\` (
      period_id STRING NOT NULL,
      account_id STRING NOT NULL,
      year INT64 NOT NULL,
      month INT64 NOT NULL,
      opening_balance NUMERIC NOT NULL,
      closing_balance_bank NUMERIC,
      closing_balance_system NUMERIC,
      difference NUMERIC,
      status STRING NOT NULL,
      statement_imported BOOL,
      statement_imported_at TIMESTAMP,
      statement_row_count INT64,
      reconciled_by STRING,
      reconciled_at TIMESTAMP,
      notes STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  fin_bank_statement_rows: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.fin_bank_statement_rows\` (
      row_id STRING NOT NULL,
      period_id STRING NOT NULL,
      transaction_date DATE NOT NULL,
      value_date DATE,
      description STRING NOT NULL,
      reference STRING,
      amount NUMERIC NOT NULL,
      balance NUMERIC,
      match_status STRING NOT NULL,
      matched_type STRING,
      matched_id STRING,
      matched_payment_id STRING,
      match_confidence NUMERIC,
      notes STRING,
      matched_by STRING,
      matched_at TIMESTAMP,
      created_at TIMESTAMP
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
    nubox_last_synced_at: 'ALTER TABLE `{projectId}.greenhouse.fin_income` ADD COLUMN IF NOT EXISTS nubox_last_synced_at TIMESTAMP'
  },
  fin_expenses: {
    client_id: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS client_id STRING',
    nubox_purchase_id: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_purchase_id STRING',
    nubox_document_status: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_document_status STRING',
    nubox_supplier_rut: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_supplier_rut STRING',
    nubox_origin: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_origin STRING',
    nubox_last_synced_at: 'ALTER TABLE `{projectId}.greenhouse.fin_expenses` ADD COLUMN IF NOT EXISTS nubox_last_synced_at TIMESTAMP'
  },
  fin_bank_statement_rows: {
    matched_payment_id: 'ALTER TABLE `{projectId}.greenhouse.fin_bank_statement_rows` ADD COLUMN IF NOT EXISTS matched_payment_id STRING'
  }
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
    'Legacy — converging to finance_admin (TASK-228).',
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
