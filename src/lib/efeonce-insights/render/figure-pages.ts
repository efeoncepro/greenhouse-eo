/**
 * TASK-1847 — de un `ChartSpecV1` del plan a figuras de barras, compartido por el deck y el informe A4.
 *
 * Vive una sola vez para que la lámina y la hoja no puedan decir cosas distintas de la misma figura:
 * mismos nombres, mismo formato de cifra, misma escala y la misma regla de paginación. Cada mapper
 * sólo decide en qué slots de su plantilla cae cada pieza.
 *
 * - Una serie: cada hecho es una barra con el nombre de su métrica, en escala compartida.
 * - Comparación de períodos (varias series): cada métrica es un grupo —la barra del período con el
 *   nombre de la métrica y, debajo, la de cada referencia con el nombre que le da el plan («Período
 *   anterior»)— que mide contra su propio máximo (`scaleGroup`). Métricas de magnitudes distintas no se
 *   aplastan entre sí y la barra nunca queda sin decir qué mide.
 * - Si las barras no caben, la figura se PAGINA con el primitivo del motor (cada grupo es un bloque
 *   indivisible): nunca se recortan barras. Las páginas se equilibran para que ninguna quede con una
 *   sola barra.
 * - Un hecho sin valor no se dibuja como cero: se omite de la figura y su ausencia está en la tabla y
 *   en los límites. Una figura con menos de dos barras no se emite: el capítulo se narra.
 */

import { paginateFlow, type FlowBlock } from '@/lib/artifact-composer/pure'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { ChartSpecV1 } from '../contracts/chart-spec'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { PlanClaimV1 } from '../contracts/plan'
import { formatFactValue } from '../editorial/format'

/**
 * La forma de fila que declaran los slots `figureSeries` de ambos catálogos. Es `type` y no `interface`
 * a propósito: sólo un alias satisface la firma de índice de `SlotValue` (`Record<string, unknown>`).
 */
export type FigureRowSlot = {
  name: string
  printedValue: string
  valuePct: number
  emphasis: 'lead' | 'rest'
  evidenceRef: string
  scaleGroup?: string
}

export interface FigurePage {
  /** Hechos dibujados en esta página: con ellos se eligen las afirmaciones que la narran. */
  factIds: string[]
  /** `true` si la figura compara períodos (pares con escala propia). */
  comparison: boolean
  title: string
  unit: string
  rows: FigureRowSlot[]
}

type Row = FigureRowSlot & { factId: string }

const rowOf = (name: string, fact: EvidenceFactV1, locale: string, emphasis: 'lead' | 'rest', scaleGroup?: string): Row => ({
  factId: fact.factId,
  name,
  // El formateador canónico del plan, el mismo que escribe tablas y afirmaciones: una figura con su
  // propio formato decía «+1,9%» donde la tabla decía «1,9 %» (y el «+» volvía variación a un nivel).
  printedValue: formatFactValue(fact.value, fact.unit, locale),
  valuePct: fact.value as number,
  emphasis,
  evidenceRef: fact.evidenceRef,
  ...(scaleGroup ? { scaleGroup } : {})
})

const groupsOf = (chart: ChartSpecV1, factsById: ReadonlyMap<string, EvidenceFactV1>, locale: string): Row[][] => {
  const current = chart.series[chart.series.length - 1]
  const references = chart.series.slice(0, -1)

  if (!current) return []

  const measured = (id: string | undefined) => {
    const fact = id ? factsById.get(id) : undefined

    return fact && fact.value !== null ? fact : null
  }

  if (references.length === 0) {
    const drawn = current.factIds
      .map((id, index) => ({ fact: measured(id), name: chart.dimensionLabels[index] }))
      .filter((entry): entry is { fact: EvidenceFactV1; name: string } => entry.fact !== null && Boolean(entry.name))

    const max = Math.max(...drawn.map(entry => entry.fact.value as number))

    return drawn.map(entry => [rowOf(entry.name, entry.fact, locale, entry.fact.value === max ? 'lead' : 'rest')])
  }

  return current.factIds.flatMap((id, index) => {
    const now = measured(id)
    const name = chart.dimensionLabels[index]
    const before = references.map(serie => ({ serie, fact: measured(serie.factIds[index]) }))

    if (!now || !name || before.some(entry => entry.fact === null)) return []

    const group = `dimension-${index}`

    return [[rowOf(name, now, locale, 'lead', group), ...before.map(entry => rowOf(entry.serie.label, entry.fact!, locale, 'rest', group))]]
  })
}

export const buildFigurePages = (
  chart: ChartSpecV1,
  factsById: ReadonlyMap<string, EvidenceFactV1>,
  locale: string,
  maxRows: number
): FigurePage[] => {
  const groups = groupsOf(chart, factsById, locale)
  const total = groups.reduce((sum, group) => sum + group.length, 0)

  if (total < 2) return []

  const groupSize = Math.max(...groups.map(group => group.length))

  if (groupSize > maxRows) {
    throw new Error(`Un grupo de ${groupSize} barras no cabe en una figura de ${maxRows}: el grupo no se parte.`)
  }

  // La capacidad efectiva es múltiplo del tamaño de grupo (los pares no se parten) y se equilibra entre
  // páginas: 8 barras en figuras de 6 salen 4 + 4, no 6 + 2.
  const usable = Math.floor(maxRows / groupSize) * groupSize
  const pageCount = Math.ceil(total / usable)
  const capacity = Math.min(usable, Math.ceil(Math.ceil(total / pageCount) / groupSize) * groupSize)
  const blocks: FlowBlock[] = groups.map((group, index) => ({ blockId: `g${index}`, heightPx: group.length }))

  const pages = paginateFlow(blocks, { contentHeightPx: capacity, guardPx: 0 }).map(page =>
    page.blockIds.flatMap(id => groups[Number(id.slice(1))]!)
  )

  // Una página con una sola barra no es una figura (las plantillas exigen dos): toma una de la anterior.
  const last = pages[pages.length - 1]
  const previous = pages[pages.length - 2]

  if (last && previous && last.length < 2 && previous.length > 2 && groupSize === 1) last.unshift(previous.pop()!)

  const unit = GH_INSIGHTS.units[chart.unit] ?? GH_INSIGHTS.document.unitLabel

  return pages.map((rows, index) => ({
    factIds: rows.map(row => row.factId),
    comparison: chart.series.length > 1,
    title: index === 0 ? chart.title : `${chart.title} ${GH_INSIGHTS.document.figureContinued}`,
    unit,
    // El slot valida su forma: el factId interno no viaja.
    rows: rows.map(row => ({
      name: row.name,
      printedValue: row.printedValue,
      valuePct: row.valuePct,
      emphasis: row.emphasis,
      evidenceRef: row.evidenceRef,
      ...(row.scaleGroup ? { scaleGroup: row.scaleGroup } : {})
    }))
  }))
}

/** Las afirmaciones del capítulo que citan algún hecho de la figura, en el orden del plan. */
export const claimsForFigure = (claims: readonly PlanClaimV1[], page: FigurePage): string[] => {
  const drawn = new Set(page.factIds)

  return claims.filter(claim => claim.factIds.some(id => drawn.has(id))).map(claim => claim.text)
}

/** La bajada cuando la figura tiene una sola afirmación: lee la figura (qué significa cada color). */
export const figureLegendOf = (page: FigurePage): string =>
  page.comparison ? GH_INSIGHTS.document.figureLegendComparison : GH_INSIGHTS.document.figureLegendSingle
