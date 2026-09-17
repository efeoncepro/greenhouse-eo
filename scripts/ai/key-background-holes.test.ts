import { describe, expect, it } from 'vitest'

import { keyBackgroundHoles } from './key-background-holes'

const W = 40
const H = 40
const NAVY = [15, 39, 68]
const WHITE = [245, 247, 250]
const LIGHT_GRAY = [224, 224, 226]
const BLUE = [3, 60, 112]

const paint = (bg: number[]) => {
  const rgb = new Uint8Array(W * H * 3)
  const rgba = new Uint8Array(W * H * 4)

  for (let i = 0; i < W * H; i++) {
    rgb.set(bg, i * 3)
    rgba.set([...bg, 0], i * 4)
  }

  return { rgb, rgba }
}

const set = (rgb: Uint8Array, rgba: Uint8Array, x: number, y: number, color: number[], alpha: number) => {
  const i = y * W + x

  rgb.set(color, i * 3)
  rgba.set([...color, alpha], i * 4)
}

// Anillo blanco (radio 8–15) centrado; su interior (radio < 8) muestra el navy del fondo y el matting lo dejó opaco.
const whiteRingOnNavy = () => {
  const { rgb, rgba } = paint(NAVY)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = Math.hypot(x - 20, y - 20)

      if (r < 16 && r >= 8) set(rgb, rgba, x, y, WHITE, 255)
      else if (r < 8) set(rgb, rgba, x, y, NAVY, 255)
    }
  }

  return { rgb, rgba }
}

describe('keyBackgroundHoles', () => {
  it('vacía el hueco navy encerrado en un anillo blanco y conserva el anillo', () => {
    const { rgb, rgba } = whiteRingOnNavy()
    const result = keyBackgroundHoles(rgba, rgb, W, H)

    expect(result.rgba[(20 * W + 20) * 4 + 3]).toBe(0)
    expect(result.rgba[(20 * W + 32) * 4 + 3]).toBe(255)
    expect(result.components).toBe(1)
    expect(result.clearedPixels).toBeGreaterThan(150)
    expect(result.background).toEqual(NAVY)
  })

  it('no toca un brillo blanco sobre un objeto azul en fondo gris claro', () => {
    const { rgb, rgba } = paint(LIGHT_GRAY)

    for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) set(rgb, rgba, x, y, BLUE, 255)
    for (let y = 14; y < 20; y++) for (let x = 14; x < 20; x++) set(rgb, rgba, x, y, [255, 255, 255], 255)

    const result = keyBackgroundHoles(rgba, rgb, W, H)

    expect(result.components).toBe(0)
    expect(result.rgba[(16 * W + 16) * 4 + 3]).toBe(255)
    expect(Array.from(result.rgba)).toEqual(Array.from(rgba))
  })

  it('ignora componentes menores que minPixels y no modifica la entrada', () => {
    const { rgb, rgba } = whiteRingOnNavy()
    const result = keyBackgroundHoles(rgba, rgb, W, H, { minPixels: 10_000 })

    expect(result.components).toBe(0)
    expect(result.rgba[(20 * W + 20) * 4 + 3]).toBe(255)

    keyBackgroundHoles(rgba, rgb, W, H)
    expect(rgba[(20 * W + 20) * 4 + 3]).toBe(255)
  })
})
