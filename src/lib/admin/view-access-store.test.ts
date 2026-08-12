import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockClientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: async (
    callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>
  ) => callback({ query: mockClientQuery })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureMessageWithDomain: vi.fn()
}))

const { VIEW_REGISTRY } = await import('./view-access-catalog')
const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
const { captureMessageWithDomain } = await import('@/lib/observability/capture')
const { resolveAuthorizedViewsForUser, syncViewRegistryCatalog } = await import('./view-access-store')

const mockedRunGreenhousePostgresQuery = vi.mocked(runGreenhousePostgresQuery)
const mockedCaptureMessageWithDomain = vi.mocked(captureMessageWithDomain)

describe('syncViewRegistryCatalog', () => {
  beforeEach(() => {
    mockClientQuery.mockReset()
    mockClientQuery.mockResolvedValue({ rows: [] })
    mockedRunGreenhousePostgresQuery.mockReset()
    mockedCaptureMessageWithDomain.mockReset()
  })

  it('bulk upserts the view registry instead of issuing one query per view', async () => {
    await syncViewRegistryCatalog('agent-test')

    expect(mockClientQuery).toHaveBeenCalledTimes(2)

    const [upsertSql, upsertParams] = mockClientQuery.mock.calls[0]
    const [deactivateSql] = mockClientQuery.mock.calls[1]

    expect(String(upsertSql)).toContain('UNNEST')
    expect(String(upsertSql)).toContain('ON CONFLICT (view_code) DO UPDATE')
    expect(String(deactivateSql)).toContain('view_code <> ALL($2::text[])')

    expect(upsertParams[0]).toHaveLength(VIEW_REGISTRY.length)
    expect(upsertParams[0]).toEqual(VIEW_REGISTRY.map(view => view.viewCode))
    expect(upsertParams[7]).toBe('agent-test')
  })

  it('does not promote view-level access into broad route groups', async () => {
    mockedRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('greenhouse_core.role_view_assignments')) {
        return [
          { role_code: 'efeonce_operations', view_code: 'equipo.organigrama', granted: true },
          { role_code: 'efeonce_operations', view_code: 'equipo.nomina', granted: false }
        ]
      }

      if (sql.includes('greenhouse_core.view_registry')) {
        return [
          {
            view_code: 'equipo.organigrama',
            section: 'hr',
            label: 'Organigrama',
            description: null,
            route_group: 'hr',
            route_path: '/hr/org-chart',
            display_order: 1,
            active: true
          },
          {
            view_code: 'equipo.nomina',
            section: 'hr',
            label: 'Nómina',
            description: null,
            route_group: 'hr',
            route_path: '/hr/payroll',
            display_order: 2,
            active: true
          }
        ]
      }

      if (sql.includes('greenhouse_core.user_view_overrides')) {
        return []
      }

      return []
    })

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-ops',
      roleCodes: ['efeonce_operations'],
      tenantType: 'efeonce_internal',
      fallbackRouteGroups: ['internal', 'my']
    })

    expect(access.authorizedViews).toContain('equipo.organigrama')
    expect(access.authorizedViews).not.toContain('equipo.nomina')
    expect(access.routeGroups).toEqual(['internal', 'my'])
  })
})

/**
 * TASK-1678 Slices 2, 3 y 5 — el carril rol→vista falla hacia cerrado para `client`.
 *
 * Contrato que estos tests fijan:
 *   - una vista `cliente.*` SIN fila explícita no se otorga (Slice 2);
 *   - una vista interna SIN fila sigue otorgándose (no-regresión del portal interno);
 *   - una vista cliente desactivada en DB no reaparece por el merge del TS (Slice 3);
 *   - un denial de rol NO vence sobre el grant de otro rol del mismo usuario (Slice 5).
 */
describe('client rail fails closed (TASK-1678)', () => {
  const clientView = {
    view_code: 'cliente.campanas',
    section: 'client',
    label: 'Campañas',
    description: null,
    route_group: 'client',
    route_path: '/campanas',
    display_order: 1,
    active: true
  }

  const internalView = {
    view_code: 'equipo.organigrama',
    section: 'hr',
    label: 'Organigrama',
    description: null,
    route_group: 'hr',
    route_path: '/hr/org-chart',
    display_order: 1,
    active: true
  }

  const mockStore = ({
    assignments = [] as { role_code: string; view_code: string; granted: boolean }[],
    registry = [] as (typeof clientView)[]
  }) => {
    mockedRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('greenhouse_core.role_view_assignments')) return assignments
      if (sql.includes('greenhouse_core.view_registry')) return registry

      return []
    })
  }

  beforeEach(() => {
    mockClientQuery.mockReset()
    mockClientQuery.mockResolvedValue({ rows: [] })
    mockedRunGreenhousePostgresQuery.mockReset()
    mockedCaptureMessageWithDomain.mockReset()
  })

  it('does NOT grant a cliente.* view that has no explicit assignment row', async () => {
    mockStore({ registry: [clientView] })

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-client',
      roleCodes: ['client_manager'],
      tenantType: 'client',
      fallbackRouteGroups: ['client']
    })

    expect(access.authorizedViews).not.toContain('cliente.campanas')
  })

  it('still grants an internal view with no assignment row (portal interno no-regression)', async () => {
    mockStore({ registry: [internalView] })

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-hr',
      roleCodes: ['hr_payroll'],
      tenantType: 'efeonce_internal',
      fallbackRouteGroups: ['internal', 'hr', 'people']
    })

    expect(access.authorizedViews).toContain('equipo.organigrama')
  })

  it('grants a cliente.* view when the assignment row says granted', async () => {
    mockStore({
      registry: [clientView],
      assignments: [{ role_code: 'client_manager', view_code: 'cliente.campanas', granted: true }]
    })

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-client',
      roleCodes: ['client_manager'],
      tenantType: 'client',
      fallbackRouteGroups: ['client']
    })

    expect(access.authorizedViews).toContain('cliente.campanas')
  })

  it('uses the persisted Globe credits grant without emitting fallback telemetry', async () => {
    const globeCreditsView = {
      view_code: 'administracion.globe_credits',
      section: 'administracion',
      label: 'Créditos Globe',
      description: null,
      route_group: 'admin',
      route_path: '/admin/globe/credits',
      display_order: 1,
      active: true
    }

    mockStore({
      registry: [globeCreditsView],
      assignments: [{ role_code: 'efeonce_admin', view_code: 'administracion.globe_credits', granted: true }]
    })

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-admin',
      roleCodes: ['efeonce_admin'],
      tenantType: 'efeonce_internal',
      fallbackRouteGroups: ['internal', 'admin']
    })

    expect(access.authorizedViews).toContain('administracion.globe_credits')
    expect(mockedCaptureMessageWithDomain).not.toHaveBeenCalled()
  })

  it('does not resurrect a cliente.* view that is inactive in the DB registry', async () => {
    // `getPersistedViewRegistry` filtra `active = TRUE`, así que una vista cliente
    // desactivada llega acá como ausente. Antes el merge la reponía desde el TS y
    // desactivarla no tenía efecto. Se usa un viewCode real del registry TS para que
    // el test siga siendo válido cuando el catálogo cambie.
    const inactiveClientViewCode = VIEW_REGISTRY.find(view => view.routeGroup === 'client')?.viewCode

    expect(inactiveClientViewCode).toBeDefined()

    mockStore({
      registry: [internalView],
      assignments: [{ role_code: 'client_manager', view_code: inactiveClientViewCode!, granted: true }]
    })

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-client',
      roleCodes: ['client_manager'],
      tenantType: 'client',
      fallbackRouteGroups: ['client']
    })

    expect(access.authorizedViews).not.toContain(inactiveClientViewCode)
  })

  it('degrades a client tenant to an EMPTY claim when the schema is not ready', async () => {
    // Antes devolvía el VIEW_REGISTRY completo del routeGroup: las 25 vistas cliente,
    // incluidas las 18 module-gated y las que tienen denial. Y como la lista salía no
    // vacía, ningún guard de "lista vacía" de los consumidores se activaba.
    mockedRunGreenhousePostgresQuery.mockRejectedValue(Object.assign(new Error('relation missing'), { code: '42P01' }))

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-client',
      roleCodes: ['client_manager'],
      tenantType: 'client',
      fallbackRouteGroups: ['client']
    })

    expect(access.authorizedViews).toEqual([])
    expect(access.routeGroups).toEqual(['client'])
  })

  it('keeps the internal degraded baseline when the schema is not ready', async () => {
    mockedRunGreenhousePostgresQuery.mockRejectedValue(Object.assign(new Error('relation missing'), { code: '42P01' }))

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-hr',
      roleCodes: ['hr_payroll'],
      tenantType: 'efeonce_internal',
      fallbackRouteGroups: ['internal', 'hr', 'people']
    })

    expect(access.authorizedViews.length).toBeGreaterThan(0)
    expect(access.authorizedViews.some(viewCode => viewCode.startsWith('cliente.'))).toBe(false)
  })

  it('keeps role-level denials NON-overriding: the union across roles wins (Slice 5 decision)', async () => {
    // Decisión arch 2026-08-09: `granted=FALSE` a nivel de rol significa "este rol no
    // otorga esto", NO "este usuario no debe tenerlo". El veto per-usuario vive en
    // `user_view_overrides`. Si alguien invierte esto, este test lo detiene y lo obliga
    // a leer el rationale del Slice 5 antes de cambiar la semántica.
    mockStore({
      registry: [clientView],
      assignments: [
        { role_code: 'client_manager', view_code: 'cliente.campanas', granted: true },
        { role_code: 'client_specialist', view_code: 'cliente.campanas', granted: false }
      ]
    })

    const access = await resolveAuthorizedViewsForUser({
      userId: 'user-multi-role',
      roleCodes: ['client_manager', 'client_specialist'],
      tenantType: 'client',
      fallbackRouteGroups: ['client']
    })

    expect(access.authorizedViews).toContain('cliente.campanas')
  })
})
