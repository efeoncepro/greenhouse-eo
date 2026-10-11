// The dedication of a line carries its evidence: where it comes from and whether it is confirmed or an estimate
// (`brief.lines[].dedicationEvidence`). `compose workload` writes it, the quote freezes it and the readings count the
// cost it governs by it: estimated, confirmed or, with no evidence at all, not evidenced and never confirmed.
//
// The evidence reaches no calculation, so what must hold is taken from places that do not depend on the reader:
//   - the same demand quoted WITHOUT the evidence: every kernel input and every total must be the same;
//   - the quote composed again with the dedication of ONE line moved by 10 %: the cost must move by 10 % of the cost
//     the reading put on that dedication, and stay put where the reading says the allocation rule set the capacity;
//   - the sources of the workload a dedication was dimensioned from: its evidence is as weak as the weakest of them.
//
// Catalogs and demands are built in memory from the committed fixtures; nothing is written under data/.
import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { replayResourceComposition, runResourceComposition } from '../adapters/resource-composition'
import { briefSchema } from '../catalog/contracts'
import { calculateCatalogQuote } from '../catalog/quote'
import { resolveBrief } from '../catalog/resolve'
import { composeResourceQuote } from '../resources/composition'
import { assessCompositionReadiness } from '../resources/readiness'
import { costInputExposure, estimateExposure, summarizeComposition } from '../resources/summary'
import { applyWorkloadToBrief, dimensionWorkload, workloadSchema } from '../resources/workload'

const D = Decimal.clone({ precision: 80 })
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => read(`data/pricing/v3-operating/${name}.json`)

type Composition = ReturnType<typeof composeResourceQuote>
type Status = 'confirmed' | 'estimated' | 'pending'
type Evidence = { reference: string; effectiveFrom: string; effectiveUntil: string; status: Status }

type Demand = {
  brief: {
    mode: string
    quoteDate: string
    lines: {
      lineId: string
      allocationMode: string
      dedication: { unit: string; value: string }
      dedicationEvidence?: Evidence
    }[]
  }
}

// A managed service for a client in Colombia: six lines, one of them dedicated. The person costs of this catalog are
// confirmed; the talent factor of the country is confirmed here in memory, so that nothing a person costs is an
// estimate and what the readings say of a dedication is not hidden behind another estimated input.
const catalog = operating('catalog.review-v5')

for (const record of catalog.records) if (record.kind === 'talent_factor') record.source.status = 'confirmed'
const policy = operating('resources.review-v5')
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')
const colombia: Demand = operating('managed-care-colombia.demand')
const lineIds = colombia.brief.lines.map(line => line.lineId)

const evidence = (status: Status, extra: Partial<Evidence> = {}): Evidence => ({
  reference: 'test:dedication',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '2027-12-31',
  status,
  ...extra
})

/** The demand with the evidence each line is given; a line left out declares none. */
const evidenced = (by: Record<string, Evidence>, base: Demand = colombia): Demand => {
  const next = clone(base)

  for (const line of next.brief.lines) if (by[line.lineId]) line.dedicationEvidence = by[line.lineId]

  return next
}

const all = (status: Status) => Object.fromEntries(lineIds.map(lineId => [lineId, evidence(status)]))
const compose = (demand: unknown, cat: unknown = catalog) => composeResourceQuote(cat, policy, credits, demand)
const totalsOf = (r: Composition) => r.quote.totals!
const rowsOf = (r: Composition) => r.quote.periods.flatMap(p => p.result.lines)
const unitOf = (r: Composition) => new D(10).pow(-(totalsOf(r).cost.split('.')[1]?.length ?? 0))

describe('the evidence of a dedication reaches no calculation', () => {
  const plain = compose(colombia)
  const withEvidence = compose(evidenced({ ...all('estimated'), [lineIds[0]]: evidence('confirmed') }))

  it('every kernel input and every period result is the one of the same demand without it', () => {
    expect(plain.quote.calculationStatus).toBe('calculated')
    expect(withEvidence.quote.calculationStatus).toBe('calculated')
    expect(withEvidence.quote.resolution.inputs).toEqual(plain.quote.resolution.inputs)
    expect(withEvidence.quote.periods).toEqual(plain.quote.periods)
    expect(withEvidence.quote.totals).toEqual(plain.quote.totals)
  })

  it('the quote freezes it in its brief and replays to the digest it was signed with', () => {
    const artifact = runResourceComposition(catalog, policy, credits, evidenced(all('estimated')))
    const frozen = clone(artifact)

    expect(frozen.semantic.result.quote.resolution.brief!.lines.map(line => line.dedicationEvidence)).toEqual(
      lineIds.map(() => evidence('estimated'))
    )
    expect(replayResourceComposition(frozen).replayDigest).toBe(artifact.replayDigest)
  })

  it('a brief that declares none parses to exactly what it always did', () => {
    const parsed = briefSchema.parse(colombia.brief)

    for (const line of parsed.lines) expect(line).not.toHaveProperty('dedicationEvidence')
  })
})

describe('the evidence is held to what every other evidence is', () => {
  const at = (lineId: string) => `lines.${lineId}.dedicationEvidence`
  const [first] = lineIds

  it('an estimate is an assumption of the quote, named on its line; confirmed evidence is none', () => {
    const r = compose(evidenced({ [first]: evidence('estimated'), [lineIds[1]]: evidence('confirmed') }))

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(r.quote.resolution.assumptions.filter(a => a.code === 'DEDICATION_ESTIMATED').map(a => a.path)).toEqual([
      at(first)
    ])
  })

  it('pending evidence, or evidence that is not in force on the quote date, blocks the quote', () => {
    const pending = compose(evidenced({ [first]: evidence('pending') }))

    const expired = compose(
      evidenced({ [first]: evidence('confirmed', { effectiveFrom: '2026-01-01', effectiveUntil: '2026-06-30' }) })
    )

    const future = compose(evidenced({ [first]: evidence('confirmed', { effectiveFrom: '2027-01-01' }) }))

    expect(pending.quote.diagnostics).toContainEqual({ code: 'PENDING_DEDICATION_EVIDENCE', path: at(first) })
    for (const r of [expired, future])
      expect(r.quote.diagnostics).toContainEqual({ code: 'DEDICATION_EVIDENCE_NOT_EFFECTIVE', path: at(first) })
    for (const r of [pending, expired, future]) expect(r.quote.totals).toBeNull()
  })

  it('a commercial draft is issued on confirmed dedication only, where it is declared', () => {
    const draft = (status: Status) => {
      const brief = clone(colombia.brief)

      brief.mode = 'commercial_draft'
      brief.lines[0].dedicationEvidence = evidence(status)

      return resolveBrief({ ...catalog, mode: 'commercial_draft' }, brief).diagnostics.map(d => `${d.code} ${d.path}`)
    }

    expect(draft('estimated')).toContain(`UNCONFIRMED_DEDICATION_EVIDENCE ${at(first)}`)
    expect(draft('confirmed').filter(code => code.includes('DEDICATION'))).toEqual([])
  })
})

describe('the readings count the cost a dedication governs by its evidence', () => {
  const identity = (r: Composition) => {
    const reading = estimateExposure(r)!

    expect(
      new D(reading.estimatedCost)
        .plus(reading.dedicationNotEvidenced.cost)
        .plus(reading.confirmedCost)
        .eq(totalsOf(r).cost)
    ).toBe(true)

    return reading
  }

  const none = identity(compose(colombia))
  const estimated = identity(compose(evidenced(all('estimated'))))
  const confirmed = identity(compose(evidenced(all('confirmed'))))

  it('without evidence the cost is not evidenced: neither estimated nor confirmed', () => {
    expect(none.dedicationNotEvidenced.lineIds).toEqual(lineIds)
    expect(new D(none.dedicationNotEvidenced.cost).gt(0)).toBe(true)
    expect(none.costInputs.filter(input => input.kind === 'dedication')).toEqual([])
  })

  it('declared as an estimate, the same cost is estimated, one input per line, and none is left unevidenced', () => {
    expect(estimated.dedicationNotEvidenced).toMatchObject({ lineIds: [] })
    expect(new D(estimated.dedicationNotEvidenced.cost).isZero()).toBe(true)
    expect(estimated.confirmedCost).toBe(none.confirmedCost)
    expect(estimated.estimatedCost).toBe(new D(none.estimatedCost).plus(none.dedicationNotEvidenced.cost).toFixed(0))
    expect(
      estimated.costInputs
        .filter(input => input.kind === 'dedication')
        .map(input => input.id)
        .sort()
    ).toEqual([...lineIds].sort())
  })

  it('declared as confirmed, the same cost is confirmed and the ranking is the one the quote had', () => {
    expect(new D(confirmed.dedicationNotEvidenced.cost).isZero()).toBe(true)
    expect(confirmed.estimatedCost).toBe(none.estimatedCost)
    expect(confirmed.confirmedCost).toBe(new D(none.confirmedCost).plus(none.dedicationNotEvidenced.cost).toFixed(0))
    expect(confirmed.costInputs).toEqual(none.costInputs)
  })

  it('line by line: each line is in exactly one of the three', () => {
    const [a, b, ...rest] = lineIds
    const mixed = compose(evidenced({ [a]: evidence('estimated'), [b]: evidence('confirmed') }))
    const reading = identity(mixed)

    expect(reading.dedicationNotEvidenced.lineIds).toEqual(rest)
    expect(reading.costInputs.filter(input => input.kind === 'dedication').map(input => input.id)).toEqual([a])
    expect(
      costInputExposure(mixed)!
        .costInputs.filter(input => input.kind === 'dedication')
        .map(input => [input.id, input.sourceStatus])
        .sort()
    ).toEqual(
      [
        [a, 'estimated'],
        [b, 'confirmed']
      ].sort()
    )
  })

  it('the summary carries the reading and readiness names each line by what its dedication rests on', () => {
    const [a, b, ...rest] = lineIds
    const mixed = compose(evidenced({ [a]: evidence('estimated'), [b]: evidence('confirmed') }))
    const readiness = assessCompositionReadiness(mixed)
    const gaps = (code: string) => readiness.gaps.filter(gap => gap.code === code).map(gap => gap.path)

    expect(summarizeComposition(mixed, { calculationId: 'test' }).estimateExposure).toEqual(estimateExposure(mixed))
    expect(gaps('DEDICATION_EVIDENCE_REVIEW')).toEqual([`lines.${a}.dedicationEvidence`])
    expect(gaps('DEDICATION_NOT_EVIDENCED')).toEqual(rest.map(lineId => `lines.${lineId}.dedication`))
    expect(readiness.costEvidencePriority!.dedicationNotEvidenced).toEqual(
      estimateExposure(mixed)!.dedicationNotEvidenced
    )
  })
})

describe('the real verifier: moving one dedication 10 % moves cost by 10 % of the cost the reading put on it', () => {
  /** The same demand with the dedication of one line 10 % lower: lower, so that a full-time line stays valid. */
  const lowered = (demand: Demand, lineId: string) => {
    const next = clone(demand)
    const line = next.brief.lines.find(l => l.lineId === lineId)!

    line.dedication.value = new D(line.dedication.value).mul('0.9').toString()

    return next
  }

  // One unit per row for the rounding of each composed total, and one for the reading itself.
  const toleranceOf = (r: Composition) => unitOf(r).mul(rowsOf(r).length + 1)

  const verify = (demand: Demand, cat: unknown = catalog) => {
    const base = compose(demand, cat)
    const inputs = costInputExposure(base)!.costInputs.filter(input => input.kind === 'dedication')

    expect(base.quote.calculationStatus).toBe('calculated')
    expect(inputs.map(input => input.id).sort()).toEqual(demand.brief.lines.map(line => line.lineId).sort())

    for (const input of inputs) {
      const moved = compose(lowered(demand, input.id), cat)
      const saved = new D(totalsOf(base).cost).minus(totalsOf(moved).cost)
      const stated = new D(input.costAtRisk).mul('0.10')
      const tolerance = toleranceOf(base)

      expect(moved.quote.calculationStatus, input.id).toBe('calculated')
      // The check has teeth: what the reading states is far outside the tolerance.
      expect(stated.gt(tolerance.mul(10)), input.id).toBe(true)

      if (input.capacitySetByRule)
        // The rule charges the capacity whatever the dedication asks for: the cost stays where it was.
        expect(saved.abs().lte(tolerance), input.id).toBe(true)
      else expect(saved.minus(stated).abs().lte(tolerance), input.id).toBe(true)
    }

    return inputs
  }

  it('person cost: proportional on the lines whose capacity follows the dedication, fixed on a dedicated one', () => {
    const inputs = verify(evidenced(all('estimated')))
    const dedicated = colombia.brief.lines.filter(line => line.allocationMode === 'dedicated').map(line => line.lineId)

    // Both outcomes are in the fixture.
    expect(dedicated.length).toBeGreaterThan(0)
    expect(dedicated.length).toBeLessThan(lineIds.length)
    expect(
      inputs
        .filter(input => input.capacitySetByRule)
        .map(input => input.id)
        .sort()
    ).toEqual(dedicated.sort())
  })

  it('a resource of the kit shared by the capacity of the line is governed by the dedication too', () => {
    // The platform fee of the kit, charged by the capacity of the line instead of in full (in memory).
    const byCapacity = clone(catalog)

    for (const record of byCapacity.records)
      if (record.kind === 'kit')
        for (const requirement of record.value.requirements)
          if (requirement.requirementId === 'platform') requirement.shareMode = 'fte'

    const demand = evidenced(all('estimated'))
    const inFull = costInputExposure(compose(demand))!.costInputs.filter(input => input.kind === 'dedication')
    const shared = verify(demand, byCapacity)

    // The dedication now carries the fee as well as the person, on every line.
    for (const input of shared)
      expect(new D(input.costAtRisk).gt(inFull.find(other => other.id === input.id)!.costAtRisk)).toBe(true)
  })
})

describe('a workload writes the evidence of the dedication it dimensions', () => {
  const source = (status: Status, effectiveFrom = '2026-01-01', effectiveUntil = '2026-12-31') => ({
    reference: `test:${status}`,
    effectiveFrom,
    effectiveUntil,
    status
  })

  type Sources = { mode?: 'declared' | 'simulation'; capacity?: object; driver?: object; fixed?: object }

  const workload = ({ mode = 'declared', capacity, driver, fixed }: Sources = {}) =>
    workloadSchema.parse({
      schemaVersion: 'pricing-v3-workload/1',
      version: 'evidence-test-v1',
      mode,
      capacity: {
        productiveHoursPerFteMonth: '125',
        scheduledHoursPerFteMonth: '180',
        source: capacity ?? source('confirmed')
      },
      drivers: [
        {
          driverId: 'inbound',
          label: 'Inbound units',
          unit: 'tickets',
          unitsPerMonth: '600',
          minutesPerUnit: '5',
          source: driver ?? source('confirmed')
        }
      ],
      fixedWork: [{ workId: 'upkeep', label: 'Upkeep', hoursPerMonth: '10', source: fixed ?? source('confirmed') }],
      lines: [
        {
          lineId: 'writer',
          driverShares: [{ driverId: 'inbound', share: '1' }],
          fixedWorkShares: [],
          reason: 'The whole queue.'
        },
        {
          lineId: 'seo',
          driverShares: [],
          fixedWorkShares: [{ workId: 'upkeep', share: '1' }],
          reason: 'The upkeep.'
        }
      ],
      rounding: { fteStep: '0.05' }
    })

  const brief = () => read('data/pricing/v3-composition/seo-service.demand.json').brief
  const evidenceOf = (w: ReturnType<typeof workload>) => dimensionWorkload(w).lines.map(line => line.evidence)

  it('confirmed sources of a declared workload are confirmed evidence, named after the workload', () => {
    expect(evidenceOf(workload())).toEqual([
      {
        reference: 'workload:evidence-test-v1',
        effectiveFrom: '2026-01-01',
        effectiveUntil: '2026-12-31',
        status: 'confirmed'
      },
      {
        reference: 'workload:evidence-test-v1',
        effectiveFrom: '2026-01-01',
        effectiveUntil: '2026-12-31',
        status: 'confirmed'
      }
    ])
  })

  it('it is as weak as the weakest source the line rests on, and only those', () => {
    // The volume is an estimate: the line that takes it is estimated, the one that only does the upkeep is not.
    expect(evidenceOf(workload({ driver: source('estimated') })).map(e => e!.status)).toEqual([
      'estimated',
      'confirmed'
    ])
    expect(evidenceOf(workload({ fixed: source('pending') })).map(e => e!.status)).toEqual(['confirmed', 'pending'])
    // The capacity of a month is behind every line.
    expect(evidenceOf(workload({ capacity: source('estimated') })).map(e => e!.status)).toEqual([
      'estimated',
      'estimated'
    ])
    // A workload declared as a simulation is an estimate whatever its sources say.
    expect(evidenceOf(workload({ mode: 'simulation' })).map(e => e!.status)).toEqual(['estimated', 'estimated'])
  })

  it('it is in force only while every source it rests on is', () => {
    const [writer, seo] = evidenceOf(workload({ driver: source('confirmed', '2026-03-01', '2026-09-30') }))

    expect([writer!.effectiveFrom, writer!.effectiveUntil]).toEqual(['2026-03-01', '2026-09-30'])
    expect([seo!.effectiveFrom, seo!.effectiveUntil]).toEqual(['2026-01-01', '2026-12-31'])

    // No day has both the capacity and the volume in force: there is no evidence to write.
    const apart = dimensionWorkload(workload({ driver: source('confirmed', '2027-01-01', '2027-12-31') }))

    expect(apart.status).toBe('needs_input')
    expect(apart.diagnostics).toContainEqual({ code: 'WORKLOAD_SOURCES_NOT_CONCURRENT', path: 'writer' })
    expect(
      applyWorkloadToBrief(brief(), workload({ driver: source('confirmed', '2027-01-01', '2027-12-31') })).brief
    ).toBeNull()
  })

  it('the dimensioned brief carries it on the lines the workload mentions, and it quotes as an estimated input', () => {
    const only = workload({ driver: source('estimated') })

    only.lines = [only.lines[0]]
    only.fixedWork = []

    const dimensioned = applyWorkloadToBrief(brief(), only)

    expect(dimensioned.status).toBe('prepared')
    expect(dimensioned.brief!.lines.map(line => [line.lineId, line.dedicationEvidence?.status])).toEqual([
      ['writer', 'estimated'],
      ['seo', undefined]
    ])

    // Through the catalog lane: the estimate is an assumption of the quote, so the quote is under review.
    const quoted = calculateCatalogQuote(read('data/pricing/v3-catalog/catalog.review-v1.json'), dimensioned.brief)

    expect(quoted.resolution.assumptions.map(a => `${a.code} ${a.path}`)).toContain(
      'DEDICATION_ESTIMATED lines.writer.dedicationEvidence'
    )
  })
})
