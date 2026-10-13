// Contract 1.3.0: the form of the engagement (on-going, on-demand, ...) is its own datum, with a price ratio.
//
// Catalogs, demands and kernel inputs are built in memory from the committed fixtures; nothing is written under
// data/. Expected amounts come from one of three places, never from a previous run of the code under test:
//   - exact arithmetic over the inputs of the case: BigInt minor units in the kernel lane, and decimals wide enough
//     to be exact (no rounding inside a product) where the input is a price an earlier contract stored;
//   - the same economic input priced WITHOUT a form by an earlier contract, which is frozen and guarded by the
//     artifact corpus (`pricing-v3-frozen-artifacts.test.ts`): cost, policy price, market adjustment, market ratio
//     and floor of every row;
//   - an invariant the design states (the walk of a row, multiples, verdict = net under floorNet).
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Decimal from 'decimal.js'
import { afterAll, describe, expect, it } from 'vitest'

import {
  applyCatalogChange,
  catalogDigest,
  explainCatalogQuote,
  previewCatalogChange,
  replayCatalogQuote,
  runCatalogQuote
} from '../adapters/catalog-local'
import { comparePricingV3, replayPricingV3, runPricingV3 } from '../adapters/local-snapshot'
import {
  explainResourceComposition,
  replayResourceComposition,
  runResourceComposition
} from '../adapters/resource-composition'
import { calculatePricingV3, PRICING_V3_PRECISION_POLICIES } from '../calculate'
import { changeCatalog, searchCatalog, validateCatalog } from '../catalog/catalog'
import { projectCatalogQuote } from '../catalog/client'
import { calculateCatalogQuote } from '../catalog/quote'
import { resolveBrief } from '../catalog/resolve'
import { projectPricingV3ForClient } from '../projection'
import { composeResourceQuote } from '../resources/composition'
import { assessCompositionReadiness, projectCompositionPreview } from '../resources/readiness'
import { summarizeComposition } from '../resources/summary'
import { PRICING_V3_ENGINES } from '../schemas'

// Wide enough that a product of a stored price (80 digits), a ratio and an FX rate is exact.
const X = Decimal.clone({ precision: 400, rounding: Decimal.ROUND_HALF_UP })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => `data/pricing/v3-operating/${name}.json`
const creditsPath = 'data/pricing/v3-resources/ai-credits.review-v1.json'

// Catalog v4 registers a commercial rounding rule per currency and every market factor at 1.
const catalogV4 = read(operating('catalog.review-v4'))
const policy = read(operating('resources.review-v5'))
const credits = read(creditsPath)
const managed = read(operating('managed-care.demand'))

// Catalog-lane fixture: three periods, one line, a one-time setup row in the first period.
const designerCatalog = read('data/pricing/v3-catalog/catalog.review-v1.json')
const designerBrief = read('data/pricing/v3-catalog/examples/designer.quote.artifact.json').semantic.brief

const NEW_ROW_KEYS = ['engagementAdjustment', 'engagementPriceRatio'] as const
const NEW_TOTAL_KEYS = ['engagementAdjustment'] as const
const MARKET_ROW_KEYS = ['marketAdjustment', 'marketPriceRatio', 'floorNet'] as const
const FLOOR_BASIS = 'base_market'

type Composition = ReturnType<typeof composeResourceQuote>
type Component = { componentId: string; kind: string; cost: string; price: string; trace: Record<string, string> }

type AnyRow = Record<string, string> & {
  lineId: string
  parentLineId: string
  kind: string
  periodId: number
  components: Component[]
}

type CatalogDoc = {
  records: { kind: string; recordId: string; source: Record<string, unknown>; value: Record<string, unknown> }[]
}

/** Amounts of a totals object of any contract, read by key. */
const amounts = (totals: unknown) => totals as Record<string, string>

// ---- exact integer arithmetic (minor units) ----

/** Decimal string -> integer count of 10^-scale. Throws on a value that does not fit the scale exactly. */
const scaled = (value: string, scale: number) => {
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.')

  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) throw new RangeError(`${value} @ ${scale}`)

  const magnitude = BigInt(whole + fraction.slice(0, scale).padEnd(scale, '0'))

  return negative ? -magnitude : magnitude
}

/** Minor units of an amount as the kernel formatted it: the scale is the one of the string itself. */
const minor = (value: string) => scaled(value, (value.split('.')[1] ?? '').length)
const scaleOf = (value: string) => (value.split('.')[1] ?? '').length
const sum = (values: bigint[]) => values.reduce((total, value) => total + value, 0n)
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b
const ceilTo = (value: bigint, multiple: bigint) => ceilDiv(value, multiple) * multiple
const UNIT = 10n ** 18n
const fraction = (value: string) => scaled(value, 18)

/** A finite decimal as an exact integer over a power of ten; products and sums stay exact. */
type Exact = { n: bigint; scale: number }

const exact = (value: string): Exact => ({ n: scaled(value, scaleOf(value)), scale: scaleOf(value) })
const times = (...values: Exact[]) => values.reduce((a, b) => ({ n: a.n * b.n, scale: a.scale + b.scale }))

const add = (a: Exact, b: Exact): Exact => {
  const scale = Math.max(a.scale, b.scale)

  return { n: a.n * 10n ** BigInt(scale - a.scale) + b.n * 10n ** BigInt(scale - b.scale), scale }
}

/** Minor units of a non-negative exact amount, half up at `precision` decimals: how the kernel presents money. */
const halfUp = (value: Exact, precision: number) => {
  if (value.scale <= precision) return value.n * 10n ** BigInt(precision - value.scale)

  const divisor = 10n ** BigInt(value.scale - precision)

  return (value.n * 2n + divisor) / (2n * divisor)
}

/** The floor every contract states: cost x rho / (1 - minimumMargin), raised to the currency unit. */
const floorNetOf = (cost: bigint, minimumMargin: string, rho?: { price: bigint; basePrice: bigint }) =>
  rho
    ? ceilDiv(cost * rho.price * UNIT, (UNIT - fraction(minimumMargin)) * rho.basePrice)
    : ceilDiv(cost * UNIT, UNIT - fraction(minimumMargin))

/** The control of the earliest contracts, as an exact inequality: (net - cost) / net < minimumMargin, or no net. */
const underFinalNetFloor = (net: bigint, cost: bigint, minimumMargin: string) =>
  net === 0n || (net - cost) * UNIT < fraction(minimumMargin) * net

// ---- catalog fixtures ----

const formSource = (status = 'confirmed', effectiveFrom = '2026-01-01') => ({
  reference: 'engagement-form-test',
  effectiveFrom,
  effectiveUntil: '9999-12-31',
  status
})

const formRecord = (
  form: string,
  priceRatio: string,
  extra: { offerId?: string; recordId?: string; status?: string; effectiveFrom?: string } = {}
) => ({
  recordId: extra.recordId ?? `engagement:${form}${extra.offerId ? `:${extra.offerId}` : ''}`,
  revision: 1,
  kind: 'engagement_factor',
  source: formSource(extra.status, extra.effectiveFrom),
  note: 'Price ratio of a form of engagement, declared for the test.',
  value: { form, priceRatio, ...(extra.offerId ? { offerId: extra.offerId } : {}) }
})

const ON_GOING = formRecord('on_going', '1')
const ON_DEMAND = formRecord('on_demand', '1.10')
const COMMITTED = formRecord('committed', '0.90')

const withForms = <T extends CatalogDoc>(cat: T, records: unknown[] = [ON_GOING, ON_DEMAND, COMMITTED]) => {
  const next = clone(cat)

  next.records.push(...(clone(records) as CatalogDoc['records']))

  return next
}

/** The catalog with the market factor of `country` edited in memory. */
const withMarket = <T extends CatalogDoc>(cat: T, country: string, edit: { factor?: string; floorBasis?: boolean }) => {
  const next = clone(cat)
  const record = next.records.find(r => r.kind === 'market_factor' && r.value.country === country)!

  if (edit.factor) record.value.factor = edit.factor
  if (edit.floorBasis) record.value.floorBasis = FLOOR_BASIS

  return next
}

const withoutRounding = <T extends CatalogDoc>(cat: T) => ({
  ...cat,
  records: cat.records.filter(r => r.kind !== 'price_rounding')
})

const managedLineIds: string[] = managed.brief.lines.map((l: { lineId: string }) => l.lineId)

/** The managed-care demand quoted in a currency and market, optionally declaring a form. */
const demandIn = (currency: string, country: string, form?: string, adjustments: unknown[] = []) => {
  const next = clone(managed)

  next.brief.outputCurrency = currency
  next.brief.offerMarketCountry = country
  next.brief.adjustments = adjustments
  if (form) next.brief.engagementForm = form

  return next
}

const compose = (cat: unknown, demand: unknown) => composeResourceQuote(cat, policy, credits, demand)
const summary = (r: Composition) => summarizeComposition(r, { calculationId: 'test' })
const engines = (r: Composition) => [...new Set(r.quote.periods.map(p => p.result.engineVersion))]
const rowsOf = (r: Composition) => r.quote.periods.flatMap(p => p.result.lines) as unknown as AnyRow[]

const contracts = (r: Composition) => [
  ...new Set(
    r.quote.resolution.inputs.flatMap(p => [p.input.request.schemaVersion, p.input.snapshot.schemaVersion] as string[])
  )
]

// The floor verdict is the kernel's diagnostic and nothing else.
const flaggedPaths = (r: Composition) =>
  r.quote.periods.flatMap(p =>
    p.result.diagnostics
      .filter(d => d.code === 'MARGIN_BELOW_FLOOR')
      .map(d => `periods.${p.periodId}.${d.fieldPath}`)
      .sort()
  )

const pathOf = (row: AnyRow) => `periods.${row.periodId}.result.lines.${row.lineId}`

/** Policy price of a row: what the kernel priced before commercial rounding. */
const policyPrice = (row: Record<string, string>) => minor(row.undiscountedPrice) - minor(row.roundingAdjustment ?? '0')

/** Everything a result says once the keys of the named contracts and the version labels are set aside. */
const stripContract = (value: unknown, keys: readonly string[]) =>
  JSON.parse(
    JSON.stringify(value, (key, item) =>
      [...keys, 'engineVersion', 'precisionPolicy', 'schemaVersion'].includes(key) ? undefined : item
    )
  )

/**
 * Policy price of a 1.3.0 row derived from the row the earlier contract priced: every stored component price times
 * the ratio, converted and presented half up. Exact: no product here is rounded before the last step.
 */
const expectedPolicyPrice = (prior: AnyRow, ratio: string) =>
  minor(
    prior.components
      .reduce((total, c) => total.plus(new X(c.price).mul(ratio).mul(c.trace.outputFx ?? 1)), new X(0))
      .toFixed(scaleOf(prior.net), X.ROUND_HALF_UP)
  )

/**
 * The walk of a 1.3.0 row and of 1.3.0 totals, exact at every step:
 * undiscountedPrice = base + marketAdjustment + engagementAdjustment + roundingAdjustment; net = that + uplift -
 * discount; marginAmount = net - cost. `base` is the price of the base market at ratio 1, given by the caller.
 */
const expectWalk = (amount: Record<string, string>, base: bigint) => {
  expect(minor(amount.undiscountedPrice)).toBe(
    base + minor(amount.marketAdjustment) + minor(amount.engagementAdjustment) + minor(amount.roundingAdjustment)
  )
  expect(minor(amount.net)).toBe(minor(amount.undiscountedPrice) + minor(amount.uplift) - minor(amount.discount))
  expect(minor(amount.marginAmount)).toBe(minor(amount.net) - minor(amount.cost))
}

/**
 * Equal to the working precision of the kernel: it multiplies at 80 significant digits, and a price built through a
 * target margin (a division) already fills them, so a further product agrees with the exact one to that precision.
 */
const sameToWorkingPrecision = (got: Decimal.Value, exactValue: Decimal) =>
  new X(got).minus(exactValue).abs().lte(exactValue.abs().mul('1e-75'))

const thrown = (run: () => unknown) => {
  try {
    run()
  } catch (error) {
    return error
  }

  return undefined
}

// The cases every block reads: managed care quoted in USD (two decimals, multiple of 10) for Colombia.
const CO = { currency: 'USD', country: 'CO' }
const forms = withForms(catalogV4)
const plain = compose(catalogV4, demandIn(CO.currency, CO.country))
const onGoing = compose(forms, demandIn(CO.currency, CO.country, 'on_going'))
const onDemand = compose(forms, demandIn(CO.currency, CO.country, 'on_demand'))

describe('absent field: nothing moves, whatever the catalog holds', () => {
  it('the cases really calculate, with rows to compare', () => {
    for (const r of [plain, onGoing, onDemand]) {
      expect(r.quote.calculationStatus).toBe('calculated')
      expect(rowsOf(r).length).toBe(managedLineIds.length)
    }
  })

  it('a catalog that gains engagement factors changes no byte of a quote that declares no form', () => {
    for (const cat of [catalogV4, withoutRounding(catalogV4), withMarket(catalogV4, 'CO', { floorBasis: true })]) {
      const demand = demandIn(CO.currency, CO.country)

      // Same catalog id and version on both sides, so the whole result is comparable, selection and inputs included.
      expect(JSON.stringify(compose(withForms(cat), demand))).toBe(JSON.stringify(compose(cat, demand)))
    }
  })

  it('an undeclared form keeps the contract of the quote and none of the 1.3.0 keys, anywhere', () => {
    const cases = [
      { cat: withForms(catalogV4), contract: '1.1.0' },
      { cat: withForms(withoutRounding(catalogV4)), contract: '1.0.0' },
      { cat: withForms(withMarket(catalogV4, 'CO', { factor: '0.90', floorBasis: true })), contract: '1.2.0' }
    ]

    for (const { cat, contract } of cases) {
      const r = compose(cat, demandIn(CO.currency, CO.country))

      expect(contracts(r)).toEqual([contract])
      expect(JSON.stringify(r)).not.toMatch(
        /engagementAdjustment|engagementPriceRatio|engagementFactors|engagementForm/
      )
      expect(r.quote.resolution.bindings.some(b => b.purpose === 'engagement_factor')).toBe(false)
      expect(summary(r)).not.toHaveProperty('engagementForm')
    }
  })

  it('the brief parses to what it always did: no key is defaulted in', () => {
    const resolution = resolveBrief(withForms(designerCatalog), designerBrief)

    expect(resolution.status).toBe('resolved')
    expect(Object.keys(resolution.brief!)).not.toContain('engagementForm')
    expect(JSON.stringify(resolution)).toBe(JSON.stringify(resolveBrief(designerCatalog, designerBrief)))
  })
})

describe('contract selection: 1.3.0 only when the brief declares the form of the engagement', () => {
  it('declaring a form flips request and snapshot of every period to 1.3.0, also at ratio 1', () => {
    for (const r of [onGoing, onDemand]) {
      expect(contracts(r)).toEqual(['1.3.0'])
      expect(engines(r)).toEqual([PRICING_V3_ENGINES['1.3.0']])
      expect(r.quote.periods.every(p => p.result.precisionPolicy === PRICING_V3_PRECISION_POLICIES['1.3.0'])).toBe(true)
    }

    // Catalog lane, three periods: the same contract in each.
    const resolution = resolveBrief(withForms(designerCatalog), { ...designerBrief, engagementForm: 'on_going' })

    expect(resolution.inputs).toHaveLength(designerBrief.periods)
    expect(resolution.inputs.map(p => p.input.request.schemaVersion)).toEqual(
      Array(designerBrief.periods).fill('1.3.0')
    )
    expect(resolution.inputs.map(p => p.input.snapshot.schemaVersion)).toEqual(
      Array(designerBrief.periods).fill('1.3.0')
    )
  })

  it('the kernel receives the declared form and only the ratio resolution selected for it', () => {
    for (const { input } of onDemand.quote.resolution.inputs) {
      expect(input.request).toMatchObject({ engagementForm: 'on_demand', engagementCode: managed.brief.engagementCode })
      expect((input.snapshot as { engagementFactors?: unknown }).engagementFactors).toEqual([
        { form: 'on_demand', priceRatio: '1.10', source: ON_DEMAND.source }
      ])
    }

    expect(onDemand.quote.resolution.bindings.filter(b => b.purpose === 'engagement_factor')).toEqual([
      { lineId: '*', purpose: 'engagement_factor', record: ON_DEMAND }
    ])
  })

  it('the pricing policy is still selected by engagementCode: the same policy records with and without a form', () => {
    const pricing = (r: Composition) =>
      r.quote.resolution.bindings.filter(b => b.purpose === 'pricing').map(b => `${b.lineId}:${b.record.recordId}`)

    expect(pricing(onDemand)).toEqual(pricing(plain))
    expect(pricing(onDemand).length).toBe(managedLineIds.length)
  })

  it('1.3.0 is a superset: it carries the keys of 1.1.0 and 1.2.0 next to its own, in rows and totals', () => {
    for (const row of rowsOf(onDemand))
      for (const key of ['roundingAdjustment', 'uplift', ...MARKET_ROW_KEYS, ...NEW_ROW_KEYS])
        expect(row).toHaveProperty(key)

    for (const totals of [onDemand.quote.totals!, ...onDemand.quote.periods.map(p => p.result.totals!)])
      for (const key of ['roundingAdjustment', 'uplift', 'marketAdjustment', ...NEW_TOTAL_KEYS])
        expect(totals).toHaveProperty(key)
  })
})

describe('ratio 1 with the form declared: the same quote, signed by 1.3.0', () => {
  it('every amount is the one of the quote without a form; the adjustment is zero and the ratio is the declared 1', () => {
    expect(onGoing.quote.totals!.net).toBe(plain.quote.totals!.net)
    expect(minor(amounts(onGoing.quote.totals).engagementAdjustment)).toBe(0n)

    for (const row of rowsOf(onGoing)) {
      expect(minor(row.engagementAdjustment)).toBe(0n)
      expect(row.engagementPriceRatio).toBe('1')
    }

    // Everything the earlier contract says is said identically; `plain` is 1.1.0, so the 1.2.0 keys go as well.
    const earlier = [...MARKET_ROW_KEYS, ...NEW_ROW_KEYS]

    expect(stripContract(onGoing.quote.periods, earlier)).toEqual(stripContract(plain.quote.periods, earlier))
    expect(stripContract(onGoing.quote.totals, earlier)).toEqual(stripContract(plain.quote.totals, earlier))
    expect(flaggedPaths(onGoing)).toEqual(flaggedPaths(plain))
  })

  it('against a 1.2.0 quote only the 1.3.0 keys are new: market adjustment, ratio and floor are the same strings', () => {
    const cat = withForms(withMarket(catalogV4, 'CO', { factor: '0.90', floorBasis: true }))
    const without = compose(cat, demandIn(CO.currency, CO.country))
    const declared = compose(cat, demandIn(CO.currency, CO.country, 'on_going'))

    expect(contracts(without)).toEqual(['1.2.0'])
    expect(contracts(declared)).toEqual(['1.3.0'])
    expect(stripContract(declared.quote.periods, NEW_ROW_KEYS)).toEqual(
      stripContract(without.quote.periods, NEW_ROW_KEYS)
    )
    expect(stripContract(declared.quote.totals, NEW_ROW_KEYS)).toEqual(
      stripContract(without.quote.totals, NEW_ROW_KEYS)
    )
    expect(rowsOf(declared).some(row => row.marketPriceRatio !== '1')).toBe(true)
  })
})

describe('on-demand at 1.10 on a plain quote: the price of every row is the prior price times the ratio', () => {
  const prior = new Map(rowsOf(plain).map(row => [row.lineId, row]))
  const multiple = minor('10.00')

  it('cost and cash do not move: the form changes what the client pays, never what the work costs', () => {
    for (const row of rowsOf(onDemand)) {
      expect(row.cost).toBe(prior.get(row.lineId)!.cost)
      expect(row.components.map(c => c.cost)).toEqual(prior.get(row.lineId)!.components.map(c => c.cost))
    }

    expect(onDemand.quote.totals!.cost).toBe(plain.quote.totals!.cost)
    expect(onDemand.quote.totals!.cashCommitment).toBe(plain.quote.totals!.cashCommitment)
    expect(onDemand.quote.cashLedger).toEqual(plain.quote.cashLedger)
  })

  it('every component of every row is sold at its prior price times 1.10, people, tools and fees alike', () => {
    const kinds = new Set<string>()

    for (const row of rowsOf(onDemand)) {
      const before = prior.get(row.lineId)!

      expect(row.components.map(c => c.componentId)).toEqual(before.components.map(c => c.componentId))

      for (const [index, component] of row.components.entries()) {
        kinds.add(component.kind)
        expect(sameToWorkingPrecision(component.price, new X(before.components[index].price).mul('1.10'))).toBe(true)
        expect(new X(component.price).gt(before.components[index].price)).toBe(true)
        expect(component.trace.engagementPriceRatio).toBe('1.10')
        expect(before.components[index].trace).not.toHaveProperty('engagementPriceRatio')
      }
    }

    // The premise: the quote sells more than people.
    expect(kinds.size).toBeGreaterThan(1)
    expect(kinds.has('human')).toBe(true)
  })

  it('the policy price is that sum presented half up, and the adjustment is what it adds over the prior price', () => {
    for (const row of rowsOf(onDemand)) {
      const before = prior.get(row.lineId)!
      const expected = expectedPolicyPrice(before, '1.10')

      expect(policyPrice(row)).toBe(expected)
      expect(minor(row.engagementAdjustment)).toBe(expected - policyPrice(before))
      expect(minor(row.engagementAdjustment)).toBeGreaterThan(0n)
      expect(row.engagementPriceRatio).toBe('1.10')
      // Ten percent of the prior price, to the cent the presentation can move.
      expect(minor(row.engagementAdjustment) * 10n - policyPrice(before)).toBeGreaterThanOrEqual(-10n)
      expect(minor(row.engagementAdjustment) * 10n - policyPrice(before)).toBeLessThanOrEqual(10n)
    }
  })

  it('the ratio enters before commercial rounding: every price is a multiple, raised from the ratioed price', () => {
    for (const row of rowsOf(onDemand)) {
      expect(minor(row.undiscountedPrice) % multiple).toBe(0n)
      // Not the rounded prior price times the ratio: that would not land on the multiple.
      expect(minor(row.undiscountedPrice)).toBe(ceilTo(policyPrice(row), multiple))
      expect(minor(row.roundingAdjustment)).toBeLessThan(multiple)
      expect(minor(row.net)).toBe(minor(row.undiscountedPrice))
    }

    expect(rowsOf(plain).some(row => (minor(row.undiscountedPrice) * 11n) % (multiple * 10n) !== 0n)).toBe(true)
  })

  it('the walk reconciles in every row, in the period totals and in the totals of the quote', () => {
    for (const row of rowsOf(onDemand)) expectWalk(row, policyPrice(prior.get(row.lineId)!))

    const base = sum(rowsOf(plain).map(policyPrice))

    for (const totals of [onDemand.quote.totals!, ...onDemand.quote.periods.map(p => p.result.totals!)]) {
      expectWalk(amounts(totals), base)

      for (const key of ['cost', 'engagementAdjustment', 'undiscountedPrice', 'roundingAdjustment', 'net'] as const)
        expect(minor(amounts(totals)[key])).toBe(sum(rowsOf(onDemand).map(row => minor(row[key]))))
    }
  })

  it('the margin goes up and the floor stays where it was', () => {
    expect(minor(onDemand.quote.totals!.marginAmount)).toBeGreaterThan(minor(plain.quote.totals!.marginAmount))
    expect(new X(onDemand.quote.totals!.marginRate!).gt(plain.quote.totals!.marginRate!)).toBe(true)
    expect(flaggedPaths(onDemand)).toEqual([])

    for (const row of rowsOf(onDemand)) {
      expect(row.minimumMargin).toBe(prior.get(row.lineId)!.minimumMargin)
      // No market floor in force: the floor is the one of every contract, on the unchanged cost.
      expect(row.marketPriceRatio).toBe('1')
      expect(minor(row.floorNet)).toBe(floorNetOf(minor(row.cost), row.minimumMargin))
    }
  })

  it('setup rows take the ratio like monthly rows (catalog lane, three periods)', () => {
    const before = calculateCatalogQuote(designerCatalog, designerBrief)
    const after = calculateCatalogQuote(withForms(designerCatalog), { ...designerBrief, engagementForm: 'on_demand' })
    const lines = (q: typeof before) => q.periods.flatMap(p => p.result.lines) as unknown as AnyRow[]
    const priorRows = new Map(lines(before).map(row => [row.lineId, row]))

    expect(after.calculationStatus).toBe('calculated')
    expect(lines(after).map(row => row.lineId)).toEqual(lines(before).map(row => row.lineId))
    expect(lines(after).filter(row => row.kind === 'setup').length).toBeGreaterThan(0)
    expect(lines(after).filter(row => row.kind === 'monthly').length).toBe(designerBrief.periods)

    for (const row of lines(after)) {
      const earlier = priorRows.get(row.lineId)!

      expect(row.cost).toBe(earlier.cost)
      expect(policyPrice(row)).toBe(expectedPolicyPrice(earlier, '1.10'))
      expect(minor(row.engagementAdjustment)).toBe(policyPrice(row) - minor(earlier.undiscountedPrice))
      expect(minor(row.engagementAdjustment)).toBeGreaterThan(0n)
      expectWalk(row, minor(earlier.undiscountedPrice))
    }

    expectWalk(amounts(after.totals), minor(before.totals!.undiscountedPrice))
    expect(minor(amounts(after.totals).engagementAdjustment)).toBe(
      sum(lines(after).map(row => minor(row.engagementAdjustment)))
    )
  })
})

describe('with a market factor whose floor follows the base market', () => {
  const floorCatalog = withForms(withMarket(catalogV4, 'CO', { factor: '0.90', floorBasis: true }))
  const without = compose(floorCatalog, demandIn(CO.currency, CO.country))
  const declared = compose(floorCatalog, demandIn(CO.currency, CO.country, 'on_demand'))
  const prior = new Map(rowsOf(without).map(row => [row.lineId, row]))
  const multiple = minor('10.00')

  it('the premise: the market lowered every row and neither quote is flagged', () => {
    expect(contracts(without)).toEqual(['1.2.0'])
    expect(contracts(declared)).toEqual(['1.3.0'])
    expect(rowsOf(without).every(row => row.marketPriceRatio !== '1' && minor(row.marketAdjustment) < 0n)).toBe(true)
    expect(flaggedPaths(without)).toEqual([])
    expect(flaggedPaths(declared)).toEqual([])
  })

  it('the form moves nothing of the market: adjustment, ratio and floor are those of the quote without a form', () => {
    for (const row of rowsOf(declared)) {
      const before = prior.get(row.lineId)!

      for (const key of ['cost', 'minimumMargin', ...MARKET_ROW_KEYS]) expect(row[key]).toBe(before[key])
    }

    expect(amounts(declared.quote.totals).marketAdjustment).toBe(amounts(without.quote.totals).marketAdjustment)
  })

  it('the floor is cost x rho / (1 - minimumMargin) with rho read at ratio 1, and the ratio is not in it', () => {
    for (const row of rowsOf(declared)) {
      const before = prior.get(row.lineId)!
      const rho = { price: policyPrice(before), basePrice: policyPrice(before) - minor(before.marketAdjustment) }

      expect(minor(row.floorNet)).toBe(floorNetOf(minor(row.cost), row.minimumMargin, rho))
      // Had the ratio entered rho through the price of this quote, the floor would have risen by a tenth.
      expect(minor(row.floorNet)).toBeLessThan(
        floorNetOf(minor(row.cost), row.minimumMargin, { price: policyPrice(row), basePrice: rho.basePrice })
      )
      expect(
        sameToWorkingPrecision(row.marketPriceRatio, new X(rho.price.toString()).div(rho.basePrice.toString()))
      ).toBe(true)
    }
  })

  it('the engagement adjustment sits on the market price and the walk reaches the base market at ratio 1', () => {
    for (const row of rowsOf(declared)) {
      const before = prior.get(row.lineId)!
      const expected = expectedPolicyPrice(before, '1.10')

      expect(policyPrice(row)).toBe(expected)
      expect(minor(row.engagementAdjustment)).toBe(expected - policyPrice(before))
      expectWalk(row, policyPrice(before) - minor(before.marketAdjustment))
    }

    expectWalk(
      amounts(declared.quote.totals),
      sum(rowsOf(without).map(row => policyPrice(row) - minor(row.marketAdjustment)))
    )
  })

  it('rounding conserves that floor: every net is a multiple, at or above the policy price and above floorNet', () => {
    for (const row of rowsOf(declared)) {
      expect(minor(row.net) % multiple).toBe(0n)
      expect(policyPrice(row)).toBeGreaterThan(minor(row.floorNet))
      expect(minor(row.undiscountedPrice)).toBe(ceilTo(policyPrice(row), multiple))
    }
  })

  it('an agreed net is reached exactly and its discount is counted from the on-demand price', () => {
    const onDemandPrice = sum(rowsOf(declared).map(row => minor(row.undiscountedPrice)))
    const onGoingPrice = sum(rowsOf(without).map(row => minor(row.undiscountedPrice)))
    // Between the two prices: a discount for the on-demand quote, an uplift for the one without a form.
    const agreed = ceilTo((onDemandPrice + onGoingPrice) / 2n, multiple)

    expect(onGoingPrice).toBeLessThan(agreed)
    expect(agreed).toBeLessThan(onDemandPrice)

    const text = new X(agreed.toString()).div(100).toFixed(2)

    const agreedNet = [
      {
        adjustmentId: 'agreed',
        kind: 'agreed_net',
        amount: text,
        billing: 'monthly',
        lineIds: managedLineIds,
        reason: 'r'
      }
    ]

    const lower = compose(floorCatalog, demandIn(CO.currency, CO.country, 'on_demand', agreedNet))
    const higher = compose(floorCatalog, demandIn(CO.currency, CO.country, undefined, agreedNet))

    expect(minor(lower.quote.totals!.net)).toBe(agreed)
    expect(minor(lower.quote.totals!.discount)).toBe(onDemandPrice - agreed)
    expect(minor(amounts(lower.quote.totals).uplift)).toBe(0n)
    expect(minor(higher.quote.totals!.net)).toBe(agreed)
    expect(minor(amounts(higher.quote.totals).uplift)).toBe(agreed - onGoingPrice)
    expect(minor(higher.quote.totals!.discount)).toBe(0n)

    // The adjustment leaves the walk of the price as it was and the floor where it was.
    for (const row of rowsOf(lower)) {
      const full = rowsOf(declared).find(item => item.lineId === row.lineId)!

      for (const key of ['undiscountedPrice', 'engagementAdjustment', 'floorNet', 'marketAdjustment'])
        expect(row[key]).toBe(full[key])

      expectWalk(row, policyPrice(prior.get(row.lineId)!) - minor(prior.get(row.lineId)!.marketAdjustment))
    }

    // Above every floor of the on-going quote, so nothing is flagged here.
    expect(flaggedPaths(lower)).toEqual([])
  })

  it('an agreed net under the floors flags exactly the rows whose net is under floorNet', () => {
    const floors = sum(rowsOf(declared).map(row => minor(row.floorNet)))
    const agreed = new X((floors - 5000n).toString()).div(100).toFixed(2)

    const flagged = compose(
      floorCatalog,
      demandIn(CO.currency, CO.country, 'on_demand', [
        {
          adjustmentId: 'agreed',
          kind: 'agreed_net',
          amount: agreed,
          billing: 'monthly',
          lineIds: managedLineIds,
          reason: 'r'
        }
      ])
    )

    const expected = rowsOf(flagged)
      .filter(row => minor(row.net) < minor(row.floorNet))
      .map(pathOf)
      .sort()

    expect(flaggedPaths(flagged)).toEqual(expected)
    expect(expected.length).toBeGreaterThan(0)
    expect(summary(flagged).marginFloor.flaggedLinePeriods).toBe(expected.length)
  })
})

describe('a ratio under 1 is a price like any other: it can take a row under its floor', () => {
  it('without rounding every row of a policy priced at its floor is flagged, on the unchanged floor', () => {
    const cat = withForms(withoutRounding(catalogV4))
    const without = compose(cat, demandIn(CO.currency, CO.country))
    const committed = compose(cat, demandIn(CO.currency, CO.country, 'committed'))
    const prior = new Map(rowsOf(without).map(row => [row.lineId, row]))

    expect(committed.quote.calculationStatus).toBe('calculated')

    for (const row of rowsOf(committed)) {
      const before = prior.get(row.lineId)!

      expect(row.cost).toBe(before.cost)
      expect(policyPrice(row)).toBe(expectedPolicyPrice(before, '0.90'))
      expect(minor(row.engagementAdjustment)).toBe(policyPrice(row) - policyPrice(before))
      expect(minor(row.engagementAdjustment)).toBeLessThan(0n)
      // The floor of every contract on the unchanged cost: the ratio lowered the net, not the floor.
      expect(minor(row.floorNet)).toBe(floorNetOf(minor(row.cost), row.minimumMargin))
      expectWalk(row, policyPrice(before))
    }

    const expected = rowsOf(committed)
      .filter(row => underFinalNetFloor(minor(row.net), minor(row.cost), row.minimumMargin))
      .map(pathOf)
      .sort()

    expect(flaggedPaths(committed)).toEqual(expected)
    expect(expected.length).toBe(rowsOf(committed).length)
    expect(minor(committed.quote.totals!.marginAmount)).toBeLessThan(minor(without.quote.totals!.marginAmount))

    // Sized against the floor: the ratio left every row a tenth short of it, which is not the cent a policy whose
    // target is its own floor can miss without any form.
    for (const row of rowsOf(committed)) {
      const short = minor(row.floorNet) - minor(row.net)

      expect(short * 100n).toBeGreaterThan(minor(row.floorNet) * 9n)
      expect(minor(prior.get(row.lineId)!.net) - minor(row.net)).toBe(-minor(row.engagementAdjustment))
    }
  })

  it('rounding does not repair it: a row the ratio took under its floor is only raised to the next multiple', () => {
    const committed = compose(forms, demandIn(CO.currency, CO.country, 'committed'))
    const multiple = minor('10.00')
    const under = rowsOf(committed).filter(row => policyPrice(row) < minor(row.floorNet))

    expect(under.length).toBe(rowsOf(committed).length)

    for (const row of under) expect(minor(row.undiscountedPrice)).toBe(ceilTo(policyPrice(row), multiple))

    expect(flaggedPaths(committed)).toEqual(
      rowsOf(committed)
        .filter(row => minor(row.net) < minor(row.floorNet))
        .map(pathOf)
        .sort()
    )
    expect(flaggedPaths(committed).length).toBeGreaterThan(0)
  })

  it('under a base-market floor the verdict is still net under floorNet, and floorNet is the one without a form', () => {
    const cat = withForms(withMarket(catalogV4, 'CO', { factor: '0.90', floorBasis: true }))
    const without = compose(cat, demandIn(CO.currency, CO.country))
    const committed = compose(cat, demandIn(CO.currency, CO.country, 'committed'))
    const prior = new Map(rowsOf(without).map(row => [row.lineId, row]))

    for (const row of rowsOf(committed))
      for (const key of MARKET_ROW_KEYS) expect(row[key]).toBe(prior.get(row.lineId)![key])

    const expected = rowsOf(committed)
      .filter(row => minor(row.net) < minor(row.floorNet))
      .map(pathOf)
      .sort()

    expect(flaggedPaths(without)).toEqual([])
    expect(flaggedPaths(committed)).toEqual(expected)
    expect(expected.length).toBeGreaterThan(0)

    // "Met the floor before rounding" is read on the base-market price WITH the ratio: these rows did not meet it,
    // so they are raised to the next multiple of 10 and no further, although without a form they were conserved.
    const under = rowsOf(committed).filter(row => policyPrice(row) < minor(row.floorNet))

    expect(under.length).toBe(rowsOf(committed).length)

    for (const row of under) {
      expect(minor(row.undiscountedPrice)).toBe(ceilTo(policyPrice(row), minor('10.00')))
      expect(minor(row.undiscountedPrice)).toBeLessThan(ceilTo(minor(row.floorNet), minor('10.00')))
    }
  })
})

describe('resolution: one record per form, the offer record first, never a silent pick', () => {
  const brief = (form: string) => ({ ...designerBrief, engagementForm: form })
  const offerId: string = designerBrief.offerId
  const applied = (cat: unknown, form = 'on_demand') => resolveBrief(cat, brief(form))

  const boundRecord = (resolution: ReturnType<typeof resolveBrief>) =>
    resolution.bindings.filter(b => b.purpose === 'engagement_factor').map(b => b.record.recordId)

  const ratios = (resolution: ReturnType<typeof resolveBrief>) =>
    resolution.inputs.map(p => (p.input.snapshot as { engagementFactors?: { priceRatio: string }[] }).engagementFactors)

  it('the record of the offer wins over the general one of the same form', () => {
    const cat = withForms(designerCatalog, [
      ON_DEMAND,
      formRecord('on_demand', '1.25', { offerId }),
      formRecord('on_demand', '3', { offerId: 'another-offer' })
    ])

    const resolution = applied(cat)

    expect(resolution.status).toBe('resolved')
    expect(boundRecord(resolution)).toEqual([`engagement:on_demand:${offerId}`])
    expect(ratios(resolution)).toEqual(
      Array(designerBrief.periods).fill([{ form: 'on_demand', priceRatio: '1.25', source: ON_DEMAND.source }])
    )

    // And the price is the one of that ratio.
    const before = calculateCatalogQuote(designerCatalog, designerBrief)
    const after = calculateCatalogQuote(cat, brief('on_demand'))
    const priorRows = before.periods.flatMap(p => p.result.lines) as unknown as AnyRow[]

    for (const [index, row] of (after.periods.flatMap(p => p.result.lines) as unknown as AnyRow[]).entries()) {
      expect(row.engagementPriceRatio).toBe('1.25')
      expect(policyPrice(row)).toBe(expectedPolicyPrice(priorRows[index], '1.25'))
    }
  })

  it('without a record of the offer the general one applies; a record of another offer never does', () => {
    const general = applied(
      withForms(designerCatalog, [ON_DEMAND, formRecord('on_demand', '3', { offerId: 'another-offer' })])
    )

    expect(general.status).toBe('resolved')
    expect(boundRecord(general)).toEqual([ON_DEMAND.recordId])

    const foreignOnly = applied(
      withForms(designerCatalog, [formRecord('on_demand', '3', { offerId: 'another-offer' })])
    )

    expect(foreignOnly.status).toBe('needs_input')
    expect(foreignOnly.diagnostics).toEqual([
      { code: 'MISSING_CATALOG_SELECTION', path: 'engagementForm', candidates: [] }
    ])
  })

  it('two records in force for the same key are an ambiguity, at either level', () => {
    const twoGeneral = applied(
      withForms(designerCatalog, [ON_DEMAND, formRecord('on_demand', '1.15', { recordId: 'engagement:on_demand:bis' })])
    )

    expect(twoGeneral.status).toBe('needs_input')
    expect(twoGeneral.diagnostics).toEqual([
      {
        code: 'AMBIGUOUS_SELECTION',
        path: 'engagementForm',
        candidates: [ON_DEMAND.recordId, 'engagement:on_demand:bis']
      }
    ])
    expect(boundRecord(twoGeneral)).toEqual([])

    const twoOfTheOffer = applied(
      withForms(designerCatalog, [
        ON_DEMAND,
        formRecord('on_demand', '1.2', { offerId }),
        formRecord('on_demand', '1.3', { offerId, recordId: 'engagement:on_demand:offer-bis' })
      ])
    )

    expect(twoOfTheOffer.diagnostics).toEqual([
      {
        code: 'AMBIGUOUS_SELECTION',
        path: 'engagementForm',
        candidates: [`engagement:on_demand:${offerId}`, 'engagement:on_demand:offer-bis']
      }
    ])

    // Blocked, never priced with one of the two.
    const quote = calculateCatalogQuote(
      withForms(designerCatalog, [
        ON_DEMAND,
        formRecord('on_demand', '1.15', { recordId: 'engagement:on_demand:bis' })
      ]),
      brief('on_demand')
    )

    expect(quote.calculationStatus).toBe('needs_input')
    expect(quote.totals).toBeNull()
    expect(quote.periods).toEqual([])
  })

  it('a form the catalog does not hold on the quote date is a missing selection that names the field', () => {
    const missing = { code: 'MISSING_CATALOG_SELECTION', path: 'engagementForm', candidates: [] }

    // No record at all and a record of another form: the catalog does not hold the form.
    expect(applied(designerCatalog).diagnostics).toEqual([missing])
    expect(applied(withForms(designerCatalog, [ON_GOING])).diagnostics).toEqual([missing])
    // A record that starts after the quote date: the same missing selection, which says the date is the cause.
    expect(
      applied(withForms(designerCatalog, [formRecord('on_demand', '1.10', { effectiveFrom: '2026-12-01' })]))
        .diagnostics
    ).toEqual([
      {
        ...missing,
        detail: 'The quote date is before the first date a record for this selection is in force, which is 2026-12-01.'
      }
    ])

    const quote = calculateCatalogQuote(designerCatalog, brief('on_demand'))

    expect(quote.calculationStatus).toBe('needs_input')
    expect(quote.totals).toBeNull()
    expect(quote.diagnostics).toEqual([missing])
  })

  it('forms are data: any id the catalog registers resolves, none is built in', () => {
    const cat = withForms(designerCatalog, [formRecord('retainer-12m', '0.97')])

    expect(applied(cat, 'retainer-12m').status).toBe('resolved')
    expect(applied(cat, 'on_demand').status).toBe('needs_input')
    expect(applied(cat, 'on_going').status).toBe('needs_input')
  })

  it('a pending ratio blocks and an estimated one is priced under review, like any other catalog value', () => {
    const pending = applied(withForms(designerCatalog, [formRecord('on_demand', '1.10', { status: 'pending' })]))

    expect(pending.diagnostics).toEqual([{ code: 'PENDING_CATALOG_VALUE', path: 'engagementForm' }])

    const estimated = calculateCatalogQuote(
      withForms(designerCatalog, [formRecord('on_demand', '1.10', { status: 'estimated' })]),
      brief('on_demand')
    )

    expect(estimated.calculationStatus).toBe('calculated')
    expect(estimated.reviewStatus).toBe('requires_review')

    for (const period of estimated.periods)
      expect(period.result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: 'ESTIMATED_SOURCE',
          fieldPath: 'snapshot.engagementFactors',
          severity: 'review'
        })
      )
  })
})

// ---------------------------------------------------------------------------------------------------------------
// Kernel lane: inputs built here, so every amount of a case is known and small enough to derive by hand.
// ---------------------------------------------------------------------------------------------------------------

type Contract = keyof typeof PRICING_V3_ENGINES
type Currency = 'CLP' | 'USD'

const PRECISION: Record<Currency, number> = { CLP: 0, USD: 2 }

const source = {
  reference: 'engagement-form-test',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '2026-12-31',
  status: 'confirmed'
}

type LineSpec = {
  lineId: string
  /** Monthly human cost. */
  cost: string
  /** Monthly resources of the row: a tool, a platform fee and a provision. None takes a market factor. */
  tool?: string
  fee?: string
  assurance?: string
  /** One-time resource: its own row, with no human component. */
  setup?: string
  method?: 'markup' | 'target_margin'
  rate?: string
  minimumMargin?: string
}

type Spec = {
  contract: Contract
  currency: Currency
  lines: LineSpec[]
  /** Costs are denominated here; defaults to the output currency (no conversion). */
  calculationCurrency?: Currency
  fxRate?: string
  factor?: string
  floorBasis?: boolean
  multiple?: string
  adjustments?: unknown[]
  /** Form the request declares and the ratios the snapshot states (contract 1.3.0). */
  form?: string
  forms?: { form: string; priceRatio: string; source?: unknown }[]
}

const MONTHLY = [
  ['tool', 'tool'],
  ['fee', 'platform_fee'],
  ['assurance', 'talent_assurance']
] as const

// The offer is sold in CO and talent sits in CL, so the market factor and the engagement ratio are told apart.
const build = (spec: Spec) => {
  const calculation = spec.calculationCurrency ?? spec.currency

  return {
    request: {
      schemaVersion: spec.contract,
      quoteDate: '2026-06-15',
      offerId: 'offer',
      deliveryModel: 'staffing',
      engagementCode: 'monthly',
      ...(spec.form ? { engagementForm: spec.form } : {}),
      offerMarketCountry: 'CO',
      outputCurrency: spec.currency,
      duration: { unit: 'month', periods: 1 },
      lines: spec.lines.map(line => ({
        lineId: line.lineId,
        profileId: `profile-${line.lineId}`,
        seniorityCode: 'senior',
        talentCountry: 'CL',
        headcount: 1,
        dedication: { unit: 'fte', value: '1' },
        allocationMode: 'shared',
        allocationPolicyRef: 'shared',
        assignments: [
          ...MONTHLY.flatMap(([key]) =>
            line[key]
              ? [
                  {
                    resourceId: `${key}-${line.lineId}`,
                    allocationId: `${key}-allocation-${line.lineId}`,
                    scope: 'person',
                    scopeRef: line.lineId,
                    quantity: '1',
                    share: '1',
                    cashTiming: 'monthly'
                  }
                ]
              : []
          ),
          ...(line.setup
            ? [
                {
                  resourceId: `setup-${line.lineId}`,
                  allocationId: `setup-allocation-${line.lineId}`,
                  scope: 'account',
                  scopeRef: `account-${line.lineId}`,
                  quantity: '1',
                  share: '1',
                  cashTiming: 'start'
                }
              ]
            : [])
        ],
        notApplicable: []
      })),
      adjustments: spec.adjustments ?? [],
      taxTreatment: { kind: 'not_resolved' }
    },
    snapshot: {
      schemaVersion: spec.contract,
      snapshotId: 'engagement-form',
      version: 'test',
      mode: 'synthetic',
      calculationCurrency: calculation,
      countries: ['CL', 'CO'],
      currencies: [
        { code: 'CLP', precision: PRECISION.CLP },
        { code: 'USD', precision: PRECISION.USD }
      ],
      profiles: spec.lines.map(line => ({
        profileId: `profile-${line.lineId}`,
        label: `Perfil ${line.lineId}`,
        seniorityCode: 'senior',
        tierCode: 'tier',
        cost: {
          amount: line.cost,
          currency: calculation,
          source,
          localization: { kind: 'specific', country: 'CL' },
          unit: 'month',
          covers: ['human_salary']
        },
        requiredCoverages: ['human_salary']
      })),
      allocationPolicies: [
        {
          policyId: 'shared',
          mode: 'shared',
          hoursPerFteMonth: '160',
          minimumBilledFte: '0',
          dedicatedBilledFte: '1',
          source
        }
      ],
      pricingPolicies: spec.lines.map(line => ({
        profileId: `profile-${line.lineId}`,
        tierCode: 'tier',
        offerId: 'offer',
        engagementCode: 'monthly',
        method: line.method ?? 'target_margin',
        rate: line.rate ?? '0.5',
        basis: 'all_costs',
        minimumMargin: line.minimumMargin ?? '0.45',
        source
      })),
      talentFactors: [],
      marketFactors: [
        { country: 'CO', factor: spec.factor ?? '1', ...(spec.floorBasis ? { floorBasis: FLOOR_BASIS } : {}), source }
      ],
      ...(spec.forms ? { engagementFactors: spec.forms.map(item => ({ source, ...item })) } : {}),
      resources: spec.lines.flatMap(line => [
        ...MONTHLY.flatMap(([key, kind]) =>
          line[key]
            ? [
                {
                  amount: line[key],
                  currency: calculation,
                  source,
                  resourceId: `${key}-${line.lineId}`,
                  label: `${key} ${line.lineId}`,
                  kind,
                  unit: 'month',
                  scope: 'person',
                  covers: [`${key}-${line.lineId}`]
                }
              ]
            : []
        ),
        ...(line.setup
          ? [
              {
                amount: line.setup,
                currency: calculation,
                source,
                resourceId: `setup-${line.lineId}`,
                label: `Implementación ${line.lineId}`,
                kind: 'setup',
                unit: 'once',
                scope: 'account',
                covers: [`setup-${line.lineId}`]
              }
            ]
          : [])
      ]),
      fx: spec.fxRate ? [{ from: calculation, to: spec.currency, rate: spec.fxRate, source }] : [],
      ...(spec.multiple ? { priceRounding: { multiple: spec.multiple, source } } : {})
    }
  }
}

const STANDARD_FORMS = [
  { form: 'on_going', priceRatio: '1' },
  { form: 'on_demand', priceRatio: '1.10' }
]

const calc = (spec: Spec) => {
  const result = calculatePricingV3(build(spec))

  expect(result.diagnostics.filter(item => item.severity !== 'review')).toEqual([])
  expect(result.calculationStatus).toBe('calculated')

  return result
}

const kernelRows = (result: ReturnType<typeof calculatePricingV3>) => result.lines as unknown as AnyRow[]
const codes = (result: ReturnType<typeof calculatePricingV3>) => result.diagnostics.map(item => item.code)

const kernelFlags = (result: ReturnType<typeof calculatePricingV3>) =>
  result.diagnostics
    .filter(item => item.code === 'MARGIN_BELOW_FLOOR')
    .map(item => item.fieldPath.replace('result.lines.', ''))
    .sort()

describe('the rule, from inputs small enough to derive by hand', () => {
  // Target margin 0.5: the multiplier is exactly 2, so every amount below is an integer computed here.
  // Line a is a person with a one-time setup row; line b is a person with a tool, a platform fee and a provision.
  const HUMAN = 1_000_000n
  const TOOL = 250_000n
  const FEE = 100_000n
  const ASSURANCE = 60_000n
  const SETUP = 50_000n
  const RESOURCES = TOOL + FEE + ASSURANCE
  const MINIMUM = '0.45'
  const RATIO = { numerator: 11n, denominator: 10n, text: '1.10' }
  const FACTOR = { numerator: 9n, denominator: 10n, text: '0.9' }

  const spec = (extra: Partial<Spec> = {}): Spec => ({
    contract: '1.3.0',
    currency: 'CLP',
    form: 'on_demand',
    forms: STANDARD_FORMS,
    lines: [
      { lineId: 'a', cost: HUMAN.toString(), setup: SETUP.toString(), minimumMargin: MINIMUM },
      {
        lineId: 'b',
        cost: HUMAN.toString(),
        tool: TOOL.toString(),
        fee: FEE.toString(),
        assurance: ASSURANCE.toString(),
        minimumMargin: MINIMUM
      }
    ],
    ...extra
  })

  const engaged = (price: bigint) => (price * RATIO.numerator) / RATIO.denominator
  const lowered = (HUMAN * FACTOR.numerator) / FACTOR.denominator

  describe('at market factor 1', () => {
    const expected = {
      'a:1:monthly': { cost: HUMAN, price: 2n * HUMAN },
      'a:1:setup': { cost: SETUP, price: 2n * SETUP },
      'b:1:monthly': { cost: HUMAN + RESOURCES, price: 2n * (HUMAN + RESOURCES) }
    } as const

    const result = calc(spec())
    const row = (lineId: string) => kernelRows(result).find(item => item.lineId === lineId)!

    it('cost, price, adjustment and floor of every row, monthly and setup', () => {
      expect(
        kernelRows(result)
          .map(item => item.lineId)
          .sort()
      ).toEqual(Object.keys(expected).sort())

      for (const [lineId, want] of Object.entries(expected)) {
        const got = row(lineId)

        expect(minor(got.cost)).toBe(want.cost)
        expect(minor(got.undiscountedPrice)).toBe(engaged(want.price))
        expect(minor(got.net)).toBe(engaged(want.price))
        expect(minor(got.engagementAdjustment)).toBe(engaged(want.price) - want.price)
        expect(got.engagementPriceRatio).toBe(RATIO.text)
        expect(minor(got.marketAdjustment)).toBe(0n)
        expect(minor(got.roundingAdjustment)).toBe(0n)
        expect(minor(got.marginAmount)).toBe(engaged(want.price) - want.cost)
        expect(minor(got.floorNet)).toBe(floorNetOf(want.cost, MINIMUM))
        expectWalk(got, want.price)
      }
    })

    it('worked by hand', () => {
      // 2.000.000 x 1,10; 100.000 x 1,10; 2.820.000 x 1,10.
      expect(minor(row('a:1:monthly').net)).toBe(2_200_000n)
      expect(minor(row('a:1:setup').net)).toBe(110_000n)
      expect(minor(row('b:1:monthly').net)).toBe(3_102_000n)
      expect(minor(row('a:1:monthly').engagementAdjustment)).toBe(200_000n)
      expect(minor(row('a:1:setup').engagementAdjustment)).toBe(10_000n)
      expect(minor(row('b:1:monthly').engagementAdjustment)).toBe(282_000n)
      // The floors of every contract: 1.000.000 / 0,55 and 50.000 / 0,55, raised to the peso.
      expect(minor(row('a:1:monthly').floorNet)).toBe(1_818_182n)
      expect(minor(row('a:1:setup').floorNet)).toBe(90_910n)
      expect(minor(result.totals!.net)).toBe(5_412_000n)
      expect(minor(amounts(result.totals).engagementAdjustment)).toBe(492_000n)
      expect(minor(result.totals!.cost)).toBe(HUMAN + SETUP + HUMAN + RESOURCES)
    })

    it('every component carries the ratio once: person, tool, platform fee, provision and setup', () => {
      const components = kernelRows(result).flatMap(item => item.components)
      const byKind = new Map(components.map(component => [component.kind, component]))

      expect([...byKind.keys()].sort()).toEqual(['human', 'platform_fee', 'setup', 'talent_assurance', 'tool'])

      for (const [kind, cost] of [
        ['tool', TOOL],
        ['platform_fee', FEE],
        ['talent_assurance', ASSURANCE],
        ['setup', SETUP]
      ] as const) {
        expect(minor(byKind.get(kind)!.cost)).toBe(cost)
        expect(minor(byKind.get(kind)!.price)).toBe(engaged(2n * cost))
      }

      for (const component of components) {
        expect(component.trace.engagementPriceRatio).toBe(RATIO.text)
        // A stored component is sold at its price: the components of a row add up to its policy price.
      }

      for (const item of kernelRows(result))
        expect(sum(item.components.map(component => minor(component.price)))).toBe(policyPrice(item))
    })

    it('the same input without a form is the 1.2.0 result: 1.3.0 only adds, and the ratio is what moved', () => {
      const before = calc(spec({ contract: '1.2.0', form: undefined, forms: undefined }))

      for (const item of kernelRows(result)) {
        const prior = kernelRows(before).find(other => other.lineId === item.lineId)!

        for (const key of ['cost', 'minimumMargin', ...MARKET_ROW_KEYS]) expect(item[key]).toBe(prior[key])

        expect(minor(item.undiscountedPrice) * RATIO.denominator).toBe(minor(prior.undiscountedPrice) * RATIO.numerator)
      }

      expect(result.totals!.cost).toBe(before.totals!.cost)
      expect(result.totals!.cashCommitment).toBe(before.totals!.cashCommitment)
      for (const key of NEW_TOTAL_KEYS) expect(before.totals).not.toHaveProperty(key)
      for (const item of kernelRows(before)) for (const key of NEW_ROW_KEYS) expect(item).not.toHaveProperty(key)
      expect(JSON.stringify(before)).not.toContain('engagement')
    })
  })

  describe('with a market factor of 0.9 whose floor follows the base market', () => {
    const market = { factor: FACTOR.text, floorBasis: true }
    const result = calc(spec(market))
    const row = (lineId: string) => kernelRows(result).find(item => item.lineId === lineId)!

    const expected = {
      'a:1:monthly': { cost: HUMAN, basePrice: 2n * HUMAN, marketPrice: 2n * lowered },
      'a:1:setup': { cost: SETUP, basePrice: 2n * SETUP, marketPrice: 2n * SETUP },
      'b:1:monthly': {
        cost: HUMAN + RESOURCES,
        basePrice: 2n * (HUMAN + RESOURCES),
        marketPrice: 2n * (lowered + RESOURCES)
      }
    } as const

    it('market adjustment at ratio 1, engagement adjustment on the market price, and the walk to the base', () => {
      for (const [lineId, want] of Object.entries(expected)) {
        const got = row(lineId)

        const rho =
          want.marketPrice < want.basePrice ? { price: want.marketPrice, basePrice: want.basePrice } : undefined

        expect(minor(got.cost)).toBe(want.cost)
        expect(minor(got.marketAdjustment)).toBe(want.marketPrice - want.basePrice)
        expect(minor(got.engagementAdjustment)).toBe(engaged(want.marketPrice) - want.marketPrice)
        expect(minor(got.undiscountedPrice)).toBe(engaged(want.marketPrice))
        expect(minor(got.floorNet)).toBe(floorNetOf(want.cost, MINIMUM, rho))
        expectWalk(got, want.basePrice)
      }
    })

    it('worked by hand: the floor is the one of the market, whatever the form', () => {
      // 1.800.000 x 1,10 and (1.800.000 + 820.000) x 1,10.
      expect(minor(row('a:1:monthly').net)).toBe(1_980_000n)
      expect(minor(row('b:1:monthly').net)).toBe(2_882_000n)
      expect(minor(row('a:1:monthly').marketAdjustment)).toBe(-200_000n)
      expect(minor(row('a:1:monthly').engagementAdjustment)).toBe(180_000n)
      expect(minor(row('b:1:monthly').engagementAdjustment)).toBe(262_000n)
      // rho is read at ratio 1: 1.800.000 / 2.000.000 and 2.620.000 / 2.820.000; a setup row has no person.
      expect(row('a:1:monthly').marketPriceRatio).toBe('0.9')
      expect(sameToWorkingPrecision(row('b:1:monthly').marketPriceRatio, new X(2_620_000).div(2_820_000))).toBe(true)
      expect(row('a:1:setup').marketPriceRatio).toBe('1')
      // 1.000.000 x 0,9 / 0,55 = 1.636.363,63...: raised to 1.636.364. Not 1.800.000 (x 1,10 / 0,55 / ...).
      expect(minor(row('a:1:monthly').floorNet)).toBe(1_636_364n)
      expect(minor(row('a:1:setup').floorNet)).toBe(90_910n)
    })

    it.each(['0.80', '0.90', '1', '1.10', '1.5'])(
      'ratio %s leaves market adjustment, rho and floor untouched',
      ratio => {
        const before = calc(spec({ ...market, contract: '1.2.0', form: undefined, forms: undefined }))
        const after = calc(spec({ ...market, form: 'x', forms: [{ form: 'x', priceRatio: ratio }] }))

        for (const item of kernelRows(after)) {
          const prior = kernelRows(before).find(other => other.lineId === item.lineId)!

          for (const key of ['cost', ...MARKET_ROW_KEYS]) expect(item[key]).toBe(prior[key])
          expect(item.engagementPriceRatio).toBe(ratio)
        }

        // The verdict is the net of this form against that floor.
        expect(kernelFlags(after)).toEqual(
          kernelRows(after)
            .filter(item => minor(item.net) < minor(item.floorNet))
            .map(item => item.lineId)
            .sort()
        )
      }
    )

    it('the verdict is exact at the floor: an agreed net of floorNet passes and one peso less is flagged', () => {
      const floor = minor(row('a:1:monthly').floorNet)

      const agreed = (amount: bigint) =>
        calc(
          spec({
            ...market,
            adjustments: [
              {
                adjustmentId: 'x',
                kind: 'agreed_net',
                amount: amount.toString(),
                billing: 'monthly',
                lineIds: ['a'],
                reason: 'r'
              }
            ]
          })
        )

      expect(kernelFlags(agreed(floor))).toEqual([])
      expect(kernelFlags(agreed(floor - 1n))).toEqual(['a:1:monthly'])
      // The discount is counted from the on-demand price of the row.
      expect(minor(kernelRows(agreed(floor)).find(item => item.lineId === 'a:1:monthly')!.discount)).toBe(
        1_980_000n - floor
      )
    })
  })

  describe('a ratio under 1', () => {
    it('0.95 keeps line a above its floor and 0.90 takes it under: same floor, lower net', () => {
      const at = (ratio: string) => calc(spec({ form: 'c', forms: [{ form: 'c', priceRatio: ratio }] }))

      const monthly = (result: ReturnType<typeof calc>) =>
        kernelRows(result).find(item => item.lineId === 'a:1:monthly')!

      // 2.000.000 x 0,95 = 1.900.000 and x 0,90 = 1.800.000, against a floor of 1.818.182.
      expect(minor(monthly(at('0.95')).net)).toBe(1_900_000n)
      expect(minor(monthly(at('0.90')).net)).toBe(1_800_000n)
      expect(minor(monthly(at('0.95')).floorNet)).toBe(1_818_182n)
      expect(minor(monthly(at('0.90')).floorNet)).toBe(1_818_182n)
      expect(minor(monthly(at('0.90')).engagementAdjustment)).toBe(-200_000n)
      expect(kernelFlags(at('0.95'))).toEqual([])
      expect(kernelFlags(at('0.90'))).toEqual(['a:1:monthly', 'a:1:setup', 'b:1:monthly'])
      expect(at('0.90').reviewStatus).toBe('requires_review')
    })
  })

  describe('with commercial rounding', () => {
    it('the ratio is applied to the unrounded price and the result is then raised to the multiple', () => {
      // 1.234.567 x 2 = 2.469.134; x 1,10 = 2.716.047,4 -> 2.716.047 -> 2.720.000. Rounding first would give
      // 2.470.000 x 1,10 = 2.717.000, which is not a multiple of 10.000.
      const result = calc(
        spec({ multiple: '10000', lines: [{ lineId: 'a', cost: '1234567', setup: '33333', minimumMargin: MINIMUM }] })
      )

      const monthly = kernelRows(result).find(item => item.lineId === 'a:1:monthly')!
      const setup = kernelRows(result).find(item => item.lineId === 'a:1:setup')!

      expect(minor(monthly.engagementAdjustment)).toBe(2_716_047n - 2_469_134n)
      expect(minor(monthly.undiscountedPrice)).toBe(2_720_000n)
      expect(minor(monthly.roundingAdjustment)).toBe(2_720_000n - 2_716_047n)
      // 66.666 x 1,10 = 73.332,6 -> 73.333 -> 80.000.
      expect(minor(setup.engagementAdjustment)).toBe(73_333n - 66_666n)
      expect(minor(setup.undiscountedPrice)).toBe(80_000n)
      expectWalk(monthly, 2_469_134n)
      expectWalk(setup, 66_666n)
    })
  })

  describe('with commercial rounding and a row the ratio leaves exactly at its floor', () => {
    // CLP costs sold in USD at 0,001, markup 1 (price = 2 x cost), ratio 0,8 and a minimum of 0,375: the unrounded
    // price is 1,6 x cost, exactly the floor, so the row "met the floor before rounding" and rounding must conserve
    // it. Cost 100.005 presents as 100,01 (half up); the multiple is the cent, so only conservation can move a price.
    const line = { lineId: 'a', cost: '100005', method: 'markup' as const, rate: '1', minimumMargin: '0.375' }
    const shared = { currency: 'USD', calculationCurrency: 'CLP', fxRate: '0.001', multiple: '0.01' } as const
    const committed = { form: 'c', forms: [{ form: 'c', priceRatio: '0.8' }] }

    it('final-net floor: 160,008 presents as 160,01 and is conserved up to 160,02', () => {
      const [row] = kernelRows(calc({ contract: '1.3.0', ...shared, ...committed, lines: [line] }))

      // 100,01 / 0,625 = 160,016: raised to 160,02.
      expect(row.cost).toBe('100.01')
      expect(row.floorNet).toBe('160.02')
      expect(policyPrice(row)).toBe(minor('160.01'))
      expect(row.undiscountedPrice).toBe('160.02')
      expect(row.roundingAdjustment).toBe('0.01')
      expect(row.engagementAdjustment).toBe('-40.00')
      expectWalk(row, minor('200.01'))
    })

    it('base-market floor: the row is conserved on the floor of its market, read with the ratio', () => {
      const result = calc({
        contract: '1.3.0',
        ...shared,
        ...committed,
        factor: '0.9',
        floorBasis: true,
        lines: [line]
      })

      const [row] = kernelRows(result)

      // Market price at ratio 1: 180,009 -> 180,01 against a base of 200,01. With the ratio: 144,0072 -> 144,01.
      // Floor: 100,01 x 180,01 / (0,625 x 200,01) = 144,015...: raised to 144,02.
      expect(row.marketAdjustment).toBe('-20.00')
      expect(row.engagementAdjustment).toBe('-36.00')
      expect(policyPrice(row)).toBe(minor('144.01'))
      expect(minor(row.floorNet)).toBe(floorNetOf(minor('100.01'), '0.375', { price: 18001n, basePrice: 20001n }))
      expect(row.floorNet).toBe('144.02')
      expect(row.undiscountedPrice).toBe('144.02')
      expect(kernelFlags(result)).toEqual([])
      expectWalk(row, minor('200.01'))
    })

    it('a ratio that leaves the row under its floor gets no conservation: next multiple only, and flagged', () => {
      const result = calc({
        contract: '1.3.0',
        ...shared,
        form: 'c',
        forms: [{ form: 'c', priceRatio: '0.79' }],
        lines: [line]
      })

      const [row] = kernelRows(result)

      // 200,01 x 0,79 = 158,0079 -> 158,01, already on the cent and under 160,02.
      expect(row.undiscountedPrice).toBe('158.01')
      expect(row.roundingAdjustment).toBe('0.00')
      expect(row.floorNet).toBe('160.02')
      expect(kernelFlags(result)).toEqual(['a:1:monthly'])
    })
  })

  describe('through a currency conversion, to the cent', () => {
    it('the presented price is the exact product half up, not the presented prior price times the ratio', () => {
      // CLP costs sold in USD at 0,0011: 1.234.567 x 2 x 0,0011 = 2.716,0474 -> 2.716,05 without a form;
      // x 1,10 = 2.987,65214 -> 2.987,65, while 2.716,05 x 1,10 = 2.987,655 would present as 2.987,66.
      const lines = [{ lineId: 'a', cost: '1234567', minimumMargin: '0.3' }]
      const fx = { currency: 'USD', calculationCurrency: 'CLP', fxRate: '0.0011' } as const
      const before = calc({ contract: '1.2.0', lines, ...fx })
      const after = calc({ contract: '1.3.0', lines, ...fx, form: 'on_demand', forms: STANDARD_FORMS })

      expect(kernelRows(before)[0].undiscountedPrice).toBe('2716.05')
      expect(kernelRows(after)[0].undiscountedPrice).toBe('2987.65')
      expect(kernelRows(after)[0].engagementAdjustment).toBe('271.60')
      expect(kernelRows(after)[0].cost).toBe(kernelRows(before)[0].cost)
      expectWalk(kernelRows(after)[0], minor('2716.05'))
    })
  })
})

describe('the kernel contract: the keys exist only in 1.3.0 and a declared form needs its ratio', () => {
  const lines = [{ lineId: 'a', cost: '1000000' }]

  it.each(['1.0.0', '1.1.0', '1.2.0'] as const)(
    'contract %s rejects a form and a list of ratios, 1.3.0 takes them',
    contract => {
      const withForm = calculatePricingV3(build({ contract, currency: 'CLP', lines, form: 'on_demand' }))
      const withRatios = calculatePricingV3(build({ contract, currency: 'CLP', lines, forms: STANDARD_FORMS }))

      expect(withForm.calculationStatus).toBe('invalid')
      expect(codes(withForm)).toEqual(['INVALID_INPUT'])
      expect(withRatios.calculationStatus).toBe('invalid')
      expect(codes(withRatios)).toEqual(['INVALID_INPUT'])
      expect(withForm.engineVersion).toBe(PRICING_V3_ENGINES[contract])

      expect(
        calc({ contract: '1.3.0', currency: 'CLP', lines, form: 'on_demand', forms: STANDARD_FORMS }).engineVersion
      ).toBe(PRICING_V3_ENGINES['1.3.0'])
    }
  )

  it('a declared form without its ratio withholds the calculation; no ratio is assumed', () => {
    for (const forms of [undefined, [], [{ form: 'on_going', priceRatio: '1' }]]) {
      const result = calculatePricingV3(build({ contract: '1.3.0', currency: 'CLP', lines, form: 'on_demand', forms }))

      expect(result.calculationStatus).toBe('needs_input')
      expect(result.totals).toBeNull()
      expect(result.lines).toEqual([])
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: 'MISSING_ENGAGEMENT_FACTOR',
          fieldPath: 'snapshot.engagementFactors',
          severity: 'missing'
        })
      ])
    }
  })

  it('the ratio is a positive decimal and each form is stated once', () => {
    for (const priceRatio of ['0', '-1', '1,10', 'abc', '']) {
      const result = calculatePricingV3(
        build({ contract: '1.3.0', currency: 'CLP', lines, form: 'x', forms: [{ form: 'x', priceRatio }] })
      )

      expect(result.calculationStatus).toBe('invalid')
      expect(codes(result)).toContain('INVALID_INPUT')
    }

    const twice = calculatePricingV3(
      build({
        contract: '1.3.0',
        currency: 'CLP',
        lines,
        form: 'x',
        forms: [
          { form: 'x', priceRatio: '1.1' },
          { form: 'x', priceRatio: '1.2' }
        ]
      })
    )

    expect(twice.calculationStatus).toBe('invalid')
    expect(twice.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_ID', fieldPath: 'snapshot.engagementFactors' })
    )
  })

  it('the source of the ratio is judged like every other source', () => {
    const withSource = (edit: Record<string, string>) =>
      calculatePricingV3(
        build({
          contract: '1.3.0',
          currency: 'CLP',
          lines,
          form: 'x',
          forms: [{ form: 'x', priceRatio: '1.1', source: { ...source, ...edit } }]
        })
      )

    expect(withSource({ effectiveUntil: '2026-03-31' }).calculationStatus).toBe('needs_input')
    expect(codes(withSource({ effectiveUntil: '2026-03-31' }))).toEqual(['STALE_SOURCE'])
    expect(codes(withSource({ status: 'pending' }))).toEqual(['MISSING_SOURCE_CONFIRMATION'])
    expect(withSource({ status: 'estimated' })).toMatchObject({
      calculationStatus: 'calculated',
      reviewStatus: 'requires_review'
    })
    expect(codes(withSource({ status: 'estimated' }))).toEqual(['ESTIMATED_SOURCE'])
  })

  it('a 1.2.0 input relabelled 1.3.0 is valid and prices the same: ratio 1 and a zero adjustment', () => {
    const shared = { currency: 'USD' as const, factor: '0.85', floorBasis: true, multiple: '10' }

    const many = [
      { lineId: 'a', cost: '4321.09', tool: '250', setup: '900', rate: '0.45' },
      { lineId: 'b', cost: '2765.4', fee: '120.5', rate: '0.45' }
    ]

    const before = calc({ contract: '1.2.0', lines: many, ...shared })
    const after = calc({ contract: '1.3.0', lines: many, ...shared })

    expect(stripContract(after, NEW_ROW_KEYS)).toEqual(stripContract(before, NEW_ROW_KEYS))
    expect(minor(amounts(after.totals).engagementAdjustment)).toBe(0n)

    for (const item of kernelRows(after)) {
      expect(minor(item.engagementAdjustment)).toBe(0n)
      expect(item.engagementPriceRatio).toBe('1')
    }

    // A ratio the snapshot states for a form nobody declared is not applied.
    expect(calc({ contract: '1.3.0', lines: many, ...shared, forms: STANDARD_FORMS })).toEqual(after)
  })
})

describe('the ratio with market factor, rounding and adjustments together, over generated cases', () => {
  // Seeded generator: reproducible, no dependency.
  const seeded = (seed: number) => {
    let state = seed >>> 0

    const next = () => {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state

      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))

    return { int, pick: <T>(items: readonly T[]) => items[int(0, items.length - 1)] }
  }

  const RATIOS = ['0.85', '0.9', '0.95', '1', '1.05', '1.10', '1.25'] as const

  const MARKETS = [
    { factor: '0.85', floorBasis: true },
    { factor: '0.9', floorBasis: true },
    { factor: '0.9', floorBasis: false },
    { factor: '1', floorBasis: false },
    { factor: '1.1', floorBasis: true }
  ] as const

  const MULTIPLES: Record<Currency, readonly (string | undefined)[]> = {
    CLP: [undefined, '1000', '10000', '50000'],
    USD: [undefined, '1', '10', '250']
  }

  type Range = readonly [min: number, max: number]

  const amount = (random: ReturnType<typeof seeded>, currency: Currency, [min, max]: Range) =>
    currency === 'CLP' ? String(random.int(min, max)) : new X(random.int(min, max)).div(100).toFixed(2)

  // Markup policies only: the multiplier is 1 + rate, a finite decimal, so the integer oracle below is exact.
  const cases = Array.from({ length: 160 }, (_, index) => {
    const random = seeded(7919 * (index + 1))
    const currency = random.pick(['CLP', 'USD'] as const)
    const market = random.pick(MARKETS)
    const big: Range = currency === 'CLP' ? [300_000, 9_000_000] : [50_000, 1_500_000]
    const small: Range = currency === 'CLP' ? [10_000, 900_000] : [1_000, 90_000]

    return {
      name: `#${index}`,
      ratio: random.pick(RATIOS),
      spec: {
        currency,
        ...market,
        multiple: random.pick(MULTIPLES[currency]),
        lines: Array.from({ length: random.int(1, 3) }, (_, line) => ({
          lineId: `l${line}`,
          cost: amount(random, currency, big),
          ...(random.int(0, 1) ? { tool: amount(random, currency, small) } : {}),
          ...(random.int(0, 2) === 0 ? { fee: amount(random, currency, small) } : {}),
          ...(random.int(0, 2) === 0 ? { setup: amount(random, currency, small) } : {}),
          method: 'markup' as const,
          rate: random.pick(['0.6', '0.8', '1', '1.25']),
          minimumMargin: random.pick(['0.3', '0.4', '0.45'])
        }))
      } satisfies Omit<Spec, 'contract'>
    }
  })

  const run = (item: (typeof cases)[number]) => ({
    before: calc({ ...item.spec, contract: '1.2.0' }),
    after: calc({ ...item.spec, contract: '1.3.0', form: 'f', forms: [{ form: 'f', priceRatio: item.ratio }] })
  })

  /** Policy price of a row from the inputs of the case alone, in minor units. */
  const priceFromInputs = (item: (typeof cases)[number], row: AnyRow) => {
    const line = item.spec.lines.find(candidate => candidate.lineId === row.parentLineId)!
    const multiplier = add(exact('1'), exact(line.rate))

    const of = (cost: string | undefined, ...factors: string[]) =>
      cost ? times(exact(cost), multiplier, exact(item.ratio), ...factors.map(exact)) : exact('0')

    const total =
      row.kind === 'setup'
        ? of((line as LineSpec).setup)
        : add(add(of(line.cost, item.spec.factor), of((line as LineSpec).tool)), of((line as LineSpec).fee))

    return halfUp(total, PRECISION[item.spec.currency])
  }

  it('the generator covers both currencies, ratios on both sides of 1, market floors and rounding', () => {
    expect(new Set(cases.map(item => item.spec.currency)).size).toBe(2)
    expect(new Set(cases.map(item => item.ratio)).size).toBe(RATIOS.length)
    expect(cases.some(item => item.spec.floorBasis && Number(item.spec.factor) < 1 && item.spec.multiple)).toBe(true)
    expect(cases.some(item => !item.spec.multiple)).toBe(true)
    expect(cases.some(item => item.spec.lines.some(line => 'setup' in line))).toBe(true)
  })

  it('cost, market adjustment, rho and floor are those of the same input without a form; the price is exact', () => {
    for (const item of cases) {
      const { before, after } = run(item)

      expect(after.totals!.cost, item.name).toBe(before.totals!.cost)
      expect(after.totals!.cashCommitment, item.name).toBe(before.totals!.cashCommitment)

      for (const row of kernelRows(after)) {
        const prior = kernelRows(before).find(other => other.lineId === row.lineId)!

        for (const key of ['cost', 'minimumMargin', ...MARKET_ROW_KEYS]) expect(row[key], item.name).toBe(prior[key])

        expect(policyPrice(row), `${item.name} ${row.lineId}`).toBe(priceFromInputs(item, row))
        expect(minor(row.engagementAdjustment), item.name).toBe(policyPrice(row) - policyPrice(prior))
        expect(row.engagementPriceRatio).toBe(item.ratio)
        expectWalk(row, policyPrice(prior) - minor(prior.marketAdjustment))
      }

      expectWalk(
        amounts(after.totals),
        sum(kernelRows(before).map(prior => policyPrice(prior) - minor(prior.marketAdjustment)))
      )
    }
  })

  it('every net is a multiple at or above the policy price; the verdict is exactly "net under floorNet"', () => {
    let flagged = 0

    for (const item of cases) {
      const { after } = run(item)

      const multiple = item.spec.multiple
        ? minor(new X(item.spec.multiple).toFixed(PRECISION[item.spec.currency]))
        : null

      for (const row of kernelRows(after)) {
        if (multiple) {
          const raised = minor(row.undiscountedPrice) - policyPrice(row)

          expect(minor(row.undiscountedPrice) % multiple, item.name).toBe(0n)
          expect(raised >= 0n, item.name).toBe(true)

          // Past the next multiple only to conserve the floor of a row that met it, and then no further than that
          // (the hand-derived conservation cases above show the branch; markup policies rarely sit on their floor).
          if (raised >= multiple)
            expect(minor(row.undiscountedPrice), item.name).toBe(ceilTo(minor(row.floorNet), multiple))
        } else expect(minor(row.roundingAdjustment), item.name).toBe(0n)
      }

      const expected = kernelRows(after)
        .filter(row => minor(row.net) === 0n || minor(row.net) < minor(row.floorNet))
        .map(row => row.lineId)
        .sort()

      expect(kernelFlags(after), item.name).toEqual(expected)
      flagged += expected.length
    }

    // Flagged rows occur in the sample, so the verdict property is not vacuous.
    expect(flagged).toBeGreaterThan(0)
  })

  it('without rounding, a ratio of 1 or more never adds a flag and a ratio of 1 or less never removes one', () => {
    let moved = 0

    for (const item of cases) {
      const spec = { ...item.spec, multiple: undefined }
      const before = kernelFlags(calc({ ...spec, contract: '1.2.0' }))

      const after = kernelFlags(
        calc({ ...spec, contract: '1.3.0', form: 'f', forms: [{ form: 'f', priceRatio: item.ratio }] })
      )

      if (Number(item.ratio) >= 1)
        expect(
          after.every(lineId => before.includes(lineId)),
          item.name
        ).toBe(true)
      if (Number(item.ratio) <= 1)
        expect(
          before.every(lineId => after.includes(lineId)),
          item.name
        ).toBe(true)
      if (after.length !== before.length) moved += 1
    }

    expect(moved).toBeGreaterThan(0)
  })

  it('a discount or an agreed net is applied to the price with the ratio and never moves the floor', () => {
    for (const item of cases.slice(0, 60)) {
      const { after } = run(item)
      const lineIds = item.spec.lines.map(line => line.lineId)

      const monthly = sum(
        kernelRows(after)
          .filter(row => row.kind === 'monthly')
          .map(row => minor(row.undiscountedPrice))
      )

      const scale = PRECISION[item.spec.currency]
      const agreed = (monthly * 9n) / 10n

      const text = (value: bigint) =>
        scale === 0 ? value.toString() : new X(value.toString()).div(10 ** scale).toFixed(scale)

      const adjusted = calc({
        ...item.spec,
        contract: '1.3.0',
        form: 'f',
        forms: [{ form: 'f', priceRatio: item.ratio }],
        adjustments: [
          { adjustmentId: 'n', kind: 'agreed_net', amount: text(agreed), billing: 'monthly', lineIds, reason: 'r' }
        ]
      })

      const rows = kernelRows(adjusted).filter(row => row.kind === 'monthly')

      expect(sum(rows.map(row => minor(row.net))), item.name).toBe(agreed)
      expect(sum(rows.map(row => minor(row.discount))), item.name).toBe(monthly - agreed)

      for (const row of kernelRows(adjusted)) {
        const full = kernelRows(after).find(other => other.lineId === row.lineId)!

        for (const key of ['undiscountedPrice', 'engagementAdjustment', 'floorNet', 'marketPriceRatio'])
          expect(row[key], item.name).toBe(full[key])
      }

      expect(kernelFlags(adjusted), item.name).toEqual(
        kernelRows(adjusted)
          .filter(row => minor(row.net) < minor(row.floorNet))
          .map(row => row.lineId)
          .sort()
      )
    }
  })
})

describe('replay of a 1.3.0 artifact in every lane', () => {
  const kernelInput = () =>
    build({
      contract: '1.3.0',
      currency: 'USD',
      factor: '0.85',
      floorBasis: true,
      multiple: '10',
      form: 'on_demand',
      forms: STANDARD_FORMS,
      lines: [
        { lineId: 'a', cost: '4321.09', tool: '250', setup: '900', rate: '0.45' },
        { lineId: 'b', cost: '2765.4', rate: '0.45' }
      ],
      adjustments: [{ adjustmentId: 'd', kind: 'discount', rate: '0.03', lineIds: ['a'], reason: 'r' }]
    })

  it('kernel lane: verifies, carries the engine of its contract, and any touched value is REPLAY_MISMATCH', () => {
    const artifact = runPricingV3(kernelInput(), '2026-10-11').artifact!
    const frozen = () => clone(artifact) as unknown as Record<string, any>

    expect(artifact.semantic.engineVersion).toBe(PRICING_V3_ENGINES['1.3.0'])
    expect(artifact.semantic.result.engineVersion).toBe(PRICING_V3_ENGINES['1.3.0'])
    expect(artifact.semantic.result.precisionPolicy).toBe(PRICING_V3_PRECISION_POLICIES['1.3.0'])
    expect(artifact.semantic.result.calculationStatus).toBe('calculated')
    expect(replayPricingV3(frozen()).replayDigest).toBe(artifact.replayDigest)
    // The declared form and its ratio are part of the frozen input.
    expect(frozen().semantic.input.request.engagementForm).toBe('on_demand')
    expect(frozen().semantic.input.snapshot.engagementFactors).toHaveLength(2)

    const edits: ((item: Record<string, any>) => void)[] = [
      item => {
        item.semantic.result.lines[0].engagementAdjustment = '0.00'
      },
      item => {
        item.semantic.result.lines[0].engagementPriceRatio = '1'
      },
      item => {
        item.semantic.result.totals.engagementAdjustment = '0.00'
      },
      item => {
        item.semantic.input.request.engagementForm = 'on_going'
      },
      item => {
        delete item.semantic.input.request.engagementForm
      },
      item => {
        item.semantic.input.snapshot.engagementFactors[1].priceRatio = '1.2'
      },
      item => {
        item.semantic.engineVersion = PRICING_V3_ENGINES['1.2.0']
      }
    ]

    for (const edit of edits) {
      const touched = frozen()

      edit(touched)
      expect(() => replayPricingV3(touched)).toThrow('REPLAY_MISMATCH')
    }
  })

  it('kernel lane: artifacts of the earlier contracts built here still verify, with none of the 1.3.0 keys', () => {
    for (const contract of ['1.0.0', '1.1.0', '1.2.0'] as const) {
      const artifact = runPricingV3(
        build({ contract, currency: 'USD', factor: '0.85', lines: [{ lineId: 'a', cost: '4321.09', tool: '250' }] }),
        '2026-10-11'
      ).artifact!

      expect(artifact.semantic.engineVersion).toBe(PRICING_V3_ENGINES[contract])
      expect(replayPricingV3(clone(artifact)).replayDigest).toBe(artifact.replayDigest)
      expect(JSON.stringify(artifact.semantic.result)).not.toContain('engagement')
    }
  })

  it('comparison reports engagementAdjustment only when both sides carry it', () => {
    const at = (contract: Contract, form?: string) =>
      runPricingV3(
        build({
          contract,
          currency: 'USD',
          lines: [{ lineId: 'a', cost: '1000' }],
          ...(form ? { form, forms: STANDARD_FORMS } : {})
        })
      ).artifact!

    const both = comparePricingV3(at('1.3.0', 'on_going'), at('1.3.0', 'on_demand')).differences!
    const mixed = comparePricingV3(at('1.2.0'), at('1.3.0', 'on_demand')).differences!

    // 1000 at target margin 0.5 sells at 2000; on demand it sells 200 higher.
    expect(both.engagementAdjustment).toBe('200')
    expect(both.net).toBe('200')
    expect(both.cost).toBe('0')
    expect(Object.keys(mixed)).not.toContain('engagementAdjustment')
    expect(mixed.net).toBe('200')
  })

  it('composition lane: verifies from its own frozen catalog and demand; a touched ratio or form does not', () => {
    const artifact = runResourceComposition(
      forms,
      policy,
      credits,
      demandIn(CO.currency, CO.country, 'on_demand'),
      '2026-10-11'
    )

    const replay = replayResourceComposition(clone(artifact))

    expect(replay.replayDigest).toBe(artifact.replayDigest)
    expect(replay.calculationId).toBe(artifact.calculationId)
    expect(engines(replay.semantic.result)).toEqual([PRICING_V3_ENGINES['1.3.0']])
    expect(artifact.semantic.demand.brief.engagementForm).toBe('on_demand')

    const record = (item: typeof artifact) =>
      (item.semantic.catalog as unknown as CatalogDoc).records.find(r => r.recordId === ON_DEMAND.recordId)!

    // Each edit is re-signed, so what rejects it is the recalculation from the frozen inputs, not the stale digest.
    for (const edit of [
      (item: typeof artifact) => {
        record(item).value.priceRatio = '1.2'
      },
      (item: typeof artifact) => {
        ;(item.semantic.demand.brief as { engagementForm?: string }).engagementForm = 'on_going'
      },
      (item: typeof artifact) => {
        delete (item.semantic.demand.brief as { engagementForm?: string }).engagementForm
      },
      (item: typeof artifact) => {
        ;(item.semantic.result.quote.totals as unknown as Record<string, string>).engagementAdjustment = '0.00'
      }
    ]) {
      const touched = clone(artifact)

      edit(touched)
      expect(() => replayResourceComposition(touched)).toThrow('REPLAY_MISMATCH')
      touched.replayDigest = catalogDigest(touched.semantic)
      touched.calculationId = `composition-${touched.replayDigest.slice(0, 24)}`
      expect(() => replayResourceComposition(touched)).toThrow('REPLAY_MISMATCH')
    }
  })

  it('catalog lane: verifies, and explain shows the form, its record and the walk of every row', () => {
    const artifact = runCatalogQuote(
      withForms(designerCatalog),
      { ...designerBrief, engagementForm: 'on_demand' },
      '2026-10-11'
    )

    const explained = explainCatalogQuote(clone(artifact))
    const lines = artifact.semantic.result.periods.flatMap(p => p.result.lines) as unknown as AnyRow[]

    expect(replayCatalogQuote(clone(artifact)).replayDigest).toBe(artifact.replayDigest)
    expect(explained.commercialAdjustments).toMatchObject({
      engagementForm: {
        form: 'on_demand',
        priceRatio: '1.10',
        scope: 'general',
        offerId: null,
        recordId: ON_DEMAND.recordId,
        revision: 1,
        sourceStatus: 'confirmed'
      }
    })
    expect(
      explained.commercialAdjustments.rows.map(row => [row.lineId, row.engagementAdjustment, row.engagementPriceRatio])
    ).toEqual(lines.map(line => [line.lineId, line.engagementAdjustment, line.engagementPriceRatio]))
    expect(explained.factorAndFxReferences.filter(b => b.purpose === 'engagement_factor')).toHaveLength(1)
  })

  it('explain of an earlier-contract quote says what it always said', () => {
    const earlier = explainCatalogQuote(clone(runCatalogQuote(withForms(designerCatalog), designerBrief, '2026-10-11')))

    expect(earlier.commercialAdjustments).not.toHaveProperty('engagementForm')
    expect(earlier.commercialAdjustments.identity).not.toMatch(/engagement/i)
    expect(earlier.factorAndFxReferences.some(b => b.purpose === 'engagement_factor')).toBe(false)
    for (const row of earlier.commercialAdjustments.rows)
      for (const key of NEW_ROW_KEYS) expect(row).not.toHaveProperty(key)
  })
})

describe('summary, assess, explain and the client-shaped views of a 1.3.0 composition', () => {
  const block = {
    form: 'on_demand',
    priceRatio: '1.10',
    scope: 'general',
    offerId: null,
    recordId: ON_DEMAND.recordId,
    revision: 1,
    sourceStatus: 'confirmed'
  }

  it('the summary names the form, its ratio and its record, and carries the adjustment in totals', () => {
    const read = summary(onDemand)

    expect(read.engineVersion).toBe(PRICING_V3_ENGINES['1.3.0'])
    expect((read as { engagementForm?: unknown }).engagementForm).toEqual(block)
    expect(read.totals).toBe(onDemand.quote.totals)
    expect(minor(amounts(read.totals).engagementAdjustment)).toBe(
      sum(rowsOf(onDemand).map(row => minor(row.engagementAdjustment)))
    )
    expect(read.periods.every(p => 'engagementAdjustment' in (p.totals as object))).toBe(true)
  })

  it('a ratio of 1 is named too: the declared form is part of what the quote freezes', () => {
    expect((summary(onGoing) as { engagementForm?: unknown }).engagementForm).toEqual({
      ...block,
      form: 'on_going',
      priceRatio: '1',
      recordId: ON_GOING.recordId
    })
  })

  it('the summary only gains keys, and none of them without a declared form', () => {
    const before = summary(plain)
    const after = summary(onDemand)

    expect(Object.keys(after).filter(key => !(key in before))).toEqual(['engagementForm'])
    expect(Object.keys(before).filter(key => !(key in after))).toEqual([])
    expect(Object.keys(amounts(after.totals)).filter(key => !(key in amounts(before.totals)))).toEqual([
      'marketAdjustment',
      'engagementAdjustment'
    ])
  })

  it('an offer record is named as such', () => {
    const offerId: string = managed.brief.offerId

    const r = compose(
      withForms(catalogV4, [ON_DEMAND, formRecord('on_demand', '1.2', { offerId })]),
      demandIn('USD', 'CO', 'on_demand')
    )

    expect((summary(r) as { engagementForm?: unknown }).engagementForm).toEqual({
      ...block,
      priceRatio: '1.2',
      scope: 'offer',
      offerId,
      recordId: `engagement:on_demand:${offerId}`
    })
  })

  it('assess repeats the form next to the floor verdicts, and flags what a ratio under 1 took under the floor', () => {
    const committed = compose(forms, demandIn(CO.currency, CO.country, 'committed'))
    const assessment = assessCompositionReadiness(committed)
    const gaps = assessment.gaps.filter(g => g.code === 'MARGIN_BELOW_POLICY_FLOOR')

    expect((assessment.margin!.policyFloor as { engagementForm?: unknown }).engagementForm).toEqual({
      ...block,
      form: 'committed',
      priceRatio: '0.90',
      recordId: COMMITTED.recordId
    })
    // A gap names the row once and the periods it is flagged in: each of them is a row the kernel flagged.
    expect(gaps.flatMap(g => g.periodIds!.map(periodId => `periods.${periodId}.${g.path}`)).sort()).toEqual(
      flaggedPaths(committed)
    )
    expect(gaps.length).toBeGreaterThan(0)
    expect(assessment.margin!.modeledRate).toBe(committed.quote.totals!.marginRate)
    expect(assessCompositionReadiness(plain).margin!.policyFloor).not.toHaveProperty('engagementForm')
  })

  it('explain keeps the internal walk: engagement adjustment and ratio per row, and the form', () => {
    const artifact = runResourceComposition(
      forms,
      policy,
      credits,
      demandIn(CO.currency, CO.country, 'on_demand'),
      '2026-10-11'
    )

    const explained = explainResourceComposition(clone(artifact))

    expect(explained.commercialAdjustments).toMatchObject({ engagementForm: block })
    expect(
      explained.commercialAdjustments.rows.map(row => [row.lineId, row.engagementAdjustment, row.engagementPriceRatio])
    ).toEqual(
      rowsOf(artifact.semantic.result).map(row => [row.lineId, row.engagementAdjustment, row.engagementPriceRatio])
    )
    expect(explained.commercialAdjustments.identity).toMatch(/engagementAdjustment/)
  })

  it('the composition preview shows the final net and nothing about how it was reached', () => {
    const preview = projectCompositionPreview(onDemand)
    const earlier = projectCompositionPreview(plain)
    const shape = (value: unknown) => JSON.stringify(value, (_, item) => (typeof item === 'string' ? '' : item))

    expect(preview.net).toBe(onDemand.quote.totals!.net)
    expect(shape(preview)).toBe(shape(earlier))
    expect(JSON.stringify(preview)).not.toMatch(/engagement|on_demand|ratio|adjust|margin|cost/i)
  })

  it('the catalog-lane and kernel-lane client views list final nets only', () => {
    // Names of what stays internal: the form, its ratio and record, the walk of the price, cost and margin.
    const INTERNAL = /engagement|on_demand|priceRatio|Adjustment|floorNet|undiscounted|margin|"cost"/

    const quote = calculateCatalogQuote(withForms(designerCatalog), { ...designerBrief, engagementForm: 'on_demand' })

    // The allowlist only opens within policy; the status is forced here to read what it would expose.
    const view = projectCatalogQuote({ ...quote, reviewStatus: 'within_policy' }, 'selection-test')

    expect(JSON.stringify(view)).not.toMatch(INTERNAL)
    expect(view.totals.net).toBe(quote.totals!.net)
    expect(view.periods.flatMap(p => p.lines.map(l => l.amount))).toEqual(
      quote.periods.flatMap(p => p.result.lines.map(l => l.net))
    )

    const kernel = runPricingV3(
      build({
        contract: '1.3.0',
        currency: 'CLP',
        form: 'on_demand',
        forms: STANDARD_FORMS,
        lines: [{ lineId: 'a', cost: '1000000', minimumMargin: '0' }]
      }),
      '2026-10-11'
    ).artifact!

    const client = projectPricingV3ForClient(kernel)

    // The breakdown exists internally, so its absence from the view is the projection's doing.
    expect(JSON.stringify(kernel.semantic.result)).toMatch(INTERNAL)
    expect(JSON.stringify(client)).not.toMatch(INTERNAL)
    expect(client.net).toBe('2200000')
  })
})

describe('catalog maintenance carries the engagement factors', () => {
  const base = withForms(designerCatalog, [ON_GOING])
  const brief = { ...designerBrief, engagementForm: 'on_demand' }

  const change = (cat: unknown, changes: unknown[], nextVersion = 'review-with-engagement-forms') => ({
    schemaVersion: 'pricing-v3-catalog-change/1',
    changeId: `engagement-forms-${nextVersion}`,
    baseDigest: catalogDigest(validateCatalog(cat)),
    nextVersion,
    actor: 'engagement-form-test',
    reason: 'Register the price ratio of a form of engagement.',
    changes
  })

  const adding = (form: string, priceRatio: string, effectiveFrom: string) => ({
    operation: 'add',
    recordId: `engagement:${form}`,
    effectiveFrom,
    record: {
      ...formRecord(form, priceRatio, { effectiveFrom }),
      source: { ...formSource('confirmed', effectiveFrom) }
    }
  })

  it('validates like the other kinds: a positive decimal ratio, known keys, one revision in force per record', () => {
    expect(validateCatalog(withForms(designerCatalog))).toEqual(withForms(designerCatalog))

    for (const value of [
      { form: 'x', priceRatio: '0' },
      { form: 'x', priceRatio: '-0.9' },
      { form: 'x', priceRatio: 'ten percent' },
      { form: 'x', priceRatio: 1.1 },
      { form: 'x' },
      { priceRatio: '1.1' },
      { form: '', priceRatio: '1.1' },
      { form: 'x', priceRatio: '1.1', floorBasis: 'base_market' }
    ]) {
      const broken = withForms(designerCatalog, [{ ...formRecord('x', '1'), value }])

      expect(
        thrown(() => validateCatalog(broken)),
        JSON.stringify(value)
      ).toBeDefined()
    }

    // The same record twice in force is the rejection every kind has.
    const overlapping = withForms(designerCatalog, [ON_DEMAND, { ...ON_DEMAND, revision: 2 }])

    expect(() => validateCatalog(overlapping)).toThrow('OVERLAPPING_CATALOG_RECORD')
  })

  it('add: the preview shows the record and the impact goes from a missing selection to a 1.3.0 quote', () => {
    const preview = previewCatalogChange(base, change(base, [adding('on_demand', '1.10', '2026-01-01')]), [brief])

    expect(preview.differences).toEqual([
      expect.objectContaining({ operation: 'add', recordId: 'engagement:on_demand', before: null })
    ])
    expect(preview.impacts[0].before.calculationStatus).toBe('needs_input')
    expect(preview.impacts[0].before.diagnostics).toEqual([
      { code: 'MISSING_CATALOG_SELECTION', path: 'engagementForm', candidates: [] }
    ])
    expect(preview.impacts[0].after.calculationStatus).toBe('calculated')
    expect(preview.impacts[0].after.periods.every(p => p.result.engineVersion === PRICING_V3_ENGINES['1.3.0'])).toBe(
      true
    )
  })

  it('apply: the successor holds the record verbatim, the audit carries it and search finds it', () => {
    const edit = change(base, [adding('on_demand', '1.10', '2026-01-01')])
    const successor = applyCatalogChange(base, edit, previewCatalogChange(base, edit).previewDigest)
    const found = searchCatalog(successor, 'on_demand', 'engagement_factor', designerBrief.quoteDate)

    expect(found.map(r => r.recordId)).toEqual(['engagement:on_demand'])
    expect(found[0].value).toEqual({ form: 'on_demand', priceRatio: '1.10' })
    expect(successor.audit.at(-1)!.changeId).toBe(edit.changeId)
    expect(
      searchCatalog(successor, '', 'engagement_factor')
        .map(r => r.recordId)
        .sort()
    ).toEqual(['engagement:on_demand', 'engagement:on_going'])
  })

  it('replace: a new ratio from a date on leaves the earlier dates priced with the earlier ratio', () => {
    const first = changeCatalog(base, change(base, [adding('on_demand', '1.10', '2026-01-01')])).catalog

    const next = changeCatalog(
      first,
      change(
        first,
        [
          {
            operation: 'replace',
            recordId: 'engagement:on_demand',
            effectiveFrom: '2026-11-01',
            record: {
              ...formRecord('on_demand', '1.15'),
              revision: 2,
              source: { ...formSource('confirmed', '2026-11-01'), reference: 'engagement-form-test-revised' }
            }
          }
        ],
        'review-with-revised-engagement-forms'
      )
    ).catalog

    const ratioOn = (quoteDate: string) =>
      resolveBrief(next, { ...brief, quoteDate })
        .bindings.filter(b => b.purpose === 'engagement_factor')
        .map(b => (b.record.value as { priceRatio: string }).priceRatio)

    expect(ratioOn(designerBrief.quoteDate)).toEqual(['1.10'])
    expect(ratioOn('2026-10-31')).toEqual(['1.10'])
    expect(ratioOn('2026-11-01')).toEqual(['1.15'])
  })

  it('a revision cannot turn a record into the ratio of another form or of another offer', () => {
    const first = changeCatalog(base, change(base, [adding('on_demand', '1.10', '2026-01-01')])).catalog

    for (const value of [
      { form: 'committed', priceRatio: '1.10' },
      { form: 'on_demand', priceRatio: '1.10', offerId: designerBrief.offerId }
    ])
      expect(() =>
        changeCatalog(
          first,
          change(
            first,
            [
              {
                operation: 'replace',
                recordId: 'engagement:on_demand',
                effectiveFrom: '2026-11-01',
                record: {
                  ...formRecord('on_demand', '1.10'),
                  value,
                  revision: 2,
                  source: { ...formSource('confirmed', '2026-11-01'), reference: 'engagement-form-test-revised' }
                }
              }
            ],
            'review-identity'
          )
        )
      ).toThrow('CATALOG_IDENTITY_CONFLICT')
  })

  it('retire: after the date the form has no ratio and a quote that declares it asks for one', () => {
    const first = changeCatalog(base, change(base, [adding('on_demand', '1.10', '2026-01-01')])).catalog

    const retired = changeCatalog(
      first,
      change(
        first,
        [{ operation: 'retire', recordId: 'engagement:on_demand', effectiveFrom: '2026-11-01' }],
        'review-retired'
      )
    ).catalog

    expect(resolveBrief(retired, brief).status).toBe('resolved')
    expect(resolveBrief(retired, { ...brief, quoteDate: '2026-11-01' }).diagnostics).toContainEqual({
      code: 'MISSING_CATALOG_SELECTION',
      path: 'engagementForm',
      candidates: []
    })
  })
})

describe('CLI end to end with a 1.3.0 quote', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-engagement-form-'))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const cli = (...args: string[]) =>
    spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

  const file = (name: string, body: unknown) => {
    const path = join(dir, name)

    writeFileSync(path, JSON.stringify(body))

    return path
  }

  // stdout of compose prepare|quote is the summary of the result plus, under `runNotices`, what describes the run.
  const summaryOf = (stdout: string) => {
    const body = JSON.parse(stdout)

    delete body.runNotices

    return body
  }

  const catalogFile = file('catalog.forms.json', forms)
  const sources = ['--policy', operating('resources.review-v5'), '--credits', creditsPath]
  const demandFile = file('on-demand.demand.json', demandIn(CO.currency, CO.country, 'on_demand'))
  const plainFile = file('plain.demand.json', demandIn(CO.currency, CO.country))
  const out = join(dir, 'on-demand.artifact.json')
  const prepare = cli('compose', 'prepare', '--catalog', catalogFile, ...sources, '--input', demandFile)
  const quote = cli('compose', 'quote', '--catalog', catalogFile, ...sources, '--input', demandFile, '--out', out)

  it('compose prepare and quote: exit 3, the same summary with the form block, the detail in the artifact', () => {
    const body = summaryOf(quote.stdout)
    const artifact = read(out)

    expect(quote.status).toBe(3)
    expect(quote.stderr).toBe('')
    expect(body).toEqual(clone(summarizeComposition(artifact.semantic.result, artifact)))
    expect(body.engineVersion).toBe(PRICING_V3_ENGINES['1.3.0'])
    expect(body.engagementForm).toEqual({
      form: 'on_demand',
      priceRatio: '1.10',
      scope: 'general',
      offerId: null,
      recordId: ON_DEMAND.recordId,
      revision: 1,
      sourceStatus: 'confirmed'
    })
    expect(body.totals.engagementAdjustment).toBe(amounts(onDemand.quote.totals).engagementAdjustment)
    expect(body.totals.net).toBe(onDemand.quote.totals!.net)

    expect(prepare.status).toBe(3)
    expect(prepare.stderr).toBe('')
    expect(JSON.parse(prepare.stdout).totals).toEqual(body.totals)
    expect(JSON.parse(prepare.stdout).engagementForm).toEqual(body.engagementForm)
  })

  it('without the field, stdout is byte for byte the one of a catalog that holds no engagement factor', () => {
    const run = (catalog: string) => cli('compose', 'prepare', '--catalog', catalog, ...sources, '--input', plainFile)
    const withFactors = run(catalogFile)
    const withoutFactors = run(operating('catalog.review-v4'))

    // The calculation id hashes the catalog file itself; it is the one value that tells the two runs apart.
    const neutral = (stdout: string) =>
      stdout.replace(/"calculationId": "composition-[0-9a-f]{24}"/, '"calculationId": ""')

    expect(withFactors.status).toBe(3)
    expect(withoutFactors.status).toBe(3)
    expect(JSON.parse(withFactors.stdout).calculationId).not.toBe(JSON.parse(withoutFactors.stdout).calculationId)
    expect(neutral(withFactors.stdout)).toBe(neutral(withoutFactors.stdout))
    expect(withFactors.stdout).not.toMatch(/engagement/i)
    expect(JSON.parse(withFactors.stdout).engineVersion).toBe(PRICING_V3_ENGINES['1.1.0'])
  })

  it('replay, explain, assess, preview and split all read the frozen artifact', () => {
    const replay = cli('replay', '--input', out)
    const explain = cli('explain', '--input', out)
    const assess = cli('compose', 'assess', '--input', out)
    const preview = cli('compose', 'preview', '--input', out)
    const split = cli('compose', 'split', '--input', out, '--tools', 'all')

    expect(replay.status).toBe(3)
    expect(JSON.parse(replay.stdout).verified).toBe(true)
    expect(JSON.parse(replay.stdout).summary).toEqual(summaryOf(quote.stdout))
    expect(explain.status).toBe(3)
    expect(JSON.parse(explain.stdout).commercialAdjustments.engagementForm.priceRatio).toBe('1.10')
    expect(JSON.parse(explain.stdout).commercialAdjustments.rows[0]).toHaveProperty('engagementAdjustment')
    expect(assess.status).toBe(3)
    expect(JSON.parse(assess.stdout).margin.policyFloor.engagementForm.form).toBe('on_demand')
    expect(preview.status).toBe(3)
    expect(JSON.parse(preview.stdout).net).toBe(JSON.parse(quote.stdout).totals.net)
    expect(preview.stdout).not.toMatch(/engagement|on_demand|ratio|adjust|margin/i)
    expect(split.status).toBe(3)
    expect(
      new X(JSON.parse(split.stdout).totals.tools.net).plus(JSON.parse(split.stdout).totals.person.net).toFixed(2)
    ).toBe(JSON.parse(quote.stdout).totals.net)
  })

  it('a tampered artifact is rejected by every reader', () => {
    const touched = read(out)

    touched.semantic.demand.brief.engagementForm = 'on_going'

    const path = file('tampered.artifact.json', touched)

    for (const args of [
      ['replay', '--input', path],
      ['compose', 'assess', '--input', path],
      ['compose', 'split', '--input', path, '--tools', 'all']
    ]) {
      const run = cli(...args)

      expect(run.status).toBe(1)
      expect(run.stdout).toBe('')
      expect(JSON.parse(run.stderr).error.code).toBe('REPLAY_MISMATCH')
    }
  })

  it('a form the catalog does not hold: exit 2, no totals, and the diagnostic names the field', () => {
    const run = cli(
      'compose',
      'quote',
      '--catalog',
      catalogFile,
      ...sources,
      '--input',
      file('unknown-form.demand.json', demandIn(CO.currency, CO.country, 'per-project'))
    )

    const body = JSON.parse(run.stdout)

    expect(run.status).toBe(2)
    expect(body.totals).toBeNull()
    expect(body.calculationStatus).toBe('needs_input')
    expect(body.diagnostics).toContainEqual({
      code: 'MISSING_CATALOG_SELECTION',
      path: 'engagementForm',
      candidates: []
    })
  })

  it('two factors in force for the form: exit 2 with the ambiguity and both candidates', () => {
    const ambiguous = file(
      'catalog.ambiguous.json',
      withForms(catalogV4, [ON_DEMAND, formRecord('on_demand', '1.15', { recordId: 'engagement:on_demand:bis' })])
    )

    const run = cli('compose', 'prepare', '--catalog', ambiguous, ...sources, '--input', demandFile)
    const body = JSON.parse(run.stdout)

    expect(run.status).toBe(2)
    expect(body.totals).toBeNull()
    expect(body.diagnostics).toContainEqual({
      code: 'AMBIGUOUS_SELECTION',
      path: 'engagementForm',
      candidates: [ON_DEMAND.recordId, 'engagement:on_demand:bis']
    })
  })

  it('catalog lane: prepare declares 1.3.0, quote carries engagementAdjustment, replay verifies', () => {
    const cat = file('catalog.designer.forms.json', withForms(designerCatalog))
    const brief = file('designer.brief.json', { ...designerBrief, engagementForm: 'on_demand' })
    const quoteOut = join(dir, 'designer.quote.artifact.json')
    const prepared = cli('prepare', '--catalog', cat, '--input', brief)
    const run = cli('quote', '--catalog', cat, '--input', brief, '--out', quoteOut)
    const replay = cli('replay', '--input', quoteOut)

    expect(prepared.status).toBe(0)
    expect(
      JSON.parse(prepared.stdout).inputs.map(
        (p: { input: { request: { schemaVersion: string } } }) => p.input.request.schemaVersion
      )
    ).toEqual(Array(designerBrief.periods).fill('1.3.0'))
    expect(run.status).toBe(3)
    expect(run.stderr).toBe('')
    expect(Object.keys(JSON.parse(run.stdout).totals)).toContain('engagementAdjustment')
    expect(JSON.parse(replay.stdout).verified).toBe(true)
  })

  it('catalog search and show read the new kind; preview and apply issue a successor that holds it', () => {
    const search = cli('catalog', 'search', '--catalog', catalogFile, '--kind', 'engagement_factor')

    const show = cli(
      'catalog',
      'show',
      '--catalog',
      catalogFile,
      '--kind',
      'engagement_factor',
      '--query',
      ON_DEMAND.recordId
    )

    expect(search.status).toBe(0)
    expect(
      JSON.parse(search.stdout)
        .candidates.map((r: { recordId: string }) => r.recordId)
        .sort()
    ).toEqual([COMMITTED.recordId, ON_DEMAND.recordId, ON_GOING.recordId].sort())
    expect(JSON.parse(show.stdout)).toMatchObject({ resolution: 'candidate', candidates: [{ value: ON_DEMAND.value }] })

    const v4 = operating('catalog.review-v4')

    const changeFile = file('forms.change.json', {
      schemaVersion: 'pricing-v3-catalog-change/1',
      changeId: 'engagement-forms-cli-test',
      baseDigest: catalogDigest(validateCatalog(catalogV4)),
      nextVersion: 'operating-review-engagement-forms-test',
      actor: 'engagement-form-test',
      reason: 'Register the two forms of engagement.',
      changes: [ON_GOING, ON_DEMAND].map(record => ({
        operation: 'add',
        recordId: record.recordId,
        effectiveFrom: record.source.effectiveFrom,
        record
      }))
    })

    const preview = cli('catalog', 'preview', '--catalog', v4, '--input', changeFile)
    const successor = join(dir, 'catalog.successor.json')

    expect(preview.status).toBe(0)

    const apply = cli(
      'catalog',
      'apply',
      '--catalog',
      v4,
      '--input',
      changeFile,
      '--confirm',
      JSON.parse(preview.stdout).previewDigest,
      '--out',
      successor
    )

    expect(apply.status).toBe(0)
    expect(JSON.parse(apply.stdout)).toMatchObject({ updated: true, version: 'operating-review-engagement-forms-test' })
    expect(
      (read(successor) as CatalogDoc).records.filter(r => r.kind === 'engagement_factor').map(r => r.value)
    ).toEqual([ON_GOING.value, ON_DEMAND.value])

    // The successor quotes the form; the parent, read from its committed file, was not touched.
    const quoted = cli('compose', 'prepare', '--catalog', successor, ...sources, '--input', demandFile)

    expect(quoted.status).toBe(3)
    expect(JSON.parse(quoted.stdout).totals.net).toBe(onDemand.quote.totals!.net)
    expect(JSON.stringify(read(v4))).not.toContain('engagement_factor')
  })
})
