import { describe, expect, it } from 'vitest'

import { GlitchFractureError, parseFractureCells } from '../fracture-hook'

describe('glitch fracture hook — the page only paints what the plan brings', () => {
  it('no bytes slot (a slide without photo) paints nothing', () => {
    expect(parseFractureCells('s', undefined)).toEqual([])
    expect(parseFractureCells('s', '')).toEqual([])
    expect(parseFractureCells('s', '[]')).toEqual([])
  })

  it('accepts painted cells as JSON', () => {
    const cells = [{ x: 1, y: 629, size: 27, opacity: 1, fill: '#334b63' }]

    expect(parseFractureCells('s', JSON.stringify(cells))).toEqual(cells)
  })

  it('rejects malformed geometry instead of drawing something else', () => {
    expect(() => parseFractureCells('s', '{nope')).toThrow(GlitchFractureError)
    expect(() => parseFractureCells('s', '{"x":1}')).toThrow(/lista/)
    expect(() => parseFractureCells('s', JSON.stringify([{ x: 1, y: 2, size: 27, opacity: 1, fill: 'red' }]))).toThrow(/fill/)
  })
})
