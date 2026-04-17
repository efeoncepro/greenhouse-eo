import 'server-only'

/**
 * Fields that Greenhouse MUST NEVER push to HubSpot, per the commercial contract
 * (TASK-347 + Quotation architecture):
 *   - cost_of_goods_sold / unit_cost / loaded_cost
 *   - margin_pct, target_margin_pct, floor_margin_pct
 *   - cost_breakdown (internal snapshot with payroll ids)
 *
 * HubSpot is CRM (deal stage, contact, product metadata). Greenhouse keeps pricing
 * intelligence. Pushing cost leaks the loaded labor cost of the agency to the CRM
 * and breaks the "costo viene del sistema, no del usuario" principle.
 */
export const HUBSPOT_FORBIDDEN_PRODUCT_FIELDS = [
  'costOfGoodsSold',
  'cost_of_goods_sold',
  'unitCost',
  'unit_cost',
  'loadedCost',
  'loaded_cost',
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
      `HubSpot outbound guard refused to forward cost/margin fields: ${leakedFields.join(', ')}. ` +
        'Greenhouse does not push internal costing to HubSpot (TASK-347 governance).'
    )
    this.name = 'HubSpotCostFieldLeakError'
    this.leakedFields = leakedFields
  }
}

/**
 * Strips cost/margin fields from a HubSpot product payload before it reaches
 * `createHubSpotGreenhouseProduct`. Returns a shallow copy without the forbidden
 * fields. Keeps pricing-relevant fields (unitPrice, tax, isRecurring, etc).
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
