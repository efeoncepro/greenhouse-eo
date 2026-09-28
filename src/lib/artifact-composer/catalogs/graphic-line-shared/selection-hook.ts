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
  /** Color del cursor principal (#rrggbb). Sin él, el del participante por orden. */
  color?: string
  /**
   * Otros colaboradores sobre el MISMO objetivo (TASK-1928, la fuerza híbrida: Estrategia y Agente IA sobre la misma
   * respuesta). Cada uno con su ancla, su acción y, si la receta lo mide, su color.
   */
  extraCursors?: { label: string; anchor: GraphicLineSelectionRequest['anchor']; action: 'select' | 'resize'; participantKind: GraphicLineSelectionRequest['participantKind']; color?: string }[]
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

const HEX = /^#[0-9a-f]{6}$/i

const colorOf = (slideId: string, value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined

  if (typeof value !== 'string' || !HEX.test(value)) throw new GraphicLineSelectionError(slideId, `color "${String(value)}" no es #rrggbb.`)

  return value
}

/** Pinta una selección ya medida (capas bajo y sobre el contenido). */
const paintLayers = async (page: Parameters<CatalogLayoutHook>[0], paint: GraphicLineSelectionPaint, canvas: { width: number; height: number }) =>
  page.evaluate(
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
    { underlay: paint.underlay, overlay: paint.overlay, width: canvas.width, height: canvas.height }
  )

type TargetBox = { label?: unknown; anchor?: unknown; participantKind?: unknown; color?: unknown; box?: { left?: unknown; top?: unknown; right?: unknown; bottom?: unknown } }

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

    // Varias selecciones sobre regiones de la foto (la escena de la fuerza híbrida): cada caja la midió quien produjo
    // la toma, en coordenadas del lienzo; no hay nada que medir en el DOM.
    if (Array.isArray(selection.targets)) {
      const canvas = await page.evaluate(() => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }))

      for (const [index, raw] of (selection.targets as TargetBox[]).entries()) {
        const label = String(raw.label ?? '').trim()
        const anchor = String(raw.anchor ?? '')
        const participantKind = String(raw.participantKind ?? selection.participantKind ?? 'department')
        const box = raw.box ?? {}
        const bounds = { left: Number(box.left), top: Number(box.top), right: Number(box.right), bottom: Number(box.bottom) }

        if (!label) throw new GraphicLineSelectionError(slide.slideId, `la selección ${index + 1} no trae etiqueta.`)
        if (!ANCHORS.has(anchor)) throw new GraphicLineSelectionError(slide.slideId, `ancla "${anchor}" no es de colaborador.`)
        if (!KINDS.has(participantKind)) throw new GraphicLineSelectionError(slide.slideId, `tipo "${participantKind}" desconocido.`)

        if (!Object.values(bounds).every(Number.isFinite) || bounds.right - bounds.left < 1 || bounds.bottom - bounds.top < 1) {
          throw new GraphicLineSelectionError(slide.slideId, `la caja de la selección ${index + 1} no es válida.`)
        }

        const paint = painter({
          bounds,
          canvas,
          label,
          anchor: anchor as GraphicLineSelectionRequest['anchor'],
          participantKind: participantKind as GraphicLineSelectionRequest['participantKind'],
          targetKind: 'object',
          scale: Number(selection.scale ?? 1.2),
          variant: optional(selection.variant),
          padding: optional(selection.padding),
          overlay: optional(selection.overlay),
          color: colorOf(slide.slideId, raw.color)
        })

        if (!paint.withinCanvas) throw new GraphicLineSelectionError(slide.slideId, `la selección ${index + 1} o su etiqueta quedan fuera del lienzo.`)

        await paintLayers(page, paint, canvas)
      }

      return
    }

    const label = String(selection.label ?? '').trim()
    const anchor = String(selection.anchor ?? 'top-end')
    const participantKind = String(selection.participantKind ?? 'department')
    const targetKind = String(selection.targetKind ?? 'text')

    if (!label) throw new GraphicLineSelectionError(slide.slideId, 'falta la etiqueta del participante.')
    if (!ANCHORS.has(anchor)) throw new GraphicLineSelectionError(slide.slideId, `ancla "${anchor}" no es de colaborador.`)
    if (!KINDS.has(participantKind)) throw new GraphicLineSelectionError(slide.slideId, `tipo "${participantKind}" desconocido.`)
    if (!TARGET_KINDS.has(targetKind)) throw new GraphicLineSelectionError(slide.slideId, `objetivo "${targetKind}" desconocido.`)

    // Se mide con la tipografía definitiva: medir con la fuente de respaldo mueve la caja entre corridas.
    await page.evaluate(() => document.fonts.ready)

    const measured = await page.evaluate(({ kind, perLine }) => {
      const target = document.querySelector('[data-gl-selection-target]')

      if (!target) return null

      const canvas = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }

      // Un objeto o un grupo se seleccionan por su caja: la que la plantilla posicionó desde el plan.
      if (kind !== 'text') {
        const box = target.getBoundingClientRect()

        return { bounds: { left: box.left, top: box.top, right: box.right, bottom: box.bottom }, canvas }
      }

      // Texto: límites intrínsecos de las letras (sin el interlineado de la caja). La selección rodea las
      // letras y la esfera, con el aire proporcional que pone el contrato — no la caja del párrafo. Por defecto el
      // aire es el 16 % del alto del texto (así se aprobaron las láminas hasta TASK-1927). Con `perLine` es el 16 % del
      // alto de UNA línea, como el selector canónico de las láminas de la fuerza híbrida (TASK-1928): con una
      // respuesta de dos líneas, el aire sobre el alto total sería el doble.
      const range = document.createRange()

      range.selectNodeContents(target)

      const r = range.getBoundingClientRect()
      const tops: number[] = []

      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width > 0 && !tops.some(top => Math.abs(top - rect.top) < rect.height / 2)) tops.push(rect.top)
      }

      const pad = (perLine ? r.height / Math.max(1, tops.length) : r.height) * 0.16

      return { bounds: { left: r.left, top: r.top + pad, right: r.right, bottom: r.bottom - pad * 0.6 }, canvas }
    }, { kind: targetKind, perLine: selection.textPad === 'per-line' })

    if (!measured) {
      throw new GraphicLineSelectionError(slide.slideId, 'la plantilla no marca `[data-gl-selection-target]`.')
    }

    const { bounds } = measured

    if (bounds.right - bounds.left < 1 || bounds.bottom - bounds.top < 1) {
      throw new GraphicLineSelectionError(slide.slideId, 'la caja del objetivo mide cero: el plan no la posicionó.')
    }

    const also = (Array.isArray(selection.also) ? selection.also : []) as Record<string, unknown>[]

    const extraCursors = also.map((cursor, index) => {
      const extraLabel = String(cursor.label ?? '').trim()
      const extraAnchor = String(cursor.anchor ?? '')
      const action = String(cursor.action ?? 'select')
      const extraKind = String(cursor.participantKind ?? participantKind)

      if (!extraLabel) throw new GraphicLineSelectionError(slide.slideId, `el cursor ${index + 2} no trae etiqueta.`)
      if (!ANCHORS.has(extraAnchor)) throw new GraphicLineSelectionError(slide.slideId, `ancla "${extraAnchor}" no es de colaborador.`)
      if (action !== 'select' && action !== 'resize') throw new GraphicLineSelectionError(slide.slideId, `acción "${action}" desconocida.`)
      if (!KINDS.has(extraKind)) throw new GraphicLineSelectionError(slide.slideId, `tipo "${extraKind}" desconocido.`)

      return {
        label: extraLabel,
        anchor: extraAnchor as GraphicLineSelectionRequest['anchor'],
        action: action as 'select' | 'resize',
        participantKind: extraKind as GraphicLineSelectionRequest['participantKind'],
        color: colorOf(slide.slideId, cursor.color)
      }
    })

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
      overlay: optional(selection.overlay),
      color: colorOf(slide.slideId, selection.color),
      ...(extraCursors.length > 0 ? { extraCursors } : {})
    })

    if (!paint.withinCanvas) {
      throw new GraphicLineSelectionError(slide.slideId, 'la selección o su etiqueta quedan fuera del lienzo.')
    }

    await paintLayers(page, paint, measured.canvas)
  }
