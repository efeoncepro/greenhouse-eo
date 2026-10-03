import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { estimateAlignment, renderZoneGuide } from './alignment'
import { maskFromRect } from './mask'
import { loadRgba } from './raw'

/** Escena con bordes: rectángulos de distintos grises sobre fondo medio. */
const scene = async (offsetX = 0, offsetY = 0) => {
  const rects = [
    [60, 40, 90, 60, '#202020'],
    [220, 150, 70, 90, '#f0f0f0'],
    [330, 60, 40, 140, '#505050'],
    [120, 210, 110, 40, '#d0d0d0']
  ]
    .map(([x, y, w, h, c]) => `<rect x="${Number(x) + offsetX}" y="${Number(y) + offsetY}" width="${w}" height="${h}" fill="${c}"/>`)
    .join('')

  return loadRgba(await sharp(Buffer.from(`<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#808080"/>${rects}</svg>`)).png().toBuffer())
}

describe('detector de reencuadre', () => {
  const mask = maskFromRect(400, 300, { x0: 0.02, y0: 0.6, x1: 0.2, y1: 0.95 })

  it('una salida en el mismo encuadre no se marca', async () => {
    const estimate = await estimateAlignment(await scene(), await scene(), mask)

    expect(estimate.misaligned).toBe(false)
    expect([estimate.dx, estimate.dy, estimate.scale]).toEqual([0, 0, 1])
  })

  it('una salida corrida se marca y estima el desplazamiento', async () => {
    const estimate = await estimateAlignment(await scene(), await scene(14, -10), mask)

    expect(estimate.misaligned).toBe(true)
    expect(Math.abs(estimate.dx - 14)).toBeLessThanOrEqual(5)
    expect(Math.abs(estimate.dy + 10)).toBeLessThanOrEqual(5)
  })
})

describe('guía de zona', () => {
  it('dibuja el contorno de la máscara en magenta y deja el interior y el exterior intactos', async () => {
    const base = await scene()
    const guide = renderZoneGuide(base, maskFromRect(400, 300, { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 }), 3)
    const px = (x: number, y: number) => Array.from(guide.data.slice((y * 400 + x) * 4, (y * 400 + x) * 4 + 3))

    expect(px(101, 150)).toEqual([255, 0, 255])
    expect(px(200, 150)).toEqual(Array.from(base.data.slice((150 * 400 + 200) * 4, (150 * 400 + 200) * 4 + 3)))
    expect(px(10, 10)).toEqual(Array.from(base.data.slice((10 * 400 + 10) * 4, (10 * 400 + 10) * 4 + 3)))
  })
})
