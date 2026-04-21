import 'server-only'

import { sql } from 'kysely'

import { getLastBusinessDayOfMonth } from '@/lib/calendar/operational-calendar'
import { getDb } from '@/lib/db'

import type { CommercialCostBasisTenantScope } from '@/lib/commercial-cost-worker/contracts'

export type ToolProviderCostBasisSourceKind =
  | 'finance_observed'
  | 'hybrid_modeled'
  | 'license_modeled'
  | 'usage_modeled'
  | 'catalog_prorated'
  | 'unresolved'

export type ToolProviderCostBasisFreshnessStatus = 'fresh' | 'stale' | 'unknown'
export type ToolProviderCostBasisConfidenceLabel = 'high' | 'medium' | 'low'
export type ToolProviderCostBasisSnapshotStatus = 'complete' | 'partial' | 'unresolved'

export interface ToolProviderCostBasisSnapshot {
  snapshotId: string
  snapshotKey: string
  toolId: string
  toolSku: string | null
  toolName: string
  providerId: string
  providerName: string
  supplierId: string | null
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
  tenantScopeKey: string
  periodYear: number
  periodMonth: number
  periodId: string
  snapshotDate: string
  sourceKind: ToolProviderCostBasisSourceKind
  sourceRef: string | null
  sourceCurrency: string
  sourceAmount: number
  resolvedCurrency: string
  resolvedAmount: number
  resolvedAmountClp: number
  observedCostClp: number
  modeledSubscriptionCostClp: number
  modeledUsageCostClp: number
  fallbackCatalogCostUsd: number | null
  fxRateToClp: number | null
  fxRateDate: string | null
  freshnessDays: number
  freshnessStatus: ToolProviderCostBasisFreshnessStatus
  confidenceScore: number
  confidenceLabel: ToolProviderCostBasisConfidenceLabel
  activeLicenseCount: number
  activeMemberCount: number
  walletCount: number
  activeWalletCount: number
  financeExpenseCount: number
  providerSnapshotId: string | null
  latestObservedExpenseDate: string | null
  latestToolingActivityAt: string | null
  snapshotStatus: ToolProviderCostBasisSnapshotStatus
  refreshReason: string | null
  detail: Record<string, unknown>
  materializedAt: string
  createdAt: string
  updatedAt: string
}

export interface MaterializeToolProviderCostBasisOptions {
  reason?: string
  tenantScope?: CommercialCostBasisTenantScope
}

type ToolProviderCostBasisRow = {
  snapshot_id: string
  snapshot_key: string
  tool_id: string
  tool_sku: string | null
  tool_name: string
  provider_id: string
  provider_name: string
  supplier_id: string | null
  organization_id: string | null
  client_id: string | null
  space_id: string | null
  tenant_scope_key: string
  period_year: number | string
  period_month: number | string
  period_id: string
  snapshot_date: string | Date
  source_kind: ToolProviderCostBasisSourceKind
  source_ref: string | null
  source_currency: string
  source_amount: number | string | null
  resolved_currency: string
  resolved_amount: number | string | null
  resolved_amount_clp: number | string | null
  observed_cost_clp: number | string | null
  modeled_subscription_cost_clp: number | string | null
  modeled_usage_cost_clp: number | string | null
  fallback_catalog_cost_usd: number | string | null
  fx_rate_to_clp: number | string | null
  fx_rate_date: string | Date | null
  freshness_days: number | string | null
  freshness_status: ToolProviderCostBasisFreshnessStatus
  confidence_score: number | string | null
  confidence_label: ToolProviderCostBasisConfidenceLabel
  active_license_count: number | string | null
  active_member_count: number | string | null
  wallet_count: number | string | null
  active_wallet_count: number | string | null
  finance_expense_count: number | string | null
  provider_snapshot_id: string | null
  latest_observed_expense_date: string | Date | null
  latest_tooling_activity_at: string | Date | null
  snapshot_status: ToolProviderCostBasisSnapshotStatus
  refresh_reason: string | null
  detail_jsonb: Record<string, unknown> | null
  materialized_at: string | Date
  created_at: string | Date
  updated_at: string | Date
}

const round2 = (value: number) => Math.round(value * 100) / 100
const round4 = (value: number) => Math.round(value * 10_000) / 10_000

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown) => {
  if (value == null) return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDateString = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toTimestampString = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const getPeriodStart = (year: number, month: number) => `${year}-${pad2(month)}-01`

const getPeriodEnd = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month, 0))

  return date.toISOString().slice(0, 10)
}

export const resolveToolProviderTenantScopeKey = (tenantScope?: CommercialCostBasisTenantScope) =>
  tenantScope?.spaceId?.trim() ||
  tenantScope?.clientId?.trim() ||
  tenantScope?.organizationId?.trim() ||
  'global'

const mapRow = (row: ToolProviderCostBasisRow): ToolProviderCostBasisSnapshot => ({
  snapshotId: row.snapshot_id,
  snapshotKey: row.snapshot_key,
  toolId: row.tool_id,
  toolSku: row.tool_sku,
  toolName: row.tool_name,
  providerId: row.provider_id,
  providerName: row.provider_name,
  supplierId: row.supplier_id,
  organizationId: row.organization_id,
  clientId: row.client_id,
  spaceId: row.space_id,
  tenantScopeKey: row.tenant_scope_key,
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  periodId: row.period_id,
  snapshotDate: toDateString(row.snapshot_date) ?? '',
  sourceKind: row.source_kind,
  sourceRef: row.source_ref,
  sourceCurrency: row.source_currency,
  sourceAmount: round2(toNumber(row.source_amount)),
  resolvedCurrency: row.resolved_currency,
  resolvedAmount: round2(toNumber(row.resolved_amount)),
  resolvedAmountClp: round2(toNumber(row.resolved_amount_clp)),
  observedCostClp: round2(toNumber(row.observed_cost_clp)),
  modeledSubscriptionCostClp: round2(toNumber(row.modeled_subscription_cost_clp)),
  modeledUsageCostClp: round2(toNumber(row.modeled_usage_cost_clp)),
  fallbackCatalogCostUsd: toNullableNumber(row.fallback_catalog_cost_usd),
  fxRateToClp: toNullableNumber(row.fx_rate_to_clp),
  fxRateDate: toDateString(row.fx_rate_date),
  freshnessDays: toNumber(row.freshness_days),
  freshnessStatus: row.freshness_status,
  confidenceScore: round4(toNumber(row.confidence_score)),
  confidenceLabel: row.confidence_label,
  activeLicenseCount: toNumber(row.active_license_count),
  activeMemberCount: toNumber(row.active_member_count),
  walletCount: toNumber(row.wallet_count),
  activeWalletCount: toNumber(row.active_wallet_count),
  financeExpenseCount: toNumber(row.finance_expense_count),
  providerSnapshotId: row.provider_snapshot_id,
  latestObservedExpenseDate: toDateString(row.latest_observed_expense_date),
  latestToolingActivityAt: toTimestampString(row.latest_tooling_activity_at),
  snapshotStatus: row.snapshot_status,
  refreshReason: row.refresh_reason,
  detail: row.detail_jsonb ?? {},
  materializedAt: toTimestampString(row.materialized_at) ?? '',
  createdAt: toTimestampString(row.created_at) ?? '',
  updatedAt: toTimestampString(row.updated_at) ?? ''
})

export const materializeToolProviderCostBasisSnapshotsForPeriod = async (
  year: number,
  month: number,
  options: MaterializeToolProviderCostBasisOptions = {}
): Promise<ToolProviderCostBasisSnapshot[]> => {
  const db = await getDb()
  const periodStart = getPeriodStart(year, month)
  const periodEnd = getPeriodEnd(year, month)
  const snapshotDate = getLastBusinessDayOfMonth(year, month)
  const periodId = `${year}-${pad2(month)}`
  const tenantScope = options.tenantScope ?? {}
  const tenantScopeKey = resolveToolProviderTenantScopeKey(tenantScope)
  const reason = options.reason?.trim() || null

  const result = await sql<ToolProviderCostBasisRow>`
    WITH params AS (
      SELECT
        ${year}::integer AS period_year,
        ${month}::integer AS period_month,
        ${periodId}::text AS period_id,
        ${periodStart}::date AS period_start,
        ${periodEnd}::date AS period_end,
        ${snapshotDate}::date AS snapshot_date,
        ${tenantScope.organizationId ?? null}::text AS organization_id,
        ${tenantScope.clientId ?? null}::text AS client_id,
        ${tenantScope.spaceId ?? null}::text AS space_id,
        ${tenantScopeKey}::text AS tenant_scope_key,
        ${reason}::text AS refresh_reason
    ),
    primary_supplier AS (
      SELECT DISTINCT ON (s.provider_id)
        s.provider_id,
        s.supplier_id,
        s.organization_id,
        s.payment_currency
      FROM greenhouse_finance.suppliers AS s
      ORDER BY
        s.provider_id,
        s.is_active DESC,
        s.updated_at DESC NULLS LAST,
        s.created_at DESC NULLS LAST
    ),
    tool_candidates AS (
      SELECT
        t.tool_id,
        t.tool_sku,
        t.tool_name,
        t.provider_id,
        p.provider_name,
        COALESCE(t.fin_supplier_id, ps.supplier_id) AS supplier_id,
        t.fin_supplier_id,
        t.subscription_amount,
        UPPER(COALESCE(t.subscription_currency, 'USD')) AS subscription_currency,
        LOWER(COALESCE(t.subscription_billing_cycle, 'monthly')) AS subscription_billing_cycle,
        t.subscription_seats,
        t.prorated_cost_usd,
        t.cost_model,
        t.is_active,
        t.updated_at
      FROM greenhouse_ai.tool_catalog AS t
      INNER JOIN greenhouse_core.providers AS p
        ON p.provider_id = t.provider_id
      LEFT JOIN primary_supplier AS ps
        ON ps.provider_id = t.provider_id
      CROSS JOIN params
      WHERE
        t.is_active = TRUE
        OR EXISTS (
          SELECT 1
          FROM greenhouse_ai.member_tool_licenses AS l
          WHERE l.tool_id = t.tool_id
            AND l.license_status = 'active'
            AND COALESCE(l.activated_at, params.period_start) <= params.period_end
            AND (l.expires_at IS NULL OR l.expires_at >= params.period_start)
        )
        OR EXISTS (
          SELECT 1
          FROM greenhouse_ai.credit_wallets AS w
          WHERE w.tool_id = t.tool_id
        )
        OR EXISTS (
          SELECT 1
          FROM greenhouse_finance.expenses AS e
          WHERE e.supplier_id = t.fin_supplier_id
            AND COALESCE(e.document_date, e.payment_date) >= params.period_start
            AND COALESCE(e.document_date, e.payment_date) <= params.period_end
        )
    ),
    license_summary AS (
      SELECT
        t.tool_id,
        COUNT(*)::integer AS active_license_count,
        COUNT(DISTINCT l.member_id)::integer AS active_member_count,
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
        )::numeric(14,2) AS modeled_subscription_cost_clp,
        MAX(COALESCE(l.updated_at, l.created_at, l.activated_at::timestamptz)) AS latest_license_activity_at,
        MAX(fx.rate)::numeric(14,6) AS license_fx_rate_to_clp,
        MAX(fx.rate_date) AS license_fx_rate_date,
        COUNT(*) FILTER (
          WHERE LOWER(COALESCE(t.cost_model, '')) IN ('subscription', 'hybrid')
            AND t.subscription_amount IS NOT NULL
            AND UPPER(COALESCE(t.subscription_currency, 'CLP')) <> 'CLP'
            AND fx.rate IS NULL
        )::integer AS missing_fx_license_count
      FROM greenhouse_ai.member_tool_licenses AS l
      INNER JOIN tool_candidates AS t
        ON t.tool_id = l.tool_id
      CROSS JOIN params
      LEFT JOIN LATERAL (
        SELECT
          rate,
          rate_date
        FROM greenhouse_finance.exchange_rates
        WHERE from_currency = UPPER(COALESCE(t.subscription_currency, 'CLP'))
          AND to_currency = 'CLP'
          AND rate_date <= params.snapshot_date
        ORDER BY rate_date DESC
        LIMIT 1
      ) AS fx ON TRUE
      WHERE l.license_status = 'active'
        AND COALESCE(l.activated_at, params.period_start) <= params.period_end
        AND (l.expires_at IS NULL OR l.expires_at >= params.period_start)
      GROUP BY t.tool_id
    ),
    usage_summary AS (
      SELECT
        t.tool_id,
        COUNT(DISTINCT w.wallet_id)::integer AS wallet_count,
        COUNT(DISTINCT w.wallet_id) FILTER (WHERE w.wallet_status = 'active')::integer AS active_wallet_count,
        COALESCE(SUM(COALESCE(l.total_cost_clp, 0)), 0)::numeric(14,2) AS modeled_usage_cost_clp,
        MAX(l.created_at) AS latest_tooling_activity_at
      FROM tool_candidates AS t
      LEFT JOIN greenhouse_ai.credit_wallets AS w
        ON w.tool_id = t.tool_id
      CROSS JOIN params
      LEFT JOIN greenhouse_ai.credit_ledger AS l
        ON l.wallet_id = w.wallet_id
       AND l.entry_type = 'debit'
       AND l.created_at::date >= params.period_start
       AND l.created_at::date <= params.period_end
      GROUP BY t.tool_id
    ),
    finance_direct_summary AS (
      SELECT
        t.tool_id,
        COUNT(e.expense_id)::integer AS finance_expense_count,
        COALESCE(SUM(COALESCE(e.effective_cost_amount_clp, e.total_amount_clp, 0)), 0)::numeric(14,2) AS observed_cost_clp,
        MAX(COALESCE(e.document_date, e.payment_date)) AS latest_observed_expense_date
      FROM tool_candidates AS t
      CROSS JOIN params
      LEFT JOIN greenhouse_finance.expenses AS e
        ON e.supplier_id = t.fin_supplier_id
       AND COALESCE(e.document_date, e.payment_date) >= params.period_start
       AND COALESCE(e.document_date, e.payment_date) <= params.period_end
      GROUP BY t.tool_id
    ),
    catalog_fx AS (
      SELECT
        t.tool_id,
        fx.rate::numeric(14,6) AS catalog_fx_rate_to_clp,
        fx.rate_date AS catalog_fx_rate_date
      FROM tool_candidates AS t
      CROSS JOIN params
      LEFT JOIN LATERAL (
        SELECT
          rate,
          rate_date
        FROM greenhouse_finance.exchange_rates
        WHERE from_currency = 'USD'
          AND to_currency = 'CLP'
          AND rate_date <= params.snapshot_date
        ORDER BY rate_date DESC
        LIMIT 1
      ) AS fx ON TRUE
    ),
    provider_snapshot AS (
      SELECT
        provider_id,
        snapshot_id,
        snapshot_status
      FROM greenhouse_serving.provider_tooling_snapshots
      CROSS JOIN params
      WHERE period_year = params.period_year
        AND period_month = params.period_month
    ),
    resolved AS (
      SELECT
        CONCAT(
          'tpb:',
          t.tool_id,
          ':',
          t.provider_id,
          ':',
          params.period_id,
          ':',
          params.tenant_scope_key
        ) AS snapshot_key,
        t.tool_id,
        t.tool_sku,
        t.tool_name,
        t.provider_id,
        t.provider_name,
        t.supplier_id,
        params.organization_id,
        params.client_id,
        params.space_id,
        params.tenant_scope_key,
        params.period_year,
        params.period_month,
        params.period_id,
        params.snapshot_date,
        COALESCE(fd.observed_cost_clp, 0)::numeric(14,2) AS observed_cost_clp,
        COALESCE(ls.modeled_subscription_cost_clp, 0)::numeric(14,2) AS modeled_subscription_cost_clp,
        COALESCE(us.modeled_usage_cost_clp, 0)::numeric(14,2) AS modeled_usage_cost_clp,
        t.prorated_cost_usd::numeric(14,4) AS fallback_catalog_cost_usd,
        COALESCE(ls.active_license_count, 0)::integer AS active_license_count,
        COALESCE(ls.active_member_count, 0)::integer AS active_member_count,
        COALESCE(us.wallet_count, 0)::integer AS wallet_count,
        COALESCE(us.active_wallet_count, 0)::integer AS active_wallet_count,
        COALESCE(fd.finance_expense_count, 0)::integer AS finance_expense_count,
        ps.snapshot_id AS provider_snapshot_id,
        fd.latest_observed_expense_date,
        GREATEST(
          COALESCE(us.latest_tooling_activity_at, '-infinity'::timestamptz),
          COALESCE(ls.latest_license_activity_at, '-infinity'::timestamptz)
        ) AS latest_tooling_activity_at,
        params.refresh_reason,
        CASE
          WHEN COALESCE(fd.observed_cost_clp, 0) > 0 THEN 'finance_observed'
          WHEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0)) > 0
            AND COALESCE(ls.modeled_subscription_cost_clp, 0) > 0
            AND COALESCE(us.modeled_usage_cost_clp, 0) > 0
          THEN 'hybrid_modeled'
          WHEN COALESCE(ls.modeled_subscription_cost_clp, 0) > 0 THEN 'license_modeled'
          WHEN COALESCE(us.modeled_usage_cost_clp, 0) > 0 THEN 'usage_modeled'
          WHEN t.prorated_cost_usd IS NOT NULL AND COALESCE(cf.catalog_fx_rate_to_clp, 0) > 0 THEN 'catalog_prorated'
          ELSE 'unresolved'
        END::text AS source_kind,
        CASE
          WHEN COALESCE(fd.observed_cost_clp, 0) > 0 THEN COALESCE(t.fin_supplier_id, t.supplier_id, t.tool_id)
          WHEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0)) > 0 THEN t.tool_id
          WHEN t.prorated_cost_usd IS NOT NULL AND COALESCE(cf.catalog_fx_rate_to_clp, 0) > 0 THEN COALESCE(t.tool_sku, t.tool_id)
          ELSE NULL
        END AS source_ref,
        CASE
          WHEN COALESCE(fd.observed_cost_clp, 0) > 0 THEN 'CLP'
          WHEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0)) > 0 THEN 'CLP'
          WHEN t.prorated_cost_usd IS NOT NULL AND COALESCE(cf.catalog_fx_rate_to_clp, 0) > 0 THEN 'USD'
          ELSE 'CLP'
        END AS source_currency,
        CASE
          WHEN COALESCE(fd.observed_cost_clp, 0) > 0 THEN COALESCE(fd.observed_cost_clp, 0)::numeric(14,2)
          WHEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0)) > 0
            THEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0))::numeric(14,2)
          WHEN t.prorated_cost_usd IS NOT NULL AND COALESCE(cf.catalog_fx_rate_to_clp, 0) > 0
            THEN t.prorated_cost_usd::numeric(14,2)
          ELSE 0::numeric(14,2)
        END AS source_amount,
        'CLP'::text AS resolved_currency,
        CASE
          WHEN COALESCE(fd.observed_cost_clp, 0) > 0 THEN COALESCE(fd.observed_cost_clp, 0)::numeric(14,2)
          WHEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0)) > 0
            THEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0))::numeric(14,2)
          WHEN t.prorated_cost_usd IS NOT NULL AND COALESCE(cf.catalog_fx_rate_to_clp, 0) > 0
            THEN ROUND((t.prorated_cost_usd * cf.catalog_fx_rate_to_clp)::numeric, 2)
          ELSE 0::numeric(14,2)
        END AS resolved_amount_clp,
        CASE
          WHEN COALESCE(fd.observed_cost_clp, 0) > 0 THEN 1::numeric(14,6)
          WHEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0)) > 0
            THEN COALESCE(
              ls.license_fx_rate_to_clp,
              CASE WHEN t.subscription_currency = 'CLP' THEN 1::numeric(14,6) ELSE NULL::numeric END
            )
          WHEN t.prorated_cost_usd IS NOT NULL AND COALESCE(cf.catalog_fx_rate_to_clp, 0) > 0
            THEN cf.catalog_fx_rate_to_clp
          ELSE NULL::numeric(14,6)
        END AS fx_rate_to_clp,
        CASE
          WHEN COALESCE(fd.observed_cost_clp, 0) > 0 THEN params.snapshot_date
          WHEN (COALESCE(ls.modeled_subscription_cost_clp, 0) + COALESCE(us.modeled_usage_cost_clp, 0)) > 0
            THEN COALESCE(ls.license_fx_rate_date, params.snapshot_date)
          WHEN t.prorated_cost_usd IS NOT NULL AND COALESCE(cf.catalog_fx_rate_to_clp, 0) > 0
            THEN cf.catalog_fx_rate_date
          ELSE NULL::date
        END AS fx_rate_date,
        CASE
          WHEN COALESCE(fd.latest_observed_expense_date, NULL) IS NOT NULL THEN fd.latest_observed_expense_date
          WHEN GREATEST(
            COALESCE(us.latest_tooling_activity_at, '-infinity'::timestamptz),
            COALESCE(ls.latest_license_activity_at, '-infinity'::timestamptz)
          ) > '-infinity'::timestamptz
            THEN GREATEST(
              COALESCE(us.latest_tooling_activity_at, '-infinity'::timestamptz),
              COALESCE(ls.latest_license_activity_at, '-infinity'::timestamptz)
            )::date
          WHEN t.updated_at IS NOT NULL THEN t.updated_at::date
          ELSE NULL::date
        END AS freshness_anchor_date,
        COALESCE(ls.missing_fx_license_count, 0)::integer AS missing_fx_license_count,
        COALESCE(ps.snapshot_status, 'missing') AS provider_snapshot_status
      FROM tool_candidates AS t
      CROSS JOIN params
      LEFT JOIN license_summary AS ls
        ON ls.tool_id = t.tool_id
      LEFT JOIN usage_summary AS us
        ON us.tool_id = t.tool_id
      LEFT JOIN finance_direct_summary AS fd
        ON fd.tool_id = t.tool_id
      LEFT JOIN catalog_fx AS cf
        ON cf.tool_id = t.tool_id
      LEFT JOIN provider_snapshot AS ps
        ON ps.provider_id = t.provider_id
    ),
    decorated AS (
      SELECT
        r.*,
        r.resolved_amount_clp AS resolved_amount,
        CASE
          WHEN r.freshness_anchor_date IS NULL THEN 0
          ELSE GREATEST((r.snapshot_date - r.freshness_anchor_date), 0)
        END::integer AS freshness_days,
        CASE
          WHEN r.freshness_anchor_date IS NULL THEN 'unknown'
          WHEN GREATEST((r.snapshot_date - r.freshness_anchor_date), 0) > 45 THEN 'stale'
          ELSE 'fresh'
        END::text AS freshness_status
      FROM resolved AS r
    ),
    scored AS (
      SELECT
        d.*,
        GREATEST(
          0.05::numeric,
          (
            CASE d.source_kind
              WHEN 'finance_observed' THEN 0.95::numeric
              WHEN 'hybrid_modeled' THEN 0.82::numeric
              WHEN 'license_modeled' THEN 0.74::numeric
              WHEN 'usage_modeled' THEN 0.68::numeric
              WHEN 'catalog_prorated' THEN 0.45::numeric
              ELSE 0.10::numeric
            END
          ) -
          (
            CASE d.freshness_status
              WHEN 'stale' THEN 0.15::numeric
              WHEN 'unknown' THEN 0.20::numeric
              ELSE 0::numeric
            END
          ) -
          (
            CASE
              WHEN d.missing_fx_license_count > 0 THEN 0.10::numeric
              ELSE 0::numeric
            END
          )
        )::numeric(5,4) AS confidence_score
      FROM decorated AS d
    ),
    upserted AS (
      INSERT INTO greenhouse_commercial.tool_provider_cost_basis_snapshots (
        snapshot_key,
        tool_id,
        tool_sku,
        tool_name,
        provider_id,
        provider_name,
        supplier_id,
        organization_id,
        client_id,
        space_id,
        tenant_scope_key,
        period_year,
        period_month,
        period_id,
        snapshot_date,
        source_kind,
        source_ref,
        source_currency,
        source_amount,
        resolved_currency,
        resolved_amount,
        resolved_amount_clp,
        observed_cost_clp,
        modeled_subscription_cost_clp,
        modeled_usage_cost_clp,
        fallback_catalog_cost_usd,
        fx_rate_to_clp,
        fx_rate_date,
        freshness_days,
        freshness_status,
        confidence_score,
        confidence_label,
        active_license_count,
        active_member_count,
        wallet_count,
        active_wallet_count,
        finance_expense_count,
        provider_snapshot_id,
        latest_observed_expense_date,
        latest_tooling_activity_at,
        snapshot_status,
        refresh_reason,
        detail_jsonb,
        materialized_at,
        updated_at
      )
      SELECT
        s.snapshot_key,
        s.tool_id,
        s.tool_sku,
        s.tool_name,
        s.provider_id,
        s.provider_name,
        s.supplier_id,
        s.organization_id,
        s.client_id,
        s.space_id,
        s.tenant_scope_key,
        s.period_year,
        s.period_month,
        s.period_id,
        s.snapshot_date,
        s.source_kind::text,
        s.source_ref,
        s.source_currency,
        s.source_amount,
        s.resolved_currency,
        s.resolved_amount,
        s.resolved_amount_clp,
        s.observed_cost_clp,
        s.modeled_subscription_cost_clp,
        s.modeled_usage_cost_clp,
        s.fallback_catalog_cost_usd,
        s.fx_rate_to_clp,
        s.fx_rate_date,
        s.freshness_days,
        s.freshness_status::text,
        s.confidence_score,
        CASE
          WHEN s.confidence_score >= 0.8 THEN 'high'
          WHEN s.confidence_score >= 0.55 THEN 'medium'
          ELSE 'low'
        END::text AS confidence_label,
        s.active_license_count,
        s.active_member_count,
        s.wallet_count,
        s.active_wallet_count,
        s.finance_expense_count,
        s.provider_snapshot_id,
        s.latest_observed_expense_date,
        CASE
          WHEN s.latest_tooling_activity_at = '-infinity'::timestamptz THEN NULL::timestamptz
          ELSE s.latest_tooling_activity_at
        END,
        CASE
          WHEN s.source_kind = 'unresolved' THEN 'unresolved'
          WHEN s.missing_fx_license_count > 0 OR s.provider_snapshot_status = 'partial' THEN 'partial'
          ELSE 'complete'
        END::text AS snapshot_status,
        s.refresh_reason,
        jsonb_build_object(
          'observedCostClp', s.observed_cost_clp,
          'modeledSubscriptionCostClp', s.modeled_subscription_cost_clp,
          'modeledUsageCostClp', s.modeled_usage_cost_clp,
          'fallbackCatalogCostUsd', s.fallback_catalog_cost_usd,
          'activeLicenseCount', s.active_license_count,
          'activeMemberCount', s.active_member_count,
          'walletCount', s.wallet_count,
          'activeWalletCount', s.active_wallet_count,
          'financeExpenseCount', s.finance_expense_count,
          'missingFxLicenseCount', s.missing_fx_license_count,
          'providerSnapshotStatus', s.provider_snapshot_status
        )::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM scored AS s
      ON CONFLICT (tool_id, provider_id, period_year, period_month, tenant_scope_key)
      DO UPDATE SET
        snapshot_key = EXCLUDED.snapshot_key,
        tool_sku = EXCLUDED.tool_sku,
        tool_name = EXCLUDED.tool_name,
        provider_name = EXCLUDED.provider_name,
        supplier_id = EXCLUDED.supplier_id,
        organization_id = EXCLUDED.organization_id,
        client_id = EXCLUDED.client_id,
        space_id = EXCLUDED.space_id,
        period_id = EXCLUDED.period_id,
        snapshot_date = EXCLUDED.snapshot_date,
        source_kind = EXCLUDED.source_kind,
        source_ref = EXCLUDED.source_ref,
        source_currency = EXCLUDED.source_currency,
        source_amount = EXCLUDED.source_amount,
        resolved_currency = EXCLUDED.resolved_currency,
        resolved_amount = EXCLUDED.resolved_amount,
        resolved_amount_clp = EXCLUDED.resolved_amount_clp,
        observed_cost_clp = EXCLUDED.observed_cost_clp,
        modeled_subscription_cost_clp = EXCLUDED.modeled_subscription_cost_clp,
        modeled_usage_cost_clp = EXCLUDED.modeled_usage_cost_clp,
        fallback_catalog_cost_usd = EXCLUDED.fallback_catalog_cost_usd,
        fx_rate_to_clp = EXCLUDED.fx_rate_to_clp,
        fx_rate_date = EXCLUDED.fx_rate_date,
        freshness_days = EXCLUDED.freshness_days,
        freshness_status = EXCLUDED.freshness_status,
        confidence_score = EXCLUDED.confidence_score,
        confidence_label = EXCLUDED.confidence_label,
        active_license_count = EXCLUDED.active_license_count,
        active_member_count = EXCLUDED.active_member_count,
        wallet_count = EXCLUDED.wallet_count,
        active_wallet_count = EXCLUDED.active_wallet_count,
        finance_expense_count = EXCLUDED.finance_expense_count,
        provider_snapshot_id = EXCLUDED.provider_snapshot_id,
        latest_observed_expense_date = EXCLUDED.latest_observed_expense_date,
        latest_tooling_activity_at = EXCLUDED.latest_tooling_activity_at,
        snapshot_status = EXCLUDED.snapshot_status,
        refresh_reason = EXCLUDED.refresh_reason,
        detail_jsonb = EXCLUDED.detail_jsonb,
        materialized_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        snapshot_id,
        snapshot_key,
        tool_id,
        tool_sku,
        tool_name,
        provider_id,
        provider_name,
        supplier_id,
        organization_id,
        client_id,
        space_id,
        tenant_scope_key,
        period_year,
        period_month,
        period_id,
        snapshot_date,
        source_kind,
        source_ref,
        source_currency,
        source_amount,
        resolved_currency,
        resolved_amount,
        resolved_amount_clp,
        observed_cost_clp,
        modeled_subscription_cost_clp,
        modeled_usage_cost_clp,
        fallback_catalog_cost_usd,
        fx_rate_to_clp,
        fx_rate_date,
        freshness_days,
        freshness_status,
        confidence_score,
        confidence_label,
        active_license_count,
        active_member_count,
        wallet_count,
        active_wallet_count,
        finance_expense_count,
        provider_snapshot_id,
        latest_observed_expense_date,
        latest_tooling_activity_at,
        snapshot_status,
        refresh_reason,
        detail_jsonb,
        materialized_at,
        created_at,
        updated_at
    )
    SELECT * FROM upserted
    ORDER BY provider_id ASC, tool_name ASC
  `.execute(db)

  return result.rows.map(mapRow)
}
