import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

// Los lanes son consumers finos del primitive canónico (un primitive, muchos consumers).
const readMemberIcoProfileForSubject = vi.fn()

vi.mock('@/lib/people/person-activity-access', () => ({
  readMemberIcoProfileForSubject: (...args: unknown[]) => readMemberIcoProfileForSubject(...args)
}))

import { getEcosystemMemberPerformancePayload } from './ecosystem-people'
import { getAppMemberPerformancePayload } from './app-people'

const ecosystemContext = (greenhouseScopeType: string): ApiPlatformRequestContext =>
  ({
    requestId: 'req-1',
    routeKey: 'platform.ecosystem.people.performance',
    version: 'v1',
    consumer: { publicId: 'consumer-1' },
    binding: { greenhouseScopeType, organizationId: null, clientId: null, spaceId: null },
    rateLimit: { limitPerMinute: 60, limitPerHour: 1000 }
  }) as unknown as ApiPlatformRequestContext

const appContext = (tenant: Partial<TenantContext>): AppPlatformRequestContext =>
  ({
    requestId: 'req-2',
    routeKey: 'platform.app.people.performance',
    version: 'v1',
    tenant: tenant as TenantContext,
    appSessionId: null,
    rateLimit: { limitPerMinute: 120, limitPerHour: 5000 }
  }) as AppPlatformRequestContext

const req = (person?: string) =>
  new Request(`https://x/api?${person == null ? '' : `person=${encodeURIComponent(person)}`}`)

const okProfile = {
  status: 'ok',
  memberId: 'member-9',
  displayName: 'Daniela Ferreira',
  profile: { memberId: 'member-9', hasData: true, current: { otdPct: 88 }, trend: [], health: 'green' }
}

beforeEach(() => {
  readMemberIcoProfileForSubject.mockReset()
})

describe('ecosystem-people (MCP lane)', () => {
  it('rechaza bindings no-internal con 403 (sin tocar el primitive)', async () => {
    await expect(
      getEcosystemMemberPerformancePayload({ context: ecosystemContext('client'), request: req('Daniela') })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'scope_not_allowed' })

    expect(readMemberIcoProfileForSubject).not.toHaveBeenCalled()
  })

  it('binding internal → subject people_viewer de menor privilegio + delega', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue(okProfile)

    const result = await getEcosystemMemberPerformancePayload({
      context: ecosystemContext('internal'),
      request: req('Daniela Ferreira')
    })

    expect(result.data.memberId).toBe('member-9')
    expect(readMemberIcoProfileForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantType: 'efeonce_internal',
        roleCodes: ['people_viewer'],
        routeGroups: ['people'],
        memberId: null
      }),
      'Daniela Ferreira'
    )
  })

  it('falta person → 400', async () => {
    await expect(
      getEcosystemMemberPerformancePayload({ context: ecosystemContext('internal'), request: req() })
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('app-people (app lane)', () => {
  it('mapea el tenant 1:1 al subject y delega', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue(okProfile)

    const data = await getAppMemberPerformancePayload({
      context: appContext({
        userId: 'u-1',
        tenantType: 'efeonce_internal',
        memberId: 'm-sup',
        roleCodes: ['collaborator'],
        routeGroups: ['my'],
        organizationId: undefined
      }),
      request: req('Daniela')
    })

    expect(data.displayName).toBe('Daniela Ferreira')
    expect(readMemberIcoProfileForSubject).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u-1', memberId: 'm-sup', roleCodes: ['collaborator'], organizationId: null }),
      'Daniela'
    )
  })

  it('forbidden → 403', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue({ status: 'forbidden' })

    await expect(
      getAppMemberPerformancePayload({ context: appContext({ userId: 'u', tenantType: 'efeonce_internal', roleCodes: [], routeGroups: [] }), request: req('X') })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'forbidden' })
  })

  it('not_found → 404 (uniforme)', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue({ status: 'not_found' })

    await expect(
      getAppMemberPerformancePayload({ context: appContext({ userId: 'u', tenantType: 'efeonce_internal', roleCodes: ['efeonce_admin'], routeGroups: ['internal'] }), request: req('X') })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'not_found' })
  })

  it('ambiguous → 409 con candidatos', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue({
      status: 'ambiguous',
      candidates: [{ memberId: 'm-1', displayName: 'Daniela Ferreira' }, { memberId: 'm-2', displayName: 'Daniela Soto' }]
    })

    await expect(
      getAppMemberPerformancePayload({ context: appContext({ userId: 'u', tenantType: 'efeonce_internal', roleCodes: ['efeonce_admin'], routeGroups: ['internal'] }), request: req('Daniela') })
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'ambiguous_reference' })
  })
})
