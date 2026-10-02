/**
 * Hook de la falla en bytes (TASK-1923). La geometría NO se calcula aquí: la produce `computeByteFracture`
 * (`src/lib/glitch-composition/byte-fracture.ts`, pura y determinista) y el CLI la adjunta al plan ya pintada
 * (posición, tamaño, opacidad y color muestreado del borde de la foto procesada). Este hook sólo dibuja esas celdas
 * dentro de `[data-gx-bytes]`: sin azar, sin medir el DOM.
 *
 * Sin slot `bytes` (una lámina sin foto), no dibuja nada. En el probe del gate visual el slot trae su `example`.
 */

import type { CatalogLayoutHook } from '../../catalog'

export interface GlitchPaintedCell {
  x: number
  y: number
  size: number
  opacity: number
  fill: string
}

export class GlitchFractureError extends Error {
  constructor(slideId: string, reason: string) {
    super(`[${slideId}] falla en bytes de Glitch: ${reason}`)
    this.name = 'GlitchFractureError'
  }
}

const HEX = /^#[0-9a-f]{6}$/

export const parseFractureCells = (slideId: string, raw: unknown): GlitchPaintedCell[] => {
  if (raw === undefined || raw === null || raw === '') return []

  let cells: unknown

  try {
    cells = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    throw new GlitchFractureError(slideId, 'el slot `bytes` no es JSON válido.')
  }

  if (!Array.isArray(cells)) throw new GlitchFractureError(slideId, 'el slot `bytes` debe ser una lista de celdas.')

  return cells.map((cell, i) => {
    const c = cell as Partial<GlitchPaintedCell>

    if (![c.x, c.y, c.size, c.opacity].every((n) => typeof n === 'number' && Number.isFinite(n)) || typeof c.fill !== 'string' || !HEX.test(c.fill)) {
      throw new GlitchFractureError(slideId, `la celda ${i} no tiene x, y, size, opacity numéricos y fill #rrggbb.`)
    }

    return c as GlitchPaintedCell
  })
}

export const glitchFractureHook: CatalogLayoutHook = async (page, slide) => {
  const cells = parseFractureCells(slide.slideId, (slide.slots as Record<string, unknown>).bytes)

  if (cells.length === 0) return

  const drawn = await page.evaluate((list) => {
    const host = document.querySelector('[data-gx-bytes]')

    if (!host) return false

    const ns = 'http://www.w3.org/2000/svg'

    for (const c of list) {
      const rect = document.createElementNS(ns, 'rect')

      rect.setAttribute('x', String(c.x))
      rect.setAttribute('y', String(c.y))
      rect.setAttribute('width', String(c.size))
      rect.setAttribute('height', String(c.size))
      rect.setAttribute('fill', c.fill)
      rect.setAttribute('fill-opacity', String(c.opacity))
      host.appendChild(rect)
    }

    return true
  }, cells)

  if (!drawn) throw new GlitchFractureError(slide.slideId, 'la plantilla trae celdas pero no marca `[data-gx-bytes]`.')
}
