// Readers of a contract 1.4.0 quote (third-party costs of an engagement, contingency reserve): the summary of a
// composition (`resources/summary.ts`: own work, third-party costs, the reserve and the estimate exposure) and the
// explanation (`catalog/explain.ts`, `adapters/catalog-local.ts`: cost breakdown, commercial adjustments, references).
//
// These readers derive from the frozen result and recalculate nothing. What a reading must say is therefore never
// taken from a previous run of a reader. It comes from one of four places:
//   - the kernel rows of the same quote, added up here (the arithmetic of a row is the kernel's and is tested in
//     `pricing-v3-third-party-reserve.test.ts`);
//   - the same demand quoted WITHOUT the capability, or with one declared datum changed (differential runs);
//   - the quote composed again with one input 10 % higher, the real verifier of the exposure, as in
//     `pricing-v3-estimate-exposure.test.ts`;
//   - what the demand declares.
//
// Catalogs and demands are built in memory from the committed fixtures; nothing is written under data/. The rates
// used here are not the ones the catalog issues: nothing may depend on a particular category or percentage.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import DecimalJs from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { explainCatalogQuote, runCatalogQuote } from '../adapters/catalog-local'
import { explainResourceComposition, runResourceComposition } from '../adapters/resource-composition'
import { explainCommercialAdjustments, explainCostComponents } from '../catalog/explain'
import { composeResourceQuote } from '../resources/composition'
import {
  costInputExposure,
  estimateExposure,
  readContingencyReserve,
  readOwnWork,
  readThirdPartyCosts,
  summarizeComposition
} from '../resources/summary'
import { PRICING_V3_ENGINES } from '../schemas'

const D = DecimalJs.clone({ precision: 120, rounding: DecimalJs.ROUND_HALF_UP })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => read(`data/pricing/v3-operating/${name}.json`)

type Composition = ReturnType<typeof composeResourceQuote>
type Source = { status: string; effectiveFrom: string; effectiveUntil: string }

type CatalogDoc = {
  records: { kind: string; recordId: string; source: Source; value: Record<string, unknown> }[]
}

type CostDoc = Record<string, unknown> & { costId: string; amount: string; currency: string; quantity: string }

type DemandDoc = {
  brief: Record<string, unknown> & {
    quoteDate: string
    offerId: string
    outputCurrency: string
    periods: number
    thirdPartyCosts?: CostDoc[]
  }
  allocations: { periodId: number }[]
}

type Row = Record<string, string> & {
  lineId: string
  parentLineId: string
  kind: string
  periodId: number
  components: { componentId: string; kind: string; cost: string; price: string; trace: Record<string, string> }[]
}

// One period in CLP for a client in Chile; the catalog calculates in USD, rounds CLP commercially and holds an
// EUR -> USD record, so a supplier can charge in the output currency, in the calculation currency or in a third one.
// Its person costs are not localized, which the resolver judges estimated: the people of this quote are estimated.
const catalogV4: CatalogDoc = operating('catalog.review-v4')
const managed: DemandDoc = operating('managed-care.demand')

// One period in COP for a client in Colombia: a market factor under 1 that declares its floor on the base market
// (contract 1.2.0), confirmed person costs and an estimated talent factor.
const catalogV5: CatalogDoc = operating('catalog.review-v5')
const colombia: DemandDoc = operating('managed-care-colombia.demand')

const policy = operating('resources.review-v5')
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')

// ---- fixtures: records ----

const recordSource = (status = 'confirmed') => ({
  reference: 'third-party-readers-test',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '9999-12-31',
  status
})

const policyRecord = (
  category: string,
  value: { method?: string; rate: string; minimumMargin?: string; rounding?: string },
  status = 'confirmed'
) => ({
  recordId: `third-party:${category}`,
  revision: 1,
  kind: 'third_party_policy',
  source: recordSource(status),
  note: 'Price rule of a category of third-party cost, declared for the test.',
  value: {
    category,
    label: `Categoría ${category}`,
    method: value.method ?? 'markup',
    rate: value.rate,
    minimumMargin: value.minimumMargin ?? '0',
    rounding: value.rounding ?? 'none'
  }
})

const reserveRecord = (offerId: string, rate: string, base: 'human' | 'own_costs', status = 'confirmed') => ({
  recordId: `contingency:${offerId}:on_demand`,
  revision: 3,
  kind: 'contingency_reserve',
  source: recordSource(status),
  note: 'Contingency reserve, declared for the test.',
  value: { label: 'Reserva de contingencia', rate, base, offerId, engagementForm: 'on_demand' }
})

const formRecord = (form: string, priceRatio: string) => ({
  recordId: `engagement:${form}`,
  revision: 1,
  kind: 'engagement_factor',
  source: recordSource(),
  note: 'Price ratio of a form of engagement, declared for the test.',
  value: { form, priceRatio }
})

// The committed EUR -> USD record is a daily reference in force on its own day only.
const fxRecord = (from: string, to: string, rate: string) => ({
  recordId: `fx:${from}:${to}:test`,
  revision: 1,
  kind: 'fx',
  source: recordSource(),
  note: 'FX record declared for the test.',
  value: { from, to, rate }
})

const POLICIES = (status = 'confirmed') => [
  policyRecord('production', { rate: '0.20', minimumMargin: '0.10', rounding: 'commercial' }, status),
  policyRecord('printing', { method: 'target_margin', rate: '0.25', minimumMargin: '0.20' }, status),
  policyRecord('talent', { rate: '0.07', minimumMargin: '0.03', rounding: 'commercial' }, status),
  policyRecord('media', { rate: '0' }, status)
]

const withRecords = (cat: CatalogDoc, records: unknown[]) => {
  const next = clone(cat)

  next.records.push(...(clone(records) as CatalogDoc['records']))

  return next
}

const FORMS = [formRecord('on_going', '1'), formRecord('on_demand', '1.10')]
const MANAGED_OFFER = managed.brief.offerId
const RATE = '0.15'

// The rules of four categories and two forms of engagement, and no reserve.
const EUR_USD = fxRecord('EUR', 'USD', '1.12')
const plainCatalog = withRecords(catalogV4, [...POLICIES(), ...FORMS, EUR_USD])

const reserved = (base: 'human' | 'own_costs', status = 'confirmed', cat = plainCatalog) =>
  withRecords(cat, [reserveRecord(MANAGED_OFFER, RATE, base, status)])

// ---- fixtures: demands ----

// Appear only in the brief. Neither the name of a supplier nor the reference of its quote belongs in the summary.
const SUPPLIER = 'Proveedor-Sentinela-7731'
const EVIDENCE_REFERENCE = 'supplier-quote:sentinela-evidencia-4409'

const evidence = (status = 'confirmed') => ({
  reference: EVIDENCE_REFERENCE,
  effectiveFrom: '2026-10-01',
  effectiveUntil: '2026-12-31',
  status
})

const cost = (costId: string, category: string, amount: string, extra: Record<string, unknown> = {}): CostDoc => ({
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

// Every amount takes 10 % more within the decimals of its currency, so the verifier can raise it.
const PROD = cost('prod', 'production', '4500000')
const VOICE = cost('voice', 'talent', '1250.50', { currency: 'USD', quantity: '2' })
const PRINT = cost('print', 'printing', '800.40', { currency: 'EUR' })
const MEDIA = cost('media', 'media', '3333330', { evidence: evidence('estimated') })

// Paid by the client to the supplier, one with evidence and one without: notes of the brief.
const STOCK = cost('stock', 'licences', '8765432.10', { settlement: 'client_direct', currency: 'USD', quantity: '3' })
const FONTS = cost('fonts', 'licences', '777777', { settlement: 'client_direct', evidence: undefined })

const REINVOICED = [PROD, VOICE, PRINT, MEDIA]
const DIRECT = [STOCK, FONTS]

type BriefExtra = { costs?: CostDoc[]; contingency?: unknown; form?: string; periods?: number }

const demandOf = (base: DemandDoc, extra: BriefExtra = {}): DemandDoc => {
  const next = clone(base)

  if (extra.costs) next.brief.thirdPartyCosts = clone(extra.costs)
  if (extra.contingency) next.brief.contingency = extra.contingency
  if (extra.form) next.brief.engagementForm = extra.form

  if (extra.periods) {
    next.brief.periods = extra.periods
    next.allocations = Array.from({ length: extra.periods }, (_, i) =>
      base.allocations.map(a => ({ ...a, periodId: i + 1 }))
    ).flat()
  }

  return next
}

const demand = (extra: BriefExtra = {}) => demandOf(managed, { form: 'on_demand', ...extra })
const compose = (cat: unknown, input: unknown) => composeResourceQuote(cat, policy, credits, input)
const IDENTITY = { calculationId: 'third-party-readers-test' }
const summaryOf = (r: Composition) => summarizeComposition(r, IDENTITY)

/** A quote that must calculate. */
const calculated = (r: Composition) => {
  expect(r.quote.diagnostics).toEqual([])
  expect(r.quote.calculationStatus).toBe('calculated')

  return r
}

const rowsOf = (r: Composition) => r.quote.periods.flatMap(p => p.result.lines) as unknown as Row[]
const teamRows = (r: Composition) => rowsOf(r).filter(row => row.kind !== 'third_party')
const thirdPartyRows = (r: Composition) => rowsOf(r).filter(row => row.kind === 'third_party')
const totalsOf = (r: Composition) => r.quote.totals as unknown as Record<string, string>
const enginesOf = (r: Composition) => [...new Set(r.quote.periods.map(p => p.result.engineVersion))]
const sum = (values: string[]) => values.reduce((total, value) => total.plus(value), new D(0))
const scaleOf = (r: Composition) => totalsOf(r).cost.split('.')[1]?.length ?? 0
const unitOf = (r: Composition) => new D(10).pow(-scaleOf(r))
const eq = (a: DecimalJs.Value, b: DecimalJs.Value) => new D(a).eq(b)

/** One currency unit per row and one for the reading itself: the kernel rounds cost once per row. */
const toleranceOf = (r: Composition) => unitOf(r).mul(rowsOf(r).length + 1)

const within = (a: DecimalJs.Value, b: DecimalJs.Value, tolerance: DecimalJs.Value) =>
  new D(a).minus(b).abs().lte(tolerance)

const inputOf = (r: Composition, kind: string, id: string) =>
  costInputExposure(r)!.costInputs.find(i => i.kind === kind && i.id === id)

// The quote most cases read: four re-invoiced costs, two the client pays, a reserve on the person cost, on demand.
const full = compose(reserved('human'), demand({ costs: [...REINVOICED, ...DIRECT] }))
// The same demand with one capability taken out at a time.
const noDirect = compose(reserved('human'), demand({ costs: REINVOICED }))
const noCosts = compose(reserved('human'), demand())
const noReserve = compose(plainCatalog, demand({ costs: REINVOICED }))
const neither = compose(plainCatalog, demand())

describe('the premise: the fixtures calculate on the contract each one must be', () => {
  it('a re-invoiced cost or a selected reserve is 1.4.0; the same demand without either is 1.3.0', () => {
    for (const r of [full, noDirect, noCosts, noReserve]) {
      calculated(r)
      expect(enginesOf(r)).toEqual([PRICING_V3_ENGINES['1.4.0']])
    }

    expect(enginesOf(calculated(neither))).toEqual([PRICING_V3_ENGINES['1.3.0']])
  })

  it('the quote has team rows with a reserve and one row per re-invoiced cost, in three supplier currencies', () => {
    expect(thirdPartyRows(full).map(row => row.parentLineId)).toEqual(REINVOICED.map(c => c.costId))
    expect(teamRows(full).length).toBeGreaterThan(1)
    expect(new D(totalsOf(full).contingencyReserve).gt(0)).toBe(true)
    expect(new Set(REINVOICED.map(c => c.currency)).size).toBe(3)
    expect(REINVOICED.map(c => c.currency)).toContain(full.quote.resolution.brief!.outputCurrency)
  })
})

describe('own work and third-party costs reconcile with the totals of the quote', () => {
  const summary = summaryOf(full)
  const totals = totalsOf(full)
  const ownWork = summary.ownWork!
  const reinvoiced = summary.thirdParty!.reinvoiced!

  it('own work plus what is re-invoiced is the quote, in cost, net and margin, to the unit', () => {
    expect(eq(new D(ownWork.cost).plus(reinvoiced.cost), totals.cost)).toBe(true)
    expect(eq(new D(ownWork.net).plus(reinvoiced.net), totals.net)).toBe(true)
    expect(eq(new D(ownWork.marginAmount).plus(reinvoiced.marginAmount), totals.marginAmount)).toBe(true)
  })

  it('each side is the sum of its own kernel rows', () => {
    expect(eq(ownWork.cost, sum(teamRows(full).map(row => row.cost)))).toBe(true)
    expect(eq(ownWork.net, sum(teamRows(full).map(row => row.net)))).toBe(true)
    expect(eq(ownWork.marginAmount, sum(teamRows(full).map(row => row.marginAmount)))).toBe(true)
    expect(reinvoiced.cost).toBe(totals.thirdPartyCost)
    expect(reinvoiced.net).toBe(totals.thirdPartyNet)
    expect(eq(reinvoiced.cost, sum(thirdPartyRows(full).map(row => row.cost)))).toBe(true)
    expect(eq(reinvoiced.net, sum(thirdPartyRows(full).map(row => row.net)))).toBe(true)
    expect(eq(reinvoiced.marginAmount, sum(thirdPartyRows(full).map(row => row.marginAmount)))).toBe(true)
  })

  it('the rows of the reading add up to it, each with the price walk the kernel stored', () => {
    expect(reinvoiced.rows.map(row => row.costId)).toEqual(REINVOICED.map(c => c.costId))
    expect(
      eq(sum(reinvoiced.rows.map(row => new D(row.cost).mul(row.periodIds.length).toString())), totals.thirdPartyCost)
    ).toBe(true)
    expect(
      eq(sum(reinvoiced.rows.map(row => new D(row.net).mul(row.periodIds.length).toString())), totals.thirdPartyNet)
    ).toBe(true)

    for (const row of reinvoiced.rows) {
      const kernel = thirdPartyRows(full).find(k => k.parentLineId === row.costId)!

      expect(row).toMatchObject({
        cost: kernel.cost,
        undiscountedPrice: kernel.undiscountedPrice,
        roundingAdjustment: kernel.roundingAdjustment,
        discount: kernel.discount,
        uplift: kernel.uplift,
        net: kernel.net,
        marginAmount: kernel.marginAmount,
        minimumMargin: kernel.minimumMargin,
        floorNet: kernel.floorNet
      })
      // The walk closes on the row itself.
      expect(eq(new D(row.undiscountedPrice).plus(row.uplift).minus(row.discount), row.net)).toBe(true)
      expect(eq(new D(row.net).minus(row.cost), row.marginAmount)).toBe(true)
    }
  })

  it('a row says what the demand declared, the rule of its category and the evidence of its amount', () => {
    for (const declared of REINVOICED) {
      const row = reinvoiced.rows.find(r => r.costId === declared.costId)!
      const rule = POLICIES().find(p => p.value.category === declared.category)!

      expect(row).toMatchObject({
        label: declared.label,
        category: declared.category,
        quantity: declared.quantity,
        supplierAmount: declared.amount,
        supplierCurrency: declared.currency,
        policy: {
          method: rule.value.method,
          rate: rule.value.rate,
          rounding: rule.value.rounding,
          recordId: rule.recordId,
          revision: rule.revision,
          sourceStatus: 'confirmed'
        }
      })
      expect(row.evidence).toEqual({
        status: (declared.evidence as Source).status,
        effectiveFrom: (declared.evidence as Source).effectiveFrom,
        effectiveUntil: (declared.evidence as Source).effectiveUntil
      })
    }

    expect(reinvoiced.rows.find(r => r.costId === 'media')!.evidence!.status).toBe('estimated')
    expect(reinvoiced.rows.find(r => r.costId === 'prod')!.evidence!.status).toBe('confirmed')
  })

  it('the margin of own work is the one of its rows, and the blended margin stays the real one of the whole quote', () => {
    const exact = new D(ownWork.marginAmount).div(ownWork.net)
    const blended = new D(totals.marginAmount).div(totals.net)

    expect(ownWork.marginRateRoundedDown).toBe(exact.toDecimalPlaces(6, D.ROUND_FLOOR).toFixed(6))
    expect(summary.marginRateRoundedDown).toBe(blended.toDecimalPlaces(6, D.ROUND_FLOOR).toFixed(6))
    // The premise that makes the two worth telling apart: what is re-invoiced dilutes the blended margin.
    expect(new D(reinvoiced.marginAmount).div(reinvoiced.net).lt(exact)).toBe(true)
    expect(new D(summary.marginRateRoundedDown!).lt(ownWork.marginRateRoundedDown!)).toBe(true)
  })

  it('own work reads exactly as the same quote without third-party costs', () => {
    const alone = totalsOf(noCosts)

    expect(readOwnWork(full)).toEqual(readOwnWork(noCosts))
    expect(ownWork).toMatchObject({ cost: alone.cost, net: alone.net, marginAmount: alone.marginAmount })
    expect(ownWork.marginRateRoundedDown).toBe(summaryOf(noCosts).marginRateRoundedDown)
    // A quote that re-invoices nothing has no third-party block, and its own work is the whole of it.
    expect(summaryOf(noCosts)).not.toHaveProperty('thirdParty')
  })

  it('the share of the net is the one of the amounts shown', () => {
    expect(within(reinvoiced.shareOfNet!, new D(reinvoiced.net).div(totals.net), '0.000001')).toBe(true)
    expect(new D(reinvoiced.shareOfNet!).gt(0) && new D(reinvoiced.shareOfNet!).lt(1)).toBe(true)
  })

  it('a cost charged in several periods is one row of the reading and counts once per period', () => {
    const both = cost('retainer', 'production', '1200000', { periodIds: [1, 2] })
    const second = cost('launch', 'media', '900000', { periodIds: [2] })
    const r = calculated(compose(reserved('human'), demand({ periods: 2, costs: [both, second] })))
    const reading = readThirdPartyCosts(r)!.reinvoiced!

    expect(r.quote.periods).toHaveLength(2)
    expect(reading.rows.map(row => [row.costId, row.periodIds])).toEqual([
      ['retainer', [1, 2]],
      ['launch', [2]]
    ])
    expect(eq(sum(reading.rows.map(row => new D(row.cost).mul(row.periodIds.length).toString())), reading.cost)).toBe(
      true
    )
    expect(eq(sum(reading.rows.map(row => new D(row.net).mul(row.periodIds.length).toString())), reading.net)).toBe(
      true
    )
    expect(reading.cost).toBe(totalsOf(r).thirdPartyCost)
    expect(eq(new D(readOwnWork(r)!.net).plus(reading.net), totalsOf(r).net)).toBe(true)
  })
})

describe('costs the client pays to the supplier are listed as declared and are in no total', () => {
  const withDirect = summaryOf(full)
  const withoutDirect = summaryOf(noDirect)

  it('they are listed with what the demand declares', () => {
    expect(withDirect.thirdParty!.clientDirect).toEqual(
      DIRECT.map(declared => ({
        costId: declared.costId,
        label: declared.label,
        category: declared.category,
        amount: declared.amount,
        currency: declared.currency,
        quantity: declared.quantity,
        periodIds: declared.periodIds,
        evidence: declared.evidence
          ? {
              status: (declared.evidence as Source).status,
              effectiveFrom: (declared.evidence as Source).effectiveFrom,
              effectiveUntil: (declared.evidence as Source).effectiveUntil
            }
          : null
      }))
    )
    expect(withoutDirect.thirdParty!.clientDirect).toEqual([])
  })

  it('not one other key of the summary moves when they are declared', () => {
    const { clientDirect: listed, ...thirdParty } = withDirect.thirdParty!
    const { clientDirect: none, ...baseline } = withoutDirect.thirdParty!

    expect(listed).toHaveLength(DIRECT.length)
    expect(none).toEqual([])
    expect({ ...withDirect, thirdParty }).toEqual({ ...withoutDirect, thirdParty: baseline })
  })

  it('declared alone they keep the quote on its earlier contract: listed, with nothing re-invoiced and no own work apart', () => {
    const r = calculated(compose(plainCatalog, demand({ costs: DIRECT })))
    const summary = summaryOf(r)
    const { thirdParty, ...rest } = summary

    expect(enginesOf(r)).toEqual([PRICING_V3_ENGINES['1.3.0']])
    expect(thirdParty!.clientDirect.map(c => c.costId)).toEqual(DIRECT.map(c => c.costId))
    expect(thirdParty).not.toHaveProperty('reinvoiced')
    expect(thirdParty!.fxExposed).toEqual([])
    expect(summary).not.toHaveProperty('ownWork')
    expect(summary).not.toHaveProperty('contingencyReserve')
    // Everything else is the summary of the same demand without them.
    expect(rest).toEqual(summaryOf(neither))
  })
})

describe('FX exposure of third-party costs', () => {
  it('names the re-invoiced costs whose supplier does not charge in the currency of the quote, and only those', () => {
    const output = full.quote.resolution.brief!.outputCurrency

    expect(summaryOf(full).thirdParty!.fxExposed).toEqual(
      REINVOICED.filter(c => c.currency !== output).map(c => c.costId)
    )
    expect(summaryOf(full).thirdParty!.fxExposed).toEqual(['voice', 'print'])
    // A cost the client pays in another currency exposes the client, not the quote.
    expect(STOCK.currency).not.toBe(output)
  })

  it('a converted row says the path and the rate it was priced at; a row in the currency of the quote has neither', () => {
    const rows = summaryOf(full).thirdParty!.reinvoiced!.rows
    const row = (costId: string) => rows.find(r => r.costId === costId)! as Record<string, unknown>

    expect(row('prod')).not.toHaveProperty('fxPath')
    expect(row('media')).not.toHaveProperty('fxRate')
    expect(row('voice').fxPath).toBe('USD>CLP')
    expect(row('print').fxPath).toBe('EUR>USD>CLP')

    // The rate is the one the kernel priced the cost with: supplier amount x quantity x rate is the cost of the row.
    for (const costId of ['voice', 'print']) {
      const declared = REINVOICED.find(c => c.costId === costId)!
      const raw = new D(declared.amount).mul(declared.quantity).mul(row(costId).fxRate as string)

      expect(within(raw, row(costId).cost as string, unitOf(full))).toBe(true)
    }
  })

  it('the exposure puts on each FX record the cost of the rows converted with it', () => {
    const delta = (id: string) =>
      new D(inputOf(full, 'fx', id)?.costAtRisk ?? 0).minus(inputOf(noCosts, 'fx', id)?.costAtRisk ?? 0)

    const rowCost = (costId: string) => thirdPartyRows(full).find(row => row.parentLineId === costId)!.cost

    // EUR reaches the quote through the calculation currency: both records carry it. USD only the second.
    expect(inputOf(noCosts, 'fx', 'EUR:USD')).toBeUndefined()
    expect(eq(delta('EUR:USD'), rowCost('print'))).toBe(true)
    expect(within(delta('USD:CLP'), new D(rowCost('print')).plus(rowCost('voice')), toleranceOf(full))).toBe(true)
    expect(inputOf(full, 'fx', 'EUR:USD')!.lineIds).toEqual(['print'])
    expect(inputOf(full, 'fx', 'USD:CLP')!.lineIds).toEqual(expect.arrayContaining(['voice', 'print']))
    // A supplier in the currency of the quote is converted by nothing.
    expect(inputOf(full, 'fx', 'USD:CLP')!.lineIds).not.toContain('prod')
    expect(inputOf(full, 'fx', 'USD:CLP')!.lineIds).not.toContain('media')
  })
})

describe('the contingency reserve block', () => {
  const summary = summaryOf(full)
  const block = summary.contingencyReserve!
  const totals = totalsOf(full)

  it('is the record selected, with the amounts of the kernel', () => {
    const record = reserveRecord(MANAGED_OFFER, RATE, 'human')

    expect(block).toMatchObject({
      rate: RATE,
      base: 'human',
      amount: totals.contingencyReserve,
      baseAmount: totals.contingencyBase,
      waived: false,
      recordId: record.recordId,
      revision: record.revision,
      scope: { offerId: MANAGED_OFFER, engagementForm: 'on_demand' },
      sourceStatus: 'confirmed'
    })
    expect(block).not.toHaveProperty('waiverReason')
    expect(block).not.toHaveProperty('waivedAmount')
  })

  it('the base is the person cost of the team rows and the amount is the rate over it, at the precision shown', () => {
    const personCost = sum(
      teamRows(full).map(row =>
        sum(
          row.components.filter(c => c.kind === 'human').map(c => new D(c.cost).mul(c.trace.outputFx).toString())
        ).toFixed(scaleOf(full))
      )
    )

    expect(eq(block.baseAmount!, personCost)).toBe(true)
    // Both are sums of rows presented at the currency unit.
    expect(within(block.amount!, new D(RATE).mul(block.baseAmount!), unitOf(full).mul(teamRows(full).length))).toBe(
      true
    )
    expect(eq(block.amount!, sum(teamRows(full).map(row => row.contingencyReserve)))).toBe(true)
    expect(new D(block.amount!).gt(unitOf(full).mul(1000))).toBe(true)
  })

  it('it is cost of own work: taking it out gives the cost of the same quote without a reserve', () => {
    expect(eq(new D(summary.ownWork!.cost).minus(block.amount!), sum(teamRows(noReserve).map(row => row.cost)))).toBe(
      true
    )
    expect(summaryOf(noReserve)).not.toHaveProperty('contingencyReserve')
    expect(within(block.shareOfNet!, new D(block.amount!).div(totals.net), '0.000001')).toBe(true)
  })

  it('with base own_costs the base is every cost of the team rows and never a third-party cost', () => {
    const r = calculated(compose(reserved('own_costs'), demand({ costs: REINVOICED })))
    const reading = readContingencyReserve(r)!

    expect(reading.base).toBe('own_costs')
    expect(eq(reading.baseAmount!, totalsOf(calculated(neither)).cost)).toBe(true)
    expect(eq(reading.baseAmount!, new D(readOwnWork(r)!.cost).minus(reading.amount!))).toBe(true)
    expect(within(reading.amount!, new D(RATE).mul(reading.baseAmount!), unitOf(r).mul(teamRows(r).length))).toBe(true)
  })

  it('a record that names nothing says so in its scope', () => {
    const general = withRecords(plainCatalog, [
      {
        ...reserveRecord(MANAGED_OFFER, RATE, 'human'),
        recordId: 'contingency:general',
        value: { label: 'Reserva de contingencia', rate: RATE, base: 'human' }
      }
    ])

    expect(readContingencyReserve(calculated(compose(general, demand())))!.scope).toEqual({
      offerId: null,
      engagementForm: null
    })
  })
})

describe('a waived reserve', () => {
  const reason = 'Alcance cerrado línea por línea con el cliente.'

  const waived = calculated(
    compose(reserved('human'), demand({ costs: REINVOICED, contingency: { kind: 'waived', reason } }))
  )

  const block = summaryOf(waived).contingencyReserve!

  it('says it is waived, with the reason of the demand and the amount forgone, and amounts to zero', () => {
    expect(block).toMatchObject({ waived: true, waiverReason: reason, rate: RATE, base: 'human' })
    expect(eq(block.amount!, 0)).toBe(true)
    expect(eq(block.baseAmount!, 0)).toBe(true)
    expect(eq(block.shareOfNet!, 0)).toBe(true)
    // What it would have been: the reserve of the same quote without the waiver.
    expect(block.waivedAmount).toBe(summaryOf(noDirect).contingencyReserve!.amount)
    expect(block.waivedAmount).toBe(totalsOf(waived).contingencyReserveWaived)
    expect(new D(block.waivedAmount!).gt(0)).toBe(true)
  })

  it('own work then costs what it costs without a reserve, and the review signal is in the summary', () => {
    expect(readOwnWork(waived)!.cost).toBe(readOwnWork(noReserve)!.cost)
    expect(summaryOf(waived).reviewSignals.map(s => s.code)).toContain('CONTINGENCY_RESERVE_WAIVED')
    expect(summaryOf(noDirect).reviewSignals.map(s => s.code)).not.toContain('CONTINGENCY_RESERVE_WAIVED')
  })
})

describe('while the quote has no totals the blocks say what was declared and selected, with no amount', () => {
  // A category without a rule withholds the quote: nothing was calculated, so there is no amount to read.
  const blocked = compose(
    reserved('human'),
    demand({ costs: [PROD, cost('rights', 'no-such-category', '100000'), STOCK] })
  )

  const summary = summaryOf(blocked)

  it('the premise: the quote is withheld by the missing rule', () => {
    expect(blocked.quote.calculationStatus).toBe('needs_input')
    expect(blocked.quote.totals).toBeNull()
    expect(summary.diagnostics.map(d => d.path)).toEqual(['thirdPartyCosts.rights.policy'])
  })

  it('nothing re-invoiced is priced, what the client pays is still listed, and the reserve has no amount', () => {
    expect(summary.thirdParty).toMatchObject({ reinvoiced: null, fxExposed: [] })
    expect(summary.thirdParty!.clientDirect.map(c => c.costId)).toEqual(['stock'])
    expect(summary.contingencyReserve).toMatchObject({
      rate: RATE,
      base: 'human',
      amount: null,
      baseAmount: null,
      shareOfNet: null,
      waived: false
    })
    expect(summary).not.toHaveProperty('ownWork')
    expect(summary.marginRateRoundedDown).toBeNull()
    expect(summary.estimateExposure).toBeNull()
  })
})

describe('estimate exposure of a 1.4.0 quote', () => {
  const cases = [
    { name: 'reserve on the person cost', r: noDirect, cat: reserved('human'), input: demand({ costs: REINVOICED }) },
    {
      name: 'reserve on every own cost',
      r: compose(reserved('own_costs'), demand({ costs: REINVOICED })),
      cat: reserved('own_costs'),
      input: demand({ costs: REINVOICED })
    },
    { name: 'third-party costs and no reserve', r: noReserve, cat: plainCatalog, input: demand({ costs: REINVOICED }) }
  ]

  it.each(cases)(
    '$name: every cost component rests on an input, and estimated plus confirmed is the total',
    ({ r }) => {
      const map = costInputExposure(calculated(r))!
      const reading = estimateExposure(r)!

      expect(map.unmappedComponents).toBe(0)
      expect(reading).not.toHaveProperty('unmappedComponents')
      expect(reading.totalCost).toBe(totalsOf(r).cost)
      expect(eq(new D(reading.estimatedCost).plus(reading.confirmedCost), totalsOf(r).cost)).toBe(true)
      expect(new D(reading.confirmedCost).gte(0)).toBe(true)
      for (const input of map.costInputs) expect(new D(input.costAtRisk).lte(totalsOf(r).cost)).toBe(true)
    }
  )

  // The real verifier. Raising one input 10 % where an operator would edit it (the amount of the supplier in the
  // demand, the cost record or the FX record in the catalog) and composing again must move the cost of the quote by
  // 10 % of the cost the reading put on that input. With a reserve, that includes the reserve it carries.
  it.each(cases)('$name: 10 % more on an input moves cost by 10 % of its cost at risk', ({ r, cat, input }) => {
    const base = calculated(r)
    const up = (value: string, decimals = 18) => new D(value).mul('1.1').toDecimalPlaces(decimals).toString()
    const date = input.brief.quoteDate

    const verified = costInputExposure(base)!.costInputs.filter(i =>
      ['third_party', 'person_cost', 'fx'].includes(i.kind)
    )

    expect([...new Set(verified.map(i => i.kind))].sort()).toEqual(['fx', 'person_cost', 'third_party'])

    for (const target of verified) {
      const nextCatalog = clone(cat)
      const nextDemand = clone(input)

      const inForce = (match: (record: CatalogDoc['records'][number]) => boolean) => {
        const records = nextCatalog.records.filter(
          record => record.source.effectiveFrom <= date && date <= record.source.effectiveUntil && match(record)
        )

        expect(records.length, `${target.kind} ${target.id}: a record in force`).toBeGreaterThan(0)

        return records
      }

      if (target.kind === 'third_party') {
        const declared = nextDemand.brief.thirdPartyCosts!.find(c => c.costId === target.id)!

        declared.amount = up(declared.amount)
      } else if (target.kind === 'person_cost') {
        for (const record of inForce(candidate => candidate.kind === 'cost' && candidate.recordId === target.recordId))
          for (const component of record.value.components as { amount: string }[])
            component.amount = up(component.amount)
      } else {
        const [from, to] = target.id.split(':')

        for (const record of inForce(c => c.kind === 'fx' && c.value.from === from && c.value.to === to))
          record.value.rate = up(record.value.rate as string)
      }

      const moved = compose(nextCatalog, nextDemand)
      const expected = new D(target.costAtRisk).mul('0.10')
      const label = `${target.kind} ${target.id}`

      expect(moved.quote.calculationStatus, label).toBe('calculated')
      // The check has teeth: what it expects is far outside its own tolerance.
      expect(expected.gt(toleranceOf(base).mul(10)), label).toBe(true)
      expect(within(new D(totalsOf(moved).cost).minus(totalsOf(base).cost), expected, toleranceOf(base)), label).toBe(
        true
      )
    }
  })

  it('a third-party cost is an input of its own: the whole of its row, with the status of its evidence', () => {
    const map = costInputExposure(full)!

    for (const declared of REINVOICED) {
      const input = map.costInputs.find(i => i.kind === 'third_party' && i.id === declared.costId)!
      const row = thirdPartyRows(full).find(k => k.parentLineId === declared.costId)!

      expect(input).toMatchObject({
        label: declared.label,
        category: declared.category,
        sourceStatus: (declared.evidence as Source).status,
        lineIds: [declared.costId],
        periodIds: [1],
        costAtRisk: row.cost
      })
    }

    // A cost the client pays is no cost of the quote.
    for (const declared of DIRECT) expect(map.costInputs.some(i => i.id === declared.costId)).toBe(false)
    expect(
      estimateExposure(full)!
        .costInputs.filter(i => i.kind === 'third_party')
        .map(i => i.id)
    ).toEqual(['media'])
  })

  it('a cost with estimated evidence counts as estimated and one with confirmed evidence as confirmed', () => {
    // The same quote with ONE status changed, twice: the media plan confirmed, and the production quote estimated.
    const flip = (costId: string, status: string) =>
      compose(
        reserved('human'),
        demand({ costs: REINVOICED.map(c => (c.costId === costId ? { ...c, evidence: evidence(status) } : c)) })
      )

    const rowCost = (costId: string) => thirdPartyRows(noDirect).find(row => row.parentLineId === costId)!.cost
    const base = estimateExposure(noDirect)!
    const mediaConfirmed = estimateExposure(calculated(flip('media', 'confirmed')))!
    const prodEstimated = estimateExposure(calculated(flip('prod', 'estimated')))!

    expect(mediaConfirmed.totalCost).toBe(base.totalCost)
    expect(eq(new D(base.estimatedCost).minus(mediaConfirmed.estimatedCost), rowCost('media'))).toBe(true)
    expect(eq(new D(mediaConfirmed.confirmedCost).minus(base.confirmedCost), rowCost('media'))).toBe(true)
    expect(eq(new D(prodEstimated.estimatedCost).minus(base.estimatedCost), rowCost('prod'))).toBe(true)
    expect(eq(new D(base.confirmedCost).minus(prodEstimated.confirmedCost), rowCost('prod'))).toBe(true)
    expect(mediaConfirmed.costInputs.some(i => i.kind === 'third_party')).toBe(false)
    expect(prodEstimated.costInputs.filter(i => i.kind === 'third_party').map(i => i.id)).toEqual(['prod', 'media'])
  })

  it('the reserve is not an input: each input it rests on carries its own cost and the reserve on it', () => {
    const rate = new D(1).plus(RATE)

    for (const base of ['human', 'own_costs'] as const) {
      const withReserve = calculated(compose(reserved(base), demand({ costs: REINVOICED })))
      const before = costInputExposure(noReserve)!
      const after = costInputExposure(withReserve)!
      const tolerance = toleranceOf(withReserve)

      const scaled = (kind: string) =>
        base === 'own_costs' ? kind !== 'third_party' : ['person_cost', 'talent_factor'].includes(kind)

      // Same inputs, in number and identity: the reserve added none.
      expect(after.costInputs.map(i => `${i.kind} ${i.id}`).sort()).toEqual(
        before.costInputs.map(i => `${i.kind} ${i.id}`).sort()
      )
      expect(after.costInputs.some(i => i.kind.includes('reserve') || i.id.includes('reserve'))).toBe(false)
      expect(before.costInputs.filter(i => scaled(i.kind) && i.kind !== 'fx').length).toBeGreaterThan(0)
      expect(before.costInputs.filter(i => !scaled(i.kind) && i.kind !== 'fx').length).toBeGreaterThan(0)

      for (const input of before.costInputs.filter(i => i.kind !== 'fx')) {
        const moved = after.costInputs.find(i => i.kind === input.kind && i.id === input.id)!
        const expected = scaled(input.kind) ? new D(input.costAtRisk).mul(rate) : new D(input.costAtRisk)

        expect(within(moved.costAtRisk, expected, tolerance), `${base}: ${input.kind} ${input.id}`).toBe(true)
        // The scaling is far outside the tolerance, so an unscaled reading cannot pass.
        if (input.kind === 'person_cost')
          expect(new D(input.costAtRisk).mul(RATE).gt(tolerance.mul(10)), `${base}: ${input.id}`).toBe(true)
      }

      // The output FX is carried by every team component: with the reserve it carries the whole of it.
      expect(
        within(
          new D(inputOf(withReserve, 'fx', 'USD:CLP')!.costAtRisk).minus(
            inputOf(noReserve, 'fx', 'USD:CLP')!.costAtRisk
          ),
          totalsOf(withReserve).contingencyReserve,
          tolerance
        )
      ).toBe(true)
    }
  })

  it('the reserve is estimated exactly where the cost it rests on is', () => {
    // In this catalog the cost of every person is estimated, so the whole reserve on it is.
    expect(
      costInputExposure(noReserve)!
        .costInputs.filter(i => i.kind === 'person_cost')
        .every(i => i.sourceStatus === 'estimated')
    ).toBe(true)
    expect(
      within(
        new D(estimateExposure(noDirect)!.estimatedCost).minus(estimateExposure(noReserve)!.estimatedCost),
        totalsOf(noDirect).contingencyReserve,
        toleranceOf(noDirect)
      )
    ).toBe(true)

    // Colombia: person costs confirmed and the talent factor of the country estimated. With the factor confirmed in
    // memory the people rest on nothing estimated, and neither does the reserve on them.
    const offer = colombia.brief.offerId
    const reserve = reserveRecord(offer, RATE, 'human')
    const confirmedPeople = clone(catalogV5)

    for (const record of confirmedPeople.records)
      if (record.kind === 'talent_factor') record.source.status = 'confirmed'

    const input = demandOf(colombia, { form: 'on_demand' })

    const pair = (cat: CatalogDoc) => ({
      without: calculated(compose(withRecords(cat, FORMS), input)),
      with: calculated(compose(withRecords(cat, [...FORMS, reserve]), input))
    })

    const confirmed = pair(confirmedPeople)
    const estimated = pair(catalogV5)

    expect(new D(totalsOf(confirmed.with).contingencyReserve).gt(toleranceOf(confirmed.with).mul(10))).toBe(true)
    expect(estimateExposure(confirmed.with)!.estimatedCost).toBe(estimateExposure(confirmed.without)!.estimatedCost)
    expect(
      within(
        new D(estimateExposure(confirmed.with)!.confirmedCost).minus(
          estimateExposure(confirmed.without)!.confirmedCost
        ),
        totalsOf(confirmed.with).contingencyReserve,
        toleranceOf(confirmed.with)
      )
    ).toBe(true)
    expect(
      within(
        new D(estimateExposure(estimated.with)!.estimatedCost).minus(
          estimateExposure(estimated.without)!.estimatedCost
        ),
        totalsOf(estimated.with).contingencyReserve,
        toleranceOf(estimated.with)
      )
    ).toBe(true)
  })

  it('an estimated reserve record and an estimated rule of a category are rules, not amounts', () => {
    const estimatedRecords = compose(
      withRecords(catalogV4, [
        ...POLICIES('estimated'),
        ...FORMS,
        EUR_USD,
        reserveRecord(MANAGED_OFFER, RATE, 'human', 'estimated')
      ]),
      demand({ costs: REINVOICED })
    )

    const rules = estimateExposure(calculated(estimatedRecords))!.estimatedRules
    const rule = (kind: string) => rules.find(r => r.kind === kind)

    expect(rule('contingency_reserve')).toMatchObject({
      side: 'cost',
      ids: [reserveRecord(MANAGED_OFFER, RATE, 'human').recordId],
      lineIds: [...new Set(teamRows(estimatedRecords).map(row => row.parentLineId))],
      periodIds: [1]
    })
    expect(rule('third_party_policy')).toMatchObject({
      side: 'price',
      ids: REINVOICED.map(c => `third-party:${c.category}`),
      lineIds: REINVOICED.map(c => c.costId),
      periodIds: [1]
    })

    // With the same records confirmed neither rule is listed, and not one amount of the exposure differs: a rule
    // stays out of the ranking and of the union.
    const confirmedRules = estimateExposure(noDirect)!.estimatedRules
    const { estimatedRules: a, ...withEstimated } = estimateExposure(estimatedRecords)!
    const { estimatedRules: b, ...withConfirmed } = estimateExposure(noDirect)!

    expect(confirmedRules.map(r => r.kind)).not.toContain('contingency_reserve')
    expect(confirmedRules.map(r => r.kind)).not.toContain('third_party_policy')
    expect(a.filter(r => !['contingency_reserve', 'third_party_policy'].includes(r.kind))).toEqual(b)
    expect(withEstimated).toEqual(withConfirmed)
  })

  it('an estimated reserve the demand waives is still a rule of the quote, on no line', () => {
    const waived = compose(
      reserved('human', 'estimated'),
      demand({ costs: REINVOICED, contingency: { kind: 'waived', reason: 'Closed scope.' } })
    )

    expect(
      estimateExposure(calculated(waived))!.estimatedRules.find(r => r.kind === 'contingency_reserve')
    ).toMatchObject({
      ids: [reserveRecord(MANAGED_OFFER, RATE, 'human').recordId],
      lineIds: []
    })
    // Nothing rests on a reserve that is not there: the inputs read as without one.
    expect(costInputExposure(waived)!.costInputs).toEqual(costInputExposure(noReserve)!.costInputs)
  })
})

describe('the summary names a cost by its id: supplier and evidence reference stay in the brief', () => {
  it('neither is in the summary, and both are in the frozen brief', () => {
    expect(JSON.stringify(full.quote.resolution.brief)).toContain(SUPPLIER)
    expect(JSON.stringify(full.quote.resolution.brief)).toContain(EVIDENCE_REFERENCE)
    expect(JSON.stringify(summaryOf(full))).not.toContain(SUPPLIER)
    expect(JSON.stringify(summaryOf(full))).not.toContain(EVIDENCE_REFERENCE)
  })

  it('the derived sections of the explanation carry the evidence the kernel judged and never the supplier', () => {
    const derived = JSON.stringify([explainCostComponents(full.quote), explainCommercialAdjustments(full.quote)])

    expect(derived).toContain(EVIDENCE_REFERENCE)
    expect(derived).not.toContain(SUPPLIER)
  })
})

describe('explain: the cost breakdown of a 1.4.0 quote', () => {
  const breakdown = explainCostComponents(full.quote)
  const team = breakdown.filter(entry => !entry.thirdParty)
  const thirdParty = breakdown.filter(entry => entry.thirdParty)

  it('team rows read as in the same quote without the capabilities, with the reserve under its own key', () => {
    const plain = explainCostComponents(neither.quote)

    expect(
      team.map(({ contingencyReserve, ...entry }) => {
        expect(contingencyReserve).toBeDefined()

        return entry
      })
    ).toEqual(plain)
    expect(plain.some(entry => 'contingencyReserve' in entry)).toBe(false)

    for (const entry of team) {
      const row = teamRows(full).find(k => k.parentLineId === entry.lineId)!
      const component = row.components.find(c => c.kind === 'contingency_reserve')!
      const human = row.components.find(c => c.kind === 'human')!

      expect(entry.contingencyReserve).toEqual({
        rate: RATE,
        base: 'human',
        baseAmount: human.cost,
        allocatedCostBeforeLineRounding: component.cost,
        calculatedPrice: component.price
      })
      expect(eq(entry.contingencyReserve!.allocatedCostBeforeLineRounding, new D(human.cost).mul(RATE))).toBe(true)
    }
  })

  it('the reserve is not presented as a resource someone assigned', () => {
    const resources = team.flatMap(entry => entry.resources)

    // Every resource listed is an assignment of the kernel input of its line; the reserve is none of them.
    for (const entry of team) {
      const assigned = full.quote.resolution.inputs[0].input.request.lines.find(
        l => l.lineId === entry.lineId
      )!.assignments

      expect(entry.resources).toHaveLength(assigned.length)
    }

    expect(resources.length).toBeGreaterThan(0)
    expect(resources.every(resource => 'scope' in resource.assignment && 'quantity' in resource.assignment)).toBe(true)
    expect(resources.some(resource => 'baseAmount' in resource.assignment)).toBe(false)
  })

  it('each re-invoiced cost is an entry of its own, in the currency of the quote, with its evidence and its rule', () => {
    expect(thirdParty.map(entry => entry.lineId)).toEqual(REINVOICED.map(c => c.costId))

    for (const entry of thirdParty) {
      const declared = REINVOICED.find(c => c.costId === entry.lineId)!
      const row = thirdPartyRows(full).find(k => k.parentLineId === entry.lineId)!
      const rule = POLICIES().find(p => p.value.category === declared.category)!

      expect(entry).toMatchObject({ periodId: 1, currency: 'CLP', human: [], resources: [] })
      expect(entry.thirdParty).toMatchObject({
        label: declared.label,
        category: declared.category,
        quantity: declared.quantity,
        supplierAmount: declared.amount,
        supplierCurrency: declared.currency,
        allocatedCostBeforeLineRounding: row.components[0].cost,
        calculatedPrice: row.components[0].price,
        evidence: declared.evidence,
        policy: { method: rule.value.method, rate: rule.value.rate, recordId: rule.recordId, source: rule.source }
      })
      expect(within(entry.thirdParty!.allocatedCostBeforeLineRounding, row.cost, unitOf(full))).toBe(true)
    }
  })

  it('the cost of the entries is the cost of the quote', () => {
    const fx = new D(teamRows(full)[0].components[0].trace.outputFx)

    const own = sum(
      team.map(entry =>
        sum([
          ...entry.human.map(part => part.allocatedCostBeforeLineRounding),
          ...entry.resources.map(part => part.allocatedCostBeforeLineRounding),
          entry.contingencyReserve!.allocatedCostBeforeLineRounding
        ])
          .mul(fx)
          .toString()
      )
    )

    const reinvoiced = sum(thirdParty.map(entry => entry.thirdParty!.allocatedCostBeforeLineRounding))

    expect(within(own.plus(reinvoiced), totalsOf(full).cost, toleranceOf(full))).toBe(true)
    expect(within(reinvoiced, totalsOf(full).thirdPartyCost, toleranceOf(full))).toBe(true)
  })
})

describe('explain: contract 1.4.0 is a superset of the commercial walk', () => {
  // Colombia: a market factor that lowers the price and declares its floor on the base market, a declared form of
  // engagement, and on top of both a re-invoiced cost and a reserve.
  const offer = colombia.brief.offerId
  const records = [...POLICIES(), ...FORMS]
  const media = cost('media', 'media', '5000000', { currency: 'COP' })
  const q12 = calculated(compose(withRecords(catalogV5, records), colombia))
  const q13 = calculated(compose(withRecords(catalogV5, records), demandOf(colombia, { form: 'on_demand' })))

  const q14 = calculated(
    compose(
      withRecords(catalogV5, [...records, reserveRecord(offer, RATE, 'human')]),
      demandOf(colombia, { form: 'on_demand', costs: [media] })
    )
  )

  const walk12 = explainCommercialAdjustments(q12.quote)
  const walk13 = explainCommercialAdjustments(q13.quote)
  const walk14 = explainCommercialAdjustments(q14.quote)

  it('the premise: three contracts, a market factor that is not neutral and a form with a ratio', () => {
    expect([q12, q13, q14].flatMap(enginesOf)).toEqual([
      PRICING_V3_ENGINES['1.2.0'],
      PRICING_V3_ENGINES['1.3.0'],
      PRICING_V3_ENGINES['1.4.0']
    ])
    expect(walk13.marketFactor).toMatchObject({ country: 'CO', floorBasis: 'base_market' })
    expect(walk13.engagementForm).toMatchObject({ form: 'on_demand', priceRatio: '1.10' })
    expect(new D(totalsOf(q14).marketAdjustment).lt(0)).toBe(true)
    expect(new D(totalsOf(q14).engagementAdjustment).gt(0)).toBe(true)
  })

  it('a 1.4.0 quote keeps the market factor, the form of the engagement and the identity of the walk', () => {
    expect(walk14.marketFactor).toEqual(walk13.marketFactor)
    expect(walk14.marketFactor).toEqual(walk12.marketFactor)
    expect(walk14.engagementForm).toEqual(walk13.engagementForm)
    // Every key the earlier contract reads is still read, and the sentence of its walk is said in full.
    expect(Object.keys(walk14)).toEqual(expect.arrayContaining(Object.keys(walk13)))
    expect(walk14.identity.startsWith(walk13.identity)).toBe(true)
    expect(walk14.identity.length).toBeGreaterThan(walk13.identity.length)
    expect(walk13.identity).not.toBe(walk12.identity)
  })

  it('team rows keep every key of the 1.3.0 walk and gain the reserve inside their cost', () => {
    const rows14 = walk14.rows.filter(row => row.kind !== 'third_party')

    expect(rows14.map(row => row.lineId)).toEqual(walk13.rows.map(row => row.lineId))

    for (const [index, row] of rows14.entries()) {
      const kernel = teamRows(q14)[index]

      expect(Object.keys(row)).toEqual(expect.arrayContaining(Object.keys(walk13.rows[index])))
      expect(row).toMatchObject({
        contingencyReserve: kernel.contingencyReserve,
        marketAdjustment: kernel.marketAdjustment,
        engagementAdjustment: kernel.engagementAdjustment,
        floorNet: kernel.floorNet,
        engagementPriceRatio: '1.10'
      })
      expect(new D(row.contingencyReserve!).gt(0)).toBe(true)
    }
  })

  it('the third-party row and the reserve appear: the row walks with no market factor and no engagement ratio', () => {
    const row = walk14.rows.find(r => r.kind === 'third_party')!
    const kernel = thirdPartyRows(q14)[0]

    expect(row).toMatchObject({
      lineId: kernel.lineId,
      contingencyReserve: '0',
      marketAdjustment: '0',
      engagementAdjustment: '0',
      undiscountedPrice: kernel.undiscountedPrice,
      net: kernel.net,
      floorNet: kernel.floorNet,
      marketPriceRatio: '1',
      engagementPriceRatio: '1'
    })
    expect(walk14.thirdPartyPolicies).toEqual([
      {
        category: 'media',
        label: 'Categoría media',
        method: 'markup',
        rate: '0',
        minimumMargin: '0',
        rounding: 'none',
        scope: 'general',
        offerId: null,
        recordId: 'third-party:media',
        revision: 1,
        sourceStatus: 'confirmed',
        costIds: ['media']
      }
    ])
    expect(walk14.contingencyReserve).toEqual({
      label: 'Reserva de contingencia',
      rate: RATE,
      base: 'human',
      scope: { offerId: offer, engagementForm: 'on_demand' },
      waived: false,
      recordId: reserveRecord(offer, RATE, 'human').recordId,
      revision: 3,
      sourceStatus: 'confirmed'
    })
  })

  it('a 1.4.0 quote that uses one capability says the other is not there', () => {
    const onlyReserve = explainCommercialAdjustments(noCosts.quote)
    const onlyCosts = explainCommercialAdjustments(noReserve.quote)

    expect(onlyReserve.thirdPartyPolicies).toEqual([])
    expect(onlyReserve.contingencyReserve).toMatchObject({ rate: RATE, waived: false })
    expect(onlyCosts.contingencyReserve).toBeNull()
    expect(onlyCosts.thirdPartyPolicies!.flatMap(p => p.costIds)).toEqual(REINVOICED.map(c => c.costId))

    // One record prices every cost of its category.
    const twice = explainCommercialAdjustments(
      calculated(compose(plainCatalog, demand({ costs: [PROD, cost('prod-2', 'production', '900000')] }))).quote
    )

    expect(twice.thirdPartyPolicies!.map(p => [p.recordId, p.costIds])).toEqual([
      ['third-party:production', ['prod', 'prod-2']]
    ])
  })

  it('the summary of the same quote keeps them too', () => {
    const summary = summaryOf(q14)

    expect(summary.marketFactor).toEqual(summaryOf(q13).marketFactor)
    expect(summary.engagementForm).toEqual(summaryOf(q13).engagementForm)
    expect(summary.marketFactor).toMatchObject({ country: 'CO' })
    expect(summary.thirdParty!.fxExposed).toEqual([])
  })
})

describe('explain of a frozen artifact, in both lanes', () => {
  it('composition lane: the explanation carries the breakdown and the walk of the quote it replayed', () => {
    const artifact = runResourceComposition(
      reserved('human'),
      policy,
      credits,
      demand({ costs: REINVOICED }),
      '2026-10-10T00:00:00.000Z'
    )

    const explained = explainResourceComposition(clone(artifact))

    expect(explained.costBreakdown).toEqual(explainCostComponents(noDirect.quote))
    expect(explained.commercialAdjustments).toEqual(explainCommercialAdjustments(noDirect.quote))
    expect(summarizeComposition(artifact.semantic.result, artifact).thirdParty).toEqual(summaryOf(noDirect).thirdParty)
  })

  it('catalog lane: the references name the rule of each cost and the reserve, next to the ones it always named', () => {
    const designerCatalog: CatalogDoc = read('data/pricing/v3-catalog/catalog.review-v1.json')
    const designerBrief = read('data/pricing/v3-catalog/examples/designer.quote.artifact.json').semantic.brief
    const reserve = reserveRecord(designerBrief.offerId, RATE, 'human')
    const records = [...POLICIES(), ...FORMS]
    const prod = cost('prod', 'production', '1000.00', { currency: 'USD', periodIds: [1, 3] })
    const at = '2026-10-09T00:00:00.000Z'

    const earlier = explainCatalogQuote(
      runCatalogQuote(withRecords(designerCatalog, records), { ...designerBrief, engagementForm: 'on_demand' }, at)
    )

    const explained = explainCatalogQuote(
      runCatalogQuote(
        withRecords(designerCatalog, [...records, reserve]),
        { ...designerBrief, engagementForm: 'on_demand', thirdPartyCosts: [prod] },
        at
      )
    )

    const purposes = (references: { purpose: string }[]) => references.map(r => r.purpose)

    expect(explained.calculationStatus).toBe('calculated')
    expect(explained.periods.map(p => p.result.engineVersion)).toContain(PRICING_V3_ENGINES['1.4.0'])
    expect(earlier.periods.map(p => p.result.engineVersion)).toContain(PRICING_V3_ENGINES['1.3.0'])
    expect(purposes(earlier.factorAndFxReferences)).toContain('engagement_factor')
    // The same references as without the capabilities, plus exactly the two records that price them.
    expect(
      explained.factorAndFxReferences.filter(r => !['third_party_policy', 'contingency_reserve'].includes(r.purpose))
    ).toEqual(earlier.factorAndFxReferences)
    expect(
      explained.factorAndFxReferences
        .filter(r => ['third_party_policy', 'contingency_reserve'].includes(r.purpose))
        .map(r => [r.lineId, r.purpose, r.record.recordId])
    ).toEqual([
      ['prod', 'third_party_policy', 'third-party:production'],
      ['*', 'contingency_reserve', reserve.recordId]
    ])
    // The cost is charged in two of the three periods: an entry of the breakdown in each, in the output currency.
    expect(
      explained.costBreakdown.filter(entry => entry.thirdParty).map(entry => [entry.lineId, entry.periodId])
    ).toEqual([
      ['prod', 1],
      ['prod', 3]
    ])
    expect(explained.commercialAdjustments.engagementForm).toEqual(earlier.commercialAdjustments.engagementForm)
    expect(explained.commercialAdjustments.identity.startsWith(earlier.commercialAdjustments.identity)).toBe(true)
  })
})

describe('quotes of earlier contracts keep the keys they had', () => {
  // The byte-for-byte comparison of these readings with the ones before this contract was done once, outside the
  // suite, over every committed artifact. What stays here is its invariant: no key of contract 1.4.0 exists in the
  // reading of a quote that an earlier engine signed.
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const path = join(dir, entry.name)

      return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
    })

  const artifacts = walk('data/pricing').map(path => ({ path, artifact: read(path) }))
  const compositions = artifacts.filter(a => a.artifact.artifactVersion === 'pricing-v3-resource-composition/1')
  const selections = artifacts.filter(a => a.artifact.artifactVersion === 'pricing-v3-selection-quote/1')
  const LATEST = PRICING_V3_ENGINES['1.4.0']

  const enginesIn = (periods: { result: { engineVersion: string } }[]) => [
    ...new Set(periods.map(p => p.result.engineVersion))
  ]

  /** Every key at any depth under `value`, except under the keys in `skip`. */
  const keysOf = (value: unknown, skip: string[] = []): string[] =>
    Array.isArray(value)
      ? value.flatMap(item => keysOf(item, skip))
      : value && typeof value === 'object'
        ? Object.entries(value).flatMap(([key, child]) => (skip.includes(key) ? [key] : [key, ...keysOf(child, skip)]))
        : []

  const earlier = compositions.filter(a => !enginesIn(a.artifact.semantic.result.quote.periods).includes(LATEST))
  const earlierSelections = selections.filter(a => !enginesIn(a.artifact.semantic.result.periods).includes(LATEST))

  it('the walk finds frozen compositions and catalog quotes signed by more than one earlier engine', () => {
    expect(earlier.length).toBeGreaterThanOrEqual(5)
    expect(earlierSelections.length).toBeGreaterThanOrEqual(1)
    expect(
      new Set(earlier.flatMap(a => enginesIn(a.artifact.semantic.result.quote.periods))).size
    ).toBeGreaterThanOrEqual(2)
  })

  it.each(earlier.map(a => [a.path, a.artifact]))('%s: summary, exposure and explanation', (_path, artifact) => {
    const result: Composition = artifact.semantic.result
    const summary = summarizeComposition(result, artifact)
    const map = costInputExposure(result)

    expect(readOwnWork(result)).toBeNull()
    expect(readThirdPartyCosts(result)).toBeNull()
    expect(readContingencyReserve(result)).toBeNull()

    for (const key of ['ownWork', 'thirdParty', 'contingencyReserve']) expect(summary).not.toHaveProperty(key)

    expect(
      keysOf(summary).filter(key =>
        /thirdParty|contingency|ownWork|reinvoiced|clientDirect|fxExposed|waive|supplier/i.test(key)
      )
    ).toEqual([])

    if (map) {
      expect(map.costInputs.map(i => i.kind)).not.toContain('third_party')
      expect(map.estimatedRules.map(r => r.kind)).not.toContain('third_party_policy')
      expect(map.estimatedRules.map(r => r.kind)).not.toContain('contingency_reserve')
      expect(keysOf(map.costInputs)).not.toContain('category')
    }

    const explained = explainResourceComposition(clone(artifact))

    // `assignment` is the trace of a kernel component, whose keys are the kernel's and not this reading's.
    expect(
      keysOf([explained.costBreakdown, explained.commercialAdjustments], ['assignment']).filter(key =>
        /thirdParty|contingency/i.test(key)
      )
    ).toEqual([])
    expect(explained.costBreakdown.every(entry => entry.human.length > 0 || entry.resources.length > 0)).toBe(true)
  })

  it.each(earlierSelections.map(a => [a.path, a.artifact]))(
    '%s: explanation of the catalog lane',
    (_path, artifact) => {
      const explained = explainCatalogQuote(clone(artifact))

      expect(
        keysOf([explained.costBreakdown, explained.commercialAdjustments], ['assignment']).filter(key =>
          /thirdParty|contingency/i.test(key)
        )
      ).toEqual([])
      expect(explained.factorAndFxReferences.map(r => r.purpose)).not.toContain('third_party_policy')
      expect(explained.factorAndFxReferences.map(r => r.purpose)).not.toContain('contingency_reserve')
    }
  )
})
