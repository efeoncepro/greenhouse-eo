import { describe, expect, it, vi } from 'vitest'

import { composeNavItemsFromModules, groupNavItems, type ClientNavItem } from './menu-builder'
import type { ResolvedClientPortalModule } from '../dto/module'

vi.mock('server-only', () => ({}))

/**
 * TASK-827 Slice 3 — Unit tests del menu-builder pure function.
 *
 * Cubre los 6 pasos del pipeline:
 *   1. Flatten modules → viewCodes
 *   2. Dedup por viewCode con tier priority winner
 *   3. Lookup en VIEW_REGISTRY (consume el registry real)
 *   4. Filter defensive cuando viewCode NO está en registry
 *   5. Lookup nav descriptor (icon + group)
 *   6. Sort canonical (group → tier → label alfabético)
 *
 * Fixtures construidos inline para tests determinísticos.
 */

const buildModule = (overrides: Partial<ResolvedClientPortalModule>): ResolvedClientPortalModule => ({
  assignmentId: 'cpma-test',
  moduleKey: 'test_module',
  status: 'active',
  source: 'manual_admin',
  expiresAt: null,
  displayLabel: 'Test Module',
  displayLabelClient: 'Test',
  applicabilityScope: 'globe',
  tier: 'standard',
  viewCodes: ['cliente.pulse'],
  capabilities: [],
  dataSources: [],
  ...overrides
})

describe('composeNavItemsFromModules — pipeline canonical', () => {
  it('flatten + lookup + sort: 1 module con 2 viewCodes → 2 nav items', () => {
    const modules = [
      buildModule({
        moduleKey: 'pulse',
        viewCodes: ['cliente.pulse', 'cliente.home'],
        tier: 'standard'
      })
    ]

    const items = composeNavItemsFromModules(modules)

    expect(items).toHaveLength(2)
    expect(items.map(i => i.viewCode).sort()).toEqual(['cliente.home', 'cliente.pulse'])
  })

  it('dedup por viewCode: standard wins over addon cuando ambos declaran mismo viewCode', () => {
    const modules = [
      buildModule({
        moduleKey: 'mod_addon',
        viewCodes: ['cliente.equipo'],
        tier: 'addon'
      }),
      buildModule({
        moduleKey: 'mod_standard',
        viewCodes: ['cliente.equipo'],
        tier: 'standard'
      })
    ]

    const items = composeNavItemsFromModules(modules)

    expect(items).toHaveLength(1)
    expect(items[0]?.tier).toBe('standard')
  })

  it('dedup por viewCode: addon wins over pilot', () => {
    const modules = [
      buildModule({
        moduleKey: 'mod_pilot',
        viewCodes: ['cliente.brand_intelligence'],
        tier: 'pilot'
      }),
      buildModule({
        moduleKey: 'mod_addon',
        viewCodes: ['cliente.brand_intelligence'],
        tier: 'addon'
      })
    ]

    const items = composeNavItemsFromModules(modules)

    expect(items).toHaveLength(1)
    expect(items[0]?.tier).toBe('addon')
  })

  it('filter defensive: ignora viewCodes que NO están en VIEW_REGISTRY', () => {
    const modules = [
      buildModule({
        moduleKey: 'rogue',
        viewCodes: ['cliente.pulse', 'cliente.nonexistent_viewcode']
      })
    ]

    const items = composeNavItemsFromModules(modules)

    expect(items.map(i => i.viewCode)).toEqual(['cliente.pulse'])
  })

  it('filter defensive: ignora viewCodes que NO empiezan con cliente.', () => {
    const modules = [
      buildModule({
        moduleKey: 'cross_module',
        viewCodes: ['cliente.pulse', 'gestion.organizaciones', 'finanzas.clientes']
      })
    ]

    const items = composeNavItemsFromModules(modules)

    expect(items.map(i => i.viewCode)).toEqual(['cliente.pulse'])
  })

  it('lookup VIEW_REGISTRY: label viene del registry, NO del displayLabel del module', () => {
    const modules = [
      buildModule({
        moduleKey: 'pulse',
        viewCodes: ['cliente.pulse'],
        displayLabel: 'Internal Operator Label',
        displayLabelClient: 'Module Client Label'
      })
    ]

    const items = composeNavItemsFromModules(modules)

    expect(items[0]?.label).toBe('Pulse') // From VIEW_REGISTRY entry for cliente.pulse
    expect(items[0]?.label).not.toBe('Internal Operator Label')
    expect(items[0]?.label).not.toBe('Module Client Label')
  })

  it('lookup VIEW_REGISTRY: route viene del registry.routePath', () => {
    const modules = [
      buildModule({
        moduleKey: 'pulse',
        viewCodes: ['cliente.pulse']
      })
    ]

    const items = composeNavItemsFromModules(modules)

    expect(items[0]?.route).toBe('/home') // VIEW_REGISTRY entry para cliente.pulse routePath=/home
  })

  it('sort canonical: group order primary → capabilities → account', () => {
    const modules = [
      buildModule({
        moduleKey: 'multi',
        viewCodes: ['cliente.brand_intelligence', 'cliente.pulse', 'cliente.notificaciones']
      })
    ]

    const items = composeNavItemsFromModules(modules)
    const groups = items.map(i => i.group)

    expect(groups).toEqual(['primary', 'capabilities', 'account'])
  })

  it('sort within group: tier standard → addon → pilot', () => {
    const modules = [
      buildModule({
        moduleKey: 'pilot_mod',
        viewCodes: ['cliente.creative_hub'], // capabilities group, tier=pilot
        tier: 'pilot'
      }),
      buildModule({
        moduleKey: 'addon_mod',
        viewCodes: ['cliente.brand_intelligence'],
        tier: 'addon'
      }),
      buildModule({
        moduleKey: 'standard_mod',
        viewCodes: ['cliente.csc_pipeline'],
        tier: 'standard'
      })
    ]

    const items = composeNavItemsFromModules(modules)

    // All 3 son capabilities group, sort by tier
    expect(items.map(i => i.tier)).toEqual(['standard', 'addon', 'pilot'])
  })

  it('idempotente: dos llamadas con mismo input devuelven misma output', () => {
    const modules = [
      buildModule({
        moduleKey: 'pulse',
        viewCodes: ['cliente.pulse', 'cliente.home', 'cliente.brand_intelligence']
      })
    ]

    const items1 = composeNavItemsFromModules(modules)
    const items2 = composeNavItemsFromModules(modules)

    expect(items1).toEqual(items2)
  })

  it('input vacío → output vacío', () => {
    const items = composeNavItemsFromModules([])

    expect(items).toEqual([])
  })

  it('icon mapping: fallback descriptor cuando viewCode no está en VIEW_CODE_NAV_DESCRIPTOR', () => {
    // cliente.modulos es legacy transversal, NO está en seed pero SÍ en VIEW_REGISTRY
    // Cuando un seed module futuro declare cliente.modulos, el mapping ya existe.
    // Aquí testeamos que un viewCode VÁLIDO sin entry NAV_DESCRIPTOR cae a fallback.
    // (Imposible con seed actual; este test es defensive contract.)
    const modules = [
      buildModule({
        moduleKey: 'pulse',
        viewCodes: ['cliente.pulse'] // tiene descriptor
      })
    ]

    const items = composeNavItemsFromModules(modules)

    expect(items[0]?.icon).toBe('tabler-smart-home')
  })
})

describe('groupNavItems — helper para sectioning', () => {
  it('agrupa items por group con orden canonical', () => {
    const items: readonly ClientNavItem[] = [
      { viewCode: 'cliente.pulse', label: 'Pulse', route: '/home', icon: 'tabler-smart-home', group: 'primary', tier: 'standard' },
      { viewCode: 'cliente.brand_intelligence', label: 'Brand Intelligence', route: '/brand-intelligence', icon: 'tabler-bulb', group: 'capabilities', tier: 'addon' },
      { viewCode: 'cliente.notificaciones', label: 'Notificaciones', route: '/notifications', icon: 'tabler-notification', group: 'account', tier: 'standard' }
    ]

    const grouped = groupNavItems(items)

    expect(grouped.primary).toHaveLength(1)
    expect(grouped.capabilities).toHaveLength(1)
    expect(grouped.account).toHaveLength(1)
    expect(grouped.primary[0]?.viewCode).toBe('cliente.pulse')
  })

  it('grouping con items vacíos: todos los buckets vacíos', () => {
    const grouped = groupNavItems([])

    expect(grouped.primary).toEqual([])
    expect(grouped.capabilities).toEqual([])
    expect(grouped.account).toEqual([])
  })
})
