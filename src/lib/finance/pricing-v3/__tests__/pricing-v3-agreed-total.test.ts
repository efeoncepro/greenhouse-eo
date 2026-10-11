// An agreed price for the whole quote (`agreed_total` in `brief.adjustments`), through resolution, the catalog lane
// and the composition lane.
//
// The kernel does not know the declaration exists: resolution prices the quote once without it, distributes the total
// over the periods and billing classes in proportion to what each priced at, and hands the kernel its own agreed
// nets. What must hold is therefore taken from three places and never from a previous run of the code under test:
//   - the declaration itself: the nets of the rows it names add up to its amount, to the unit;
//   - the same quote WITHOUT the agreement: that is the policy price the distribution is proportional to, and the
//     rows the agreement does not name must not move;
//   - the kernel run again on the frozen inputs: what resolution handed it is what it priced.
//
// Catalogs, briefs and demands are built in memory from the committed fixtures; nothing is written under data/.
import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { explainCatalogQuote, replayCatalogQuote, runCatalogQuote } from '../adapters/catalog-local'
import { replayResourceComposition, runResourceComposition } from '../adapters/resource-composition'
import { settleAgreedTotals } from '../catalog/agreed-total'
import { briefSchema } from '../catalog/contracts'
import { describeAgreedTotals } from '../catalog/explain'
import { calculateCatalogQuote } from '../catalog/quote'
import { resolveBrief } from '../catalog/resolve'
import { calculatePricingV3 } from '../calculate'
import { composeResourceQuote } from '../resources/composition'
import { linesBelowPolicyFloor, summarizeComposition } from '../resources/summary'
import { PRICING_V3_MAX_ADJUSTMENTS_V11 } from '../schemas'

const D = Decimal.clone({ precision: 80 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => read(`data/pricing/v3-operating/${name}.json`)

// Catalog lane: three periods in USD (two decimals), one line, a one-time setup row in the first period.
const designerCatalog = read('data/pricing/v3-catalog/catalog.review-v1.json')
const designerBrief = read('data/pricing/v3-catalog/examples/designer.quote.artifact.json').semantic.brief
const [designLine]: string[] = designerBrief.lines.map((l: { lineId: string }) => l.lineId)

// Composition lane: a managed service in CLP (no decimals), six lines, tools composed into every row.
const managedCatalog = operating('catalog.review-v4')
const policy = operating('resources.review-v5')
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')
const managed = operating('managed-care.demand')
const managedLineIds: string[] = managed.brief.lines.map((l: { lineId: string }) => l.lineId)

type Quote = ReturnType<typeof calculateCatalogQuote>

const total = (amount: string, lineIds: string[], extra: Record<string, unknown> = {}) => ({
  adjustmentId: 'whole-price',
  kind: 'agreed_total',
  amount,
  lineIds,
  reason: 'One price agreed for the whole job.',
  ...extra
})

const quoteWith = (adjustments: unknown[], brief = designerBrief) =>
  calculateCatalogQuote(designerCatalog, { ...brief, adjustments })

const compose = (cat: unknown, demand: unknown) => composeResourceQuote(cat, policy, credits, demand)

const withAdjustments = (demand: typeof managed, adjustments: unknown[], periods?: number) => {
  const next = clone(demand)

  next.brief.adjustments = adjustments

  if (periods) {
    next.brief.periods = periods
    next.allocations = Array.from({ length: periods }, (_, i) =>
      demand.allocations.map((a: { periodId: number }) => ({ ...a, periodId: i + 1 }))
    ).flat()
  }

  return next
}

const rowsOf = (quote: Quote) =>
  quote.periods.flatMap(p => p.result.lines.map(line => ({ periodId: p.periodId, line })))

const netOf = (quote: Quote, named: string[]) =>
  rowsOf(quote)
    .filter(({ line }) => named.includes(line.parentLineId))
    .reduce((sum, { line }) => sum.plus(line.net), new D(0))

const settled = (quote: Quote) => {
  expect(quote.calculationStatus).toBe('calculated')
  expect('agreedTotals' in quote.resolution).toBe(true)

  const totals = 'agreedTotals' in quote.resolution ? quote.resolution.agreedTotals! : []

  expect(totals.length).toBeGreaterThan(0)

  return totals.map(entry => ({ ...entry, distribution: entry.distribution! }))
}

const codes = (quote: { diagnostics: { code: string }[] }) => quote.diagnostics.map(d => d.code)

describe('an agreed total is the net of what it names, for the whole term, to the unit', () => {
  const base = quoteWith([])
  const policyNet = netOf(base, [designLine])

  // Amounts that divide by nothing in particular: under the policy price, far under it, above it, one cent and zero.
  const amounts = ['4700.01', '1000', policyNet.plus('333.33').toFixed(2), '0.01', '0']

  it('the fixture bills a fee in every period and a start-up in the first', () => {
    expect(base.calculationStatus).toBe('calculated')
    expect(base.periods.map(p => p.result.lines.map(l => l.kind))).toEqual([
      ['monthly', 'setup'],
      ...Array(designerBrief.periods - 1).fill(['monthly'])
    ])
  })

  it.each(amounts)('%s: fee and start-up together add up to it, and every group is its part of it', amount => {
    const quote = quoteWith([total(amount, [designLine])])
    const [entry] = settled(quote)

    // The declaration, kept as written, and what it resolved to.
    expect(quote.resolution.brief!.adjustments).toEqual([total(amount, [designLine])])
    expect(entry.amount).toBe(amount)
    expect(netOf(quote, [designLine]).toFixed(2)).toBe(new D(amount).toFixed(2))
    expect(quote.totals!.net).toBe(new D(amount).toFixed(2))

    // One group per period and billing class that has a row; the policy net of each is the one of the quote
    // without the agreement, and they are all of it.
    expect(entry.distribution.map(g => [g.periodId, g.billing])).toEqual([
      [1, 'monthly'],
      [1, 'setup'],
      ...Array.from({ length: designerBrief.periods - 1 }, (_, i) => [i + 2, 'monthly'])
    ])

    for (const group of entry.distribution) {
      const rows = (of: Quote) =>
        rowsOf(of).filter(({ periodId, line }) => periodId === group.periodId && line.kind === group.billing)

      expect(group.policyNet).toBe(
        rows(base)
          .reduce((sum, { line }) => sum.plus(line.net), new D(0))
          .toFixed(2)
      )
      // The kernel priced the rows of the group at exactly what resolution handed it.
      expect(
        rows(quote)
          .reduce((sum, { line }) => sum.plus(line.net), new D(0))
          .toFixed(2)
      ).toBe(group.agreedNet)
      expect(new D(group.agreedNet).gte(0)).toBe(true)
    }

    expect(entry.policyNet).toBe(policyNet.toFixed(2))
    expect(entry.distribution.reduce((sum, g) => sum.plus(g.agreedNet), new D(0)).eq(amount)).toBe(true)

    // Proportional at the precision of the currency, rounded down; the last group takes what is left.
    const last = entry.distribution.at(-1)!

    for (const group of entry.distribution.slice(0, -1))
      expect(group.agreedNet).toBe(new D(amount).mul(group.policyNet).div(policyNet).toFixed(2, D.ROUND_DOWN))

    expect(
      new D(last.agreedNet)
        .minus(new D(amount).mul(last.policyNet).div(policyNet))
        .abs()
        .lt(new D('0.01').mul(entry.distribution.length))
    ).toBe(true)

    // Cost never moves with a price.
    expect(quote.totals!.cost).toBe(base.totals!.cost)
  })

  it('the kernel receives its own agreed nets, one per period and billing class, and never the declaration', () => {
    const quote = quoteWith([total('4700.01', [designLine])])
    const [entry] = settled(quote)

    expect(
      quote.resolution.inputs.map(p =>
        p.input.request.adjustments.map(a => [a.adjustmentId, a.kind, 'billing' in a ? a.billing : null])
      )
    ).toEqual([
      [
        ['whole-price:monthly', 'agreed_net', 'monthly'],
        ['whole-price:setup', 'agreed_net', 'setup']
      ],
      ...Array(designerBrief.periods - 1).fill([['whole-price:monthly', 'agreed_net', 'monthly']])
    ])

    // Each frozen input priced by the kernel alone gives the period the quote holds: nothing else is in play.
    for (const period of quote.resolution.inputs) {
      const alone = calculatePricingV3(period.input)

      expect(alone.totals!.net).toBe(quote.periods.find(p => p.periodId === period.periodId)!.result.totals!.net)
      expect(period.input.request.adjustments.map(a => ('amount' in a ? a.amount : null)).sort()).toEqual(
        entry.distribution
          .filter(g => g.periodId === period.periodId)
          .map(g => g.agreedNet)
          .sort()
      )
    }
  })

  it('a total over the policy price is an uplift and one under it a discount, row by row', () => {
    const over = quoteWith([total(policyNet.plus(500).toFixed(2), [designLine])])
    const under = quoteWith([total(policyNet.minus(500).toFixed(2), [designLine])])
    const read = (quote: Quote) => quote.totals as Record<string, string>

    expect([read(over).uplift, read(over).discount]).toEqual(['500.00', '0.00'])
    expect([read(under).uplift, read(under).discount]).toEqual(['0.00', '500.00'])
  })

  it('resolution alone declares it and the second pass settles it once', () => {
    const resolution = resolveBrief(designerCatalog, {
      ...designerBrief,
      adjustments: [total('4700.01', [designLine])]
    })

    expect(resolution.status).toBe('resolved')
    expect('agreedTotals' in resolution && resolution.agreedTotals).toEqual([
      {
        adjustmentId: 'whole-price',
        amount: '4700.01',
        currency: designerBrief.outputCurrency,
        lineIds: [designLine],
        reason: 'One price agreed for the whole job.',
        policyNet: null,
        distributionUnit: null,
        distributionUnitBasis: null,
        distribution: null
      }
    ])
    expect(resolution.inputs.flatMap(p => p.input.request.adjustments)).toEqual([])

    const once = clone(settleAgreedTotals(resolution))

    // Settling again changes nothing: no adjustment is handed to a period twice.
    expect(clone(settleAgreedTotals(resolution))).toEqual(once)
    expect(once.inputs[0].input.request.adjustments).toHaveLength(2)
  })

  it('a brief without one resolves to exactly what it resolved to before the declaration existed', () => {
    const resolution = resolveBrief(designerCatalog, designerBrief)
    const before = clone(resolution)

    expect('agreedTotals' in resolution).toBe(false)
    expect(settleAgreedTotals(resolution)).toBe(resolution)
    expect(clone(resolution)).toEqual(before)
    expect(describeAgreedTotals(resolution)).toBeNull()
    expect(briefSchema.parse(designerBrief).adjustments).toEqual([])
  })
})

describe('an agreed total over a composed quote: a programme of several months sold at one price', () => {
  const periods = 3
  const base = compose(managedCatalog, withAdjustments(managed, [], periods))
  // The price of the whole programme at policy, with the tools the composition added to every row.
  const policyNet = new D(base.quote.totals!.net)

  // Under the policy price and over it; neither divides by three.
  const amounts = [policyNet.mul('0.31').toFixed(0), policyNet.plus(1000001).toFixed(0)].map(amount =>
    new D(amount).mod(periods).isZero() ? new D(amount).plus(1).toFixed(0) : amount
  )

  it('the fixture is a calculated programme whose periods cost the same', () => {
    expect(base.quote.calculationStatus).toBe('calculated')
    expect(new Set(base.quote.periods.map(p => p.result.totals!.net)).size).toBe(1)
    expect(base.attributions.length).toBeGreaterThan(0)
  })

  it.each(amounts)('%s does not divide by the term and the periods still add up to it', amount => {
    const r = compose(managedCatalog, withAdjustments(managed, [total(amount, managedLineIds)], periods))
    const [entry] = settled(r.quote)
    const nets = r.quote.periods.map(p => p.result.totals!.net)

    expect(new D(amount).mod(periods).isZero()).toBe(false)
    expect(r.quote.totals!.net).toBe(amount)
    expect(nets.reduce((sum, net) => sum.plus(net), new D(0)).toFixed(0)).toBe(amount)
    // Equal periods get equal parts, and the last one what the proportion left over: never more than a unit a group.
    expect(new Set(nets.slice(0, -1)).size).toBe(1)
    expect(new D(nets.at(-1)!).minus(nets[0]).abs().lt(periods)).toBe(true)

    // The policy net is read with the tools in: it is the net of the same demand quoted without the agreement.
    expect(entry.policyNet).toBe(base.quote.totals!.net)
    expect(entry.distribution.map(g => g.policyNet)).toEqual(base.quote.periods.map(p => p.result.totals!.net))
    expect(r.quote.totals!.cost).toBe(base.quote.totals!.cost)
  })

  it('floors stay per row: exactly the rows whose net is under their floor are flagged', () => {
    for (const amount of amounts) {
      const r = compose(managedCatalog, withAdjustments(managed, [total(amount, managedLineIds)], periods))
      const flagged = linesBelowPolicyFloor(r).map(line => `${line.periodId}:${line.lineId}`)

      const under = r.quote.periods.flatMap(p =>
        p.result.lines
          .filter(line => new D(line.marginAmount).div(line.net).lt(line.minimumMargin))
          .map(line => `${p.periodId}:${line.lineId}`)
      )

      expect(flagged.sort()).toEqual(under.sort())
    }

    // The two amounts sit on either side of the floor of the offer, so the check above has both outcomes in it.
    const flaggedAt = (amount: string) =>
      linesBelowPolicyFloor(compose(managedCatalog, withAdjustments(managed, [total(amount, managedLineIds)], periods)))
        .length

    expect(flaggedAt(amounts[0])).toBe(managedLineIds.length * periods)
    expect(flaggedAt(amounts[1])).toBe(linesBelowPolicyFloor(base).length)
  })

  it('names only some lines: the others keep the price they had', () => {
    const [first, ...rest] = managedLineIds
    const amount = netOf(base.quote, [first]).mul('0.9').toFixed(0)
    const r = compose(managedCatalog, withAdjustments(managed, [total(amount, [first])], periods))

    expect(netOf(r.quote, [first]).toFixed(0)).toBe(amount)
    expect(netOf(r.quote, rest).toFixed(0)).toBe(netOf(base.quote, rest).toFixed(0))
  })

  it('the summary reports the total, the policy net it stands against and its distribution', () => {
    const [amount] = amounts
    const r = compose(managedCatalog, withAdjustments(managed, [total(amount, managedLineIds)], periods))
    const summary = summarizeComposition(r, { calculationId: 'test' })
    const [reported] = summary.agreedTotals!

    expect(summary.commercialAdjustments).toEqual([total(amount, managedLineIds)])
    expect(reported).toMatchObject({
      adjustmentId: 'whole-price',
      currency: managed.brief.outputCurrency,
      amount,
      policyNet: base.quote.totals!.net,
      differenceFromPolicyNet: new D(amount).minus(policyNet).toFixed(0)
    })
    // Periods handed the same amount are one entry; every period is in exactly one.
    expect(reported.distribution!.flatMap(g => g.periodIds).sort()).toEqual([1, 2, 3])
    expect(
      reported
        .distribution!.reduce((sum, g) => sum.plus(new D(g.agreedNet).mul(g.periodIds.length)), new D(0))
        .toFixed(0)
    ).toBe(amount)
    // A quote that declares none keeps the keys it had.
    expect(summarizeComposition(base, { calculationId: 'test' })).not.toHaveProperty('agreedTotals')
  })
})

describe('third-party costs are outside an agreed total unless it names them', () => {
  // A category of the test, with a handling of its own: nothing here is a rate the catalog issues.
  const category = 'cat-produccion-7001'

  const withCategory = {
    ...managedCatalog,
    records: [
      ...managedCatalog.records,
      {
        recordId: `third-party:${category}`,
        revision: 1,
        kind: 'third_party_policy',
        source: {
          reference: 'agreed-total-test',
          effectiveFrom: '2026-01-01',
          effectiveUntil: '9999-12-31',
          status: 'confirmed'
        },
        note: 'Price rule of a category of third-party cost, declared for the test.',
        value: {
          category,
          label: 'Producción',
          method: 'markup',
          rate: '0.20',
          minimumMargin: '0.10',
          rounding: 'none'
        }
      }
    ]
  }

  const cost = {
    costId: 'tp-rodaje',
    category,
    label: 'Rodaje',
    supplier: 'Proveedor de prueba',
    settlement: 'reinvoiced',
    amount: '2000000',
    currency: 'CLP',
    quantity: '1',
    periodIds: [1],
    evidence: {
      reference: 'supplier-quote:test',
      effectiveFrom: '2026-10-01',
      effectiveUntil: '2026-12-31',
      status: 'confirmed'
    }
  }

  const withCost = (adjustments: unknown[]) => {
    const next = withAdjustments(managed, adjustments)

    next.brief.thirdPartyCosts = [cost]

    return compose(withCategory, next)
  }

  const base = withCost([])
  const teamNet = netOf(base.quote, managedLineIds)
  const costNet = netOf(base.quote, [cost.costId])

  it('the fixture re-invoices one cost as a row of its own', () => {
    expect(base.quote.calculationStatus).toBe('calculated')
    expect(costNet.gt(cost.amount)).toBe(true)
    expect(new D(base.quote.totals!.net).eq(teamNet.plus(costNet))).toBe(true)
  })

  it('unnamed, the cost keeps the price of its category and is added to the agreed total', () => {
    const amount = teamNet.mul('0.9').toFixed(0)
    const r = withCost([total(amount, managedLineIds)])
    const [entry] = settled(r.quote)

    expect(entry.distribution.map(g => g.billing)).toEqual(['monthly'])
    expect(netOf(r.quote, managedLineIds).toFixed(0)).toBe(amount)
    expect(netOf(r.quote, [cost.costId]).eq(costNet)).toBe(true)
    expect(new D(r.quote.totals!.net).eq(new D(amount).plus(costNet))).toBe(true)
  })

  it('named by its costId, the cost is inside the agreed total, as a billing class of its own', () => {
    const amount = teamNet.plus(costNet).mul('0.9').toFixed(0)
    const r = withCost([total(amount, [...managedLineIds, cost.costId])])
    const [entry] = settled(r.quote)

    expect(r.quote.totals!.net).toBe(amount)
    expect(entry.distribution.map(g => [g.billing, g.lineIds])).toEqual([
      ['monthly', managedLineIds],
      ['third_party', [cost.costId]]
    ])
    // The kernel is handed the cost the way it already requires it: an agreed net of billing `third_party`.
    expect(
      r.quote.resolution.inputs[0].input.request.adjustments.map(a => ['billing' in a ? a.billing : null, a.lineIds])
    ).toEqual([
      ['monthly', managedLineIds],
      ['third_party', [cost.costId]]
    ])
    expect(netOf(r.quote, [cost.costId]).toFixed(0)).toBe(entry.distribution[1].agreedNet)
  })

  it('a cost the client pays to the supplier has no row, so an agreed total cannot name it', () => {
    const next = withAdjustments(managed, [total('9000000', [...managedLineIds, cost.costId])])

    next.brief.thirdPartyCosts = [{ ...cost, settlement: 'client_direct' }]

    expect(compose(withCategory, next).quote.diagnostics).toContainEqual({
      code: 'INVALID_ADJUSTMENT_LINE',
      path: 'adjustments'
    })
  })

  it('an agreed net of third-party costs and an agreed total may not name the same cost', () => {
    const r = withCost([
      total('9000000', [...managedLineIds, cost.costId]),
      {
        adjustmentId: 'n',
        kind: 'agreed_net',
        amount: '2100000',
        billing: 'third_party',
        lineIds: [cost.costId],
        reason: 'Net.'
      }
    ])

    expect(codes(r.quote)).toContain('AGREED_TOTAL_OVERLAPS_ADJUSTMENT')
    expect(r.quote.totals).toBeNull()
  })
})

describe('the tax of a quote sold at one price is the tax of that price', () => {
  // The kernel rounds the tax of each period and the quote adds them up. An agreed total is therefore distributed in
  // the unit in which the rate of the quote taxes a share with nothing to round, so only one period rounds, once.
  const iva = (rate: string) => ({
    kind: 'exclusive',
    rate,
    policyRef: 'test:tax',
    source: { reference: 'test:tax', effectiveFrom: '2026-01-01', effectiveUntil: '9999-12-31', status: 'confirmed' }
  })

  // A person in pesos: three months, a fee in each and a start-up in the first, on the catalog and policy in force.
  const personCatalog = operating('catalog.review-v10')
  const personPolicy = operating('resources.review-v11')
  const person = operating('designer-three-months-iva.demand')
  const [personLine]: string[] = person.brief.lines.map((l: { lineId: string }) => l.lineId)

  const programme = (amount: string, taxTreatment: unknown) => {
    const next = withAdjustments(managed, [total(amount, managedLineIds)], 3)

    next.brief.taxTreatment = taxTreatment

    return compose(managedCatalog, next).quote
  }

  const personQuote = (amount: string, taxTreatment: unknown, edit?: (demand: typeof person) => void) => {
    const next = clone(person)

    next.brief.adjustments = [total(amount, [personLine])]
    next.brief.taxTreatment = taxTreatment
    edit?.(next)

    return composeResourceQuote(personCatalog, personPolicy, credits, next).quote
  }

  const once = (amount: string, rate: string, decimals: number) =>
    new D(amount).mul(rate).toFixed(decimals, D.ROUND_HALF_UP)

  /** What must hold of a quote whose every row is inside one agreed total. */
  const taxIsTheTaxOfTheTotal = (quote: Quote, amount: string, rate: string, unit: string) => {
    const [entry] = settled(quote)
    const decimals = quote.totals!.net.split('.')[1]?.length ?? 0
    const taxes = quote.periods.map(p => p.result.totals!.tax!)

    expect(quote.totals!.net).toBe(new D(amount).toFixed(decimals))
    expect(entry.distributionUnit).toBe(unit)
    expect(entry.distributionUnitBasis).toBe('tax_exact')
    // The quote adds up the taxes the kernel rounded period by period, and they are the rate on the total, once.
    expect(taxes.reduce((sum, tax) => sum.plus(tax), new D(0)).toFixed(decimals)).toBe(quote.totals!.tax)
    expect(quote.totals!.tax).toBe(once(amount, rate, decimals))
    expect(quote.totals!.grandTotal).toBe(new D(amount).plus(once(amount, rate, decimals)).toFixed(decimals))

    // Every share but the last is a whole number of units, so its tax has nothing to round; the shares are still
    // each group's part of the total, within a unit, and they add up to it.
    const withPrice = entry.distribution.filter(g => new D(g.policyNet).gt(0))

    for (const group of withPrice.slice(0, -1)) {
      const fair = new D(amount).mul(group.policyNet).div(entry.policyNet!)

      expect(new D(group.agreedNet).mod(unit).isZero()).toBe(true)
      expect(new D(group.agreedNet).mul(rate).decimalPlaces()).toBeLessThanOrEqual(decimals)
      expect(fair.minus(group.agreedNet).gte(0) && fair.minus(group.agreedNet).lt(unit)).toBe(true)
    }

    expect(entry.distribution.reduce((sum, g) => sum.plus(g.agreedNet), new D(0)).eq(amount)).toBe(true)

    return entry
  }

  it('the fixtures: a programme of three equal months, and a person with a fee and a start-up', () => {
    expect(programme('16000000', iva('0.19')).calculationStatus).toBe('calculated')
    expect(personQuote('7000000', iva('0.19')).periods.map(p => p.result.lines.map(l => l.kind))).toEqual([
      ['monthly', 'setup'],
      ['monthly'],
      ['monthly']
    ])
  })

  it('4,700,000 at 19 % is taxed 893,000', () => {
    const quote = programme('4700000', iva('0.19'))

    taxIsTheTaxOfTheTotal(quote, '4700000', '0.19', '100')
    expect(quote.totals!.tax).toBe('893000')
    expect(quote.periods.map(p => p.result.totals!.net)).toEqual(['1566600', '1566600', '1566800'])
  })

  it('16,000,000 at 19 % is taxed 3,040,000', () => {
    const quote = programme('16000000', iva('0.19'))

    taxIsTheTaxOfTheTotal(quote, '16000000', '0.19', '100')
    expect(quote.totals!.tax).toBe('3040000')
  })

  it('11,400,000 at 19 %, fee and start-up together, is taxed 2,166,000', () => {
    const quote = personQuote('11400000', iva('0.19'))
    const entry = taxIsTheTaxOfTheTotal(quote, '11400000', '0.19', '100')

    expect(quote.totals!.tax).toBe('2166000')
    expect(entry.distribution.map(g => [g.periodId, g.billing])).toEqual([
      [1, 'monthly'],
      [1, 'setup'],
      [2, 'monthly'],
      [3, 'monthly']
    ])
  })

  it('a rate with more decimals has a larger unit: 19.25 % is 77/400', () => {
    taxIsTheTaxOfTheTotal(programme('4700000', iva('0.1925')), '4700000', '0.1925', '400')
    taxIsTheTaxOfTheTotal(personQuote('11400000', iva('0.1925')), '11400000', '0.1925', '400')
  })

  it('a total that is not a multiple of the unit: the last group takes the odd part and rounds once', () => {
    // 19 % of 4,700,050 is 893,009.5, and of 11,400,033 is 2,166,006.27.
    expect(
      taxIsTheTaxOfTheTotal(programme('4700050', iva('0.19')), '4700050', '0.19', '100').distribution.at(-1)!.agreedNet
    ).toBe('1566850')
    taxIsTheTaxOfTheTotal(personQuote('11400033', iva('0.19')), '11400033', '0.19', '100')
    taxIsTheTaxOfTheTotal(programme('4700050', iva('0.1925')), '4700050', '0.1925', '400')
  })

  it('in a currency with cents the unit is the same number of cents', () => {
    const dollars = (amount: string, rate: string) =>
      calculateCatalogQuote(designerCatalog, {
        ...designerBrief,
        taxTreatment: iva(rate),
        adjustments: [total(amount, [designLine])]
      })

    // 19/100 taxes a whole dollar exactly; 77/400 taxes four.
    taxIsTheTaxOfTheTotal(dollars('4700.01', '0.19'), '4700.01', '0.19', '1.00')
    taxIsTheTaxOfTheTotal(dollars('4700.01', '0.1925'), '4700.01', '0.1925', '4.00')
    // A rate of a whole number of tenths of a percent on cents: 8.5 % is 17/200.
    taxIsTheTaxOfTheTotal(dollars('9999.99', '0.085'), '9999.99', '0.085', '2.00')
  })

  it('fee, start-up and a re-invoiced cost inside one total: three billing classes, one tax', () => {
    const category = 'cat-produccion-7002'

    const withCategory = {
      ...personCatalog,
      records: [
        ...personCatalog.records,
        {
          recordId: `third-party:${category}`,
          revision: 1,
          kind: 'third_party_policy',
          source: {
            reference: 'agreed-total-test',
            effectiveFrom: '2026-01-01',
            effectiveUntil: '9999-12-31',
            status: 'confirmed'
          },
          note: 'Price rule of a category of third-party cost, declared for the test.',
          value: {
            category,
            label: 'Producción',
            method: 'markup',
            rate: '0.2',
            minimumMargin: '0.1',
            rounding: 'none'
          }
        }
      ]
    }

    const next = clone(person)

    next.brief.thirdPartyCosts = [
      {
        costId: 'tp-rodaje',
        category,
        label: 'Rodaje',
        supplier: 'Proveedor de prueba',
        settlement: 'reinvoiced',
        amount: '1234567',
        currency: 'CLP',
        quantity: '1',
        periodIds: [2],
        evidence: {
          reference: 'supplier-quote:test',
          effectiveFrom: '2026-10-01',
          effectiveUntil: '2026-12-31',
          status: 'confirmed'
        }
      }
    ]
    next.brief.adjustments = [total('9876543', [personLine, 'tp-rodaje'])]
    next.brief.taxTreatment = iva('0.19')

    const quote = composeResourceQuote(withCategory, personPolicy, credits, next).quote
    const entry = taxIsTheTaxOfTheTotal(quote, '9876543', '0.19', '100')

    expect(entry.distribution.map(g => [g.periodId, g.billing])).toEqual([
      [1, 'monthly'],
      [1, 'setup'],
      [2, 'monthly'],
      [2, 'third_party'],
      [3, 'monthly']
    ])
  })

  it('a group whose part is smaller than the unit is not zeroed: the distribution falls back and says so', () => {
    // 250 pesos over three equal months: 83 each, under the 100 the rate needs. And a start-up far smaller than a fee.
    const tiny = programme('250', iva('0.19'))
    const [entry] = settled(tiny)

    expect(entry.distributionUnit).toBe('1')
    expect(entry.distributionUnitBasis).toBe('currency_precision_fallback')
    expect(entry.distribution.map(g => g.agreedNet)).toEqual(['83', '83', '84'])
    expect(tiny.totals!.net).toBe('250')
    // The price the fallback keeps exact is the net; the tax is then the sum of three rounded taxes.
    expect(tiny.totals!.tax).toBe(
      entry.distribution
        .reduce((sum, g) => sum.plus(new D(g.agreedNet).mul('0.19').toFixed(0, D.ROUND_HALF_UP)), new D(0))
        .toFixed(0)
    )

    // The same total with a unit it can bear is not a fallback.
    expect(settled(programme('300', iva('0.19')))[0]).toMatchObject({
      distributionUnit: '100',
      distributionUnitBasis: 'tax_exact'
    })
    // A total of zero hands every group nothing by its own amount, not by the unit.
    expect(settled(programme('0', iva('0.19')))[0].distributionUnitBasis).toBe('tax_exact')
  })

  it('without a tax to keep exact the unit is the minor unit of the currency, as it was', () => {
    for (const treatment of [{ kind: 'not_resolved' }, { kind: 'not_applicable', reason: 'Exported service.' }]) {
      const quote = programme('4700000', treatment)
      const [entry] = settled(quote)

      expect(entry.distributionUnit).toBe('1')
      expect(entry.distributionUnitBasis).toBe('currency_precision')
      expect(entry.distribution.map(g => g.agreedNet)).toEqual(['1566666', '1566666', '1566668'])
    }

    // An exclusive rate of zero taxes any share exactly: the unit is the minor unit and nothing is a fallback.
    expect(settled(programme('4700000', iva('0')))[0]).toMatchObject({
      distributionUnit: '1',
      distributionUnitBasis: 'tax_exact'
    })
  })

  it('the summary says which unit the distribution was made in', () => {
    const next = withAdjustments(managed, [total('4700000', managedLineIds)], 3)

    next.brief.taxTreatment = iva('0.19')

    const [reported] = summarizeComposition(compose(managedCatalog, next), { calculationId: 'test' }).agreedTotals!

    expect(reported).toMatchObject({ distributionUnit: '100', distributionUnitBasis: 'tax_exact' })
  })
})

describe('a frozen quote with an agreed total replays to the digest it was signed with', () => {
  it('catalog lane', () => {
    const artifact = runCatalogQuote(designerCatalog, {
      ...designerBrief,
      adjustments: [total('4700.01', [designLine])]
    })

    const frozen = clone(artifact)
    const replay = replayCatalogQuote(frozen)

    expect(replay.replayDigest).toBe(artifact.replayDigest)
    // Both passes are in the frozen result: what the first read and what each period was handed.
    expect(frozen.semantic.result.resolution).toHaveProperty('agreedTotals')
    expect(explainCatalogQuote(frozen).commercialAdjustments.agreedTotals).toEqual(
      describeAgreedTotals(artifact.semantic.result.resolution)
    )
  })

  it('composition lane, and a frozen distribution that was edited no longer verifies', () => {
    const demand = withAdjustments(managed, [total('9000001', managedLineIds)], 3)
    const artifact = runResourceComposition(managedCatalog, policy, credits, demand)
    const frozen = clone(artifact)

    expect(artifact.semantic.result.quote.calculationStatus).toBe('calculated')
    expect(replayResourceComposition(frozen).replayDigest).toBe(artifact.replayDigest)

    const edited = clone(artifact)

    edited.semantic.result.quote.resolution.agreedTotals![0].distribution![0].agreedNet = '1'
    expect(() => replayResourceComposition(edited)).toThrow('REPLAY_MISMATCH')
  })
})

describe('what an agreed total may not be', () => {
  const blocked = (adjustments: unknown[], brief = designerBrief) => {
    const quote = quoteWith(adjustments, brief)

    expect(quote.calculationStatus).toBe('needs_input')
    expect(quote.totals).toBeNull()

    return quote
  }

  it('it shares no line with another adjustment, of any kind or billing class, and names each once', () => {
    const others = [
      { adjustmentId: 'd', kind: 'discount', rate: '0.05', lineIds: [designLine], reason: 'Discount under test.' },
      { adjustmentId: 'n', kind: 'agreed_net', amount: '10', billing: 'setup', lineIds: [designLine], reason: 'Net.' },
      total('100', [designLine], { adjustmentId: 'another-total' })
    ]

    for (const other of others)
      expect(blocked([total('4700', [designLine]), other]).diagnostics).toContainEqual(
        expect.objectContaining({ code: 'AGREED_TOTAL_OVERLAPS_ADJUSTMENT', path: 'adjustments.whole-price' })
      )

    expect(codes(blocked([total('4700', [designLine, designLine])]))).toContain('AGREED_TOTAL_OVERLAPS_ADJUSTMENT')
    // The reason is a rule; it repeats no amount and no id of the brief.
    expect(JSON.stringify(blocked([total('4700', [designLine]), others[0]]).diagnostics)).not.toMatch(/4700|0\.05/)
  })

  it('it names lines of the brief, or costs the brief re-invoices', () => {
    expect(blocked([total('4700', [designLine, 'no-such-line'])]).diagnostics).toContainEqual({
      code: 'INVALID_ADJUSTMENT_LINE',
      path: 'adjustments'
    })
  })

  it('it has no more decimals than the currency holds', () => {
    const quote = blocked([total('4700.001', [designLine])])

    expect(quote.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'AGREED_TOTAL_NOT_REPRESENTABLE', path: 'adjustments.whole-price.amount' })
    )
    expect(JSON.stringify(quote.diagnostics)).not.toContain('4700.001')

    // Pesos have none.
    const pesos = compose(managedCatalog, withAdjustments(managed, [total('9000000.5', managedLineIds)]))

    expect(codes(pesos.quote)).toContain('AGREED_TOTAL_NOT_REPRESENTABLE')
    expect(pesos.quote.totals).toBeNull()
  })

  it('a total above zero needs rows with a price: over rows that price at zero there is nothing to share it by', () => {
    // The same quote with every cost at zero, each with its reason: the rows exist and price at nothing.
    const free = clone(designerCatalog)

    for (const record of free.records) {
      if (record.kind === 'cost') for (const component of record.value.components) component.amount = '0'
      if (record.kind === 'resource') record.value.amount = '0'
      if (record.kind === 'cost' || record.kind === 'resource')
        record.source.zeroReason = 'Costed at zero for the test.'
    }

    const quote = (amount: string) =>
      calculateCatalogQuote(free, { ...designerBrief, adjustments: [total(amount, [designLine])] })

    expect(calculateCatalogQuote(free, designerBrief).totals!.net).toBe('0.00')
    expect(quote('100').diagnostics).toContainEqual(
      expect.objectContaining({ code: 'AGREED_TOTAL_WITHOUT_BASE', path: 'adjustments.whole-price' })
    )
    expect(quote('100').totals).toBeNull()

    // A total of zero over the same rows is what they already are: it settles, and hands the kernel nothing.
    const nothing = quote('0')
    const [entry] = settled(nothing)

    expect(nothing.totals!.net).toBe('0.00')
    expect(entry.distribution.map(g => g.agreedNet)).toEqual(entry.distribution.map(() => '0.00'))
    expect(nothing.resolution.inputs.flatMap(p => p.input.request.adjustments)).toEqual([])
  })

  it('its agreed nets are named after it, so no other adjustment may take one of those names', () => {
    const [first, second] = managedLineIds

    const taken = compose(
      managedCatalog,
      withAdjustments(managed, [
        total('4000000', [first]),
        {
          adjustmentId: 'whole-price:monthly',
          kind: 'discount',
          rate: '0.05',
          lineIds: [second],
          reason: 'Discount under test.'
        }
      ])
    )

    expect(taken.quote.diagnostics).toContainEqual({ code: 'DUPLICATE_ADJUSTMENT_ID', path: 'adjustments' })
    // An id long enough for its names not to fit the kernel is refused by the brief itself.
    expect(
      briefSchema.safeParse({
        ...designerBrief,
        adjustments: [total('1', [designLine], { adjustmentId: 'x'.repeat(101) })]
      }).success
    ).toBe(false)
  })

  it('a quote that does not calculate without it has no policy price to distribute it over', () => {
    const [first, ...rest] = managedLineIds

    const r = compose(
      managedCatalog,
      withAdjustments(managed, [
        total('4000000', rest),
        // More decimals than pesos hold: the kernel refuses the period, with or without the agreed total.
        { adjustmentId: 'n', kind: 'agreed_net', amount: '100.5', billing: 'monthly', lineIds: [first], reason: 'Net.' }
      ])
    )

    expect(r.quote.totals).toBeNull()
    expect(r.quote.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'AGREED_TOTAL_WITHOUT_POLICY_PRICE', path: 'adjustments.whole-price' })
    )
    // No period was handed an agreed net it could not be proportional to.
    expect(r.quote.resolution.inputs.flatMap(p => p.input.request.adjustments.map(a => a.adjustmentId))).toEqual(['n'])
  })

  it(`with its agreed nets a period still takes ${PRICING_V3_MAX_ADJUSTMENTS_V11} adjustments and no more`, () => {
    // Six people, each with a fee and a start-up in the first period, each under a total of its own.
    const lineIds = Array.from({ length: 6 }, (_, i) => `person-${i + 1}`)

    const brief = {
      ...designerBrief,
      lines: lineIds.map(lineId => ({ ...designerBrief.lines[0], lineId, teamId: `team-${lineId}` }))
    }

    const each = (count: number) =>
      lineIds.slice(0, count).map(lineId => total('4000', [lineId], { adjustmentId: `price-${lineId}` }))

    expect(calculateCatalogQuote(designerCatalog, brief).calculationStatus).toBe('calculated')
    expect(quoteWith(each(5), brief).calculationStatus).toBe('calculated')
    expect(blocked(each(6), brief).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'ADJUSTMENTS_EXCEED_PERIOD_LIMIT', path: 'periods.1.adjustments' })
    )
  })
})
