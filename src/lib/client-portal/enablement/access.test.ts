import { afterEach, describe, expect, it, vi } from 'vitest'

const identity = vi.hoisted(() => ({ read: vi.fn() }))

vi.mock('@/lib/tenant/access', () => ({ getTenantAccessRecordFromPostgresByUserId: identity.read }))

import { assertServiceEnablementWritesEnabled, authorizeServiceEnablement } from './access'

const admin = { userId: 'admin', active: true, status: 'active', tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'], primaryRoleCode: 'efeonce_admin', routeGroups: ['admin'], authorizedViews: [], memberId: null }

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('service enablement authority', () => {
  it('is default-off and accepts only an explicit true', () => {
    for (const value of ['', 'false', '1', 'TRUE']) {
      vi.stubEnv('CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED', value)
      expect(assertServiceEnablementWritesEnabled).toThrow()
    }

    vi.stubEnv('CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED', 'true')
    expect(assertServiceEnablementWritesEnabled).not.toThrow()
  })

  it('allows the same current administrator to apply and compensate', async () => {
    identity.read.mockResolvedValue(admin)
    await expect(authorizeServiceEnablement('admin', 'apply')).resolves.toMatchObject({ userId: 'admin' })
    await expect(authorizeServiceEnablement('admin', 'rollback')).resolves.toMatchObject({ userId: 'admin' })
  })

  it('refreshes current authority before every call, including a revoked repeat', async () => {
    identity.read.mockResolvedValueOnce(admin).mockResolvedValueOnce({ ...admin, roleCodes: [], primaryRoleCode: '' })
    await expect(authorizeServiceEnablement('admin', 'apply')).resolves.toMatchObject({ userId: 'admin' })
    await expect(authorizeServiceEnablement('admin', 'apply')).rejects.toMatchObject({ statusCode: 403 })
    expect(identity.read).toHaveBeenCalledTimes(2)
  })

  it.each([
    null, { ...admin, active: false }, { ...admin, status: 'invited' },
    { ...admin, tenantType: 'client' }, { ...admin, roleCodes: ['collaborator'], primaryRoleCode: 'collaborator' }
  ])('denies missing, inactive, invited, client and unprivileged actors', async actor => {
    identity.read.mockResolvedValue(actor)

    for (const operation of ['preview', 'apply', 'rollback'] as const) {
      await expect(authorizeServiceEnablement('admin', operation)).rejects.toMatchObject({ statusCode: 403 })
    }
  })
})
