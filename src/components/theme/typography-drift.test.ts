/**
 * Typography drift guard (TASK-1036).
 *
 * Mirror of `axis-semantic-drift.test.ts` for color. The single Source of Truth
 * is `typographyScale` (typography-tokens.ts). This test fails CI the moment
 * any of the three surfaces drifts from it:
 *
 *   1. typographyScale pins        — accidental edit to the canonical values.
 *   2. runtime ≡ SoT               — the resolved MUI theme variant (what ships)
 *                                    must equal its bridged scale token.
 *   3. DESIGN.md contract ≡ SoT    — the agent-facing contract front-matter must
 *                                    equal the scale (kept honest, not a manual
 *                                    table — this is the §15.1 mapping as code).
 *
 * Coverage: the full 1:1 contract bridge (`TYPOGRAPHY_VARIANT_BRIDGE`), the
 * secondary variants that reuse a token's value (`SECONDARY_VARIANT_TOKENS`,
 * e.g. h6 = label-md), and the control-text ramp (`controlText` — Button
 * size=large owned by the SoT). Every product typography/control-text value is
 * now owned by the SoT and pinned here, so a Vuexy coretheme drift fails CI.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createTheme } from '@mui/material/styles'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it, vi } from 'vitest'

import type { Settings } from '@core/contexts/settingsContext'
import type { SystemMode } from '@core/types'

// `@core/theme` calls `next/font/google` at module load (a Next build-time
// transform unavailable in vitest). Mock any font import as a no-op factory so
// we can resolve the real theme graph (coretheme + mergedTheme) here.
// vitest hoists this `vi.mock` above the imports below.
vi.mock('next/font/google', () => {
  const fontFactory = () => ({ className: 'font-mock', style: { fontFamily: 'font-mock' }, variable: '--font-mock' })

  return { Public_Sans: fontFactory, Poppins: fontFactory, Inter: fontFactory, Geist: fontFactory }
})

import mergedTheme from './mergedTheme'
import { controlText, SECONDARY_VARIANT_TOKENS, TYPOGRAPHY_VARIANT_BRIDGE, typographyScale } from './typography-tokens'

// Build the theme exactly as the app does (createTheme over the merged options),
// so we assert the values that actually ship — including MUI's per-variant
// base-fontFamily population for standard variants.
const buildTheme = () =>
  createTheme(mergedTheme({ skin: 'default' } as Settings, 'light' as SystemMode, 'ltr'))

// Fields the SoT owns and the runtime must mirror.
const OWNED_FIELDS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontVariantNumeric'] as const

describe('typographyScale SoT pins (TASK-1036)', () => {
  it('pins the canonical display + body + numeric values', () => {
    expect(typographyScale.headlineDisplay).toMatchObject({ fontSize: '2rem', fontWeight: 800 })
    // TASK-1038 redesign: page-title 16→20, section-title 18→16, label-md 15→14.
    expect(typographyScale.pageTitle).toMatchObject({ fontSize: '1.25rem', fontWeight: 600 })
    expect(typographyScale.sectionTitle).toMatchObject({ fontSize: '1rem', fontWeight: 600 })
    expect(typographyScale.labelMd).toMatchObject({ fontSize: '0.875rem', fontWeight: 600 })
    expect(typographyScale.bodyLg).toMatchObject({ fontSize: '1rem', fontWeight: 400 })
    expect(typographyScale.bodyMd).toMatchObject({ fontSize: '0.875rem', fontWeight: 400 })
    expect(typographyScale.numericId).toMatchObject({ fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' })
    expect(typographyScale.kpiValue).toMatchObject({ fontSize: '1.75rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' })
  })

  it('uses only the two active families (Poppins display / Geist text)', () => {
    for (const [name, token] of Object.entries(typographyScale)) {
      const isDisplay = ['headlineDisplay', 'headlineLg', 'headlineMd', 'pageTitle'].includes(name)

      if (isDisplay) {
        expect(token.fontFamily, `${name} must be Poppins`).toContain('Poppins')
      } else {
        expect(token.fontFamily, `${name} must be Geist`).toContain('Geist')
        expect(token.fontFamily, `${name} must not be Poppins`).not.toContain('Poppins')
      }
    }
  })

  it('never uses a monospace family (numeric variants use tabular-nums)', () => {
    for (const token of Object.values(typographyScale)) {
      expect(token.fontFamily.toLowerCase()).not.toContain('mono')
    }

    expect(typographyScale.numericId.fontVariantNumeric).toBe('tabular-nums')
    expect(typographyScale.numericAmount.fontVariantNumeric).toBe('tabular-nums')
  })
})

describe('runtime ≡ SoT — resolved theme variants mirror their bridged token', () => {
  const theme = buildTheme()

  const assertVariantMirrors = (variant: string, scaleEntry: Record<string, unknown>) => {
    const runtime = theme.typography[variant as keyof typeof theme.typography] as Record<string, unknown>

    for (const field of OWNED_FIELDS) {
      if (scaleEntry[field] === undefined) continue
      expect(runtime[field], `${variant}.${field}`).toBe(scaleEntry[field])
    }
  }

  // Full 1:1 bridge — every contract token's runtime variant must match the SoT.
  for (const [token, variant] of Object.entries(TYPOGRAPHY_VARIANT_BRIDGE)) {
    it(`${token} ≡ theme.typography.${variant}`, () => {
      assertVariantMirrors(variant, typographyScale[token as keyof typeof typographyScale] as Record<string, unknown>)
    })
  }

  // Secondary variants reusing an existing token's value (e.g. h6 = label-md).
  for (const [variant, token] of Object.entries(SECONDARY_VARIANT_TOKENS)) {
    it(`theme.typography.${variant} reuses ${token}`, () => {
      assertVariantMirrors(variant, typographyScale[token] as Record<string, unknown>)
    })
  }

  // Control-text ownership (S2): Button size=large derives its fontSize from the SoT.
  it('MuiButton.sizeLarge.fontSize === controlText.lg', () => {
    const overrides = theme.components?.MuiButton?.styleOverrides as
      | { sizeLarge?: { fontSize?: string } }
      | undefined

    expect(overrides?.sizeLarge?.fontSize).toBe(controlText.lg)
  })
})

describe('controlText ramp pins (TASK-1038 redesign)', () => {
  it('aligns the control sizes with the redesigned label ramp', () => {
    expect(controlText.sm).toBe(typographyScale.bodyMd.fontSize) // 14 — Button size=small (= body-md)
    expect(controlText.md).toBe(typographyScale.labelMd.fontSize) // 14 — Button size=medium / Tab (= label-md)
    expect(controlText.lg).toBe('1rem') // 16 — TASK-1038: 17→16, saca el 17 bespoke
    expect(controlText.lg).toBe(typographyScale.labelLg.fontSize) // ahora = label-lg (16)
  })
})

describe('DESIGN.md contract ≡ SoT', () => {
  // contract (kebab semantic) → scale token (camel). This is the §15.1 mapping
  // as code; the runtime side is `TYPOGRAPHY_VARIANT_BRIDGE`.
  const CONTRACT_TO_SCALE: Record<string, keyof typeof typographyScale> = {
    'headline-display': 'headlineDisplay',
    'headline-lg': 'headlineLg',
    'headline-md': 'headlineMd',
    'page-title': 'pageTitle',
    'section-title': 'sectionTitle',
    'label-md': 'labelMd',
    'body-lg': 'bodyLg',
    'body-md': 'bodyMd',
    'body-sm': 'bodySm',
    overline: 'overline',
    'numeric-id': 'numericId',
    'numeric-amount': 'numericAmount',
    'kpi-value': 'kpiValue'
  }

  const contractTypography = (() => {
    const raw = readFileSync(join(process.cwd(), 'DESIGN.md'), 'utf8')
    const match = raw.match(/^---\n([\s\S]*?)\n---/)

    if (!match) throw new Error('DESIGN.md front-matter not found')
    const parsed = parseYaml(match[1]) as { typography?: Record<string, Record<string, unknown>> }

    if (!parsed.typography) throw new Error('DESIGN.md typography block not found')

    return parsed.typography
  })()

  it('every contract typography token maps to a scale token', () => {
    for (const contractKey of Object.keys(contractTypography)) {
      expect(CONTRACT_TO_SCALE[contractKey], `contract token "${contractKey}" must map to the scale`).toBeDefined()
    }
  })

  for (const [contractKey, scaleKey] of Object.entries(CONTRACT_TO_SCALE)) {
    it(`${contractKey} ≡ typographyScale.${scaleKey}`, () => {
      const contract = contractTypography[contractKey]

      expect(contract, `DESIGN.md missing token ${contractKey}`).toBeDefined()
      const token = typographyScale[scaleKey] as Record<string, unknown>

      // fontFamily: contract uses the short family name (Poppins/Geist), scale the full stack.
      expect(String(token.fontFamily)).toContain(String(contract.fontFamily))
      expect(token.fontSize).toBe(contract.fontSize)
      expect(token.fontWeight).toBe(contract.fontWeight)
      expect(token.lineHeight).toBe(contract.lineHeight)

      if (contract.letterSpacing !== undefined) {
        expect(token.letterSpacing).toBe(contract.letterSpacing)
      }

      // contract `fontFeature: '"tnum" 1'` (font-feature-settings) ↔ scale
      // `fontVariantNumeric: 'tabular-nums'` — same intent, different CSS API.
      if (contract.fontFeature !== undefined) {
        expect(token.fontVariantNumeric).toBe('tabular-nums')
      }
    })
  }
})

describe('TYPOGRAPHY_VARIANT_BRIDGE shape', () => {
  it('maps each canonical token to a distinct runtime variant', () => {
    const variants = Object.values(TYPOGRAPHY_VARIANT_BRIDGE)

    expect(new Set(variants).size, 'no two tokens map to the same variant').toBe(variants.length)
  })

  it('every bridged token exists in the scale', () => {
    for (const token of Object.keys(TYPOGRAPHY_VARIANT_BRIDGE)) {
      expect(typographyScale[token as keyof typeof typographyScale], `bridge token ${token} missing from scale`).toBeDefined()
    }
  })
})
