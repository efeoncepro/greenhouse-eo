import { beforeEach, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({ query }))
import { resolveEnrolledInternalIdentity, resolveInternalAuthority, resolveInternalSessionIdentity } from './store'

const input = {
  environmentId: 'efeonce-auth',
  tenantId: '11111111-1111-1111-1111-111111111111',
  objectId: '22222222-2222-2222-2222-222222222222',
  issuer: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0'
}

const row = {
  subject: 'opaque',
  profile_id: 'p',
  native_link_id: 'n',
  upstream_link_id: 'u',
  binding_id: 'b',
  organization_id: 'o',
  environment_id: 'efeonce-auth',
  grants_version: '2',
  capabilities: ['globe.fleet.read']
}

beforeEach(() => vi.clearAllMocks())
it('refuses tenant-independent identity before reading canonical rows', async () => {
  expect(
    await resolveEnrolledInternalIdentity({ ...input, issuer: 'https://login.microsoftonline.com/common/v2.0' })
  ).toBeNull()
  expect(query).not.toHaveBeenCalled()
})
it('ambiguous canonical identity fails closed instead of selecting the first match', async () => {
  query.mockResolvedValue([row, { ...row, profile_id: 'other' }])
  expect(await resolveEnrolledInternalIdentity(input)).toBeNull()
})
it('reads authority every time, so revocation is not hidden by a positive cache', async () => {
  query.mockResolvedValueOnce([row]).mockResolvedValueOnce([])
  const request = { environmentId: 'efeonce-auth', subject: 'opaque', profileId: 'p', bindingId: 'b' }

  expect(await resolveInternalAuthority(request)).toMatchObject({
    grantsVersion: 2,
    capabilities: ['globe.fleet.read']
  })
  expect(await resolveInternalAuthority(request)).toBeNull()
  expect(query).toHaveBeenCalledTimes(2)
})
it('session selection exposes only the server-owned matched binding', async () => {
  query.mockResolvedValue([row])
  expect(
    await resolveInternalSessionIdentity({
      environmentId: 'efeonce-auth',
      subject: 'opaque',
      profileId: 'p',
      upstreamLinkId: 'u'
    })
  ).toMatchObject({ bindingId: 'b', nativeLinkId: 'n' })
})
