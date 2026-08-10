import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const queryMock = vi.fn()
const resolveVisibilityInputsMock = vi.fn()
const canOpenMock = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }))
vi.mock('@/lib/client-portal/visibility/resolve-client-portal-visibility', () => ({
  resolveClientPortalVisibilityInputs: (...args: unknown[]) => resolveVisibilityInputsMock(...args),
  canOpenClientPortalView: (...args: unknown[]) => canOpenMock(...args)
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

/** Todas las superficies guardadas del catálogo, para que el eje (2) no aporte ruido. */
const ALL_SOLD = [
  'cliente.proyectos',
  'cliente.ciclos',
  'cliente.equipo',
  'cliente.reviews',
  'cliente.analytics',
  'cliente.campanas'
]

/** El mock de `query` sirve dos consultas distintas: los usuarios y el catálogo de módulos. */
const mockQueries = ({ users, sold }: { users: unknown[]; sold: string[] }) => {
  queryMock.mockImplementation((sql: string) => {
    if (sql.includes('greenhouse_client_portal.modules')) {
      return Promise.resolve(sold.map(view_code => ({ view_code })))
    }

    return Promise.resolve(users)
  })
}

const inputs = (moduleViewCodes: string[], revokedViewCodes: string[] = []) => ({
  isInternalSession: false,
  moduleViewCodes,
  revokedViewCodes
})

beforeEach(() => {
  queryMock.mockReset()
  resolveVisibilityInputsMock.mockReset()
  canOpenMock.mockReset()
})

describe('TASK-1685 — señal: ¿el menú declara superficies inalcanzables?', () => {
  it('steady 0: menú y puerta coinciden y todo el catálogo lo vende algún módulo', async () => {
    mockQueries({ users: [user('ok@cliente.com')], sold: ALL_SOLD })
    resolveVisibilityInputsMock.mockResolvedValue(inputs(ALL_SOLD))
    canOpenMock.mockResolvedValue(true)

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.signalId).toBe(CLIENT_PORTAL_MENU_GATE_DIVERGENCE_SIGNAL_ID)
    expect(signal.moduleKey).toBe('identity')
    expect(signal.severity).toBe('ok')
    expect(signal.evidence?.find(e => e.label === 'count')?.value).toBe('0')
  })

  it('eje (2): una superficie del catálogo que ningún módulo vende es inalcanzable para TODOS', async () => {
    // Estado real al 2026-08-10: `cliente.ciclos` y `cliente.analytics` están en el menú y
    // ningún módulo las declara, así que ninguna organización puede alcanzarlas jamás.
    mockQueries({
      users: [user('sky@cliente.com')],
      sold: ALL_SOLD.filter(view => view !== 'cliente.ciclos' && view !== 'cliente.analytics')
    })
    resolveVisibilityInputsMock.mockResolvedValue(inputs(ALL_SOLD))
    canOpenMock.mockResolvedValue(true)

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.evidence?.find(e => e.label === 'superficies que ningún módulo vende')?.value).toMatch(
      /2 \(cliente\.ciclos, cliente\.analytics\)/
    )
    expect(signal.summary).toMatch(/ninguna organización puede alcanzarlas/)
  })

  it('eje (1): el menú ofrece y la puerta niega — el defecto de ISSUE-148', async () => {
    mockQueries({ users: [user('anam@cliente.com')], sold: ALL_SOLD })
    // El menú cree que la organización tiene la superficie; la puerta dice que no.
    resolveVisibilityInputsMock.mockResolvedValue(inputs(ALL_SOLD))
    canOpenMock.mockImplementation((viewCode: string) => Promise.resolve(viewCode !== 'cliente.campanas'))

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.evidence?.find(e => e.label === 'enlaces que la puerta niega')?.value).toBe('1')
    expect(signal.summary).toMatch(/1 enlace que el menú ofrece y la puerta niega/)
  })

  it('la dirección "sólo por URL" escala a `error`: es acceso, no experiencia', async () => {
    mockQueries({ users: [user('url@cliente.com')], sold: ALL_SOLD })
    resolveVisibilityInputsMock.mockResolvedValue(inputs([]))
    canOpenMock.mockImplementation((viewCode: string) => Promise.resolve(viewCode === 'cliente.campanas'))

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.severity).toBe('error')
    expect(signal.evidence?.find(e => e.label === 'alcanzables sólo por URL')?.value).toBe('1')
  })

  it('`/home` queda fuera: es el terminator del guard, no puede divergir', async () => {
    mockQueries({ users: [user('home@cliente.com')], sold: ALL_SOLD })
    resolveVisibilityInputsMock.mockResolvedValue(inputs(ALL_SOLD))
    canOpenMock.mockResolvedValue(true)

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
    mockQueries({ users: Array.from({ length: 501 }, (_, i) => user(`u${i}@cliente.com`)), sold: ALL_SOLD })
    resolveVisibilityInputsMock.mockResolvedValue(inputs(ALL_SOLD))
    canOpenMock.mockResolvedValue(true)

    const signal = await getClientPortalMenuGateDivergenceSignal()

    expect(signal.summary).toMatch(/PARCIAL/)
    expect(signal.evidence?.find(e => e.label === 'usuarios evaluados')?.value).toMatch(/techo alcanzado/)
  })
})
