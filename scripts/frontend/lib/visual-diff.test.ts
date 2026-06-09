import { describe, expect, it } from 'vitest'

import { applyMaskRects, compareImages, mergeMaskRects, type PngImage } from './visual-diff'

const solidImage = (width: number, height: number, rgba: [number, number, number, number]): PngImage => {
  const data = Buffer.alloc(width * height * 4)

  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgba[0]
    data[i * 4 + 1] = rgba[1]
    data[i * 4 + 2] = rgba[2]
    data[i * 4 + 3] = rgba[3]
  }

  return { width, height, data }
}

describe('visual-diff applyMaskRects', () => {
  it('zeros a rectangular region in place', () => {
    const img = solidImage(4, 4, [255, 255, 255, 255])

    applyMaskRects(img, [{ x: 1, y: 1, width: 2, height: 2 }])

    // pixel (1,1) masked → black opaque
    const idx = (img.width * 1 + 1) << 2

    expect([img.data[idx], img.data[idx + 1], img.data[idx + 2], img.data[idx + 3]]).toEqual([0, 0, 0, 255])
    // pixel (0,0) untouched
    expect(img.data[0]).toBe(255)
  })

  it('clamps rects to image bounds without throwing', () => {
    const img = solidImage(2, 2, [10, 20, 30, 255])

    expect(() => applyMaskRects(img, [{ x: -5, y: -5, width: 100, height: 100 }])).not.toThrow()
    expect(img.data[0]).toBe(0)
  })
})

describe('visual-diff compareImages', () => {
  it('reports match with zero changed pixels for identical images', () => {
    const a = solidImage(10, 10, [12, 34, 56, 255])
    const b = solidImage(10, 10, [12, 34, 56, 255])
    const result = compareImages(a, b, { maxDiffRatio: 0 })

    expect(result.status).toBe('match')
    expect(result.changedPixels).toBe(0)
    expect(result.diffRatio).toBe(0)
  })

  it('detects dimension mismatch', () => {
    const a = solidImage(10, 10, [0, 0, 0, 255])
    const b = solidImage(12, 10, [0, 0, 0, 255])
    const result = compareImages(a, b)

    expect(result.status).toBe('dimension_mismatch')
  })

  it('flags exceeded when changed region surpasses the ratio budget', () => {
    const a = solidImage(10, 10, [255, 255, 255, 255])
    const b = solidImage(10, 10, [255, 255, 255, 255])

    // Change ~half the pixels to black on side b.
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 5; x++) {
        const idx = (10 * y + x) << 2

        b.data[idx] = 0
        b.data[idx + 1] = 0
        b.data[idx + 2] = 0
      }
    }

    const result = compareImages(a, b, { maxDiffRatio: 0.1 })

    expect(result.status).toBe('exceeded')
    expect(result.explicitThreshold).toBe(true)
    expect(result.changedPixels).toBeGreaterThan(0)
  })

  it('ignores changes inside masked regions (union applied to both sides)', () => {
    const a = solidImage(10, 10, [255, 255, 255, 255])
    const b = solidImage(10, 10, [255, 255, 255, 255])

    // All of b's top-left quadrant changes — but it is fully masked.
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const idx = (10 * y + x) << 2

        b.data[idx] = 0
        b.data[idx + 1] = 0
        b.data[idx + 2] = 0
      }
    }

    const result = compareImages(a, b, { maskRects: [{ x: 0, y: 0, width: 5, height: 5 }], maxDiffRatio: 0 })

    expect(result.status).toBe('match')
    expect(result.changedPixels).toBe(0)
  })

  it('uses the conservative default ratio (warning-first) when no threshold is declared', () => {
    const a = solidImage(10, 10, [255, 255, 255, 255])
    const b = solidImage(10, 10, [255, 255, 255, 255])
    const result = compareImages(a, b)

    expect(result.explicitThreshold).toBe(false)
    expect(result.effectiveMaxDiffRatio).toBeGreaterThan(0)
  })
})

describe('visual-diff mergeMaskRects', () => {
  it('unions both rect sets', () => {
    expect(mergeMaskRects([{ x: 0, y: 0, width: 1, height: 1 }], [{ x: 2, y: 2, width: 1, height: 1 }])).toHaveLength(2)
    expect(mergeMaskRects(undefined, undefined)).toEqual([])
  })
})
