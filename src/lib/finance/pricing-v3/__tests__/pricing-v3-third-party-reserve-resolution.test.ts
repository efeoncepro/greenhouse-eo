// Contract 1.4.0 from the brief to the kernel: catalog record kinds, selection, the emission rule, FX pairs,
// per-period inputs, adjustments, the totals and cash ledger of a quote, and the composition lane.
//
// Catalogs, briefs and demands are built in memory from the committed fixtures; nothing is written under data/.
// What a quote must say is taken from one of three places, never from a previous run of the code under test:
//   - the same brief quoted WITHOUT the capability, by contracts that are frozen and guarded by the artifact corpus
//     (`pricing-v3-frozen-artifacts.test.ts`);
//   - exact arithmetic over the amounts the brief declares;
//   - an identity the contract states (each total is the sum of its periods, the ledger adds up to the cash).
// The arithmetic of a row is the kernel's and is tested in `pricing-v3-third-party-reserve.test.ts`.
//
// The rates used here are not the ones the catalog issues: nothing may depend on a particular category or percentage.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import DecimalJs from 'decimal.js'
import { afterAll, describe, expect, it } from 'vitest'

import {
  applyCatalogChange,
  catalogDigest,
  compareCatalogQuotes,
  explainCatalogQuote,
  previewCatalogChange,
  replayCatalogQuote,
  runCatalogQuote
} from '../adapters/catalog-local'
import {
  explainResourceComposition,
  replayResourceComposition,
  runResourceComposition
} from '../adapters/resource-composition'
import { changeCatalog, searchCatalog, validateCatalog } from '../catalog/catalog'
import { briefSchema } from '../catalog/contracts'
import { calculateCatalogQuote } from '../catalog/quote'
import { resolveBrief } from '../catalog/resolve'
import { commitmentExposure } from '../resources/commitment-exposure'
import { composeResourceQuote } from '../resources/composition'
import { presentPaymentSchedule, readEngagementCash } from '../resources/engagement-view'
import { quotePriceNotices } from '../resources/price-review'
import { splitQuotedPrice } from '../resources/price-split'
import {
  assessCompositionReadiness,
  compositionPreviewMarkdown,
  projectCompositionPreview
} from '../resources/readiness'
import { summarizeComposition } from '../resources/summary'
import { PRICING_V3_ENGINES } from '../schemas'

const D = DecimalJs.clone({ precision: 200, rounding: DecimalJs.ROUND_HALF_UP })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => `data/pricing/v3-operating/${name}.json`
const creditsPath = 'data/pricing/v3-resources/ai-credits.review-v1.json'

// Composition lane: catalog v4 calculates in USD, registers a rounding rule per currency and no CLP -> USD record.
// The managed-care demand is one period in CLP for a client in Chile, offer `creative-managed-service`.
const catalogV4 = read(operating('catalog.review-v4'))
const policy = read(operating('resources.review-v5'))
const credits = read(creditsPath)
const managed = read(operating('managed-care.demand'))

// Catalog lane: three periods in USD (the calculation currency), one line, a one-time setup row in the first.
const designerCatalog = read('data/pricing/v3-catalog/catalog.review-v1.json')
const designerBrief = read('data/pricing/v3-catalog/examples/designer.quote.artifact.json').semantic.brief

const TOTAL_KEYS_14 = [
  'contingencyReserve',
  'contingencyBase',
  'contingencyReserveWaived',
  'thirdPartyCost',
  'thirdPartyNet',
  'ownWorkMarginRate'
] as const

type Composition = ReturnType<typeof composeResourceQuote>
type Quote = ReturnType<typeof calculateCatalogQuote>

type AnyRow = Record<string, string> & {
  lineId: string
  parentLineId: string
  kind: string
  periodId: number
  components: { componentId: string; kind: string; cost: string; price: string; trace: Record<string, string> }[]
}

type CatalogDoc = {
  records: { kind: string; recordId: string; source: Record<string, unknown>; value: Record<string, unknown> }[]
}

const amounts = (totals: unknown) => totals as Record<string, string>
const minor = (value: string) => BigInt(value.replace('.', ''))
const sum = (values: bigint[]) => values.reduce((total, value) => total + value, 0n)

const thrown = (run: () => unknown) => {
  try {
    run()
  } catch (error) {
    return error as { code?: string; name?: string }
  }

  return undefined
}

// ---- catalog fixtures ----

const recordSource = (status = 'confirmed', effectiveFrom = '2026-01-01', reference = 'third-party-reserve-test') => ({
  reference,
  effectiveFrom,
  effectiveUntil: '9999-12-31',
  status
})

type RecordExtra = { offerId?: string; recordId?: string; status?: string; effectiveFrom?: string }

const policyRecord = (
  category: string,
  value: { method?: string; rate: string; minimumMargin?: string; rounding?: string },
  extra: RecordExtra = {}
) => ({
  recordId: extra.recordId ?? `third-party:${category}${extra.offerId ? `:${extra.offerId}` : ''}`,
  revision: 1,
  kind: 'third_party_policy',
  source: recordSource(extra.status, extra.effectiveFrom),
  note: 'Price rule of a category of third-party cost, declared for the test.',
  value: {
    category,
    label: `Categoría ${category}`,
    method: value.method ?? 'markup',
    rate: value.rate,
    minimumMargin: value.minimumMargin ?? '0',
    rounding: value.rounding ?? 'none',
    ...(extra.offerId ? { offerId: extra.offerId } : {})
  }
})

const reserveRecord = (
  value: { rate?: string; base?: string } = {},
  extra: RecordExtra & { engagementForm?: string } = {}
) => ({
  recordId: extra.recordId ?? `contingency:${extra.offerId ?? '*'}:${extra.engagementForm ?? '*'}`,
  revision: 1,
  kind: 'contingency_reserve',
  source: recordSource(extra.status, extra.effectiveFrom),
  note: 'Contingency reserve, declared for the test.',
  value: {
    label: 'Reserva de contingencia',
    rate: value.rate ?? '0.15',
    base: value.base ?? 'human',
    ...(extra.offerId ? { offerId: extra.offerId } : {}),
    ...(extra.engagementForm ? { engagementForm: extra.engagementForm } : {})
  }
})

const formRecord = (form: string, priceRatio: string) => ({
  recordId: `engagement:${form}`,
  revision: 1,
  kind: 'engagement_factor',
  source: recordSource(),
  note: 'Price ratio of a form of engagement, declared for the test.',
  value: { form, priceRatio }
})

const fxRecord = (from: string, to: string, rate: string) => ({
  recordId: `fx:${from}:${to}:test`,
  revision: 1,
  kind: 'fx',
  source: recordSource(),
  note: 'FX record declared for the test.',
  value: { from, to, rate }
})

// Rules of the test, by category. None is a rate the catalog issues.
const POLICIES = [
  policyRecord('production', { rate: '0.20', minimumMargin: '0.10', rounding: 'commercial' }),
  policyRecord('printing', { method: 'target_margin', rate: '0.25', minimumMargin: '0.20', rounding: 'commercial' }),
  policyRecord('media', { rate: '0' }),
  policyRecord('talent', { rate: '0.07', minimumMargin: '0.03' })
]

const FORMS = [formRecord('on_going', '1'), formRecord('on_demand', '1.10')]

const withRecords = <T extends CatalogDoc>(cat: T, records: unknown[]) => {
  const next = clone(cat)

  next.records.push(...(clone(records) as CatalogDoc['records']))

  return next
}

// Every 1.4.0 case below starts from these: the rules of four categories and two forms of engagement, no reserve.
const managedCatalog = withRecords(catalogV4, [...POLICIES, ...FORMS])
const designerCatalog14 = withRecords(designerCatalog, [...POLICIES, ...FORMS])
const MANAGED_OFFER: string = managed.brief.offerId
const DESIGNER_OFFER: string = designerBrief.offerId

// ---- brief fixtures ----

// Appears only in the brief: a supplier name never reaches a kernel input or a result row.
const SUPPLIER = 'Proveedor-Sentinela-7731'

const evidence = (status = 'confirmed', extra: Record<string, string> = {}) => ({
  reference: 'supplier-quote:test-118',
  effectiveFrom: '2026-10-01',
  effectiveUntil: '2026-12-31',
  status,
  ...extra
})

const cost = (costId: string, category: string, amount: string, extra: Record<string, unknown> = {}) => ({
  costId,
  category,
  label: `Concepto ${costId}`,
  supplier: SUPPLIER,
  settlement: 'reinvoiced',
  amount,
  currency: 'CLP',
  quantity: '1',
  periodIds: [1],
  evidence: evidence(),
  ...extra
})

type BriefExtra = {
  costs?: unknown[]
  contingency?: unknown
  form?: string
  adjustments?: unknown[]
  edit?: (brief: Record<string, unknown> & { lines: Record<string, unknown>[] }) => void
}

const withBrief = <T extends Record<string, unknown>>(brief: T, extra: BriefExtra) => {
  const next = clone(brief) as Record<string, unknown> & { lines: Record<string, unknown>[] }

  if (extra.costs) next.thirdPartyCosts = extra.costs
  if (extra.contingency) next.contingency = extra.contingency
  if (extra.form) next.engagementForm = extra.form
  if (extra.adjustments) next.adjustments = extra.adjustments
  extra.edit?.(next)

  return next
}

/** The managed-care demand (composition lane) with the brief fields of the case. */
const demand = (extra: BriefExtra = {}) => ({ ...clone(managed), brief: withBrief(managed.brief, extra) })

/** The designer brief (catalog lane, three periods in USD) with the fields of the case. */
const brief = (extra: BriefExtra = {}) => withBrief(designerBrief, extra)

const compose = (cat: unknown, input: unknown) => composeResourceQuote(cat, policy, credits, input)

const rowsOf = (r: Composition | { quote: Quote }) =>
  r.quote.periods.flatMap(p => p.result.lines) as unknown as AnyRow[]

const quoteRows = (q: Quote) => rowsOf({ quote: q })
const teamRows = (rows: AnyRow[]) => rows.filter(row => row.kind !== 'third_party')
const thirdPartyRows = (rows: AnyRow[]) => rows.filter(row => row.kind === 'third_party')

const contractsOf = (resolution: ReturnType<typeof resolveBrief>) => [
  ...new Set(
    resolution.inputs.flatMap(p => [p.input.request.schemaVersion, p.input.snapshot.schemaVersion] as string[])
  )
]

const enginesOf = (q: Quote) => [...new Set(q.periods.map(p => p.result.engineVersion))]
const codesOf = (resolution: { diagnostics: { code: string }[] }) => resolution.diagnostics.map(d => d.code)

const binding = (resolution: ReturnType<typeof resolveBrief>, purpose: string) =>
  resolution.bindings.filter(b => b.purpose === purpose)

/** A quote that must calculate. */
const calculated = <T extends { calculationStatus: string; diagnostics: unknown[] }>(q: T) => {
  expect(q.diagnostics).toEqual([])
  expect(q.calculationStatus).toBe('calculated')

  return q
}

// ---------------------------------------------------------------------------------------------------------------

describe('catalog records: third_party_policy and contingency_reserve', () => {
  it('validate like the other kinds, and search finds them by kind', () => {
    const cat = withRecords(designerCatalog, [
      ...POLICIES,
      reserveRecord(),
      reserveRecord({}, { offerId: DESIGNER_OFFER, engagementForm: 'on_demand' })
    ])

    expect(validateCatalog(cat)).toEqual(cat)
    expect(searchCatalog(validateCatalog(cat), '', 'third_party_policy').map(r => r.recordId)).toEqual(
      POLICIES.map(r => r.recordId)
    )
    expect(searchCatalog(validateCatalog(cat), '', 'contingency_reserve')).toHaveLength(2)
    expect(searchCatalog(validateCatalog(cat), 'printing', 'third_party_policy')).toHaveLength(1)
    // One revision in force per record, like every kind.
    expect(() => validateCatalog(withRecords(cat, [{ ...POLICIES[0], revision: 2 }]))).toThrow(
      'OVERLAPPING_CATALOG_RECORD'
    )
  })

  it('a rule whose floor asks for more than its method gives is refused by name', () => {
    const invalid = (value: Parameters<typeof policyRecord>[1]) =>
      thrown(() => validateCatalog(withRecords(designerCatalog, [policyRecord('x', value)])))

    // Markup r gives a margin of r / (1 + r): 0,20 gives 16,67 %, 0,25 gives exactly 20 %.
    expect(invalid({ rate: '0.20', minimumMargin: '0.17' })?.code).toBe('INVALID_THIRD_PARTY_POLICY')
    expect(invalid({ rate: '0.25', minimumMargin: '0.2000001' })?.code).toBe('INVALID_THIRD_PARTY_POLICY')
    expect(invalid({ rate: '0', minimumMargin: '0.01' })?.code).toBe('INVALID_THIRD_PARTY_POLICY')
    // A target margin gives itself, and 1 or more is not a price.
    expect(invalid({ method: 'target_margin', rate: '0.25', minimumMargin: '0.26' })?.code).toBe(
      'INVALID_THIRD_PARTY_POLICY'
    )
    expect(invalid({ method: 'target_margin', rate: '1', minimumMargin: '0' })?.code).toBe('INVALID_THIRD_PARTY_POLICY')
    // At the edge the rule holds itself and is accepted.
    expect(invalid({ rate: '0.25', minimumMargin: '0.2' })).toBeUndefined()
    expect(invalid({ rate: '0.20', minimumMargin: '0.1666' })).toBeUndefined()
    expect(invalid({ rate: '0', minimumMargin: '0' })).toBeUndefined()
    expect(invalid({ method: 'target_margin', rate: '0.25', minimumMargin: '0.25' })).toBeUndefined()
  })

  it('a reserve rate is above 0 and under 1, and is refused by name otherwise', () => {
    const invalid = (rate: string) =>
      thrown(() => validateCatalog(withRecords(designerCatalog, [reserveRecord({ rate })])))

    for (const rate of ['0', '0.0', '1', '1.5', '12'])
      expect(invalid(rate)?.code, rate).toBe('INVALID_CONTINGENCY_RESERVE')
    for (const rate of ['0.0001', '0.12', '0.999']) expect(invalid(rate), rate).toBeUndefined()
  })

  it('unknown keys and values are a schema rejection, as in every kind', () => {
    const broken = (record: Record<string, unknown>, value: Record<string, unknown>) =>
      thrown(() =>
        validateCatalog(withRecords(designerCatalog, [{ ...record, value: { ...(record.value as object), ...value } }]))
      )

    for (const value of [
      { rounding: 'nearest' },
      { method: 'pass_through' },
      { rate: 0.1 },
      { category: '' },
      { label: '' },
      { amount: '100' }
    ])
      expect(broken(POLICIES[0], value)?.name, JSON.stringify(value)).toBe('ZodError')
    for (const value of [
      { base: 'third_party' },
      { rate: 'twelve percent' },
      { rate: '-0.1' },
      { label: '' },
      { category: 'media' }
    ])
      expect(broken(reserveRecord(), value)?.name, JSON.stringify(value)).toBe('ZodError')
  })

  describe('maintenance by change-set', () => {
    const change = (cat: unknown, changes: unknown[], nextVersion = 'review-with-third-party') => ({
      schemaVersion: 'pricing-v3-catalog-change/1',
      changeId: `third-party-${nextVersion}`,
      baseDigest: catalogDigest(validateCatalog(cat)),
      nextVersion,
      actor: 'third-party-reserve-test',
      reason: 'Register a price rule of third-party costs or a contingency reserve.',
      changes
    })

    const adding = (record: { recordId: string; source: { effectiveFrom: string } }) => ({
      operation: 'add',
      recordId: record.recordId,
      effectiveFrom: record.source.effectiveFrom,
      record
    })

    const replacing = (record: { recordId: string }, value: Record<string, unknown>, effectiveFrom = '2026-11-01') => ({
      operation: 'replace',
      recordId: record.recordId,
      effectiveFrom,
      record: {
        ...record,
        value,
        revision: 2,
        source: recordSource('confirmed', effectiveFrom, 'third-party-reserve-test-revised')
      }
    })

    const reserve = reserveRecord({}, { offerId: DESIGNER_OFFER, engagementForm: 'on_demand' })

    const base = changeCatalog(
      designerCatalog,
      change(designerCatalog, [...POLICIES, reserve, ...FORMS].map(adding))
    ).catalog

    it('add: the successor holds the records verbatim and a brief that could not be priced now is', () => {
      const withCost = brief({ costs: [cost('media', 'media', '1500.00', { currency: 'USD' })] })
      const preview = previewCatalogChange(designerCatalog, change(designerCatalog, POLICIES.map(adding)), [withCost])

      expect(preview.differences.map(d => [d.operation, d.before, (d.after as { kind: string }).kind])).toEqual(
        POLICIES.map(() => ['add', null, 'third_party_policy'])
      )
      expect(codesOf(preview.impacts[0].before)).toEqual(['MISSING_CATALOG_SELECTION'])
      expect(preview.impacts[0].after.calculationStatus).toBe('calculated')
      expect(enginesOf(preview.impacts[0].after)).toEqual([PRICING_V3_ENGINES['1.4.0']])

      const applied = applyCatalogChange(
        designerCatalog,
        change(designerCatalog, POLICIES.map(adding)),
        preview.previewDigest,
        [withCost]
      )

      expect(searchCatalog(applied, '', 'third_party_policy')).toEqual(POLICIES)
      expect(applied.audit.at(-1)!.changes).toHaveLength(POLICIES.length)
    })

    it('a revision may change the rule of a record, never which category or offer it is the rule of', () => {
      const media = POLICIES[2]

      // The same category for the same scope, with another rate, rounding and floor: a new rule from a date on.
      const revised = changeCatalog(
        base,
        change(
          base,
          [replacing(media, { ...media.value, rate: '0.05', minimumMargin: '0.02', rounding: 'commercial' })],
          'review-rule'
        )
      ).catalog

      expect(
        searchCatalog(revised, '', 'third_party_policy', '2026-10-31').find(r => r.recordId === media.recordId)!.value
      ).toEqual(media.value)
      expect(
        searchCatalog(revised, '', 'third_party_policy', '2026-11-01').find(r => r.recordId === media.recordId)!.value
      ).toMatchObject({ rate: '0.05' })

      // This is the check that the identity of the kind is stated: without its case the two sides would compare
      // equal as `undefined` and the revision would turn the record into the rule of something else in silence.
      for (const value of [
        { ...media.value, category: 'production' },
        { ...media.value, offerId: DESIGNER_OFFER }
      ])
        expect(() => changeCatalog(base, change(base, [replacing(media, value)], 'review-identity'))).toThrow(
          'CATALOG_IDENTITY_CONFLICT'
        )
    })

    it('a revision may change the rate and base of a reserve, never the offer or the form it governs', () => {
      const revised = changeCatalog(
        base,
        change(base, [replacing(reserve, { ...reserve.value, rate: '0.2', base: 'own_costs' })], 'review-rate')
      ).catalog

      expect(searchCatalog(revised, '', 'contingency_reserve', '2026-11-01')[0].value).toMatchObject({
        rate: '0.2',
        base: 'own_costs'
      })

      const { offerId, engagementForm, ...general } = reserve.value

      for (const value of [
        { ...general, engagementForm },
        { ...general, offerId },
        { ...general, offerId: 'another-offer', engagementForm },
        { ...general, offerId, engagementForm: 'on_going' },
        general
      ])
        expect(() => changeCatalog(base, change(base, [replacing(reserve, value)], 'review-identity'))).toThrow(
          'CATALOG_IDENTITY_CONFLICT'
        )
    })

    it('every kind states its identity: a revision of any record of the catalog that changes it is a conflict', () => {
      // Behavioural side of the exhaustiveness guard in `changeCatalog` (the compile-time side is the `never`
      // assignment there, held by `pnpm typecheck`): for each kind the catalog holds, a revision that keeps the
      // record id and swaps the value for the one of ANOTHER record of the same kind must be refused.
      const kinds = [...new Set(base.records.map(r => r.kind))].sort()

      expect(kinds).toEqual(expect.arrayContaining(['contingency_reserve', 'engagement_factor', 'third_party_policy']))

      for (const kind of kinds) {
        const [first, other] = base.records.filter(
          r => r.kind === kind && !r.retiredAt && r.source.effectiveUntil === '9999-12-31'
        )

        if (!other) continue

        expect(
          thrown(() =>
            changeCatalog(
              base,
              change(base, [replacing(first, other.value as Record<string, unknown>, '2027-01-01')], `review-${kind}`)
            )
          )?.code,
          kind
        ).toBe('CATALOG_IDENTITY_CONFLICT')
      }

      // The reserve is the one kind with a single record here: its own case is the test above.
      expect(base.records.filter(r => r.kind === 'contingency_reserve')).toHaveLength(1)
    })
  })
})

describe('the brief: two optional fields and nothing defaulted in', () => {
  it('an earlier brief parses to what it always did: neither key appears', () => {
    for (const earlier of [designerBrief, managed.brief]) {
      const parsed = briefSchema.parse(earlier)

      expect(parsed).not.toHaveProperty('thirdPartyCosts')
      expect(parsed).not.toHaveProperty('contingency')
      expect(Object.keys(parsed).sort()).toEqual(Object.keys(briefSchema.parse(clone(earlier))).sort())
    }
  })

  it('a cost declares its settlement, amount, currency, quantity and periods; a re-invoiced one its evidence', () => {
    const invalid = (edit: Record<string, unknown>, remove: string[] = []) => {
      const item: Record<string, unknown> = { ...cost('media', 'media', '100.00', { currency: 'USD' }), ...edit }

      for (const key of remove) delete item[key]

      const resolution = resolveBrief(designerCatalog14, brief({ costs: [item] }))

      return resolution.status === 'needs_input' && codesOf(resolution).every(code => code === 'INVALID_BRIEF')
    }

    expect(invalid({})).toBe(false)
    expect(invalid({ settlement: 'client_direct' }, ['evidence'])).toBe(false)
    expect(invalid({}, ['evidence'])).toBe(true)
    expect(invalid({}, ['periodIds'])).toBe(true)
    expect(invalid({}, ['supplier'])).toBe(true)
    expect(invalid({}, ['category'])).toBe(true)
    expect(invalid({ periodIds: [] })).toBe(true)
    expect(invalid({ settlement: 'absorbed' })).toBe(true)
    expect(invalid({ amount: '0' })).toBe(true)
    expect(invalid({ quantity: '0' })).toBe(true)
    // A rate is never written in a quote.
    expect(invalid({ rate: '0.1' })).toBe(true)
    expect(invalid({ markup: '0.1' })).toBe(true)
  })

  it('a waiver carries its reason', () => {
    const resolve = (contingency: unknown) => resolveBrief(designerCatalog14, brief({ contingency }))

    for (const contingency of [
      { kind: 'waived' },
      { kind: 'waived', reason: '' },
      { kind: 'reduced', reason: 'x' },
      { reason: 'x' }
    ]) {
      const resolution = resolve(contingency)

      expect(resolution.status).toBe('needs_input')
      expect([...new Set(codesOf(resolution))]).toEqual(['INVALID_BRIEF'])
      expect(resolution.diagnostics.every(d => (d as { path: string }).path.startsWith('contingency'))).toBe(true)
    }
  })
})

describe('contract selection: 1.4.0 only for a re-invoiced cost or a selected reserve', () => {
  const reserve = reserveRecord({}, { offerId: MANAGED_OFFER, engagementForm: 'on_demand' })
  const reserved = withRecords(managedCatalog, [reserve])
  const media = cost('media', 'media', '3000000')
  const direct = cost('stock', 'media', '8765432', { settlement: 'client_direct' })
  const baseline = compose(managedCatalog, demand())
  const onDemand = compose(managedCatalog, demand({ form: 'on_demand' }))

  const contracts = (r: Composition) => contractsOf(r.quote.resolution)

  it('the premise: the baselines calculate on their earlier contracts', () => {
    calculated(baseline.quote)
    calculated(onDemand.quote)
    expect(contracts(baseline)).toEqual(['1.1.0'])
    expect(contracts(onDemand)).toEqual(['1.3.0'])
  })

  it('a re-invoiced cost flips request and snapshot of every period to 1.4.0', () => {
    const r = compose(managedCatalog, demand({ costs: [media] }))

    calculated(r.quote)
    expect(contracts(r)).toEqual(['1.4.0'])
    expect(enginesOf(r.quote)).toEqual([PRICING_V3_ENGINES['1.4.0']])
    for (const key of TOTAL_KEYS_14) expect(r.quote.totals).toHaveProperty(key)
  })

  it('a cost the client pays directly is a note: same contract, and not one amount of the quote moves', () => {
    const r = compose(managedCatalog, demand({ costs: [direct] }))

    expect(contracts(r)).toEqual(['1.1.0'])
    expect(r.quote.periods).toEqual(baseline.quote.periods)
    expect(r.quote.totals).toEqual(baseline.quote.totals)
    expect(r.quote.cashLedger).toEqual(baseline.quote.cashLedger)
    expect(r.quote.resolution.inputs).toEqual(baseline.quote.resolution.inputs)
    expect(r.quote.resolution.bindings).toEqual(baseline.quote.resolution.bindings)
    // It is frozen with the brief, and it is nowhere else: no input, no row, no total, no ledger entry.
    expect(JSON.stringify(r.quote.resolution.brief)).toContain('8765432')

    const { resolution, ...rest } = r.quote

    expect(JSON.stringify([rest, resolution.inputs, resolution.bindings])).not.toContain('8765432')

    // Next to a re-invoiced cost it still reaches nothing.
    const both = compose(managedCatalog, demand({ costs: [media, direct] }))
    const only = compose(managedCatalog, demand({ costs: [media] }))

    expect(both.quote.periods).toEqual(only.quote.periods)
    expect(both.quote.totals).toEqual(only.quote.totals)
    expect(both.quote.resolution.inputs).toEqual(only.quote.resolution.inputs)
  })

  it('a reserve selected for the quote is 1.4.0, also when the brief waives it', () => {
    const selected = compose(reserved, demand({ form: 'on_demand' }))

    const waived = compose(
      reserved,
      demand({ form: 'on_demand', contingency: { kind: 'waived', reason: 'Closed scope.' } })
    )

    for (const r of [selected, waived]) {
      calculated(r.quote)
      expect(contracts(r)).toEqual(['1.4.0'])
      expect(binding(r.quote.resolution, 'contingency_reserve').map(b => [b.lineId, b.record.recordId])).toEqual([
        ['*', reserve.recordId]
      ])
    }

    expect(minor(amounts(selected.quote.totals).contingencyReserve)).toBeGreaterThan(0n)
    expect(amounts(waived.quote.totals).contingencyReserve).toBe('0')
    expect(amounts(waived.quote.totals).contingencyReserveWaived).toBe(
      amounts(selected.quote.totals).contingencyReserve
    )
  })

  it('a reserve of another offer or of another form reaches nothing: the quote stays where it was', () => {
    const elsewhere = withRecords(managedCatalog, [
      reserveRecord({}, { offerId: 'another-offer', engagementForm: 'on_demand' }),
      reserveRecord({}, { offerId: MANAGED_OFFER, engagementForm: 'on_going' })
    ])

    const r = compose(elsewhere, demand({ form: 'on_demand' }))

    expect(contracts(r)).toEqual(['1.3.0'])
    expect(r.quote.periods).toEqual(onDemand.quote.periods)
    expect(r.quote.totals).toEqual(onDemand.quote.totals)
    expect(binding(r.quote.resolution, 'contingency_reserve')).toEqual([])
  })

  it('1.4.0 is a superset: the declared form, the rounding rule and the market floor keys ride along', () => {
    const r = compose(reserved, demand({ form: 'on_demand', costs: [media] }))
    const [{ input }] = r.quote.resolution.inputs

    expect(contracts(r)).toEqual(['1.4.0'])
    expect(input.request).toMatchObject({ engagementForm: 'on_demand' })
    expect(input.snapshot).toMatchObject({ engagementFactors: [{ form: 'on_demand', priceRatio: '1.10' }] })
    expect(input.snapshot).toHaveProperty('priceRounding')
    for (const key of ['engagementAdjustment', 'marketAdjustment', 'roundingAdjustment', 'uplift'])
      expect(r.quote.totals).toHaveProperty(key)
    // Team rows of the quote are those of the 1.3.0 quote, each with its reserve added as cost.
    expect(teamRows(rowsOf(r)).map(row => row.lineId)).toEqual(rowsOf(onDemand).map(row => row.lineId))
  })

  it('the kernel receives the amount and its evidence, the rule selected and the reserve selected, and no supplier', () => {
    const talent = cost('talent', 'talent', '1250.55', { currency: 'USD', quantity: '2' })
    const r = compose(reserved, demand({ form: 'on_demand', costs: [media, talent, direct] }))
    const [{ input }] = r.quote.resolution.inputs

    expect((input.request as { thirdPartyCosts?: unknown }).thirdPartyCosts).toEqual([
      {
        costId: 'media',
        label: media.label,
        category: 'media',
        amount: '3000000',
        currency: 'CLP',
        quantity: '1',
        periodIds: [1],
        source: media.evidence
      },
      {
        costId: 'talent',
        label: talent.label,
        category: 'talent',
        amount: '1250.55',
        currency: 'USD',
        quantity: '2',
        periodIds: [1],
        source: talent.evidence
      }
    ])
    // Only the rules of the categories this period uses, without the label or scope of their records.
    expect((input.snapshot as { thirdPartyPolicies?: unknown }).thirdPartyPolicies).toEqual([
      {
        category: 'media',
        method: 'markup',
        rate: '0',
        minimumMargin: '0',
        rounding: 'none',
        source: POLICIES[2].source
      },
      {
        category: 'talent',
        method: 'markup',
        rate: '0.07',
        minimumMargin: '0.03',
        rounding: 'none',
        source: POLICIES[3].source
      }
    ])
    expect((input.snapshot as { contingencyReserve?: unknown }).contingencyReserve).toEqual({
      rate: '0.15',
      base: 'human',
      source: reserve.source
    })
    expect(input.request).not.toHaveProperty('contingencyWaiver')
    expect(binding(r.quote.resolution, 'third_party_policy').map(b => [b.lineId, b.record.recordId])).toEqual([
      ['media', 'third-party:media'],
      ['talent', 'third-party:talent']
    ])

    const { resolution, ...rest } = r.quote

    expect(JSON.stringify(resolution.brief)).toContain(SUPPLIER)
    expect(JSON.stringify([rest, resolution.inputs, resolution.bindings])).not.toContain(SUPPLIER)

    const waived = compose(
      reserved,
      demand({ form: 'on_demand', contingency: { kind: 'waived', reason: 'Closed scope.' } })
    )

    expect(waived.quote.resolution.inputs[0].input.request).toMatchObject({
      contingencyWaiver: { reason: 'Closed scope.' }
    })
  })
})

describe('the corpus frozen before contract 1.4.0 is not reached by the new records', () => {
  const root = resolve('.')

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const path = join(dir, entry.name)

      return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
    })

  type Frozen = {
    path: string
    offerId: string
    form: string | undefined
    before: unknown
    rerun: (records: unknown[]) => { quote: Quote }
  }

  // Kinds of record contract 1.4.0 added to the catalog.
  const NEW_RECORD_KINDS = ['third_party_policy', 'contingency_reserve']

  // The corpus of the permanent guard (`pricing-v3-frozen-artifacts.test.ts`): everything under data/pricing plus the
  // two committed artifacts of the SKY social care case. A quote signed by 1.4.0 is left out on purpose: it uses the
  // new records, so a rule added for one of its categories is meant to reach it. So is a quote frozen with a catalog
  // that already holds records of those kinds, whatever engine signed it (a quote without third-party costs or
  // reserve, quoted once the catalog had them): it was not frozen before the contract, and a catalog cannot take
  // the rule of a category twice.
  const corpus: Frozen[] = [
    ...walk(resolve(root, 'data/pricing')),
    resolve(root, 'docs/commercial/prospects/sky-social-care-2027/pricing/acordado.artifact.json'),
    resolve(root, 'docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json')
  ]
    .flatMap(path => {
      const artifact = read(path)
      const s = artifact.semantic

      // An artifact of the kernel lane holds no catalog and is not part of this corpus.
      const frozenCatalog = s.catalog as CatalogDoc | undefined

      if (frozenCatalog?.records.some(record => NEW_RECORD_KINDS.includes(record.kind as string))) return []

      if (artifact.artifactVersion === 'pricing-v3-resource-composition/1')
        return [
          {
            path,
            offerId: s.demand.brief.offerId,
            form: s.demand.brief.engagementForm,
            before: s.result.quote,
            rerun: (records: unknown[]) =>
              composeResourceQuote(withRecords(s.catalog, records), s.policy, s.credits, s.demand)
          }
        ]
      if (artifact.artifactVersion === 'pricing-v3-selection-quote/1')
        return [
          {
            path,
            offerId: s.brief.offerId,
            form: s.brief.engagementForm,
            before: s.result,
            rerun: (records: unknown[]) => ({ quote: calculateCatalogQuote(withRecords(s.catalog, records), s.brief) })
          }
        ]

      return []
    })
    .filter(item => !enginesOf(item.before as Quote).includes(PRICING_V3_ENGINES['1.4.0']))

  const offers = [...new Set(corpus.map(item => item.offerId))]

  it('the walk finds the frozen catalog and composition quotes, of more than one offer', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(13)
    expect(offers.length).toBeGreaterThanOrEqual(2)
  })

  it('rules of third-party costs and reserves of other offers, in force at every date: not one byte of a quote moves', () => {
    const inert = [
      ...POLICIES,
      policyRecord('media', { rate: '0.5' }, { offerId: offers[0] }),
      reserveRecord({}, { offerId: 'an-offer-no-quote-uses' }),
      reserveRecord({}, { offerId: 'an-offer-no-quote-uses', engagementForm: 'on_demand' })
    ]

    for (const item of corpus)
      expect(catalogDigest(item.rerun(inert).quote), item.path).toBe(catalogDigest(item.before))
  })

  it('reserves keyed by offer and form: every quote keeps its contract, and only a missing form is said', () => {
    // The shape the catalog issues: one reserve per managed-service offer, for one form of engagement.
    const keyed = offers.map(offerId => reserveRecord({}, { offerId, engagementForm: 'a-form-no-quote-declares' }))
    const noted: string[] = []

    for (const item of corpus) {
      const after = item.rerun(keyed).quote
      const before = item.before as Quote

      expect(contractsOf(after.resolution), item.path).toEqual(contractsOf(before.resolution))
      expect(after.periods, item.path).toEqual(before.periods)
      expect(after.totals, item.path).toEqual(before.totals)
      expect(after.cashLedger, item.path).toEqual(before.cashLedger)
      expect(after.resolution.inputs, item.path).toEqual(before.resolution.inputs)
      expect(after.resolution.bindings, item.path).toEqual(before.resolution.bindings)

      // A quote that declares no form cannot be matched against a reserve keyed by form, and says so; one that
      // declares a form was evaluated and has nothing to say.
      const added = after.resolution.assumptions.filter(
        a => a.code === 'CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM'
      )

      expect(added.length, item.path).toBe(item.form === undefined ? 1 : 0)
      expect(
        after.resolution.assumptions.filter(a => !added.includes(a)),
        item.path
      ).toEqual(before.resolution.assumptions)
      if (added.length) noted.push(item.path)
      else expect(catalogDigest(after), item.path).toBe(catalogDigest(before))
    }

    expect(noted.length).toBeGreaterThan(0)
    expect(noted.length).toBeLessThan(corpus.length)
  })
})

describe('selection of the rule of a category: the offer record first, never a silent pick', () => {
  const media = cost('media', 'media', '1500.00', { currency: 'USD' })
  const resolved = (cat: unknown, costs: unknown[] = [media]) => resolveBrief(cat, brief({ costs }))
  const selected = (cat: unknown) => binding(resolved(cat), 'third_party_policy').map(b => b.record.recordId)

  it('the record of the offer prevails over the general one; a record of another offer never applies', () => {
    const ofOffer = policyRecord('media', { rate: '0.5' }, { offerId: DESIGNER_OFFER })
    const ofOther = policyRecord('media', { rate: '0.9' }, { offerId: 'another-offer' })

    expect(selected(designerCatalog14)).toEqual(['third-party:media'])
    expect(selected(withRecords(designerCatalog14, [ofOther]))).toEqual(['third-party:media'])
    expect(selected(withRecords(designerCatalog14, [ofOffer, ofOther]))).toEqual([ofOffer.recordId])

    const priced = calculated(
      calculateCatalogQuote(withRecords(designerCatalog14, [ofOffer]), brief({ costs: [media] }))
    )

    // 1.500,00 at a markup of 0,5, the rule of the offer, instead of at cost.
    expect(thirdPartyRows(quoteRows(priced)).map(row => row.net)).toEqual(['2250.00'])
    // Only the record of another offer: the category has no rule for this quote.
    expect(codesOf(resolved(withRecords(designerCatalog, [ofOther, ...FORMS])))).toEqual(['MISSING_CATALOG_SELECTION'])
  })

  it('a category without a rule in force is a missing selection that names the cost', () => {
    const missing = { code: 'MISSING_CATALOG_SELECTION', path: 'thirdPartyCosts.media.policy', candidates: [] }

    // In force only after the quote date: the same missing selection, which says the date is the cause.
    const startsLater = withRecords(designerCatalog, [
      policyRecord('media', { rate: '0' }, { effectiveFrom: '2026-10-10' })
    ])

    for (const [cat, expected] of [
      [designerCatalog, missing],
      [withRecords(designerCatalog, [POLICIES[0]]), missing],
      [
        startsLater,
        {
          ...missing,
          detail:
            'The quote date is before the first date a record for this selection is in force, which is 2026-10-10.'
        }
      ]
    ] as const) {
      const resolution = resolved(cat)

      expect(resolution.status).toBe('needs_input')
      expect(resolution.diagnostics).toEqual([expected])
      expect(calculateCatalogQuote(cat, brief({ costs: [media] })).totals).toBeNull()
    }
  })

  it('two rules of the prevailing level are an ambiguity, at either level', () => {
    const twin = policyRecord('media', { rate: '0.1' }, { recordId: 'third-party:media:twin' })
    const offerA = policyRecord('media', { rate: '0.2' }, { offerId: DESIGNER_OFFER })

    const offerB = policyRecord(
      'media',
      { rate: '0.3' },
      { offerId: DESIGNER_OFFER, recordId: 'third-party:media:offer-twin' }
    )

    expect(resolved(withRecords(designerCatalog14, [twin])).diagnostics).toEqual([
      {
        code: 'AMBIGUOUS_SELECTION',
        path: 'thirdPartyCosts.media.policy',
        candidates: ['third-party:media', 'third-party:media:twin']
      }
    ])
    expect(resolved(withRecords(designerCatalog14, [offerA, offerB])).diagnostics).toEqual([
      {
        code: 'AMBIGUOUS_SELECTION',
        path: 'thirdPartyCosts.media.policy',
        candidates: [offerA.recordId, offerB.recordId]
      }
    ])
    // Two general ones under one of the offer are no ambiguity: the offer record decides.
    expect(codesOf(resolved(withRecords(designerCatalog14, [twin, offerA])))).toEqual([])
  })

  it('a pending rule blocks and an estimated one is priced under review, like any other catalog value', () => {
    const withStatus = (status: string) =>
      withRecords(designerCatalog, [policyRecord('media', { rate: '0' }, { status }), ...FORMS])

    expect(codesOf(resolved(withStatus('pending')))).toEqual(['PENDING_CATALOG_VALUE'])

    const estimated = calculated(calculateCatalogQuote(withStatus('estimated'), brief({ costs: [media] })))

    expect(estimated.reviewStatus).toBe('requires_review')
    expect(estimated.periods[0].result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'ESTIMATED_SOURCE',
        fieldPath: 'snapshot.thirdPartyPolicies.media',
        severity: 'review'
      })
    )
  })

  it('the evidence of the amount: expired or pending withholds the quote, estimated puts it under review', () => {
    const withEvidence = (edit: Record<string, string>, status = 'confirmed') =>
      calculateCatalogQuote(designerCatalog14, brief({ costs: [{ ...media, evidence: evidence(status, edit) }] }))

    for (const blocked of [
      withEvidence({ effectiveUntil: '2026-10-08' }),
      withEvidence({}, 'pending'),
      withEvidence({ effectiveFrom: '2026-10-10' })
    ]) {
      expect(blocked.calculationStatus).toBe('needs_input')
      expect(blocked.totals).toBeNull()
    }

    expect(
      withEvidence({ effectiveUntil: '2026-10-08' }).periods[0].result.diagnostics.filter(d => d.severity !== 'review')
    ).toEqual([
      expect.objectContaining({ code: 'STALE_SOURCE', fieldPath: 'request.thirdPartyCosts.0.source', lineId: 'media' })
    ])

    const estimated = calculated(withEvidence({}, 'estimated'))

    expect(estimated.reviewStatus).toBe('requires_review')
    expect(estimated.periods[0].result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'ESTIMATED_SOURCE', fieldPath: 'request.thirdPartyCosts.0.source' })
    )
  })

  it('a commercial draft is issued on confirmed evidence only', () => {
    const draft = (status: string) =>
      resolveBrief(
        designerCatalog14,
        brief({ costs: [{ ...media, evidence: evidence(status) }], edit: b => (b.mode = 'commercial_draft') })
      )

    expect(draft('estimated').diagnostics).toContainEqual({
      code: 'UNCONFIRMED_THIRD_PARTY_COST',
      path: 'thirdPartyCosts.media.evidence'
    })
    expect(codesOf(draft('confirmed'))).not.toContain('UNCONFIRMED_THIRD_PARTY_COST')
  })
})

describe('selection of the contingency reserve: the most specific record, and a tie blocks', () => {
  const general = reserveRecord({ rate: '0.05' })
  const ofOffer = reserveRecord({ rate: '0.10' }, { offerId: DESIGNER_OFFER })
  const ofForm = reserveRecord({ rate: '0.15' }, { engagementForm: 'on_demand' })
  const ofBoth = reserveRecord({ rate: '0.20' }, { offerId: DESIGNER_OFFER, engagementForm: 'on_demand' })
  const onDemand = brief({ form: 'on_demand' })

  const resolved = (records: unknown[], input: unknown = onDemand) =>
    resolveBrief(withRecords(designerCatalog14, records), input)

  const NOT_EVALUATED = 'CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM'

  // The designer brief carries an assumption of its own (an unlocalized cost); only the one of this rule is read.
  const notEvaluated = (resolution: ReturnType<typeof resolveBrief>) =>
    resolution.assumptions.filter(a => a.code === NOT_EVALUATED)

  const selected = (records: unknown[], input: unknown = onDemand) =>
    binding(resolved(records, input), 'contingency_reserve').map(b => b.record.recordId)

  it('offer and form beats either alone, and either alone beats the general record', () => {
    expect(selected([general])).toEqual([general.recordId])
    expect(selected([general, ofOffer])).toEqual([ofOffer.recordId])
    expect(selected([general, ofForm])).toEqual([ofForm.recordId])
    expect(selected([general, ofOffer, ofForm, ofBoth])).toEqual([ofBoth.recordId])
    expect(selected([ofBoth])).toEqual([ofBoth.recordId])

    // The rate that reaches the kernel is the one of the record selected, and the quote is priced with it.
    const quote = calculated(
      calculateCatalogQuote(withRecords(designerCatalog14, [general, ofOffer, ofForm, ofBoth]), onDemand)
    )

    expect(
      quote.resolution.inputs.map(
        p => (p.input.snapshot as { contingencyReserve?: { rate: string } }).contingencyReserve?.rate
      )
    ).toEqual(['0.20', '0.20', '0.20'])
    expect(minor(amounts(quote.totals).contingencyReserve)).toBeGreaterThan(0n)
  })

  it('a record that names only the offer and one that names only the form cannot be ranked: they block', () => {
    const tie = resolved([general, ofOffer, ofForm])

    expect(tie.status).toBe('needs_input')
    expect(tie.diagnostics).toEqual([
      { code: 'AMBIGUOUS_CONTINGENCY_RESERVE', path: 'contingency', candidates: [ofOffer.recordId, ofForm.recordId] }
    ])
    expect(binding(tie, 'contingency_reserve')).toEqual([])
    expect(calculateCatalogQuote(withRecords(designerCatalog14, [ofOffer, ofForm]), onDemand).totals).toBeNull()

    // Two records of the same level block the same way, whatever the level.
    const twin = reserveRecord({ rate: '0.07' }, { recordId: 'contingency:general-twin' })

    expect(codesOf(resolved([general, twin]))).toEqual(['AMBIGUOUS_CONTINGENCY_RESERVE'])
    // A waiver does not get around the ambiguity: which reserve is waived is still unknown.
    expect(
      codesOf(resolved([ofOffer, ofForm], brief({ form: 'on_demand', contingency: { kind: 'waived', reason: 'x' } })))
    ).toEqual(['AMBIGUOUS_CONTINGENCY_RESERVE'])
  })

  it('a record of another offer or of another form is not a candidate', () => {
    const elsewhere = [
      reserveRecord({}, { offerId: 'another-offer' }),
      reserveRecord({}, { engagementForm: 'on_going' }),
      reserveRecord({}, { offerId: 'another-offer', engagementForm: 'on_demand' })
    ]

    const resolution = resolved(elsewhere)

    expect(codesOf(resolution)).toEqual([])
    expect(binding(resolution, 'contingency_reserve')).toEqual([])
    expect(contractsOf(resolution)).toEqual(['1.3.0'])
    // And next to them the general one is still the one selected.
    expect(selected([...elsewhere, general])).toEqual([general.recordId])
  })

  it('without a declared form, a reserve keyed by form is not evaluated, and the resolution says so', () => {
    const plain = brief()
    const keyed = resolved([ofForm, ofBoth], plain)

    // Nothing was selected, the quote keeps its contract, and the forgotten form is on record.
    expect(keyed.status).toBe('resolved')
    expect(contractsOf(keyed)).toEqual(['1.0.0'])
    expect(binding(keyed, 'contingency_reserve')).toEqual([])
    expect(notEvaluated(keyed)).toEqual([
      expect.objectContaining({
        code: NOT_EVALUATED,
        path: 'engagementForm',
        candidates: [ofForm.recordId, ofBoth.recordId]
      })
    ])
    // Nothing else of the resolution moved: the other assumptions are those of the brief without any reserve.
    expect(keyed.assumptions.filter(a => a.code !== NOT_EVALUATED)).toEqual(resolved([], plain).assumptions)

    // A general reserve is selected all the same; the note stays, because the keyed one might have prevailed.
    const withGeneral = resolved([general, ofForm], plain)

    expect(binding(withGeneral, 'contingency_reserve').map(b => b.record.recordId)).toEqual([general.recordId])
    expect(notEvaluated(withGeneral)).toHaveLength(1)

    // No note when a form is declared, when no reserve is keyed by form, or when the keyed one is of another offer.
    expect(notEvaluated(resolved([ofForm, ofBoth]))).toEqual([])
    expect(notEvaluated(resolved([general, ofOffer], plain))).toEqual([])
    expect(
      notEvaluated(resolved([reserveRecord({}, { offerId: 'another-offer', engagementForm: 'on_demand' })], plain))
    ).toEqual([])
  })

  it('a waiver with no reserve to waive is named, never silently accepted', () => {
    const waiving = (form?: string) =>
      brief({ ...(form ? { form } : {}), contingency: { kind: 'waived', reason: 'Closed scope.' } })

    for (const [records, input] of [
      [[], waiving('on_demand')],
      [[reserveRecord({}, { offerId: 'another-offer' })], waiving('on_demand')],
      [[ofForm], waiving('on_going')],
      [[ofForm], waiving()],
      // In force only after the quote date.
      [[reserveRecord({}, { effectiveFrom: '2026-10-10' })], waiving('on_demand')]
    ] as const) {
      const resolution = resolved([...records], input)

      expect(resolution.status).toBe('needs_input')
      expect(resolution.diagnostics).toEqual([{ code: 'CONTINGENCY_WAIVER_WITHOUT_RESERVE', path: 'contingency' }])
      expect(calculateCatalogQuote(withRecords(designerCatalog14, [...records]), input).totals).toBeNull()
    }

    expect(codesOf(resolved([ofForm], waiving('on_demand')))).toEqual([])
  })

  it('a pending reserve blocks and an estimated one is priced under review', () => {
    expect(resolved([reserveRecord({}, { status: 'pending' })]).diagnostics).toEqual([
      { code: 'PENDING_CATALOG_VALUE', path: 'contingency' }
    ])

    const estimated = calculated(
      calculateCatalogQuote(withRecords(designerCatalog14, [reserveRecord({}, { status: 'estimated' })]), onDemand)
    )

    expect(estimated.periods[0].result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'ESTIMATED_SOURCE',
        fieldPath: 'snapshot.contingencyReserve',
        severity: 'review'
      })
    )
  })
})

describe('schedule, ids and adjustments of third-party costs, over three periods', () => {
  // Designer brief: one line `design` active in the three periods, a setup row in the first, quoted in USD.
  const prod = cost('prod', 'production', '1000.00', { currency: 'USD', periodIds: [1, 3] })
  const media = cost('media', 'media', '333.33', { currency: 'USD', quantity: '3', periodIds: [2] })
  const plain = calculated(calculateCatalogQuote(designerCatalog14, brief()))
  const quote = calculated(calculateCatalogQuote(designerCatalog14, brief({ costs: [prod, media] })))

  it('a cost reaches the periods it lists, as a cost of period 1 of each kernel input, and no other', () => {
    expect(
      quote.resolution.inputs.map(p =>
        (
          (p.input.request as { thirdPartyCosts?: { costId: string; periodIds: number[] }[] }).thirdPartyCosts ?? []
        ).map(c => [c.costId, c.periodIds])
      )
    ).toEqual([[['prod', [1]]], [['media', [1]]], [['prod', [1]]]])
    expect(
      quote.periods.map(p =>
        thirdPartyRows(p.result.lines as unknown as AnyRow[]).map(row => [row.lineId, row.cost, row.net])
      )
    ).toEqual([
      // 1.000,00 at a markup of 0,20.
      [['prod:1:third_party', '1000.00', '1200.00']],
      // 333,33 x 3 at cost.
      [['media:1:third_party', '999.99', '999.99']],
      [['prod:1:third_party', '1000.00', '1200.00']]
    ])
    // Team rows are those of the quote without costs, period by period: every amount the earlier contract states.
    const team = teamRows(quoteRows(quote))

    expect(team.map(row => row.lineId)).toEqual(quoteRows(plain).map(row => row.lineId))

    for (const [index, prior] of quoteRows(plain).entries()) {
      for (const key of [
        'periodId',
        'kind',
        'label',
        'cost',
        'undiscountedPrice',
        'discount',
        'net',
        'marginAmount',
        'minimumMargin'
      ])
        expect(team[index][key], key).toBe(prior[key])
      expect(team[index].components.map(c => [c.componentId, c.cost, c.price])).toEqual(
        prior.components.map(c => [c.componentId, c.cost, c.price])
      )
      expect(team[index].contingencyReserve).toBe('0.00')
    }
  })

  it('the totals of the quote are the sum of its periods, and own work reads as it did without the costs', () => {
    const totals = amounts(quote.totals)
    const periods = quote.periods.map(p => amounts(p.result.totals))

    for (const key of [
      'cost',
      'net',
      'marginAmount',
      'contingencyReserve',
      'contingencyBase',
      'contingencyReserveWaived',
      'thirdPartyCost',
      'thirdPartyNet'
    ])
      expect(minor(totals[key]), key).toBe(sum(periods.map(p => minor(p[key]))))

    expect(totals.thirdPartyCost).toBe('2999.99')
    expect(totals.thirdPartyNet).toBe('3399.99')
    expect(minor(totals.net)).toBe(minor(plain.totals!.net) + 339_999n)
    expect(minor(totals.cost)).toBe(minor(plain.totals!.cost) + 299_999n)
    // ((net - thirdPartyNet) - (cost - thirdPartyCost)) / (net - thirdPartyNet) is the margin of the same quote
    // without any third-party cost; the blended one is lower.
    expect(new D(totals.ownWorkMarginRate).toFixed(60)).toBe(new D(plain.totals!.marginRate!).toFixed(60))
    expect(new D(totals.marginRate).lt(totals.ownWorkMarginRate)).toBe(true)
    expect(new D(totals.marginRate).toFixed(60)).toBe(new D(totals.marginAmount).div(totals.net).toFixed(60))
    // A quote of an earlier contract has none of these keys.
    for (const key of TOTAL_KEYS_14) expect(plain.totals).not.toHaveProperty(key)
  })

  it('the cash ledger gives each cost its own entry per period, taken out of the entry of the team', () => {
    const entry = (q: Quote, key: string) => q.cashLedger.filter(c => c.key === key).map(c => [c.periodId, c.amount])

    expect(entry(quote, 'third-party:prod')).toEqual([
      [1, '1000.00'],
      [3, '1000.00']
    ])
    expect(entry(quote, 'third-party:media')).toEqual([[2, '999.99']])
    // What the team commits is what it committed without the costs, period by period.
    expect(entry(quote, 'human-monthly-and-once')).toEqual(entry(plain, 'human-monthly-and-once'))
    expect(quote.cashLedger.filter(c => !c.key.startsWith('third-party:'))).toEqual(plain.cashLedger)
    // And the ledger still adds up to the cash of the quote.
    expect(sum(quote.cashLedger.map(c => minor(c.amount)))).toBe(minor(quote.totals!.cashCommitment))
    expect(minor(quote.totals!.cashCommitment)).toBe(minor(plain.totals!.cashCommitment) + 299_999n)
  })

  it('a period outside the term, or listed twice, is an invalid schedule, for a note as much as for a row', () => {
    for (const settlement of ['reinvoiced', 'client_direct'])
      for (const periodIds of [[4], [1, 1], [2, 9]]) {
        const resolution = resolveBrief(designerCatalog14, brief({ costs: [{ ...prod, settlement, periodIds }] }))

        expect(resolution.status).toBe('needs_input')
        expect(resolution.diagnostics).toEqual([{ code: 'INVALID_THIRD_PARTY_SCHEDULE', path: 'thirdPartyCosts.prod' }])
      }
  })

  it('a re-invoiced cost in a period no line is active in has no quote to be a row of', () => {
    const twoMonths = (b: { lines: Record<string, unknown>[] }) => (b.lines[0].activePeriods = [1, 2])
    const outside = resolveBrief(designerCatalog14, brief({ costs: [prod], edit: twoMonths }))

    expect(outside.status).toBe('needs_input')
    expect(outside.diagnostics).toEqual([
      { code: 'THIRD_PARTY_COST_OUTSIDE_ACTIVE_PERIOD', path: 'thirdPartyCosts.prod' }
    ])
    expect(calculateCatalogQuote(designerCatalog14, brief({ costs: [prod], edit: twoMonths })).totals).toBeNull()
    // Inside the active periods it resolves; and a note is not a row, so it has nothing to be outside of.
    expect(codesOf(resolveBrief(designerCatalog14, brief({ costs: [media], edit: twoMonths })))).toEqual([])
    expect(
      codesOf(
        resolveBrief(designerCatalog14, brief({ costs: [{ ...prod, settlement: 'client_direct' }], edit: twoMonths }))
      )
    ).toEqual([])
  })

  it('a cost id is unique and is not the id of a line', () => {
    for (const costs of [
      [prod, { ...media, costId: 'prod' }],
      [{ ...prod, costId: 'design' }],
      [prod, { ...media, costId: 'prod', settlement: 'client_direct' }]
    ])
      expect(resolveBrief(designerCatalog14, brief({ costs })).diagnostics).toContainEqual({
        code: 'DUPLICATE_THIRD_PARTY_COST_ID',
        path: 'thirdPartyCosts'
      })
  })

  it('an adjustment reaches a cost only as an agreed net of third-party billing, and lands in every period of it', () => {
    const adjusted = (adjustment: Record<string, unknown>, costs: unknown[] = [prod, media]) =>
      resolveBrief(
        designerCatalog14,
        brief({ costs, adjustments: [{ reason: 'Agreed with the client.', ...adjustment }] })
      )

    const agreed = {
      adjustmentId: 'n',
      kind: 'agreed_net',
      amount: '1100.00',
      billing: 'third_party',
      lineIds: ['prod']
    }

    // A rate discount cannot name a cost; an agreed net of a team class cannot either; one of third-party billing
    // cannot name a line, an unknown id, or a cost the client pays directly (it has no row).
    expect(codesOf(adjusted({ adjustmentId: 'd', kind: 'discount', rate: '0.1', lineIds: ['prod'] }))).toContain(
      'INVALID_ADJUSTMENT_LINE'
    )
    expect(
      codesOf(adjusted({ adjustmentId: 'd', kind: 'discount', rate: '0.1', lineIds: ['design', 'media'] }))
    ).toContain('INVALID_ADJUSTMENT_LINE')
    expect(codesOf(adjusted({ ...agreed, billing: 'monthly' }))).toContain('INVALID_ADJUSTMENT_LINE')
    expect(codesOf(adjusted({ ...agreed, lineIds: ['design'] }))).toContain('INVALID_ADJUSTMENT_LINE')
    expect(codesOf(adjusted({ ...agreed, lineIds: ['nobody'] }))).toContain('INVALID_ADJUSTMENT_LINE')
    expect(codesOf(adjusted(agreed, [{ ...prod, settlement: 'client_direct' }]))).toContain('INVALID_ADJUSTMENT_LINE')

    const resolution = adjusted(agreed)

    expect(codesOf(resolution)).toEqual([])
    // It goes to the periods that hold a row of the named cost, and to no other.
    expect(resolution.inputs.map(p => p.input.request.adjustments.map(a => a.adjustmentId))).toEqual([['n'], [], ['n']])

    const quoted = calculated(
      calculateCatalogQuote(
        designerCatalog14,
        brief({ costs: [prod, media], adjustments: [{ reason: 'Agreed.', ...agreed }] })
      )
    )

    expect(
      thirdPartyRows(quoteRows(quoted)).map(row => [row.periodId, row.parentLineId, row.net, row.discount])
    ).toEqual([
      [1, 'prod', '1100.00', '100.00'],
      [1, 'media', '999.99', '0.00'],
      [1, 'prod', '1100.00', '100.00']
    ])
    expect(teamRows(quoteRows(quoted))).toEqual(teamRows(quoteRows(quote)))

    // A rate discount on the line leaves every third-party row as it was.
    const discounted = calculated(
      calculateCatalogQuote(
        designerCatalog14,
        brief({
          costs: [prod, media],
          adjustments: [{ adjustmentId: 'd', kind: 'discount', rate: '0.2', lineIds: ['design'], reason: 'r' }]
        })
      )
    )

    expect(thirdPartyRows(quoteRows(discounted))).toEqual(thirdPartyRows(quoteRows(quote)))
    expect(minor(discounted.totals!.discount)).toBeGreaterThan(0n)
  })
})

describe('FX of a third-party cost: identity in the currency of the quote, otherwise through the calculation currency', () => {
  // Catalog v4 calculates in USD and holds USD -> CLP, and no CLP -> USD record in force at the date of the demand.
  const fxBindings = (r: Composition) => binding(r.quote.resolution, 'fx').map(b => b.record.recordId)
  const baseline = compose(managedCatalog, demand())

  it('a supplier in the currency of the quote asks for no record and nets its amount exactly', () => {
    const r = compose(managedCatalog, demand({ costs: [cost('media', 'media', '3333333', { quantity: '3' })] }))

    calculated(r.quote)
    expect(managedCatalog.calculationCurrency).not.toBe(managed.brief.outputCurrency)
    expect(fxBindings(r)).toEqual(fxBindings(baseline))

    const [row] = thirdPartyRows(rowsOf(r))

    expect([row.cost, row.net, row.marginAmount]).toEqual(['9999999', '9999999', '0'])
    expect(row.components[0].trace).toMatchObject({ fxPath: 'CLP', fxRate: '1', outputFx: '1', denominatedIn: 'CLP' })
  })

  it('a supplier in the calculation currency is converted with the output FX the quote already froze', () => {
    const r = compose(
      managedCatalog,
      demand({ costs: [cost('talent', 'talent', '1250.55', { currency: 'USD', quantity: '2' })] })
    )

    calculated(r.quote)
    expect(fxBindings(r)).toEqual(fxBindings(baseline))

    const rate = r.quote.resolution.inputs[0].input.snapshot.fx.find(f => f.from === 'USD' && f.to === 'CLP')!.rate
    const [row] = thirdPartyRows(rowsOf(r))
    const raw = new D('1250.55').mul(2).mul(rate)

    expect(row.cost).toBe(raw.toFixed(0))
    expect(row.net).toBe(raw.mul('1.07').toFixed(0))
    expect(row.components[0].trace).toMatchObject({ supplierCurrency: 'USD', fxPath: 'USD>CLP', fxRate: rate })
  })

  it('any other currency needs its record into the calculation currency: missing, it is named; present, it is bound', () => {
    // A CLP supplier inside a USD quote.
    const clp = cost('print', 'printing', '750000')
    const missing = resolveBrief(designerCatalog14, brief({ costs: [clp] }))

    expect(missing.status).toBe('needs_input')
    expect(missing.diagnostics).toEqual([{ code: 'MISSING_CATALOG_SELECTION', path: 'fx.CLP:USD', candidates: [] }])

    const withRecord = withRecords(designerCatalog14, [fxRecord('CLP', 'USD', '0.00105')])
    const quote = calculated(calculateCatalogQuote(withRecord, brief({ costs: [clp] })))
    const [row] = thirdPartyRows(quoteRows(quote))

    expect(binding(quote.resolution, 'fx').map(b => b.record.recordId)).toEqual(['fx:CLP:USD:test'])
    // 750.000 x 0,00105 = 787,50; target margin 0,25 -> 1.050,00.
    expect([row.cost, row.net]).toEqual(['787.50', '1050.00'])
    expect(row.components[0].trace).toMatchObject({ fxPath: 'CLP>USD', fxRate: '0.00105' })

    // A EUR supplier inside a CLP quote calculated in USD: two hops, the first one its own record.
    const eur = cost('print', 'printing', '100.00', { currency: 'EUR' })

    expect(resolveBrief(managedCatalog, demand({ costs: [eur] }).brief).diagnostics).toContainEqual({
      code: 'MISSING_CATALOG_SELECTION',
      path: 'fx.EUR:USD',
      candidates: []
    })

    const r = compose(withRecords(managedCatalog, [fxRecord('EUR', 'USD', '1.1')]), demand({ costs: [eur] }))

    calculated(r.quote)
    expect(fxBindings(r)).toEqual([...fxBindings(baseline), 'fx:EUR:USD:test'])
    expect(thirdPartyRows(rowsOf(r))[0].components[0].trace.fxPath).toBe('EUR>USD>CLP')
  })
})

describe('the composition lane carries the brief to the kernel untouched and still injects its tools', () => {
  const reserve = reserveRecord(
    { rate: '0.15', base: 'own_costs' },
    { offerId: MANAGED_OFFER, engagementForm: 'on_demand' }
  )

  const cat = withRecords(managedCatalog, [reserve])

  const costs = [
    cost('prod', 'production', '4500000'),
    cost('talent', 'talent', '1250.55', { currency: 'USD' }),
    cost('media', 'media', '3333333'),
    cost('stock', 'media', '8765432', { settlement: 'client_direct' })
  ]

  const plain = compose(managedCatalog, demand({ form: 'on_demand' }))
  const full = compose(cat, demand({ form: 'on_demand', costs }))

  const artifact = runResourceComposition(
    cat,
    policy,
    credits,
    demand({ form: 'on_demand', costs }),
    '2026-10-10T00:00:00.000Z'
  )

  it('the kernel input of the period holds the costs of the brief and the reserve of the catalog, next to the composed tools', () => {
    calculated(full.quote)

    const [{ input }] = full.quote.resolution.inputs

    const composed = (i: typeof input) =>
      i.snapshot.resources.filter(r => r.resourceId.startsWith('composed:')).map(r => r.resourceId)

    expect(contractsOf(full.quote.resolution)).toEqual(['1.4.0'])
    expect((input.request as { thirdPartyCosts: { costId: string }[] }).thirdPartyCosts.map(c => c.costId)).toEqual([
      'prod',
      'talent',
      'media'
    ])
    expect((input.snapshot as { contingencyReserve?: unknown }).contingencyReserve).toEqual({
      rate: '0.15',
      base: 'own_costs',
      source: reserve.source
    })
    // The tools the composition priced are in the same input, exactly as without the new fields.
    expect(composed(input).length).toBeGreaterThan(0)
    expect(composed(input)).toEqual(composed(plain.quote.resolution.inputs[0].input))
    expect(input.request.lines.map(l => l.assignments)).toEqual(
      plain.quote.resolution.inputs[0].input.request.lines.map(l => l.assignments)
    )
    // Selection and attribution of tools know nothing of the new fields.
    expect(full.selections).toEqual(plain.selections)
    expect(full.attributions).toEqual(plain.attributions)
    expect(full.creditBudgets).toEqual(plain.creditBudgets)
  })

  it('the reserve rests on every own cost, the composed tools included, and on no third-party cost', () => {
    const totals = amounts(full.quote.totals)
    const rows = rowsOf(full)
    const team = teamRows(rows)

    // The tools were injected after resolution: only a reserve computed by the kernel can have them in its base.
    expect(team.some(row => row.components.some(c => c.componentId.startsWith('composed-')))).toBe(true)
    // Base `own_costs`: the cost of every team row before its reserve, which is the own cost of the same quote
    // without a reserve, row by row.
    expect(team.map(row => minor(row.cost) - minor(row.contingencyReserve))).toEqual(
      rowsOf(plain).map(row => minor(row.cost))
    )
    expect(minor(totals.contingencyBase)).toBe(minor(plain.quote.totals!.cost))
    expect(minor(totals.contingencyBase)).toBe(
      minor(totals.cost) - minor(totals.thirdPartyCost) - minor(totals.contingencyReserve)
    )
    // 15 % of that base, row by row at the precision of the currency.
    expect(new D(totals.contingencyReserve).div(totals.contingencyBase).minus('0.15').abs().lt('0.00001')).toBe(true)
    for (const row of thirdPartyRows(rows)) expect(row.contingencyReserve).toBe('0')
    // Three re-invoiced rows; the one the client pays is nowhere.
    expect(thirdPartyRows(rows).map(row => row.parentLineId)).toEqual(['prod', 'talent', 'media'])
    expect(minor(totals.thirdPartyCost)).toBe(sum(thirdPartyRows(rows).map(row => minor(row.cost))))
  })

  it('the artifact replays from its own frozen catalog and demand; a touched cost, evidence, rule or reserve does not', () => {
    expect(replayResourceComposition(clone(artifact)).replayDigest).toBe(artifact.replayDigest)

    const tamper = (edit: (copy: typeof artifact) => void) => {
      const copy = clone(artifact)

      edit(copy)

      return () => replayResourceComposition(copy)
    }

    const briefOf = (copy: typeof artifact) =>
      copy.semantic.demand.brief as unknown as { thirdPartyCosts: Record<string, unknown>[]; contingency?: unknown }

    const record = (copy: typeof artifact, recordId: string) =>
      copy.semantic.catalog.records.find(r => r.recordId === recordId)!

    expect(
      tamper(copy => Object.assign(briefOf(copy).thirdPartyCosts[0].evidence as object, { reference: 'another-quote' }))
    ).toThrow('REPLAY_MISMATCH')
    expect(
      tamper(copy =>
        Object.assign(briefOf(copy).thirdPartyCosts[0].evidence as object, { effectiveUntil: '2027-06-30' })
      )
    ).toThrow('REPLAY_MISMATCH')
    expect(tamper(copy => (briefOf(copy).thirdPartyCosts[0].amount = '4400000'))).toThrow('REPLAY_MISMATCH')
    expect(tamper(copy => (briefOf(copy).thirdPartyCosts[3].settlement = 'reinvoiced'))).toThrow('REPLAY_MISMATCH')
    expect(tamper(copy => (briefOf(copy).contingency = { kind: 'waived', reason: 'later' }))).toThrow('REPLAY_MISMATCH')
    expect(tamper(copy => ((record(copy, 'third-party:production').value as { rate: string }).rate = '0.1'))).toThrow(
      'REPLAY_MISMATCH'
    )
    expect(tamper(copy => ((record(copy, reserve.recordId).value as { rate: string }).rate = '0.1'))).toThrow(
      'REPLAY_MISMATCH'
    )
  })

  it('every existing reading of a composition runs on a 1.4.0 artifact', () => {
    // What each one says about third-party rows and the reserve is its own contract, with its own tests. Here: none
    // throws, and the ones that restate an amount of the quote restate the kernel's.
    const result = artifact.semantic.result
    const summary = summarizeComposition(result, artifact)
    const preview = projectCompositionPreview(result)
    const split = splitQuotedPrice(result, artifact, { tools: 'all' })
    const cash = readEngagementCash(result, artifact)

    const schedule = presentPaymentSchedule(result, artifact, [
      { id: 'm1', label: 'Inicio', share: '0.5' },
      { id: 'm2', label: 'Entrega', share: '0.5' }
    ])

    expect(summary.engineVersion).toBe(PRICING_V3_ENGINES['1.4.0'])
    expect(summary.totals).toEqual(result.quote.totals)
    expect(preview.net).toBe(result.quote.totals!.net)
    expect(compositionPreviewMarkdown(result)).toContain(result.quote.totals!.net)
    expect(assessCompositionReadiness(result).calculationStatus).toBe('calculated')
    expect(split.periods.length).toBe(1)
    expect(cash.ok).toBe(true)
    expect(schedule.ok).toBe(true)
    expect(commitmentExposure(artifact).calculationStatus).toBe('calculated')
    expect(explainResourceComposition(clone(artifact)).commercialAdjustments.rows).toHaveLength(rowsOf(full).length)
    expect(() =>
      quotePriceNotices(artifact, artifact.semantic.policy, artifact.semantic.demand.brief.quoteDate, {
        catalog: artifact.semantic.catalog,
        credits: artifact.semantic.credits
      })
    ).not.toThrow()
    // The internal name of a supplier is in no client-shaped view.
    expect(JSON.stringify([preview, compositionPreviewMarkdown(result)])).not.toContain(SUPPLIER)
  })
})

describe('replay of a 1.4.0 quote in the catalog lane', () => {
  const reserve = reserveRecord({}, { offerId: DESIGNER_OFFER, engagementForm: 'on_demand' })
  const cat = withRecords(designerCatalog14, [reserve])

  const input = brief({
    form: 'on_demand',
    costs: [cost('prod', 'production', '1000.00', { currency: 'USD', periodIds: [1, 3] })]
  })

  const artifact = runCatalogQuote(cat, input, '2026-10-09T00:00:00.000Z')

  it('verifies, and a touched evidence, rule or waiver is REPLAY_MISMATCH', () => {
    calculated(artifact.semantic.result)
    expect(enginesOf(artifact.semantic.result)).toEqual([PRICING_V3_ENGINES['1.4.0']])
    expect(replayCatalogQuote(clone(artifact)).replayDigest).toBe(artifact.replayDigest)

    const tamper = (edit: (copy: typeof artifact) => void) => {
      const copy = clone(artifact)

      edit(copy)

      return () => replayCatalogQuote(copy)
    }

    type FrozenBrief = { thirdPartyCosts: { evidence: Record<string, string> }[]; contingency?: unknown }

    expect(
      tamper(copy => ((copy.semantic.brief as FrozenBrief).thirdPartyCosts[0].evidence.status = 'estimated'))
    ).toThrow('REPLAY_MISMATCH')
    expect(
      tamper(copy => ((copy.semantic.brief as FrozenBrief).contingency = { kind: 'waived', reason: 'later' }))
    ).toThrow('REPLAY_MISMATCH')
    expect(
      tamper(
        copy =>
          ((copy.semantic.catalog.records.find(r => r.recordId === reserve.recordId)!.value as { base: string }).base =
            'own_costs')
      )
    ).toThrow('REPLAY_MISMATCH')
  })

  it('explain and comparison of the catalog lane run on it', () => {
    const explained = explainCatalogQuote(clone(artifact))

    const waived = runCatalogQuote(
      cat,
      { ...input, contingency: { kind: 'waived', reason: 'Closed scope.' } },
      '2026-10-09T00:00:00.000Z'
    )

    expect(explained.commercialAdjustments.rows).toHaveLength(quoteRows(artifact.semantic.result).length)
    expect(compareCatalogQuotes(artifact, waived).after).toMatchObject({
      contingencyReserve: '0.00',
      contingencyReserveWaived: amounts(artifact.semantic.result.totals).contingencyReserve
    })
  })
})

describe('CLI end to end with a 1.4.0 quote', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-third-party-reserve-'))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const cli = (...args: string[]) =>
    spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

  const file = (name: string, body: unknown) => {
    const path = join(dir, name)

    writeFileSync(path, JSON.stringify(body))

    return path
  }

  const reserve = reserveRecord({}, { offerId: MANAGED_OFFER, engagementForm: 'on_demand' })
  const catalogFile = file('catalog.json', withRecords(managedCatalog, [reserve]))
  const sources = ['--policy', operating('resources.review-v5'), '--credits', creditsPath]

  const costs = [
    cost('prod', 'production', '4500000'),
    cost('media', 'media', '3333333'),
    cost('stock', 'media', '8765432', { settlement: 'client_direct' })
  ]

  const demandFile = file('demand.json', demand({ form: 'on_demand', costs }))
  const out = join(dir, 'quote.artifact.json')
  const quote = cli('compose', 'quote', '--catalog', catalogFile, ...sources, '--input', demandFile, '--out', out)

  it('compose quote: exit 3, signed by 1.4.0, with the totals of both capabilities; replay verifies the artifact', () => {
    expect(quote.status).toBe(3)

    const body = JSON.parse(quote.stdout)

    expect(body.engineVersion).toBe('pricing-v3-local/1.4.0')
    expect(body.calculationStatus).toBe('calculated')
    expect(body.totals.thirdPartyCost).toBe('7833333')
    // 4.500.000 x 1,20 = 5.400.000 (a multiple already) and 3.333.333 at cost.
    expect(body.totals.thirdPartyNet).toBe('8733333')
    expect(BigInt(body.totals.contingencyReserve)).toBeGreaterThan(0n)
    expect(body.cashLedger.map((c: { key: string }) => c.key)).toEqual(
      expect.arrayContaining(['third-party:prod', 'third-party:media'])
    )

    const replay = cli('replay', '--input', out)

    expect(replay.status).toBe(3)
    expect(JSON.parse(replay.stdout)).toMatchObject({ verified: true, summary: { totals: body.totals } })
    for (const reading of [
      ['explain'],
      ['compose', 'assess'],
      ['compose', 'preview'],
      ['compose', 'split', '--tools', 'all'],
      ['compose', 'cash'],
      ['compose', 'commitments']
    ])
      expect(cli(...reading, '--input', out).status, reading.join(' ')).toBe(3)
  })

  it('a waived reserve: exit 3, the reserve at zero, the amount forgone and the review signal', () => {
    const waivedFile = file(
      'waived.demand.json',
      demand({ form: 'on_demand', costs, contingency: { kind: 'waived', reason: 'Closed scope.' } })
    )

    const waived = cli(
      'compose',
      'quote',
      '--catalog',
      catalogFile,
      ...sources,
      '--input',
      waivedFile,
      '--out',
      join(dir, 'waived.artifact.json')
    )

    const body = JSON.parse(waived.stdout)

    expect(waived.status).toBe(3)
    expect(body.totals.contingencyReserve).toBe('0')
    expect(body.totals.contingencyReserveWaived).toBe(JSON.parse(quote.stdout).totals.contingencyReserve)
    expect(body.reviewSignals).toContainEqual(
      expect.objectContaining({ code: 'CONTINGENCY_RESERVE_WAIVED', severity: 'review' })
    )
  })

  it('tampered evidence in the artifact is rejected by every reader', () => {
    const tampered = read(out)

    tampered.semantic.demand.brief.thirdPartyCosts[0].evidence.effectiveUntil = '2027-12-31'

    const path = file('tampered.artifact.json', tampered)

    for (const reading of [
      ['replay'],
      ['explain'],
      ['compose', 'assess'],
      ['compose', 'preview'],
      ['compose', 'cash']
    ]) {
      const run = cli(...reading, '--input', path)

      expect(run.status, reading.join(' ')).toBe(1)
      expect(run.stdout).toBe('')
      expect(JSON.parse(run.stderr).error.code).toBe('REPLAY_MISMATCH')
    }
  })

  it('a category without a rule and a waiver without a reserve: exit 2, no totals, the diagnostic names the field', () => {
    const noRule = cli(
      'compose',
      'prepare',
      '--catalog',
      catalogFile,
      ...sources,
      '--input',
      file('no-rule.json', demand({ costs: [cost('x', 'licences', '1000')] }))
    )

    const noReserve = cli(
      'compose',
      'prepare',
      '--catalog',
      catalogFile,
      ...sources,
      '--input',
      file('no-reserve.json', demand({ contingency: { kind: 'waived', reason: 'x' } }))
    )

    for (const [run, diagnostic] of [
      [noRule, { code: 'MISSING_CATALOG_SELECTION', path: 'thirdPartyCosts.x.policy', candidates: [] }],
      [noReserve, { code: 'CONTINGENCY_WAIVER_WITHOUT_RESERVE', path: 'contingency' }]
    ] as const) {
      expect(run.status).toBe(2)
      expect(JSON.parse(run.stdout).totals).toBeNull()
      expect(JSON.parse(run.stdout).diagnostics).toContainEqual(diagnostic)
    }
  })

  it('catalog search and show read both kinds; an unknown kind is still refused', () => {
    const policies = JSON.parse(
      cli('catalog', 'search', '--catalog', catalogFile, '--kind', 'third_party_policy').stdout
    )

    const shown = cli(
      'catalog',
      'show',
      '--catalog',
      catalogFile,
      '--kind',
      'contingency_reserve',
      '--query',
      reserve.recordId
    )

    const unknown = cli('catalog', 'search', '--catalog', catalogFile, '--kind', 'third_party')

    expect(policies.candidates.map((r: { recordId: string }) => r.recordId)).toEqual(POLICIES.map(r => r.recordId))
    expect(shown.status).toBe(0)
    expect(JSON.parse(shown.stdout)).toMatchObject({
      resolution: 'candidate',
      candidates: [{ recordId: reserve.recordId, value: reserve.value }]
    })
    expect(unknown.status).toBe(1)
    expect(JSON.parse(unknown.stderr).error).toMatchObject({ code: 'INVALID_ARGUMENT', option: 'kind' })
  })

  it('catalog lane: prepare declares 1.4.0, quote carries the totals, replay verifies', () => {
    const designerFile = file('designer.catalog.json', designerCatalog14)

    const briefFile = file(
      'designer.brief.json',
      brief({ costs: [cost('media', 'media', '333.33', { currency: 'USD', quantity: '3', periodIds: [2] })] })
    )

    const prepared = cli('prepare', '--catalog', designerFile, '--input', briefFile)

    const quoted = cli(
      'quote',
      '--catalog',
      designerFile,
      '--input',
      briefFile,
      '--out',
      join(dir, 'designer.artifact.json')
    )

    expect(prepared.status).toBe(0)
    expect(
      JSON.parse(prepared.stdout).inputs.map(
        (p: { input: { request: { schemaVersion: string } } }) => p.input.request.schemaVersion
      )
    ).toEqual(['1.4.0', '1.4.0', '1.4.0'])
    expect(JSON.parse(quoted.stdout).totals).toMatchObject({ thirdPartyCost: '999.99', thirdPartyNet: '999.99' })
    expect(cli('replay', '--input', join(dir, 'designer.artifact.json')).status).toBe(quoted.status)
    expect(JSON.parse(cli('replay', '--input', join(dir, 'designer.artifact.json')).stdout).verified).toBe(true)
  })
})
