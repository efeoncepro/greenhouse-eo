/**
 * Elevation drift guard (TASK-1049).
 *
 * Mirror of `typography-drift.test.ts`. The single Source of Truth is
 * `elevationTokens(mode)` (elevation-tokens.ts). This test fails CI the moment a
 * surface drifts from it:
 *
 *   1. SoT pins                 — accidental edit to the canonical role values.
 *   2. runtime ≡ SoT            — the resolved MUI theme namespace
 *                                 (`theme.greenhouseElevation`, what ships) must
 *                                 equal the factory output for the same mode.
 *   3. DESIGN.md / V1 role-set  — the agent-facing contract (DESIGN.md §Elevation)
 *      ≡ SoT                      and the V1 §6 role table must list exactly the
 *                                 canonical roles. (Doc-parity suites land with
 *                                 Slice 4, when DESIGN.md / V1 carry the role list.)
 *
 * Note: the docs carry ROLE NAMES + intent, not raw CSS shadow strings (those are
 * the SoT's job — agents read `floating`, not `0px 4px 12px ...`). So the doc-side
 * parity is role-set parity; exact value parity is runtime ≡ SoT.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createTheme } from '@mui/material/styles'
import { describe, expect, it, vi } from 'vitest'

import type { Settings } from '@core/contexts/settingsContext'
import type { SystemMode } from '@core/types'

// `@core/theme` calls `next/font/google` at module load (a Next build-time
// transform unavailable in vitest). Mock it as a no-op factory.
vi.mock('next/font/google', () => {
  const fontFactory = () => ({ className: 'font-mock', style: { fontFamily: 'font-mock' }, variable: '--font-mock' })

  return { Public_Sans: fontFactory, Poppins: fontFactory, Inter: fontFactory, Geist: fontFactory }
})

import mergedTheme from './mergedTheme'
import {
  ELEVATION_MAX_BLUR_PX,
  GREENHOUSE_ELEVATION_LEVELS,
  elevationTokens,
  type GreenhouseElevationLevel
} from './elevation-tokens'

// Build the theme exactly as the app does (createTheme over merged options) for
// the light mode, so we assert what actually ships.
const buildTheme = () => createTheme(mergedTheme({ skin: 'default' } as Settings, 'light' as SystemMode, 'ltr'))

const maxBlur = (boxShadow: string) => {
  const blurs = [...boxShadow.matchAll(/0px \d+px (\d+)px/g)].map(m => Number(m[1]))

  return blurs.length ? Math.max(...blurs) : 0
}

describe('elevationScale SoT pins (TASK-1049)', () => {
  it('pins the canonical role set', () => {
    expect([...GREENHOUSE_ELEVATION_LEVELS]).toEqual(['none', 'raised', 'floating', 'overlay', 'modal', 'overflow'])
  })

  it('floating is the convergent two-layer recipe with a hairline border', () => {
    const floating = elevationTokens('light').floating

    // two layers
    expect(floating.boxShadow.split('),').length).toBe(2)
    // hairline border carries forced-colors separation
    expect(floating.borderColor).toBe('var(--mui-palette-divider)')
    // clearly below the dated ceiling
    expect(maxBlur(floating.boxShadow)).toBeLessThanOrEqual(ELEVATION_MAX_BLUR_PX.floating)
  })

  it('overflow stays reserved (no runtime value) until a consumer lands', () => {
    expect(elevationTokens('light').overflow.reserved).toBe(true)
    expect(elevationTokens('light').overflow.boxShadow).toBe('none')
  })
})

describe('runtime ≡ SoT — theme.greenhouseElevation mirrors the factory', () => {
  const theme = buildTheme()
  const sot = elevationTokens('light')

  it('exposes greenhouseElevation on the resolved theme', () => {
    expect(theme.greenhouseElevation).toBeDefined()
  })

  for (const level of GREENHOUSE_ELEVATION_LEVELS) {
    it(`elevationTokens.${level} ≡ theme.greenhouseElevation.${level}`, () => {
      const runtime = theme.greenhouseElevation[level as GreenhouseElevationLevel]
      const token = sot[level]

      expect(runtime.level).toBe(token.level)
      expect(runtime.boxShadow).toBe(token.boxShadow)
      expect(runtime.borderColor).toBe(token.borderColor)
      expect(runtime.surfaceColor).toBe(token.surfaceColor)
      expect(Boolean(runtime.reserved)).toBe(Boolean(token.reserved))
    })
  }
})

describe('anti-dated ceiling — no role exceeds the dated drop-shadow budget', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`every ${mode} role stays within its max-blur budget (modal ≤ 24px)`, () => {
      const tokens = elevationTokens(mode)

      for (const level of GREENHOUSE_ELEVATION_LEVELS) {
        expect(maxBlur(tokens[level].boxShadow), `${mode}/${level}`).toBeLessThanOrEqual(ELEVATION_MAX_BLUR_PX[level])
      }
    })
  }

  it('the SoT is self-composed (no MUI numeric shadow / Vuexy customShadows reference)', () => {
    const serialized = JSON.stringify(elevationTokens('light')) + JSON.stringify(elevationTokens('dark'))

    expect(serialized).not.toContain('theme.shadows[')
    expect(serialized).not.toContain('--mui-customShadows-')
  })
})

describe('forced-colors separation — border is mandatory on overlays', () => {
  it('floating/overlay/modal declare a real border for both modes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const tokens = elevationTokens(mode)

      for (const level of ['floating', 'overlay', 'modal'] as const) {
        expect(tokens[level].borderColor, `${mode}/${level}`).toBe('var(--mui-palette-divider)')
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Doc-parity suites (role-set parity). DESIGN.md §Elevation + V1 §6 must list
// exactly the canonical roles. The docs carry role NAMES, not raw shadow strings.
// ─────────────────────────────────────────────────────────────────────────────

const readRepoFile = (relPath: string) => readFileSync(join(process.cwd(), relPath), 'utf8')

describe('DESIGN.md §Elevation ≡ SoT role set', () => {
  it('lists exactly the canonical roles in the elevation contract', () => {
    const design = readRepoFile('DESIGN.md')

    // The §Elevation contract enumerates roles as inline-code `role` tokens in the
    // elevation block. We assert every canonical role appears as `\`role\``.
    const section = (() => {
      const start = design.indexOf('## Elevation')

      expect(start, 'DESIGN.md must have an Elevation section').toBeGreaterThan(-1)
      const rest = design.slice(start + 1)
      const end = rest.search(/\n## /)

      return end === -1 ? rest : rest.slice(0, end)
    })()

    for (const level of GREENHOUSE_ELEVATION_LEVELS) {
      expect(section, `DESIGN.md §Elevation must mention role \`${level}\``).toContain(`\`${level}\``)
    }
  })
})

describe('V1 §6 elevation table ≡ SoT role set', () => {
  it('lists exactly the canonical roles', () => {
    const v1 = readRepoFile('docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md')
    const start = v1.indexOf('## 6. Elevation')

    expect(start, 'V1 must have §6 Elevation').toBeGreaterThan(-1)
    const rest = v1.slice(start + 1)
    const end = rest.search(/\n##? /)
    const section = end === -1 ? rest : rest.slice(0, end)

    for (const level of GREENHOUSE_ELEVATION_LEVELS) {
      expect(section, `V1 §6 must mention role \`${level}\``).toContain(`\`${level}\``)
    }
  })
})
