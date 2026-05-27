import { describe, expect, it } from 'vitest'

import { normalizeNotionPropertyKey } from './notion-governance-contract'

describe('normalizeNotionPropertyKey', () => {
  it('matches notion-bq-sync raw BigQuery aliases for GH writeback properties', () => {
    expect(normalizeNotionPropertyKey('[GH] RpA v2')).toBe('gh_rpa_v2')
    expect(normalizeNotionPropertyKey('[GH] FTR')).toBe('gh_ftr')
  })

  it('keeps legacy percent and accented property lookups compatible', () => {
    expect(normalizeNotionPropertyKey('Cumplimiento %')).toBe('cumplimiento_pct')
    expect(normalizeNotionPropertyKey('Fecha límite')).toBe('fecha_limite')
  })
})
