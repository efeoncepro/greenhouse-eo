import Decimal from 'decimal.js'

import type { composeResourceQuote } from './composition'

type Composition = ReturnType<typeof composeResourceQuote>

// Share x net, provider amount x two FX rates and component cost x output FX must be exact for any amount the kernel
// can store, as in price-split.ts. Nothing is divided here except through an integer quotient or for a ratio that is
// only read.
const Wide = Decimal.clone({ precision: 240, rounding: Decimal.ROUND_HALF_UP })

export const PAYMENT_SCHEDULE_VERSION = 'pricing-v3-payment-schedule/1'
export const ENGAGEMENT_CASH_VERSION = 'pricing-v3-engagement-cash/1'

/** Same reading precision and direction as the composition summary: a margin never reads better than stored. */
const RATIO_DISPLAY_DECIMALS = 6

const ratioForReading = (value: Decimal) =>
  value.toDecimalPlaces(RATIO_DISPLAY_DECIMALS, Wide.ROUND_FLOOR).toFixed(RATIO_DISPLAY_DECIMALS)

const ISSUE_LIMIT = 20
const MILESTONE_LIMIT = 60

// A share is written the way the module writes every decimal: a string, never a float. The sign is accepted only so
// that a negative share is reported as what it is instead of as a malformed number.
const SHARE_PATTERN = /^-?(0|[1-9]\d{0,12})(\.\d{1,18})?$/
const MILESTONE_KEYS = ['id', 'label', 'share', 'periodId', 'when']

/** The kernel formatted every amount of a quote at the precision of its output currency; a derived one keeps it. */
const scaleOf = (money: string) => money.split('.')[1]?.length ?? 0

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const oneLine = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\r\n]/.test(value)

/** A milestone as the caller declares it. `share` is a decimal string; the shares of a schedule add up to exactly 1. */
export type PaymentMilestone = {
  id: string
  label: string
  share: string
  /** Period of the quote the milestone falls in. Either this or `when`, or neither. */
  periodId?: number
  /** Free text for a condition or a date the quote does not model ("on acceptance", "30 days after delivery"). */
  when?: string
}

/** Where a rejected input is wrong and which rule it broke; never the content that was sent. */
export type EngagementViewIssue = { path: string; rule: string }

/**
 * Rejections of the two readings. They are returned, not thrown: both readers are pure and this file registers no
 * code of its own. The adapter that wires them maps `code` onto a registered `PricingV3Error`.
 */
export type EngagementViewRejectionCode =
  | 'SCHEDULE_REQUIRES_CALCULATED_QUOTE'
  | 'SCHEDULE_MILESTONES_INVALID'
  | 'ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE'

const rejected = (code: EngagementViewRejectionCode, issues: EngagementViewIssue[] = []) => ({
  ok: false as const,
  code,
  // Bounded however long the rejected list was.
  issues: issues.slice(0, ISSUE_LIMIT)
})

/**
 * Presents the net of a frozen composed quote as a payment calendar: one amount per milestone the caller declares
 * (an advance, a delivery, a closing payment). It is a reading of the frozen result: no price, cost or status
 * changes and nothing is recalculated by the kernel.
 *
 * The amounts add up to `totals.net` to the unit, whatever the shares. Every milestone but the last is its share of
 * the net read at the commercial rounding multiple the quote was frozen with (nearest multiple, half up), or at the
 * currency unit when the quote has no rounding rule; the last one is what is left of the net, so it carries the
 * remainder of every rounding before it and of a net that is not itself a multiple (a discount or an agreed net can
 * leave one). A schedule is rejected when that leaves a milestone without an amount: a share too small for the
 * multiple is something the caller has to change, not something to present as a payment of zero.
 *
 * Tax is carried only when the quote resolved it: then it is spread over the milestones in proportion to their
 * amount, on the running total, so the parts add up to `totals.tax` and none is negative. A quote without resolved
 * tax gets no tax here.
 *
 * It says when an amount is due. It is not an invoice and not an amount collected.
 */
export function presentPaymentSchedule(
  result: Composition,
  identity: { calculationId: string; replayDigest: string },
  milestones: readonly PaymentMilestone[]
) {
  const { quote } = result
  const totals = quote.totals

  // A blocked quote has no net to distribute.
  if (quote.calculationStatus !== 'calculated' || !totals) return rejected('SCHEDULE_REQUIRES_CALCULATED_QUOTE')

  // The list arrives from a file or a tool call: it is checked as data, whatever its declared type.
  const declared: unknown = milestones
  const issues: EngagementViewIssue[] = []

  if (!Array.isArray(declared) || !declared.length)
    return rejected('SCHEDULE_MILESTONES_INVALID', [{ path: 'milestones', rule: 'empty' }])
  if (declared.length > MILESTONE_LIMIT)
    return rejected('SCHEDULE_MILESTONES_INVALID', [{ path: 'milestones', rule: 'too_many' }])

  const periodIds = quote.periods.map(period => period.periodId)
  const seen = new Set<string>()
  const valid: (PaymentMilestone & { ratio: Decimal })[] = []
  let sum: Decimal | null = new Wide(0)

  for (const [index, item] of (declared as unknown[]).entries()) {
    const path = `milestones.${index}`
    const before = issues.length

    if (!isRecord(item)) {
      issues.push({ path, rule: 'not_an_object' })
      sum = null
      continue
    }

    if (Object.keys(item).some(key => !MILESTONE_KEYS.includes(key))) issues.push({ path, rule: 'unknown_field' })

    if (!oneLine(item.id, 80)) issues.push({ path: `${path}.id`, rule: 'invalid_id' })
    else if (seen.has(item.id)) issues.push({ path: `${path}.id`, rule: 'duplicate_id' })
    else seen.add(item.id)

    if (!oneLine(item.label, 200)) issues.push({ path: `${path}.label`, rule: 'invalid_label' })

    const share = typeof item.share === 'string' && SHARE_PATTERN.test(item.share) ? new Wide(item.share) : null

    if (!share) {
      issues.push({ path: `${path}.share`, rule: 'share_not_decimal' })
      sum = null
    } else {
      if (!share.gt(0)) issues.push({ path: `${path}.share`, rule: 'share_not_positive' })
      if (share.gt(1)) issues.push({ path: `${path}.share`, rule: 'share_above_one' })
      sum = sum ? sum.plus(share) : null
    }

    if (item.periodId !== undefined && item.when !== undefined) issues.push({ path, rule: 'period_and_when' })
    if (item.periodId !== undefined && !periodIds.includes(item.periodId as number))
      issues.push({ path: `${path}.periodId`, rule: 'unknown_period' })
    if (item.when !== undefined && !oneLine(item.when, 200)) issues.push({ path: `${path}.when`, rule: 'invalid_when' })

    if (share && issues.length === before)
      valid.push({
        id: item.id as string,
        label: item.label as string,
        share: item.share as string,
        ...(item.periodId !== undefined ? { periodId: item.periodId as number } : {}),
        ...(item.when !== undefined ? { when: item.when as string } : {}),
        ratio: share
      })
  }

  // Exactly 1, with no tolerance: a schedule that distributes 99.9999 % of the net leaves money nobody is asked for.
  if (sum && !sum.eq(1)) issues.push({ path: 'milestones', rule: 'shares_must_sum_to_one' })
  if (issues.length) return rejected('SCHEDULE_MILESTONES_INVALID', issues)

  const scale = scaleOf(totals.net)
  const unit = new Wide(10).pow(-scale)
  const money = (value: Decimal) => value.toFixed(scale, Wide.ROUND_HALF_UP)
  const net = new Wide(totals.net)

  // The rule the kernel rounded this quote with, read from the inputs it was frozen with, as price-split.ts reads
  // it. One catalog resolves every period of a quote, so there is one rule; if the periods ever disagreed there
  // would be no multiple to speak for the whole net and the currency unit is used.
  const frozenMultiples = quote.periods.map(period => {
    const snapshot = quote.resolution.inputs.find(i => i.periodId === period.periodId)?.input.snapshot

    return snapshot && 'priceRounding' in snapshot && snapshot.priceRounding ? snapshot.priceRounding.multiple : null
  })

  const multiple =
    frozenMultiples[0] && frozenMultiples.every(m => m === frozenMultiples[0]) ? new Wide(frozenMultiples[0]) : null

  const step = multiple ?? unit

  // Nearest multiple of `step`, half up, as an integer quotient of exact amounts: never a rounded division.
  const nearest = (value: Decimal) => value.mul(2).plus(step).divToInt(step.mul(2)).mul(step)

  const last = valid.length - 1
  let distributed = new Wide(0)

  const amounts = valid.map((milestone, index) => {
    const amount = index === last ? net.minus(distributed) : nearest(net.mul(milestone.ratio))

    distributed = distributed.plus(amount)

    return amount
  })

  const empty = amounts.flatMap((amount, index) =>
    amount.gt(0) ? [] : [{ path: `milestones.${index}.share`, rule: 'amount_not_representable' }]
  )

  if (empty.length) return rejected('SCHEDULE_MILESTONES_INVALID', empty)

  // Tax on the running total: the share of `totals.tax` due once this milestone is reached, minus what was due before.
  const tax = totals.tax === null ? null : new Wide(totals.tax)
  let reached = new Wide(0)
  let taxed = new Wide(0)

  const taxes = amounts.map(amount => {
    if (!tax) return null

    reached = reached.plus(amount)
    const due = new Wide(money(tax.mul(reached).div(net)))
    const part = due.minus(taxed)

    taxed = due

    return part
  })

  const treatment = quote.resolution.inputs[0]?.input.request.taxTreatment

  return {
    ok: true as const,
    reading: {
      schemaVersion: PAYMENT_SCHEDULE_VERSION,
      binding: false as const,
      calculationId: identity.calculationId,
      replayDigest: identity.replayDigest,
      commercialUnit: result.commercialUnit,
      currency: totals.currency,
      statement:
        'Payment calendar of a frozen quote: the quoted net presented as the amounts due at each milestone. It is not an invoice and not an amount collected, and it is not a new price: the quoted total is unchanged and the milestone amounts add up to it exactly.',
      basis: [
        'amount: share x totals.net, read at the nearest price-rounding multiple of the quote (half up) when the quote froze one and at the currency unit otherwise. The last milestone is totals.net minus every amount before it.',
        'tax and total: present only when the quote resolved tax. Tax is totals.tax spread in proportion to the amounts, on the running total, so it adds up to totals.tax. A quote without resolved tax carries null: no rate is assumed here.',
        'periodId and when are the timing the caller declared. Nothing here checks a due date, an acceptance or a payment.'
      ],
      rounding: {
        // Multiple every milestone but the last is read at; null when the quote has no rounding rule.
        multiple: multiple ? multiple.toString() : null,
        unit: unit.toString(),
        source: multiple ? 'priceRounding rule of the frozen inputs' : 'unit of the output currency'
      },
      // Tax exactly as the frozen request declares it. `not_resolved` means every tax figure below is null.
      taxTreatment:
        treatment?.kind === 'exclusive'
          ? { kind: treatment.kind, rate: treatment.rate, policyRef: treatment.policyRef }
          : { kind: treatment?.kind ?? ('not_resolved' as const) },
      milestones: valid.map(({ ratio, ...milestone }, index) => {
        void ratio

        return {
          ...milestone,
          amount: money(amounts[index]),
          tax: taxes[index] ? money(taxes[index]) : null,
          total: taxes[index] ? money(amounts[index].plus(taxes[index])) : null,
          takesRemainder: index === last
        }
      }),
      remainder: {
        milestoneId: valid[last].id,
        // What the last milestone is above (or, negative, below) its own share of the net, to the last decimal.
        absorbed: amounts[last].minus(net.mul(valid[last].ratio)).toFixed(),
        note: 'The last milestone is what is left of the net after the others: it absorbs their rounding and any part of the net that is not a multiple.'
      },
      totals: {
        // The totals of the quote, as frozen. The milestones above add up to each of them.
        net: totals.net,
        tax: totals.tax,
        grandTotal: totals.grandTotal
      }
    }
  }
}

export type PaymentSchedule = Extract<ReturnType<typeof presentPaymentSchedule>, { ok: true }>['reading']

/** What a cost component is, for the cash reading. Read from the kind the kernel stored, never from a label. */
const COST_NATURES = [
  'people',
  'provisions',
  'platformFee',
  'setup',
  'toolCreditBudgets',
  'toolSeatsAndPackages',
  'unclassified'
] as const

type CostNature = (typeof COST_NATURES)[number]

const natureOf = (kind: string, creditBudget: boolean): CostNature =>
  kind === 'human'
    ? 'people'
    : kind === 'talent_assurance' || kind === 'operations'
      ? 'provisions'
      : kind === 'platform_fee'
        ? 'platformFee'
        : kind === 'setup'
          ? 'setup'
          : kind === 'tool'
            ? creditBudget
              ? 'toolCreditBudgets'
              : 'toolSeatsAndPackages'
            : 'unclassified'

type FxStep = { from: string; to: string; rate: string; sourceStatus: string }

/** One declared purchase of extra credits, as its credit budget froze it and in the quote currency. */
type CreditPurchase = {
  periodId: number
  toolId: string
  currency: string
  incrementalCash: string
  subscriptionAttributedCost: string | null
  subscriptionNewCash: string | null
  fx: FxStep[] | null
  inQuoteCurrency: string | null
}

type PeriodCash = {
  periodId: number
  net: string
  fullCost: string
  marginAtFullCost: string
  marginRateRoundedDown: string | null
  modeledCommitment: { total: string; monthlyAndOnce: string; annualUpFront: string }
  newSupplierCash: string | null
  cashAddedOnContractedCapacity: string | null
}

const emptyNatures = () =>
  Object.fromEntries(COST_NATURES.map(nature => [nature, new Wide(0)])) as Record<CostNature, Decimal>

/**
 * Cash reading of a frozen composed quote, per period and in total: what is quoted, what the job costs at full
 * cost, and how much new cash it makes the company pay to suppliers. It is a reading of the frozen result: no
 * price, cost or status changes and nothing is recalculated by the kernel.
 *
 * Three things are kept apart because the artifact keeps them apart (`cashMeaning`):
 *
 * 1. Full attributed cost and its margin: `totals.cost`, `totals.marginAmount` and `totals.marginRate`, as frozen.
 *    The cost is also shown by nature, from the kind of each stored component. People (the human component) and
 *    provisions (talent assurance and operations reserves) are capacity cost the quote absorbs: real cost of the
 *    job, never zero and never free capacity. The natures add up to the frozen cost in every row and period: the
 *    kernel rounds cost once per row, so each nature is read at the currency unit and the people part of the row (or
 *    its largest part when the row has no person) is what is left of the row cost, as price-split.ts does.
 * 2. New supplier cash: only what the artifact declares as an incremental purchase, `resourceIncrementalCash`, which
 *    is the cost of the extra credit packs of each credit budget. The share of a subscription the budget allocates
 *    is attributed cost of a subscription that is already funded (`breakdown.subscription.newCash` is zero) and is
 *    not counted. A pack is priced in the currency of its provider; it is converted with the FX the quote froze
 *    for that currency, and read up to the currency unit so cash going out never reads smaller than it is.
 * 3. Modeled commitment: `totals.cashCommitment` and `cashLedger`. It is the attributed cost at its payment timing
 *    (an annual seat falls whole on the period it is paid) and it includes the people. It is neither new cash nor
 *    an invoice and no figure here is derived from it.
 *
 * Two results are named:
 *
 * - `marginAtFullCost` decides whether the job is viable; the floor verdict is the kernel's `MARGIN_BELOW_FLOOR`.
 * - `cashAddedOnContractedCapacity` = net - new supplier cash. It is the cash the job adds if the people it uses are
 *   capacity already contracted. It is not a margin and it does not decide price.
 *
 * What the frozen artifact does not let anyone separate is listed under `notDerivable` and left out of every figure:
 * whether a tool seat, a package, a platform fee or a setup resource is a new purchase for this job.
 */
export function readEngagementCash(result: Composition, identity: { calculationId: string; replayDigest: string }) {
  const { quote } = result
  const totals = quote.totals

  if (quote.calculationStatus !== 'calculated' || !totals) return rejected('ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE')

  const scale = scaleOf(totals.net)
  const money = (value: Decimal) => value.toFixed(scale, Wide.ROUND_HALF_UP)
  const sumOf = (values: Decimal[]) => values.reduce((total, value) => total.plus(value), new Wide(0))
  const notDerivable: { figure: string; reason: string }[] = []
  const purchases: CreditPurchase[] = []
  const periods: { read: PeriodCash; natures: Record<CostNature, Decimal>; newCash: Decimal | null }[] = []

  for (const period of quote.periods) {
    const input = quote.resolution.inputs.find(i => i.periodId === period.periodId)?.input
    const frozen = period.result.totals

    if (!input || !frozen) return rejected('ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE')

    const { request, snapshot } = input
    const natures = emptyNatures()

    for (const row of period.result.lines) {
      const line = request.lines.find(l => l.lineId === row.parentLineId)
      const raw = new Map<CostNature, Decimal>()

      for (const component of row.components) {
        // Read back the way the kernel and the composition wrote it: a tool component is one assignment of one
        // resource, a composed tool is the resource of one attribution in its period, and a credit tool is the one
        // the composition planned a budget for.
        const assignment =
          component.kind === 'tool' ? line?.assignments.find(a => a.allocationId === component.componentId) : undefined

        const attribution =
          assignment &&
          result.attributions.find(
            a => a.periodId === period.periodId && a.resource.resourceId === assignment.resourceId
          )

        const nature = natureOf(
          component.kind,
          Boolean(
            attribution &&
              result.creditBudgets.some(b => b.periodId === period.periodId && b.toolId === attribution.toolId)
          )
        )

        raw.set(
          nature,
          (raw.get(nature) ?? new Wide(0)).plus(new Wide(component.cost).mul(component.trace.outputFx ?? 1))
        )
      }

      // The part that takes what is left of the row cost: the people when the row has a person, else its largest.
      const holder = raw.has('people')
        ? 'people'
        : COST_NATURES.reduce<CostNature | null>(
            (best, nature) => (raw.has(nature) && (!best || raw.get(nature)!.gt(raw.get(best)!)) ? nature : best),
            null
          )

      let left = new Wide(row.cost)

      for (const nature of COST_NATURES) {
        if (nature === holder || !raw.has(nature)) continue

        const part = Wide.min(new Wide(money(raw.get(nature)!)), left)

        natures[nature] = natures[nature].plus(part)
        left = left.minus(part)
      }

      if (holder) natures[holder] = natures[holder].plus(left)
    }

    // FX exactly as the kernel reads it: one frozen record for the pair, or none.
    const rate = (from: string, to: string): FxStep[] | null => {
      if (from === to) return []
      const record = snapshot.fx.find(f => f.from === from && f.to === to)

      return record ? [{ from, to, rate: record.rate, sourceStatus: record.source.status }] : null
    }

    let newCash: Decimal | null = new Wide(0)

    for (const purchase of result.resourceIncrementalCash.filter(c => c.periodId === period.periodId)) {
      const toCalculation = rate(purchase.currency, snapshot.calculationCurrency)
      const toOutput = rate(snapshot.calculationCurrency, request.outputCurrency)
      const fx = toCalculation && toOutput ? [...toCalculation, ...toOutput] : null

      // Read up to the currency unit: money that goes out is never presented smaller than it is.
      const converted = fx
        ? fx
            .reduce((amount, step) => amount.mul(step.rate), new Wide(purchase.amount))
            .toDecimalPlaces(scale, Wide.ROUND_CEIL)
        : null

      const budget = result.creditBudgets.find(b => b.periodId === period.periodId && b.toolId === purchase.toolId)

      purchases.push({
        periodId: period.periodId,
        toolId: purchase.toolId,
        // As the credit budget froze it, in the currency of the provider.
        currency: purchase.currency,
        incrementalCash: purchase.amount,
        // Attributed share of the subscription that is already funded: cost of the quote, not new cash.
        subscriptionAttributedCost: budget?.result.breakdown?.subscription.attributedCost ?? null,
        subscriptionNewCash: budget?.result.breakdown?.subscription.newCash ?? null,
        fx,
        inQuoteCurrency: converted ? converted.toFixed(scale) : null
      })

      if (!converted)
        notDerivable.push({
          figure: `supplierCash.declaredNew (period ${period.periodId}, ${purchase.toolId})`,
          reason:
            'The frozen inputs hold no FX from the currency of this purchase to the quote currency, so it cannot be stated in the quote currency. It is listed in its own currency and no total or cash-added figure is given.'
        })

      newCash = converted && newCash ? newCash.plus(converted) : null
    }

    const ledger = quote.cashLedger.filter(entry => entry.periodId === period.periodId)
    const annual = ledger.filter(entry => entry.key !== 'human-monthly-and-once')
    const net = new Wide(frozen.net)

    periods.push({
      natures,
      newCash,
      read: {
        periodId: period.periodId,
        // Net, cost and margin of the period exactly as the kernel froze them.
        net: frozen.net,
        fullCost: frozen.cost,
        marginAtFullCost: frozen.marginAmount,
        marginRateRoundedDown: frozen.marginRate ? ratioForReading(new Wide(frozen.marginRate)) : null,
        modeledCommitment: {
          total: money(sumOf(ledger.map(entry => new Wide(entry.amount)))),
          // People, monthly resources and one-off resources, as the quote ledger groups them.
          monthlyAndOnce: money(
            sumOf(ledger.filter(entry => entry.key === 'human-monthly-and-once').map(e => new Wide(e.amount)))
          ),
          // Annual resources, whole, on the period the ledger pays them.
          annualUpFront: money(sumOf(annual.map(entry => new Wide(entry.amount))))
        },
        newSupplierCash: newCash ? money(newCash) : null,
        cashAddedOnContractedCapacity: newCash ? money(net.minus(newCash)) : null
      }
    })
  }

  const natureTotals = emptyNatures()

  for (const period of periods)
    for (const nature of COST_NATURES) natureTotals[nature] = natureTotals[nature].plus(period.natures[nature])

  const readNatures = (natures: Record<CostNature, Decimal>) => ({
    people: money(natures.people),
    provisions: money(natures.provisions),
    platformFee: money(natures.platformFee),
    setup: money(natures.setup),
    toolCreditBudgets: money(natures.toolCreditBudgets),
    toolSeatsAndPackages: money(natures.toolSeatsAndPackages),
    // Present only when the result holds a component of a kind this reading does not know.
    ...(natures.unclassified.isZero() ? {} : { unclassified: money(natures.unclassified) })
  })

  const totalNewCash = periods.every(period => period.newCash)
    ? sumOf(periods.map(period => period.newCash as Decimal))
    : null

  if (natureTotals.toolSeatsAndPackages.gt(0))
    notDerivable.push({
      figure: 'supplierCash.toolSeatsAndPackages.newPurchase',
      reason:
        'The artifact attributes a share of each seat or package to the quote and does not record whether the seat is already owned or has to be bought (cashMeaning: seat procurement is not inferred). It is left out of new supplier cash. A seat bought for this job is paid at its full price, not at its attributed share.'
    })
  if (natureTotals.platformFee.gt(0) || natureTotals.setup.gt(0))
    notDerivable.push({
      figure: 'supplierCash.platformFeeAndSetup.newPurchase',
      reason:
        'A platform fee or a setup resource is frozen with a cost and a source, not with a payee or a purchase. Whether it is cash paid to a third party for this job cannot be read; it stays in the full cost and out of new supplier cash.'
    })
  if (!natureTotals.unclassified.isZero())
    notDerivable.push({
      figure: 'fullCost.byNature.unclassified',
      reason:
        'The frozen result holds cost components of a kind this reading does not know. Their cost is inside the full cost and is not assigned to people, provisions or tools.'
    })
  notDerivable.push({
    figure: 'collected',
    reason:
      'A frozen quote holds no invoice and no payment. Nothing in this reading is an amount collected, and a milestone or a net is not cash until it is paid.'
  })

  const net = new Wide(totals.net)
  const capacity = (natures: Record<CostNature, Decimal>) => money(natures.people.plus(natures.provisions))

  const belowFloor = quote.periods.flatMap(period =>
    period.result.diagnostics
      .filter(d => d.code === 'MARGIN_BELOW_FLOOR')
      .map(d => ({ periodId: period.periodId, lineId: d.fieldPath.replace(/^result\.lines\./, '') }))
  )

  return {
    ok: true as const,
    reading: {
      schemaVersion: ENGAGEMENT_CASH_VERSION,
      binding: false as const,
      calculationId: identity.calculationId,
      replayDigest: identity.replayDigest,
      commercialUnit: result.commercialUnit,
      currency: totals.currency,
      statement:
        'Cash reading of a frozen quote. It puts the quoted net next to its full attributed cost and to the new cash it makes the company pay to suppliers. Nothing is repriced, and none of it is an invoice or an amount collected.',
      basis: [
        'net, fullCost and marginAtFullCost: totals of the quote and of each period, as the kernel froze them.',
        'fullCostByNature: cost of the stored components by kind, in the quote currency. Each nature is read at the currency unit and the people part of a row (its largest part when it has no person) is what is left of the row cost, so the natures add up to fullCost.',
        'capacityCostAbsorbed: people + provisions. Capacity cost that the quote absorbs: it is inside fullCost and inside the margin, and it is never zero or free capacity because the people are already contracted.',
        'newSupplierCash: resourceIncrementalCash, the extra credit packs of each credit budget, converted with the FX frozen in the quote and read up to the currency unit. The subscription share a budget allocates is already funded and is not new cash.',
        'modeledCommitment: totals.cashCommitment and cashLedger. Attributed cost at its payment timing, people included; not new cash and not an invoice. No other figure here uses it.'
      ],
      results: {
        marginAtFullCost: {
          amount: totals.marginAmount,
          rateRoundedDown: totals.marginRate ? ratioForReading(new Wide(totals.marginRate)) : null,
          decides: 'viability' as const,
          statement:
            'Margin of the quoted net over the full attributed cost: people, provisions, fees and tools. It is the figure that decides whether the job is viable.',
          floor: { source: 'kernel:MARGIN_BELOW_FLOOR', rowsBelowFloor: belowFloor }
        },
        cashAddedOnContractedCapacity: {
          amount: totalNewCash ? money(net.minus(totalNewCash)) : null,
          formula: 'net - newSupplierCash',
          isMargin: false as const,
          decidesPrice: false as const,
          statement:
            'Cash the job adds once collected if the people it uses are capacity already contracted. It is not a margin and it does not decide price: the people, the provisions and the tools are still the cost of the job, and it becomes cash only when the client pays.',
          restsOn: [
            'Every person on the job is capacity the company already pays, with or without this job. The artifact does not say so and this reading does not ask: where a person has to be hired or paid extra for the job, that cost is new cash and this figure is too high.',
            'Provisions are reserves the quote carries, not purchases.',
            'No tool seat, package, platform fee or setup resource is bought for this job: the artifact does not record procurement (see notDerivable). Only declared extra credit packs are taken as new supplier cash.'
          ]
        }
      },
      supplierCash: {
        declaredNew: {
          amount: totalNewCash ? money(totalNewCash) : null,
          source: 'resourceIncrementalCash: extra credit packs of the frozen credit budgets',
          // One entry per credit budget and period, in the currency of the provider and in the quote currency.
          purchases
        },
        // Attributed cost of tools inside fullCost. It is cost of the quote, not a purchase this reading can state.
        attributedNotNewCash: {
          toolCreditBudgets: money(natureTotals.toolCreditBudgets),
          toolSeatsAndPackages: money(natureTotals.toolSeatsAndPackages),
          note: 'toolCreditBudgets holds the already funded subscription share and the extra packs; only the packs are new cash, under declaredNew.'
        }
      },
      modeledCommitment: {
        total: totals.cashCommitment,
        // The artifact's own words for what the kernel commitment is.
        meaning: result.cashMeaning,
        ledger: quote.cashLedger
      },
      periods: periods.map(period => ({
        ...period.read,
        fullCostByNature: readNatures(period.natures),
        capacityCostAbsorbed: capacity(period.natures)
      })),
      totals: {
        // The totals of the quote, as frozen.
        net: totals.net,
        fullCost: totals.cost,
        marginAtFullCost: totals.marginAmount,
        marginRateRoundedDown: totals.marginRate ? ratioForReading(new Wide(totals.marginRate)) : null,
        tax: totals.tax,
        grandTotal: totals.grandTotal,
        fullCostByNature: readNatures(natureTotals),
        capacityCostAbsorbed: capacity(natureTotals),
        newSupplierCash: totalNewCash ? money(totalNewCash) : null,
        cashAddedOnContractedCapacity: totalNewCash ? money(net.minus(totalNewCash)) : null
      },
      notDerivable
    }
  }
}

export type EngagementCashReading = Extract<ReturnType<typeof readEngagementCash>, { ok: true }>['reading']
