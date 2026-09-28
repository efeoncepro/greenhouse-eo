/**
 * CTA de «La órbita» (web): el botón es un GRUPO con corchetes abiertos y un cursor local, y el descriptor va
 * justo debajo del cursor. Como la selección, depende de los límites reales del botón ya lleno, así que es un
 * layout hook y la pintura la inyecta el consumidor (contrato `efeonce.collaboration-selection`, variante
 * `open-brackets`, cursor `local` en `end-center`).
 *
 * La plantilla marca el botón con `[data-gl-cta-target]` y el descriptor con `[data-gl-cta-descriptor]`.
 */

import type { CatalogLayoutHook } from '../../catalog'

export interface GraphicLineCtaRequest {
  bounds: { left: number; top: number; right: number; bottom: number }
  canvas: { width: number; height: number }
  /** Escala del cursor local respecto del lienzo (1 en escritorio; el teléfono usa la suya). */
  cursorScale: number
}

export interface GraphicLineCtaPaint {
  overlay: string
  /** Borde inferior de todo lo pintado (corchetes y cursor): el descriptor va debajo. */
  bottom: number
  withinCanvas: boolean
}

export type GraphicLineCtaPainter = (request: GraphicLineCtaRequest) => GraphicLineCtaPaint

export class GraphicLineCtaError extends Error {
  constructor(slideId: string, reason: string) {
    super(`[${slideId}] CTA de La órbita: ${reason}`)
    this.name = 'GraphicLineCtaError'
  }
}

/**
 * @param descriptorGapOfWidth aire entre el cursor y el descriptor, como fracción del ancho del lienzo.
 *
 * Una receta que mide su propio CTA (TASK-1928: el anillo del puntaje) manda en el slot `cta` su escala del cursor
 * (`cursorScale`) y el aire del descriptor en px (`descriptorGapPx`); sin ellos rigen las opciones del catálogo.
 */
export const makeCtaHook =
  (painter: GraphicLineCtaPainter | undefined, options: { cursorScale: number; descriptorGapOfWidth: number }): CatalogLayoutHook =>
  async (page, slide) => {
    const cta = slide.slots.cta as Record<string, unknown> | null | undefined

    if (!cta) return

    if (!painter) {
      throw new GraphicLineCtaError(slide.slideId, 'el plan trae CTA y el catálogo se construyó sin painter de CTA.')
    }

    // Se mide con la tipografía definitiva: medir con la fuente de respaldo mueve la caja entre corridas.
    await page.evaluate(() => document.fonts.ready)

    const measured = await page.evaluate(() => {
      const target = document.querySelector('[data-gl-cta-target]')

      if (!target) return null

      const r = target.getBoundingClientRect()

      return {
        bounds: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
        canvas: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
      }
    })

    if (!measured) throw new GraphicLineCtaError(slide.slideId, 'la plantilla no marca `[data-gl-cta-target]`.')

    const cursorScale = typeof cta.cursorScale === 'number' ? cta.cursorScale : options.cursorScale

    const descriptorGap =
      typeof cta.descriptorGapPx === 'number' ? cta.descriptorGapPx : options.descriptorGapOfWidth * measured.canvas.width

    const paint = painter({ bounds: measured.bounds, canvas: measured.canvas, cursorScale })

    if (!paint.withinCanvas) throw new GraphicLineCtaError(slide.slideId, 'el CTA pintado queda fuera del lienzo.')

    await page.evaluate(
      ({ overlay, width, height, descriptorTop }) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
        svg.setAttribute('width', String(width))
        svg.setAttribute('height', String(height))
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('style', 'position:absolute;inset:0;z-index:5;pointer-events:none')
        svg.innerHTML = overlay
        ;(document.querySelector('[data-gl-root]') ?? document.body).appendChild(svg)

        const descriptor = document.querySelector('[data-gl-cta-descriptor]') as HTMLElement | null

        if (descriptor) descriptor.style.top = `${descriptorTop}px`
      },
      {
        overlay: paint.overlay,
        width: measured.canvas.width,
        height: measured.canvas.height,
        descriptorTop: Math.round(paint.bottom + descriptorGap)
      }
    )
  }
