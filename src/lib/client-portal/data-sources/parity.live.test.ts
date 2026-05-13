import { describe, expect, it } from 'vitest'

import { __clearModuleDataSourcesCache, checkDataSourcesParity } from './parity'

/**
 * TASK-824 Slice 2 — Live PG parity test
 * (catalog TS `ClientPortalDataSource` ⇆ `greenhouse_client_portal.modules.data_sources[]` seed).
 *
 * Skip when no PG host is configured (CI without proxy, lint-only runs, etc.).
 * The CI lane that DOES have PG (post `pnpm pg:connect`) executes this and
 * fails loud on drift.
 *
 * Drift scenarios this test catches:
 *  - Seed DB declares a `data_source` value que NO está en el TS union →
 *    CI red (DRIFT BLOQUEANTE: o el seed es typo, o el TS union se contrajo
 *    sin retirar el value del seed).
 *  - **NO bloquea** cuando TS union tiene values reservados que aún no
 *    aparecen en ningún seed activo (V1.0 forward-looking — values
 *    reservados para módulos futuros).
 *
 * Resolution si falla:
 *   1. Si el value del seed es legítimo → agregarlo al TS union en
 *      `src/lib/client-portal/dto/reader-meta.ts` + actualizar
 *      `CLIENT_PORTAL_DATA_SOURCE_VALUES` en `parity.ts`.
 *   2. Si el value del seed es typo → corregir en una migration nueva
 *      (NOT VALID + VALIDATE atomic; modules table es append-only por
 *      trigger, requiere supersede via effective_to + nueva row).
 *
 * Patrón fuente: `src/lib/capabilities-registry/parity.live.test.ts` (TASK-611).
 *
 * Cierra OQ-3 de TASK-822 ÚNICAMENTE para `data_sources[]`. Paridades análogas
 * de `view_codes[]` y `capabilities[]` son responsabilidad downstream de
 * TASK-827 + TASK-826 respectivamente (cada task posee la parity de su catalog).
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('TASK-824 — client portal data_sources live parity (PG)', () => {
  it('seed DB ⊆ TS union (no DRIFT BLOQUEANTE)', async () => {
    __clearModuleDataSourcesCache()

    const report = await checkDataSourcesParity()

    expect(
      report.inSeedNotInUnion,
      `data_sources en seed DB pero NO en ClientPortalDataSource union — agregar al TS union o corregir seed via migration nueva. Drift: ${JSON.stringify(report.inSeedNotInUnion)}`
    ).toEqual([])
    expect(report.inSync).toBe(true)
  })

  it('reporta metadata coherente (10 seed modules, cardinalidad mínima esperada)', async () => {
    __clearModuleDataSourcesCache()

    const report = await checkDataSourcesParity()

    // V1.0 seed has 10 modules; relax to >= 10 in case the catalog grows
    // append-only over time without invalidating this test.
    expect(report.seedModuleCount, 'expected at least 10 seed modules V1.0').toBeGreaterThanOrEqual(10)

    // Cardinalidad de values únicos: V1.0 seed usa 12-13 values distintos del union de 17.
    // Relaxed lower bound; upper bound es el unionValueCount.
    expect(report.uniqueSeedValueCount).toBeGreaterThan(0)
    expect(report.uniqueSeedValueCount).toBeLessThanOrEqual(report.unionValueCount)
  })
})
