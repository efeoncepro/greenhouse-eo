import { describe, expect, it } from 'vitest'

import { compareViewCodesParity, getClientPortalViewCodesFromRegistry, type ModuleViewCodesRow } from './parity'

/**
 * TASK-827 Slice 0 — Unit tests del comparator `compareViewCodesParity`.
 *
 * Tests con fixtures inline (NO requieren PG). El live test
 * `parity.live.test.ts` ejerce el mismo comparator contra DB real.
 *
 * Patrón fuente: `src/lib/client-portal/data-sources/parity.test.ts` (TASK-824).
 */

describe('TASK-827 — compareViewCodesParity', () => {
  it('inSync=true cuando seed cliente.* ⊆ registry exacto', () => {
    const seedRows: ModuleViewCodesRow[] = [
      { module_key: 'creative_hub_globe_v1', view_codes: ['cliente.pulse', 'cliente.proyectos'] },
      { module_key: 'pulse', view_codes: ['cliente.pulse', 'cliente.home'] }
    ]

    const report = compareViewCodesParity(seedRows, ['cliente.pulse', 'cliente.proyectos', 'cliente.home'])

    expect(report.inSync).toBe(true)
    expect(report.inSeedNotInRegistry).toEqual([])
    expect(report.uniqueSeedViewCodeCount).toBe(3)
  })

  it('inSync=true con registry extra values (soft warning informativo)', () => {
    const seedRows: ModuleViewCodesRow[] = [
      { module_key: 'pulse', view_codes: ['cliente.pulse'] }
    ]

    const report = compareViewCodesParity(seedRows, [
      'cliente.pulse',
      'cliente.configuracion', // legacy transversal
      'cliente.notificaciones' // legacy transversal
    ])

    expect(report.inSync).toBe(true)
    expect(report.inSeedNotInRegistry).toEqual([])
    expect(report.inRegistryNotInSeed).toEqual(['cliente.configuracion', 'cliente.notificaciones'])
  })

  it('inSync=false (DRIFT BLOQUEANTE) cuando seed tiene viewCode NO en registry', () => {
    const seedRows: ModuleViewCodesRow[] = [
      { module_key: 'rogue_module', view_codes: ['cliente.never_registered'] }
    ]

    const report = compareViewCodesParity(seedRows, ['cliente.pulse'])

    expect(report.inSync).toBe(false)
    expect(report.inSeedNotInRegistry).toEqual(['cliente.never_registered'])
  })

  it('ignora viewCodes que NO empiezan con cliente.* (otros route groups)', () => {
    const seedRows: ModuleViewCodesRow[] = [
      { module_key: 'cross_module', view_codes: ['cliente.pulse', 'gestion.organizaciones', 'finanzas.clientes'] }
    ]

    const report = compareViewCodesParity(seedRows, ['cliente.pulse'])

    expect(report.inSync).toBe(true)
    expect(report.uniqueSeedViewCodeCount).toBe(1)
    expect(report.inSeedNotInRegistry).toEqual([])
  })

  it('dedupea viewCodes que aparecen en múltiples seed modules', () => {
    const seedRows: ModuleViewCodesRow[] = [
      { module_key: 'mod_a', view_codes: ['cliente.pulse', 'cliente.equipo'] },
      { module_key: 'mod_b', view_codes: ['cliente.pulse', 'cliente.proyectos'] }
    ]

    const report = compareViewCodesParity(seedRows, ['cliente.pulse', 'cliente.equipo', 'cliente.proyectos'])

    expect(report.uniqueSeedViewCodeCount).toBe(3)
    expect(report.seedModuleCount).toBe(2)
    expect(report.inSync).toBe(true)
  })

  it('seedRows vacío → inSync=true con cardinalidad 0', () => {
    const report = compareViewCodesParity([], ['cliente.pulse'])

    expect(report.inSync).toBe(true)
    expect(report.seedModuleCount).toBe(0)
    expect(report.uniqueSeedViewCodeCount).toBe(0)
    expect(report.inRegistryNotInSeed).toEqual(['cliente.pulse'])
  })

  it('registry vacío + seed con cliente.* → inSync=false (DRIFT)', () => {
    const seedRows: ModuleViewCodesRow[] = [
      { module_key: 'pulse', view_codes: ['cliente.pulse'] }
    ]

    const report = compareViewCodesParity(seedRows, [])

    expect(report.inSync).toBe(false)
    expect(report.inSeedNotInRegistry).toEqual(['cliente.pulse'])
    expect(report.registryViewCodeCount).toBe(0)
  })

  it('output sortea inSeedNotInRegistry y inRegistryNotInSeed alfabéticamente', () => {
    const seedRows: ModuleViewCodesRow[] = [
      { module_key: 'mod_rogue', view_codes: ['cliente.zebra', 'cliente.alpha', 'cliente.mu'] }
    ]

    const report = compareViewCodesParity(seedRows, [])

    expect(report.inSeedNotInRegistry).toEqual(['cliente.alpha', 'cliente.mu', 'cliente.zebra'])
  })
})

describe('TASK-827 — getClientPortalViewCodesFromRegistry', () => {
  it('extrae solo entries con routeGroup=client del registry runtime', () => {
    const clientViewCodes = getClientPortalViewCodesFromRegistry()

    // Debe contener los 4 canónicos pre-TASK-827
    expect(clientViewCodes).toContain('cliente.pulse')
    expect(clientViewCodes).toContain('cliente.proyectos')
    expect(clientViewCodes).toContain('cliente.equipo')
    expect(clientViewCodes).toContain('cliente.campanas')

    // Debe contener los 11 forward-looking agregados en TASK-827 Slice 0
    expect(clientViewCodes).toContain('cliente.home')
    expect(clientViewCodes).toContain('cliente.creative_hub')
    expect(clientViewCodes).toContain('cliente.reviews')
    expect(clientViewCodes).toContain('cliente.roi_reports')
    expect(clientViewCodes).toContain('cliente.exports')
    expect(clientViewCodes).toContain('cliente.cvr_quarterly')
    expect(clientViewCodes).toContain('cliente.staff_aug')
    expect(clientViewCodes).toContain('cliente.brand_intelligence')
    expect(clientViewCodes).toContain('cliente.csc_pipeline')
    expect(clientViewCodes).toContain('cliente.crm_command')
    expect(clientViewCodes).toContain('cliente.web_delivery')

    // Debe contener legacy transversales (no en seed)
    expect(clientViewCodes).toContain('cliente.revisiones')
    expect(clientViewCodes).toContain('cliente.notificaciones')

    // NO debe contener entries de otros route groups
    expect(clientViewCodes.every(v => v.startsWith('cliente.'))).toBe(true)
  })

  it('cardinalidad esperada >= 15 post TASK-827 Slice 0 (11 legacy + 11 nuevos = 22; mínimo 15 conservador)', () => {
    const clientViewCodes = getClientPortalViewCodesFromRegistry()

    expect(clientViewCodes.length).toBeGreaterThanOrEqual(15)
  })

  it('todos los viewCodes son únicos (no duplicados en registry)', () => {
    const clientViewCodes = getClientPortalViewCodesFromRegistry()
    const unique = new Set(clientViewCodes)

    expect(unique.size).toBe(clientViewCodes.length)
  })
})
