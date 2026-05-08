import { describe, expect, it } from 'vitest'

import { checkCapabilitiesParity, __clearCapabilitiesRegistryCache } from './parity'

/**
 * TASK-611 — Live PG parity test (catalog TS ↔ greenhouse_core.capabilities_registry).
 *
 * Skip when no PG host is configured (CI without proxy, lint-only runs, etc.). The CI
 * lane that DOES have PG (post `pnpm pg:connect`) executes this and fails on drift.
 *
 * Drift scenarios this test catches:
 *  - Catalog TS gained a capability that no migration seeded → CI red.
 *  - DB has a capability not in TS catalog (legacy, never deprecated) → CI red.
 *  - Same capability has different module / actions in TS vs DB → CI red.
 *
 * Resolution: add the seed row in a migration, then this test passes.
 */
const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('TASK-611 — capabilities registry live parity (PG)', () => {
  it('catalog TS ⇆ DB registry stay in sync', async () => {
    __clearCapabilitiesRegistryCache()

    const report = await checkCapabilitiesParity()

    expect(report.inCatalogNotInRegistry, 'capabilities in TS but missing in DB — add seed migration').toEqual([])
    expect(report.inRegistryNotInCatalog, 'capabilities in DB not in TS — deprecate or add to catalog').toEqual([])
    expect(report.modulesMismatch, 'module field divergence between TS and DB').toEqual([])
    expect(report.actionsMismatch, 'allowed_actions divergence between TS and DB').toEqual([])
    expect(report.inSync).toBe(true)
  })
})
