/**
 * TASK-826 Slice 5 — Unit tests para parity helpers (mocked PG).
 *
 * Live parity test lives in `parity.live.test.ts` y corre solo cuando PG está
 * accesible (proxy levantado vía `pnpm pg:connect`).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

// Stub catalog para tests aislados — overrides el catalog real con un subset
// representativo de capabilities client_portal.
vi.mock('@/config/entitlements-catalog', () => ({
  ENTITLEMENT_CAPABILITY_CATALOG: [
    { key: 'client_portal.workspace', module: 'client_portal', actions: ['read', 'launch'], defaultScope: 'space' },
    { key: 'client_portal.module.enable', module: 'client_portal', actions: ['create'], defaultScope: 'tenant' },
    { key: 'client_portal.module.pause', module: 'client_portal', actions: ['update'], defaultScope: 'tenant' },
    { key: 'home.view', module: 'home', actions: ['read'], defaultScope: 'own' }
  ]
}))

import {
  __clearClientPortalCapabilitiesParityCache,
  checkClientPortalRegistryParity,
  checkClientPortalSeedCapabilitiesParity
} from './parity'

beforeEach(() => {
  vi.clearAllMocks()
  __clearClientPortalCapabilitiesParityCache()
})

describe('checkClientPortalRegistryParity (TS catalog ↔ DB capabilities_registry)', () => {
  it('inSync=true when catalog and registry match', async () => {
    mockQuery.mockResolvedValueOnce([
      { capability_key: 'client_portal.workspace', module: 'client_portal', allowed_actions: ['read', 'launch'] },
      { capability_key: 'client_portal.module.enable', module: 'client_portal', allowed_actions: ['create'] },
      { capability_key: 'client_portal.module.pause', module: 'client_portal', allowed_actions: ['update'] }
    ])

    const report = await checkClientPortalRegistryParity()

    expect(report.inSync).toBe(true)
    expect(report.inCatalogNotInRegistry).toEqual([])
    expect(report.inRegistryNotInCatalog).toEqual([])
    expect(report.actionsMismatch).toEqual([])
  })

  it('detects key in catalog but missing in registry', async () => {
    mockQuery.mockResolvedValueOnce([
      { capability_key: 'client_portal.workspace', module: 'client_portal', allowed_actions: ['read', 'launch'] },
      { capability_key: 'client_portal.module.enable', module: 'client_portal', allowed_actions: ['create'] }
      // pause missing
    ])

    const report = await checkClientPortalRegistryParity()

    expect(report.inSync).toBe(false)
    expect(report.inCatalogNotInRegistry).toContain('client_portal.module.pause')
  })

  it('detects orphan key in registry but missing in catalog', async () => {
    mockQuery.mockResolvedValueOnce([
      { capability_key: 'client_portal.workspace', module: 'client_portal', allowed_actions: ['read', 'launch'] },
      { capability_key: 'client_portal.module.enable', module: 'client_portal', allowed_actions: ['create'] },
      { capability_key: 'client_portal.module.pause', module: 'client_portal', allowed_actions: ['update'] },
      { capability_key: 'client_portal.legacy_orphan', module: 'client_portal', allowed_actions: ['read'] }
    ])

    const report = await checkClientPortalRegistryParity()

    expect(report.inSync).toBe(false)
    expect(report.inRegistryNotInCatalog).toContain('client_portal.legacy_orphan')
  })

  it('detects action drift between TS and DB for a matched key', async () => {
    mockQuery.mockResolvedValueOnce([
      { capability_key: 'client_portal.workspace', module: 'client_portal', allowed_actions: ['read', 'launch'] },
      { capability_key: 'client_portal.module.enable', module: 'client_portal', allowed_actions: ['create', 'update'] }, // DB drift
      { capability_key: 'client_portal.module.pause', module: 'client_portal', allowed_actions: ['update'] }
    ])

    const report = await checkClientPortalRegistryParity()

    expect(report.inSync).toBe(false)
    expect(report.actionsMismatch).toHaveLength(1)
    expect(report.actionsMismatch[0].capabilityKey).toBe('client_portal.module.enable')
  })

  it('ignores capabilities from other modules', async () => {
    mockQuery.mockResolvedValueOnce([
      { capability_key: 'client_portal.workspace', module: 'client_portal', allowed_actions: ['read', 'launch'] },
      { capability_key: 'client_portal.module.enable', module: 'client_portal', allowed_actions: ['create'] },
      { capability_key: 'client_portal.module.pause', module: 'client_portal', allowed_actions: ['update'] }
      // home.view NOT in DB results — but it shouldn't matter because we only
      // query module='client_portal' (the test mock filters by module).
    ])

    const report = await checkClientPortalRegistryParity()

    expect(report.inSync).toBe(true)
  })
})

describe('checkClientPortalSeedCapabilitiesParity (seed modules.capabilities[] ⊆ TS catalog)', () => {
  it('inSync=true when all seed capabilities exist in TS catalog', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        module_key: 'creative_hub_globe_v1',
        capabilities: ['client_portal.workspace', 'client_portal.module.enable']
      },
      {
        module_key: 'roi_reports',
        capabilities: ['client_portal.module.pause']
      }
    ])

    const report = await checkClientPortalSeedCapabilitiesParity()

    expect(report.inSync).toBe(true)
    expect(report.inSeedNotInCatalog).toEqual([])
    expect(report.seedModuleCount).toBe(2)
    expect(report.uniqueSeedCapabilityCount).toBe(3)
  })

  it('detects seed value that is not in TS catalog (drift bloqueante)', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        module_key: 'rogue_module',
        capabilities: ['client_portal.workspace', 'client_portal.fake_capability_not_in_catalog']
      }
    ])

    const report = await checkClientPortalSeedCapabilitiesParity()

    expect(report.inSync).toBe(false)
    expect(report.inSeedNotInCatalog).toEqual(['client_portal.fake_capability_not_in_catalog'])
  })

  it('tolerates seed module with empty capabilities array', async () => {
    mockQuery.mockResolvedValueOnce([
      { module_key: 'shell_module', capabilities: [] }
    ])

    const report = await checkClientPortalSeedCapabilitiesParity()

    expect(report.inSync).toBe(true)
    expect(report.uniqueSeedCapabilityCount).toBe(0)
    expect(report.seedModuleCount).toBe(1)
  })

  it('deduplicates capabilities across modules', async () => {
    mockQuery.mockResolvedValueOnce([
      { module_key: 'm1', capabilities: ['client_portal.workspace', 'client_portal.module.enable'] },
      { module_key: 'm2', capabilities: ['client_portal.workspace', 'client_portal.module.pause'] }
    ])

    const report = await checkClientPortalSeedCapabilitiesParity()

    expect(report.uniqueSeedCapabilityCount).toBe(3)
    expect(report.seedModuleCount).toBe(2)
    expect(report.inSync).toBe(true)
  })

  it('caches reads in-process (5min TTL)', async () => {
    mockQuery.mockResolvedValue([
      { module_key: 'm', capabilities: ['client_portal.workspace'] }
    ])

    await checkClientPortalSeedCapabilitiesParity()
    await checkClientPortalSeedCapabilitiesParity()

    // Only one DB call — second one served from cache
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})
