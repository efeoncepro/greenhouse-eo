import { describe, expect, it } from 'vitest'

import { fillEnclosedAlphaHoles } from './fill-alpha-holes'

// Lienzo 9×9: fondo gris de estudio; sujeto azul 5×5 al centro con un hueco interno (píxel blanco del
// emblema) que el matting dejó transparente, y un hueco interno que en el original es fondo de estudio.
const W = 9
const H = 9
const GRAY = [224, 224, 224]
const BLUE = [80, 128, 240]
const WHITE = [240, 250, 255]

const build = () => {
  const rgb = new Uint8Array(W * H * 3)
  const rgba = new Uint8Array(W * H * 4)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const inSubject = x >= 2 && x <= 6 && y >= 2 && y <= 6
      const color = inSubject ? BLUE : GRAY

      rgb.set(color, i * 3)
      rgba.set([...color, inSubject ? 255 : 0], i * 4)
    }
  }

  const emblem = 4 * W + 3 // hueco falso: blanco del sujeto

  rgb.set(WHITE, emblem * 3)
  rgba[emblem * 4 + 3] = 0

  const realGap = 4 * W + 5 // hueco real: se ve el fondo de estudio a través del sujeto

  rgb.set(GRAY, realGap * 3)
  rgba[realGap * 4 + 3] = 0

  return { rgb, rgba, emblem, realGap }
}

describe('fillEnclosedAlphaHoles', () => {
  it('rellena huecos internos del sujeto y conserva huecos de fondo real y el exterior', () => {
    const { rgb, rgba, emblem, realGap } = build()
    const result = fillEnclosedAlphaHoles(rgba, rgb, W, H)

    expect(result.rgba[emblem * 4 + 3]).toBe(255)
    expect([...result.rgba.slice(emblem * 4, emblem * 4 + 3)]).toEqual(WHITE)
    expect(result.rgba[realGap * 4 + 3]).toBe(0)
    expect(result.rgba[0 * 4 + 3]).toBe(0)
    expect(result.filledPixels).toBe(1)
    expect(result.components).toBe(1)
  })

  it('no modifica la entrada', () => {
    const { rgb, rgba, emblem } = build()

    fillEnclosedAlphaHoles(rgba, rgb, W, H)
    expect(rgba[emblem * 4 + 3]).toBe(0)
  })

  it('conserva transparente el fondo en sombra visto a través de un hueco y rellena negros del sujeto', () => {
    const { rgb, rgba } = build()
    const shadow = 5 * W + 3 // piso gris en sombra visto por el aro
    const black = 5 * W + 5 // negro de una cuenca del sujeto

    rgb.set([196, 196, 196], shadow * 3)
    rgba[shadow * 4 + 3] = 0
    rgb.set([30, 30, 32], black * 3)
    rgba[black * 4 + 3] = 0

    const result = fillEnclosedAlphaHoles(rgba, rgb, W, H)

    expect(result.rgba[shadow * 4 + 3]).toBe(0)
    expect(result.rgba[black * 4 + 3]).toBe(255)
  })
})
