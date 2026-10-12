import Decimal from 'decimal.js'

import { calculatePricingV3 } from '../calculate'
import { PRICING_V3_MAX_ADJUSTMENTS_V11 } from '../schemas'
import type { PricingV3InputV14 } from '../schemas'
import { AGREED_TOTAL_BILLING_CLASSES } from './contracts'
import type { resolveBrief } from './resolve'

const D = Decimal.clone({ precision: 80 })

type Resolution = ReturnType<typeof resolveBrief>

/**
 * Second pass of resolution: turns each agreed total of the brief into the kernel's own agreed nets, one per period
 * and billing class, so the kernel prices an agreed total without knowing it exists.
 *
 * The first pass is the resolution as it stands: every period input, with every cost the quote carries and without
 * the agreed totals. It is priced once to read the policy net of each group of rows a total names (a period and a
 * billing class: `monthly`, `setup`, `third_party`). The total is then distributed over the groups in proportion to
 * that net, each share rounded down to a multiple of the distribution unit, and the last group that has a price takes
 * what is left: the groups add up to the total exactly, and none can be negative. A group whose rows price at zero
 * has nothing to be proportional to and gets no agreed net. Each share is handed to its period as an `agreed_net` of
 * its billing class, named `<adjustmentId>:<billing class>`; inside a group the kernel spreads it over the rows as
 * it spreads any agreed net.
 *
 * The distribution unit is what keeps the tax of the quote the tax of its total. The kernel rounds the tax of each
 * period and the quote adds them up, so shares cut at the minor unit of the currency can leave a tax one unit away
 * from the rate on the agreed total. With an exclusive rate written as the fraction `p/q` in lowest terms, a share
 * that is a multiple of `q` minor units has a tax with nothing to round; only the period of the last group rounds,
 * once, and the taxes of the periods add up to the tax of the rate on the total, rounded once. That holds for the
 * rows a total names: a quote with rows outside it, or with several totals, rounds each of those periods too. When
 * that unit is larger than the fair share of some group, cutting to it would hand that group nothing: the whole
 * distribution then falls back to the minor unit of the currency, which is also the unit of a quote whose tax is not
 * resolved or does not apply. Which unit was used, and why, is frozen with the distribution.
 *
 * It runs once the inputs are final, which is why it is not part of `resolveBrief`: a composition adds the cost of
 * its tools to the inputs after resolving, and a policy net read before that would be the net of another quote.
 * `calculateResolvedQuote` calls it for both lanes. It is a pure function of the resolution, so a replay from the
 * frozen catalog and brief runs the same two passes and reaches the same inputs; what the first pass read and what
 * each group was handed is frozen with the result under `resolution.agreedTotals`.
 *
 * A total declared `per: 'period'` is an all-in price of each period instead of one of the whole term: the same
 * distribution is made once per period, over the groups of that period alone (its fee, its start-up, the costs it
 * re-invoices), in the same unit, and the last group of the period that has a price takes what is left. Every period
 * the named rows are billed in nets exactly the amount, whatever the billing classes it holds, so a start-up charged
 * in the first month is part of that month's price and never a row waived to make the month add up. A period in
 * which none of the named rows is billed has no group and is handed nothing. One unit serves the whole total: when
 * the tax-exact unit would hand nothing to a group of any period, every period is distributed at the minor unit.
 * With every row of a period inside the total, the tax of the period is the tax of the rate on the amount, rounded
 * once, and the quote adds one of those per period.
 *
 * A resolution that declares no agreed total, that is not resolved, or that was settled already is returned as it is.
 */
export function settleAgreedTotals<R extends Resolution>(resolution: R): R {
  if (!('agreedTotals' in resolution) || resolution.status !== 'resolved') return resolution

  const totals = resolution.agreedTotals

  if (!totals?.length || totals.every(total => total.distribution)) return resolution

  const block = (code: string, path: string, detail: string) => {
    resolution.diagnostics.push({ code, path, detail })
    resolution.status = 'needs_input'
  }

  const priced = resolution.inputs.map(period => ({ period, result: calculatePricingV3(period.input) }))

  // Without a policy price there is nothing to be proportional to. What stops each period is the kernel's to say,
  // and the calculation that follows says it; this only keeps a quote from ever being priced without its agreement.
  if (!priced.length || priced.some(({ result }) => result.calculationStatus !== 'calculated')) {
    for (const total of totals)
      block(
        'AGREED_TOTAL_WITHOUT_POLICY_PRICE',
        `adjustments.${total.adjustmentId}`,
        'The quote does not calculate without the agreed total, so there is no policy price to distribute it over. Resolve what its periods report first.'
      )

    return resolution
  }

  const config = resolution.inputs[0].input.snapshot
  const { outputCurrency: currency, taxTreatment } = resolution.inputs[0].input.request
  const precision = config.currencies.find(c => c.code === currency)!.precision
  const money = (value: Decimal) => value.toFixed(precision)
  const minorUnit = new D(10).pow(-precision)

  // An exclusive rate `p/q` in lowest terms taxes a multiple of `q` minor units with nothing to round. `toFraction`
  // is exact for a decimal: the denominator of a rate of 0.19 is 100 and the one of 0.1925 is 400.
  const taxExactUnit =
    taxTreatment.kind === 'exclusive' ? minorUnit.mul(new D(taxTreatment.rate).toFraction()[1]) : null

  for (const total of totals) {
    const path = `adjustments.${total.adjustmentId}`
    const amount = new D(total.amount)

    // Same rule the kernel holds an agreed net to, said for the declaration the caller wrote.
    if (amount.decimalPlaces() > precision) {
      block(
        'AGREED_TOTAL_NOT_REPRESENTABLE',
        `${path}.amount`,
        `The agreed total has more decimals than the output currency holds (${precision}).`
      )
      continue
    }

    const groups = priced.flatMap(({ period, result }) =>
      AGREED_TOTAL_BILLING_CLASSES.flatMap(billing => {
        const rows = result.lines.filter(line => line.kind === billing && total.lineIds.includes(line.parentLineId))

        return rows.length
          ? [
              {
                period,
                billing,
                lineIds: [...new Set(rows.map(row => row.parentLineId))],
                policyNet: rows.reduce((sum, row) => sum.plus(row.net), new D(0))
              }
            ]
          : []
      })
    )

    // What one amount is shared by. A total of the whole term is one pool, every group of the quote; a price per
    // period is one pool per period, the groups of that period alone. A period with no row of the total has no pool.
    const pools = (
      total.per === 'period' ? priced.map(({ period }) => groups.filter(group => group.period === period)) : [groups]
    )
      .filter(pool => pool.length)
      .map(pool => {
        const withPrice = pool.filter(group => group.policyNet.gt(0))

        return {
          periodId: pool[0].period.periodId,
          withPrice,
          policyNet: withPrice.reduce((sum, group) => sum.plus(group.policyNet), new D(0))
        }
      })

    const withoutBase = pools.filter(pool => !pool.withPrice.length)

    if (amount.gt(0) && (!pools.length || withoutBase.length)) {
      block(
        'AGREED_TOTAL_WITHOUT_BASE',
        path,
        total.per === 'period' && pools.length
          ? `No row the agreed total names has a price above zero in period ${withoutBase
              .map(pool => pool.periodId)
              .join(', ')}, so a price per period above zero has nothing to be distributed over there.`
          : 'No row the agreed total names has a price above zero in any period, so a total above zero has nothing to be distributed over.'
      )
      continue
    }

    // In each pool every group but the last gets its proportional part, cut down to a multiple of `unit`; the last
    // takes the rest. A group with a price has a part of any amount above zero: cut to nothing by the unit, it is
    // `starved`, which is what the fallback below is for.
    const distribute = (unit: Decimal) => {
      const shares = new Map<(typeof groups)[number], Decimal>()
      let starved = false

      for (const pool of pools) {
        let distributed = new D(0)

        pool.withPrice.forEach((group, index) => {
          const last = index === pool.withPrice.length - 1

          const share = last
            ? amount.minus(distributed)
            : amount.mul(group.policyNet).div(pool.policyNet).divToInt(unit).mul(unit)

          distributed = distributed.plus(share)
          shares.set(group, share)
          if (!last && share.isZero()) starved = true
        })
      }

      return { shares, starved }
    }

    const taxExact = taxExactUnit ? distribute(taxExactUnit) : null

    // Cut to nothing by the tax-exact unit, a group would be sold for free so that a tax rounds well: the
    // distribution is made at the minor unit instead, for every pool of the total, and says so.
    const starved = taxExact !== null && amount.gt(0) && taxExact.starved && taxExactUnit!.gt(minorUnit)

    const shares = taxExact && !starved ? taxExact.shares : distribute(minorUnit).shares
    const policyNet = pools.reduce((sum, pool) => sum.plus(pool.policyNet), new D(0))

    for (const [group, share] of shares) {
      // Built as the widest contract, like the rest of the request: the kernel parses it as the one it declares.
      const adjustments = group.period.input.request.adjustments as PricingV3InputV14['request']['adjustments']

      adjustments.push({
        adjustmentId: `${total.adjustmentId}:${group.billing}`,
        kind: 'agreed_net',
        amount: money(share),
        billing: group.billing,
        lineIds: group.lineIds,
        reason: total.reason
      })
    }

    total.policyNet = money(policyNet)
    total.distributionUnit = money(taxExact && !starved ? taxExactUnit! : minorUnit)
    total.distributionUnitBasis = !taxExact
      ? 'currency_precision'
      : starved
        ? 'currency_precision_fallback'
        : 'tax_exact'
    total.distribution = groups.map(group => ({
      periodId: group.period.periodId,
      billing: group.billing,
      lineIds: group.lineIds,
      policyNet: money(group.policyNet),
      agreedNet: money(shares.get(group) ?? new D(0))
    }))
  }

  // The kernel takes a bounded number of adjustments per period, and a total becomes up to one per billing class.
  for (const period of resolution.inputs)
    if (period.input.request.adjustments.length > PRICING_V3_MAX_ADJUSTMENTS_V11)
      block(
        'ADJUSTMENTS_EXCEED_PERIOD_LIMIT',
        `periods.${period.periodId}.adjustments`,
        `An agreed total is one agreed net per billing class of each period it reaches; with them this period holds more than the ${PRICING_V3_MAX_ADJUSTMENTS_V11} adjustments a period takes.`
      )

  return resolution
}
