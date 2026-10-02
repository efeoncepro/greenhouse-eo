/**
 * TASK-1957 — vocabulario de presentación ÚNICO de Efeonce Insights: cómo se nombra ante el lector la fuente, la unidad,
 * el corte y el título de un informe. Lo consumen la proyección web (`sharing/web-model.ts`) y el mapper del PDF
 * (`render/figure-slots.ts`), así que web y PDF no pueden volver a divergir: antes el PDF traducía la fuente y el modelo
 * web copiaba `fact.source` crudo, que es la tabla lectora (`greenhouse_growth.seo_gsc_daily`). Funciones puras sobre
 * `GH_INSIGHTS`; ningún literal nuevo fuera del copy.
 */

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { InsightModule } from '../contracts/request'
import { GH_INSIGHTS } from '@/lib/copy/insights'

const upperFirst = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/** Nombre legible del origen de un hecho, por su método. Sin método conocido, la evidencia sellada (nunca la tabla). */
export const sourceLabelOf = (fact: Pick<EvidenceFactV1, 'method'>): string => {
  const name = GH_INSIGHTS.sources[fact.method?.name ?? '']

  return name ? upperFirst(name) : GH_INSIGHTS.document.evidenceSource
}

/** Varias fuentes, sin repetir, en el orden en que aparecen. */
export const sourcesLabelOf = (facts: ReadonlyArray<Pick<EvidenceFactV1, 'method'>>): string => {
  const names = [...new Set(facts.flatMap(fact => {
    const name = GH_INSIGHTS.sources[fact.method?.name ?? '']

    return name ? [upperFirst(name)] : []
  }))]

  return names.length > 0 ? names.join(' · ') : GH_INSIGHTS.document.evidenceSource
}

/** Unidad legible (`count` → «Cantidad»). Una unidad sin traducción no se muestra: devuelve cadena vacía. */
export const unitLabelOf = (unit: string): string => GH_INSIGHTS.units[unit] ?? ''

/** Fecha de corte legible («20 sept 2026» en es-CL). Acepta fecha civil o instante; null si no hay fecha válida. */
export const asOfLabelOf = (asOf: string | null, locale: string): string | null => {
  const civil = asOf?.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!civil) return null

  const date = new Date(Date.UTC(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3])))

  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

/**
 * Ventana de un hecho dicha al lector: un mes completo por su nombre («agosto de 2026»), otro rango como rango.
 * Reemplaza `2026-09-01 a 2026-09-21` en referencias. Una ventana mal formada (fin ≤ inicio) se nombra por su inicio.
 */
export const windowLabelOf = (window: { start: string; endExclusive: string; granularity?: string }, locale: string): string => {
  const start = new Date(`${window.start}T00:00:00Z`)
  const end = new Date(`${window.endExclusive}T00:00:00Z`)
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const dayFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  if (Number.isNaN(start.getTime())) return ''

  if (window.granularity === 'month' || Number.isNaN(end.getTime()) || end <= start) {
    return window.granularity === 'month' ? monthFormatter.format(start) : dayFormatter.format(start)
  }

  const last = new Date(end.getTime() - 86_400_000)

  if (start.getUTCDate() === 1 && end.getUTCDate() === 1 && last.getUTCMonth() === start.getUTCMonth()) return monthFormatter.format(start)

  try {
    return dayFormatter.formatRange(start, last)
  } catch {
    return `${dayFormatter.format(start)} – ${dayFormatter.format(last)}`
  }
}

/**
 * Título por defecto de un informe cuando el encargo no lo trae: los módulos por su nombre, en una frase («Visibilidad
 * orgánica y respuestas de IA»). Sin período: un informe vive muchas ediciones y el período de cada una ya va en su
 * propio lugar; con el mes en el título, la portada lo repetía dos veces (revisión del operador, Berel 2026-10-02).
 */
export const defaultReportTitle = (modules: readonly InsightModule[]): string => {
  const names = modules.map(moduleKey => GH_INSIGHTS.modules[moduleKey].inTitle)
  const joined = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${GH_INSIGHTS.reading.and} ${names.at(-1)}`

  return upperFirst(joined)
}
