// Diagnostics that used to say that something was wrong now say why: which part of a requirement failed, which
// prices an allocation can name, and that a quote is dated before its catalog instead of a dozen missing records.
//
// What a diagnostic names is checked against the source it reads (the resource policy, the dates of the catalog),
// never against a text written here. And none of them may repeat what the demand wrote: a reference, a date of an
// evidence or an amount.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveBrief } from '../catalog/resolve'
import { composeResourceQuote } from '../resources/composition'
import { compositionDemandSchema, compositionPolicySchema } from '../resources/composition-contracts'
import { assessCompositionReadiness } from '../resources/readiness'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => read(`data/pricing/v3-operating/${name}.json`)
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')

type Composition = ReturnType<typeof composeResourceQuote>

const of = (r: Composition, code: string) => r.quote.diagnostics.filter(d => d.code === code)

describe('CLIENT_ACCESS_EVIDENCE_REQUIRED says which part of the evidence fails', () => {
  const catalog = operating('catalog.review-v2')
  const policy = compositionPolicySchema.parse(operating('resources.review-v2'))
  const crm = () => compositionDemandSchema.parse(operating('crm-client-tools.demand'))
  const run = (demand: ReturnType<typeof crm>) => composeResourceQuote(catalog, policy, credits, demand)

  const failing = (edit: (coverage: NonNullable<ReturnType<typeof crm>['clientProvidedTools']>[number]) => void) => {
    const demand = crm()

    edit(demand.clientProvidedTools![0])

    const [diagnostic] = of(run(demand), 'CLIENT_ACCESS_EVIDENCE_REQUIRED')

    expect(diagnostic.path).toBe(demand.clientProvidedTools![0].toolId)

    return { detail: diagnostic.detail!, coverage: demand.clientProvidedTools![0] }
  }

  it('the committed example has evidence that holds', () => {
    expect(of(run(crm()), 'CLIENT_ACCESS_EVIDENCE_REQUIRED')).toEqual([])
  })

  it('names each cause on its own, and never the dates or the reference the demand wrote', () => {
    const cases = [
      failing(c => (c.evidence.status = 'estimated')),
      failing(c => (c.evidence.effectiveFrom = '2026-10-20')),
      failing(c => (c.evidence.effectiveUntil = '2026-10-20')),
      failing(c => (c.lineIds = [c.lineIds[0], c.lineIds[0]]))
    ]

    const details = cases.map(c => c.detail)

    // Four causes, four different statements.
    expect(new Set(details).size).toBe(4)
    expect(details[0]).toMatch(/not confirmed/)
    expect(details[1]).toMatch(/starts after/)
    expect(details[2]).toMatch(/ends before/)
    expect(details[3]).toMatch(/more than once/)

    for (const { detail, coverage } of cases) {
      expect(detail).toMatch(/^Period \d+: /)
      expect(detail).not.toContain(coverage.evidence.reference)
      expect(detail).not.toContain(coverage.evidence.effectiveFrom)
      expect(detail).not.toContain(coverage.evidence.effectiveUntil)
      expect(detail).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    }
  })

  it('names every cause that fails at once', () => {
    const { detail } = failing(c => {
      c.evidence.status = 'estimated'
      c.evidence.effectiveUntil = '2026-10-20'
    })

    expect(detail).toMatch(/not confirmed/)
    expect(detail).toMatch(/ends before/)
    expect(detail).not.toMatch(/starts after|more than once/)
  })
})

describe('a tool without a usable allocation names the prices an allocation can take', () => {
  const catalog = operating('catalog.review-v3')
  const policy = compositionPolicySchema.parse(operating('resources.review-v5'))
  const managed = () => compositionDemandSchema.parse(operating('managed-care.demand'))
  const run = (demand: ReturnType<typeof managed>) => composeResourceQuote(catalog, policy, credits, demand)
  // A tool the committed demand allocates, and the prices of it that hold a value in the policy.
  const { toolId } = managed().allocations[0]
  const tool = policy.tools.find(t => t.toolId === toolId)!
  const usable = tool.prices.filter(price => !price.pendingReason).map(price => price.priceId)

  it('the fixture allocates a tool that has a usable price', () => {
    expect(run(managed()).quote.calculationStatus).toBe('calculated')
    expect(usable.length).toBeGreaterThan(0)
  })

  it('RESOURCE_ALLOCATION_REQUIRED: the allocation is missing', () => {
    const demand = managed()

    demand.allocations = demand.allocations.filter(a => a.toolId !== toolId)

    const [diagnostic] = of(run(demand), 'RESOURCE_ALLOCATION_REQUIRED')

    expect(diagnostic).toMatchObject({ path: `1:${toolId}`, candidates: usable })
    expect(diagnostic.detail).toBeTruthy()
    // Readiness hands the same statement to whoever owns the gap.
    expect(
      assessCompositionReadiness(run(demand)).gaps.find(gap => gap.code === 'RESOURCE_ALLOCATION_REQUIRED')!.action
    ).toBe(diagnostic.detail)
  })

  it('RESOURCE_PRICE_SELECTION_REQUIRED: the allocation names a price the tool does not have', () => {
    const demand = managed()
    const typed = 'no-such-price-9917'

    demand.allocations.find(a => a.toolId === toolId)!.priceId = typed

    const [diagnostic] = of(run(demand), 'RESOURCE_PRICE_SELECTION_REQUIRED')

    expect(diagnostic).toMatchObject({ path: `1:${toolId}`, candidates: usable })
    // The candidates are the policy's; what the demand typed is in neither of them nor in the statement.
    expect(JSON.stringify([diagnostic.candidates, diagnostic.detail])).not.toContain(typed)
  })

  it('a price nobody has yet is not offered as a candidate', () => {
    const pending = clone(policy)
    const priced = pending.tools.find(t => t.toolId === toolId)!

    priced.prices.push({ priceId: 'awaiting-quote', basis: 'seat', pendingReason: 'The supplier has not quoted it.' })

    const demand = managed()

    demand.allocations = demand.allocations.filter(a => a.toolId !== toolId)

    const [diagnostic] = of(composeResourceQuote(catalog, pending, credits, demand), 'RESOURCE_ALLOCATION_REQUIRED')

    expect(diagnostic.candidates).toEqual(usable)
  })
})

describe('a quote dated before its catalog is in force says so once, with the date', () => {
  const catalog = operating('catalog.review-v10')
  const policy = compositionPolicySchema.parse(operating('resources.review-v11'))

  const firstDate: string = catalog.records
    .map((r: { source: { effectiveFrom: string } }) => r.source.effectiveFrom)
    .sort()[0]

  const dayBefore = (date: string) => {
    const time = new Date(`${date}T00:00:00Z`)

    time.setUTCDate(time.getUTCDate() - 1)

    return time.toISOString().slice(0, 10)
  }

  const dated = (quoteDate: string) => {
    const demand = clone(operating('managed-on-demand-third-party.demand'))

    demand.brief.quoteDate = quoteDate

    return demand
  }

  it('the fixture calculates on its own date, on this catalog and this policy', () => {
    const demand = operating('managed-on-demand-third-party.demand')

    expect(composeResourceQuote(catalog, policy, credits, demand).quote.calculationStatus).toBe('calculated')
    expect(demand.brief.quoteDate >= firstDate).toBe(true)
  })

  it('resolution reports one diagnostic, on the quote date, with the first date of the catalog', () => {
    const resolution = resolveBrief(catalog, dated(dayBefore(firstDate)).brief)

    expect(resolution.status).toBe('needs_input')
    expect(resolution.diagnostics).toHaveLength(1)
    expect(resolution.diagnostics[0]).toMatchObject({
      code: 'QUOTE_DATE_BEFORE_CATALOG',
      path: 'quoteDate',
      detail: expect.stringContaining(firstDate)
    })
    // Nothing was selected, so nothing reads as a profile, a factor or a rate that does not exist.
    expect(resolution.bindings).toEqual([])
    expect(resolution.inputs).toEqual([])
  })

  it('the composition adds the first date of its resource policy and none of the consequences', () => {
    const demand = dated(dayBefore(firstDate))
    const r = composeResourceQuote(catalog, policy, credits, demand)

    expect(r.quote.calculationStatus).toBe('needs_input')
    expect(r.quote.diagnostics.map(d => d.code)).toEqual(['QUOTE_DATE_BEFORE_CATALOG', 'RESOURCE_POLICY_NOT_EFFECTIVE'])
    expect(of(r, 'RESOURCE_POLICY_NOT_EFFECTIVE')[0].detail).toContain(policy.source.effectiveFrom)
    // The demand declares allocations, budgets and FX that no period read: none of them is reported as unused.
    expect(demand.allocations.length + demand.fxRecordIds.length).toBeGreaterThan(0)
    expect(r.quote.diagnostics.some(d => d.code.startsWith('UNUSED_'))).toBe(false)
  })

  it('on the first date of the catalog the quote resolves what that date holds, as it always did', () => {
    const resolution = resolveBrief(catalog, dated(firstDate).brief)

    expect(resolution.diagnostics.map(d => d.code)).not.toContain('QUOTE_DATE_BEFORE_CATALOG')
    expect(resolution.bindings.length).toBeGreaterThan(0)
  })

  it('the pricing policy of an offer has a first date of its own, said once and not once per line', () => {
    // The offer of the fixture, and the first date it has a pricing policy in this catalog.
    const demand = operating('managed-on-demand-third-party.demand')

    const policyDates: string[] = catalog.records
      .filter(
        (r: { kind: string; value: { offerId?: string } }) =>
          r.kind === 'pricing' && r.value.offerId === demand.brief.offerId
      )
      .map((r: { source: { effectiveFrom: string } }) => r.source.effectiveFrom)
      .sort()

    const before = dayBefore(policyDates[0])

    // The catalog itself is in force that day: only the policy of the offer is not.
    expect(before >= firstDate).toBe(true)

    const resolution = resolveBrief(catalog, dated(before).brief)
    const said = resolution.diagnostics.filter(d => d.code === 'QUOTE_DATE_BEFORE_OFFER_POLICY')

    expect(said).toEqual([
      expect.objectContaining({ path: 'offerId', detail: expect.stringContaining(policyDates[0]) })
    ])
    expect(resolution.diagnostics.filter(d => d.path.endsWith('.pricing'))).toEqual([])
    expect(demand.brief.lines.length).toBeGreaterThan(1)

    // No period could be built that day, so the composition reports no entry of the demand as unused.
    const composed = composeResourceQuote(catalog, policy, credits, dated(before))

    expect(composed.quote.resolution.inputs).toEqual([])
    expect(composed.quote.diagnostics.some(d => d.code.startsWith('UNUSED_'))).toBe(false)
  })

  it('any selection whose record starts after the quote date says the date is the cause, and which date', () => {
    // The form of the engagement of the fixture, and the first date this catalog holds a record for it.
    const demand = operating('managed-on-demand-third-party.demand')

    const formDates: string[] = catalog.records
      .filter(
        (r: { kind: string; value: { form?: string } }) =>
          r.kind === 'engagement_factor' && r.value.form === demand.brief.engagementForm
      )
      .map((r: { source: { effectiveFrom: string } }) => r.source.effectiveFrom)
      .sort()

    const resolution = resolveBrief(catalog, dated(dayBefore(formDates[0])).brief)

    expect(resolution.diagnostics).toContainEqual({
      code: 'MISSING_CATALOG_SELECTION',
      path: 'engagementForm',
      candidates: [],
      detail: `The quote date is before the first date a record for this selection is in force, which is ${formDates[0]}.`
    })

    // A selection the catalog holds no record for, on any date, stays the plain missing selection it was.
    const unknown = dated(demand.brief.quoteDate)

    unknown.brief.engagementForm = 'no-such-form'
    expect(resolveBrief(catalog, unknown.brief).diagnostics).toContainEqual({
      code: 'MISSING_CATALOG_SELECTION',
      path: 'engagementForm',
      candidates: []
    })
  })
})
