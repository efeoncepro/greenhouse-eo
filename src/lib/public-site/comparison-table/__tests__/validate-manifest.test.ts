import { describe, expect, it } from 'vitest'

import { COMPARISON_TABLE_SCHEMA_VERSION } from '../manifest-schema'
import { validateComparisonTableManifest } from '../validate-manifest'

function baseManifest(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: COMPARISON_TABLE_SCHEMA_VERSION,
    columnA: { title: 'AGENCIA TRADICIONAL' },
    columnB: { isBest: true, bestLabel: 'BEST OPTION' },
    rows: [
      {
        dimension: 'Producción',
        cellA: 'Equipo ad-hoc, plazos flexibles',
        cellAIcon: 'none',
        cellB: '7 fases documentadas con checkpoints.',
        cellBIcon: 'check',
      },
    ],
    ...overrides,
  }
}

describe('validateComparisonTableManifest', () => {
  it('accepts a minimal valid manifest and applies defaults', () => {
    const result = validateComparisonTableManifest(baseManifest())

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.manifest.dimensionLabel).toBe('Dimensión') // default applied
      expect(result.manifest.columnB.bestLabel).toBe('BEST OPTION')
      expect(result.manifest.rows[0].cellBIcon).toBe('check')
    }
  })

  it('accepts a valid theme override block', () => {
    const result = validateComparisonTableManifest(
      baseManifest({
        theme: {
          preset: 'globe',
          radiusPx: 36,
          crimson: '#cc1a5d',
          globeTop: 'rgb(240, 128, 74)',
          ribbon: '#a233fa',
        },
      })
    )

    expect(result.ok).toBe(true)
  })

  it('rejects an invalid CSS color (defense-in-depth before inline style)', () => {
    const result = validateComparisonTableManifest(
      baseManifest({ theme: { crimson: 'red; } body { display:none' } })
    )

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.issues.some(i => i.path.includes('crimson'))).toBe(true)
    }
  })

  it('rejects an empty rows array', () => {
    const result = validateComparisonTableManifest(baseManifest({ rows: [] }))

    expect(result.ok).toBe(false)
  })

  it('rejects a wrong schemaVersion (drift anchor)', () => {
    const result = validateComparisonTableManifest(
      baseManifest({ schemaVersion: 'comparisonTable.v2' })
    )

    expect(result.ok).toBe(false)
  })

  it('rejects unknown top-level keys (strict contract)', () => {
    const result = validateComparisonTableManifest(baseManifest({ rogueKey: true }))

    expect(result.ok).toBe(false)
  })

  it('rejects an invalid logoUrl', () => {
    const result = validateComparisonTableManifest(
      baseManifest({ columnB: { logoUrl: 'not-a-url' } })
    )

    expect(result.ok).toBe(false)
  })

  it('rejects an invalid icon kind', () => {
    const result = validateComparisonTableManifest(
      baseManifest({
        rows: [{ dimension: 'X', cellA: 'a', cellB: 'b', cellBIcon: 'star' }],
      })
    )

    expect(result.ok).toBe(false)
  })

  it('rejects a non-object input without throwing', () => {
    expect(validateComparisonTableManifest(null).ok).toBe(false)
    expect(validateComparisonTableManifest('nope').ok).toBe(false)
    expect(validateComparisonTableManifest(42).ok).toBe(false)
  })
})
