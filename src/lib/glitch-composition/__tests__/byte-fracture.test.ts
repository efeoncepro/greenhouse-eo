import { describe, expect, it } from 'vitest'

import { computeByteFracture, fadeToward, fractureBand, paintByteFracture, ROW_FADE } from '../byte-fracture'
import { GlitchPieceError } from '../types'

const base = {
  seed: 'a3f19c0e77b2d4e1a3f19c0e77b2d4e1a3f19c0e77b2d4e1a3f19c0e77b2d4e1',
  photo: { x: 0, y: 176, w: 1080, h: 450 },
  edge: 'bottom' as const,
  canvas: { width: 1080, height: 1350 },
  faceRegions: [] as { x: number; y: number; w: number; h: number }[]
}

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('computeByteFracture', () => {
  it('is deterministic: same processed photo (seed) → same cells', () => {
    expect(computeByteFracture(base)).toEqual(computeByteFracture({ ...base }))
  })

  it('another photo gives another fracture', () => {
    const other = computeByteFracture({ ...base, seed: '0b44e1a3f19c0e77b2d4e1a3f19c0e77b2d4e1a3f19c0e77b2d4e1a3f19c0e7' })

    expect(other.cells).not.toEqual(computeByteFracture(base).cells)
  })

  it('follows the measured grid: 27 px cells every 30 px, five rows fading 1 → 0.48 away from the edge', () => {
    const f = computeByteFracture(base)

    expect(f.samples).toBe(36)
    expect(new Set(f.cells.map((c) => c.size))).toEqual(new Set([27]))
    expect(new Set(f.cells.map((c) => c.opacity))).toEqual(new Set([1, 0.87, 0.74, 0.61, 0.48]))

    for (const c of f.cells) {
      expect((c.x - 1) % 30).toBe(0)
      expect(c.y).toBeGreaterThanOrEqual(626)
      expect(c.y).toBeLessThan(626 + 5 * 34.5 + 12)
    }
  })

  it('never draws outside the canvas, whatever the edge', () => {
    for (const edge of ['left', 'right'] as const) {
      const f = computeByteFracture({ ...base, photo: { x: 540, y: 0, w: 540, h: 1080 }, canvas: { width: 1920, height: 1080 }, edge })

      for (const c of f.cells) {
        expect(c.x >= 0 && c.y >= 0 && c.x + c.size <= 1920 && c.y + c.size <= 1080).toBe(true)
      }
    }
  })

  it('fails with fracture-over-face when the breaking edge touches a declared face', () => {
    const face = { x: 0.4, y: 0.8, w: 0.2, h: 0.18 }

    expect(() => computeByteFracture({ ...base, faceRegions: [face] })).toThrow(GlitchPieceError)

    try {
      computeByteFracture({ ...base, faceRegions: [face] })
    } catch (error) {
      expect((error as GlitchPieceError).code).toBe('fracture-over-face')
    }
  })

  it('no cell intersects a declared face outside the band', () => {
    const face = { x: 0.1, y: 0.1, w: 0.3, h: 0.3 }
    const photo = base.photo
    const faceBox = { x: photo.x + face.x * photo.w, y: photo.y + face.y * photo.h, w: face.w * photo.w, h: face.h * photo.h }
    const f = computeByteFracture({ ...base, faceRegions: [face] })

    expect(overlaps(faceBox, fractureBand(photo, 'bottom', 27))).toBe(false)

    for (const c of f.cells) expect(overlaps(faceBox, { x: c.x, y: c.y, w: c.size, h: c.size })).toBe(false)
  })

  it('paints each cell with the edge sample, faded toward the ground per row', () => {
    const f = computeByteFracture(base)
    const samples = Array.from({ length: f.samples }, (_, i) => (i % 2 ? '#8ba2ba' : '#4e667e'))
    const painted = paintByteFracture(f, samples, '#001a33')

    expect(painted).toHaveLength(f.cells.length)
    painted.forEach((p, i) => expect(p.fill).toBe(fadeToward(samples[f.cells[i].sample], '#001a33', ROW_FADE[f.cells[i].row])))
    expect(() => paintByteFracture(f, samples.slice(1), '#001a33')).toThrow(/muestras/)
  })
})
