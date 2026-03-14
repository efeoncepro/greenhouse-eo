import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

let ensureFinanceInfrastructurePromise: Promise<void> | null = null

const buildStatements = (projectId: string) => [
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.fin_accounts\` (
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
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.fin_suppliers\` (
      supplier_id STRING NOT NULL,
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
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.fin_client_profiles\` (
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
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.fin_income\` (
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
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.fin_expenses\` (
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
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.fin_reconciliation_periods\` (
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
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.fin_bank_statement_rows\` (
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
      match_confidence NUMERIC,
      notes STRING,
      matched_by STRING,
      matched_at TIMESTAMP,
      created_at TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS \`${projectId}.greenhouse.fin_exchange_rates\` (
      rate_id STRING NOT NULL,
      from_currency STRING NOT NULL,
      to_currency STRING NOT NULL,
      rate NUMERIC NOT NULL,
      rate_date DATE NOT NULL,
      source STRING,
      created_at TIMESTAMP
    )
  `,
  `ALTER TABLE \`${projectId}.greenhouse.fin_client_profiles\` ADD COLUMN IF NOT EXISTS client_id STRING`,
  `ALTER TABLE \`${projectId}.greenhouse.fin_income\` ADD COLUMN IF NOT EXISTS client_id STRING`,
  `ALTER TABLE \`${projectId}.greenhouse.fin_expenses\` ADD COLUMN IF NOT EXISTS client_id STRING`,
  `
    UPDATE \`${projectId}.greenhouse.fin_client_profiles\` AS fp
    SET client_id = fp.client_profile_id
    WHERE (fp.client_id IS NULL OR fp.client_id = '')
      AND fp.client_profile_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM \`${projectId}.greenhouse.clients\` AS c
        WHERE c.active = TRUE
          AND c.client_id = fp.client_profile_id
      )
  `,
  `
    UPDATE \`${projectId}.greenhouse.fin_client_profiles\` AS fp
    SET client_id = (
      SELECT c.client_id
      FROM \`${projectId}.greenhouse.clients\` AS c
      WHERE c.active = TRUE
        AND fp.hubspot_company_id IS NOT NULL
        AND CAST(c.hubspot_company_id AS STRING) = fp.hubspot_company_id
      ORDER BY c.client_id
      LIMIT 1
    )
    WHERE (fp.client_id IS NULL OR fp.client_id = '')
      AND fp.hubspot_company_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM \`${projectId}.greenhouse.clients\` AS c
        WHERE c.active = TRUE
          AND CAST(c.hubspot_company_id AS STRING) = fp.hubspot_company_id
      )
  `,
  `
    UPDATE \`${projectId}.greenhouse.fin_income\` AS i
    SET client_id = i.client_profile_id
    WHERE (i.client_id IS NULL OR i.client_id = '')
      AND i.client_profile_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM \`${projectId}.greenhouse.clients\` AS c
        WHERE c.active = TRUE
          AND c.client_id = i.client_profile_id
      )
  `,
  `
    UPDATE \`${projectId}.greenhouse.fin_income\` AS i
    SET client_id = (
      SELECT fp.client_id
      FROM \`${projectId}.greenhouse.fin_client_profiles\` AS fp
      WHERE fp.client_id IS NOT NULL
        AND (
          (i.client_profile_id IS NOT NULL AND fp.client_profile_id = i.client_profile_id)
          OR (i.hubspot_company_id IS NOT NULL AND fp.hubspot_company_id = i.hubspot_company_id)
        )
      ORDER BY IF(i.client_profile_id IS NOT NULL AND fp.client_profile_id = i.client_profile_id, 0, 1), fp.client_id
      LIMIT 1
    )
    WHERE (i.client_id IS NULL OR i.client_id = '')
      AND (
        i.client_profile_id IS NOT NULL
        OR i.hubspot_company_id IS NOT NULL
      )
      AND EXISTS (
        SELECT 1
        FROM \`${projectId}.greenhouse.fin_client_profiles\` AS fp
        WHERE fp.client_id IS NOT NULL
          AND (
            (i.client_profile_id IS NOT NULL AND fp.client_profile_id = i.client_profile_id)
            OR (i.hubspot_company_id IS NOT NULL AND fp.hubspot_company_id = i.hubspot_company_id)
          )
      )
  `,
  `
    UPDATE \`${projectId}.greenhouse.fin_income\` AS i
    SET client_id = (
      SELECT c.client_id
      FROM \`${projectId}.greenhouse.clients\` AS c
      WHERE c.active = TRUE
        AND i.hubspot_company_id IS NOT NULL
        AND CAST(c.hubspot_company_id AS STRING) = i.hubspot_company_id
      ORDER BY c.client_id
      LIMIT 1
    )
    WHERE (i.client_id IS NULL OR i.client_id = '')
      AND i.hubspot_company_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM \`${projectId}.greenhouse.clients\` AS c
        WHERE c.active = TRUE
          AND CAST(c.hubspot_company_id AS STRING) = i.hubspot_company_id
      )
  `,
  `
    UPDATE \`${projectId}.greenhouse.fin_expenses\` AS e
    SET
      member_id = pe.member_id,
      payroll_period_id = COALESCE(NULLIF(e.payroll_period_id, ''), pe.period_id)
    FROM \`${projectId}.greenhouse.payroll_entries\` AS pe
    WHERE e.payroll_entry_id = pe.entry_id
      AND (
        e.member_id IS NULL
        OR e.member_id = ''
        OR e.payroll_period_id IS NULL
        OR e.payroll_period_id = ''
      )
  `,
  `
    UPDATE \`${projectId}.greenhouse.fin_expenses\` AS e
    SET member_name = tm.display_name
    FROM \`${projectId}.greenhouse.team_members\` AS tm
    WHERE e.member_id = tm.member_id
      AND (e.member_name IS NULL OR e.member_name = '')
  `,
  `
    MERGE \`${projectId}.greenhouse.roles\` AS target
    USING (
      SELECT
        'finance_manager' AS role_code,
        'Finance Manager' AS role_name,
        'internal' AS role_family,
        'Financial operations access for Efeonce finance team.' AS description,
        'efeonce_internal' AS tenant_type,
        FALSE AS is_admin,
        TRUE AS is_internal,
        ['internal', 'finance'] AS route_group_scope,
        CURRENT_TIMESTAMP() AS created_at,
        CURRENT_TIMESTAMP() AS updated_at
    ) AS source
    ON target.role_code = source.role_code
    WHEN MATCHED THEN
      UPDATE SET
        role_name = source.role_name,
        role_family = source.role_family,
        description = source.description,
        tenant_type = source.tenant_type,
        is_admin = source.is_admin,
        is_internal = source.is_internal,
        route_group_scope = source.route_group_scope,
        updated_at = CURRENT_TIMESTAMP()
    WHEN NOT MATCHED THEN
      INSERT (
        role_code, role_name, role_family, description, tenant_type,
        is_admin, is_internal, route_group_scope, created_at, updated_at
      )
      VALUES (
        source.role_code, source.role_name, source.role_family, source.description,
        source.tenant_type, source.is_admin, source.is_internal, source.route_group_scope,
        source.created_at, source.updated_at
      )
  `
]

export const ensureFinanceInfrastructure = async () => {
  if (ensureFinanceInfrastructurePromise) {
    return ensureFinanceInfrastructurePromise
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  ensureFinanceInfrastructurePromise = (async () => {
    for (const query of buildStatements(projectId)) {
      await bigQuery.query({ query })
    }
  })().catch(error => {
    ensureFinanceInfrastructurePromise = null
    throw error
  })

  return ensureFinanceInfrastructurePromise
}
