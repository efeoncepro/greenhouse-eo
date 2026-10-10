import Decimal from 'decimal.js'

import { calculatePricingV3 } from '../calculate'
import type { PricingV3TotalsV11 } from '../calculate'
import { PRICING_V3_ENGINES } from '../schemas'
import { resolveBrief } from './resolve'
import type { Diagnostic } from './contracts'

const D = Decimal.clone({ precision: 80 })

export const QUOTE_VERSION = 'pricing-v3-selection-quote/1'

/** Capacity timeline orchestration; all selling prices come from the existing kernel. */
export function calculateCatalogQuote(catalog: unknown, brief: unknown) {
  const resolution = resolveBrief(catalog, brief)

  return calculateResolvedQuote(resolution)
}

/** Shared orchestration for resolved catalog and composed resource snapshots. */
export function calculateResolvedQuote(resolution: ReturnType<typeof resolveBrief>) {
  const diagnostics: Diagnostic[] = [...resolution.diagnostics]

  const periods =
    resolution.status === 'resolved'
      ? resolution.inputs.map(p => ({
          periodId: p.periodId,
          result: calculatePricingV3(p.input)
        }))
      : []

  const complete =
    resolution.status === 'resolved' &&
    periods.length > 0 &&
    periods.every(p => p.result.calculationStatus === 'calculated')

  let totals = null
  const cashLedger: { periodId: number; key: string; amount: string; currency: string }[] = []

  if (complete) {
    const currency = periods[0].result.outputCurrency!
    const config = resolution.inputs[0].input.snapshot
    const precision = config.currencies.find(c => c.code === currency)!.precision
    const money = (v: Decimal) => v.toFixed(precision, D.ROUND_HALF_UP)

    const sums = (key: 'cost' | 'net' | 'undiscountedPrice' | 'discount' | 'marginAmount') =>
      periods.reduce((sum, p) => sum.plus(p.result.totals![key]), new D(0))

    // Resolution declares one contract per quote. The 1.1.0 amounts are summed only for a 1.1.0 quote; a 1.0.0 quote
    // keeps the key set its artifacts were frozen with (absent, not zero).
    const v11 = periods.every(p => p.result.engineVersion === PRICING_V3_ENGINES['1.1.0'])

    const commercial = (key: 'roundingAdjustment' | 'uplift') =>
      periods.reduce((sum, p) => sum.plus((p.result.totals as Partial<PricingV3TotalsV11>)[key] ?? 0), new D(0))

    const annual = new Map<string, { first: number; last: number; amount: string }>()

    for (const p of periods) {
      const input = resolution.inputs.find(i => i.periodId === p.periodId)!.input
      const annualByScope = new Map<string, Decimal>()
      const baseCash = new D(p.result.totals!.cashCommitment)
      let annualRaw = new D(0)

      for (const l of p.result.lines)
        for (const component of l.components) {
          if (component.trace.unit !== 'year') continue

          const assignment = input.request.lines
            .find(r => r.lineId === l.parentLineId)!
            .assignments.find(a => a.allocationId === component.componentId)!

          const key = `${assignment.resourceId}:${component.trace.scope}:${component.trace.scopeRef}`
          const amount = new D(component.cashCommitment)

          annualRaw = annualRaw.plus(amount)
          annualByScope.set(key, (annualByScope.get(key) ?? new D(0)).plus(amount))
        }

      // Kernel cash is in output currency; component cash is in calculation currency.
      const outputFx =
        input.request.outputCurrency === input.snapshot.calculationCurrency
          ? new D(1)
          : new D(
              input.snapshot.fx.find(
                f => f.from === input.snapshot.calculationCurrency && f.to === input.request.outputCurrency
              )!.rate
            )

      cashLedger.push({
        periodId: p.periodId,
        key: 'human-monthly-and-once',
        amount: money(baseCash.minus(annualRaw.mul(outputFx))),
        currency
      })

      for (const [key, amount] of annualByScope) {
        const prior = annual.get(key)

        if (prior && (prior.last !== p.periodId - 1 || !amount.eq(prior.amount)))
          diagnostics.push({
            code: 'ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY',
            path: key,
            detail: 'Changing annual subscribed units or gaps needs an explicit renewal/cancellation policy.'
          })
        if (!prior || (p.periodId - prior.first) % 12 === 0)
          cashLedger.push({ periodId: p.periodId, key, amount: money(amount.mul(outputFx)), currency })
        annual.set(key, { first: prior?.first ?? p.periodId, last: p.periodId, amount: amount.toString() })
      }
    }

    const cost = sums('cost')
    const net = sums('net')
    const margin = sums('marginAmount')
    const taxResolved = periods.every(p => p.result.totals!.tax !== null)
    const tax = taxResolved ? periods.reduce((s, p) => s.plus(p.result.totals!.tax!), new D(0)) : null

    totals = {
      cost: money(cost),
      undiscountedPrice: money(sums('undiscountedPrice')),
      ...(v11 ? { roundingAdjustment: money(commercial('roundingAdjustment')) } : {}),
      discount: money(sums('discount')),
      ...(v11 ? { uplift: money(commercial('uplift')) } : {}),
      net: money(net),
      marginAmount: money(margin),
      marginRate: net.gt(0) ? margin.div(net).toString() : null,
      tax: tax === null ? null : money(tax),
      grandTotal: tax === null ? null : money(net.plus(tax)),
      cashCommitment: money(cashLedger.reduce((s, c) => s.plus(c.amount), new D(0))),
      averageMonthlyNet: money(net.div(resolution.brief!.periods)),
      currency
    }
  }

  if (!complete || diagnostics.length) totals = null

  return {
    version: QUOTE_VERSION,
    binding: false as const,
    resolution,
    periods,
    diagnostics,
    cashLedger,
    calculationStatus: totals ? ('calculated' as const) : ('needs_input' as const),
    reviewStatus:
      diagnostics.length ||
      resolution.assumptions.length ||
      periods.some(p => p.result.reviewStatus === 'requires_review')
        ? ('requires_review' as const)
        : ('within_policy' as const),
    totals
  }
}
