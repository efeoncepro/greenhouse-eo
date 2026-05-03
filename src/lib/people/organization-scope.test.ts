import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

const {
  resolvePeopleOrganizationScope,
  memberHasOrganizationScope,
  assertMemberInPeopleOrganizationScope
} = await import('./organization-scope')

describe('resolvePeopleOrganizationScope', () => {
  it('uses the tenant organization for client users when no override is requested', () => {
    const scope = resolvePeopleOrganizationScope(
      new Request('http://localhost/api/people'),
      {
        tenantType: 'client',
        organizationId: 'org-client'
      } as never
    )

    expect(scope).toBe('org-client')
  })

  it('rejects a foreign organization override for client tenants', () => {
    expect(() =>
      resolvePeopleOrganizationScope(
        new Request('http://localhost/api/people?organizationId=org-other'),
        {
          tenantType: 'client',
          organizationId: 'org-client'
        } as never
      )
    ).toThrow('Forbidden')
  })

  it('lets internal tenants request an explicit organization scope', () => {
    const scope = resolvePeopleOrganizationScope(
      new Request('http://localhost/api/people?organizationId=org-sky'),
      {
        tenantType: 'efeonce_internal',
        organizationId: 'org-efeonce'
      } as never
    )

    expect(scope).toBe('org-sky')
  })
})

describe('organization member access', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('checks membership through person_memberships', async () => {
    mockQuery.mockResolvedValueOnce([{ '?column?': 1 }])

    const allowed = await memberHasOrganizationScope('member-1', 'org-1')

    expect(allowed).toBe(true)
    expect(String(mockQuery.mock.calls[0][0])).toContain('FROM greenhouse_core.members m')
  })

  it('throws a not found error when the member is outside the tenant organization', async () => {
    mockQuery.mockResolvedValueOnce([])

    await expect(assertMemberInPeopleOrganizationScope('member-2', 'org-2')).rejects.toMatchObject({
      message: 'Person not found.',
      statusCode: 404
    })
  })
})
