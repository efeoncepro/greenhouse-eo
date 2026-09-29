/**
 * Hook de los gráficos de Marketing con Manzanitas (TASK-1939). El catálogo no importa paquetes (frontera del motor):
 * el painter lo inyecta quien compone (el comando o el worker) y es `manzanitasChartSvg` de
 * `@efeoncepro/axis-graphic-line/charts`. El dato viaja en el slot `chart` (`validation-only`, JSON) y el hook pinta el
 * SVG en `[data-mcm-chart]`, en línea, para que use las fuentes de la página. Nunca se dibuja a mano.
 */

import type { SlideSpec } from '../../contracts'
import type { CatalogLayoutHook } from '../../catalog'

export interface ManzanitasChartRequest {
  recipe: string
  line: string
  surface: 'paper' | 'navy'
  data: Record<string, unknown>
  options?: Record<string, unknown>
}

/** Devuelve el SVG del gráfico (lienzo 1080 × 1350) o lanza con el código del contrato. */
export type ManzanitasChartPainter = (request: ManzanitasChartRequest) => string

export const parseChartRequest = (slide: Pick<SlideSpec, 'slideId' | 'slots'>): ManzanitasChartRequest => {
  const raw = slide.slots.chart

  if (typeof raw !== 'string') throw new Error(`manzanitas: la lámina ${slide.slideId} no trae el dato del gráfico (slot chart).`)

  const parsed = JSON.parse(raw) as Partial<ManzanitasChartRequest>

  if (typeof parsed.recipe !== 'string' || typeof parsed.line !== 'string' || (parsed.surface !== 'paper' && parsed.surface !== 'navy') || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error(`manzanitas: el dato del gráfico de ${slide.slideId} no tiene receta, línea, superficie y dato.`)
  }

  return parsed as ManzanitasChartRequest
}

export const makeManzanitasChartHook = (painter: ManzanitasChartPainter | undefined): CatalogLayoutHook => async (page, slide) => {
  if (!painter) throw new Error('manzanitas: el catálogo necesita un chartPainter para pintar gráficos (lo inyecta quien compone).')

  const svg = painter(parseChartRequest(slide))

  if (!svg.startsWith('<svg')) throw new Error(`manzanitas: el painter no devolvió un SVG para ${slide.slideId}.`)

  const ok = await page.evaluate((markup) => {
    const host = document.querySelector('[data-mcm-chart]')

    if (!host) return false
    host.innerHTML = markup

    return true
  }, svg)

  if (!ok) throw new Error(`manzanitas: la plantilla de ${slide.slideId} no tiene [data-mcm-chart].`)
}
