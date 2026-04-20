import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

import type { CommercialCostBasisTenantScope } from '@/lib/commercial-cost-worker/contracts'

import {
  resolveToolProviderTenantScopeKey,
  type ToolProviderCostBasisSnapshot
} from './tool-provider-cost-basis'

type ReaderRow = {
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
  source_kind: ToolProviderCostBasisSnapshot['sourceKind']
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
  freshness_status: ToolProviderCostBasisSnapshot['freshnessStatus']
  confidence_score: number | string | null
  confidence_label: ToolProviderCostBasisSnapshot['confidenceLabel']
  active_license_count: number | string | null
  active_member_count: number | string | null
  wallet_count: number | string | null
  active_wallet_count: number | string | null
  finance_expense_count: number | string | null
  provider_snapshot_id: string | null
  latest_observed_expense_date: string | Date | null
  latest_tooling_activity_at: string | Date | null
  snapshot_status: ToolProviderCostBasisSnapshot['snapshotStatus']
  refresh_reason: string | null
  detail_jsonb: Record<string, unknown> | null
  materialized_at: string | Date
  created_at: string | Date
  updated_at: string | Date
}

interface ReaderInput {
  year?: number | null
  month?: number | null
  tenantScope?: CommercialCostBasisTenantScope
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown) => (value == null ? null : toNumber(value))

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

const mapRow = (row: ReaderRow): ToolProviderCostBasisSnapshot => ({
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
  sourceAmount: toNumber(row.source_amount),
  resolvedCurrency: row.resolved_currency,
  resolvedAmount: toNumber(row.resolved_amount),
  resolvedAmountClp: toNumber(row.resolved_amount_clp),
  observedCostClp: toNumber(row.observed_cost_clp),
  modeledSubscriptionCostClp: toNumber(row.modeled_subscription_cost_clp),
  modeledUsageCostClp: toNumber(row.modeled_usage_cost_clp),
  fallbackCatalogCostUsd: toNullableNumber(row.fallback_catalog_cost_usd),
  fxRateToClp: toNullableNumber(row.fx_rate_to_clp),
  fxRateDate: toDateString(row.fx_rate_date),
  freshnessDays: toNumber(row.freshness_days),
  freshnessStatus: row.freshness_status,
  confidenceScore: toNumber(row.confidence_score),
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

const buildAllowedScopeCondition = (scopeKey: string) =>
  scopeKey === 'global'
    ? sql<boolean>`snapshot.tenant_scope_key = 'global'`
    : sql<boolean>`snapshot.tenant_scope_key IN (${scopeKey}, 'global')`

export const getPreferredToolProviderCostBasisByToolSku = async (
  toolSku: string,
  input: ReaderInput = {}
): Promise<ToolProviderCostBasisSnapshot | null> => {
  const db = await getDb()
  const scopeKey = resolveToolProviderTenantScopeKey(input.tenantScope)
  const year = input.year ?? null
  const month = input.month ?? null

  const result = await sql<ReaderRow>`
    SELECT snapshot.*
    FROM greenhouse_commercial.tool_provider_cost_basis_snapshots AS snapshot
    WHERE snapshot.tool_sku = ${toolSku}
      AND ${buildAllowedScopeCondition(scopeKey)}
    ORDER BY
      CASE
        WHEN ${year}::integer IS NOT NULL
         AND ${month}::integer IS NOT NULL
         AND snapshot.period_year = ${year}
         AND snapshot.period_month = ${month}
        THEN 0
        ELSE 1
      END,
      CASE
        WHEN snapshot.tenant_scope_key = ${scopeKey} THEN 0
        ELSE 1
      END,
      snapshot.period_year DESC,
      snapshot.period_month DESC,
      snapshot.updated_at DESC
    LIMIT 1
  `.execute(db)

  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export const listPreferredToolProviderCostBasisByProvider = async (
  providerId: string,
  input: ReaderInput = {}
): Promise<ToolProviderCostBasisSnapshot[]> => {
  const db = await getDb()
  const scopeKey = resolveToolProviderTenantScopeKey(input.tenantScope)
  const year = input.year ?? null
  const month = input.month ?? null

  const result = await sql<ReaderRow>`
    WITH ranked AS (
      SELECT
        snapshot.*,
        ROW_NUMBER() OVER (
          PARTITION BY snapshot.tool_id
          ORDER BY
            CASE
              WHEN ${year}::integer IS NOT NULL
               AND ${month}::integer IS NOT NULL
               AND snapshot.period_year = ${year}
               AND snapshot.period_month = ${month}
              THEN 0
              ELSE 1
            END,
            CASE
              WHEN snapshot.tenant_scope_key = ${scopeKey} THEN 0
              ELSE 1
            END,
            snapshot.period_year DESC,
            snapshot.period_month DESC,
            snapshot.updated_at DESC
        ) AS rank_index
      FROM greenhouse_commercial.tool_provider_cost_basis_snapshots AS snapshot
      WHERE snapshot.provider_id = ${providerId}
        AND ${buildAllowedScopeCondition(scopeKey)}
    )
    SELECT
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
    FROM ranked
    WHERE rank_index = 1
    ORDER BY tool_name ASC
  `.execute(db)

  return result.rows.map(mapRow)
}
