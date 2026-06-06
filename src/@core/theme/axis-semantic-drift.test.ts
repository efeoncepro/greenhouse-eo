/**
 * AXIS semantic drift guard (TASK-1034 Slice 4).
 *
 * Pattern: VIEW canónica + helper + drift signal — here the "signal" is this
 * test. It fails CI the moment any semantic surface (theme, nomenclature status
 * maps, PDF tokens) drifts from the single AXIS source of truth `axisSemanticHex`.
 * Prevents re-introducing the legacy pre-AXIS hexes (#6ec207 / #ff6500 / #bb1954)
 * that this slice removed.
 *
 * Domain/categorical palettes (cscPhase, service, categories) are intentionally
 * NOT asserted here — they are deliberate brand hues, not semantic status.
 */
import { describe, expect, it } from 'vitest'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { PdfColors } from '@/lib/finance/pdf/tokens'

import { axisSemanticHex, axisSemanticPalette } from './axis-semantic'

const LEGACY_HEXES = ['#6ec207', '#ff6500', '#bb1954']

describe('AXIS semantic SoT (axisSemanticHex)', () => {
  it('pins the canonical AXIS hexes (error = error-800 AA, not the vibrant #ff4c51)', () => {
    expect(axisSemanticHex).toEqual({
      success: '#28c76f',
      warning: '#ffb703',
      error: '#cc3d41',
      info: '#00bad1'
    })
  })

  it('matches the MUI theme mains (axisSemanticPalette is the theme source)', () => {
    expect(axisSemanticHex.success).toBe(axisSemanticPalette.success.main)
    expect(axisSemanticHex.warning).toBe(axisSemanticPalette.warning.main)
    expect(axisSemanticHex.error).toBe(axisSemanticPalette.error.main)
    expect(axisSemanticHex.info).toBe(axisSemanticPalette.info.main)
  })
})

describe('greenhouse-nomenclature semantic maps derive from the SoT', () => {
  it('semaphore (status traffic-light) source/text === AXIS', () => {
    expect(GH_COLORS.semaphore.green.source).toBe(axisSemanticHex.success)
    expect(GH_COLORS.semaphore.green.text).toBe(axisSemanticHex.success)
    expect(GH_COLORS.semaphore.yellow.source).toBe(axisSemanticHex.warning)
    expect(GH_COLORS.semaphore.red.source).toBe(axisSemanticHex.error)
  })

  it('semantic (deprecated alias) source === AXIS', () => {
    expect(GH_COLORS.semantic.success.source).toBe(axisSemanticHex.success)
    expect(GH_COLORS.semantic.warning.source).toBe(axisSemanticHex.warning)
    expect(GH_COLORS.semantic.danger.source).toBe(axisSemanticHex.error)
    expect(GH_COLORS.semantic.info.source).toBe(axisSemanticHex.info)
  })

  it('chart semantic series === AXIS', () => {
    expect(GH_COLORS.chart.success).toBe(axisSemanticHex.success)
    expect(GH_COLORS.chart.warning).toBe(axisSemanticHex.warning)
    expect(GH_COLORS.chart.error).toBe(axisSemanticHex.error)
  })

  it('no legacy pre-AXIS hex survives in the semantic maps', () => {
    const semanticValues = [
      GH_COLORS.semaphore.green.source,
      GH_COLORS.semaphore.yellow.source,
      GH_COLORS.semaphore.red.source,
      GH_COLORS.semantic.success.source,
      GH_COLORS.semantic.warning.source,
      GH_COLORS.semantic.danger.source,
      GH_COLORS.chart.success,
      GH_COLORS.chart.warning,
      GH_COLORS.chart.error
    ].map(v => v.toLowerCase())

    for (const legacy of LEGACY_HEXES) {
      expect(semanticValues).not.toContain(legacy)
    }
  })
})

describe('PDF semantic tokens derive from the SoT', () => {
  it('PdfColors success/warning === AXIS', () => {
    expect(PdfColors.success).toBe(axisSemanticHex.success)
    expect(PdfColors.warning).toBe(axisSemanticHex.warning)
  })
})
