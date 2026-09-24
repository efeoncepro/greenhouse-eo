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

import { lineGeometry, paginateFlow, scatterGeometry, sliceGeometry, type FlowBlock } from '@/lib/artifact-composer/pure'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import { validateChartSpec, type ChartFamily, type ChartSpecV1 } from '../contracts/chart-spec'
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
  chartFamily: ChartFamily
  geometryPath1: string
  geometryPath2: string
  geometryPath3: string
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
  chartFamily: 'bar',
  geometryPath1: '',
  geometryPath2: '',
  geometryPath3: '',
  ...(scaleGroup ? { scaleGroup } : {})
})

const polar = (angle: number, radius: number): [number, number] => {
  const radians = ((angle - 90) * Math.PI) / 180

  return [50 + radius * Math.cos(radians), 50 + radius * Math.sin(radians)]
}

const slicePath = (start: number, end: number, donut: boolean): string => {
  const outer = donut ? 40 : 44
  const inner = 21
  const [sx, sy] = polar(start, outer)
  const [ex, ey] = polar(end, outer)
  const large = end - start > 180 ? 1 : 0

  if (!donut) return `M 50 50 L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${outer} ${outer} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`

  const [isx, isy] = polar(end, inner)
  const [iex, iey] = polar(start, inner)

  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${outer} ${outer} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} L ${isx.toFixed(2)} ${isy.toFixed(2)} A ${inner} ${inner} 0 ${large} 0 ${iex.toFixed(2)} ${iey.toFixed(2)} Z`
}

const pointPath = (x: number, y: number, radius = 1.8): string => {
  const cx = 8 + x * 0.84
  const cy = 92 - y * 0.84

  const points = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * Math.PI * 2) / 12

    return `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`
  })

  return `M ${points.join(' L ')} Z`
}

const rowWithGeometry = (row: Row, family: ChartFamily, paths: readonly string[]): Row => ({
  ...row,
  chartFamily: family,
  geometryPath1: paths[0] ?? '',
  geometryPath2: paths[1] ?? '',
  geometryPath3: paths[2] ?? ''
})

const omitFactId = (row: Row): Omit<Row, 'factId'> => {
  const output = { ...row }

  Reflect.deleteProperty(output, 'factId')

  return output
}

const nonBarFigure = (
  chart: ChartSpecV1,
  factsById: ReadonlyMap<string, EvidenceFactV1>,
  locale: string,
  maxRows: number
): FigurePage[] => {
  const violations = validateChartSpec(chart, new Set(factsById.keys()))

  if (violations.length > 0) {
    throw new Error(`ChartSpec ${chart.chartId} inválido: ${violations.map(violation => `${violation.rule} (${violation.detail})`).join('; ')}`)
  }

  for (const series of chart.series) {
    if (series.factIds.length !== chart.dimensionLabels.length) {
      throw new Error(`ChartSpec ${chart.chartId}: la serie ${series.seriesId} no alinea sus hechos con las dimensiones.`)
    }
  }

  if (chart.family === 'line' && chart.series.some(series => series.unit !== chart.unit)) {
    throw new Error(`ChartSpec ${chart.chartId}: todas las líneas deben compartir la unidad ${chart.unit}; no se admiten ejes mezclados.`)
  }

  if ((chart.family === 'pie' || chart.family === 'donut') && chart.series[0]?.unit !== chart.unit) {
    throw new Error(`ChartSpec ${chart.chartId}: las porciones deben pertenecer al mismo total y unidad ${chart.unit}.`)
  }

  for (const series of chart.series) {
    for (const factId of series.factIds) {
      const fact = factsById.get(factId)

      if (fact && fact.unit !== series.unit) {
        throw new Error(`ChartSpec ${chart.chartId}: el hecho ${factId} usa ${fact.unit} y la serie declara ${series.unit}.`)
      }
    }
  }

  const paths: string[] = []
  let rows: Row[] = []

  if (chart.family === 'line') {
    const geometrySeries = chart.series.map(series => ({
      seriesId: series.seriesId,
      label: series.label,
      values: series.factIds.map(id => factsById.get(id)?.value ?? null)
    }))

    const geometry = lineGeometry(geometrySeries, { zeroBaseline: chart.scale.baseline === 0 })

    if (chart.series.length > 3) {
      throw new Error(`ChartSpec ${chart.chartId}: el molde admite hasta tres series de línea para distinguirlas en escala de grises.`)
    }

    chart.series.forEach(series => {
      paths.push(geometry.segments
        .filter(segment => segment[0]?.seriesId === series.seriesId)
        .map(segment => segment.map((point, index) => {
          const x = (8 + point.xPct * 0.84).toFixed(2)
          const y = (92 - point.yPct * 0.84).toFixed(2)

          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')).join(' '))
    })

    rows = chart.series.flatMap(series => series.factIds.flatMap((id, index) => {
      const fact = factsById.get(id)
      const dimension = chart.dimensionLabels[index]

      return fact && fact.value !== null && dimension
        ? [rowOf(`${dimension} · ${series.label}`, fact, locale, index === series.factIds.length - 1 ? 'lead' : 'rest')]
        : []
    }))
  } else if (chart.family === 'pie' || chart.family === 'donut') {
    const series = chart.series[0]

    if (!series) return []

    const parts = series.factIds.flatMap((id, index) => {
      const fact = factsById.get(id)
      const label = chart.dimensionLabels[index]

      return fact && label ? [{ seriesId: id, label, value: fact.value }] : []
    })

    const slices = sliceGeometry(parts)

    paths.push(...slices.map(slice => slicePath(slice.startAngleDeg, slice.endAngleDeg, chart.family === 'donut')))

    rows = slices.flatMap(slice => {
      const fact = factsById.get(slice.seriesId)

      if (!fact) return []

      const row = rowOf(slice.label, fact, locale, slice.sharePct === Math.max(...slices.map(item => item.sharePct)) ? 'lead' : 'rest')

      return [{ ...row, printedValue: `${row.printedValue} (${String(slice.sharePct).replace('.', ',')} %)` }]
    })
  } else if (chart.family === 'scatter') {
    const [xSeries, ySeries] = chart.series

    if (!xSeries || !ySeries) return []

    const pairs = chart.dimensionLabels.map((label, index) => ({
      pointId: label,
      x: factsById.get(xSeries.factIds[index] ?? '')?.value ?? null,
      y: factsById.get(ySeries.factIds[index] ?? '')?.value ?? null
    }))

    const points = scatterGeometry(pairs)

    paths.push(points.map(point => pointPath(point.xPct, point.yPct)).join(' '))
    rows = points.flatMap(point => {
      const yFactId = ySeries.factIds[chart.dimensionLabels.indexOf(point.pointId)]
      const fact = yFactId ? factsById.get(yFactId) : undefined

      const xFactId = xSeries.factIds[chart.dimensionLabels.indexOf(point.pointId)]
      const xFact = xFactId ? factsById.get(xFactId) : undefined

      return fact && xFact
        ? [{ ...rowOf(point.pointId, fact, locale, 'rest'), printedValue: `${formatFactValue(xFact.value, xFact.unit, locale)} · ${formatFactValue(fact.value, fact.unit, locale)}` }]
        : []
    })
  }

  if (rows.length < 2) return []

  if (rows.length > maxRows) {
    throw new Error(`El gráfico ${chart.family} trae ${rows.length} etiquetas y el molde admite ${maxRows}; no se recortará la figura.`)
  }

  const family = chart.family
  const chartRows = rows.map(row => rowWithGeometry(row, family, paths))

  const unit = chart.family === 'scatter'
    ? `${chart.series[0]!.label} (${chart.series[0]!.unit}) × ${chart.series[1]!.label} (${chart.series[1]!.unit})`
    : GH_INSIGHTS.units[chart.unit] ?? GH_INSIGHTS.document.unitLabel

  return [{
    factIds: rows.map(row => row.factId),
    comparison: chart.series.length > 1,
    title: chart.title,
    unit,
    rows: chartRows.map(omitFactId)
  }]
}

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
  if (!chart.family.startsWith('bar')) return nonBarFigure(chart, factsById, locale, maxRows)

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
      chartFamily: row.chartFamily,
      geometryPath1: row.geometryPath1,
      geometryPath2: row.geometryPath2,
      geometryPath3: row.geometryPath3,
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
