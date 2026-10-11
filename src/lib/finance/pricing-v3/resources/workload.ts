import Decimal from 'decimal.js'
import { z } from 'zod'

import { briefSchema } from '../catalog/contracts'
import { sourceSchema } from '../schemas'
import type { PricingV3Source } from '../schemas'

const D = Decimal.clone({ precision: 80 })
const id = z.string().min(1).max(80)
const decimal = z.string().regex(/^(0|[1-9]\d{0,12})(\.\d{1,18})?$/)
const positive = decimal.refine(v => new D(v).gt(0))
const share = positive.refine(v => new D(v).lte(1))

/**
 * Declared demand volume → dedication per line. Domain-free: a driver is "N units a month, M minutes each",
 * whatever the unit is (conversations, pieces, tickets, audits). The unit name is data, never a branch in code.
 */
export const workloadSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-workload/1'),
    version: id,
    mode: z.enum(['declared', 'simulation']),
    capacity: z
      .object({
        // Hours a full-time person actually delivers in a month (after breaks, meetings, training).
        productiveHoursPerFteMonth: positive,
        // Contracted hours of a full-time month; presence/coverage is paid at this rate, not at the productive one.
        scheduledHoursPerFteMonth: positive,
        source: sourceSchema
      })
      .strict(),
    drivers: z
      .array(
        z
          .object({
            driverId: id,
            label: z.string().min(1).max(200),
            unit: id,
            unitsPerMonth: positive,
            minutesPerUnit: positive,
            source: sourceSchema
          })
          .strict()
      )
      .max(50),
    fixedWork: z
      .array(
        z.object({ workId: id, label: z.string().min(1).max(200), hoursPerMonth: positive, source: sourceSchema }).strict()
      )
      .max(50),
    lines: z
      .array(
        z
          .object({
            lineId: id,
            driverShares: z.array(z.object({ driverId: id, share }).strict()).max(50),
            fixedWorkShares: z.array(z.object({ workId: id, share }).strict()).max(50),
            // Hours the line must be staffed regardless of volume (a coverage window). Optional.
            presenceHoursPerMonth: positive.optional(),
            reason: z.string().min(1).max(1000)
          })
          .strict()
      )
      .min(1)
      .max(100),
    // Dedication is rounded UP to this step: capacity is never sold below what the declared work needs.
    rounding: z.object({ fteStep: share }).strict()
  })
  .strict()

export type Workload = z.infer<typeof workloadSchema>

type Diagnostic = { code: string; path: string }

const unique = <T>(items: T[]) => new Set(items).size === items.length

// Reported hours are rounded for reading; dedication is always computed from the unrounded values.
const hours = (value: Decimal) => value.toDecimalPlaces(6).toFixed()

/**
 * Evidence of a dimensioned dedication: one source that says what the sources it was derived from say together. It
 * is as weak as the weakest of them (pending, then estimated, then confirmed), and in force only while all of them
 * are. A workload declared as a simulation is an estimate whatever its sources say. Null when no date has all of
 * them in force: there is then no day on which the dedication is evidenced.
 */
const evidenceOf = (workload: Workload, sources: PricingV3Source[]): PricingV3Source | null => {
  const effectiveFrom = sources.map(s => s.effectiveFrom).reduce((a, b) => (a > b ? a : b))
  const effectiveUntil = sources.map(s => s.effectiveUntil).reduce((a, b) => (a < b ? a : b))

  if (effectiveFrom > effectiveUntil) return null

  return {
    reference: `workload:${workload.version}`,
    effectiveFrom,
    effectiveUntil,
    status: sources.some(s => s.status === 'pending')
      ? 'pending'
      : workload.mode === 'simulation' || sources.some(s => s.status === 'estimated')
        ? 'estimated'
        : 'confirmed'
  }
}

/** Pure derivation. It dimensions capacity; it does not check that the people or the hours exist. */
export function dimensionWorkload(raw: unknown) {
  const workload = workloadSchema.parse(raw)
  const diagnostics: Diagnostic[] = []
  const issue = (code: string, path: string) => diagnostics.push({ code, path })
  const { capacity } = workload

  if (new D(capacity.productiveHoursPerFteMonth).gt(capacity.scheduledHoursPerFteMonth))
    issue('PRODUCTIVE_HOURS_EXCEED_SCHEDULED', 'capacity')
  if (!workload.drivers.length && !workload.fixedWork.length && !workload.lines.some(l => l.presenceHoursPerMonth))
    issue('WORKLOAD_WITHOUT_DEMAND', 'drivers')
  if (!unique(workload.drivers.map(d => d.driverId))) issue('DUPLICATE_WORKLOAD_DRIVER', 'drivers')
  if (!unique(workload.fixedWork.map(w => w.workId))) issue('DUPLICATE_FIXED_WORK', 'fixedWork')
  if (!unique(workload.lines.map(l => l.lineId))) issue('DUPLICATE_WORKLOAD_LINE', 'lines')

  for (const line of workload.lines) {
    if (!unique(line.driverShares.map(s => s.driverId)) || !unique(line.fixedWorkShares.map(s => s.workId)))
      issue('DUPLICATE_WORKLOAD_SHARE', line.lineId)
    for (const s of line.driverShares)
      if (!workload.drivers.some(d => d.driverId === s.driverId))
        issue('UNKNOWN_WORKLOAD_DRIVER', `${line.lineId}:${s.driverId}`)
    for (const s of line.fixedWorkShares)
      if (!workload.fixedWork.some(w => w.workId === s.workId))
        issue('UNKNOWN_FIXED_WORK', `${line.lineId}:${s.workId}`)
  }

  // Every declared hour has exactly one owner: shares of a driver or a fixed block must add up to 1, never less.
  const reconciled = (kind: 'driverShares' | 'fixedWorkShares', key: string) =>
    workload.lines
      .flatMap(l => l[kind] as { driverId?: string; workId?: string; share: string }[])
      .filter(s => (s.driverId ?? s.workId) === key)
      .reduce((sum, s) => sum.plus(s.share), new D(0))
      .eq(1)

  for (const d of workload.drivers)
    if (!reconciled('driverShares', d.driverId)) issue('WORKLOAD_DRIVER_NOT_RECONCILED', d.driverId)
  for (const w of workload.fixedWork)
    if (!reconciled('fixedWorkShares', w.workId)) issue('FIXED_WORK_NOT_RECONCILED', w.workId)

  const driverHours = new Map(
    workload.drivers.map(d => [d.driverId, new D(d.unitsPerMonth).times(d.minutesPerUnit).div(60)] as const)
  )

  const fixedHours = new Map(workload.fixedWork.map(w => [w.workId, new D(w.hoursPerMonth)] as const))
  const step = new D(workload.rounding.fteStep)

  let totalWorkHours = new D(0)

  const lines = workload.lines.map(line => {
    const workHours = line.driverShares
      .reduce((sum, s) => sum.plus((driverHours.get(s.driverId) ?? new D(0)).times(s.share)), new D(0))
      .plus(
        line.fixedWorkShares.reduce(
          (sum, s) => sum.plus((fixedHours.get(s.workId) ?? new D(0)).times(s.share)),
          new D(0)
        )
      )

    totalWorkHours = totalWorkHours.plus(workHours)
    const presenceHours = new D(line.presenceHoursPerMonth ?? 0)
    const fteByWork = workHours.div(capacity.productiveHoursPerFteMonth)
    const fteByPresence = presenceHours.div(capacity.scheduledHoursPerFteMonth)
    const required = D.max(fteByWork, fteByPresence)
    const fte = required.div(step).toDecimalPlaces(0, D.ROUND_CEIL).times(step)

    if (fte.isZero()) issue('WORKLOAD_LINE_WITHOUT_DEMAND', line.lineId)

    // What the dedication of the line was derived from: the capacity of a month and every volume and block of
    // hours the line takes a share of. Presence hours are declared on the line itself and have no source of theirs.
    const evidence = evidenceOf(workload, [
      capacity.source,
      ...workload.drivers.filter(d => line.driverShares.some(s => s.driverId === d.driverId)).map(d => d.source),
      ...workload.fixedWork.filter(w => line.fixedWorkShares.some(s => s.workId === w.workId)).map(w => w.source)
    ])

    if (!evidence) issue('WORKLOAD_SOURCES_NOT_CONCURRENT', line.lineId)

    return {
      lineId: line.lineId,
      workHours: hours(workHours),
      presenceHours: hours(presenceHours),
      fteByWork: fteByWork.toDecimalPlaces(6).toString(),
      fteByPresence: fteByPresence.toDecimalPlaces(6).toString(),
      fte: fte.toFixed(),
      bindingConstraint: fteByPresence.gt(fteByWork) ? ('presence' as const) : ('work' as const),
      reason: line.reason,
      // Where this dedication comes from, in the shape a brief carries it (`dedicationEvidence`).
      evidence
    }
  })

  return {
    schemaVersion: 'pricing-v3-workload-result/1' as const,
    binding: false as const,
    status: diagnostics.length ? ('needs_input' as const) : ('prepared' as const),
    version: workload.version,
    mode: workload.mode,
    totals: {
      driverHours: workload.drivers.map(d => ({
        driverId: d.driverId,
        unit: d.unit,
        hours: hours(driverHours.get(d.driverId)!)
      })),
      fixedHours: hours([...fixedHours.values()].reduce((sum, h) => sum.plus(h), new D(0))),
      workHours: hours(totalWorkHours),
      fte: lines.reduce((sum, l) => sum.plus(l.fte), new D(0)).toFixed()
    },
    lines,
    diagnostics,
    note: 'Dimensioned from declared volume and hours. It is not a staffing commitment, an availability check or a measured productivity.'
  }
}

/**
 * Writes the dimensioned dedication into a brief, with its evidence: where it comes from (this workload) and whether
 * the volumes behind it are confirmed or estimated, so the quote freezes it and its readings count it. A line the
 * workload does not mention keeps the dedication and the evidence the brief already declares; a workload line the
 * brief does not have is an error, never a silently dropped hour.
 */
export function applyWorkloadToBrief(briefRaw: unknown, workloadRaw: unknown) {
  const brief = briefSchema.parse(briefRaw)
  const workload = dimensionWorkload(workloadRaw)
  const diagnostics: Diagnostic[] = [...workload.diagnostics]
  const next = structuredClone(brief)

  for (const result of workload.lines) {
    const line = next.lines.find(l => l.lineId === result.lineId)

    if (!line) {
      diagnostics.push({ code: 'UNKNOWN_BRIEF_LINE', path: result.lineId })
      continue
    }

    if (line.dedicationByPeriod?.length)
      diagnostics.push({ code: 'WORKLOAD_CONFLICTS_WITH_PERIOD_DEDICATION', path: result.lineId })
    const perPerson = new D(result.fte).div(line.headcount)

    // More work than the declared headcount can hold is a staffing question for a person, not a rounding detail.
    if (perPerson.gt(1)) {
      diagnostics.push({ code: 'LINE_OVER_CAPACITY', path: result.lineId })
      continue
    }

    if (!perPerson.isZero() && result.evidence) {
      line.dedication = { unit: 'fte', value: perPerson.toDecimalPlaces(18, D.ROUND_UP).toFixed() }
      line.dedicationEvidence = result.evidence
    }
  }

  const prepared = diagnostics.length === 0

  return {
    status: prepared ? ('prepared' as const) : ('needs_input' as const),
    binding: false as const,
    brief: prepared ? briefSchema.parse(next) : null,
    untouchedLineIds: brief.lines.map(l => l.lineId).filter(lineId => !workload.lines.some(l => l.lineId === lineId)),
    workload: { ...workload, status: prepared ? workload.status : ('needs_input' as const), diagnostics },
    note: 'Dedication derived from declared volume. Review the assumptions before quoting; the brief is not a commitment.'
  }
}
