import 'server-only'

/**
 * Fields that Greenhouse MUST NEVER push to HubSpot.
 *
 * Original TASK-347 governance blocked all cost + margin fields. TASK-587 /
 * TASK-603 (Fase C) partially supersedes this: `cost_of_goods_sold` is now
 * explicitly ALLOWED outbound as a deliberate governance decision (HubSpot
 * surfaces it as `hs_cost_of_goods_sold` for product-level reporting; the
 * SoT remains in Greenhouse).
 *
 * Permanently blocked (margin and cost breakdown leak internal pricing):
 *   - margin_pct, target_margin_pct, floor_margin_pct, effective_margin_pct
 *   - cost_breakdown (internal snapshot with payroll ids)
 *
 * HubSpot is CRM (deal stage, contact, product metadata). Greenhouse keeps
 * pricing intelligence. Pushing margin/cost_breakdown leaks the loaded labor
 * cost structure of the agency to the CRM and breaks the "costo viene del
 * sistema, no del usuario" principle. COGS is a product attribute, not a
 * cost structure, hence the carve-out.
 */
export const HUBSPOT_FORBIDDEN_PRODUCT_FIELDS = [
  'marginPct',
  'margin_pct',
  'targetMarginPct',
  'target_margin_pct',
  'floorMarginPct',
  'floor_margin_pct',
  'effectiveMarginPct',
  'effective_margin_pct',
  'costBreakdown',
  'cost_breakdown'
] as const

const FORBIDDEN_SET = new Set<string>(HUBSPOT_FORBIDDEN_PRODUCT_FIELDS)

export class HubSpotCostFieldLeakError extends Error {
  public readonly leakedFields: string[]

  constructor(leakedFields: string[]) {
    super(
      `HubSpot outbound guard refused to forward margin/cost_breakdown fields: ${leakedFields.join(', ')}. ` +
        'Greenhouse does not push internal pricing intelligence to HubSpot (TASK-347 governance, ' +
        'TASK-603 scope-narrowed: COGS unblocked; margin + cost_breakdown permanently blocked).'
    )
    this.name = 'HubSpotCostFieldLeakError'
    this.leakedFields = leakedFields
  }
}

/**
 * Strips margin/cost_breakdown fields from a HubSpot product payload before it
 * reaches `createHubSpotGreenhouseProduct`. Returns a shallow copy without the
 * forbidden fields. Keeps pricing-relevant fields (unitPrice, tax, isRecurring,
 * costOfGoodsSold, pricesByCurrency, etc).
 *
 * Note: `costOfGoodsSold` is intentionally NOT filtered — TASK-603 unblocked
 * it outbound. The guard now narrows its scope to margin leaks only.
 */
export const sanitizeHubSpotProductPayload = <T extends Record<string, unknown>>(
  payload: T
): Partial<T> => {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN_SET.has(key)) continue
    sanitized[key] = value
  }

  return sanitized as Partial<T>
}

/**
 * Throws if the payload contains any forbidden fields. Use this in tests and
 * in defensive paths where stripping silently would hide a bug.
 */
export const assertNoCostFieldsInHubSpotPayload = (payload: Record<string, unknown>): void => {
  const leaked = Object.keys(payload).filter(key => FORBIDDEN_SET.has(key))

  if (leaked.length > 0) {
    throw new HubSpotCostFieldLeakError(leaked)
  }
}
