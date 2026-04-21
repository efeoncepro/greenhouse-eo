import 'server-only'

import { getLastBusinessDayOfMonth } from '@/lib/calendar/operational-calendar'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { toTimestampString } from '@/lib/finance/shared'

type ProviderIdRow = {
  provider_id: string
}

type ProviderToolingSnapshotRow = {
  provider_id: string
  provider_name: string
  provider_type: string | null
  provider_status: string
  provider_active: boolean
  supplier_id: string | null
  supplier_category: string | null
  supplier_service_type: string | null
  supplier_payment_currency: string | null
  total_tools_count: number | string | null
  active_tools_count: number | string | null
  active_licenses_count: number | string | null
  active_members_count: number | string | null
  payroll_members_count: number | string | null
  wallet_count: number | string | null
  active_wallet_count: number | string | null
  finance_expense_count: number | string | null
  finance_observed_cost_clp: number | string | null
  tooling_subscription_modeled_cost_clp: number | string | null
  tooling_usage_modeled_cost_clp: number | string | null
  tooling_modeled_cost_clp: number | string | null
  payroll_exposed_company_cost_clp: number | string | null
  latest_finance_expense_date: string | Date | null
  latest_tooling_activity_at: string | Date | null
  snapshot_status: string
  materialized_at: string | Date | null
}

type ProviderToolingViewRow = ProviderToolingSnapshotRow & {
  period_year: number | string | null
  period_month: number | string | null
  public_id: string | null
  provider_legal_name: string | null
  provider_primary_email: string | null
  provider_primary_contact_name: string | null
  provider_country_code: string | null
  supplier_legal_name: string | null
  supplier_trade_name: string | null
  supplier_active: boolean | null
  supplier_created_at: string | Date | null
  supplier_updated_at: string | Date | null
}

export type ProviderToolingMonthlySnapshot = {
  providerId: string
  providerName: string
  providerType: string | null
  providerStatus: string
  providerActive: boolean
  supplierId: string | null
  supplierCategory: string | null
  supplierServiceType: string | null
  supplierPaymentCurrency: string | null
  totalToolsCount: number
  activeToolsCount: number
  activeLicensesCount: number
  activeMembersCount: number
  payrollMembersCount: number
  walletCount: number
  activeWalletCount: number
  financeExpenseCount: number
  financeObservedCostClp: number
  toolingSubscriptionModeledCostClp: number
  toolingUsageModeledCostClp: number
  toolingModeledCostClp: number
  payrollExposedCompanyCostClp: number
  latestFinanceExpenseDate: string | null
  latestToolingActivityAt: string | null
  snapshotStatus: string
  periodYear: number
  periodMonth: number
  materializedAt: string | null
}

export type ProviderToolingOverview = ProviderToolingMonthlySnapshot & {
  publicId: string | null
  providerLegalName: string | null
  providerPrimaryEmail: string | null
  providerPrimaryContactName: string | null
  providerCountryCode: string | null
  supplierLegalName: string | null
  supplierTradeName: string | null
  supplierActive: boolean | null
  supplierCreatedAt: string | null
  supplierUpdatedAt: string | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const normalizeNullableString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const getPeriodStartDate = (year: number, month: number) => `${year}-${pad2(month)}-01`

const getPeriodEndDate = (year: number, month: number) => {
  const end = new Date(Date.UTC(year, month, 0))

  return end.toISOString().slice(0, 10)
}

const getCurrentSantiagoPeriod = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  if (!match) {
    const now = new Date()

    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  return { year: Number(match[1]), month: Number(match[2]) }
}

const mapSnapshotRow = (row: ProviderToolingSnapshotRow, periodYear: number, periodMonth: number): ProviderToolingMonthlySnapshot => ({
  providerId: row.provider_id,
  providerName: row.provider_name,
  providerType: normalizeNullableString(row.provider_type),
  providerStatus: row.provider_status,
  providerActive: Boolean(row.provider_active),
  supplierId: normalizeNullableString(row.supplier_id),
  supplierCategory: normalizeNullableString(row.supplier_category),
  supplierServiceType: normalizeNullableString(row.supplier_service_type),
  supplierPaymentCurrency: normalizeNullableString(row.supplier_payment_currency),
  totalToolsCount: toNumber(row.total_tools_count),
  activeToolsCount: toNumber(row.active_tools_count),
  activeLicensesCount: toNumber(row.active_licenses_count),
  activeMembersCount: toNumber(row.active_members_count),
  payrollMembersCount: toNumber(row.payroll_members_count),
  walletCount: toNumber(row.wallet_count),
  activeWalletCount: toNumber(row.active_wallet_count),
  financeExpenseCount: toNumber(row.finance_expense_count),
  financeObservedCostClp: toNumber(row.finance_observed_cost_clp),
  toolingSubscriptionModeledCostClp: toNumber(row.tooling_subscription_modeled_cost_clp),
  toolingUsageModeledCostClp: toNumber(row.tooling_usage_modeled_cost_clp),
  toolingModeledCostClp: toNumber(row.tooling_modeled_cost_clp),
  payrollExposedCompanyCostClp: toNumber(row.payroll_exposed_company_cost_clp),
  latestFinanceExpenseDate:
    row.latest_finance_expense_date instanceof Date
      ? row.latest_finance_expense_date.toISOString().slice(0, 10)
      : row.latest_finance_expense_date?.slice(0, 10) ?? null,
  latestToolingActivityAt: toTimestampString(row.latest_tooling_activity_at as string | Date | null),
  snapshotStatus: row.snapshot_status,
  periodYear,
  periodMonth,
  materializedAt: toTimestampString(row.materialized_at as string | Date | null)
})

const mapOverviewRow = (row: ProviderToolingViewRow): ProviderToolingOverview => ({
  ...mapSnapshotRow(row, toNumber(row.period_year), toNumber(row.period_month)),
  publicId: normalizeNullableString(row.public_id),
  providerLegalName: normalizeNullableString(row.provider_legal_name),
  providerPrimaryEmail: normalizeNullableString(row.provider_primary_email),
  providerPrimaryContactName: normalizeNullableString(row.provider_primary_contact_name),
  providerCountryCode: normalizeNullableString(row.provider_country_code),
  supplierLegalName: normalizeNullableString(row.supplier_legal_name),
  supplierTradeName: normalizeNullableString(row.supplier_trade_name),
  supplierActive: row.supplier_active == null ? null : Boolean(row.supplier_active),
  supplierCreatedAt: toTimestampString(row.supplier_created_at as string | Date | null),
  supplierUpdatedAt: toTimestampString(row.supplier_updated_at as string | Date | null)
})

export const listProviderIdsForMonthlySnapshots = async () => {
  const rows = await runGreenhousePostgresQuery<ProviderIdRow>(
    `
      SELECT provider_id
      FROM greenhouse_core.providers
      WHERE active = TRUE
         OR EXISTS (
           SELECT 1
           FROM greenhouse_finance.suppliers AS s
           WHERE s.provider_id = greenhouse_core.providers.provider_id
         )
         OR EXISTS (
           SELECT 1
           FROM greenhouse_ai.tool_catalog AS t
           WHERE t.provider_id = greenhouse_core.providers.provider_id
         )
      ORDER BY provider_id ASC
    `
  )

  return rows.map(row => row.provider_id)
}

export const materializeProviderToolingMonthlySnapshot = async (
  providerId: string,
  year: number,
  month: number
) => {
  const periodStart = getPeriodStartDate(year, month)
  const periodEnd = getPeriodEndDate(year, month)
  const lastBusinessDay = getLastBusinessDayOfMonth(year, month)

  const rows = await runGreenhousePostgresQuery<ProviderToolingSnapshotRow>(
    `
      WITH primary_supplier AS (
        SELECT
          s.supplier_id,
          s.category AS supplier_category,
          s.service_type AS supplier_service_type,
          s.payment_currency AS supplier_payment_currency
        FROM greenhouse_finance.suppliers AS s
        WHERE s.provider_id = $1
        ORDER BY s.is_active DESC, s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
        LIMIT 1
      ),
      tool_summary AS (
        SELECT
          COUNT(*)::int AS total_tools_count,
          COUNT(*) FILTER (WHERE t.is_active = TRUE)::int AS active_tools_count
        FROM greenhouse_ai.tool_catalog AS t
        WHERE t.provider_id = $1
      ),
      license_summary AS (
        SELECT
          COUNT(*)::int AS active_licenses_count,
          COUNT(DISTINCT l.member_id)::int AS active_members_count
        FROM greenhouse_ai.member_tool_licenses AS l
        INNER JOIN greenhouse_ai.tool_catalog AS t
          ON t.tool_id = l.tool_id
        WHERE t.provider_id = $1
          AND t.is_active = TRUE
          AND l.license_status = 'active'
          AND COALESCE(l.activated_at, $2::date) <= $3::date
          AND (l.expires_at IS NULL OR l.expires_at >= $2::date)
      ),
      wallet_summary AS (
        SELECT
          COUNT(*)::int AS wallet_count,
          COUNT(*) FILTER (WHERE w.wallet_status = 'active')::int AS active_wallet_count
        FROM greenhouse_ai.credit_wallets AS w
        INNER JOIN greenhouse_ai.tool_catalog AS t
          ON t.tool_id = w.tool_id
        WHERE t.provider_id = $1
      ),
      usage_summary AS (
        SELECT
          COALESCE(SUM(COALESCE(l.total_cost_clp, 0)), 0)::numeric(14,2) AS tooling_usage_modeled_cost_clp,
          MAX(l.created_at) AS latest_tooling_activity_at
        FROM greenhouse_ai.credit_ledger AS l
        INNER JOIN greenhouse_ai.credit_wallets AS w
          ON w.wallet_id = l.wallet_id
        INNER JOIN greenhouse_ai.tool_catalog AS t
          ON t.tool_id = w.tool_id
        WHERE t.provider_id = $1
          AND l.entry_type = 'debit'
          AND l.created_at::date >= $2::date
          AND l.created_at::date <= $3::date
      ),
      subscription_summary AS (
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN LOWER(COALESCE(t.cost_model, '')) NOT IN ('subscription', 'hybrid')
                  OR t.subscription_amount IS NULL
                THEN 0::numeric
                ELSE (
                  (
                    t.subscription_amount *
                    CASE LOWER(COALESCE(t.subscription_billing_cycle, 'monthly'))
                      WHEN 'annual' THEN (1::numeric / 12::numeric)
                      WHEN 'yearly' THEN (1::numeric / 12::numeric)
                      WHEN 'quarterly' THEN (1::numeric / 3::numeric)
                      ELSE 1::numeric
                    END
                  ) / GREATEST(COALESCE(t.subscription_seats, 1), 1)
                ) * CASE
                  WHEN UPPER(COALESCE(t.subscription_currency, 'CLP')) = 'CLP' THEN 1::numeric
                  WHEN fx.rate IS NOT NULL THEN fx.rate
                  ELSE 0::numeric
                END
              END
            ),
            0
          )::numeric(14,2) AS tooling_subscription_modeled_cost_clp,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(t.cost_model, '')) IN ('subscription', 'hybrid')
              AND t.subscription_amount IS NOT NULL
              AND UPPER(COALESCE(t.subscription_currency, 'CLP')) <> 'CLP'
              AND fx.rate IS NULL
          )::int AS missing_fx_license_count
        FROM greenhouse_ai.member_tool_licenses AS l
        INNER JOIN greenhouse_ai.tool_catalog AS t
          ON t.tool_id = l.tool_id
        LEFT JOIN LATERAL (
          SELECT rate
          FROM greenhouse_finance.exchange_rates
          WHERE from_currency = UPPER(COALESCE(t.subscription_currency, 'CLP'))
            AND to_currency = 'CLP'
            AND rate_date <= $4::date
          ORDER BY rate_date DESC
          LIMIT 1
        ) AS fx ON TRUE
        WHERE t.provider_id = $1
          AND t.is_active = TRUE
          AND l.license_status = 'active'
          AND COALESCE(l.activated_at, $2::date) <= $3::date
          AND (l.expires_at IS NULL OR l.expires_at >= $2::date)
      ),
      finance_summary AS (
        SELECT
          COUNT(*)::int AS finance_expense_count,
          COALESCE(SUM(COALESCE(e.effective_cost_amount_clp, e.total_amount_clp, 0)), 0)::numeric(14,2) AS finance_observed_cost_clp,
          MAX(COALESCE(e.document_date, e.payment_date)) AS latest_finance_expense_date
        FROM greenhouse_finance.expenses AS e
        INNER JOIN greenhouse_finance.suppliers AS s
          ON s.supplier_id = e.supplier_id
        WHERE s.provider_id = $1
          AND COALESCE(e.document_date, e.payment_date) >= $2::date
          AND COALESCE(e.document_date, e.payment_date) <= $3::date
      ),
      payroll_members AS (
        SELECT DISTINCT l.member_id
        FROM greenhouse_ai.member_tool_licenses AS l
        INNER JOIN greenhouse_ai.tool_catalog AS t
          ON t.tool_id = l.tool_id
        WHERE t.provider_id = $1
          AND t.is_active = TRUE
          AND l.license_status = 'active'
          AND COALESCE(l.activated_at, $2::date) <= $3::date
          AND (l.expires_at IS NULL OR l.expires_at >= $2::date)
      ),
      payroll_summary AS (
        SELECT
          COUNT(DISTINCT pe.member_id)::int AS payroll_members_count,
          COALESCE(
            SUM(COALESCE(pe.gross_total, 0) + COALESCE(pe.chile_employer_total_cost, 0)),
            0
          )::numeric(14,2) AS payroll_exposed_company_cost_clp
        FROM payroll_members AS pm
        INNER JOIN greenhouse_payroll.payroll_periods AS pp
          ON pp.year = $5
         AND pp.month = $6
        INNER JOIN greenhouse_payroll.payroll_entries AS pe
          ON pe.period_id = pp.period_id
         AND pe.member_id = pm.member_id
         AND pe.is_active = TRUE
      )
      SELECT
        p.provider_id,
        p.provider_name,
        p.provider_type,
        p.status AS provider_status,
        p.active AS provider_active,
        supplier.supplier_id,
        supplier.supplier_category,
        supplier.supplier_service_type,
        supplier.supplier_payment_currency,
        COALESCE(tool_summary.total_tools_count, 0) AS total_tools_count,
        COALESCE(tool_summary.active_tools_count, 0) AS active_tools_count,
        COALESCE(license_summary.active_licenses_count, 0) AS active_licenses_count,
        COALESCE(license_summary.active_members_count, 0) AS active_members_count,
        COALESCE(payroll_summary.payroll_members_count, 0) AS payroll_members_count,
        COALESCE(wallet_summary.wallet_count, 0) AS wallet_count,
        COALESCE(wallet_summary.active_wallet_count, 0) AS active_wallet_count,
        COALESCE(finance_summary.finance_expense_count, 0) AS finance_expense_count,
        COALESCE(finance_summary.finance_observed_cost_clp, 0) AS finance_observed_cost_clp,
        COALESCE(subscription_summary.tooling_subscription_modeled_cost_clp, 0) AS tooling_subscription_modeled_cost_clp,
        COALESCE(usage_summary.tooling_usage_modeled_cost_clp, 0) AS tooling_usage_modeled_cost_clp,
        (
          COALESCE(subscription_summary.tooling_subscription_modeled_cost_clp, 0) +
          COALESCE(usage_summary.tooling_usage_modeled_cost_clp, 0)
        )::numeric(14,2) AS tooling_modeled_cost_clp,
        COALESCE(payroll_summary.payroll_exposed_company_cost_clp, 0) AS payroll_exposed_company_cost_clp,
        finance_summary.latest_finance_expense_date,
        usage_summary.latest_tooling_activity_at,
        CASE
          WHEN COALESCE(subscription_summary.missing_fx_license_count, 0) > 0 THEN 'partial'
          ELSE 'complete'
        END AS snapshot_status,
        CURRENT_TIMESTAMP AS materialized_at
      FROM greenhouse_core.providers AS p
      LEFT JOIN primary_supplier AS supplier ON TRUE
      LEFT JOIN tool_summary ON TRUE
      LEFT JOIN license_summary ON TRUE
      LEFT JOIN wallet_summary ON TRUE
      LEFT JOIN usage_summary ON TRUE
      LEFT JOIN subscription_summary ON TRUE
      LEFT JOIN finance_summary ON TRUE
      LEFT JOIN payroll_summary ON TRUE
      WHERE p.provider_id = $1
      LIMIT 1
    `,
    [providerId, periodStart, periodEnd, lastBusinessDay, year, month]
  )

  const row = rows[0]

  if (!row) {
    return null
  }

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_serving.provider_tooling_monthly_snapshots (
        provider_id,
        period_year,
        period_month,
        provider_name,
        provider_type,
        provider_status,
        provider_active,
        supplier_id,
        supplier_category,
        supplier_service_type,
        supplier_payment_currency,
        total_tools_count,
        active_tools_count,
        active_licenses_count,
        active_members_count,
        payroll_members_count,
        wallet_count,
        active_wallet_count,
        finance_expense_count,
        finance_observed_cost_clp,
        tooling_subscription_modeled_cost_clp,
        tooling_usage_modeled_cost_clp,
        tooling_modeled_cost_clp,
        payroll_exposed_company_cost_clp,
        latest_finance_expense_date,
        latest_tooling_activity_at,
        snapshot_status,
        materialized_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25::date, $26::timestamptz, $27, $28::timestamptz
      )
      ON CONFLICT (provider_id, period_year, period_month) DO UPDATE SET
        provider_name = EXCLUDED.provider_name,
        provider_type = EXCLUDED.provider_type,
        provider_status = EXCLUDED.provider_status,
        provider_active = EXCLUDED.provider_active,
        supplier_id = EXCLUDED.supplier_id,
        supplier_category = EXCLUDED.supplier_category,
        supplier_service_type = EXCLUDED.supplier_service_type,
        supplier_payment_currency = EXCLUDED.supplier_payment_currency,
        total_tools_count = EXCLUDED.total_tools_count,
        active_tools_count = EXCLUDED.active_tools_count,
        active_licenses_count = EXCLUDED.active_licenses_count,
        active_members_count = EXCLUDED.active_members_count,
        payroll_members_count = EXCLUDED.payroll_members_count,
        wallet_count = EXCLUDED.wallet_count,
        active_wallet_count = EXCLUDED.active_wallet_count,
        finance_expense_count = EXCLUDED.finance_expense_count,
        finance_observed_cost_clp = EXCLUDED.finance_observed_cost_clp,
        tooling_subscription_modeled_cost_clp = EXCLUDED.tooling_subscription_modeled_cost_clp,
        tooling_usage_modeled_cost_clp = EXCLUDED.tooling_usage_modeled_cost_clp,
        tooling_modeled_cost_clp = EXCLUDED.tooling_modeled_cost_clp,
        payroll_exposed_company_cost_clp = EXCLUDED.payroll_exposed_company_cost_clp,
        latest_finance_expense_date = EXCLUDED.latest_finance_expense_date,
        latest_tooling_activity_at = EXCLUDED.latest_tooling_activity_at,
        snapshot_status = EXCLUDED.snapshot_status,
        materialized_at = EXCLUDED.materialized_at
    `,
    [
      row.provider_id,
      year,
      month,
      row.provider_name,
      row.provider_type,
      row.provider_status,
      row.provider_active,
      row.supplier_id,
      row.supplier_category,
      row.supplier_service_type,
      row.supplier_payment_currency,
      toNumber(row.total_tools_count),
      toNumber(row.active_tools_count),
      toNumber(row.active_licenses_count),
      toNumber(row.active_members_count),
      toNumber(row.payroll_members_count),
      toNumber(row.wallet_count),
      toNumber(row.active_wallet_count),
      toNumber(row.finance_expense_count),
      toNumber(row.finance_observed_cost_clp),
      toNumber(row.tooling_subscription_modeled_cost_clp),
      toNumber(row.tooling_usage_modeled_cost_clp),
      toNumber(row.tooling_modeled_cost_clp),
      toNumber(row.payroll_exposed_company_cost_clp),
      row.latest_finance_expense_date instanceof Date
        ? row.latest_finance_expense_date.toISOString().slice(0, 10)
        : row.latest_finance_expense_date,
      toTimestampString(row.latest_tooling_activity_at as string | Date | null),
      row.snapshot_status,
      toTimestampString(row.materialized_at as string | Date | null) ?? new Date().toISOString()
    ]
  )

  return mapSnapshotRow(row, year, month)
}

export const refreshAllProviderToolingMonthlySnapshots = async (year: number, month: number) => {
  const providerIds = await listProviderIdsForMonthlySnapshots()
  const refreshed: ProviderToolingMonthlySnapshot[] = []

  for (const providerId of providerIds) {
    const snapshot = await materializeProviderToolingMonthlySnapshot(providerId, year, month)

    if (snapshot) {
      refreshed.push(snapshot)
    }
  }

  return refreshed
}

export const readProviderToolingMonthlySnapshot = async (providerId: string, year: number, month: number) => {
  const rows = await runGreenhousePostgresQuery<ProviderToolingSnapshotRow>(
    `
      SELECT
        provider_id,
        provider_name,
        provider_type,
        provider_status,
        provider_active,
        supplier_id,
        supplier_category,
        supplier_service_type,
        supplier_payment_currency,
        total_tools_count,
        active_tools_count,
        active_licenses_count,
        active_members_count,
        payroll_members_count,
        wallet_count,
        active_wallet_count,
        finance_expense_count,
        finance_observed_cost_clp,
        tooling_subscription_modeled_cost_clp,
        tooling_usage_modeled_cost_clp,
        tooling_modeled_cost_clp,
        payroll_exposed_company_cost_clp,
        latest_finance_expense_date,
        latest_tooling_activity_at,
        snapshot_status,
        materialized_at
      FROM greenhouse_serving.provider_tooling_monthly_snapshots
      WHERE provider_id = $1
        AND period_year = $2
        AND period_month = $3
      LIMIT 1
    `,
    [providerId, year, month]
  )

  return rows[0] ? mapSnapshotRow(rows[0], year, month) : null
}

export const listProviderToolingOverview = async (
  period?: { year: number; month: number } | null
) => {
  if (period) {
    const rows = await runGreenhousePostgresQuery<ProviderToolingViewRow>(
      `
        SELECT
          pf.provider_id,
          pf.public_id,
          pf.provider_name,
          pf.provider_legal_name,
          pf.provider_type,
          pf.provider_primary_email,
          pf.provider_primary_contact_name,
          pf.provider_country_code,
          pf.provider_status,
          pf.provider_active,
          pf.supplier_id,
          pf.supplier_legal_name,
          pf.supplier_trade_name,
          pf.supplier_category,
          pf.supplier_service_type,
          pf.supplier_payment_currency,
          pf.supplier_active,
          pf.supplier_created_at,
          pf.supplier_updated_at,
          snap.period_year,
          snap.period_month,
          snap.total_tools_count,
          snap.active_tools_count,
          snap.active_licenses_count,
          snap.active_members_count,
          snap.payroll_members_count,
          snap.wallet_count,
          snap.active_wallet_count,
          snap.finance_expense_count,
          snap.finance_observed_cost_clp,
          snap.tooling_subscription_modeled_cost_clp,
          snap.tooling_usage_modeled_cost_clp,
          snap.tooling_modeled_cost_clp,
          snap.payroll_exposed_company_cost_clp,
          snap.latest_finance_expense_date,
          snap.latest_tooling_activity_at,
          snap.snapshot_status,
          snap.materialized_at
        FROM greenhouse_serving.provider_finance_360 AS pf
        LEFT JOIN greenhouse_serving.provider_tooling_monthly_snapshots AS snap
          ON snap.provider_id = pf.provider_id
         AND snap.period_year = $1
         AND snap.period_month = $2
        ORDER BY pf.provider_name ASC
      `,
      [period.year, period.month]
    )

    return rows
      .filter(row => row.period_year != null && row.period_month != null)
      .map(mapOverviewRow)
  }

  const rows = await runGreenhousePostgresQuery<ProviderToolingViewRow>(
    `
      SELECT
        provider_id,
        public_id,
        provider_name,
        provider_legal_name,
        provider_type,
        provider_primary_email,
        provider_primary_contact_name,
        provider_country_code,
        provider_status,
        provider_active,
        supplier_id,
        supplier_legal_name,
        supplier_trade_name,
        supplier_category,
        supplier_service_type,
        supplier_payment_currency,
        supplier_active,
        supplier_created_at,
        supplier_updated_at,
        period_year,
        period_month,
        total_tools_count,
        active_tools_count,
        active_licenses_count,
        active_members_count,
        payroll_members_count,
        wallet_count,
        active_wallet_count,
        finance_expense_count,
        finance_observed_cost_clp,
        tooling_subscription_modeled_cost_clp,
        tooling_usage_modeled_cost_clp,
        tooling_modeled_cost_clp,
        payroll_exposed_company_cost_clp,
        latest_finance_expense_date,
        latest_tooling_activity_at,
        snapshot_status,
        materialized_at
      FROM greenhouse_serving.provider_tooling_360
      ORDER BY provider_name ASC
    `
  )

  return rows.map(mapOverviewRow)
}

export const getProviderToolingPeriodFromPayload = (payload: Record<string, unknown>) => {
  const year = typeof payload.periodYear === 'number'
    ? payload.periodYear
    : typeof payload.periodYear === 'string' && payload.periodYear.trim()
      ? Number(payload.periodYear)
      : typeof payload.year === 'number'
        ? payload.year
        : typeof payload.year === 'string' && payload.year.trim()
          ? Number(payload.year)
          : null

  const month = typeof payload.periodMonth === 'number'
    ? payload.periodMonth
    : typeof payload.periodMonth === 'string' && payload.periodMonth.trim()
      ? Number(payload.periodMonth)
      : typeof payload.month === 'number'
        ? payload.month
        : typeof payload.month === 'string' && payload.month.trim()
          ? Number(payload.month)
          : null

  if (year && month && month >= 1 && month <= 12) {
    return { year, month }
  }

  if (typeof payload.periodId === 'string') {
    const match = payload.periodId.match(/^(\d{4})-(\d{2})$/)

    if (match) {
      return { year: Number(match[1]), month: Number(match[2]) }
    }
  }

  if (typeof payload.updatedAt === 'string' || typeof payload.updated_at === 'string') {
    const value = typeof payload.updatedAt === 'string'
      ? payload.updatedAt
      : typeof payload.updated_at === 'string'
        ? payload.updated_at
        : null

    if (!value) {
      return getCurrentSantiagoPeriod()
    }

    const match = value.match(/^(\d{4})-(\d{2})-\d{2}/)

    if (match) {
      return { year: Number(match[1]), month: Number(match[2]) }
    }
  }

  return getCurrentSantiagoPeriod()
}
