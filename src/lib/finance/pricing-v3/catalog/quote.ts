import Decimal from 'decimal.js'

import { calculatePricingV3 } from '../calculate'
import type { PricingV3TotalsV14 } from '../calculate'
import { PRICING_V3_ENGINES, PRICING_V3_THIRD_PARTY_BILLING } from '../schemas'
import { settleAgreedTotals } from './agreed-total'
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
  // The inputs are final here, also for a composition, which adds the cost of its tools after resolving: an agreed
  // total of the brief is turned into the agreed nets of each period now. Without one this changes nothing.
  settleAgreedTotals(resolution)

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

    // Resolution declares one contract per quote. The amounts a contract added are summed only for a quote of that
    // contract or a later one; an earlier quote keeps the key set its artifacts were frozen with (absent, not zero).
    const v14 = periods.every(p => p.result.engineVersion === PRICING_V3_ENGINES['1.4.0'])
    const v13 = v14 || periods.every(p => p.result.engineVersion === PRICING_V3_ENGINES['1.3.0'])
    const v12 = v13 || periods.every(p => p.result.engineVersion === PRICING_V3_ENGINES['1.2.0'])
    const v11 = v12 || periods.every(p => p.result.engineVersion === PRICING_V3_ENGINES['1.1.0'])

    const commercial = (
      key:
        | 'marketAdjustment'
        | 'engagementAdjustment'
        | 'roundingAdjustment'
        | 'uplift'
        | 'contingencyReserve'
        | 'contingencyBase'
        | 'contingencyReserveWaived'
        | 'thirdPartyCost'
        | 'thirdPartyNet'
    ) => periods.reduce((sum, p) => sum.plus((p.result.totals as Partial<PricingV3TotalsV14>)[key] ?? 0), new D(0))

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

      // Contract 1.4.0. What a re-invoiced cost commits is paid to its supplier, so each one is its own entry and
      // leaves the entry of the team. The kernel stored it in the output currency and counted it in the cash of the
      // period at the precision of that currency, row by row: read the same way, the ledger still adds up to it.
      const thirdPartyCash = p.result.lines
        .filter(l => l.kind === PRICING_V3_THIRD_PARTY_BILLING)
        .map(l => ({
          key: `third-party:${l.parentLineId}`,
          amount: l.components.reduce(
            (sum, component) => sum.plus(new D(component.cashCommitment).toDecimalPlaces(precision, D.ROUND_HALF_UP)),
            new D(0)
          )
        }))

      cashLedger.push({
        periodId: p.periodId,
        key: 'human-monthly-and-once',
        amount: money(
          thirdPartyCash.reduce((left, entry) => left.minus(entry.amount), baseCash.minus(annualRaw.mul(outputFx)))
        ),
        currency
      })

      for (const entry of thirdPartyCash)
        cashLedger.push({ periodId: p.periodId, key: entry.key, amount: money(entry.amount), currency })

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

    // Contract 1.4.0: own work is what is left of the quote once the third-party rows are taken out.
    const thirdPartyCost = commercial('thirdPartyCost')
    const thirdPartyNet = commercial('thirdPartyNet')
    const ownWorkNet = net.minus(thirdPartyNet)

    totals = {
      cost: money(cost),
      ...(v14
        ? {
            contingencyReserve: money(commercial('contingencyReserve')),
            contingencyBase: money(commercial('contingencyBase')),
            contingencyReserveWaived: money(commercial('contingencyReserveWaived'))
          }
        : {}),
      ...(v12 ? { marketAdjustment: money(commercial('marketAdjustment')) } : {}),
      ...(v13 ? { engagementAdjustment: money(commercial('engagementAdjustment')) } : {}),
      undiscountedPrice: money(sums('undiscountedPrice')),
      ...(v11 ? { roundingAdjustment: money(commercial('roundingAdjustment')) } : {}),
      discount: money(sums('discount')),
      ...(v11 ? { uplift: money(commercial('uplift')) } : {}),
      net: money(net),
      marginAmount: money(margin),
      marginRate: net.gt(0) ? margin.div(net).toString() : null,
      ...(v14
        ? {
            thirdPartyCost: money(thirdPartyCost),
            thirdPartyNet: money(thirdPartyNet),
            ownWorkMarginRate: ownWorkNet.gt(0)
              ? ownWorkNet.minus(cost.minus(thirdPartyCost)).div(ownWorkNet).toString()
              : null
          }
        : {}),
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
