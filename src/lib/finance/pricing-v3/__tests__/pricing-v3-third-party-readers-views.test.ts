// What the derived readings of a quote say when it carries third-party costs and a contingency reserve (contract
// 1.4.0): readiness (`assess`), the client-shaped preview, the price split, the cash reading and the payment
// calendar, the commitment exposure, the price dates and the client allowlist of the catalog lane.
//
// Every reading derives from the frozen result, so what it must say is taken from one of three places and never
// from a previous run of the reader under test:
//   - the frozen result itself: rows, totals, cash ledger and brief, as the kernel and the resolution wrote them;
//   - the same demand quoted WITHOUT the capability (no costs, no reserve, or without the cost the client pays):
//     what a reading says of own work must not move when a supplier is added to the quote;
//   - the kernel or the resolver run again on the case a reading announces (an expired supplier quote, a reserve
//     record that ended): the announced consequence is the one that happens.
//
// Catalogs and demands are built in memory from the committed fixtures, the way the resolution tests of the contract
// build them; nothing is written under data/ and no test reads a 1.4.0 artifact from disk. The rates used here are
// not the ones the catalog issues: nothing may depend on a particular category or percentage.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import DecimalJs from 'decimal.js'
import { describe, expect, it } from 'vitest'

import {
  COMPOSITION_VERSION,
  replayResourceComposition,
  runResourceComposition
} from '../adapters/resource-composition'
import { catalogQuoteMarkdown, clientPaidDirectly, projectCatalogQuote } from '../catalog/client'
import { calculateCatalogQuote } from '../catalog/quote'
import { commitmentExposure } from '../resources/commitment-exposure'
import { composeResourceQuote } from '../resources/composition'
import { presentPaymentSchedule, readEngagementCash } from '../resources/engagement-view'
import type { PaymentMilestone } from '../resources/engagement-view'
import { quotePriceNotices, reviewResourcePrices } from '../resources/price-review'
import { splitQuotedPrice } from '../resources/price-split'
import {
  assessCompositionReadiness,
  compositionPreviewMarkdown,
  projectCompositionPreview
} from '../resources/readiness'
import { PRICING_V3_ENGINES } from '../schemas'

const D = DecimalJs.clone({ precision: 200, rounding: DecimalJs.ROUND_HALF_UP })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => `data/pricing/v3-operating/${name}.json`

// Composition lane: catalog v4 calculates in USD and registers a rounding rule per currency. The managed-care demand
// is one period in CLP for a client in Chile, offer `creative-managed-service`, with composed tools in every row.
const catalogV4 = read(operating('catalog.review-v4'))
const policy = read(operating('resources.review-v5'))
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')
const managed = read(operating('managed-care.demand'))

// Catalog lane: three periods in USD (the calculation currency), one line, a one-time setup row in the first.
const designerCatalog = read('data/pricing/v3-catalog/catalog.review-v1.json')
const designerBrief = read('data/pricing/v3-catalog/examples/designer.quote.artifact.json').semantic.brief

type Composition = ReturnType<typeof composeResourceQuote>
type Row = Composition['quote']['periods'][number]['result']['lines'][number]
type CatalogDoc = { records: Record<string, unknown>[] }

const IDENTITY = { calculationId: 'composition-under-test', replayDigest: 'digest-under-test' }
const sum = (values: (string | DecimalJs)[]) => values.reduce<DecimalJs>((total, v) => total.plus(v), new D(0))

// ---- catalog fixtures ----

const recordSource = (status = 'confirmed', effectiveUntil = '9999-12-31') => ({
  reference: 'third-party-readers-test',
  effectiveFrom: '2026-01-01',
  effectiveUntil,
  status
})

const policyRecord = (
  category: string,
  value: { method?: string; rate: string; minimumMargin?: string; rounding?: string },
  effectiveUntil?: string
) => ({
  recordId: `third-party:${category}`,
  revision: 1,
  kind: 'third_party_policy',
  source: recordSource('confirmed', effectiveUntil),
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

const reserveRecord = (
  value: { rate?: string; base?: string } = {},
  scope: { offerId?: string; engagementForm?: string; effectiveUntil?: string } = {}
) => ({
  recordId: `contingency:${scope.offerId ?? '*'}:${scope.engagementForm ?? '*'}`,
  revision: 1,
  kind: 'contingency_reserve',
  source: recordSource('confirmed', scope.effectiveUntil),
  note: 'Contingency reserve, declared for the test.',
  value: {
    label: 'Reserva de contingencia',
    rate: value.rate ?? '0.15',
    base: value.base ?? 'human',
    ...(scope.offerId ? { offerId: scope.offerId } : {}),
    ...(scope.engagementForm ? { engagementForm: scope.engagementForm } : {})
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

// Categories are data: the kernel knows no list of them. These ids are unlike any word a view could hold by chance,
// so finding one in a client-shaped view means the view shows how a cost was classified.
const CATEGORY = { production: 'cat-rodaje-9001', media: 'cat-pauta-9002', talent: 'cat-locucion-9003' }

// Rules of the test, by category. None is a rate the catalog issues. `production` adds a handling and rounds, so its
// net differs from what its supplier charges; `media` is passed at cost; `talent` adds a handling and does not round.
const POLICIES = [
  policyRecord(CATEGORY.production, { rate: '0.20', minimumMargin: '0.10', rounding: 'commercial' }),
  policyRecord(CATEGORY.media, { rate: '0' }),
  policyRecord(CATEGORY.talent, { rate: '0.07', minimumMargin: '0.03' })
]

const FORMS = [formRecord('on_going', '1'), formRecord('on_demand', '1.10')]

const withRecords = <T extends CatalogDoc>(cat: T, records: unknown[]) => {
  const next = clone(cat)

  next.records.push(...(clone(records) as CatalogDoc['records']))

  return next
}

const MANAGED_OFFER: string = managed.brief.offerId
const RESERVE = reserveRecord({ rate: '0.15', base: 'human' }, { offerId: MANAGED_OFFER, engagementForm: 'on_demand' })

// The rules of three categories and two forms of engagement; with and without the reserve of the offer.
const managedCatalog = withRecords(catalogV4, [...POLICIES, ...FORMS])
const reservedCatalog = withRecords(managedCatalog, [RESERVE])
const designerCatalog14 = withRecords(designerCatalog, [...POLICIES, ...FORMS])

// ---- brief fixtures ----

// Both appear only in the brief: the name of a supplier and the reference of its quote reach no client-shaped view.
const SUPPLIER = 'Proveedor-Sentinela-7731'
const EVIDENCE_REFERENCE = 'supplier-quote:sentinela-118'

const evidence = (status = 'confirmed', effectiveUntil = '2026-12-31') => ({
  reference: EVIDENCE_REFERENCE,
  effectiveFrom: '2026-10-01',
  effectiveUntil,
  status
})

const cost = (costId: string, category: string, amount: string, extra: Record<string, unknown> = {}) => ({
  costId,
  category,
  // The concept the client reads. It names neither the id of the cost nor its category.
  label: `Concepto declarado ${costId.length}${category.length}${amount.length}`,
  supplier: SUPPLIER,
  settlement: 'reinvoiced',
  amount,
  currency: 'CLP',
  quantity: '1',
  periodIds: [1],
  evidence: evidence(),
  ...extra
})

// Three costs the quote re-invoices and one the client pays. The amounts are unlike each other and unlike any net,
// so finding one of them in a view means that view shows what a supplier charges.
const PROD = cost('tp-rodaje', CATEGORY.production, '4517000', { label: 'Rodaje de la campaña' })
const TALENT = cost('tp-locucion', CATEGORY.talent, '1250.55', { currency: 'USD', label: 'Locución y derechos de uso' })
const MEDIA = cost('tp-pauta', CATEGORY.media, '3333333', { evidence: evidence('estimated'), label: 'Pauta en redes' })

const STOCK = cost('tp-banco', CATEGORY.media, '890.40', {
  currency: 'USD',
  quantity: '3',
  settlement: 'client_direct',
  label: 'Banco de imágenes contratado por el cliente'
})

const COST_IDS = [PROD, TALENT, MEDIA, STOCK].map(c => c.costId)
const rowIdOf = (c: { costId: string }, periodId = 1) => `${c.costId}:${periodId}:third_party`
const REINVOICED = [PROD, TALENT, MEDIA]

type BriefExtra = {
  costs?: unknown[]
  contingency?: unknown
  form?: string
  adjustments?: unknown[]
  edit?: (brief: Record<string, unknown> & { lines: { lineId: string }[] }) => void
}

const withBrief = <T extends Record<string, unknown>>(brief: T, extra: BriefExtra) => {
  const next = clone(brief) as Record<string, unknown> & { lines: { lineId: string }[] }

  if (extra.costs) next.thirdPartyCosts = extra.costs
  if (extra.contingency) next.contingency = extra.contingency
  if (extra.form) next.engagementForm = extra.form
  if (extra.adjustments) next.adjustments = extra.adjustments
  extra.edit?.(next)

  return next
}

/** The managed-care demand (composition lane, On-Demand) with the brief fields of the case. */
const demand = (extra: BriefExtra = {}) => ({
  ...clone(managed),
  brief: withBrief(managed.brief, { form: 'on_demand', ...extra })
})

const compose = (cat: unknown, input: unknown) => composeResourceQuote(cat, policy, credits, input)

/** A quote that must calculate, on the contract the case is about. */
const calculated = (result: Composition, engine?: string) => {
  expect(result.quote.diagnostics).toEqual([])
  expect(result.quote.calculationStatus).toBe('calculated')
  if (engine) expect(result.quote.periods.map(p => p.result.engineVersion)).toEqual([engine])

  return result
}

const rowsOf = (result: Composition, periodId?: number) =>
  result.quote.periods.filter(p => periodId === undefined || p.periodId === periodId).flatMap(p => p.result.lines)

const teamRows = (result: Composition) => rowsOf(result).filter(row => row.kind !== 'third_party')

const supplierRows = (result: Composition, periodId?: number) =>
  rowsOf(result, periodId).filter(row => row.kind === 'third_party')

const totalsOf = (result: Composition) =>
  result.quote.totals as NonNullable<Composition['quote']['totals']> & {
    thirdPartyCost: string
    thirdPartyNet: string
    ownWorkMarginRate: string | null
    contingencyReserve: string
    contingencyReserveWaived: string
  }

const kernelCodes = (result: Composition) =>
  result.quote.periods.flatMap(p => p.result.diagnostics.map(d => `${d.code}@${d.fieldPath}`))

const WAIVER = { kind: 'waived', reason: 'Alcance cerrado y ya ejecutado dos veces con este cliente.' }

// The quotes every reading is asked about.
//   plain      the demand alone, with no reserve in the catalog: the last contract before 1.4.0.
//   teamOnly   the same demand with the reserve of the offer: 1.4.0 without a supplier.
//   full       reserve, three re-invoiced costs and one the client pays.
//   reinvoiced the same without the cost the client pays.
//   waived     `full` with the reserve waived.
const plain = calculated(compose(managedCatalog, demand()), PRICING_V3_ENGINES['1.3.0'])
const teamOnly = calculated(compose(reservedCatalog, demand()), PRICING_V3_ENGINES['1.4.0'])

const full = calculated(
  compose(reservedCatalog, demand({ costs: [...REINVOICED, STOCK] })),
  PRICING_V3_ENGINES['1.4.0']
)

const reinvoiced = calculated(compose(reservedCatalog, demand({ costs: REINVOICED })), PRICING_V3_ENGINES['1.4.0'])

const waived = calculated(
  compose(reservedCatalog, demand({ costs: [...REINVOICED, STOCK], contingency: WAIVER })),
  PRICING_V3_ENGINES['1.4.0']
)

const gapsOf = (result: Composition) => assessCompositionReadiness(result).gaps
const gapCodes = (result: Composition) => gapsOf(result).map(g => g.code)
const split = (result: Composition) => splitQuotedPrice(result, IDENTITY, { tools: 'all' })

const cash = (result: Composition) => {
  const outcome = readEngagementCash(result, IDENTITY)

  if (!outcome.ok) throw new Error(`cash reading rejected: ${outcome.code}`)

  return outcome.reading
}

const schedule = (result: Composition, milestones: PaymentMilestone[]) => {
  const outcome = presentPaymentSchedule(result, IDENTITY, milestones)

  if (!outcome.ok) throw new Error(`schedule rejected: ${JSON.stringify(outcome.issues)}`)

  return outcome.reading
}

const NEW_GAPS = [
  'THIRD_PARTY_COST_EVIDENCE_REQUIRED',
  'THIRD_PARTY_FX_EXPOSURE',
  'THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED',
  'THIRD_PARTY_TAX_TREATMENT_REVIEW',
  'CONTINGENCY_RESERVE_WAIVED'
]

// ---------------------------------------------------------------------------------------------------------------

describe('the premise: one demand, with and without suppliers and a reserve', () => {
  it('a supplier changes no team row, and the reserve is a cost of the team rows only', () => {
    // Own work is the same rows whether or not the quote re-invoices anything: every reading of own work below can
    // be held against the quote without suppliers.
    expect(teamRows(full)).toEqual(teamRows(teamOnly))
    expect(teamRows(reinvoiced)).toEqual(teamRows(teamOnly))
    expect(supplierRows(full).map(row => row.parentLineId)).toEqual(REINVOICED.map(c => c.costId))
    expect(supplierRows(full)).toEqual(supplierRows(reinvoiced))
    // The cost the client pays is in no row and no total: the two quotes differ in their frozen brief alone.
    expect(full.quote.totals).toEqual(reinvoiced.quote.totals)
    expect(full.quote.cashLedger).toEqual(reinvoiced.quote.cashLedger)
    expect(new D(totalsOf(full).contingencyReserve).gt(0)).toBe(true)
    expect(new D(totalsOf(waived).contingencyReserve).isZero()).toBe(true)
    expect(totalsOf(waived).contingencyReserveWaived).toBe(totalsOf(full).contingencyReserve)
    // `production` nets more than its supplier charges; `media` nets exactly what it charges.
    expect(new D(supplierRows(full)[0].net).gt(supplierRows(full)[0].cost)).toBe(true)
    expect(supplierRows(full)[2].net).toBe(supplierRows(full)[2].cost)
  })
})

describe('compose split: what a supplier is paid is a third part, never the person', () => {
  it('tools + person + thirdParty is the row, the period and the quote, to the unit', () => {
    const s = split(full)
    const totals = totalsOf(full)

    for (const [index, row] of rowsOf(full).entries()) {
      const part = s.rows[index]
      const parts = [part.tools, part.person, ...(part.thirdParty ? [part.thirdParty] : [])]

      expect(part.lineId).toBe(row.lineId)
      expect(sum(parts.map(p => p.net)).toFixed()).toBe(new D(row.net).toFixed())
      expect(sum(parts.map(p => p.cost)).toFixed()).toBe(new D(row.cost).toFixed())
      // A row is own work or a supplier's: the third part exists in the third-party rows and only there.
      expect('thirdParty' in part).toBe(row.kind === 'third_party')
    }

    for (const key of ['net', 'cost'] as const)
      expect(sum([s.totals.tools[key], s.totals.person[key], s.totals.thirdParty![key]]).toFixed()).toBe(
        new D(totals[key]).toFixed()
      )

    // The third part is the third-party rows as frozen: what the kernel totals for them.
    expect(s.totals.thirdParty).toMatchObject({ net: totals.thirdPartyNet, cost: totals.thirdPartyCost })
    expect(s.periods[0].thirdParty).toEqual(s.totals.thirdParty)
    expect(new D(totals.thirdPartyNet).gt(0)).toBe(true)
  })

  it('a third-party row is all third part: nothing of it is presented as person or as kit', () => {
    const s = split(full)

    for (const row of supplierRows(full)) {
      const part = s.rows.find(r => r.lineId === row.lineId)!

      expect(part.thirdParty).toMatchObject({ net: row.net, cost: row.cost, marginAmount: row.marginAmount })
      expect(part.person).toMatchObject({ net: '0', cost: '0' })
      expect(part.tools).toMatchObject({ net: '0', cost: '0', components: [] })
      // Its floor and its verdict are the ones the kernel stored for the row, on the minimum of its category.
      expect(part.thirdParty!.floorNet).toBe((row as Row & { floorNet: string }).floorNet)
      expect(part.thirdParty!.belowFloor).toBe(false)
    }
  })

  it('own work reads exactly as it does in the same quote without suppliers', () => {
    const withSuppliers = split(full)
    const without = split(teamOnly)

    // Person and kit, in total and row by row: a supplier added to the quote moves neither.
    expect(withSuppliers.totals.person).toEqual(without.totals.person)
    expect(withSuppliers.totals.tools).toEqual(without.totals.tools)
    expect(withSuppliers.rows.filter(r => r.kind !== 'third_party')).toEqual(without.rows)
    // The margin of the person is the margin of own work, not one diluted by what suppliers charge.
    expect(new D(without.totals.person.marginRateRoundedDown!).gt(new D(totalsOf(full).marginRate!))).toBe(true)
  })

  it('the reserve stays in the person part: it raises the cost of the person by what the kernel states per row', () => {
    const reserved = split(teamOnly)
    const bare = split(plain)

    for (const [index, row] of rowsOf(teamOnly).entries()) {
      const stated = (row as Row & { contingencyReserve: string }).contingencyReserve

      expect(new D(stated).gt(0)).toBe(true)
      // The kit costs what it cost; the reserve is all in the person.
      expect(reserved.rows[index].tools.cost).toBe(bare.rows[index].tools.cost)
      expect(new D(reserved.rows[index].person.cost).minus(bare.rows[index].person.cost).toFixed()).toBe(
        new D(stated).toFixed()
      )
    }

    expect('thirdParty' in reserved.totals).toBe(false)
  })

  it('says three figures and names the third part only in a quote that has it', () => {
    const three = split(full)
    const two = split(teamOnly)
    const before = split(plain)

    expect(three.statement).toContain('tools.net + person.net + thirdParty.net')
    expect(three.basis.some(line => line.startsWith('thirdParty:'))).toBe(true)
    expect(three.basis.some(line => line.startsWith('contingency reserve:'))).toBe(true)

    // A reserve without a supplier: still two parts, and the reserve is said to be in the person.
    expect(two.statement).toBe(before.statement)
    expect(two.basis.filter(line => line.startsWith('thirdParty:'))).toEqual([])
    expect(two.basis).toEqual([...before.basis, three.basis.find(line => line.startsWith('contingency reserve:'))])

    // Before the contract: nothing of it.
    expect(JSON.stringify(before)).not.toMatch(/thirdParty|contingency/i)
  })

  it('a cost sold under the floor of its category is said on the third part, with the verdict of the kernel', () => {
    // An agreed net of third-party billing under what the supplier charges.
    const under = compose(
      reservedCatalog,
      demand({
        costs: REINVOICED,
        adjustments: [
          {
            adjustmentId: 'tp-agreed',
            kind: 'agreed_net',
            amount: '4000000',
            billing: 'third_party',
            lineIds: [PROD.costId],
            reason: 'Agreed with the client.'
          }
        ]
      })
    )

    expect(under.quote.calculationStatus).toBe('calculated')
    expect(kernelCodes(under)).toContain(`MARGIN_BELOW_FLOOR@result.lines.${rowIdOf(PROD)}`)

    const s = split(under)
    const part = s.rows.find(r => r.lineId === rowIdOf(PROD))!

    expect(part.rowBelowFloor).toBe(true)
    expect(part.thirdParty).toMatchObject({ net: '4000000', belowFloor: true })
    expect(s.floor.rowsBelowFloor).toEqual([{ periodId: 1, lineId: rowIdOf(PROD) }])
    // The team rows are judged on their own: none is flagged because a supplier was sold under cost.
    expect(s.rows.filter(r => r.kind !== 'third_party').every(r => !r.rowBelowFloor)).toBe(true)
  })
})

describe('compose preview: a supplier is never presented as fee, and nothing of it but its concept and its net', () => {
  it('the fee of the service is the period net without setup and without the third-party rows', () => {
    const preview = projectCompositionPreview(full)
    const period = preview.periods[0]
    const [fee, ...rest] = period.items

    // The items are the period, to the unit.
    expect(sum(period.items.map(item => item.net)).toFixed()).toBe(new D(period.net).toFixed())
    expect(period.net).toBe(full.quote.periods[0].result.totals!.net)
    expect(preview.net).toBe(totalsOf(full).net)

    // One item per third-party row: the concept the brief declares and the final net of the row.
    expect(rest).toEqual(supplierRows(full).map(row => ({ label: row.label, net: row.net })))
    expect(rest.map(item => item.label)).toEqual(REINVOICED.map(c => c.label))

    // The fee is own work: exactly what the same service is previewed at without suppliers.
    expect(fee).toEqual(projectCompositionPreview(teamOnly).periods[0].items[0])
    expect(new D(fee.net).toFixed()).toBe(new D(totalsOf(full).net).minus(totalsOf(full).thirdPartyNet).toFixed())
    expect(projectCompositionPreview(teamOnly).periods[0].items).toHaveLength(1)
  })

  it('a cost the client pays is listed apart, as declared, and is in no item, period or total', () => {
    const preview = projectCompositionPreview(full)
    const without = projectCompositionPreview(reinvoiced)

    // Concept, `amount x quantity` in the declared currency at the declared decimals, and the periods it falls in.
    expect(preview.clientPaidDirectly).toEqual([
      { label: STOCK.label, amount: '2671.20', currency: 'USD', periodIds: [1] }
    ])
    expect(new D(STOCK.amount).mul(STOCK.quantity).toFixed(2)).toBe('2671.20')

    // Take the list away and the preview is the one of the quote that never declared the cost.
    const { clientPaidDirectly: listed, ...rest } = preview

    expect(listed).toHaveLength(1)
    expect(rest).toEqual(without)
    expect(without).not.toHaveProperty('clientPaidDirectly')
    expect(projectCompositionPreview(teamOnly)).not.toHaveProperty('clientPaidDirectly')
    expect(Object.keys(projectCompositionPreview(teamOnly))).toEqual(Object.keys(projectCompositionPreview(plain)))
  })

  it('the Markdown lists the same items, and the cost the client pays after the net of the term', () => {
    const text = compositionPreviewMarkdown(full)
    const without = compositionPreviewMarkdown(reinvoiced)

    for (const row of supplierRows(full)) expect(text).toContain(`- ${row.label}: ${row.net} CLP`)
    expect(text).toContain(`- ${STOCK.label}: 2671.20 USD (periodo 1)`)
    // After the net, so that no amount above it reads as including it, and only in a quote that declares one.
    expect(text.indexOf(STOCK.label)).toBeGreaterThan(text.indexOf(`Neto del plazo: ${totalsOf(full).net} CLP.`))
    expect(without).not.toContain(STOCK.label)
    expect(without).not.toMatch(/directamente/i)
    expect(text.replace(/\n\nPagado directamente[\s\S]*?\(periodo 1\)/, '')).toBe(without)
  })

  it('carries no supplier, no cost and no rate: JSON and Markdown', () => {
    const text = JSON.stringify(projectCompositionPreview(full)) + compositionPreviewMarkdown(full)
    const prodRow = supplierRows(full)[0]
    const talentRow = supplierRows(full)[1]

    // Who is paid and on what evidence stays in the brief.
    expect(JSON.stringify(full.quote.resolution.brief)).toContain(SUPPLIER)
    expect(text).not.toContain(SUPPLIER)
    expect(text).not.toContain(EVIDENCE_REFERENCE)
    expect(text).not.toMatch(/supplier|evidence|categor|costId|"cost"|rate|margin|minimum/i)
    // How each cost was classified, and the id the brief gives it.
    for (const internal of [...Object.values(CATEGORY), ...COST_IDS]) expect(text).not.toContain(internal)

    // What a supplier charges, where it differs from what the client is invoiced: neither as declared nor converted.
    expect(prodRow.cost).not.toBe(prodRow.net)
    expect(talentRow.cost).not.toBe(talentRow.net)
    for (const amount of [PROD.amount, prodRow.cost, TALENT.amount, talentRow.cost]) expect(text).not.toContain(amount)

    // The rule that priced each cost, and the reserve.
    for (const record of [...POLICIES, RESERVE]) expect(text).not.toContain(record.recordId)
    expect(text).not.toMatch(/reserv|contingen/i)
    for (const row of teamRows(full))
      expect(text).not.toContain(`"${(row as Row & { contingencyReserve: string }).contingencyReserve}"`)
  })
})

describe('compose assess: the verdict is the floor of each row, and what suppliers add is a gap of its own', () => {
  it('exposes the margin of own work next to the blended one, only from contract 1.4.0 on', () => {
    const margin = assessCompositionReadiness(full).margin!
    const totals = totalsOf(full)

    expect(margin.modeledRate).toBe(totals.marginRate)
    expect(margin).toMatchObject({ ownWorkRate: totals.ownWorkMarginRate })
    // The margin of own work is the margin of the same quote without suppliers.
    expect(new D(totals.ownWorkMarginRate!).eq(assessCompositionReadiness(teamOnly).margin!.modeledRate!)).toBe(true)
    expect(assessCompositionReadiness(teamOnly).margin).toMatchObject({
      ownWorkRate: totalsOf(teamOnly).marginRate
    })

    // An earlier contract has one margin and says nothing else.
    const earlier = assessCompositionReadiness(plain).margin!

    expect(earlier).not.toHaveProperty('ownWorkRate')
    expect(earlier).not.toHaveProperty('thirdPartyPolicies')

    // No generic target or floor is compared in any contract: the verdict is the kernel's, row by row.
    for (const reading of [margin, earlier]) {
      expect(reading).not.toHaveProperty('proposedFloor')
      expect(reading).not.toHaveProperty('proposedTarget')
      expect(reading).not.toHaveProperty('belowProposedFloor')
      expect(reading.belowPolicyFloor).toBe(reading.policyFloor.linesBelowFloor.length > 0)
    }

    // What a third-party row is judged with is the rule of its category, listed apart from the pricing policies.
    expect(margin.thirdPartyPolicies!.flatMap(policy => policy.costIds).sort()).toEqual(
      supplierRows(full)
        .map(row => row.parentLineId)
        .sort()
    )
  })

  it('a quote that is mostly pass-through with healthy own work is not flagged for its blended margin', () => {
    // Media passed at cost for more than the whole service is sold for.
    const passThrough = calculated(
      compose(reservedCatalog, demand({ costs: [cost('tp-pauta', CATEGORY.media, '30000000')] }))
    )

    const totals = totalsOf(passThrough)
    const margin = assessCompositionReadiness(passThrough).margin!
    // The floor the team rows were priced with, read from the policy the quote froze.
    const floors = margin.pricingPolicies.map(policy => new D(policy.minimumMargin))

    expect(new D(totals.thirdPartyNet).div(totals.net).gt('0.6')).toBe(true)

    // Blended, the quote sits under the floor of its own offer; its own work does not.
    for (const floor of floors) {
      expect(new D(totals.marginRate!).lt(floor)).toBe(true)
      expect(new D(totals.ownWorkMarginRate!).gte(floor)).toBe(true)
    }

    expect(margin.belowPolicyFloor).toBe(false)
    // The team rows hold their floor, and the kernel flags none: the reading agrees with it.
    expect(margin.policyFloor.linesBelowFloor).toEqual([])
    expect(gapCodes(passThrough)).not.toContain('MARGIN_BELOW_POLICY_FLOOR')
  })

  it('own work under the floor of its policy is flagged, whatever the suppliers add on top', () => {
    const lineIds = (managed.brief.lines as { lineId: string }[]).map(line => line.lineId)

    const discounted = compose(
      reservedCatalog,
      demand({
        // A cost with a handling of its own, so the blended margin is not simply under the one of own work.
        costs: [cost('tp-rodaje', CATEGORY.production, '500000')],
        adjustments: [{ adjustmentId: 'd', kind: 'discount', rate: '0.4', lineIds, reason: 'Discount under test.' }]
      })
    )

    expect(discounted.quote.calculationStatus).toBe('calculated')

    const margin = assessCompositionReadiness(discounted).margin!

    for (const policy of margin.pricingPolicies)
      expect(new D(totalsOf(discounted).ownWorkMarginRate!).lt(policy.minimumMargin)).toBe(true)

    expect(margin.belowPolicyFloor).toBe(true)
    // Every flagged row is a team row: the discount never reached what the supplier charges.
    expect(margin.policyFloor.linesBelowFloor.length).toBeGreaterThan(0)
    expect(margin.policyFloor.linesBelowFloor.every(line => lineIds.includes(line.parentLineId!))).toBe(true)
  })

  it('evidence that is not confirmed is a gap on that cost, and on no other', () => {
    const paths = (result: Composition) =>
      gapsOf(result)
        .filter(g => g.code === 'THIRD_PARTY_COST_EVIDENCE_REQUIRED')
        .map(g => g.path)

    // `media` is estimated in the fixture: the kernel puts the quote under review for it.
    expect(kernelCodes(full).filter(code => code.startsWith('ESTIMATED_SOURCE@request.thirdPartyCosts'))).toHaveLength(
      1
    )
    expect(paths(full)).toEqual([`thirdPartyCosts.${MEDIA.costId}.evidence`])
    expect(paths(compose(reservedCatalog, demand({ costs: [PROD, TALENT] })))).toEqual([])

    // Pending evidence withholds the calculation; the gap names the cost all the same.
    const pending = compose(reservedCatalog, demand({ costs: [{ ...PROD, evidence: evidence('pending') }] }))

    expect(pending.quote.calculationStatus).toBe('needs_input')
    expect(paths(pending)).toEqual([`thirdPartyCosts.${PROD.costId}.evidence`])

    // The evidence of a cost the client pays is nobody's price here.
    expect(paths(compose(reservedCatalog, demand({ costs: [{ ...STOCK, evidence: evidence('estimated') }] })))).toEqual(
      []
    )
  })

  it('a supplier that charges in another currency than the quote is an FX exposure, and only that one', () => {
    const fx = (result: Composition) => gapsOf(result).filter(g => g.code === 'THIRD_PARTY_FX_EXPOSURE')

    expect(fx(full).map(g => g.path)).toEqual([`thirdPartyCosts.${TALENT.costId}.currency`])
    expect(fx(full)[0].action).toContain('USD')
    expect(fx(full)[0].action).toContain('CLP')
    expect(fx(compose(reservedCatalog, demand({ costs: [PROD, MEDIA] })))).toEqual([])
    // What the client pays in another currency is not an exposure of the quote.
    expect(fx(compose(reservedCatalog, demand({ costs: [PROD, STOCK] })))).toEqual([])
  })

  it('scope and terms are asked once for a quote that declares any third-party cost', () => {
    const count = (result: Composition) => gapCodes(result).filter(c => c === 'THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED')

    expect(count(full)).toHaveLength(1)
    expect(count(reinvoiced)).toHaveLength(1)
    // Also when the only cost is one the client pays: who contracts the supplier still has to be agreed.
    expect(count(compose(managedCatalog, demand({ costs: [STOCK] })))).toHaveLength(1)
    expect(count(teamOnly)).toEqual([])
  })

  it('an exclusive tax rate applied to a quote with re-invoiced costs is a review, and only then', () => {
    const exclusive = {
      kind: 'exclusive',
      rate: '0.19',
      policyRef: 'tax:test',
      source: { reference: 'tax:test', effectiveFrom: '2026-01-01', effectiveUntil: '9999-12-31', status: 'confirmed' }
    }

    const taxed = (costs?: unknown[]) =>
      compose(reservedCatalog, demand({ ...(costs ? { costs } : {}), edit: brief => (brief.taxTreatment = exclusive) }))

    const review = (result: Composition) => gapCodes(result).filter(c => c === 'THIRD_PARTY_TAX_TREATMENT_REVIEW')
    const withCosts = taxed(REINVOICED)

    // The kernel taxed the whole net, the third-party rows included: that is what the gap asks someone to confirm.
    expect(withCosts.quote.calculationStatus).toBe('calculated')
    expect(new D(totalsOf(withCosts).tax!).eq(new D(totalsOf(withCosts).net).mul('0.19').toFixed(0))).toBe(true)
    expect(new D(totalsOf(withCosts).thirdPartyNet).gt(0)).toBe(true)
    expect(review(withCosts)).toHaveLength(1)

    expect(review(taxed())).toEqual([])
    expect(review(taxed([STOCK]))).toEqual([])
    // Tax not resolved: there is no treatment to review yet, and the existing gap says so.
    expect(review(full)).toEqual([])
    expect(gapCodes(full)).toContain('TAX_AND_ENTITY_REQUIRED')
  })

  it('a waived reserve is a gap that states what was left out; a reserve in force is none', () => {
    const gap = gapsOf(waived).filter(g => g.code === 'CONTINGENCY_RESERVE_WAIVED')

    // The kernel puts the quote under review for it, and reports the amount forgone.
    expect(kernelCodes(waived)).toContain('CONTINGENCY_RESERVE_WAIVED@request.contingencyWaiver')
    expect(gap).toHaveLength(1)
    expect(gap[0].path).toBe('contingency')
    expect(gap[0].action).toContain(`${totalsOf(waived).contingencyReserveWaived} CLP`)
    // The reason is the operator's free text and stays in the brief.
    expect(gap[0].action).not.toContain(WAIVER.reason)

    expect(gapCodes(full)).not.toContain('CONTINGENCY_RESERVE_WAIVED')
    expect(gapCodes(teamOnly)).not.toContain('CONTINGENCY_RESERVE_WAIVED')
  })

  it('a quote without any of it raises none of the new gaps', () => {
    for (const code of NEW_GAPS) {
      expect(gapCodes(plain), code).not.toContain(code)
      expect(gapCodes(teamOnly), code).not.toContain(code)
    }
  })

  it('a third-party row under its floor is said to be under the floor of its category, not of a pricing policy', () => {
    const lineIds = (managed.brief.lines as { lineId: string }[]).map(line => line.lineId)

    const under = compose(
      reservedCatalog,
      demand({
        costs: REINVOICED,
        adjustments: [
          {
            adjustmentId: 'tp-agreed',
            kind: 'agreed_net',
            amount: '4000000',
            billing: 'third_party',
            lineIds: [PROD.costId],
            reason: 'Agreed with the client.'
          },
          { adjustmentId: 'd', kind: 'discount', rate: '0.4', lineIds, reason: 'Discount under test.' }
        ]
      })
    )

    const floor = gapsOf(under).filter(g => g.code === 'MARGIN_BELOW_POLICY_FLOOR')
    const supplier = floor.filter(g => g.path.endsWith(':third_party'))
    const team = floor.filter(g => !g.path.endsWith(':third_party'))

    // One gap per row the kernel flagged, each on the floor that row is judged on, in the period it is flagged in.
    expect(floor.flatMap(g => g.periodIds!.map(periodId => `periods.${periodId}.${g.path}`)).sort()).toEqual(
      kernelCodes(under)
        .filter(code => code.startsWith('MARGIN_BELOW_FLOOR@'))
        .map(code => `periods.1.${code.split('@')[1]}`)
        .sort()
    )
    expect(supplier.map(g => [g.path, g.periodIds])).toEqual([[`result.lines.${rowIdOf(PROD)}`, [1]]])
    expect(team.length).toBeGreaterThan(0)
    expect(supplier[0].action).toContain(`category ${CATEGORY.production}`)
    expect(supplier[0].action).toContain(POLICIES[0].recordId)
    expect(supplier[0].action).toContain(`minimum margin ${POLICIES[0].value.minimumMargin}`)

    for (const g of team) {
      expect(g.action).toContain('pricing policy')
      expect(g.action).not.toContain('category')
    }
  })
})

describe('compose cash: what suppliers are paid is new cash of the job, and the reserve is nobody’s cash', () => {
  it('the natures add up to the frozen cost, with what suppliers charge and the reserve as the kernel states them', () => {
    const c = cash(full)
    const totals = totalsOf(full)

    expect(Object.keys(c.totals.fullCostByNature)).toEqual([
      'people',
      'provisions',
      'platformFee',
      'setup',
      'toolCreditBudgets',
      'toolSeatsAndPackages',
      'thirdParty',
      'contingencyReserve'
    ])
    expect(sum(Object.values(c.totals.fullCostByNature)).toFixed()).toBe(new D(totals.cost).toFixed())
    expect(c.totals.fullCostByNature.thirdParty).toBe(totals.thirdPartyCost)
    expect(c.totals.fullCostByNature.contingencyReserve).toBe(totals.contingencyReserve)
    expect(c.periods[0].fullCostByNature).toEqual(c.totals.fullCostByNature)

    // Everything else is the cost of the same quote without suppliers: no nature absorbed what a supplier charges.
    const { thirdParty, ...own } = c.totals.fullCostByNature

    expect(thirdParty).toBe(totals.thirdPartyCost)
    expect(own).toEqual(cash(teamOnly).totals.fullCostByNature)
    // The reserve is neither capacity nor a purchase: capacity cost is what it is without one.
    expect(c.totals.capacityCostAbsorbed).toBe(cash(plain).totals.capacityCostAbsorbed)
    expect(c.notDerivable.map(entry => entry.figure)).not.toContain('fullCost.byNature.unclassified')
  })

  it('new supplier cash is what the suppliers of re-invoiced costs are paid, and it comes off the cash added', () => {
    const c = cash(full)
    const totals = totalsOf(full)
    const own = cash(teamOnly)

    // The premise: no credit pack is bought, so the suppliers are all the new cash there is.
    expect(full.resourceIncrementalCash).toEqual([])
    expect(own.totals.newSupplierCash).toBe('0')
    expect(own.totals.cashAddedOnContractedCapacity).toBe(own.totals.net)

    expect(c.totals.newSupplierCash).toBe(totals.thirdPartyCost)
    expect(c.periods[0].newSupplierCash).toBe(totals.thirdPartyCost)
    expect(new D(c.totals.cashAddedOnContractedCapacity!).toFixed()).toBe(
      new D(totals.net).minus(totals.thirdPartyCost).toFixed()
    )
    expect(c.results.cashAddedOnContractedCapacity.amount).toBe(c.totals.cashAddedOnContractedCapacity)
    // What the job adds is own work plus the handling of the re-invoiced costs, never their whole net.
    expect(new D(c.totals.cashAddedOnContractedCapacity!).toFixed()).toBe(
      new D(own.totals.cashAddedOnContractedCapacity!).plus(totals.thirdPartyNet).minus(totals.thirdPartyCost).toFixed()
    )

    expect(c.supplierCash.declaredNew.amount).toBe('0')
    expect(c.supplierCash.thirdParty).toMatchObject({
      amount: totals.thirdPartyCost,
      reinvoicedNet: totals.thirdPartyNet
    })
  })

  it('lists each purchase with what the supplier charges and the conversion the quote froze, never who it is', () => {
    const purchases = cash(full).supplierCash.thirdParty!.purchases
    const rows = supplierRows(full)

    expect(purchases.map(p => ({ costId: p.costId, cost: p.inQuoteCurrency, net: p.reinvoicedNet }))).toEqual(
      rows.map(row => ({ costId: row.parentLineId, cost: row.cost, net: row.net }))
    )
    expect(purchases.map(p => [p.supplierCurrency, p.supplierAmount])).toEqual(
      REINVOICED.map(c => [c.currency, new D(c.amount).mul(c.quantity).toFixed(c.amount.split('.')[1]?.length ?? 0)])
    )
    // A supplier in the currency of the quote is not converted; another one goes through the frozen FX.
    expect(purchases[0]).toMatchObject({ fxRate: '1', inQuoteCurrency: PROD.amount })
    expect(purchases[1].supplierCurrency).toBe('USD')
    expect(new D(purchases[1].supplierAmount!).mul(purchases[1].fxRate!).toFixed(0)).toBe(purchases[1].inQuoteCurrency)
    expect(JSON.stringify(cash(full))).not.toContain(SUPPLIER)
  })

  it('a cost the client pays is listed as declared and moves no figure', () => {
    const c = cash(full)
    const without = cash(reinvoiced)

    expect(c.supplierCash.paidByClientDirectly!.costs).toEqual(clientPaidDirectly(full.quote.resolution.brief))
    expect(c.supplierCash.paidByClientDirectly!.costs).toEqual([
      { label: STOCK.label, amount: '2671.20', currency: 'USD', periodIds: [1] }
    ])
    expect(without.supplierCash).not.toHaveProperty('paidByClientDirectly')

    // Every figure is the one of the quote that never declared it.
    expect(c.totals).toEqual(without.totals)
    expect(c.periods).toEqual(without.periods)
    expect(c.results).toEqual(without.results)
    expect(c.modeledCommitment).toEqual(without.modeledCommitment)
    expect(c.supplierCash.thirdParty).toEqual(without.supplierCash.thirdParty)
    expect(c.supplierCash.declaredNew).toEqual(without.supplierCash.declaredNew)
  })

  it('the ledger is read entry by entry for what it is, and adds up to the commitment of the quote', () => {
    const c = cash(full)
    const totals = totalsOf(full)
    const m = c.periods[0].modeledCommitment
    const ledger = full.quote.cashLedger
    const supplierKeys = supplierRows(full).map(row => `third-party:${row.parentLineId}`)

    expect(ledger.filter(entry => supplierKeys.includes(entry.key))).toHaveLength(REINVOICED.length)
    expect(m.thirdParty).toBe(totals.thirdPartyCost)
    expect(sum([m.monthlyAndOnce, m.annualUpFront, m.thirdParty!]).toFixed()).toBe(new D(m.total).toFixed())
    expect(m.total).toBe(totals.cashCommitment)
    expect(c.modeledCommitment.total).toBe(totals.cashCommitment)

    // What is paid up front for a year is what it was without suppliers: a purchase for the job is not a year.
    const own = cash(teamOnly).periods[0].modeledCommitment

    expect(m.annualUpFront).toBe(own.annualUpFront)
    expect(m.monthlyAndOnce).toBe(own.monthlyAndOnce)
    expect(new D(m.annualUpFront).gt(0)).toBe(true)
    expect(own).not.toHaveProperty('thirdParty')
  })

  it('a waived reserve reads zero and changes no cash figure; without a reserve in the catalog the key is absent', () => {
    const w = cash(waived)
    const c = cash(full)

    expect(w.totals.fullCostByNature.contingencyReserve).toBe('0')
    expect(w.totals.newSupplierCash).toBe(c.totals.newSupplierCash)
    expect(w.periods[0].modeledCommitment).toEqual(c.periods[0].modeledCommitment)
    expect(cash(plain).totals.fullCostByNature).not.toHaveProperty('contingencyReserve')
    expect(cash(plain).totals.fullCostByNature).not.toHaveProperty('thirdParty')
    expect(JSON.stringify(cash(plain))).not.toMatch(/thirdParty|third-party|contingency|paidByClient|ownWork/i)
  })

  it('says the margin of own work next to the blended one, and what it cannot know about a supplier', () => {
    const c = cash(full)
    const own = cash(teamOnly)

    expect(c.results.marginAtFullCost.ownWork).toEqual({
      net: own.totals.net,
      cost: own.totals.fullCost,
      marginAmount: own.totals.marginAtFullCost,
      rateRoundedDown: own.totals.marginRateRoundedDown
    })
    expect(own.results.marginAtFullCost).not.toHaveProperty('ownWork')
    expect(c.notDerivable.map(entry => entry.figure)).toContain('supplierCash.thirdParty.paymentDate')
    expect(own.notDerivable.map(entry => entry.figure)).not.toContain('supplierCash.thirdParty.paymentDate')
  })

  it('over several periods each cost is cash of the periods it lists, and of no other', () => {
    const three = (costs?: unknown[]) =>
      calculated(
        compose(reservedCatalog, {
          ...demand({ ...(costs ? { costs } : {}), edit: brief => (brief.periods = 3) }),
          allocations: [1, 2, 3].flatMap(periodId =>
            (managed.allocations as Record<string, unknown>[]).map(a => ({ ...a, periodId }))
          )
        })
      )

    const result = three([
      cost('tp-rodaje', CATEGORY.production, '4517000', { periodIds: [1, 3] }),
      cost('tp-pauta', CATEGORY.media, '3333333', { periodIds: [2] })
    ])

    const c = cash(result)
    const own = cash(three())

    expect(c.periods).toHaveLength(3)

    for (const period of c.periods) {
      const paid = sum(supplierRows(result, period.periodId).map(row => row.cost))
      const ledger = result.quote.cashLedger.filter(entry => entry.periodId === period.periodId)
      const base = own.periods.find(p => p.periodId === period.periodId)!

      expect(paid.gt(0)).toBe(true)
      expect(period.newSupplierCash).toBe(paid.toFixed(0))
      expect(period.fullCostByNature.thirdParty).toBe(paid.toFixed(0))
      expect(period.modeledCommitment.thirdParty).toBe(paid.toFixed(0))
      expect(period.modeledCommitment.total).toBe(sum(ledger.map(entry => entry.amount)).toFixed(0))
      // The year of a seat is paid where it was paid without suppliers, and nowhere else.
      expect(period.modeledCommitment.annualUpFront).toBe(base.modeledCommitment.annualUpFront)
      expect(period.modeledCommitment.monthlyAndOnce).toBe(base.modeledCommitment.monthlyAndOnce)
    }

    expect(c.periods.map(p => new D(p.modeledCommitment.annualUpFront).gt(0))).toEqual([true, false, false])
    expect(sum(c.periods.map(p => p.modeledCommitment.total)).toFixed(0)).toBe(totalsOf(result).cashCommitment)
    expect(sum(c.periods.map(p => p.newSupplierCash!)).toFixed(0)).toBe(c.totals.newSupplierCash)
    expect(c.totals.newSupplierCash).toBe(totalsOf(result).thirdPartyCost)
    expect(sum(Object.values(c.totals.fullCostByNature)).toFixed(0)).toBe(totalsOf(result).cost)
  })
})

describe('compose schedule: the calendar covers the re-invoiced costs and says what their suppliers are paid', () => {
  const split532: PaymentMilestone[] = [
    { id: 'advance', label: 'Anticipo', share: '0.5', periodId: 1 },
    { id: 'delivery', label: 'Entrega', share: '0.3', when: 'A la entrega' },
    { id: 'closing', label: 'Cierre', share: '0.2' }
  ]

  it('still distributes the whole net, which includes the net of the third-party rows', () => {
    const s = schedule(full, split532)
    const totals = totalsOf(full)

    expect(sum(s.milestones.map(m => m.amount)).toFixed()).toBe(new D(totals.net).toFixed())
    expect(s.totals).toEqual({ net: totals.net, tax: totals.tax, grandTotal: totals.grandTotal })
    expect(s.thirdParty).toMatchObject({ net: totals.thirdPartyNet, supplierCost: totals.thirdPartyCost })
    expect(s.basis.filter(line => line.startsWith('third-party costs:'))).toHaveLength(1)
  })

  it('a milestone placed in a period carries what the suppliers of that period are paid; one that is not, nothing', () => {
    const s = schedule(full, split532)
    const paid = sum(supplierRows(full, 1).map(row => row.cost)).toFixed(0)

    expect(s.milestones[0].thirdPartyCostInPeriod).toBe(paid)
    expect(s.milestones[1]).not.toHaveProperty('thirdPartyCostInPeriod')
    expect(s.milestones[2]).not.toHaveProperty('thirdPartyCostInPeriod')
    expect(s.thirdParty!.milestonesInNoPeriod).toBe(2)
    expect(s.thirdParty!.byPeriod).toEqual([
      {
        periodId: 1,
        supplierCost: paid,
        milestonesPlacedInPeriod: s.milestones[0].amount,
        supplierCostAboveMilestones: '0'
      }
    ])
  })

  it('an advance smaller than what the suppliers of its period are paid shows by how much', () => {
    const small: PaymentMilestone[] = [
      { id: 'advance', label: 'Anticipo', share: '0.2', periodId: 1 },
      { id: 'closing', label: 'Cierre', share: '0.8', when: 'A la entrega' }
    ]

    const s = schedule(full, small)
    const paid = new D(totalsOf(full).thirdPartyCost)
    const advance = new D(s.milestones[0].amount)

    // The premise: the advance does not cover the suppliers.
    expect(advance.lt(paid)).toBe(true)
    expect(s.thirdParty!.byPeriod[0]).toMatchObject({
      milestonesPlacedInPeriod: advance.toFixed(0),
      supplierCostAboveMilestones: paid.minus(advance).toFixed(0)
    })
  })

  it('a quote without re-invoiced costs reads as it always did', () => {
    for (const result of [plain, teamOnly]) {
      const s = schedule(result, split532)

      expect(s).not.toHaveProperty('thirdParty')
      expect(s.milestones.every(m => !('thirdPartyCostInPeriod' in m))).toBe(true)
      expect(s.basis).toHaveLength(3)
    }
  })
})

describe('compose commitments: a purchase for the job is seen, counted and read into nothing', () => {
  const artifactOf = (cat: unknown, input: unknown) =>
    runResourceComposition(cat, policy, credits, input, '2026-10-10T00:00:00.000Z')

  const withSuppliers = commitmentExposure(artifactOf(reservedCatalog, demand({ costs: [...REINVOICED, STOCK] })))
  const without = commitmentExposure(artifactOf(reservedCatalog, demand()))

  it('no entry, no signal and no total is about a third-party cost: they are the ones of the quote without suppliers', () => {
    // The premise: the quote does commit a year of a seat, so the reading is not trivially empty.
    expect(without.commitments.length).toBeGreaterThan(0)
    expect(withSuppliers.commitments).toEqual(without.commitments)
    expect(withSuppliers.signals).toEqual(without.signals)
    expect(withSuppliers.totals).toEqual(without.totals)

    const listed = JSON.stringify([withSuppliers.commitments, withSuppliers.signals, withSuppliers.totals])

    for (const costId of COST_IDS) expect(listed).not.toContain(costId)
    expect(listed).not.toContain('third-party:')
    expect(JSON.stringify(withSuppliers)).not.toContain(SUPPLIER)
  })

  it('says how many it saw and that their terms are not frozen, and only in a quote that has them', () => {
    expect(withSuppliers.reviewed.thirdPartyPurchasesOutsideThisReading).toBe(supplierRows(full).length)
    expect(withSuppliers.notDerivable.map(entry => entry.code)).toContain('THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN')
    expect(withSuppliers.basis.filter(line => line.startsWith('third-party costs:'))).toHaveLength(1)

    expect(without.reviewed).not.toHaveProperty('thirdPartyPurchasesOutsideThisReading')
    expect(without.notDerivable.map(entry => entry.code)).not.toContain('THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN')
    expect(without.basis.filter(line => line.startsWith('third-party costs:'))).toEqual([])
    // Everything else the reading reviewed is the same.
    expect({ ...withSuppliers.reviewed, thirdPartyPurchasesOutsideThisReading: undefined }).toEqual({
      ...without.reviewed,
      thirdPartyPurchasesOutsideThisReading: undefined
    })
  })
})

describe('price dates: the quote of a supplier, and a reserve record that ends', () => {
  const QUOTE_DATE: string = managed.brief.quoteDate

  // Offsets stay short on purpose: the tool prices of the frozen policy are valid for a few days past the quote
  // date, and a case that moves the date must leave everything else in force.
  const day = (offset: number) => new Date(Date.parse(QUOTE_DATE) + offset * 86_400_000).toISOString().slice(0, 10)

  it('a supplier quote about to end is listed under its own subject, by cost and concept', () => {
    const expiring = { ...PROD, evidence: evidence('confirmed', day(5)) }
    const result = calculated(compose(reservedCatalog, demand({ costs: [expiring, MEDIA, STOCK] })))
    const options = { catalog: reservedCatalog as never, credits }
    const notices = quotePriceNotices(result, policy, QUOTE_DATE, options)
    const supplierNotices = notices.dueSoon.filter(n => n.subject === 'third_party_quote')

    expect(supplierNotices).toEqual([
      {
        kind: 'hard_expiry',
        subject: 'third_party_quote',
        ref: PROD.costId,
        toolId: null,
        priceId: null,
        label: PROD.label,
        date: day(5),
        blocksWith: 'STALE_SOURCE',
        daysLeft: 5
      }
    ])
    // The other supplier quote ends outside the window; the cost the client pays is priced by nobody here.
    expect(JSON.stringify(notices)).not.toContain(SUPPLIER)
    expect(JSON.stringify(notices)).not.toContain(STOCK.label)
    expect(
      quotePriceNotices(result, policy, QUOTE_DATE, { ...options, withinDays: 400 })
        .dueSoon.filter(n => n.subject === 'third_party_quote')
        .map(n => n.ref)
    ).toEqual([PROD.costId, MEDIA.costId])

    // Read after the validity it is expired, and the kernel does withhold a quote dated then, for that reason.
    const later = quotePriceNotices(result, policy, day(6), options)

    expect(later.expired.filter(n => n.subject === 'third_party_quote').map(n => [n.ref, n.daysLeft])).toEqual([
      [PROD.costId, -1]
    ])

    // Still inside the validity of every price the demand uses: only the quote of the supplier has ended.
    const stale = compose(
      reservedCatalog,
      demand({ costs: [expiring, MEDIA, STOCK], edit: brief => (brief.quoteDate = day(6)) })
    )

    expect(stale.quote.calculationStatus).toBe('needs_input')
    expect(kernelCodes(stale)).toContain('STALE_SOURCE@request.thirdPartyCosts.0.source')
  })

  it('a quote without re-invoiced costs has no such notice, and the reading of a policy alone never has', () => {
    const subjects = (review: {
      reviewDue: { subject: string }[]
      dueSoon: { subject: string }[]
      expired: { subject: string }[]
    }) => [...review.reviewDue, ...review.dueSoon, ...review.expired].map(n => n.subject)

    const wide = { catalog: reservedCatalog as never, credits, withinDays: 4000 }

    expect(subjects(quotePriceNotices(teamOnly, policy, QUOTE_DATE, wide))).not.toContain('third_party_quote')
    expect(subjects(quotePriceNotices(plain, policy, QUOTE_DATE, wide))).not.toContain('third_party_quote')
    expect(subjects(reviewResourcePrices(policy, QUOTE_DATE, wide))).not.toContain('third_party_quote')
  })

  it('a reserve record that ends blocks nothing: the notice states what happens instead, and it does happen', () => {
    const ending = reserveRecord(
      { rate: '0.15', base: 'human' },
      { offerId: MANAGED_OFFER, engagementForm: 'on_demand', effectiveUntil: day(4) }
    )

    const endingPolicy = policyRecord(CATEGORY.production, { rate: '0.20', minimumMargin: '0.10' }, day(4))
    const cat = withRecords(catalogV4, [endingPolicy, POLICIES[1], POLICIES[2], ...FORMS, ending])
    const review = reviewResourcePrices(policy, QUOTE_DATE, { catalog: cat as never })
    const reserveNotice = review.dueSoon.find(n => n.ref === ending.recordId)!
    const policyNotice = review.dueSoon.find(n => n.ref === endingPolicy.recordId)!

    expect(reserveNotice).toMatchObject({
      kind: 'hard_expiry',
      subject: 'catalog_record',
      blocksWith: null,
      daysLeft: 4
    })
    expect(reserveNotice.consequence).toContain('priced without a reserve')
    expect(reserveNotice.consequence).toContain('CONTINGENCY_WAIVER_WITHOUT_RESERVE')
    // Every other record keeps saying what it said: a quote that needs it cannot be resolved without it.
    expect(policyNotice).toMatchObject({ blocksWith: 'MISSING_CATALOG_SELECTION' })
    expect(policyNotice).not.toHaveProperty('consequence')
    expect(review.dueSoon.filter(n => 'consequence' in n).map(n => n.ref)).toEqual([ending.recordId])

    // What the notice says, run: the day after, the same demand is priced with no reserve and nothing names it.
    const after = (extra: BriefExtra = {}) =>
      compose(cat, demand({ ...extra, edit: brief => (brief.quoteDate = day(5)) }))

    const silent = after()

    expect(silent.quote.calculationStatus).toBe('calculated')
    expect(silent.quote.diagnostics).toEqual([])
    expect(silent.quote.totals).not.toHaveProperty('contingencyReserve')
    expect(silent.quote.resolution.bindings.some(b => b.record.kind === 'contingency_reserve')).toBe(false)
    // Nothing the resolution or the kernel says about that quote mentions a reserve, and it is, amount for amount,
    // the quote of a catalog that never held one.
    expect(JSON.stringify([silent.quote.resolution.assumptions, kernelCodes(silent)])).not.toMatch(
      /contingenc|reserve/i
    )
    expect(silent.quote.totals).toEqual(
      compose(
        withRecords(catalogV4, [endingPolicy, POLICIES[1], POLICIES[2], ...FORMS]),
        demand({ edit: brief => (brief.quoteDate = day(5)) })
      ).quote.totals
    )
    // The day before it ended it was a quote with a reserve.
    expect(
      new D(totalsOf(compose(cat, demand({ edit: brief => (brief.quoteDate = day(4)) }))).contingencyReserve).gt(0)
    ).toBe(true)
    // A brief that waives it is the one that is blocked, with the code the notice names.
    expect(after({ contingency: WAIVER }).quote.diagnostics.map(d => d.code)).toEqual([
      'CONTINGENCY_WAIVER_WITHOUT_RESERVE'
    ])
    // And the end of the rule of a category does block a quote that re-invoices a cost of it.
    expect(after({ costs: [PROD] }).quote.diagnostics.map(d => d.code)).toEqual(['MISSING_CATALOG_SELECTION'])

    // For one quote the notice is about that quote: one that waives the reserve is told it will be blocked.
    const waivedOnIt = compose(cat, demand({ contingency: WAIVER }))
    const keptIt = compose(cat, demand())

    const noticeFor = (result: Composition) =>
      quotePriceNotices(result, policy, QUOTE_DATE, { catalog: cat as never }).dueSoon.find(
        n => n.ref === ending.recordId
      )

    expect(noticeFor(keptIt)).toEqual(reserveNotice)
    expect(noticeFor(waivedOnIt)).toEqual({ ...reserveNotice, blocksWith: 'CONTINGENCY_WAIVER_WITHOUT_RESERVE' })
    // A quote of another form never selected the record: it is not one of its dates.
    expect(noticeFor(compose(cat, demand({ form: 'on_going' })))).toBeUndefined()
  })
})

describe('client allowlist of the catalog lane', () => {
  const brief = (extra: BriefExtra = {}) => withBrief(designerBrief, extra)

  // The export asks for a quote within policy; the fixture is historical, so the status is lifted as the other
  // tests of this view lift it. Nothing else of the quote is touched.
  const view = (quote: ReturnType<typeof calculateCatalogQuote>) =>
    projectCatalogQuote({ ...quote, reviewStatus: 'within_policy' }, 'selection-test')

  const usd = (costId: string, category: string, amount: string, extra: Record<string, unknown> = {}) =>
    cost(costId, category, amount, { currency: 'USD', ...extra })

  const costs = [
    usd('tp-rodaje', CATEGORY.production, '1234.50', { periodIds: [1, 3], label: 'Rodaje de la campaña' }),
    usd('tp-pauta', CATEGORY.media, '777.70', { periodIds: [2], label: 'Pauta en redes' })
  ]

  const direct = usd('tp-banco', CATEGORY.media, '432.10', {
    settlement: 'client_direct',
    quantity: '2',
    periodIds: [1, 2],
    label: 'Banco de imágenes contratado por el cliente'
  })

  const withDirect = calculateCatalogQuote(designerCatalog14, brief({ costs: [...costs, direct] }))
  const withoutDirect = calculateCatalogQuote(designerCatalog14, brief({ costs }))

  it('lists a cost the client pays apart, outside the totals, and only when the brief declares one', () => {
    expect(withDirect.calculationStatus).toBe('calculated')

    const listed = view(withDirect)
    const { clientPaidDirectly: apart, ...rest } = listed

    expect(apart).toEqual([{ label: direct.label, amount: '864.20', currency: 'USD', periodIds: [1, 2] }])
    // The rest of the view is the one of the quote that never declared it: no line and no total holds it.
    expect(rest).toEqual(view(withoutDirect))
    expect(view(withoutDirect)).not.toHaveProperty('clientPaidDirectly')
    expect(view(calculateCatalogQuote(designerCatalog, designerBrief))).not.toHaveProperty('clientPaidDirectly')
    expect(listed.totals.net).toBe(withDirect.totals!.net)
  })

  it('a re-invoiced cost is a line of its period by its concept and final net, inside the totals', () => {
    const listed = view(withDirect)

    // Each period of the quote is its own kernel result: the rows of a cost are read period by period.
    const rows = withDirect.periods.flatMap(p =>
      p.result.lines.filter(l => l.kind === 'third_party').map(l => [p.periodId, l.label, l.net])
    )

    expect(rows.map(([periodId, label]) => [periodId, label])).toEqual([
      [1, costs[0].label],
      [2, costs[1].label],
      [3, costs[0].label]
    ])
    expect(
      listed.periods.flatMap(p =>
        p.lines.filter(l => l.kind === 'third_party').map(l => [p.periodId, l.label, l.amount])
      )
    ).toEqual(rows)
    expect(sum(listed.periods.flatMap(p => p.lines.map(l => l.amount))).toFixed(2)).toBe(listed.totals.net)
  })

  it('carries no supplier, cost, rule or evidence, in JSON or Markdown', () => {
    const listed = view(withDirect)
    const text = JSON.stringify(listed) + catalogQuoteMarkdown(listed)

    expect(text).not.toContain(SUPPLIER)
    expect(text).not.toContain(EVIDENCE_REFERENCE)
    for (const word of [
      'cost',
      'margin',
      'factor',
      'source',
      'bindings',
      'catalog',
      'supplier',
      'evidence',
      'category'
    ])
      expect(JSON.stringify(listed)).not.toContain(word)
    for (const internal of [...Object.values(CATEGORY), ...costs.map(c => c.costId), direct.costId])
      expect(text).not.toContain(internal)
    // `production` nets more than its supplier charges: what it charges is not in the view.
    expect(text).not.toContain('1234.50')
  })

  it('the Markdown shows it after the totals, and is unchanged for a quote without one', () => {
    const text = catalogQuoteMarkdown(view(withDirect))
    const without = catalogQuoteMarkdown(view(withoutDirect))

    expect(text.startsWith(without)).toBe(true)
    expect(text.slice(without.length)).toContain(`| 1, 2 | ${direct.label} | 864.20 USD |`)
    expect(without).not.toMatch(/directamente/i)
  })

  it('no kernel input holds a cost the client pays: a kernel artifact has nothing to list it from', () => {
    const sent = withDirect.resolution.inputs.flatMap(p =>
      'thirdPartyCosts' in p.input.request ? (p.input.request.thirdPartyCosts ?? []).map(c => c.costId) : []
    )

    expect(sent.sort()).toEqual([costs[1].costId, costs[0].costId, costs[0].costId])
    expect(JSON.stringify(withDirect.resolution.inputs)).not.toContain(direct.label)
    expect(withDirect.resolution.brief!.thirdPartyCosts!.map(c => c.costId)).toContain(direct.costId)
  })
})

describe('every committed composition: a reading says of contract 1.4.0 only what the quote holds', () => {
  const root = resolve('.')

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const path = join(dir, entry.name)

      return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
    })

  const corpus = walk(resolve(root, 'data/pricing'))
    .map(path => relative(root, path))
    .filter(path => read(path).artifactVersion === COMPOSITION_VERSION)
    .sort()

  it('the walk finds the committed compositions', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(8)
  })

  it.each(corpus)('%s', path => {
    const artifact = replayResourceComposition(read(path))
    const result = artifact.semantic.result
    const declared = result.quote.resolution.brief?.thirdPartyCosts ?? []
    const suppliers = supplierRows(result).length > 0
    const paidByClient = declared.some(c => c.settlement === 'client_direct')
    const contract14 = 'ownWorkMarginRate' in result.quote.totals!

    const reserve = result.quote.resolution.inputs.some(
      ({ input }) => 'contingencyReserve' in input.snapshot && Boolean(input.snapshot.contingencyReserve)
    )

    const assessed = assessCompositionReadiness(result)
    const preview = projectCompositionPreview(result)
    const s = splitQuotedPrice(result, artifact, { tools: 'all' })
    const c = cash(result)
    const calendar = schedule(result, [{ id: 'all', label: 'Todo', share: '1', periodId: 1 }])
    const exposure = commitmentExposure(artifact)

    const notices = quotePriceNotices(artifact, artifact.semantic.policy, artifact.semantic.demand.brief.quoteDate, {
      withinDays: 4000,
      catalog: artifact.semantic.catalog,
      credits: artifact.semantic.credits
    })

    expect('ownWorkRate' in assessed.margin!).toBe(contract14)
    if (!declared.length)
      for (const code of NEW_GAPS.slice(0, 4)) expect(assessed.gaps.map(g => g.code)).not.toContain(code)
    expect('clientPaidDirectly' in preview).toBe(paidByClient)
    expect('thirdParty' in s.totals).toBe(suppliers)
    expect(s.rows.some(r => 'thirdParty' in r)).toBe(suppliers)
    expect('thirdParty' in c.totals.fullCostByNature).toBe(suppliers)
    expect('contingencyReserve' in c.totals.fullCostByNature).toBe(reserve)
    expect('thirdParty' in c.supplierCash).toBe(suppliers)
    expect('paidByClientDirectly' in c.supplierCash).toBe(paidByClient)
    expect('ownWork' in c.results.marginAtFullCost).toBe(suppliers)
    expect('thirdParty' in calendar).toBe(suppliers)
    expect('thirdPartyPurchasesOutsideThisReading' in exposure.reviewed).toBe(suppliers)
    expect(
      [...notices.reviewDue, ...notices.dueSoon, ...notices.expired].some(n => n.subject === 'third_party_quote')
    ).toBe(suppliers)

    // A quote that holds none of it carries no trace of the contract in any of these readings.
    if (!contract14 && !declared.length)
      expect(JSON.stringify([assessed, preview, s, c, calendar, exposure, notices])).not.toMatch(
        /thirdParty|third_party|third-party|contingenc|ownWork|clientPaid|paidByClient/i
      )
  })
})
