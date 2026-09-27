/**
 * Hooks de la hoja del cuadro a cuadro (`MotionStoryboard`, catálogo `graphic-line-stills`).
 *
 * La hoja repite el lienzo 16:9 del loop en ocho cuadros a escala. Dos cosas no pueden ser slots:
 *   - La toma: es UN plate para los ocho cuadros (el plan la entrega una vez en el slot `photo`); este hook copia
 *     sus bytes ya resueltos a cada capa de foto de los cuadros (`[data-gl-sb-photo]`).
 *   - La selección colaborativa: se dibuja sobre los límites REALES de la respuesta de cada cuadro con la escena
 *     `voice`, medidos en coordenadas del lienzo del cuadro (1920 × 1080) y no de la hoja. La pintura la inyecta
 *     el consumidor, igual que en el resto de La órbita.
 *
 * Falla cerrado: sin foto que copiar, o con selección pedida y sin painter, la hoja no se compone.
 */

import type { CatalogLayoutHook } from '../../catalog'
import { GraphicLineSelectionError, type GraphicLineSelectionPainter } from '../graphic-line-shared/selection-hook'

const ANCHORS = new Set(['top-start', 'top-end', 'bottom-end', 'bottom-start'])

export const makeStoryboardHook =
  (painter: GraphicLineSelectionPainter | undefined): CatalogLayoutHook =>
  async (page, slide) => {
    const copied = await page.evaluate(async () => {
      const source = document.querySelector('[data-gl-sb-source]') as HTMLImageElement | null
      const src = source?.getAttribute('src') ?? ''

      if (!src.startsWith('data:')) return 0

      const targets = Array.from(document.querySelectorAll('[data-gl-sb-photo]')) as HTMLImageElement[]

      targets.forEach(img => img.setAttribute('src', src))
      await Promise.all(targets.map(img => img.decode().catch(() => undefined)))

      return targets.length
    })

    if (copied === 0) {
      throw new GraphicLineSelectionError(slide.slideId, 'la hoja no tiene la toma resuelta para copiar a sus cuadros.')
    }

    const selection = slide.slots.selection as Record<string, unknown> | null | undefined

    if (!selection) return

    if (!painter) {
      throw new GraphicLineSelectionError(
        slide.slideId,
        'el plan pide selección y el catálogo se construyó sin painter. Constrúyelo con el painter de Greenhouse.'
      )
    }

    const label = String(selection.label ?? '').trim()
    const anchor = String(selection.anchor ?? 'bottom-end')
    const participantKind = String(selection.participantKind ?? 'role')

    if (!label) throw new GraphicLineSelectionError(slide.slideId, 'falta la etiqueta del participante.')
    if (!ANCHORS.has(anchor)) throw new GraphicLineSelectionError(slide.slideId, `ancla "${anchor}" no es de colaborador.`)

    // Límites de la respuesta de cada cuadro con escena `voice`, en px del lienzo del cuadro.
    const targets = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.gl-sb-kind-voice [data-gl-sb-stage]')).map(stage => {
        const stageBox = stage.getBoundingClientRect()
        const scale = stageBox.width / 1920
        const target = stage.querySelector('[data-gl-sb-selection-target]')

        if (!target) return null

        const range = document.createRange()

        range.selectNodeContents(target)

        const r = range.getBoundingClientRect()
        const toStage = (x: number, origin: number) => (x - origin) / scale
        const pad = (r.height / scale) * 0.16

        return {
          left: toStage(r.left, stageBox.left),
          top: toStage(r.top, stageBox.top) + pad,
          right: toStage(r.right, stageBox.left),
          bottom: toStage(r.bottom, stageBox.top) - pad * 0.6
        }
      })
    )

    if (targets.length === 0 || targets.some(t => t === null)) {
      throw new GraphicLineSelectionError(slide.slideId, 'la hoja pide selección y no hay respuesta que medir en sus cuadros.')
    }

    const paints = targets.map(bounds => {
      const paint = painter({
        bounds: bounds!,
        canvas: { width: 1920, height: 1080 },
        label,
        anchor: anchor as never,
        participantKind: participantKind as never,
        targetKind: 'text',
        scale: Number(selection.scale ?? 1.6)
      })

      if (!paint.withinCanvas) {
        throw new GraphicLineSelectionError(slide.slideId, 'la selección o su etiqueta quedan fuera del cuadro.')
      }

      return paint
    })

    await page.evaluate(list => {
      const stages = Array.from(document.querySelectorAll('.gl-sb-kind-voice [data-gl-sb-stage]'))

      stages.forEach((stage, i) => {
        const layer = (markup: string, z: number) => {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

          svg.setAttribute('viewBox', '0 0 1920 1080')
          svg.setAttribute('width', '1920')
          svg.setAttribute('height', '1080')
          svg.setAttribute('aria-hidden', 'true')
          svg.setAttribute('style', `position:absolute;inset:0;z-index:${z};pointer-events:none`)
          svg.innerHTML = markup

          return svg
        }

        stage.appendChild(layer(list[i]!.underlay, 1))
        stage.appendChild(layer(list[i]!.overlay, 3))
      })
    }, paints.map(p => ({ underlay: p.underlay, overlay: p.overlay })))
  }
