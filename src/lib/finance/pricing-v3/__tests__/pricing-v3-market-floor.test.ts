// Contract 1.2.0: the price floor accompanies the market factor
// (GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1, delta 2026-10-11).
//
// Catalogs and demands are built in memory from the committed fixtures; nothing is written under data/. Expected
// amounts come from one of three places, never from a previous run of the code under test:
//   - exact integer arithmetic (BigInt minor units) over the inputs of the case;
//   - the same economic input priced by an earlier contract, which is frozen and guarded by the artifact corpus
//     (the policy price with the factor, the price of the base market and the presented cost);
//   - an invariant the decision states (multiples, floor formula, verdict = net under floorNet).
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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
import type { PricingV3ResultV12 } from '../calculate'
import { changeCatalog, searchCatalog, validateCatalog } from '../catalog/catalog'
import { projectCatalogQuote } from '../catalog/client'
import { calculateCatalogQuote } from '../catalog/quote'
import { resolveBrief } from '../catalog/resolve'
import { projectPricingV3ForClient } from '../projection'
import { composeResourceQuote } from '../resources/composition'
import { assessCompositionReadiness, projectCompositionPreview } from '../resources/readiness'
import { COMPOSITION_SUMMARY_VERSION, summarizeComposition } from '../resources/summary'
import { PRICING_V3_ENGINES } from '../schemas'

const D = Decimal.clone({ precision: 80 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operatingDir = 'data/pricing/v3-operating'
const operating = (name: string) => `${operatingDir}/${name}.json`
const skyDir = 'docs/commercial/prospects/sky-social-care-2027/pricing'
const creditsPath = 'data/pricing/v3-resources/ai-credits.review-v1.json'

// Catalog v4 registers a commercial rounding rule for USD, CLP, COP, MXN and PEN and every market factor at 1.
const catalogV4 = read(operating('catalog.review-v4'))
const policy = read(operating('resources.review-v5'))
const credits = read(creditsPath)
const managed = read(operating('managed-care.demand'))

// Catalog-lane fixture: three periods, one line, a one-time setup row in the first period.
const designerCatalog = read('data/pricing/v3-catalog/catalog.review-v1.json')
const designerBrief = read('data/pricing/v3-catalog/examples/designer.quote.artifact.json').semantic.brief

const NEW_ROW_KEYS = ['marketAdjustment', 'marketPriceRatio', 'floorNet'] as const
const NEW_TOTAL_KEYS = ['marketAdjustment'] as const
const FLOOR_BASIS = 'base_market'

type Composition = ReturnType<typeof composeResourceQuote>
type AnyRow = Record<string, string> & { lineId: string; parentLineId: string; kind: string; periodId: number }
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
const sum = (values: bigint[]) => values.reduce((total, value) => total + value, 0n)
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b

/** A fraction in [0,1) as an exact numerator over 10^18. */
const UNIT = 10n ** 18n
const fraction = (value: string) => scaled(value, 18)

/**
 * The floor of the decision, in minor units: cost x rho / (1 - minimumMargin), raised to the currency unit, with
 * rho = price / basePrice. Exact: one integer division, corrected upwards.
 */
const floorNetOf = (cost: bigint, minimumMargin: string, rho?: { price: bigint; basePrice: bigint }) =>
  rho
    ? ceilDiv(cost * rho.price * UNIT, (UNIT - fraction(minimumMargin)) * rho.basePrice)
    : ceilDiv(cost * UNIT, UNIT - fraction(minimumMargin))

/** The control of every earlier contract, as an exact inequality: (net - cost) / net < minimumMargin, or no net. */
const underFinalNetFloor = (net: bigint, cost: bigint, minimumMargin: string) =>
  net === 0n || (net - cost) * UNIT < fraction(minimumMargin) * net

// ---- composition lane helpers ----

const marketRecord = (cat: CatalogDoc, country: string) =>
  cat.records.find(r => r.kind === 'market_factor' && r.value.country === country)!

/** The catalog with the market factor of `country` edited in memory. */
const withMarket = <T extends CatalogDoc>(cat: T, country: string, edit: { factor?: string; floorBasis?: boolean }) => {
  const next = clone(cat)
  const record = marketRecord(next, country)

  if (edit.factor) record.value.factor = edit.factor
  if (edit.floorBasis) record.value.floorBasis = FLOOR_BASIS

  return next
}

const withoutRounding = <T extends CatalogDoc>(cat: T) => ({
  ...cat,
  records: cat.records.filter(r => r.kind !== 'price_rounding')
})

const quotedIn = (currency: string, country: string, adjustments: unknown[] = []) => {
  const next = clone(managed)

  next.brief.outputCurrency = currency
  next.brief.offerMarketCountry = country
  next.brief.adjustments = adjustments

  return next
}

const managedLineIds: string[] = managed.brief.lines.map((l: { lineId: string }) => l.lineId)

const discount = (rate: string) => ({
  adjustmentId: 'further-discount',
  kind: 'discount',
  rate,
  lineIds: managedLineIds,
  reason: 'Discount on top of the market price.'
})

const agreedNet = (amount: string) => ({
  adjustmentId: 'agreed',
  kind: 'agreed_net',
  amount,
  billing: 'monthly',
  lineIds: managedLineIds,
  reason: 'Agreed with the client.'
})

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
const policyPrice = (row: AnyRow) => minor(row.undiscountedPrice) - minor(row.roundingAdjustment ?? '0')

const stripContract = (value: unknown, keys: readonly string[]) =>
  JSON.parse(
    JSON.stringify(value, (key, item) =>
      [...keys, 'engineVersion', 'precisionPolicy', 'schemaVersion'].includes(key) ? undefined : item
    )
  )

// The case the decision measured: managed care quoted in USD for Colombia.
const CO = { currency: 'USD', country: 'CO', factor: '0.90' }
const baseMarket = compose(catalogV4, quotedIn(CO.currency, CO.country))
const lowered = compose(withMarket(catalogV4, CO.country, { factor: CO.factor }), quotedIn(CO.currency, CO.country))
const floorCatalog = withMarket(catalogV4, CO.country, { factor: CO.factor, floorBasis: true })
const followed = compose(floorCatalog, quotedIn(CO.currency, CO.country))

describe('contract selection: 1.2.0 only when the market factor of the quote declares its floor basis', () => {
  it('every committed catalog parses to itself, and a floor basis is only ever a declared property of a record', () => {
    const catalogs = [
      ...readdirSync(operatingDir)
        .filter(f => f.startsWith('catalog.') && f.endsWith('.json'))
        .map(f => read(`${operatingDir}/${f}`)),
      designerCatalog
    ] as CatalogDoc[]

    expect(catalogs.length).toBeGreaterThanOrEqual(4)

    const declaring = (cat: CatalogDoc) =>
      cat.records.filter(r => r.kind === 'market_factor').filter(r => 'floorBasis' in r.value)

    for (const cat of catalogs) {
      expect(cat.records.filter(r => r.kind === 'market_factor').length).toBeGreaterThan(0)
      // No key gained, none defaulted: a catalog that does not declare the basis does not acquire one by parsing.
      expect(validateCatalog(cat)).toEqual(cat)
      expect(declaring(cat).every(r => r.value.floorBasis === 'base_market')).toBe(true)
    }

    // The parents frozen before this contract declare nothing, which is why their quotes keep their contract. What
    // each catalog holds is data and may change with a successor; this only requires that such parents still exist.
    expect(catalogs.some(cat => declaring(cat).length === 0)).toBe(true)
  })

  it('every committed artifact recomputes to the same bytes: values, key sets and key order', () => {
    const replays: Record<string, (raw: unknown) => { semantic: unknown }> = {
      'pricing-v3-local-artifact/1': replayPricingV3,
      'pricing-v3-selection-quote/1': replayCatalogQuote,
      'pricing-v3-resource-composition/1': replayResourceComposition
    }

    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = join(dir, entry.name)

        return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
      })

    const files = [...walk('data/pricing'), ...walk(skyDir)]

    expect(files.length).toBeGreaterThanOrEqual(17)

    for (const path of files) {
      const artifact = read(path)
      const replayed = clone(replays[artifact.artifactVersion](artifact).semantic) as { result: unknown }

      // The digest of the frozen guard sorts keys; this comparison does not, so a reordered or added key shows here.
      expect(JSON.stringify(replayed.result), path).toBe(JSON.stringify(artifact.semantic.result))
    }
  })

  it.each(['designer', 'service', 'crm-client-tools'])(
    '%s: the committed demand still resolves to the contract and digest of its committed artifact',
    name => {
      const artifact = read(operating(`${name}.artifact`))
      const files = readdirSync(operatingDir)

      const versioned = (prefix: string, version: string) =>
        files
          .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
          .map(f => read(`${operatingDir}/${f}`))
          .find(doc => doc.version === version)

      const run = runResourceComposition(
        versioned('catalog.', artifact.semantic.catalog.version),
        versioned('resources.', artifact.semantic.policy.version),
        credits,
        read(operating(`${name}.demand`)),
        artifact.execution.createdAt
      )

      expect(run.replayDigest).toBe(artifact.replayDigest)
      expect(engines(run.semantic.result)).toEqual([PRICING_V3_ENGINES['1.0.0']])
    }
  )

  it.each([
    ['acordado', '1.0.0'],
    ['acordado-neto', '1.1.0']
  ] as const)('SKY %s still verifies with engine %s and carries no 1.2.0 key', (name, contract) => {
    const artifact = read(`${skyDir}/${name}.artifact.json`)
    const replay = replayResourceComposition(artifact)

    expect(replay.replayDigest).toBe(artifact.replayDigest)
    expect(engines(replay.semantic.result)).toEqual([PRICING_V3_ENGINES[contract]])
    expect(JSON.stringify(artifact)).not.toMatch(/marketAdjustment|marketPriceRatio|floorNet|floorBasis/)
  })

  it('an untouched demand keeps its contract and none of the 1.2.0 keys, in rows, period totals and quote totals', () => {
    expect(contracts(baseMarket)).toEqual(['1.1.0']) // catalog v4 rounds USD
    expect(contracts(compose(withoutRounding(catalogV4), quotedIn(CO.currency, CO.country)))).toEqual(['1.0.0'])

    for (const r of [baseMarket, compose(withoutRounding(catalogV4), quotedIn(CO.currency, CO.country))]) {
      for (const row of rowsOf(r)) for (const key of NEW_ROW_KEYS) expect(row).not.toHaveProperty(key)

      for (const totals of [r.quote.totals!, ...r.quote.periods.map(p => p.result.totals!)])
        for (const key of NEW_TOTAL_KEYS) expect(totals).not.toHaveProperty(key)
    }
  })

  it('a market factor other than 1 WITHOUT a floor basis behaves as it always did', () => {
    // Same contract as the untouched catalog, with and without a rounding rule.
    expect(contracts(lowered)).toEqual(contracts(baseMarket))

    const plain = compose(
      withMarket(withoutRounding(catalogV4), CO.country, { factor: CO.factor }),
      quotedIn(CO.currency, CO.country)
    )

    expect(contracts(plain)).toEqual(['1.0.0'])

    for (const r of [lowered, plain]) {
      const rows = rowsOf(r)

      for (const row of rows) for (const key of NEW_ROW_KEYS) expect(row).not.toHaveProperty(key)
      for (const key of NEW_TOTAL_KEYS) expect(r.quote.totals).not.toHaveProperty(key)

      // The verdict is the final-net control, recomputed here with integers: every line of this market is flagged.
      const expected = rows.filter(row => underFinalNetFloor(minor(row.net), minor(row.cost), row.minimumMargin))

      expect(flaggedPaths(r)).toEqual(expected.map(pathOf).sort())
      expect(expected.length).toBe(rows.length)
    }
  })

  it('declaring the floor basis on the market of the quote flips request and snapshot to 1.2.0', () => {
    expect(contracts(followed)).toEqual(['1.2.0'])
    expect(engines(followed)).toEqual([PRICING_V3_ENGINES['1.2.0']])

    const [{ input }] = followed.quote.resolution.inputs

    expect(input.snapshot.marketFactors).toEqual([
      {
        country: CO.country,
        factor: CO.factor,
        floorBasis: FLOOR_BASIS,
        source: marketRecord(floorCatalog, 'CO').source
      }
    ])
    expect(followed.quote.periods[0].result.precisionPolicy).toBe(PRICING_V3_PRECISION_POLICIES['1.2.0'])
  })

  it('a floor basis on the factor of ANOTHER market changes nothing for this quote', () => {
    const elsewhere = withMarket(withMarket(catalogV4, CO.country, { factor: CO.factor }), 'PE', {
      factor: '0.85',
      floorBasis: true
    })

    const r = compose(elsewhere, quotedIn(CO.currency, CO.country))

    expect(contracts(r)).toEqual(contracts(lowered))
    expect(clone(r.quote)).toEqual(clone(lowered.quote))
  })

  it('the contract is a property of the record, not of the factor: 1 with a floor basis is 1.2.0, 0.90 without is not', () => {
    const neutral = compose(
      withMarket(withoutRounding(catalogV4), CO.country, { factor: '1', floorBasis: true }),
      quotedIn(CO.currency, CO.country)
    )

    expect(contracts(neutral)).toEqual(['1.2.0'])
    expect(contracts(lowered)).not.toContain('1.2.0')
  })

  it('every period of a quote declares the same contract (catalog lane, three periods)', () => {
    const cat = withMarket(designerCatalog, designerBrief.offerMarketCountry, { factor: '0.9', floorBasis: true })
    const resolution = resolveBrief(cat, designerBrief)
    const quote = calculateCatalogQuote(cat, designerBrief)

    expect(resolution.inputs).toHaveLength(designerBrief.periods)
    expect(
      resolution.inputs.flatMap(p => [p.input.request.schemaVersion, p.input.snapshot.schemaVersion] as string[])
    ).toEqual(Array(designerBrief.periods * 2).fill('1.2.0'))
    expect(quote.periods.map(p => p.result.engineVersion)).toEqual(
      Array(designerBrief.periods).fill(PRICING_V3_ENGINES['1.2.0'])
    )
    // Pure function of catalog and brief.
    expect(clone(resolveBrief(cat, designerBrief))).toEqual(clone(resolution))
  })

  it('the kernel never reinterprets: a floor basis inside a 1.0.0 or 1.1.0 snapshot is rejected, 1.2.0 takes it', () => {
    const [{ input }] = followed.quote.resolution.inputs

    for (const contract of ['1.0.0', '1.1.0'] as const) {
      const older = clone(input) as { request: Record<string, unknown>; snapshot: Record<string, unknown> }

      older.request.schemaVersion = contract
      older.snapshot.schemaVersion = contract
      if (contract === '1.0.0') delete older.snapshot.priceRounding

      const result = calculatePricingV3(older)

      expect(result.calculationStatus).toBe('invalid')
      expect(result.engineVersion).toBe(PRICING_V3_ENGINES[contract])
      expect(result.lines).toEqual([])
      expect(result.diagnostics.map(d => [d.code, d.fieldPath])).toEqual([
        ['INVALID_INPUT', 'snapshot.marketFactors.0']
      ])
      expect(runPricingV3(older).artifact).toBeNull()
    }

    const unknownBasis = clone(input) as unknown as { snapshot: { marketFactors: { floorBasis: string }[] } }

    unknownBasis.snapshot.marketFactors[0].floorBasis = 'final_net'

    expect(calculatePricingV3(input).calculationStatus).toBe('calculated')
    expect(calculatePricingV3(unknownBasis).calculationStatus).toBe('invalid')
  })
})

describe('the rule: with a declared floor basis the floor is read on the price of the base market', () => {
  // Oracles from the earlier contract, per row: the price the base market pays and the price with the factor.
  const baseRows = new Map(rowsOf(baseMarket).map(row => [row.lineId, row]))
  const loweredRows = new Map(rowsOf(lowered).map(row => [row.lineId, row]))
  const rows = rowsOf(followed)

  it('the three runs price the same rows, with a human component in each', () => {
    expect(rows.length).toBe(managedLineIds.length)
    expect(rows.map(row => row.lineId)).toEqual([...baseRows.keys()])
    expect(rows.map(row => row.lineId)).toEqual([...loweredRows.keys()])

    for (const line of followed.quote.periods.flatMap(p => p.result.lines))
      expect(line.components.some(component => component.kind === 'human')).toBe(true)
  })

  it('a quote priced by policy is not flagged, and the earlier contract flagged every line of it', () => {
    expect(flaggedPaths(lowered)).toHaveLength(rows.length)
    expect(flaggedPaths(followed)).toEqual([])
    expect(followed.quote.calculationStatus).toBe('calculated')
  })

  it('the market factor moves the price and never the cost', () => {
    for (const row of rows) {
      expect(row.cost).toBe(baseRows.get(row.lineId)!.cost)
      expect(policyPrice(row)).toBe(policyPrice(loweredRows.get(row.lineId)!))
      expect(policyPrice(row)).toBeLessThan(policyPrice(baseRows.get(row.lineId)!))
    }

    expect(followed.quote.totals!.cost).toBe(baseMarket.quote.totals!.cost)
  })

  it('the margin reported is the real one, (net - cost) / net, and it is under the policy minimum', () => {
    const totals = followed.quote.totals!
    const net = minor(totals.net)
    const cost = minor(totals.cost)

    expect(minor(totals.marginAmount)).toBe(net - cost)
    expect(sum(rows.map(row => minor(row.marginAmount)))).toBe(net - cost)
    // Exact to the 60th digit against a division made here; the stored ratio is not a base-market equivalent.
    expect(
      new D(totals.marginRate!)
        .minus(new D((net - cost).toString()).div(net.toString()))
        .abs()
        .lt('1e-60')
    ).toBe(true)

    for (const row of rows) {
      expect(minor(row.marginAmount)).toBe(minor(row.net) - minor(row.cost))
      // The final-net control would flag it: the real margin is under the minimum of the policy.
      expect(underFinalNetFloor(minor(row.net), minor(row.cost), row.minimumMargin)).toBe(true)
    }

    expect(summary(followed).marginRateRoundedDown).toBe(summary(lowered).marginRateRoundedDown)
    expect(new D(summary(followed).marginRateRoundedDown!).lt(rows[0].minimumMargin)).toBe(true)
  })

  it('marketAdjustment is the price with the factor minus the price of the base market, per row and in totals', () => {
    for (const row of rows) {
      const expected = policyPrice(loweredRows.get(row.lineId)!) - policyPrice(baseRows.get(row.lineId)!)

      expect(minor(row.marketAdjustment)).toBe(expected)
      expect(expected).toBeLessThan(0n)
      // Price walk: base market + market adjustment + rounding = undiscounted price.
      expect(minor(row.undiscountedPrice)).toBe(
        policyPrice(baseRows.get(row.lineId)!) + minor(row.marketAdjustment) + minor(row.roundingAdjustment)
      )
    }

    const total = sum(rows.map(row => minor(row.marketAdjustment)))

    expect(minor(amounts(followed.quote.totals).marketAdjustment)).toBe(total)
    expect(minor(amounts(followed.quote.periods[0].result.totals).marketAdjustment)).toBe(total)
  })

  it('floorNet is cost x rho / (1 - minimumMargin) raised to the currency unit, with rho = price / base price', () => {
    for (const row of rows) {
      const price = policyPrice(loweredRows.get(row.lineId)!)
      const basePrice = policyPrice(baseRows.get(row.lineId)!)

      expect(minor(row.floorNet)).toBe(floorNetOf(minor(row.cost), row.minimumMargin, { price, basePrice }))
      // Same scale as every other amount of the row.
      expect(row.floorNet.split('.')[1]?.length).toBe(row.net.split('.')[1]?.length)
      // The floor of this market is under the floor of the base market, by the same ratio.
      expect(minor(row.floorNet)).toBeLessThan(floorNetOf(minor(row.cost), row.minimumMargin))
      expect(minor(row.net)).toBeGreaterThanOrEqual(minor(row.floorNet))
    }
  })

  it('marketPriceRatio is strictly between 0 and 1 for rows with a human component, and it is price / base price', () => {
    for (const row of rows) {
      const ratio = new D(row.marketPriceRatio)
      const price = policyPrice(loweredRows.get(row.lineId)!)
      const basePrice = policyPrice(baseRows.get(row.lineId)!)

      expect(ratio.gt(0) && ratio.lt(1)).toBe(true)
      expect(ratio.minus(new D(price.toString()).div(basePrice.toString())).abs().lt('1e-60')).toBe(true)
      // Tools take no market factor, so a row with tools came down by less than the factor of the market.
      expect(ratio.gte(CO.factor)).toBe(true)
    }
  })

  it('rounding still applies and conserves THIS floor: every net is a multiple and none is under floorNet', () => {
    const rule = (catalogV4 as CatalogDoc).records.find(
      r => r.kind === 'price_rounding' && r.value.currency === CO.currency
    )!

    for (const row of rows) {
      // The multiple of the rule, in the minor units the row is formatted with.
      const multiple = scaled(rule.value.multiple as string, (row.net.split('.')[1] ?? '').length)

      expect(minor(row.net) % multiple).toBe(0n)
      expect(minor(row.net)).toBeGreaterThanOrEqual(minor(row.floorNet))
      expect(minor(row.roundingAdjustment)).toBeGreaterThanOrEqual(0n)
    }
  })

  describe('a row whose price has no human component (catalog lane, setup row)', () => {
    const market = designerBrief.offerMarketCountry
    // The committed pricing policy of this fixture has a zero floor; a real one makes the verdicts discriminate.
    const MINIMUM = '0.2'

    const withFloor = (cat: CatalogDoc) => {
      const next = clone(cat)

      for (const record of next.records) if (record.kind === 'pricing') record.value.minimumMargin = MINIMUM

      return next
    }

    const base = calculateCatalogQuote(withFloor(designerCatalog), designerBrief)

    const plain = calculateCatalogQuote(
      withFloor(withMarket(designerCatalog, market, { factor: '0.6' })),
      designerBrief
    )

    const quote = calculateCatalogQuote(
      withFloor(withMarket(designerCatalog, market, { factor: '0.6', floorBasis: true })),
      designerBrief
    )

    const lines = (q: typeof quote) => q.periods.flatMap(p => p.result.lines) as unknown as AnyRow[]

    const flags = (q: typeof quote) =>
      q.periods.flatMap(p => p.result.diagnostics.filter(d => d.code === 'MARGIN_BELOW_FLOOR'))

    const setup = lines(quote).filter(row => row.kind === 'setup')
    const monthly = lines(quote).filter(row => row.kind === 'monthly')

    it('the fixture bills a setup row in its first period only, and its policy meets the floor in the base market', () => {
      expect(setup.map(row => row.periodId)).toEqual([1])
      expect(monthly).toHaveLength(designerBrief.periods)
      expect(flags(base)).toEqual([])
    })

    it('the setup row is not lowered by the market: ratio exactly 1, no adjustment, the base-market floor', () => {
      for (const row of setup) {
        expect(row.marketPriceRatio).toBe('1')
        expect(minor(row.marketAdjustment)).toBe(0n)
        expect(minor(row.floorNet)).toBe(floorNetOf(minor(row.cost), row.minimumMargin))
        expect(row.undiscountedPrice).toBe(lines(base).find(b => b.lineId === row.lineId)!.undiscountedPrice)
      }
    })

    it('the monthly rows were lowered, are flagged without the floor basis and are not with it', () => {
      for (const row of monthly) {
        expect(new D(row.marketPriceRatio).gt(0) && new D(row.marketPriceRatio).lt(1)).toBe(true)
        expect(minor(row.marketAdjustment)).toBeLessThan(0n)
      }

      expect(flags(plain).map(d => d.fieldPath)).toEqual(monthly.map(row => `result.lines.${row.lineId}`))
      expect(flags(quote)).toEqual([])
    })

    it('quote totals add marketAdjustment summed over periods; an earlier-contract quote keeps its key set', () => {
      const totals = quote.totals as unknown as Record<string, string>

      expect(minor(totals.marketAdjustment)).toBe(sum(lines(quote).map(row => minor(row.marketAdjustment))))
      expect(Object.keys(plain.totals!)).toEqual(Object.keys(base.totals!))
      expect(Object.keys(totals).filter(key => !Object.keys(plain.totals!).includes(key))).toEqual([
        'marketAdjustment',
        'roundingAdjustment',
        'uplift'
      ])
      expect(plain.periods.map(p => p.result.engineVersion)).toEqual(
        Array(designerBrief.periods).fill(PRICING_V3_ENGINES['1.0.0'])
      )
    })
  })
})

describe('a further discount still crosses the floor of the market', () => {
  const run = (adjustments: unknown[]) => compose(floorCatalog, quotedIn(CO.currency, CO.country, adjustments))

  // The verdict of contract 1.2.0, stated on the rows themselves: net under floorNet (or no net at all).
  const expectedFlags = (r: Composition) =>
    rowsOf(r)
      .filter(row => minor(row.net) === 0n || minor(row.net) < minor(row.floorNet))
      .map(pathOf)
      .sort()

  it.each(['0.0005', '0.001', '0.01', '0.05', '0.2'])(
    'a %s discount flags exactly the rows whose net fell under floorNet',
    rate => {
      const r = run([discount(rate)])

      expect(r.quote.calculationStatus).toBe('calculated')
      expect(flaggedPaths(r)).toEqual(expectedFlags(r))
      // The discount moves nets, never the floor of the market.
      expect(rowsOf(r).map(row => row.floorNet)).toEqual(rowsOf(followed).map(row => row.floorNet))
    }
  )

  it('5 % takes every line under its floor; the floor absorbed the market factor, not the discount', () => {
    const r = run([discount('0.05')])

    expect(flaggedPaths(r)).toHaveLength(managedLineIds.length)
    expect(flaggedPaths(run([discount('0.0005')]))).toEqual([])
  })

  it('an agreed net under the floors flags the affected rows; one at the calculated price flags none', () => {
    const floors = sum(rowsOf(followed).map(row => minor(row.floorNet)))
    const under = run([agreedNet(new D((floors - 100_00n).toString()).div(100).toFixed(2))])
    const same = run([agreedNet(followed.quote.totals!.net)])

    expect(under.quote.totals!.net).toBe(new D((floors - 100_00n).toString()).div(100).toFixed(2))
    expect(flaggedPaths(under)).toEqual(expectedFlags(under))
    expect(flaggedPaths(under).length).toBeGreaterThan(0)
    expect(flaggedPaths(same)).toEqual([])
  })

  it('the summary reports, per flagged line, the floor of this market and the net missing to reach it', () => {
    const r = run([discount('0.05')])
    const reported = summary(r).marginFloor
    const byId = new Map(rowsOf(r).map(row => [row.lineId, row]))

    expect(reported.flaggedLinePeriods).toBe(flaggedPaths(r).length)
    expect(reported.lines).toHaveLength(managedLineIds.length)

    for (const line of reported.lines as unknown as Record<string, string | null>[]) {
      const row = byId.get(line.lineId!)!

      expect(line.floorNet).toBe(row.floorNet)
      expect(minor(line.netShortOfFloor!)).toBe(minor(row.floorNet) - minor(row.net))
      expect(minor(line.netShortOfFloor!)).toBeGreaterThan(0n)
      // The real amounts of the row, untouched; no base-market equivalent margin anywhere.
      expect(line.net).toBe(row.net)
      expect(line.marginAmount).toBe(row.marginAmount)
      expect(new D(line.marginRateRoundedDown!).lte(new D(row.marginAmount).div(row.net))).toBe(true)
      expect(new D(row.marginAmount).div(row.net).minus(line.marginRateRoundedDown!).lt('0.000001')).toBe(true)
      // `minimumMargin x net - margin` is not the gap under a base-market floor, so it is not offered.
      expect(line.marginAmountShortOfFloor).toBeNull()
    }
  })
})

describe('a factor of 1 or more with a declared floor basis changes no verdict', () => {
  it.each(['1', '1.10'])(
    'factor %s: ratio 1 on every row and the amounts and verdicts of the final-net basis',
    factor => {
      const demand = quotedIn(CO.currency, CO.country)
      const finalNet = compose(withMarket(catalogV4, CO.country, { factor }), demand)
      const declared = compose(withMarket(catalogV4, CO.country, { factor, floorBasis: true }), demand)
      const base = new Map(rowsOf(baseMarket).map(row => [row.lineId, row]))

      expect(contracts(declared)).toEqual(['1.2.0'])
      expect(flaggedPaths(declared)).toEqual(flaggedPaths(finalNet))

      // Everything the earlier contract says is said identically; only the 1.2.0 keys and the labels are new.
      const strip = (r: Composition) =>
        stripContract({ periods: r.quote.periods, totals: r.quote.totals }, ['floorBasis', ...NEW_ROW_KEYS])

      expect(strip(declared)).toEqual(strip(finalNet))

      for (const row of rowsOf(declared)) {
        expect(row.marketPriceRatio).toBe('1')
        expect(minor(row.floorNet)).toBe(floorNetOf(minor(row.cost), row.minimumMargin))
        // The adjustment is descriptive and signed: zero at factor 1, positive above it.
        expect(minor(row.marketAdjustment)).toBe(policyPrice(row) - policyPrice(base.get(row.lineId)!))
        expect(minor(row.marketAdjustment) > 0n).toBe(factor !== '1')
      }
    }
  )

  it('a discount at factor 1.10 is judged on the final net, exactly as without the floor basis', () => {
    const demand = quotedIn(CO.currency, CO.country, [discount('0.1')])
    const finalNet = compose(withMarket(catalogV4, CO.country, { factor: '1.10' }), demand)
    const declared = compose(withMarket(catalogV4, CO.country, { factor: '1.10', floorBasis: true }), demand)

    const expected = rowsOf(finalNet)
      .filter(row => underFinalNetFloor(minor(row.net), minor(row.cost), row.minimumMargin))
      .map(pathOf)
      .sort()

    expect(flaggedPaths(finalNet)).toEqual(expected)
    expect(flaggedPaths(declared)).toEqual(expected)
    expect(expected.length).toBeGreaterThan(0)
    // Verdict = net under floorNet holds on this basis too.
    expect(expected).toEqual(
      rowsOf(declared)
        .filter(row => minor(row.net) < minor(row.floorNet))
        .map(pathOf)
        .sort()
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
  reference: 'market-floor-test',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '2026-12-31',
  status: 'confirmed'
}

type LineSpec = {
  lineId: string
  /** Monthly human cost. */
  cost: string
  /** Monthly tool: a component that takes no market factor. */
  tool?: string
  /** One-time resource: its own row, with no human component. */
  setup?: string
  method?: 'markup' | 'target_margin'
  rate?: string
  minimumMargin?: string
  /** `reference_adjusted` cost: the talent factor of the line's country over this reference applies. */
  referenceCountry?: string
  talentCountry?: string
}

type Spec = {
  contract: Contract
  currency: Currency
  lines: LineSpec[]
  factor?: string
  floorBasis?: boolean
  multiple?: string
  adjustments?: unknown[]
  talentFactors?: { country: string; referenceCountry: string; factor: string }[]
}

// The offer is sold in CO; talent sits in CL unless a line says otherwise.
const build = (spec: Spec) => ({
  request: {
    schemaVersion: spec.contract,
    quoteDate: '2026-06-15',
    offerId: 'offer',
    deliveryModel: 'staffing',
    engagementCode: 'monthly',
    offerMarketCountry: 'CO',
    outputCurrency: spec.currency,
    duration: { unit: 'month', periods: 1 },
    lines: spec.lines.map(line => ({
      lineId: line.lineId,
      profileId: `profile-${line.lineId}`,
      seniorityCode: 'senior',
      talentCountry: line.talentCountry ?? 'CL',
      headcount: 1,
      dedication: { unit: 'fte', value: '1' },
      allocationMode: 'shared',
      allocationPolicyRef: 'shared',
      assignments: [
        ...(line.tool
          ? [
              {
                resourceId: `tool-${line.lineId}`,
                allocationId: `tool-allocation-${line.lineId}`,
                scope: 'person',
                scopeRef: line.lineId,
                quantity: '1',
                share: '1',
                cashTiming: 'monthly'
              }
            ]
          : []),
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
    snapshotId: 'market-floor',
    version: 'test',
    mode: 'synthetic',
    calculationCurrency: spec.currency,
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
        currency: spec.currency,
        source,
        localization: line.referenceCountry
          ? { kind: 'reference_adjusted', referenceCountry: line.referenceCountry }
          : { kind: 'specific', country: line.talentCountry ?? 'CL' },
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
    talentFactors: (spec.talentFactors ?? []).map(item => ({ ...item, source })),
    marketFactors: [
      { country: 'CO', factor: spec.factor ?? '1', ...(spec.floorBasis ? { floorBasis: FLOOR_BASIS } : {}), source }
    ],
    resources: spec.lines.flatMap(line => [
      ...(line.tool
        ? [
            {
              amount: line.tool,
              currency: spec.currency,
              source,
              resourceId: `tool-${line.lineId}`,
              label: `Herramienta ${line.lineId}`,
              kind: 'tool',
              unit: 'month',
              scope: 'person',
              covers: [`tool-${line.lineId}`]
            }
          ]
        : []),
      ...(line.setup
        ? [
            {
              amount: line.setup,
              currency: spec.currency,
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
    fx: [],
    ...(spec.multiple ? { priceRounding: { multiple: spec.multiple, source } } : {})
  }
})

type KernelRow = AnyRow & { minimumMargin: string }

const calc = (spec: Spec) => {
  const result = calculatePricingV3(build(spec))

  expect(result.diagnostics.filter(item => item.severity !== 'review')).toEqual([])
  expect(result.calculationStatus).toBe('calculated')

  return result
}

const kernelRows = (result: ReturnType<typeof calculatePricingV3>) => result.lines as unknown as KernelRow[]

const kernelFlags = (result: ReturnType<typeof calculatePricingV3>) =>
  result.diagnostics
    .filter(item => item.code === 'MARGIN_BELOW_FLOOR')
    .map(item => item.fieldPath.replace('result.lines.', ''))
    .sort()

/** Policy price and presented cost of the same economic input as contract 1.0.0 prices them: no rule, no basis. */
const priced10 = (spec: Omit<Spec, 'contract'>, factor: string) => {
  const result = calc({ ...spec, contract: '1.0.0', factor, floorBasis: false, multiple: undefined, adjustments: [] })

  return new Map(kernelRows(result).map(row => [row.lineId, row]))
}

describe('the rule, from inputs small enough to derive by hand', () => {
  // Target margin 0.5: the multiplier is exactly 2, so every amount below is an integer computed here.
  // Line a is a person alone (plus a one-time setup row); line b is a person with a tool, which takes no factor.
  const HUMAN = 1_000_000n
  const TOOL = 250_000n
  const SETUP = 50_000n
  const FACTOR = { numerator: 9n, denominator: 10n, text: '0.9' }
  const MINIMUM = '0.45'

  const spec = (extra: Partial<Spec> = {}): Spec => ({
    contract: '1.2.0',
    currency: 'CLP',
    factor: FACTOR.text,
    floorBasis: true,
    lines: [
      { lineId: 'a', cost: HUMAN.toString(), setup: SETUP.toString(), minimumMargin: MINIMUM },
      { lineId: 'b', cost: HUMAN.toString(), tool: TOOL.toString(), minimumMargin: MINIMUM }
    ],
    ...extra
  })

  const lowered = (HUMAN * FACTOR.numerator) / FACTOR.denominator

  const expected = {
    'a:1:monthly': { cost: HUMAN, basePrice: 2n * HUMAN, price: 2n * lowered },
    'a:1:setup': { cost: SETUP, basePrice: 2n * SETUP, price: 2n * SETUP },
    'b:1:monthly': { cost: HUMAN + TOOL, basePrice: 2n * (HUMAN + TOOL), price: 2n * (lowered + TOOL) }
  } as const

  const result = calc(spec()) as PricingV3ResultV12
  const row = (lineId: keyof typeof expected) => kernelRows(result).find(item => item.lineId === lineId)!

  it('cost, price, market adjustment and floor of every row', () => {
    expect(
      kernelRows(result)
        .map(item => item.lineId)
        .sort()
    ).toEqual(Object.keys(expected).sort())

    for (const [lineId, want] of Object.entries(expected)) {
      const got = row(lineId as keyof typeof expected)
      const rho = want.price < want.basePrice ? { price: want.price, basePrice: want.basePrice } : undefined

      expect(minor(got.cost)).toBe(want.cost)
      expect(minor(got.undiscountedPrice)).toBe(want.price)
      expect(minor(got.net)).toBe(want.price)
      expect(minor(got.roundingAdjustment)).toBe(0n)
      expect(minor(got.marketAdjustment)).toBe(want.price - want.basePrice)
      expect(minor(got.marginAmount)).toBe(want.price - want.cost)
      expect(minor(got.floorNet)).toBe(floorNetOf(want.cost, MINIMUM, rho))
    }
  })

  it('the ratio is the factor for a person alone, closer to 1 with a tool, and exactly 1 without a person', () => {
    // 1.800.000 / 2.000.000, 2.300.000 / 2.500.000 and 100.000 / 100.000.
    expect(row('a:1:monthly').marketPriceRatio).toBe('0.9')
    expect(row('b:1:monthly').marketPriceRatio).toBe('0.92')
    expect(row('a:1:setup').marketPriceRatio).toBe('1')
    expect(minor(row('a:1:setup').marketAdjustment)).toBe(0n)
  })

  it('the floors, worked by hand', () => {
    // 1.000.000 x 0.9 / 0.55 = 1.636.363,63...: raised to 1.636.364.
    expect(minor(row('a:1:monthly').floorNet)).toBe(1_636_364n)
    // 1.250.000 x 0.92 / 0.55 = 2.090.909,09...: raised to 2.090.910.
    expect(minor(row('b:1:monthly').floorNet)).toBe(2_090_910n)
    // No person, base-market floor: 50.000 / 0.55 = 90.909,09...: raised to 90.910.
    expect(minor(row('a:1:setup').floorNet)).toBe(90_910n)
  })

  it('priced by policy nothing is flagged, although the real margin of line a is under the minimum', () => {
    const a = expected['a:1:monthly']
    const totalNet = sum(Object.values(expected).map(item => item.price))
    const totalCost = sum(Object.values(expected).map(item => item.cost))

    expect(kernelFlags(result)).toEqual([])
    expect(result.reviewStatus).toBe('within_policy')
    // (1.800.000 - 1.000.000) / 1.800.000 = 0.4444...
    expect(underFinalNetFloor(a.price, a.cost, MINIMUM)).toBe(true)
    expect(minor(result.totals!.net)).toBe(totalNet)
    expect(minor(result.totals!.marginAmount)).toBe(totalNet - totalCost)
    expect(
      new D(result.totals!.marginRate!)
        .minus(new D((totalNet - totalCost).toString()).div(totalNet.toString()))
        .abs()
        .lt('1e-60')
    ).toBe(true)
    expect(minor(result.totals!.marketAdjustment)).toBe(
      sum(Object.values(expected).map(item => item.price - item.basePrice))
    )
  })

  it('without the floor basis the same input flags line a on its final net (contracts 1.0.0 and 1.1.0)', () => {
    for (const contract of ['1.0.0', '1.1.0'] as const) {
      const earlier = calc(spec({ contract, floorBasis: false }))

      // Line b keeps (2.300.000 - 1.250.000) / 2.300.000 = 0.4565: its tool was not lowered.
      expect(kernelFlags(earlier)).toEqual(['a:1:monthly'])
      for (const item of kernelRows(earlier)) for (const key of NEW_ROW_KEYS) expect(item).not.toHaveProperty(key)
      for (const key of NEW_TOTAL_KEYS) expect(earlier.totals).not.toHaveProperty(key)

      // Same amounts as 1.2.0 in everything both contracts report.
      expect(kernelRows(earlier).map(item => [item.lineId, item.cost, item.net, item.marginAmount])).toEqual(
        kernelRows(result).map(item => [item.lineId, item.cost, item.net, item.marginAmount])
      )
    }
  })

  it('the verdict is exact at the floor: a net of floorNet passes and one unit less is flagged', () => {
    const agreed = (amount: bigint) =>
      calc(
        spec({
          adjustments: [
            {
              adjustmentId: 'n',
              kind: 'agreed_net',
              amount: amount.toString(),
              billing: 'monthly',
              lineIds: ['a'],
              reason: 'r'
            }
          ]
        })
      )

    const floor = minor(row('a:1:monthly').floorNet)
    const under = agreed(floor - 1n)

    expect(kernelFlags(agreed(floor))).toEqual([])
    expect(kernelFlags(under)).toEqual(['a:1:monthly'])
    // The floor did not move with the agreed amount, and the margin reported is the real one.
    expect(kernelRows(under).find(item => item.lineId === 'a:1:monthly')!.floorNet).toBe(row('a:1:monthly').floorNet)
    expect(minor(kernelRows(under).find(item => item.lineId === 'a:1:monthly')!.marginAmount)).toBe(floor - 1n - HUMAN)
  })

  it('a row with zero net is still flagged, as in every contract', () => {
    const zero = calc(
      spec({
        adjustments: [
          { adjustmentId: 'n', kind: 'agreed_net', amount: '0', billing: 'monthly', lineIds: ['a'], reason: 'r' }
        ]
      })
    )

    expect(kernelFlags(zero)).toEqual(['a:1:monthly'])
  })

  it('two decimals: the floor is raised to the cent', () => {
    // 700,00 x 0.9 / 0.55 = 1.145,4545...: the floor is 1.145,46.
    const usd = calc({
      contract: '1.2.0',
      currency: 'USD',
      factor: '0.9',
      floorBasis: true,
      lines: [{ lineId: 'a', cost: '700' }]
    })

    const [only] = kernelRows(usd)

    expect(only.floorNet).toBe('1145.46')
    expect(minor(only.floorNet)).toBe(floorNetOf(700_00n, '0.45', { price: 9n, basePrice: 10n }))
    expect(only.marketAdjustment).toBe('-140.00')
  })
})

// Seeded generator: the property tests are reproducible and need no dependency.
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

/** n / 10000 as a decimal string with four decimals. */
const tenThousandths = (n: number) => `${Math.floor(n / 10000)}.${String(n % 10000).padStart(4, '0')}`

const format = (value: bigint, currency: Currency) => {
  const precision = PRECISION[currency]
  const digits = value.toString().padStart(precision + 1, '0')

  return precision === 0 ? digits : `${digits.slice(0, -precision)}.${digits.slice(-precision)}`
}

describe('rounding and the market floor together, over generated cases', () => {
  // With the currency unit itself as the multiple every price is already "round": only floor conservation moves it.
  const MULTIPLES: Record<Currency, readonly string[]> = {
    CLP: ['1', '5', '1000', '5000', '10000', '50000', '100000'],
    USD: ['0.01', '0.02', '0.05', '1', '5', '10', '100', '250']
  }

  // [target margin, minimum margin]: priced by policy means the target is at or above the floor. Several targets
  // have a non-terminating 1 / (1 - rate), where cost and price round apart.
  const POLICIES = [
    ['0.45', '0.45'],
    ['0.45', '0.45'],
    ['0.5', '0.45'],
    ['0.3', '0.3'],
    ['0.35', '0.3'],
    ['0.333333', '0.333333'],
    ['0.4', '0.4'],
    ['0.62', '0.55'],
    ['0.15', '0.15'],
    ['0.07', '0.07']
  ] as const

  type Case = { spec: Omit<Spec, 'contract' | 'floorBasis'> & { factor: string; multiple: string }; discount: string }

  const generate = (seed: number, count: number): Case[] => {
    const random = seeded(seed)

    const amount = (currency: Currency, min: number, max: number) =>
      currency === 'CLP' ? String(random.int(min, max)) : format(BigInt(random.int(min, max)), 'USD')

    return Array.from({ length: count }, () => {
      const currency = random.pick(['CLP', 'USD'] as const)
      // Minor units: CLP 300.000-9.000.000, USD 500,00-15.000,00.
      const [low, high] = currency === 'CLP' ? [300_000, 9_000_000] : [50_000, 1_500_000]
      const [rate, minimumMargin] = random.pick(POLICIES)

      return {
        discount: `0.${String(random.int(1, 3000)).padStart(4, '0')}`,
        spec: {
          currency,
          // Four decimals across (0.5, 1.2): below, at and above 1.
          factor: random.int(0, 19) === 0 ? '1' : tenThousandths(random.int(5001, 11999)),
          multiple: random.pick(MULTIPLES[currency]),
          lines: ['a', 'b', 'c', 'd'].slice(0, random.int(1, 4)).map(lineId => ({
            lineId,
            cost: amount(currency, low, high),
            ...(random.int(0, 1) ? { tool: amount(currency, Math.floor(low / 20), Math.floor(high / 10)) } : {}),
            ...(random.int(0, 2) === 0 ? { setup: amount(currency, Math.floor(low / 10), high) } : {}),
            method: 'target_margin' as const,
            rate,
            minimumMargin
          }))
        }
      }
    })
  }

  const cases = generate(1211, 400)
  const lowers = (c: Case) => new D(c.spec.factor).lt(1)

  it('the generator covers both currencies and factors below, at and above 1', () => {
    expect(new Set(cases.map(c => c.spec.currency))).toEqual(new Set(['CLP', 'USD']))
    expect(cases.filter(lowers).length).toBeGreaterThan(100)
    expect(cases.filter(c => new D(c.spec.factor).gt(1)).length).toBeGreaterThan(50)
    expect(cases.filter(c => c.spec.factor === '1').length).toBeGreaterThan(0)
    expect(cases.every(c => new D(c.spec.factor).gt('0.5') && new D(c.spec.factor).lt('1.2'))).toBe(true)
  })

  it('every net is a multiple, never under the policy price nor under floorNet, and no row priced by policy is flagged', () => {
    let lowered = 0
    let liftedByFloor = 0

    for (const { spec } of cases) {
      const scale = PRECISION[spec.currency]
      const multiple = scaled(spec.multiple, scale)
      const result = calc({ ...spec, contract: '1.2.0', floorBasis: true }) as PricingV3ResultV12
      const withFactor = priced10(spec, spec.factor)
      const atBase = priced10(spec, '1')

      expect(kernelFlags(result), JSON.stringify(spec)).toEqual([])

      for (const row of kernelRows(result)) {
        const cost = minor(withFactor.get(row.lineId)!.cost)
        const price = minor(withFactor.get(row.lineId)!.undiscountedPrice)
        const basePrice = minor(atBase.get(row.lineId)!.undiscountedPrice)
        const rho = price < basePrice ? { price, basePrice } : undefined
        const floor = floorNetOf(cost, row.minimumMargin, rho)
        const net = minor(row.net)

        expect(minor(row.cost)).toBe(cost)
        expect(policyPrice(row)).toBe(price)
        expect(minor(row.marketAdjustment)).toBe(price - basePrice)
        expect(minor(row.floorNet)).toBe(floor)
        expect(row.marketPriceRatio === '1').toBe(!rho)
        if (rho) expect(new D(row.marketPriceRatio).gt(0) && new D(row.marketPriceRatio).lt(1)).toBe(true)

        expect(net).toBe(minor(row.undiscountedPrice))
        expect(net % multiple).toBe(0n)
        expect(net).toBeGreaterThanOrEqual(price)
        expect(net).toBeGreaterThanOrEqual(floor)
        // The smallest such multiple: one multiple less would be under the policy price or under the floor.
        expect(net - multiple < price || net - multiple < floor).toBe(true)

        if (rho) lowered += 1
        if (rho && floor > ceilDiv(price, multiple) * multiple) liftedByFloor += 1
      }

      expect(minor(result.totals!.marketAdjustment)).toBe(
        sum(kernelRows(result).map(row => minor(row.marketAdjustment)))
      )
    }

    // Both branches of the conservation rule were exercised: rows lowered by the market, and rows where the floor of
    // the market (not the plain next multiple) decided the price.
    expect(lowered).toBeGreaterThan(300)
    expect(liftedByFloor).toBeGreaterThan(0)
  })

  it('the same cases WITHOUT the floor basis do flag rows when the factor lowers the price: the property sees the defect', () => {
    let flaggedRows = 0
    let casesWithFlags = 0

    for (const { spec } of cases.filter(lowers)) {
      const earlier = calc({ ...spec, contract: '1.1.0', floorBasis: false })
      const declared = calc({ ...spec, contract: '1.2.0', floorBasis: true })

      // The earlier verdict, recomputed with integers: (net - cost) / net under the minimum.
      const expected = kernelRows(earlier)
        .filter(row => underFinalNetFloor(minor(row.net), minor(row.cost), row.minimumMargin))
        .map(row => row.lineId)
        .sort()

      expect(kernelFlags(earlier)).toEqual(expected)
      expect(kernelFlags(declared)).toEqual([])
      flaggedRows += expected.length
      if (expected.length) casesWithFlags += 1
    }

    expect(flaggedRows).toBeGreaterThan(200)
    expect(casesWithFlags).toBeGreaterThan(cases.filter(lowers).length / 2)
  })

  it('a factor of 1 or more: the 1.2.0 result is the 1.1.0 result plus its own keys', () => {
    const neutral = cases.filter(c => !lowers(c))

    expect(neutral.length).toBeGreaterThan(50)

    for (const { spec, discount: rate } of neutral) {
      const adjustments = [
        { adjustmentId: 'd', kind: 'discount', rate, lineIds: spec.lines.map(line => line.lineId), reason: 'r' }
      ]

      const earlier = calc({ ...spec, adjustments, contract: '1.1.0', floorBasis: false })
      const declared = calc({ ...spec, adjustments, contract: '1.2.0', floorBasis: true })

      expect(stripContract(declared, NEW_ROW_KEYS)).toEqual(stripContract(earlier, []))
      expect(kernelFlags(declared)).toEqual(kernelFlags(earlier))
      expect(kernelRows(declared).every(row => row.marketPriceRatio === '1')).toBe(true)
    }
  })

  it('after any discount the verdict is exactly "net under floorNet", and the discount never moves the floor', () => {
    let flaggedRows = 0
    let passingRows = 0

    for (const { spec, discount: rate } of cases) {
      const adjustments = [
        { adjustmentId: 'd', kind: 'discount', rate, lineIds: spec.lines.map(line => line.lineId), reason: 'r' }
      ]

      const priced = calc({ ...spec, contract: '1.2.0', floorBasis: true })
      const discounted = calc({ ...spec, adjustments, contract: '1.2.0', floorBasis: true })
      const rows = kernelRows(discounted)

      const expected = rows
        .filter(row => minor(row.net) === 0n || minor(row.net) < minor(row.floorNet))
        .map(row => row.lineId)
        .sort()

      expect(kernelFlags(discounted)).toEqual(expected)
      expect(rows.map(row => row.floorNet)).toEqual(kernelRows(priced).map(row => row.floorNet))
      flaggedRows += expected.length
      passingRows += rows.length - expected.length
    }

    expect(flaggedRows).toBeGreaterThan(100)
    expect(passingRows).toBeGreaterThan(100)
  })
})

describe('the talent factor is another fact: it moves cost, and price with it', () => {
  // Reference cost of Chile, person in Colombia: 0.8 of the reference. Target margin 0.5, so the multiplier is 2.
  const REFERENCE = 1_000_000n
  const TOOL = 250_000n
  const TALENT = { numerator: 8n, denominator: 10n, text: '0.8' }
  const human = (REFERENCE * TALENT.numerator) / TALENT.denominator

  const spec = (extra: Partial<Spec> = {}, line: Partial<LineSpec> = {}): Spec => ({
    contract: '1.0.0',
    currency: 'CLP',
    lines: [{ lineId: 'a', cost: REFERENCE.toString(), referenceCountry: 'CL', talentCountry: 'CO', ...line }],
    talentFactors: [{ country: 'CO', referenceCountry: 'CL', factor: TALENT.text }],
    ...extra
  })

  const only = (result: ReturnType<typeof calculatePricingV3>) => kernelRows(result)[0]

  const trace = (result: ReturnType<typeof calculatePricingV3>) =>
    result.lines[0].components.find(c => c.kind === 'human')!.trace

  it('exists since contract 1.0.0: cost and price come down together and the margin stays where the policy puts it', () => {
    const neutral = calc(spec({ talentFactors: [{ country: 'CO', referenceCountry: 'CL', factor: '1' }] }))
    const cheaper = calc(spec())

    expect(minor(only(neutral).cost)).toBe(REFERENCE)
    expect(minor(only(neutral).net)).toBe(2n * REFERENCE)
    expect(minor(only(cheaper).cost)).toBe(human)
    expect(minor(only(cheaper).net)).toBe(2n * human)
    // Margin 0.5 in both, exactly: (net - cost) x 2 = net.
    for (const row of [only(neutral), only(cheaper)]) expect(minor(row.marginAmount) * 2n).toBe(minor(row.net))
    expect(kernelFlags(cheaper)).toEqual([])
    expect(cheaper.engineVersion).toBe(PRICING_V3_ENGINES['1.0.0'])
    expect(trace(cheaper)).toMatchObject({
      costFactor: TALENT.text,
      marketFactor: '1',
      costLocalization: 'reference_adjusted'
    })
  })

  it('a cost specific to a country takes no talent factor, even when one is registered', () => {
    const specific = calc(spec({}, { referenceCountry: undefined }))

    expect(minor(only(specific).cost)).toBe(REFERENCE)
    expect(trace(specific)).toMatchObject({ costFactor: '1', costLocalization: 'specific' })
  })

  it.each(['1.0.0', '1.1.0', '1.2.0'] as const)('contract %s applies it identically', contract => {
    const result = calc(spec({ contract }))

    expect(minor(only(result).cost)).toBe(human)
    expect(minor(only(result).net)).toBe(2n * human)
    expect(kernelFlags(result)).toEqual([])
  })

  it('it composes with a market factor and its floor basis: cost x talent factor, human price x market factor', () => {
    const result = calc(spec({ contract: '1.2.0', factor: '0.9', floorBasis: true }, { tool: TOOL.toString() }))
    const row = only(result)
    const cost = human + TOOL
    const basePrice = 2n * (human + TOOL)
    const price = 2n * ((human * 9n) / 10n + TOOL)

    expect(minor(row.cost)).toBe(cost)
    expect(minor(row.net)).toBe(price)
    expect(minor(row.marketAdjustment)).toBe(price - basePrice)
    expect(minor(row.floorNet)).toBe(floorNetOf(cost, '0.45', { price, basePrice }))
    expect(trace(result)).toMatchObject({ costFactor: TALENT.text, marketFactor: '0.9' })
    expect(kernelFlags(result)).toEqual([])
  })

  it('the two factors are independent: the talent factor does not move rho, the market factor does not move cost', () => {
    const market = { contract: '1.2.0', factor: '0.9', floorBasis: true } as const
    const reference = calc(spec({ ...market, talentFactors: [{ country: 'CO', referenceCountry: 'CL', factor: '1' }] }))
    const cheaper = calc(spec(market))

    // A person alone: rho is the market factor whatever the person costs.
    expect(only(reference).marketPriceRatio).toBe('0.9')
    expect(only(cheaper).marketPriceRatio).toBe('0.9')
    expect(only(cheaper).cost).toBe(only(calc(spec())).cost)
    // Without the floor basis the market factor alone drags the real margin under the minimum and the row is flagged;
    // the talent factor never does.
    expect(kernelFlags(calc(spec({ contract: '1.1.0', factor: '0.9' })))).toEqual([only(cheaper).lineId])
    expect(kernelFlags(calc(spec({ contract: '1.1.0' })))).toEqual([])
  })

  describe('through the catalog and composition lanes', () => {
    const profiles = new Set(managed.brief.lines.map((l: { profile: string }) => l.profile))

    // Costs of the quoted profiles declared as a reference of Chile, plus a factor for people in Colombia.
    const referenceCatalog = (talentFactor: string) => {
      const next = clone(catalogV4) as CatalogDoc & { records: Record<string, unknown>[] }

      for (const record of next.records)
        if (record.kind === 'cost' && profiles.has(record.value.profileId))
          record.value.localization = { kind: 'reference_adjusted', referenceCountry: 'CL' }

      next.records.push({
        recordId: 'talent:CO:CL',
        revision: 1,
        kind: 'talent_factor',
        source: {
          reference: 'test-talent-factor',
          effectiveFrom: '2026-01-01',
          effectiveUntil: '9999-12-31',
          status: 'estimated'
        },
        note: 'Talent factor built by the test.',
        value: { country: 'CO', referenceCountry: 'CL', factor: talentFactor }
      })

      return next
    }

    const inColombia = () => {
      const next = quotedIn(CO.currency, CO.country)

      for (const line of next.brief.lines) line.talentCountry = 'CO'

      return next
    }

    const humanOf = (r: Composition) =>
      r.quote.periods.flatMap(p => p.result.lines.map(l => l.components.find(c => c.kind === 'human')!))

    const neutral = compose(referenceCatalog('1'), inColombia())
    const cheaper = compose(referenceCatalog('0.8'), inColombia())

    it('resolution binds the talent factor and it needs no new contract', () => {
      expect(cheaper.quote.calculationStatus).toBe('calculated')
      expect(contracts(cheaper)).toEqual(contracts(baseMarket))
      expect(
        cheaper.quote.resolution.bindings.filter(b => b.purpose === 'talent_factor').map(b => b.record.recordId)
      ).toEqual(['talent:CO:CL'])
      for (const key of NEW_TOTAL_KEYS) expect(cheaper.quote.totals).not.toHaveProperty(key)
    })

    it('the human component costs and sells at 0.8 of the reference; nothing is flagged', () => {
      const before = humanOf(neutral)

      humanOf(cheaper).forEach((component, index) => {
        expect(component.trace.costFactor).toBe('0.8')
        expect(new D(component.cost).eq(new D(before[index].cost).mul('0.8'))).toBe(true)
        // The price carries the 80-digit division by (1 - target margin): equal to the 60th digit.
        expect(new D(component.price).div(new D(before[index].price).mul('0.8')).minus(1).abs().lt('1e-60')).toBe(true)
      })

      expect(new D(cheaper.quote.totals!.cost).lt(neutral.quote.totals!.cost)).toBe(true)
      expect(new D(cheaper.quote.totals!.net).lt(neutral.quote.totals!.net)).toBe(true)
      expect(flaggedPaths(neutral)).toEqual([])
      expect(flaggedPaths(cheaper)).toEqual([])
    })

    it('with a market factor and its floor basis on top: 1.2.0, cost of the talent factor, floor of the market', () => {
      const both = compose(
        withMarket(referenceCatalog('0.8'), CO.country, { factor: CO.factor, floorBasis: true }),
        inColombia()
      )

      const talentOnly = new Map(rowsOf(cheaper).map(row => [row.lineId, row]))

      expect(contracts(both)).toEqual(['1.2.0'])
      expect(flaggedPaths(both)).toEqual([])
      expect(both.quote.totals!.cost).toBe(cheaper.quote.totals!.cost)

      for (const row of rowsOf(both)) {
        const base = talentOnly.get(row.lineId)!
        const price = policyPrice(row)
        const basePrice = policyPrice(base)

        expect(row.cost).toBe(base.cost)
        expect(minor(row.marketAdjustment)).toBe(price - basePrice)
        expect(minor(row.floorNet)).toBe(floorNetOf(minor(row.cost), row.minimumMargin, { price, basePrice }))
      }

      for (const component of humanOf(both))
        expect(component.trace).toMatchObject({ costFactor: '0.8', marketFactor: CO.factor })
    })
  })
})

describe('replay of a 1.2.0 artifact in every lane', () => {
  const kernelInput = () =>
    build({
      contract: '1.2.0',
      currency: 'USD',
      factor: '0.85',
      floorBasis: true,
      multiple: '10',
      lines: [
        { lineId: 'a', cost: '4321.09', tool: '250', setup: '900', rate: '0.45' },
        { lineId: 'b', cost: '2765.4', rate: '0.45' }
      ],
      adjustments: [{ adjustmentId: 'd', kind: 'discount', rate: '0.03', lineIds: ['a'], reason: 'r' }]
    })

  it('kernel lane: verifies, carries the engine of its contract, and any touched value is REPLAY_MISMATCH', () => {
    const artifact = runPricingV3(kernelInput(), '2026-10-11').artifact!
    const frozen = () => clone(artifact) as unknown as Record<string, any>

    expect(artifact.semantic.engineVersion).toBe(PRICING_V3_ENGINES['1.2.0'])
    expect(artifact.semantic.result.engineVersion).toBe(PRICING_V3_ENGINES['1.2.0'])
    expect(artifact.semantic.result.precisionPolicy).toBe(PRICING_V3_PRECISION_POLICIES['1.2.0'])
    expect(replayPricingV3(frozen()).replayDigest).toBe(artifact.replayDigest)
    // The floor basis is part of the frozen input.
    expect(frozen().semantic.input.snapshot.marketFactors[0].floorBasis).toBe(FLOOR_BASIS)

    const edits: ((item: Record<string, any>) => void)[] = [
      item => {
        item.semantic.result.lines[0].floorNet = '0.01'
      },
      item => {
        item.semantic.result.lines[0].marketPriceRatio = '1'
      },
      item => {
        item.semantic.result.totals.marketAdjustment = '0.00'
      },
      item => {
        delete item.semantic.input.snapshot.marketFactors[0].floorBasis
      },
      item => {
        item.semantic.input.snapshot.marketFactors[0].factor = '0.9'
      },
      item => {
        item.semantic.engineVersion = PRICING_V3_ENGINES['1.1.0']
      }
    ]

    for (const edit of edits) {
      const touched = frozen()

      edit(touched)
      expect(() => replayPricingV3(touched)).toThrow('REPLAY_MISMATCH')
    }
  })

  it('kernel lane: artifacts of 1.0.0 and 1.1.0 built here still verify, and none is signed by another engine', () => {
    for (const contract of ['1.0.0', '1.1.0'] as const) {
      const artifact = runPricingV3(
        build({ contract, currency: 'USD', factor: '0.85', lines: [{ lineId: 'a', cost: '4321.09', tool: '250' }] }),
        '2026-10-11'
      ).artifact!

      expect(artifact.semantic.engineVersion).toBe(PRICING_V3_ENGINES[contract])
      expect(replayPricingV3(clone(artifact)).replayDigest).toBe(artifact.replayDigest)
      expect(JSON.stringify(artifact.semantic.result)).not.toMatch(/marketAdjustment|marketPriceRatio|floorNet/)
    }
  })

  it('comparison reports marketAdjustment only when both sides carry it', () => {
    const at = (factor: string, contract: Contract) =>
      runPricingV3(
        build({
          contract,
          currency: 'USD',
          factor,
          floorBasis: contract === '1.2.0',
          lines: [{ lineId: 'a', cost: '1000' }]
        })
      ).artifact!

    const both = comparePricingV3(at('1', '1.2.0'), at('0.9', '1.2.0')).differences!
    const mixed = comparePricingV3(at('0.9', '1.1.0'), at('0.9', '1.2.0')).differences!

    // 1000 at target margin 0.5 sells at 2000; at 0.9 it sells 200 lower.
    expect(both.marketAdjustment).toBe('-200')
    expect(both.net).toBe('-200')
    expect(Object.keys(mixed)).not.toContain('marketAdjustment')
    expect(mixed.net).toBe('0')
  })

  it('composition lane: verifies from its own frozen catalog, policy and demand; a touched factor record does not', () => {
    const artifact = runResourceComposition(
      floorCatalog,
      policy,
      credits,
      quotedIn(CO.currency, CO.country, [discount('0.05')]),
      '2026-10-11'
    )

    const frozen = clone(artifact)
    const replay = replayResourceComposition(frozen)

    expect(replay.replayDigest).toBe(artifact.replayDigest)
    expect(replay.calculationId).toBe(artifact.calculationId)
    expect(engines(replay.semantic.result)).toEqual([PRICING_V3_ENGINES['1.2.0']])
    expect(marketRecord(frozen.semantic.catalog as unknown as CatalogDoc, 'CO').value.floorBasis).toBe(FLOOR_BASIS)

    for (const edit of [
      (record: CatalogDoc['records'][number]) => {
        delete record.value.floorBasis
      },
      (record: CatalogDoc['records'][number]) => {
        record.value.factor = '0.95'
      }
    ]) {
      const touched = clone(artifact)

      edit(marketRecord(touched.semantic.catalog as unknown as CatalogDoc, 'CO'))
      expect(() => replayResourceComposition(touched)).toThrow('REPLAY_MISMATCH')
    }
  })

  it('catalog lane: verifies, and explain shows the market walk of every row', () => {
    const cat = withMarket(designerCatalog, designerBrief.offerMarketCountry, { factor: '0.9', floorBasis: true })
    const artifact = runCatalogQuote(cat, designerBrief, '2026-10-11')
    const explained = explainCatalogQuote(clone(artifact))
    const lines = artifact.semantic.result.periods.flatMap(p => p.result.lines) as unknown as AnyRow[]

    expect(replayCatalogQuote(clone(artifact)).replayDigest).toBe(artifact.replayDigest)
    expect(explained.commercialAdjustments).toMatchObject({
      marketFactor: { country: designerBrief.offerMarketCountry, factor: '0.9', floorBasis: FLOOR_BASIS }
    })
    expect(
      explained.commercialAdjustments.rows.map(row => [
        row.lineId,
        row.marketAdjustment,
        row.marketPriceRatio,
        row.floorNet
      ])
    ).toEqual(lines.map(line => [line.lineId, line.marketAdjustment, line.marketPriceRatio, line.floorNet]))
    expect(explained.factorAndFxReferences.some(b => b.purpose === 'market_factor')).toBe(true)
  })

  it('explain of an earlier-contract quote says what it always said', () => {
    const earlier = explainCatalogQuote(clone(runCatalogQuote(designerCatalog, designerBrief, '2026-10-11')))

    expect(earlier.commercialAdjustments).not.toHaveProperty('marketFactor')
    expect(earlier.commercialAdjustments.identity).not.toMatch(/market|floor/i)
    for (const row of earlier.commercialAdjustments.rows)
      for (const key of NEW_ROW_KEYS) expect(row).not.toHaveProperty(key)
  })
})

describe('summary, assess, explain and the client-shaped views of a 1.2.0 composition', () => {
  const flagged = compose(floorCatalog, quotedIn(CO.currency, CO.country, [discount('0.05')]))

  const record = marketRecord(floorCatalog, 'CO') as unknown as {
    recordId: string
    revision: number
    source: { status: string }
  }

  const marketFactor = {
    country: CO.country,
    factor: CO.factor,
    floorBasis: FLOOR_BASIS,
    recordId: record.recordId,
    revision: record.revision,
    sourceStatus: record.source.status
  }

  /** The stored ratio at six decimals, rounded down, from integers: never better than the real margin. */
  const roundedDown = (r: Composition) => {
    const net = minor(r.quote.totals!.net)
    const margin = net - minor(r.quote.totals!.cost)

    return new D(((margin * 1_000_000n) / net).toString()).div(1_000_000).toFixed(6)
  }

  it('not flagged: names the market factor, reports the real margin unchanged and lists no floor line', () => {
    const s = summary(followed)

    expect(s.schemaVersion).toBe(COMPOSITION_SUMMARY_VERSION)
    expect(s.schemaVersion).toBe('pricing-v3-composition-summary/1')
    expect(s.engineVersion).toBe(PRICING_V3_ENGINES['1.2.0'])
    expect(s.marketFactor).toEqual(marketFactor)
    expect(s.totals).toEqual(followed.quote.totals)
    expect(s.totals).toHaveProperty('marketAdjustment')
    expect(s.marginRateRoundedDown).toBe(roundedDown(followed))
    expect(new D(s.marginRateRoundedDown!).lt('0.45')).toBe(true)
    expect(s.marginFloor).toEqual({ source: 'kernel:MARGIN_BELOW_FLOOR', flaggedLinePeriods: 0, lines: [] })
    expect(s.reviewSignals.map(signal => signal.code)).not.toContain('MARGIN_BELOW_FLOOR')
  })

  it('flagged: names the market factor and, per line, the floor of this market and the net missing', () => {
    const s = summary(flagged)
    const rows = new Map(rowsOf(flagged).map(row => [row.lineId, row]))

    expect(s.marketFactor).toEqual(marketFactor)
    expect(s.marginRateRoundedDown).toBe(roundedDown(flagged))
    expect(s.marginFloor.flaggedLinePeriods).toBe(flaggedPaths(flagged).length)
    expect(s.marginFloor.lines.map(line => `periods.1.result.lines.${line.lineId}`).sort()).toEqual(
      flaggedPaths(flagged)
    )

    for (const line of s.marginFloor.lines as unknown as Record<string, string>[]) {
      expect(line.floorNet).toBe(rows.get(line.lineId)!.floorNet)
      expect(minor(line.netShortOfFloor)).toBe(minor(line.floorNet) - minor(line.net))
    }
  })

  it('the summary only gains keys: an earlier contract has none of them, a factor in force without basis is named', () => {
    const neutral = summary(baseMarket)
    const finalNet = summary(lowered)
    const declared = summary(followed)

    expect(neutral).not.toHaveProperty('marketFactor')
    expect(finalNet.marketFactor).toEqual({ ...marketFactor, floorBasis: null })
    expect(Object.keys(declared)).toEqual(Object.keys(finalNet))
    expect(Object.keys(finalNet).filter(key => !Object.keys(neutral).includes(key))).toEqual(['marketFactor'])

    // Flagged lines of the earlier contract keep their shape and the margin gap of the final-net basis.
    expect(finalNet.marginFloor.lines.length).toBeGreaterThan(0)

    for (const line of finalNet.marginFloor.lines as unknown as Record<string, string>[]) {
      expect(line).not.toHaveProperty('floorNet')
      expect(line).not.toHaveProperty('netShortOfFloor')
      expect(
        new D(line.marginAmountShortOfFloor).eq(new D(line.minimumMargin).mul(line.net).minus(line.marginAmount))
      ).toBe(true)
    }
  })

  it('a 1.2.0 row whose floor is read on the final net keeps the margin gap next to the net gap', () => {
    const finalNetBasis = compose(
      withMarket(catalogV4, CO.country, { factor: '1.10', floorBasis: true }),
      quotedIn(CO.currency, CO.country, [discount('0.1')])
    )

    const lines = summary(finalNetBasis).marginFloor.lines as unknown as Record<string, string>[]

    expect(lines.length).toBeGreaterThan(0)

    for (const line of lines) {
      expect(
        new D(line.marginAmountShortOfFloor).eq(new D(line.minimumMargin).mul(line.net).minus(line.marginAmount))
      ).toBe(true)
      expect(minor(line.netShortOfFloor)).toBe(minor(line.floorNet) - minor(line.net))
    }
  })

  it('assess emits MARGIN_BELOW_POLICY_FLOOR for the kernel-flagged lines only, and reports the real margin', () => {
    const quiet = assessCompositionReadiness(followed)
    const loud = assessCompositionReadiness(flagged)

    const gaps = (a: typeof quiet) =>
      a.gaps
        .filter(g => g.code === 'MARGIN_BELOW_POLICY_FLOOR')
        .map(g => g.path)
        .sort()

    expect(gaps(quiet)).toEqual([])
    expect(gaps(loud)).toEqual(flaggedPaths(flagged))
    expect(gaps(assessCompositionReadiness(lowered))).toEqual(flaggedPaths(lowered))

    expect(quiet.margin!.modeledRate).toBe(followed.quote.totals!.marginRate)
    expect(quiet.margin!.policyFloor).toEqual({
      source: 'kernel:MARGIN_BELOW_FLOOR',
      marketFactor,
      linesBelowFloor: []
    })
    expect(loud.margin!.modeledRate).toBe(flagged.quote.totals!.marginRate)
    expect(loud.margin!.policyFloor.linesBelowFloor.map(line => line.lineId).sort()).toEqual(
      rowsOf(flagged)
        .map(row => row.lineId)
        .sort()
    )
    // Unchanged for a quote with the neutral factor.
    expect(assessCompositionReadiness(baseMarket).margin!.policyFloor).toEqual({
      source: 'kernel:MARGIN_BELOW_FLOOR',
      linesBelowFloor: []
    })
  })

  it('explain keeps the internal walk: market adjustment, ratio and floor per row', () => {
    const artifact = runResourceComposition(
      floorCatalog,
      policy,
      credits,
      quotedIn(CO.currency, CO.country, [discount('0.05')])
    )

    const explained = explainResourceComposition(clone(artifact)).commercialAdjustments
    const rows = rowsOf(artifact.semantic.result)

    expect(explained.marketFactor).toEqual(marketFactor)
    expect(explained.identity).toMatch(/marketAdjustment/)
    expect(explained.rows).toHaveLength(rows.length)

    for (const row of explained.rows as unknown as AnyRow[]) {
      const line = rows.find(item => item.lineId === row.lineId)!

      expect(row).toMatchObject({
        marketAdjustment: line.marketAdjustment,
        marketPriceRatio: line.marketPriceRatio,
        floorNet: line.floorNet,
        net: line.net
      })
      // The walk closes: base market + market adjustment + rounding + uplift - discount = net.
      expect(minor(row.undiscountedPrice) + minor(row.uplift) - minor(row.discount)).toBe(minor(row.net))
    }
  })

  it('the composition preview shows the final net and nothing about how it was reached', () => {
    const preview = projectCompositionPreview(followed)

    expect(preview.net).toBe(followed.quote.totals!.net)
    expect(preview.periods.map(p => p.net)).toEqual(followed.quote.periods.map(p => p.result.totals!.net))
    expect(JSON.stringify(preview)).not.toMatch(/market|floor|ratio|rounding|uplift|discount|margin|cost/i)
    expect(Object.keys(preview)).toEqual(Object.keys(projectCompositionPreview(baseMarket)))
  })

  it('the catalog-lane client projection lists final nets only', () => {
    const quote = calculateCatalogQuote(
      withMarket(designerCatalog, designerBrief.offerMarketCountry, { factor: '0.9', floorBasis: true }),
      designerBrief
    )

    // The allowlist only opens within policy; the status is forced here to read what it would expose.
    const view = projectCatalogQuote({ ...quote, reviewStatus: 'within_policy' }, 'test')

    expect(view.totals).toEqual({
      net: quote.totals!.net,
      tax: quote.totals!.tax,
      grandTotal: quote.totals!.grandTotal
    })
    expect(view.periods.flatMap(p => p.lines.map(l => l.amount))).toEqual(
      quote.periods.flatMap(p => p.result.lines.map(l => l.net))
    )
    expect(view.periods.flatMap(p => p.lines.map(l => Object.keys(l).sort().join()))).toEqual(
      quote.periods.flatMap(p => p.result.lines.map(() => 'amount,kind,label'))
    )
    expect(JSON.stringify(view)).not.toMatch(/market|floor|ratio|rounding|uplift|discount|undiscounted/i)
  })

  it('the kernel-lane client view shows the final net and none of the internal breakdown', () => {
    const artifact = runPricingV3(
      build({
        contract: '1.2.0',
        currency: 'USD',
        factor: '0.85',
        floorBasis: true,
        multiple: '10',
        lines: [{ lineId: 'a', cost: '4321.09', tool: '250', rate: '0.45' }]
      })
    ).artifact!

    const result = artifact.semantic.result as PricingV3ResultV12

    expect(result.reviewStatus).toBe('within_policy')
    // The breakdown exists internally, so its absence from the view is the projection's doing.
    expect(minor(result.totals!.marketAdjustment)).toBeLessThan(0n)

    const view = projectPricingV3ForClient(artifact)
    const output = JSON.stringify(view)

    for (const internal of [
      'marketAdjustment',
      'marketPriceRatio',
      'floorNet',
      'floorBasis',
      'factor',
      'cost',
      'margin',
      'undiscountedPrice'
    ])
      expect(output).not.toContain(internal)

    expect(view.net).toBe(result.totals!.net)
    expect(view.schedule.map(row => row.net)).toEqual(result.lines.map(row => row.net))
  })
})

describe('catalog maintenance carries the floor basis of a market factor', () => {
  const base = validateCatalog(catalogV4)
  const current = marketRecord(base as unknown as CatalogDoc, 'CO') as unknown as Record<string, any>
  const EFFECTIVE = '2026-10-11'

  const revision = (n: number, value: Record<string, unknown>, effectiveFrom = EFFECTIVE) => ({
    ...current,
    revision: n,
    source: { ...current.source, reference: `test-market-decision-r${n}`, effectiveFrom },
    note: 'Market factor decided for Colombia; built by the test.',
    value: { country: 'CO', ...value }
  })

  const change = (changes: unknown[], from: unknown = base, extra: Record<string, unknown> = {}) => ({
    schemaVersion: 'pricing-v3-catalog-change/1',
    changeId: `test-market-floor-${JSON.stringify(changes).length}`,
    baseDigest: catalogDigest(from),
    nextVersion: `${(from as { version: string }).version}-market`,
    actor: 'test',
    reason: 'Declare the market factor of Colombia and where its floor is read.',
    changes,
    ...extra
  })

  const declared = revision(2, { factor: CO.factor, floorBasis: FLOOR_BASIS })
  const replace = { operation: 'replace', recordId: current.recordId, effectiveFrom: EFFECTIVE, record: declared }

  // Catalog-lane brief of the same demand, dated on each side of the change.
  const briefOn = (quoteDate: string) => ({ ...quotedIn(CO.currency, CO.country).brief, quoteDate })

  it('replace: the preview shows the field, the impact flips to 1.2.0 and the earlier dates are untouched', () => {
    const changeSet = change([replace])
    const preview = previewCatalogChange(base, changeSet, [briefOn(EFFECTIVE), briefOn(managed.brief.quoteDate)])
    const [after, before] = preview.impacts

    expect(preview.differences).toEqual([
      { operation: 'replace', recordId: current.recordId, effectiveFrom: EFFECTIVE, before: current, after: declared }
    ])
    expect(preview.differences[0].before).not.toHaveProperty('value.floorBasis')

    expect(after.before.periods.map(p => p.result.engineVersion)).toEqual([PRICING_V3_ENGINES['1.1.0']])
    expect(after.after.periods.map(p => p.result.engineVersion)).toEqual([PRICING_V3_ENGINES['1.2.0']])
    expect(after.after.totals).toHaveProperty('marketAdjustment')
    expect(after.after.periods.flatMap(p => p.result.diagnostics.filter(d => d.code === 'MARGIN_BELOW_FLOOR'))).toEqual(
      []
    )
    expect(new D(after.after.totals!.net).lt(after.before.totals!.net)).toBe(true)

    // A quote dated before the change resolves the old revision: same contract, same result.
    expect(clone(before.after.periods)).toEqual(clone(before.before.periods))
    expect(clone(before.after.totals)).toEqual(clone(before.before.totals))
  })

  it('apply: the successor holds the record verbatim, the audit carries it and search finds it', () => {
    const changeSet = change([replace])
    const preview = previewCatalogChange(base, changeSet, [briefOn(EFFECTIVE)])
    const successor = applyCatalogChange(base, changeSet, preview.previewDigest, [briefOn(EFFECTIVE)])

    expect(successor.version).toBe(changeSet.nextVersion)
    expect(successor.records.find(r => r.recordId === current.recordId && r.revision === 2)).toEqual(declared)
    expect(successor.records.find(r => r.recordId === current.recordId && r.revision === 1)).not.toHaveProperty(
      'value.floorBasis'
    )
    expect(JSON.stringify(successor.audit.at(-1))).toContain(`"floorBasis":"${FLOOR_BASIS}"`)
    expect(
      searchCatalog(successor, FLOOR_BASIS, 'market_factor', EFFECTIVE).map(r => [r.recordId, r.revision])
    ).toEqual([[current.recordId, 2]])
    expect(searchCatalog(base, FLOOR_BASIS, 'market_factor')).toEqual([])
    // The successor is a valid catalog and parses to itself.
    expect(validateCatalog(clone(successor))).toEqual(clone(successor))
    expect(engines(compose(successor, { ...quotedIn(CO.currency, CO.country), brief: briefOn(EFFECTIVE) }))).toEqual([
      PRICING_V3_ENGINES['1.2.0']
    ])
  })

  it('a later revision without the field goes back to the final-net basis and to the earlier contract', () => {
    const { catalog: v2 } = changeCatalog(base, change([replace]))
    const LATER = '2026-11-01'

    const { catalog: v3 } = changeCatalog(
      v2,
      change(
        [
          {
            operation: 'replace',
            recordId: current.recordId,
            effectiveFrom: LATER,
            record: revision(3, { factor: CO.factor }, LATER)
          }
        ],
        v2
      )
    )

    const on = (date: string) => calculateCatalogQuote(v3, briefOn(date)).periods.map(p => p.result.engineVersion)

    expect(on(EFFECTIVE)).toEqual([PRICING_V3_ENGINES['1.2.0']])
    expect(on(LATER)).toEqual([PRICING_V3_ENGINES['1.1.0']])
    expect(on(managed.brief.quoteDate)).toEqual([PRICING_V3_ENGINES['1.1.0']])
  })

  it('add: a new market enters with its factor and floor basis in one change-set', () => {
    const added = {
      ...revision(1, { factor: '0.8', floorBasis: FLOOR_BASIS }),
      recordId: 'market:AR',
      value: { country: 'AR', factor: '0.8', floorBasis: FLOOR_BASIS }
    }

    const { catalog: next, differences } = changeCatalog(
      base,
      change([{ operation: 'add', recordId: added.recordId, effectiveFrom: EFFECTIVE, record: added }], base, {
        dimensions: { countriesAdd: ['AR'] }
      })
    )

    expect(differences).toEqual([
      { operation: 'add', recordId: 'market:AR', effectiveFrom: EFFECTIVE, before: null, after: added }
    ])
    expect(next.records.find(r => r.recordId === 'market:AR')).toEqual(added)
    expect(
      engines(
        compose(next, { ...quotedIn(CO.currency, 'AR'), brief: { ...briefOn(EFFECTIVE), offerMarketCountry: 'AR' } })
      )
    ).toEqual([PRICING_V3_ENGINES['1.2.0']])
  })

  it('retire: after the date the market has no factor and the quote asks for one', () => {
    const { catalog: v2 } = changeCatalog(base, change([replace]))
    const RETIRED = '2026-12-01'

    const { catalog: v3, differences } = changeCatalog(
      v2,
      change([{ operation: 'retire', recordId: current.recordId, effectiveFrom: RETIRED }], v2)
    )

    expect(differences[0].before).toEqual(declared)
    expect(calculateCatalogQuote(v3, briefOn(EFFECTIVE)).periods.map(p => p.result.engineVersion)).toEqual([
      PRICING_V3_ENGINES['1.2.0']
    ])
    expect(resolveBrief(v3, briefOn(RETIRED)).diagnostics).toContainEqual({
      code: 'MISSING_CATALOG_SELECTION',
      path: 'offerMarketCountry',
      candidates: []
    })
  })

  it('the only value the field takes is base_market; anything else never enters a catalog', () => {
    for (const floorBasis of ['final_net', '', true, null]) {
      const invalid = revision(2, { factor: CO.factor, floorBasis })

      expect(() => changeCatalog(base, change([{ ...replace, record: invalid }]))).toThrow()
      expect(() =>
        validateCatalog({ ...catalogV4, records: [...catalogV4.records, { ...invalid, recordId: 'market:XX' }] })
      ).toThrow()
    }

    expect(() => changeCatalog(base, change([replace]))).not.toThrow()
  })
})

// stdout of compose prepare|quote is the summary of the result plus, under `runNotices`, what describes the run.
const summaryOf = (stdout: string) => {
  const body = JSON.parse(stdout)

  delete body.runNotices

  return body
}

describe('CLI end to end with a 1.2.0 quote', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-market-floor-'))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const cli = (...args: string[]) =>
    spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

  const file = (name: string, body: unknown) => {
    const path = join(dir, name)

    writeFileSync(path, JSON.stringify(body))

    return path
  }

  const catalogFile = file('catalog.market-floor.json', floorCatalog)
  const sources = ['--policy', operating('resources.review-v5'), '--credits', creditsPath]
  const demandFile = file('market-floor.demand.json', quotedIn(CO.currency, CO.country, [discount('0.05')]))
  const out = join(dir, 'market-floor.artifact.json')
  const prepare = cli('compose', 'prepare', '--catalog', catalogFile, ...sources, '--input', demandFile)
  const quote = cli('compose', 'quote', '--catalog', catalogFile, ...sources, '--input', demandFile, '--out', out)

  it('compose prepare and quote: exit 3, the same summary, the detail in the artifact', () => {
    const body = summaryOf(quote.stdout)
    const artifact = read(out)

    expect(quote.status).toBe(3)
    expect(quote.stderr).toBe('')
    expect(body).toEqual(clone(summarizeComposition(artifact.semantic.result, artifact)))
    expect(body.engineVersion).toBe(PRICING_V3_ENGINES['1.2.0'])
    expect(body.marketFactor).toMatchObject({ country: CO.country, factor: CO.factor, floorBasis: FLOOR_BASIS })
    expect(body.totals).toHaveProperty('marketAdjustment')
    expect(body.marginFloor.flaggedLinePeriods).toBe(managedLineIds.length)
    expect(body.marginFloor.lines.every((line: Record<string, string>) => line.floorNet && line.netShortOfFloor)).toBe(
      true
    )

    expect(prepare.status).toBe(3)
    expect(prepare.stderr).toBe('')
    expect(JSON.parse(prepare.stdout).totals).toEqual(body.totals)
    expect(JSON.parse(prepare.stdout).marketFactor).toEqual(body.marketFactor)
  })

  it('replay, explain, assess and preview all read the frozen artifact', () => {
    const replay = cli('replay', '--input', out)
    const explain = cli('explain', '--input', out)
    const assess = cli('compose', 'assess', '--input', out)
    const preview = cli('compose', 'preview', '--input', out)

    expect(replay.status).toBe(3)
    expect(JSON.parse(replay.stdout).verified).toBe(true)
    expect(JSON.parse(replay.stdout).summary).toEqual(summaryOf(quote.stdout))
    expect(explain.status).toBe(3)
    expect(JSON.parse(explain.stdout).commercialAdjustments.marketFactor.floorBasis).toBe(FLOOR_BASIS)
    expect(JSON.parse(explain.stdout).commercialAdjustments.rows[0]).toHaveProperty('floorNet')
    expect(assess.status).toBe(3)
    expect(
      JSON.parse(assess.stdout).gaps.filter((g: { code: string }) => g.code === 'MARGIN_BELOW_POLICY_FLOOR')
    ).toHaveLength(managedLineIds.length)
    expect(preview.status).toBe(3)
    expect(JSON.parse(preview.stdout).net).toBe(JSON.parse(quote.stdout).totals.net)
    expect(preview.stdout).not.toMatch(/market|floor|ratio|rounding|uplift|discount|margin/i)
  })

  it('catalog lane: prepare declares 1.2.0, quote carries marketAdjustment, replay verifies and explain walks it', () => {
    const cat = file(
      'catalog.designer.market-floor.json',
      withMarket(designerCatalog, designerBrief.offerMarketCountry, { factor: '0.9', floorBasis: true })
    )

    const brief = file('designer.brief.json', designerBrief)
    const quoteOut = join(dir, 'designer.quote.artifact.json')
    const prepared = cli('prepare', '--catalog', cat, '--input', brief)
    const run = cli('quote', '--catalog', cat, '--input', brief, '--out', quoteOut)
    const replay = cli('replay', '--input', quoteOut)
    const explain = cli('explain', '--input', quoteOut)

    expect(prepared.status).toBe(0)
    expect(
      JSON.parse(prepared.stdout).inputs.map(
        (p: { input: { request: { schemaVersion: string } } }) => p.input.request.schemaVersion
      )
    ).toEqual(Array(designerBrief.periods).fill('1.2.0'))
    expect(run.status).toBe(3)
    expect(run.stderr).toBe('')
    expect(Object.keys(JSON.parse(run.stdout).totals)).toContain('marketAdjustment')
    expect(JSON.parse(replay.stdout).verified).toBe(true)
    expect(JSON.parse(explain.stdout).commercialAdjustments.marketFactor).toMatchObject({
      factor: '0.9',
      floorBasis: FLOOR_BASIS
    })
  })

  it('catalog search, show and validate read the field', () => {
    const search = cli('catalog', 'search', '--catalog', catalogFile, '--kind', 'market_factor', '--query', FLOOR_BASIS)
    const show = cli('catalog', 'show', '--catalog', catalogFile, '--kind', 'market_factor', '--query', 'market:CO')

    const none = cli(
      'catalog',
      'search',
      '--catalog',
      operating('catalog.review-v4'),
      '--kind',
      'market_factor',
      '--query',
      FLOOR_BASIS
    )

    const validate = cli('catalog', 'validate', '--catalog', catalogFile)

    expect(search.status).toBe(0)
    expect(JSON.parse(search.stdout).candidates).toEqual([marketRecord(floorCatalog, 'CO')])
    expect(JSON.parse(show.stdout)).toMatchObject({
      resolution: 'candidate',
      candidates: [marketRecord(floorCatalog, 'CO')]
    })
    expect(none.status).toBe(2)
    expect(JSON.parse(none.stdout).resolution).toBe('not_found')
    expect(JSON.parse(validate.stdout)).toMatchObject({ valid: true, records: catalogV4.records.length })
  })

  it('catalog preview and apply issue a successor with the field; another value is rejected as SCHEMA_INVALID', () => {
    const base = validateCatalog(catalogV4)
    const current = marketRecord(base as unknown as CatalogDoc, 'CO') as unknown as Record<string, any>

    const changeSet = (floorBasis: string) => ({
      schemaVersion: 'pricing-v3-catalog-change/1',
      changeId: 'cli-market-floor-basis',
      baseDigest: catalogDigest(base),
      nextVersion: `${base.version}-market`,
      actor: 'test',
      reason: 'Declare the market factor of Colombia and where its floor is read.',
      changes: [
        {
          operation: 'replace',
          recordId: current.recordId,
          effectiveFrom: '2026-10-11',
          record: {
            ...current,
            revision: 2,
            source: { ...current.source, reference: 'test-market-decision-cli', effectiveFrom: '2026-10-11' },
            value: { country: 'CO', factor: CO.factor, floorBasis }
          }
        }
      ]
    })

    const from = [
      '--catalog',
      operating('catalog.review-v4'),
      '--input',
      file('market.change.json', changeSet(FLOOR_BASIS))
    ]

    const preview = cli('catalog', 'preview', ...from)
    const successor = join(dir, 'catalog.successor.json')

    const apply = cli(
      'catalog',
      'apply',
      ...from,
      '--confirm',
      JSON.parse(preview.stdout).previewDigest,
      '--out',
      successor
    )

    const invalid = cli(
      'catalog',
      'preview',
      '--catalog',
      operating('catalog.review-v4'),
      '--input',
      file('market.invalid.change.json', changeSet('final_net'))
    )

    expect(preview.status).toBe(0)
    expect(preview.stdout).toContain(`"floorBasis": "${FLOOR_BASIS}"`)
    expect(apply.status).toBe(0)
    expect(JSON.parse(apply.stdout)).toMatchObject({ updated: true, version: `${base.version}-market` })
    expect(searchCatalog(read(successor), FLOOR_BASIS, 'market_factor').map(r => r.revision)).toEqual([2])
    expect(invalid.status).toBe(1)
    expect(JSON.parse(invalid.stderr).error.code).toBe('SCHEMA_INVALID')
  })
})
