/**
 * Selección colaborativa de «La órbita» dentro del composer.
 *
 * La selección (`efeonce.collaboration-selection` de AXIS) se dibuja sobre los límites REALES del
 * objetivo —la respuesta con su esfera—, así que necesita medir el DOM ya lleno. Por eso es un layout
 * hook y no un slot: corre después del llenado, mide `[data-gl-selection-target]`, pide la pintura al
 * `painter` y la inserta en dos capas (bajo y sobre el contenido).
 *
 * El painter lo INYECTA el consumidor. El motor no importa paquetes (`package-boundary.test.ts`), y
 * pintar la selección es trabajo del adaptador de Greenhouse (`scripts/creative/layout-compiler`), que
 * resuelve el contrato de AXIS. Así el catálogo queda portable y la selección sigue siendo la canónica.
 *
 * Sin painter y con una selección pedida en el plan, el render FALLA: una lámina aprobada con
 * selección no puede salir sin ella y parecer terminada.
 */

import type { CatalogLayoutHook } from '../../catalog'

export interface GraphicLineSelectionRequest {
  bounds: { left: number; top: number; right: number; bottom: number }
  canvas: { width: number; height: number }
  label: string
  anchor: 'top-start' | 'top-end' | 'bottom-end' | 'bottom-start'
  participantKind: 'person' | 'role' | 'department'
  targetKind: 'text' | 'object' | 'group'
  scale: number
  /** Variante, aire y velo que resolvió AXIS para la receta. Sin ellos, el painter usa los de la selección de texto. */
  variant?: string
  padding?: string
  overlay?: string
}

export interface GraphicLineSelectionPaint {
  underlay: string
  overlay: string
  withinCanvas: boolean
}

export type GraphicLineSelectionPainter = (request: GraphicLineSelectionRequest) => GraphicLineSelectionPaint

const ANCHORS = new Set(['top-start', 'top-end', 'bottom-end', 'bottom-start'])
const KINDS = new Set(['person', 'role', 'department'])
const TARGET_KINDS = new Set(['text', 'object', 'group'])

const optional = (value: unknown): string | undefined => {
  const text = String(value ?? '').trim()

  return text ? text : undefined
}

export class GraphicLineSelectionError extends Error {
  constructor(slideId: string, reason: string) {
    super(`[${slideId}] selección de La órbita: ${reason}`)
    this.name = 'GraphicLineSelectionError'
  }
}

export const makeSelectionHook =
  (painter: GraphicLineSelectionPainter | undefined): CatalogLayoutHook =>
  async (page, slide) => {
    const selection = slide.slots.selection as Record<string, unknown> | null | undefined

    if (!selection) return

    if (!painter) {
      throw new GraphicLineSelectionError(
        slide.slideId,
        'el plan pide selección y el catálogo se construyó sin painter. Constrúyelo con el painter de Greenhouse.'
      )
    }

    const label = String(selection.label ?? '').trim()
    const anchor = String(selection.anchor ?? 'top-end')
    const participantKind = String(selection.participantKind ?? 'department')
    const targetKind = String(selection.targetKind ?? 'text')

    if (!label) throw new GraphicLineSelectionError(slide.slideId, 'falta la etiqueta del participante.')
    if (!ANCHORS.has(anchor)) throw new GraphicLineSelectionError(slide.slideId, `ancla "${anchor}" no es de colaborador.`)
    if (!KINDS.has(participantKind)) throw new GraphicLineSelectionError(slide.slideId, `tipo "${participantKind}" desconocido.`)
    if (!TARGET_KINDS.has(targetKind)) throw new GraphicLineSelectionError(slide.slideId, `objetivo "${targetKind}" desconocido.`)

    const measured = await page.evaluate(kind => {
      const target = document.querySelector('[data-gl-selection-target]')

      if (!target) return null

      const canvas = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }

      // Un objeto o un grupo se seleccionan por su caja: la que la plantilla posicionó desde el plan.
      if (kind !== 'text') {
        const box = target.getBoundingClientRect()

        return { bounds: { left: box.left, top: box.top, right: box.right, bottom: box.bottom }, canvas }
      }

      // Texto: límites intrínsecos de las letras (sin el interlineado de la caja). La selección rodea las
      // letras y la esfera, con el aire proporcional que pone el contrato — no la caja del párrafo.
      const range = document.createRange()

      range.selectNodeContents(target)

      const r = range.getBoundingClientRect()
      const pad = r.height * 0.16

      return { bounds: { left: r.left, top: r.top + pad, right: r.right, bottom: r.bottom - pad * 0.6 }, canvas }
    }, targetKind)

    if (!measured) {
      throw new GraphicLineSelectionError(slide.slideId, 'la plantilla no marca `[data-gl-selection-target]`.')
    }

    const { bounds } = measured

    if (bounds.right - bounds.left < 1 || bounds.bottom - bounds.top < 1) {
      throw new GraphicLineSelectionError(slide.slideId, 'la caja del objetivo mide cero: el plan no la posicionó.')
    }

    const paint = painter({
      bounds: measured.bounds,
      canvas: measured.canvas,
      label,
      anchor: anchor as GraphicLineSelectionRequest['anchor'],
      participantKind: participantKind as GraphicLineSelectionRequest['participantKind'],
      targetKind: targetKind as GraphicLineSelectionRequest['targetKind'],
      scale: Number(selection.scale ?? 1.2),
      variant: optional(selection.variant),
      padding: optional(selection.padding),
      overlay: optional(selection.overlay)
    })

    if (!paint.withinCanvas) {
      throw new GraphicLineSelectionError(slide.slideId, 'la selección o su etiqueta quedan fuera del lienzo.')
    }

    await page.evaluate(
      ({ underlay, overlay, width, height }) => {
        const layer = (markup: string, z: number) => {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

          svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
          svg.setAttribute('width', String(width))
          svg.setAttribute('height', String(height))
          svg.setAttribute('aria-hidden', 'true')
          svg.setAttribute('style', `position:absolute;inset:0;z-index:${z};pointer-events:none`)
          svg.innerHTML = markup

          return svg
        }

        const root = document.querySelector('[data-gl-root]') ?? document.body

        root.appendChild(layer(underlay, 1))
        root.appendChild(layer(overlay, 3))
      },
      { underlay: paint.underlay, overlay: paint.overlay, width: measured.canvas.width, height: measured.canvas.height }
    )
  }
