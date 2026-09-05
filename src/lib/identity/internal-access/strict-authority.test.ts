import { beforeEach, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ pg: vi.fn(), bigQuery: vi.fn(), views: vi.fn() }))

vi.mock('@/lib/tenant/identity-store', () => ({ getSessionFromPostgresByUserId: mock.pg }))
vi.mock('@/lib/bigquery', () => ({ getBigQueryClient: mock.bigQuery, getBigQueryProjectId: vi.fn() }))
vi.mock('@/lib/admin/view-access-store', () => ({ resolveAuthorizedViewsForUser: mock.views }))
vi.mock('@/lib/notifications/welcome', () => ({ dispatchWelcomeNotification: vi.fn() }))
import { getTenantAccessRecordFromPostgresByUserId } from '@/lib/tenant/access'

beforeEach(() => vi.clearAllMocks())
it('PostgreSQL outage never reads a BigQuery identity snapshot', async () => {
  mock.pg.mockRejectedValue(Object.assign(new Error('unavailable'), { code: 'ECONNREFUSED' }))
  await expect(getTenantAccessRecordFromPostgresByUserId('u')).rejects.toThrow('unavailable')
  expect(mock.bigQuery).not.toHaveBeenCalled()
  expect(mock.views).not.toHaveBeenCalled()
})
it('missing current principal stays absent rather than falling back', async () => {
  mock.pg.mockResolvedValue(null)
  expect(await getTenantAccessRecordFromPostgresByUserId('u')).toBeNull()
  expect(mock.bigQuery).not.toHaveBeenCalled()
  expect(mock.views).not.toHaveBeenCalled()
})
it('strict current identity propagates unavailable view authority', async () => {
  mock.pg.mockResolvedValue({
    user_id: 'u',
    tenant_type: 'efeonce_internal',
    email: 'fixture@example.invalid',
    full_name: 'Fixture',
    role_codes: [],
    route_groups: [],
    active: true,
    status: 'active'
  })
  mock.views.mockRejectedValue(new Error('view_authority_unavailable'))
  await expect(getTenantAccessRecordFromPostgresByUserId('u')).rejects.toThrow('view_authority_unavailable')
  expect(mock.views).toHaveBeenCalledWith(expect.objectContaining({ strict: true }))
  expect(mock.bigQuery).not.toHaveBeenCalled()
})
