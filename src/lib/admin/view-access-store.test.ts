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

const { VIEW_REGISTRY } = await import('./view-access-catalog')
const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
const { resolveAuthorizedViewsForUser, syncViewRegistryCatalog } = await import('./view-access-store')

const mockedRunGreenhousePostgresQuery = vi.mocked(runGreenhousePostgresQuery)

describe('syncViewRegistryCatalog', () => {
  beforeEach(() => {
    mockClientQuery.mockReset()
    mockClientQuery.mockResolvedValue({ rows: [] })
    mockedRunGreenhousePostgresQuery.mockReset()
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
