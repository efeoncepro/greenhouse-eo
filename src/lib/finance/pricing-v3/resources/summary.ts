import Decimal from 'decimal.js'

import type { PricingV3LineV12, PricingV3LineV14 } from '../calculate'
import {
  CONTINGENCY_RESERVE_COMPONENT,
  describeCommercialTerms,
  describeContingencyReserve,
  describeEngagementForm,
  describeMarketFactor,
  describeThirdPartyPolicies
} from '../catalog/explain'
import { PRICING_V3_THIRD_PARTY_BILLING } from '../schemas'
import type { composeResourceQuote } from './composition'

type Composition = ReturnType<typeof composeResourceQuote>

const D = Decimal.clone({ precision: 80 })

export const COMPOSITION_SUMMARY_VERSION = 'pricing-v3-composition-summary/1'

/** Reading precision for ratios. Rounded toward minus infinity so a displayed margin never looks better than stored. */
const RATIO_DISPLAY_DECIMALS = 6

const ratioForReading = (value: Decimal) =>
  value.toDecimalPlaces(RATIO_DISPLAY_DECIMALS, D.ROUND_FLOOR).toFixed(RATIO_DISPLAY_DECIMALS)

const unique = <T>(items: T[]) => [...new Set(items)]

/** Decimals the kernel formatted an amount with: every amount derived from it is shown at the same scale. */
const scaleOf = (amount: string) => amount.split('.')[1]?.length ?? 0

/** Rows of contract 1.2.0 carry the floor of their market; rows of earlier contracts have no such key. */
const hasMarketFloor = (line: object): line is PricingV3LineV12 => 'floorNet' in line

/** A re-invoiced third-party cost in one period (contract 1.4.0): a row of its own, never a component of a team row. */
const isThirdPartyRow = (line: { kind: string }): line is PricingV3LineV14 =>
  line.kind === PRICING_V3_THIRD_PARTY_BILLING

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
  | 'dedication'
  | 'person_cost'
  | 'talent_factor'
  | 'fx'
  | 'tool'
  | 'platform_fee'
  | 'talent_assurance'
  | 'operations'
  | 'setup'
  | 'third_party'

/**
 * Part of one kernel row that rests on something: its raw cost in the output currency, how many components, and how
 * many components of the row rest on an input at all (`of`: every one except the contingency reserve, which is
 * counted inside the components it is computed from).
 */
type RowPart = { row: KernelRow; raw: Decimal; components: number; of: number }

const addPart = (parts: Map<string, RowPart>, key: string, row: KernelRow, cost: Decimal, of: number) => {
  const part = parts.get(key) ?? { row, raw: new D(0), components: 0, of }

  parts.set(key, { row, raw: part.raw.plus(cost), components: part.components + 1, of })
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
    (sum, { row, raw, components, of }) => sum.plus(components === of ? new D(row.cost) : D.min(raw, row.cost)),
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
 *
 * Contract 1.4.0 adds two things, read the same way:
 * - A re-invoiced third-party cost is an input of its own (`third_party`, by `costId`), with the status of the
 *   evidence of its amount. It is the whole of its row. A supplier that charges in the output currency carries no
 *   FX, because the kernel does not convert it; any other currency carries the FX into the calculation currency and
 *   from it to the output currency.
 * - The contingency reserve is NOT an input. It is `rate x base` of its own row, so it moves with the components it
 *   is computed from and with nothing else: the cost that rests on each of them is `cost x (1 + rate)`, and the
 *   reserve is estimated exactly where they are. The rate itself is a rule, reported in `estimatedRules`.
 *
 * The dedication of a line is an input too (`dedication`, by `lineId`), read from the brief the quote froze. It
 * governs what the line is charged by its capacity: its person cost, and every resource of its kit that is shared by
 * the capacity of the line (`shareMode: fte`). With evidence (`dedicationEvidence`) it is an input with the status of
 * that evidence, estimated or confirmed like any other. Without it, the cost it governs is nobody's to call
 * confirmed: it is reported apart, under `dedicationNotEvidenced`, and is in neither `estimatedCost` nor
 * `confirmedCost` unless another estimated input already put it in the first. `capacitySetByRule` marks the
 * dedication of a line whose capacity the allocation rule set (a dedicated line, a minimum billed FTE): its cost is
 * the same cost, but it does not move in proportion to the dedication, which is why it is said.
 */
export function costInputExposure(result: Composition) {
  const { quote } = result

  if (!quote.totals) return null

  const totals = quote.totals
  const scale = scaleOf(totals.cost)
  const money = (value: Decimal) => value.toFixed(scale, D.ROUND_HALF_UP)
  const bindings = quote.resolution.bindings

  type Meta = {
    kind: CostInputKind
    id: string
    recordId: string | null
    priceId?: string
    /** Third-party costs only: the category whose rule prices the cost. */
    category?: string
    label: string
    billing?: 'month' | 'year' | 'once' | 'credit_packs'
    /**
     * Dedication only, and only when true: the allocation rule, not the dedication, set the capacity charged on the
     * line in some period (a dedicated line, a minimum billed FTE). The cost is still what the line is charged by its
     * capacity, but it does not follow a change of the dedication in proportion.
     */
    capacitySetByRule?: true
    sourceStatus: SourceStatus
  }

  const inputs = new Map<string, { meta: Meta; lineIds: string[]; periodIds: number[]; parts: Map<string, RowPart> }>()
  const estimated = new Map<string, RowPart>()
  // Everything that cannot be called confirmed: what is estimated, and what a dedication without evidence governs.
  const unconfirmed = new Map<string, RowPart>()
  const dedicationNotEvidencedOn: string[] = []
  const declaredLines = quote.resolution.brief?.lines ?? []

  type Rule = {
    kind:
      | 'allocation_policy'
      | 'pricing_policy'
      | 'price_rounding'
      | 'tax'
      | 'third_party_policy'
      | 'contingency_reserve'
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

    // Contract 1.4.0, read from the frozen input of the period: the third-party costs the kernel priced with the
    // rule of each category, and the reserve of the quote. Absent in every earlier contract.
    const thirdPartyCosts = ('thirdPartyCosts' in request ? request.thirdPartyCosts : undefined) ?? []
    const thirdPartyPolicies = ('thirdPartyPolicies' in snapshot ? snapshot.thirdPartyPolicies : undefined) ?? []

    const reserveId =
      'contingencyReserve' in snapshot && snapshot.contingencyReserve?.source.status === 'estimated'
        ? (bindings.find(b => b.purpose === 'contingency_reserve')?.record.recordId ?? CONTINGENCY_RESERVE_COMPONENT)
        : null

    // An estimated reserve is a rule of the quote also when the brief waives it: the record was selected all the same.
    if (reserveId) rule('contingency_reserve', 'cost', reserveId)

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

    // Lines of the period whose capacity charged is the one the allocation rule sets, whatever dedication they ask
    // for: a dedicated line, or one the kernel billed at another capacity than the one requested.
    const capacitySetByRule = new Set(
      period.result.lines.flatMap(row => {
        const line = request.lines.find(l => l.lineId === row.parentLineId)
        const human = row.components.find(c => c.kind === 'human')

        return line &&
          human &&
          (line.allocationMode === 'dedicated' || human.trace.billedFte !== human.trace.requestedFte)
          ? [line.lineId]
          : []
      })
    )

    for (const row of period.result.lines) {
      const line = request.lines.find(l => l.lineId === row.parentLineId)
      const profile = line && snapshot.profiles.find(p => p.profileId === line.profileId)
      const rowKey = `${period.periodId}\n${row.lineId}`

      // The reserve of the row, as the kernel traced it: its rate, and whether it rests on the person cost alone
      // (`human`) or on every cost of the row (`own_costs`). It is folded into those components below and is never
      // walked as a component of its own, so `own` is what the row rests on.
      const reserve = row.components.find(c => c.kind === CONTINGENCY_RESERVE_COMPONENT)
      const own = row.components.filter(c => c !== reserve)

      if (reserve && reserveId) rule('contingency_reserve', 'cost', reserveId, row.parentLineId)

      // Declared on the line of the brief; undefined for a third-party row, which is no line, and for a line whose
      // dedication nobody evidenced.
      const dedicationEvidence = declaredLines.find(l => l.lineId === row.parentLineId)?.dedicationEvidence

      for (const component of own) {
        const outputFx = new D(component.trace.outputFx ?? 1)

        const ownCost = new D(component.cost).mul(outputFx)

        // Cost that moves with this component: its own and the reserve the row computes from it.
        const cost =
          reserve && (component.kind === 'human' || reserve.trace.base === 'own_costs')
            ? ownCost.mul(new D(1).plus(reserve.trace.rate))
            : ownCost

        const carried: { key: string; meta: Meta }[] = []
        // Charged by the capacity of the line, so it moves with its dedication. Set below, where each kind is read.
        let byCapacity = false

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
          byCapacity = true

          const allocation = snapshot.allocationPolicies.find(a => a.policyId === line.allocationPolicyRef)

          if (allocation?.source.status === 'estimated') {
            const entry = rule('allocation_policy', 'cost', allocation.policyId, line.lineId)

            // The person cost itself, without the reserve that rests on it.
            entry.human = entry.human.plus(ownCost)
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
        } else if (component.kind === PRICING_V3_THIRD_PARTY_BILLING) {
          const declared = thirdPartyCosts.find(c => c.costId === row.parentLineId)

          if (!declared) {
            unmappedComponents += 1
            continue
          }

          carried.push({
            key: `third_party\n${declared.costId}`,
            meta: {
              kind: 'third_party',
              id: declared.costId,
              recordId: null,
              category: declared.category,
              label: declared.label,
              // The status of the evidence of the amount, as the kernel judged it.
              sourceStatus: declared.source.status
            }
          })

          const policy = thirdPartyPolicies.find(p => p.category === declared.category)

          if (policy?.source.status === 'estimated')
            rule(
              'third_party_policy',
              'price',
              bindings.find(b => b.lineId === declared.costId && b.purpose === 'third_party_policy')?.record.recordId ??
                declared.category,
              declared.costId
            )

          // The kernel converts only a supplier that does not charge in the output currency, and then through the
          // calculation currency. The component is stored in the output currency either way.
          if (declared.currency !== request.outputCurrency) {
            carriesFx(declared.currency, calculation)
            carriesFx(calculation, request.outputCurrency)
          }
        } else {
          const assignment = line?.assignments.find(a => a.allocationId === component.componentId)
          const resource = assignment && snapshot.resources.find(r => r.resourceId === assignment.resourceId)

          if (!line || !resource) {
            unmappedComponents += 1
            continue
          }

          // A tool the composition priced from the resource policy reaches the kernel as `composed:<toolId>`, or as
          // `composed:<toolId>:<priceId>` when the demand holds it under several prices: each holding is then an
          // input of its own, with its price and how it is billed.
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

          // A resource of the kit of the line whose requirement shares it by the capacity of the line. A tool the
          // composition attributed is shared by seats and use, never by capacity.
          const kit = bindings.find(b => b.lineId === line.lineId && b.purpose === 'kit')?.record

          const requirementId = attribution
            ? undefined
            : bindings.find(
                b =>
                  b.lineId === line.lineId &&
                  b.record.kind === 'resource' &&
                  b.record.value.resourceId === resource.resourceId
              )?.purpose

          byCapacity =
            kit?.kind === 'kit' &&
            kit.value.requirements.some(r => r.requirementId === requirementId && r.shareMode === 'fte')
        }

        // Every component the kernel priced in the calculation currency; a third-party one said above what it carries.
        if (component.kind !== PRICING_V3_THIRD_PARTY_BILLING) carriesFx(calculation, request.outputCurrency)

        if (byCapacity && line && dedicationEvidence)
          carried.push({
            key: `dedication\n${line.lineId}`,
            meta: {
              kind: 'dedication',
              id: line.lineId,
              recordId: null,
              label: profile?.label ?? line.lineId,
              ...(capacitySetByRule.has(line.lineId) ? { capacitySetByRule: true } : {}),
              sourceStatus: dedicationEvidence.status
            }
          })

        for (const { key, meta } of carried) {
          const entry = inputs.get(key) ?? { meta, lineIds: [], periodIds: [], parts: new Map<string, RowPart>() }

          // An input is one entry over the whole term: what a later period says of its capacity is said of it once.
          if (meta.capacitySetByRule) entry.meta = meta
          inputs.set(key, entry)
          note(entry.lineIds, row.parentLineId)
          note(entry.periodIds, period.periodId)
          addPart(entry.parts, rowKey, row, cost, own.length)
        }

        // Union: a component counts once however many of its inputs are estimated.
        const isEstimated = carried.some(c => c.meta.sourceStatus === 'estimated')
        const notEvidenced = byCapacity && !dedicationEvidence

        if (isEstimated) addPart(estimated, rowKey, row, cost, own.length)
        // The wider union, counted the same way, so a row is never counted beyond its cost between the two.
        if (isEstimated || notEvidenced) addPart(unconfirmed, rowKey, row, cost, own.length)
        if (notEvidenced) note(dedicationNotEvidencedOn, row.parentLineId)
      }
    }
  }

  const net = new D(totals.net)
  const totalCost = new D(totals.cost)

  const share = (amount: string) =>
    totalCost.gt(0) ? new D(amount).div(totalCost).toFixed(RATIO_DISPLAY_DECIMALS) : null

  const estimatedCost = money(partsCost(estimated))
  const unconfirmedCost = money(partsCost(unconfirmed))
  // The wider union contains the estimated one row by row, so this is never negative.
  const dedicationNotEvidencedCost = money(new D(unconfirmedCost).minus(estimatedCost))

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
    // By construction: estimatedCost + dedicationNotEvidenced.cost + confirmedCost = totalCost.
    confirmedCost: money(totalCost.minus(unconfirmedCost)),
    estimatedShareOfCost: share(estimatedCost),
    // Lines whose dedication carries no evidence, and the cost it governs that no estimated input already counts.
    dedicationNotEvidenced: {
      lineIds: dedicationNotEvidencedOn,
      cost: dedicationNotEvidencedCost,
      shareOfCost: share(dedicationNotEvidencedCost)
    },
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
 * - `dedicationNotEvidenced`: the lines whose dedication the demand does not evidence, and the cost that dedication
 *   governs (the person, and what the kit shares by capacity) wherever no estimated input already counts it. It is
 *   not an estimate anybody declared and it is never read as confirmed: `confirmedCost` is what is left of the cost
 *   once `estimatedCost` and this are taken out. A line whose dedication is declared as an estimate is an entry of
 *   `costInputs` (`kind: dedication`, `id` its `lineId`) with the cost it governs, like any estimated input; with
 *   `capacitySetByRule` the "10 % higher" reading does not apply to it, for the reason it does not on those lines.
 * - `priceInputs`: an estimated market factor moves price, never cost, and is never ranked with the cost inputs.
 * - `estimatedRules`: estimated policies that are rules, not amounts (capacity billed, target margin, rounding, tax,
 *   the price rule of a category of third-party cost, the contingency reserve). A "10 % higher" reading does not
 *   apply to them and they stay out of the ranking and of the union. `billedFteSetByRuleOn` lists the lines where the
 *   allocation rule, not the dedication asked for, decided the capacity charged (a minimum billed FTE, or hours
 *   converted to FTE): there the person cost does not follow the dedication in proportion.
 * - A re-invoiced third-party cost whose evidence is estimated is a cost input like any other (`kind: third_party`,
 *   `id` its `costId`): the amount of a supplier that has not confirmed it. The contingency reserve is in none of
 *   the lists as an entry: it is inside the `costAtRisk` of the inputs it is computed from, and estimated with them.
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

/** Share of the net of the quote, at reading precision. Null while the quote sells nothing. */
const shareOfNet = (amount: string, net: string) =>
  new D(net).gt(0) ? new D(amount).div(net).toFixed(RATIO_DISPLAY_DECIMALS) : null

/**
 * Own work of a quote of contract 1.4.0: what is left of its totals once the re-invoiced third-party costs are taken
 * out, so `ownWork + thirdParty.reinvoiced = totals` in cost, net and margin, to the unit. Null for a quote of an
 * earlier contract, whose totals do not separate the two, and while the quote has no totals.
 *
 * `marginRateRoundedDown` is the kernel's `totals.ownWorkMarginRate` at reading precision: the margin to hold against
 * the floor of the offer. The margin of the whole quote, in `totals.marginRate`, is the real one and falls with every
 * cost re-invoiced at or near cost; this one does not, because those costs are in neither of its terms.
 */
export function readOwnWork(result: Composition) {
  const totals = result.quote.totals

  if (!totals || totals.thirdPartyCost === undefined || totals.thirdPartyNet === undefined) return null

  const money = (value: Decimal) => value.toFixed(scaleOf(totals.cost), D.ROUND_HALF_UP)
  const cost = new D(totals.cost).minus(totals.thirdPartyCost)
  const net = new D(totals.net).minus(totals.thirdPartyNet)

  return {
    cost: money(cost),
    net: money(net),
    marginAmount: money(net.minus(cost)),
    // Null when the quote sells no own work at a net above zero.
    marginRateRoundedDown: totals.ownWorkMarginRate ? ratioForReading(new D(totals.ownWorkMarginRate)) : null
  }
}

/**
 * Third-party costs of a quote, as its frozen brief declares them and as the kernel priced the re-invoiced ones.
 * Null when the brief declares none.
 *
 * - `reinvoiced`: present when the brief re-invoices a cost (contract 1.4.0); null while the quote has no totals. Its
 *   cost and net are the kernel's `totals.thirdPartyCost` and `totals.thirdPartyNet`, and `rows` are the kernel rows
 *   of kind `third_party`, with the rule resolution bound for each, the evidence of the amount as the kernel judged it
 *   and the price walk the kernel stored. A row is under its floor when `net < floorNet`; the verdict is the
 *   kernel's and is listed in `marginFloor` with every other row.
 * - `clientDirect`: costs the client pays to the supplier. They are a note of the brief: in no row, no total and no
 *   conversion, whatever their currency.
 * - `fxExposed`: re-invoiced costs whose supplier does not charge in the output currency of the quote, so their cost
 *   moves with an exchange rate while the price quoted does not.
 *
 * The supplier and the reference of its quote are internal detail of the brief and are not repeated here: a cost is
 * named by its `costId`, as a catalog value is named by its `recordId`.
 */
export function readThirdPartyCosts(result: Composition) {
  const { quote } = result
  const brief = quote.resolution.brief
  const declared = brief?.thirdPartyCosts ?? []

  if (!brief || !declared.length) return null

  const totals = quote.totals
  const reinvoiced = declared.filter(cost => cost.settlement === 'reinvoiced')
  const policies = describeThirdPartyPolicies(quote.resolution)

  const validity = (source: { status: SourceStatus; effectiveFrom: string; effectiveUntil: string }) => ({
    status: source.status,
    effectiveFrom: source.effectiveFrom,
    effectiveUntil: source.effectiveUntil
  })

  const rows = quote.periods.flatMap(period => {
    const request = quote.resolution.inputs.find(i => i.periodId === period.periodId)?.input.request
    const priced = (request && 'thirdPartyCosts' in request ? request.thirdPartyCosts : undefined) ?? []

    return period.result.lines.flatMap(line => {
      const component = line.components.find(c => c.kind === PRICING_V3_THIRD_PARTY_BILLING)

      if (!isThirdPartyRow(line) || !component) return []

      const evidence = priced.find(cost => cost.costId === line.parentLineId)?.source
      const policy = policies.find(p => p.costIds.includes(line.parentLineId))

      return [
        {
          periodId: period.periodId,
          row: {
            costId: line.parentLineId,
            label: line.label,
            category: component.trace.category,
            quantity: component.trace.quantity,
            supplierAmount: component.trace.supplierAmount,
            supplierCurrency: component.trace.supplierCurrency,
            // Only for a supplier that does not charge in the output currency: the path and the rate it was priced at.
            ...(component.trace.supplierCurrency !== component.trace.denominatedIn
              ? { fxPath: component.trace.fxPath, fxRate: component.trace.fxRate }
              : {}),
            evidence: evidence ? validity(evidence) : null,
            policy: policy
              ? {
                  method: policy.method,
                  rate: policy.rate,
                  rounding: policy.rounding,
                  recordId: policy.recordId,
                  revision: policy.revision,
                  sourceStatus: policy.sourceStatus
                }
              : null,
            cost: line.cost,
            // Already includes `roundingAdjustment`; the price the rule of the category forms is the difference.
            undiscountedPrice: line.undiscountedPrice,
            roundingAdjustment: line.roundingAdjustment,
            discount: line.discount,
            uplift: line.uplift,
            net: line.net,
            marginAmount: line.marginAmount,
            minimumMargin: line.minimumMargin,
            floorNet: line.floorNet
          }
        }
      ]
    })
  })

  return {
    basis:
      'reinvoiced: kernel rows of kind third_party, inside totals. clientDirect: declared in the brief and paid by the client to the supplier, in no total. Supplier and evidence reference stay in the frozen brief, by costId.',
    ...(reinvoiced.length
      ? {
          reinvoiced:
            totals && totals.thirdPartyCost !== undefined && totals.thirdPartyNet !== undefined
              ? {
                  cost: totals.thirdPartyCost,
                  net: totals.thirdPartyNet,
                  marginAmount: new D(totals.thirdPartyNet)
                    .minus(totals.thirdPartyCost)
                    .toFixed(scaleOf(totals.cost), D.ROUND_HALF_UP),
                  shareOfNet: shareOfNet(totals.thirdPartyNet, totals.net),
                  rows: acrossPeriods(rows)
                }
              : null
        }
      : {}),
    clientDirect: declared
      .filter(cost => cost.settlement === 'client_direct')
      .map(cost => ({
        costId: cost.costId,
        label: cost.label,
        category: cost.category,
        amount: cost.amount,
        currency: cost.currency,
        quantity: cost.quantity,
        periodIds: cost.periodIds,
        evidence: cost.evidence ? validity(cost.evidence) : null
      })),
    fxExposed: reinvoiced.filter(cost => cost.currency !== brief.outputCurrency).map(cost => cost.costId)
  }
}

/**
 * Contingency reserve of a quote: the record resolution selected, and what it amounts to in the kernel's totals.
 * Null when no reserve applies to the quote. This is what reads "reserve: `amount` (`rate` of `base` cost
 * `baseAmount`)": `amount` is `totals.contingencyReserve`, inside `totals.cost`, and `baseAmount` is the cost it rests
 * on, which never includes a third-party cost. Both are sums of rows presented at the currency unit, so
 * `rate x baseAmount` matches `amount` to within one unit per team row.
 *
 * A waived reserve is reported too: `waived` with the reason of the brief, `amount` and `baseAmount` at zero, and in
 * `waivedAmount` the reserve the quote would have carried. Amounts are null while the quote has no totals.
 */
export function readContingencyReserve(result: Composition) {
  const { quote } = result
  const reserve = describeContingencyReserve(quote.resolution)

  if (!reserve) return null

  const totals = quote.totals
  const amount = totals?.contingencyReserve ?? null

  return {
    rate: reserve.rate,
    base: reserve.base,
    amount,
    baseAmount: totals?.contingencyBase ?? null,
    shareOfNet: totals && amount !== null ? shareOfNet(amount, totals.net) : null,
    waived: reserve.waived,
    ...(reserve.waived
      ? { waiverReason: reserve.waiverReason, waivedAmount: totals?.contingencyReserveWaived ?? null }
      : {}),
    recordId: reserve.recordId,
    revision: reserve.revision,
    scope: reserve.scope,
    sourceStatus: reserve.sourceStatus
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
  const ownWork = readOwnWork(result)
  const thirdParty = readThirdPartyCosts(result)
  const contingencyReserve = readContingencyReserve(result)

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
    // demand declares the form of the engagement; 1.4.0 only when the demand re-invoices a third-party cost or a
    // contingency reserve applies to the quote, also when the demand waives it.
    engineVersion: quote.periods[0]?.result.engineVersion ?? null,
    // 1.1.0 totals add `roundingAdjustment` (already inside `undiscountedPrice`) and `uplift`; 1.2.0 totals add
    // `marketAdjustment` (price with the market factor minus price of the base market, also inside it); 1.3.0 totals
    // add `engagementAdjustment` (price with the ratio of the form minus the same price at ratio 1, also inside it);
    // 1.4.0 totals add the reserve inside `cost` (`contingencyReserve`, the cost it rests on and what a waiver left
    // out) and what of `cost` and `net` is re-invoiced third-party cost, with the margin of the rest.
    totals: quote.totals,
    // Adjustments as the frozen demand declares them and the rounding rule in force for the output currency.
    ...describeCommercialTerms(quote.resolution),
    // Present only for a market factor that changes something (not 1, or with a declared floor basis).
    ...(marketFactor ? { marketFactor } : {}),
    // Present only when the demand declares the form of the engagement, also with a ratio of 1: form, ratio and the
    // record that states it. What it moved is `totals.engagementAdjustment`.
    ...(engagementForm ? { engagementForm } : {}),
    // `totals.marginRate` keeps the exact stored ratio; this is the same ratio at reading precision. It is the real
    // margin of the final net in every contract, never a base-market equivalent. In a quote that re-invoices
    // third-party costs it is the blended margin of the whole quote, diluted by them; `ownWork` sits next to it.
    marginRateRoundedDown: quote.totals?.marginRate ? ratioForReading(new D(quote.totals.marginRate)) : null,
    // The three keys below exist only where contract 1.4.0 put something; every other quote keeps the keys it had.
    // Contract 1.4.0 only: the quote without its re-invoiced third-party costs. Its margin is the one to hold
    // against the floor of the offer.
    ...(ownWork ? { ownWork } : {}),
    // Only when the demand declares third-party costs: the re-invoiced ones as the kernel priced them, and the ones
    // the client pays to the supplier, which are in no total.
    ...(thirdParty ? { thirdParty } : {}),
    // Only when a contingency reserve applies to the quote, also when the demand waives it.
    ...(contingencyReserve ? { contingencyReserve } : {}),
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
          lineIds: a.assignments.map(x => x.lineId),
          // The three keys below exist only where the demand declared them; every other row keeps the keys it had.
          // Seats of a named tool in the period, over every holding of it: people who need one (a group that shares
          // a seat counts once), seats paid one by one and, of those, the ones declared idle. A tool held under
          // several prices has one row per holding, each with its own `priceId`, and the same `seats` on all of them.
          ...(a.seats
            ? {
                seats: {
                  needed: a.seats.needed,
                  paid: a.seats.paid,
                  idle: a.seats.idle,
                  ...(a.seats.packageCapacity !== undefined ? { packageCapacity: a.seats.packageCapacity } : {}),
                  sharedSeats: a.seats.shared.map(g => ({ people: g.assigneeIds.length, reason: g.reason }))
                }
              }
            : {}),
          // Seats of this holding nobody uses in the period. Their cost is inside `attributedMonthlyCost`, in the
          // currency of the tool, and is carried by the lines listed in `lineIds`.
          ...(a.idle ? { idle: a.idle } : {}),
          // Nobody uses the tool in the period: `lineIds` are the lines the demand named to bear its idle seats.
          ...(a.bornByLineIds ? { bornByLineIds: a.bornByLineIds } : {})
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
