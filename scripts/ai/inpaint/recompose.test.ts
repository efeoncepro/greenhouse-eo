import { describe, expect, it } from 'vitest'

import { pickGridSize, planCrop } from './crop'
import { createMask, feather, maskFromRect } from './mask'
import { cropRgba, measureZones, placePatch, recompose, resizeRgba, verifyRecomposition } from './recompose'
import { encodeRgbaPng, loadRgba, type RgbaImage } from './raw'

const noise = (width: number, height: number, seed: number, hadAlpha = false): RgbaImage => {
  const data = new Uint8Array(width * height * 4)
  let state = seed

  for (let i = 0; i < data.length; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648
    data[i] = i % 4 === 3 && !hadAlpha ? 255 : state % 256
  }

  return { width, height, channels: 4, hadAlpha, data }
}

describe('recomposición', () => {
  it('deja la zona protegida idéntica bit a bit aunque el modelo la haya cambiado entera', async () => {
    const base = noise(64, 48, 1)
    const model = noise(64, 48, 2) // el "modelo" redibujó TODO, como GPT Image 2.5 medido
    const mask = await feather(maskFromRect(64, 48, { x0: 0.3, y0: 0.3, x1: 0.7, y1: 0.7 }), 6)
    const final = recompose(base, model, mask)
    const report = verifyRecomposition(base, final, mask)

    expect(report.verdict).toBe('PASS')
    expect(report.protected.maxDelta).toBe(0)
    expect(report.protected.pixels).toBeGreaterThan(0)
    expect(report.seam.pixels).toBeGreaterThan(0)
    expect(report.editable.meanDelta).toBeGreaterThan(0)
  })

  it('el veredicto falla ante UN solo byte cambiado en la zona protegida, con su posición', () => {
    const base = noise(10, 10, 3)
    const mask = maskFromRect(10, 10, { x0: 0.5, y0: 0, x1: 1, y1: 1 })
    const tampered: RgbaImage = { ...base, data: new Uint8Array(base.data) }

    tampered.data[(2 * 10 + 1) * 4] ^= 1

    const report = verifyRecomposition(base, tampered, mask)

    expect(report.verdict).toBe('FAIL')
    expect(report.protected.maxDelta).toBe(1)
    expect(report.protected.worst).toEqual({ x: 1, y: 2 })
    expect(report.reason).toMatch(/delta máximo 1\/255/)
  })

  it('la media no es el criterio: un pico chico con media casi cero igual falla', () => {
    const base = noise(100, 100, 4)
    const mask = maskFromRect(100, 100, { x0: 0.9, y0: 0.9, x1: 1, y1: 1 })
    const tampered: RgbaImage = { ...base, data: new Uint8Array(base.data) }

    tampered.data[0] = (tampered.data[0] + 200) % 256

    const report = verifyRecomposition(base, tampered, mask)

    expect(report.protected.meanDelta).toBeLessThan(0.1)
    expect(report.verdict).toBe('FAIL')
  })

  it('sin zona protegida el veredicto lo dice explícito', () => {
    const base = noise(4, 4, 5)

    expect(verifyRecomposition(base, noise(4, 4, 6), createMask(4, 4, 255)).reason).toMatch(/--allow-full/)
  })

  it('verifica el ARCHIVO escrito: PNG ida y vuelta conserva los bytes, con y sin alfa', async () => {
    for (const hadAlpha of [false, true]) {
      const base = noise(32, 32, 7, hadAlpha)
      const mask = maskFromRect(32, 32, { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 })
      const final = recompose(base, noise(32, 32, 8, hadAlpha), mask)
      const reread = await loadRgba(await encodeRgbaPng(final))
      const baseReread = await loadRgba(await encodeRgbaPng(base))

      expect(reread.hadAlpha).toBe(hadAlpha)
      expect(verifyRecomposition(baseReread, reread, mask).verdict).toBe('PASS')
    }
  })

  it('parche y recorte son inversos', () => {
    const base = noise(20, 20, 9)
    const box = { left: 4, top: 6, width: 8, height: 5 }
    const patch = cropRgba(noise(20, 20, 10), box)
    const placed = placePatch(base, patch, box)

    expect(cropRgba(placed, box).data).toEqual(patch.data)
    // Fuera de la caja nada cambió: la máscara editable es exactamente la caja (x 4–12, y 6–11 de 20).
    expect(measureZones(base, placed, maskFromRect(20, 20, { x0: 0.2, y0: 0.3, x1: 0.6, y1: 0.55 })).protected.maxDelta).toBe(0)
    expect(() => placePatch(base, patch, { ...box, left: 15 })).toThrow()
  })

  it('reescala a tamaño exacto', async () => {
    const resized = await resizeRgba(noise(10, 10, 11), 23, 7)

    expect([resized.width, resized.height, resized.data.length]).toEqual([23, 7, 23 * 7 * 4])
  })
})

const GRID = { step: 16, minArea: 655_360, maxArea: 3_686_400, maxEdge: 3840, maxRatio: 3 }
const pick = (aspect: number, area: number) => pickGridSize(aspect, area, GRID)

describe('recorte con contexto', () => {
  it('pickGridSize respeta múltiplos, área, borde y relación', () => {
    for (const [aspect, area] of [[1, 100], [16 / 9, 4e6], [10, 1e6], [0.2, 2e6], [1.91, 1e6]]) {
      const size = pick(aspect, area)

      expect(size.width % 16).toBe(0)
      expect(size.height % 16).toBe(0)
      expect(size.width * size.height).toBeGreaterThanOrEqual(GRID.minArea)
      expect(size.width * size.height).toBeLessThanOrEqual(GRID.maxArea)
      expect(Math.max(size.width, size.height) / Math.min(size.width, size.height)).toBeLessThanOrEqual(3.05)
    }
  })

  it('zona chica: recorta, contiene la zona, no sale de la imagen y casa el aspecto pedido', () => {
    const maskBox = { left: 3000, top: 1800, width: 200, height: 120 }
    const plan = planCrop({ imageWidth: 4000, imageHeight: 3000, maskBox, pick })

    expect(plan.mode).toBe('crop')
    expect(plan.box.left).toBeLessThanOrEqual(maskBox.left)
    expect(plan.box.top).toBeLessThanOrEqual(maskBox.top)
    expect(plan.box.left + plan.box.width).toBeGreaterThanOrEqual(maskBox.left + maskBox.width)
    expect(plan.box.top + plan.box.height).toBeGreaterThanOrEqual(maskBox.top + maskBox.height)
    expect(plan.box.left + plan.box.width).toBeLessThanOrEqual(4000)
    expect(plan.box.top + plan.box.height).toBeLessThanOrEqual(3000)
    expect(plan.aspectError).toBeLessThanOrEqual(0.02)
  })

  it('zona pegada al borde: el recorte se corre hacia adentro', () => {
    const plan = planCrop({ imageWidth: 2000, imageHeight: 2000, maskBox: { left: 0, top: 0, width: 50, height: 300 }, pick })

    expect(plan.box.left).toBe(0)
    expect(plan.box.top).toBe(0)
    expect(plan.aspectError).toBeLessThanOrEqual(0.02)
  })

  it('zona grande en auto, o --crop off: imagen completa', () => {
    const big = planCrop({ imageWidth: 1000, imageHeight: 1000, maskBox: { left: 100, top: 100, width: 700, height: 700 }, pick })
    const off = planCrop({ imageWidth: 4000, imageHeight: 3000, maskBox: { left: 10, top: 10, width: 20, height: 20 }, pick, mode: 'off' })

    expect(big.mode).toBe('full')
    expect(big.box).toEqual({ left: 0, top: 0, width: 1000, height: 1000 })
    expect(off.mode).toBe('full')
  })

  it('--crop on recorta aunque la zona sea grande', () => {
    const plan = planCrop({ imageWidth: 1000, imageHeight: 1000, maskBox: { left: 100, top: 100, width: 600, height: 600 }, pick, mode: 'on' })

    expect(plan.mode).toBe('crop')
  })
})
