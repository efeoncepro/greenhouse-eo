import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const queryMock = vi.fn()
const resolveAuthorizedViewsForUserMock = vi.fn()
const resolveModulesMock = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }))
vi.mock('@/lib/admin/view-access-store', () => ({
  resolveAuthorizedViewsForUser: (...args: unknown[]) => resolveAuthorizedViewsForUserMock(...args)
}))
vi.mock('@/lib/client-portal/readers/native/module-resolver', () => ({
  resolveClientPortalModulesForOrganization: (...args: unknown[]) => resolveModulesMock(...args),
  // La allowlist real, no un stub: si cambia, este test tiene que enterarse.
  isClientPortalBaseViewCode: (viewCode: string) =>
    ['cliente.notificaciones', 'cliente.configuracion', 'cliente.actualizaciones'].includes(viewCode)
}))

const { getClientPortalMenuGateDivergenceSignal, CLIENT_PORTAL_MENU_GATE_DIVERGENCE_SIGNAL_ID } = await import(
  './client-portal-menu-gate-divergence'
)

const user = (email: string) => ({
  user_id: `user-${email}`,
  email,
  organization_id: 'org-1',
  role_codes: ['client_executive'],
  route_groups: ['client']
})

/**
 * Las 3 vistas base están otorgadas a los tres roles cliente en producción (verificado contra
 * PG el 2026-08-10), así que el claim realista SIEMPRE las trae. Omitirlas produciría
 * divergencia en la dirección "alcanzable sólo por URL" y haría fallar los casos por un
 * fixture irreal, no por el código.
 */
const BASE_VIEWS = ['cliente.notificaciones', 'cliente.configuracion', 'cliente.actualizaciones']

const withClaim = (viewCodes: string[]) => ({
  authorizedViews: [...BASE_VIEWS, ...viewCodes],
  routeGroups: ['client']
})

/** Claim crudo, sin las base — para ejercitar el camino degradado a propósito. */
const withRawClaim = (viewCodes: string[]) => ({ authorizedViews: viewCodes, routeGroups: ['client'] })
const withModules = (viewCodes: string[]) => [{ moduleKey: 'm1', viewCodes }]

beforeEach(() => {
  queryMock.mockReset()
  resolveAuthorizedViewsForUserMock.mockReset()
  resolveModulesMock.mockReset()
})

describe('TASK-1685 Slice 3 — señal de divergencia menú ↔ puerta', () => {
  it('steady 0: cuando el claim y los módulos declaran lo mismo, no hay divergencia', async () => {
    queryMock.mockResolvedValue([user('ok@cliente.com')])
    resolveAuthorizedViewsForUserMock.mockResolvedValue(withClaim(['cliente.proyectos']))
    resolveModulesMock.mockResolvedValue(withModules(['cliente.proyectos']))

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.signalId).toBe(CLIENT_PORTAL_MENU_GATE_DIVERGENCE_SIGNAL_ID)
    expect(signal.moduleKey).toBe('identity')
    expect(signal.severity).toBe('ok')
    expect(signal.evidence?.find(e => e.label === 'count')?.value).toBe('0')
  })

  it('cuenta el enlace muerto: el claim de rol ofrece una vista que ningún módulo declara', async () => {
    // Es el defecto exacto de ISSUE-148: el rol concede `cliente.proyectos`, la organización
    // no tiene módulo que la declare, y el guard redirige a /home?denied=.
    queryMock.mockResolvedValue([user('anam@cliente.com')])
    resolveAuthorizedViewsForUserMock.mockResolvedValue(withClaim(['cliente.proyectos', 'cliente.analytics']))
    resolveModulesMock.mockResolvedValue(withModules([]))

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.evidence?.find(e => e.label === 'count')?.value).toBe('2')
    expect(signal.evidence?.find(e => e.label === 'enlaces que la puerta niega')?.value).toBe('2')
    expect(signal.evidence?.find(e => e.label === 'alcanzables sólo por URL')?.value).toBe('0')
    expect(signal.summary).toMatch(/2 enlaces que el menú ofrece y la puerta niega/)
  })

  it('las 3 vistas base nunca divergen aunque el claim no las tenga: la puerta las abre siempre', async () => {
    queryMock.mockResolvedValue([user('base@cliente.com')])
    resolveAuthorizedViewsForUserMock.mockResolvedValue(withRawClaim([]))
    resolveModulesMock.mockResolvedValue(withModules([]))

    const signal = await getClientPortalMenuGateDivergenceSignal()

    // Con claim vacío, el menú no ofrece nada del catálogo, pero la puerta SÍ abre las 3 base
    // → esas 3 caen en "alcanzable sólo por URL", que es la dirección grave.
    expect(signal.severity).toBe('error')
    expect(signal.evidence?.find(e => e.label === 'alcanzables sólo por URL')?.value).toBe('3')
  })

  it('`/home` queda fuera de la medición: es el terminator del guard, no puede divergir', async () => {
    queryMock.mockResolvedValue([user('home@cliente.com')])
    resolveAuthorizedViewsForUserMock.mockResolvedValue(withClaim(['cliente.pulse']))
    resolveModulesMock.mockResolvedValue(withModules([]))

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.evidence?.find(e => e.label === 'pares')?.value).not.toMatch(/cliente\.pulse/)
  })

  it('degrada honestamente a `unknown` cuando la query falla — nunca a `ok`', async () => {
    queryMock.mockRejectedValue(new Error('pg down'))

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toMatch(/No fue posible leer el signal/)
  })

  it('un techo alcanzado se declara en el summary — nunca se reporta un parcial como total', async () => {
    // 501 usuarios: uno más que el techo. El conteo que reporte es un piso.
    const many = Array.from({ length: 501 }, (_, i) => user(`u${i}@cliente.com`))

    queryMock.mockResolvedValue(many)
    resolveAuthorizedViewsForUserMock.mockResolvedValue(withClaim([]))
    resolveModulesMock.mockResolvedValue(withModules([]))

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.summary).toMatch(/PARCIAL/)
    expect(signal.evidence?.find(e => e.label === 'usuarios evaluados')?.value).toMatch(/techo alcanzado/)
  })
})
