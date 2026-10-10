import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { validateCatalog } from '../catalog/catalog'
import { composeResourceQuote } from '../resources/composition'
import { compositionDemandSchema, compositionPolicySchema } from '../resources/composition-contracts'
import { applyWorkloadToBrief, dimensionWorkload, workloadSchema } from '../resources/workload'

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const brief = () => read('data/pricing/v3-composition/seo-service.demand.json').brief

const source = {
  reference: 'hypothesis-only:test-workload',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '2026-12-31',
  status: 'estimated'
}

const workload = (unit = 'conversations') =>
  workloadSchema.parse({
    schemaVersion: 'pricing-v3-workload/1',
    version: 'test-workload-v1',
    mode: 'simulation',
    capacity: { productiveHoursPerFteMonth: '125', scheduledHoursPerFteMonth: '180', source },
    drivers: [{ driverId: 'inbound', label: 'Inbound units', unit, unitsPerMonth: '1300', minutesPerUnit: '5', source }],
    fixedWork: [{ workId: 'upkeep', label: 'Knowledge base upkeep', hoursPerMonth: '70', source }],
    lines: [
      {
        lineId: 'writer',
        driverShares: [{ driverId: 'inbound', share: '0.5' }],
        fixedWorkShares: [{ workId: 'upkeep', share: '0.5' }],
        reason: 'Half of the queue and half of the upkeep.'
      },
      {
        lineId: 'seo',
        driverShares: [{ driverId: 'inbound', share: '0.5' }],
        fixedWorkShares: [{ workId: 'upkeep', share: '0.5' }],
        presenceHoursPerMonth: '150',
        reason: 'Other half, plus an evening coverage window.'
      }
    ],
    rounding: { fteStep: '0.05' }
  })

const codes = (r: { diagnostics: { code: string }[] }) => r.diagnostics.map(d => d.code)

describe('workload dimensioning (volume to dedication)', () => {
  it('derives hours from volume and rounds dedication up, never below the declared work', () => {
    const r = dimensionWorkload(workload())

    expect(r.status).toBe('prepared')
    expect(new Decimal(r.totals.workHours).toDecimalPlaces(4).toString()).toBe('178.3333')
    expect(r.lines.map(l => [l.lineId, l.fte, l.bindingConstraint])).toEqual([
      ['writer', '0.75', 'work'],
      ['seo', '0.85', 'presence']
    ])

    for (const l of r.lines)
      expect(new Decimal(l.fte).times(125).gte(l.bindingConstraint === 'work' ? l.workHours : 0)).toBe(true)
  })

  it('treats the unit as data: another consumer with the same numbers gets the same capacity', () => {
    const a = dimensionWorkload(workload('conversations'))
    const b = dimensionWorkload(workload('content-pieces'))

    expect(b.lines).toEqual(a.lines)
    expect(b.totals.driverHours[0].unit).toBe('content-pieces')
  })

  it('refuses hours without an owner and references to unknown drivers', () => {
    const orphan = workload()

    orphan.lines[1].driverShares[0].share = '0.4'
    expect(codes(dimensionWorkload(orphan))).toContain('WORKLOAD_DRIVER_NOT_RECONCILED')

    const unknown = workload()

    unknown.lines[0].fixedWorkShares[0].workId = 'missing'
    expect(codes(dimensionWorkload(unknown))).toEqual(
      expect.arrayContaining(['UNKNOWN_FIXED_WORK', 'FIXED_WORK_NOT_RECONCILED'])
    )

    const inverted = workload()

    inverted.capacity.productiveHoursPerFteMonth = '200'
    expect(codes(dimensionWorkload(inverted))).toContain('PRODUCTIVE_HOURS_EXCEED_SCHEDULED')
  })

  it('writes the dedication into the brief and leaves unmentioned lines untouched', () => {
    const w = workload()

    w.lines = [{ ...w.lines[0], driverShares: [{ driverId: 'inbound', share: '1' }], fixedWorkShares: [] }]
    w.fixedWork = []
    w.drivers[0].unitsPerMonth = '900'
    const r = applyWorkloadToBrief(brief(), w)

    expect(r.status).toBe('prepared')
    expect(r.untouchedLineIds).toEqual(['seo'])
    expect(r.brief!.lines.find(l => l.lineId === 'writer')!.dedication).toEqual({ unit: 'fte', value: '0.6' })
    expect(r.brief!.lines.find(l => l.lineId === 'seo')!.dedication).toEqual(
      brief().lines.find((l: { lineId: string }) => l.lineId === 'seo').dedication
    )
  })

  it('asks for a person decision instead of overbooking a line or dropping hours', () => {
    const over = workload()

    over.drivers[0].unitsPerMonth = '4000'
    const r = applyWorkloadToBrief(brief(), over)

    expect(r.status).toBe('needs_input')
    expect(r.brief).toBeNull()
    expect(codes(r.workload)).toContain('LINE_OVER_CAPACITY')

    const stray = workload()

    stray.lines[0].lineId = 'not-in-brief'
    expect(codes(applyWorkloadToBrief(brief(), stray).workload)).toContain('UNKNOWN_BRIEF_LINE')
  })
})

describe('managed service example (volume → dedication → quote at the practice floor)', () => {
  const dir = 'data/pricing/v3-operating'
  const catalog = validateCatalog(read(`${dir}/catalog.review-v3.json`))
  const policy = compositionPolicySchema.parse(read(`${dir}/resources.review-v5.json`))
  const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')
  const demand = compositionDemandSchema.parse(read(`${dir}/managed-care.demand.json`))

  it('keeps the frozen demand consistent with the declared workload', () => {
    const dimensioned = applyWorkloadToBrief(read(`${dir}/managed-care.brief.json`), read(`${dir}/managed-care.workload.json`))

    expect(dimensioned.status).toBe('prepared')
    expect(dimensioned.brief).toEqual(demand.brief)
  })

  it('prices every line at or above the minimum margin its own policy declares', () => {
    const r = composeResourceQuote(catalog, policy, credits, demand)

    expect(r.quote.calculationStatus).toBe('calculated')

    // Expectations come from the catalog the engine reads, not from a number written in this test.
    const floors = new Map(
      catalog.records.flatMap(record =>
        record.kind === 'pricing' && record.value.offerId === demand.brief.offerId
          ? [[record.value.profileId, record.value.minimumMargin] as const]
          : []
      )
    )

    for (const line of r.quote.periods[0].result.lines) {
      const profile = demand.brief.lines.find(l => l.lineId === line.parentLineId)!.profile
      const margin = new Decimal(line.marginAmount).div(line.net)

      // The quote is rounded to whole pesos, so allow that rounding and nothing else.
      expect(margin.plus('0.000001').gte(floors.get(profile)!)).toBe(true)
    }
  })

  it('selects no tool through a task the demand excluded, and says why', () => {
    const r = composeResourceQuote(catalog, policy, credits, demand)

    for (const w of demand.work)
      for (const e of w.excludedProfileTasks ?? [])
        for (const tool of policy.tools.filter(t => t.tasks.includes(e.task) && !t.tasks.some(t => w.tasks.includes(t)))) {
          const selection = r.selections.find(s => s.lineId === w.lineId && s.toolId === tool.toolId)!

          expect(selection.included).toBe(false)
          expect(selection.reasons[0]).toBe(`profile-task-excluded:${e.task}:${e.reason}`)
        }
  })
})
