import { describe, expect, it } from 'vitest'

import { visuallyHiddenSx } from './accessibility'

describe('visuallyHiddenSx', () => {
  it('uses explicit pixel sizing instead of MUI numeric shorthand', () => {
    expect(visuallyHiddenSx.width).toBe('1px')
    expect(visuallyHiddenSx.height).toBe('1px')
    expect(visuallyHiddenSx.clipPath).toBe('inset(50%)')
  })
})
