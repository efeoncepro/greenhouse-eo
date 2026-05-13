import { describe, expect, it } from 'vitest'

import {
  __clearClientPortalCapabilitiesParityCache,
  checkClientPortalRegistryParity,
  checkClientPortalSeedCapabilitiesParity
} from './parity'

/**
 * TASK-826 Slice 5 — Live PG parity tests para client_portal capabilities.
 *
 * Skip cuando no hay PG host configurado (CI sin proxy, lint-only runs).
 * El lane CI con PG disponible (post `pnpm pg:connect`) ejecuta esto y rompe
 * loud en drift.
 *
 * Drift scenarios cubiertos:
 *   A) TS catalog ⇆ DB capabilities_registry:
 *      - TS declara key NO en DB → falta seed
 *      - DB tiene key NO en TS → orphan (TS catalog contracted sin deprecar DB)
 *      - Same key, different actions → drift de allowed_actions
 *
 *   B) Seed modules.capabilities[] ⊆ TS catalog:
 *      - Seed `modules.capabilities[]` declara value NO en TS catalog → drift
 *        bloqueante (referencia muerta — `can()` runtime no la resolverá)
 *
 * Patrón fuente: TASK-611 + TASK-824 Slice 2.
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('TASK-826 — client_portal capabilities live parity (PG)', () => {
  it('A) TS catalog ⇆ capabilities_registry sin drift', async () => {
    __clearClientPortalCapabilitiesParityCache()

    const report = await checkClientPortalRegistryParity()

    expect(
      report.inCatalogNotInRegistry,
      `client_portal capabilities en TS pero NO en DB capabilities_registry — falta seed migration. Drift: ${JSON.stringify(report.inCatalogNotInRegistry)}`
    ).toEqual([])

    expect(
      report.inRegistryNotInCatalog,
      `client_portal capabilities en DB pero NO en TS catalog — orphan registry rows. Drift: ${JSON.stringify(report.inRegistryNotInCatalog)}`
    ).toEqual([])

    expect(
      report.actionsMismatch,
      `client_portal capabilities con drift de allowed_actions TS↔DB: ${JSON.stringify(report.actionsMismatch)}`
    ).toEqual([])

    expect(report.inSync).toBe(true)
  })

  it('B) seed modules.capabilities[] ⊆ TS catalog (sin referencias muertas)', async () => {
    __clearClientPortalCapabilitiesParityCache()

    const report = await checkClientPortalSeedCapabilitiesParity()

    expect(
      report.inSeedNotInCatalog,
      `modules.capabilities[] seed declara values NO en TS catalog — referencias muertas. Resolution: o agregar capability al TS catalog (+ seed migration), o corregir seed modules. Drift: ${JSON.stringify(report.inSeedNotInCatalog)}`
    ).toEqual([])

    expect(report.inSync).toBe(true)
    expect(report.seedModuleCount).toBeGreaterThanOrEqual(10)
  })
})
