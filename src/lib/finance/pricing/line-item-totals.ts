import type {
  QuotationDiscountType,
  QuotationLineType,
  QuotationPricingTotals,
  LineRecurrenceType,
  QuotationPricingCurrency
} from './contracts'

const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0

  return Math.round(value * 100) / 100
}

export interface LineItemPricingInput {
  lineItemId?: string | null
  lineType: QuotationLineType
  quantity: number
  unitCost: number | null
  unitPrice: number
  discountType?: QuotationDiscountType | null
  discountValue?: number | null
  recurrenceType: LineRecurrenceType
  currency?: QuotationPricingCurrency | null
}

export interface LineItemPricingResult {
  subtotalPrice: number
  subtotalCost: number | null
  discountAmount: number
  subtotalAfterDiscount: number
  effectiveMarginPct: number | null
  marginAmount: number | null
}

export const computeLineItemTotals = (input: LineItemPricingInput): LineItemPricingResult => {
  const quantity = Number.isFinite(input.quantity) ? input.quantity : 0
  const unitPrice = Number.isFinite(input.unitPrice) ? input.unitPrice : 0
  const subtotalPrice = round2(quantity * unitPrice)

  const subtotalCost =
    input.unitCost != null && Number.isFinite(input.unitCost)
      ? round2(quantity * input.unitCost)
      : null

  let discountAmount = 0

  if (input.discountType && input.discountValue != null && Number.isFinite(input.discountValue)) {
    if (input.discountType === 'percentage') {
      discountAmount = round2(subtotalPrice * (input.discountValue / 100))
    } else if (input.discountType === 'fixed_amount') {
      discountAmount = round2(Math.min(Math.max(0, input.discountValue), subtotalPrice))
    }
  }

  const subtotalAfterDiscount = round2(subtotalPrice - discountAmount)

  let marginAmount: number | null = null
  let effectiveMarginPct: number | null = null

  if (subtotalCost != null) {
    marginAmount = round2(subtotalAfterDiscount - subtotalCost)

    if (subtotalAfterDiscount > 0) {
      effectiveMarginPct = round2((marginAmount / subtotalAfterDiscount) * 100)
    } else if (subtotalAfterDiscount === 0 && subtotalCost === 0) {
      effectiveMarginPct = 0
    } else {
      effectiveMarginPct = null
    }
  }

  return {
    subtotalPrice,
    subtotalCost,
    discountAmount,
    subtotalAfterDiscount,
    effectiveMarginPct,
    marginAmount
  }
}

export interface QuotationTotalsInput {
  lineItems: LineItemPricingResult[]
  globalDiscountType?: QuotationDiscountType | null
  globalDiscountValue?: number | null
}

export const aggregateQuotationTotals = (
  input: QuotationTotalsInput
): QuotationPricingTotals => {
  let totalCost = 0
  let totalPriceBeforeDiscount = 0
  let totalLineDiscount = 0
  let totalPriceAfterLineDiscount = 0

  for (const item of input.lineItems) {
    totalCost += item.subtotalCost ?? 0
    totalPriceBeforeDiscount += item.subtotalPrice
    totalLineDiscount += item.discountAmount
    totalPriceAfterLineDiscount += item.subtotalAfterDiscount
  }

  let globalDiscountAmount = 0

  if (
    input.globalDiscountType &&
    input.globalDiscountValue != null &&
    Number.isFinite(input.globalDiscountValue)
  ) {
    if (input.globalDiscountType === 'percentage') {
      globalDiscountAmount = round2(totalPriceAfterLineDiscount * (input.globalDiscountValue / 100))
    } else if (input.globalDiscountType === 'fixed_amount') {
      globalDiscountAmount = round2(Math.min(Math.max(0, input.globalDiscountValue), totalPriceAfterLineDiscount))
    }
  }

  const totalDiscount = round2(totalLineDiscount + globalDiscountAmount)
  const totalPrice = round2(totalPriceAfterLineDiscount - globalDiscountAmount)
  const totalCostRounded = round2(totalCost)
  const totalPriceBeforeDiscountRounded = round2(totalPriceBeforeDiscount)

  let effectiveMarginPct: number | null = null

  if (totalPrice > 0) {
    effectiveMarginPct = round2(((totalPrice - totalCostRounded) / totalPrice) * 100)
  } else if (totalPrice === 0 && totalCostRounded === 0) {
    effectiveMarginPct = 0
  }

  return {
    totalCost: totalCostRounded,
    totalPriceBeforeDiscount: totalPriceBeforeDiscountRounded,
    totalDiscount,
    totalPrice,
    effectiveMarginPct
  }
}
