// The assessment of a composed quote (`compose assess`) as a person reads it.
//
// - Whether an allocation is evidenced is a fact the demand declares (`allocations[].evidence`), never something read
//   in the wording of its `reason`.
// - A gap raised in several periods is one entry with its `periodIds`; the list does not grow with the term.
// - Planning slots are one fact about the people of the quote, said once.
// - The summary sizes the whole of what is under the floor, so nobody adds folded rows and gets one month.
//
// What a gap names is checked against the frozen result it reads (its attributions, the rows the kernel flagged),
// never against a list written here. Demands are edited in memory; nothing is written under data/.
import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { replayResourceComposition, runResourceComposition } from '../adapters/resource-composition'
import { composeResourceQuote } from '../resources/composition'
import { PLANNING_SLOT_PREFIX } from '../resources/composition-contracts'
import { assessCompositionReadiness } from '../resources/readiness'
import { linesBelowPolicyFloor, summarizeComposition } from '../resources/summary'

const D = Decimal.clone({ precision: 80 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => read(`data/pricing/v3-operating/${name}.json`)
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')

type Composition = ReturnType<typeof composeResourceQuote>
type Assessment = ReturnType<typeof assessCompositionReadiness>

// A person for three months on the catalog and policy in force: three tools allocated in each month, two bought in
// credits, a fee in every month and a start-up in the first.
const catalog = operating('catalog.review-v10')
const policy = operating('resources.review-v11')
const person = operating('designer-three-months-iva.demand')
const QUOTE_DATE: string = person.brief.quoteDate
const [personLine]: string[] = person.brief.lines.map((l: { lineId: string }) => l.lineId)

type Allocation = { periodId: number; toolId: string; reason: string; evidence?: unknown }

const compose = (edit?: (demand: typeof person) => void) => {
  const demand = clone(person)

  edit?.(demand)

  return composeResourceQuote(catalog, policy, credits, demand)
}

const evidence = (changes: Record<string, string> = {}) => ({
  reference: 'supplier-console:seat-register-7781',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '2027-12-31',
  status: 'confirmed',
  ...changes
})

const gapsOf = (r: Composition, code: string) => assessCompositionReadiness(r).gaps.filter(g => g.code === code)

/** Every period of every entry, as `<periodId>:<path>`: what the list was before entries were folded. */
const occurrences = (gaps: Assessment['gaps']) =>
  gaps.flatMap(g => (g.periodIds ?? [null]).map(periodId => `${periodId}:${g.path}`)).sort()

describe('an allocation is evidenced by a fact the demand declares, never by the wording of its reason', () => {
  const plain = compose()
  // The tools the demand allocates, and the ones it buys in credits: read from the result, period by period.
  const budgeted = new Set(plain.creditBudgets.map(b => `${b.periodId}:${b.toolId}`))
  const allocated = plain.attributions.filter(a => !budgeted.has(`${a.periodId}:${a.toolId}`))

  it('the fixture allocates tools in every month, buys others in credits and declares no evidence', () => {
    expect(plain.quote.calculationStatus).toBe('calculated')
    expect(allocated.length).toBeGreaterThan(0)
    expect(budgeted.size).toBeGreaterThan(0)
    expect(person.allocations.every((a: Allocation) => a.evidence === undefined)).toBe(true)
  })

  it('without evidence every allocation is a gap, in every period it is declared for', () => {
    expect(occurrences(gapsOf(plain, 'ALLOCATION_EVIDENCE_REQUIRED'))).toEqual(
      allocated.map(a => `${a.periodId}:tools.${a.toolId}`).sort()
    )
    // A pooled credit budget is not an allocation: the demand declares none of it, so there is none to evidence.
    for (const key of budgeted)
      expect(occurrences(gapsOf(plain, 'ALLOCATION_EVIDENCE_REQUIRED'))).not.toContain(
        `${key.split(':')[0]}:tools.${key.split(':')[1]}`
      )
  })

  it('what the reason says changes nothing, in any language and whatever words it uses', () => {
    const reasons = [
      'Hipótesis de capacidad declarada por operaciones.',
      'Example simulation of a hypothetical prototype.',
      'Seats bought in January; invoice on file.',
      '-'
    ]

    for (const reason of reasons) {
      const r = compose(demand => demand.allocations.forEach((a: Allocation) => (a.reason = reason)))

      expect(gapsOf(r, 'ALLOCATION_EVIDENCE_REQUIRED')).toEqual(gapsOf(plain, 'ALLOCATION_EVIDENCE_REQUIRED'))
    }
  })

  it('confirmed evidence in force on the quote date closes the gap of that allocation and of no other', () => {
    const { toolId } = allocated[0]

    const r = compose(demand =>
      demand.allocations.forEach((a: Allocation) => {
        if (a.toolId === toolId) a.evidence = evidence()
      })
    )

    const left = occurrences(gapsOf(r, 'ALLOCATION_EVIDENCE_REQUIRED'))

    expect(left).toEqual(
      allocated
        .filter(a => a.toolId !== toolId)
        .map(a => `${a.periodId}:tools.${a.toolId}`)
        .sort()
    )
    // With every allocation evidenced there is no such gap, with the reasons left as they were written.
    expect(
      gapsOf(
        compose(demand => demand.allocations.forEach((a: Allocation) => (a.evidence = evidence()))),
        'ALLOCATION_EVIDENCE_REQUIRED'
      )
    ).toEqual([])
  })

  it('evidence that is not confirmed, or not in force on the quote date, is a gap that says which', () => {
    const { toolId } = allocated[0]

    const actionWith = (declared: unknown) => {
      const r = compose(demand =>
        demand.allocations.forEach((a: Allocation) => {
          a.evidence = a.toolId === toolId ? declared : evidence()
        })
      )

      const gaps = gapsOf(r, 'ALLOCATION_EVIDENCE_REQUIRED')

      expect(gaps.map(g => g.path)).toEqual([`tools.${toolId}`])

      return gaps[0].action
    }

    const cases = [
      evidence({ status: 'estimated' }),
      evidence({ status: 'pending' }),
      evidence({ effectiveUntil: '2026-06-30' }),
      evidence({ effectiveFrom: '2027-01-01' })
    ]

    const actions = cases.map(actionWith)
    const missing = gapsOf(plain, 'ALLOCATION_EVIDENCE_REQUIRED')[0].action

    expect(QUOTE_DATE > '2026-06-30' && QUOTE_DATE < '2027-01-01').toBe(true)
    // Three causes, three statements: none declared, not confirmed, not in force.
    expect(actions[0]).toBe(actions[1])
    expect(actions[2]).toBe(actions[3])
    expect(new Set([missing, actions[0], actions[2]]).size).toBe(3)

    // A statement is a rule: it repeats no reference and no date the demand wrote.
    for (const action of actions) {
      expect(action).not.toContain(evidence().reference)
      expect(action).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    }
  })

  it('the evidence travels with the frozen attribution, only where the demand declares it', () => {
    const { toolId } = allocated[0]

    const declared = clone(person)

    declared.allocations.forEach((a: Allocation) => {
      if (a.toolId === toolId && a.periodId === 1) a.evidence = evidence()
    })

    const artifact = runResourceComposition(catalog, policy, credits, declared)
    const frozen = clone(artifact)

    expect(replayResourceComposition(frozen).replayDigest).toBe(artifact.replayDigest)
    expect(
      frozen.semantic.result.attributions.filter(a => 'evidence' in a).map(a => [a.periodId, a.toolId, a.evidence])
    ).toEqual([[1, toolId, evidence()]])
    // Nothing of the price moves with it: the same quote, with one more thing said about one allocation.
    expect(artifact.semantic.result.quote.totals).toEqual(plain.quote.totals)
    expect(plain.attributions.some(a => 'evidence' in a)).toBe(false)

    // Evidenced in one month only, the gap of the tool holds the months that are not.
    expect(
      gapsOf(artifact.semantic.result, 'ALLOCATION_EVIDENCE_REQUIRED')
        .filter(g => g.path === `tools.${toolId}`)
        .map(g => g.periodIds)
    ).toEqual([allocated.filter(a => a.toolId === toolId && a.periodId !== 1).map(a => a.periodId)])
  })
})

describe('gaps that differ only in their period are one entry with its periods', () => {
  const plain = compose()
  const assessment = assessCompositionReadiness(plain)

  it('every period of every entry is a fact of the result, and none is lost', () => {
    const of = (code: string) => occurrences(assessment.gaps.filter(g => g.code === code))

    // Access is to be verified for each tool in each period it is attributed in.
    expect(of('RESOURCE_ACCESS_AND_CAPACITY_REQUIRED')).toEqual(
      [...new Set(plain.attributions.map(a => `${a.periodId}:tools.${a.toolId}`))].sort()
    )
    expect(of('TOOL_COST_EVIDENCE_REVIEW')).toEqual(
      [
        ...new Set(
          plain.attributions
            .filter(a => a.resource.source.status !== 'confirmed')
            .map(a => `${a.periodId}:tools.${a.toolId}`)
        )
      ].sort()
    )
    // A row under its floor is named once, with the periods the kernel flagged it in.
    expect(of('MARGIN_BELOW_POLICY_FLOOR')).toEqual(
      plain.quote.periods
        .flatMap(p =>
          p.result.diagnostics.filter(d => d.code === 'MARGIN_BELOW_FLOOR').map(d => `${p.periodId}:${d.fieldPath}`)
        )
        .sort()
    )
  })

  it('an entry is unique, its periods ascend, and `gapOccurrences` is the size of the list before folding', () => {
    const keys = assessment.gaps.map(g => JSON.stringify([g.code, g.path, g.owner, g.action]))

    expect(new Set(keys).size).toBe(keys.length)

    for (const g of assessment.gaps)
      if (g.periodIds) expect(g.periodIds).toEqual([...new Set(g.periodIds)].sort((a, b) => a - b))

    expect(assessment.gapOccurrences).toBe(occurrences(assessment.gaps).length)
    expect(assessment.gapOccurrences).toBeGreaterThan(assessment.gaps.length)
    // A gap of the whole quote has no period to name.
    expect(assessment.gaps.find(g => g.code === 'COMMERCIAL_APPROVAL_REQUIRED')).not.toHaveProperty('periodIds')
  })

  it('the list does not grow with the term: twelve equal months read like one', () => {
    const managed = operating('managed-care.demand')

    const horizon = (periods: number) => {
      const demand = clone(managed)

      demand.brief.periods = periods
      demand.allocations = Array.from({ length: periods }, (_, i) =>
        managed.allocations.map((a: { periodId: number }) => ({ ...a, periodId: i + 1 }))
      ).flat()

      return assessCompositionReadiness(
        composeResourceQuote(operating('catalog.review-v3'), operating('resources.review-v5'), credits, demand)
      )
    }

    const one = horizon(1)
    const twelve = horizon(12)
    const shape = (a: Assessment) => a.gaps.map(g => [g.code, g.path, g.owner, g.action])

    expect(twelve.calculationStatus).toBe('calculated')
    expect(shape(twelve)).toEqual(shape(one))
    expect(twelve.gaps.filter(g => g.periodIds).every(g => g.periodIds!.length === 12)).toBe(true)
    // What only one period has stays one occurrence; what every period has is counted twelve times.
    const perPeriod = one.gaps.filter(g => g.periodIds).length

    expect(perPeriod).toBeGreaterThan(0)
    expect(twelve.gapOccurrences - one.gapOccurrences).toBe(perPeriod * 11)
  })

  it('the blockers of a quote that did not calculate keep the path the quote reported them under', () => {
    const { toolId } = person.allocations[0]

    const blocked = compose(
      demand => (demand.allocations = demand.allocations.filter((a: Allocation) => a.toolId !== toolId))
    )

    const blockers = blocked.quote.diagnostics.filter(d => d.code === 'RESOURCE_ALLOCATION_REQUIRED')
    const gaps = gapsOf(blocked, 'RESOURCE_ALLOCATION_REQUIRED')

    expect(blocked.quote.calculationStatus).toBe('needs_input')
    expect(blockers.length).toBe(person.brief.periods)
    expect(gaps.map(g => g.path)).toEqual(blockers.map(d => d.path))
    expect(gaps.every(g => !('periodIds' in g))).toBe(true)
  })
})

describe('planning slots are one fact about the people of the quote, said once', () => {
  const slot = (lineId: string, n: number) => `${PLANNING_SLOT_PREFIX}${lineId}-${n}`

  it('a quote with assigned people has no such gap', () => {
    expect(gapsOf(compose(), 'USER_ASSIGNMENT_REQUIRED')).toEqual([])
  })

  it('one slot over three months and several tools is one gap, with how many slots there are', () => {
    const r = compose(demand => (demand.work[0].assigneeIds = [slot(personLine, 1)]))
    const gaps = gapsOf(r, 'USER_ASSIGNMENT_REQUIRED')

    expect(r.quote.calculationStatus).toBe('calculated')
    // The slot uses several tools in several months: that was one gap for each of them.
    expect(r.attributions.filter(a => a.consumerIds.includes(slot(personLine, 1))).length).toBeGreaterThan(3)
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({ path: 'work.assigneeIds', owner: 'Operations' })
    expect(gaps[0]).not.toHaveProperty('periodIds')
    expect(gaps[0].action).toMatch(/^1 of the people/)
    // Nothing else of the assessment depends on who is assigned.
    expect(assessCompositionReadiness(r).gaps.filter(g => g.code !== 'USER_ASSIGNMENT_REQUIRED')).toEqual(
      assessCompositionReadiness(compose()).gaps
    )
  })

  it('slots on several lines are still one gap, and it counts each once', () => {
    const managed = operating('managed-care.demand')
    const demand = clone(managed)

    demand.work[0].assigneeIds = [slot(demand.work[0].lineId, 1)]
    demand.work[1].assigneeIds = [slot(demand.work[1].lineId, 1)]

    const r = composeResourceQuote(operating('catalog.review-v3'), operating('resources.review-v5'), credits, demand)
    const gaps = gapsOf(r, 'USER_ASSIGNMENT_REQUIRED')

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(gaps).toHaveLength(1)
    expect(gaps[0].action).toMatch(/^2 of the people/)
  })
})

describe('the summary sizes the whole of what is under the floor', () => {
  // The person sold for less than the floor of the offer, the same price every month: the fee is flagged in each
  // month and folds into one row, which carries the net short of ONE month.
  const under = compose(demand => {
    demand.brief.adjustments = [
      {
        adjustmentId: 'low',
        kind: 'agreed_net',
        billing: 'monthly',
        amount: '1900000',
        lineIds: [personLine],
        reason: 'Price under test.'
      }
    ]
  })

  const floor = summarizeComposition(under, { calculationId: 'test' }).marginFloor as {
    flaggedLinePeriods: number
    netShortOfFloor?: string
    lines: { netShortOfFloor?: string; periodIds: number[] }[]
  }

  // Straight from the rows the kernel flagged: the net each one is short of the floor net the kernel stated for it.
  const kernel = under.quote.periods.flatMap(p =>
    p.result.diagnostics
      .filter(d => d.code === 'MARGIN_BELOW_FLOOR')
      .map(d => p.result.lines.find(l => d.fieldPath === `result.lines.${l.lineId}`)!)
      .map(line => new D((line as unknown as { floorNet: string }).floorNet).minus(line.net))
  )

  it('the fixture flags a row in several months, and they fold into fewer entries', () => {
    expect(under.quote.calculationStatus).toBe('calculated')
    expect(kernel.length).toBeGreaterThan(1)
    expect(floor.flaggedLinePeriods).toBe(kernel.length)
    expect(floor.lines.length).toBeLessThan(kernel.length)
  })

  it('`netShortOfFloor` is the sum over every flagged line-period, not over the folded rows', () => {
    const whole = kernel.reduce((sum, short) => sum.plus(short), new D(0))
    const folded = floor.lines.reduce((sum, line) => sum.plus(line.netShortOfFloor!), new D(0))

    expect(floor.netShortOfFloor).toBe(whole.toFixed(0))
    expect(whole.gt(folded)).toBe(true)
    // Each folded row counted once per period it holds is the same whole.
    expect(
      floor.lines
        .reduce((sum, line) => sum.plus(new D(line.netShortOfFloor!).mul(line.periodIds.length)), new D(0))
        .toFixed(0)
    ).toBe(floor.netShortOfFloor)
  })

  it('a quote with no flagged line, or of a contract whose rows state no floor net, keeps the keys it had', () => {
    const clear = compose()

    expect(linesBelowPolicyFloor(clear)).toEqual([])
    expect(summarizeComposition(clear, { calculationId: 'test' }).marginFloor).toEqual({
      source: 'kernel:MARGIN_BELOW_FLOOR',
      flaggedLinePeriods: 0,
      lines: []
    })

    // A managed service on an earlier catalog: rows are flagged and none carries `floorNet`.
    const earlier = composeResourceQuote(
      operating('catalog.review-v3'),
      operating('resources.review-v5'),
      credits,
      operating('managed-care.demand')
    )

    const flagged = linesBelowPolicyFloor(earlier)

    expect(flagged.length).toBeGreaterThan(0)
    expect(flagged.every(line => !('floorNet' in line))).toBe(true)
    expect(summarizeComposition(earlier, { calculationId: 'test' }).marginFloor).not.toHaveProperty('netShortOfFloor')
  })
})
