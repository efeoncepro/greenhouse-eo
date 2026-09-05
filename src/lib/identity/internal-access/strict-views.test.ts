import { beforeEach, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ query: vi.fn(), permissionSets: vi.fn(), overview: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mock.query,
  withGreenhousePostgresTransaction: vi.fn()
}))
vi.mock('@/lib/admin/permission-sets', () => ({ resolvePermissionSetViews: mock.permissionSets }))
vi.mock('@/lib/admin/get-admin-access-overview', () => ({ getAdminAccessOverview: mock.overview }))
vi.mock('@/lib/observability/capture', () => ({ captureMessageWithDomain: vi.fn() }))
import { resolveAuthorizedViewsForUser } from '@/lib/admin/view-access-store'

const input = {
  userId: 'u',
  roleCodes: ['efeonce_admin'],
  tenantType: 'efeonce_internal' as const,
  fallbackRouteGroups: ['admin'],
  strict: true
}

beforeEach(() => {
  vi.resetAllMocks()
  mock.query.mockResolvedValue([])
  mock.permissionSets.mockResolvedValue([])
})
for (const table of ['role_view_assignments', 'view_registry', 'user_view_overrides'])
  it(`strict authority rejects ${table} outage instead of granting a baseline`, async () => {
    mock.query.mockImplementation(async (sql: string) => {
      if (sql.includes(`greenhouse_core.${table}`))
        throw Object.assign(new Error('missing_authority'), { code: '42P01' })

      return []
    })
    await expect(resolveAuthorizedViewsForUser(input)).rejects.toThrow()
    expect(mock.overview).not.toHaveBeenCalled()
  })
it('strict permission set failure is not converted into an empty successful read', async () => {
  mock.permissionSets.mockRejectedValue(new Error('permission_authority_unavailable'))
  await expect(resolveAuthorizedViewsForUser(input)).rejects.toThrow('permission_authority_unavailable')
})
it('successful empty stores retain canonical defaults without running expiry cleanup', async () => {
  const result = await resolveAuthorizedViewsForUser(input)

  expect(Array.isArray(result.authorizedViews)).toBe(true)
  expect(mock.overview).not.toHaveBeenCalled()
})
