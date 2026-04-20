import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import {
  publishQuotationLineCostOverridden,
  QUOTATION_LINE_COST_OVERRIDE_CATEGORIES,
  type QuotationLineCostOverrideCategory
} from '@/lib/commercial/quotation-line-cost-override-events'
import { computeOverrideDelta } from '@/lib/finance/pricing/override-delta'

export interface QuotationLineCostOverrideHistoryRow {
  historyId: string
  lineItemId: string
  quotationId: string
  overriddenAt: string
  overriddenByUserId: string | null
  category: QuotationLineCostOverrideCategory
  reason: string
  suggestedUnitCostUsd: number | null
  overrideUnitCostUsd: number
  deltaPct: number | null
}

export interface ApplyQuotationLineCostOverrideInput {
  quotationId: string
  lineItemId: string
  category: QuotationLineCostOverrideCategory
  reason: string
  overrideUnitCostUsd: number
  actor: { userId: string | null }
  metadata?: Record<string, unknown>
}

export interface ApplyQuotationLineCostOverrideResult {
  lineItemId: string
  quotationId: string
  overrideUnitCostUsd: number
  suggestedUnitCostUsd: number | null
  deltaPct: number | null
  overriddenAt: string
  historyId: string
  category: QuotationLineCostOverrideCategory
  reason: string
}

export class QuotationLineCostOverrideValidationError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode = 400, code = 'validation_error') {
    super(message)
    this.name = 'QuotationLineCostOverrideValidationError'
    this.statusCode = statusCode
    this.code = code
  }
}

const isFiniteNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const assertValidCategory = (value: unknown): QuotationLineCostOverrideCategory => {
  if (typeof value !== 'string') {
    throw new QuotationLineCostOverrideValidationError('category is required.', 400, 'category_missing')
  }

  if (!QUOTATION_LINE_COST_OVERRIDE_CATEGORIES.includes(value as QuotationLineCostOverrideCategory)) {
    throw new QuotationLineCostOverrideValidationError(
      `category must be one of ${QUOTATION_LINE_COST_OVERRIDE_CATEGORIES.join(', ')}.`,
      400,
      'category_invalid'
    )
  }

  
return value as QuotationLineCostOverrideCategory
}

const assertReason = (value: unknown, category: QuotationLineCostOverrideCategory): string => {
  if (typeof value !== 'string') {
    throw new QuotationLineCostOverrideValidationError('reason is required.', 400, 'reason_missing')
  }

  const trimmed = value.trim()
  const minLength = category === 'other' ? 30 : 15

  if (trimmed.length < minLength) {
    throw new QuotationLineCostOverrideValidationError(
      `reason must be at least ${minLength} characters when category is "${category}".`,
      400,
      'reason_too_short'
    )
  }

  if (trimmed.length > 500) {
    throw new QuotationLineCostOverrideValidationError(
      'reason must be 500 characters or fewer.',
      400,
      'reason_too_long'
    )
  }

  
return trimmed
}

const assertOverrideUnitCost = (value: unknown): number => {
  if (!isFiniteNonNegativeNumber(value)) {
    throw new QuotationLineCostOverrideValidationError(
      'overrideUnitCostUsd must be a finite non-negative number.',
      400,
      'override_unit_cost_invalid'
    )
  }

  
return Math.round(value * 10000) / 10000
}

interface LineRow {
  line_item_id: string
  quotation_id: string
  cost_breakdown: unknown
  pricing_v2_unit_cost_usd: string | number | null
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    
return Number.isFinite(parsed) ? parsed : null
  }

  
return null
}

const extractSuggestedUnitCostUsd = (row: LineRow): number | null => {
  const persistedV2 = toNullableNumber(row.pricing_v2_unit_cost_usd)

  if (persistedV2 !== null) return persistedV2

  const breakdown = row.cost_breakdown

  if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)) {
    const withKey = breakdown as Record<string, unknown>

    const candidate =
      withKey.pricingV2UnitCostUsd ??
      withKey.pricing_v2_unit_cost_usd ??
      withKey.loadedTotal ??
      withKey.loaded_total

    
return toNullableNumber(candidate)
  }

  
return null
}

const extractSuggestedBreakdown = (row: LineRow): Record<string, unknown> | null => {
  const breakdown = row.cost_breakdown

  if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)) {
    return { ...(breakdown as Record<string, unknown>) }
  }

  
return null
}

/**
 * Applies a governed manual cost override to a quotation line (TASK-481).
 *
 * Transactional contract:
 *   1. Lock the target line row (SELECT FOR UPDATE).
 *   2. Snapshot the current suggested unit cost + breakdown for audit integrity.
 *   3. Compute signed delta vs suggested.
 *   4. Update the line: mutate cost_breakdown to mark source='manual' + set
 *      override governance columns.
 *   5. Insert an append-only history row (UI dialog reads last 5 for context).
 *   6. Emit `commercial.quotation_line.cost_overridden` to the outbox in the
 *      same transaction.
 *
 * Idempotency: every call inserts a new history row; UI is expected to avoid
 * double-clicking. Callers upstream may pass a client-side idempotency key via
 * metadata.idempotencyKey — reserved for future use, not yet enforced at
 * DB level.
 */
export const applyQuotationLineCostOverride = async (
  input: ApplyQuotationLineCostOverrideInput
): Promise<ApplyQuotationLineCostOverrideResult> => {
  const category = assertValidCategory(input.category)
  const reason = assertReason(input.reason, category)
  const overrideUnitCostUsd = assertOverrideUnitCost(input.overrideUnitCostUsd)

  if (!input.quotationId || typeof input.quotationId !== 'string') {
    throw new QuotationLineCostOverrideValidationError('quotationId is required.', 400, 'quotation_id_missing')
  }

  if (!input.lineItemId || typeof input.lineItemId !== 'string') {
    throw new QuotationLineCostOverrideValidationError('lineItemId is required.', 400, 'line_item_id_missing')
  }

  return withTransaction(async (client: PoolClient) => {
    const lineResult = await client.query<LineRow>(
      `SELECT line_item_id, quotation_id, cost_breakdown, pricing_v2_unit_cost_usd
         FROM greenhouse_commercial.quotation_line_items
        WHERE line_item_id = $1
          AND quotation_id = $2
        FOR UPDATE`,
      [input.lineItemId, input.quotationId]
    )

    if (lineResult.rowCount === 0 || !lineResult.rows[0]) {
      throw new QuotationLineCostOverrideValidationError('Quotation line not found for this quotation.', 404, 'line_not_found')
    }

    const row = lineResult.rows[0]
    const suggestedUnitCostUsd = extractSuggestedUnitCostUsd(row)
    const suggestedBreakdown = extractSuggestedBreakdown(row)

    const delta = computeOverrideDelta({ suggestedUnitCost: suggestedUnitCostUsd, overrideUnitCost: overrideUnitCostUsd })

    const overriddenAt = new Date().toISOString()
    const historyId = randomUUID()
    const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {}

    const nextBreakdown: Record<string, unknown> = {
      ...(suggestedBreakdown ?? {}),
      pricingV2CostBasisKind: 'manual',
      pricingV2CostBasisSourceRef: null,
      pricingV2CostBasisSnapshotDate: null,
      pricingV2CostBasisConfidenceScore: null,
      pricingV2CostBasisConfidenceLabel: null,
      pricingV2UnitCostUsd: overrideUnitCostUsd,
      snapshotSource: 'manual_override'
    }

    await client.query(
      `UPDATE greenhouse_commercial.quotation_line_items
          SET cost_override_reason = $1,
              cost_override_category = $2,
              cost_override_by_user_id = $3,
              cost_override_at = $4,
              cost_override_delta_pct = $5,
              cost_override_suggested_unit_cost_usd = $6,
              cost_override_suggested_breakdown = $7::jsonb,
              cost_breakdown = $8::jsonb,
              pricing_v2_unit_cost_usd = $9,
              updated_at = NOW()
        WHERE line_item_id = $10
          AND quotation_id = $11`,
      [
        reason,
        category,
        input.actor.userId,
        overriddenAt,
        delta.deltaPct,
        suggestedUnitCostUsd,
        suggestedBreakdown ? JSON.stringify(suggestedBreakdown) : null,
        JSON.stringify(nextBreakdown),
        overrideUnitCostUsd,
        input.lineItemId,
        input.quotationId
      ]
    )

    await client.query(
      `INSERT INTO greenhouse_commercial.quotation_line_cost_override_history (
         history_id, line_item_id, quotation_id, overridden_at, overridden_by_user_id,
         category, reason, suggested_unit_cost_usd, override_unit_cost_usd, delta_pct,
         suggested_breakdown, override_breakdown, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb)`,
      [
        historyId,
        input.lineItemId,
        input.quotationId,
        overriddenAt,
        input.actor.userId,
        category,
        reason,
        suggestedUnitCostUsd,
        overrideUnitCostUsd,
        delta.deltaPct,
        suggestedBreakdown ? JSON.stringify(suggestedBreakdown) : null,
        JSON.stringify(nextBreakdown),
        JSON.stringify(metadata)
      ]
    )

    await publishQuotationLineCostOverridden(
      {
        quotationId: input.quotationId,
        lineItemId: input.lineItemId,
        category,
        reason,
        suggestedUnitCostUsd,
        overrideUnitCostUsd,
        deltaPct: delta.deltaPct,
        overriddenByUserId: input.actor.userId,
        overriddenAt,
        historyId,
        metadata
      },
      client
    )

    return {
      lineItemId: input.lineItemId,
      quotationId: input.quotationId,
      overrideUnitCostUsd,
      suggestedUnitCostUsd,
      deltaPct: delta.deltaPct,
      overriddenAt,
      historyId,
      category,
      reason
    }
  })
}

export interface ListQuotationLineCostOverrideHistoryInput {
  lineItemId: string
  limit?: number
}

/**
 * Reads the last N overrides for a given quotation line (TASK-481).
 * UI dialog uses this to surface context ("this line was overridden 2 times
 * before") and governance dashboards use it with larger limits.
 *
 * Default limit: 5 (aligned with the dialog spec).
 */
export const listQuotationLineCostOverrideHistory = async (
  input: ListQuotationLineCostOverrideHistoryInput
): Promise<QuotationLineCostOverrideHistoryRow[]> => {
  const limit = Math.min(50, Math.max(1, input.limit ?? 5))

  const rows = await query<{
    history_id: string
    line_item_id: string
    quotation_id: string
    overridden_at: string | Date
    overridden_by_user_id: string | null
    category: string
    reason: string
    suggested_unit_cost_usd: string | number | null
    override_unit_cost_usd: string | number | null
    delta_pct: string | number | null
  }>(
    `SELECT history_id, line_item_id, quotation_id, overridden_at, overridden_by_user_id,
            category, reason, suggested_unit_cost_usd, override_unit_cost_usd, delta_pct
       FROM greenhouse_commercial.quotation_line_cost_override_history
      WHERE line_item_id = $1
      ORDER BY overridden_at DESC
      LIMIT $2`,
    [input.lineItemId, limit]
  )

  return rows.map(row => ({
    historyId: row.history_id,
    lineItemId: row.line_item_id,
    quotationId: row.quotation_id,
    overriddenAt: row.overridden_at instanceof Date ? row.overridden_at.toISOString() : String(row.overridden_at),
    overriddenByUserId: row.overridden_by_user_id,
    category: row.category as QuotationLineCostOverrideCategory,
    reason: row.reason,
    suggestedUnitCostUsd: toNullableNumber(row.suggested_unit_cost_usd),
    overrideUnitCostUsd: toNullableNumber(row.override_unit_cost_usd) ?? 0,
    deltaPct: toNullableNumber(row.delta_pct)
  }))
}
