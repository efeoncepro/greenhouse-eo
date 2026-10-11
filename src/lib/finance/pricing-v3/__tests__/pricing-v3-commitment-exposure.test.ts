// Commitment exposure: what a frozen composed quote leaves committed after its last period
// (resources/commitment-exposure.ts).
//
// The reading derives from the frozen artifact and recalculates nothing, so its verifiers are the artifact and the
// kernel: every expectation below is read from what the composition froze (the cash ledger of the quote, the kernel
// components, the attributions, the credit plan), from the committed policy the quote was composed with, or from a
// second quote composed by `composeResourceQuote` with one input changed (the same seat on its monthly price, the
// same engagement over twelve periods, the same policy with or without a declared contract term). Nothing asserts
// the text of the module, and no expected amount comes from a previous run of the reader.
//
// Everything is read from the committed artifacts or built in memory from the committed sources; nothing is written
// under data/.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import {
  COMPOSITION_VERSION,
  replayResourceComposition,
  runResourceComposition
} from '../adapters/resource-composition'
import { COMMITMENT_EXPOSURE_VERSION, commitmentExposure } from '../resources/commitment-exposure'
import type { composeResourceQuote } from '../resources/composition'

type Composition = ReturnType<typeof composeResourceQuote>
type Artifact = ReturnType<typeof runResourceComposition>
type Reading = ReturnType<typeof commitmentExposure>
type Entry = Reading['commitments'][number]
type AnnualEntry = Extract<Entry, { kind: 'annual_price' }>
type TermedEntry = Extract<Entry, { kind: 'termed_monthly_price' }>
type CreditEntry = Extract<Entry, { kind: 'credit_pack' }>
type PolicyPrice = { priceId: string; basis: string; commitmentTermMonths?: number; price?: { amount: string } }

const D = Decimal.clone({ precision: 80 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const root = resolve('.')

const SKY_AGREED_NET = 'docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json'

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
  })

// Same walk as the frozen-artifacts guard, narrowed to the lane that attributes tools: compositions.
const corpus = [...walk(resolve(root, 'data/pricing')).map(path => relative(root, path)), SKY_AGREED_NET]
  .filter(path => read(path).artifactVersion === COMPOSITION_VERSION)
  .sort()

// The sources the constructed quotes are composed with: the catalog the pointer names, policy v6 and credits v1.
const pointer = read('data/pricing/v3-operating/current.json')
const catalog = read(pointer.catalog.path)
const policy = read('data/pricing/v3-operating/resources.review-v6.json')
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')

const QUOTE_DATE = '2026-10-11'
const ANNUAL_SEAT = 'public-standard-teams-annual'
const MONTHLY_SEAT = 'public-standard-teams-monthly'

const sum = (values: (string | number | null)[]) => values.reduce((total, value) => total.plus(value ?? 0), new D(0))

const monthStart = (periodId: number) => {
  const [year, month] = QUOTE_DATE.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1 + periodId - 1, 1)).toISOString().slice(0, 10)
}

const monthEnd = (periodId: number) => {
  const [year, month] = QUOTE_DATE.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1 + periodId, 0)).toISOString().slice(0, 10)
}

type CreditPlan = { toolId: string; periodId: number; credits: number; fromSubscription: number }

/**
 * One dedicated senior designer: Notion per month, Microsoft 365 on the price and share under test, and the Adobe
 * package of three seats on the price and share under test (the whole package unless stated).
 */
const demandFor = (options: {
  periods: number
  microsoftPriceId: string
  microsoftUnits?: { total: string; allocated: string; share: string }
  adobePriceId?: string
  adobeUnits?: { unit: string; total: string; allocated: string; share: string }
  credits?: CreditPlan[]
}) => {
  const units = options.microsoftUnits ?? { total: '1', allocated: '1', share: '1' }
  const adobe = options.adobeUnits ?? { unit: 'declared-capacity-hours', total: '160', allocated: '160', share: '1' }
  const plans = options.credits ?? []
  const aiToolIds = [...new Set(plans.map(plan => plan.toolId))]
  const periodIds = Array.from({ length: options.periods }, (_, index) => index + 1)

  return {
    schemaVersion: 'pricing-v3-composition-demand/1',
    commercialUnit: 'role_capacity',
    brief: {
      schemaVersion: 'pricing-v3-brief/1',
      mode: 'simulation',
      quoteDate: QUOTE_DATE,
      offerId: 'talent-assurance-staffing',
      engagementCode: 'monthly',
      accountId: 'commitment-exposure-test',
      offerMarketCountry: 'CL',
      outputCurrency: 'CLP',
      periods: options.periods,
      lines: [
        {
          lineId: 'design',
          profile: 'ECG-002',
          talentCountry: 'CL',
          headcount: 1,
          dedication: { unit: 'fte', value: '1' },
          allocationMode: 'dedicated',
          allocationPolicyId: 'allocation:dedicated',
          allowUnlocalizedCost: false,
          choices: []
        }
      ],
      adjustments: [],
      taxTreatment: { kind: 'not_resolved' }
    },
    work: [
      {
        lineId: 'design',
        assigneeIds: ['design-slot'],
        tasks: [],
        aiToolIds,
        ...(aiToolIds.length ? { aiSelectionReason: 'Credit demand declared for the test.' } : {}),
        creditDemand: plans.map(plan => ({ periodId: plan.periodId, toolId: plan.toolId, credits: plan.credits }))
      }
    ],
    serviceToolIds: [],
    allocations: periodIds.flatMap(periodId => [
      {
        periodId,
        toolId: 'notion',
        priceId: 'current',
        quantity: '1',
        serviceShare: '1',
        driver: { unit: 'assigned-user-seat', totalUnits: '1', allocatedUnits: '1' },
        reason: 'Test seat.'
      },
      {
        periodId,
        toolId: 'microsoft-365',
        priceId: options.microsoftPriceId,
        quantity: '1',
        serviceShare: units.share,
        driver: { unit: 'declared-capacity-hours', totalUnits: units.total, allocatedUnits: units.allocated },
        reason: 'Test seat.'
      },
      {
        periodId,
        toolId: 'adobe',
        priceId: options.adobePriceId ?? 'current',
        quantity: '1',
        serviceShare: adobe.share,
        seatCapacity: 3,
        driver: { unit: adobe.unit, totalUnits: adobe.total, allocatedUnits: adobe.allocated },
        reason: 'Test package.'
      }
    ]),
    creditBudgets: plans.map(plan => ({
      periodId: plan.periodId,
      toolId: plan.toolId,
      purchaseDate: plan.periodId === 1 ? QUOTE_DATE : monthStart(plan.periodId),
      useBy: monthEnd(plan.periodId),
      subscriptionCreditsAllocated: plan.fromSubscription,
      subscriptionCreditsAvailable: plan.fromSubscription,
      activeSubscription: true,
      allowRepeatedPacks: false
    })),
    fxRecordIds: aiToolIds.includes('magnific') ? ['fx:EUR:USD'] : []
  }
}

const compose = (options: Parameters<typeof demandFor>[0], withPolicy: unknown = policy) =>
  runResourceComposition(catalog, withPolicy, credits, demandFor(options), '2026-10-11T00:00:00.000Z')

/** Policy v6 with a contract term declared on Adobe prices: `{ current: 12 }` is the plan contracted for a year. */
const policyWithAdobeTerms = (terms: Record<string, number>) => {
  const copy = clone(policy)
  const prices: PolicyPrice[] = copy.tools.find((t: { toolId: string }) => t.toolId === 'adobe').prices

  for (const [priceId, months] of Object.entries(terms))
    prices.find(price => price.priceId === priceId)!.commitmentTermMonths = months

  return copy
}

/** The policy price an attribution names: same tool, same price. */
const selectedPrice = (
  source: { tools: { toolId: string; prices: PolicyPrice[] }[] },
  attribution: { toolId: string; priceId: string }
) => source.tools.find(t => t.toolId === attribution.toolId)?.prices.find(p => p.priceId === attribution.priceId)

const calculated = (artifact: Artifact) => {
  expect(artifact.semantic.result.quote.diagnostics).toEqual([])
  expect(artifact.semantic.result.quote.calculationStatus).toBe('calculated')

  return artifact
}

const annualEntries = (reading: Reading) =>
  reading.commitments.filter((entry): entry is AnnualEntry => entry.kind === 'annual_price')

const termedEntries = (reading: Reading) =>
  reading.commitments.filter((entry): entry is TermedEntry => entry.kind === 'termed_monthly_price')

const creditEntries = (reading: Reading) =>
  reading.commitments.filter((entry): entry is CreditEntry => entry.kind === 'credit_pack')

const entryOf = (reading: Reading, toolId: string) => annualEntries(reading).find(entry => entry.toolId === toolId)

/** Rows the quote froze in its cash ledger for year-priced resources: everything but the monthly bucket. */
const annualLedger = (result: Composition) => result.quote.cashLedger.filter(c => c.key !== 'human-monthly-and-once')

/** Cost the kernel stored for one tool, in the output currency: over the whole quote or in one period. */
const kernelCost = (result: Composition, toolId: string, periodId?: number) =>
  result.quote.periods
    .filter(period => periodId === undefined || period.periodId === periodId)
    .flatMap(period => period.result.lines.flatMap(row => row.components))
    // The composition names the allocation of a tool `composed-<toolId>-<n>`.
    .filter(component => component.componentId.replace(/-\d+$/, '') === `composed-${toolId}`)
    .reduce((total, component) => total.plus(new D(component.cost).mul(component.trace.outputFx ?? 1)), new D(0))

const scaleOf = (result: Composition) => result.quote.totals!.net.split('.')[1]?.length ?? 0

describe('commitment exposure over every committed composition artifact', () => {
  it('the walk finds the committed compositions, and some of them commit a year for a one-period quote', () => {
    expect(corpus).toContain(SKY_AGREED_NET)
    expect(corpus.filter(path => path.startsWith('data/pricing/v3-operating/')).length).toBeGreaterThanOrEqual(4)

    // Without this the consistency checks below could pass on a corpus that commits nothing.
    const committing = corpus.filter(path => {
      const semantic = read(path).semantic

      return annualLedger(semantic.result).length > 0 && semantic.demand.brief.periods < 12
    })

    expect(committing.length).toBeGreaterThanOrEqual(2)
  })

  it.each(corpus)('%s', path => {
    // Every artifact enters through the same replay check the CLI applies.
    const artifact = replayResourceComposition(read(path))
    const before = clone(artifact)
    const reading = commitmentExposure(artifact)
    const { result, demand } = artifact.semantic

    // A pure reading: the artifact is untouched, the output is plain data and reading twice says the same.
    expect(artifact).toEqual(before)
    expect(clone(reading)).toEqual(reading)
    expect(commitmentExposure(artifact)).toEqual(reading)

    expect(reading.schemaVersion).toBe(COMMITMENT_EXPOSURE_VERSION)
    expect(reading.binding).toBe(false)
    expect(reading.calculationId).toBe(artifact.calculationId)
    expect(reading.replayDigest).toBe(artifact.replayDigest)
    expect(reading.currency).toBe(result.quote.totals!.currency)
    expect(reading.engagement.periods).toBe(demand.brief.periods)
    expect(reading.engagement.quoteDate).toBe(demand.brief.quoteDate)
    expect(reading.cashMeaning).toBe(result.cashMeaning)
    expect(reading.reviewed.creditBudgets).toBe(result.creditBudgets.length)

    const annual = annualEntries(reading)
    const termed = termedEntries(reading)
    const packs = creditEntries(reading)

    // Totals are the sum of the entries, field by field, and every entry is of one of the three kinds.
    expect(reading.totals.commitments).toBe(reading.commitments.length)
    expect(annual.length + termed.length + packs.length).toBe(reading.commitments.length)
    expect(reading.totals.annualPrices.count).toBe(annual.length)
    expect(reading.totals.termedMonthlyPrices.count).toBe(termed.length)
    expect(reading.totals.creditPacks.count).toBe(packs.length)

    for (const field of [
      'committed',
      'attributedWithinPeriods',
      'unrecovered',
      'strandedIfNothingElseUsesIt',
      'releasedToSharedCapacity'
    ] as const) {
      expect(reading.totals.annualPrices[field]).toBe(
        sum(annual.map(entry => entry[field].inQuoteCurrency)).toFixed(scaleOf(result))
      )
      // A declared term is totalled on its own, never folded into the years the kernel booked.
      expect(reading.totals.termedMonthlyPrices[field]).toBe(
        sum(termed.map(entry => entry[field].inQuoteCurrency)).toFixed(scaleOf(result))
      )
    }

    for (const field of ['incrementalCash', 'paidForLeftOver', 'unrecovered'] as const)
      expect(reading.totals.creditPacks[field]).toBe(
        sum(packs.map(entry => entry[field].inQuoteCurrency)).toFixed(scaleOf(result))
      )

    // Every year the quote put in its cash ledger is listed when the quote stops before the year does, and the
    // amount committed is that ledger amount: nothing is committed here that the artifact did not commit.
    if (demand.brief.periods < 12) {
      expect(annual.map(entry => entry.ledgerKey).sort()).toEqual(
        [...new Set(annualLedger(result).map(c => c.key))].sort()
      )
      expect(reading.totals.annualPrices.committed).toBe(
        sum(annualLedger(result).map(c => c.amount)).toFixed(scaleOf(result))
      )
    }

    expect(new D(reading.totals.annualPrices.committed).lte(result.quote.totals!.cashCommitment)).toBe(true)

    for (const entry of annual) {
      const attributions = result.attributions.filter(a => a.toolId === entry.toolId)

      // Only a price per year is a commitment that outlives its month.
      expect(attributions.every(a => a.resource.unit === 'year')).toBe(true)
      expect(entry.periodIds).toEqual(attributions.map(a => a.periodId))

      expect(entry.committed.inQuoteCurrency).toBe(
        sum(result.quote.cashLedger.filter(c => c.key === entry.ledgerKey).map(c => c.amount)).toFixed(scaleOf(result))
      )
      // The cost the quote attributes is the cost the kernel stored for those components, never the commitment.
      expect(entry.attributedWithinPeriods.inQuoteCurrency).toBe(
        kernelCost(result, entry.toolId!).toFixed(scaleOf(result), D.ROUND_HALF_UP)
      )
      // In the currency of the tool, against what the composition froze in the attribution.
      expect(
        new D(entry.attributedWithinPeriods.inToolCurrency).eq(sum(attributions.map(a => a.attributedMonthlyCost)))
      ).toBe(true)
      expect(
        new D(entry.committed.inToolCurrency).eq(
          new D(attributions[0].resource.amount).mul(attributions[0].quantity).mul(attributions[0].serviceShare)
        )
      ).toBe(true)

      for (const currency of ['inToolCurrency', 'inQuoteCurrency'] as const) {
        expect(
          new D(entry.unrecovered[currency]!).eq(
            new D(entry.committed[currency]!).minus(entry.attributedWithinPeriods[currency]!)
          )
        ).toBe(true)
        // The unrecovered amount is either stranded or released, never both and never lost.
        expect(
          new D(entry.strandedIfNothingElseUsesIt[currency]!)
            .plus(entry.releasedToSharedCapacity[currency]!)
            .eq(entry.unrecovered[currency]!)
        ).toBe(true)
      }

      expect(new D(entry.unrecovered.inQuoteCurrency).gt(0)).toBe(true)
      expect(entry.commitment.monthsBeyondQuote).toBe(entry.commitment.monthsCommitted - entry.periodIds.length)
      // A modeled commitment is never presented as new cash.
      expect(entry.incrementalCash).toBeNull()
    }

    // A tool priced per month, credits included, is never listed as a year.
    const monthly = result.attributions.filter(a => a.resource.unit === 'month').map(a => a.toolId)

    expect(annual.filter(entry => monthly.includes(entry.toolId!))).toEqual([])

    // Month-priced tools split by what the policy the artifact froze declares on the price the quote selected: a
    // contract term, or none. Only the second group is reported as a term nobody declared.
    const budgeted = new Set(result.creditBudgets.map(b => b.toolId))
    const monthPriced = result.attributions.filter(a => a.resource.unit === 'month' && !budgeted.has(a.toolId))
    const declaresTerm = (a: (typeof monthPriced)[number]) => selectedPrice(artifact.semantic.policy, a)?.commitmentTermMonths
    const undeclared = [...new Set(monthPriced.filter(a => !declaresTerm(a)).map(a => a.toolId))]

    expect(reading.notDerivable.find(n => n.code === 'CONTRACT_TERM_NOT_FROZEN')?.toolIds ?? []).toEqual(undeclared)
    expect(reading.reviewed.termedMonthlyPriceUses).toBe(
      new Set(monthPriced.filter(declaresTerm).map(a => `${a.toolId}:${a.priceId}`)).size
    )

    for (const entry of termed) {
      const attributions = monthPriced.filter(
        a => a.toolId === entry.toolId && a.priceId === entry.priceId && entry.periodIds.includes(a.periodId)
      )

      const term = declaresTerm(attributions[0])!

      // The term is the one the policy declares, it opens in the first period and the quote stops before it does.
      expect(entry.commitment.termMonths).toBe(term)
      expect(entry.periodIds).toEqual(attributions.map(a => a.periodId))
      expect(entry.commitment.monthsBeyondQuote).toBe(term - entry.periodIds.length)
      expect(entry.commitment.monthsBeyondQuote).toBeGreaterThan(0)
      expect(entry.commitment.billing).toBe('monthly')

      // Declared by the policy, not booked by the kernel: the quote has no ledger row for this resource.
      expect(result.quote.cashLedger.filter(c => c.key.startsWith(`${entry.resourceId}:`))).toEqual([])

      // committed = the monthly amount the attribution froze x the term; attributed = what the kernel costed.
      const inToolCurrency = (value: Decimal) =>
        value.toFixed(entry.committed.inToolCurrency.split('.')[1]?.length ?? 0, D.ROUND_HALF_UP)

      expect(entry.committed.inToolCurrency).toBe(inToolCurrency(new D(attributions[0].attributedMonthlyCost).mul(term)))
      expect(entry.attributedWithinPeriods.inToolCurrency).toBe(
        inToolCurrency(sum(attributions.map(a => a.attributedMonthlyCost)))
      )
      expect(entry.attributedWithinPeriods.inQuoteCurrency).toBe(
        sum(entry.periodIds.map(periodId => kernelCost(result, entry.toolId, periodId).toString())).toFixed(
          scaleOf(result),
          D.ROUND_HALF_UP
        )
      )

      for (const currency of ['inToolCurrency', 'inQuoteCurrency'] as const) {
        expect(
          new D(entry.unrecovered[currency]!).eq(
            new D(entry.committed[currency]!).minus(entry.attributedWithinPeriods[currency]!)
          )
        ).toBe(true)
        expect(
          new D(entry.strandedIfNothingElseUsesIt[currency]!)
            .plus(entry.releasedToSharedCapacity[currency]!)
            .eq(entry.unrecovered[currency]!)
        ).toBe(true)
        // Billed a month at a time: nothing is paid when the term opens.
        expect(new D(entry.paidUpFront[currency]!).isZero()).toBe(true)
      }

      // A share under 1 is released to the shared capacity and never counted as stranded.
      expect(new D(entry.strandedIfNothingElseUsesIt.inToolCurrency).isZero()).toBe(
        new D(attributions[0].serviceShare).lt(1)
      )
      expect(entry.incrementalCash).toBeNull()
    }

    for (const entry of packs) {
      const budget = result.creditBudgets.find(b => b.periodId === entry.periodIds[0] && b.toolId === entry.toolId)!

      const cash = result.resourceIncrementalCash.find(
        c => c.periodId === entry.periodIds[0] && c.toolId === entry.toolId
      )!

      expect(entry.credits.leftOver).toBe(budget.result.breakdown!.extra.remainingCredits)
      expect(entry.credits.leftOver).toBeGreaterThan(0)
      expect(new D(entry.incrementalCash.inToolCurrency).eq(cash.amount)).toBe(true)
      expect(entry.currency).toBe(cash.currency)
    }

    // One signal names each commitment, with its tool, its periods and its amount.
    for (const entry of reading.commitments) {
      const named = reading.signals.filter(
        signal => signal.toolId === entry.toolId && signal.code !== 'SHORTER_COMMITMENT_PRICE_IN_POLICY'
      )

      expect(named.filter(signal => signal.periodIds.join() === entry.periodIds.join())).toHaveLength(1)
    }

    expect(reading.signals.every(signal => signal.currency === reading.currency)).toBe(true)
  })
})

describe('a one-month quote on a seat priced per year', () => {
  const artifact = calculated(compose({ periods: 1, microsoftPriceId: ANNUAL_SEAT }))
  const result = artifact.semantic.result
  const reading = commitmentExposure(artifact)
  const entry = entryOf(reading, 'microsoft-365')!
  const tool = policy.tools.find((t: { toolId: string }) => t.toolId === 'microsoft-365')
  const annualPrice = tool.prices.find((p: { priceId: string }) => p.priceId === ANNUAL_SEAT).price

  it('lists the seat with the year the quote committed, the month it attributes and the eleven it leaves', () => {
    expect(annualPrice.unit).toBe('year')
    expect(reading.engagement).toMatchObject({ periods: 1, unit: 'month', quoteDate: QUOTE_DATE, endsOn: '2026-10-31' })

    expect(entry.priceId).toBe(ANNUAL_SEAT)
    expect(entry.periodIds).toEqual([1])
    expect(entry.commitment).toMatchObject({
      unit: 'year',
      terms: 1,
      coversPeriods: { from: 1, through: 12 },
      monthsCommitted: 12,
      monthsWithinQuote: 1,
      monthsBeyondQuote: 11
    })

    // Committed: the price of the policy, whole, in its own currency; and the row the quote put in its ledger.
    expect(entry.currency).toBe(annualPrice.currency)
    expect(new D(entry.committed.inToolCurrency).eq(annualPrice.amount)).toBe(true)
    expect(annualLedger(result)).toHaveLength(1)
    expect(entry.committed.inQuoteCurrency).toBe(annualLedger(result)[0].amount)

    // Attributed: what the kernel costed in the one period, a twelfth of the year.
    expect(new D(entry.attributedWithinPeriods.inToolCurrency).eq(new D(annualPrice.amount).div(12))).toBe(true)
    expect(new D(entry.attributedWithinPeriods.inQuoteCurrency).eq(kernelCost(result, 'microsoft-365'))).toBe(true)

    // Remainder: committed minus attributed, in both currencies.
    expect(
      new D(entry.unrecovered.inToolCurrency).eq(
        new D(entry.committed.inToolCurrency).minus(entry.attributedWithinPeriods.inToolCurrency)
      )
    ).toBe(true)
    expect(
      new D(entry.unrecovered.inQuoteCurrency).eq(
        new D(entry.committed.inQuoteCurrency).minus(entry.attributedWithinPeriods.inQuoteCurrency)
      )
    ).toBe(true)
    expect(new D(entry.unrecovered.inToolCurrency).eq(new D(annualPrice.amount).mul(11).div(12))).toBe(true)
  })

  it('counts a seat the quote holds whole as stranded if nothing else uses it, and names it in a signal', () => {
    expect(entry.sharing.basis).toBe('sole_declared_user')
    expect(entry.strandedIfNothingElseUsesIt).toEqual(entry.unrecovered)
    expect(new D(entry.releasedToSharedCapacity.inQuoteCurrency!).isZero()).toBe(true)
    expect(reading.totals.annualPrices.strandedIfNothingElseUsesIt).toBe(entry.unrecovered.inQuoteCurrency)

    const signal = reading.signals.find(s => s.code === 'COMMITMENT_OUTLIVES_ENGAGEMENT')!

    expect(signal).toMatchObject({
      toolId: 'microsoft-365',
      periodIds: [1],
      amount: entry.unrecovered.inQuoteCurrency,
      currency: 'CLP'
    })
    expect(reading.signals.some(s => s.code === 'SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT')).toBe(false)
  })

  it('does not present the commitment or the attributed cost as new cash', () => {
    expect(entry.incrementalCash).toBeNull()
    expect(entry.notDerivable.map(n => n.field)).toContain('incrementalCash')
    expect(result.resourceIncrementalCash).toEqual([])
    expect(new D(reading.totals.creditPacks.incrementalCash).isZero()).toBe(true)
  })

  it('reports the monthly prices the policy holds for the same seat, costed by the kernel on a twin quote', () => {
    // Every seat price per month of the same tool in the policy, whatever its name.
    const monthlySeats = tool.prices
      .filter((p: { basis: string; price?: { unit: string } }) => p.basis === 'seat' && p.price?.unit === 'month')
      .map((p: { priceId: string }) => p.priceId)

    const comparable = entry.shorterCommitmentPrices.filter(price => price.costOverQuotedPeriods !== null)

    expect(monthlySeats).toContain(MONTHLY_SEAT)
    expect(comparable.map(price => price.priceId).sort()).toEqual([...monthlySeats].sort())
    expect(entry.shorterCommitmentPrices.every(price => price.unit === 'month')).toBe(true)
    expect(entry.shorterCommitmentPrices.map(price => price.priceId)).not.toContain(ANNUAL_SEAT)

    // The verifier of each alternative is the kernel: the same quote composed on that monthly price.
    for (const price of comparable) {
      const twinArtifact = calculated(compose({ periods: 1, microsoftPriceId: price.priceId }))
      const twin = twinArtifact.semantic.result
      const twinCost = kernelCost(twin, 'microsoft-365')

      expect(new D(price.costOverQuotedPeriods!.inQuoteCurrency!).eq(twinCost)).toBe(true)
      expect(
        new D(price.extraCostOverQuotedPeriods!).eq(twinCost.minus(entry.attributedWithinPeriods.inQuoteCurrency))
      ).toBe(true)
      expect(new D(price.commitmentNotTaken!).eq(new D(entry.committed.inQuoteCurrency).minus(twinCost))).toBe(true)

      // And the twin itself commits nothing past its month.
      expect(annualLedger(twin)).toEqual([])
      expect(commitmentExposure(twinArtifact).commitments).toEqual([])
    }

    // A price sold another way is listed without a cost: the quantity of the quote does not transfer to it.
    for (const price of entry.shorterCommitmentPrices.filter(p => p.costOverQuotedPeriods === null)) {
      expect(price.basis).not.toBe('seat')
      expect(price.extraCostOverQuotedPeriods).toBeNull()
      expect(price.notDerivable).toBeTypeOf('string')
    }

    const signals = reading.signals.filter(s => s.code === 'SHORTER_COMMITMENT_PRICE_IN_POLICY')

    expect(signals.map(s => s.amount).sort()).toEqual(comparable.map(price => price.extraCostOverQuotedPeriods).sort())
  })

  it('lists nothing for the tools priced per month and says their term is unknown, not absent', () => {
    expect(annualEntries(reading).map(e => e.toolId)).toEqual(['microsoft-365'])
    expect(reading.notDerivable.find(n => n.code === 'CONTRACT_TERM_NOT_FROZEN')?.toolIds.sort()).toEqual([
      'adobe',
      'notion'
    ])
  })

  it('the same seat on its monthly price leaves nothing behind', () => {
    const monthly = calculated(compose({ periods: 1, microsoftPriceId: MONTHLY_SEAT }))
    const empty = commitmentExposure(monthly)

    expect(empty.commitments).toEqual([])
    expect(empty.signals).toEqual([])
    expect(empty.totals.commitments).toBe(0)
    expect(new D(empty.totals.annualPrices.unrecovered).isZero()).toBe(true)
    expect(empty.reviewed.annualPriceUses).toBe(0)
  })
})

describe('the same engagement over the term of the price', () => {
  it('at twelve periods the year is used to its last month: no entry, though the quote still commits it', () => {
    const artifact = calculated(compose({ periods: 12, microsoftPriceId: ANNUAL_SEAT }))
    const reading = commitmentExposure(artifact)

    // The commitment is still in the ledger of the quote; it is the reading that has nothing left to report.
    expect(annualLedger(artifact.semantic.result)).toHaveLength(1)
    expect(reading.reviewed.annualPriceUses).toBe(1)
    expect(entryOf(reading, 'microsoft-365')).toBeUndefined()
    expect(reading.commitments).toEqual([])
    expect(reading.signals).toEqual([])
    expect(reading.engagement.endsOn).toBe('2027-09-30')
  })

  it('at thirteen periods a second year opens and eleven of its months are left', () => {
    const artifact = calculated(compose({ periods: 13, microsoftPriceId: ANNUAL_SEAT }))
    const result = artifact.semantic.result
    const entry = entryOf(commitmentExposure(artifact), 'microsoft-365')!

    expect(annualLedger(result).map(c => c.periodId)).toEqual([1, 13])
    expect(entry.commitment).toMatchObject({
      terms: 2,
      monthsCommitted: 24,
      monthsWithinQuote: 13,
      monthsBeyondQuote: 11
    })
    expect(entry.committed.inQuoteCurrency).toBe(sum(annualLedger(result).map(c => c.amount)).toFixed(0))
    expect(new D(entry.attributedWithinPeriods.inQuoteCurrency).eq(kernelCost(result, 'microsoft-365'))).toBe(true)
  })

  it('at three periods nine months are left, and the monthly price is costed over the three', () => {
    const artifact = calculated(compose({ periods: 3, microsoftPriceId: ANNUAL_SEAT }))
    const entry = entryOf(commitmentExposure(artifact), 'microsoft-365')!
    const twin = calculated(compose({ periods: 3, microsoftPriceId: MONTHLY_SEAT })).semantic.result
    const monthly = entry.shorterCommitmentPrices.find(price => price.priceId === MONTHLY_SEAT)!

    expect(entry.commitment).toMatchObject({ terms: 1, monthsWithinQuote: 3, monthsBeyondQuote: 9 })
    expect(new D(monthly.costOverQuotedPeriods!.inQuoteCurrency!).eq(kernelCost(twin, 'microsoft-365'))).toBe(true)
    expect(new D(monthly.extraCostPerMonth!).mul(3).eq(monthly.extraCostOverQuotedPeriods!)).toBe(true)
  })
})

describe('a seat the demand declares as shared capacity', () => {
  const whole = commitmentExposure(calculated(compose({ periods: 1, microsoftPriceId: ANNUAL_SEAT })))

  const artifact = calculated(
    compose({
      periods: 1,
      microsoftPriceId: ANNUAL_SEAT,
      microsoftUnits: { total: '160', allocated: '80', share: '0.5' }
    })
  )

  const reading = commitmentExposure(artifact)
  const entry = entryOf(reading, 'microsoft-365')!

  it('commits only the share of the quote, as the ledger does', () => {
    expect(entry.committed.inQuoteCurrency).toBe(annualLedger(artifact.semantic.result)[0].amount)
    expect(
      new D(entry.committed.inQuoteCurrency).mul(2).eq(entryOf(whole, 'microsoft-365')!.committed.inQuoteCurrency)
    ).toBe(true)
    expect(entry.sharing).toMatchObject({ basis: 'shared_declared_capacity', quoteShare: '0.5' })
  })

  it('is not stranded by this quote ending: its share is released to the pool and kept out of the stranded total', () => {
    expect(new D(entry.unrecovered.inQuoteCurrency).gt(0)).toBe(true)
    expect(new D(entry.strandedIfNothingElseUsesIt.inQuoteCurrency!).isZero()).toBe(true)
    expect(new D(entry.strandedIfNothingElseUsesIt.inToolCurrency).isZero()).toBe(true)
    expect(entry.releasedToSharedCapacity).toEqual(entry.unrecovered)
    expect(new D(reading.totals.annualPrices.strandedIfNothingElseUsesIt).isZero()).toBe(true)
    expect(reading.totals.annualPrices.releasedToSharedCapacity).toBe(entry.unrecovered.inQuoteCurrency)

    expect(reading.signals.map(s => s.code)).toContain('SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT')
    expect(reading.signals.map(s => s.code)).not.toContain('COMMITMENT_OUTLIVES_ENGAGEMENT')
    // Who holds the rest of the pool is not in the artifact, and the reading says so.
    expect(entry.notDerivable.map(n => n.field)).toContain('sharing.restOfPool')
  })
})

describe('a price per month under a contract term the policy declares', () => {
  // Adobe as it is contracted: a package of three seats, invoiced month by month, bound for a year. The policy is
  // v6 with that term declared on the price the quote selects; the designer uses one of the three seats.
  const ONE_SEAT_OF_THREE = { unit: 'assigned-user-seat', total: '3', allocated: '1', share: '0.333333333333333333' }
  const termed = policyWithAdobeTerms({ current: 12 })
  const adobe = policy.tools.find((t: { toolId: string }) => t.toolId === 'adobe')
  const packagePrice = adobe.prices.find((p: PolicyPrice) => p.priceId === 'current').price

  const read = (options: Parameters<typeof demandFor>[0], withPolicy: unknown = termed) => {
    const artifact = calculated(compose(options, withPolicy))

    return { artifact, result: artifact.semantic.result, reading: commitmentExposure(artifact) }
  }

  const termedOf = (reading: Reading) => termedEntries(reading).find(entry => entry.toolId === 'adobe')

  const termNotFrozen = (reading: Reading) =>
    [...(reading.notDerivable.find(n => n.code === 'CONTRACT_TERM_NOT_FROZEN')?.toolIds ?? [])].sort()

  describe('one period on one of the three seats', () => {
    const { artifact, result, reading } = read({
      periods: 1,
      microsoftPriceId: MONTHLY_SEAT,
      adobeUnits: ONE_SEAT_OF_THREE
    })

    const entry = termedOf(reading)!
    const attribution = result.attributions.find(a => a.toolId === 'adobe')!
    const monthInQuote = kernelCost(result, 'adobe')

    it('the term never reaches the calculation: the quote is the one the policy without it composes', () => {
      const plain = calculated(
        compose({ periods: 1, microsoftPriceId: MONTHLY_SEAT, adobeUnits: ONE_SEAT_OF_THREE })
      )

      expect(artifact.semantic.result).toEqual(plain.semantic.result)
      // And without the declaration there is nothing to read, only a term nobody declared.
      expect(commitmentExposure(plain).commitments).toEqual([])
      expect(termNotFrozen(commitmentExposure(plain))).toEqual(['adobe', 'microsoft-365', 'notion'])
    })

    it('lists the year the contract binds: twelve months committed, one attributed, eleven left', () => {
      expect(packagePrice.unit).toBe('month')
      expect(entry.priceId).toBe('current')
      expect(entry.periodIds).toEqual([1])
      expect(entry.commitment).toMatchObject({
        unit: 'month',
        termMonths: 12,
        terms: 1,
        coversPeriods: { from: 1, through: 12 },
        monthsCommitted: 12,
        monthsWithinQuote: 1,
        monthsBeyondQuote: 11,
        unitPrice: packagePrice.amount,
        quantity: '1'
      })

      // In the currency of the tool, against the policy price: a third of the package, each month.
      const seat = new D(packagePrice.amount).div(3)

      expect(new D(attribution.attributedMonthlyCost).toFixed(2)).toBe(seat.toFixed(2))
      expect(entry.currency).toBe(packagePrice.currency)
      expect(new D(entry.monthlyAmount.inToolCurrency).eq(seat)).toBe(true)
      expect(new D(entry.committed.inToolCurrency).eq(seat.mul(12))).toBe(true)
      expect(new D(entry.attributedWithinPeriods.inToolCurrency).eq(seat)).toBe(true)
      expect(new D(entry.unrecovered.inToolCurrency).eq(seat.mul(11))).toBe(true)

      // In the currency of the quote, against what the kernel costed for the one month.
      expect(entry.attributedWithinPeriods.inQuoteCurrency).toBe(monthInQuote.toFixed(0, D.ROUND_HALF_UP))
      expect(entry.committed.inQuoteCurrency).toBe(monthInQuote.mul(12).toFixed(0, D.ROUND_HALF_UP))
      expect(entry.unrecovered.inQuoteCurrency).toBe(monthInQuote.mul(11).toFixed(0, D.ROUND_HALF_UP))
      expect(new D(entry.unrecovered.inQuoteCurrency!).gt(0)).toBe(true)
    })

    it('is declared by the policy and paid month by month: the ledger of the quote holds no year of it', () => {
      expect(entry.commitment.billing).toBe('monthly')
      expect(new D(entry.paidUpFront.inQuoteCurrency!).isZero()).toBe(true)
      expect(new D(entry.paidUpFront.inToolCurrency).isZero()).toBe(true)

      // The kernel booked the month it bills and nothing else: no ledger row is a year, and the reading does not
      // count the term among the years the kernel booked.
      expect(annualLedger(result)).toEqual([])
      expect(annualEntries(reading)).toEqual([])
      expect(reading.totals.annualPrices.count).toBe(0)
      expect(new D(reading.totals.annualPrices.committed).isZero()).toBe(true)
      expect(reading.totals.termedMonthlyPrices.count).toBe(1)
      expect(reading.totals.termedMonthlyPrices.committed).toBe(entry.committed.inQuoteCurrency)
      expect(reading.totals.termedMonthlyPrices.unrecovered).toBe(entry.unrecovered.inQuoteCurrency)
      expect(reading.totals.commitments).toBe(1)
      expect(reading.reviewed.termedMonthlyPriceUses).toBe(1)

      // Not new cash: whether the package is already contracted is not in the artifact.
      expect(entry.incrementalCash).toBeNull()
      expect(entry.notDerivable.map(n => n.field)).toEqual(
        expect.arrayContaining(['incrementalCash', 'commitment.termStart'])
      )
    })

    it('a seat of a shared package is released to it, not stranded by the quote ending', () => {
      expect(entry.sharing).toMatchObject({
        basis: 'shared_declared_capacity',
        quoteShare: attribution.serviceShare,
        priceBasis: 'package',
        includedSeats: 3,
        seatCapacity: 3,
        restSitsIn: 'shared_package'
      })
      expect(new D(entry.strandedIfNothingElseUsesIt.inQuoteCurrency!).isZero()).toBe(true)
      expect(new D(entry.strandedIfNothingElseUsesIt.inToolCurrency).isZero()).toBe(true)
      expect(entry.releasedToSharedCapacity).toEqual(entry.unrecovered)
      expect(new D(reading.totals.termedMonthlyPrices.strandedIfNothingElseUsesIt).isZero()).toBe(true)
      expect(reading.totals.termedMonthlyPrices.releasedToSharedCapacity).toBe(entry.unrecovered.inQuoteCurrency)
      expect(entry.notDerivable.map(n => n.field)).toContain('sharing.restOfPool')

      const named = reading.signals.filter(s => s.toolId === 'adobe' && s.code.endsWith('OUTLIVES_ENGAGEMENT'))

      expect(named).toHaveLength(1)
      expect(named[0]).toMatchObject({
        code: 'SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT',
        periodIds: [1],
        amount: entry.unrecovered.inQuoteCurrency,
        currency: 'CLP'
      })
    })

    it('is no longer a term nobody declared; the tools whose price declares none still are', () => {
      expect(termNotFrozen(reading)).toEqual(['microsoft-365', 'notion'])
      expect(reading.notDerivable.map(n => n.code)).not.toContain('CONTRACT_RENEWAL_NOT_DECLARED')
    })
  })

  it('the whole package held by the quote is stranded if nothing else uses it', () => {
    const { result, reading } = read({ periods: 1, microsoftPriceId: MONTHLY_SEAT })
    const entry = termedOf(reading)!
    const monthInQuote = kernelCost(result, 'adobe')

    expect(new D(entry.committed.inToolCurrency).eq(new D(packagePrice.amount).mul(12))).toBe(true)
    expect(entry.unrecovered.inQuoteCurrency).toBe(monthInQuote.mul(11).toFixed(0, D.ROUND_HALF_UP))
    expect(entry.sharing).toMatchObject({ basis: 'sole_declared_user', quoteShare: '1', includedSeats: 3 })
    expect(entry.sharing).not.toHaveProperty('restSitsIn')
    expect(entry.strandedIfNothingElseUsesIt).toEqual(entry.unrecovered)
    expect(new D(entry.releasedToSharedCapacity.inQuoteCurrency!).isZero()).toBe(true)
    expect(reading.totals.termedMonthlyPrices.strandedIfNothingElseUsesIt).toBe(entry.unrecovered.inQuoteCurrency)
    expect(entry.notDerivable.map(n => n.field)).not.toContain('sharing.restOfPool')

    expect(reading.signals.filter(s => s.toolId === 'adobe').map(s => s.code)).toContain(
      'COMMITMENT_OUTLIVES_ENGAGEMENT'
    )
    expect(reading.signals.map(s => s.code)).not.toContain('SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT')
  })

  it('at three periods nine months are left, on the cost the kernel stored for the three', () => {
    const { result, reading } = read({ periods: 3, microsoftPriceId: MONTHLY_SEAT, adobeUnits: ONE_SEAT_OF_THREE })
    const entry = termedOf(reading)!

    expect(entry.periodIds).toEqual([1, 2, 3])
    expect(entry.commitment).toMatchObject({ monthsCommitted: 12, monthsWithinQuote: 3, monthsBeyondQuote: 9 })
    expect(entry.attributedWithinPeriods.inQuoteCurrency).toBe(
      kernelCost(result, 'adobe').toFixed(0, D.ROUND_HALF_UP)
    )
    expect(entry.committed.inQuoteCurrency).toBe(kernelCost(result, 'adobe', 1).mul(12).toFixed(0, D.ROUND_HALF_UP))
    expect(entry.unrecovered.inQuoteCurrency).toBe(kernelCost(result, 'adobe', 1).mul(9).toFixed(0, D.ROUND_HALF_UP))
  })

  it('at twelve periods the term is used to its last month: looked at, nothing left to report', () => {
    const { reading } = read({ periods: 12, microsoftPriceId: MONTHLY_SEAT, adobeUnits: ONE_SEAT_OF_THREE })

    expect(reading.reviewed.termedMonthlyPriceUses).toBe(1)
    expect(reading.commitments).toEqual([])
    expect(reading.signals).toEqual([])
    expect(reading.totals.termedMonthlyPrices.count).toBe(0)
    expect(termNotFrozen(reading)).toEqual(['microsoft-365', 'notion'])
    expect(reading.notDerivable.map(n => n.code)).not.toContain('CONTRACT_RENEWAL_NOT_DECLARED')
  })

  // Renewal convention. A declared term is ONE term from the first quoted period that uses the price: the policy
  // says how long the contract binds, not what happens when it ends, and the kernel books nothing that would say.
  // So a thirteenth period opens no second term (a price per year does: the ledger itself charges a second year,
  // see 'at thirteen periods a second year opens' above). The reading says the renewal is unknown instead.
  it('at thirteen periods no second term is assumed, and the renewal is reported as not declared', () => {
    const { reading } = read({ periods: 13, microsoftPriceId: MONTHLY_SEAT, adobeUnits: ONE_SEAT_OF_THREE })

    expect(reading.reviewed.termedMonthlyPriceUses).toBe(1)
    expect(termedEntries(reading)).toEqual([])
    expect(reading.commitments).toEqual([])
    expect(reading.signals).toEqual([])
    expect(reading.notDerivable.find(n => n.code === 'CONTRACT_RENEWAL_NOT_DECLARED')?.toolIds).toEqual(['adobe'])
    // Unknown renewal, not an undeclared term.
    expect(termNotFrozen(reading)).toEqual(['microsoft-365', 'notion'])
  })

  describe('other prices of the same package in the policy', () => {
    const options = { periods: 1, microsoftPriceId: MONTHLY_SEAT, adobeUnits: ONE_SEAT_OF_THREE }
    // The verifier of an alternative is the kernel: the same quote composed on that price.
    const twinMonth = kernelCost(calculated(compose({ ...options, adobePriceId: 'renewal-scenario' })).semantic.result, 'adobe')

    it('lists the one that declares no term, costed over the quoted periods, and only prices sold the same way', () => {
      const { reading } = read(options)
      const entry = termedOf(reading)!

      // Policy v6 holds two prices for the package of three seats; the third is a package with no seats stated.
      expect(entry.shorterCommitmentPrices.map(price => price.priceId)).toEqual(['renewal-scenario'])

      const [price] = entry.shorterCommitmentPrices

      expect(price).not.toHaveProperty('commitmentTermMonths')
      expect(new D(price.costOverQuotedPeriods!.inQuoteCurrency!).eq(twinMonth.toFixed(0, D.ROUND_HALF_UP))).toBe(true)
      expect(
        new D(price.extraCostOverQuotedPeriods!).eq(
          new D(price.costOverQuotedPeriods!.inQuoteCurrency!).minus(entry.attributedWithinPeriods.inQuoteCurrency)
        )
      ).toBe(true)
      // Taking it, the quote would commit its one month instead of the year.
      expect(
        new D(price.commitmentNotTaken!).eq(
          new D(entry.committed.inQuoteCurrency!).minus(price.costOverQuotedPeriods!.inQuoteCurrency!)
        )
      ).toBe(true)
      expect(reading.signals.filter(s => s.code === 'SHORTER_COMMITMENT_PRICE_IN_POLICY').map(s => s.amount)).toEqual([
        price.extraCostOverQuotedPeriods
      ])
    })

    it('a price bound for as long is not a shorter commitment; one bound for less is listed with its own term', () => {
      const asLong = termedOf(read(options, policyWithAdobeTerms({ current: 12, 'renewal-scenario': 12 })).reading)!

      expect(asLong.shorterCommitmentPrices).toEqual([])

      const shorter = termedOf(read(options, policyWithAdobeTerms({ current: 12, 'renewal-scenario': 6 })).reading)!
      const [price] = shorter.shorterCommitmentPrices

      expect(price).toMatchObject({ priceId: 'renewal-scenario', commitmentTermMonths: 6 })
      // It would still bind its own six months, not only the quoted one.
      expect(
        new D(price.commitmentNotTaken!).eq(
          new D(shorter.committed.inQuoteCurrency!).minus(twinMonth.mul(6).toFixed(0, D.ROUND_HALF_UP))
        )
      ).toBe(true)
    })

    it('a year the kernel booked is not offered a monthly price bound for as long as the year', () => {
      const microsoft = (withPolicy: unknown) =>
        entryOf(
          commitmentExposure(calculated(compose({ periods: 1, microsoftPriceId: ANNUAL_SEAT }, withPolicy))),
          'microsoft-365'
        )!.shorterCommitmentPrices.map(price => price.priceId)

      const bound = clone(policy)

      bound.tools
        .find((t: { toolId: string }) => t.toolId === 'microsoft-365')
        .prices.find((p: PolicyPrice) => p.priceId === MONTHLY_SEAT).commitmentTermMonths = 12

      expect(microsoft(policy)).toContain(MONTHLY_SEAT)
      expect(microsoft(bound)).not.toContain(MONTHLY_SEAT)
      expect(microsoft(bound).length).toBe(microsoft(policy).length - 1)
    })
  })
})

describe('credit packs bigger than their use', () => {
  // Four periods from 2026-10-11: the engagement ends on 2027-01-31. Higgsfield packs are valid 90 days, Magnific
  // packs three years (credit catalog v1), so the pack of period 1 lapses inside the engagement for one provider
  // and long after it for the other. Period 2 buys a Higgsfield pack that fits exactly.
  const artifact = calculated(
    compose({
      periods: 4,
      microsoftPriceId: MONTHLY_SEAT,
      credits: [
        { toolId: 'higgsfield', periodId: 1, credits: 450, fromSubscription: 400 },
        { toolId: 'higgsfield', periodId: 2, credits: 500, fromSubscription: 400 },
        { toolId: 'higgsfield', periodId: 3, credits: 400, fromSubscription: 400 },
        { toolId: 'higgsfield', periodId: 4, credits: 450, fromSubscription: 400 },
        { toolId: 'magnific', periodId: 1, credits: 5000, fromSubscription: 2000 },
        { toolId: 'magnific', periodId: 2, credits: 2000, fromSubscription: 2000 },
        { toolId: 'magnific', periodId: 3, credits: 2000, fromSubscription: 2000 },
        { toolId: 'magnific', periodId: 4, credits: 2000, fromSubscription: 2000 }
      ]
    })
  )

  const result = artifact.semantic.result
  const reading = commitmentExposure(artifact)
  const packs = creditEntries(reading)

  const packOf = (toolId: string, periodId: number) =>
    packs.find(e => e.toolId === toolId && e.periodIds[0] === periodId)

  const budgetOf = (toolId: string, periodId: number) =>
    result.creditBudgets.find(b => b.toolId === toolId && b.periodId === periodId)!.result.breakdown!

  it('lists only the packs that leave credits over, with the plan the artifact froze', () => {
    expect(reading.engagement.endsOn).toBe('2027-01-31')

    const leftOver = result.creditBudgets.filter(b => b.result.breakdown!.extra.remainingCredits > 0)

    expect(packs.map(e => `${e.toolId}:${e.periodIds[0]}`).sort()).toEqual(
      leftOver.map(b => `${b.toolId}:${b.periodId}`).sort()
    )
    // The pack that fits exactly and the periods with no pack are not commitments.
    expect(budgetOf('higgsfield', 2).extra.purchasedCredits).toBeGreaterThan(0)
    expect(packOf('higgsfield', 2)).toBeUndefined()
    expect(packOf('higgsfield', 3)).toBeUndefined()

    for (const entry of packs) {
      const { extra, subscription } = budgetOf(entry.toolId, entry.periodIds[0])

      expect(entry.credits).toEqual({
        requested: extra.requestedCredits + subscription.allocatedCredits,
        fromSubscription: subscription.allocatedCredits,
        fromPacks: extra.requestedCredits,
        purchased: extra.purchasedCredits,
        leftOver: extra.remainingCredits
      })
      expect(entry.credits.purchased - entry.credits.fromPacks).toBe(entry.credits.leftOver)
      expect(entry.packs).toEqual(extra.packages)
      expect(entry.expiry.expiresAt).toBe(extra.expiresAt)
    }
  })

  it('tells a pack that lapses inside the engagement from one that stays valid after it', () => {
    const inside = packOf('higgsfield', 1)!
    const after = packOf('magnific', 1)!
    const lastPeriod = packOf('higgsfield', 4)!

    // Read from the plan: the 90-day pack bought on the quote date ends before the engagement does.
    expect(inside.expiry.expiresAt! <= reading.engagement.endsOn).toBe(true)
    expect(inside.expiry.leftOverLapses).toBe('within_engagement')
    expect(inside.expiry.daysPastEngagementEnd).toBeLessThanOrEqual(0)

    expect(after.expiry.expiresAt! > reading.engagement.endsOn).toBe(true)
    expect(after.expiry.leftOverLapses).toBe('after_engagement')
    expect(after.expiry.daysPastEngagementEnd).toBeGreaterThan(365)

    // The same provider in the last period: its 90 days run past the end.
    expect(lastPeriod.expiry.leftOverLapses).toBe('after_engagement')
    expect(lastPeriod.expiry.daysPastEngagementEnd).toBeGreaterThan(0)
    expect(lastPeriod.expiry.daysPastEngagementEnd).toBeLessThan(90)

    const codeOf = (entry: CreditEntry) =>
      reading.signals.find(s => s.toolId === entry.toolId && s.periodIds[0] === entry.periodIds[0])!.code

    expect(codeOf(inside)).toBe('CREDITS_LAPSE_WITHIN_ENGAGEMENT')
    expect(codeOf(after)).toBe('CREDITS_LEFT_OVER_AFTER_ENGAGEMENT')
    expect(codeOf(lastPeriod)).toBe('CREDITS_LEFT_OVER_AFTER_ENGAGEMENT')
  })

  it('reports as cash the packs only: the subscription share is attributed cost, not new cash', () => {
    for (const entry of packs) {
      const breakdown = budgetOf(entry.toolId, entry.periodIds[0])

      const cash = result.resourceIncrementalCash.find(
        c => c.toolId === entry.toolId && c.periodId === entry.periodIds[0]
      )!

      expect(new D(entry.incrementalCash.inToolCurrency).eq(cash.amount)).toBe(true)
      // The budget cost the quote attributes includes the subscription share; it is more than the cash.
      expect(new D(breakdown.subscription.attributedCost).gt(0)).toBe(true)
      expect(new D(entry.incrementalCash.inToolCurrency).lt(breakdown.totalBudgetCost)).toBe(true)
      expect(entry.subscription).toEqual({
        attributedCost: breakdown.subscription.attributedCost,
        newCash: breakdown.subscription.newCash
      })

      // The quote assigns the whole pack to the client: none of its cost is unrecovered.
      expect(new D(entry.unrecovered.inToolCurrency).isZero()).toBe(true)
      expect(new D(entry.paidForLeftOver.inToolCurrency).lt(entry.incrementalCash.inToolCurrency)).toBe(true)
      expect(new D(entry.paidForLeftOver.inToolCurrency).gt(0)).toBe(true)

      // In the quote currency the FX is the one the kernel applied to the cost of the same budget.
      const costInQuote = kernelCost(result, entry.toolId, entry.periodIds[0])

      expect(
        new D(entry.incrementalCash.inQuoteCurrency!).eq(
          costInQuote.mul(cash.amount).div(breakdown.totalBudgetCost).toFixed(0, D.ROUND_HALF_UP)
        )
      ).toBe(true)
    }

    expect(new D(reading.totals.creditPacks.incrementalCash).gt(0)).toBe(true)
    expect(new D(reading.totals.creditPacks.unrecovered).isZero()).toBe(true)
    // Credits are not a year of anything.
    expect(annualEntries(reading)).toEqual([])
  })
})

describe('a quote that is not calculated', () => {
  it('returns an empty, well-formed reading that says why, instead of failing', () => {
    const demand = demandFor({ periods: 1, microsoftPriceId: ANNUAL_SEAT })

    demand.allocations = demand.allocations.filter(a => a.toolId !== 'adobe')

    const artifact = runResourceComposition(catalog, policy, credits, demand, '2026-10-11T00:00:00.000Z')

    expect(artifact.semantic.result.quote.calculationStatus).toBe('needs_input')

    const reading = commitmentExposure(artifact)

    expect(reading.schemaVersion).toBe(COMMITMENT_EXPOSURE_VERSION)
    expect(reading.calculationStatus).toBe('needs_input')
    expect(reading.currency).toBe('CLP')
    expect(reading.commitments).toEqual([])
    expect(reading.signals).toEqual([])
    expect(reading.totals.commitments).toBe(0)
    expect(reading.notDerivable.map(n => n.code)).toEqual(['QUOTE_NOT_CALCULATED'])
  })
})
