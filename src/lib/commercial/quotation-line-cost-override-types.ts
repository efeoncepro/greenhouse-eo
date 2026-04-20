/**
 * Client-safe types + enums for quotation-line cost override governance
 * (TASK-481). This module must NOT import any server-only dependencies so
 * that the UI components (CostOverrideDialog, QuoteLineItemsEditor) can
 * consume the enum without dragging server imports into the client bundle.
 *
 * The outbox publisher lives in `quotation-line-cost-override-events.ts`
 * (server-only) and re-exports these for convenience.
 */

export type QuotationLineCostOverrideCategory =
  | 'competitive_pressure'
  | 'strategic_investment'
  | 'roi_correction'
  | 'error_correction'
  | 'client_negotiation'
  | 'other'

export const QUOTATION_LINE_COST_OVERRIDE_CATEGORIES: readonly QuotationLineCostOverrideCategory[] = [
  'competitive_pressure',
  'strategic_investment',
  'roi_correction',
  'error_correction',
  'client_negotiation',
  'other'
]
