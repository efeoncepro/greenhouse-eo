import { describe, expect, it } from 'vitest'

import { ENTITLEMENT_CAPABILITY_CATALOG } from '@/config/entitlements-catalog'
import { compareCapabilitiesParity, type CapabilitiesRegistryRow } from './parity'

const buildSyncedRegistry = (): CapabilitiesRegistryRow[] =>
  ENTITLEMENT_CAPABILITY_CATALOG.map(definition => ({
    capability_key: definition.key,
    module: definition.module,
    allowed_actions: [...definition.actions],
    allowed_scopes: [definition.defaultScope, 'all'],
    description: `seed for ${definition.key}`,
    introduced_at: new Date('2026-05-08T00:00:00Z'),
    deprecated_at: null
  }))

describe('TASK-611 — capabilities registry parity', () => {
  it('reports inSync=true when registry mirrors the TS catalog', () => {
    const report = compareCapabilitiesParity(ENTITLEMENT_CAPABILITY_CATALOG, buildSyncedRegistry())

    expect(report.inSync).toBe(true)
    expect(report.inCatalogNotInRegistry).toEqual([])
    expect(report.inRegistryNotInCatalog).toEqual([])
    expect(report.modulesMismatch).toEqual([])
    expect(report.actionsMismatch).toEqual([])
  })

  it('flags capabilities present in TS but missing in DB', () => {
    const registry = buildSyncedRegistry().filter(row => row.capability_key !== 'organization.identity')

    const report = compareCapabilitiesParity(ENTITLEMENT_CAPABILITY_CATALOG, registry)

    expect(report.inSync).toBe(false)
    expect(report.inCatalogNotInRegistry).toContain('organization.identity')
    expect(report.inRegistryNotInCatalog).toEqual([])
  })

  it('flags capabilities present in DB but absent from TS catalog (legacy not deprecated)', () => {
    const registry = buildSyncedRegistry()

    registry.push({
      capability_key: 'organization.zombie_capability',
      module: 'organization',
      allowed_actions: ['read'],
      allowed_scopes: ['tenant'],
      description: 'left over from a past version that was removed from TS but not deprecated in DB',
      introduced_at: new Date('2026-04-01T00:00:00Z'),
      deprecated_at: null
    })

    const report = compareCapabilitiesParity(ENTITLEMENT_CAPABILITY_CATALOG, registry)

    expect(report.inSync).toBe(false)
    expect(report.inRegistryNotInCatalog).toContain('organization.zombie_capability')
  })

  it('flags module mismatch between TS and DB', () => {
    const registry = buildSyncedRegistry()
    const target = registry.find(row => row.capability_key === 'organization.finance')

    if (!target) throw new Error('fixture invariant: organization.finance must exist in seed')

    target.module = 'finance'

    const report = compareCapabilitiesParity(ENTITLEMENT_CAPABILITY_CATALOG, registry)

    expect(report.inSync).toBe(false)
    expect(report.modulesMismatch).toContainEqual({
      capabilityKey: 'organization.finance',
      tsModule: 'organization',
      dbModule: 'finance'
    })
  })

  it('flags actions set mismatch between TS and DB', () => {
    const registry = buildSyncedRegistry()
    const target = registry.find(row => row.capability_key === 'organization.finance_sensitive')

    if (!target) throw new Error('fixture invariant: organization.finance_sensitive must exist in seed')

    target.allowed_actions = ['read']

    const report = compareCapabilitiesParity(ENTITLEMENT_CAPABILITY_CATALOG, registry)

    expect(report.inSync).toBe(false)
    expect(report.actionsMismatch.length).toBeGreaterThan(0)

    const mismatch = report.actionsMismatch.find(entry => entry.capabilityKey === 'organization.finance_sensitive')

    expect(mismatch).toBeDefined()
    expect(mismatch?.tsActions).toEqual(['approve', 'export', 'read'])
    expect(mismatch?.dbActions).toEqual(['read'])
  })

  it('does NOT flag scope differences (registry declares full scope set; TS exposes only defaultScope)', () => {
    const registry = buildSyncedRegistry().map(row => ({
      ...row,
      allowed_scopes: ['own', 'team', 'space', 'organization', 'tenant', 'all']
    }))

    const report = compareCapabilitiesParity(ENTITLEMENT_CAPABILITY_CATALOG, registry)

    expect(report.inSync).toBe(true)
  })
})
