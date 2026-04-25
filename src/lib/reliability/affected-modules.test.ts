import { describe, expect, it } from 'vitest'

import { getAffectedModules, mapModulesToSmokeSpecs } from './affected-modules'

describe('getAffectedModules', () => {
  it('returns empty when no files changed', () => {
    expect(getAffectedModules([])).toEqual([])
  })

  it('detects finance module from src/lib/finance change', () => {
    expect(getAffectedModules(['src/lib/finance/quotations.ts'])).toEqual(['finance'])
  })

  it('detects finance module from view change', () => {
    expect(getAffectedModules(['src/views/greenhouse/finance/QuoteBuilderView.tsx'])).toEqual([
      'finance'
    ])
  })

  it('detects integrations.notion from notion-* helper change', () => {
    expect(getAffectedModules(['src/lib/integrations/notion-readiness.ts'])).toEqual([
      'integrations.notion'
    ])
  })

  it('detects cloud module from src/lib/cloud change', () => {
    expect(getAffectedModules(['src/lib/cloud/gcp-billing.ts'])).toEqual(['cloud'])
  })

  it('detects cloud module from src/lib/bigquery.ts (file glob)', () => {
    expect(getAffectedModules(['src/lib/bigquery.ts'])).toEqual(['cloud'])
  })

  it('detects delivery module from src/lib/ico-engine change', () => {
    expect(getAffectedModules(['src/lib/ico-engine/materializer.ts'])).toEqual(['delivery'])
  })

  it('detects multiple modules for cross-domain PR', () => {
    const result = getAffectedModules([
      'src/lib/finance/income.ts',
      'src/lib/cloud/gcp-billing.ts',
      'src/lib/ico-engine/scheduler.ts'
    ])

    expect(result).toContain('finance')
    expect(result).toContain('cloud')
    expect(result).toContain('delivery')
    expect(result).toHaveLength(3)
  })

  it('returns stable order matching registry sequence', () => {
    const result = getAffectedModules([
      'src/lib/ico-engine/x.ts',
      'src/lib/finance/y.ts',
      'src/lib/cloud/z.ts'
    ])

    // Registry order: finance, integrations.notion, cloud, delivery
    expect(result).toEqual(['finance', 'cloud', 'delivery'])
  })

  it('ignores files that do not match any glob', () => {
    expect(getAffectedModules(['CHANGELOG.md', 'README.md'])).toEqual([])
  })

  it('matches dotfiles when pattern allows', () => {
    expect(getAffectedModules(['src/lib/cloud/.env-config.ts'])).toEqual(['cloud'])
  })
})

describe('mapModulesToSmokeSpecs', () => {
  it('returns empty when no modules affected', () => {
    expect(mapModulesToSmokeSpecs([])).toEqual([])
  })

  it('returns smoke specs for finance', () => {
    expect(mapModulesToSmokeSpecs(['finance'])).toEqual([
      'tests/e2e/smoke/finance-quotes.spec.ts'
    ])
  })

  it('deduplicates specs across modules', () => {
    // cloud + integrations.notion both reference admin-nav.spec.ts
    const result = mapModulesToSmokeSpecs(['cloud', 'integrations.notion'])

    const adminNavCount = result.filter(s => s.endsWith('admin-nav.spec.ts')).length

    expect(adminNavCount).toBe(1)
  })

  it('preserves registry order across modules', () => {
    const result = mapModulesToSmokeSpecs(['delivery', 'finance'])

    // Finance first because its registry entry comes first
    expect(result[0]).toBe('tests/e2e/smoke/finance-quotes.spec.ts')
  })
})
