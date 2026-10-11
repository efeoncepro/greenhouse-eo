// Engagement view: two readings of a frozen composed quote (resources/engagement-view.ts).
//
//   - payment schedule: the quoted net as amounts due at the milestones the caller declares;
//   - engagement cash: the quoted net next to its full cost and to the new cash it makes the company pay suppliers.
//
// Both derive from the frozen result and recalculate no price, so their verifiers are the frozen results themselves
// and the composition: every expectation below is read from what the kernel and the credit planner froze (totals,
// rows, components, credit budgets, cash ledger, FX records), or from a second quote composed by
// `composeResourceQuote` with one input changed. Nothing asserts the text of the module, and no expected amount
// comes from a previous run of either reader.
//
// Everything is read from the committed artifacts or built in memory from their frozen inputs; nothing is written
// under data/.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { COMPOSITION_VERSION, replayResourceComposition } from '../adapters/resource-composition'
import { composeResourceQuote } from '../resources/composition'
import {
  ENGAGEMENT_CASH_VERSION,
  PAYMENT_SCHEDULE_VERSION,
  presentPaymentSchedule,
  readEngagementCash
} from '../resources/engagement-view'
import type { PaymentMilestone } from '../resources/engagement-view'
import { linesBelowPolicyFloor } from '../resources/summary'

type Composition = ReturnType<typeof composeResourceQuote>
type Artifact = ReturnType<typeof replayResourceComposition>

const D = Decimal.clone({ precision: 120 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const root = resolve('.')

const CRM = 'data/pricing/v3-operating/crm-client-tools.artifact.json'
const DESIGNER = 'data/pricing/v3-operating/designer.artifact.json'
const COLOMBIA = 'data/pricing/v3-operating/managed-care-colombia.artifact.json'
const SKY_AGREED_NET = 'docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json'

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
  })

// Every committed composition artifact, plus the agreed-net quote kept with its prospect (read only).
const corpus = [...walk(resolve(root, 'data/pricing')).map(path => relative(root, path)), SKY_AGREED_NET]
  .filter(path => read(path).artifactVersion === COMPOSITION_VERSION)
  .sort()

const artifacts = new Map<string, Artifact>()

/** Every artifact enters through the same replay check the CLI applies. */
const frozen = (path: string) => {
  const artifact = artifacts.get(path) ?? replayResourceComposition(read(path))

  artifacts.set(path, artifact)

  return artifact
}

const IDENTITY = { calculationId: 'composition-under-test', replayDigest: 'digest-under-test' }
const sum = (values: (string | Decimal)[]) => values.reduce<Decimal>((total, value) => total.plus(value), new D(0))
const scaleOf = (money: string) => money.split('.')[1]?.length ?? 0
const unitOf = (money: string) => new D(10).pow(-scaleOf(money))

const inputOf = (result: Composition, periodId: number) =>
  result.quote.resolution.inputs.find(i => i.periodId === periodId)!.input

/** Rounding multiple the quote was frozen with, read from the kernel input of its first period. */
const multipleOf = (result: Composition) => {
  const snapshot = inputOf(result, result.quote.periods[0].periodId).snapshot

  return 'priceRounding' in snapshot && snapshot.priceRounding ? new D(snapshot.priceRounding.multiple) : null
}

const milestones = (shares: string[], extra: Partial<PaymentMilestone>[] = []): PaymentMilestone[] =>
  shares.map((share, index) => ({ id: `m${index + 1}`, label: `Milestone ${index + 1}`, share, ...extra[index] }))

const schedule = (result: Composition, list: unknown) =>
  presentPaymentSchedule(result, IDENTITY, list as PaymentMilestone[])

const accepted = (result: Composition, list: PaymentMilestone[]) => {
  const outcome = schedule(result, list)

  if (!outcome.ok) throw new Error(`schedule rejected: ${JSON.stringify(outcome.issues)}`)

  return outcome.reading
}

const cash = (result: Composition) => {
  const outcome = readEngagementCash(result, IDENTITY)

  if (!outcome.ok) throw new Error(`cash reading rejected: ${outcome.code}`)

  return outcome.reading
}

/** A composition from the frozen inputs of an artifact with its demand edited where an operator would edit it. */
const recompose = (path: string, edit: (demand: Artifact['semantic']['demand']) => void) => {
  const { catalog, policy, credits, demand } = frozen(path).semantic
  const edited = clone(demand)

  edit(edited)

  return composeResourceQuote(catalog, policy, credits, edited)
}

const calculated = (result: Composition) => {
  expect(result.quote.calculationStatus).toBe('calculated')

  return result
}

/** Three periods of the Colombia service: several lines, an annual seat and a rounding multiple. */
const threePeriods = () =>
  calculated(
    recompose(COLOMBIA, demand => {
      const one = demand.allocations

      demand.brief.periods = 3
      demand.allocations = [1, 2, 3].flatMap(periodId => one.map(a => ({ ...a, periodId })))
    })
  )

const SHARE_SETS: { name: string; shares: string[] }[] = [
  { name: '50/50', shares: ['0.5', '0.5'] },
  { name: '50/30/20', shares: ['0.5', '0.3', '0.2'] },
  { name: 'thirds, six decimals', shares: ['0.333333', '0.333333', '0.333334'] },
  {
    name: 'thirds, eighteen decimals',
    shares: ['0.333333333333333333', '0.333333333333333333', '0.333333333333333334']
  },
  { name: 'a single milestone', shares: ['1'] }
]

/** What a schedule has to hold for any quote and any valid list of shares. */
const expectSchedule = (result: Composition, shares: string[]) => {
  const totals = result.quote.totals!
  const s = accepted(result, milestones(shares))
  const net = new D(totals.net)
  const multiple = multipleOf(result)
  const step = multiple ?? unitOf(totals.net)
  const last = s.milestones.length - 1

  // The frozen totals, untouched, and the amounts add up to the net to the unit.
  expect(s.totals).toEqual({ net: totals.net, tax: totals.tax, grandTotal: totals.grandTotal })
  expect(sum(s.milestones.map(m => m.amount)).eq(net)).toBe(true)
  expect(s.milestones.map(m => m.share)).toEqual(shares)
  expect(s.rounding.multiple).toBe(multiple ? multiple.toString() : null)

  for (const [index, m] of s.milestones.entries()) {
    const own = net.mul(shares[index])

    expect(new D(m.amount).gt(0)).toBe(true)
    // Same scale as the net the kernel formatted.
    expect(scaleOf(m.amount)).toBe(scaleOf(totals.net))
    expect(m.takesRemainder).toBe(index === last)

    if (index === last) continue

    // Its own share of the net, at the multiple of the quote (or the currency unit): never further than half a step.
    expect(new D(m.amount).mod(step).isZero()).toBe(true)
    expect(new D(m.amount).minus(own).abs().lte(step.div(2))).toBe(true)
  }

  // The last milestone is what is left, and the output says how far that is from its own share.
  expect(s.remainder.milestoneId).toBe(s.milestones[last].id)
  expect(new D(s.remainder.absorbed).eq(new D(s.milestones[last].amount).minus(net.mul(shares[last])))).toBe(true)

  return s
}

describe('the committed corpus covers the cases the readings have to hold in', () => {
  // Premises read from the frozen files. If the corpus changes shape, this says which case lost its example.
  it('finds quotes with and without a rounding multiple, with credit top-ups and with an annual seat', () => {
    expect(corpus).toEqual(expect.arrayContaining([CRM, DESIGNER, COLOMBIA, SKY_AGREED_NET]))

    const facts = new Map(
      corpus.map(path => {
        const result = frozen(path).semantic.result

        return [
          path,
          {
            multiple: multipleOf(result)?.toString() ?? null,
            topUps: result.resourceIncrementalCash.length,
            tools: result.attributions.length,
            annual: result.attributions.some(a => a.resource.unit === 'year'),
            periods: result.quote.periods.length,
            tax: result.quote.totals!.tax
          }
        ] as const
      })
    )

    expect(facts.get(COLOMBIA)).toMatchObject({ multiple: '50000', annual: true, topUps: 0 })
    expect(facts.get(SKY_AGREED_NET)).toMatchObject({ multiple: '10000', annual: true })
    expect(facts.get(DESIGNER)).toMatchObject({ multiple: null, topUps: 2 })
    expect(facts.get(CRM)).toMatchObject({ multiple: null, topUps: 0 })
    expect([...facts.values()].every(f => f.tools > 0)).toBe(true)
    // No committed quote spans several periods or resolves tax: both cases are composed in memory below.
    expect([...facts.values()].every(f => f.periods === 1 && f.tax === null)).toBe(true)
  })
})

describe('payment schedule: the milestones are the quoted net, to the unit', () => {
  for (const { name, shares } of SHARE_SETS)
    it.each(corpus)(`%s: ${name}`, path => {
      expectSchedule(frozen(path).semantic.result, shares)
    })

  it('reads the frozen result without touching it, and identifies the artifact it read', () => {
    const artifact = frozen(COLOMBIA)
    const before = JSON.stringify(artifact)
    const outcome = presentPaymentSchedule(artifact.semantic.result, artifact, milestones(['0.5', '0.3', '0.2']))

    expect(JSON.stringify(artifact)).toBe(before)
    expect(outcome.ok && outcome.reading).toMatchObject({
      schemaVersion: PAYMENT_SCHEDULE_VERSION,
      binding: false,
      calculationId: artifact.calculationId,
      replayDigest: artifact.replayDigest,
      currency: artifact.semantic.result.quote.totals!.currency
    })
  })

  it('carries the timing the caller declared and nothing else', () => {
    const result = frozen(COLOMBIA).semantic.result

    const s = accepted(
      result,
      milestones(['0.5', '0.5'], [{ when: 'On acceptance' }, { periodId: result.quote.periods[0].periodId }])
    )

    expect(s.milestones[0]).toMatchObject({ when: 'On acceptance' })
    expect(s.milestones[0]).not.toHaveProperty('periodId')
    expect(s.milestones[1]).toMatchObject({ periodId: result.quote.periods[0].periodId })
    expect(s.milestones[1]).not.toHaveProperty('when')
  })

  it('distributes the net of every period of a quote that spans several', () => {
    const result = threePeriods()
    const totals = result.quote.totals!

    expect(result.quote.periods).toHaveLength(3)
    // The net being distributed is the whole quote, not one period.
    expect(sum(result.quote.periods.map(p => p.result.totals!.net)).eq(totals.net)).toBe(true)
    expect(new D(totals.net).gt(result.quote.periods[0].result.totals!.net)).toBe(true)

    for (const { shares } of SHARE_SETS) expectSchedule(result, shares)

    const placed = accepted(
      result,
      milestones(['0.5', '0.3', '0.2'], [{ periodId: 1 }, { periodId: 2 }, { periodId: 3 }])
    )

    expect(placed.milestones.map(m => m.periodId)).toEqual([1, 2, 3])
  })
})

describe('payment schedule: rounding follows the rule the quote was frozen with', () => {
  it('every milestone but the last is a multiple, and the last absorbs the remainder', () => {
    const result = frozen(COLOMBIA).semantic.result
    const multiple = multipleOf(result)!
    const net = new D(result.quote.totals!.net)
    // Shares whose own amounts are not multiples: 37 %, 41 % and 22 % of the net.
    const shares = ['0.37', '0.41', '0.22']

    expect(multiple.toString()).toBe('50000')
    for (const share of shares) expect(net.mul(share).mod(multiple).isZero()).toBe(false)

    const s = expectSchedule(result, shares)

    for (const [index, share] of shares.slice(0, -1).entries()) {
      // Nearest multiple of the frozen rule, computed here from the frozen net.
      const nearest = net.mul(share).div(multiple).toDecimalPlaces(0, D.ROUND_HALF_UP).mul(multiple)

      expect(s.milestones[index].amount).toBe(nearest.toFixed(0))
    }

    const before = sum(s.milestones.slice(0, -1).map(m => m.amount))

    expect(s.milestones[2].amount).toBe(net.minus(before).toFixed(0))
    // The rounding of the first two did move money to the last one.
    expect(new D(s.remainder.absorbed).isZero()).toBe(false)
    expect(new D(s.remainder.absorbed).eq(net.mul('0.78').minus(before))).toBe(true)
  })

  it('a net that is not a multiple leaves its odd part in the last milestone', () => {
    // A discount moves the net off the multiple; the rounding rule of the quote stays in force.
    const result = calculated(
      recompose(COLOMBIA, demand => {
        demand.brief.adjustments = [
          {
            adjustmentId: 'discount-under-test',
            kind: 'discount',
            rate: '0.0333',
            lineIds: demand.brief.lines.map(l => l.lineId),
            reason: 'Discount declared only to move the net off the rounding multiple.'
          }
        ]
      })
    )

    const multiple = multipleOf(result)!
    const net = new D(result.quote.totals!.net)

    expect(net.mod(multiple).isZero()).toBe(false)

    for (const { shares } of SHARE_SETS.filter(set => set.shares.length > 1)) {
      const s = expectSchedule(result, shares)
      const last = s.milestones[s.milestones.length - 1]

      expect(new D(last.amount).mod(multiple).eq(net.mod(multiple))).toBe(true)
    }
  })

  it('without a rounding rule it reads at the currency unit, half up', () => {
    const result = frozen(DESIGNER).semantic.result
    const net = new D(result.quote.totals!.net)
    const unit = unitOf(result.quote.totals!.net)

    expect(multipleOf(result)).toBeNull()
    // Half of this net falls exactly between two units: the case that tells half up from any other direction.
    expect(net.div(2).mod(unit).eq(unit.div(2))).toBe(true)

    const s = expectSchedule(result, ['0.5', '0.5'])

    expect(new D(s.milestones[0].amount).eq(net.div(2).plus(unit.div(2)))).toBe(true)
    expect(new D(s.milestones[1].amount).eq(net.div(2).minus(unit.div(2)))).toBe(true)
    expect(s.rounding).toMatchObject({ multiple: null, unit: unit.toString() })
  })
})

describe('payment schedule: tax is carried only when the quote resolved it', () => {
  const withTax = (taxTreatment: Artifact['semantic']['demand']['brief']['taxTreatment']) =>
    calculated(
      recompose(DESIGNER, demand => {
        demand.brief.taxTreatment = taxTreatment
      })
    )

  it.each(corpus)('%s: an unresolved tax stays unresolved in every milestone', path => {
    const result = frozen(path).semantic.result

    expect(result.quote.totals!.tax).toBeNull()

    const s = accepted(result, milestones(['0.5', '0.3', '0.2']))

    expect(s.taxTreatment).toEqual({ kind: 'not_resolved' })
    expect(s.milestones.every(m => m.tax === null && m.total === null)).toBe(true)
  })

  it('a resolved tax adds up to the tax of the quote, milestone by milestone', () => {
    const asOf = frozen(DESIGNER).semantic.demand.brief.quoteDate

    const result = withTax({
      kind: 'exclusive',
      rate: '0.19',
      policyRef: 'tax-policy-under-test',
      source: { reference: 'test:tax-policy', effectiveFrom: asOf, effectiveUntil: asOf, status: 'confirmed' }
    })

    const totals = result.quote.totals!

    // The premise: the kernel resolved a tax and a grand total for this quote.
    expect(new D(totals.tax!).gt(0)).toBe(true)
    expect(new D(totals.grandTotal!).eq(new D(totals.net).plus(totals.tax!))).toBe(true)

    for (const { shares } of SHARE_SETS) {
      const s = expectSchedule(result, shares)

      expect(s.taxTreatment).toMatchObject({ kind: 'exclusive', rate: '0.19' })
      expect(sum(s.milestones.map(m => m.tax!)).eq(totals.tax!)).toBe(true)
      expect(sum(s.milestones.map(m => m.total!)).eq(totals.grandTotal!)).toBe(true)

      for (const m of s.milestones) {
        expect(new D(m.tax!).gte(0)).toBe(true)
        expect(new D(m.total!).eq(new D(m.amount).plus(m.tax!))).toBe(true)
        // In proportion to the amount of the milestone, to the unit of the currency.
        expect(
          new D(m.tax!).minus(new D(totals.tax!).mul(m.amount).div(totals.net)).abs().lte(unitOf(totals.net))
        ).toBe(true)
      }
    }
  })

  it('a quote where tax does not apply carries a tax of zero, not an unknown', () => {
    const result = withTax({ kind: 'not_applicable', reason: 'Export of services, declared for the test.' })
    const totals = result.quote.totals!

    expect(new D(totals.tax!).isZero()).toBe(true)

    const s = accepted(result, milestones(['0.5', '0.5']))

    expect(s.milestones.every(m => m.tax !== null && new D(m.tax).isZero() && m.total === m.amount)).toBe(true)
  })
})

describe('payment schedule: what it rejects', () => {
  const result = () => frozen(COLOMBIA).semantic.result

  const rules = (list: unknown) => {
    const outcome = schedule(result(), list)

    expect(outcome.ok).toBe(false)
    // A rejection carries no reading at all: there is no partial calendar to present.
    expect(outcome).not.toHaveProperty('reading')

    return outcome.ok ? [] : [outcome.code, ...outcome.issues.map(issue => `${issue.path}:${issue.rule}`)]
  }

  it('an empty list', () => {
    expect(rules([])).toEqual(['SCHEDULE_MILESTONES_INVALID', 'milestones:empty'])
    expect(rules(undefined)).toEqual(['SCHEDULE_MILESTONES_INVALID', 'milestones:empty'])
  })

  it('shares that do not add up to exactly 1, short or over, by any amount', () => {
    const invalid = [
      ['0.5', '0.3', '0.1'],
      ['0.5', '0.3', '0.21'],
      // One third three times: 0.999999999999999999, which a float would call 1.
      ['0.333333333333333333', '0.333333333333333333', '0.333333333333333333'],
      ['0.999999999999999999'],
      ['0.5', '0.500000000000000001']
    ]

    for (const shares of invalid) {
      expect(sum(shares).eq(1)).toBe(false)
      expect(rules(milestones(shares))).toEqual(['SCHEDULE_MILESTONES_INVALID', 'milestones:shares_must_sum_to_one'])
    }
  })

  it('a share that is not positive, even when the list adds up to 1', () => {
    expect(rules(milestones(['0.5', '0.5', '0']))).toEqual([
      'SCHEDULE_MILESTONES_INVALID',
      'milestones.2.share:share_not_positive'
    ])
    expect(rules(milestones(['0.7', '0.5', '-0.2']))).toEqual([
      'SCHEDULE_MILESTONES_INVALID',
      'milestones.2.share:share_not_positive'
    ])
  })

  it('a share that is not a decimal string', () => {
    for (const share of [0.5, '50%', '1/2', '', '0,5', '5e-1', null])
      expect(rules([{ id: 'a', label: 'A', share }, ...milestones(['0.5'])])).toEqual([
        'SCHEDULE_MILESTONES_INVALID',
        'milestones.0.share:share_not_decimal'
      ])
  })

  it('duplicate ids', () => {
    const list = milestones(['0.5', '0.3', '0.2'])

    list[2].id = list[0].id
    expect(rules(list)).toEqual(['SCHEDULE_MILESTONES_INVALID', 'milestones.2.id:duplicate_id'])
  })

  it('a milestone without an id or a label, placed in a period the quote does not have, or timed twice', () => {
    const base = milestones(['0.5', '0.5'])

    expect(rules([{ ...base[0], id: ' ' }, base[1]])).toContain('milestones.0.id:invalid_id')
    expect(rules([{ ...base[0], label: '' }, base[1]])).toContain('milestones.0.label:invalid_label')
    expect(rules([{ ...base[0], periodId: 2 }, base[1]])).toContain('milestones.0.periodId:unknown_period')
    expect(rules([{ ...base[0], periodId: 1, when: 'On acceptance' }, base[1]])).toContain(
      'milestones.0:period_and_when'
    )
    expect(rules([{ ...base[0], amount: '1000' }, base[1]])).toContain('milestones.0:unknown_field')
    expect(rules(['0.5', '0.5'])).toContain('milestones.0:not_an_object')
  })

  it('a share too small for the rounding multiple of the quote, instead of a payment of zero', () => {
    const multiple = multipleOf(result())!
    const net = new D(result().quote.totals!.net)

    // Its own amount is under half a multiple: at this rule it would be presented as nothing.
    expect(net.mul('0.0005').lt(multiple.div(2))).toBe(true)
    expect(rules(milestones(['0.0005', '0.9995']))).toEqual([
      'SCHEDULE_MILESTONES_INVALID',
      'milestones.0.share:amount_not_representable'
    ])
  })

  it('a quote that is not calculated', () => {
    const blocked = recompose(COLOMBIA, demand => {
      demand.allocations = []
    })

    expect(blocked.quote.calculationStatus).toBe('needs_input')
    expect(blocked.quote.totals).toBeNull()
    expect(schedule(blocked, milestones(['0.5', '0.5']))).toEqual({
      ok: false,
      code: 'SCHEDULE_REQUIRES_CALCULATED_QUOTE',
      issues: []
    })
    expect(readEngagementCash(blocked, IDENTITY)).toEqual({
      ok: false,
      code: 'ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE',
      issues: []
    })
  })
})

// ---------------------------------------------------------------------------------------------------------------
// Engagement cash
// ---------------------------------------------------------------------------------------------------------------

type KernelRow = Composition['quote']['periods'][number]['result']['lines'][number]

const rowsOf = (result: Composition, periodId?: number) =>
  result.quote.periods.filter(p => periodId === undefined || p.periodId === periodId).flatMap(p => p.result.lines)

/** Cost the kernel stored for the components of some kinds, in the quote currency, before any rounding. */
const storedCost = (rows: KernelRow[], kinds: string[]) =>
  rows
    .flatMap(row => row.components)
    .filter(component => kinds.includes(component.kind))
    .reduce((total, component) => total.plus(new D(component.cost).mul(component.trace.outputFx ?? 1)), new D(0))

/** A frozen FX record of the period, or 1 for the same currency. The kernel reads a pair the same way. */
const frozenRate = (result: Composition, periodId: number, from: string, to: string) =>
  from === to ? new D(1) : new D(inputOf(result, periodId).snapshot.fx.find(f => f.from === from && f.to === to)!.rate)

const toQuoteCurrency = (result: Composition, periodId: number, amount: string, currency: string) => {
  const { snapshot, request } = inputOf(result, periodId)

  return new D(amount)
    .mul(frozenRate(result, periodId, currency, snapshot.calculationCurrency))
    .mul(frozenRate(result, periodId, snapshot.calculationCurrency, request.outputCurrency))
}

/** Cash of the extra packs each credit budget planned to buy, read pack by pack from the frozen budget. */
const packsBought = (result: Composition, periodId?: number) =>
  result.creditBudgets
    .filter(b => (periodId === undefined || b.periodId === periodId) && b.result.breakdown)
    .map(b => ({
      periodId: b.periodId,
      toolId: b.toolId,
      currency: b.result.breakdown!.currency,
      cash: sum(b.result.breakdown!.extra.packages.map(pack => new D(pack.priceEach).mul(pack.quantity)))
    }))

/** Rows of re-invoiced third-party costs (contract 1.4.0); none in a quote of an earlier contract. */
const thirdPartyRowsOf = (result: Composition, periodId?: number) =>
  rowsOf(result, periodId).filter(row => row.kind === 'third_party')

/** Whether the quote selected a contingency reserve (contract 1.4.0), waived or not: its inputs say so. */
const selectedReserve = (result: Composition) =>
  result.quote.resolution.inputs.some(
    ({ input }) => 'contingencyReserve' in input.snapshot && Boolean(input.snapshot.contingencyReserve)
  )

/** The reserve the kernel states for each row, inside its cost; zero where the row has none. */
const statedReserve = (rows: KernelRow[]) =>
  sum(rows.map(row => ('contingencyReserve' in row ? row.contingencyReserve : '0')))

/**
 * The cash ledger of a period by what each entry is, read from the frozen rows and never from a list of names: the
 * entry of the team, one entry per third-party row (named after its cost) and the years of year-priced resources.
 */
const ledgerOf = (result: Composition, periodId: number) => {
  const entries = result.quote.cashLedger.filter(entry => entry.periodId === periodId)
  const supplierKeys = new Set(thirdPartyRowsOf(result, periodId).map(row => `third-party:${row.parentLineId}`))

  return {
    entries,
    team: entries.filter(entry => entry.key === 'human-monthly-and-once'),
    thirdParty: entries.filter(entry => supplierKeys.has(entry.key)),
    annual: entries.filter(entry => entry.key !== 'human-monthly-and-once' && !supplierKeys.has(entry.key))
  }
}

/** What the cash reading has to hold for any calculated quote. */
const expectCash = (result: Composition) => {
  const totals = result.quote.totals!
  const c = cash(result)
  const unit = unitOf(totals.net)
  const suppliers = thirdPartyRowsOf(result).length > 0

  // The natures of a quote: the six every contract has, and one more for each thing of contract 1.4.0 it holds.
  const natureKeys = [
    'people',
    'provisions',
    'platformFee',
    'setup',
    'toolCreditBudgets',
    'toolSeatsAndPackages',
    ...(suppliers ? ['thirdParty'] : []),
    ...(selectedReserve(result) ? ['contingencyReserve'] : [])
  ]

  // 1. Net, full cost and margin are the frozen ones, in total and in every period.
  expect(c.totals).toMatchObject({
    net: totals.net,
    fullCost: totals.cost,
    marginAtFullCost: totals.marginAmount,
    tax: totals.tax,
    grandTotal: totals.grandTotal
  })
  expect(c.results.marginAtFullCost.amount).toBe(totals.marginAmount)
  expect(new D(c.totals.fullCost).plus(c.totals.marginAtFullCost).eq(c.totals.net)).toBe(true)
  expect(c.periods.map(p => p.periodId)).toEqual(result.quote.periods.map(p => p.periodId))

  for (const period of result.quote.periods) {
    const p = c.periods.find(x => x.periodId === period.periodId)!
    const rows = rowsOf(result, period.periodId)
    // Each nature is read at the unit inside each row, so it can miss the stored cost by a unit per row and nature.
    const slack = unit.mul(rows.length * natureKeys.length)

    expect(p).toMatchObject({
      net: period.result.totals!.net,
      fullCost: period.result.totals!.cost,
      marginAtFullCost: period.result.totals!.marginAmount
    })

    // 2. The natures are the cost of the period, to the unit, and each one is the cost the kernel stored for it.
    expect(Object.keys(p.fullCostByNature)).toEqual(natureKeys)
    expect(sum(Object.values(p.fullCostByNature)).eq(period.result.totals!.cost)).toBe(true)
    expect(new D(p.capacityCostAbsorbed).eq(new D(p.fullCostByNature.people).plus(p.fullCostByNature.provisions))).toBe(
      true
    )

    const stored = {
      people: storedCost(rows, ['human']),
      provisions: storedCost(rows, ['talent_assurance', 'operations']),
      platformFee: storedCost(rows, ['platform_fee']),
      setup: storedCost(rows, ['setup']),
      tools: storedCost(rows, ['tool'])
    }

    // What suppliers charge is the cost of the third-party rows, and the reserve is the one the kernel states row
    // by row: both to the unit, with no slack. Neither is capacity, so neither is in the capacity cost above.
    const supplierCost = sum(thirdPartyRowsOf(result, period.periodId).map(row => row.cost))

    expect(new D(p.fullCostByNature.thirdParty ?? '0').eq(supplierCost)).toBe(true)
    expect(new D(p.fullCostByNature.contingencyReserve ?? '0').eq(statedReserve(rows))).toBe(true)
    expect(p.fullCostByNature).not.toHaveProperty('unclassified')

    expect(new D(p.fullCostByNature.people).minus(stored.people).abs().lte(slack)).toBe(true)
    expect(new D(p.fullCostByNature.provisions).minus(stored.provisions).abs().lte(slack)).toBe(true)
    expect(new D(p.fullCostByNature.platformFee).minus(stored.platformFee).abs().lte(slack)).toBe(true)
    expect(new D(p.fullCostByNature.setup).minus(stored.setup).abs().lte(slack)).toBe(true)
    expect(
      new D(p.fullCostByNature.toolCreditBudgets)
        .plus(p.fullCostByNature.toolSeatsAndPackages)
        .minus(stored.tools)
        .abs()
        .lte(slack)
    ).toBe(true)

    // The credit part of the tools is the budgets the credit planner froze: subscription share plus extra packs.
    const budgets = result.creditBudgets
      .filter(b => b.periodId === period.periodId && b.result.breakdown)
      .reduce(
        (total, b) =>
          total.plus(
            toQuoteCurrency(result, period.periodId, b.result.breakdown!.totalBudgetCost, b.result.breakdown!.currency)
          ),
        new D(0)
      )

    expect(new D(p.fullCostByNature.toolCreditBudgets).minus(budgets).abs().lte(slack)).toBe(true)

    // People are a cost of the job in every period that has people: never zero, never left out.
    expect(new D(p.fullCostByNature.people).gt(0)).toBe(stored.people.gt(0))

    // 3. New supplier cash is the packs the budgets buy plus what the suppliers of re-invoiced costs are paid, and
    // nothing the quote merely attributes.
    const packs = packsBought(result, period.periodId)
    const converted = packs.map(pack => toQuoteCurrency(result, period.periodId, pack.cash.toString(), pack.currency))
    const exact = sum(converted).plus(supplierCost)

    // Read up to the unit pack by pack: never under the exact conversion, never a unit or more per pack over it.
    expect(new D(p.newSupplierCash!).gte(exact)).toBe(true)
    expect(new D(p.newSupplierCash!).minus(exact).lt(unit.mul(Math.max(packs.length, 1)))).toBe(true)
    expect(new D(p.cashAddedOnContractedCapacity!).eq(new D(p.net).minus(p.newSupplierCash!))).toBe(true)

    // 4. The modeled commitment is the ledger of the quote for the period, each entry read as what it is: the team,
    // the years paid up front, and the purchases from suppliers, which are not a year of anything.
    const ledger = ledgerOf(result, period.periodId)

    expect(new D(p.modeledCommitment.total).eq(sum(ledger.entries.map(entry => entry.amount)))).toBe(true)
    expect(new D(p.modeledCommitment.monthlyAndOnce).eq(sum(ledger.team.map(entry => entry.amount)))).toBe(true)
    expect(new D(p.modeledCommitment.annualUpFront).eq(sum(ledger.annual.map(entry => entry.amount)))).toBe(true)
    expect('thirdParty' in p.modeledCommitment).toBe(suppliers)
    expect(new D(p.modeledCommitment.thirdParty ?? '0').eq(sum(ledger.thirdParty.map(entry => entry.amount)))).toBe(
      true
    )
    // What the ledger commits to suppliers is what they charge: the same rows, read twice.
    expect(sum(ledger.thirdParty.map(entry => entry.amount)).eq(supplierCost)).toBe(true)
    expect(
      new D(p.modeledCommitment.monthlyAndOnce)
        .plus(p.modeledCommitment.annualUpFront)
        .plus(p.modeledCommitment.thirdParty ?? '0')
        .eq(p.modeledCommitment.total)
    ).toBe(true)
  }

  // 5. Periods add up to the totals, figure by figure, and the totals to the frozen ones.
  for (const key of natureKeys as (keyof typeof c.totals.fullCostByNature)[])
    expect(sum(c.periods.map(p => p.fullCostByNature[key] ?? '0')).eq(c.totals.fullCostByNature[key] ?? '0')).toBe(true)
  expect(sum(Object.values(c.totals.fullCostByNature)).eq(totals.cost)).toBe(true)
  expect(sum(c.periods.map(p => p.net)).eq(totals.net)).toBe(true)
  expect(sum(c.periods.map(p => p.newSupplierCash!)).eq(c.totals.newSupplierCash!)).toBe(true)
  expect(sum(c.periods.map(p => p.modeledCommitment.total)).eq(totals.cashCommitment)).toBe(true)
  expect(c.modeledCommitment).toEqual({
    total: totals.cashCommitment,
    meaning: result.cashMeaning,
    ledger: result.quote.cashLedger
  })

  // 6. The two results: the frozen margin, and net minus new supplier cash, which is not a margin. New supplier cash
  // is the declared credit packs plus, in a quote that has them, the re-invoiced third-party costs.
  const supplierCostOfQuote = sum(thirdPartyRowsOf(result).map(row => row.cost))

  expect('thirdParty' in c.supplierCash).toBe(suppliers)
  expect(new D(c.supplierCash.thirdParty?.amount ?? '0').eq(supplierCostOfQuote)).toBe(true)
  expect(new D(c.supplierCash.declaredNew.amount!).plus(supplierCostOfQuote).eq(c.totals.newSupplierCash!)).toBe(true)
  if (!suppliers) expect(c.supplierCash.declaredNew.amount).toBe(c.totals.newSupplierCash)
  // A cost the client pays directly is listed as declared and is in no figure: every figure here is reconciled with
  // rows and ledger entries, and it is in none of them.
  expect('paidByClientDirectly' in c.supplierCash).toBe(
    (result.quote.resolution.brief?.thirdPartyCosts ?? []).some(cost => cost.settlement === 'client_direct')
  )
  expect(new D(c.totals.cashAddedOnContractedCapacity!).eq(new D(totals.net).minus(c.totals.newSupplierCash!))).toBe(
    true
  )
  expect(c.results.cashAddedOnContractedCapacity).toMatchObject({
    amount: c.totals.cashAddedOnContractedCapacity,
    isMargin: false,
    decidesPrice: false
  })
  expect(c.results.cashAddedOnContractedCapacity.restsOn.length).toBeGreaterThan(0)
  // The floor verdict is the kernel's, the same one the composition summary reports.
  expect(c.results.marginAtFullCost.floor.rowsBelowFloor).toEqual(
    linesBelowPolicyFloor(result).map(line => ({ periodId: line.periodId, lineId: line.lineId }))
  )

  // 7. One entry per declared purchase, in the currency of its provider, as the composition froze it.
  expect(
    c.supplierCash.declaredNew.purchases.map(x => ({
      periodId: x.periodId,
      toolId: x.toolId,
      amount: x.incrementalCash,
      currency: x.currency
    }))
  ).toEqual(result.resourceIncrementalCash)

  return c
}

describe('engagement cash: the reading reconciles with the totals of the artifact', () => {
  it.each(corpus)('%s', path => {
    expectCash(frozen(path).semantic.result)
  })

  it('reads the frozen result without touching it, and identifies the artifact it read', () => {
    const artifact = frozen(DESIGNER)
    const before = JSON.stringify(artifact)
    const outcome = readEngagementCash(artifact.semantic.result, artifact)

    expect(JSON.stringify(artifact)).toBe(before)
    expect(outcome.ok && outcome.reading).toMatchObject({
      schemaVersion: ENGAGEMENT_CASH_VERSION,
      binding: false,
      calculationId: artifact.calculationId,
      replayDigest: artifact.replayDigest,
      currency: artifact.semantic.result.quote.totals!.currency
    })
  })

  it('holds period by period in a quote that spans several, with the annual seat paid once', () => {
    const result = threePeriods()
    const c = expectCash(result)

    expect(c.periods).toHaveLength(3)
    // The premise: an annual seat whose commitment the ledger places whole on the first period.
    expect(result.quote.cashLedger.filter(e => e.key !== 'human-monthly-and-once').map(e => e.periodId)).toEqual([1])
    expect(new D(c.periods[0].modeledCommitment.annualUpFront).gt(0)).toBe(true)
    expect(c.periods.slice(1).every(p => new D(p.modeledCommitment.annualUpFront).isZero())).toBe(true)
    // The cost of that seat is a twelfth in every period all the same: cost and commitment are different things.
    expect(new Set(c.periods.map(p => p.fullCostByNature.toolSeatsAndPackages)).size).toBe(1)
    expect(new D(c.periods[1].fullCostByNature.toolSeatsAndPackages).gt(0)).toBe(true)
  })
})

describe('engagement cash: attributed cost is not new cash', () => {
  it.each(corpus)('%s: tools the quote attributes without buying a pack add no supplier cash', path => {
    const result = frozen(path).semantic.result
    const c = cash(result)
    const packs = packsBought(result)

    // The premise: the quote does carry cost for its tools and a modeled commitment. Only bought packs are new cash.
    expect(storedCost(rowsOf(result), ['tool']).gt(0)).toBe(true)
    expect(new D(c.modeledCommitment.total).gt(0)).toBe(true)

    // What a supplier of a re-invoiced cost is paid is a purchase for the job, not an attribution: it is new cash.
    const supplierCost = sum(thirdPartyRowsOf(result).map(row => row.cost))

    if (!packs.some(pack => pack.cash.gt(0))) {
      expect(new D(c.totals.newSupplierCash!).eq(supplierCost)).toBe(true)
      expect(new D(c.totals.cashAddedOnContractedCapacity!).eq(new D(c.totals.net).minus(supplierCost))).toBe(true)
    }

    // Seats and packages stay in the cost and out of the new cash, and wherever the quote has them the reading says
    // it cannot tell whether they are bought. It never says anything was collected.
    const figures = c.notDerivable.map(entry => entry.figure)

    expect(figures.includes('supplierCash.toolSeatsAndPackages.newPurchase')).toBe(
      new D(c.totals.fullCostByNature.toolSeatsAndPackages).gt(0)
    )
    expect(figures).toContain('collected')
  })

  it('an annual seat far larger than the net moves the commitment and leaves the cash added at the net', () => {
    const result = frozen(COLOMBIA).semantic.result
    const c = cash(result)

    // The kernel commitment of this quote is above its net, because a whole annual seat falls on the period.
    expect(new D(result.quote.totals!.cashCommitment).gt(result.quote.totals!.net)).toBe(true)
    expect(result.resourceIncrementalCash).toEqual([])
    expect(c.totals.newSupplierCash).toBe('0')
    expect(c.totals.cashAddedOnContractedCapacity).toBe(result.quote.totals!.net)
  })

  it('the share of a subscription already paid is cost of the quote and never supplier cash', () => {
    const result = frozen(DESIGNER).semantic.result
    const c = expectCash(result)

    for (const budget of result.creditBudgets) {
      const breakdown = budget.result.breakdown!
      const purchase = c.supplierCash.declaredNew.purchases.find(x => x.toolId === budget.toolId)!

      // The premise: each budget uses part of a funded subscription and buys extra packs on top.
      expect(new D(breakdown.subscription.attributedCost).gt(0)).toBe(true)
      expect(new D(breakdown.extra.purchaseCost).gt(0)).toBe(true)
      expect(new D(purchase.incrementalCash).eq(breakdown.extra.purchaseCost)).toBe(true)
      expect(new D(purchase.incrementalCash).lt(breakdown.totalBudgetCost)).toBe(true)
      expect(purchase.subscriptionAttributedCost).toBe(breakdown.subscription.attributedCost)
      expect(new D(purchase.subscriptionNewCash!).isZero()).toBe(true)
    }

    // The whole budget is in the cost; only the packs are in the cash.
    expect(new D(c.totals.newSupplierCash!).lt(c.totals.fullCostByNature.toolCreditBudgets)).toBe(true)
  })

  it('demand that fits in the subscription costs the quote and buys nothing', () => {
    const result = calculated(
      recompose(DESIGNER, demand => {
        for (const work of demand.work)
          for (const need of work.creditDemand)
            need.credits = demand.creditBudgets.find(b => b.toolId === need.toolId)!.subscriptionCreditsAllocated
      })
    )

    const c = expectCash(result)

    expect(packsBought(result).every(pack => pack.cash.isZero())).toBe(true)
    expect(result.creditBudgets.every(b => new D(b.result.breakdown!.subscription.attributedCost).gt(0))).toBe(true)
    expect(new D(c.totals.fullCostByNature.toolCreditBudgets).gt(0)).toBe(true)
    expect(new D(c.totals.newSupplierCash!).isZero()).toBe(true)
    expect(c.totals.cashAddedOnContractedCapacity).toBe(result.quote.totals!.net)
  })

  it('more extra credits raise the new cash by the packs bought, converted at the frozen FX', () => {
    const base = frozen(DESIGNER).semantic.result

    const more = calculated(
      recompose(DESIGNER, demand => {
        for (const work of demand.work) for (const need of work.creditDemand) need.credits *= 2
      })
    )

    const before = expectCash(base)
    const after = expectCash(more)

    // The control: the planner really bought more, and one provider bills in a currency that needs the frozen FX.
    const spent = (result: Composition) =>
      sum(packsBought(result).map(pack => toQuoteCurrency(result, pack.periodId, pack.cash.toString(), pack.currency)))

    expect(spent(more).gt(spent(base))).toBe(true)
    expect(packsBought(more).some(pack => pack.currency !== more.quote.totals!.currency)).toBe(true)

    const unit = unitOf(more.quote.totals!.net)
    const rise = new D(after.totals.newSupplierCash!).minus(before.totals.newSupplierCash!)

    expect(
      rise
        .minus(spent(more).minus(spent(base)))
        .abs()
        .lte(unit.mul(packsBought(more).length))
    ).toBe(true)

    for (const purchase of after.supplierCash.declaredNew.purchases) {
      const exact = toQuoteCurrency(more, purchase.periodId, purchase.incrementalCash, purchase.currency)

      // Never under the exact conversion, and under one unit above it.
      expect(new D(purchase.inQuoteCurrency!).gte(exact)).toBe(true)
      expect(new D(purchase.inQuoteCurrency!).minus(exact).lt(unit)).toBe(true)
      expect(purchase.fx!.map(step => `${step.from}>${step.to}`)).toEqual(
        purchase.currency === more.quote.totals!.currency ? [] : [`${purchase.currency}>${more.quote.totals!.currency}`]
      )
    }
  })

  it('a purchase with no frozen FX to the quote currency is listed in its own currency and totals nothing', () => {
    // The composition always freezes the FX it used, so the case is built by taking the record away from a copy.
    const result = clone(frozen(DESIGNER).semantic.result)
    const foreign = result.resourceIncrementalCash.find(c => c.currency !== result.quote.totals!.currency)!
    const snapshot = result.quote.resolution.inputs[0].input.snapshot

    snapshot.fx = snapshot.fx.filter(f => f.from !== foreign.currency)

    const c = cash(result)
    const purchase = c.supplierCash.declaredNew.purchases.find(x => x.toolId === foreign.toolId)!

    expect(purchase).toMatchObject({ incrementalCash: foreign.amount, currency: foreign.currency, fx: null })
    expect(purchase.inQuoteCurrency).toBeNull()
    // No figure is given on a part of the cash: not a total, not a cash-added result.
    expect(c.totals.newSupplierCash).toBeNull()
    expect(c.totals.cashAddedOnContractedCapacity).toBeNull()
    expect(c.results.cashAddedOnContractedCapacity.amount).toBeNull()
    expect(c.periods[0].cashAddedOnContractedCapacity).toBeNull()
    expect(c.notDerivable.some(entry => entry.figure.startsWith('supplierCash.declaredNew'))).toBe(true)
    // The margin at full cost does not depend on it.
    expect(c.results.marginAtFullCost.amount).toBe(result.quote.totals!.marginAmount)
  })
})
