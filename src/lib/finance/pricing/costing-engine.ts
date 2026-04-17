import 'server-only'

import {
  readLatestMemberCapacityEconomicsSnapshot,
  readMemberCapacityEconomicsSnapshot
} from '@/lib/member-capacity-economics/store'
import { query } from '@/lib/db'

import type {
  CostComponentBreakdown,
  LineCostResolutionInput,
  LineCostResolutionResult,
  QuotationPricingCurrency
} from './contracts'
import { resolveRoleRateCard } from './pricing-config-store'

const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0

  return Math.round(value * 100) / 100
}

const buildEmptyBreakdown = (
  snapshotSource: CostComponentBreakdown['snapshotSource']
): CostComponentBreakdown => ({
  salaryComponent: null,
  employerCosts: null,
  directOverhead: null,
  structuralOverhead: null,
  loadedTotal: null,
  costPerHour: null,
  sourcePeriod: null,
  sourceCompensationVersionId: null,
  sourcePayrollPeriodId: null,
  fxRateApplied: null,
  fxRateDate: null,
  sourceCurrency: null,
  targetCurrency: null,
  snapshotSource
})

const convertAmount = (
  amount: number,
  fromCurrency: string,
  toCurrency: QuotationPricingCurrency,
  exchangeRates: Record<string, number> | undefined,
  directFxRate: number | null,
  notes: string[]
): number => {
  if (fromCurrency.toUpperCase() === toCurrency) return amount

  const rateKey = `${fromCurrency.toUpperCase()}_${toCurrency}`
  const inverseKey = `${toCurrency}_${fromCurrency.toUpperCase()}`
  const rate = exchangeRates?.[rateKey]

  if (rate && rate > 0) {
    return round2(amount * rate)
  }

  const inverse = exchangeRates?.[inverseKey]

  if (inverse && inverse > 0) {
    return round2(amount / inverse)
  }

  if (directFxRate && directFxRate > 0 && toCurrency === 'CLP' && fromCurrency.toUpperCase() !== 'CLP') {
    return round2(amount * directFxRate)
  }

  notes.push(
    `No se encontró tasa de cambio ${fromCurrency.toUpperCase()}→${toCurrency}; costo no convertido.`
  )

  return amount
}

type ProductPriceRow = {
  default_unit_price: string | number | null
  default_currency: string | null
} & Record<string, unknown>

const readProductDefaultPrice = async (productId: string): Promise<ProductPriceRow | null> => {
  const rows = await query<ProductPriceRow>(
    `SELECT default_unit_price, default_currency
     FROM greenhouse_commercial.product_catalog
     WHERE product_id = $1
     LIMIT 1`,
    [productId]
  )

  return rows[0] ?? null
}

export const resolveLineItemCost = async (
  input: LineCostResolutionInput
): Promise<LineCostResolutionResult> => {
  const notes: string[] = []
  const quoteCurrency = input.quoteCurrency

  if (input.lineType === 'direct_cost' || input.manualUnitCost != null) {
    const breakdown = buildEmptyBreakdown('manual')

    return {
      unitCost:
        input.manualUnitCost != null && Number.isFinite(input.manualUnitCost)
          ? round2(input.manualUnitCost)
          : null,
      currency: quoteCurrency,
      costBreakdown: breakdown,
      resolutionNotes: notes
    }
  }

  if (input.lineType === 'person') {
    const memberId = input.memberId?.trim()

    if (!memberId) {
      notes.push('line_type=person sin memberId: costo no pudo resolverse.')

      return {
        unitCost: null,
        currency: quoteCurrency,
        costBreakdown: buildEmptyBreakdown('member_capacity_economics'),
        resolutionNotes: notes
      }
    }

    let snapshot =
      input.periodYear && input.periodMonth
        ? await readMemberCapacityEconomicsSnapshot(memberId, input.periodYear, input.periodMonth)
        : null

    if (!snapshot) {
      snapshot = await readLatestMemberCapacityEconomicsSnapshot(memberId)

      if (snapshot) {
        notes.push(
          `Capacity snapshot del periodo solicitado no existe; se usa el más reciente (${snapshot.periodYear}-${String(snapshot.periodMonth).padStart(2, '0')}).`
        )
      }
    }

    if (!snapshot) {
      notes.push(`No hay capacity snapshot disponible para member ${memberId}.`)

      return {
        unitCost: null,
        currency: quoteCurrency,
        costBreakdown: buildEmptyBreakdown('member_capacity_economics'),
        resolutionNotes: notes
      }
    }

    const targetCurrency = (snapshot.targetCurrency as QuotationPricingCurrency) || 'CLP'
    let costPerHour = snapshot.costPerHourTarget

    if (costPerHour != null && targetCurrency !== quoteCurrency) {
      costPerHour = convertAmount(
        costPerHour,
        targetCurrency,
        quoteCurrency,
        input.exchangeRates,
        snapshot.fxRate,
        notes
      )
    }

    const breakdown: CostComponentBreakdown = {
      salaryComponent: snapshot.totalLaborCostTarget,
      employerCosts: null,
      directOverhead: snapshot.directOverheadTarget,
      structuralOverhead: snapshot.sharedOverheadTarget,
      loadedTotal: snapshot.loadedCostTarget,
      costPerHour,
      sourcePeriod: `${snapshot.periodYear}-${String(snapshot.periodMonth).padStart(2, '0')}`,
      sourceCompensationVersionId: snapshot.sourceCompensationVersionId,
      sourcePayrollPeriodId: snapshot.sourcePayrollPeriodId,
      fxRateApplied: snapshot.fxRate,
      fxRateDate: snapshot.fxRateDate,
      sourceCurrency: snapshot.sourceCurrency,
      targetCurrency: targetCurrency,
      snapshotSource: 'member_capacity_economics'
    }

    return {
      unitCost: costPerHour != null ? round2(costPerHour) : null,
      currency: quoteCurrency,
      costBreakdown: breakdown,
      resolutionNotes: notes
    }
  }

  if (input.lineType === 'role') {
    const roleCode = input.roleCode?.trim()

    if (!roleCode) {
      notes.push('line_type=role sin roleCode: costo no pudo resolverse.')

      return {
        unitCost: null,
        currency: quoteCurrency,
        costBreakdown: buildEmptyBreakdown('role_rate_card'),
        resolutionNotes: notes
      }
    }

    const card = await resolveRoleRateCard({
      businessLineCode: input.businessLineCode,
      roleCode,
      seniorityLevel: input.seniorityLevel,
      quoteDate: input.quoteDate
    })

    if (!card) {
      notes.push(
        `Role rate card no encontrado para role=${roleCode} seniority=${input.seniorityLevel ?? 'mid'} bl=${input.businessLineCode ?? 'null'}.`
      )

      return {
        unitCost: null,
        currency: quoteCurrency,
        costBreakdown: buildEmptyBreakdown('role_rate_card'),
        resolutionNotes: notes
      }
    }

    let costPerHour = card.hourlyRateCost

    if (card.currency !== quoteCurrency) {
      costPerHour = convertAmount(
        costPerHour,
        card.currency,
        quoteCurrency,
        input.exchangeRates,
        null,
        notes
      )
    }

    const breakdown: CostComponentBreakdown = {
      salaryComponent: null,
      employerCosts: null,
      directOverhead: null,
      structuralOverhead: null,
      loadedTotal: null,
      costPerHour,
      sourcePeriod: card.effectiveFrom,
      sourceCompensationVersionId: null,
      sourcePayrollPeriodId: null,
      fxRateApplied: null,
      fxRateDate: null,
      sourceCurrency: card.currency,
      targetCurrency: quoteCurrency,
      snapshotSource: 'role_rate_card',
      roleCode,
      seniorityLevel: card.seniorityLevel,
      notes: card.source === 'global_fallback' ? 'Rate card resuelto por fallback global.' : null
    }

    if (card.source === 'global_fallback') {
      notes.push(
        `Rate card resuelto por fallback (sin match exacto para bl=${input.businessLineCode ?? 'null'} seniority=${input.seniorityLevel ?? 'mid'}).`
      )
    }

    return {
      unitCost: round2(costPerHour),
      currency: quoteCurrency,
      costBreakdown: breakdown,
      resolutionNotes: notes
    }
  }

  // deliverable — prefer product catalog default price if no manual cost
  if (input.lineType === 'deliverable') {
    const productId = input.productId?.trim()

    if (!productId) {
      notes.push('line_type=deliverable sin productId ni manualUnitCost; costo quedó en null.')

      return {
        unitCost: null,
        currency: quoteCurrency,
        costBreakdown: buildEmptyBreakdown('product_catalog'),
        resolutionNotes: notes
      }
    }

    const product = await readProductDefaultPrice(productId)

    if (!product || product.default_unit_price == null) {
      notes.push(`Producto ${productId} sin default_unit_price; costo no disponible.`)

      return {
        unitCost: null,
        currency: quoteCurrency,
        costBreakdown: buildEmptyBreakdown('product_catalog'),
        resolutionNotes: notes
      }
    }

    const rawCost = Number(product.default_unit_price)
    const productCurrency = (product.default_currency?.toUpperCase() || 'CLP') as QuotationPricingCurrency
    let unitCost = Number.isFinite(rawCost) ? rawCost : null

    if (unitCost != null && productCurrency !== quoteCurrency) {
      unitCost = convertAmount(unitCost, productCurrency, quoteCurrency, input.exchangeRates, null, notes)
    }

    const breakdown: CostComponentBreakdown = {
      salaryComponent: null,
      employerCosts: null,
      directOverhead: null,
      structuralOverhead: null,
      loadedTotal: null,
      costPerHour: null,
      sourcePeriod: null,
      sourceCompensationVersionId: null,
      sourcePayrollPeriodId: null,
      fxRateApplied: null,
      fxRateDate: null,
      sourceCurrency: productCurrency,
      targetCurrency: quoteCurrency,
      snapshotSource: 'product_catalog'
    }

    return {
      unitCost: unitCost != null ? round2(unitCost) : null,
      currency: quoteCurrency,
      costBreakdown: breakdown,
      resolutionNotes: notes
    }
  }

  return {
    unitCost: null,
    currency: quoteCurrency,
    costBreakdown: buildEmptyBreakdown('manual'),
    resolutionNotes: ['line_type no soportado']
  }
}
