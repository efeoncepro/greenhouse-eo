// Quote increment: the reading that prices an add-on which extends a quote as the difference between two frozen
// quotes, the base and the base with the add-on in it (resources/quote-increment.ts), and the way a quote document
// prints such an add-on (`--increment`, resources/quote-document.ts).
//
// The reading derives from two frozen results and recalculates no price, so its verifiers are other things than
// itself, and no expected amount comes from a previous run of it:
//
//   - the two frozen results: totals and period totals as the kernel wrote them. An increment is a subtraction of
//     those, done here on its own;
//   - the kernel, for everything a comparison must hold or refuse: each case is the committed demand edited where an
//     operator would edit it and quoted again from the frozen catalog, policy and credit catalog. Where the reading
//     must refuse something no demand produces (totals that do not add up, a one-off in a representative period, a
//     source edited under its version), a frozen source is copied and edited: the reader takes any source of that
//     shape and is the last check before a figure exists;
//   - the frozen quote of the same add-on ALONE, for what the increment is there to remove: the cost its own quote
//     charges once per line is read from its components, as the kernel traced them (`scope: person`);
//   - the attributions of the composition and the FX of the frozen snapshot, for the cost of a tool;
//   - for the document, the frozen option quote of the same add-on (the price must be the same either way), and the
//     template itself: `validateQuote` and `quoteAmounts` of scripts/documents/render-cotizacion-a4.mjs.
//
// Nothing is written under data/.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import Decimal from 'decimal.js'
import { afterAll, describe, expect, it } from 'vitest'

import { replayResourceComposition, runResourceComposition } from '../adapters/resource-composition'
import { PRICING_V3_DOMAIN_ERROR_CODES } from '../errors'
import {
  QUOTE_DOCUMENT_BRIEF_VERSION,
  composeQuoteDocument,
  scaffoldQuoteDocumentBrief
} from '../resources/quote-document'
import type { QuoteDocumentIncrement, QuoteDocumentOption } from '../resources/quote-document'
import { QUOTE_INCREMENT_VERSION, readQuoteIncrement } from '../resources/quote-increment'
import type { QuoteIncrementReading, QuoteIncrementRejectionCode } from '../resources/quote-increment'

type Artifact = ReturnType<typeof replayResourceComposition>
type Demand = Artifact['semantic']['demand']
type Json = Record<string, unknown>
type Issue = { path: string; rule: string }

const D = Decimal.clone({ precision: 120, rounding: Decimal.ROUND_HALF_UP })
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const print = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

const OPERATING = 'data/pricing/v3-operating'
// The committed example: a managed service of three months at an agreed monthly fee; the same service with an
// add-on of eight more points of its lead, at the fee plus the price agreed for the add-on; and that add-on quoted
// alone, as an option, at the same price.
const EXAMPLE = `${OPERATING}/managed-addon-increment`
// A managed service with re-invoiced third-party costs and one the client pays apart, and the designer quoted with
// a start-up and two options: other shapes the rules have to hold in.
const THIRD_PARTY = `${OPERATING}/managed-on-demand-third-party`
const COURTESY = `${OPERATING}/designer-startup-courtesy`

/** Every artifact enters through the same replay check the CLI applies. */
const frozen = (path: string) => replayResourceComposition(read(path))

const base = frozen(`${EXAMPLE}.artifact.json`)
const withAddOn = frozen(`${EXAMPLE}.with-addon.artifact.json`)
const standalone = frozen(`${EXAMPLE}.option-standalone.artifact.json`)
const thirdParty = frozen(`${THIRD_PARTY}.artifact.json`)

/** A demand edited where an operator would edit it and quoted again from the frozen sources of `from`. */
const quoted = (from: Artifact, edit: (demand: Demand) => void) => {
  const { catalog, policy, credits, demand } = from.semantic
  const edited = clone(demand)

  edit(edited)

  return runResourceComposition(catalog, policy, credits, edited)
}

/** A verified source copied and edited: for what no demand produces. */
const edited = (from: Artifact, edit: (source: Artifact) => void) => {
  const copy = clone(from)

  edit(copy)

  return copy
}

const totalsOf = (artifact: Artifact) => artifact.semantic.result.quote.totals!
const periodsOf = (artifact: Artifact) => artifact.semantic.result.quote.periods.map(period => period.result.totals!)
const rowsOf = (artifact: Artifact) => artifact.semantic.result.quote.periods.flatMap(period => period.result.lines)

const accepted = (from: Artifact, to: Artifact): QuoteIncrementReading => {
  const outcome = readQuoteIncrement(from, to)

  if (!outcome.ok) throw new Error(`increment rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

  return outcome.reading
}

const refused = (from: Artifact, to: Artifact, code: QuoteIncrementRejectionCode, issues?: Issue[]) => {
  const outcome = readQuoteIncrement(from, to)

  if (outcome.ok) throw new Error('increment accepted')

  // Every rejection names a place and a rule, never content.
  for (const issue of outcome.issues) {
    expect(Object.keys(issue).sort()).toEqual(['path', 'rule'])
    expect(issue.path).toMatch(/^[\w.]*$/)
    expect(issue.rule).toMatch(/^[a-z_]+$/)
  }

  expect(outcome.code).toBe(code)
  if (issues) expect(outcome.issues).toEqual(issues)

  return outcome
}

/** The named seats every person of the example has (one each), with what the service carries of them. */
const seats = (demand: Demand, people: number, carried: string, periodIds?: number[]) => {
  const named = demand.allocations.filter(allocation => allocation.driver.unit === 'declared-fte-share')

  for (const allocation of named) {
    allocation.quantity = String(people)
    allocation.seatCapacity = people
    allocation.driver = { ...allocation.driver, totalUnits: String(people), allocatedUnits: carried }
    allocation.serviceShare = new D(carried).div(people).toDecimalPlaces(18, D.ROUND_DOWN).toString()
    if (periodIds) allocation.periodIds = periodIds
  }

  return named
}

/** The example over `periods` months instead of three. */
const over = (demand: Demand, periods: number) => {
  demand.brief.periods = periods

  for (const allocation of demand.allocations)
    allocation.periodIds = Array.from({ length: periods }, (_, index) => index + 1)
}

/** The fee the example agrees for its lines, at another amount. */
const agreeAt = (demand: Demand, amount: string) => {
  const [adjustment] = demand.brief.adjustments

  if (adjustment.kind !== 'agreed_net') throw new Error('the example agrees a net')

  adjustment.amount = amount
}

const EVIDENCE = {
  reference: 'evidence-declared-for-the-test',
  effectiveFrom: '2026-10-01',
  effectiveUntil: '2027-12-31',
  status: 'confirmed' as const
}

/** A cost bought for the job and re-invoiced, in the first month only. */
const reinvoiced = (costId: string, periodIds = [1]) => ({
  costId,
  category: 'production',
  label: 'Producción de ejemplo',
  supplier: 'Proveedor de ejemplo',
  settlement: 'reinvoiced' as const,
  amount: '1000000',
  currency: 'CLP',
  quantity: '1',
  periodIds,
  evidence: EVIDENCE
})

describe('the committed example: an add-on priced as what it adds to the quote it extends', () => {
  const reading = accepted(base, withAddOn)

  it('the three frozen quotes are the service, the service with the add-on and the add-on alone', () => {
    // Premises, read from the frozen files: what makes the three quotes an example of this.
    const lead = (artifact: Artifact) => artifact.semantic.demand.brief.lines.find(line => line.lineId === 'lead')!

    expect(base.semantic.demand.commercialUnit).toBe('managed_service')
    expect(base.semantic.demand.brief.lines.map(line => line.lineId)).toEqual(['care', 'lead', 'agents'])
    expect(withAddOn.semantic.demand.brief.lines.map(line => line.lineId)).toEqual(['care', 'lead', 'agents'])
    expect(standalone.semantic.demand.brief.lines.map(line => line.lineId)).toEqual(['lead'])
    // Eight more points of a person who is already a line of the base; the option quotes those eight alone.
    expect(new D(lead(withAddOn).dedication.value).minus(lead(base).dedication.value).toFixed()).toBe('0.08')
    expect(lead(standalone).dedication.value).toBe('0.08')
    expect(lead(standalone).profile).toBe(lead(base).profile)

    // The add-on is agreed at one price however it is quoted: the fee grows by it, and the option is sold for it.
    const agreed = (artifact: Artifact) => {
      const [adjustment] = artifact.semantic.demand.brief.adjustments

      return adjustment.kind === 'agreed_net' ? adjustment.amount : null
    }

    expect(new D(agreed(withAddOn)!).minus(agreed(base)!).toFixed()).toBe(agreed(standalone))

    for (const artifact of [base, withAddOn, standalone]) {
      expect(artifact.semantic.result.quote.calculationStatus).toBe('calculated')
      // The buyer of an example is invented.
      expect(artifact.semantic.demand.brief.accountId).toBe('managed-addon-increment-example')
    }
  })

  it('the committed reading is what the two artifacts yield', () => {
    expect(clone(reading)).toEqual(read(`${EXAMPLE}.increment.json`))
    expect(reading).toMatchObject({
      schemaVersion: QUOTE_INCREMENT_VERSION,
      binding: false,
      audience: 'internal',
      base: { calculationId: base.calculationId, replayDigest: base.replayDigest },
      withAddOn: { calculationId: withAddOn.calculationId, replayDigest: withAddOn.replayDigest },
      commercialUnit: 'managed_service',
      currency: 'CLP',
      comparison: { mode: 'same_periods', basePeriods: 3, withAddOnPeriods: 3, comparedPeriods: 3 },
      versions: {
        catalog: base.semantic.catalog.version,
        policy: base.semantic.policy.version,
        credits: base.semantic.credits.version
      }
    })
  })

  it('each figure is a frozen amount of one quote minus the same amount of the other, by period and in total', () => {
    const before = periodsOf(base)
    const after = periodsOf(withAddOn)

    expect(reading.periods.map(period => [period.periodId, period.basePeriodIds])).toEqual([
      [1, [1]],
      [2, [2]],
      [3, [3]]
    ])

    reading.periods.forEach((period, index) => {
      const net = new D(after[index].net).minus(before[index].net)
      const cost = new D(after[index].cost).minus(before[index].cost)
      const margin = new D(after[index].marginAmount).minus(before[index].marginAmount)

      expect(period.base).toMatchObject({ net: before[index].net, cost: before[index].cost })
      expect(period.withAddOn).toMatchObject({ net: after[index].net, cost: after[index].cost })
      expect(period.increment).toEqual({
        net: net.toFixed(0),
        cost: cost.toFixed(0),
        marginAmount: margin.toFixed(0),
        marginRateRoundedDown: margin.div(net).toDecimalPlaces(6, D.ROUND_FLOOR).toFixed(6)
      })
      // The margin of the increment is what its net leaves after its cost: nothing else is in it.
      expect(margin.toFixed()).toBe(net.minus(cost).toFixed())
    })

    // Over the term, the difference of the totals of the two quotes: the periods add up to it.
    const total = (key: 'net' | 'cost' | 'marginAmount') =>
      new D(totalsOf(withAddOn)[key]).minus(totalsOf(base)[key]).toFixed(0)

    expect(reading.totals).toMatchObject({
      comparedPeriods: 3,
      base: { net: totalsOf(base).net, cost: totalsOf(base).cost, marginAmount: totalsOf(base).marginAmount },
      withAddOn: { net: totalsOf(withAddOn).net, cost: totalsOf(withAddOn).cost },
      increment: { net: total('net'), cost: total('cost'), marginAmount: total('marginAmount') }
    })

    for (const key of ['net', 'cost', 'marginAmount'] as const)
      expect(
        reading.periods.reduce((sum, period) => sum.plus(period.increment[key]), new D(0)).toFixed(0)
      ).toBe(total(key))
  })

  it('the add-on quoted alone charges the cost of a line again; the increment does not', () => {
    const alone = periodsOf(standalone)

    // What the quote of the add-on alone is charged once per line whatever its dedication, as the kernel traced it:
    // a component of scope `person` taken whole. Premise: there is one, and it is not small.
    const perLine = standalone.semantic.result.quote.periods[0].result.lines
      .flatMap(row => row.components)
      .filter(component => {
        const trace: { scope?: string; share?: string } = component.trace

        return trace.scope === 'person' && trace.share === '1'
      })

    const feeOfAPeriod = perLine.reduce(
      (sum, component) => sum.plus(new D(component.cost).mul(component.trace.outputFx ?? 1)),
      new D(0)
    )

    expect(perLine.map(component => component.kind)).toEqual(['platform_fee'])
    expect(feeOfAPeriod.div(alone[0].cost).gt('0.2')).toBe(true)

    reading.periods.forEach((period, index) => {
      // Same price either way: the add-on is agreed once.
      expect(period.increment.net).toBe(alone[index].net)
      // And a cost that is lower by exactly what a line is charged once.
      expect(new D(alone[index].cost).minus(period.increment.cost).toFixed()).toBe(feeOfAPeriod.toFixed())
    })

    // In the quote with the add-on the person is still one line: the fee of the service did not move.
    expect(reading.totals.costByComponentKind.find(entry => entry.kind === 'platform_fee')).toMatchObject({
      increment: '0'
    })
    expect(reading.totals.costByComponentKind.find(entry => entry.kind === 'platform_fee')!.base).not.toBe('0')

    // What that does to the margin. The kernel holds the add-on alone under the floor of its row; the same add-on
    // read as an increment is above that same floor.
    const [row] = rowsOf(standalone)
    const floor = new D(row.minimumMargin)

    const aloneBelowFloor = standalone.semantic.result.quote.periods.every(period =>
      period.result.diagnostics.some(diagnostic => diagnostic.code === 'MARGIN_BELOW_FLOOR')
    )

    expect(aloneBelowFloor).toBe(true)
    expect(new D(totalsOf(standalone).marginRate!).lt(floor)).toBe(true)
    expect(new D(reading.totals.increment.marginRateRoundedDown!).gt(floor)).toBe(true)
    // And the service with the add-on in it holds its own floor, by the kernel's verdict.
    expect(
      withAddOn.semantic.result.quote.periods.flatMap(period =>
        period.result.diagnostics.filter(diagnostic => diagnostic.code === 'MARGIN_BELOW_FLOOR')
      )
    ).toEqual([])
  })

  it('what changed: the line that grew and the tools whose cost moved, and nothing else', () => {
    expect(reading.changed.lines).toEqual([
      {
        lineId: 'lead',
        profile: 'ECG-001',
        change: 'dedication_grew',
        periods: [
          {
            periodIds: [1, 2, 3],
            base: { headcount: 1, dedication: { unit: 'fte', value: '0.2' } },
            withAddOn: { headcount: 1, dedication: { unit: 'fte', value: '0.28' } },
            capacityIncrement: '0.08'
          }
        ]
      }
    ])
    expect(reading.changed.thirdPartyCosts).toEqual([])

    // The cost of a tool, from the attributions of each composition (in the currency of the tool) and the FX the
    // snapshot of the period froze: another road to the figure than the components the reading adds up.
    const attributed = (artifact: Artifact, toolId: string, periodId: number) =>
      artifact.semantic.result.attributions
        .filter(attribution => attribution.toolId === toolId && attribution.periodId === periodId)
        .reduce((sum, attribution) => {
          const { snapshot, request } = artifact.semantic.result.quote.resolution.inputs.find(
            input => input.periodId === periodId
          )!.input

          const rate = (from: string, to: string) =>
            from === to ? new D(1) : new D(snapshot.fx.find(fx => fx.from === from && fx.to === to)!.rate)

          return sum.plus(
            new D(attribution.attributedMonthlyCost)
              .mul(rate(attribution.resource.currency, snapshot.calculationCurrency))
              .mul(rate(snapshot.calculationCurrency, request.outputCurrency))
          )
        }, new D(0))

    const toolIds = [...new Set(withAddOn.semantic.result.attributions.map(attribution => attribution.toolId))]

    const moved = toolIds.filter(
      toolId => !attributed(withAddOn, toolId, 1).eq(attributed(base, toolId, 1))
    )

    expect(toolIds.length).toBeGreaterThan(moved.length)
    expect(reading.changed.tools.map(tool => tool.toolId)).toEqual(moved)

    for (const tool of reading.changed.tools)
      expect(tool.periods).toEqual([
        {
          periodIds: [1, 2, 3],
          base: attributed(base, tool.toolId, 1).toFixed(0),
          withAddOn: attributed(withAddOn, tool.toolId, 1).toFixed(0),
          increment: attributed(withAddOn, tool.toolId, 1).minus(attributed(base, tool.toolId, 1)).toFixed(0)
        }
      ])

    // The kinds of cost add up to the cost of the increment, within the unit each row was rounded to.
    const byKind = reading.totals.costByComponentKind.reduce((sum, entry) => sum.plus(entry.increment), new D(0))

    expect(byKind.minus(reading.totals.increment.cost).abs().lte(rowsOf(withAddOn).length)).toBe(true)
    expect(reading.totals.costByComponentKind.filter(entry => entry.increment !== '0').map(e => e.kind)).toEqual([
      'human',
      'tool'
    ])
  })

  it('the one figure a document prints is the net the add-on adds in a period', () => {
    expect(reading.netIncrementPerPeriod).toBe(periodsOf(standalone)[0].net)
    expect(new Set(reading.periods.map(period => period.increment.net))).toEqual(
      new Set([reading.netIncrementPerPeriod])
    )
  })
})

describe('two quotes are subtracted only when the difference can mean the add-on and nothing else', () => {
  it('both are calculated', () => {
    const blocked = quoted(withAddOn, demand => {
      demand.allocations = []
    })

    expect(blocked.semantic.result.quote.calculationStatus).not.toBe('calculated')

    refused(base, blocked, 'QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES', [
      { path: 'withAddOn', rule: 'not_calculated' }
    ])
    refused(blocked, withAddOn, 'QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES', [
      { path: 'base', rule: 'not_calculated' }
    ])
    refused(blocked, blocked, 'QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES', [
      { path: 'base', rule: 'not_calculated' },
      { path: 'withAddOn', rule: 'not_calculated' }
    ])
  })

  it('both quote the same thing under the same terms: one rule per term, each named', () => {
    // Quoted again by the kernel with one term changed: each is a calculated quote of something else.
    const requoted: [string, (demand: Demand) => void, Issue[]][] = [
      [
        'another account',
        demand => {
          demand.brief.accountId = 'another-account-example'
        },
        [{ path: 'brief.accountId', rule: 'account_differs' }]
      ],
      [
        'a tax that is not resolved',
        demand => {
          demand.brief.taxTreatment = { kind: 'not_resolved' }
        },
        [{ path: 'brief.taxTreatment', rule: 'tax_treatment_differs' }]
      ],
      [
        'another rate of the same tax',
        demand => {
          if (demand.brief.taxTreatment.kind === 'exclusive') demand.brief.taxTreatment.rate = '0.1'
        },
        [{ path: 'brief.taxTreatment', rule: 'tax_treatment_differs' }]
      ],
      [
        'sold by lines instead of as one service',
        demand => {
          demand.commercialUnit = 'role_capacity'
        },
        [{ path: 'commercialUnit', rule: 'commercial_unit_differs' }]
      ],
      [
        'no declared form of engagement',
        demand => {
          delete demand.brief.engagementForm
        },
        [{ path: 'brief.engagementForm', rule: 'engagement_form_differs' }]
      ]
    ]

    for (const [name, edit, issues] of requoted) {
      const other = quoted(withAddOn, edit)

      expect(other.semantic.result.quote.calculationStatus, name).toBe('calculated')
      expect(refused(base, other, 'QUOTE_INCREMENT_CONTEXT_DIFFERS').issues, name).toEqual(issues)
    }

    // The rest of the terms, on a copy of the source: the rule reads what each quote declares.
    const declared: [string, (source: Artifact) => void, Issue[]][] = [
      [
        'currency',
        source => {
          source.semantic.demand.brief.outputCurrency = 'USD'
          source.semantic.result.quote.totals!.currency = 'USD'
        },
        [
          { path: 'brief.outputCurrency', rule: 'currency_differs' },
          { path: 'totals.currency', rule: 'currency_differs' }
        ]
      ],
      [
        'offer',
        source => {
          source.semantic.demand.brief.offerId = 'another-offer'
        },
        [{ path: 'brief.offerId', rule: 'offer_differs' }]
      ],
      [
        'engagement code',
        source => {
          source.semantic.demand.brief.engagementCode = 'project'
        },
        [{ path: 'brief.engagementCode', rule: 'engagement_code_differs' }]
      ],
      [
        'market',
        source => {
          source.semantic.demand.brief.offerMarketCountry = 'CO'
        },
        [{ path: 'brief.offerMarketCountry', rule: 'market_differs' }]
      ],
      [
        'quote date',
        source => {
          source.semantic.demand.brief.quoteDate = '2026-10-12'
        },
        [{ path: 'brief.quoteDate', rule: 'quote_date_differs' }]
      ],
      [
        'mode',
        source => {
          source.semantic.demand.brief.mode = 'commercial_draft'
        },
        [{ path: 'brief.mode', rule: 'mode_differs' }]
      ],
      [
        'contingency declaration',
        source => {
          source.semantic.demand.brief.contingency = { kind: 'waived', reason: 'Declared for the test.' }
        },
        [{ path: 'brief.contingency', rule: 'contingency_differs' }]
      ]
    ]

    for (const [name, edit, issues] of declared)
      expect(refused(base, edited(withAddOn, edit), 'QUOTE_INCREMENT_CONTEXT_DIFFERS').issues, name).toEqual(issues)

    // A tax treatment written with its keys in another order is the same treatment.
    const reordered = edited(withAddOn, source => {
      const treatment = source.semantic.demand.brief.taxTreatment

      source.semantic.demand.brief.taxTreatment = Object.fromEntries(
        Object.entries(treatment).reverse()
      ) as typeof treatment
    })

    expect(Object.keys(reordered.semantic.demand.brief.taxTreatment)).not.toEqual(
      Object.keys(base.semantic.demand.brief.taxTreatment)
    )
    expect(accepted(base, reordered).totals).toEqual(accepted(base, withAddOn).totals)
  })

  it('both were frozen with the same catalog, policy and credit catalog: version and content', () => {
    // The same demand quoted with the policy version before the current one: a real quote of another source.
    const earlierPolicy = read(`${OPERATING}/resources.review-v10.json`)

    const acrossVersions = runResourceComposition(
      withAddOn.semantic.catalog,
      earlierPolicy,
      withAddOn.semantic.credits,
      withAddOn.semantic.demand
    )

    expect(acrossVersions.semantic.result.quote.calculationStatus).toBe('calculated')
    expect(earlierPolicy.version).not.toBe(base.semantic.policy.version)
    refused(base, acrossVersions, 'QUOTE_INCREMENT_VERSIONS_DIFFER', [{ path: 'policy', rule: 'version_differs' }])

    refused(
      base,
      edited(withAddOn, source => {
        source.semantic.catalog.version = 'another-catalog-version'
        source.semantic.credits.version = 'another-credit-version'
      }),
      'QUOTE_INCREMENT_VERSIONS_DIFFER',
      [
        { path: 'catalog', rule: 'version_differs' },
        { path: 'credits', rule: 'version_differs' }
      ]
    )

    // A source edited under the version it had is another source: the version names it, the content is it.
    refused(
      base,
      edited(withAddOn, source => {
        source.semantic.catalog.records[0].source.reference = 'edited-under-the-same-version'
      }),
      'QUOTE_INCREMENT_VERSIONS_DIFFER',
      [{ path: 'catalog', rule: 'content_differs' }]
    )
  })

  describe('their periods can be compared', () => {
    const onePeriod = quoted(withAddOn, demand => over(demand, 1))

    it('the same periods, each compared with its own', () => {
      expect(accepted(base, withAddOn).comparison.mode).toBe('same_periods')

      // More periods, or fewer that are not one, are neither the periods of the base nor a period that stands for
      // them.
      refused(
        base,
        quoted(withAddOn, demand => over(demand, 2)),
        'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE',
        [{ path: 'periods', rule: 'periods_differ' }]
      )
      refused(
        base,
        quoted(withAddOn, demand => over(demand, 4)),
        'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE',
        [{ path: 'periods', rule: 'periods_differ' }]
      )
      // A base of one period is not represented by three.
      refused(
        quoted(base, demand => over(demand, 1)),
        withAddOn,
        'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE',
        [{ path: 'periods', rule: 'periods_differ' }]
      )
    })

    it('a single representative period of a base that is the same in every period: the increment is per period', () => {
      const reading = accepted(base, onePeriod)
      const [after] = periodsOf(onePeriod)
      const before = periodsOf(base)

      expect(reading.comparison).toEqual({
        mode: 'representative_period',
        basePeriods: 3,
        withAddOnPeriods: 1,
        comparedPeriods: 1
      })
      expect(reading.periods).toHaveLength(1)
      expect(reading.periods[0].basePeriodIds).toEqual([1, 2, 3])

      // Whichever period of the base it is read against, the increment is the same: that is what «representative»
      // means, and why the base must be the same in all of them.
      for (const period of before)
        expect(reading.periods[0].increment).toMatchObject({
          net: new D(after.net).minus(period.net).toFixed(0),
          cost: new D(after.cost).minus(period.cost).toFixed(0),
          marginAmount: new D(after.marginAmount).minus(period.marginAmount).toFixed(0)
        })

      // One period, multiplied by nothing: no input says in how many periods the add-on runs.
      expect(reading.totals.comparedPeriods).toBe(1)
      expect(reading.totals.increment).toEqual(reading.periods[0].increment)
      expect(reading.totals.base.net).toBe(before[0].net)
      // And it is the increment of a period of the same quote over the whole term.
      expect(reading.periods[0].increment).toEqual(accepted(base, withAddOn).periods[0].increment)
      expect(reading.netIncrementPerPeriod).toBe(accepted(base, withAddOn).netIncrementPerPeriod)
    })

    it('a base that changes over its periods is represented by no single period', () => {
      // The lead works fewer points in the third month. The fee is agreed, so the net is the same every month; the
      // cost and the lines are not.
      const unevenBase = quoted(base, demand => {
        demand.brief.lines[1].dedicationByPeriod = [{ periodId: 3, dedication: { unit: 'fte', value: '0.1' } }]
      })

      expect(new Set(periodsOf(unevenBase).map(period => period.net)).size).toBe(1)
      expect(new Set(periodsOf(unevenBase).map(period => period.cost)).size).toBe(2)

      refused(unevenBase, onePeriod, 'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE', [
        { path: 'base.periods.3', rule: 'cost_differs_between_periods' },
        { path: 'base.periods.3', rule: 'lines_differ_between_periods' }
      ])

      // Without the agreed fee the net follows the cost: the three differences are named.
      refused(
        quoted(unevenBase, demand => {
          demand.brief.adjustments = []
        }),
        onePeriod,
        'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE',
        [
          { path: 'base.periods.3', rule: 'net_differs_between_periods' },
          { path: 'base.periods.3', rule: 'cost_differs_between_periods' },
          { path: 'base.periods.3', rule: 'lines_differ_between_periods' }
        ]
      )

      // Compared period by period, the same base is comparable: each month is read against its own.
      const unevenWithAddOn = quoted(withAddOn, demand => {
        demand.brief.lines[1].dedicationByPeriod = [{ periodId: 3, dedication: { unit: 'fte', value: '0.18' } }]
      })

      expect(accepted(unevenBase, unevenWithAddOn).changed.lines[0].periods).toEqual([
        {
          periodIds: [1, 2],
          base: { headcount: 1, dedication: { unit: 'fte', value: '0.2' } },
          withAddOn: { headcount: 1, dedication: { unit: 'fte', value: '0.28' } },
          capacityIncrement: '0.08'
        },
        {
          periodIds: [3],
          base: { headcount: 1, dedication: { unit: 'fte', value: '0.1' } },
          withAddOn: { headcount: 1, dedication: { unit: 'fte', value: '0.18' } },
          capacityIncrement: '0.08'
        }
      ])
    })

    it('a representative period charges nothing once', () => {
      // A setup is charged once and is not a cost of every period. No kit of the example has one, so the row is
      // written on a copy of the frozen period.
      const withSetup = edited(onePeriod, source => {
        source.semantic.result.quote.periods[0].result.lines[0].kind = 'setup'
      })

      refused(base, withSetup, 'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE', [
        { path: 'withAddOn.periods.1', rule: 'one_off_in_representative_period' }
      ])
    })

    it('in both quotes the periods add up to the totals', () => {
      const moved = (artifact: Artifact) =>
        edited(artifact, source => {
          const totals = source.semantic.result.quote.totals!

          totals.cost = new D(totals.cost).plus(1).toFixed(0)
        })

      refused(moved(base), withAddOn, 'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE', [
        { path: 'base', rule: 'periods_differ_from_totals' }
      ])
      refused(base, moved(withAddOn), 'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE', [
        { path: 'withAddOn', rule: 'periods_differ_from_totals' }
      ])
    })
  })

  describe('the quote with the add-on contains the base', () => {
    const everyPeriod = (path: string, rule: string) => [1, 2, 3].map(id => ({ path: `${path}.periods.${id}`, rule }))

    it('every line of the base is in it, with its identity', () => {
      const cases: [string, (demand: Demand) => void, Issue[]][] = [
        [
          'a line of the base is gone',
          demand => {
            demand.brief.lines = demand.brief.lines.filter(line => line.lineId !== 'agents')
            demand.work = demand.work.filter(work => work.lineId !== 'agents')
            demand.brief.adjustments[0].lineIds = ['care', 'lead']
            seats(demand, 2, '1.28')
          },
          [{ path: 'base.lines.2', rule: 'line_missing' }]
        ],
        [
          'another profile',
          demand => {
            demand.brief.lines[1].profile = 'ECG-016'
          },
          [{ path: 'base.lines.1', rule: 'profile_differs' }]
        ],
        [
          'another country',
          demand => {
            demand.brief.lines[1].talentCountry = 'CO'
          },
          [{ path: 'base.lines.1', rule: 'country_differs' }]
        ],
        [
          // The allocation mode comes with its policy, which is part of the basis the line is priced by.
          'another allocation mode',
          demand => {
            demand.brief.lines[1].allocationMode = 'dedicated'
            demand.brief.lines[1].allocationPolicyId = 'allocation:dedicated'
          },
          [
            { path: 'base.lines.1', rule: 'allocation_mode_differs' },
            { path: 'base.lines.1', rule: 'basis_differs' }
          ]
        ],
        [
          'a kit choice of the base is gone',
          demand => {
            demand.brief.lines[0].choices = demand.brief.lines[0].choices.slice(0, 1)
          },
          [{ path: 'base.lines.0', rule: 'choice_missing' }]
        ]
      ]

      for (const [name, edit, issues] of cases) {
        const other = quoted(withAddOn, edit)

        expect(other.semantic.result.quote.calculationStatus, name).toBe('calculated')
        expect(refused(base, other, 'QUOTE_INCREMENT_BASE_NOT_CONTAINED').issues, name).toEqual(issues)
      }
    })

    it('in every period the base has a line, with at least its people and its dedication', () => {
      const cases: [string, Artifact, Artifact, Issue[]][] = [
        [
          'less dedication of a line the add-on does not touch',
          base,
          quoted(withAddOn, demand => {
            demand.brief.lines[2].dedication.value = '0.05'
          }),
          everyPeriod('base.lines.2', 'dedication_smaller')
        ],
        [
          'less dedication in one month only',
          base,
          quoted(withAddOn, demand => {
            demand.brief.lines[1].dedicationByPeriod = [{ periodId: 3, dedication: { unit: 'fte', value: '0.1' } }]
          }),
          [{ path: 'base.lines.1.periods.3', rule: 'dedication_smaller' }]
        ],
        [
          'a dedication in another unit cannot be said to be more or less',
          base,
          quoted(withAddOn, demand => {
            demand.brief.lines[1].dedication = { unit: 'hours_per_month', value: '50' }
          }),
          everyPeriod('base.lines.1', 'dedication_unit_differs')
        ],
        [
          // The lead leaves in the third month: two people keep their seats there.
          'a line that is not active in a month the base has it',
          base,
          quoted(withAddOn, demand => {
            demand.brief.lines[1].activePeriods = [1, 2]

            const lastMonth = clone(seats(demand, 3, '1.38', [1, 2]))

            demand.allocations.push(...lastMonth)
            seats({ ...demand, allocations: lastMonth }, 2, '1.1', [3])
          }),
          [{ path: 'base.lines.1.periods.3', rule: 'line_not_active' }]
        ],
        [
          // A base with two agent specialists against a quote with one.
          'fewer people on a line',
          quoted(base, demand => {
            demand.brief.lines[2].headcount = 2
            demand.work[2].assigneeIds = ['agents-slot', 'agents-slot-b']
            seats(demand, 4, '1.4')
          }),
          withAddOn,
          everyPeriod('base.lines.2', 'headcount_smaller')
        ]
      ]

      for (const [name, from, to, issues] of cases) {
        for (const artifact of [from, to]) expect(artifact.semantic.result.quote.calculationStatus, name).toBe('calculated')
        expect(refused(from, to, 'QUOTE_INCREMENT_BASE_NOT_CONTAINED').issues, name).toEqual(issues)
      }
    })

    it('every third-party cost of the base is in it, unchanged and in at least the same periods', () => {
      // The committed managed service with suppliers: three re-invoiced costs and one the client pays apart.
      const costs = thirdParty.semantic.demand.brief.thirdPartyCosts!

      expect(costs.map(cost => [cost.costId, cost.settlement])).toEqual([
        ['tp-production', 'reinvoiced'],
        ['tp-talent', 'reinvoiced'],
        ['tp-media', 'reinvoiced'],
        ['tp-stock', 'client_direct']
      ])

      refused(
        thirdParty,
        quoted(thirdParty, demand => {
          demand.brief.thirdPartyCosts = demand.brief.thirdPartyCosts!.filter(cost => cost.costId !== 'tp-talent')
        }),
        'QUOTE_INCREMENT_BASE_NOT_CONTAINED',
        [{ path: 'base.thirdPartyCosts.1', rule: 'cost_missing' }]
      )
      refused(
        thirdParty,
        quoted(thirdParty, demand => {
          demand.brief.thirdPartyCosts![0].amount = '5000000'
        }),
        'QUOTE_INCREMENT_BASE_NOT_CONTAINED',
        [{ path: 'base.thirdPartyCosts.0', rule: 'cost_differs' }]
      )
      // Also a cost the client pays apart: it is in no figure, and it is part of what the base says.
      refused(
        thirdParty,
        quoted(thirdParty, demand => {
          demand.brief.thirdPartyCosts = demand.brief.thirdPartyCosts!.filter(cost => cost.costId !== 'tp-stock')
        }),
        'QUOTE_INCREMENT_BASE_NOT_CONTAINED',
        [{ path: 'base.thirdPartyCosts.3', rule: 'cost_missing' }]
      )

      // The example with a supplier in its first two months, against the same supplier in the first only.
      const twoMonths = quoted(base, demand => {
        demand.brief.thirdPartyCosts = [reinvoiced('tp-production', [1, 2])]
      })

      refused(
        twoMonths,
        quoted(withAddOn, demand => {
          demand.brief.thirdPartyCosts = [reinvoiced('tp-production', [1])]
        }),
        'QUOTE_INCREMENT_BASE_NOT_CONTAINED',
        [{ path: 'base.thirdPartyCosts.0', rule: 'period_missing' }]
      )
      // With the supplier in the same months the add-on is the add-on: the supplier is in both and in no difference.
      expect(
        accepted(
          twoMonths,
          quoted(withAddOn, demand => {
            demand.brief.thirdPartyCosts = [reinvoiced('tp-production', [1, 2])]
          })
        ).totals.increment
      ).toEqual(accepted(base, withAddOn).totals.increment)
    })

    it('every tool the base charges to a line is still charged to that line', () => {
      // The inbox the dedicated person works with becomes a tool the client provides: its cost leaves the quote.
      const clientProvides = quoted(withAddOn, demand => {
        demand.allocations = demand.allocations.filter(allocation => allocation.toolId !== 'social-inbox')
        demand.clientProvidedTools = [
          {
            periodIds: [1, 2, 3],
            toolId: 'social-inbox',
            lineIds: ['care'],
            reason: 'Declared for the test.',
            evidence: EVIDENCE
          }
        ]
      })

      expect(clientProvides.semantic.result.quote.calculationStatus).toBe('calculated')
      expect(new D(totalsOf(clientProvides).cost).lt(totalsOf(base).cost)).toBe(true)

      const inbox = base.semantic.result.attributions.flatMap((attribution, index) =>
        attribution.toolId === 'social-inbox' ? [{ path: `base.attributions.${index}`, rule: 'tool_missing' }] : []
      )

      expect(inbox).toHaveLength(3)
      refused(base, clientProvides, 'QUOTE_INCREMENT_BASE_NOT_CONTAINED', inbox)
    })

    it('what the add-on brings besides dedication is part of the increment, and is named', () => {
      // A new person: an analyst with a fourth seat, at eight points.
      const newLine = quoted(withAddOn, demand => {
        demand.brief.lines.push({ ...clone(demand.brief.lines[2]), lineId: 'analyst', profile: 'ECG-019' })
        demand.brief.lines[3].dedication.value = '0.08'
        demand.work.push({ lineId: 'analyst', assigneeIds: ['analyst-slot'], tasks: [], aiToolIds: [], creditDemand: [] })
        demand.brief.adjustments[0].lineIds.push('analyst')
        seats(demand, 4, '1.46')
      })

      expect(newLine.semantic.result.quote.calculationStatus).toBe('calculated')

      const withLine = accepted(base, newLine)

      expect(withLine.changed.lines.map(line => [line.lineId, line.change])).toEqual([
        ['lead', 'dedication_grew'],
        ['analyst', 'added']
      ])
      expect(withLine.changed.lines[1].periods).toEqual([
        {
          periodIds: [1, 2, 3],
          base: null,
          withAddOn: { headcount: 1, dedication: { unit: 'fte', value: '0.08' } },
          capacityIncrement: '0.08'
        }
      ])
      // A line of its own is charged once per line, like any line: this time the fee is part of the increment.
      expect(
        new D(withLine.totals.costByComponentKind.find(entry => entry.kind === 'platform_fee')!.increment).gt(0)
      ).toBe(true)

      // A supplier bought for the add-on in the first month, and a licence its client pays apart.
      const withSuppliers = quoted(withAddOn, demand => {
        demand.brief.thirdPartyCosts = [
          reinvoiced('tp-production'),
          {
            costId: 'tp-licence',
            category: 'licences',
            label: 'Licencia de ejemplo',
            supplier: 'Proveedor de ejemplo',
            settlement: 'client_direct',
            amount: '100.00',
            currency: 'USD',
            quantity: '1',
            periodIds: [1, 2, 3]
          }
        ]
      })

      const reading = accepted(base, withSuppliers)

      expect(reading.changed.thirdPartyCosts).toEqual([
        { costId: 'tp-production', settlement: 'reinvoiced', change: 'added', periodIds: [1] },
        { costId: 'tp-licence', settlement: 'client_direct', change: 'added', periodIds: [1, 2, 3] }
      ])
      // The supplier is in the first month only: the add-on does not add the same to every period.
      expect(reading.netIncrementPerPeriod).toBeNull()
      expect(new D(reading.periods[0].increment.net).gt(reading.periods[1].increment.net)).toBe(true)
      expect(reading.periods[1].increment).toEqual(accepted(base, withAddOn).periods[1].increment)
    })
  })

  it('the net grows in every compared period; nothing is asked of the cost', () => {
    const everyPeriod = [1, 2, 3].map(id => ({ path: `periods.${id}`, rule: 'net_increment_not_positive' }))

    // More dedication at the fee of the base: a quote worth the same has no add-on to price.
    refused(
      base,
      quoted(withAddOn, demand => {
        demand.brief.adjustments[0] = clone(base.semantic.demand.brief.adjustments[0])
      }),
      'QUOTE_INCREMENT_NET_NOT_POSITIVE',
      everyPeriod
    )
    // A quote against itself, and a quote worth less.
    refused(base, base, 'QUOTE_INCREMENT_NET_NOT_POSITIVE', everyPeriod)
    refused(
      base,
      quoted(base, demand => agreeAt(demand, '5000000')),
      'QUOTE_INCREMENT_NET_NOT_POSITIVE',
      everyPeriod
    )

    // A price with no work behind it is an increment: its cost is zero and the reading says so.
    const priceOnly = accepted(
      base,
      quoted(base, demand => agreeAt(demand, '5700000'))
    )

    expect(priceOnly.totals.increment).toEqual({
      net: '150000',
      cost: '0',
      marginAmount: '150000',
      marginRateRoundedDown: '1.000000'
    })
    expect(priceOnly.changed).toEqual({ lines: [], tools: [], thirdPartyCosts: [] })
  })

  it('the rules are checked in order, and the first one that fails is the one reported', () => {
    // Another account AND a line gone AND the same fee: the first of the three is what is wrong.
    const several = quoted(withAddOn, demand => {
      demand.brief.accountId = 'another-account-example'
      demand.brief.lines[2].dedication.value = '0.05'
      demand.brief.adjustments[0] = clone(base.semantic.demand.brief.adjustments[0])
    })

    refused(base, several, 'QUOTE_INCREMENT_CONTEXT_DIFFERS')

    const withoutTheFirst = quoted(several, demand => {
      demand.brief.accountId = base.semantic.demand.brief.accountId
    })

    refused(base, withoutTheFirst, 'QUOTE_INCREMENT_BASE_NOT_CONTAINED')
  })

  it('a rejection stays bounded however many places differ, and every code is registered', () => {
    // A base of forty periods against one that stands for none of them would name every period.
    const many = edited(base, source => {
      const [period] = source.semantic.result.quote.periods
      const [input] = source.semantic.result.quote.resolution.inputs

      source.semantic.result.quote.periods = Array.from({ length: 40 }, (_, index) => ({
        ...clone(period),
        periodId: index + 1,
        result: {
          ...clone(period.result),
          totals: { ...period.result.totals!, net: String(5650000 + index), cost: String(3076309 + index) }
        }
      })) as typeof source.semantic.result.quote.periods
      source.semantic.result.quote.resolution.inputs = Array.from({ length: 40 }, (_, index) => ({
        ...clone(input),
        periodId: index + 1
      }))
    })

    const outcome = refused(
      many,
      quoted(withAddOn, demand => over(demand, 1)),
      'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE'
    )

    expect(outcome.issues).toHaveLength(20)

    for (const code of [
      'QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES',
      'QUOTE_INCREMENT_CONTEXT_DIFFERS',
      'QUOTE_INCREMENT_VERSIONS_DIFFER',
      'QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE',
      'QUOTE_INCREMENT_BASE_NOT_CONTAINED',
      'QUOTE_INCREMENT_NET_NOT_POSITIVE'
    ] satisfies QuoteIncrementRejectionCode[])
      expect(PRICING_V3_DOMAIN_ERROR_CODES).toContain(code)
  })
})

// ---- the document ----

// No digit in any text: a figure found in the emitted data can only have come from a frozen quote.
const texts = (options: Json = { conversations: { label: 'Bloque adicional', unit: 'al mes' } }): Json => ({
  schemaVersion: QUOTE_DOCUMENT_BRIEF_VERSION,
  reference: 'Borrador · Prueba',
  supplier: {
    name: 'Emisor de prueba SpA',
    taxId: 'Identificación del emisor',
    contact: 'Equipo comercial',
    email: 'comercial@example.com',
    phone: '+56 2 2000 0000'
  },
  buyer: { name: 'Cliente de ejemplo', unit: 'Equipo de marketing', taxId: 'Identificación por confirmar' },
  cover: { label: 'Borrador · Sin validez comercial', title: ['Título', 'de prueba.'], subtitle: 'Subtítulo.' },
  service: { name: 'Servicio de prueba' },
  scope: { title: 'Alcance', intro: 'Introducción.', rows: [{ title: 'Entrega', text: 'Descripción.' }] },
  schedule: { title: 'Calendario', note: 'Nota.', phases: [{ label: 'Inicio', title: 'Fase', text: 'Descripción.' }] },
  pricing: { title: 'Precio', intro: 'Introducción.', summary: 'Resumen.', taxNote: 'Nota de impuestos.' },
  conditions: { title: 'Condiciones', rows: [{ title: 'Plazo', text: 'Descripción.' }] },
  ...(Object.keys(options).length ? { options } : {})
})

type DocumentOption = QuoteDocumentOption | QuoteDocumentIncrement

const asIncrement = (key: string, from: Artifact, to: Artifact): QuoteDocumentIncrement => ({
  key,
  increment: accepted(from, to)
})

const asOption = (key: string, artifact: Artifact): QuoteDocumentOption => ({
  key,
  result: artifact.semantic.result,
  identity: artifact
})

const document = (options: DocumentOption[], brief: unknown = texts(), of: Artifact = base) =>
  composeQuoteDocument(of.semantic.result, of, brief, options)

const emitted = (options: DocumentOption[], brief: unknown = texts(), of: Artifact = base) => {
  const outcome = document(options, brief, of)

  if (!outcome.ok) throw new Error(`document rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

  return outcome.reading
}

const leaves = (value: unknown): string[] =>
  typeof value === 'object' && value !== null ? Object.values(value).flatMap(leaves) : [String(value)]

const keysOf = (value: unknown): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, item]) => [...(Array.isArray(value) ? [] : [key]), ...keysOf(item)])
    : []

describe('in the document, an increment is an option with another source for its price', () => {
  const increment = asIncrement('conversations', base, withAddOn)
  const option = asOption('conversations', standalone)

  it('the price printed is the net the add-on adds in a period: the same either way the add-on is quoted', () => {
    const fromIncrement = emitted([increment])
    const fromOption = emitted([option])
    const { source: incrementSource, ...printed } = fromIncrement
    const { source: optionSource, ...printedFromOption } = fromOption

    expect(fromIncrement.options!.items).toEqual([
      { label: 'Bloque adicional', net: periodsOf(standalone)[0].net, unit: 'al mes' }
    ])
    expect(fromIncrement.options!.items[0].net).toBe(
      new D(periodsOf(withAddOn)[0].net).minus(periodsOf(base)[0].net).toFixed(0)
    )
    // Everything a reader of the document sees is the same; only the trace of the price differs.
    expect(printed).toEqual(printedFromOption)
    expect(optionSource).toEqual({
      system: 'pricing-v3',
      calculationId: base.calculationId,
      digest: base.replayDigest,
      engineVersion: base.semantic.result.quote.periods[0].result.engineVersion,
      option1CalculationId: standalone.calculationId,
      option1Digest: standalone.replayDigest
    })
    // The calculation named is the quote with the add-on in it, and the trace says the price is a difference.
    expect(incrementSource).toEqual({
      ...optionSource,
      option1CalculationId: withAddOn.calculationId,
      option1Digest: withAddOn.replayDigest,
      option1Basis: 'increment'
    })
  })

  it('it enters no line, net, tax or total, and nothing internal of the increment reaches the document', () => {
    const without = emitted([], texts({}))
    const { options, source, ...quote } = emitted([increment])
    const { source: plainSource, ...plain } = without

    expect(options).toBeDefined()
    expect(quote).toEqual(plain)
    expect(source).toMatchObject(plainSource)

    // The reading holds the cost and the margin of the add-on; the document holds its price.
    const internal = increment.increment
    const data = { options, source, ...quote }

    for (const figure of [
      internal.totals.increment.cost,
      internal.totals.increment.marginAmount,
      internal.totals.increment.marginRateRoundedDown!,
      internal.periods[0].increment.cost,
      internal.periods[0].increment.marginAmount,
      internal.totals.withAddOn.net,
      internal.totals.withAddOn.cost,
      internal.periods[0].withAddOn.net
    ])
      expect(leaves(data), figure).not.toContain(figure)

    expect(keysOf(data).filter(key => /cost|margin|increment/i.test(key))).toEqual([])
    expect(JSON.stringify(data)).not.toMatch(/"conversations"|ECG-/)
  })

  it('it shares the block, the order of the brief and the limit of eight with the other options', () => {
    const motion = asOption('motion', frozen(`${COURTESY}.option-motion.artifact.json`))

    const both = emitted(
      [motion, increment],
      texts({
        conversations: { label: 'Bloque adicional', unit: 'al mes' },
        motion: { label: 'Edición de video', unit: 'por campaña' }
      })
    )

    expect(both.options!.items.map(item => item.net)).toEqual([
      periodsOf(standalone)[0].net,
      motion.result.quote.periods[0].result.totals!.net
    ])
    expect(both.source).toMatchObject({
      option1CalculationId: withAddOn.calculationId,
      option1Basis: 'increment',
      option2CalculationId: motion.identity.calculationId
    })
    expect(both.source).not.toHaveProperty('option2Basis')

    // Nine between the two kinds are one too many.
    const nine: DocumentOption[] = [
      ...Array.from({ length: 5 }, (_, index) => ({ ...motion, key: `o${index}` })),
      ...Array.from({ length: 4 }, (_, index) => ({ ...increment, key: `i${index}` }))
    ]

    const outcome = document(nine, texts(Object.fromEntries(nine.map(o => [o.key, { label: 'Opción', unit: 'al mes' }]))))

    expect(outcome).toMatchObject({ ok: false, code: 'QUOTE_DOCUMENT_OPTION_INVALID' })
    expect(!outcome.ok && outcome.issues).toContainEqual({ path: 'options', rule: 'too_many' })
  })

  it('the brief names exactly the keys passed, whichever way each is priced', () => {
    expect(document([increment], texts({}))).toMatchObject({
      ok: false,
      code: 'QUOTE_DOCUMENT_BRIEF_INVALID',
      issues: [{ path: 'options', rule: 'option_not_named' }]
    })
    expect(document([], texts())).toMatchObject({
      ok: false,
      code: 'QUOTE_DOCUMENT_BRIEF_INVALID',
      issues: [{ path: 'options.0', rule: 'unknown_key' }]
    })
    // The price of an increment is not the brief's to give either.
    expect(
      document([increment], texts({ conversations: { label: 'Bloque', unit: 'al mes', net: '300000' } }))
    ).toMatchObject({
      ok: false,
      code: 'QUOTE_DOCUMENT_BRIEF_INVALID',
      issues: [{ path: 'options.0', rule: 'unknown_field' }]
    })
  })

  it('an increment is one amount over the quote of the document, or it is rejected by its place in the list', () => {
    const motion = asOption('motion', frozen(`${COURTESY}.option-motion.artifact.json`))

    // The same service agreed at another fee: a base of its own, and an increment over it.
    const otherBase = quoted(base, demand => agreeAt(demand, '5660000'))

    const withSupplier = quoted(withAddOn, demand => {
      demand.brief.thirdPartyCosts = [reinvoiced('tp-production')]
    })

    const clientPays = quoted(withAddOn, demand => {
      demand.brief.thirdPartyCosts = [
        {
          costId: 'tp-licence',
          category: 'licences',
          label: 'Licencia de ejemplo',
          supplier: 'Proveedor de ejemplo',
          settlement: 'client_direct',
          amount: '100.00',
          currency: 'USD',
          quantity: '1',
          periodIds: [1, 2, 3]
        }
      ]
    })

    const reading = (edit: (reading: QuoteIncrementReading) => void): QuoteDocumentIncrement => {
      const copy = clone(increment)

      edit(copy.increment)

      return copy
    }

    const cases: [string, DocumentOption[], Issue[]][] = [
      [
        'an increment over another quote',
        [asIncrement('a', otherBase, withAddOn)],
        [{ path: 'options.0', rule: 'increment_of_another_quote' }]
      ],
      [
        // A supplier in the first month: «al mes» would be true of two of the three.
        'a net that differs between periods',
        [motion, asIncrement('a', base, withSupplier)],
        [{ path: 'options.1', rule: 'net_differs_between_periods' }]
      ],
      [
        'a cost the client pays apart that the quote of the document does not have',
        [asIncrement('a', base, clientPays)],
        [{ path: 'options.0', rule: 'client_pays_costs_directly' }]
      ],
      [
        'the quote with the add-on passed twice',
        [increment, { ...increment, key: 'again' }],
        [{ path: 'options.1', rule: 'duplicate_option' }]
      ],
      [
        'one key for an option and an increment',
        [option, increment],
        [{ path: 'options.1', rule: 'duplicate_key' }]
      ],
      ['a key that is not a name', [{ ...increment, key: 'dos palabras' }], [{ path: 'options.0', rule: 'invalid_key' }]],
      // What no pair of verified quotes yields, on a copy of the reading: the document trusts no figure it can check.
      [
        'an amount the template does not take',
        [
          reading(copy => {
            copy.netIncrementPerPeriod = '300000.5'
          })
        ],
        [{ path: 'options.0', rule: 'amount_not_representable' }]
      ],
      [
        'another currency',
        [
          reading(copy => {
            copy.currency = 'USD'
          })
        ],
        [{ path: 'options.0', rule: 'currency_differs_from_quote' }]
      ],
      [
        'the quote of the document as its own add-on',
        [
          reading(copy => {
            copy.withAddOn = { calculationId: base.calculationId, replayDigest: base.replayDigest }
          })
        ],
        [{ path: 'options.0', rule: 'same_as_quote' }]
      ]
    ]

    for (const [name, options, issues] of cases) {
      const brief = texts(Object.fromEntries(options.map(o => [o.key, { label: 'Opción', unit: 'al mes' }])))
      const outcome = document(options, brief)

      expect(outcome, name).toMatchObject({ ok: false, code: 'QUOTE_DOCUMENT_OPTION_INVALID' })
      expect(!outcome.ok && outcome.issues, name).toEqual(issues)
      // The scaffold lists no price for an option the document would refuse.
      expect(scaffoldQuoteDocumentBrief(base.semantic.result, base, options), name).toMatchObject({
        ok: false,
        code: 'QUOTE_DOCUMENT_OPTION_INVALID'
      })
    }
  })

  it('the scaffold lists it with its price and says how it is priced; any other scaffold is the one it was', () => {
    const scaffold = (options: DocumentOption[]) => {
      const outcome = scaffoldQuoteDocumentBrief(base.semantic.result, base, options)

      if (!outcome.ok) throw new Error(`scaffold rejected: ${outcome.code}`)

      return clone(outcome.reading) as Json & { optional: Json; brief: Json }
    }

    const withIncrement = scaffold([increment])
    const withOption = scaffold([option])
    const plain = scaffold([])

    expect(withIncrement.options).toEqual([
      {
        key: 'conversations',
        net: periodsOf(standalone)[0].net,
        currency: 'CLP',
        periods: 3,
        calculationId: withAddOn.calculationId,
        basis: 'increment'
      }
    ])
    expect(withIncrement.brief.options).toEqual({ conversations: { label: '', unit: '' } })
    expect(Object.keys(withIncrement.optional)).toContain('options (increment)')

    // An option priced by its own quote, and no option at all: neither says anything of increments.
    expect(withOption.options).toEqual([
      {
        key: 'conversations',
        net: periodsOf(standalone)[0].net,
        currency: 'CLP',
        periods: 3,
        calculationId: standalone.calculationId
      }
    ])
    for (const other of [withOption, plain]) expect(Object.keys(other.optional)).not.toContain('options (increment)')
    expect(Object.keys(withIncrement.optional).filter(key => key !== 'options (increment)')).toEqual(
      Object.keys(plain.optional)
    )
  })

  it('the committed example: brief, artifacts and data in step, and the template totals what the quote froze', async () => {
    const outcome = document([increment], read(`${EXAMPLE}.document-brief.json`))

    if (!outcome.ok) throw new Error(`document rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

    expect(print(outcome.reading)).toBe(readFileSync(`${EXAMPLE}.document.json`, 'utf8'))

    const data = outcome.reading
    const totals = totalsOf(base)

    expect(data.net).toBe(totals.net)
    expect(data.taxAmount).toBe(totals.tax)
    expect(data.options!.items.map(item => item.net)).toEqual([periodsOf(standalone)[0].net])
    // The buyer of an example is invented.
    expect(data.buyer.name).toBe('Cliente de ejemplo')

    // The generator of the A4 quote is the consumer of the data: it takes it, and totals the quote without the option.
    const template: {
      validateQuote: (data: unknown) => unknown
      quoteAmounts: (data: unknown) => { net: number; vat: number | null; total: number | null }
    } = await import(
      /* @vite-ignore */ pathToFileURL(resolve('.', 'scripts/documents/render-cotizacion-a4.mjs')).href
    )

    const written = JSON.parse(print(data))

    template.validateQuote(written)
    expect(template.quoteAmounts(written)).toMatchObject({
      net: Number(totals.net),
      vat: Number(totals.tax),
      total: Number(totals.grandTotal)
    })
  })
})

describe('compose increment and compose document --increment (CLI)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-quote-increment-'))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const cli = (...args: string[]) =>
    spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

  const report = (...args: string[]) => {
    const run = cli(...args)

    expect(run.status).toBe(1)
    expect(run.stdout).toBe('')

    return JSON.parse(run.stderr).error as { code: string; option?: string; issues?: Issue[] }
  }

  const BASE = `${EXAMPLE}.artifact.json`
  const WITH_ADD_ON = `${EXAMPLE}.with-addon.artifact.json`
  const STANDALONE = `${EXAMPLE}.option-standalone.artifact.json`

  it('compose increment prints and writes the reading of the two artifacts and exits 3', () => {
    const out = join(dir, 'increment.json')
    const run = cli('compose', 'increment', '--input', WITH_ADD_ON, '--base', BASE, '--out', out)

    expect(run.status).toBe(3)
    // The committed example is what the command prints, to the byte, and what it writes.
    expect(run.stdout).toBe(readFileSync(`${EXAMPLE}.increment.json`, 'utf8'))
    expect(readFileSync(out, 'utf8')).toBe(run.stdout)
  })

  it('both artifacts are verified by replay, and a rejection exits 1 with the code of the rule that failed', () => {
    expect(report('compose', 'increment', '--input', WITH_ADD_ON)).toMatchObject({
      code: 'MISSING_ARGUMENT',
      option: 'base'
    })
    expect(report('compose', 'increment', '--base', BASE)).toMatchObject({ code: 'MISSING_ARGUMENT', option: 'input' })
    expect(report('compose', 'increment', '--input', WITH_ADD_ON, '--base', join(dir, 'missing.json'))).toMatchObject({
      code: 'INPUT_NOT_FOUND',
      option: 'base'
    })
    // A document brief is not a frozen quote, in either place.
    expect(
      report('compose', 'increment', '--input', WITH_ADD_ON, '--base', `${EXAMPLE}.document-brief.json`)
    ).toMatchObject({ code: 'REPLAY_MISMATCH', option: 'base' })
    expect(
      report('compose', 'increment', '--input', `${EXAMPLE}.document-brief.json`, '--base', BASE)
    ).toMatchObject({ code: 'REPLAY_MISMATCH', option: 'input' })

    // The two artifacts the wrong way round: the «base» has more dedication than the quote that should contain it.
    expect(report('compose', 'increment', '--input', BASE, '--base', WITH_ADD_ON)).toEqual({
      code: 'QUOTE_INCREMENT_BASE_NOT_CONTAINED',
      message: expect.any(String),
      option: 'input',
      issues: [1, 2, 3].map(id => ({ path: `base.lines.1.periods.${id}`, rule: 'dedication_smaller' }))
    })
    // The add-on quoted alone is not the service with the add-on in it.
    expect(report('compose', 'increment', '--input', STANDALONE, '--base', BASE)).toMatchObject({
      code: 'QUOTE_INCREMENT_BASE_NOT_CONTAINED',
      option: 'input'
    })
    // Another offer for another account: the designer example is no quote of this service.
    expect(report('compose', 'increment', '--input', `${COURTESY}.artifact.json`, '--base', BASE)).toMatchObject({
      code: 'QUOTE_INCREMENT_CONTEXT_DIFFERS',
      option: 'input'
    })

    // Only this reading takes a base.
    expect(report('compose', 'preview', '--input', BASE, '--base', BASE)).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'base'
    })
  })

  it('compose document --increment: the scaffold lists it, and the brief of the example yields its data', () => {
    const flags = ['--increment', `conversations=${WITH_ADD_ON}`]
    const scaffolded = cli('compose', 'document', '--input', BASE, ...flags)

    expect(scaffolded.status).toBe(2)
    expect(JSON.parse(scaffolded.stdout).options).toEqual([
      {
        key: 'conversations',
        net: periodsOf(standalone)[0].net,
        currency: 'CLP',
        periods: 3,
        calculationId: withAddOn.calculationId,
        basis: 'increment'
      }
    ])

    const out = join(dir, 'document.json')
    const run = cli('compose', 'document', '--input', BASE, '--brief', `${EXAMPLE}.document-brief.json`, ...flags, '--out', out)

    expect(run.status).toBe(3)
    expect(run.stdout).toBe(readFileSync(`${EXAMPLE}.document.json`, 'utf8'))
    expect(readFileSync(out, 'utf8')).toBe(run.stdout)

    // The same add-on passed as the option quoted alone prints the same document but for the trace of its price.
    const asOptionRun = cli(
      'compose',
      'document',
      '--input',
      BASE,
      '--brief',
      `${EXAMPLE}.document-brief.json`,
      '--option',
      `conversations=${STANDALONE}`
    )

    const { source: optionSource, ...printedFromOption } = JSON.parse(asOptionRun.stdout)
    const { source, ...printed } = JSON.parse(run.stdout)

    expect(asOptionRun.status).toBe(3)
    expect(printedFromOption).toEqual(printed)
    expect(optionSource.option1CalculationId).toBe(standalone.calculationId)
    expect(source.option1CalculationId).toBe(withAddOn.calculationId)
  })

  it('an increment is `key=artifact` like an option; a rejection names the flag and the place in the list', () => {
    const document = ['compose', 'document', '--input', BASE]
    const motion = `${COURTESY}.option-motion.artifact.json`

    for (const malformed of [[WITH_ADD_ON], ['=x.json'], ['dos palabras=x.json']])
      expect(report(...document, ...malformed.flatMap(value => ['--increment', value]))).toMatchObject({
        code: 'INVALID_ARGUMENT',
        option: 'increment'
      })

    // One key for two add-ons, across the two flags: the second one is the one to rename.
    expect(report(...document, '--option', `a=${motion}`, '--increment', `a=${WITH_ADD_ON}`)).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'increment'
    })
    expect(report(...document, '--increment', `a=${WITH_ADD_ON}`, '--option', `a=${motion}`)).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'option'
    })
    expect(report(...document, '--increment', `a=${join(dir, 'missing.artifact.json')}`)).toMatchObject({
      code: 'INPUT_NOT_FOUND',
      option: 'increment'
    })
    expect(report(...document, '--increment', `a=${EXAMPLE}.document-brief.json`)).toMatchObject({
      code: 'REPLAY_MISMATCH',
      option: 'increment'
    })

    // Not comparable with the quote of the document: the rule of the increment, at the place the flag has in the
    // list of options of the run.
    const notComparable = report(...document, '--option', `motion=${motion}`, '--increment', `a=${STANDALONE}`)

    expect(notComparable).toMatchObject({ code: 'QUOTE_INCREMENT_BASE_NOT_CONTAINED', option: 'increment' })
    // The add-on alone holds one of the three lines of the base, with fewer points than the base has of it.
    expect(notComparable.issues).toEqual(
      expect.arrayContaining([
        { path: 'options.1.base.lines.0', rule: 'line_missing' },
        { path: 'options.1.base.lines.1.periods.1', rule: 'dedication_smaller' },
        { path: 'options.1.base.lines.2', rule: 'line_missing' }
      ])
    )
    expect(notComparable.issues!.every(issue => issue.path.startsWith('options.1.base.'))).toBe(true)

    // Rejected by the document: the report names the flag the option at that place was passed with.
    expect(
      report(...document, '--increment', `a=${WITH_ADD_ON}`, '--increment', `b=${WITH_ADD_ON}`)
    ).toEqual({
      code: 'QUOTE_DOCUMENT_OPTION_INVALID',
      message: expect.any(String),
      option: 'increment',
      issues: [{ path: 'options.1', rule: 'duplicate_option' }]
    })
    expect(report(...document, '--increment', `a=${WITH_ADD_ON}`, '--option', `b=${BASE}`)).toEqual({
      code: 'QUOTE_DOCUMENT_OPTION_INVALID',
      message: expect.any(String),
      option: 'option',
      issues: [{ path: 'options.1', rule: 'same_as_quote' }]
    })

    // Only the document takes increments.
    expect(report('compose', 'preview', '--input', BASE, '--increment', `a=${WITH_ADD_ON}`)).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'increment'
    })
  })

  it('a document with options alone is the one it was before an increment could price one', () => {
    // The committed example of options, to the byte: what `--option` printed is what it prints.
    const run = cli(
      'compose',
      'document',
      '--input',
      `${COURTESY}.artifact.json`,
      '--brief',
      `${COURTESY}.document-brief.json`,
      '--option',
      `copywriter=${COURTESY}.option-copywriter.artifact.json`,
      '--option',
      `motion=${COURTESY}.option-motion.artifact.json`
    )

    expect(run.status).toBe(3)
    expect(run.stdout).toBe(readFileSync(`${COURTESY}.document.json`, 'utf8'))
    expect(run.stdout).not.toContain('Basis')
  })

  it('is listed in the usage the tool prints', () => {
    const usage = JSON.parse(cli('help').stdout)

    expect(usage.operations.compose).toContain(
      'increment --input with-add-on.artifact.json --base base.artifact.json [--out increment.json]'
    )
    expect(usage.operations.compose).toContain('[--increment key=with-add-on.artifact.json]...')
    expect(Object.keys(usage.quoteIncrement)).toEqual(['command', 'why', 'comparable', 'document'])

    // Every rejection the usage names is one the reading can give.
    for (const code of usage.quoteIncrement.comparable.match(/QUOTE_INCREMENT_[A-Z_]+/g))
      expect(PRICING_V3_DOMAIN_ERROR_CODES).toContain(code)
  })
})
