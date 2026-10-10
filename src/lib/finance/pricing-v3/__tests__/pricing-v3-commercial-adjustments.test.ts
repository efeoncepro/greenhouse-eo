// Contract 1.1.0 through the catalog, resolution, composition and CLI lanes
// (GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1).
//
// Catalogs and demands are built in memory from the committed fixtures; expectations are derived from those files or
// stated as invariants. The kernel arithmetic has its own suite: this one covers what the lanes around it decide.
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
  runCatalogQuote
} from '../adapters/catalog-local'
import {
  explainResourceComposition,
  replayResourceComposition,
  runResourceComposition
} from '../adapters/resource-composition'
import { changeCatalog, searchCatalog, validateCatalog } from '../catalog/catalog'
import { projectCatalogQuote } from '../catalog/client'
import { briefSchema } from '../catalog/contracts'
import { calculateCatalogQuote } from '../catalog/quote'
import { resolveBrief } from '../catalog/resolve'
import { composeResourceQuote } from '../resources/composition'
import { compositionDemandSchema } from '../resources/composition-contracts'
import { projectCompositionPreview } from '../resources/readiness'
import { summarizeComposition } from '../resources/summary'
import { PRICING_V3_ENGINES, PRICING_V3_MAX_ADJUSTMENTS_V11 } from '../schemas'

const D = Decimal.clone({ precision: 80 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const operatingDir = 'data/pricing/v3-operating'
const operating = (name: string) => `${operatingDir}/${name}.json`
const skyDir = 'docs/commercial/prospects/sky-social-care-2027/pricing'
const creditsPath = 'data/pricing/v3-resources/ai-credits.review-v1.json'

const catalog = read(operating('catalog.review-v3'))
const policy = read(operating('resources.review-v5'))
const credits = read(creditsPath)
const managed = read(operating('managed-care.demand'))
const sky = read(`${skyDir}/acordado.demand.json`)
const skyArtifact = read(`${skyDir}/acordado.artifact.json`)

// Catalog-lane fixture with three periods and a one-time setup row in the first.
const designerCatalog = read('data/pricing/v3-catalog/catalog.review-v1.json')
const designerBrief = read('data/pricing/v3-catalog/examples/designer.quote.artifact.json').semantic.brief

type Composition = ReturnType<typeof composeResourceQuote>

const SOURCE = { reference: 'test-price-rounding-policy', effectiveFrom: '2026-01-01', effectiveUntil: '2027-12-31' }

const rule = (currency: string, multiple: string, extra: { offerId?: string; recordId?: string } = {}) => ({
  recordId: extra.recordId ?? `rounding:${currency}${extra.offerId ? `:${extra.offerId}` : ''}`,
  revision: 1,
  kind: 'price_rounding',
  source: { ...SOURCE, status: 'confirmed' },
  note: 'Commercial rounding rule built by the test.',
  value: { currency, multiple, ...(extra.offerId ? { offerId: extra.offerId } : {}) }
})

const withRules = (base: { records: unknown[] }, ...rules: unknown[]) => ({
  ...base,
  records: [...base.records, ...rules]
})

const compose = (cat: unknown, demand: unknown) => composeResourceQuote(cat, policy, credits, demand)
const summary = (r: Composition) => summarizeComposition(r, { calculationId: 'test' })
const engines = (r: Composition) => [...new Set(r.quote.periods.map(p => p.result.engineVersion))]
const kernelLines = (r: Composition) => r.quote.periods.flatMap(p => p.result.lines)

const contracts = (r: Composition) => [
  ...new Set(
    r.quote.resolution.inputs.flatMap(p => [p.input.request.schemaVersion, p.input.snapshot.schemaVersion] as string[])
  )
]

// The floor verdict is the kernel's diagnostic and nothing else.
const floorFlags = (r: Composition) =>
  r.quote.periods.flatMap(p => p.result.diagnostics.filter(d => d.code === 'MARGIN_BELOW_FLOOR').map(d => d.fieldPath))

const inCurrency = (demand: typeof managed, currency: string) => {
  const next = structuredClone(demand)

  next.brief.outputCurrency = currency

  return next
}

const withAdjustments = (demand: typeof managed, adjustments: unknown[]) => {
  const next = structuredClone(demand)

  next.brief.adjustments = adjustments

  return next
}

const agreed = (amount: string, lineIds: string[], extra: Record<string, unknown> = {}) => ({
  adjustmentId: 'agreed',
  kind: 'agreed_net',
  amount,
  billing: 'monthly',
  lineIds,
  reason: 'Agreed with the client.',
  ...extra
})

const managedLineIds: string[] = managed.brief.lines.map((l: { lineId: string }) => l.lineId)
const skyDiscount = sky.brief.adjustments[0]
const AGREED_SKY_NET = '4990000'

const skyAgreed = withAdjustments(sky, [
  agreed(AGREED_SKY_NET, skyDiscount.lineIds, { adjustmentId: skyDiscount.adjustmentId, reason: skyDiscount.reason })
])

describe('contract selection is a function of the frozen inputs', () => {
  it.each(['designer', 'service', 'crm-client-tools'])(
    '%s: the committed demand still resolves to 1.0.0 and to the digest of its committed artifact',
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
      expect(run.calculationId).toBe(artifact.calculationId)
      expect(engines(run.semantic.result)).toEqual([PRICING_V3_ENGINES['1.0.0']])
    }
  )

  it('SKY: the committed rate-based demand reproduces its committed artifact on catalog v3 and policy v5', () => {
    const run = runResourceComposition(catalog, policy, credits, sky, skyArtifact.execution.createdAt)

    expect(run.replayDigest).toBe(skyArtifact.replayDigest)
    expect(contracts(run.semantic.result)).toEqual(['1.0.0'])
  })

  it('a brief with no adjustment or one discount parses to what the frozen artifacts hold', () => {
    expect(compositionDemandSchema.parse(sky)).toEqual(skyArtifact.semantic.demand)
    expect(briefSchema.parse(managed.brief).adjustments).toEqual([])
  })

  it('an untouched demand declares 1.0.0 in request and snapshot and carries no 1.1.0 key anywhere', () => {
    const r = compose(catalog, managed)

    expect(contracts(r)).toEqual(['1.0.0'])
    expect(engines(r)).toEqual([PRICING_V3_ENGINES['1.0.0']])
    expect(r.quote.resolution.inputs.every(p => !('priceRounding' in p.input.snapshot))).toBe(true)
    expect(r.quote.totals).not.toBeNull()
    expect(Object.keys(r.quote.totals!)).not.toContain('roundingAdjustment')
    expect(Object.keys(r.quote.totals!)).not.toContain('uplift')
    expect(Object.keys(r.quote.totals!).sort()).toEqual(Object.keys(skyArtifact.semantic.result.quote.totals).sort())
  })

  it('a rounding rule for the output currency flips request and snapshot to 1.1.0 and travels in the snapshot', () => {
    const clp = rule(managed.brief.outputCurrency, '10000')
    const r = compose(withRules(catalog, clp), managed)

    expect(contracts(r)).toEqual(['1.1.0'])
    expect(engines(r)).toEqual([PRICING_V3_ENGINES['1.1.0']])

    for (const p of r.quote.resolution.inputs)
      expect((p.input.snapshot as { priceRounding?: unknown }).priceRounding).toEqual({
        multiple: clp.value.multiple,
        source: clp.source
      })
  })

  it.each([
    ['a different currency', rule('USD', '10')],
    ['another offer in the same currency', rule('CLP', '10000', { offerId: 'some-other-offer' })],
    [
      'a validity that ended before the quote date',
      { ...rule('CLP', '10000'), source: { ...SOURCE, effectiveUntil: '2026-06-30', status: 'confirmed' } }
    ]
  ])('a rule for %s changes nothing: same 1.0.0 result as without it', (_label, other) => {
    expect(managed.brief.outputCurrency).toBe('CLP')
    expect(managed.brief.quoteDate > '2026-06-30').toBe(true)
    expect(compose(withRules(catalog, other), managed)).toEqual(compose(catalog, managed))
  })

  it('adjustments: one discount stays 1.0.0; an agreed net, or more than one adjustment, declares 1.1.0', () => {
    const discount = (adjustmentId: string, lineIds: string[]) => ({
      adjustmentId,
      kind: 'discount',
      rate: '0.05',
      lineIds,
      reason: 'Test.'
    })

    const [first, ...rest] = managedLineIds

    expect(contracts(compose(catalog, withAdjustments(managed, [discount('one', managedLineIds)])))).toEqual(['1.0.0'])
    expect(contracts(compose(catalog, withAdjustments(managed, [agreed('9000000', managedLineIds)])))).toEqual([
      '1.1.0'
    ])
    expect(
      contracts(compose(catalog, withAdjustments(managed, [discount('one', [first]), discount('two', rest)])))
    ).toEqual(['1.1.0'])
  })

  it('every period of a quote declares the same contract', () => {
    const quote = calculateCatalogQuote(withRules(designerCatalog, rule('USD', '10')), designerBrief)

    expect(quote.periods.length).toBe(designerBrief.periods)
    expect(quote.periods.length).toBeGreaterThan(1)
    expect(new Set(quote.periods.map(p => p.result.engineVersion))).toEqual(new Set([PRICING_V3_ENGINES['1.1.0']]))
    expect(calculateCatalogQuote(designerCatalog, designerBrief).periods.map(p => p.result.engineVersion)).toEqual(
      designerBrief.lines && Array(designerBrief.periods).fill(PRICING_V3_ENGINES['1.0.0'])
    )
  })
})

describe('an agreed net replaces the hand-computed rate', () => {
  const frozen = skyArtifact.semantic.result.quote.totals
  const r = compose(catalog, skyAgreed)
  const totals = r.quote.totals as Record<string, string>

  it('the committed artifact reached the agreed price through a rate', () => {
    expect(skyDiscount.kind).toBe('discount')
    expect(frozen.net).toBe(AGREED_SKY_NET)
  })

  it('the net is exactly the agreed amount, with the cost and margin of the rate-based artifact', () => {
    expect(r.quote.calculationStatus).toBe('calculated')
    expect(totals.net).toBe(AGREED_SKY_NET)
    expect(totals.cost).toBe(frozen.cost)
    expect(totals.marginAmount).toBe(frozen.marginAmount)
    expect(totals.marginRate).toBe(frozen.marginRate)
    expect(totals.undiscountedPrice).toBe(frozen.undiscountedPrice)
  })

  it('the gap is a discount, there is no uplift and no rounding, and the identity holds per row and in totals', () => {
    expect(totals.discount).toBe(new D(frozen.undiscountedPrice).minus(AGREED_SKY_NET).toFixed(0))
    expect(new D(totals.uplift).isZero()).toBe(true)
    expect(new D(totals.roundingAdjustment).isZero()).toBe(true)

    for (const row of [totals, ...(kernelLines(r) as unknown as Record<string, string>[])])
      expect(new D(row.undiscountedPrice).plus(row.uplift).minus(row.discount).toFixed(0)).toBe(row.net)
  })

  it('an agreed net above the calculated price is an uplift, never a negative discount', () => {
    const above = new D(frozen.undiscountedPrice).plus(123456).toFixed(0)

    const up = compose(catalog, withAdjustments(sky, [agreed(above, skyDiscount.lineIds)])).quote.totals as Record<
      string,
      string
    >

    expect(up.net).toBe(above)
    expect(up.uplift).toBe('123456')
    expect(new D(up.discount).isZero()).toBe(true)
    expect(up.cost).toBe(frozen.cost)
  })
})

describe('commercial rounding removes the false floor alarm', () => {
  const MULTIPLE = '10000'
  const plain = compose(catalog, managed)
  const rounded = compose(withRules(catalog, rule('CLP', MULTIPLE)), managed)

  it('without a rule the kernel flags lines of this demand under their floor', () => {
    expect(plain.quote.calculationStatus).toBe('calculated')
    expect(floorFlags(plain).length).toBeGreaterThan(0)
  })

  it('with the rule every billable net is a multiple of it and no line is flagged', () => {
    expect(rounded.quote.calculationStatus).toBe('calculated')
    expect(kernelLines(rounded).length).toBe(kernelLines(plain).length)
    for (const line of kernelLines(rounded)) expect(new D(line.net).mod(MULTIPLE).isZero()).toBe(true)
    expect(floorFlags(rounded)).toEqual([])
    expect(summary(rounded).marginFloor.flaggedLinePeriods).toBe(0)
    expect(summary(plain).marginFloor.flaggedLinePeriods).toBe(floorFlags(plain).length)
  })

  it('rounding only raises prices, leaves cost alone and is itemised in totals', () => {
    const before = plain.quote.totals as Record<string, string>
    const after = rounded.quote.totals as Record<string, string>
    const unrounded = new Map(kernelLines(plain).map(l => [l.lineId, l.net]))

    for (const line of kernelLines(rounded)) expect(new D(line.net).gte(unrounded.get(line.lineId)!)).toBe(true)
    expect(after.cost).toBe(before.cost)
    expect(after.roundingAdjustment).toBe(new D(after.undiscountedPrice).minus(before.undiscountedPrice).toFixed(0))
    expect(after.roundingAdjustment).toBe(
      kernelLines(rounded)
        .reduce((sum, l) => sum.plus((l as unknown as { roundingAdjustment: string }).roundingAdjustment), new D(0))
        .toFixed(0)
    )
    expect(new D(after.roundingAdjustment).gt(0)).toBe(true)
  })
})

describe('each quoting currency has its own rule', () => {
  const multiples: Record<string, string> = { CLP: '10000', USD: '10', COP: '50000', MXN: '100', PEN: '50' }
  const general = Object.entries(multiples).map(([currency, multiple]) => rule(currency, multiple))
  const offerId: string = managed.brief.offerId

  it('the fixture catalog registers the five currencies with a route from the calculation currency', () => {
    for (const code of Object.keys(multiples))
      expect(catalog.currencies.some((c: { code: string }) => c.code === code)).toBe(true)
  })

  it.each(Object.keys(multiples))('%s is rounded to its own multiple and to no other currency rule', currency => {
    const r = compose(withRules(catalog, ...general), inCurrency(managed, currency))
    const s = summary(r)

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(r.quote.totals!.currency).toBe(currency)
    expect(s.priceRounding).toMatchObject({ currency, multiple: multiples[currency], scope: 'general', offerId: null })
    for (const line of kernelLines(r)) expect(new D(line.net).mod(multiples[currency]).isZero()).toBe(true)
    expect(new D((r.quote.totals as Record<string, string>).roundingAdjustment).gt(0)).toBe(true)
  })

  it('a currency without a rule is not rounded and stays 1.0.0 while the others have theirs', () => {
    const demand = inCurrency(managed, 'PEN')
    const r = compose(withRules(catalog, ...general.filter(g => g.value.currency !== 'PEN')), demand)

    expect(contracts(r)).toEqual(['1.0.0'])
    expect(summary(r).priceRounding).toBeNull()
    expect(r).toEqual(compose(catalog, demand))
  })

  it('the rule of the offer prevails over the general rule of its currency', () => {
    const own = rule('CLP', '250000', { offerId })
    const r = compose(withRules(catalog, ...general, own), managed)

    expect(summary(r).priceRounding).toMatchObject({ multiple: '250000', scope: 'offer', offerId })
    for (const line of kernelLines(r)) expect(new D(line.net).mod('250000').isZero()).toBe(true)
    expect(r.quote.resolution.bindings.filter(b => b.purpose === 'price_rounding').map(b => b.record.recordId)).toEqual(
      [own.recordId]
    )
  })

  it('two general rules for one currency pass catalog validation and block resolution as AMBIGUOUS_PRICE_ROUNDING', () => {
    const twice = withRules(catalog, rule('CLP', '10000'), rule('CLP', '1000', { recordId: 'rounding:CLP:second' }))

    // Catalog validation rejects overlap per recordId for every kind; ambiguity between records is a resolution blocker.
    expect(() => validateCatalog(twice)).not.toThrow()

    const r = compose(twice, managed)
    const blocker = r.quote.diagnostics.find(d => d.code === 'AMBIGUOUS_PRICE_ROUNDING')

    expect(blocker?.candidates?.sort()).toEqual(['rounding:CLP', 'rounding:CLP:second'])
    expect(r.quote.calculationStatus).toBe('needs_input')
    expect(r.quote.totals).toBeNull()
    expect(r.quote.periods).toEqual([])
    expect(summary(r).diagnostics.map(d => d.code)).toContain('AMBIGUOUS_PRICE_ROUNDING')
  })

  it('ambiguity is judged at the prevailing level only', () => {
    const generalTwice = [rule('CLP', '10000'), rule('CLP', '1000', { recordId: 'rounding:CLP:second' })]
    const own = rule('CLP', '250000', { offerId })

    expect(summary(compose(withRules(catalog, ...generalTwice, own), managed)).priceRounding?.recordId).toBe(
      own.recordId
    )
    expect(
      compose(
        withRules(catalog, own, rule('CLP', '500000', { offerId, recordId: 'rounding:CLP:own:second' })),
        managed
      ).quote.diagnostics.map(d => d.code)
    ).toContain('AMBIGUOUS_PRICE_ROUNDING')
  })

  it('a pending rule is bound and blocks like any pending catalog value', () => {
    const pending = { ...rule('CLP', '10000'), source: { ...SOURCE, status: 'pending' } }
    const r = compose(withRules(catalog, pending), managed)

    expect(r.quote.diagnostics).toContainEqual({ code: 'PENDING_CATALOG_VALUE', path: 'priceRounding' })
    expect(r.quote.totals).toBeNull()
  })
})

describe('catalog maintenance treats price_rounding like every other record kind', () => {
  const base = validateCatalog(catalog)
  const clp = rule('CLP', '10000')

  const change = (changes: unknown[], extra: Record<string, unknown> = {}) => ({
    schemaVersion: 'pricing-v3-catalog-change/1',
    changeId: `test-rounding-${changes.length}-${JSON.stringify(changes).length}`,
    baseDigest: catalogDigest(base),
    nextVersion: `${base.version}-rounding`,
    actor: 'test',
    reason: 'Register commercial rounding per currency.',
    changes,
    ...extra
  })

  const add = (record: ReturnType<typeof rule>) => ({
    operation: 'add',
    recordId: record.recordId,
    effectiveFrom: record.source.effectiveFrom,
    record
  })

  it('a change-set that adds a rule previews its impact and applies to a successor', () => {
    const addClp = change([add(clp)])
    const preview = previewCatalogChange(base, addClp, [managed.brief])
    const [impact] = preview.impacts

    expect(preview.differences).toEqual([
      { operation: 'add', recordId: clp.recordId, effectiveFrom: SOURCE.effectiveFrom, before: null, after: clp }
    ])
    expect(impact.before.calculationStatus).toBe('calculated')
    expect(impact.before.periods.map(p => p.result.engineVersion)).toEqual([PRICING_V3_ENGINES['1.0.0']])
    expect(impact.after.periods.map(p => p.result.engineVersion)).toEqual([PRICING_V3_ENGINES['1.1.0']])
    expect(new D(impact.after.totals!.net).gt(impact.before.totals!.net)).toBe(true)

    // The confirmation covers the impact too, so apply is given the same briefs it was previewed with.
    const successor = applyCatalogChange(base, addClp, preview.previewDigest, [managed.brief])

    expect(successor.version).toBe(addClp.nextVersion)
    expect(successor.records.length).toBe(base.records.length + 1)
    expect(successor.audit.at(-1)?.changeId).toBe(addClp.changeId)
    expect(searchCatalog(successor, '', 'price_rounding').map(r => r.recordId)).toEqual([clp.recordId])
    expect(searchCatalog(successor, 'CLP', 'price_rounding', managed.brief.quoteDate)).toHaveLength(1)
    expect(searchCatalog(base, '', 'price_rounding')).toEqual([])
    expect(summary(compose(successor, managed)).priceRounding).toMatchObject({ recordId: clp.recordId, revision: 1 })
  })

  it('replace keeps the identity (currency and offer), needs a new source reference and closes the old interval', () => {
    const { catalog: v1 } = changeCatalog(base, change([add(clp)]))

    const next = {
      ...clp,
      revision: 2,
      value: { currency: 'CLP', multiple: '50000' },
      source: {
        ...SOURCE,
        reference: 'test-price-rounding-policy-2027',
        effectiveFrom: '2027-01-01',
        status: 'confirmed'
      }
    }

    const replace = (record: unknown) => ({
      ...change([{ operation: 'replace', recordId: clp.recordId, effectiveFrom: '2027-01-01', record }]),
      baseDigest: catalogDigest(v1),
      nextVersion: `${v1.version}-2`
    })

    const { catalog: v2 } = changeCatalog(v1, replace(next))
    const revisions = searchCatalog(v2, '', 'price_rounding').map(r => [r.revision, r.source.effectiveUntil])

    expect(revisions).toEqual([
      [1, '2026-12-31'],
      [2, SOURCE.effectiveUntil]
    ])
    expect(summary(compose(v2, managed)).priceRounding).toMatchObject({ multiple: clp.value.multiple, revision: 1 })
    expect(() => changeCatalog(v1, replace({ ...next, value: { currency: 'USD', multiple: '10' } }))).toThrow(
      'CATALOG_IDENTITY_CONFLICT'
    )
    expect(() =>
      changeCatalog(v1, replace({ ...next, value: { currency: 'CLP', multiple: '50000', offerId: 'an-offer' } }))
    ).toThrow('CATALOG_IDENTITY_CONFLICT')
    expect(() =>
      changeCatalog(v1, replace({ ...next, source: { ...next.source, reference: SOURCE.reference } }))
    ).toThrow('UPDATED_SOURCE_REFERENCE_REQUIRED')
  })

  it('retire ends the rule: a quote dated after it is not rounded', () => {
    const early = {
      ...clp,
      source: { ...SOURCE, effectiveFrom: '2026-01-01', effectiveUntil: '9999-12-31', status: 'confirmed' }
    }

    const { catalog: v1 } = changeCatalog(base, change([add(early)]))
    const retireOn = managed.brief.quoteDate

    const { catalog: v2 } = changeCatalog(v1, {
      ...change([{ operation: 'retire', recordId: clp.recordId, effectiveFrom: retireOn }]),
      baseDigest: catalogDigest(v1),
      nextVersion: `${v1.version}-retired`
    })

    expect(summary(compose(v1, managed)).priceRounding).not.toBeNull()
    expect(summary(compose(v2, managed)).priceRounding).toBeNull()
    expect(contracts(compose(v2, managed))).toEqual(['1.0.0'])
  })

  it.each([
    ['half a peso in a currency without decimals', rule('CLP', '0.5'), 'INVALID_PRICE_ROUNDING_MULTIPLE'],
    ['a multiple finer than the cent', rule('USD', '10.005'), 'INVALID_PRICE_ROUNDING_MULTIPLE'],
    ['a currency the catalog does not register', rule('BRL', '10'), 'PRICE_ROUNDING_CURRENCY_NOT_REGISTERED']
  ])('rejects %s, in a change-set and in a catalog file alike', (_label, record, code) => {
    expect(catalog.currencies.some((c: { code: string }) => c.code === 'BRL')).toBe(false)
    expect(() => changeCatalog(base, change([add(record)]))).toThrow(code)
    expect(() => validateCatalog(withRules(catalog, record))).toThrow(code)
  })

  it('accepts decimals the currency has and a currency registered by the same change-set', () => {
    const brl = change([add(rule('BRL', '0.50'))], { dimensions: { currenciesAdd: [{ code: 'BRL', precision: 2 }] } })

    expect(() => changeCatalog(base, change([add(rule('USD', '0.05'))]))).not.toThrow()
    expect(() => changeCatalog(base, brl)).not.toThrow()
  })

  it('rejects a zero multiple at the schema and an overlapping revision of the same record at validation', () => {
    expect(() => validateCatalog(withRules(catalog, rule('CLP', '0')))).toThrow()
    expect(() => validateCatalog(withRules(catalog, clp, { ...clp, revision: 2 }))).toThrow(
      'OVERLAPPING_CATALOG_RECORD'
    )
  })
})

describe('kernel errors reach the caller as named blockers', () => {
  const [first, second] = managedLineIds

  const cases: [string, unknown[], string][] = [
    [
      'two adjustments on the same rows',
      [agreed('9000000', [first, second]), agreed('1000000', [first], { adjustmentId: 'again' })],
      'OVERLAPPING_ADJUSTMENTS'
    ],
    [
      'a discount and an agreed net on the same line',
      [
        { adjustmentId: 'rate', kind: 'discount', rate: '0.05', lineIds: [first], reason: 'Test.' },
        agreed('3000000', [first])
      ],
      'OVERLAPPING_ADJUSTMENTS'
    ],
    [
      'an agreed net with more decimals than the currency',
      [agreed('9000000.5', managedLineIds)],
      'INVALID_AGREED_AMOUNT'
    ],
    ['a repeated adjustmentId', [agreed('3000000', [first]), agreed('3000000', [second])], 'DUPLICATE_ID']
  ]

  it.each(cases)('%s: no totals, and the summary names %s', (_label, adjustments, code) => {
    const r = compose(catalog, withAdjustments(managed, adjustments))
    const s = summary(r)

    expect(managed.brief.outputCurrency).toBe('CLP')
    expect(r.quote.calculationStatus).not.toBe('calculated')
    expect(s.totals).toBeNull()
    expect(s.periods.map(p => p.calculationStatus)).toEqual(['invalid'])
    expect(s.diagnostics.map(d => d.code)).toContain(code)
    expect(s.diagnostics.find(d => d.code === code)?.path).toMatch(/^periods\.1\.request\.adjustments/)
    expect(s.reviewSignals.find(x => x.code === code)?.severity).toBe('error')
  })

  it('the catalog lane reports the same codes on the period that failed', () => {
    const quote = calculateCatalogQuote(catalog, {
      ...managed.brief,
      adjustments: [agreed('9000000', [first]), agreed('1000000', [first], { adjustmentId: 'again' })]
    })

    expect(quote.calculationStatus).toBe('needs_input')
    expect(quote.totals).toBeNull()
    expect(quote.periods.map(p => p.result.calculationStatus)).toEqual(['invalid'])
    expect(quote.periods[0].result.diagnostics.map(d => d.code)).toContain('OVERLAPPING_ADJUSTMENTS')
  })

  it('an adjustment on a line the brief does not have is still INVALID_ADJUSTMENT_LINE, whatever its kind', () => {
    const r = compose(catalog, withAdjustments(managed, [agreed('9000000', [first, 'no-such-line'])]))

    expect(r.quote.diagnostics).toContainEqual({ code: 'INVALID_ADJUSTMENT_LINE', path: 'adjustments' })
    expect(r.quote.totals).toBeNull()
  })

  it(`a brief takes up to ${PRICING_V3_MAX_ADJUSTMENTS_V11} adjustments and no more`, () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) => agreed('1', [first], { adjustmentId: `agreed-${i}` }))

    expect(briefSchema.safeParse({ ...managed.brief, adjustments: many(PRICING_V3_MAX_ADJUSTMENTS_V11) }).success).toBe(
      true
    )
    expect(
      resolveBrief(catalog, { ...managed.brief, adjustments: many(PRICING_V3_MAX_ADJUSTMENTS_V11 + 1) }).diagnostics
    ).toEqual([{ code: 'INVALID_BRIEF', path: 'adjustments' }])
  })
})

describe('agreed nets across periods and billing classes (catalog lane)', () => {
  const base = calculateCatalogQuote(designerCatalog, designerBrief)
  const [lineId] = designerBrief.lines.map((l: { lineId: string }) => l.lineId)

  const rowsOf = (quote: typeof base, kind: string) =>
    quote.periods.map(p => p.result.lines.filter(l => l.kind === kind))

  it('the fixture has a setup row in its first period only', () => {
    expect(base.calculationStatus).toBe('calculated')
    expect(rowsOf(base, 'setup').map(rows => rows.length)).toEqual([1, ...Array(designerBrief.periods - 1).fill(0)])
  })

  it('an agreed setup net lands on the period that bills setup and leaves the others untouched', () => {
    const [setupRow] = rowsOf(base, 'setup')[0]
    const amount = new D(setupRow.net).minus(30).toFixed(2)

    const quote = calculateCatalogQuote(designerCatalog, {
      ...designerBrief,
      adjustments: [agreed(amount, [lineId], { billing: 'setup' })]
    })

    expect(quote.calculationStatus).toBe('calculated')
    expect(quote.resolution.inputs.map(p => p.input.request.adjustments.length)).toEqual([
      1,
      ...Array(designerBrief.periods - 1).fill(0)
    ])
    expect(new Set(quote.periods.map(p => p.result.engineVersion))).toEqual(new Set([PRICING_V3_ENGINES['1.1.0']]))
    expect(rowsOf(quote, 'setup')[0][0].net).toBe(amount)
    expect(
      rowsOf(quote, 'monthly')
        .flat()
        .map(l => l.net)
    ).toEqual(
      rowsOf(base, 'monthly')
        .flat()
        .map(l => l.net)
    )
    expect(quote.totals!.net).toBe(new D(base.totals!.net).minus(30).toFixed(2))
    expect((quote.totals as Record<string, string>).discount).toBe('30.00')
  })

  it('an agreed monthly net is per period: every period bills exactly that amount for those lines', () => {
    const monthly = rowsOf(base, 'monthly').flat()
    const amount = new D(monthly[0].net).plus(98.6).toFixed(2)

    const quote = calculateCatalogQuote(designerCatalog, { ...designerBrief, adjustments: [agreed(amount, [lineId])] })
    const totals = quote.totals as Record<string, string>

    expect(
      rowsOf(quote, 'monthly')
        .flat()
        .map(l => l.net)
    ).toEqual(Array(designerBrief.periods).fill(amount))
    expect(rowsOf(quote, 'setup')[0][0].net).toBe(rowsOf(base, 'setup')[0][0].net)
    expect(totals.uplift).toBe(new D(98.6).mul(designerBrief.periods).toFixed(2))
    expect(totals.net).toBe(new D(base.totals!.net).plus(totals.uplift).toFixed(2))
    expect(totals.cost).toBe(base.totals!.cost)
  })

  it('an agreed setup net with no setup row in any period blocks resolution instead of vanishing', () => {
    const r = compose(catalog, withAdjustments(managed, [agreed('100000', managedLineIds, { billing: 'setup' })]))

    expect(kernelLines(compose(catalog, managed)).some(l => l.kind === 'setup')).toBe(false)
    expect(r.quote.diagnostics).toContainEqual({ code: 'AGREED_NET_WITHOUT_BASE', path: 'adjustments.agreed' })
    expect(r.quote.totals).toBeNull()
  })

  it('catalog-lane totals carry the 1.1.0 amounts and the rounded rows; explain shows the price walk', () => {
    const artifact = runCatalogQuote(withRules(designerCatalog, rule('USD', '10')), {
      ...designerBrief,
      adjustments: [agreed('1500', [lineId])]
    })

    const totals = artifact.semantic.result.totals as Record<string, string>
    const explained = explainCatalogQuote(JSON.parse(JSON.stringify(artifact)))

    expect(Object.keys(totals)).toEqual(expect.arrayContaining(['roundingAdjustment', 'uplift']))
    expect(new D(totals.undiscountedPrice).plus(totals.uplift).minus(totals.discount).toFixed(2)).toBe(totals.net)
    expect(explained.commercialAdjustments.priceRounding).toMatchObject({ currency: 'USD', multiple: '10' })
    expect(explained.commercialAdjustments.commercialAdjustments).toEqual(
      artifact.semantic.result.resolution.brief!.adjustments
    )
    expect(explained.commercialAdjustments.rows.length).toBe(
      artifact.semantic.result.periods.flatMap(p => p.result.lines).length
    )

    for (const row of explained.commercialAdjustments.rows as unknown as Record<string, string>[]) {
      expect(new D(row.undiscountedPrice).mod(10).isZero()).toBe(true)
      expect(new D(row.undiscountedPrice).plus(row.uplift).minus(row.discount).toFixed(2)).toBe(row.net)
    }
  })

  it('the client projection lists final nets only', () => {
    const quote = calculateCatalogQuote(withRules(designerCatalog, rule('USD', '10')), {
      ...designerBrief,
      adjustments: [agreed('1500', [lineId])]
    })

    // The allowlist only opens within policy; the status is forced here to read what it would expose.
    const view = projectCatalogQuote({ ...quote, reviewStatus: 'within_policy' }, 'test')
    const text = JSON.stringify(view)

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
    expect(text).not.toMatch(/rounding|uplift|discount|undiscounted/i)
  })
})

describe('freeze, replay, summary and preview of a composition using both capabilities', () => {
  const clp = rule('CLP', '10000')
  const artifact = runResourceComposition(withRules(catalog, clp), policy, credits, skyAgreed)
  const frozen = JSON.parse(JSON.stringify(artifact))
  const totals = artifact.semantic.result.quote.totals as Record<string, string>

  it('replays verified from its own frozen catalog, policy and demand', () => {
    const replay = replayResourceComposition(frozen)

    expect(replay.replayDigest).toBe(artifact.replayDigest)
    expect(replay.calculationId).toBe(artifact.calculationId)
    expect(engines(replay.semantic.result)).toEqual([PRICING_V3_ENGINES['1.1.0']])
  })

  it('a frozen rule or agreed amount cannot be edited without breaking the replay', () => {
    const edited = structuredClone(frozen)

    edited.semantic.catalog.records.find((r: { kind: string }) => r.kind === 'price_rounding').value.multiple = '1000'
    expect(() => replayResourceComposition(edited)).toThrow('REPLAY_MISMATCH')

    const repriced = structuredClone(frozen)

    repriced.semantic.demand.brief.adjustments[0].amount = '4000000'
    expect(() => replayResourceComposition(repriced)).toThrow('REPLAY_MISMATCH')
  })

  it('the agreed net wins over rounding: rounding raises the price, the agreed amount fixes the net', () => {
    expect(totals.net).toBe(AGREED_SKY_NET)
    expect(new D(totals.roundingAdjustment).gt(0)).toBe(true)
    expect(new D(totals.undiscountedPrice).plus(totals.uplift).minus(totals.discount).toFixed(0)).toBe(totals.net)
    expect(totals.cost).toBe(skyArtifact.semantic.result.quote.totals.cost)
  })

  it('the summary shows the adjustments applied, the rule in force and the 1.1.0 totals', () => {
    const s = summarizeComposition(artifact.semantic.result, artifact)

    expect(s.engineVersion).toBe(PRICING_V3_ENGINES['1.1.0'])
    expect(s.commercialAdjustments).toEqual(skyAgreed.brief.adjustments)
    expect(s.priceRounding).toEqual({
      currency: 'CLP',
      multiple: clp.value.multiple,
      scope: 'general',
      offerId: null,
      recordId: clp.recordId,
      revision: clp.revision,
      sourceStatus: 'confirmed'
    })
    expect(s.totals).toMatchObject({ roundingAdjustment: totals.roundingAdjustment, uplift: totals.uplift })
  })

  it('the summary of a quote frozen before 1.1.0 only gains keys', () => {
    const committed = read(`${skyDir}/acordado.summary.json`)

    const { engineVersion, commercialAdjustments, priceRounding, ...before } = JSON.parse(
      JSON.stringify(summarizeComposition(replayResourceComposition(skyArtifact).semantic.result, skyArtifact))
    )

    expect(before).toEqual(committed)
    expect(engineVersion).toBe(PRICING_V3_ENGINES['1.0.0'])
    expect(commercialAdjustments).toEqual(sky.brief.adjustments)
    expect(priceRounding).toBeNull()
  })

  it('the preview shows the final net and nothing about how it was reached', () => {
    const preview = projectCompositionPreview(artifact.semantic.result)
    const text = JSON.stringify(preview)

    expect(preview.net).toBe(totals.net)
    expect(text).not.toMatch(/rounding|uplift|discount|undiscounted|multiple/i)
    expect(artifact.semantic.result.commercialUnit).toBe('managed_service')

    for (const period of preview.periods)
      expect(period.items.reduce((sum, item) => sum.plus(item.net), new D(0)).toFixed(0)).toBe(period.net)
    expect(preview.periods.reduce((sum, p) => sum.plus(p.net), new D(0)).toFixed(0)).toBe(preview.net)
  })

  it('the managed-service preview still adds up when a period bills setup: fee = period net - setup', () => {
    const demand = read(operating('service.demand'))
    const sourceArtifact = read(operating('service.artifact'))
    const base = sourceArtifact.semantic.catalog
    const [first] = demand.brief.lines.map((l: { lineId: string }) => l.lineId)

    const r = composeResourceQuote(
      withRules(base, rule(demand.brief.outputCurrency, '25')),
      sourceArtifact.semantic.policy,
      credits,
      withAdjustments(demand, [agreed('75', [first], { billing: 'setup' })])
    )

    const preview = projectCompositionPreview(r)

    const setup = kernelLines(r)
      .filter(l => l.kind === 'setup')
      .reduce((sum, l) => sum.plus(l.net), new D(0))

    expect(r.commercialUnit).toBe('managed_service')
    expect(setup.gt(0)).toBe(true)
    expect(preview.periods[0].items.map(i => i.net)).toEqual([
      new D(r.quote.totals!.net).minus(setup).toFixed(2),
      setup.toFixed(2)
    ])
    expect(JSON.stringify(preview)).not.toMatch(/rounding|uplift|discount/i)
  })

  it('explain keeps the internal walk: rounding and uplift per row', () => {
    const explained = explainResourceComposition(frozen)
    const rows = explained.commercialAdjustments.rows as unknown as Record<string, string>[]

    expect(rows.length).toBe(kernelLines(artifact.semantic.result).length)
    expect(rows.every(row => 'roundingAdjustment' in row && 'uplift' in row)).toBe(true)
    expect(rows.reduce((sum, row) => sum.plus(row.roundingAdjustment), new D(0)).toFixed(0)).toBe(
      totals.roundingAdjustment
    )
    expect(explained.commercialAdjustments.priceRounding?.recordId).toBe(clp.recordId)
  })
})

describe('CLI end to end', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-commercial-adjustments-'))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const cli = (...args: string[]) =>
    spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

  const file = (name: string, body: unknown) => {
    const path = join(dir, name)

    writeFileSync(path, JSON.stringify(body))

    return path
  }

  const clp = rule('CLP', '10000')
  const roundingCatalog = file('catalog.rounding.json', withRules(catalog, clp))
  const sources = ['--policy', operating('resources.review-v5'), '--credits', creditsPath]
  const out = join(dir, 'agreed.artifact.json')

  const quote = cli(
    'compose',
    'quote',
    '--catalog',
    roundingCatalog,
    ...sources,
    '--input',
    file('agreed.demand.json', skyAgreed),
    '--out',
    out
  )

  it('compose quote: exit 3, the summary on stdout, the detail in the artifact', () => {
    const body = JSON.parse(quote.stdout)
    const artifact = read(out)

    expect(quote.status).toBe(3)
    expect(quote.stderr).toBe('')
    expect(body).toEqual(JSON.parse(JSON.stringify(summarizeComposition(artifact.semantic.result, artifact))))
    expect(body.totals.net).toBe(AGREED_SKY_NET)
    expect(body.engineVersion).toBe(PRICING_V3_ENGINES['1.1.0'])
    expect(body.commercialAdjustments).toEqual(skyAgreed.brief.adjustments)
    expect(body.priceRounding).toMatchObject({ currency: 'CLP', multiple: clp.value.multiple, scope: 'general' })
  })

  it('replay, explain, assess and preview all read the frozen artifact', () => {
    const replay = cli('replay', '--input', out)
    const explain = cli('explain', '--input', out)
    const assess = cli('compose', 'assess', '--input', out)
    const preview = cli('compose', 'preview', '--input', out)

    expect(replay.status).toBe(3)
    expect(JSON.parse(replay.stdout).verified).toBe(true)
    expect(JSON.parse(replay.stdout).summary).toEqual(JSON.parse(quote.stdout))
    expect(explain.status).toBe(3)
    expect(JSON.parse(explain.stdout).commercialAdjustments.priceRounding.recordId).toBe(clp.recordId)
    expect(assess.status).toBe(3)
    expect(JSON.parse(assess.stdout).calculationStatus).toBe('calculated')
    expect(preview.status).toBe(3)
    expect(JSON.parse(preview.stdout).net).toBe(AGREED_SKY_NET)
    expect(preview.stdout).not.toMatch(/rounding|uplift|discount/i)
  })

  it('a kernel error is a result state: exit 2, named on stdout, nothing on stderr', () => {
    const [first] = skyDiscount.lineIds

    const overlapping = withAdjustments(sky, [
      agreed(AGREED_SKY_NET, skyDiscount.lineIds),
      agreed('1000000', [first], { adjustmentId: 'again' })
    ])

    for (const subcommand of ['prepare', 'quote']) {
      const run = cli(
        'compose',
        subcommand,
        '--catalog',
        roundingCatalog,
        ...sources,
        '--input',
        file(`overlapping.${subcommand}.demand.json`, overlapping)
      )

      const body = JSON.parse(run.stdout)

      expect(run.status).toBe(2)
      expect(run.stderr).toBe('')
      expect(body.totals).toBeNull()
      expect(body.diagnostics.map((d: { code: string }) => d.code)).toContain('OVERLAPPING_ADJUSTMENTS')
    }
  })

  it('catalog lane: prepare declares the contract and quote carries the 1.1.0 totals and the failing code', () => {
    const designerRounding = file('catalog.designer.rounding.json', withRules(designerCatalog, rule('USD', '10')))
    const [lineId] = designerBrief.lines.map((l: { lineId: string }) => l.lineId)
    const brief = file('designer.agreed.brief.json', { ...designerBrief, adjustments: [agreed('1500', [lineId])] })
    const prepare = cli('prepare', '--catalog', designerRounding, '--input', brief)
    const quoteOut = join(dir, 'designer.quote.artifact.json')
    const run = cli('quote', '--catalog', designerRounding, '--input', brief, '--out', quoteOut)
    const replay = cli('replay', '--input', quoteOut)

    const broken = cli(
      'quote',
      '--catalog',
      designerRounding,
      '--input',
      file('designer.broken.brief.json', { ...designerBrief, adjustments: [agreed('1500.555', [lineId])] })
    )

    expect(prepare.status).toBe(0)
    expect(
      JSON.parse(prepare.stdout).inputs.map(
        (p: { input: { request: { schemaVersion: string } } }) => p.input.request.schemaVersion
      )
    ).toEqual(Array(designerBrief.periods).fill('1.1.0'))
    expect(run.status).toBe(3)
    expect(Object.keys(JSON.parse(run.stdout).totals)).toEqual(expect.arrayContaining(['roundingAdjustment', 'uplift']))
    expect(JSON.parse(replay.stdout).verified).toBe(true)
    expect(broken.status).toBe(2)
    expect(broken.stderr).toBe('')
    expect(
      JSON.parse(broken.stdout).periods.flatMap((p: { diagnostics: { code: string }[] }) =>
        p.diagnostics.map(d => d.code)
      )
    ).toContain('INVALID_AGREED_AMOUNT')
  })

  it('catalog search, show and validate know the record kind', () => {
    const search = cli('catalog', 'search', '--catalog', roundingCatalog, '--kind', 'price_rounding')

    const show = cli(
      'catalog',
      'show',
      '--catalog',
      roundingCatalog,
      '--kind',
      'price_rounding',
      '--query',
      clp.recordId
    )

    const none = cli('catalog', 'search', '--catalog', operating('catalog.review-v3'), '--kind', 'price_rounding')
    const validate = cli('catalog', 'validate', '--catalog', roundingCatalog)

    expect(search.status).toBe(0)
    expect(JSON.parse(search.stdout).candidates).toEqual([clp])
    expect(JSON.parse(show.stdout)).toMatchObject({ resolution: 'candidate', candidates: [clp] })
    expect(none.status).toBe(2)
    expect(JSON.parse(none.stdout).resolution).toBe('not_found')
    expect(JSON.parse(validate.stdout)).toMatchObject({ valid: true, records: catalog.records.length + 1 })
  })

  it('catalog preview and apply issue a successor with the rule; an invalid rule is rejected by code', () => {
    const base = validateCatalog(catalog)

    const changeSet = (record: ReturnType<typeof rule>) => ({
      schemaVersion: 'pricing-v3-catalog-change/1',
      changeId: 'cli-add-price-rounding',
      baseDigest: catalogDigest(base),
      nextVersion: `${base.version}-rounding`,
      actor: 'test',
      reason: 'Register commercial rounding for CLP.',
      changes: [{ operation: 'add', recordId: record.recordId, effectiveFrom: record.source.effectiveFrom, record }]
    })

    const change = file('add-rounding.change.json', changeSet(clp))
    const from = ['--catalog', operating('catalog.review-v3'), '--input', change]
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
      operating('catalog.review-v3'),
      '--input',
      file('invalid-rounding.change.json', changeSet(rule('CLP', '0.5')))
    )

    expect(preview.status).toBe(0)
    expect(apply.status).toBe(0)
    expect(JSON.parse(apply.stdout)).toMatchObject({ updated: true, version: `${base.version}-rounding` })
    expect(searchCatalog(read(successor), '', 'price_rounding')).toEqual([clp])
    expect(invalid.status).toBe(1)
    expect(JSON.parse(invalid.stderr).error.code).toBe('INVALID_PRICE_ROUNDING_MULTIPLE')
  })
})
