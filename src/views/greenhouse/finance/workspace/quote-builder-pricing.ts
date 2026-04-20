import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type {
  CostComponentBreakdown,
  PricingEngineInputV2,
  PricingLineInputV2,
  PricingLineOutputV2,
  PricingOutputCurrency,
  PricingV2LineType
} from '@/lib/finance/pricing/contracts'

import type { QuoteLineItem, QuoteLineSource } from './QuoteLineItemsEditor'

const AUTO_PRICED_LINE_TYPES = new Set<PricingV2LineType>(['role', 'person', 'tool', 'overhead_addon'])

export interface QuoteBuilderPricingContext {
  quoteDate: string
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
  manualUnitCost: number | null
  roleCode: string | null
  memberId: string | null
  source: QuoteLineSource | null
  serviceSku: string | null
  metadata: QuoteLineItem['metadata'] | null
  resolvedCostBreakdown: CostComponentBreakdown | null
  resolvedCostNotes: string[] | null
}

const isPopulatedLine = (line: QuoteLineItem) => {
  if (line.label.trim().length === 0) return false

  // role/person: el multiplicador real es periods (la Cantidad visible en UI),
  // line.quantity queda fijo en 1. Para el resto de líneas el check es sobre quantity.
  const v2Type = line.metadata?.pricingV2LineType

  if (v2Type === 'role' || v2Type === 'person') {
    return (line.metadata?.periods ?? 0) > 0
  }

  return line.quantity > 0
}

const normalizeFiniteNumber = (value: number | null | undefined) =>
  value != null && Number.isFinite(value) ? value : null

const normalizePositiveNumber = (value: number | null | undefined) => {
  const normalized = normalizeFiniteNumber(value)

  return normalized != null && normalized > 0 ? normalized : null
}

const serializePricingLineInput = (input: PricingLineInputV2) => JSON.stringify(input)

const buildResolvedCostBreakdown = (
  simulationLine: PricingLineOutputV2,
  outputCurrency: PricingOutputCurrency
): CostComponentBreakdown => ({
  salaryComponent: null,
  employerCosts: null,
  directOverhead: null,
  structuralOverhead: null,
  loadedTotal: simulationLine.costStack.unitCostOutputCurrency,
  costPerHour:
    simulationLine.suggestedBillRate.pricingBasis === 'hour'
      ? simulationLine.costStack.unitCostOutputCurrency
      : null,
  sourcePeriod: null,
  sourceCompensationVersionId: null,
  sourcePayrollPeriodId: null,
  fxRateApplied: null,
  fxRateDate: null,
  sourceCurrency: outputCurrency,
  targetCurrency: outputCurrency,
  snapshotSource: 'pricing_engine_v2',
  notes: simulationLine.resolutionNotes.join(' | '),
  pricingV2CostBasisKind: simulationLine.costStack.costBasisKind ?? null,
  pricingV2CostBasisSourceRef: simulationLine.costStack.costBasisSourceRef ?? null,
  pricingV2CostBasisSnapshotDate: simulationLine.costStack.costBasisSnapshotDate ?? null,
  pricingV2CostBasisConfidenceScore: simulationLine.costStack.costBasisConfidenceScore ?? null,
  pricingV2CostBasisConfidenceLabel: simulationLine.costStack.costBasisConfidenceLabel ?? null,
  pricingV2UnitCostUsd: simulationLine.costStack.unitCostUsd,
  pricingV2UnitCostOutputCurrency: simulationLine.costStack.unitCostOutputCurrency,
  pricingV2TotalCostUsd: simulationLine.costStack.totalCostUsd,
  pricingV2TotalCostOutputCurrency: simulationLine.costStack.totalCostOutputCurrency
})

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
    // Para role/person la "Cantidad" que ve el usuario es meses (periods).
    // Mandamos siempre quantity=1 al engine para evitar doble conteo —
    // el engine bill = unitPrice × fteFraction × periods × quantity, así que
    // cualquier valor ≠ 1 en quantity multiplicaría dos veces por lo mismo.
    return {
      lineType: 'role',
      roleSku: sku,
      hours: null,
      fteFraction: line.metadata?.fteFraction ?? 1,
      periods: line.metadata?.periods ?? 1,
      quantity: 1,
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
      quantity: 1
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
    quoteDate: context.quoteDate,
    lines: pricingLines,

    // 'internal_only': el engine auto-suma solo los addons internos (overhead,
    // fee EOR). Los visibles al cliente llegan como sugerencias en
    // `output.suggestedVisibleAddons` — el comercial decide desde el panel
    // tildar para promoverlos a líneas `overhead_addon` explícitas.
    autoResolveAddons: 'internal_only'
  }
}

const describeLine = (line: QuoteLineItem): string => {
  const sku = line.metadata?.sku ?? line.roleCode ?? line.memberId ?? null
  const label = line.label.trim().length > 0 ? line.label : 'ítem sin nombre'

  return sku ? `${label} (${sku})` : label
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

    const resolvedUnitCost = normalizePositiveNumber(
      simulationLine?.costStack.unitCostOutputCurrency
    )

    const suggestedUnitPrice = normalizePositiveNumber(
      simulationLine?.suggestedBillRate?.unitPriceOutputCurrency
    )

    let unitPrice = normalizeFiniteNumber(line.unitPrice) ?? 0

    if (lineRequiresSuggestedPrice(line)) {
      // Items de catálogo: el precio SIEMPRE viene del engine. No honramos
      // overrides del usuario (el catálogo es SoT; si necesita un precio
      // distinto, se usa una línea manual de direct_cost).
      if (
        !expectedPricingLine ||
        !simulationLine ||
        serializePricingLineInput(simulationLine.lineInput) !== serializePricingLineInput(expectedPricingLine)
      ) {
        throw new Error(`${missingPriceMessage} — revisa la línea: ${describeLine(line)}.`)
      }

      if (suggestedUnitPrice != null) {
        unitPrice = suggestedUnitPrice
      } else {
        throw new Error(`${missingPriceMessage} — revisa la línea: ${describeLine(line)}.`)
      }
    }

    return {
      label: line.label,
      lineType: line.lineType,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice,
      manualUnitCost: lineRequiresSuggestedPrice(line) ? (resolvedUnitCost ?? null) : null,
      roleCode: line.roleCode ?? null,
      memberId: line.memberId ?? null,
      source: line.source ?? null,
      serviceSku: line.serviceSku ?? null,
      metadata: line.metadata ?? null,
      resolvedCostBreakdown:
        lineRequiresSuggestedPrice(line) && simulationLine
          ? buildResolvedCostBreakdown(simulationLine, currency)
          : null,
      resolvedCostNotes:
        lineRequiresSuggestedPrice(line) && simulationLine
          ? simulationLine.resolutionNotes
          : null
    }
  })
}
