import Decimal from 'decimal.js'

import type { PricingV3LineV12 } from '../calculate'
import { describeCommercialTerms, describeEngagementForm, describeMarketFactor } from '../catalog/explain'
import type { composeResourceQuote } from './composition'

type Composition = ReturnType<typeof composeResourceQuote>

const D = Decimal.clone({ precision: 80 })

export const COMPOSITION_SUMMARY_VERSION = 'pricing-v3-composition-summary/1'

/** Reading precision for ratios. Rounded toward minus infinity so a displayed margin never looks better than stored. */
const RATIO_DISPLAY_DECIMALS = 6

const ratioForReading = (value: Decimal) =>
  value.toDecimalPlaces(RATIO_DISPLAY_DECIMALS, D.ROUND_FLOOR).toFixed(RATIO_DISPLAY_DECIMALS)

const unique = <T>(items: T[]) => [...new Set(items)]

/** Rows of contract 1.2.0 carry the floor of their market; rows of earlier contracts have no such key. */
const hasMarketFloor = (line: object): line is PricingV3LineV12 => 'floorNet' in line

/** Rows that differ only by period collapse into one entry, in the order the result first produced them. */
const acrossPeriods = <T extends object>(rows: { periodId: number; row: T }[]) => {
  const groups = new Map<string, T & { periodIds: number[] }>()

  for (const { periodId, row } of rows) {
    const key = JSON.stringify(row)
    const group = groups.get(key)

    if (group) group.periodIds.push(periodId)
    else groups.set(key, { ...row, periodIds: [periodId] })
  }

  return [...groups.values()]
}

/**
 * Lines the kernel reported under the margin floor of their pricing policy. The verdict is `MARGIN_BELOW_FLOOR` from
 * calculate.ts and nothing else: this only attaches the stored amounts of the flagged line so a reader can size it.
 *
 * `net`, `marginAmount` and `marginRateRoundedDown` are always the real ones, on the final net. A contract 1.2.0 row
 * also carries the kernel's `floorNet` (the smallest net that meets the floor in that market) and the gap is read
 * from it; it is never recomputed here, because under a base-market floor `minimumMargin x net` is not the floor.
 */
export function linesBelowPolicyFloor(result: Composition) {
  return result.quote.periods.flatMap(period =>
    period.result.diagnostics
      .filter(d => d.code === 'MARGIN_BELOW_FLOOR')
      .map(d => {
        const line = period.result.lines.find(l => d.fieldPath === `result.lines.${l.lineId}`)
        // A zero net is flagged by the kernel without a ratio, so there is none to show.
        const sized = line && new D(line.net).gt(0) ? line : null
        const floor = line && hasMarketFloor(line) ? line : null
        // The margin missing at the current net is `minimumMargin x net - margin` only while the floor is read on the
        // final net. On a base-market floor that figure would be the base-market margin, which is never shown.
        const onFinalNet = !floor || floor.marketPriceRatio === '1'

        return {
          periodId: period.periodId,
          lineId: line?.lineId ?? d.fieldPath.replace(/^result\.lines\./, ''),
          parentLineId: line?.parentLineId ?? d.lineId ?? null,
          kind: line?.kind ?? null,
          label: line?.label ?? null,
          minimumMargin: line?.minimumMargin ?? null,
          net: line?.net ?? null,
          marginAmount: line?.marginAmount ?? null,
          marginRateRoundedDown: sized ? ratioForReading(new D(sized.marginAmount).div(sized.net)) : null,
          // Margin missing at the current net. Tells a rounding-sized gap apart from a pricing decision.
          marginAmountShortOfFloor:
            sized && onFinalNet ? new D(sized.minimumMargin).mul(sized.net).minus(sized.marginAmount).toString() : null,
          ...(floor
            ? {
                floorNet: floor.floorNet,
                // Net missing to reach the floor of this market, at the scale the kernel formatted both amounts with.
                netShortOfFloor: new D(floor.floorNet)
                  .minus(floor.net)
                  .toFixed(floor.floorNet.split('.')[1]?.length ?? 0)
              }
            : {})
        }
      })
  )
}

type KernelRow = Composition['quote']['periods'][number]['result']['lines'][number]
type SourceStatus = 'confirmed' | 'estimated' | 'pending'

type CostInputKind =
  | 'person_cost'
  | 'talent_factor'
  | 'fx'
  | 'tool'
  | 'platform_fee'
  | 'talent_assurance'
  | 'operations'
  | 'setup'

/** Part of one kernel row that rests on something: its raw cost in the output currency and how many components. */
type RowPart = { row: KernelRow; raw: Decimal; components: number }

const addPart = (parts: Map<string, RowPart>, key: string, row: KernelRow, cost: Decimal) => {
  const part = parts.get(key) ?? { row, raw: new D(0), components: 0 }

  parts.set(key, { row, raw: part.raw.plus(cost), components: part.components + 1 })
}

/**
 * Cost of the selected components, in the output currency, on the same footing as `totals.cost`.
 *
 * The kernel rounds cost once per row, so components do not add up to the total to the last unit. A row that rests
 * entirely on the input counts with its presented cost; a row that rests on it in part counts with the raw cost of
 * those components, never more than the row. Summed over rows it can therefore never exceed `totals.cost`.
 */
const partsCost = (parts: Map<string, RowPart>) =>
  [...parts.values()].reduce(
    (sum, { row, raw, components }) =>
      sum.plus(components === row.components.length ? new D(row.cost) : D.min(raw, row.cost)),
    new D(0)
  )

/**
 * Every input the cost of a calculated quote rests on, with the cost that rests on each, read from the frozen result
 * and nothing else: no price, catalog or policy is consulted and nothing is recalculated.
 *
 * Cost is a sum of components and each component is a product (amount x capacity x talent factor x FX, or
 * amount x quantity x share x FX), so the cost that carries an input is exactly what moves, in proportion, when that
 * input moves: its first-order sensitivity. Which components carry which input is read the way the kernel read it:
 * the human component of a line carries the cost of its profile, the talent factor of its country when the cost is a
 * reference adjusted by country, and the FX of its currency; every other component is one assignment of one resource,
 * with the FX of that resource; and every component carries the FX from the calculation to the output currency.
 */
export function costInputExposure(result: Composition) {
  const { quote } = result

  if (!quote.totals) return null

  const totals = quote.totals
  const scale = totals.cost.split('.')[1]?.length ?? 0
  const money = (value: Decimal) => value.toFixed(scale, D.ROUND_HALF_UP)
  const bindings = quote.resolution.bindings

  type Meta = {
    kind: CostInputKind
    id: string
    recordId: string | null
    priceId?: string
    label: string
    billing?: 'month' | 'year' | 'once' | 'credit_packs'
    sourceStatus: SourceStatus
  }

  const inputs = new Map<string, { meta: Meta; lineIds: string[]; periodIds: number[]; parts: Map<string, RowPart> }>()
  const estimated = new Map<string, RowPart>()

  type Rule = {
    kind: 'allocation_policy' | 'pricing_policy' | 'price_rounding' | 'tax'
    side: 'cost' | 'price' | 'tax'
    ids: string[]
    lineIds: string[]
    periodIds: number[]
    human: Decimal
    billedFteSetByRuleOn: string[]
  }

  const rules = new Map<Rule['kind'], Rule>()

  const market = { lineIds: [] as string[], periodIds: [] as number[], price: new D(0), adjustment: new D(0) }
  const marketMeta: { id: string; recordId: string | null; factor: string; floorBasis: string | null }[] = []
  let marketAdjusted = false
  let unmappedComponents = 0

  const note = <T>(list: T[], value: T) => {
    if (!list.includes(value)) list.push(value)
  }

  for (const period of quote.periods) {
    const input = quote.resolution.inputs.find(i => i.periodId === period.periodId)?.input

    if (!input) continue

    const { request, snapshot } = input
    const calculation = snapshot.calculationCurrency
    const fxSource = (from: string, to: string) => snapshot.fx.find(f => f.from === from && f.to === to)?.source

    const rule = (kind: Rule['kind'], side: Rule['side'], id: string, lineId?: string) => {
      const entry = rules.get(kind) ?? {
        kind,
        side,
        ids: [],
        lineIds: [],
        periodIds: [],
        human: new D(0),
        billedFteSetByRuleOn: []
      }

      rules.set(kind, entry)
      note(entry.ids, id)
      note(entry.periodIds, period.periodId)
      if (lineId) note(entry.lineIds, lineId)

      return entry
    }

    if ('priceRounding' in snapshot && snapshot.priceRounding?.source.status === 'estimated')
      rule(
        'price_rounding',
        'price',
        bindings.find(b => b.purpose === 'price_rounding')?.record.recordId ?? request.outputCurrency
      )
    if (request.taxTreatment.kind === 'exclusive' && request.taxTreatment.source.status === 'estimated')
      rule('tax', 'tax', request.taxTreatment.policyRef)

    const marketFactor = snapshot.marketFactors.find(m => m.country === request.offerMarketCountry)
    const marketEstimated = marketFactor?.source.status === 'estimated'

    if (marketFactor && marketEstimated) {
      marketMeta[0] = {
        id: marketFactor.country,
        recordId: bindings.find(b => b.purpose === 'market_factor')?.record.recordId ?? null,
        factor: marketFactor.factor,
        floorBasis: (marketFactor as { floorBasis?: string }).floorBasis ?? null
      }
      note(market.periodIds, period.periodId)

      if (period.result.totals && 'marketAdjustment' in period.result.totals) {
        marketAdjusted = true
        market.adjustment = market.adjustment.plus(period.result.totals.marketAdjustment)
      }
    }

    for (const row of period.result.lines) {
      const line = request.lines.find(l => l.lineId === row.parentLineId)
      const profile = line && snapshot.profiles.find(p => p.profileId === line.profileId)
      const rowKey = `${period.periodId}\n${row.lineId}`

      for (const component of row.components) {
        const outputFx = new D(component.trace.outputFx ?? 1)
        const cost = new D(component.cost).mul(outputFx)
        const carried: { key: string; meta: Meta }[] = []

        const carriesFx = (from: string, to: string) => {
          const source = fxSource(from, to)

          if (from === to || !source) return

          carried.push({
            key: `fx\n${from}\n${to}`,
            meta: {
              kind: 'fx',
              id: `${from}:${to}`,
              recordId:
                bindings.find(b => b.record.kind === 'fx' && b.record.value.from === from && b.record.value.to === to)
                  ?.record.recordId ?? null,
              label: `FX ${from} to ${to}`,
              sourceStatus: source.status
            }
          })
        }

        if (component.kind === 'human') {
          if (!line || !profile?.cost) {
            unmappedComponents += 1
            continue
          }

          const record = bindings.find(b => b.lineId === line.lineId && b.purpose === 'cost')?.record
          const localization = profile.cost.localization

          carried.push({
            key: `person_cost\n${record?.recordId ?? `${profile.label}\n${profile.seniorityCode}`}`,
            meta: {
              kind: 'person_cost',
              id: record?.recordId ?? profile.label,
              recordId: record?.recordId ?? null,
              label: profile.label,
              // The status the kernel judged: a cost assumed for a country is estimated whatever its record says.
              sourceStatus: profile.cost.source.status
            }
          })

          const talent =
            localization.kind === 'reference_adjusted'
              ? snapshot.talentFactors.find(
                  t => t.country === line.talentCountry && t.referenceCountry === localization.referenceCountry
                )
              : undefined

          if (talent)
            carried.push({
              key: `talent_factor\n${talent.country}\n${talent.referenceCountry}`,
              meta: {
                kind: 'talent_factor',
                id: `${talent.country}:${talent.referenceCountry}`,
                recordId:
                  bindings.find(
                    b =>
                      b.record.kind === 'talent_factor' &&
                      b.record.value.country === talent.country &&
                      b.record.value.referenceCountry === talent.referenceCountry
                  )?.record.recordId ?? null,
                label: `Talent factor ${talent.country} on the ${talent.referenceCountry} reference`,
                sourceStatus: talent.source.status
              }
            })

          carriesFx(profile.cost.currency, calculation)

          const allocation = snapshot.allocationPolicies.find(a => a.policyId === line.allocationPolicyRef)

          if (allocation?.source.status === 'estimated') {
            const entry = rule('allocation_policy', 'cost', allocation.policyId, line.lineId)

            entry.human = entry.human.plus(cost)
            // The rule, not the dedication asked for, decided the capacity charged on this line.
            if (line.dedication.unit !== 'fte' || component.trace.billedFte !== component.trace.requestedFte)
              note(entry.billedFteSetByRuleOn, line.lineId)
          }

          const pricing = snapshot.pricingPolicies.find(
            p =>
              p.profileId === line.profileId &&
              p.offerId === request.offerId &&
              p.engagementCode === request.engagementCode
          )

          if (pricing?.source.status === 'estimated')
            rule(
              'pricing_policy',
              'price',
              bindings.find(b => b.lineId === line.lineId && b.purpose === 'pricing')?.record.recordId ?? profile.label,
              line.lineId
            )

          if (marketEstimated) {
            note(market.lineIds, line.lineId)
            market.price = market.price.plus(new D(component.price).mul(outputFx))
          }
        } else {
          const assignment = line?.assignments.find(a => a.allocationId === component.componentId)
          const resource = assignment && snapshot.resources.find(r => r.resourceId === assignment.resourceId)

          if (!line || !resource) {
            unmappedComponents += 1
            continue
          }

          // A tool the composition priced from the resource policy reaches the kernel as `composed:<toolId>`.
          const attribution = result.attributions.find(
            a => a.periodId === period.periodId && a.resource.resourceId === resource.resourceId
          )

          const budgeted =
            attribution &&
            result.creditBudgets.some(b => b.periodId === period.periodId && b.toolId === attribution.toolId)

          const recordId = attribution
            ? null
            : (bindings.find(b => b.record.kind === 'resource' && b.record.value.resourceId === resource.resourceId)
                ?.record.recordId ?? null)

          carried.push({
            key: `resource\n${resource.resourceId}\n${attribution?.priceId ?? ''}`,
            meta: {
              kind: resource.kind,
              id: attribution?.toolId ?? resource.resourceId,
              recordId,
              ...(attribution ? { priceId: attribution.priceId } : {}),
              label: resource.label,
              billing: budgeted ? 'credit_packs' : resource.unit,
              sourceStatus: resource.source.status
            }
          })
          carriesFx(resource.currency, calculation)
        }

        carriesFx(calculation, request.outputCurrency)

        for (const { key, meta } of carried) {
          const entry = inputs.get(key) ?? { meta, lineIds: [], periodIds: [], parts: new Map<string, RowPart>() }

          inputs.set(key, entry)
          note(entry.lineIds, row.parentLineId)
          note(entry.periodIds, period.periodId)
          addPart(entry.parts, rowKey, row, cost)
        }

        // Union: a component counts once however many of its inputs are estimated.
        if (carried.some(c => c.meta.sourceStatus === 'estimated')) addPart(estimated, rowKey, row, cost)
      }
    }
  }

  const net = new D(totals.net)
  const totalCost = new D(totals.cost)

  const share = (amount: string) =>
    totalCost.gt(0) ? new D(amount).div(totalCost).toFixed(RATIO_DISPLAY_DECIMALS) : null

  const estimatedCost = money(partsCost(estimated))

  const costInputs = [...inputs.values()]
    .map(({ meta, lineIds, periodIds, parts }) => ({ meta, lineIds, periodIds, atRisk: partsCost(parts) }))
    .sort(
      (a, b) => b.atRisk.cmp(a.atRisk) || a.meta.kind.localeCompare(b.meta.kind) || a.meta.id.localeCompare(b.meta.id)
    )
    .map(({ meta: { recordId, ...described }, lineIds, periodIds, atRisk }) => {
      const costAtRisk = money(atRisk)

      return {
        ...described,
        ...(recordId ? { recordId } : {}),
        lineIds,
        periodIds,
        costAtRisk,
        shareOfCost: share(costAtRisk),
        // Margin rate lost if this input turns out 10 % higher and the net stays as quoted:
        // 0.10 x costAtRisk / net. Rounded up, so a loss never reads smaller than it is.
        marginRateLostIfTenPctHigher: net.gt(0)
          ? new D(costAtRisk).mul('0.10').div(net).toFixed(RATIO_DISPLAY_DECIMALS, D.ROUND_CEIL)
          : null
      }
    })

  return {
    currency: totals.currency,
    totalCost: totals.cost,
    net: totals.net,
    estimatedCost,
    // By construction: estimatedCost + confirmedCost = totalCost.
    confirmedCost: money(totalCost.minus(estimatedCost)),
    estimatedShareOfCost: share(estimatedCost),
    costInputs,
    priceInputs: marketMeta.map(meta => ({
      kind: 'market_factor' as const,
      ...meta,
      lineIds: market.lineIds,
      periodIds: market.periodIds,
      // Price of the people it multiplies, before commercial rounding. It moves price and never cost.
      priceOnFactor: money(market.price),
      // What the factor moved against the base market, as the kernel stored it (contract 1.2.0 only).
      marketAdjustment: marketAdjusted ? money(market.adjustment) : null
    })),
    estimatedRules: [...rules.values()].map(({ human, billedFteSetByRuleOn, ...entry }) => ({
      ...entry,
      ...(entry.kind === 'allocation_policy' ? { humanCostGoverned: money(human), billedFteSetByRuleOn } : {})
    })),
    unmappedComponents
  }
}

/**
 * Which estimated inputs matter: the ones the quote actually used, ranked by the cost that rests on each.
 *
 * - `costInputs`: estimated amounts and factors on the cost side, largest first. Each one is proportional: 10 % more
 *   on the input is 10 % of `costAtRisk` more cost. `billing` says how a resource is bought: `year` is an annual seat
 *   (cost is a twelfth a month, cash is paid up front), `once` is charged in one period, `credit_packs` is a pooled
 *   budget of whole packs (proportional to the pack prices, in steps to the credits asked for).
 * - `estimatedCost` / `confirmedCost`: the union. A component counts as estimated when at least one of the amounts or
 *   factors it is the product of is estimated, and it counts once: an estimated person cost and an estimated talent
 *   factor on the same line do not add up twice. That is also why the entries of `costInputs` can add up to more.
 * - `priceInputs`: an estimated market factor moves price, never cost, and is never ranked with the cost inputs.
 * - `estimatedRules`: estimated policies that are rules, not amounts (capacity billed, target margin, rounding, tax).
 *   A "10 % higher" reading does not apply to them and they stay out of the ranking and of the union.
 *   `billedFteSetByRuleOn` lists the lines where the allocation rule, not the dedication asked for, decided the
 *   capacity charged (a minimum billed FTE, or hours converted to FTE): there the person cost does not follow the
 *   dedication in proportion.
 */
export function estimateExposure(result: Composition) {
  const exposure = costInputExposure(result)

  if (!exposure) return null

  const { costInputs, unmappedComponents, ...rest } = exposure

  return {
    basis:
      'Shares of the frozen cost components; nothing is recalculated. marginRateLostIfTenPctHigher = 0.10 x costAtRisk / net.',
    ...rest,
    costInputs: costInputs
      .filter(input => input.sourceStatus === 'estimated')
      .map(({ sourceStatus, ...input }) => {
        void sourceStatus

        return input
      }),
    // Cost components whose inputs could not be read back from the frozen result; they are counted as confirmed.
    ...(unmappedComponents ? { unmappedComponents } : {})
  }
}

/**
 * Compact reading of a composed quote for an agent: counts, groups and de-duplicates the frozen result and formats
 * ratios for reading. It decides nothing; statuses, totals, blockers and floor verdicts are the result's own.
 */
export function summarizeComposition(result: Composition, identity: { calculationId: string; replayDigest?: string }) {
  const { quote } = result
  const periodDiagnostics = quote.periods.flatMap(p => p.result.diagnostics.map(d => ({ periodId: p.periodId, d })))

  const reviewSignals = unique(periodDiagnostics.map(({ d }) => `${d.code}\n${d.severity}`)).map(key => {
    const [code, severity] = key.split('\n')
    const rows = periodDiagnostics.filter(({ d }) => d.code === code && d.severity === severity)

    return {
      code,
      severity,
      count: rows.length,
      periodIds: unique(rows.map(r => r.periodId)),
      lineIds: unique(rows.flatMap(r => (r.d.lineId ? [r.d.lineId] : []))),
      paths: unique(rows.map(r => r.d.fieldPath))
    }
  })

  const floorLines = linesBelowPolicyFloor(result)
  const marketFactor = describeMarketFactor(quote.resolution)
  const engagementForm = describeEngagementForm(quote.resolution)

  const selection = (s: Composition['selections'][number]) => ({
    lineId: s.lineId,
    toolId: s.toolId,
    reasons: s.reasons
  })

  const included = result.selections.filter(s => s.included)

  const excluded = result.selections.filter(
    s => !s.included && s.reasons.some(r => r.startsWith('profile-task-excluded:'))
  )

  const clientProvided = included.filter(s => s.reasons.some(r => r.startsWith('client-provided:')))

  return {
    schemaVersion: COMPOSITION_SUMMARY_VERSION,
    version: result.version,
    binding: false as const,
    commercialUnit: result.commercialUnit,
    calculationId: identity.calculationId,
    ...(identity.replayDigest ? { replayDigest: identity.replayDigest } : {}),
    calculationStatus: quote.calculationStatus,
    reviewStatus: result.reviewStatus,
    quoteReviewStatus: quote.reviewStatus,
    // Contract the kernel calculated with: 1.1.0 only when the demand or the catalog uses agreed nets or rounding;
    // 1.2.0 only when the market factor of the quote declares its floor on the base market; 1.3.0 only when the
    // demand declares the form of the engagement.
    engineVersion: quote.periods[0]?.result.engineVersion ?? null,
    // 1.1.0 totals add `roundingAdjustment` (already inside `undiscountedPrice`) and `uplift`; 1.2.0 totals add
    // `marketAdjustment` (price with the market factor minus price of the base market, also inside it); 1.3.0 totals
    // add `engagementAdjustment` (price with the ratio of the form minus the same price at ratio 1, also inside it).
    totals: quote.totals,
    // Adjustments as the frozen demand declares them and the rounding rule in force for the output currency.
    ...describeCommercialTerms(quote.resolution),
    // Present only for a market factor that changes something (not 1, or with a declared floor basis).
    ...(marketFactor ? { marketFactor } : {}),
    // Present only when the demand declares the form of the engagement, also with a ratio of 1: form, ratio and the
    // record that states it. What it moved is `totals.engagementAdjustment`.
    ...(engagementForm ? { engagementForm } : {}),
    // `totals.marginRate` keeps the exact stored ratio; this is the same ratio at reading precision. It is the real
    // margin of the final net in every contract, never a base-market equivalent.
    marginRateRoundedDown: quote.totals?.marginRate ? ratioForReading(new D(quote.totals.marginRate)) : null,
    // Blockers: complete and in the result's order. A non-empty list is why `totals` is null.
    diagnostics: quote.diagnostics,
    assumptions: quote.resolution.assumptions,
    periods: quote.periods.map(p => ({
      periodId: p.periodId,
      calculationStatus: p.result.calculationStatus,
      totals: p.result.totals
    })),
    // Every kernel diagnostic of every period, one entry per code and severity. Review signals never block totals.
    reviewSignals,
    marginFloor: {
      source: 'kernel:MARGIN_BELOW_FLOOR',
      flaggedLinePeriods: floorLines.length,
      lines: acrossPeriods(floorLines.map(({ periodId, ...row }) => ({ periodId, row })))
    },
    toolSelections: {
      counts: {
        rows: result.selections.length,
        included: included.length,
        clientProvided: clientProvided.length,
        explicitlyExcluded: excluded.length,
        notRequiredForWork: result.selections.length - included.length - excluded.length
      },
      included: acrossPeriods(included.map(s => ({ periodId: s.periodId, row: selection(s) }))),
      // Subset of `included` that the client covers, so it carries no attributed cost.
      clientProvided: acrossPeriods(clientProvided.map(s => ({ periodId: s.periodId, row: selection(s) }))),
      explicitlyExcluded: acrossPeriods(excluded.map(s => ({ periodId: s.periodId, row: selection(s) })))
    },
    attributions: acrossPeriods(
      result.attributions.map(a => ({
        periodId: a.periodId,
        row: {
          toolId: a.toolId,
          priceId: a.priceId,
          currency: a.resource.currency,
          unit: a.resource.unit,
          sourceStatus: a.resource.source.status,
          quantity: a.quantity,
          serviceShare: a.serviceShare,
          fullMonthlyCost: a.fullMonthlyCost,
          attributedMonthlyCost: a.attributedMonthlyCost,
          unallocatedMonthlyCost: a.unallocatedMonthlyCost,
          consumerCount: a.consumerIds.length,
          lineIds: a.assignments.map(x => x.lineId)
        }
      }))
    ),
    creditBudgets: acrossPeriods(
      result.creditBudgets.map(b => ({
        periodId: b.periodId,
        row: {
          toolId: b.toolId,
          calculationStatus: b.result.calculationStatus,
          diagnostics: b.result.diagnostics,
          requestedCredits: b.result.request.requestedCredits,
          currency: b.result.breakdown?.currency ?? null,
          extraCreditsPurchased: b.result.breakdown?.extra.purchasedCredits ?? null,
          totalBudgetCost: b.result.breakdown?.totalBudgetCost ?? null,
          incrementalCash: b.result.breakdown?.incrementalCash ?? null
        }
      }))
    ),
    // Attributed cost is not new cash: these two lists and `cashMeaning` are what separates them.
    resourceIncrementalCash: acrossPeriods(
      result.resourceIncrementalCash.map(({ periodId, ...row }) => ({ periodId, row }))
    ),
    cashLedger: acrossPeriods(quote.cashLedger.map(({ periodId, ...row }) => ({ periodId, row }))),
    cashMeaning: result.cashMeaning,
    // Which of the estimated inputs behind the review signals carry the cost. Null while the quote has no totals.
    estimateExposure: estimateExposure(result),
    fullDetail:
      'Derived from the frozen composition artifact. Every selection row, attribution assignment, kernel line with its cost components, per-period diagnostic and credit plan lives in that file under semantic.result.'
  }
}
