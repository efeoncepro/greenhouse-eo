/**
 * Metodología del documento: una línea por ORIGEN, no una por fuente sellada.
 *
 * El snapshot sella una fuente por método y ventana; con comparación, el mismo origen aparece dos veces («Google Search
 * Console, corte al 31 de agosto» y «… corte al 29 de septiembre»). Listarlas por separado repite el origen y, con dos
 * módulos medidos, pasa de las 8 líneas que la página «Cómo se midió» del A4 admite: el canary de producción del
 * 2026-10-04 (Berel, 9 fuentes) se rechazó por eso. Agrupar no recorta: cada fecha de corte sigue impresa.
 *
 * Opera sobre el TEXTO para servir también a los planes ya congelados (inmutables): el planner lo aplica al escribir el
 * plan y los mappers al componer, y es idempotente. Una línea que no tiene la forma «<origen>, corte al <fecha>.» pasa
 * tal cual.
 */

import { GH_INSIGHTS } from '@/lib/copy/insights'

const C = GH_INSIGHTS.methodology

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const LINE = new RegExp(`^(.+), (?:${escapeRegExp(C.cutoff)}|${escapeRegExp(C.cutoffs)}) (.+)\\.$`)

/** Orden cronológico de «29 de septiembre de 2026» en el idioma del plan; sin fecha legible conserva su posición. */
const monthIndex = (locale: string): Map<string, number> => {
  const format = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })

  return new Map(Array.from({ length: 12 }, (_, month) => [format.format(new Date(Date.UTC(2026, month, 15))).toLowerCase(), month] as const))
}

const sortKeyOf = (date: string, months: Map<string, number>): number | null => {
  const match = date.match(/^(\d{1,2}) de (\p{L}+) de (\d{4})$/u)
  const month = match ? months.get(match[2]!.toLowerCase()) : undefined

  return match && month !== undefined ? Date.UTC(Number(match[3]), month, Number(match[1])) : null
}

const YEAR = / de (\d{4})$/

/** «al A», «al A y al B», «al A, al B y al C»; con un mismo año, sólo la última fecha lo dice. */
const joinDates = (dates: readonly string[]): string => {
  if (dates.length === 1) return dates[0]!

  const years = new Set(dates.map(date => date.match(YEAR)?.[1] ?? null))
  const shared = years.size === 1 && !years.has(null)
  const shown = shared ? [...dates.slice(0, -1).map(date => date.replace(YEAR, '')), dates.at(-1)!] : [...dates]

  return `${shown.slice(0, -1).join(`, ${C.cutoffJoin} `)} ${C.cutoffLast} ${shown.at(-1)}`
}

/**
 * Separa «cortes al A y al B» en sus fechas (idempotencia: una línea ya agrupada se vuelve a agrupar igual). Una fecha
 * sin año toma el de la última, que es como `joinDates` la escribió.
 */
const splitDates = (text: string): string[] => {
  const dates = text.split(new RegExp(`, ${escapeRegExp(C.cutoffJoin)} | ${escapeRegExp(C.cutoffLast)} `)).map(date => date.trim()).filter(Boolean)
  const year = dates.at(-1)?.match(YEAR)?.[0]

  return year ? dates.map(date => (YEAR.test(date) ? date : `${date}${year}`)) : dates
}

export const consolidateMethodology = (lines: readonly string[], locale: string): string[] => {
  const months = monthIndex(locale)
  const groups = new Map<string, string[]>()
  const order: Array<{ origin: string } | { line: string }> = []

  for (const line of lines) {
    const match = LINE.exec(line)

    if (!match) {
      order.push({ line })
      continue
    }

    const origin = match[1]!
    const dates = groups.get(origin)

    if (!dates) {
      groups.set(origin, [])
      order.push({ origin })
    }

    for (const date of splitDates(match[2]!)) if (!groups.get(origin)!.includes(date)) groups.get(origin)!.push(date)
  }

  const seen = new Set<string>()

  return order.flatMap(entry => {
    if ('line' in entry) return seen.has(entry.line) ? [] : (seen.add(entry.line), [entry.line])

    const dates = [...groups.get(entry.origin)!].sort((a, b) => (sortKeyOf(a, months) ?? 0) - (sortKeyOf(b, months) ?? 0))
    const label = dates.length === 1 ? C.cutoff : C.cutoffs

    return [`${entry.origin}, ${label} ${joinDates(dates)}.`]
  })
}
