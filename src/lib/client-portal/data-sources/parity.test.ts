import { describe, expect, it } from 'vitest'

import type { ClientPortalDataSource } from '../dto/reader-meta'

import {
  CLIENT_PORTAL_DATA_SOURCE_VALUES,
  compareDataSourcesParity,
  type ModuleDataSourcesRow
} from './parity'

/**
 * TASK-824 Slice 2 — Unit tests del helper de parity (sin PG).
 *
 * Verifica que `compareDataSourcesParity` produce reports correctos para
 * los 4 estados canónicos:
 *
 *   1. Seed DB ⊆ TS union exacto (inSync=true, no warnings)
 *   2. Seed DB ⊆ TS union pero union tiene values extra (inSync=true, inUnionNotInSeed > 0)
 *   3. Seed DB tiene value NO en union (inSync=false, inSeedNotInUnion > 0) — DRIFT BLOQUEANTE
 *   4. Seed vacío (edge case)
 *
 * Mas un test guardia: el array exportado `CLIENT_PORTAL_DATA_SOURCE_VALUES`
 * debe matchear exactamente la cardinalidad del TS union (drift detection
 * compile-time + runtime).
 */

describe('compareDataSourcesParity', () => {
  it('inSync=true cuando seed DB ⊆ TS union exacto', () => {
    const seed: ModuleDataSourcesRow[] = [
      { module_key: 'm1', data_sources: ['agency.ico', 'commercial.engagements'] },
      { module_key: 'm2', data_sources: ['finance.invoices'] }
    ]

    const union: ClientPortalDataSource[] = [
      'agency.ico',
      'commercial.engagements',
      'finance.invoices'
    ]

    const report = compareDataSourcesParity(seed, union)

    expect(report.inSync).toBe(true)
    expect(report.inSeedNotInUnion).toEqual([])
    expect(report.inUnionNotInSeed).toEqual([])
    expect(report.seedModuleCount).toBe(2)
    expect(report.uniqueSeedValueCount).toBe(3)
    expect(report.unionValueCount).toBe(3)
  })

  it('inSync=true con union extra values (soft warning inUnionNotInSeed)', () => {
    const seed: ModuleDataSourcesRow[] = [
      { module_key: 'm1', data_sources: ['agency.ico'] }
    ]

    const union: ClientPortalDataSource[] = [
      'agency.ico',
      'finance.invoices',
      'commercial.deals'
    ]

    const report = compareDataSourcesParity(seed, union)

    expect(report.inSync).toBe(true)
    expect(report.inSeedNotInUnion).toEqual([])
    expect(report.inUnionNotInSeed).toEqual(['commercial.deals', 'finance.invoices'])
  })

  it('inSync=false (DRIFT BLOQUEANTE) cuando seed DB tiene value NO en union', () => {
    const seed: ModuleDataSourcesRow[] = [
      { module_key: 'm1', data_sources: ['agency.ico', 'nonexistent.source'] }
    ]

    const union: ClientPortalDataSource[] = ['agency.ico']

    const report = compareDataSourcesParity(seed, union)

    expect(report.inSync).toBe(false)
    expect(report.inSeedNotInUnion).toEqual(['nonexistent.source'])
    expect(report.inUnionNotInSeed).toEqual([])
  })

  it('detecta múltiples drift values y los ordena alfabéticamente', () => {
    const seed: ModuleDataSourcesRow[] = [
      { module_key: 'm1', data_sources: ['z.unknown', 'a.unknown', 'm.unknown'] }
    ]

    const union: ClientPortalDataSource[] = []

    const report = compareDataSourcesParity(seed, union)

    expect(report.inSync).toBe(false)
    expect(report.inSeedNotInUnion).toEqual(['a.unknown', 'm.unknown', 'z.unknown'])
  })

  it('seed vacío con union poblado: inSync=true, todas las entries en inUnionNotInSeed', () => {
    const seed: ModuleDataSourcesRow[] = []
    const union: ClientPortalDataSource[] = ['agency.ico', 'finance.invoices']

    const report = compareDataSourcesParity(seed, union)

    expect(report.inSync).toBe(true)
    expect(report.inSeedNotInUnion).toEqual([])
    expect(report.inUnionNotInSeed).toEqual(['agency.ico', 'finance.invoices'])
    expect(report.seedModuleCount).toBe(0)
    expect(report.uniqueSeedValueCount).toBe(0)
  })

  it('dedupea cuando múltiples seed modules declaran el mismo value', () => {
    const seed: ModuleDataSourcesRow[] = [
      { module_key: 'm1', data_sources: ['agency.ico', 'agency.csc'] },
      { module_key: 'm2', data_sources: ['agency.ico', 'finance.invoices'] }
    ]

    const union: ClientPortalDataSource[] = ['agency.ico', 'agency.csc', 'finance.invoices']

    const report = compareDataSourcesParity(seed, union)

    expect(report.inSync).toBe(true)
    expect(report.uniqueSeedValueCount).toBe(3) // 3 únicos aunque hay 4 occurrences
    expect(report.seedModuleCount).toBe(2)
  })
})

describe('CLIENT_PORTAL_DATA_SOURCE_VALUES guard', () => {
  it('matchea la cardinalidad del TS union (17 values esperados en V1.0)', () => {
    // Drift detection: si alguien agrega/quita un value del TS union sin
    // actualizar este array, el conteo cambia y este test falla loud.
    // Cambiar SOLO cuando deliberadamente se extiende el catalog.
    expect(CLIENT_PORTAL_DATA_SOURCE_VALUES.length).toBe(17)
  })

  it('no tiene duplicados (cada value aparece una sola vez)', () => {
    const set = new Set<string>(CLIENT_PORTAL_DATA_SOURCE_VALUES)

    expect(set.size).toBe(CLIENT_PORTAL_DATA_SOURCE_VALUES.length)
  })

  it('está ordenado por dominio agrupado (commercial → finance → agency → account_360 → delivery → assigned_team → identity)', () => {
    // Soft check: verifica que la primera occurrence de cada dominio prefix
    // sigue el orden canónico documentado en reader-meta.ts. Drift de orden
    // no rompe runtime pero rompe la convención del catalog.
    const orderPrefixes = [
      'commercial.',
      'finance.',
      'agency.',
      'account_360.',
      'delivery.',
      'assigned_team.',
      'identity.'
    ]

    let lastSeenIdx = -1

    for (const value of CLIENT_PORTAL_DATA_SOURCE_VALUES) {
      const prefix = value.split('.')[0]
      const idx = orderPrefixes.findIndex(p => p.startsWith(`${prefix}.`))

      expect(idx, `prefix '${prefix}' no está en orderPrefixes canónico`).toBeGreaterThanOrEqual(0)
      expect(idx, `value '${value}' rompe el orden canónico por dominio`).toBeGreaterThanOrEqual(lastSeenIdx)
      lastSeenIdx = idx
    }
  })
})
