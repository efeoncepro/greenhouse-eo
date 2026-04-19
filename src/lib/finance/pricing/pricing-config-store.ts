import 'server-only'

import { query } from '@/lib/db'

import type {
  MarginMetricKey,
  MarginTarget,
  MarginTargetResolution,
  RevenueMetricConfig,
  RoleRateCard,
  RoleRateCardResolution,
  RoleRateSeniorityLevel,
  QuotationPricingCurrency
} from './contracts'
import { MARGIN_METRIC_KEYS, QUOTATION_PRICING_CURRENCIES, ROLE_RATE_SENIORITY_LEVELS } from './contracts'

const DEFAULT_TARGET_PCT = 25
const DEFAULT_FLOOR_PCT = 15

type MarginTargetRow = {
  target_id: string
  business_line_code: string | null
  target_margin_pct: string | number
  floor_margin_pct: string | number
  effective_from: string | Date
  effective_until: string | Date | null
  notes: string | null
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

type RoleRateCardRow = {
  rate_card_id: string
  business_line_code: string | null
  role_code: string
  seniority_level: string
  hourly_rate_cost: string | number
  currency: string
  effective_from: string | Date
  effective_until: string | Date | null
  notes: string | null
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

type RevenueMetricConfigRow = {
  config_id: string
  business_line_code: string | null
  hubspot_amount_metric: string
  pipeline_default_metric: string
  active: boolean
  notes: string | null
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toTimestampString = (value: string | Date | null): string => {
  if (!value) return new Date(0).toISOString()
  if (value instanceof Date) return value.toISOString()

  return value
}

const coerceSeniority = (value: string): RoleRateSeniorityLevel => {
  const trimmed = value.toLowerCase() as RoleRateSeniorityLevel

  return ROLE_RATE_SENIORITY_LEVELS.includes(trimmed) ? trimmed : 'mid'
}

const coerceCurrency = (value: string): QuotationPricingCurrency => {
  const trimmed = value.toUpperCase() as QuotationPricingCurrency

  return QUOTATION_PRICING_CURRENCIES.includes(trimmed) ? trimmed : 'CLP'
}

const coerceMetric = (value: string): MarginMetricKey => {
  const trimmed = value.toLowerCase() as MarginMetricKey

  return MARGIN_METRIC_KEYS.includes(trimmed) ? trimmed : 'tcv'
}

const mapMarginTarget = (row: MarginTargetRow): MarginTarget => ({
  targetId: row.target_id,
  businessLineCode: row.business_line_code,
  targetMarginPct: toNum(row.target_margin_pct),
  floorMarginPct: toNum(row.floor_margin_pct),
  effectiveFrom: toDateString(row.effective_from) ?? '',
  effectiveUntil: toDateString(row.effective_until),
  notes: row.notes,
  createdBy: row.created_by,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const mapRoleRateCard = (row: RoleRateCardRow): RoleRateCard => ({
  rateCardId: row.rate_card_id,
  businessLineCode: row.business_line_code,
  roleCode: row.role_code,
  seniorityLevel: coerceSeniority(row.seniority_level),
  hourlyRateCost: toNum(row.hourly_rate_cost),
  currency: coerceCurrency(row.currency),
  effectiveFrom: toDateString(row.effective_from) ?? '',
  effectiveUntil: toDateString(row.effective_until),
  notes: row.notes,
  createdBy: row.created_by,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const mapRevenueMetricConfig = (row: RevenueMetricConfigRow): RevenueMetricConfig => ({
  configId: row.config_id,
  businessLineCode: row.business_line_code,
  hubspotAmountMetric: coerceMetric(row.hubspot_amount_metric),
  pipelineDefaultMetric: coerceMetric(row.pipeline_default_metric),
  active: Boolean(row.active),
  notes: row.notes,
  createdBy: row.created_by,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

export const listMarginTargets = async (): Promise<MarginTarget[]> => {
  const rows = await query<MarginTargetRow>(
    `SELECT target_id, business_line_code, target_margin_pct, floor_margin_pct,
            effective_from, effective_until, notes, created_by, created_at, updated_at
     FROM greenhouse_commercial.margin_targets
     ORDER BY business_line_code NULLS FIRST, effective_from DESC`
  )

  return rows.map(mapMarginTarget)
}

/**
 * @deprecated TASK-464a/d replaced role_rate_cards with the canonical
 * `greenhouse_commercial.sellable_roles` + `sellable_role_cost_components` +
 * `sellable_role_pricing_currency` triangle. Pricing engine v2 no longer
 * reads rate cards. Legacy consumers remain (costing-engine.ts lineType='role')
 * and emit a `legacy_rate_card_used` resolutionNote when they hit this path.
 * Do not extend this table — migrate new pricing onto sellable_roles.
 * Full deprecation tracked in TASK-476.
 */
export const listRoleRateCards = async (): Promise<RoleRateCard[]> => {
  const rows = await query<RoleRateCardRow>(
    `SELECT rate_card_id, business_line_code, role_code, seniority_level,
            hourly_rate_cost, currency, effective_from, effective_until,
            notes, created_by, created_at, updated_at
     FROM greenhouse_commercial.role_rate_cards
     ORDER BY business_line_code NULLS FIRST, role_code, seniority_level, effective_from DESC`
  )

  return rows.map(mapRoleRateCard)
}

export const listRevenueMetricConfigs = async (): Promise<RevenueMetricConfig[]> => {
  const rows = await query<RevenueMetricConfigRow>(
    `SELECT config_id, business_line_code, hubspot_amount_metric,
            pipeline_default_metric, active, notes,
            created_by, created_at, updated_at
     FROM greenhouse_commercial.revenue_metric_config
     WHERE active = TRUE
     ORDER BY business_line_code NULLS FIRST`
  )

  return rows.map(mapRevenueMetricConfig)
}

export interface ResolveMarginTargetInput {
  businessLineCode: string | null
  quoteDate: string
  quotationOverride?: { targetMarginPct?: number | null; floorMarginPct?: number | null } | null
}

export const resolveMarginTarget = async (
  input: ResolveMarginTargetInput
): Promise<MarginTargetResolution> => {
  const override = input.quotationOverride

  if (
    override &&
    typeof override.targetMarginPct === 'number' &&
    typeof override.floorMarginPct === 'number' &&
    Number.isFinite(override.targetMarginPct) &&
    Number.isFinite(override.floorMarginPct)
  ) {
    return {
      targetMarginPct: override.targetMarginPct,
      floorMarginPct: override.floorMarginPct,
      source: 'quotation_override',
      businessLineCode: input.businessLineCode,
      targetId: null
    }
  }

  const businessLineCode = input.businessLineCode?.trim() || null
  const quoteDate = input.quoteDate

  const rows = await query<MarginTargetRow & { resolution_priority: number }>(
    `SELECT target_id, business_line_code, target_margin_pct, floor_margin_pct,
            effective_from, effective_until, notes, created_by, created_at, updated_at,
            CASE
              WHEN business_line_code IS NOT NULL AND business_line_code = $1 THEN 0
              WHEN business_line_code IS NULL THEN 1
              ELSE 2
            END AS resolution_priority
     FROM greenhouse_commercial.margin_targets
     WHERE effective_from <= $2::date
       AND (effective_until IS NULL OR effective_until >= $2::date)
       AND (business_line_code = $1 OR business_line_code IS NULL)
     ORDER BY resolution_priority ASC, effective_from DESC
     LIMIT 1`,
    [businessLineCode, quoteDate]
  )

  const row = rows[0]

  if (!row) {
    return {
      targetMarginPct: DEFAULT_TARGET_PCT,
      floorMarginPct: DEFAULT_FLOOR_PCT,
      source: 'global_default',
      businessLineCode,
      targetId: null
    }
  }

  const mapped = mapMarginTarget(row)

  return {
    targetMarginPct: mapped.targetMarginPct,
    floorMarginPct: mapped.floorMarginPct,
    source: mapped.businessLineCode === businessLineCode && businessLineCode !== null
      ? 'business_line'
      : 'global_default',
    businessLineCode: mapped.businessLineCode,
    targetId: mapped.targetId
  }
}

export interface ResolveRoleRateCardInput {
  businessLineCode: string | null
  roleCode: string
  seniorityLevel?: RoleRateSeniorityLevel | null
  quoteDate: string
}

export const resolveRoleRateCard = async (
  input: ResolveRoleRateCardInput
): Promise<RoleRateCardResolution | null> => {
  const roleCode = input.roleCode.trim()

  if (!roleCode) return null

  const seniority = input.seniorityLevel ?? 'mid'
  const businessLineCode = input.businessLineCode?.trim() || null

  const rows = await query<RoleRateCardRow & { resolution_priority: number }>(
    `SELECT rate_card_id, business_line_code, role_code, seniority_level,
            hourly_rate_cost, currency, effective_from, effective_until,
            notes, created_by, created_at, updated_at,
            CASE
              WHEN business_line_code = $1 AND seniority_level = $2 THEN 0
              WHEN business_line_code = $1 AND seniority_level <> $2 THEN 1
              WHEN business_line_code IS NULL AND seniority_level = $2 THEN 2
              WHEN business_line_code IS NULL THEN 3
              ELSE 4
            END AS resolution_priority
     FROM greenhouse_commercial.role_rate_cards
     WHERE role_code = $3
       AND effective_from <= $4::date
       AND (effective_until IS NULL OR effective_until >= $4::date)
       AND (business_line_code = $1 OR business_line_code IS NULL)
     ORDER BY resolution_priority ASC, effective_from DESC
     LIMIT 1`,
    [businessLineCode, seniority, roleCode, input.quoteDate]
  )

  const row = rows[0]

  if (!row) return null

  const mapped = mapRoleRateCard(row)

  const isExactMatch =
    mapped.businessLineCode === businessLineCode &&
    mapped.seniorityLevel === seniority

  return {
    rateCardId: mapped.rateCardId,
    hourlyRateCost: mapped.hourlyRateCost,
    currency: mapped.currency,
    seniorityLevel: mapped.seniorityLevel,
    effectiveFrom: mapped.effectiveFrom,
    source: isExactMatch ? 'exact_match' : 'global_fallback'
  }
}

export const resolveRevenueMetricConfig = async (
  businessLineCode: string | null
): Promise<RevenueMetricConfig | null> => {
  const trimmed = businessLineCode?.trim() || null

  const rows = await query<RevenueMetricConfigRow & { resolution_priority: number }>(
    `SELECT config_id, business_line_code, hubspot_amount_metric,
            pipeline_default_metric, active, notes,
            created_by, created_at, updated_at,
            CASE
              WHEN business_line_code = $1 THEN 0
              WHEN business_line_code IS NULL THEN 1
              ELSE 2
            END AS resolution_priority
     FROM greenhouse_commercial.revenue_metric_config
     WHERE active = TRUE
       AND (business_line_code = $1 OR business_line_code IS NULL)
     ORDER BY resolution_priority ASC
     LIMIT 1`,
    [trimmed]
  )

  const row = rows[0]

  if (!row) return null

  return mapRevenueMetricConfig(row)
}

export interface UpsertMarginTargetInput {
  businessLineCode: string | null
  targetMarginPct: number
  floorMarginPct: number
  effectiveFrom: string
  effectiveUntil?: string | null
  notes?: string | null
  createdBy: string
}

export const upsertMarginTarget = async (
  input: UpsertMarginTargetInput
): Promise<MarginTarget> => {
  const rows = await query<MarginTargetRow>(
    `INSERT INTO greenhouse_commercial.margin_targets (
       business_line_code,
       target_margin_pct,
       floor_margin_pct,
       effective_from,
       effective_until,
       notes,
       created_by,
       updated_at
     ) VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, CURRENT_TIMESTAMP)
     ON CONFLICT (COALESCE(business_line_code, '__global__'), effective_from)
     DO UPDATE SET
       target_margin_pct = EXCLUDED.target_margin_pct,
       floor_margin_pct = EXCLUDED.floor_margin_pct,
       effective_until = EXCLUDED.effective_until,
       notes = EXCLUDED.notes,
       created_by = EXCLUDED.created_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING target_id, business_line_code, target_margin_pct, floor_margin_pct,
               effective_from, effective_until, notes, created_by, created_at, updated_at`,
    [
      input.businessLineCode,
      input.targetMarginPct,
      input.floorMarginPct,
      input.effectiveFrom,
      input.effectiveUntil ?? null,
      input.notes ?? null,
      input.createdBy
    ]
  )

  return mapMarginTarget(rows[0])
}

export interface UpsertRoleRateCardInput {
  businessLineCode: string | null
  roleCode: string
  seniorityLevel: RoleRateSeniorityLevel
  hourlyRateCost: number
  currency: QuotationPricingCurrency
  effectiveFrom: string
  effectiveUntil?: string | null
  notes?: string | null
  createdBy: string
}

export const upsertRoleRateCard = async (
  input: UpsertRoleRateCardInput
): Promise<RoleRateCard> => {
  const rows = await query<RoleRateCardRow>(
    `INSERT INTO greenhouse_commercial.role_rate_cards (
       business_line_code,
       role_code,
       seniority_level,
       hourly_rate_cost,
       currency,
       effective_from,
       effective_until,
       notes,
       created_by,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, CURRENT_TIMESTAMP)
     ON CONFLICT (COALESCE(business_line_code, '__global__'), role_code, seniority_level, effective_from)
     DO UPDATE SET
       hourly_rate_cost = EXCLUDED.hourly_rate_cost,
       currency = EXCLUDED.currency,
       effective_until = EXCLUDED.effective_until,
       notes = EXCLUDED.notes,
       created_by = EXCLUDED.created_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING rate_card_id, business_line_code, role_code, seniority_level,
               hourly_rate_cost, currency, effective_from, effective_until,
               notes, created_by, created_at, updated_at`,
    [
      input.businessLineCode,
      input.roleCode,
      input.seniorityLevel,
      input.hourlyRateCost,
      input.currency,
      input.effectiveFrom,
      input.effectiveUntil ?? null,
      input.notes ?? null,
      input.createdBy
    ]
  )

  return mapRoleRateCard(rows[0])
}

export interface UpsertRevenueMetricConfigInput {
  businessLineCode: string | null
  hubspotAmountMetric: MarginMetricKey
  pipelineDefaultMetric: MarginMetricKey
  active?: boolean
  notes?: string | null
  createdBy: string
}

export const upsertRevenueMetricConfig = async (
  input: UpsertRevenueMetricConfigInput
): Promise<RevenueMetricConfig> => {
  const rows = await query<RevenueMetricConfigRow>(
    `INSERT INTO greenhouse_commercial.revenue_metric_config (
       business_line_code,
       hubspot_amount_metric,
       pipeline_default_metric,
       active,
       notes,
       created_by,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (COALESCE(business_line_code, '__global__'))
     DO UPDATE SET
       hubspot_amount_metric = EXCLUDED.hubspot_amount_metric,
       pipeline_default_metric = EXCLUDED.pipeline_default_metric,
       active = EXCLUDED.active,
       notes = EXCLUDED.notes,
       created_by = EXCLUDED.created_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING config_id, business_line_code, hubspot_amount_metric,
               pipeline_default_metric, active, notes,
               created_by, created_at, updated_at`,
    [
      input.businessLineCode,
      input.hubspotAmountMetric,
      input.pipelineDefaultMetric,
      input.active ?? true,
      input.notes ?? null,
      input.createdBy
    ]
  )

  return mapRevenueMetricConfig(rows[0])
}
