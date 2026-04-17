import type { DiscountAlert, DiscountHealthInput, DiscountHealthResult } from './contracts'

const DISCOUNT_WARNING_THRESHOLD_PCT = 25

const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0

  return Math.round(value * 100) / 100
}

const computeMarginPct = (totalPrice: number, totalCost: number): number | null => {
  if (totalPrice <= 0) return null

  return round2(((totalPrice - totalCost) / totalPrice) * 100)
}

export const checkDiscountHealth = (input: DiscountHealthInput): DiscountHealthResult => {
  const { totals, marginTargetPct, marginFloorPct, lineItems } = input

  const quotationMarginPct =
    totals.effectiveMarginPct ?? computeMarginPct(totals.totalPrice, totals.totalCost)

  const deltaFromFloor =
    quotationMarginPct === null ? null : round2(quotationMarginPct - marginFloorPct)

  const deltaFromTarget =
    quotationMarginPct === null ? null : round2(quotationMarginPct - marginTargetPct)

  const discountPct =
    totals.totalPriceBeforeDiscount > 0
      ? round2((totals.totalDiscount / totals.totalPriceBeforeDiscount) * 100)
      : null

  const alerts: DiscountAlert[] = []

  if (quotationMarginPct !== null && quotationMarginPct < 0) {
    alerts.push({
      level: 'error',
      code: 'margin_below_zero',
      message:
        'El margen efectivo de la cotización es negativo. Revisa costos y descuentos antes de enviar.',
      deltaFromFloor: deltaFromFloor ?? undefined,
      deltaFromTarget: deltaFromTarget ?? undefined
    })
  } else if (quotationMarginPct !== null && quotationMarginPct < marginFloorPct) {
    alerts.push({
      level: 'error',
      code: 'margin_below_floor',
      message: `Margen efectivo (${quotationMarginPct.toFixed(2)}%) está bajo el piso configurado (${marginFloorPct.toFixed(2)}%). Requiere aprobación de Finanzas.`,
      requiredApproval: 'finance',
      deltaFromFloor: deltaFromFloor ?? undefined,
      deltaFromTarget: deltaFromTarget ?? undefined
    })
  } else if (quotationMarginPct !== null && quotationMarginPct < marginTargetPct) {
    alerts.push({
      level: 'warning',
      code: 'margin_below_target',
      message: `Margen efectivo (${quotationMarginPct.toFixed(2)}%) está bajo el target (${marginTargetPct.toFixed(2)}%).`,
      deltaFromTarget: deltaFromTarget ?? undefined,
      deltaFromFloor: deltaFromFloor ?? undefined
    })
  }

  if (lineItems && lineItems.length > 0) {
    const negativeItems = lineItems.filter(item => {
      if (item.subtotalCost == null) return false

      return item.subtotalAfterDiscount - item.subtotalCost < 0
    })

    if (negativeItems.length > 0) {
      alerts.push({
        level: 'warning',
        code: 'item_negative_margin',
        message: `${negativeItems.length} ítem(s) con margen negativo. Revisa línea por línea.`,
        itemIds: negativeItems.map(item => item.lineItemId)
      })
    }
  }

  if (discountPct !== null && discountPct > DISCOUNT_WARNING_THRESHOLD_PCT) {
    alerts.push({
      level: 'info',
      code: 'discount_exceeds_threshold',
      message: `Descuento agregado de ${discountPct.toFixed(2)}% supera el umbral de ${DISCOUNT_WARNING_THRESHOLD_PCT}%.`,
      discountPct
    })
  }

  const blocking = alerts.some(alert => alert.level === 'error')
  const requiresApproval = alerts.some(alert => alert.requiredApproval === 'finance')
  const healthy = alerts.every(alert => alert.level !== 'error' && alert.level !== 'warning')

  return {
    healthy,
    blocking,
    requiresApproval,
    quotationMarginPct,
    marginTargetPct,
    marginFloorPct,
    deltaFromFloor,
    deltaFromTarget,
    discountPct,
    alerts
  }
}
