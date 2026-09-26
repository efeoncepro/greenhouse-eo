/**
 * Hooks de las páginas de figura premium (TASK-1889 Slice 4). La figura viaja como slots
 * `validation-only` (el contrato valida su forma y sus cifras) y el hook dibuja el SVG con la geometría
 * pura de `figure-svg.ts` en el nodo anfitrión de la plantilla. Mismo patrón que el número de capítulo:
 * lo que es arte derivado del dato no es un slot pintable.
 */

import type { CatalogLayoutHook } from '../../catalog'
import {
  groupedColumnsSvg,
  lineChartSvg,
  type ColumnBandInput,
  type ColumnGroupInput,
  type ColumnOpportunityInput,
  type ColumnsBox,
  type LineAnnotationsInput,
  type LineSeriesInput,
  type LinesBox
} from './figure-svg'

const insertSvg = async (page: Parameters<CatalogLayoutHook>[0], host: string, markup: string, what: string) => {
  await page.evaluate(
    ({ selector, svg, label }) => {
      const node = document.querySelector(selector)

      if (!node) throw new Error(`${label}: falta el nodo ${selector} en la plantilla.`)

      node.innerHTML = svg
    },
    { selector: host, svg: markup, label: what }
  )
}

/** Resumen accesible de la figura: título y, por grupo, sus cifras (el SVG no se lee como texto). */
const columnsAria = (title: string, groups: readonly ColumnGroupInput[]): string =>
  `${title}. ${groups.map(group => `${group.label}: ${group.current}${group.prior !== undefined ? ` contra ${group.prior}` : ''}.`).join(' ')}`

export const makeColumnsHook = (box: ColumnsBox): CatalogLayoutHook => async (page, slide) => {
  const groups = (slide.slots.columnGroups ?? []) as unknown as ColumnGroupInput[]
  const band = (slide.slots.columnBand ?? null) as unknown as ColumnBandInput | null
  const opportunity = (slide.slots.columnOpportunity ?? null) as unknown as ColumnOpportunityInput | null
  const title = String(slide.slots.figureTitle ?? '')

  await insertSvg(page, '.fig-columns-host', groupedColumnsSvg(groups, box, { band, opportunity, ariaLabel: columnsAria(title, groups) }), 'Columnas agrupadas')
}

/** Resumen accesible de las líneas: título y, por serie, su primer y último valor. */
const linesAria = (title: string, series: readonly LineSeriesInput[]): string =>
  `${title}. ${series
    .map(s => {
      const values = s.values.filter((v): v is string => v !== null)

      return `${s.label}: de ${values[0] ?? '—'} a ${values.at(-1) ?? '—'}.`
    })
    .join(' ')}`

export const makeLinesHook = (box: LinesBox): CatalogLayoutHook => async (page, slide) => {
  const series = (slide.slots.lineSeries ?? []) as unknown as LineSeriesInput[]
  const xLabels = (slide.slots.lineXLabels ?? []) as unknown as Array<{ index: number; label: string }>
  const annotations = (slide.slots.lineAnnotations ?? {}) as unknown as LineAnnotationsInput
  const title = String(slide.slots.figureTitle ?? '')

  await insertSvg(page, '.fig-lines-host', lineChartSvg(series, xLabels, box, { ...annotations, ariaLabel: linesAria(title, series) }), 'Líneas')
}

/**
 * Cuerpo de la cifra principal de la lámina 16:9 según su largo (canvas `Deck-*`): hasta 3 caracteres
 * 132 px («+3», «46»), hasta 5 112 px («107 %»), más largo 104 px («+16,5 %»). Así la cifra llena su
 * columna sin que nadie elija el tamaño; en ningún caso se recorta.
 */
export const deckFigureSizeClass = (text: string): string | null => {
  const length = [...text.trim()].length

  return length <= 3 ? 'fig-number--lg' : length <= 5 ? 'fig-number--md' : null
}

export const withDeckFigureSize = (inner?: CatalogLayoutHook): CatalogLayoutHook => async (page, slide, deckPlan) => {
  const sizeClass = deckFigureSizeClass(String(slide.slots.keyFigure ?? ''))

  if (sizeClass) {
    await page.evaluate(cls => document.querySelector('.fig-number')?.classList.add(cls), sizeClass)
  }

  if (inner) await inner(page, slide, deckPlan)
}
