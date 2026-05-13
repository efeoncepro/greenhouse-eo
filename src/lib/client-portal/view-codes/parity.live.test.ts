import { describe, expect, it } from 'vitest'

import { __clearModuleViewCodesCache, checkViewCodesParity } from './parity'

/**
 * TASK-827 Slice 0 — Live PG parity test
 * (registry TS `VIEW_REGISTRY` ⇆ `greenhouse_client_portal.modules.view_codes[]` seed).
 *
 * Skip when no PG host is configured (CI without proxy, lint-only runs, etc.).
 * El CI lane que SÍ tiene PG (post `pnpm pg:connect`) ejecuta este test y
 * falla loud bloqueando merge si emerge drift.
 *
 * Drift scenarios que este test cubre:
 *  - Seed DB declara un `cliente.*` viewCode que NO está en VIEW_REGISTRY →
 *    CI red (DRIFT BLOQUEANTE: o el seed agregó un viewCode nuevo sin
 *    registrarlo en VIEW_REGISTRY, o el registry se contrajo sin retirar
 *    el value del seed).
 *  - **NO bloquea** cuando VIEW_REGISTRY tiene `cliente.*` viewCodes que no
 *    aparecen en ningún seed activo (transversales como `cliente.configuracion`,
 *    `cliente.notificaciones`, `cliente.modulos` — siempre accesibles para
 *    client tenants sin estar gateados por module).
 *
 * Resolution si falla:
 *   1. Si el viewCode del seed es legítimo → agregar entry a VIEW_REGISTRY
 *      en `src/lib/admin/view-access-catalog.ts` (TASK-827 Slice 0 pattern:
 *      section='cliente', routeGroup='client', routePath stub si page no
 *      existe aún).
 *   2. Si el viewCode del seed es typo → corregir vía supersede del module
 *      (modules table tiene trigger anti-UPDATE para view_codes — requiere
 *      `effective_to` + nueva row con `module_key` distinto).
 *
 * Patrón fuente: `src/lib/client-portal/data-sources/parity.live.test.ts`
 * (TASK-824).
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('TASK-827 — client portal view_codes live parity (PG)', () => {
  it('seed DB cliente.* ⊆ VIEW_REGISTRY cliente.* (no DRIFT BLOQUEANTE)', async () => {
    __clearModuleViewCodesCache()

    const report = await checkViewCodesParity()

    expect(
      report.inSeedNotInRegistry,
      `view_codes en seed DB pero NO en VIEW_REGISTRY — agregar entry al registry o corregir seed via supersede. Drift: ${JSON.stringify(report.inSeedNotInRegistry)}`
    ).toEqual([])
    expect(report.inSync).toBe(true)
  })

  it('reporta metadata coherente (10 seed modules, cardinalidad mínima esperada)', async () => {
    __clearModuleViewCodesCache()

    const report = await checkViewCodesParity()

    // V1.0 seed has 10 modules; relax a >= 10 por si el catalog crece append-only.
    expect(report.seedModuleCount, 'expected at least 10 seed modules V1.0').toBeGreaterThanOrEqual(10)

    // Cardinalidad de cliente.* viewCodes únicos en seed: V1.0 usa ~15 viewCodes.
    expect(report.uniqueSeedViewCodeCount).toBeGreaterThan(0)
    expect(report.uniqueSeedViewCodeCount).toBeLessThanOrEqual(report.registryViewCodeCount)

    // VIEW_REGISTRY post TASK-827 Slice 0 tiene >= 15 entries cliente.*
    expect(report.registryViewCodeCount).toBeGreaterThanOrEqual(15)
  })
})
