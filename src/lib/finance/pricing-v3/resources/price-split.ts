import Decimal from 'decimal.js'

import { PricingV3Error } from '../errors'
import type { composeResourceQuote } from './composition'

type Composition = ReturnType<typeof composeResourceQuote>

// Component price x output FX x row net must be exact for any amount the kernel can store, as in its own floor
// arithmetic: 80 digits only cover two of the three. Nothing is divided here except through an integer quotient or
// for a ratio that is only read.
const Wide = Decimal.clone({ precision: 240, rounding: Decimal.ROUND_HALF_UP })

export const PRICE_SPLIT_VERSION = 'pricing-v3-price-split/1'

/** Name of the tools part when the caller gives none. Presentation only; it identifies nothing. */
export const PRICE_SPLIT_DEFAULT_LABEL = 'Kit de herramientas'

/** Same reading precision and direction as the composition summary: a margin never reads better than stored. */
const RATIO_DISPLAY_DECIMALS = 6

const ratioForReading = (value: Decimal) =>
  value.toDecimalPlaces(RATIO_DISPLAY_DECIMALS, Wide.ROUND_FLOOR).toFixed(RATIO_DISPLAY_DECIMALS)

const ISSUE_LIMIT = 20

const unique = <T>(items: T[]) => [...new Set(items)]

// Exact count of multiples covering `value`, as in calculate.ts: integer division plus one correction.
const ceilDiv = (value: Decimal, by: Decimal) => {
  const whole = value.divToInt(by)

  return whole.mul(by).lt(value) ? whole.plus(1) : whole
}

type Amounts = { cost: Decimal; net: Decimal }

/**
 * Presents the net of a frozen composed quote as two figures per commercial row: a kit of the tools the caller chose
 * and the person (everything else the row sells). It is a reading of the frozen result: no price, cost or status
 * changes, `tools.net + person.net` is the row net to the unit in every row and period, and nothing is recalculated
 * by the kernel. Which tools are shown apart is the caller's choice; there is no default set.
 *
 * How the row net is distributed follows how calculate.ts formed it, step by step:
 *
 * 1. Policy price. The kernel prices every component on its own (`component.price`): cost x pricing multiplier, or
 *    cost alone for a resource when the policy basis is `human`. The tools part starts from the stored price of its
 *    own components, not from a pro-rata of the row: a pro-rata would hand the kit a share of the person's margin
 *    (or of a pass-through, the other way round) that the policy never gave it.
 * 2. Market factor (contract 1.2.0). The kernel multiplies the human component only; a tool component is stored with
 *    market factor 1. The kit therefore carries none of `marketAdjustment`: all of it stays in the person part, and
 *    the kit costs the same in every market.
 * 3. Commercial rounding (`roundingAdjustment`). It raises the row as a whole to the next multiple and belongs to no
 *    component, so it stays in the person part, which is the unit the row sells. The kit is then presented under the
 *    same catalog rule as any priced figure: raised to the next multiple (never rounded down, the kernel never
 *    lowers a price to round it). Without a rounding rule it is read at the currency unit, half up, as the kernel
 *    reads every amount.
 * 4. Discount, agreed net, uplift. The kernel spreads each one over the rows it targets in proportion to their net,
 *    which is one ratio per row: `net / undiscountedPrice`. Inside the row the same ratio applies to both parts, so
 *    the kit takes the discount (or the uplift) it would have taken as a row of its own. It is applied before the
 *    kit is raised to the multiple.
 * 5. The person part is what is left of the row net. It holds the human component with its market adjustment, the
 *    platform fee, provisions, every tool not shown apart, the row rounding and whatever the kit rounding took.
 *
 * The kit can never be presented above the row net (a row that is nearly all tools, after a discount, is capped).
 *
 * Cost is the frozen cost of the components of each part, converted and rounded as the kernel rounds a row; the
 * person cost is the remainder of the row cost, so costs add up too.
 *
 * Floor. `minimumMargin` belongs to the row and the row verdict is the kernel's `MARGIN_BELOW_FLOOR`, never
 * recomputed. Each part is then measured against that same minimum on its own cost: the kit on its final net (the
 * market never lowered it), the person with the kernel's base-market rule when the row has one, where the ratio is
 * the person's own price over its own base-market price (the kit price is equal in both and leaves both terms). With
 * no tool shown apart in a row the person floor is the row `floorNet`, digit for digit. A part under the floor in a
 * row that meets it is reported, not repaired: it is the information that dropping the kit, or selling it alone,
 * would not hold the policy.
 *
 * A setup row is split by the same rule and no other: it is a part of the kit only for the selected tool components
 * it actually holds. Tools are monthly or annual resources, so a setup row normally holds none and is all person.
 */
export function splitQuotedPrice(
  result: Composition,
  identity: { calculationId: string; replayDigest: string },
  choice: { tools: 'all' | readonly string[]; label?: string }
) {
  const { quote } = result
  const totals = quote.totals

  // A blocked quote has rows without amounts, or no rows at all: there is nothing to present in two parts.
  if (quote.calculationStatus !== 'calculated' || !totals) throw new PricingV3Error('SPLIT_REQUIRES_CALCULATED_QUOTE')

  const attributed = unique(result.attributions.map(a => a.toolId))
  const requested = choice.tools === 'all' ? attributed : [...choice.tools]

  // A tool the client provides, or one the work does not need, carries no attributed cost and cannot be shown apart.
  // Only the position in the choice is reported, and the report stays bounded however long the choice was.
  const unknown = requested
    .flatMap((id, index) => (attributed.includes(id) ? [] : [{ path: `tools.${index}`, rule: 'not_attributed' }]))
    .slice(0, ISSUE_LIMIT)

  if (!requested.length || unknown.length)
    throw new PricingV3Error('SPLIT_TOOL_NOT_ATTRIBUTED', {
      option: 'tools',
      ...(unknown.length ? { issues: unknown } : {})
    })

  // In the order the quote attributed them, so the same choice reads the same however it was typed.
  const toolIds = attributed.filter(id => requested.includes(id))
  const traced = new Set<string>()

  const periods = quote.periods.map(period => {
    const input = quote.resolution.inputs.find(i => i.periodId === period.periodId)?.input

    if (!input || !period.result.totals) throw new PricingV3Error('SPLIT_REQUIRES_CALCULATED_QUOTE')

    // The rule the kernel rounded this period with, read from the input it was frozen with.
    const rounding = 'priceRounding' in input.snapshot ? input.snapshot.priceRounding : undefined
    const multiple = rounding ? new Wide(rounding.multiple) : null

    const rows = period.result.lines.map(row => {
      // The kernel formatted the row at the precision of the output currency; a derived amount keeps that scale.
      const scale = row.net.split('.')[1]?.length ?? 0
      const unit = new Wide(10).pow(-scale)
      const money = (value: Decimal) => value.toFixed(scale, Wide.ROUND_HALF_UP)
      const line = input.request.lines.find(l => l.lineId === row.parentLineId)

      let toolsCost = new Wide(0)
      let toolsPrice = new Wide(0)
      const components: { toolId: string; componentId: string; cost: string; policyPrice: string }[] = []

      for (const component of row.components) {
        if (component.kind === 'human') continue

        // Read back the way the kernel and the composition wrote it: a component is one assignment of one resource,
        // and a composed tool is the resource of exactly one attribution in its period.
        const assignment = line?.assignments.find(a => a.allocationId === component.componentId)

        const attribution =
          assignment &&
          result.attributions.find(
            a => a.periodId === period.periodId && a.resource.resourceId === assignment.resourceId
          )

        if (!attribution || !toolIds.includes(attribution.toolId)) continue

        const outputFx = new Wide(component.trace.outputFx ?? 1)
        const cost = new Wide(component.cost).mul(outputFx)
        const price = new Wide(component.price).mul(outputFx)

        toolsCost = toolsCost.plus(cost)
        toolsPrice = toolsPrice.plus(price)
        traced.add(`${period.periodId}\n${attribution.toolId}\n${row.parentLineId}`)

        // Rounded one by one for reading, like the kernel's components: they may miss the part by a unit. The part
        // amounts below are the ones that add up.
        components.push({
          toolId: attribution.toolId,
          componentId: component.componentId,
          cost: money(cost),
          policyPrice: money(price)
        })
      }

      const net = new Wide(row.net)
      const rowCost = new Wide(row.cost)
      const undiscounted = new Wide(row.undiscountedPrice)

      // Step 4 then step 3 of the rule above. `toolsPrice x net / undiscounted` is never formed as a quotient before
      // it is raised: the count of multiples is an integer division of two exact products.
      const presented =
        toolsPrice.isZero() || undiscounted.isZero()
          ? new Wide(0)
          : multiple
            ? ceilDiv(toolsPrice.mul(net), undiscounted.mul(multiple)).mul(multiple)
            : new Wide(money(toolsPrice.mul(net).div(undiscounted)))

      const tools: Amounts = { cost: Wide.min(new Wide(money(toolsCost)), rowCost), net: Wide.min(presented, net) }
      const person: Amounts = { cost: rowCost.minus(tools.cost), net: net.minus(tools.net) }

      const marginShare = new Wide(1).minus(row.minimumMargin)

      // Smallest net, at the currency unit, that meets the row minimum on `cost`: the kernel's `floorNet`, per part.
      const floorNet = (cost: Decimal, price?: Decimal, basePrice?: Decimal) =>
        (price && basePrice
          ? ceilDiv(cost.mul(price), marginShare.mul(basePrice).mul(unit))
          : ceilDiv(cost, marginShare.mul(unit))
        ).mul(unit)

      // Contract 1.2.0 with a base-market floor: policy price and base-market price of the row, by the identities
      // the kernel documents for its stored amounts. The kit price is the same in both markets.
      const policyPrice = undiscounted.minus('roundingAdjustment' in row ? row.roundingAdjustment : 0)
      const basePrice = policyPrice.minus('marketAdjustment' in row ? row.marketAdjustment : 0)
      const personPrice = policyPrice.minus(toolsPrice)
      const personBasePrice = basePrice.minus(toolsPrice)

      const loweredByMarket =
        'marketPriceRatio' in row &&
        row.marketPriceRatio !== '1' &&
        personBasePrice.gt(0) &&
        personPrice.lt(personBasePrice)

      const toolsFloor = floorNet(tools.cost)

      const personFloor = loweredByMarket ? floorNet(person.cost, personPrice, personBasePrice) : floorNet(person.cost)

      const rowBelowFloor = period.result.diagnostics.some(
        d => d.code === 'MARGIN_BELOW_FLOOR' && d.fieldPath === `result.lines.${row.lineId}`
      )

      const toolsBelowFloor = tools.net.lt(toolsFloor)
      const personBelowFloor = person.net.lt(personFloor)

      const readPart = (part: Amounts, floor: Decimal, belowFloor: boolean) => ({
        cost: money(part.cost),
        net: money(part.net),
        marginAmount: money(part.net.minus(part.cost)),
        marginRateRoundedDown: part.net.gt(0) ? ratioForReading(part.net.minus(part.cost).div(part.net)) : null,
        floorNet: money(floor),
        belowFloor
      })

      return {
        amounts: { tools, person },
        row: {
          periodId: period.periodId,
          lineId: row.lineId,
          parentLineId: row.parentLineId,
          kind: row.kind,
          label: row.label,
          // The row exactly as frozen. The verdict is the kernel's own; `floorNet` exists from contract 1.2.0 on.
          cost: row.cost,
          net: row.net,
          marginAmount: row.marginAmount,
          marginRateRoundedDown: net.gt(0) ? ratioForReading(new Wide(row.marginAmount).div(net)) : null,
          minimumMargin: row.minimumMargin,
          ...('floorNet' in row ? { floorNet: row.floorNet } : {}),
          rowBelowFloor,
          tools: {
            ...readPart(tools, toolsFloor, toolsBelowFloor),
            // Price the kernel formed for these components, before the row was rounded or adjusted.
            policyPrice: money(toolsPrice),
            components
          },
          person: readPart(person, personFloor, personBelowFloor),
          // Empty when the row itself is under its floor: then that is the finding, and each part still says its own.
          partsBelowFloorWhileRowMeetsIt: rowBelowFloor
            ? []
            : [...(toolsBelowFloor ? (['tools'] as const) : []), ...(personBelowFloor ? (['person'] as const) : [])]
        }
      }
    })

    return { periodId: period.periodId, net: period.result.totals.net, multiple, rows }
  })

  // The frozen result must let every selected attribution be found again in a row; otherwise part of the kit would
  // be left inside the person part without anyone noticing.
  for (const attribution of result.attributions)
    if (toolIds.includes(attribution.toolId))
      for (const assignment of attribution.assignments)
        if (!traced.has(`${attribution.periodId}\n${attribution.toolId}\n${assignment.lineId}`))
          throw new PricingV3Error('SPLIT_ATTRIBUTION_NOT_TRACEABLE')

  const scale = totals.net.split('.')[1]?.length ?? 0
  const money = (value: Decimal) => value.toFixed(scale, Wide.ROUND_HALF_UP)

  const sum = (parts: Amounts[]) => {
    const cost = parts.reduce((total, part) => total.plus(part.cost), new Wide(0))
    const net = parts.reduce((total, part) => total.plus(part.net), new Wide(0))

    return {
      cost: money(cost),
      net: money(net),
      marginAmount: money(net.minus(cost)),
      marginRateRoundedDown: net.gt(0) ? ratioForReading(net.minus(cost).div(net)) : null
    }
  }

  const everyRow = periods.flatMap(period => period.rows)

  return {
    schemaVersion: PRICE_SPLIT_VERSION,
    binding: false as const,
    calculationId: identity.calculationId,
    replayDigest: identity.replayDigest,
    commercialUnit: result.commercialUnit,
    currency: totals.currency,
    statement:
      'Presentation of a frozen quote in two figures. The quoted total is unchanged: in every row and period tools.net + person.net is the row net, and the totals below add up to the totals of the quote. It is not a new price.',
    basis: [
      'tools.net: stored price of the selected tool components (cost x pricing multiplier; a market factor never applies to a tool) x row net / row undiscountedPrice, raised to the price-rounding multiple of the quote when it has one and read at the currency unit otherwise; never above the row net.',
      'person.net: row net - tools.net. It keeps the person, the market adjustment, the platform fee, provisions, every tool not shown apart and the commercial rounding of the row.',
      'cost: frozen cost of the components of each part; person.cost is the remainder of the row cost. floorNet of a part is the smallest net that meets the row minimumMargin on that cost; rowBelowFloor is the kernel verdict.'
    ],
    tools: {
      label: choice.label ?? PRICE_SPLIT_DEFAULT_LABEL,
      toolIds,
      // Attributed by the quote and left inside the person part.
      keptInPersonPart: attributed.filter(id => !toolIds.includes(id))
    },
    rows: everyRow.map(({ row }) => row),
    periods: periods.map(period => ({
      periodId: period.periodId,
      net: period.net,
      // Multiple the kit was raised to in this period; null when the quote has no rounding rule.
      toolsRoundedUpTo: period.multiple ? period.multiple.toString() : null,
      tools: sum(period.rows.map(({ amounts }) => amounts.tools)),
      person: sum(period.rows.map(({ amounts }) => amounts.person))
    })),
    totals: {
      // The totals of the quote, as frozen.
      cost: totals.cost,
      net: totals.net,
      marginAmount: totals.marginAmount,
      marginRateRoundedDown: totals.marginRate ? ratioForReading(new Wide(totals.marginRate)) : null,
      tax: totals.tax,
      grandTotal: totals.grandTotal,
      tools: sum(everyRow.map(({ amounts }) => amounts.tools)),
      person: sum(everyRow.map(({ amounts }) => amounts.person))
    },
    floor: {
      source: 'kernel:MARGIN_BELOW_FLOOR for rows; each part is measured against the minimumMargin of its row.',
      rowsBelowFloor: everyRow
        .filter(({ row }) => row.rowBelowFloor)
        .map(({ row }) => ({ periodId: row.periodId, lineId: row.lineId })),
      partsBelowFloorWhileRowMeetsIt: everyRow.flatMap(({ row }) =>
        row.partsBelowFloorWhileRowMeetsIt.map(part => ({
          periodId: row.periodId,
          lineId: row.lineId,
          part,
          net: row[part].net,
          floorNet: row[part].floorNet,
          netShortOfFloor: new Wide(row[part].floorNet).minus(row[part].net).toFixed(scale)
        }))
      )
    }
  }
}
