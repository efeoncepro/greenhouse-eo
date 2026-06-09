/**
 * Elevation tokens — focal unit tests (TASK-1049 Slice 1).
 *
 * Pure tests over the SoT factory `elevationTokens(mode)`. The 3-layer parity
 * drift-guard (runtime ≡ SoT ≡ DESIGN.md ≡ V1) lives in `elevation-drift.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import {
  ELEVATION_MAX_BLUR_PX,
  GREENHOUSE_ELEVATION_LEVELS,
  elevationTokens,
  type GreenhouseElevationLevel
} from './elevation-tokens'

const REQUIRES_BORDER: GreenhouseElevationLevel[] = ['floating', 'overlay', 'modal']

describe('elevationTokens — role completeness', () => {
  it('exposes every canonical role for both modes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const tokens = elevationTokens(mode)

      for (const level of GREENHOUSE_ELEVATION_LEVELS) {
        expect(tokens[level]).toBeDefined()
        expect(tokens[level].level).toBe(level)
      }
    }
  })

  it('GREENHOUSE_ELEVATION_LEVELS matches the factory keys', () => {
    expect([...GREENHOUSE_ELEVATION_LEVELS].sort()).toEqual(Object.keys(elevationTokens('light')).sort())
  })

  it('every role carries non-empty intendedUse metadata', () => {
    const tokens = elevationTokens('light')

    for (const level of GREENHOUSE_ELEVATION_LEVELS) {
      expect(tokens[level].intendedUse.trim().length).toBeGreaterThan(10)
    }
  })
})

describe('elevationTokens — semantic contract', () => {
  it('none is flat (no shadow)', () => {
    expect(elevationTokens('light').none.boxShadow).toBe('none')
    expect(elevationTokens('dark').none.boxShadow).toBe('none')
  })

  it('overflow is reserved with no runtime value emitted', () => {
    for (const mode of ['light', 'dark'] as const) {
      const overflow = elevationTokens(mode).overflow

      expect(overflow.reserved).toBe(true)
      expect(overflow.boxShadow).toBe('none')
    }
  })

  it('floating/overlay/modal carry a real border (forced-colors separation)', () => {
    const tokens = elevationTokens('light')

    for (const level of REQUIRES_BORDER) {
      expect(tokens[level].borderColor, `${level} must declare borderColor`).toBeTruthy()
    }
  })

  it('does NOT reference MUI numeric shadows nor Vuexy customShadows (self-composed)', () => {
    for (const mode of ['light', 'dark'] as const) {
      const serialized = JSON.stringify(elevationTokens(mode))

      expect(serialized).not.toContain('theme.shadows[')
      expect(serialized).not.toContain('--mui-customShadows-')
    }
  })

  it('derives shadow color from the canonical mode-aware channel', () => {
    expect(elevationTokens('light').floating.boxShadow).toContain('--mui-mainColorChannels-lightShadow')
    expect(elevationTokens('dark').floating.boxShadow).toContain('--mui-mainColorChannels-darkShadow')
  })
})

describe('elevationTokens — mode awareness', () => {
  it('dark uses higher alpha than light for the same role (shadows read weaker on dark)', () => {
    const lightFloating = elevationTokens('light').floating.boxShadow
    const darkFloating = elevationTokens('dark').floating.boxShadow

    // largest-layer alpha (last "/ 0.NN)" occurrence)
    const lastAlpha = (s: string) => Number([...s.matchAll(/\/ (0\.\d+)\)/g)].at(-1)?.[1] ?? '0')

    expect(lastAlpha(darkFloating)).toBeGreaterThan(lastAlpha(lightFloating))
  })
})

describe('elevationTokens — anti-dated ceiling', () => {
  it('no role exceeds its max-blur budget (≤ 24px, floating ≤ 16px)', () => {
    const tokens = elevationTokens('light')

    for (const level of GREENHOUSE_ELEVATION_LEVELS) {
      const blurs = [...tokens[level].boxShadow.matchAll(/0px \d+px (\d+)px/g)].map(m => Number(m[1]))
      const maxBlur = blurs.length ? Math.max(...blurs) : 0

      expect(maxBlur, `${level} max blur`).toBeLessThanOrEqual(ELEVATION_MAX_BLUR_PX[level])
    }
  })

  it('floating stays clearly below modal (no heavy single drop)', () => {
    expect(ELEVATION_MAX_BLUR_PX.floating).toBeLessThan(ELEVATION_MAX_BLUR_PX.modal)
  })
})
