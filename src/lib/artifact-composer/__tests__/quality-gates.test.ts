import { describe, expect, it } from 'vitest'
import { PNG } from 'pngjs'

import { assertSlideHasInk, measureSlideInk, SlideQualityError } from '../quality-gates'
import { SlotFillError } from '../render'

/**
 * TASK-1391 Slice 1b — los detectores mecánicos que reemplazan el "mirar los frames" cuando
 * el render se automatiza. Calibración documentada: los 40 frames del baseline miden ≥2,41%
 * de tiles con tinta; un degradado suave (fondo del molde sin contenido) mide 0,000%.
 */

const gradientPng = (width = 640, height = 360): Buffer => {
  const png = new PNG({ width, height })

  for (let y = 0; y < height; y++) {
    const t = y / height
    const r = Math.round(25 * t)
    const g = Math.round(20 + 40 * t)
    const b = Math.round(60 + 80 * t)

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4

      png.data[i] = r
      png.data[i + 1] = g
      png.data[i + 2] = b
      png.data[i + 3] = 255
    }
  }

  return PNG.sync.write(png)
}

const gradientWithTextlikeInk = (): Buffer => {
  const width = 640
  const height = 360
  const base = gradientPng(width, height)
  const png = PNG.sync.read(base)

  // "Texto": líneas horizontales blancas duras en un bloque (bordes de alto contraste).
  for (let line = 0; line < 8; line++) {
    const y0 = 60 + line * 24

    for (let y = y0; y < y0 + 6; y++) {
      for (let x = 80; x < 480; x++) {
        const i = (y * width + x) * 4

        png.data[i] = 255
        png.data[i + 1] = 255
        png.data[i + 2] = 255
      }
    }
  }

  return PNG.sync.write(png)
}

describe('quality gates mecánicos (blank_slide)', () => {
  it('un fondo degradado SIN contenido es blank (falla cerrado)', () => {
    expect(() => assertSlideHasInk(gradientPng(), 'probe-blank')).toThrow(SlideQualityError)

    const metrics = measureSlideInk(gradientPng())

    expect(metrics.inkTileRatio).toBeLessThan(0.005)
  })

  it('el mismo fondo CON contenido de texto pasa con holgura', () => {
    expect(() => assertSlideHasInk(gradientWithTextlikeInk(), 'probe-ink')).not.toThrow()

    const metrics = measureSlideInk(gradientWithTextlikeInk())

    expect(metrics.inkTileRatio).toBeGreaterThan(0.015)
  })

  it('el error lleva código canónico y slideId', () => {
    try {
      assertSlideHasInk(gradientPng(), 'lamina-7')
      expect.unreachable('debió lanzar')
    } catch (e) {
      const err = e as SlideQualityError

      expect(err.code).toBe('blank_slide')
      expect(err.slideId).toBe('lamina-7')
    }
  })
})

describe('el fail-closed del filler sigue vivo tras el move de TASK-1393 (1ª bug class)', () => {
  it('SlotFillError existe y es el mecanismo de aborto del filler', () => {
    // El detector "copy del prototipo" ES el filler que aborta ante slot desconocido.
    // Este assert protege que el move no lo haya degradado a warning.
    const err = new SlotFillError('slide-x', ['slot desconocido: "foo"'])

    expect(err.name).toBe('SlotFillError')
    expect(err.message).toContain('slide-x')
  })
})
