import type { PricingV2LineType } from './contracts'
import type { QuotationLineInput } from './quotation-pricing-orchestrator'

const AUTO_PRICED_LINE_TYPES = new Set<PricingV2LineType>(['role', 'person', 'tool', 'overhead_addon'])
const ROLE_BACKED_LINE_TYPES = new Set(['role', 'person'])

export const UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE =
  'No pudimos guardar la cotización porque una o más líneas de catálogo no tienen precio calculado. Espera a que termine el pricing o revisa el catálogo.'

export class UnpricedQuotationLineItemsError extends Error {
  readonly code = 'UNPRICED_QUOTATION_LINE_ITEMS'

  constructor(message = UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE) {
    super(message)
    this.name = 'UnpricedQuotationLineItemsError'
  }
}

export const isUnpricedQuotationLineItemsError = (
  error: unknown
): error is UnpricedQuotationLineItemsError =>
  error instanceof UnpricedQuotationLineItemsError ||
  (error instanceof Error &&
    error.name === 'UnpricedQuotationLineItemsError' &&
    error.message === UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE)

const hasPositiveUnitPrice = (value: number | null | undefined) =>
  value != null && Number.isFinite(value) && value > 0

export const ensureQuotationLineInputsArePriced = (lineItems: QuotationLineInput[]) => {
  const hasUnpricedAutoLine = lineItems.some(line => {
    const metadataType = line.metadata?.pricingV2LineType

    const requiresCatalogPricing =
      (metadataType != null && AUTO_PRICED_LINE_TYPES.has(metadataType)) ||
      ROLE_BACKED_LINE_TYPES.has(line.lineType)

    return requiresCatalogPricing && !hasPositiveUnitPrice(line.unitPrice)
  })

  if (hasUnpricedAutoLine) {
    throw new UnpricedQuotationLineItemsError()
  }
}
