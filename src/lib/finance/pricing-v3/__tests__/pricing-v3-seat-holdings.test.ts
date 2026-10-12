// Seats as they are bought, and periods declared once (resources/composition.ts and its readings).
//
// A named tool may be held under several prices in a period (a seat bought for the year and one more by the month),
// people may use one seat between them, a paid seat may sit idle, and a demand may declare identical periods once.
// The verifiers are the kernel and the frozen inputs, never the text of the module: every expected amount below is
// stated from the price of the seat the frozen policy holds (one per year, one per month) and the FX the quote
// froze, or is read from a second quote composed by `composeResourceQuote` with one thing changed. What must NOT move is checked
// against a committed artifact: the same demand composes, key for key, what that artifact froze.
//
// Everything is built in memory from the sources one committed artifact froze; nothing is written under data/.
import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import {
  explainResourceComposition,
  replayResourceComposition,
  runResourceComposition
} from '../adapters/resource-composition'
import { commitmentExposure } from '../resources/commitment-exposure'
import { composeResourceQuote } from '../resources/composition'
import { compositionDemandSchema, declaredOnce, eachPeriod, periodsOf } from '../resources/composition-contracts'
import { readEngagementCash } from '../resources/engagement-view'
import { allocateResourcePortfolio, prepareOperatingPlan, scaffoldResourceDemand } from '../resources/operating'
import { quotePriceNotices } from '../resources/price-review'
import { splitQuotedPrice } from '../resources/price-split'
import { assessCompositionReadiness } from '../resources/readiness'
import { estimateExposure, summarizeComposition } from '../resources/summary'

type Composition = ReturnType<typeof composeResourceQuote>
type Demand = ReturnType<typeof compositionDemandSchema.parse>
type Allocation = Demand['allocations'][number]

const D = Decimal.clone({ precision: 80 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

// A managed service of six people in one period; two of them (`primary`, `backup`) answer the social inbox, a named
// tool sold by the seat with a price per year and a price per month. Frozen with the sources it carries.
const FROZEN = read('data/pricing/v3-operating/managed-care-colombia.artifact.json')
const { catalog, policy, credits } = FROZEN.semantic as { catalog: unknown; policy: PolicyLike; credits: unknown }

type PolicyLike = {
  tools: {
    toolId: string
    label: string
    prices: { priceId: string; basis: string; includedSeats?: number; price?: Record<string, unknown> }[]
  }[]
}

const INBOX = 'social-inbox'
const ANNUAL = 'sprout-advanced-annual'
const MONTHLY = 'sprout-advanced-monthly'
const PRIMARY = 'managed-care-primary'
const BACKUP = 'managed-care-backup'

// Read from what the artifact froze: the two prices of a seat in the policy, and the FX to the quote currency.
const seatPrice = (priceId: string) =>
  new D(policy.tools.find(t => t.toolId === INBOX)!.prices.find(p => p.priceId === priceId)!.price!.amount as string)

const ANNUAL_USD = seatPrice(ANNUAL)
const MONTHLY_USD = seatPrice(MONTHLY)
const FX = new D(FROZEN.semantic.result.quote.resolution.inputs[0].input.snapshot.fx[0].rate as string)

const range = (periods: number) => Array.from({ length: periods }, (_, i) => i + 1)

const seat = (periodIds: number[], priceId: string, quantity: number, more: Partial<Allocation> = {}): Allocation => ({
  periodIds,
  toolId: INBOX,
  priceId,
  quantity: String(quantity),
  serviceShare: '1',
  driver: { unit: 'named-seats', totalUnits: String(quantity), allocatedUnits: String(quantity) },
  reason: 'Test: seats of the social inbox as this case buys them.',
  ...more
})

/**
 * The committed demand over `periods` months. `backupIn` are the periods the backup person works; in the others the
 * team has five people, so the tools everybody uses pay five seats there. The social inbox is left for each case.
 */
const demandOver = (periods: number, backupIn = range(periods), inbox: Allocation[] = []): Demand => {
  const d = clone(FROZEN.semantic.demand) as Demand
  const without = range(periods).filter(p => !backupIn.includes(p))

  d.brief.periods = periods
  if (without.length) d.brief.lines.find(l => l.lineId === 'backup')!.activePeriods = backupIn

  d.allocations = d.allocations
    .filter(a => a.toolId !== INBOX)
    .flatMap(a => {
      const { periodId, ...declared } = a

      void periodId

      // Seats of the tools everybody uses follow the head count; the agent runtime is no seat.
      if (!a.seatCapacity || !without.length) return [{ periodIds: range(periods), ...declared }]

      return [
        ...(backupIn.length ? [{ periodIds: backupIn, ...declared }] : []),
        { periodIds: without, ...declared, quantity: '5', seatCapacity: 5 }
      ]
    })
  d.allocations.push(...inbox)

  return compositionDemandSchema.parse(d)
}

const run = (d: Demand, p: unknown = policy) => composeResourceQuote(catalog, p, credits, d)
const freeze = (d: Demand, p: unknown = policy) => runResourceComposition(catalog, p, credits, d)
const codes = (r: Composition) => r.quote.diagnostics.map(d => d.code)
const at = (r: Composition, code: string) => r.quote.diagnostics.filter(d => d.code === code).map(d => d.path)

const inboxIn = (r: Composition, periodId: number) =>
  r.attributions.filter(a => a.toolId === INBOX && a.periodId === periodId)

/** Cost the kernel stored for the social inbox in a period, in the calculation currency (USD), by row. */
const kernelInboxCost = (r: Composition, periodId: number) => {
  const period = r.quote.periods.find(p => p.periodId === periodId)!
  const input = r.quote.resolution.inputs.find(i => i.periodId === periodId)!.input
  const byLine = new Map<string, Decimal>()

  for (const row of period.result.lines) {
    const line = input.request.lines.find(l => l.lineId === row.parentLineId)

    for (const component of row.components) {
      const assignment = line?.assignments.find(a => a.allocationId === component.componentId)

      if (!assignment?.resourceId.startsWith(`composed:${INBOX}`)) continue
      byLine.set(row.parentLineId, (byLine.get(row.parentLineId) ?? new D(0)).plus(component.cost))
    }
  }

  return byLine
}

const total = (values: Iterable<Decimal>) => [...values].reduce((sum, value) => sum.plus(value), new D(0))

describe('what a demand that uses none of this keeps', () => {
  it('composes, key for key, what the committed artifact froze', () => {
    const result = run(compositionDemandSchema.parse(FROZEN.semantic.demand))

    // The real verifier of every committed artifact is the replay guard (pricing-v3-frozen-artifacts.test.ts); this
    // states the same for the fixture of this file, so a case below can never pass on a base that already moved.
    expect(clone(result)).toEqual(FROZEN.semantic.result)
    expect(replayResourceComposition(FROZEN).replayDigest).toBe(FROZEN.replayDigest)
  })

  it('keeps the id of the tool for a tool held under one price per period, also when the price changes over the term', () => {
    const d = demandOver(2, range(2), [seat([1, 2], ANNUAL, 2)])

    // Microsoft 365 on one monthly price in period 1 and on another in period 2: never two holdings at once.
    d.allocations = d.allocations.flatMap(a =>
      a.toolId === 'microsoft-365'
        ? [
            { ...a, periodIds: [1] },
            { ...a, periodIds: [2], priceId: 'public-standard-no-teams-monthly' }
          ]
        : [a]
    )

    const r = run(d)

    expect(r.quote.calculationStatus).toBe('calculated')

    for (const { input } of r.quote.resolution.inputs) {
      expect(input.snapshot.resources.filter(x => x.resourceId.startsWith('composed:')).map(x => x.resourceId)).toEqual(
        ['composed:notion', 'composed:microsoft-365', `composed:${INBOX}`, 'composed:agent-runtime-usage']
      )
      expect(input.request.lines[0].assignments.map(a => a.allocationId)).toContain(`composed-${INBOX}-0`)
    }

    expect(r.attributions.every(a => !('seats' in a) && !('idle' in a) && !('bornByLineIds' in a))).toBe(true)
  })
})

describe('periods declared once', () => {
  it('reads an allocation declared for several periods as one per period', () => {
    const once = demandOver(3, range(3), [seat([1, 2, 3], ANNUAL, 2)])
    const repeated = clone(once)

    repeated.allocations = eachPeriod(once.allocations)

    expect(repeated.allocations).toHaveLength(12)
    expect(once.allocations).toHaveLength(4)
    expect(run(once).quote.calculationStatus).toBe('calculated')
    expect(run(compositionDemandSchema.parse(repeated))).toEqual(run(once))
  })

  it('accepts the same for the credit demand of a line and for the tools the client provides', () => {
    // A designer who asks for credits of one provider in two months (the catalog and policy of the first review).
    const first = (name: string) => read(`data/pricing/v3-composition/${name}.json`)
    const designer = compositionDemandSchema.parse(first('designer.demand'))

    designer.brief.periods = 2
    designer.allocations = designer.allocations.map(a => ({ ...a, periodId: undefined, periodIds: [1, 2] }))
    designer.creditBudgets.push({
      ...designer.creditBudgets[0],
      periodId: 2,
      purchaseDate: '2026-11-01',
      useBy: '2026-11-30'
    })

    const repeated = clone(designer)

    repeated.work[0].creditDemand.push({ ...repeated.work[0].creditDemand[0], periodId: 2 })
    designer.work[0].creditDemand = designer.work[0].creditDemand.map(c => ({
      ...c,
      periodId: undefined,
      periodIds: [1, 2]
    }))

    const compose = (d: Demand) =>
      composeResourceQuote(
        read('data/pricing/v3-catalog/catalog.review-v1.json'),
        first('resources.review-v1'),
        credits,
        compositionDemandSchema.parse(d)
      )

    expect(compose(designer).quote.calculationStatus).toBe('calculated')
    expect(compose(designer)).toEqual(compose(repeated))

    // A CRM the client provides, covered in both months by one declaration.
    const crm = compositionDemandSchema.parse(read('data/pricing/v3-operating/crm-client-tools.demand.json'))
    const sources = read('data/pricing/v3-operating/crm-client-tools.artifact.json').semantic

    crm.brief.periods = 2
    crm.allocations = crm.allocations.map(a => ({ ...a, periodId: undefined, periodIds: [1, 2] }))

    const coverage = crm.clientProvidedTools!.map(c => ({
      ...c,
      evidence: { ...c.evidence, effectiveUntil: '2027-12-31' }
    }))

    const covered = (tools: Demand['clientProvidedTools']) =>
      composeResourceQuote(
        sources.catalog,
        sources.policy,
        sources.credits,
        compositionDemandSchema.parse({ ...crm, clientProvidedTools: tools })
      )

    const once = covered(coverage.map(c => ({ ...c, periodId: undefined, periodIds: [1, 2] })))

    expect(once.quote.calculationStatus).toBe('calculated')
    expect(once).toEqual(covered([...coverage, ...coverage.map(c => ({ ...c, periodId: 2 }))]))
    // Declared for the first month only, the second has nobody covering the tool: the composition asks for it.
    expect(codes(covered(coverage))).not.toEqual([])
  })

  it('rejects an entry with both forms, with neither, or with a period twice', () => {
    const d = clone(FROZEN.semantic.demand)

    const withPeriods = (periods: object) => {
      const { periodId, ...declared } = d.allocations[0]

      void periodId

      return { ...d, allocations: [{ ...declared, ...periods }, ...d.allocations.slice(1)] }
    }

    expect(compositionDemandSchema.safeParse(withPeriods({ periodIds: [1] })).success).toBe(true)
    expect(compositionDemandSchema.safeParse(withPeriods({ periodId: 1, periodIds: [1] })).success).toBe(false)
    expect(compositionDemandSchema.safeParse(withPeriods({})).success).toBe(false)
    expect(compositionDemandSchema.safeParse(withPeriods({ periodIds: [1, 1] })).success).toBe(false)
    expect(compositionDemandSchema.safeParse(withPeriods({ periodIds: [] })).success).toBe(false)
  })

  it('writes entries that differ only by period once, and loses none', () => {
    const entries = [
      { periodId: 2, toolId: 'a', quantity: '1' },
      { periodId: 1, toolId: 'a', quantity: '1' },
      { periodId: 3, toolId: 'a', quantity: '2' },
      { periodId: 5, toolId: 'a', quantity: '1' },
      { periodId: 5, toolId: 'a', quantity: '1' }
    ]

    const once = declaredOnce(entries)

    expect(once).toEqual([
      { periodIds: [1, 2, 5], toolId: 'a', quantity: '1' },
      { periodId: 3, toolId: 'a', quantity: '2' },
      { periodId: 5, toolId: 'a', quantity: '1' }
    ])
    expect(once.map(periodsOf)).toEqual([[1, 2, 5], [3], [5]])
    // The same entries, period by period: nothing was merged away, the repeated one included.
    expect(
      eachPeriod(once)
        .map(e => `${e.periodId}:${e.quantity}`)
        .sort()
    ).toEqual(entries.map(e => `${e.periodId}:${e.quantity}`).sort())
  })

  it('declares once, in the demand a plan writes, the periods a portfolio repeats', () => {
    const plan = read('data/pricing/v3-operating/service.plan.json')
    const first = (name: string) => read(`data/pricing/v3-operating/${name}.json`)
    const sources = [first('catalog.review-v2'), first('resources.review-v2'), credits] as const

    plan.demand.brief.periods = 3
    plan.demand.allocations = plan.demand.allocations.flatMap((a: Allocation) =>
      [1, 2, 3].map(periodId => ({ ...a, periodId }))
    )
    plan.portfolio.resources = plan.portfolio.resources.flatMap((r: { periodId: number }) =>
      [1, 2, 3].map(periodId => ({ ...r, periodId }))
    )

    const prepared = prepareOperatingPlan(...sources, plan)
    const written = prepared.demand!.allocations

    expect(prepared.status).toBe('calculated')
    // What the caller declared stays as written; what the plan adds from the portfolio is declared once.
    expect(written.slice(0, 12)).toEqual(plan.demand.allocations)
    expect(written.slice(12).map(a => [a.toolId, a.periodId, a.periodIds])).toEqual([
      ['vercel', undefined, [1, 2, 3]],
      ['gcp', undefined, [1, 2, 3]]
    ])

    // It is the same demand as one entry per period: the portfolio itself still reads period by period.
    const perPeriod = allocateResourcePortfolio(plan.portfolio, sources[1], sources[0], plan.demand.brief.quoteDate)

    expect(eachPeriod(written.slice(12))).toEqual(
      perPeriod.allocations
        .filter(a => a.accountId === plan.demand.brief.accountId)
        .map(a => a.allocation)
        .sort((a, b) => (a.toolId === b.toolId ? a.periodId - b.periodId : a.toolId === 'vercel' ? -1 : 1))
        .map(a => expect.objectContaining(a))
    )

    const repeated = clone(prepared.demand!)

    repeated.allocations = eachPeriod(written)
    expect(composeResourceQuote(...sources, repeated)).toEqual(prepared.composition)
  })

  it('tells whoever fills a scaffold that periods are declared once and seats are accounted for', () => {
    const first = (name: string) => read(`data/pricing/v3-operating/${name}.json`)
    const r = scaffoldResourceDemand(first('catalog.review-v2'), first('resources.review-v2'), first('writer.brief'))
    const prompt = r.questions.find(q => q.code === 'TOOL_PLAN_AND_ALLOCATION_REQUIRED')!.prompt

    // The scaffold writes no allocation, so it has no period to repeat: what it gives is the instruction.
    expect(r.demand.allocations).toEqual([])
    expect(prompt).toContain('periodIds')
    expect(prompt).toContain('idleSeats')
    expect(prompt).toContain('seatSharing')
  })
})

describe('a tool held under several prices', () => {
  // The primary person all three months on a seat bought for the year; the backup person in month 2, on a seat
  // bought for that month.
  const mixed = () => demandOver(3, [2], [seat([1, 2, 3], ANNUAL, 1), seat([2], MONTHLY, 1)])

  it('calculates an annual seat with a monthly one next to it in some periods, with no continuity diagnostic', () => {
    const r = run(mixed())

    expect(r.quote.diagnostics).toEqual([])
    expect(r.quote.calculationStatus).toBe('calculated')
    expect(inboxIn(r, 1).map(a => [a.priceId, a.quantity, a.resource.unit])).toEqual([[ANNUAL, '1', 'year']])
    expect(inboxIn(r, 2).map(a => [a.priceId, a.quantity, a.resource.unit])).toEqual([
      [ANNUAL, '1', 'year'],
      [MONTHLY, '1', 'month']
    ])

    // The year is charged once, whole, and the month only in its month.
    expect(r.quote.cashLedger.filter(c => c.key.startsWith(`composed:${INBOX}`))).toEqual([
      {
        periodId: 1,
        key: `composed:${INBOX}:${ANNUAL}:account:${mixed().brief.accountId}`,
        amount: ANNUAL_USD.mul(FX).toFixed(0),
        currency: 'COP'
      }
    ])
  })

  it('names each holding apart for the kernel, in every period, and leaves every other tool as it was', () => {
    const r = run(mixed())

    for (const { periodId, input } of r.quote.resolution.inputs) {
      const composed = input.snapshot.resources.filter(x => x.resourceId.startsWith('composed:'))

      expect(composed.map(x => [x.resourceId, x.covers])).toEqual([
        ['composed:notion', ['tool:notion']],
        ['composed:microsoft-365', ['tool:microsoft-365']],
        // The annual seat keeps one identity over the term, also in the months it is the only holding.
        [`composed:${INBOX}:${ANNUAL}`, [`tool:${INBOX}:${ANNUAL}`]],
        ...(periodId === 2 ? [[`composed:${INBOX}:${MONTHLY}`, [`tool:${INBOX}:${MONTHLY}`]]] : []),
        ['composed:agent-runtime-usage', ['tool:agent-runtime-usage']]
      ])

      const allocationIds = input.request.lines.flatMap(l => l.assignments.map(a => a.allocationId))

      expect(new Set(allocationIds).size).toBe(allocationIds.length)
      expect(allocationIds).toContain(`composed-${INBOX}-${ANNUAL}-0`)
      expect(allocationIds.includes(`composed-${INBOX}-${MONTHLY}-1`)).toBe(periodId === 2)
    }

    // Told apart in every reading by what each is bought as.
    const label = policy.tools.find(t => t.toolId === INBOX)!.label

    expect(inboxIn(r, 2).map(a => a.resource.label)).toEqual([`${label} (${ANNUAL})`, `${label} (${MONTHLY})`])
  })

  it('pools the cost of both holdings and distributes it by seat among the lines that use the tool', () => {
    const r = run(mixed())
    const monthOfTheYear = ANNUAL_USD.div(12)

    // Month 1: one person, one seat, the twelfth of the year.
    expect([...kernelInboxCost(r, 1)]).toEqual([['primary', monthOfTheYear]])

    // Month 2: two people, two seats. Each carries half of each holding, so half of the pool.
    const second = kernelInboxCost(r, 2)
    const pool = monthOfTheYear.plus(MONTHLY_USD)

    expect([...second.keys()]).toEqual(['primary', 'backup'])
    expect(second.get('primary')!.eq(pool.div(2))).toBe(true)
    expect(second.get('backup')!.eq(pool.div(2))).toBe(true)
    expect(inboxIn(r, 2).map(a => a.assignments.map(x => x.share))).toEqual([
      ['0.5', '0.5'],
      ['0.5', '0.5']
    ])
    expect(inboxIn(r, 2).map(a => a.seats)).toEqual([
      { needed: 2, paid: '2', idle: 0, shared: [] },
      { needed: 2, paid: '2', idle: 0, shared: [] }
    ])

    // Against the same engagement with the backup person on a second annual seat that month: only the seat differs.
    const other = demandOver(3, [2], [seat([1, 3], ANNUAL, 1), seat([2], ANNUAL, 2)])
    const difference = total(kernelInboxCost(r, 2).values()).minus(total(kernelInboxCost(run(other), 2).values()))

    expect(difference.eq(MONTHLY_USD.minus(monthOfTheYear))).toBe(true)
  })

  it('still trips annual continuity when the annual holding changes or leaves a gap', () => {
    // That same quote changes the seats of the year in month 2, which is what continuity is there to stop.
    const changed = run(demandOver(3, [2], [seat([1, 3], ANNUAL, 1), seat([2], ANNUAL, 2)]))

    expect(codes(changed)).toContain('ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY')

    // The annual seat is dropped in month 2, with a monthly one in its place, and comes back in month 3.
    const gap = run(
      demandOver(
        3,
        [2],
        [seat([1, 3], ANNUAL, 1), seat([2], MONTHLY, 2), seat([1], MONTHLY, 1, { idleSeats: 1, idleReason: 'Test.' })]
      )
    )

    expect(gap.quote.diagnostics.filter(d => d.code === 'ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY')).toEqual([
      expect.objectContaining({ path: `composed:${INBOX}:${ANNUAL}:account:${mixed().brief.accountId}` })
    ])
    expect(gap.quote.totals).toBeNull()
  })

  it('rejects the same price twice in a period, and reports each holding by its price', () => {
    const twice = mixed()

    twice.allocations.push(seat([2], MONTHLY, 1))
    expect(codes(run(twice))).toContain('DUPLICATE_RESOURCE_ALLOCATION')

    // A price nobody has yet, next to one that is fine: the diagnostic names period, tool and price.
    const pending = run(demandOver(3, [2], [seat([1, 2, 3], ANNUAL, 1), seat([2], 'current', 1)]))

    expect(at(pending, 'RESOURCE_PRICE_PENDING')).toEqual([`2:${INBOX}:current`])
    expect(pending.quote.totals).toBeNull()

    // A holding the period does not use is unused under its own price too.
    const unused = mixed()

    unused.allocations.push(seat([3], MONTHLY, 1, { periodIds: undefined, periodId: 4 }))
    expect(at(run(unused), 'UNUSED_RESOURCE_ALLOCATION')).toEqual([`4:${INBOX}:${MONTHLY}`])
  })

  it('says by period and tool when a holding named by tool and price would not fit the ids of the kernel', () => {
    const long = clone(policy)
    const prices = long.tools.find(t => t.toolId === INBOX)!.prices
    const rename = (priceId: string) => `${priceId}-${'x'.repeat(79 - priceId.length)}`

    for (const price of prices) if ([ANNUAL, MONTHLY].includes(price.priceId)) price.priceId = rename(price.priceId)

    const r = run(demandOver(3, [2], [seat([1, 2, 3], rename(ANNUAL), 1), seat([2], rename(MONTHLY), 1)]), long)

    expect(rename(ANNUAL)).toHaveLength(80)
    expect(codes(r)).not.toContain('RESOURCE_HOLDING_ID_TOO_LONG')
    expect(r.quote.calculationStatus).toBe('calculated')

    // The same with a tool id that leaves no room: 9 + 60 + 1 + 80 characters is more than the kernel takes.
    const longTool = clone(long)
    const renamed = `${INBOX}-${'y'.repeat(59 - INBOX.length)}`

    longTool.tools.find(t => t.toolId === INBOX)!.toolId = renamed

    const d = demandOver(3, [2], [seat([1, 2, 3], rename(ANNUAL), 1), seat([2], rename(MONTHLY), 1)])

    for (const a of d.allocations) if (a.toolId === INBOX) a.toolId = renamed

    const blocked = run(d, longTool)

    expect(at(blocked, 'RESOURCE_HOLDING_ID_TOO_LONG')).toEqual([
      `1:${renamed}:${rename(ANNUAL)}`,
      `2:${renamed}:${rename(ANNUAL)}`,
      `2:${renamed}:${rename(MONTHLY)}`,
      `3:${renamed}:${rename(ANNUAL)}`
    ])
    expect(blocked.quote.totals).toBeNull()
    // Nothing reached the kernel half-named.
    expect(blocked.quote.periods).toEqual([])
  })
})

describe('seat accounting of a named tool', () => {
  it('needs one seat per person, and says apart when a seat is missing and when one is paid and unaccounted for', () => {
    const short = run(demandOver(1, [1], [seat([1], ANNUAL, 1)]))
    const over = run(demandOver(1, [1], [seat([1], ANNUAL, 3)]))

    expect(at(short, 'INSUFFICIENT_NAMED_SEAT_CAPACITY')).toEqual([`1:${INBOX}`])
    expect(codes(short)).not.toContain('UNACCOUNTED_NAMED_SEATS')
    expect(short.quote.totals).toBeNull()

    expect(over.quote.diagnostics.filter(d => d.code === 'UNACCOUNTED_NAMED_SEATS')).toEqual([
      { code: 'UNACCOUNTED_NAMED_SEATS', path: `1:${INBOX}`, detail: expect.stringContaining('3 seats are paid') }
    ])
    expect(codes(over)).not.toContain('INSUFFICIENT_NAMED_SEAT_CAPACITY')
    expect(over.quote.totals).toBeNull()
  })

  it('lets two people use one seat between them: one seat is paid and each carries half of it', () => {
    const sharing = { periodIds: [1], toolId: INBOX, assigneeIds: [PRIMARY, BACKUP], reason: 'They answer in shifts.' }
    const d = demandOver(1, [1], [seat([1], MONTHLY, 1)])

    d.seatSharing = [sharing]

    const r = run(d)

    expect(r.quote.diagnostics).toEqual([])
    expect(r.quote.calculationStatus).toBe('calculated')
    expect(inboxIn(r, 1)).toHaveLength(1)
    expect(inboxIn(r, 1)[0]).toMatchObject({
      quantity: '1',
      consumerIds: [BACKUP, PRIMARY],
      attributedMonthlyCost: MONTHLY_USD.toString(),
      seats: { needed: 1, paid: '1', idle: 0, shared: [{ assigneeIds: [BACKUP, PRIMARY], reason: sharing.reason }] }
    })
    expect([...kernelInboxCost(r, 1)].map(([line, cost]) => [line, cost.toString()])).toEqual([
      ['primary', MONTHLY_USD.div(2).toString()],
      ['backup', MONTHLY_USD.div(2).toString()]
    ])

    // The same two people without the declaration need two seats, and with it two seats are one too many.
    d.seatSharing = undefined
    expect(codes(run(d))).toContain('INSUFFICIENT_NAMED_SEAT_CAPACITY')

    const two = demandOver(1, [1], [seat([1], MONTHLY, 2)])

    two.seatSharing = [sharing]
    expect(codes(run(two))).toContain('UNACCOUNTED_NAMED_SEATS')
  })

  it('weighs a shared seat by person and a person by the functions they work in', () => {
    // Three people on two seats: `primary` and `backup` share one, a third person has their own.
    const d = demandOver(1, [1], [seat([1], MONTHLY, 2)])
    const lead = d.work.find(w => w.lineId === 'lead')!

    lead.tasks = ['social-care']
    d.seatSharing = [{ periodId: 1, toolId: INBOX, assigneeIds: [PRIMARY, BACKUP], reason: 'They answer in shifts.' }]

    const r = run(d)
    const shares = Object.fromEntries(inboxIn(r, 1)[0].assignments.map(a => [a.lineId, a.share]))

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(inboxIn(r, 1)[0].seats).toMatchObject({ needed: 2, paid: '2' })
    // Half a seat, half a seat and a whole one, of two.
    expect(shares).toEqual({ primary: '0.25', backup: '0.25', lead: '0.5' })
  })

  it('rejects a sharing group that does not match the use, and reports one that matches nothing', () => {
    const base = () => demandOver(2, [1], [seat([1], MONTHLY, 1), seat([2], MONTHLY, 1)])

    const group = (more: object) => ({
      periodId: 1,
      toolId: INBOX,
      assigneeIds: [PRIMARY, BACKUP],
      reason: 'Test.',
      ...more
    })

    const withSharing = (...groups: object[]) => run(compositionDemandSchema.parse({ ...base(), seatSharing: groups }))

    expect(withSharing(group({})).quote.calculationStatus).toBe('calculated')

    // The backup person does not work in month 2, so nobody shares there.
    expect(at(withSharing(group({ periodId: undefined, periodIds: [1, 2] })), 'INVALID_SEAT_SHARING')).toEqual([
      `2:${INBOX}`
    ])
    // Somebody who does not use the tool, and somebody in two groups.
    expect(at(withSharing(group({ assigneeIds: [PRIMARY, 'managed-care-lead'] })), 'INVALID_SEAT_SHARING')).toEqual([
      `1:${INBOX}`
    ])
    expect(at(withSharing(group({}), group({ reason: 'Again.' })), 'INVALID_SEAT_SHARING')).toEqual([`1:${INBOX}`])
    // A tool with no named seat has none to share.
    expect(at(withSharing(group({}), group({ toolId: 'agent-runtime-usage' })), 'INVALID_SEAT_SHARING')).toEqual([
      '1:agent-runtime-usage'
    ])
    // A period the quote does not have: declared, and used by nothing.
    expect(at(withSharing(group({}), group({ periodId: 3 })), 'UNUSED_SEAT_SHARING')).toEqual([`3:${INBOX}`])
    // One person is no group.
    expect(
      compositionDemandSchema.safeParse({ ...base(), seatSharing: [group({ assigneeIds: [PRIMARY] })] }).success
    ).toBe(false)
  })

  it('accepts a paid seat declared idle, keeps its cost in the quote and says whose it is', () => {
    // Two annual seats all three months; the backup person works in month 2 only.
    const idle = { idleSeats: 1, idleReason: 'The seat of the backup person is bought for the year.' }
    const r = run(demandOver(3, [2], [seat([2], ANNUAL, 2), seat([1, 3], ANNUAL, 2, idle)]))
    const twoSeats = ANNUAL_USD.mul(2).div(12)

    expect(r.quote.diagnostics).toEqual([])
    expect(r.quote.calculationStatus).toBe('calculated')

    // Every month costs two seats: in months 1 and 3 the person who uses the tool carries both.
    expect([...kernelInboxCost(r, 1)].map(([line, cost]) => [line, cost.toString()])).toEqual([
      ['primary', twoSeats.toString()]
    ])
    expect(total(kernelInboxCost(r, 2).values()).eq(twoSeats)).toBe(true)
    expect(inboxIn(r, 1)[0]).toMatchObject({
      quantity: '2',
      consumerIds: [PRIMARY],
      seats: { needed: 1, paid: '2', idle: 1, shared: [] },
      idle: { seats: 1, reason: idle.idleReason, attributedMonthlyCost: ANNUAL_USD.div(12).toString() }
    })
    expect('idle' in inboxIn(r, 2)[0]).toBe(false)
    // One price all year: the tool keeps its id, and the two seats are one subscription with no change.
    expect(r.quote.cashLedger.filter(c => c.key.startsWith('composed:social-inbox'))).toEqual([
      expect.objectContaining({ periodId: 1, key: expect.stringMatching(/^composed:social-inbox:account:/) })
    ])
    expect(r.quote.cashLedger.find(c => c.key.startsWith('composed:social-inbox'))!.amount).toBe(
      ANNUAL_USD.mul(2).mul(FX).toFixed(0)
    )
  })

  it('rejects idle seats where there is no seat to declare, and a reason without them', () => {
    const idle = { idleSeats: 1, idleReason: 'Test.' }

    // More idle seats than the entry pays.
    expect(
      at(run(demandOver(1, [1], [seat([1], ANNUAL, 2, { idleSeats: 3, idleReason: 'Test.' })])), 'INVALID_IDLE_SEATS')
    ).toEqual([`1:${INBOX}`])

    // A tool that is not sold by named seats.
    const shared = demandOver(1, [1], [seat([1], ANNUAL, 2)])

    Object.assign(shared.allocations.find(a => a.toolId === 'agent-runtime-usage')!, idle)
    expect(at(run(shared), 'INVALID_IDLE_SEATS')).toEqual(['1:agent-runtime-usage'])

    // An idle seat is nobody's: it does not seat the second person.
    expect(codes(run(demandOver(1, [1], [seat([1], ANNUAL, 2, idle)])))).toContain('INSUFFICIENT_NAMED_SEAT_CAPACITY')

    const d = clone(FROZEN.semantic.demand)

    d.allocations[0].idleReason = 'A reason with no idle seat.'
    expect(compositionDemandSchema.safeParse(d).success).toBe(false)
    d.allocations[0].idleSeats = 1
    expect(compositionDemandSchema.safeParse(d).success).toBe(true)
    delete d.allocations[0].idleReason
    expect(compositionDemandSchema.safeParse(d).success).toBe(false)
  })

  it('counts a package as capacity next to seats paid one by one, and an idle seat as no capacity', () => {
    // The same tool also sold as a package of three seats, for this case only.
    const withPackage = clone(policy)
    const prices = withPackage.tools.find(t => t.toolId === INBOX)!.prices

    prices.push({
      priceId: 'team-package',
      basis: 'package',
      includedSeats: 3,
      price: { ...prices.find(p => p.priceId === MONTHLY)!.price!, amount: '900' }
    })

    const pack = (seatCapacity: number) => seat([1], 'team-package', 1, { seatCapacity })
    const compose = (...inbox: Allocation[]) => run(demandOver(1, [1], inbox), withPackage)

    // Two people: a package that seats them; a package of one with a seat paid apart.
    expect(compose(pack(2)).quote.calculationStatus).toBe('calculated')
    expect(compose(pack(1), seat([1], MONTHLY, 1)).quote.calculationStatus).toBe('calculated')
    expect(inboxIn(compose(pack(1), seat([1], MONTHLY, 1)), 1).map(a => a.seats)).toEqual([
      { needed: 2, paid: '1', idle: 0, packageCapacity: 1, shared: [] },
      { needed: 2, paid: '1', idle: 0, packageCapacity: 1, shared: [] }
    ])

    // The package seats one and the seat paid apart is declared idle: one person has no seat.
    expect(codes(compose(pack(1), seat([1], MONTHLY, 1, { idleSeats: 1, idleReason: 'Test.' })))).toContain(
      'INSUFFICIENT_NAMED_SEAT_CAPACITY'
    )
    // Three seats paid one by one for two people, whatever the package holds.
    expect(codes(compose(pack(2), seat([1], MONTHLY, 3)))).toContain('UNACCOUNTED_NAMED_SEATS')
    // A package cannot declare a seat idle.
    expect(codes(compose({ ...pack(3), idleSeats: 1, idleReason: 'Test.' }))).toContain('INVALID_IDLE_SEATS')
  })
})

describe('a tool nobody uses in a period', () => {
  // Only the backup person answers the inbox, in month 2; the seat is bought for the year.
  const onlyBackup = (inbox: Allocation[]) => {
    const d = demandOver(3, [2], inbox)

    d.work.find(w => w.lineId === 'primary')!.tasks = []

    return d
  }

  const idle = { idleSeats: 1, idleReason: 'The seat is bought for the year and its person works one month.' }

  it('puts the cost of its idle seats, in equal parts, on the lines the demand names', () => {
    const r = run(
      onlyBackup([seat([2], ANNUAL, 1), seat([1, 3], ANNUAL, 1, { ...idle, bornByLineIds: ['primary', 'lead'] })])
    )

    const month = ANNUAL_USD.div(12)

    expect(r.quote.diagnostics).toEqual([])
    expect(r.quote.calculationStatus).toBe('calculated')
    expect([...kernelInboxCost(r, 1)].map(([line, cost]) => [line, cost.toString()])).toEqual([
      ['primary', month.div(2).toString()],
      ['lead', month.div(2).toString()]
    ])
    expect([...kernelInboxCost(r, 2)].map(([line, cost]) => [line, cost.toString()])).toEqual([
      ['backup', month.toString()]
    ])
    expect(inboxIn(r, 1)[0]).toMatchObject({
      consumerIds: [],
      bornByLineIds: ['primary', 'lead'],
      seats: { needed: 0, paid: '1', idle: 1, shared: [] },
      idle: { seats: 1, reason: idle.idleReason, attributedMonthlyCost: month.toString() }
    })
    // The work of those lines does not need the tool, and the row that says so says why they carry it.
    expect(r.selections.find(s => s.periodId === 1 && s.lineId === 'lead' && s.toolId === INBOX)).toEqual({
      periodId: 1,
      lineId: 'lead',
      toolId: INBOX,
      included: false,
      reasons: ['not-required-for-work', `bears-idle-seat:${idle.idleReason}`]
    })
    // One seat, one year, no change and no gap: the subscription is whole.
    expect(codes(r)).not.toContain('ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY')
  })

  it('asks who bears them, takes only lines active in the period, and nothing when the tool has users', () => {
    const withBearer = (bearer: Partial<Allocation>, inMonthTwo: Partial<Allocation> = {}) =>
      run(onlyBackup([seat([2], ANNUAL, 1, inMonthTwo), seat([1, 3], ANNUAL, 1, { ...idle, ...bearer })]))

    expect(at(withBearer({}), 'IDLE_SEAT_BEARER_REQUIRED')).toEqual([`1:${INBOX}`, `3:${INBOX}`])
    // The backup line is not active in months 1 and 3; a line named twice; a line that does not exist.
    expect(at(withBearer({ bornByLineIds: ['backup'] }), 'INVALID_IDLE_SEAT_BEARER')).toEqual([
      `1:${INBOX}`,
      `3:${INBOX}`
    ])
    expect(codes(withBearer({ bornByLineIds: ['lead', 'lead'] }))).toContain('INVALID_IDLE_SEAT_BEARER')
    expect(codes(withBearer({ bornByLineIds: ['nobody'] }))).toContain('INVALID_IDLE_SEAT_BEARER')
    // In month 2 the backup person uses the seat: the cost follows the use.
    expect(
      at(withBearer({ bornByLineIds: ['lead'] }, { bornByLineIds: ['lead'] }), 'IDLE_SEAT_BEARER_NOT_ALLOWED')
    ).toEqual([`2:${INBOX}`])
    // Named lines bear seats declared idle, every one of them: a seat that is not is unaccounted for.
    expect(
      at(
        run(onlyBackup([seat([2], ANNUAL, 1), seat([1, 3], ANNUAL, 1, { bornByLineIds: ['lead'] })])),
        'UNACCOUNTED_NAMED_SEATS'
      )
    ).toEqual([`1:${INBOX}`, `3:${INBOX}`])
  })

  it('leaves an allocation that declares nothing idle what it always was: unused', () => {
    const r = run(onlyBackup([seat([1, 2, 3], ANNUAL, 1)]))

    expect(at(r, 'UNUSED_RESOURCE_ALLOCATION')).toEqual([`1:${INBOX}`, `3:${INBOX}`])
    expect(r.quote.totals).toBeNull()
  })
})

describe('readings of a quote with several holdings, shared seats and idle seats', () => {
  const idle = { idleSeats: 1, idleReason: 'The seat of the backup person is bought for the year.' }
  const mixed = () => freeze(demandOver(3, [2], [seat([1, 2, 3], ANNUAL, 1), seat([2], MONTHLY, 1)]))
  const withIdle = () => freeze(demandOver(3, [2], [seat([2], ANNUAL, 2), seat([1, 3], ANNUAL, 2, idle)]))

  const withSharing = () => {
    const d = demandOver(3, [2], [seat([1, 2, 3], MONTHLY, 1)])

    d.seatSharing = [{ periodId: 2, toolId: INBOX, assigneeIds: [PRIMARY, BACKUP], reason: 'They answer in shifts.' }]

    return freeze(d)
  }

  it('freezes and replays them, declared periods included', () => {
    for (const artifact of [mixed(), withIdle(), withSharing()]) {
      expect(artifact.semantic.result.quote.calculationStatus).toBe('calculated')
      expect(replayResourceComposition(clone(artifact)).replayDigest).toBe(artifact.replayDigest)
      // The frozen demand keeps what was declared: periods once, not one entry per period.
      expect(artifact.semantic.demand.allocations.every(a => a.periodIds && a.periodId === undefined)).toBe(true)
    }
  })

  it('summary: one row per holding with its price, and the seats, the idle ones and the shared ones where declared', () => {
    const rows = (artifact: ReturnType<typeof freeze>) =>
      summarizeComposition(artifact.semantic.result, artifact).attributions.filter(a => a.toolId === INBOX)

    expect(rows(mixed()).map(a => [a.priceId, a.unit, a.periodIds, a.lineIds, 'seats' in a ? a.seats : null])).toEqual([
      [ANNUAL, 'year', [1, 3], ['primary'], null],
      [ANNUAL, 'year', [2], ['primary', 'backup'], { needed: 2, paid: '2', idle: 0, sharedSeats: [] }],
      [MONTHLY, 'month', [2], ['primary', 'backup'], { needed: 2, paid: '2', idle: 0, sharedSeats: [] }]
    ])

    expect(rows(withIdle()).find(a => a.periodIds.includes(1))).toMatchObject({
      quantity: '2',
      consumerCount: 1,
      seats: { needed: 1, paid: '2', idle: 1, sharedSeats: [] },
      idle: { seats: 1, reason: idle.idleReason, attributedMonthlyCost: ANNUAL_USD.div(12).toString() }
    })
    expect(rows(withSharing()).find(a => a.periodIds.includes(2))).toMatchObject({
      quantity: '1',
      consumerCount: 2,
      seats: { needed: 1, paid: '1', idle: 0, sharedSeats: [{ people: 2, reason: 'They answer in shifts.' }] }
    })
    // A row of a period that declares none of it has none of the keys.
    expect(Object.keys(rows(withSharing()).find(a => a.periodIds.includes(1))!)).not.toContain('seats')
  })

  it('estimate exposure: each holding is an input of its own, and together they carry the cost of the tool', () => {
    const artifact = mixed()
    const result = artifact.semantic.result
    const inputs = estimateExposure(result)!.costInputs.filter(i => i.id === INBOX)

    expect(inputs.map(i => [i.priceId, i.billing, i.periodIds, i.lineIds])).toEqual([
      [ANNUAL, 'year', [1, 2, 3], ['primary', 'backup']],
      [MONTHLY, 'month', [2], ['primary', 'backup']]
    ])
    // A twelfth of the year in each of three months, and one month of the monthly seat, at the frozen FX. The
    // kernel rounds a row once, so each input is within a unit per row of the exact amount.
    expect(new D(inputs[0].costAtRisk).minus(ANNUAL_USD.div(12).mul(3).mul(FX)).abs().lte(4)).toBe(true)
    expect(new D(inputs[1].costAtRisk).minus(MONTHLY_USD.mul(FX)).abs().lte(2)).toBe(true)
  })

  it('commitments: an idle paid seat is committed and covered by no use, inside the cost of the quote', () => {
    const artifact = withIdle()
    const reading = commitmentExposure(artifact)
    const entry = reading.commitments.find(c => c.kind === 'idle_seat')
    const idleUsd = ANNUAL_USD.div(12).mul(2)

    if (entry?.kind !== 'idle_seat') throw new Error('expected an idle seat entry')

    expect(entry).toMatchObject({
      toolId: INBOX,
      priceId: ANNUAL,
      periodIds: [1, 3],
      seats: {
        unit: 'year',
        byPeriod: [
          { periodId: 1, paid: '2', idle: 1 },
          { periodId: 3, paid: '2', idle: 1 }
        ],
        idleSeatMonths: 2,
        reasons: [idle.idleReason]
      },
      committed: { inToolCurrency: idleUsd.toFixed(2), inQuoteCurrency: idleUsd.mul(FX).toFixed(0) },
      coveredByUse: { inToolCurrency: '0.00', inQuoteCurrency: '0' },
      carriedBy: { basis: 'lines_that_use_the_tool' },
      incrementalCash: null
    })
    expect(reading.signals.filter(s => s.code === 'PAID_SEAT_IDLE_WITHIN_ENGAGEMENT')).toEqual([
      expect.objectContaining({ toolId: INBOX, periodIds: [1, 3], amount: idleUsd.mul(FX).toFixed(0), currency: 'COP' })
    ])
    expect(reading.totals.idleSeats).toEqual({
      count: 1,
      idleSeatMonths: 2,
      committed: idleUsd.mul(FX).toFixed(0),
      coveredByUse: '0'
    })
    expect(reading.reviewed.holdingsWithIdleSeats).toBe(1)
    // It is the idle part of what the kernel stored for the holding, so it is inside the cost of the quote.
    expect(new D(entry.committed.inQuoteCurrency!).lt(artifact.semantic.result.quote.totals!.cost)).toBe(true)

    // The year that outlives the three quoted months is its own entry, read as it always was.
    const annual = reading.commitments.find(c => c.kind === 'annual_price')

    expect(annual).toMatchObject({ toolId: INBOX, commitment: { monthsBeyondQuote: 9, quantity: '2' } })

    // A quote that declares no seat idle has no such entry, signal, total or count.
    const plain = commitmentExposure(mixed())

    expect(plain.commitments.map(c => c.kind)).not.toContain('idle_seat')
    expect(plain.signals.map(s => s.code)).not.toContain('PAID_SEAT_IDLE_WITHIN_ENGAGEMENT')
    expect('idleSeats' in plain.totals).toBe(false)
    expect('holdingsWithIdleSeats' in plain.reviewed).toBe(false)
  })

  it('commitments: names the lines the demand makes bear a seat nobody uses', () => {
    const d = demandOver(3, [2], [seat([2], ANNUAL, 1), seat([1, 3], ANNUAL, 1, { ...idle, bornByLineIds: ['lead'] })])

    d.work.find(w => w.lineId === 'primary')!.tasks = []

    const entry = commitmentExposure(freeze(d)).commitments.find(c => c.kind === 'idle_seat')

    expect(entry).toMatchObject({
      periodIds: [1, 3],
      carriedBy: { basis: 'lines_named_by_the_demand', lineIds: ['lead'] },
      committed: { inQuoteCurrency: ANNUAL_USD.div(12).mul(2).mul(FX).toFixed(0) }
    })
  })

  it('commitments: reads each holding with the allocation of its own price, declared once for its periods', () => {
    const reading = commitmentExposure(mixed())
    const annual = reading.commitments.filter(c => c.kind === 'annual_price')

    // The annual seat is used in the three quoted months of its year; the monthly one leaves nothing behind.
    expect(annual).toHaveLength(1)
    expect(annual[0]).toMatchObject({
      toolId: INBOX,
      priceId: ANNUAL,
      resourceId: `composed:${INBOX}:${ANNUAL}`,
      periodIds: [1, 2, 3],
      commitment: { monthsCommitted: 12, monthsWithinQuote: 3, monthsBeyondQuote: 9, quantity: '1' },
      committed: { inQuoteCurrency: ANNUAL_USD.mul(FX).toFixed(0) },
      sharing: { basis: 'sole_declared_user', quoteShare: '1' }
    })
    expect(reading.reviewed.annualPriceUses).toBe(1)
  })

  it('split, cash and explain: both holdings are tools of the quote, by what each is bought as', () => {
    const artifact = mixed()
    const result = artifact.semantic.result
    const split = splitQuotedPrice(result, artifact, { tools: [INBOX] })
    const inMonthTwo = split.rows.filter(row => row.periodId === 2).flatMap(row => row.tools.components)

    expect(split.tools.toolIds).toEqual([INBOX])
    expect(inMonthTwo.map(c => c.componentId)).toEqual([
      `composed-${INBOX}-${ANNUAL}-0`,
      `composed-${INBOX}-${MONTHLY}-0`,
      `composed-${INBOX}-${ANNUAL}-1`,
      `composed-${INBOX}-${MONTHLY}-1`
    ])
    // The kit of the term is the tool as the kernel costed it: three twelfths of the year and one month.
    expect(new D(split.totals.tools.cost).minus(ANNUAL_USD.div(12).mul(3).plus(MONTHLY_USD).mul(FX)).abs().lte(4)).toBe(
      true
    )
    // In every row and period the two parts are the row.
    for (const row of split.rows) expect(new D(row.tools.net).plus(row.person.net).eq(row.net)).toBe(true)

    const cash = readEngagementCash(result, artifact)

    if (!cash.ok) throw new Error('expected a cash reading')

    const everyTool = splitQuotedPrice(result, artifact, { tools: 'all' })

    // Seats and packages of the cash reading are the same components the split reads as tools.
    expect(cash.reading.supplierCash.attributedNotNewCash.toolSeatsAndPackages).toBe(everyTool.totals.tools.cost)
    expect(cash.reading.modeledCommitment.ledger.filter(c => c.key.startsWith(`composed:${INBOX}`))).toEqual([
      expect.objectContaining({ periodId: 1, key: expect.stringContaining(`:${ANNUAL}:`) })
    ])

    const explained = explainResourceComposition(clone(artifact))
    const label = policy.tools.find(t => t.toolId === INBOX)!.label

    const backupInMonthTwo = explained.costBreakdown
      .find(e => e.periodId === 2 && e.lineId === 'backup')!
      .resources.filter(r => r.label.startsWith(label))

    expect(backupInMonthTwo.map(r => [r.label, r.allocatedCostBeforeLineRounding])).toEqual([
      [`${label} (${ANNUAL})`, ANNUAL_USD.div(12).div(2).toString()],
      [`${label} (${MONTHLY})`, MONTHLY_USD.div(2).toString()]
    ])
    expect(explained.attributions.filter(a => a.toolId === INBOX && a.periodId === 2)).toHaveLength(2)
  })

  it('price notices: every price the quote holds a tool under is a price it used', () => {
    const artifact = mixed()
    const notices = quotePriceNotices(artifact, artifact.semantic.policy, artifact.semantic.demand.brief.quoteDate)

    expect(notices.pricesUsed).toContain(`${INBOX}:${ANNUAL}`)
    expect(notices.pricesUsed).toContain(`${INBOX}:${MONTHLY}`)
    expect(notices.notInPolicy).toEqual([])
  })

  it('readiness: a declared idle seat and a declared shared seat are each a gap somebody owns, once per period', () => {
    // A gap names the tool once and the periods it is raised in.
    const gaps = (artifact: ReturnType<typeof freeze>, code: string) =>
      assessCompositionReadiness(artifact.semantic.result)
        .gaps.filter(g => g.code === code)
        .map(g => [g.path, g.owner, g.periodIds])

    expect(gaps(withIdle(), 'IDLE_SEAT_COST_REVIEW')).toEqual([[`tools.${INBOX}`, 'Operations/Commercial', [1, 3]]])
    expect(gaps(withSharing(), 'SHARED_SEAT_TERMS_REVIEW')).toEqual([[`tools.${INBOX}`, 'Operations/Legal', [2]]])
    // Neither is raised for a quote that declares neither, several holdings or not.
    expect(gaps(mixed(), 'IDLE_SEAT_COST_REVIEW')).toEqual([])
    expect(gaps(mixed(), 'SHARED_SEAT_TERMS_REVIEW')).toEqual([])
    expect(gaps(withIdle(), 'SHARED_SEAT_TERMS_REVIEW')).toEqual([])
    // Access is still to be verified for the tool in each period, whatever it is held as: once per period, and
    // never once per holding.
    expect(
      gaps(mixed(), 'RESOURCE_ACCESS_AND_CAPACITY_REQUIRED').filter(([path]) => path === `tools.${INBOX}`)
    ).toEqual([[`tools.${INBOX}`, 'Operations', [1, 2, 3]]])
  })
})
