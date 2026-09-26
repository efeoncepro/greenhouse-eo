/**
 * TASK-1847 — rótulos del documento compartidos por el deck y el informe A4.
 *
 * El período se rotula desde la ventana CIVIL que declaró la edición (`request.period`, `[inicio, fin)`
 * en su zona), nunca desde el mes del instante inicial: una edición del 1 al 20 de septiembre rotulada
 * «Septiembre de 2026» promete un mes que no midió (canary Berel, 2026-09-22). Todo rótulo cabe en el
 * presupuesto más estrecho que lo imprime (28, portada del deck y del informe).
 */

import type { InsightEditionRecord } from '../stores/records'

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const civil = (value: string): Date => {
  const match = DATE.exec(value)

  if (!match) throw new Error(`Fecha civil inválida en la ventana de la edición: ${value}`)

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

const format = (date: Date, options: Intl.DateTimeFormatOptions, locale: string): string =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date)

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/** Mes corto sin el punto que Intl agrega en es-CL («sept.»): en un rango el punto estorba. */
const shortMonth = (date: Date, locale: string): string => format(date, { month: 'short' }, locale).replace(/\.$/, '')

export const periodLabelOf = (edition: Pick<InsightEditionRecord, 'request'>, locale = 'es-CL'): string => {
  const start = civil(edition.request.period.start)
  const end = new Date(civil(edition.request.period.endExclusive).getTime() - 86_400_000)
  const startsOnFirst = start.getUTCDate() === 1
  const endsOnLast = new Date(end.getTime() + 86_400_000).getUTCDate() === 1
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth()

  if (startsOnFirst && endsOnLast) {
    // Meses completos.
    if (sameMonth) return capitalize(format(start, { month: 'long', year: 'numeric' }, locale))

    if (sameYear) {
      return capitalize(`${format(start, { month: 'long' }, locale)} a ${format(end, { month: 'long' }, locale)} de ${end.getUTCFullYear()}`)
    }

    return capitalize(`${shortMonth(start, locale)} ${start.getUTCFullYear()} a ${shortMonth(end, locale)} ${end.getUTCFullYear()}`)
  }

  if (sameMonth) return `${start.getUTCDate()}–${end.getUTCDate()} de ${format(end, { month: 'long' }, locale)} de ${end.getUTCFullYear()}`

  if (sameYear) {
    return `${start.getUTCDate()} ${shortMonth(start, locale)}–${end.getUTCDate()} ${shortMonth(end, locale)} ${end.getUTCFullYear()}`
  }

  return `${start.getUTCDate()} ${shortMonth(start, locale)} ${start.getUTCFullYear()}–${end.getUTCDate()} ${shortMonth(end, locale)} ${end.getUTCFullYear()}`
}

export const issuedLabelOf = (edition: Pick<InsightEditionRecord, 'issuedAt'>, unissued: string): string =>
  edition.issuedAt ? edition.issuedAt.slice(0, 10) : unissued

/** TASK-1889 — fecha larga de emisión («2 de septiembre de 2026»); sin emitir, el rótulo de no emitida. */
export const issuedLongLabelOf = (edition: Pick<InsightEditionRecord, 'issuedAt'>, unissued: string, locale = 'es-CL'): string =>
  edition.issuedAt ? format(civil(edition.issuedAt.slice(0, 10)), { day: 'numeric', month: 'long', year: 'numeric' }, locale) : unissued

/** TASK-1889 — último día medido de la ventana («31 de agosto de 2026»), para «Cifras al …». */
export const periodEndLongLabelOf = (edition: Pick<InsightEditionRecord, 'request'>, locale = 'es-CL'): string =>
  format(
    new Date(civil(edition.request.period.endExclusive).getTime() - 86_400_000),
    { day: 'numeric', month: 'long', year: 'numeric' },
    locale
  )

/** TASK-1889 — el período en minúscula inicial, para rótulos corridos («Informe de agosto de 2026»). */
export const periodInlineOf = (edition: Pick<InsightEditionRecord, 'request'>, locale = 'es-CL'): string => {
  const label = periodLabelOf(edition, locale)

  return label.charAt(0).toLowerCase() + label.slice(1)
}
