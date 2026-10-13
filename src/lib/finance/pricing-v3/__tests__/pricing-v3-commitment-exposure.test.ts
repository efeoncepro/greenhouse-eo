// Commitment exposure: what a frozen composed quote leaves committed after its last period
// (resources/commitment-exposure.ts).
//
// The reading derives from the frozen artifact and recalculates nothing, so its verifiers are the artifact and the
// kernel: every expectation below is read from what the composition froze (the cash ledger of the quote, the kernel
// components, the attributions, the credit plan), from the committed policy the quote was composed with, or from a
// second quote composed by `composeResourceQuote` with one input changed (the same seat on its monthly price, the
// same engagement over twelve periods, the same policy with or without a declared contract term or the date it
// renews). Nothing asserts the text of the module, and no expected amount comes from a previous run of the reader.
// Dates and months of a running term are stated in each case from the calendar, with the reasoning in its name.
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
type PolicyPrice = {
  priceId: string
  basis: string
  commitmentTermMonths?: number
  commitmentRenewsOn?: string
  price?: { amount: string }
}

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

/**
 * Ledger key of every component the kernel priced per year, as the quote groups them: resource, scope and scope
 * reference. Read from the frozen rows and the input they were calculated from, never from the names in the ledger.
 */
const annualLedgerKeys = (result: Composition) =>
  new Set(
    result.quote.periods.flatMap(period => {
      const input = result.quote.resolution.inputs.find(i => i.periodId === period.periodId)!.input

      return period.result.lines.flatMap(row =>
        row.components
          .filter(component => component.trace.unit === 'year')
          .map(component => {
            const assignment = input.request.lines
              .find(line => line.lineId === row.parentLineId)!
              .assignments.find(a => a.allocationId === component.componentId)!

            return `${assignment.resourceId}:${component.trace.scope}:${component.trace.scopeRef}`
          })
      )
    })
  )

/** Rows the quote froze in its cash ledger for year-priced resources, and for nothing else. */
const annualLedger = (result: Composition) => {
  const keys = annualLedgerKeys(result)

  return result.quote.cashLedger.filter(c => keys.has(c.key))
}

/** Rows of re-invoiced third-party costs (contract 1.4.0), one per cost and period; none in an earlier quote. */
const thirdPartyRows = (result: Composition) =>
  result.quote.periods.flatMap(period => period.result.lines.filter(row => row.kind === 'third_party'))

/** The entry the cash ledger gives each of those rows, named after the cost it belongs to. */
const thirdPartyLedger = (result: Composition) => {
  const keys = new Set(thirdPartyRows(result).map(row => `third-party:${row.parentLineId}`))

  return result.quote.cashLedger.filter(c => keys.has(c.key))
}

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

    // The ledger of a quote is the entry of the team, the years of its year-priced resources and one entry per
    // third-party row. Every entry is one of the three: nothing in it is read here under a name it does not have.
    const purchases = thirdPartyRows(result)

    expect(
      result.quote.cashLedger.filter(c => c.key === 'human-monthly-and-once').length +
        annualLedger(result).length +
        thirdPartyLedger(result).length
    ).toBe(result.quote.cashLedger.length)
    expect(thirdPartyLedger(result)).toHaveLength(purchases.length)

    // A purchase from a supplier is seen and counted, and is no commitment: no entry, no signal and no total has it.
    if (purchases.length) {
      expect(reading.reviewed.thirdPartyPurchasesOutsideThisReading).toBe(purchases.length)
      expect(reading.notDerivable.map(entry => entry.code)).toContain('THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN')
    } else {
      expect(reading.reviewed).not.toHaveProperty('thirdPartyPurchasesOutsideThisReading')
      expect(reading.notDerivable.map(entry => entry.code)).not.toContain('THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN')
    }

    const listed = JSON.stringify([reading.commitments, reading.signals, reading.totals])

    for (const row of purchases) {
      // Neither the cost, nor its ledger entry, nor its row is named anywhere a commitment is.
      expect(listed).not.toContain(JSON.stringify(row.parentLineId))
      expect(listed).not.toContain(`third-party:${row.parentLineId}`)
      expect(listed).not.toContain(row.lineId)
    }

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
      // A committed policy may come to declare the date its contract renews; the term is then read as running.
      const renewsOn = selectedPrice(artifact.semantic.policy, attributions[0])?.commitmentRenewsOn
      const last = attributions[attributions.length - 1]

      const inToolCurrency = (value: Decimal) =>
        value.toFixed(entry.committed.inToolCurrency.split('.')[1]?.length ?? 0, D.ROUND_HALF_UP)

      expect(entry.commitment.termMonths).toBe(term)
      expect(entry.periodIds).toEqual(attributions.map(a => a.periodId))
      expect(entry.commitment.monthsBeyondQuote).toBeGreaterThan(0)
      expect(entry.commitment.billing).toBe('monthly')

      // Declared by the policy, not booked by the kernel: the quote has no ledger row for this resource.
      expect(result.quote.cashLedger.filter(c => c.key.startsWith(`${entry.resourceId}:`))).toEqual([])

      if (renewsOn) {
        // Bound until a renewal after the last quoted period that uses the price, and committed for what the quote
        // attributes plus the months up to it: never a whole term assumed from the first quoted month.
        const [year, month] = demand.brief.quoteDate.split('-').map(Number)
        const lastQuotedDay = new Date(Date.UTC(year, month - 1 + last.periodId, 0)).toISOString().slice(0, 10)

        expect(entry.commitment.termStartKnown).toBe(true)
        expect(entry.commitment.renewsOn).toBe(renewsOn)
        expect(entry.commitment.boundUntil! > lastQuotedDay).toBe(true)
        expect(entry.commitment.monthsCommitted).toBe(entry.periodIds.length + entry.commitment.monthsBeyondQuote)
        expect(entry.unrecovered.inToolCurrency).toBe(
          inToolCurrency(new D(last.attributedMonthlyCost).mul(entry.commitment.monthsBeyondQuote))
        )
        expect(entry.notDerivable.map(n => n.field)).not.toContain('commitment.termStart')
      } else {
        // One term, the one the policy declares: it opens in the first period and the quote stops before it does.
        expect(entry.commitment.monthsBeyondQuote).toBe(term - entry.periodIds.length)
        expect(entry.commitment).not.toHaveProperty('termStartKnown')
        // committed = the monthly amount the attribution froze x the term.
        expect(entry.committed.inToolCurrency).toBe(
          inToolCurrency(new D(attributions[0].attributedMonthlyCost).mul(term))
        )
      }

      // attributed = what the kernel costed.
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
        new D((renewsOn ? last : attributions[0]).serviceShare).lt(1)
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

    // One signal names each commitment, with its tool, its periods and its amount. A cheaper price in the policy and
    // a renewal inside the engagement are said besides it, under their own codes.
    for (const entry of reading.commitments) {
      const named = reading.signals.filter(
        signal =>
          signal.toolId === entry.toolId &&
          signal.code !== 'SHORTER_COMMITMENT_PRICE_IN_POLICY' &&
          signal.code !== 'COMMITMENT_RENEWS_WITHIN_ENGAGEMENT'
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

describe('a contract term already running: the policy also declares the date it renews', () => {
  // The real case: Adobe, an annual plan paid monthly that renews by itself on 16 November 2026, 36 days after the
  // quote date. Policy v8 as committed (a package of three seats, bound for twelve months) with that date declared
  // on the price the quote selects; the designer uses one of the three seats. A quoted period is a calendar month:
  // period 1 is October 2026.
  const ONE_SEAT_OF_THREE = { unit: 'assigned-user-seat', total: '3', allocated: '1', share: '0.333333333333333333' }
  const policyV8 = read('data/pricing/v3-operating/resources.review-v8.json')
  const adobeOf = (source: typeof policyV8) => source.tools.find((t: { toolId: string }) => t.toolId === 'adobe')
  const packagePrice = adobeOf(policyV8).prices.find((p: PolicyPrice) => p.priceId === 'current').price

  /** Policy v8 with the term and the renewal date under test on Adobe `current`; `null` declares no date. */
  const policyRenewing = (renewsOn: string | null, termMonths = 12) => {
    const copy = clone(policyV8)
    const price: PolicyPrice = adobeOf(copy).prices.find((p: PolicyPrice) => p.priceId === 'current')

    price.commitmentTermMonths = termMonths
    if (renewsOn) price.commitmentRenewsOn = renewsOn
    else delete price.commitmentRenewsOn

    return copy
  }

  // Policy v8 prices the package in CLP: the demand names the FX record that takes it to the calculation currency,
  // as the committed demand of the same case does (designer-on-demand).
  const composeV8 = (periods: number, withPolicy: unknown, adobeUnits?: typeof ONE_SEAT_OF_THREE) =>
    calculated(
      runResourceComposition(
        catalog,
        withPolicy,
        credits,
        { ...demandFor({ periods, microsoftPriceId: MONTHLY_SEAT, adobeUnits }), fxRecordIds: ['fx:CLP:USD'] },
        '2026-10-11T00:00:00.000Z'
      )
    )

  const quoteOn = (
    periods: number,
    renewsOn: string | null,
    termMonths = 12,
    seats: 'one-of-three' | 'whole-package' = 'one-of-three'
  ) => {
    const artifact = composeV8(
      periods,
      policyRenewing(renewsOn, termMonths),
      seats === 'one-of-three' ? ONE_SEAT_OF_THREE : undefined
    )

    const reading = commitmentExposure(artifact)

    return {
      artifact,
      result: artifact.semantic.result,
      reading,
      entry: termedEntries(reading).find(entry => entry.toolId === 'adobe')
    }
  }

  /** Tools whose renewal the reading reports as unknown. */
  const renewalNotDeclared = (reading: Reading) =>
    reading.notDerivable.find(n => n.code === 'CONTRACT_RENEWAL_NOT_DECLARED')?.toolIds ?? []

  const signalCodes = (reading: Reading) =>
    reading.signals.filter(s => s.toolId === 'adobe').map(s => s.code)

  /**
   * What every reading of a running term has to say, against the calendar facts the case states and against the
   * artifact: the months left are costed on the month the kernel costed last, and add up with what it attributed.
   */
  const expectRunningTerm = (
    quoted: ReturnType<typeof quoteOn>,
    expected: { renewsOn: string; termMonths: number; boundUntil: string; monthsBeyond: number; renewsWithin: string[] }
  ) => {
    const { result, reading } = quoted
    const entry = quoted.entry!
    const periods = result.quote.periods.length
    const lastUse = result.attributions.filter(a => a.toolId === 'adobe').find(a => a.periodId === periods)!

    expect(entry.priceId).toBe('current')
    expect(entry.periodIds).toEqual(Array.from({ length: periods }, (_, index) => index + 1))
    expect(entry.commitment).toMatchObject({
      declaredBy: 'policy',
      billing: 'monthly',
      termMonths: expected.termMonths,
      termStartKnown: true,
      renewsOn: expected.renewsOn,
      boundUntil: expected.boundUntil,
      renewsWithinQuotedPeriods: expected.renewsWithin,
      terms: expected.renewsWithin.length + 1,
      monthsWithinQuote: periods,
      monthsBeyondQuote: expected.monthsBeyond,
      // What the quote's use of the licence binds, not a whole term.
      monthsCommitted: periods + expected.monthsBeyond,
      coversPeriods: { from: 1, through: periods + expected.monthsBeyond }
    })

    // In the currency of the tool, against the policy price (a third of the package) and the frozen attribution.
    const inToolCurrency = (value: Decimal) =>
      value.toFixed(entry.unrecovered.inToolCurrency.split('.')[1]?.length ?? 0, D.ROUND_HALF_UP)

    expect(new D(lastUse.attributedMonthlyCost).toFixed(2)).toBe(new D(packagePrice.amount).div(3).toFixed(2))
    expect(entry.monthlyAmount.inToolCurrency).toBe(inToolCurrency(new D(lastUse.attributedMonthlyCost)))
    expect(entry.unrecovered.inToolCurrency).toBe(
      inToolCurrency(new D(lastUse.attributedMonthlyCost).mul(expected.monthsBeyond))
    )

    // In the currency of the quote, against the kernel: the months left at the cost of the last quoted month, the
    // attributed amount at the cost of all of them.
    expect(entry.unrecovered.inQuoteCurrency).toBe(
      kernelCost(result, 'adobe', periods).mul(expected.monthsBeyond).toFixed(0, D.ROUND_HALF_UP)
    )
    expect(entry.attributedWithinPeriods.inQuoteCurrency).toBe(kernelCost(result, 'adobe').toFixed(0, D.ROUND_HALF_UP))

    for (const currency of ['inToolCurrency', 'inQuoteCurrency'] as const) {
      // committed = attributed inside the quote + the months left.
      expect(
        new D(entry.committed[currency]!).eq(
          new D(entry.attributedWithinPeriods[currency]!).plus(entry.unrecovered[currency]!)
        )
      ).toBe(true)
      expect(new D(entry.paidUpFront[currency]!).isZero()).toBe(true)
    }

    // One seat of a package of three: released to it, never stranded, and never new cash.
    expect(entry.sharing).toMatchObject({ basis: 'shared_declared_capacity', restSitsIn: 'shared_package' })
    expect(entry.releasedToSharedCapacity).toEqual(entry.unrecovered)
    expect(new D(entry.strandedIfNothingElseUsesIt.inQuoteCurrency!).isZero()).toBe(true)
    expect(entry.incrementalCash).toBeNull()
    expect(reading.totals.termedMonthlyPrices).toMatchObject({
      count: 1,
      committed: entry.committed.inQuoteCurrency,
      unrecovered: entry.unrecovered.inQuoteCurrency,
      releasedToSharedCapacity: entry.unrecovered.inQuoteCurrency
    })

    // The start of the term is known: it is no longer listed as unknown, and neither is the renewal.
    expect(entry.notDerivable.map(n => n.field)).toContain('incrementalCash')
    expect(entry.notDerivable.map(n => n.field)).not.toContain('commitment.termStart')
    expect(renewalNotDeclared(reading)).not.toContain('adobe')
    expect(reading.reviewed).toMatchObject({ renewalDatedPriceUses: 1 })

    // One signal names the commitment; a renewal inside the quoted periods is said besides it, same amount.
    const named = reading.signals.filter(s => s.toolId === 'adobe' && s.code.endsWith('OUTLIVES_ENGAGEMENT'))

    expect(named).toHaveLength(1)
    expect(named[0]).toMatchObject({
      code: 'SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT',
      amount: entry.unrecovered.inQuoteCurrency,
      periodIds: entry.periodIds
    })
    expect(reading.signals.filter(s => s.code === 'COMMITMENT_RENEWS_WITHIN_ENGAGEMENT')).toEqual(
      expected.renewsWithin.length
        ? [expect.objectContaining({ toolId: 'adobe', amount: entry.unrecovered.inQuoteCurrency })]
        : []
    )
  }

  it('one period in October, renewal on 16 November: November begins before the 16th and is billed, so one month is left, not eleven', () => {
    const quoted = quoteOn(1, '2026-11-16')

    expect(quoted.reading.engagement.endsOn).toBe('2026-10-31')
    expectRunningTerm(quoted, {
      renewsOn: '2026-11-16',
      termMonths: 12,
      boundUntil: '2026-11-16',
      monthsBeyond: 1,
      renewsWithin: []
    })

    // The figures of the case: the package costs CLP 162,605 a month and the quote holds one seat of three.
    const entry = quoted.entry!

    expect(packagePrice).toMatchObject({ amount: '162605', currency: 'CLP', unit: 'month' })
    expect(entry.unrecovered.inQuoteCurrency).toBe(new D(162605).div(3).toFixed(0, D.ROUND_HALF_UP))
    expect(entry.attributedWithinPeriods.inQuoteCurrency).toBe(entry.unrecovered.inQuoteCurrency)
    expect(new D(entry.committed.inQuoteCurrency!).eq(new D(entry.unrecovered.inQuoteCurrency!).mul(2))).toBe(true)

    // The same quote read without the date leaves eleven months of the same seat.
    const undated = quoteOn(1, null).entry!

    expect(undated.commitment.monthsBeyondQuote).toBe(11)
    expect(new D(undated.unrecovered.inQuoteCurrency!).gt(new D(entry.unrecovered.inQuoteCurrency!).mul(10))).toBe(true)
  })

  it('the date never reaches the calculation: the quote is the one the policy without it composes', () => {
    expect(quoteOn(1, '2026-11-16').result).toEqual(quoteOn(1, null).result)
  })

  it('the whole package held by the quote is stranded for that one month if nothing else uses it', () => {
    const { reading, entry } = quoteOn(1, '2026-11-16', 12, 'whole-package')

    expect(entry!.commitment).toMatchObject({ boundUntil: '2026-11-16', monthsBeyondQuote: 1 })
    expect(entry!.unrecovered.inToolCurrency).toBe(packagePrice.amount)
    expect(entry!.sharing.basis).toBe('sole_declared_user')
    expect(entry!.strandedIfNothingElseUsesIt).toEqual(entry!.unrecovered)
    expect(signalCodes(reading)).toEqual(['COMMITMENT_OUTLIVES_ENGAGEMENT'])
  })

  it('renewal on 20 October, inside the quoted month: the licence is in use across it, so it is bound until 20 October 2027 and twelve months are left (November to October)', () => {
    expectRunningTerm(quoteOn(1, '2026-10-20'), {
      renewsOn: '2026-10-20',
      termMonths: 12,
      boundUntil: '2027-10-20',
      monthsBeyond: 12,
      renewsWithin: ['2026-10-20']
    })
  })

  it('renewal on 1 November exactly: November begins on the renewal, not before it, so nothing is left and nothing is listed', () => {
    const { reading, entry } = quoteOn(1, '2026-11-01')

    expect(entry).toBeUndefined()
    expect(reading.commitments).toEqual([])
    expect(reading.signals).toEqual([])
    expect(reading.totals.termedMonthlyPrices.count).toBe(0)
    // Looked at, with its date; not a term nobody declared and not an unknown renewal.
    expect(reading.reviewed).toMatchObject({ renewalDatedPriceUses: 1 })
    expect(reading.notDerivable.find(n => n.code === 'CONTRACT_TERM_NOT_FROZEN')?.toolIds ?? []).not.toContain('adobe')
    expect(renewalNotDeclared(reading)).not.toContain('adobe')
  })

  it('renewal on 31 October, the last quoted day: it is not after the quoted month, so the next one binds, 31 October 2027, and twelve months are left', () => {
    expectRunningTerm(quoteOn(1, '2026-10-31'), {
      renewsOn: '2026-10-31',
      termMonths: 12,
      boundUntil: '2027-10-31',
      monthsBeyond: 12,
      renewsWithin: ['2026-10-31']
    })
  })

  it('renewal on 1 October, the first quoted day: the term opens with the quote, and the reading is the whole term the undated one assumes', () => {
    const dated = quoteOn(1, '2026-10-01')
    const undated = quoteOn(1, null).entry!

    expectRunningTerm(dated, {
      renewsOn: '2026-10-01',
      termMonths: 12,
      boundUntil: '2027-10-01',
      monthsBeyond: 11,
      renewsWithin: ['2026-10-01']
    })
    expect(dated.entry!.committed).toEqual(undated.committed)
    expect(dated.entry!.unrecovered).toEqual(undated.unrecovered)
  })

  it('a tool paid month by month has no renewal to declare, however many periods the quote runs', () => {
    // Policy v8 declares a term of one month on Notion and on the monthly Microsoft 365 prices: free to leave.
    const { reading } = quoteOn(3, '2026-11-16')

    expect(reading.engagement.periods).toBe(3)
    expect(reading.notDerivable.map(n => n.code)).not.toContain('CONTRACT_RENEWAL_NOT_DECLARED')
    expect(reading.commitments.filter(c => c.toolId === 'notion' || c.toolId === 'microsoft-365')).toEqual([])
  })

  it('three periods, October to December, renewal on 16 November: the job crosses it, the licence is bound until 16 November 2027 and eleven months are left (January to November)', () => {
    const quoted = quoteOn(3, '2026-11-16')

    expect(quoted.reading.engagement.endsOn).toBe('2026-12-31')
    expectRunningTerm(quoted, {
      renewsOn: '2026-11-16',
      termMonths: 12,
      boundUntil: '2027-11-16',
      monthsBeyond: 11,
      renewsWithin: ['2026-11-16']
    })
    expect(signalCodes(quoted.reading)).toEqual([
      'SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT',
      'COMMITMENT_RENEWS_WITHIN_ENGAGEMENT'
    ])
  })

  it('a date already past, 16 March 2026: the renewal that applies is the next of the series, 16 March 2027, and five months are left (November to March)', () => {
    expectRunningTerm(quoteOn(1, '2026-03-16'), {
      renewsOn: '2026-03-16',
      termMonths: 12,
      boundUntil: '2027-03-16',
      monthsBeyond: 5,
      renewsWithin: []
    })
  })

  it('a date further away than one term, 16 March 2028: it is declared as the next renewal, so no earlier one is read and seventeen months are left (November 2026 to March 2028)', () => {
    expectRunningTerm(quoteOn(1, '2028-03-16'), {
      renewsOn: '2028-03-16',
      termMonths: 12,
      boundUntil: '2028-03-16',
      monthsBeyond: 17,
      renewsWithin: []
    })
  })

  it('thirteen periods with the date: the renewal is known, so the whole job is read, bound until 16 November 2027, with one month left (November)', () => {
    // Without the date the same quote leaves no entry and an unknown renewal; see the thirteen periods above.
    expectRunningTerm(quoteOn(13, '2026-11-16'), {
      renewsOn: '2026-11-16',
      termMonths: 12,
      boundUntil: '2027-11-16',
      monthsBeyond: 1,
      renewsWithin: ['2026-11-16']
    })
    expect(renewalNotDeclared(quoteOn(13, null).reading)).toContain('adobe')
  })

  describe('a renewal day the month does not have', () => {
    // A term of three months declared on 31 August 2026: 30 November, 28 February 2027, 31 May 2027. Each renewal
    // is the 31st or the last day of its month, counted from the declared date and not from the one before.
    it('one period in October: bound until 30 November, and November is left', () => {
      expectRunningTerm(quoteOn(1, '2026-08-31', 3), {
        renewsOn: '2026-08-31',
        termMonths: 3,
        boundUntil: '2026-11-30',
        monthsBeyond: 1,
        renewsWithin: []
      })
    })

    it('five periods, October to February: 28 February is the last quoted day, so the renewal after it binds, 31 May, and three months are left (March to May)', () => {
      expectRunningTerm(quoteOn(5, '2026-08-31', 3), {
        renewsOn: '2026-08-31',
        termMonths: 3,
        boundUntil: '2027-05-31',
        monthsBeyond: 3,
        renewsWithin: ['2026-11-30', '2027-02-28']
      })
    })
  })

  it('a term without a date reads as it always did: one whole term from the first quoted month, its start listed as unknown', () => {
    const { reading, entry } = quoteOn(1, null)

    expect(entry!.commitment).toMatchObject({
      termMonths: 12,
      terms: 1,
      coversPeriods: { from: 1, through: 12 },
      monthsCommitted: 12,
      monthsWithinQuote: 1,
      monthsBeyondQuote: 11
    })
    for (const key of ['termStartKnown', 'renewsOn', 'boundUntil', 'renewsWithinQuotedPeriods'])
      expect(entry!.commitment).not.toHaveProperty(key)
    expect(entry!.notDerivable.map(n => n.field)).toContain('commitment.termStart')
    expect(reading.reviewed).not.toHaveProperty('renewalDatedPriceUses')
    expect(signalCodes(reading)).toEqual(['SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT'])

    // And it is the reading of policy v8 exactly as committed, which declares the term and no date.
    expect(adobeOf(policyV8).prices.find((p: PolicyPrice) => p.priceId === 'current').commitmentTermMonths).toBe(12)
    expect(reading).toEqual(commitmentExposure(composeV8(1, policyV8, ONE_SEAT_OF_THREE)))
  })

  it.each([
    ['2026-11-16', 1],
    ['2026-10-20', 1],
    ['2026-10-31', 3],
    ['2026-03-16', 13]
  ])('a term of one month is the month it bills: with a date (%s, %i periods) it is never an entry', (renewsOn, periods) => {
    const { reading, entry } = quoteOn(periods, renewsOn, 1)

    expect(entry).toBeUndefined()
    expect(reading.commitments).toEqual([])
    expect(reading.signals).toEqual([])
    expect(renewalNotDeclared(reading)).not.toContain('adobe')
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
