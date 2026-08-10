import { describe, expect, it } from 'vitest'

import {
  CLIENT_PORTAL_BASE_VIEW_CODES,
  canSeeClientPortalView,
  isClientPortalBaseViewCode,
  type ClientPortalViewVisibilityInputs
} from './client-portal-view-visibility'

/**
 * TASK-1685 Slice 2 — el contrato del primitive, caso por caso.
 *
 * Es una función pura, así que estos tests son la especificación ejecutable de la decisión
 * (a′): el módulo autoriza, el `revoke` per-persona excluye, el bypass interno gana, y el rol
 * NO aparece por ningún lado.
 */

const inputs = (overrides: Partial<ClientPortalViewVisibilityInputs> = {}): ClientPortalViewVisibilityInputs => ({
  isInternalSession: false,
  moduleViewCodes: [],
  revokedViewCodes: [],
  ...overrides
})

describe('canSeeClientPortalView — el carril positivo es el módulo, y sólo el módulo', () => {
  it('abre lo que un módulo contratado declara', () => {
    expect(
      canSeeClientPortalView('cliente.campanas', inputs({ moduleViewCodes: ['cliente.campanas'] }))
    ).toBe(true)
  })

  it('cierra lo que ningún módulo declara — el defecto de los 36 enlaces muertos', () => {
    expect(canSeeClientPortalView('cliente.campanas', inputs())).toBe(false)
  })

  it('abre las vistas base sin ningún módulo: un cliente no contrata su configuración', () => {
    for (const viewCode of CLIENT_PORTAL_BASE_VIEW_CODES) {
      expect(canSeeClientPortalView(viewCode, inputs())).toBe(true)
    }
  })
})

describe('canSeeClientPortalView — la dimensión persona es un DENY, nunca un grant', () => {
  it('un revoke cierra una vista que el módulo concede', () => {
    expect(
      canSeeClientPortalView(
        'cliente.campanas',
        inputs({ moduleViewCodes: ['cliente.campanas'], revokedViewCodes: ['cliente.campanas'] })
      )
    ).toBe(false)
  })

  it('un revoke cierra incluso una vista base: es la excepción declarada, no una lista aparte', () => {
    expect(
      canSeeClientPortalView('cliente.configuracion', inputs({ revokedViewCodes: ['cliente.configuracion'] }))
    ).toBe(false)
  })

  it('un revoke sobre otra vista no toca a la vista consultada', () => {
    expect(
      canSeeClientPortalView(
        'cliente.campanas',
        inputs({ moduleViewCodes: ['cliente.campanas'], revokedViewCodes: ['cliente.analytics'] })
      )
    ).toBe(true)
  })

  it('NO existe un carril "grant per-persona": revocar es lo único que la persona aporta', () => {
    // Si alguna vez alguien agrega `grantedViewCodes`, este test es el que hay que discutir
    // primero: un grant per-persona abriría una superficie que la organización no contrató,
    // o sea vendería por la puerta de atrás. La asimetría es el corazón del diseño.
    const surface = canSeeClientPortalView('cliente.growth_seo_dashboard', inputs())

    expect(surface).toBe(false)
  })
})

describe('canSeeClientPortalView — el bypass interno (D1) gana sobre todo', () => {
  it('una sesión interna abre cualquier vista, sin módulos', () => {
    expect(canSeeClientPortalView('cliente.growth_seo_dashboard', inputs({ isInternalSession: true }))).toBe(true)
  })

  it('un revoke NO aplica a una sesión interna: el override es del portal cliente', () => {
    expect(
      canSeeClientPortalView(
        'cliente.campanas',
        inputs({ isInternalSession: true, revokedViewCodes: ['cliente.campanas'] })
      )
    ).toBe(true)
  })
})

describe('isClientPortalBaseViewCode — la allowlist es chica a propósito', () => {
  it('reconoce exactamente las tres vistas base', () => {
    expect([...CLIENT_PORTAL_BASE_VIEW_CODES].sort()).toEqual(
      ['cliente.actualizaciones', 'cliente.configuracion', 'cliente.notificaciones'].sort()
    )
  })

  it('NO incluye superficies de delivery: dejarlas base daría páginas vacías a quien no las contrató', () => {
    expect(isClientPortalBaseViewCode('cliente.ciclos')).toBe(false)
    expect(isClientPortalBaseViewCode('cliente.analytics')).toBe(false)
  })
})
