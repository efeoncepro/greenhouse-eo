import { describe, expect, it } from 'vitest'

import { VIEW_REGISTRY } from './view-access-catalog'

describe('VIEW_REGISTRY', () => {
  it('has no duplicate viewCodes', () => {
    const viewCodes = VIEW_REGISTRY.map(e => e.viewCode)
    const unique = new Set(viewCodes)

    expect(unique.size).toBe(viewCodes.length)
  })

  it('every entry has required fields', () => {
    for (const entry of VIEW_REGISTRY) {
      expect(entry.viewCode).toBeTruthy()
      expect(entry.section).toBeTruthy()
      expect(entry.label).toBeTruthy()
      expect(entry.routePath).toBeTruthy()
      expect(entry.routeGroup).toBeTruthy()
    }
  })

  it('includes administracion.cuentas with correct routePath', () => {
    const cuentas = VIEW_REGISTRY.find(e => e.viewCode === 'administracion.cuentas')

    expect(cuentas).toBeDefined()
    expect(cuentas!.routePath).toBe('/admin/accounts')
    expect(cuentas!.routeGroup).toBe('admin')
  })

  it('includes TASK-555 commercial surfaces over transitional finance paths', () => {
    const commercialViews = VIEW_REGISTRY.filter(e => e.section === 'comercial')

    expect(commercialViews).toHaveLength(6)
    expect(commercialViews.map(e => e.viewCode).sort()).toEqual([
      'comercial.acuerdos_marco',
      'comercial.contratos',
      'comercial.cotizaciones',
      'comercial.pipeline',
      'comercial.productos',
      'comercial.sow'
    ])

    for (const view of commercialViews) {
      expect(view.routeGroup).toBe('commercial')
      expect(view.routePath.startsWith('/finance/')).toBe(true)
    }
  })
})
