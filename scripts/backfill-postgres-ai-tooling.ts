import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

const getBigQueryTemporalValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const candidate = (value as { value?: unknown }).value

    return typeof candidate === 'string' ? candidate : null
  }

  return null
}

const getBigQueryDateValue = (value: unknown) => getBigQueryTemporalValue(value)?.slice(0, 10) ?? null

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
  const bigQueryLocation = process.env.GREENHOUSE_BIGQUERY_LOCATION || 'US'
  const bigQuery = new BigQuery({ projectId })

  try {
    const [tools] = await bigQuery.query({
      query: `
        SELECT *
        FROM \`${projectId}.greenhouse.ai_tool_catalog\`
      `,
      location: bigQueryLocation
    })

    const [licenses] = await bigQuery.query({
      query: `
        SELECT *
        FROM \`${projectId}.greenhouse.member_tool_licenses\`
      `,
      location: bigQueryLocation
    })

    const [wallets] = await bigQuery.query({
      query: `
        SELECT *
        FROM \`${projectId}.greenhouse.ai_credit_wallets\`
      `,
      location: bigQueryLocation
    })

    const [ledger] = await bigQuery.query({
      query: `
        SELECT *
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
      `,
      location: bigQueryLocation
    })

    for (const row of tools as Array<Record<string, unknown>>) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_ai.tool_catalog (
            tool_id,
            tool_name,
            provider_id,
            vendor,
            tool_category,
            tool_subcategory,
            cost_model,
            subscription_amount,
            subscription_currency,
            subscription_billing_cycle,
            subscription_seats,
            credit_unit_name,
            credit_unit_cost,
            credit_unit_currency,
            credits_included_monthly,
            fin_supplier_id,
            description,
            website_url,
            icon_url,
            is_active,
            sort_order,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::numeric, $9, $10, $11, $12, $13::numeric, $14, $15, $16, $17, $18, $19, $20, $21, COALESCE($22::timestamptz, CURRENT_TIMESTAMP), COALESCE($23::timestamptz, CURRENT_TIMESTAMP)
          )
          ON CONFLICT (tool_id) DO UPDATE
          SET
            tool_name = EXCLUDED.tool_name,
            provider_id = EXCLUDED.provider_id,
            vendor = EXCLUDED.vendor,
            tool_category = EXCLUDED.tool_category,
            tool_subcategory = EXCLUDED.tool_subcategory,
            cost_model = EXCLUDED.cost_model,
            subscription_amount = EXCLUDED.subscription_amount,
            subscription_currency = EXCLUDED.subscription_currency,
            subscription_billing_cycle = EXCLUDED.subscription_billing_cycle,
            subscription_seats = EXCLUDED.subscription_seats,
            credit_unit_name = EXCLUDED.credit_unit_name,
            credit_unit_cost = EXCLUDED.credit_unit_cost,
            credit_unit_currency = EXCLUDED.credit_unit_currency,
            credits_included_monthly = EXCLUDED.credits_included_monthly,
            fin_supplier_id = EXCLUDED.fin_supplier_id,
            description = EXCLUDED.description,
            website_url = EXCLUDED.website_url,
            icon_url = EXCLUDED.icon_url,
            is_active = EXCLUDED.is_active,
            sort_order = EXCLUDED.sort_order,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
        `,
        [
          row.tool_id,
          row.tool_name,
          row.provider_id,
          row.vendor ?? null,
          row.tool_category,
          row.tool_subcategory ?? null,
          row.cost_model,
          row.subscription_amount ?? null,
          row.subscription_currency ?? null,
          row.subscription_billing_cycle ?? null,
          row.subscription_seats ?? null,
          row.credit_unit_name ?? null,
          row.credit_unit_cost ?? null,
          row.credit_unit_currency ?? null,
          row.credits_included_monthly ?? null,
          row.fin_supplier_id ?? null,
          row.description ?? null,
          row.website_url ?? null,
          row.icon_url ?? null,
          row.is_active ?? true,
          row.sort_order ?? 0,
          getBigQueryTemporalValue(row.created_at),
          getBigQueryTemporalValue(row.updated_at)
        ]
      )
    }

    for (const row of licenses as Array<Record<string, unknown>>) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_ai.member_tool_licenses (
            license_id,
            member_id,
            tool_id,
            license_status,
            activated_at,
            expires_at,
            access_level,
            license_key,
            account_email,
            notes,
            assigned_by_user_id,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11, COALESCE($12::timestamptz, CURRENT_TIMESTAMP), COALESCE($13::timestamptz, CURRENT_TIMESTAMP)
          )
          ON CONFLICT (license_id) DO UPDATE
          SET
            member_id = EXCLUDED.member_id,
            tool_id = EXCLUDED.tool_id,
            license_status = EXCLUDED.license_status,
            activated_at = EXCLUDED.activated_at,
            expires_at = EXCLUDED.expires_at,
            access_level = EXCLUDED.access_level,
            license_key = EXCLUDED.license_key,
            account_email = EXCLUDED.account_email,
            notes = EXCLUDED.notes,
            assigned_by_user_id = EXCLUDED.assigned_by_user_id,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
        `,
        [
          row.license_id,
          row.member_id,
          row.tool_id,
          row.license_status,
          getBigQueryDateValue(row.activated_at),
          getBigQueryDateValue(row.expires_at),
          row.access_level ?? null,
          row.license_key ?? null,
          row.account_email ?? null,
          row.notes ?? null,
          row.assigned_by ?? null,
          getBigQueryTemporalValue(row.created_at),
          getBigQueryTemporalValue(row.updated_at)
        ]
      )
    }

    for (const row of wallets as Array<Record<string, unknown>>) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_ai.credit_wallets (
            wallet_id,
            wallet_name,
            wallet_scope,
            client_id,
            tool_id,
            credit_unit_name,
            initial_balance,
            current_balance,
            reserved_balance,
            monthly_limit,
            monthly_consumed,
            monthly_reset_day,
            low_balance_threshold,
            valid_from,
            valid_until,
            wallet_status,
            notes,
            alert_sent,
            created_by_user_id,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::date, $15::date, $16, $17, $18, $19, COALESCE($20::timestamptz, CURRENT_TIMESTAMP), COALESCE($21::timestamptz, CURRENT_TIMESTAMP)
          )
          ON CONFLICT (wallet_id) DO UPDATE
          SET
            wallet_name = EXCLUDED.wallet_name,
            wallet_scope = EXCLUDED.wallet_scope,
            client_id = EXCLUDED.client_id,
            tool_id = EXCLUDED.tool_id,
            credit_unit_name = EXCLUDED.credit_unit_name,
            initial_balance = EXCLUDED.initial_balance,
            current_balance = EXCLUDED.current_balance,
            reserved_balance = EXCLUDED.reserved_balance,
            monthly_limit = EXCLUDED.monthly_limit,
            monthly_consumed = EXCLUDED.monthly_consumed,
            monthly_reset_day = EXCLUDED.monthly_reset_day,
            low_balance_threshold = EXCLUDED.low_balance_threshold,
            valid_from = EXCLUDED.valid_from,
            valid_until = EXCLUDED.valid_until,
            wallet_status = EXCLUDED.wallet_status,
            notes = EXCLUDED.notes,
            alert_sent = EXCLUDED.alert_sent,
            created_by_user_id = EXCLUDED.created_by_user_id,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
        `,
        [
          row.wallet_id,
          row.wallet_name,
          row.wallet_scope,
          row.client_id ?? null,
          row.tool_id,
          row.credit_unit_name,
          Number(row.initial_balance ?? 0),
          Number(row.current_balance ?? 0),
          Number(row.reserved_balance ?? 0),
          row.monthly_limit ?? null,
          Number(row.monthly_consumed ?? 0),
          Number(row.monthly_reset_day ?? 1),
          row.low_balance_threshold ?? null,
          getBigQueryDateValue(row.valid_from),
          getBigQueryDateValue(row.valid_until),
          row.wallet_status,
          row.notes ?? null,
          Boolean(row.alert_sent ?? false),
          row.created_by ?? null,
          getBigQueryTemporalValue(row.created_at),
          getBigQueryTemporalValue(row.updated_at)
        ]
      )
    }

    for (const row of ledger as Array<Record<string, unknown>>) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_ai.credit_ledger (
            ledger_id,
            wallet_id,
            request_id,
            entry_type,
            credit_amount,
            balance_before,
            balance_after,
            consumed_by_member_id,
            client_id,
            notion_task_id,
            notion_project_id,
            project_name,
            asset_description,
            unit_cost,
            cost_currency,
            total_cost,
            total_cost_clp,
            reload_reason,
            reload_reference,
            notes,
            created_by_user_id,
            created_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::numeric, $15, $16::numeric, $17::numeric, $18, $19, $20, $21, COALESCE($22::timestamptz, CURRENT_TIMESTAMP)
          )
          ON CONFLICT (ledger_id) DO UPDATE
          SET
            wallet_id = EXCLUDED.wallet_id,
            request_id = EXCLUDED.request_id,
            entry_type = EXCLUDED.entry_type,
            credit_amount = EXCLUDED.credit_amount,
            balance_before = EXCLUDED.balance_before,
            balance_after = EXCLUDED.balance_after,
            consumed_by_member_id = EXCLUDED.consumed_by_member_id,
            client_id = EXCLUDED.client_id,
            notion_task_id = EXCLUDED.notion_task_id,
            notion_project_id = EXCLUDED.notion_project_id,
            project_name = EXCLUDED.project_name,
            asset_description = EXCLUDED.asset_description,
            unit_cost = EXCLUDED.unit_cost,
            cost_currency = EXCLUDED.cost_currency,
            total_cost = EXCLUDED.total_cost,
            total_cost_clp = EXCLUDED.total_cost_clp,
            reload_reason = EXCLUDED.reload_reason,
            reload_reference = EXCLUDED.reload_reference,
            notes = EXCLUDED.notes,
            created_by_user_id = EXCLUDED.created_by_user_id,
            created_at = EXCLUDED.created_at
        `,
        [
          row.ledger_id,
          row.wallet_id,
          row.request_id ?? null,
          row.entry_type,
          Number(row.credit_amount ?? 0),
          Number(row.balance_before ?? 0),
          Number(row.balance_after ?? 0),
          row.consumed_by_member_id ?? null,
          row.client_id ?? null,
          row.notion_task_id ?? null,
          row.notion_project_id ?? null,
          row.project_name ?? null,
          row.asset_description ?? null,
          row.unit_cost ?? null,
          row.cost_currency ?? null,
          row.total_cost ?? null,
          row.total_cost_clp ?? null,
          row.reload_reason ?? null,
          row.reload_reference ?? null,
          row.notes ?? null,
          row.created_by ?? null,
          getBigQueryTemporalValue(row.created_at)
        ]
      )
    }

    console.log(
      JSON.stringify(
        {
          toolCount: (tools as unknown[]).length,
          licenseCount: (licenses as unknown[]).length,
          walletCount: (wallets as unknown[]).length,
          ledgerCount: (ledger as unknown[]).length
        },
        null,
        2
      )
    )
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
