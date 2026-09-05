import { beforeEach, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ query: vi.fn(), target: vi.fn(), can: vi.fn() }))

vi.mock('@/lib/db', () => ({ query: mock.query }))
vi.mock('@/lib/tenant/access', () => ({ getTenantAccessRecordFromPostgresByUserId: mock.target }))
vi.mock('@/lib/entitlements/runtime', () => ({ can: mock.can }))
import { canDelegateInternalCapability } from './delegation'

beforeEach(() => {
  vi.clearAllMocks()
  mock.query.mockResolvedValue([{ user_id: 'u' }])
  mock.target.mockResolvedValue({
    active: true,
    status: 'active',
    identityProfileId: 'p',
    tenantType: 'efeonce_internal',
    memberId: 'm'
  })
  mock.can.mockReturnValue(true)
})
it('unknown provider capabilities have no assumed delegation authority', async () => {
  expect(await canDelegateInternalCapability('p', 'globe.producer.fleet.list')).toBe(false)
  expect(mock.query).not.toHaveBeenCalled()
})
it('requires every action of a catalogued capability', async () => {
  mock.can.mockReturnValueOnce(true).mockReturnValueOnce(false)
  expect(await canDelegateInternalCapability('p', 'identity.external_environment.manage')).toBe(false)
  expect(mock.can).toHaveBeenCalledTimes(2)
})
it('revoked or mismatched target cannot receive grants', async () => {
  mock.target.mockResolvedValue({
    active: false,
    status: 'inactive',
    identityProfileId: 'p',
    tenantType: 'efeonce_internal'
  })
  expect(await canDelegateInternalCapability('p', 'identity.internal_access.enroll')).toBe(false)
  expect(mock.can).not.toHaveBeenCalled()
})
it('does not select one of multiple active principals', async () => {
  mock.query.mockResolvedValue([{ user_id: 'u' }, { user_id: 'v' }])
  expect(await canDelegateInternalCapability('p', 'identity.internal_access.enroll')).toBe(false)
  expect(mock.target).not.toHaveBeenCalled()
})

it('current role removal denies a formerly permitted delegation', async () => {
  mock.can.mockReturnValueOnce(true).mockReturnValueOnce(false)
  expect(await canDelegateInternalCapability('p', 'identity.internal_access.enroll')).toBe(true)
  expect(await canDelegateInternalCapability('p', 'identity.internal_access.enroll')).toBe(false)
  expect(mock.target).toHaveBeenCalledTimes(2)
})
it('propagates strict source failure instead of returning prior authority', async () => {
  mock.target.mockRejectedValue(new Error('postgres_unavailable'))
  await expect(canDelegateInternalCapability('p', 'identity.internal_access.enroll')).rejects.toThrow(
    'postgres_unavailable'
  )
  expect(mock.can).not.toHaveBeenCalled()
})
