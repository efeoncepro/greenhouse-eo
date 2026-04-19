import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type {
  PricingEngineInputV2,
  PricingLineInputV2,
  PricingLineOutputV2,
  PricingOutputCurrency,
  PricingV2LineType
} from '@/lib/finance/pricing/contracts'

import type { QuoteLineItem, QuoteLineSource } from './QuoteLineItemsEditor'

const AUTO_PRICED_LINE_TYPES = new Set<PricingV2LineType>(['role', 'person', 'tool', 'overhead_addon'])

export interface QuoteBuilderPricingContext {
  businessLineCode: string | null
  commercialModel: CommercialModelCode
  countryFactorCode: string
}

export interface PersistedQuoteLineItem {
  label: string
  lineType: QuoteLineItem['lineType']
  unit: QuoteLineItem['unit']
  quantity: number
  unitPrice: number
  roleCode: string | null
  memberId: string | null
  source: QuoteLineSource | null
  serviceSku: string | null
  metadata: QuoteLineItem['metadata'] | null
}

const isPopulatedLine = (line: QuoteLineItem) => line.label.trim().length > 0 && line.quantity > 0

const normalizeFiniteNumber = (value: number | null | undefined) =>
  value != null && Number.isFinite(value) ? value : null

const normalizePositiveNumber = (value: number | null | undefined) => {
  const normalized = normalizeFiniteNumber(value)

  return normalized != null && normalized > 0 ? normalized : null
}

const serializePricingLineInput = (input: PricingLineInputV2) => JSON.stringify(input)

export const lineRequiresSuggestedPrice = (line: QuoteLineItem) => {
  const v2Type = line.metadata?.pricingV2LineType

  return v2Type != null && AUTO_PRICED_LINE_TYPES.has(v2Type)
}

export const buildQuotePricingLineInput = (
  line: QuoteLineItem,
  currency: PricingOutputCurrency
): PricingLineInputV2 | null => {
  if (!isPopulatedLine(line)) {
    return null
  }

  const v2Type = line.metadata?.pricingV2LineType
  const sku = line.metadata?.sku ?? line.roleCode ?? line.memberId ?? null

  if (v2Type === 'role' && sku) {
    return {
      lineType: 'role',
      roleSku: sku,
      hours: null,
      fteFraction: line.metadata?.fteFraction ?? 1,
      periods: line.metadata?.periods ?? 1,
      quantity: line.quantity,
      employmentTypeCode: line.metadata?.employmentTypeCode ?? null
    }
  }

  if (v2Type === 'person' && line.memberId) {
    return {
      lineType: 'person',
      memberId: line.memberId,
      hours: null,
      fteFraction: line.metadata?.fteFraction ?? 1,
      periods: line.metadata?.periods ?? 1,
      quantity: line.quantity
    }
  }

  if (v2Type === 'tool' && sku) {
    return {
      lineType: 'tool',
      toolSku: sku,
      quantity: line.quantity,
      periods: line.metadata?.periods ?? 1
    }
  }

  if (v2Type === 'overhead_addon' && sku) {
    return {
      lineType: 'overhead_addon',
      addonSku: sku,
      quantity: line.quantity
    }
  }

  return {
    lineType: 'direct_cost',
    label: line.label.trim(),
    amount: line.unitPrice ?? 0,
    currency,
    quantity: line.quantity
  }
}

export const buildQuotePricingInput = (
  context: QuoteBuilderPricingContext,
  currency: PricingOutputCurrency,
  lines: QuoteLineItem[]
): PricingEngineInputV2 | null => {
  const pricingLines = lines
    .map(line => buildQuotePricingLineInput(line, currency))
    .filter((line): line is PricingLineInputV2 => line !== null)

  if (pricingLines.length === 0) return null

  return {
    businessLineCode: context.businessLineCode,
    commercialModel: context.commercialModel,
    countryFactorCode: context.countryFactorCode,
    outputCurrency: currency,
    quoteDate: new Date().toISOString().slice(0, 10),
    lines: pricingLines,
    autoResolveAddons: true
  }
}

export const buildPersistedQuoteLineItems = ({
  lines,
  currency,
  simulationLines,
  missingPriceMessage
}: {
  lines: QuoteLineItem[]
  currency: PricingOutputCurrency
  simulationLines?: PricingLineOutputV2[] | null
  missingPriceMessage: string
}): PersistedQuoteLineItem[] => {
  let simulationIndex = 0

  return lines.map(line => {
    const expectedPricingLine = buildQuotePricingLineInput(line, currency)
    const simulationLine = expectedPricingLine ? simulationLines?.[simulationIndex++] ?? null : null
    const explicitUnitPrice = normalizePositiveNumber(line.unitPrice)

    const suggestedUnitPrice = normalizePositiveNumber(
      simulationLine?.suggestedBillRate?.unitPriceOutputCurrency
    )

    let unitPrice = normalizeFiniteNumber(line.unitPrice) ?? 0

    if (lineRequiresSuggestedPrice(line)) {
      if (
        !expectedPricingLine ||
        !simulationLine ||
        serializePricingLineInput(simulationLine.lineInput) !== serializePricingLineInput(expectedPricingLine)
      ) {
        throw new Error(missingPriceMessage)
      }

      if (explicitUnitPrice != null) {
        unitPrice = explicitUnitPrice
      } else if (suggestedUnitPrice != null) {
        unitPrice = suggestedUnitPrice
      } else {
        throw new Error(missingPriceMessage)
      }
    }

    return {
      label: line.label,
      lineType: line.lineType,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice,
      roleCode: line.roleCode ?? null,
      memberId: line.memberId ?? null,
      source: line.source ?? null,
      serviceSku: line.serviceSku ?? null,
      metadata: line.metadata ?? null
    }
  })
}
