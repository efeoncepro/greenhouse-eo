/**
 * TASK-1845 — resolución de ventanas `[start, endExclusive)` en zona IANA (browser-safe, sólo
 * `Intl`). Reglas (arquitectura §5): se resuelve en la zona del encargo y se almacena también
 * en UTC; la comparación anterior conserva una regla de calendario EXPLÍCITA (período anterior
 * del mismo largo, mismo rango del año anterior, o custom); nunca se asume que un mes tiene 30
 * días; un período que aún no cerró se etiqueta parcial.
 */

import type { InsightComparisonV1, InsightPeriodV1 } from './contracts/request'
import { InsightsInvalidWindowError } from './errors'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export interface CivilDate {
  year: number
  month: number
  day: number
}

export interface ResolvedInsightWindow {
  /** Civil (inclusive) en `timeZone`. */
  start: string
  /** Civil (exclusivo) en `timeZone`. */
  endExclusive: string
  /** Último día civil incluido (para etiquetas "1–31 de agosto"). */
  endInclusive: string
  timeZone: string
  startUtc: string
  endUtc: string
  days: number
  /** `true` si la ventana es exactamente uno o más meses calendario completos. */
  wholeMonths: boolean
  /** Meses `YYYY-MM` cubiertos cuando `wholeMonths`; vacío en caso contrario. */
  months: string[]
  /** `true` si `endExclusive` está en el futuro respecto del instante de evaluación. */
  partial: boolean
}

export interface ResolvedInsightWindows {
  current: ResolvedInsightWindow
  comparison: ResolvedInsightWindow | null
  comparisonRule: InsightComparisonV1['kind']
}

export const parseCivilDate = (value: string, field: string): CivilDate => {
  const match = DATE_RE.exec(value)

  if (!match) throw new InsightsInvalidWindowError(`${field} debe ser YYYY-MM-DD`, { field, value })

  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  const probe = new Date(Date.UTC(date.year, date.month - 1, date.day))

  if (probe.getUTCFullYear() !== date.year || probe.getUTCMonth() !== date.month - 1 || probe.getUTCDate() !== date.day) {
    throw new InsightsInvalidWindowError(`${field} no es una fecha válida`, { field, value })
  }

  return date
}

export const formatCivilDate = (date: CivilDate): string =>
  `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`

/** Aritmética civil en días (sin zona: los días civiles no tienen DST). */
export const addCivilDays = (date: CivilDate, days: number): CivilDate => {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days))

  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() }
}

export const civilDaysBetween = (start: CivilDate, endExclusive: CivilDate): number =>
  Math.round((Date.UTC(endExclusive.year, endExclusive.month - 1, endExclusive.day) - Date.UTC(start.year, start.month - 1, start.day)) / 86_400_000)

/** Mismo día civil un año antes; 29-feb cae en 28-feb (regla explícita, no silenciosa). */
export const subtractCivilYear = (date: CivilDate): CivilDate => {
  const year = date.year - 1
  const isLeapDay = date.month === 2 && date.day === 29
  const day = isLeapDay && !isLeapYear(year) ? 28 : date.day

  return { year, month: date.month, day }
}

export const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())

    return true
  } catch {
    return false
  }
}

const offsetMinutesAt = (utcMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(new Date(utcMs))

  const read = (type: string) => Number(parts.find(part => part.type === type)?.value ?? '0')
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'))

  return Math.round((asUtc - utcMs) / 60_000)
}

/**
 * Medianoche civil de `date` en `timeZone` como instante UTC. Dos pasadas resuelven el
 * cambio de offset (DST): la primera estima con el offset del instante naive, la segunda
 * corrige si la medianoche cae justo en la transición.
 */
export const civilMidnightToUtc = (date: CivilDate, timeZone: string): Date => {
  const naive = Date.UTC(date.year, date.month - 1, date.day)
  let guess = naive - offsetMinutesAt(naive, timeZone) * 60_000
  const second = naive - offsetMinutesAt(guess, timeZone) * 60_000

  if (second !== guess) guess = second

  return new Date(guess)
}

const monthsCovered = (start: CivilDate, endExclusive: CivilDate): string[] | null => {
  if (start.day !== 1 || endExclusive.day !== 1) return null

  const months: string[] = []
  let cursor = { ...start }

  while (cursor.year < endExclusive.year || (cursor.year === endExclusive.year && cursor.month < endExclusive.month)) {
    months.push(`${cursor.year}-${String(cursor.month).padStart(2, '0')}`)
    cursor = cursor.month === 12 ? { year: cursor.year + 1, month: 1, day: 1 } : { ...cursor, month: cursor.month + 1 }
  }

  return months.length > 0 ? months : null
}

export const resolveCivilWindow = (
  start: CivilDate,
  endExclusive: CivilDate,
  timeZone: string,
  now: Date
): ResolvedInsightWindow => {
  const days = civilDaysBetween(start, endExclusive)

  if (days <= 0) throw new InsightsInvalidWindowError('endExclusive debe ser posterior a start', { start: formatCivilDate(start), endExclusive: formatCivilDate(endExclusive) })

  const startUtc = civilMidnightToUtc(start, timeZone)
  const endUtc = civilMidnightToUtc(endExclusive, timeZone)
  const months = monthsCovered(start, endExclusive)

  return {
    start: formatCivilDate(start),
    endExclusive: formatCivilDate(endExclusive),
    endInclusive: formatCivilDate(addCivilDays(endExclusive, -1)),
    timeZone,
    startUtc: startUtc.toISOString(),
    endUtc: endUtc.toISOString(),
    days,
    wholeMonths: months !== null,
    months: months ?? [],
    partial: endUtc.getTime() > now.getTime()
  }
}

export const MAX_INSIGHT_WINDOW_DAYS = 400

export const resolveInsightWindows = (
  period: InsightPeriodV1,
  comparison: InsightComparisonV1,
  now: Date = new Date()
): ResolvedInsightWindows => {
  if (!isValidTimeZone(period.timeZone)) {
    throw new InsightsInvalidWindowError('timeZone debe ser un identificador IANA válido', { timeZone: period.timeZone })
  }

  const start = parseCivilDate(period.start, 'period.start')
  const endExclusive = parseCivilDate(period.endExclusive, 'period.endExclusive')
  const current = resolveCivilWindow(start, endExclusive, period.timeZone, now)

  if (current.days > MAX_INSIGHT_WINDOW_DAYS) {
    throw new InsightsInvalidWindowError(`La ventana supera el máximo de ${MAX_INSIGHT_WINDOW_DAYS} días`, { days: current.days })
  }

  if (current.startUtc >= now.toISOString()) {
    throw new InsightsInvalidWindowError('La ventana empieza en el futuro', { start: current.start })
  }

  let comparisonWindow: ResolvedInsightWindow | null = null

  switch (comparison.kind) {
    case 'none':
      break

    case 'previous_period': {
      // Mismo largo en DÍAS, inmediatamente anterior. Para meses completos, el mismo número de
      // meses anteriores (un mes anterior a agosto es julio, no "30 días antes").
      if (current.wholeMonths) {
        const monthsBack = current.months.length
        let cursor = { ...start }

        for (let index = 0; index < monthsBack; index += 1) {
          cursor = cursor.month === 1 ? { year: cursor.year - 1, month: 12, day: 1 } : { ...cursor, month: cursor.month - 1 }
        }

        comparisonWindow = resolveCivilWindow(cursor, start, period.timeZone, now)
      } else {
        comparisonWindow = resolveCivilWindow(addCivilDays(start, -current.days), start, period.timeZone, now)
      }

      break
    }

    case 'previous_year':
      comparisonWindow = resolveCivilWindow(subtractCivilYear(start), subtractCivilYear(endExclusive), period.timeZone, now)
      break

    case 'custom': {
      const customStart = parseCivilDate(comparison.start, 'comparison.start')
      const customEnd = parseCivilDate(comparison.endExclusive, 'comparison.endExclusive')

      comparisonWindow = resolveCivilWindow(customStart, customEnd, period.timeZone, now)

      if (comparisonWindow.endUtc > current.startUtc && comparisonWindow.startUtc < current.endUtc) {
        throw new InsightsInvalidWindowError('La comparación custom no puede solaparse con el período', {
          comparison: [comparisonWindow.start, comparisonWindow.endExclusive]
        })
      }

      break
    }
  }

  return { current, comparison: comparisonWindow, comparisonRule: comparison.kind }
}

// ── TASK-1848 — períodos relativos para la recurrencia ──────────────────────────────────────

export type InsightScheduleCadence = 'weekly' | 'monthly'

/** Día civil de `now` en `timeZone` (no el día UTC: a las 22:00 de Santiago ya es mañana en UTC). */
export const civilToday = (timeZone: string, now: Date = new Date()): CivilDate => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const read = (type: string) => Number(parts.find(part => part.type === type)?.value ?? '0')

  return { year: read('year'), month: read('month'), day: read('day') }
}

const startOfMonth = (date: CivilDate): CivilDate => ({ year: date.year, month: date.month, day: 1 })

const previousMonth = (date: CivilDate): CivilDate => (date.month === 1 ? { year: date.year - 1, month: 12, day: 1 } : { year: date.year, month: date.month - 1, day: 1 })

/** Lunes (ISO) de la semana civil de `date`. */
const startOfIsoWeek = (date: CivilDate): CivilDate => {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
  const offset = weekday === 0 ? 6 : weekday - 1

  return addCivilDays(date, -offset)
}

export interface ClosedInsightPeriod {
  start: string
  endExclusive: string
}

/**
 * Los últimos `count` períodos CERRADOS y ya consolidados, del más antiguo al más reciente.
 * Un período cuenta sólo cuando su `endExclusive + consolidationDays <= hoy` (civil, en la zona):
 * «mes anterior» es el mes calendario, jamás 30 días; la semana es ISO (lunes a lunes).
 */
export const resolveClosedInsightPeriods = (input: {
  cadence: InsightScheduleCadence
  timeZone: string
  consolidationDays: number
  count: number
  now?: Date
}): ClosedInsightPeriod[] => {
  if (!isValidTimeZone(input.timeZone)) throw new InsightsInvalidWindowError('timeZone no es una zona IANA válida', { timeZone: input.timeZone })

  // Retroceder la consolidación: lo que está "cerrado y consolidado hoy" es lo cerrado al día (hoy − N).
  const reference = addCivilDays(civilToday(input.timeZone, input.now), -input.consolidationDays)
  const periods: ClosedInsightPeriod[] = []

  let endExclusive = input.cadence === 'monthly' ? startOfMonth(reference) : startOfIsoWeek(reference)

  for (let i = 0; i < input.count; i++) {
    const start = input.cadence === 'monthly' ? previousMonth(endExclusive) : addCivilDays(endExclusive, -7)

    periods.unshift({ start: formatCivilDate(start), endExclusive: formatCivilDate(endExclusive) })
    endExclusive = start
  }

  return periods
}
