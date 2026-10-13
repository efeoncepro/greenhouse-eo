import Decimal from 'decimal.js'
import type { z } from 'zod'

import type { Catalog } from '../catalog/contracts'
import type { composeResourceQuote } from './composition'
import type { CompositionDemand, CompositionPolicy } from './composition-contracts'
import type { creditCatalogSchema } from './credit-budget'

type Composition = ReturnType<typeof composeResourceQuote>
type Brief = CompositionDemand['brief']
type BriefLine = Brief['lines'][number]
type QuotePeriod = Composition['quote']['periods'][number]
type PeriodTotals = NonNullable<QuotePeriod['result']['totals']>

// Component cost x output FX and every difference and sum of frozen amounts must be exact for any amount the kernel
// can store, as in price-split.ts and engagement-view.ts. Nothing is divided here except for a ratio that is only read.
const Wide = Decimal.clone({ precision: 240, rounding: Decimal.ROUND_HALF_UP })

export const QUOTE_INCREMENT_VERSION = 'pricing-v3-quote-increment/1'

/** Same reading precision and direction as the composition summary: a margin never reads better than stored. */
const RATIO_DISPLAY_DECIMALS = 6

const ratioForReading = (value: Decimal) =>
  value.toDecimalPlaces(RATIO_DISPLAY_DECIMALS, Wide.ROUND_FLOOR).toFixed(RATIO_DISPLAY_DECIMALS)

const ISSUE_LIMIT = 20

/** The kernel formatted every amount of a quote at the precision of its output currency; a derived one keeps it. */
const scaleOf = (money: string) => money.split('.')[1]?.length ?? 0

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Two frozen values say the same thing: equal leaf by leaf, whatever order their keys were written in. A key that is
 * absent and one that is undefined are the same declaration.
 */
const sameContent = (left: unknown, right: unknown): boolean => {
  if (left === right) return true

  if (Array.isArray(left) || Array.isArray(right))
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => sameContent(item, right[index]))
    )

  if (!isRecord(left) || !isRecord(right)) return false

  const declared = (value: Record<string, unknown>) => Object.keys(value).filter(key => value[key] !== undefined)
  const keys = declared(left)

  return keys.length === declared(right).length && keys.every(key => sameContent(left[key], right[key]))
}

/**
 * The part of a frozen composition artifact this reading uses: the result and the three versioned sources it was
 * frozen with. Verifying it by replay is the caller's job, as for every reading of a frozen quote.
 */
export type QuoteIncrementSource = {
  calculationId: string
  replayDigest: string
  semantic: {
    catalog: Catalog
    policy: CompositionPolicy
    credits: z.infer<typeof creditCatalogSchema>
    demand: CompositionDemand
    result: Composition
  }
}

/** Where two quotes stop being comparable and which rule it broke; never the content that was compared. */
export type QuoteIncrementIssue = { path: string; rule: string }

/**
 * Rejections of the reading, one per rule of comparability, in the order the rules are checked. They are returned,
 * not thrown, as in engagement-view.ts: the reader is pure and the adapter that wires it maps `code` onto a
 * registered `PricingV3Error`.
 */
export type QuoteIncrementRejectionCode =
  | 'QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES'
  | 'QUOTE_INCREMENT_CONTEXT_DIFFERS'
  | 'QUOTE_INCREMENT_VERSIONS_DIFFER'
  | 'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE'
  | 'QUOTE_INCREMENT_BASE_NOT_CONTAINED'
  | 'QUOTE_INCREMENT_NET_NOT_POSITIVE'

const rejected = (code: QuoteIncrementRejectionCode, issues: QuoteIncrementIssue[] = []) => ({
  ok: false as const,
  code,
  // Bounded however many places the two quotes differ in.
  issues: issues.slice(0, ISSUE_LIMIT)
})

// ---- what a period of a frozen quote says ----

type Amounts = { net: Decimal; cost: Decimal; margin: Decimal }

const NOTHING = (): Amounts => ({ net: new Wide(0), cost: new Wide(0), margin: new Wide(0) })

/** Net, cost and margin exactly as the kernel froze them for a period or for the quote: nothing is recomputed. */
const amountsOf = (totals: Pick<PeriodTotals, 'net' | 'cost' | 'marginAmount'>): Amounts => ({
  net: new Wide(totals.net),
  cost: new Wide(totals.cost),
  margin: new Wide(totals.marginAmount)
})

const plus = (left: Amounts, right: Amounts): Amounts => ({
  net: left.net.plus(right.net),
  cost: left.cost.plus(right.cost),
  margin: left.margin.plus(right.margin)
})

const minus = (left: Amounts, right: Amounts): Amounts => ({
  net: left.net.minus(right.net),
  cost: left.cost.minus(right.cost),
  margin: left.margin.minus(right.margin)
})

const equalAmounts = (left: Amounts, right: Amounts) =>
  left.net.eq(right.net) && left.cost.eq(right.cost) && left.margin.eq(right.margin)

/** A line as the kernel received it in one period: the people it counts and the dedication of each. */
type ActiveLine = { headcount: number; unit: string; value: Decimal }

/** One period of a calculated quote, read once: its frozen amounts, its lines and where its cost sits. */
type PeriodView = {
  periodId: number
  amounts: Amounts
  lines: Map<string, ActiveLine>
  /** Net and cost of the rows the period charges once (kind `setup`). */
  oneOff: { net: Decimal; cost: Decimal }
  /** Frozen cost of the components of the period, in the currency of the quote, by the kind the kernel gave each. */
  costByKind: Map<string, Decimal>
  /** The same cost for the components that are a composed tool, by tool. */
  costByTool: Map<string, { label: string; cost: Decimal }>
  /** Lines each tool is charged to in the period. */
  toolLines: Map<string, Set<string>>
}

const SETUP_KIND = 'setup'

/**
 * Reads a period back the way the kernel and the composition wrote it. A row keeps the id of the line it prices
 * (`parentLineId`); a component is one assignment of one resource (`allocationId`), and a composed tool is the
 * resource of an attribution of the period, as in price-split.ts. A component cost is stored in the calculation
 * currency and converted with the output FX the kernel traced on it.
 */
const viewOf = (result: Composition, period: QuotePeriod): PeriodView | null => {
  const input = result.quote.resolution.inputs.find(candidate => candidate.periodId === period.periodId)?.input
  const totals = period.result.totals

  if (!input || !totals) return null

  const attributed = result.attributions.filter(attribution => attribution.periodId === period.periodId)
  const toolOf = new Map(attributed.map(attribution => [attribution.resource.resourceId, attribution]))
  const costByKind = new Map<string, Decimal>()
  const costByTool = new Map<string, { label: string; cost: Decimal }>()
  const toolLines = new Map<string, Set<string>>()
  let oneOffNet = new Wide(0)
  let oneOffCost = new Wide(0)

  for (const attribution of attributed) {
    const lines = toolLines.get(attribution.toolId) ?? new Set<string>()

    attribution.assignments.forEach(assignment => lines.add(assignment.lineId))
    toolLines.set(attribution.toolId, lines)
  }

  for (const row of period.result.lines) {
    const line = input.request.lines.find(candidate => candidate.lineId === row.parentLineId)

    if (row.kind === SETUP_KIND) {
      oneOffNet = oneOffNet.plus(row.net)
      oneOffCost = oneOffCost.plus(row.cost)
    }

    for (const component of row.components) {
      const cost = new Wide(component.cost).mul(component.trace.outputFx ?? 1)

      costByKind.set(component.kind, (costByKind.get(component.kind) ?? new Wide(0)).plus(cost))

      const assignment = line?.assignments.find(candidate => candidate.allocationId === component.componentId)
      const attribution = assignment && toolOf.get(assignment.resourceId)

      if (!attribution) continue

      const tool = costByTool.get(attribution.toolId) ?? { label: attribution.resource.label, cost: new Wide(0) }

      tool.cost = tool.cost.plus(cost)
      costByTool.set(attribution.toolId, tool)
    }
  }

  return {
    periodId: period.periodId,
    amounts: amountsOf(totals),
    lines: new Map(
      input.request.lines.map(line => [
        line.lineId,
        { headcount: line.headcount, unit: line.dedication.unit, value: new Wide(line.dedication.value) }
      ])
    ),
    oneOff: { net: oneOffNet, cost: oneOffCost },
    costByKind,
    costByTool,
    toolLines
  }
}

/** Every period of a quote, or null when it is not a calculated quote: then there is nothing to subtract. */
const read = (source: QuoteIncrementSource) => {
  const { quote } = source.semantic.result

  if (quote.calculationStatus !== 'calculated' || !quote.totals || !quote.periods.length) return null

  const periods = quote.periods.map(period => viewOf(source.semantic.result, period))

  return periods.every(period => period !== null)
    ? { totals: quote.totals, amounts: amountsOf(quote.totals), periods: periods as PeriodView[] }
    : null
}

const sameLines = (left: PeriodView, right: PeriodView) =>
  left.lines.size === right.lines.size &&
  [...left.lines].every(([lineId, line]) => {
    const other = right.lines.get(lineId)

    return other && other.headcount === line.headcount && other.unit === line.unit && other.value.eq(line.value)
  })

// ---- the rules, one group per rejection ----

// What a quote is quoted for and under: two quotes that differ in any of these are quotes of two things, and their
// difference is not the price of an add-on. `quoteDate` belongs here for the reason the versions do: the records of
// a catalog are effective by date, so one catalog read on two dates can give two prices.
const CONTEXT: readonly (readonly [keyof Brief, string])[] = [
  ['outputCurrency', 'currency_differs'],
  ['offerId', 'offer_differs'],
  ['accountId', 'account_differs'],
  ['taxTreatment', 'tax_treatment_differs'],
  ['engagementForm', 'engagement_form_differs'],
  ['engagementCode', 'engagement_code_differs'],
  ['offerMarketCountry', 'market_differs'],
  ['quoteDate', 'quote_date_differs'],
  ['mode', 'mode_differs'],
  ['contingency', 'contingency_differs']
]

// What a line is priced and costed by besides its dedication. The first three are the identity of the line; the
// rest select the cost record, the price rule and the kit it resolves with, so a difference in any of them moves the
// cost or the price of the part of the line the base already has.
const LINE_IDENTITY: readonly (readonly [keyof BriefLine, string])[] = [
  ['profile', 'profile_differs'],
  ['seniorityCode', 'profile_differs'],
  ['talentCountry', 'country_differs'],
  ['allocationMode', 'allocation_mode_differs'],
  ['allocationPolicyId', 'basis_differs'],
  ['pricingPolicyId', 'basis_differs'],
  ['kitId', 'basis_differs'],
  ['costRecordId', 'basis_differs'],
  ['teamId', 'basis_differs'],
  ['allowUnlocalizedCost', 'basis_differs']
]

const VERSIONED = ['catalog', 'policy', 'credits'] as const

const unique = <T>(items: T[]) => [...new Set(items)]

/** Entries that say the same of different periods, declared once: the periods, in order, and what they share. */
const byPeriods = <T>(entries: { periodId: number; value: T }[]) => {
  const groups: { key: string; periodIds: number[]; value: T }[] = []

  for (const entry of entries) {
    const key = JSON.stringify(entry.value)
    const group = groups.find(candidate => candidate.key === key)

    if (group) group.periodIds.push(entry.periodId)
    else groups.push({ key, periodIds: [entry.periodId], value: entry.value })
  }

  return groups.map(({ periodIds, value }) => ({ periodIds, ...value }))
}

/**
 * Prices an add-on that extends a quote as the difference between two frozen quotes: the base, and the base with the
 * add-on in it. It is a reading of two frozen results: no price, cost or status changes and nothing is recalculated
 * by the kernel. Every figure is a frozen amount of one quote minus the same frozen amount of the other.
 *
 * Why a difference. The quote of an add-on alone is a quote of new lines. When the add-on only adds dedication to
 * people who are already lines of the base, that quote takes once more every cost a line is charged once whatever
 * its dedication (the platform fee, its part of the base tools): its price is right and its cost is overstated. In
 * the quote of the base with the add-on in it each person is one line with the summed dedication, so nothing is
 * charged twice, and the difference with the base is what the add-on adds: to the net, to the cost and to the margin.
 *
 * **It is an internal reading.** It holds cost and margin and is never shown to a client. The quote document takes
 * from it one figure only, the net the add-on adds in a period (`netIncrementPerPeriod`).
 *
 * Two quotes are subtracted only when the difference can mean the add-on and nothing else. Otherwise the reading is
 * rejected with the rule that failed; nothing is approximated. The rules, in the order they are checked:
 *
 * 1. Both are calculated (`QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES`).
 * 2. Both quote the same thing under the same terms (`QUOTE_INCREMENT_CONTEXT_DIFFERS`): output currency, offer,
 *    commercial unit, account, tax treatment and form of engagement; and with them the engagement code, the offer
 *    market, the quote date, the mode and the contingency declaration, each of which selects a price or a cost.
 * 3. Both were frozen with the same catalog, resource policy and credit catalog: the same version and the same
 *    content (`QUOTE_INCREMENT_VERSIONS_DIFFER`). A difference across versions would carry a price change into the
 *    cost of the add-on.
 * 4. Their periods can be compared (`QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE`). Either the quote with the add-on
 *    has the periods of the base, and each is compared with its own (`same_periods`); or it is a single
 *    representative period of a longer base (`representative_period`). A representative period stands for every
 *    period of the base, so the base must then be the same in all of them (net, cost and lines) and the period must
 *    charge nothing once (a setup is not a cost of every period). In both quotes the periods add up to the totals.
 * 5. The quote with the add-on contains the base (`QUOTE_INCREMENT_BASE_NOT_CONTAINED`): every line of the base is
 *    in it under the same id, with the same profile, country, allocation mode and price and cost basis, with every
 *    kit choice the base made, and in every period the base has it with at least the same people and dedication;
 *    every third-party cost of the base is in it unchanged, in at least the same periods; and every tool the base
 *    charges to a line is still charged to that line. What the agreement says of the price (discounts, agreed nets)
 *    is not compared: it is where the price of the add-on is written.
 * 6. The net grows in every compared period (`QUOTE_INCREMENT_NET_NOT_POSITIVE`). A period in which the quote with
 *    the add-on is not worth more than the base has no add-on to price.
 *
 * Nothing is asked of the cost: an add-on can be delivered without adding any, and the reading says what it found.
 *
 * `periods` holds one entry per compared period and `totals` their sum. In `representative_period` there is one
 * compared period: the increment is per period of the base and is multiplied by nothing, because no input says in
 * how many periods the add-on runs. `changed` says what the add-on is made of: lines that are new or whose people
 * or dedication grew, tools whose cost moved, and third-party costs it adds.
 *
 * `costByComponentKind` reads the frozen cost of the components by the kind the kernel gave each, converted at the
 * output FX of each component and rounded one by one: an entry may miss by a unit, and `cost` is the figure that
 * adds up. It is there to show where the cost of the add-on sits and that a cost charged once per line did not move.
 */
export function readQuoteIncrement(base: QuoteIncrementSource, withAddOn: QuoteIncrementSource) {
  const before = read(base)
  const after = read(withAddOn)

  // Rule 1. A blocked quote has rows without amounts, or no rows at all.
  if (!before || !after)
    return rejected('QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES', [
      ...(before ? [] : [{ path: 'base', rule: 'not_calculated' }]),
      ...(after ? [] : [{ path: 'withAddOn', rule: 'not_calculated' }])
    ])

  const baseDemand = base.semantic.demand
  const addOnDemand = withAddOn.semantic.demand

  // Rule 2.
  const context: QuoteIncrementIssue[] = [
    ...CONTEXT.flatMap(([field, rule]) =>
      sameContent(baseDemand.brief[field], addOnDemand.brief[field]) ? [] : [{ path: `brief.${field}`, rule }]
    ),
    ...(base.semantic.result.commercialUnit === withAddOn.semantic.result.commercialUnit
      ? []
      : [{ path: 'commercialUnit', rule: 'commercial_unit_differs' }]),
    // The currency the kernel answered in, besides the one the brief asked for.
    ...(before.totals.currency === after.totals.currency
      ? []
      : [{ path: 'totals.currency', rule: 'currency_differs' }])
  ]

  if (context.length) return rejected('QUOTE_INCREMENT_CONTEXT_DIFFERS', context)

  // Rule 3. The version names the source and the content is the source: a file edited under the same version is
  // another source.
  const versions = VERSIONED.flatMap(role =>
    base.semantic[role].version !== withAddOn.semantic[role].version
      ? [{ path: role, rule: 'version_differs' }]
      : sameContent(base.semantic[role], withAddOn.semantic[role])
        ? []
        : [{ path: role, rule: 'content_differs' }]
  )

  if (versions.length) return rejected('QUOTE_INCREMENT_VERSIONS_DIFFER', versions)

  // Rule 4.
  const representative = after.periods.length === 1 && before.periods.length > 1

  const samePeriods =
    before.periods.length === after.periods.length &&
    before.periods.every((period, index) => period.periodId === after.periods[index].periodId)

  if (!representative && !samePeriods)
    return rejected('QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE', [{ path: 'periods', rule: 'periods_differ' }])

  const comparability: QuoteIncrementIssue[] = []

  for (const [path, quote] of [
    ['base', before],
    ['withAddOn', after]
  ] as const)
    if (!equalAmounts(quote.periods.map(period => period.amounts).reduce(plus, NOTHING()), quote.amounts))
      comparability.push({ path, rule: 'periods_differ_from_totals' })

  if (representative) {
    const [first, ...rest] = before.periods
    const [only] = after.periods

    for (const period of rest) {
      const path = `base.periods.${period.periodId}`

      if (!period.amounts.net.eq(first.amounts.net)) comparability.push({ path, rule: 'net_differs_between_periods' })
      if (!period.amounts.cost.eq(first.amounts.cost))
        comparability.push({ path, rule: 'cost_differs_between_periods' })
      if (!sameLines(period, first)) comparability.push({ path, rule: 'lines_differ_between_periods' })
    }

    if (!only.oneOff.net.isZero() || !only.oneOff.cost.isZero())
      comparability.push({ path: `withAddOn.periods.${only.periodId}`, rule: 'one_off_in_representative_period' })
  }

  if (comparability.length) return rejected('QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE', comparability)

  // Each compared period of the quote with the add-on, and the periods of the base it stands for.
  const compared = after.periods.map(period => ({
    after: period,
    befores: representative ? before.periods : [before.periods.find(other => other.periodId === period.periodId)!]
  }))

  /** Period of the quote with the add-on that a period of the base is compared with. */
  const comparedWith = (periodId: number) => (representative ? after.periods[0].periodId : periodId)

  // Rule 5.
  const containment: QuoteIncrementIssue[] = []

  baseDemand.brief.lines.forEach((line, index) => {
    const path = `base.lines.${index}`
    const other = addOnDemand.brief.lines.find(candidate => candidate.lineId === line.lineId)

    if (!other) {
      containment.push({ path, rule: 'line_missing' })

      return
    }

    containment.push(
      ...unique(LINE_IDENTITY.flatMap(([field, rule]) => (sameContent(line[field], other[field]) ? [] : [rule]))).map(
        rule => ({ path, rule })
      )
    )

    if (line.choices.some(choice => !other.choices.some(candidate => sameContent(choice, candidate))))
      containment.push({ path, rule: 'choice_missing' })

    for (const { after: period, befores } of compared)
      for (const basePeriod of befores) {
        const had = basePeriod.lines.get(line.lineId)
        const has = period.lines.get(line.lineId)
        const at = `${path}.periods.${basePeriod.periodId}`

        if (!had) continue

        if (!has) containment.push({ path: at, rule: 'line_not_active' })
        else if (has.unit !== had.unit) containment.push({ path: at, rule: 'dedication_unit_differs' })
        else {
          if (has.headcount < had.headcount) containment.push({ path: at, rule: 'headcount_smaller' })
          if (has.value.lt(had.value)) containment.push({ path: at, rule: 'dedication_smaller' })
        }
      }
  })

  const baseCosts = baseDemand.brief.thirdPartyCosts ?? []
  const addOnCosts = addOnDemand.brief.thirdPartyCosts ?? []

  baseCosts.forEach((cost, index) => {
    const path = `base.thirdPartyCosts.${index}`
    const other = addOnCosts.find(candidate => candidate.costId === cost.costId)

    if (!other) containment.push({ path, rule: 'cost_missing' })
    else if (!sameContent({ ...cost, periodIds: [] }, { ...other, periodIds: [] }))
      containment.push({ path, rule: 'cost_differs' })
    else if (cost.periodIds.some(periodId => !other.periodIds.includes(comparedWith(periodId))))
      containment.push({ path, rule: 'period_missing' })
  })

  base.semantic.result.attributions.forEach((attribution, index) => {
    const period = after.periods.find(candidate => candidate.periodId === comparedWith(attribution.periodId))
    const charged = period?.toolLines.get(attribution.toolId)

    // A line that is gone from the period was named above, once: its tools are not named again one by one.
    if (attribution.assignments.some(({ lineId }) => period?.lines.has(lineId) && !charged?.has(lineId)))
      containment.push({ path: `base.attributions.${index}`, rule: 'tool_missing' })
  })

  if (containment.length) return rejected('QUOTE_INCREMENT_BASE_NOT_CONTAINED', containment)

  // Rule 6. In a representative period every period of the base has the same net, so one comparison says it all.
  const increments = compared.map(({ after: period, befores }) => ({
    period,
    befores,
    increment: minus(period.amounts, befores[0].amounts)
  }))

  const notPositive = increments.flatMap(({ period, increment }) =>
    increment.net.gt(0) ? [] : [{ path: `periods.${period.periodId}`, rule: 'net_increment_not_positive' }]
  )

  if (notPositive.length) return rejected('QUOTE_INCREMENT_NET_NOT_POSITIVE', notPositive)

  // ---- the reading ----

  const scale = scaleOf(after.totals.net)
  const money = (value: Decimal) => value.toFixed(scale, Wide.ROUND_HALF_UP)

  const present = (amounts: Amounts) => ({
    net: money(amounts.net),
    cost: money(amounts.cost),
    marginAmount: money(amounts.margin),
    marginRateRoundedDown: amounts.net.gt(0) ? ratioForReading(amounts.margin.div(amounts.net)) : null
  })

  const totals = {
    base: increments.map(({ befores }) => befores[0].amounts).reduce(plus, NOTHING()),
    withAddOn: increments.map(({ period }) => period.amounts).reduce(plus, NOTHING()),
    increment: increments.map(({ increment }) => increment).reduce(plus, NOTHING())
  }

  // Kinds in the order the quote with the add-on first holds them, then the ones only the base holds.
  const kinds = unique(
    [...increments.map(({ period }) => period), ...increments.map(({ befores }) => befores[0])].flatMap(period => [
      ...period.costByKind.keys()
    ])
  )

  const kindCost = (periods: PeriodView[], kind: string) =>
    periods.reduce((sum, period) => sum.plus(period.costByKind.get(kind) ?? 0), new Wide(0))

  const costByComponentKind = kinds.map(kind => {
    const had = kindCost(
      increments.map(({ befores }) => befores[0]),
      kind
    )

    const has = kindCost(
      increments.map(({ period }) => period),
      kind
    )

    return { kind, base: money(had), withAddOn: money(has), increment: money(has.minus(had)) }
  })

  // What the add-on is made of.
  const baseLineIds = new Set(baseDemand.brief.lines.map(line => line.lineId))

  const dedicated = (line: ActiveLine | undefined) =>
    line ? { headcount: line.headcount, dedication: { unit: line.unit, value: line.value.toString() } } : null

  const capacity = (line: ActiveLine | undefined) => (line ? line.value.mul(line.headcount) : new Wide(0))

  const changedLines = addOnDemand.brief.lines.flatMap(line => {
    const grown = increments.flatMap(({ period, befores }) => {
      const had = befores[0].lines.get(line.lineId)
      const has = period.lines.get(line.lineId)

      // Containment left one way to differ: more people, more dedication, or a period the base did not have it in.
      if (!has || (had && has.headcount === had.headcount && has.value.eq(had.value))) return []

      return [
        {
          periodId: period.periodId,
          value: {
            base: dedicated(had),
            withAddOn: dedicated(has)!,
            // People x dedication, in the unit of the line: what the add-on adds to it in the period.
            capacityIncrement: capacity(has).minus(capacity(had)).toString()
          }
        }
      ]
    })

    return grown.length
      ? [
          {
            lineId: line.lineId,
            profile: line.profile,
            change: baseLineIds.has(line.lineId) ? ('dedication_grew' as const) : ('added' as const),
            periods: byPeriods(grown)
          }
        ]
      : []
  })

  const toolIds = unique(
    increments.flatMap(({ period, befores }) => [...period.costByTool.keys(), ...befores[0].costByTool.keys()])
  )

  const changedTools = toolIds.flatMap(toolId => {
    const moved = increments.flatMap(({ period, befores }) => {
      const had = befores[0].costByTool.get(toolId)
      const has = period.costByTool.get(toolId)
      const difference = (has?.cost ?? new Wide(0)).minus(had?.cost ?? 0)

      return difference.isZero()
        ? []
        : [
            {
              periodId: period.periodId,
              value: {
                // Null: the base does not charge this tool in the period.
                base: had ? money(had.cost) : null,
                withAddOn: has ? money(has.cost) : null,
                increment: money(difference)
              }
            }
          ]
    })

    const label = increments
      .flatMap(({ period, befores }) => [period.costByTool.get(toolId), befores[0].costByTool.get(toolId)])
      .find(tool => tool !== undefined)!.label

    return moved.length ? [{ toolId, label, periods: byPeriods(moved) }] : []
  })

  const comparedIds = new Set(after.periods.map(period => period.periodId))

  const changedCosts = addOnCosts.flatMap(cost => {
    const known = baseCosts.find(candidate => candidate.costId === cost.costId)
    const covered = new Set((known?.periodIds ?? []).map(comparedWith))
    const periodIds = cost.periodIds.filter(periodId => comparedIds.has(periodId) && !covered.has(periodId))

    return periodIds.length
      ? [
          {
            costId: cost.costId,
            settlement: cost.settlement,
            change: known ? ('periods_added' as const) : ('added' as const),
            periodIds
          }
        ]
      : []
  })

  const netIncrements = increments.map(({ increment }) => increment.net)

  return {
    ok: true as const,
    reading: {
      schemaVersion: QUOTE_INCREMENT_VERSION,
      binding: false as const,
      // Cost and margin: never a client-facing figure.
      audience: 'internal' as const,
      base: { calculationId: base.calculationId, replayDigest: base.replayDigest },
      withAddOn: { calculationId: withAddOn.calculationId, replayDigest: withAddOn.replayDigest },
      commercialUnit: withAddOn.semantic.result.commercialUnit,
      currency: after.totals.currency,
      statement:
        'Internal reading: it holds cost and margin and is never shown to a client. The price, cost and margin of an add-on, read as the difference between two frozen quotes: the base, and the base with the add-on in it. Each figure is a frozen amount of one quote minus the same frozen amount of the other; nothing is recalculated. It is not a new price and it approves nothing.',
      basis: [
        'increment = withAddOn - base, for net, cost and marginAmount, in each compared period and over them. The quote with the add-on holds each person as one line with the summed dedication, so a cost charged once per line (the platform fee, a part of the base tools) is in it once and is not part of the increment.',
        representative
          ? 'representative_period: the quote with the add-on is one period that stands for every period of the base, which is the same in all of them (net, cost and lines). The increment is per period of the base; it is multiplied by no number of periods, because no input says in how many the add-on runs.'
          : 'same_periods: the quote with the add-on has the periods of the base and each is compared with its own. totals is the difference between the totals of the two quotes.',
        'comparable: both calculated; same currency, offer, commercial unit, account, tax treatment, form and code of engagement, market, quote date, mode and contingency declaration; same catalog, resource policy and credit catalog, by version and by content; the base contained in the quote with the add-on (its lines with their identity and at least their people and dedication, its third-party costs, its tools on their lines); a net that grows in every compared period.',
        'costByComponentKind: frozen cost of the components by the kind the kernel gave each, at the output FX of each, rounded one by one for reading. An entry may miss by a unit; cost is the figure that adds up.',
        'changed.tools: frozen cost of the components of each composed tool, read the same way, in the periods in which it moved.'
      ],
      // The same in both quotes, or the reading would have been rejected.
      versions: {
        catalog: withAddOn.semantic.catalog.version,
        policy: withAddOn.semantic.policy.version,
        credits: withAddOn.semantic.credits.version
      },
      comparison: {
        mode: representative ? ('representative_period' as const) : ('same_periods' as const),
        basePeriods: before.periods.length,
        withAddOnPeriods: after.periods.length,
        comparedPeriods: increments.length
      },
      periods: increments.map(({ period, befores, increment }) => ({
        periodId: period.periodId,
        // Periods of the base this one is compared with: its own, or all of them when it represents them.
        basePeriodIds: befores.map(other => other.periodId),
        base: present(befores[0].amounts),
        withAddOn: present(period.amounts),
        increment: present(increment)
      })),
      totals: {
        comparedPeriods: increments.length,
        base: present(totals.base),
        withAddOn: present(totals.withAddOn),
        increment: present(totals.increment),
        costByComponentKind
      },
      // What the add-on adds to the net of a period, when it adds the same to each compared one: the one figure a
      // quote document prints for it. Null when the periods differ.
      netIncrementPerPeriod: netIncrements.every(net => net.eq(netIncrements[0])) ? money(netIncrements[0]) : null,
      changed: { lines: changedLines, tools: changedTools, thirdPartyCosts: changedCosts }
    }
  }
}

export type QuoteIncrementReading = Extract<ReturnType<typeof readQuoteIncrement>, { ok: true }>['reading']
