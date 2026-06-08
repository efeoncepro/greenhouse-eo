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
    expect(typographyScale.surfaceHeroTitle).toMatchObject({ fontSize: '2.125rem', mobileFontSize: '1.75rem', fontWeight: 600, lineHeight: 1.15 })
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
      const isDisplay = ['headlineDisplay', 'headlineLg', 'headlineMd', 'pageTitle', 'surfaceHeroTitle'].includes(name)

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

  it('surfaceHeroTitle has the canonical compact mobile step', () => {
    const runtime = theme.typography.surfaceHeroTitle as Record<string, Record<string, unknown>>

    expect(runtime['@media (max-width:599.95px)']?.fontSize).toBe(typographyScale.surfaceHeroTitle.mobileFontSize)
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
    'surface-hero-title': 'surfaceHeroTitle',
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

// ── TASK-1042: close the gap — the front-matter guard above only covers the
// DESIGN.md YAML block. Prose (DESIGN.md §Typography) and the V1 §15.1 table
// carried numeric sizes that NO test validated, so they drifted silently
// (TASK-1038 left "15px"/"17px" in prose and the whole V1 table pre-redesign).
// These two blocks validate both against the SoT.

const remToPx = (rem: string): number => Math.round(parseFloat(rem) * 16 * 1000) / 1000

// Sizes the SoT *actually uses* — derived from live tokens (typographyScale +
// controlText), NOT the raw `fontSizes` primitives (which still carry orphaned
// 15/18). A prose/V1 size outside this set is stale by definition.
const VALID_TYPOGRAPHY_PX = (() => {
  const set = new Set<number>()

  for (const token of Object.values(typographyScale) as Array<Record<string, unknown>>) {
    if (typeof token.fontSize === 'string') set.add(remToPx(token.fontSize))
    if (typeof token.mobileFontSize === 'string') set.add(remToPx(token.mobileFontSize))

    if (typeof token.letterSpacing === 'string' && token.letterSpacing.endsWith('px')) {
      set.add(parseFloat(token.letterSpacing))
    }
  }

  for (const v of Object.values(controlText)) set.add(remToPx(v as string))

  return set
})()

const CONTRACT_TO_SCALE_V1: Record<string, keyof typeof typographyScale> = {
  'headline-display': 'headlineDisplay',
  'headline-lg': 'headlineLg',
  'headline-md': 'headlineMd',
  'page-title': 'pageTitle',
  'surface-hero-title': 'surfaceHeroTitle',
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

describe('V1 §15.1 table ≡ SoT (TASK-1042)', () => {
  const v1 = readFileSync(join(process.cwd(), 'docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md'), 'utf8')

  // Bound the §15.1 region (table + runtime-variant bullets).
  const sectionStart = v1.indexOf('### 15.1')
  const afterStart = v1.slice(sectionStart + 1)
  const sectionEnd = afterStart.search(/\n##? /)
  const section = sectionEnd === -1 ? afterStart : afterStart.slice(0, sectionEnd)

  // Table rows: | `token` | `variant` | ...Nrem... |
  const rows = section.split('\n').filter(l => /^\|\s*`[a-z-]+`\s*\|/.test(l))

  it('contains a row for every contract token', () => {
    const tokens = rows.map(r => r.match(/^\|\s*`([a-z-]+)`/)?.[1]).filter(Boolean)

    for (const k of Object.keys(CONTRACT_TO_SCALE_V1)) {
      expect(tokens, `V1 §15.1 missing row for ${k}`).toContain(k)
    }
  })

  for (const row of rows) {
    const tokenKey = row.match(/^\|\s*`([a-z-]+)`/)?.[1]

    if (!tokenKey || !CONTRACT_TO_SCALE_V1[tokenKey]) continue
    const remMatch = row.match(/(\d+(?:\.\d+)?)rem/)

    if (!remMatch) continue // rows like overline "identico" carry no rem

    it(`§15.1 ${tokenKey} rem ≡ SoT`, () => {
      const scaleToken = typographyScale[CONTRACT_TO_SCALE_V1[tokenKey]] as Record<string, unknown>

      expect(remToPx(`${remMatch[1]}rem`)).toBe(remToPx(String(scaleToken.fontSize)))
    })
  }

  // Belt-and-suspenders: every rem in the §15.1 region (incl. the runtime-variant
  // bullets like subtitle1/subheader) must be a live SoT size.
  it('every rem in §15.1 is a live SoT size', () => {
    for (const m of section.matchAll(/(\d+(?:\.\d+)?)rem\b/g)) {
      const px = remToPx(`${m[1]}rem`)

      expect(VALID_TYPOGRAPHY_PX.has(px), `V1 §15.1 "${m[0]}" (${px}px) is not a current SoT size — stale?`).toBe(true)
    }
  })
})

describe('DESIGN.md §Typography prose sizes ∈ SoT (TASK-1042)', () => {
  const design = readFileSync(join(process.cwd(), 'DESIGN.md'), 'utf8')

  // Section between "## Typography" and the next "## " heading (prose only —
  // the front-matter is guarded by the block above).
  const start = design.indexOf('\n## Typography\n')
  const rest = design.slice(start + 1)
  const end = rest.indexOf('\n## ', 3)
  const section = end === -1 ? rest : rest.slice(0, end)

  // Every explicit px / rem size literal in the prose must be a live SoT size.
  // (`pt` PDF points, `ch` measure, and unit-less weights/counts are ignored.)
  const matches = [...section.matchAll(/(\d+(?:\.\d+)?)(px|rem)\b/g)]

  it('finds prose size mentions to validate', () => {
    expect(matches.length).toBeGreaterThan(0)
  })

  for (const m of matches) {
    const px = m[2] === 'rem' ? remToPx(`${m[1]}rem`) : parseFloat(m[1])

    it(`prose "${m[0]}" is a live SoT size`, () => {
      expect(VALID_TYPOGRAPHY_PX.has(px), `DESIGN.md §Typography "${m[0]}" (${px}px) is not a current SoT size — stale?`).toBe(true)
    })
  }
})
