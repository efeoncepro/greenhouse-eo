import type { PricingV2LineType } from './contracts'
import type { QuotationLineInput } from './quotation-pricing-orchestrator'

const AUTO_PRICED_LINE_TYPES = new Set<PricingV2LineType>(['role', 'person', 'tool', 'overhead_addon'])
const ROLE_BACKED_LINE_TYPES = new Set(['role', 'person'])

export const UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE =
  'No pudimos guardar la cotización porque una o más líneas de catálogo no tienen precio calculado. Espera a que termine el pricing o revisa el catálogo.'

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
    throw new Error(UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE)
  }
}
