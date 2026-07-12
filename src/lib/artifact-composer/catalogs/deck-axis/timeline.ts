/**
 * Tender Deck Composer — contrato semántico y geometría de TimelineFull.
 *
 * El HTML es el molde visual, pero el calendario es DATO: un agente/humano declara una unidad
 * temporal discreta, sus labels, fases y hitos. Este módulo compila ese schedule a las medidas que
 * el renderer necesita, de modo que grilla, barras y conectores siempre compartan la misma escala.
 */

import type { SlotValues } from '../../contracts'

export const TIMELINE_TIME_UNITS = ['day', 'week', 'month', 'quarter', 'custom'] as const

export type TimelineTimeUnit = (typeof TIMELINE_TIME_UNITS)[number]

export interface TimelinePhase {
  kind: 'work' | 'continuous'
  startUnit: number
  endUnit: number
}

export interface TimelineMilestone {
  at: number
}

export interface TimelineSchedule {
  timeUnit: TimelineTimeUnit
  timeAxis: string[]
  phases: TimelinePhase[]
  milestones: TimelineMilestone[]
}

export interface TimelineLayout {
  /** CSS percentage for one discrete timeline unit. */
  unitWidth: string
  /** CSS left percentages for the milestone markers and their connectors. */
  milestonePositions: string[]
}

export interface TimelineScheduleIssue {
  slot: 'timeUnit' | 'timeAxis' | 'phases' | 'milestones'
  message: string
}

export interface TimelineScheduleParseResult {
  schedule: TimelineSchedule | null
  issues: TimelineScheduleIssue[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Deck plans are JSON handoffs. We preserve integer strings such as `"3"` for backward compatibility
 * with the existing SKY plan, but never coerce decimals, currency or presentation text into schedule
 * positions. A timeline position has to be an exact discrete boundary.
 */
const toUnitIndex = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value)

    return Number.isSafeInteger(parsed) ? parsed : null
  }

  return null
}

const inRange = (value: number, unitCount: number): boolean => value >= 1 && value <= unitCount

/**
 * Parses and validates the schedule-level invariants that cannot live in a single slot field:
 * range boundaries depend on the axis length. The rendered geometry, not an arbitrary unit count,
 * decides whether an optional bar label fits.
 */
export const parseTimelineSchedule = (slots: SlotValues): TimelineScheduleParseResult => {
  const issues: TimelineScheduleIssue[] = []
  const rawTimeUnit = slots.timeUnit
  const rawAxis = slots.timeAxis
  const rawPhases = slots.phases
  const rawMilestones = slots.milestones

  const timeUnit =
    typeof rawTimeUnit === 'string' && TIMELINE_TIME_UNITS.includes(rawTimeUnit as TimelineTimeUnit)
      ? (rawTimeUnit as TimelineTimeUnit)
      : null

  if (rawTimeUnit !== undefined && rawTimeUnit !== null && timeUnit === null) {
    issues.push({
      slot: 'timeUnit',
      message: `timeUnit debe ser uno de: ${TIMELINE_TIME_UNITS.join(', ')}.`
    })
  }

  const timeAxis = Array.isArray(rawAxis) && rawAxis.every(item => typeof item === 'string') ? rawAxis : null

  if (rawAxis !== undefined && rawAxis !== null && timeAxis === null) {
    issues.push({ slot: 'timeAxis', message: 'timeAxis debe ser un array de labels de texto.' })
  }

  const unitCount = timeAxis?.length ?? 0
  const phases: TimelinePhase[] = []

  if (Array.isArray(rawPhases)) {
    rawPhases.forEach((rawPhase, index) => {
      if (!isRecord(rawPhase)) {
        issues.push({ slot: 'phases', message: `fase ${index + 1}: debe ser un objeto.` })
        
return
      }

      const startUnit = toUnitIndex(rawPhase.startUnit)
      const endUnit = toUnitIndex(rawPhase.endUnit)
      const kind = rawPhase.kind

      if (kind !== 'work' && kind !== 'continuous') {
        issues.push({ slot: 'phases', message: `fase ${index + 1}: kind debe ser work o continuous.` })
      }

      if (startUnit === null || endUnit === null) {
        issues.push({
          slot: 'phases',
          message: `fase ${index + 1}: startUnit y endUnit deben ser índices enteros de unidad.`
        })
        
return
      }

      if (!inRange(startUnit, unitCount) || !inRange(endUnit, unitCount) || endUnit < startUnit) {
        issues.push({
          slot: 'phases',
          message:
            `fase ${index + 1}: el rango debe cumplir 1 ≤ startUnit ≤ endUnit ≤ ${unitCount}. ` +
            'No se permite dibujar una barra fuera del eje.'
        })
        
return
      }

      phases.push({ kind: kind as TimelinePhase['kind'], startUnit, endUnit })
    })
  } else if (rawPhases !== undefined && rawPhases !== null) {
    issues.push({ slot: 'phases', message: 'phases debe ser un array de fases.' })
  }

  const milestones: TimelineMilestone[] = []

  if (Array.isArray(rawMilestones)) {
    rawMilestones.forEach((rawMilestone, index) => {
      if (!isRecord(rawMilestone)) {
        issues.push({ slot: 'milestones', message: `hito ${index + 1}: debe ser un objeto.` })
        
return
      }

      const at = toUnitIndex(rawMilestone.at)

      if (at === null || !inRange(at, unitCount)) {
        issues.push({
          slot: 'milestones',
          message:
            `hito ${index + 1}: at debe ser una frontera entera entre 1 y ${unitCount}. ` +
            'Los hitos no se sitúan entre unidades.'
        })
        
return
      }

      milestones.push({ at })
    })
  } else if (rawMilestones !== undefined && rawMilestones !== null) {
    issues.push({ slot: 'milestones', message: 'milestones debe ser un array de hitos.' })
  }

  if (timeUnit === null || timeAxis === null || issues.length > 0) return { schedule: null, issues }

  return { schedule: { timeUnit, timeAxis, phases, milestones }, issues }
}

/** Builds the renderer-only layout from the same validated schedule used by the content contract. */
export const layoutTimelineSchedule = (schedule: TimelineSchedule): TimelineLayout => {
  const unitCount = schedule.timeAxis.length

  return {
    unitWidth: `${(100 / unitCount).toFixed(6)}%`,
    milestonePositions: schedule.milestones.map(milestone => `${((milestone.at / unitCount) * 100).toFixed(6)}%`)
  }
}
