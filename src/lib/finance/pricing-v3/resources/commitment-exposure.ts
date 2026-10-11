import Decimal from 'decimal.js'

import { activeRecords } from '../catalog/catalog'
import type { Catalog } from '../catalog/contracts'
import type { composeResourceQuote } from './composition'
import type { CompositionDemand, CompositionPolicy } from './composition-contracts'

type Composition = ReturnType<typeof composeResourceQuote>
type PeriodInput = Composition['quote']['resolution']['inputs'][number]['input']
type SnapshotResource = PeriodInput['snapshot']['resources'][number]
type PolicyTool = CompositionPolicy['tools'][number]
type ToolPrice = PolicyTool['prices'][number]
type Attribution = Composition['attributions'][number]

/** One year-priced resource of the quote: per period, its annual amount, its cost in the quote currency and its share. */
type AnnualUse = {
  resource: SnapshotResource
  input: PeriodInput
  quantity: string
  periods: Map<number, { annual: Decimal; cost: Decimal; share: Decimal }>
}

const D = Decimal.clone({ precision: 80 })

export const COMMITMENT_EXPOSURE_VERSION = 'pricing-v3-commitment-exposure/1'

/**
 * Months the kernel reads into a price per year: calculate.ts costs a twelfth a period and charges the whole amount
 * in the first one, and quote.ts charges it again every twelve periods. The policy states no other term.
 */
const ANNUAL_TERM_MONTHS = 12

const DAY = 86_400_000
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY)

/** Last day of the calendar month of a period: the window the composition gives it (client coverage, credit use). */
const lastDayOfPeriod = (quoteDate: string, periodId: number) => {
  const [year, month] = quoteDate.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1 + periodId, 0)).toISOString().slice(0, 10)
}

const dayBefore = (date: string) => new Date(Date.parse(date) - DAY).toISOString().slice(0, 10)

/**
 * Calendar arithmetic for a running contract term, on year, month and day as integers: no `Date`, no timezone, no
 * day that can shift. A calendar month is counted as `year x 12 + (month - 1)`, so adding a term is an addition.
 */
const monthIndexOf = (date: string) => {
  const [year, month] = date.split('-').map(Number)

  return year * 12 + month - 1
}

const daysInMonth = (monthIndex: number) => {
  const year = Math.floor(monthIndex / 12)
  const month = (monthIndex % 12) + 1

  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28

  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

const two = (value: number) => String(value).padStart(2, '0')

/** The given day of a calendar month, or its last day when the month is shorter (the 31st in November is the 30th). */
const dateIn = (monthIndex: number, day: number) =>
  `${String(Math.floor(monthIndex / 12)).padStart(4, '0')}-${two((monthIndex % 12) + 1)}-${two(Math.min(day, daysInMonth(monthIndex)))}`

/**
 * A contract term already running, read from the date the policy declares it renews on (`commitmentRenewsOn`).
 *
 * Renewal boundaries: the declared date and every `termMonths` months after it. Each one is derived from the declared
 * date, never from the boundary before it, so a day a month does not have is clamped to the last day of that month
 * without drifting: declared on the 31st with a term of three months, the boundaries are 31, 30 (a month of 30 days),
 * 28 or 29 (February), 31. The declared date may already be past when the quote is read (the policy was written
 * earlier): the boundary that applies is then a later one of the same series. No boundary is read BEFORE the declared
 * date: it is declared as the next renewal, so a date further away than one term binds until that date.
 *
 * A quoted period is a calendar month. The licence the quote uses is bound until the first boundary STRICTLY AFTER
 * the last day of the last quoted period that uses the price: a boundary on that last day, or earlier in a quoted
 * month, is a renewal the quote needs the licence across, and the next one binds.
 *
 * `monthsBeyondQuote` is the number of calendar months after that last quoted period that BEGIN before the boundary.
 * A month the term only partly covers counts whole: it is billed. One period in October 2026 against a renewal on
 * 2026-11-16 leaves 1 (November begins before the 16th); against 2026-11-01 it leaves 0 (November begins on the
 * boundary, not before it); against 2026-10-20 or 2026-10-31 the renewal falls inside the quoted month, the licence
 * is bound until the same day of October 2027 and 12 are left (November 2026 to October 2027).
 *
 * `renewsWithin` are the boundaries that fall inside a quoted calendar month that uses the price, first to last.
 */
const runningTermOf = (renewsOn: string, termMonths: number, firstMonth: number, lastMonth: number) => {
  const declared = monthIndexOf(renewsOn)
  const day = Number(renewsOn.split('-')[2])
  // A boundary is after the last day of a month exactly when its own month is a later one.
  const steps = Math.max(0, Math.floor((lastMonth - declared) / termMonths) + 1)
  const boundMonth = declared + steps * termMonths
  const renewsWithin: string[] = []

  // The boundaries up to the last quoted month, from the first one that is not before the first quoted month.
  for (let step = Math.max(0, Math.ceil((firstMonth - declared) / termMonths)); step < steps; step += 1)
    renewsWithin.push(dateIn(declared + step * termMonths, day))

  return {
    renewsOn,
    boundUntil: dateIn(boundMonth, day),
    // Whole months between the two, plus the month of the boundary unless the boundary is its first day.
    monthsBeyondQuote: boundMonth - lastMonth - 1 + (day > 1 ? 1 : 0),
    renewsWithin
  }
}

type RunningTerm = ReturnType<typeof runningTermOf>

/** The part of a frozen composition artifact this reading uses. Verifying it by replay is the caller's job. */
export type CommitmentExposureSource = {
  calculationId: string
  replayDigest: string
  semantic: { catalog: Catalog; policy: CompositionPolicy; demand: CompositionDemand; result: Composition }
}

/** An amount in the currency of the tool and in the currency of the quote, at the FX the quote froze. */
type Amount = { inToolCurrency: string; inQuoteCurrency: string | null }

type NotDerivable = { field: string; reason: string }

type Signal = {
  code:
    | 'COMMITMENT_OUTLIVES_ENGAGEMENT'
    | 'SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT'
    /**
     * A declared contract term renews inside the quoted periods. Raised besides the signal that names the commitment,
     * with the same amount: it is the same money read from the renewal, never an amount to add to it.
     */
    | 'COMMITMENT_RENEWS_WITHIN_ENGAGEMENT'
    | 'SHORTER_COMMITMENT_PRICE_IN_POLICY'
    | 'CREDITS_LEFT_OVER_AFTER_ENGAGEMENT'
    | 'CREDITS_LAPSE_WITHIN_ENGAGEMENT'
  toolId: string | null
  periodIds: number[]
  /** In the currency of the quote; null when the quote froze no FX for it. */
  amount: string | null
  currency: string
  detail: string
}

/**
 * What a frozen composed quote leaves committed after its last period. A reading of the artifact: no price, cost,
 * budget or status changes, nothing is recalculated by the kernel and nothing is recommended or applied.
 *
 * Three kinds of commitment can outlive the quoted periods, and they are read from what the artifact froze:
 *
 * 1. A price per year. The kernel charges it whole in the first period that uses it (`quote.cashLedger`, one row per
 *    twelve periods) and costs a twelfth of it in each period (`component.cost`). `committed` is that ledger amount,
 *    `attributedWithinPeriods` is the cost of its components and `unrecovered` is the difference: the months the
 *    quote committed and does not use. Nothing here says the amount is new cash: the kernel commitment is modeled
 *    (`cashMeaning`) and the artifact does not say whether the seat already exists, so `incrementalCash` is null.
 *
 *    Who carries the unrecovered months depends on the share the demand declared. With the whole resource
 *    (`quoteShare` 1) the quote is its only declared user and the amount is stranded if nothing else uses it. With a
 *    share under 1 the demand declares the resource is used beyond this quote (portfolio or declared capacity): the
 *    quote committed only its own share and that share goes back to the pool; it is reported as released, never as
 *    stranded. Who holds the rest of the pool is not in the artifact.
 *
 *    `shorterCommitmentPrices` lists every price per month the frozen policy holds for the same tool on the quote
 *    date that binds for less than the year, with what it would cost over the same periods, quantity and share. It
 *    is information: the policy does not say which monthly price is the same plan as the annual one, and nothing is
 *    chosen here.
 *
 * 2. A price per month under a contract term. The policy entry the quote selected declares how long the supplier
 *    contract binds (`commitmentTermMonths`): a plan contracted for a year and invoiced month by month. Billing and
 *    commitment are two facts and the kernel knows only the first, so this commitment is DECLARED BY THE POLICY, not
 *    booked by the kernel: the cash ledger holds one month per quoted period and never the months left, and it is
 *    not read for this kind. `committed` is the monthly amount the frozen attribution gives the quote (amount x
 *    quantity x share) times the term, `attributedWithinPeriods` is the cost of its components and `unrecovered` is
 *    the months left. Cash is paid month by month: nothing is paid up front, which is what tells it from a price per
 *    year. Sharing, stranded and released follow the rule of the annual price.
 *
 *    Without a renewal date the term is ONE term, opening in the first quoted period that uses the price. No renewal
 *    is assumed: the policy declares a term, not what happens when it ends, and the kernel books nothing that would
 *    say (a price per year is different: the ledger itself opens a second year at period 13). A quote that uses the
 *    price past its term leaves no entry for it; the tool is listed in `notDerivable` as
 *    `CONTRACT_RENEWAL_NOT_DECLARED`. That reading overstates a contract already running.
 *
 *    When the policy entry also declares the date the contract renews (`commitmentRenewsOn`), the term is read as
 *    RUNNING: the licence the quote uses is bound until the first renewal after the last quoted period that uses the
 *    price, and what is left is the months up to that date, not a whole term (`runningTermOf` states the rule).
 *    `unrecovered` is those months times the monthly amount the quote is attributed in that last period, and
 *    `committed` is what the quote attributes plus that: what the quote's use of the licence binds, NOT a full term.
 *    A renewal that falls inside the quoted periods is crossed with the licence in use, so the term after it binds;
 *    it is reported as it is, with `COMMITMENT_RENEWS_WITHIN_ENGAGEMENT`. A term of one month is the month it bills
 *    and leaves nothing, with or without a date.
 *
 * 3. A pack of AI credits bigger than its use. The credit plan is the artifact's (`creditBudgets`): credits bought,
 *    used and left over, the expiry of the pack and its cash (`resourceIncrementalCash`). The quote already assigns
 *    the whole pack to the client, so no cost is unrecovered; what is left is credits. They either stay valid after
 *    the engagement ends or lapse inside it, where the plan of no later period uses them.
 *
 * A price per month whose policy entry declares no term is read as the kernel charges it: one period at a time, with
 * nothing left after the last one. Whether a contract stands behind it is then not declared, so it cannot show
 * here; those tools are listed in `notDerivable`. The engagement is the periods the quote prices: an agreement longer
 * than `brief.periods` is not in the artifact either.
 *
 * Amounts in the currency of the tool are frozen amounts multiplied by frozen quantities and shares. Amounts in the
 * currency of the quote are the ledger and component amounts as frozen; only what the quote never priced (an
 * alternative price, a pack, the whole of a declared term) is converted, with the FX of the frozen snapshot.
 * `unrecovered` is `committed` minus `attributedWithinPeriods` at the precision shown, so the three always add up.
 */
export function commitmentExposure(artifact: CommitmentExposureSource) {
  const { catalog, policy, demand, result } = artifact.semantic
  const { quote } = result
  const brief = demand.brief
  const quoteDate = brief.quoteDate
  const endsOn = lastDayOfPeriod(quoteDate, brief.periods)
  const currency = quote.totals?.currency ?? brief.outputCurrency
  const scale = quote.totals?.net.split('.')[1]?.length ?? 0
  const money = (value: Decimal) => value.toFixed(scale, D.ROUND_HALF_UP)

  const inputOf = (periodId: number) => quote.resolution.inputs.find(i => i.periodId === periodId)?.input

  const toolMoney = (input: PeriodInput, code: string) => {
    const precision = input.snapshot.currencies.find(c => c.code === code)?.precision ?? 2

    return (value: Decimal) => value.toFixed(precision, D.ROUND_HALF_UP)
  }

  /** Converts with the FX the period was frozen with; null when the quote never needed that pair. */
  const toQuoteCurrency = (input: PeriodInput, value: Decimal, from: string) => {
    const calculation = input.snapshot.calculationCurrency

    const rate = (a: string, b: string) =>
      a === b ? new D(1) : (input.snapshot.fx.find(f => f.from === a && f.to === b)?.rate ?? null)

    const toCalculation = rate(from, calculation)
    const toOutput = rate(calculation, input.request.outputCurrency)

    return toCalculation === null || toOutput === null ? null : money(value.mul(toCalculation).mul(toOutput))
  }

  const live = activeRecords(catalog, quoteDate)

  // A policy price either carries its amount or points at one live catalog record, as the composition reads it.
  const valueOf = (price: ToolPrice) => {
    if (price.price) return price.price

    const records = live.filter(r => r.kind === 'resource' && r.value.resourceId === price.catalogResourceId)
    const record = records.length === 1 ? records[0] : null

    return record?.kind === 'resource' && record.value.amount !== null
      ? {
          amount: record.value.amount,
          currency: record.value.currency,
          unit: record.value.unit,
          source: record.source
        }
      : null
  }

  /**
   * Prices per month the frozen policy holds for the same tool, on the quote date, that bind for less than the price
   * the quote uses: no declared term (one month at a time) or a shorter one. Costed over the same periods, quantity
   * and share. A price sold on another basis has no cost here: it is listed without one, or left out.
   */
  const shorterPricesOf = (of: {
    tool: PolicyTool | undefined
    selected: ToolPrice | undefined
    input: PeriodInput
    quantity: string
    quoteShare: Decimal
    /** Quoted periods the price the quote uses is attributed in. */
    months: number
    /** Months the price the quote uses binds for. */
    termMonths: number
    committed: string | null
    attributed: string
    otherBasis: 'listed_without_cost' | 'left_out'
  }) =>
    (of.tool?.prices ?? []).flatMap(price => {
      const value = price.priceId === of.selected?.priceId ? null : valueOf(price)

      if (!value || value.unit !== 'month') return []
      if (value.source.effectiveFrom > quoteDate || quoteDate > value.source.effectiveUntil) return []
      // A monthly price that binds as long as the one the quote uses is not a shorter commitment.
      if ((price.commitmentTermMonths ?? 1) >= of.termMonths) return []

      // The quantity of the quote only means the same thing on a price sold the same way.
      const sameBasis =
        price.basis === of.selected?.basis && (price.includedSeats ?? null) === (of.selected?.includedSeats ?? null)

      if (!sameBasis && of.otherBasis === 'left_out') return []

      const perMonth = new D(value.amount).mul(of.quantity).mul(of.quoteShare)
      const cost = perMonth.mul(of.months)
      const costInQuote = sameBasis ? toQuoteCurrency(of.input, cost, value.currency) : null

      // What this price would itself commit: the quoted periods, or its own declared term when that is longer.
      const boundInQuote = sameBasis
        ? toQuoteCurrency(
            of.input,
            perMonth.mul(Math.max(of.months, price.commitmentTermMonths ?? 0)),
            value.currency
          )
        : null

      return [
        {
          priceId: price.priceId,
          basis: price.basis,
          unit: value.unit,
          amount: value.amount,
          currency: value.currency,
          sourceStatus: value.source.status,
          ...(price.minimumContractSeats ? { minimumContractSeats: price.minimumContractSeats } : {}),
          ...(price.includedSeats ? { includedSeats: price.includedSeats } : {}),
          ...(price.commitmentTermMonths ? { commitmentTermMonths: price.commitmentTermMonths } : {}),
          // Same periods, quantity and share as the price the quote uses. Null when sold on another basis.
          costOverQuotedPeriods: sameBasis
            ? { amount: toolMoney(of.input, value.currency)(cost), inQuoteCurrency: costInQuote }
            : null,
          // Positive: over the quoted periods this price costs more than what the quote attributes.
          extraCostOverQuotedPeriods: costInQuote === null ? null : money(new D(costInQuote).minus(of.attributed)),
          extraCostPerMonth:
            costInQuote === null ? null : money(new D(costInQuote).minus(of.attributed).div(of.months)),
          // Commitment of the price the quote uses that this one would not take: `committed` minus what this one
          // binds (the cost above, or its own shorter term).
          commitmentNotTaken:
            boundInQuote === null || of.committed === null ? null : money(new D(of.committed).minus(boundInQuote)),
          ...(sameBasis
            ? costInQuote === null
              ? {
                  notDerivable: `The quote froze no FX from ${value.currency}, so this price has no amount in ${currency}.`
                }
              : {}
            : {
                notDerivable:
                  'Sold on another basis (seat or package, or other included seats) than the price the quote uses: the quantity of the quote does not transfer to it.'
              })
        }
      ]
    })

  const readAnnualPrice = (
    key: string,
    use: AnnualUse,
    ledger: Composition['quote']['cashLedger'],
    periodIds: number[],
    monthsCommitted: number
  ) => {
    const { resource, input } = use
    const first = periodIds[0]
    const inTool = toolMoney(input, resource.currency)
    const used = [...use.periods.values()]
    const sum = (values: Decimal[]) => values.reduce((total, value) => total.plus(value), new D(0))

    // A tool the composition priced from the resource policy reaches the kernel as `composed:<toolId>`.
    const attribution = result.attributions.find(
      a => a.periodId === first && a.resource.resourceId === resource.resourceId
    )

    const allocation =
      attribution && demand.allocations.find(a => a.periodId === first && a.toolId === attribution.toolId)

    const quoteShare = new D(attribution?.serviceShare ?? use.periods.get(first)!.share)

    // One ledger row per term, in the period the term opens. The amount of a term is the one of that period.
    const committed = {
      inToolCurrency: inTool(sum(ledger.map(c => use.periods.get(c.periodId)?.annual ?? new D(0)))),
      inQuoteCurrency: money(sum(ledger.map(c => new D(c.amount))))
    }

    const attributedWithinPeriods = {
      inToolCurrency: inTool(sum(used.map(p => p.annual.div(ANNUAL_TERM_MONTHS)))),
      inQuoteCurrency: money(sum(used.map(p => p.cost)))
    }

    const unrecovered = {
      inToolCurrency: inTool(new D(committed.inToolCurrency).minus(attributedWithinPeriods.inToolCurrency)),
      inQuoteCurrency: money(new D(committed.inQuoteCurrency).minus(attributedWithinPeriods.inQuoteCurrency))
    }

    const none = { inToolCurrency: inTool(new D(0)), inQuoteCurrency: money(new D(0)) }
    // Declared as used beyond this quote: its share is released to the pool, not stranded by the quote ending.
    const shared = quoteShare.lt(1)

    const tool = attribution ? policy.tools.find(t => t.toolId === attribution.toolId) : undefined

    const shorterCommitmentPrices = shorterPricesOf({
      tool,
      selected: tool?.prices.find(p => p.priceId === attribution?.priceId),
      input,
      quantity: use.quantity,
      quoteShare,
      months: periodIds.length,
      termMonths: ANNUAL_TERM_MONTHS,
      committed: committed.inQuoteCurrency,
      attributed: attributedWithinPeriods.inQuoteCurrency,
      otherBasis: 'listed_without_cost'
    })

    const missing: NotDerivable[] = [
      {
        field: 'incrementalCash',
        reason:
          'The kernel commitment is modeled, not a purchase: the artifact does not say whether this seat or plan already exists and is paid, or has to be bought for this quote.'
      },
      {
        field: 'commitment.termStart',
        reason:
          'The term is read as opening in the first quoted period that uses the price. A plan already running, its renewal date and its cancellation or refund terms are not in the artifact.'
      },
      ...(shared
        ? [
            {
              field: 'sharing.restOfPool',
              reason:
                'The demand declares the share of this quote, not who holds the rest (other accounts, internal use or unassigned capacity). The portfolio document is not part of the artifact.'
            }
          ]
        : []),
      ...(attribution
        ? []
        : [
            {
              field: 'shorterCommitmentPrices',
              reason: 'A resource the composition did not price from the resource policy has no alternative prices.'
            }
          ])
    ]

    return {
      kind: 'annual_price' as const,
      toolId: attribution?.toolId ?? null,
      resourceId: resource.resourceId,
      ledgerKey: key,
      priceId: attribution?.priceId ?? null,
      label: resource.label,
      sourceStatus: resource.source.status,
      periodIds,
      commitment: {
        unit: resource.unit,
        termMonths: ANNUAL_TERM_MONTHS,
        terms: ledger.length,
        // Period indexes the paid terms cover; `through` is past the last quoted period.
        coversPeriods: { from: first, through: first + monthsCommitted - 1 },
        monthsCommitted,
        monthsWithinQuote: periodIds.length,
        monthsBeyondQuote: monthsCommitted - periodIds.length,
        unitPrice: resource.amount,
        quantity: use.quantity
      },
      currency: resource.currency,
      committed,
      attributedWithinPeriods,
      unrecovered,
      sharing: {
        basis: shared ? ('shared_declared_capacity' as const) : ('sole_declared_user' as const),
        quoteShare: quoteShare.toString(),
        ...(attribution ? { driver: attribution.driver, consumerCount: attribution.consumerIds.length } : {}),
        ...(allocation?.seatCapacity ? { seatCapacity: allocation.seatCapacity } : {}),
        ...(allocation?.contractSeatCount ? { contractSeatCount: allocation.contractSeatCount } : {})
      },
      strandedIfNothingElseUsesIt: shared ? none : unrecovered,
      releasedToSharedCapacity: shared ? unrecovered : none,
      // Attributed cost and modeled commitment are not new cash; see `notDerivable`.
      incrementalCash: null,
      shorterCommitmentPrices,
      notDerivable: missing
    }
  }

  /**
   * A price per month whose policy entry declares a contract term that outlives the quoted periods that use it.
   * `kernelCost` is the cost the kernel stored for the tool in the periods of `uses`, in the quote currency.
   *
   * The cash ledger is not read here: the kernel books what is billed, one month per quoted period, so the ledger
   * does not contain the months the contract still binds after the last one. The commitment is the term the policy
   * declares, on the monthly amount the frozen attribution gives the quote.
   *
   * Without `running` the term is one whole term opening in the first quoted period that uses the price: `uses` are
   * the attributions of the quoted periods inside it, in period order, and `input` is the one of that first period.
   * With `running` (the policy entry declares the date the contract renews) `uses` are every quoted period that uses
   * the price and `input` is the one of the last: the months left follow that period, so its amount, quantity and
   * share are the ones read. A quantity or share that changes inside the quote is not followed month by month.
   */
  const readTermedMonthlyPrice = (
    tool: PolicyTool,
    price: ToolPrice,
    termMonths: number,
    uses: Attribution[],
    input: PeriodInput,
    kernelCost: Decimal,
    running?: RunningTerm
  ) => {
    const opening = uses[0]
    // The period whose attribution the months outside the quote are read on.
    const held = running ? uses[uses.length - 1] : opening
    const { resource } = held
    const periodIds = uses.map(a => a.periodId)
    const inTool = toolMoney(input, resource.currency)
    const sum = (values: Decimal[]) => values.reduce((total, value) => total.plus(value), new D(0))
    const allocation = demand.allocations.find(a => a.periodId === held.periodId && a.toolId === tool.toolId)
    const quoteShare = new D(held.serviceShare)
    const monthsBeyondQuote = running ? running.monthsBeyondQuote : termMonths - uses.length

    // Amount x quantity x share as the attribution froze it: of the period the term opens in (a term has one
    // amount), or of the last quoted period when the term is read as running.
    const perMonth = new D(held.attributedMonthlyCost)

    const both = (value: Decimal): Amount => ({
      inToolCurrency: inTool(value),
      inQuoteCurrency: toQuoteCurrency(input, value, resource.currency)
    })

    const attributedWithinPeriods = {
      inToolCurrency: inTool(sum(uses.map(a => new D(a.attributedMonthlyCost)))),
      inQuoteCurrency: money(kernelCost)
    }

    // The months outside the quote were never priced by it: they are converted with the FX that period froze.
    const left = both(perMonth.mul(monthsBeyondQuote))

    // With a renewal date, `committed` is what the quote's use of the licence binds: what it attributes plus the
    // months up to the renewal, not a full term. Without one it is the whole declared term.
    const committed: Amount = running
      ? {
          inToolCurrency: inTool(new D(attributedWithinPeriods.inToolCurrency).plus(left.inToolCurrency)),
          inQuoteCurrency:
            left.inQuoteCurrency === null
              ? null
              : money(new D(attributedWithinPeriods.inQuoteCurrency).plus(left.inQuoteCurrency))
        }
      : both(perMonth.mul(termMonths))

    const unrecovered: Amount = running
      ? left
      : {
          inToolCurrency: inTool(new D(committed.inToolCurrency).minus(attributedWithinPeriods.inToolCurrency)),
          inQuoteCurrency:
            committed.inQuoteCurrency === null
              ? null
              : money(new D(committed.inQuoteCurrency).minus(attributedWithinPeriods.inQuoteCurrency))
        }

    const none: Amount = { inToolCurrency: inTool(new D(0)), inQuoteCurrency: money(new D(0)) }
    // Same rule as a price per year: a share under 1 is capacity the demand declares as shared.
    const shared = quoteShare.lt(1)
    const inPackage = price.basis === 'package' && Boolean(price.includedSeats)

    return {
      kind: 'termed_monthly_price' as const,
      toolId: tool.toolId,
      resourceId: resource.resourceId,
      priceId: price.priceId,
      label: resource.label,
      sourceStatus: resource.source.status,
      // The quoted periods inside the term that use the price.
      periodIds,
      commitment: {
        unit: resource.unit,
        // Declared by the policy entry (`commitmentTermMonths`), not booked by the kernel.
        declaredBy: 'policy' as const,
        termMonths,
        // One term when no renewal date is declared: no renewal is assumed. With one, the terms the quoted periods
        // touch: the running one and one more for each renewal inside them.
        terms: running ? running.renewsWithin.length + 1 : 1,
        // Period indexes; `through` is past the last quoted period.
        coversPeriods: {
          from: opening.periodId,
          through: running ? held.periodId + monthsBeyondQuote : opening.periodId + termMonths - 1
        },
        // The whole term, or with a renewal date the months the quote's use of the licence binds.
        monthsCommitted: running ? uses.length + monthsBeyondQuote : termMonths,
        monthsWithinQuote: uses.length,
        monthsBeyondQuote,
        unitPrice: resource.amount,
        quantity: held.quantity,
        // Invoiced month by month over the term: nothing is paid when it opens.
        billing: 'monthly' as const,
        // Only when the policy entry declares the date the contract renews (`commitmentRenewsOn`).
        ...(running
          ? {
              termStartKnown: true as const,
              // As declared; it may be past when the quote is read.
              renewsOn: running.renewsOn,
              // The renewal the licence this quote uses is bound until: the first one after its last quoted period.
              boundUntil: running.boundUntil,
              // Renewals that fall inside a quoted calendar month that uses the price.
              renewsWithinQuotedPeriods: running.renewsWithin
            }
          : {})
      },
      currency: resource.currency,
      // What the quote is attributed each month of the term.
      monthlyAmount: both(perMonth),
      paidUpFront: none,
      committed,
      attributedWithinPeriods,
      unrecovered,
      sharing: {
        basis: shared ? ('shared_declared_capacity' as const) : ('sole_declared_user' as const),
        quoteShare: quoteShare.toString(),
        driver: held.driver,
        consumerCount: held.consumerIds.length,
        priceBasis: price.basis,
        ...(price.includedSeats ? { includedSeats: price.includedSeats } : {}),
        ...(allocation?.seatCapacity ? { seatCapacity: allocation.seatCapacity } : {}),
        ...(allocation?.contractSeatCount ? { contractSeatCount: allocation.contractSeatCount } : {}),
        // Where the part of the contract this quote does not hold sits.
        ...(shared ? { restSitsIn: inPackage ? ('shared_package' as const) : ('shared_capacity' as const) } : {})
      },
      strandedIfNothingElseUsesIt: shared ? none : unrecovered,
      releasedToSharedCapacity: shared ? unrecovered : none,
      // A declared term and an attributed cost are not new cash; see `notDerivable`.
      incrementalCash: null,
      shorterCommitmentPrices: shorterPricesOf({
        tool,
        selected: price,
        input,
        quantity: held.quantity,
        quoteShare,
        months: uses.length,
        termMonths,
        committed: committed.inQuoteCurrency,
        attributed: attributedWithinPeriods.inQuoteCurrency,
        otherBasis: 'left_out'
      }),
      notDerivable: [
        {
          field: 'incrementalCash',
          reason:
            'The commitment is a declared contract term, not a purchase: the artifact does not say whether this seat or plan already exists and is paid, or has to be contracted for this quote.'
        },
        running
          ? {
              field: 'commitment.exitTerms',
              reason:
                'The term is read as running, from the renewal date the policy declares. Leaving before that date, its fee or refund, what the supplier bills for a month the term only partly covers (counted whole here) and whether the contract is renewed at that date are not in the artifact.'
            }
          : {
              field: 'commitment.termStart',
              reason:
                'The term is read as one term opening in the first quoted period that uses the price. A contract already running, its renewal and its cancellation or early-exit terms are not in the artifact.'
            },
        ...(shared
          ? [
              {
                field: 'sharing.restOfPool',
                reason: inPackage
                  ? `The price is a package of ${price.includedSeats} seats and the demand declares the share of this quote in it, not who holds the other seats (other accounts, internal use or unassigned seats). The portfolio document is not part of the artifact.`
                  : 'The demand declares the share of this quote, not who holds the rest (other accounts, internal use or unassigned capacity). The portfolio document is not part of the artifact.'
              }
            ]
          : []),
        ...(committed.inQuoteCurrency === null
          ? [
              {
                field: 'committed.inQuoteCurrency',
                reason: `The quote froze no FX from ${resource.currency}, so the term has no amount in ${currency}.`
              }
            ]
          : [])
      ] satisfies NotDerivable[]
    }
  }

  const readCreditPack = (budget: Composition['creditBudgets'][number]) => {
    const breakdown = budget.result.breakdown!
    const { extra, subscription } = breakdown
    const input = inputOf(budget.periodId)
    const inTool = input ? toolMoney(input, breakdown.currency) : (value: Decimal) => value.toFixed(2, D.ROUND_HALF_UP)

    const both = (value: Decimal): Amount => ({
      inToolCurrency: inTool(value),
      inQuoteCurrency: input ? toQuoteCurrency(input, value, breakdown.currency) : null
    })

    // The cash the artifact already separated from attributed cost, for this provider and period.
    const incremental = result.resourceIncrementalCash.find(
      c => c.periodId === budget.periodId && c.toolId === budget.toolId
    )

    // Validity ends before `expiresAt`, as the plan states it (`validityEndExclusive`).
    const lastValidDay = extra.expiresAt ? dayBefore(extra.expiresAt) : null
    const daysPastEngagementEnd = lastValidDay ? daysBetween(endsOn, lastValidDay) : null

    return {
      kind: 'credit_pack' as const,
      toolId: budget.toolId,
      providerId: budget.result.request.providerId,
      label: policy.tools.find(t => t.toolId === budget.toolId)?.label ?? budget.toolId,
      periodIds: [budget.periodId],
      credits: {
        requested: budget.result.request.requestedCredits,
        fromSubscription: subscription.allocatedCredits,
        fromPacks: extra.requestedCredits,
        purchased: extra.purchasedCredits,
        leftOver: extra.remainingCredits
      },
      packs: extra.packages,
      expiry: {
        expiresAt: extra.expiresAt,
        validityEndExclusive: extra.validityEndExclusive,
        lastValidDay,
        engagementEndsOn: endsOn,
        // `after`: the credits left over stay valid once the engagement ends. `within`: they lapse during it.
        leftOverLapses:
          daysPastEngagementEnd === null
            ? null
            : daysPastEngagementEnd > 0
              ? ('after_engagement' as const)
              : ('within_engagement' as const),
        daysPastEngagementEnd
      },
      currency: breakdown.currency,
      // New cash: the whole packs, as the artifact reports it. The subscription share below is cost, not cash.
      incrementalCash: both(new D(incremental?.amount ?? extra.newCash)),
      // The quote assigns the whole pack to the client, so no cost of it is left unrecovered.
      attributedWithinPeriods: both(new D(extra.costAssignedToClient)),
      unrecovered: both(new D(extra.purchaseCost).minus(extra.costAssignedToClient)),
      // Share of the pack cash that bought the credits left over, at the blended price of the packs bought.
      paidForLeftOver: both(new D(extra.purchaseCost).mul(extra.remainingCredits).div(extra.purchasedCredits)),
      subscription: { attributedCost: subscription.attributedCost, newCash: subscription.newCash },
      notDerivable: [
        {
          field: 'credits.leftOver.use',
          reason:
            'Whether another quote, account or internal work will use the credits left over is not in the artifact: a remainder is never deducted from another quote without an explicit budget.'
        }
      ] satisfies NotDerivable[]
    }
  }

  const annualPrices: ReturnType<typeof readAnnualPrice>[] = []
  const termedMonthlyPrices: ReturnType<typeof readTermedMonthlyPrice>[] = []
  const creditPacks: ReturnType<typeof readCreditPack>[] = []
  const notDerivable: { code: string; toolIds: string[]; reason: string }[] = []
  let annualPriceUses = 0
  let termedMonthlyPriceUses = 0
  let renewalDatedPriceUses = 0

  // A blocked quote has no cash ledger to read a commitment from, and a credit plan that may be incomplete.
  if (quote.calculationStatus === 'calculated' && quote.totals) {
    // Year-priced components grouped as quote.ts groups them for the ledger: resource, scope and scope reference.
    const annual = new Map<string, AnnualUse>()
    // Cost the kernel stored for each month-priced resource, by period, in the quote currency.
    const monthlyCost = new Map<string, Decimal>()

    for (const period of quote.periods) {
      const input = inputOf(period.periodId)

      if (!input) continue

      for (const row of period.result.lines) {
        const line = input.request.lines.find(l => l.lineId === row.parentLineId)

        for (const component of row.components) {
          if (component.trace.unit !== 'year' && component.trace.unit !== 'month') continue

          const assignment = line?.assignments.find(a => a.allocationId === component.componentId)
          const resource = assignment && input.snapshot.resources.find(r => r.resourceId === assignment.resourceId)

          if (!assignment || !resource) continue

          if (component.trace.unit === 'month') {
            const at = `${period.periodId}:${assignment.resourceId}`

            monthlyCost.set(
              at,
              (monthlyCost.get(at) ?? new D(0)).plus(new D(component.cost).mul(component.trace.outputFx ?? 1))
            )
            continue
          }

          const key = `${assignment.resourceId}:${component.trace.scope}:${component.trace.scopeRef}`
          const use = annual.get(key) ?? { resource, input, quantity: assignment.quantity, periods: new Map() }
          const prior = use.periods.get(period.periodId) ?? { annual: new D(0), cost: new D(0), share: new D(0) }

          annual.set(key, use)
          use.periods.set(period.periodId, {
            // What the kernel calls the cash of the assignment, before any FX: amount x quantity x share.
            annual: prior.annual.plus(new D(resource.amount).mul(assignment.quantity).mul(assignment.share)),
            cost: prior.cost.plus(new D(component.cost).mul(component.trace.outputFx ?? 1)),
            share: prior.share.plus(assignment.share)
          })
        }
      }
    }

    annualPriceUses = annual.size

    for (const [key, use] of annual) {
      const ledger = quote.cashLedger.filter(c => c.key === key)
      const periodIds = [...use.periods.keys()].sort((a, b) => a - b)
      const monthsCommitted = ledger.length * ANNUAL_TERM_MONTHS

      // A term the quote uses to its last month leaves nothing behind.
      if (monthsCommitted <= periodIds.length) continue

      annualPrices.push(readAnnualPrice(key, use, ledger, periodIds, monthsCommitted))
    }

    for (const budget of result.creditBudgets) {
      const extra = budget.result.breakdown?.extra

      if (extra && extra.remainingCredits > 0) creditPacks.push(readCreditPack(budget))
    }

    const budgeted = new Set(result.creditBudgets.map(b => b.toolId))

    // Month-priced tools by the policy price the quote selected: the same tool and price the attribution names.
    const monthly = new Map<string, { tool: PolicyTool | undefined; price: ToolPrice | undefined; uses: Attribution[] }>()

    for (const attribution of result.attributions) {
      if (attribution.resource.unit !== 'month' || budgeted.has(attribution.toolId)) continue

      const key = `${attribution.toolId}:${attribution.priceId}`
      const tool = policy.tools.find(t => t.toolId === attribution.toolId)
      const price = tool?.prices.find(p => p.priceId === attribution.priceId)
      const use = monthly.get(key) ?? { tool, price, uses: [] }

      monthly.set(key, use)
      use.uses.push(attribution)
    }

    const termNotDeclared = new Set<string>()
    const usedPastTerm = new Set<string>()

    for (const { tool, price, uses } of monthly.values()) {
      const termMonths = price?.commitmentTermMonths

      if (!tool || !price || !termMonths) {
        termNotDeclared.add(uses[0].toolId)
        continue
      }

      termedMonthlyPriceUses += 1
      uses.sort((a, b) => a.periodId - b.periodId)

      if (price.commitmentRenewsOn) {
        renewalDatedPriceUses += 1

        // A term of one month is the month it bills: the seat can be dropped at the next bill, whatever day that
        // is, so nothing is left. Counting calendar months would report the month that bill falls in.
        if (termMonths === 1) continue

        const last = uses[uses.length - 1]
        const quoteMonth = monthIndexOf(quoteDate)

        // Period 1 is the calendar month of the quote date. Every quoted period that uses the price is read: the
        // date says what happens when a term ends, so `CONTRACT_RENEWAL_NOT_DECLARED` is not raised for it.
        const running = runningTermOf(
          price.commitmentRenewsOn,
          termMonths,
          quoteMonth + uses[0].periodId - 1,
          quoteMonth + last.periodId - 1
        )

        const input = inputOf(last.periodId)

        // The contract renews on the first day after the last quoted period: nothing is left behind.
        if (!input || running.monthsBeyondQuote <= 0) continue

        const kernelCost = uses.reduce(
          (sum, a) => sum.plus(monthlyCost.get(`${a.periodId}:${a.resource.resourceId}`) ?? 0),
          new D(0)
        )

        termedMonthlyPrices.push(readTermedMonthlyPrice(tool, price, termMonths, uses, input, kernelCost, running))
        continue
      }

      // One term, opening in the first quoted period that uses the price. No renewal is assumed: a period past the
      // term is read as the kernel charges it, a month at a time, and the tool is named below as not derivable.
      const lastPeriodOfTerm = uses[0].periodId + termMonths - 1
      const withinTerm = uses.filter(a => a.periodId <= lastPeriodOfTerm)
      const input = inputOf(uses[0].periodId)

      // A term of one month is "paid month by month and free to leave": there is no renewal to declare, however many
      // periods the quote runs.
      if (termMonths > 1 && withinTerm.length < uses.length) usedPastTerm.add(tool.toolId)

      // A term the quote uses to its last month leaves nothing behind.
      if (!input || termMonths <= withinTerm.length) continue

      const kernelCost = withinTerm.reduce(
        (sum, a) => sum.plus(monthlyCost.get(`${a.periodId}:${a.resource.resourceId}`) ?? 0),
        new D(0)
      )

      termedMonthlyPrices.push(readTermedMonthlyPrice(tool, price, termMonths, withinTerm, input, kernelCost))
    }

    if (termNotDeclared.size)
      notDerivable.push({
        code: 'CONTRACT_TERM_NOT_FROZEN',
        toolIds: [...termNotDeclared],
        reason:
          'Priced per month, and the policy price the quote uses declares no contract term (commitmentTermMonths). Declared, a term longer than the month it bills is read as a commitment; without it, an annual contract billed monthly, a seat that cannot be released mid-term, a notice period or a cancellation rule cannot be read from the artifact.'
      })
    if (usedPastTerm.size)
      notDerivable.push({
        code: 'CONTRACT_RENEWAL_NOT_DECLARED',
        toolIds: [...usedPastTerm],
        reason:
          'The quote uses the price past the contract term its policy entry declares. The term is read as one term from the first quoted period that uses the price; whether it renews for another term or runs on month by month is not declared, so no commitment is read for the periods past it.'
      })
    if (budgeted.size)
      notDerivable.push({
        code: 'CREDIT_SUBSCRIPTION_TERM_NOT_FROZEN',
        toolIds: [...budgeted],
        reason:
          'The credit catalog freezes a monthly subscription fee and the plan attributes a share of it as already funded. How long that subscription is committed for is not in the artifact.'
      })
  } else {
    notDerivable.push({
      code: 'QUOTE_NOT_CALCULATED',
      toolIds: [],
      reason:
        'The quote has no totals, so it has no cash ledger to read a commitment from. Complete it and read it again.'
    })
  }

  const total = (values: (string | null)[]) => money(values.reduce((sum, value) => sum.plus(value ?? 0), new D(0)))

  const signals: Signal[] = [
    ...[...annualPrices, ...termedMonthlyPrices].flatMap(entry => {
      const months = entry.commitment
      const shared = entry.sharing.basis === 'shared_declared_capacity'
      const base = { toolId: entry.toolId, periodIds: entry.periodIds, currency }

      // A declared term is told apart from a year the kernel booked: its cash goes out a month at a time.
      if (entry.kind === 'termed_monthly_price') {
        const left = `${entry.unrecovered.inQuoteCurrency ?? `${entry.unrecovered.inToolCurrency} ${entry.currency}, no FX frozen to`} ${currency}`
        const pool = entry.sharing.restSitsIn === 'shared_package' ? 'a package' : 'a capacity'

        // A term read as running, from the renewal date the policy declares: what is left is up to that renewal.
        const { boundUntil, renewsOn } = entry.commitment
        const renewsWithin = entry.commitment.renewsWithinQuotedPeriods ?? []

        const term = boundUntil
          ? `${entry.label}: priced per month under a contract term of ${months.termMonths} months the policy declares, renewing on ${renewsOn} and every ${months.termMonths} months after it, billed month by month with nothing paid up front. The licence this quote uses is bound until ${boundUntil}, the first renewal after its last quoted period. Months inside the quote: ${months.monthsWithinQuote}; months after it that begin before that date: ${months.monthsBeyondQuote}.`
          : `${entry.label}: priced per month under a contract term of ${months.termMonths} months the policy declares, billed month by month with nothing paid up front. ${months.monthsWithinQuote} inside the quote.`

        return [
          {
            code: shared
              ? ('SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT' as const)
              : ('COMMITMENT_OUTLIVES_ENGAGEMENT' as const),
            ...base,
            amount: entry.unrecovered.inQuoteCurrency,
            detail: shared
              ? `${term} The share of this quote for the other ${months.monthsBeyondQuote} (${left}) goes back to ${pool} the demand declares as shared; it is not stranded by this quote ending.`
              : `${term} The other ${months.monthsBeyondQuote} (${left}) are still owed month by month, are not recovered by this quote and are stranded if nothing else uses them.`
          },
          // Its own code, besides the one above: the renewal is a date somebody can act on, and it changes what the
          // months left mean. They belong to a term that starts inside the engagement, with the licence in use.
          ...(renewsWithin.length
            ? [
                {
                  code: 'COMMITMENT_RENEWS_WITHIN_ENGAGEMENT' as const,
                  ...base,
                  amount: entry.unrecovered.inQuoteCurrency,
                  detail: `${entry.label}: the contract term renews inside the engagement (${renewsWithin.join(', ')}), while the quote still uses the licence. The licence is needed across the renewal, so the term that starts there binds it until ${boundUntil}: the ${months.monthsBeyondQuote} months left (${left}) belong to that term. At a renewal the number of licences can be changed, but only for licences no longer needed, and this one still is. The amount is the one of the commitment above, not an amount to add to it.`
                }
              ]
            : []),
          ...entry.shorterCommitmentPrices
            .filter(price => price.extraCostOverQuotedPeriods !== null)
            .map(price => ({
              code: 'SHORTER_COMMITMENT_PRICE_IN_POLICY' as const,
              ...base,
              amount: price.extraCostOverQuotedPeriods,
              detail: `${entry.label}: the policy also holds ${price.priceId}, priced per month ${price.commitmentTermMonths ? `under a term of ${price.commitmentTermMonths} months` : 'with no contract term declared'}. Over the quoted periods it would cost ${price.costOverQuotedPeriods?.inQuoteCurrency} ${currency} against ${entry.attributedWithinPeriods.inQuoteCurrency} attributed to the price the quote uses (difference ${price.extraCostOverQuotedPeriods}). The policy does not say it is the same plan; nothing was changed.`
            }))
        ]
      }

      return [
        {
          code: shared
            ? ('SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT' as const)
            : ('COMMITMENT_OUTLIVES_ENGAGEMENT' as const),
          ...base,
          amount: entry.unrecovered.inQuoteCurrency,
          detail: shared
            ? `${entry.label}: ${months.monthsCommitted} months committed, ${months.monthsWithinQuote} inside the quote. The share of this quote for the other ${months.monthsBeyondQuote} (${entry.unrecovered.inQuoteCurrency} ${currency}) goes back to a capacity the demand declares as shared; it is not stranded by this quote ending.`
            : `${entry.label}: ${months.monthsCommitted} months committed, ${months.monthsWithinQuote} inside the quote. The other ${months.monthsBeyondQuote} (${entry.unrecovered.inQuoteCurrency} ${currency}) are not recovered by this quote and are stranded if nothing else uses them.`
        },
        ...entry.shorterCommitmentPrices
          .filter(price => price.extraCostOverQuotedPeriods !== null)
          .map(price => ({
            code: 'SHORTER_COMMITMENT_PRICE_IN_POLICY' as const,
            ...base,
            amount: price.extraCostOverQuotedPeriods,
            detail: `${entry.label}: the policy also holds ${price.priceId}, priced per month and charged one period at a time. Over the quoted periods it would cost ${price.costOverQuotedPeriods?.inQuoteCurrency} ${currency} against ${entry.attributedWithinPeriods.inQuoteCurrency} attributed to the annual price (difference ${price.extraCostOverQuotedPeriods}). The policy does not say it is the same plan; nothing was changed.`
          }))
      ]
    }),
    ...creditPacks.map(entry => {
      const after = entry.expiry.leftOverLapses === 'after_engagement'

      return {
        code: after ? ('CREDITS_LEFT_OVER_AFTER_ENGAGEMENT' as const) : ('CREDITS_LAPSE_WITHIN_ENGAGEMENT' as const),
        toolId: entry.toolId,
        periodIds: entry.periodIds,
        amount: entry.paidForLeftOver.inQuoteCurrency,
        currency,
        detail: after
          ? `${entry.label}: ${entry.credits.purchased} credits bought in packs, ${entry.credits.fromPacks} used. The ${entry.credits.leftOver} left over stay valid until ${entry.expiry.lastValidDay}, ${entry.expiry.daysPastEngagementEnd} days after the engagement ends on ${endsOn}.`
          : `${entry.label}: ${entry.credits.purchased} credits bought in packs, ${entry.credits.fromPacks} used. The ${entry.credits.leftOver} left over lapse on ${entry.expiry.lastValidDay}, before the engagement ends on ${endsOn}, and no later period plans to use them.`
      }
    })
  ]

  return {
    schemaVersion: COMMITMENT_EXPOSURE_VERSION,
    binding: false as const,
    calculationId: artifact.calculationId,
    replayDigest: artifact.replayDigest,
    commercialUnit: result.commercialUnit,
    calculationStatus: quote.calculationStatus,
    currency,
    engagement: {
      // What the quote prices. A longer agreement behind a quote of fewer periods is not in the artifact.
      periods: brief.periods,
      unit: 'month' as const,
      quoteDate,
      endsOn,
      form: 'engagementForm' in brief && typeof brief.engagementForm === 'string' ? brief.engagementForm : null
    },
    statement:
      'Reading of what a frozen quote leaves committed after its last quoted period. It changes no price or cost, recommends nothing and applies nothing.',
    basis: [
      'engagement: the periods the quote prices (brief.periods), each a calendar month from the quote date. An agreement longer than the quoted periods is not in the artifact; read against it, a commitment listed here may not outlive anything.',
      'annual price: committed = the cash ledger rows of the quote for that resource (the whole year, charged in the period the term opens); attributedWithinPeriods = cost of its components in the quoted periods (a twelfth a period); unrecovered = committed - attributedWithinPeriods.',
      'sharing: a quote share of 1 makes the quote the only declared user, and the unrecovered amount is stranded if nothing else uses it. A share under 1 is a capacity the demand declares as shared: the amount is released to it, never counted as stranded.',
      'termed monthly price: a price per month whose policy entry declares a contract term (commitmentTermMonths) longer than the quoted periods that use it. The commitment is declared by the policy, not booked by the kernel: the cash ledger holds one month per quoted period and is not read. committed = the monthly amount the quote is attributed (amount x quantity x share) x the months of the term; attributedWithinPeriods = cost of its components in the quoted periods; unrecovered = committed - attributedWithinPeriods, the months left. It is billed month by month: nothing is paid up front. One term from the first quoted period that uses the price; no renewal is assumed.',
      // Stated only when a price of this reading declares the date, so a reading without one says what it always said.
      ...(renewalDatedPriceUses
        ? [
            'termed monthly price with a renewal date: when the policy entry also declares the date the contract renews (commitmentRenewsOn), the term is read as running instead of opening with the quote. Renewals are that date and every term after it. The licence is bound until the first renewal strictly after the last day of the last quoted period that uses the price (commitment.boundUntil). monthsBeyondQuote = the calendar months after that period that begin before that renewal, a month the term only partly covers counted whole. unrecovered = monthsBeyondQuote x the monthly amount the quote is attributed in that last period; committed = attributedWithinPeriods + unrecovered, what the quote\'s use of the licence binds, not a full term. A renewal inside the quoted periods is crossed with the licence in use: the term after it binds.'
          ]
        : []),
      'shorter-commitment prices: every price per month the frozen policy holds for the same tool on the quote date that binds for less than the price the quote uses, over the same periods, quantity and share. The policy does not link the prices of one plan.',
      'credit pack: the plan of the artifact (creditBudgets), never recomputed. incrementalCash is the cash of whole packs (resourceIncrementalCash); the subscription share is attributed cost with no new cash.',
      'amounts in the quote currency use the FX the quote froze; none of them is new cash unless it is named incrementalCash.'
    ],
    cashMeaning: result.cashMeaning,
    // What was looked at, so an empty reading can be told apart from one that looked at nothing.
    reviewed: {
      annualPriceUses,
      // Month-priced uses whose policy price declares a contract term, whether or not it outlives the quote.
      termedMonthlyPriceUses,
      // Of those, the ones whose policy price also declares the date the contract renews. Absent when none does.
      ...(renewalDatedPriceUses ? { renewalDatedPriceUses } : {}),
      creditBudgets: result.creditBudgets.length,
      creditBudgetsWithPacks: result.creditBudgets.filter(b => (b.result.breakdown?.extra.purchasedCredits ?? 0) > 0)
        .length
    },
    commitments: [...annualPrices, ...termedMonthlyPrices, ...creditPacks],
    signals,
    totals: {
      currency,
      commitments: annualPrices.length + termedMonthlyPrices.length + creditPacks.length,
      annualPrices: {
        count: annualPrices.length,
        committed: total(annualPrices.map(e => e.committed.inQuoteCurrency)),
        attributedWithinPeriods: total(annualPrices.map(e => e.attributedWithinPeriods.inQuoteCurrency)),
        unrecovered: total(annualPrices.map(e => e.unrecovered.inQuoteCurrency)),
        // The two parts of `unrecovered`.
        strandedIfNothingElseUsesIt: total(annualPrices.map(e => e.strandedIfNothingElseUsesIt.inQuoteCurrency)),
        releasedToSharedCapacity: total(annualPrices.map(e => e.releasedToSharedCapacity.inQuoteCurrency))
      },
      // Declared by the policy and billed a month at a time: kept apart from the years the kernel booked.
      termedMonthlyPrices: {
        count: termedMonthlyPrices.length,
        committed: total(termedMonthlyPrices.map(e => e.committed.inQuoteCurrency)),
        attributedWithinPeriods: total(termedMonthlyPrices.map(e => e.attributedWithinPeriods.inQuoteCurrency)),
        unrecovered: total(termedMonthlyPrices.map(e => e.unrecovered.inQuoteCurrency)),
        // The two parts of `unrecovered`.
        strandedIfNothingElseUsesIt: total(termedMonthlyPrices.map(e => e.strandedIfNothingElseUsesIt.inQuoteCurrency)),
        releasedToSharedCapacity: total(termedMonthlyPrices.map(e => e.releasedToSharedCapacity.inQuoteCurrency))
      },
      creditPacks: {
        count: creditPacks.length,
        incrementalCash: total(creditPacks.map(e => e.incrementalCash.inQuoteCurrency)),
        paidForLeftOver: total(creditPacks.map(e => e.paidForLeftOver.inQuoteCurrency)),
        unrecovered: total(creditPacks.map(e => e.unrecovered.inQuoteCurrency))
      }
    },
    // What the artifact does not carry, by tool: read as "unknown", never as "none".
    notDerivable
  }
}
