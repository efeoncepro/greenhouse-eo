// Price split: a frozen composed quote presented as a tools kit plus the person (resources/price-split.ts).
//
// The split derives from the frozen result and recalculates no price, so its verifiers are the frozen results
// themselves and the kernel: every expectation below is read from the rows the kernel froze, from a second quote
// composed by `composeResourceQuote` with one input changed, or from the kernel's own diagnostics. Nothing asserts
// the text of the module, and no expected amount comes from a previous run of the split.
//
// Everything is read from the committed artifacts or built in memory from their frozen inputs; nothing is written
// under data/.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

import Decimal from 'decimal.js'
import { afterAll, describe, expect, it } from 'vitest'

import { COMPOSITION_VERSION, replayResourceComposition } from '../adapters/resource-composition'
import { PricingV3Error } from '../errors'
import { composeResourceQuote } from '../resources/composition'
import { PRICE_SPLIT_DEFAULT_LABEL, PRICE_SPLIT_VERSION, splitQuotedPrice } from '../resources/price-split'
import { PRICING_V3_ENGINES } from '../schemas'

type Composition = ReturnType<typeof composeResourceQuote>
type Artifact = ReturnType<typeof replayResourceComposition>
type Split = ReturnType<typeof splitQuotedPrice>
type KernelRow = Composition['quote']['periods'][number]['result']['lines'][number]

const D = Decimal.clone({ precision: 120 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const root = resolve('.')

const DESIGNER = 'data/pricing/v3-operating/designer.artifact.json'
const COLOMBIA = 'data/pricing/v3-operating/managed-care-colombia.artifact.json'
const SKY_AGREED_NET = 'docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json'
const SKY_DISCOUNT = 'docs/commercial/prospects/sky-social-care-2027/pricing/acordado.artifact.json'

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
  })

// Same corpus as the frozen-artifacts guard, narrowed to the lane that attributes tools: compositions.
const corpus = [...walk(resolve(root, 'data/pricing')).map(path => relative(root, path)), SKY_AGREED_NET, SKY_DISCOUNT]
  .filter(path => read(path).artifactVersion === COMPOSITION_VERSION)
  .sort()

const artifacts = new Map<string, Artifact>()

/** Every artifact enters through the same replay check the CLI applies. */
const frozen = (path: string) => {
  const artifact = artifacts.get(path) ?? replayResourceComposition(read(path))

  artifacts.set(path, artifact)

  return artifact
}

const split = (path: string, tools: 'all' | string[], label?: string) =>
  splitQuotedPrice(frozen(path).semantic.result, frozen(path), { tools, ...(label ? { label } : {}) })

const kernelRows = (result: Composition) =>
  result.quote.periods.flatMap(period => period.result.lines.map(row => ({ periodId: period.periodId, row })))

const attributedTools = (result: Composition) => [...new Set(result.attributions.map(a => a.toolId))]
const sum = (values: string[]) => values.reduce((total, value) => total.plus(value), new D(0))
const unitOf = (money: string) => new D(10).pow(-(money.split('.')[1]?.length ?? 0))

const inputOf = (result: Composition, periodId: number) =>
  result.quote.resolution.inputs.find(i => i.periodId === periodId)!.input

const multipleOf = (result: Composition, periodId: number) => {
  const snapshot = inputOf(result, periodId).snapshot

  return 'priceRounding' in snapshot && snapshot.priceRounding ? new D(snapshot.priceRounding.multiple) : null
}

const engineOf = (result: Composition) => result.quote.periods[0].result.engineVersion

/** Price the kernel stored for the tool components of a row, in the output currency. Read by component kind. */
const kernelToolPrice = (row: KernelRow) =>
  row.components
    .filter(component => component.kind === 'tool')
    .reduce((total, component) => total.plus(new D(component.price).mul(component.trace.outputFx ?? 1)), new D(0))

/** The split must hold in every row, period and total, whatever tools were chosen. */
const expectExact = (result: Composition, s: Split) => {
  const rows = kernelRows(result)

  // One split row per kernel row, in the same order, carrying the frozen amounts untouched.
  expect(s.rows.map(r => `${r.periodId}:${r.lineId}`)).toEqual(rows.map(r => `${r.periodId}:${r.row.lineId}`))

  for (const [index, { row }] of rows.entries()) {
    const part = s.rows[index]

    expect(part.net).toBe(row.net)
    expect(part.cost).toBe(row.cost)
    expect(part.marginAmount).toBe(row.marginAmount)
    expect(new D(part.tools.net).plus(part.person.net).eq(row.net)).toBe(true)
    expect(new D(part.tools.cost).plus(part.person.cost).eq(row.cost)).toBe(true)
    expect(new D(part.tools.marginAmount).plus(part.person.marginAmount).eq(row.marginAmount)).toBe(true)

    for (const amount of [part.tools.net, part.person.net, part.tools.cost, part.person.cost]) {
      expect(new D(amount).gte(0)).toBe(true)
      // Same scale as the amount the kernel formatted for that row.
      expect(amount.split('.')[1]?.length ?? 0).toBe(row.net.split('.')[1]?.length ?? 0)
    }
  }

  for (const period of result.quote.periods) {
    const read = s.periods.find(p => p.periodId === period.periodId)!

    expect(read.net).toBe(period.result.totals!.net)
    expect(new D(read.tools.net).plus(read.person.net).eq(period.result.totals!.net)).toBe(true)
    expect(new D(read.tools.cost).plus(read.person.cost).eq(period.result.totals!.cost)).toBe(true)
  }

  const totals = result.quote.totals!

  expect(s.totals.net).toBe(totals.net)
  expect(s.totals.cost).toBe(totals.cost)
  expect(s.totals.marginAmount).toBe(totals.marginAmount)
  expect(s.totals.tax).toBe(totals.tax)
  expect(s.totals.grandTotal).toBe(totals.grandTotal)
  expect(new D(s.totals.tools.net).plus(s.totals.person.net).eq(totals.net)).toBe(true)
  expect(new D(s.totals.tools.cost).plus(s.totals.person.cost).eq(totals.cost)).toBe(true)
  expect(sum(s.rows.map(r => r.tools.net)).eq(s.totals.tools.net)).toBe(true)
  expect(sum(s.rows.map(r => r.person.net)).eq(s.totals.person.net)).toBe(true)
}

/** Kernel verdicts, read straight from its diagnostics. */
const kernelFloor = (result: Composition) =>
  result.quote.periods.flatMap(period =>
    period.result.diagnostics
      .filter(d => d.code === 'MARGIN_BELOW_FLOOR')
      .map(d => `${period.periodId}:${d.fieldPath.replace(/^result\.lines\./, '')}`)
  )

const thrown = (run: () => unknown) => {
  try {
    run()
  } catch (error) {
    return error
  }

  return undefined
}

describe('the committed corpus covers the cases the split has to hold in', () => {
  // Premises read from the frozen files. If the corpus changes shape, this says which case lost its example.
  const facts = corpus.map(path => {
    const result = frozen(path).semantic.result

    return {
      path,
      engine: engineOf(result),
      rounding: multipleOf(result, 1) !== null,
      marketLowered: kernelRows(result).some(
        ({ row }) => 'marketPriceRatio' in row && row.marketPriceRatio !== '1' && new D(row.marketAdjustment).lt(0)
      ),
      adjustments: (result.quote.resolution.brief?.adjustments ?? []).map(a => a.kind),
      setupRows: kernelRows(result).some(({ row }) => row.kind === 'setup'),
      tools: attributedTools(result).length
    }
  })

  it('finds compositions of every engine, with rounding, a market factor, a discount and an agreed net', () => {
    expect(corpus).toEqual(expect.arrayContaining([DESIGNER, COLOMBIA, SKY_AGREED_NET, SKY_DISCOUNT]))
    expect([...new Set(facts.map(f => f.engine))].sort()).toEqual(Object.values(PRICING_V3_ENGINES).sort())
    expect(facts.every(f => f.tools > 0)).toBe(true)
    expect(facts.find(f => f.path === DESIGNER)).toMatchObject({ engine: PRICING_V3_ENGINES['1.0.0'], setupRows: true })
    expect(facts.find(f => f.path === COLOMBIA)).toMatchObject({
      engine: PRICING_V3_ENGINES['1.2.0'],
      rounding: true,
      marketLowered: true
    })
    expect(facts.find(f => f.path === SKY_AGREED_NET)).toMatchObject({
      engine: PRICING_V3_ENGINES['1.1.0'],
      rounding: true,
      adjustments: ['agreed_net']
    })
    expect(facts.find(f => f.path === SKY_DISCOUNT)).toMatchObject({ rounding: false, adjustments: ['discount'] })
  })
})

describe('tools + person is the frozen row, to the unit', () => {
  it.each(corpus)('%s: every tool, each tool alone and every pair', path => {
    const result = frozen(path).semantic.result
    const tools = attributedTools(result)

    const choices: ('all' | string[])[] = [
      'all',
      ...tools.map(id => [id]),
      ...tools.flatMap((a, i) => tools.slice(i + 1).map(b => [a, b]))
    ]

    for (const choice of choices) expectExact(result, split(path, choice))
  })

  it('reads the frozen result without touching it, and identifies the artifact it read', () => {
    const artifact = frozen(COLOMBIA)
    const before = JSON.stringify(artifact)
    const s = split(COLOMBIA, 'all')

    expect(JSON.stringify(artifact)).toBe(before)
    expect(replayResourceComposition(clone(artifact)).replayDigest).toBe(artifact.replayDigest)
    expect(s).toMatchObject({
      schemaVersion: PRICE_SPLIT_VERSION,
      binding: false,
      calculationId: artifact.calculationId,
      replayDigest: artifact.replayDigest,
      currency: artifact.semantic.result.quote.totals!.currency
    })
  })

  it('holds across several periods and lines, with an annual seat among the tools', () => {
    const { catalog, policy, credits, demand } = frozen(COLOMBIA).semantic
    const longer = clone(demand)

    longer.brief.periods = 3
    longer.allocations = [1, 2, 3].flatMap(periodId => demand.allocations.map(a => ({ ...a, periodId })))

    const result = composeResourceQuote(catalog, policy, credits, longer)

    expect(result.quote.calculationStatus).toBe('calculated')
    expect(result.quote.periods).toHaveLength(3)
    expect(result.attributions.some(a => a.resource.unit === 'year')).toBe(true)

    const identity = { calculationId: 'composition-under-test', replayDigest: 'digest-under-test' }
    const s = splitQuotedPrice(result, identity, { tools: 'all' })

    expectExact(result, s)
    expect(s.rows.length).toBe(kernelRows(result).length)
    expect(s.rows.length).toBeGreaterThan(result.quote.periods.length)
    // The kit is present in every period, not only where the annual cash falls.
    for (const period of s.periods) expect(new D(period.tools.net).gt(0)).toBe(true)
  })
})

describe('the tools part is the price the kernel formed for those components', () => {
  it.each(corpus)('%s: every tool', path => {
    const result = frozen(path).semantic.result
    const s = split(path, 'all')

    for (const [index, { periodId, row }] of kernelRows(result).entries()) {
      const part = s.rows[index]
      const formed = kernelToolPrice(row)
      const unit = unitOf(row.net)
      const multiple = multipleOf(result, periodId)

      // Before the row was rounded or adjusted: what the kernel stored, read at the currency unit.
      expect(new D(part.tools.policyPrice).minus(formed).abs().lte(unit.div(2))).toBe(true)

      if (formed.isZero()) {
        expect(new D(part.tools.net).isZero()).toBe(true)
        expect(part.person.net).toBe(row.net)
        continue
      }

      // The row's own adjustment ratio (discount, agreed net, uplift), applied to the kit as to a row of its own.
      const adjusted = formed.mul(row.net).div(row.undiscountedPrice)
      const gap = new D(part.tools.net).minus(adjusted)

      if (new D(part.tools.net).eq(row.net)) continue // capped: the kit is never presented above its row

      if (multiple) {
        // Raised to the next multiple of the quote, never lowered and never by a full multiple.
        expect(new D(part.tools.net).mod(multiple).isZero()).toBe(true)
        expect(gap.gte(0) && gap.lt(multiple)).toBe(true)
      } else {
        expect(gap.abs().lte(unit.div(2))).toBe(true)
      }
    }
  })

  it('a setup row holds no tool component, so it is all person', () => {
    const result = frozen(DESIGNER).semantic.result
    const setup = kernelRows(result).filter(({ row }) => row.kind === 'setup')

    expect(setup.length).toBeGreaterThan(0)

    for (const { row } of setup) {
      const part = split(DESIGNER, 'all').rows.find(r => r.lineId === row.lineId)!

      expect(row.components.some(component => component.kind === 'tool')).toBe(false)
      expect(part.tools.components).toEqual([])
      expect(new D(part.tools.net).isZero()).toBe(true)
      expect(part.person).toMatchObject({ net: row.net, cost: row.cost })
    }
  })

  it('a market factor moves the person and never the kit', () => {
    const { catalog, policy, credits, demand } = frozen(COLOMBIA).semantic

    // The factor in force for the quote, edited where an operator would edit it; the rest of the catalog is frozen.
    const withFactor = (factor: string) => {
      const edited = clone(catalog)
      const asOf = demand.brief.quoteDate

      const records = edited.records.filter(
        r =>
          r.kind === 'market_factor' &&
          r.value.country === demand.brief.offerMarketCountry &&
          r.source.effectiveFrom <= asOf &&
          asOf <= r.source.effectiveUntil
      )

      expect(records).toHaveLength(1)
      if (records[0].kind === 'market_factor') records[0].value.factor = factor

      const result = composeResourceQuote(edited, policy, credits, demand)

      expect(result.quote.calculationStatus).toBe('calculated')

      return { result, s: splitQuotedPrice(result, frozen(COLOMBIA), { tools: 'all' }) }
    }

    const base = split(COLOMBIA, 'all')
    const lower = withFactor('0.80')
    const neutral = withFactor('1')

    // The control: the factor really moved the quotes being compared.
    expect(new D(lower.result.quote.totals!.net).lt(base.totals.net)).toBe(true)
    expect(new D(neutral.result.quote.totals!.net).gt(base.totals.net)).toBe(true)

    for (const other of [lower, neutral]) {
      expectExact(other.result, other.s)
      expect(other.s.rows.map(r => r.tools.net)).toEqual(base.rows.map(r => r.tools.net))
      expect(other.s.rows.map(r => r.tools.cost)).toEqual(base.rows.map(r => r.tools.cost))
    }

    expect(new D(lower.s.totals.person.net).lt(base.totals.person.net)).toBe(true)
    expect(new D(neutral.s.totals.person.net).gt(base.totals.person.net)).toBe(true)
  })

  it('an agreed net above the price lifts the kit with its row, and an agreed net below lowers it', () => {
    const { catalog, policy, credits, demand } = frozen(SKY_AGREED_NET).semantic
    const identity = { calculationId: 'composition-under-test', replayDigest: 'digest-under-test' }

    const agreed = (amount: string | null) => {
      const edited = clone(demand)

      if (amount === null) edited.brief.adjustments = []
      else if (edited.brief.adjustments[0].kind === 'agreed_net') edited.brief.adjustments[0].amount = amount

      const result = composeResourceQuote(catalog, policy, credits, edited)

      expect(result.quote.calculationStatus).toBe('calculated')

      return { result, s: splitQuotedPrice(result, identity, { tools: 'all' }) }
    }

    const listPrice = agreed(null)
    const above = agreed(new D(listPrice.result.quote.totals!.net).mul(2).toFixed(0))
    const below = split(SKY_AGREED_NET, 'all')

    expect(new D(above.result.quote.totals!.uplift ?? 0).gt(0)).toBe(true)
    expect(new D(frozen(SKY_AGREED_NET).semantic.result.quote.totals!.discount).gt(0)).toBe(true)
    expectExact(above.result, above.s)

    for (const [index, row] of listPrice.s.rows.entries()) {
      expect(new D(above.s.rows[index].tools.net).gt(row.tools.net)).toBe(true)
      expect(new D(below.rows[index].tools.net).lt(row.tools.net)).toBe(true)
      // Cost does not move with the price.
      expect(above.s.rows[index].tools.cost).toBe(row.tools.cost)
      expect(below.rows[index].tools.cost).toBe(row.tools.cost)
    }
  })
})

describe('which tools are shown apart is the choice of the caller', () => {
  it('`all` is every tool the quote attributes; a subset leaves the others inside the person', () => {
    const result = frozen(DESIGNER).semantic.result
    const tools = attributedTools(result)
    const all = split(DESIGNER, 'all')
    const some = split(DESIGNER, ['adobe', 'higgsfield'])

    expect(tools.length).toBeGreaterThan(2)
    expect(all.tools).toMatchObject({ toolIds: tools, keptInPersonPart: [], label: PRICE_SPLIT_DEFAULT_LABEL })
    expect(some.tools.toolIds).toEqual(['adobe', 'higgsfield'])
    expect([...some.tools.toolIds, ...some.tools.keptInPersonPart].sort()).toEqual([...tools].sort())

    for (const [index, row] of all.rows.entries()) {
      expect(new D(some.rows[index].tools.net).lte(row.tools.net)).toBe(true)
      expect(new D(some.rows[index].tools.cost).lte(row.tools.cost)).toBe(true)
      expect(some.rows[index].tools.components.map(c => c.toolId)).toEqual(
        row.tools.components.map(c => c.toolId).filter(id => some.tools.toolIds.includes(id))
      )
    }

    expect(new D(some.totals.tools.net).lt(all.totals.tools.net)).toBe(true)
    expect(new D(some.totals.tools.net).gt(0)).toBe(true)
  })

  it('reads the same however the choice was typed, and carries the label it was given', () => {
    const typed = split(DESIGNER, ['higgsfield', 'adobe', 'adobe'], 'Kit creativo')

    expect(typed.tools.label).toBe('Kit creativo')
    expect({ ...typed, tools: { ...typed.tools, label: PRICE_SPLIT_DEFAULT_LABEL } }).toEqual(
      split(DESIGNER, ['adobe', 'higgsfield'])
    )
  })

  it('a tool attributed to several lines is split in each line by what that line was attributed', () => {
    const result = frozen(COLOMBIA).semantic.result
    const inbox = result.attributions.find(a => a.toolId === 'social-inbox')!
    const withInbox = inbox.assignments.map(a => a.lineId)
    const s = split(COLOMBIA, ['social-inbox'])

    expect(withInbox.length).toBeGreaterThan(1)
    expect(withInbox.length).toBeLessThan(result.quote.periods[0].result.lines.length)

    for (const [index, { row }] of kernelRows(result).entries()) {
      const part = s.rows[index]
      const component = row.components.filter(c => c.componentId.startsWith('composed-social-inbox-'))

      expect(component).toHaveLength(withInbox.includes(row.parentLineId) ? 1 : 0)
      expect(part.tools.components.map(c => c.componentId)).toEqual(component.map(c => c.componentId))

      if (component.length === 0) {
        expect(part.person).toMatchObject({ net: row.net, cost: row.cost })
        continue
      }

      const cost = new D(component[0].cost).mul(component[0].trace.outputFx ?? 1)

      expect(new D(part.tools.cost).minus(cost).abs().lte(unitOf(row.cost).div(2))).toBe(true)
      expect(new D(part.tools.net).gt(0)).toBe(true)
    }
  })

  it('rejects a tool the quote does not attribute, naming its position and never its value', () => {
    const result = frozen(DESIGNER).semantic.result
    // Known to the resource policy, not selected for this quote: carries no attributed cost here.
    const policyOnly = frozen(DESIGNER).semantic.policy.tools.find(t => !attributedTools(result).includes(t.toolId))!

    for (const tools of [['adobe', 'not-a-tool'], ['adobe', policyOnly.toolId], []]) {
      const error = thrown(() => split(DESIGNER, tools))

      expect(error).toBeInstanceOf(PricingV3Error)
      expect((error as PricingV3Error).code).toBe('SPLIT_TOOL_NOT_ATTRIBUTED')
      expect((error as PricingV3Error).detail.option).toBe('tools')
      expect((error as PricingV3Error).detail.issues ?? []).toEqual(
        tools.length ? [{ path: 'tools.1', rule: 'not_attributed' }] : []
      )
    }
  })

  it('rejects a quote without amounts instead of presenting nothing in two parts', () => {
    const { policy, credits, demand } = frozen(COLOMBIA).semantic

    // The historical baseline has no managed-service offer, so the same demand cannot be resolved.
    const blocked = composeResourceQuote(
      read('data/pricing/v3-catalog/catalog.review-v1.json'),
      policy,
      credits,
      demand
    )

    expect(blocked.quote.totals).toBeNull()

    const error = thrown(() => splitQuotedPrice(blocked, frozen(COLOMBIA), { tools: 'all' }))

    expect((error as PricingV3Error).code).toBe('SPLIT_REQUIRES_CALCULATED_QUOTE')
  })

  it('stops when a selected tool cannot be found again in the frozen rows', () => {
    const result = clone(frozen(DESIGNER).semantic.result)
    const line = result.quote.resolution.inputs[0].input.request.lines[0]

    // The assignment is what ties a kernel component to its tool. Without it the cost would stay in the person.
    line.assignments = line.assignments.filter(a => a.resourceId !== 'composed:adobe')

    const error = thrown(() => splitQuotedPrice(result, frozen(DESIGNER), { tools: ['adobe'] }))

    expect((error as PricingV3Error).code).toBe('SPLIT_ATTRIBUTION_NOT_TRACEABLE')
  })
})

describe('each part is measured against the floor of its row, and nothing is repaired', () => {
  it.each(corpus)('%s: the row verdict is the kernel one and each part meets or misses its own floor', path => {
    const result = frozen(path).semantic.result
    const s = split(path, 'all')

    expect(s.rows.filter(r => r.rowBelowFloor).map(r => `${r.periodId}:${r.lineId}`)).toEqual(kernelFloor(result))
    expect(s.floor.rowsBelowFloor.map(r => `${r.periodId}:${r.lineId}`)).toEqual(kernelFloor(result))

    for (const [index, { row }] of kernelRows(result).entries()) {
      const part = s.rows[index]
      const unit = unitOf(row.net)
      const keep = new D(1).minus(row.minimumMargin)

      expect(part.minimumMargin).toBe(row.minimumMargin)
      expect('floorNet' in part ? part.floorNet : undefined).toBe('floorNet' in row ? row.floorNet : undefined)

      // The kit never takes a market factor: its floor is the smallest net that keeps the minimum on its cost.
      const kitFloor = new D(part.tools.floorNet)

      expect(kitFloor.mul(keep).gte(part.tools.cost)).toBe(true)
      expect(kitFloor.isZero() || kitFloor.minus(unit).mul(keep).lt(part.tools.cost)).toBe(true)

      for (const side of [part.tools, part.person]) expect(side.belowFloor).toBe(new D(side.net).lt(side.floorNet))

      expect(part.partsBelowFloorWhileRowMeetsIt).toEqual(
        part.rowBelowFloor
          ? []
          : [...(part.tools.belowFloor ? ['tools'] : []), ...(part.person.belowFloor ? ['person'] : [])]
      )
    }

    expect(s.floor.partsBelowFloorWhileRowMeetsIt.map(n => `${n.periodId}:${n.lineId}:${n.part}`)).toEqual(
      s.rows.flatMap(r => r.partsBelowFloorWhileRowMeetsIt.map(side => `${r.periodId}:${r.lineId}:${side}`))
    )
  })

  it('under a base-market floor the parts add up to the floor the kernel stored for the row', () => {
    const result = frozen(COLOMBIA).semantic.result
    const lowered = kernelRows(result).filter(({ row }) => 'marketPriceRatio' in row && row.marketPriceRatio !== '1')

    expect(lowered.length).toBeGreaterThan(0)

    // No tool shown apart in the row: the person is the row, and its floor is the kernel's, digit for digit.
    const stored = kernelRows(result).map(({ row }) => ('floorNet' in row ? row.floorNet : null))
    const inboxOnly = split(COLOMBIA, ['social-inbox']).rows
    const untouched = inboxOnly.flatMap((part, index) => (part.tools.components.length === 0 ? [index] : []))

    expect(stored.every(floorNet => floorNet !== null)).toBe(true)
    expect(untouched.length).toBeGreaterThan(0)
    for (const index of untouched) expect(inboxOnly[index].person.floorNet).toBe(stored[index])

    // Every component of this quote takes the same multiplier, so the two floors are the row floor split in two;
    // each one is raised to the unit on its own, which can add one unit and never more.
    for (const [index, part] of split(COLOMBIA, 'all').rows.entries()) {
      const over = new D(part.tools.floorNet).plus(part.person.floorNet).minus(stored[index]!)

      expect(part.tools.components.length).toBeGreaterThan(0)
      expect(over.gte(0) && over.lte(unitOf(part.net))).toBe(true)
    }
  })

  it('says when a part is under the floor while its row is not, with the size of the gap', () => {
    const s = split(COLOMBIA, 'all')
    const notices = s.floor.partsBelowFloorWhileRowMeetsIt

    // The premise, read from the split of the committed case: raising the kit to the multiple left less for people.
    expect(notices.length).toBeGreaterThan(0)
    expect(s.floor.rowsBelowFloor).toEqual([])

    for (const notice of notices) {
      const part = s.rows.find(r => r.periodId === notice.periodId && r.lineId === notice.lineId)!

      expect(part.rowBelowFloor).toBe(false)
      expect(notice.net).toBe(part[notice.part].net)
      expect(new D(notice.netShortOfFloor).eq(new D(notice.floorNet).minus(notice.net))).toBe(true)
      expect(new D(notice.netShortOfFloor).gt(0)).toBe(true)
      // Reported, not repaired: the row still adds up to what was quoted.
      expect(new D(part.tools.net).plus(part.person.net).eq(part.net)).toBe(true)
    }
  })

  it('a row under its floor is said to be under its floor and still splits', () => {
    const result = frozen(SKY_AGREED_NET).semantic.result
    const s = split(SKY_AGREED_NET, 'all')

    expect(kernelFloor(result).length).toBeGreaterThan(0)
    expect(s.rows.filter(r => r.rowBelowFloor).length).toBe(kernelFloor(result).length)
    expectExact(result, s)

    for (const part of s.rows.filter(r => r.rowBelowFloor)) {
      // The finding is the row; the parts keep saying their own without being listed as a second finding.
      expect(part.partsBelowFloorWhileRowMeetsIt).toEqual([])
      expect(new D(part.tools.net).gt(0) && new D(part.person.net).gt(0)).toBe(true)
    }
  })
})

describe('a quote that declares the form of its engagement (contract 1.3.0)', () => {
  // Built in memory from the frozen inputs of the Colombia case (market factor 0.90 with a base-market floor, COP
  // rounded to 50.000): the same demand with and without a form, over the same catalog with the ratios added. The
  // quote without a form is priced by contract 1.2.0, which the frozen corpus guards; it is the reference here.
  const { catalog, policy, credits, demand } = frozen(COLOMBIA).semantic

  const source = { reference: 'price-split-test', effectiveFrom: '2026-01-01', effectiveUntil: '9999-12-31' }

  const formRecord = (form: string, priceRatio: string) => ({
    recordId: `engagement:${form}`,
    revision: 1,
    kind: 'engagement_factor',
    source: { ...source, status: 'confirmed' },
    note: 'Price ratio of a form of engagement, declared for the test.',
    value: { form, priceRatio }
  })

  const withForms = (base: unknown, rounding = true) => {
    const next = clone(base) as { records: { kind: string }[] }

    next.records.push(formRecord('on_going', '1'), formRecord('on_demand', '1.10'), formRecord('committed', '0.90'))
    if (!rounding) next.records = next.records.filter(r => r.kind !== 'price_rounding')

    return next
  }

  const quoted = (form?: string, rounding = true) => {
    const declared = clone(demand) as typeof demand & { brief: { engagementForm?: string } }

    if (form) declared.brief.engagementForm = form

    const result = composeResourceQuote(withForms(catalog, rounding), policy, credits, declared)

    expect(result.quote.calculationStatus).toBe('calculated')

    return result
  }

  const identity = { calculationId: 'composition-under-test', replayDigest: 'digest-under-test' }

  const splitOf = (result: Composition, tools: 'all' | string[] = 'all') =>
    splitQuotedPrice(result, identity, { tools })

  const without = quoted()
  const onDemand = quoted('on_demand')

  it('the premise: a 1.3.0 quote over a market floor, with tools in every row and more to pay than without a form', () => {
    expect(engineOf(without)).toBe(PRICING_V3_ENGINES['1.2.0'])
    expect(engineOf(onDemand)).toBe(PRICING_V3_ENGINES['1.3.0'])
    expect(new D(onDemand.quote.totals!.net).gt(without.quote.totals!.net)).toBe(true)
    expect(kernelRows(onDemand).every(({ row }) => 'marketPriceRatio' in row && row.marketPriceRatio !== '1')).toBe(
      true
    )
    expect(kernelRows(onDemand).every(({ row }) => kernelToolPrice(row).gt(0))).toBe(true)
  })

  it('tools + person is the row, to the unit, for every form and every choice of tools', () => {
    for (const result of [onDemand, quoted('on_going'), quoted('committed'), quoted('on_demand', false)]) {
      const tools = attributedTools(result)

      for (const choice of ['all', ...tools.map(id => [id]), tools.slice(0, 2)] as ('all' | string[])[])
        expectExact(result, splitOf(result, choice))
    }
  })

  it('the kit takes the ratio like every other component of the row', () => {
    // Without a rounding rule the kit is read at the currency unit, so it shows the ratio and nothing else.
    const before = quoted(undefined, false)
    const after = quoted('on_demand', false)
    const kitBefore = splitOf(before).rows
    const kitAfter = splitOf(after).rows

    for (const [index, { row }] of kernelRows(after).entries()) {
      const earlier = kernelRows(before)[index].row
      const unit = unitOf(row.net)

      // What the kernel stored for the tool components: the prior price times 1.10, to its working precision.
      expect(kernelToolPrice(row).div(kernelToolPrice(earlier)).minus('1.10').abs().lt('1e-60')).toBe(true)
      expect(new D(kitAfter[index].tools.policyPrice).minus(kernelToolPrice(row)).abs().lte(unit.div(2))).toBe(true)
      expect(new D(kitAfter[index].tools.net).minus(kernelToolPrice(earlier).mul('1.10')).abs().lte(unit.div(2))).toBe(
        true
      )
      expect(new D(kitAfter[index].tools.net).gt(kitBefore[index].tools.net)).toBe(true)
      // Cost is the frozen cost of the same components: the form does not move it, in either part.
      expect(kitAfter[index].tools.cost).toBe(kitBefore[index].tools.cost)
      expect(kitAfter[index].person.cost).toBe(kitBefore[index].person.cost)
      expect(kitAfter[index].engagementPriceRatio).toBe('1.10')
      expect(kitBefore[index]).not.toHaveProperty('engagementPriceRatio')
    }
  })

  it('with a rounding rule the kit is the ratioed price raised to the multiple of the quote', () => {
    const s = splitOf(onDemand)

    for (const [index, { periodId, row }] of kernelRows(onDemand).entries()) {
      const multiple = multipleOf(onDemand, periodId)!
      const gap = new D(s.rows[index].tools.net).minus(kernelToolPrice(row).mul(row.net).div(row.undiscountedPrice))

      expect(new D(s.rows[index].tools.net).mod(multiple).isZero()).toBe(true)
      expect(gap.gte(0) && gap.lt(multiple)).toBe(true)
    }
  })

  it('the ratio moves no floor: each part is measured against the floor it has without a form', () => {
    for (const form of ['on_going', 'on_demand', 'committed']) {
      const result = quoted(form)

      for (const tools of ['all', ['social-inbox']] as ('all' | string[])[]) {
        const before = splitOf(without, tools).rows
        const after = splitOf(result, tools).rows

        for (const [index, part] of after.entries()) {
          expect(part.tools.floorNet).toBe(before[index].tools.floorNet)
          expect(part.person.floorNet).toBe(before[index].person.floorNet)
          expect('floorNet' in part && part.floorNet).toBe('floorNet' in before[index] && before[index].floorNet)
        }
      }
    }
  })

  it('with no tool shown apart in a row, the person floor is the floor the kernel stored, digit for digit', () => {
    const stored = kernelRows(onDemand).map(({ row }) => ('floorNet' in row ? row.floorNet : null))
    const inboxOnly = splitOf(onDemand, ['social-inbox']).rows
    const untouched = inboxOnly.flatMap((part, index) => (part.tools.components.length === 0 ? [index] : []))

    expect(stored.every(floorNet => floorNet !== null)).toBe(true)
    expect(untouched.length).toBeGreaterThan(0)
    for (const index of untouched) expect(inboxOnly[index].person.floorNet).toBe(stored[index])
  })

  it('the row verdict is the kernel one for a ratio under 1, and each part still says its own', () => {
    const committed = quoted('committed')
    const s = splitOf(committed)

    expect(kernelFloor(committed).length).toBeGreaterThan(0)
    expect(s.floor.rowsBelowFloor.map(r => `${r.periodId}:${r.lineId}`)).toEqual(kernelFloor(committed))

    for (const part of s.rows) {
      for (const side of [part.tools, part.person]) expect(side.belowFloor).toBe(new D(side.net).lt(side.floorNet))
      if (part.rowBelowFloor) expect(part.partsBelowFloorWhileRowMeetsIt).toEqual([])
    }
  })

  it('says that the prices carry the ratio only for a quote that declares a form', () => {
    expect(splitOf(onDemand).basis.length).toBe(splitOf(without).basis.length + 1)
    expect(splitOf(without).basis).toEqual(split(COLOMBIA, 'all').basis)
    expect(JSON.stringify(splitOf(without))).not.toMatch(/engagement/i)
  })
})

describe('compose split on the command line', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-price-split-'))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const cli = (...args: string[]) =>
    spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

  const rejected = (...args: string[]) => {
    const run = cli(...args)

    expect(run.status).toBe(1)
    expect(run.stdout).toBe('')

    return {
      stderr: run.stderr,
      error: JSON.parse(run.stderr).error as { code: string; option?: string; issues?: unknown }
    }
  }

  const sameAsDomain = (value: unknown) => JSON.parse(JSON.stringify(value))

  it('prints exactly the split the domain derives from the verified artifact, under review', () => {
    const out = join(dir, 'split.json')
    const args = ['compose', 'split', '--input', DESIGNER, '--tools', 'higgsfield, adobe', '--label', 'Kit creativo']
    const run = cli(...args, '--out', out)

    // Same exit as `compose assess` on a composition: calculated and pending review.
    expect(run.status).toBe(3)
    expect(cli('compose', 'assess', '--input', DESIGNER).status).toBe(3)
    expect(JSON.parse(run.stdout)).toEqual(sameAsDomain(split(DESIGNER, ['adobe', 'higgsfield'], 'Kit creativo')))
    expect(read(out)).toEqual(JSON.parse(run.stdout))
    expect(statSync(out).mode & 0o777).toBe(0o600)

    // Exclusive like every other output of the tool.
    const frozenOutput = readFileSync(out, 'utf8')

    expect(rejected(...args, '--out', out).error).toMatchObject({ code: 'OUTPUT_EXISTS', option: 'out' })
    expect(readFileSync(out, 'utf8')).toBe(frozenOutput)
  })

  it('`all` on the command line is every attributed tool', () => {
    const run = cli('compose', 'split', '--input', COLOMBIA, '--tools', 'all')

    expect(run.status).toBe(3)
    expect(JSON.parse(run.stdout)).toEqual(sameAsDomain(split(COLOMBIA, 'all')))
  })

  it('has no default set of tools and does not guess one', () => {
    expect(rejected('compose', 'split', '--input', DESIGNER).error).toMatchObject({
      code: 'MISSING_ARGUMENT',
      option: 'tools'
    })

    for (const tools of ['all,adobe', 'adobe,,higgsfield', 'adobe,adobe'])
      expect(rejected('compose', 'split', '--input', DESIGNER, '--tools', tools).error).toMatchObject({
        code: 'INVALID_ARGUMENT',
        option: 'tools'
      })

    // The flag belongs to `split` alone; the other readers of an artifact do not take it.
    expect(rejected('compose', 'assess', '--input', DESIGNER, '--tools', 'all').error).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'tools'
    })
  })

  it('rejects a tool the quote does not attribute with the domain code, without echoing it', () => {
    const probe = `leak-probe-${process.pid}`
    const { error, stderr } = rejected('compose', 'split', '--input', DESIGNER, '--tools', `adobe,${probe}`)

    expect(error).toMatchObject({
      code: 'SPLIT_TOOL_NOT_ATTRIBUTED',
      option: 'tools',
      issues: [{ path: 'tools.1', rule: 'not_attributed' }]
    })
    expect(stderr).not.toContain(probe)
  })

  it('rejects a tampered artifact the way replay rejects it', () => {
    const tampered = read(DESIGNER)
    const row = tampered.semantic.result.quote.periods[0].result.lines[0]

    // One unit less on a frozen net: still a well-formed artifact, no longer the one that was signed.
    row.net = new D(row.net).minus(unitOf(row.net)).toFixed(row.net.split('.')[1]?.length ?? 0)

    const path = join(dir, 'tampered.artifact.json')

    writeFileSync(path, JSON.stringify(tampered))

    expect(rejected('replay', '--input', path).error.code).toBe('REPLAY_MISMATCH')
    expect(rejected('compose', 'split', '--input', path, '--tools', 'all').error.code).toBe('REPLAY_MISMATCH')
  })
})
