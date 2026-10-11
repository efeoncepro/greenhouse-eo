import Decimal from 'decimal.js'

import { PRICING_V3_ENGINES, PRICING_V3_THIRD_PARTY_BILLING } from '../schemas'
import type { PricingV3Source } from '../schemas'
import type { calculateCatalogQuote } from './quote'

const D = Decimal.clone({ precision: 80 })

/**
 * Kind the kernel gives the contingency reserve inside a team row (contract 1.4.0). It is a cost of the row computed
 * from its own components, never a resource someone assigned: every reading tells it apart by this kind.
 */
export const CONTINGENCY_RESERVE_COMPONENT = 'contingency_reserve'

/** One priced part of a cost breakdown entry: its raw cost and price, as the kernel stored them before rounding. */
type Priced = { allocatedCostBeforeLineRounding: string; calculatedPrice: string }

type CostBreakdownEntry = {
  periodId: number
  lineId: string
  currency: string
  human: {
    coverage: string
    referenceAmount: string | null
    referenceCurrency: string
    allocatedCostBeforeLineRounding: string
    recordId: string
    revision: number
    source: PricingV3Source
  }[]
  resources: (Priced & { label: string; kind: string; assignment: Record<string, string> })[]
  contingencyReserve?: Priced & { rate: string; base: string; baseAmount: string }
  thirdParty?: Priced & {
    label: string
    category: string
    quantity: string
    supplierAmount: string
    supplierCurrency: string
    fxPath: string
    fxRate: string
    evidence: PricingV3Source | null
    policy: {
      method: string
      rate: string
      minimumMargin: string
      rounding: string
      recordId: string
      revision: number
      source: PricingV3Source
    } | null
  }
}

/**
 * Attribution projection only; costs/prices are the already calculated kernel components.
 *
 * One entry per monthly team row, as always. From contract 1.4.0 a team row may carry the contingency reserve, shown
 * under its own key and never among the assigned resources, and each re-invoiced third-party cost is a row of its
 * own: its entry carries `thirdParty`, has no person and no resource, and, unlike a team row, is stated in the output
 * currency of the quote.
 */
export function explainCostComponents(result: ReturnType<typeof calculateCatalogQuote>) {
  const entries: CostBreakdownEntry[] = []

  for (const period of result.periods) {
    const { request, snapshot } = result.resolution.inputs.find(p => p.periodId === period.periodId)!.input

    for (const line of period.result.lines) {
      if (line.kind === PRICING_V3_THIRD_PARTY_BILLING) {
        const declared = ('thirdPartyCosts' in request ? request.thirdPartyCosts : undefined) ?? []

        const policy = result.resolution.bindings.find(
          b => b.lineId === line.parentLineId && b.purpose === 'third_party_policy'
        )?.record

        for (const component of line.components)
          entries.push({
            periodId: period.periodId,
            lineId: line.parentLineId,
            // The kernel stores this component in the output currency: a supplier that charges in it is not converted.
            currency: component.trace.denominatedIn,
            human: [],
            resources: [],
            thirdParty: {
              label: component.label,
              category: component.trace.category,
              quantity: component.trace.quantity,
              supplierAmount: component.trace.supplierAmount,
              supplierCurrency: component.trace.supplierCurrency,
              fxPath: component.trace.fxPath,
              fxRate: component.trace.fxRate,
              allocatedCostBeforeLineRounding: component.cost,
              calculatedPrice: component.price,
              // Evidence of the amount as the kernel judged it. The supplier is not here: it never leaves the brief.
              evidence: declared.find(cost => cost.costId === line.parentLineId)?.source ?? null,
              policy:
                policy?.kind === 'third_party_policy'
                  ? {
                      method: policy.value.method,
                      rate: policy.value.rate,
                      minimumMargin: policy.value.minimumMargin,
                      rounding: policy.value.rounding,
                      recordId: policy.recordId,
                      revision: policy.revision,
                      source: policy.source
                    }
                  : null
            }
          })

        continue
      }

      if (line.kind !== 'monthly') continue

      const binding = result.resolution.bindings.find(b => b.lineId === line.parentLineId && b.record.kind === 'cost')
      const record = binding?.record
      const human = line.components.find(c => c.kind === 'human')
      const reserve = line.components.find(c => c.kind === CONTINGENCY_RESERVE_COMPONENT)

      const referenceTotal =
        record?.kind === 'cost' ? record.value.components.reduce((s, c) => s.plus(c.amount ?? '0'), new D(0)) : new D(0)

      entries.push({
        periodId: period.periodId,
        lineId: line.parentLineId,
        currency: snapshot.calculationCurrency,
        human:
          record?.kind === 'cost' && human
            ? record.value.components.map(component => ({
                coverage: component.coverage,
                referenceAmount: component.amount,
                referenceCurrency: record.value.currency,
                allocatedCostBeforeLineRounding: referenceTotal.gt(0)
                  ? new D(human.cost).mul(component.amount!).div(referenceTotal).toString()
                  : '0',
                recordId: record.recordId,
                revision: record.revision,
                source: record.source
              }))
            : [],
        resources: line.components
          .filter(c => c.kind !== 'human' && c.kind !== CONTINGENCY_RESERVE_COMPONENT)
          .map(c => ({
            label: c.label,
            kind: c.kind,
            allocatedCostBeforeLineRounding: c.cost,
            calculatedPrice: c.price,
            assignment: c.trace
          })),
        // `rate` over `baseAmount` (the person cost of the row, or every cost of it, as `base` says), in the
        // calculation currency like the rest of the row. Absent when the row carries no reserve.
        ...(reserve
          ? {
              contingencyReserve: {
                rate: reserve.trace.rate,
                base: reserve.trace.base,
                baseAmount: reserve.trace.baseAmount,
                allocatedCostBeforeLineRounding: reserve.cost,
                calculatedPrice: reserve.price
              }
            }
          : {})
      })
    }
  }

  return entries
}

type Quote = ReturnType<typeof calculateCatalogQuote>

/**
 * Market factor in force for a frozen quote and where its price floor is read: `floorBasis` is `base_market` only when
 * the record declares it (contract 1.2.0); null means the floor is read on the final net. The neutral factor (1, no
 * floor basis) changes nothing and is not reported: readings of quotes frozen with it keep the keys they had.
 */
export function describeMarketFactor(resolution: Quote['resolution']) {
  const market = resolution.bindings.find(b => b.purpose === 'market_factor')?.record

  if (market?.kind !== 'market_factor') return null
  if (!market.value.floorBasis && new D(market.value.factor).eq(1)) return null

  return {
    country: market.value.country,
    factor: market.value.factor,
    floorBasis: market.value.floorBasis ?? null,
    recordId: market.recordId,
    revision: market.revision,
    sourceStatus: market.source.status
  }
}

/**
 * Form of the engagement a frozen quote declares and the price ratio resolution bound for it (contract 1.3.0). Null
 * when the brief declares no form. Unlike the market factor, a ratio of 1 is reported too: the declared form is part
 * of what the quote freezes, whatever it does to the price.
 */
export function describeEngagementForm(resolution: Quote['resolution']) {
  const engagement = resolution.bindings.find(b => b.purpose === 'engagement_factor')?.record

  if (engagement?.kind !== 'engagement_factor') return null

  return {
    form: engagement.value.form,
    priceRatio: engagement.value.priceRatio,
    scope: engagement.value.offerId ? ('offer' as const) : ('general' as const),
    offerId: engagement.value.offerId ?? null,
    recordId: engagement.recordId,
    revision: engagement.revision,
    sourceStatus: engagement.source.status
  }
}

/**
 * Price rules resolution bound for the third-party costs a frozen quote re-invoices (contract 1.4.0): one entry per
 * catalog record, in the order it was first bound, with the costs it prices. Empty when the quote re-invoices none.
 * A cost the client pays to the supplier has no rule: it is a note of the brief and is priced by nothing.
 */
export function describeThirdPartyPolicies(resolution: Quote['resolution']) {
  const policies = new Map<
    string,
    {
      category: string
      label: string
      method: 'markup' | 'target_margin'
      rate: string
      minimumMargin: string
      rounding: 'commercial' | 'none'
      scope: 'offer' | 'general'
      offerId: string | null
      recordId: string
      revision: number
      sourceStatus: 'confirmed' | 'estimated' | 'pending'
      costIds: string[]
    }
  >()

  for (const { lineId, purpose, record } of resolution.bindings) {
    if (purpose !== 'third_party_policy' || record.kind !== 'third_party_policy') continue

    const key = `${record.recordId}\n${record.revision}`

    const policy = policies.get(key) ?? {
      category: record.value.category,
      label: record.value.label,
      method: record.value.method,
      rate: record.value.rate,
      minimumMargin: record.value.minimumMargin,
      rounding: record.value.rounding,
      scope: record.value.offerId ? ('offer' as const) : ('general' as const),
      offerId: record.value.offerId ?? null,
      recordId: record.recordId,
      revision: record.revision,
      sourceStatus: record.source.status,
      costIds: []
    }

    policies.set(key, policy)
    policy.costIds.push(lineId)
  }

  return [...policies.values()]
}

/**
 * Contingency reserve resolution selected for a frozen quote (contract 1.4.0) and whether its brief waives it. Null
 * when no reserve applies to the quote. A waived reserve is reported too, with the reason the brief gives: the waiver
 * is part of what the quote freezes. `scope` says what the record names; null on a side means it does not name it.
 * A selection readout: what the reserve amounts to is `totals.contingencyReserve`, the kernel's.
 */
export function describeContingencyReserve(resolution: Quote['resolution']) {
  const reserve = resolution.bindings.find(b => b.purpose === 'contingency_reserve')?.record

  if (reserve?.kind !== 'contingency_reserve') return null

  const waiver = resolution.brief?.contingency?.kind === 'waived' ? resolution.brief.contingency : null

  return {
    label: reserve.value.label,
    rate: reserve.value.rate,
    base: reserve.value.base,
    scope: { offerId: reserve.value.offerId ?? null, engagementForm: reserve.value.engagementForm ?? null },
    waived: Boolean(waiver),
    ...(waiver ? { waiverReason: waiver.reason } : {}),
    recordId: reserve.recordId,
    revision: reserve.revision,
    sourceStatus: reserve.source.status
  }
}

/**
 * Commercial terms a frozen quote was resolved with: the adjustments its brief declares and the rounding rule
 * resolution bound for the output currency. A selection readout; every amount stays the kernel's.
 */
export function describeCommercialTerms(resolution: Quote['resolution']) {
  const rule = resolution.bindings.find(b => b.purpose === 'price_rounding')?.record

  return {
    commercialAdjustments: resolution.brief?.adjustments ?? [],
    priceRounding:
      rule?.kind === 'price_rounding'
        ? {
            currency: rule.value.currency,
            multiple: rule.value.multiple,
            scope: rule.value.offerId ? ('offer' as const) : ('general' as const),
            offerId: rule.value.offerId ?? null,
            recordId: rule.recordId,
            revision: rule.revision,
            sourceStatus: rule.source.status
          }
        : null
  }
}

const IDENTITY = 'net = undiscountedPrice + uplift - discount; undiscountedPrice already includes roundingAdjustment.'

const MARKET_IDENTITY =
  ' undiscountedPrice - roundingAdjustment - marketAdjustment is the price of the base market (market factor 1).' +
  ' A row is under its floor when net < floorNet; the margin reported is always the real one, on the final net.'

// Contract 1.3.0 puts the engagement ratio on top of the market price, so one more amount is taken off to reach the
// base. The floor sentence is the same: the ratio moves the net, never `floorNet`.
const ENGAGEMENT_IDENTITY =
  ' undiscountedPrice - roundingAdjustment - engagementAdjustment is the price of the offer market at engagement' +
  ' ratio 1; less marketAdjustment it is the price of the base market (market factor 1) at that ratio.' +
  ' A row is under its floor when net < floorNet; floorNet is the one of the same row quoted without a form, and' +
  ' the margin reported is always the real one, on the final net.'

// Contract 1.4.0 changes nothing of the walk above: it adds a cost inside a team row and rows of another kind. The
// reserve is cost, so it is in `floorNet` already; a third-party row walks the same identities with both adjustments
// at 0, because neither the market factor nor the engagement ratio reaches what a supplier charges.
const THIRD_PARTY_RESERVE_IDENTITY =
  ' contingencyReserve is the part of the cost of a row that is its contingency reserve: the cost of the same row' +
  ' quoted without a reserve is its cost less contingencyReserve, and floorNet is read on the cost with it.' +
  ' A row of kind third_party is one re-invoiced cost: its marketAdjustment and engagementAdjustment are 0, its' +
  ' engagementPriceRatio is 1 and its floor is the one of its category.'

/**
 * Internal price walk per billable row, as the kernel stored it. Contract 1.1.0 rows add rounding and uplift; contract
 * 1.2.0 rows add the market adjustment and the floor of that market; contract 1.3.0 rows add the engagement
 * adjustment and the ratio of the declared form; contract 1.4.0 rows add the contingency reserve inside their cost,
 * and a row may be a re-invoiced third-party cost.
 *
 * Contracts are cumulative, and so is this reading: a quote of a later contract keeps every key an earlier one has.
 */
export function explainCommercialAdjustments(result: Quote) {
  const signedBy = (contract: keyof typeof PRICING_V3_ENGINES) =>
    result.periods.some(period => period.result.engineVersion === PRICING_V3_ENGINES[contract])

  const v14 = signedBy('1.4.0')
  const v13 = v14 || signedBy('1.3.0')
  const v12 = v13 || signedBy('1.2.0')

  return {
    ...describeCommercialTerms(result.resolution),
    ...(v12 ? { marketFactor: describeMarketFactor(result.resolution) } : {}),
    ...(v13 ? { engagementForm: describeEngagementForm(result.resolution) } : {}),
    // The rule of each re-invoiced cost and the reserve of the quote, as resolution selected them. An empty list and
    // null say the quote uses the other capability of the contract only.
    ...(v14
      ? {
          thirdPartyPolicies: describeThirdPartyPolicies(result.resolution),
          contingencyReserve: describeContingencyReserve(result.resolution)
        }
      : {}),
    identity: v14
      ? IDENTITY + ENGAGEMENT_IDENTITY + THIRD_PARTY_RESERVE_IDENTITY
      : v13
        ? IDENTITY + ENGAGEMENT_IDENTITY
        : v12
          ? IDENTITY + MARKET_IDENTITY
          : IDENTITY,
    rows: result.periods.flatMap(period =>
      period.result.lines.map(line => ({
        periodId: period.periodId,
        lineId: line.lineId,
        kind: line.kind,
        ...('contingencyReserve' in line ? { contingencyReserve: line.contingencyReserve } : {}),
        ...('marketAdjustment' in line ? { marketAdjustment: line.marketAdjustment } : {}),
        ...('engagementAdjustment' in line ? { engagementAdjustment: line.engagementAdjustment } : {}),
        undiscountedPrice: line.undiscountedPrice,
        ...('roundingAdjustment' in line ? { roundingAdjustment: line.roundingAdjustment } : {}),
        discount: line.discount,
        ...('uplift' in line ? { uplift: line.uplift } : {}),
        net: line.net,
        ...('floorNet' in line ? { marketPriceRatio: line.marketPriceRatio, floorNet: line.floorNet } : {}),
        ...('engagementPriceRatio' in line ? { engagementPriceRatio: line.engagementPriceRatio } : {})
      }))
    )
  }
}
