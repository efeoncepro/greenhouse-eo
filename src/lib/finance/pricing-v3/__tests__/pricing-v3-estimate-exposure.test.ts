// Estimate exposure: which of the estimated inputs of a quote carry its cost (resources/summary.ts).
//
// The reading is derived from the frozen result and recalculates nothing. Its real verifier therefore does
// recalculate: every input the reading names is raised 10 % in an in-memory copy of the catalog, the resource policy
// or the credit catalog, the quote is composed again by `composeResourceQuote`, and the cost must have moved by 10 %
// of the cost the reading put on that input. A ranking that only looks plausible does not pass that.
//
// Everything is built in memory from the committed fixtures; nothing is written under data/. Expected amounts come
// from the recomputation, from the frozen components of the result or from the fixture, never from a previous run
// of the reading.
import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { catalogDigest } from '../adapters/catalog-local'
import { composeResourceQuote } from '../resources/composition'
import { assessCompositionReadiness } from '../resources/readiness'
import { costInputExposure, estimateExposure, summarizeComposition } from '../resources/summary'

const D = Decimal.clone({ precision: 80 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => read(`data/pricing/v3-operating/${name}.json`)
const skyArtifact = read('docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json')
const colombiaArtifact = operating('managed-care-colombia.artifact')

type Composition = ReturnType<typeof composeResourceQuote>
type Reading = NonNullable<ReturnType<typeof costInputExposure>>
type Input = Reading['costInputs'][number]
type Source = { status: string; effectiveFrom: string; effectiveUntil: string }
type CatalogDoc = { records: { kind: string; recordId: string; source: Source; value: Record<string, unknown> }[] }

type PolicyDoc = {
  tools: {
    toolId: string
    providerId?: string
    prices: { priceId: string; catalogResourceId?: string; price?: { amount: string; source: Source } }[]
  }[]
}

type CreditsDoc = { providers: { providerId: string; subscription: { amount: string }; packs: { amount: string }[] }[] }

type DemandDoc = {
  brief: {
    quoteDate: string
    outputCurrency: string
    offerMarketCountry: string
    periods: number
    lines: {
      lineId: string
      talentCountry: string
      dedication: { unit: string; value: string }
      dedicationEvidence?: Source & { reference: string }
    }[]
  }
  allocations: { periodId: number }[]
  work: { creditDemand: { toolId: string; credits: number }[] }[]
}

type Case = { name: string; catalog: CatalogDoc; policy: PolicyDoc; credits: CreditsDoc; demand: DemandDoc }

const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')

const fixture = (name: string, catalog: string, policy: string, demand: string): Case => ({
  name,
  catalog: operating(catalog),
  policy: operating(policy),
  credits,
  demand: operating(demand)
})

/** The committed Colombian example on the catalog in force: confirmed person costs, an estimated talent factor. */
const colombia = fixture(
  'Colombia, catalog v5',
  'catalog.review-v5',
  'resources.review-v5',
  'managed-care-colombia.demand'
)

/** The same service on the catalog before costs and FX were confirmed: person costs and the output FX estimated. */
const earlier = fixture('Chile, catalog v3', 'catalog.review-v3', 'resources.review-v5', 'managed-care.demand')

/** USD with cents: credit packs of two providers, a tool priced in EUR, and a one-time setup row. */
const designer = fixture('designer, catalog v2', 'catalog.review-v2', 'resources.review-v2', 'designer.demand')

/** Tool prices that point at catalog records instead of carrying an amount in the policy. */
const crm = fixture('CRM, catalog v2', 'catalog.review-v2', 'resources.review-v2', 'crm-client-tools.demand')

/** The agreed SKY case, from the inputs frozen in its own artifact: the net is agreed, so only cost can move. */
const sky: Case = {
  name: 'SKY, agreed net',
  catalog: skyArtifact.semantic.catalog,
  policy: skyArtifact.semantic.policy,
  credits: skyArtifact.semantic.credits,
  demand: skyArtifact.semantic.demand
}

/** Colombia with people in three countries: two estimated talent factors and the confirmed one of the reference. */
const mixedCountries = (): Case => {
  const next = clone(colombia)
  const countries = ['CO', 'PE', 'CL']

  next.name = 'people in CO, PE and CL, catalog v5'
  next.demand.brief.lines.forEach((line, i) => (line.talentCountry = countries[i % countries.length]))

  return next
}

const horizon = (base: Case, periods: number): Case => {
  const next = clone(base)

  next.name = `${base.name}, ${periods} periods`
  next.demand.brief.periods = periods
  next.demand.allocations = Array.from({ length: periods }, (_, i) =>
    base.demand.allocations.map(a => ({ ...a, periodId: i + 1 }))
  ).flat()

  return next
}

const compose = (c: Case) => composeResourceQuote(c.catalog, c.policy, c.credits, c.demand)
const totalsOf = (r: Composition) => r.quote.totals!
const rowsOf = (r: Composition) => r.quote.periods.flatMap(p => p.result.lines)
const unitOf = (r: Composition) => new D(10).pow(-(totalsOf(r).cost.split('.')[1]?.length ?? 0))
const up = (value: string, decimals = 18) => new D(value).mul('1.1').toDecimalPlaces(decimals).toString()

/**
 * The same case with ONE input 10 % higher, edited where an operator would edit it: the catalog record in force at
 * the quote date, the price of the resource policy, or the prices of the credit provider.
 */
const raise = (c: Case, input: Input): Case => {
  const next = clone(c)
  const date = next.demand.brief.quoteDate

  const record = (match: (r: CatalogDoc['records'][number]) => boolean) => {
    const rows = next.catalog.records.filter(
      r => r.source.effectiveFrom <= date && date <= r.source.effectiveUntil && match(r)
    )

    expect(rows, `${input.kind} ${input.id}: one record in force`).toHaveLength(1)

    return rows[0].value as Record<string, string>
  }

  const resource = (resourceId: string) => record(r => r.kind === 'resource' && r.value.resourceId === resourceId)

  if (input.kind === 'person_cost') {
    const value = record(r => r.kind === 'cost' && r.recordId === input.recordId) as unknown as {
      components: { amount: string }[]
    }

    for (const component of value.components) component.amount = up(component.amount)
  } else if (input.kind === 'talent_factor') {
    const value = record(r => r.kind === 'talent_factor' && r.recordId === input.recordId)

    value.factor = up(value.factor)
  } else if (input.kind === 'fx') {
    const [from, to] = input.id.split(':')
    const value = record(r => r.kind === 'fx' && r.value.from === from && r.value.to === to)

    value.rate = up(value.rate)
  } else if (input.billing === 'credit_packs') {
    const tool = next.policy.tools.find(t => t.toolId === input.id)!
    const provider = next.credits.providers.find(p => p.providerId === tool.providerId)!

    // Provider prices carry two decimals, so each one is 10 % higher to the cent.
    provider.subscription.amount = up(provider.subscription.amount, 2)
    for (const pack of provider.packs) pack.amount = up(pack.amount, 2)
  } else if (input.priceId) {
    const price = next.policy.tools.find(t => t.toolId === input.id)!.prices.find(p => p.priceId === input.priceId)!

    if (price.price) price.price.amount = up(price.price.amount)
    else {
      const value = resource(price.catalogResourceId!)

      value.amount = up(value.amount)
    }
  } else {
    const value = resource(input.id)

    value.amount = up(value.amount)
  }

  return next
}

/**
 * Tolerance of the verifier, and why. The kernel rounds cost once per row (half up, to the currency unit), so the
 * difference between two composed totals can sit up to one unit per row away from the difference of their raw costs;
 * the reading itself is presented at the currency unit (one more). A pooled credit budget is also rounded to the
 * cent by its planner and its pack prices were raised to the cent, which is worth another two cents.
 */
const toleranceOf = (base: Composition, input: Input) =>
  unitOf(base)
    .mul(rowsOf(base).length + 1)
    .plus(input.billing === 'credit_packs' ? '0.02' : 0)

const costMoved = (base: Composition, moved: Composition) => new D(totalsOf(moved).cost).minus(totalsOf(base).cost)

describe('the real verifier: raising one input 10 % moves cost by 10 % of the cost the reading put on it', () => {
  const cases = [colombia, earlier, designer, crm, sky, mixedCountries(), horizon(earlier, 2)]

  it.each(cases)('$name: every input the cost rests on, estimated or confirmed', c => {
    const base = compose(c)

    expect(base.quote.calculationStatus).toBe('calculated')

    const reading = costInputExposure(base)!

    expect(reading.unmappedComponents).toBe(0)
    expect(reading.costInputs.length).toBeGreaterThan(0)

    for (const input of reading.costInputs) {
      const moved = compose(raise(c, input))
      const expected = new D(input.costAtRisk).mul('0.10')
      const tolerance = toleranceOf(base, input)
      const label = `${c.name} / ${input.kind} ${input.id}${input.priceId ? `:${input.priceId}` : ''}`

      expect(moved.quote.calculationStatus, label).toBe('calculated')
      // The check has teeth: what it expects is far outside its own tolerance.
      expect(expected.gt(tolerance.mul(10)), label).toBe(true)
      expect(costMoved(base, moved).minus(expected).abs().lte(tolerance), label).toBe(true)
    }
  })

  it('the cases cover every kind of input, every way a resource is bought and both evidence statuses', () => {
    const inputs = cases.flatMap(c => costInputExposure(compose(c))!.costInputs)

    expect([...new Set(inputs.map(i => i.kind))].sort()).toEqual(
      ['fx', 'operations', 'person_cost', 'platform_fee', 'setup', 'talent_assurance', 'talent_factor', 'tool'].sort()
    )
    expect([...new Set(inputs.flatMap(i => (i.billing ? [i.billing] : [])))].sort()).toEqual(
      ['credit_packs', 'month', 'once', 'year'].sort()
    )
    expect([...new Set(inputs.map(i => i.sourceStatus))].sort()).toEqual(['confirmed', 'estimated'])
    // An FX rate on each side: from the currency of a resource and to the output currency.
    expect(inputs.filter(i => i.kind === 'fx').map(i => i.id)).toEqual(
      expect.arrayContaining(['EUR:USD', 'USD:COP', 'USD:CLP'])
    )
    // A tool price read from the policy and one read from the catalog record the policy points at.
    expect(inputs.some(i => i.kind === 'tool' && i.priceId === 'historical')).toBe(true)
  })

  it('the ranking is exactly the estimated subset of that map, in the same order', () => {
    for (const c of cases) {
      const base = compose(c)

      expect(estimateExposure(base)!.costInputs).toEqual(
        costInputExposure(base)!
          .costInputs.filter(i => i.sourceStatus === 'estimated')
          .map(({ sourceStatus, ...input }) => {
            expect(sourceStatus).toBe('estimated')

            return input
          })
      )
    }
  })

  it('with the net agreed, the margin lost is the one the reading states: 0.10 x costAtRisk / net', () => {
    const base = compose(sky)
    const ranking = estimateExposure(base)!.costInputs

    expect(ranking.length).toBeGreaterThan(0)

    for (const input of ranking) {
      const moved = compose(raise(sky, input as Input))
      const net = new D(totalsOf(base).net)

      // The agreed net does not follow cost, so the whole movement lands on the margin.
      expect(totalsOf(moved).net).toBe(totalsOf(base).net)

      const lost = new D(totalsOf(base).marginRate!).minus(totalsOf(moved).marginRate!)
      const stated = new D(input.marginRateLostIfTenPctHigher!)

      // The statement is the formula on the reading's own numbers, at six decimals and never rounded down.
      expect(stated.gte(new D(input.costAtRisk).mul('0.10').div(net))).toBe(true)
      expect(stated.minus(new D(input.costAtRisk).mul('0.10').div(net)).lt('0.000001')).toBe(true)
      expect(
        lost
          .minus(stated)
          .abs()
          .lte(
            toleranceOf(base, input as Input)
              .div(net)
              .plus('0.000001')
          )
      ).toBe(true)
    }
  })
})

describe('shares, order and the union of estimated cost', () => {
  const all = [colombia, earlier, designer, crm, sky, horizon(earlier, 3)].map(c => ({ c, r: compose(c) }))

  it('every share is between 0 and 1 and no input carries more than the whole cost', () => {
    for (const { r } of all) {
      const reading = costInputExposure(r)!

      for (const input of reading.costInputs) {
        expect(new D(input.shareOfCost!).gte(0) && new D(input.shareOfCost!).lte(1)).toBe(true)
        expect(new D(input.costAtRisk).lte(totalsOf(r).cost)).toBe(true)
        expect(new D(input.costAtRisk).gt(0)).toBe(true)
      }

      expect(new D(reading.estimatedShareOfCost!).gte(0) && new D(reading.estimatedShareOfCost!).lte(1)).toBe(true)
    }
  })

  it('estimated, not evidenced and confirmed are the total cost of the quote, to the unit', () => {
    for (const { r } of all) {
      const reading = estimateExposure(r)!

      expect(reading.totalCost).toBe(totalsOf(r).cost)
      expect(reading.net).toBe(totalsOf(r).net)
      // What a dedication without evidence governs is a part of its own: never estimated twice, never confirmed.
      expect(
        new D(reading.estimatedCost)
          .plus(reading.dedicationNotEvidenced.cost)
          .plus(reading.confirmedCost)
          .eq(totalsOf(r).cost)
      ).toBe(true)
      expect(new D(reading.dedicationNotEvidenced.cost).gte(0)).toBe(true)
      expect(new D(reading.confirmedCost).gte(0)).toBe(true)
    }
  })

  it('the ranking is sorted by cost at risk, largest first', () => {
    for (const { r } of all) {
      const amounts = estimateExposure(r)!.costInputs.map(i => new D(i.costAtRisk))

      for (let i = 1; i < amounts.length; i++) expect(amounts[i].lte(amounts[i - 1])).toBe(true)
    }
  })

  it('the union counts a component once: two estimated inputs on the same line do not add up twice', () => {
    // Colombia with its person costs estimated too (in memory): every human component now rests on two estimated
    // inputs, the cost of the profile and the talent factor of the country.
    const both = clone(colombia)

    for (const record of both.catalog.records) if (record.kind === 'cost') record.source.status = 'estimated'

    const base = compose(both)
    const reading = estimateExposure(base)!
    const persons = reading.costInputs.filter(i => i.kind === 'person_cost')
    const talent = reading.costInputs.filter(i => i.kind === 'talent_factor')

    expect(persons.length).toBeGreaterThan(0)
    expect(talent).toHaveLength(1)

    // How much cost the two share is measured, not assumed: raised together they compound, and the cost that
    // compounds is exactly the cost both rest on. joint - separate = 0.10 x 0.10 x shared.
    const together = [...persons, ...talent].reduce((c, input) => raise(c, input as Input), both)
    const separate = [...persons, ...talent].map(input => costMoved(base, compose(raise(both, input as Input))))
    const compounded = costMoved(base, compose(together)).minus(separate.reduce((sum, d) => sum.plus(d), new D(0)))
    const shared = compounded.mul(100)

    // Each recomputed difference is within one unit per row of its raw value; scaled by 100 like the estimate.
    const tolerance = unitOf(base).mul((rowsOf(base).length + 1) * (separate.length + 1) * 100)
    const added = reading.costInputs.reduce((sum, i) => sum.plus(i.costAtRisk), new D(0))

    expect(shared.gt(tolerance.mul(10))).toBe(true)
    expect(added.gt(reading.totalCost)).toBe(true)
    expect(added.minus(shared).minus(reading.estimatedCost).abs().lte(tolerance)).toBe(true)
    // On every line the talent factor carries what the person costs carry, so the overlap is that whole amount.
    expect(shared.minus(talent[0].costAtRisk).abs().lte(tolerance)).toBe(true)
  })

  it('a quote with no estimated input has an empty ranking and all of its cost confirmed', () => {
    const confirmed = clone(colombia)

    for (const record of confirmed.catalog.records)
      if (record.source.status === 'estimated') record.source.status = 'confirmed'
    for (const tool of confirmed.policy.tools)
      for (const price of tool.prices) if (price.price) price.price.source.status = 'confirmed'

    // Nothing estimated is not yet everything confirmed: the dedication of each line has to be evidenced too.
    const unevidenced = estimateExposure(compose(confirmed))!

    expect(new D(unevidenced.estimatedCost).isZero()).toBe(true)
    expect(unevidenced.dedicationNotEvidenced.lineIds).toEqual(confirmed.demand.brief.lines.map(line => line.lineId))
    expect(new D(unevidenced.dedicationNotEvidenced.cost).gt(0)).toBe(true)
    expect(new D(unevidenced.confirmedCost).lt(unevidenced.totalCost)).toBe(true)

    for (const line of confirmed.demand.brief.lines)
      line.dedicationEvidence = {
        reference: 'test:dedication-confirmed',
        effectiveFrom: '2026-01-01',
        effectiveUntil: '2027-12-31',
        status: 'confirmed'
      }

    const r = compose(confirmed)
    const reading = estimateExposure(r)!

    expect(r.quote.calculationStatus).toBe('calculated')
    // The kernel itself has nothing estimated to report.
    expect(r.quote.periods.flatMap(p => p.result.diagnostics).filter(d => d.code === 'ESTIMATED_SOURCE')).toEqual([])
    expect(reading.costInputs).toEqual([])
    expect(reading.priceInputs).toEqual([])
    expect(reading.estimatedRules).toEqual([])
    expect(new D(reading.estimatedCost).isZero()).toBe(true)
    expect(reading.dedicationNotEvidenced.lineIds).toEqual([])
    expect(new D(reading.dedicationNotEvidenced.cost).isZero()).toBe(true)
    expect(reading.confirmedCost).toBe(totalsOf(r).cost)

    // The cost still rests on inputs; they are just all confirmed: the ones it always had, and a dedication a line.
    const kinds = (c: Composition) =>
      costInputExposure(c)!
        .costInputs.map(i => i.kind)
        .sort()

    expect(kinds(r).filter(kind => kind !== 'dedication')).toEqual(kinds(compose(colombia)))
    expect(kinds(r).filter(kind => kind === 'dedication')).toHaveLength(confirmed.demand.brief.lines.length)
  })

  it('a quote without totals has no reading', () => {
    const unresolved = composeResourceQuote(
      read('data/pricing/v3-catalog/catalog.review-v1.json'),
      colombia.policy,
      credits,
      operating('managed-care.demand')
    )

    expect(unresolved.quote.totals).toBeNull()
    expect(estimateExposure(unresolved)).toBeNull()
    expect(summarizeComposition(unresolved, { calculationId: 'test' }).estimateExposure).toBeNull()
    expect(assessCompositionReadiness(unresolved).costEvidencePriority).toBeNull()
  })
})

describe('the committed Colombian example on catalog v5', () => {
  const frozen: Composition = colombiaArtifact.semantic.result
  const reading = estimateExposure(frozen)!
  const lines: DemandDoc['brief']['lines'] = colombiaArtifact.semantic.demand.brief.lines

  it('the reading of the frozen artifact is the reading of the quote composed again', () => {
    expect(JSON.parse(JSON.stringify(reading))).toEqual(JSON.parse(JSON.stringify(estimateExposure(compose(colombia)))))
  })

  it('person costs are confirmed and stay out of the ranking', () => {
    const persons = costInputExposure(frozen)!.costInputs.filter(i => i.kind === 'person_cost')

    expect(persons.length).toBeGreaterThan(0)
    expect(persons.every(i => i.sourceStatus === 'confirmed')).toBe(true)
    expect(reading.costInputs.some(i => i.kind === 'person_cost')).toBe(false)
  })

  it('the Colombian talent factor is estimated and carries the human cost of the lines of that country', () => {
    const colombian = lines.filter(l => l.talentCountry === 'CO').map(l => l.lineId)
    const talent = reading.costInputs.filter(i => i.kind === 'talent_factor')

    // Straight from the frozen components: the human cost of those lines, in the output currency.
    const human = rowsOf(frozen)
      .filter(row => colombian.includes(row.parentLineId))
      .flatMap(row => row.components.filter(c => c.kind === 'human'))
      .reduce((sum, c) => sum.plus(new D(c.cost).mul(c.trace.outputFx)), new D(0))

    expect(colombian.length).toBe(lines.length)
    expect(talent).toHaveLength(1)
    expect(talent[0].id).toBe('CO:CL')
    expect(talent[0].recordId).toBe('talent:CO:CL')
    expect([...talent[0].lineIds].sort()).toEqual([...colombian].sort())
    expect(
      new D(talent[0].costAtRisk)
        .minus(human)
        .abs()
        .lte(unitOf(frozen).mul(rowsOf(frozen).length))
    ).toBe(true)
    // It is also the largest estimated input of this quote.
    expect(reading.costInputs[0]).toBe(talent[0])
  })

  it('names a tool by the policy price it used and a catalog resource by its record', () => {
    const used = new Map(frozen.attributions.map(a => [a.toolId, a]))
    const tools = reading.costInputs.filter(i => i.priceId)

    expect(tools.length).toBeGreaterThan(0)

    for (const tool of tools) {
      expect(tool.priceId).toBe(used.get(tool.id)!.priceId)
      expect(used.get(tool.id)!.resource.source.status).toBe('estimated')
      expect(tool).not.toHaveProperty('recordId')
    }

    const bound = frozen.quote.resolution.bindings.map(b => b.record.recordId)

    for (const resource of reading.costInputs.filter(i => !i.priceId && i.kind !== 'talent_factor'))
      expect(bound).toContain(resource.recordId)
  })
})

describe('a talent factor carries the people of its own country and nobody else', () => {
  const mixed = mixedCountries()
  const r = compose(mixed)
  const factors = costInputExposure(r)!.costInputs.filter(i => i.kind === 'talent_factor')

  it('one entry per country in the quote, each over the lines of that country', () => {
    const countries = [...new Set(mixed.demand.brief.lines.map(l => l.talentCountry))]

    expect(countries.length).toBeGreaterThan(2)
    expect(factors.map(f => f.id).sort()).toEqual(countries.map(country => `${country}:CL`).sort())

    for (const factor of factors) {
      const country = factor.id.split(':')[0]
      const lines = mixed.demand.brief.lines.filter(l => l.talentCountry === country).map(l => l.lineId)

      const human = rowsOf(r)
        .filter(row => lines.includes(row.parentLineId))
        .flatMap(row => row.components.filter(c => c.kind === 'human'))
        .reduce((sum, c) => sum.plus(new D(c.cost).mul(c.trace.outputFx)), new D(0))

      expect([...factor.lineIds].sort()).toEqual([...lines].sort())
      expect(
        new D(factor.costAtRisk)
          .minus(human)
          .abs()
          .lte(unitOf(r).mul(rowsOf(r).length))
      ).toBe(true)
    }
  })

  it('only the estimated ones are ranked; the factor of the reference country is confirmed', () => {
    const ranked = estimateExposure(r)!
      .costInputs.filter(i => i.kind === 'talent_factor')
      .map(i => i.id)

    expect(ranked.sort()).toEqual(['CO:CL', 'PE:CL'])
    expect(factors.find(f => f.id === 'CL:CL')!.sourceStatus).toBe('confirmed')
  })
})

describe('every estimated source the kernel reported is accounted for, and nothing else is listed', () => {
  const peru = clone(colombia)

  // Peru: an estimated market factor that declares its floor on the base market (contract 1.2.0).
  peru.name = 'Peru market, catalog v5'
  peru.demand.brief.offerMarketCountry = 'PE'

  it.each([colombia, earlier, designer, crm, sky, peru, mixedCountries(), horizon(earlier, 3)])('$name', c => {
    const r = compose(c)
    const reading = estimateExposure(r)!
    const rule = (kind: string) => reading.estimatedRules.find(x => x.kind === kind)
    const claimed = new Set<string>()
    let reported = 0

    expect(r.quote.calculationStatus).toBe('calculated')

    for (const period of r.quote.periods) {
      const { request } = r.quote.resolution.inputs.find(i => i.periodId === period.periodId)!.input

      for (const d of period.result.diagnostics.filter(x => x.code === 'ESTIMATED_SOURCE')) {
        const here = <T extends { periodIds: number[]; lineIds: string[] }>(entry: T | undefined, lineId?: string) =>
          Boolean(entry?.periodIds.includes(period.periodId) && (!lineId || entry.lineIds.includes(lineId)))

        const resource = d.fieldPath.match(/^snapshot\.resources\.(.+)$/)?.[1]
        const allocation = d.fieldPath.match(/^request\.lines\.(\d+)\.allocationPolicyRef$/)?.[1]
        const pricing = d.fieldPath.match(/^snapshot\.pricingPolicies\.(.+)$/)?.[1]
        const cost = d.fieldPath.match(/^snapshot\.profiles\.(.+)\.cost$/)?.[1]

        reported += 1

        if (resource) {
          const id = resource.replace(/^composed:/, '')
          const entry = reading.costInputs.find(i => i.id === id && i.kind !== 'person_cost')

          expect(here(entry, d.lineId), d.fieldPath).toBe(true)
          claimed.add(`cost:${entry!.kind}:${id}`)
        } else if (cost) {
          const entry = reading.costInputs.find(i => i.kind === 'person_cost' && i.lineIds.includes(d.lineId!))

          expect(here(entry, d.lineId), d.fieldPath).toBe(true)
          claimed.add(`cost:person_cost:${entry!.id}`)
        } else if (d.fieldPath === 'snapshot.talentFactors') {
          // The kernel names neither the factor nor the line here; `a talent factor carries...` above checks both.
          const entries = reading.costInputs.filter(i => i.kind === 'talent_factor')

          expect(
            entries.some(entry => here(entry)),
            d.fieldPath
          ).toBe(true)
          entries.forEach(entry => claimed.add(`cost:talent_factor:${entry.id}`))
        } else if (/^snapshot\.fx\.output$|\.costFx$|\.resourceFx\./.test(d.fieldPath)) {
          const entries = reading.costInputs.filter(i => i.kind === 'fx')

          expect(
            entries.some(entry => here(entry)),
            d.fieldPath
          ).toBe(true)
          entries.forEach(entry => claimed.add(`cost:fx:${entry.id}`))
        } else if (allocation) {
          expect(here(rule('allocation_policy'), request.lines[Number(allocation)].lineId), d.fieldPath).toBe(true)
          claimed.add('rule:allocation_policy')
        } else if (pricing) {
          const line = request.lines.find(l => l.profileId === pricing)!

          expect(here(rule('pricing_policy'), line.lineId), d.fieldPath).toBe(true)
          claimed.add('rule:pricing_policy')
        } else if (d.fieldPath === 'snapshot.marketFactors') {
          expect(reading.priceInputs).toHaveLength(1)
          expect(reading.priceInputs[0].periodIds).toContain(period.periodId)
          claimed.add('price:market_factor')
        } else if (d.fieldPath === 'snapshot.priceRounding') {
          expect(here(rule('price_rounding')), d.fieldPath).toBe(true)
          claimed.add('rule:price_rounding')
        } else if (d.fieldPath === 'request.taxTreatment.source') {
          expect(here(rule('tax')), d.fieldPath).toBe(true)
          claimed.add('rule:tax')
        } else throw new RangeError(`an estimated source the reading does not classify: ${d.fieldPath}`)
      }
    }

    // The reverse: the reading lists nothing the kernel did not report as estimated.
    const listed = [
      ...reading.costInputs.map(i => `cost:${i.kind}:${i.id}`),
      ...reading.priceInputs.map(() => 'price:market_factor'),
      ...reading.estimatedRules.map(x => `rule:${x.kind}`)
    ]

    expect(reported).toBeGreaterThan(0)
    expect([...new Set(listed)].sort()).toEqual([...claimed].sort())
  })

  it('an estimated market factor is listed on the price side with what it moved, and never moves cost', () => {
    const base = compose(peru)
    const reading = estimateExposure(base)!
    const [market] = reading.priceInputs
    const date = peru.demand.brief.quoteDate

    // The revision in force at the quote date; an earlier revision of the same record has ended.
    const inForce = (c: Case) =>
      c.catalog.records.find(
        r =>
          r.kind === 'market_factor' &&
          r.recordId === market.recordId &&
          r.source.effectiveFrom <= date &&
          date <= r.source.effectiveUntil
      )!

    const record = inForce(peru)

    expect(reading.priceInputs).toHaveLength(1)
    expect(market.kind).toBe('market_factor')
    expect(market.id).toBe('PE')
    expect(record.source.status).toBe('estimated')
    expect(market.factor).toBe(record.value.factor)
    expect(market.floorBasis).toBe(record.value.floorBasis)
    // What it moved is the kernel's own figure, not one worked out by the reading.
    expect(market.marketAdjustment).toBe((totalsOf(base) as unknown as Record<string, string>).marketAdjustment)
    expect(new D(market.marketAdjustment!).lt(0)).toBe(true)
    expect(reading.costInputs.some(i => (i.kind as string) === 'market_factor')).toBe(false)

    // The price it multiplies is the price of the people, read from the frozen components.
    const people = rowsOf(base)
      .flatMap(row => row.components.filter(c => c.kind === 'human'))
      .reduce((sum, c) => sum.plus(new D(c.price).mul(c.trace.outputFx)), new D(0))

    expect(new D(market.priceOnFactor).minus(people).abs().lte(unitOf(base))).toBe(true)

    const moved = clone(peru)

    inForce(moved).value.factor = up(market.factor)

    const repriced = compose(moved)

    expect(totalsOf(repriced).cost).toBe(totalsOf(base).cost)
    expect(new D(totalsOf(repriced).net).gt(totalsOf(base).net)).toBe(true)
  })

  it('before contract 1.2.0 the kernel stored no market adjustment and the reading invents none', () => {
    const [market] = estimateExposure(compose(sky))!.priceInputs

    expect(market.id).toBe('CL')
    expect(market.factor).toBe('1')
    expect(market.marketAdjustment).toBeNull()
    expect(totalsOf(compose(sky))).not.toHaveProperty('marketAdjustment')
  })

  it('estimated rules stay out of the ranking and of the union, and moving one does not move cost', () => {
    const base = compose(colombia)
    const reading = estimateExposure(base)!
    const moved = clone(colombia)

    expect(reading.estimatedRules.map(x => x.kind).sort()).toEqual(['allocation_policy', 'pricing_policy'])

    // The target margin of every pricing policy, and the hours of an FTE month of every allocation policy.
    for (const record of moved.catalog.records) {
      if (record.kind === 'pricing') record.value.rate = '0.5'
      if (record.kind === 'allocation') record.value.hoursPerFteMonth = up(record.value.hoursPerFteMonth as string)
    }

    const repriced = compose(moved)

    expect(totalsOf(repriced).cost).toBe(totalsOf(base).cost)
    expect(new D(totalsOf(repriced).net).gt(totalsOf(base).net)).toBe(true)
    // With dedication declared in FTE and no minimum in force, the allocation rule decided no capacity.
    expect(reading.estimatedRules.find(x => x.kind === 'allocation_policy')).toMatchObject({ billedFteSetByRuleOn: [] })
  })
})

describe('where an input is not proportional, and how the reading says so', () => {
  it('minimum billed FTE: under the minimum the person cost does not follow the dedication', () => {
    const MINIMUM = '0.15'
    const floored = clone(colombia)

    floored.name = 'Colombia with a minimum billed FTE'
    for (const record of floored.catalog.records)
      if (record.kind === 'allocation' && record.value.mode === 'shared') record.value.minimumBilledFte = MINIMUM

    const base = compose(floored)
    const reading = estimateExposure(base)!

    const allocation = reading.estimatedRules.find(x => x.kind === 'allocation_policy') as unknown as {
      billedFteSetByRuleOn: string[]
    }

    // Derived from the demand: the shared lines that ask for less than the minimum.
    const under = floored.demand.brief.lines
      .filter(l => new D(l.dedication.value).lt(MINIMUM))
      .map(l => l.lineId)
      .sort()

    expect(under.length).toBeGreaterThan(0)
    expect([...allocation.billedFteSetByRuleOn].sort()).toEqual(under)

    const withDedication = (lineId: string) => {
      const next = clone(floored)
      const line = next.demand.brief.lines.find(l => l.lineId === lineId)!

      line.dedication.value = up(line.dedication.value)

      return compose(next)
    }

    const human = (r: Composition, lineId: string) =>
      rowsOf(r)
        .filter(row => row.parentLineId === lineId)
        .flatMap(row => row.components.filter(c => c.kind === 'human'))
        .reduce((sum, c) => sum.plus(new D(c.cost).mul(c.trace.outputFx)), new D(0))

    // 10 % more dedication on a line under the minimum costs nothing more.
    expect(costMoved(base, withDedication(under[0])).isZero()).toBe(true)

    // On a line above the minimum it costs 10 % more of that line's people, as usual.
    const above = floored.demand.brief.lines.find(l => l.lineId === 'lead')!

    expect(new D(above.dedication.value).gt(MINIMUM)).toBe(true)
    expect(allocation.billedFteSetByRuleOn).not.toContain(above.lineId)
    expect(
      costMoved(base, withDedication(above.lineId))
        .minus(human(base, above.lineId).mul('0.10'))
        .abs()
        .lte(unitOf(base).mul(rowsOf(base).length))
    ).toBe(true)

    // The amounts stay proportional under the minimum too: the verifier still holds for every input.
    for (const input of costInputExposure(base)!.costInputs)
      expect(
        costMoved(base, compose(raise(floored, input)))
          .minus(new D(input.costAtRisk).mul('0.10'))
          .abs()
          .lte(toleranceOf(base, input)),
        `${input.kind} ${input.id}`
      ).toBe(true)
  })

  it('credit packs: proportional to the pack prices, in steps to the credits asked for', () => {
    const base = compose(designer)
    const pooled = estimateExposure(base)!.costInputs.filter(i => i.billing === 'credit_packs')

    expect(pooled.map(i => i.id).sort()).toEqual(base.creditBudgets.map(b => b.toolId).sort())

    for (const input of pooled) {
      const more = clone(designer)

      // One more credit, a thousandth of the demand or less.
      for (const work of more.demand.work)
        for (const demand of work.creditDemand) if (demand.toolId === input.id) demand.credits += 1

      const asked = designer.demand.work.flatMap(w => w.creditDemand).find(d => d.toolId === input.id)!.credits
      const proportional = new D(input.costAtRisk).div(asked)
      const step = costMoved(base, compose(more))

      // Either nothing (the pack already bought covers it) or a whole pack: never the proportional cent.
      expect(step.isZero() || step.gt(proportional.mul(10)), input.id).toBe(true)
    }

    // The fixture shows the step, not only the flat part.
    const higgsfield = clone(designer)

    for (const work of higgsfield.demand.work)
      for (const demand of work.creditDemand) if (demand.toolId === 'higgsfield') demand.credits += 1
    expect(costMoved(base, compose(higgsfield)).gt(0)).toBe(true)
  })

  it('annual seats: cost is a twelfth a month and proportional; the cash of the year is paid up front', () => {
    const base = compose(colombia)
    const annual = estimateExposure(base)!.costInputs.filter(i => i.billing === 'year')

    expect(annual.length).toBeGreaterThan(0)

    for (const input of annual) {
      const moved = compose(raise(colombia, input as Input))
      const cost = costMoved(base, moved)
      const cash = new D(totalsOf(moved).cashCommitment).minus(totalsOf(base).cashCommitment)

      expect(colombia.demand.brief.periods).toBe(1)
      expect(
        cost
          .minus(new D(input.costAtRisk).mul('0.10'))
          .abs()
          .lte(toleranceOf(base, input as Input))
      ).toBe(true)
      // Twelve months of it leave in the first period: cash moves twelve times what cost does.
      expect(
        cash
          .minus(cost.mul(12))
          .abs()
          .lte(toleranceOf(base, input as Input).mul(13))
      ).toBe(true)
    }
  })

  it('a one-time resource is charged in one period and says so', () => {
    const once = estimateExposure(compose(designer))!.costInputs.filter(i => i.billing === 'once')

    expect(once.map(i => i.kind)).toEqual(['setup'])
    expect(once[0].periodIds).toEqual([1])
  })
})

describe('several periods are one entry per input, not one per period', () => {
  const one = compose(horizon(earlier, 1))
  const twelve = compose(horizon(earlier, 12))
  const key = (i: { kind: string; id: string; priceId?: string }) => `${i.kind}|${i.id}|${i.priceId ?? ''}`

  it('the same inputs, each over every period, with the cost of all of them', () => {
    const single = estimateExposure(one)!
    const long = estimateExposure(twelve)!

    expect(twelve.quote.periods).toHaveLength(12)
    expect(long.costInputs.map(key).sort()).toEqual(single.costInputs.map(key).sort())
    expect(long.estimatedRules.map(x => x.kind)).toEqual(single.estimatedRules.map(x => x.kind))

    for (const input of long.costInputs) {
      const first = single.costInputs.find(i => key(i) === key(input))!

      expect(input.periodIds).toEqual(Array.from({ length: 12 }, (_, i) => i + 1))
      // Every period of this demand costs the same; presentation rounds once per reading.
      expect(new D(input.costAtRisk).minus(new D(first.costAtRisk).mul(12)).abs().lte(unitOf(twelve).mul(12))).toBe(
        true
      )
    }

    expect(
      new D(long.estimatedCost)
        .plus(long.dedicationNotEvidenced.cost)
        .plus(long.confirmedCost)
        .eq(totalsOf(twelve).cost)
    ).toBe(true)
  })

  it('the reading barely grows with the horizon', () => {
    const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value))

    expect(bytes(twelve) / bytes(one)).toBeGreaterThan(6)
    expect(bytes(estimateExposure(twelve)) / bytes(estimateExposure(one))).toBeLessThan(1.5)
  })
})

describe('summary and readiness show the same reading and change nothing', () => {
  it('the summary carries it, readiness points at its first entries, and the result is untouched', () => {
    const r = compose(colombia)
    const before = catalogDigest(r)
    const summary = summarizeComposition(r, { calculationId: 'test' })
    const readiness = assessCompositionReadiness(r)
    const reading = estimateExposure(r)!

    expect(summary.schemaVersion).toBe('pricing-v3-composition-summary/1')
    expect(summary.estimateExposure).toEqual(reading)
    expect(readiness.costEvidencePriority).toEqual({
      currency: reading.currency,
      estimatedCost: reading.estimatedCost,
      confirmedCost: reading.confirmedCost,
      estimatedShareOfCost: reading.estimatedShareOfCost,
      dedicationNotEvidenced: reading.dedicationNotEvidenced,
      confirmFirst: reading.costInputs.slice(0, 5)
    })
    expect(catalogDigest(r)).toBe(before)
  })

  it('the frozen SKY artifact reads without being recomputed and keeps its digest', () => {
    const before = catalogDigest(skyArtifact.semantic)
    const reading = estimateExposure(skyArtifact.semantic.result)!

    expect(catalogDigest(skyArtifact.semantic)).toBe(before)
    expect(before).toBe(skyArtifact.replayDigest)
    expect(reading.totalCost).toBe(skyArtifact.semantic.result.quote.totals.cost)
    // In that quote the person costs were an assumption for the country, so they lead the ranking.
    expect(reading.costInputs[0].kind).toBe('person_cost')
  })
})
