import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

const { resolveSubjectOrganizationRelation } = await import('./relationship-resolver')

type ResolverResult = Awaited<ReturnType<typeof resolveSubjectOrganizationRelation>>

const buildRow = (overrides: Record<string, unknown> = {}) => ({
  is_admin: false,
  assignment_id: null,
  member_id: null,
  client_id_assignment: null,
  role_title_override: null,
  start_date: null,
  end_date: null,
  client_id_portal: null,
  ...overrides
})

describe('TASK-611 — resolveSubjectOrganizationRelation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns no_relation when subjectUserId is empty (defensive guard, no DB roundtrip)', async () => {
    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: '',
      subjectTenantType: 'efeonce_internal',
      organizationId: 'org-acme'
    })

    expect(result.kind).toBe('no_relation')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns no_relation when organizationId is empty (defensive guard)', async () => {
    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-1',
      subjectTenantType: 'efeonce_internal',
      organizationId: ''
    })

    expect(result.kind).toBe('no_relation')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('resolves internal_admin first when user has efeonce_admin role (priority over assignment)', async () => {
    mockQuery.mockResolvedValueOnce([
      buildRow({
        is_admin: true,
        assignment_id: 'assignment-1',
        member_id: 'member-1',
        client_id_assignment: 'client-acme'
      })
    ])

    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-admin',
      subjectTenantType: 'efeonce_internal',
      organizationId: 'org-acme'
    })

    expect(result.kind).toBe('internal_admin')
  })

  it('resolves assigned_member with full assignment metadata when matched', async () => {
    mockQuery.mockResolvedValueOnce([
      buildRow({
        assignment_id: 'assignment-7',
        member_id: 'member-42',
        client_id_assignment: 'client-acme',
        role_title_override: 'Account Lead',
        start_date: new Date('2026-01-01T00:00:00Z'),
        end_date: null
      })
    ])

    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-7',
      subjectTenantType: 'efeonce_internal',
      organizationId: 'org-acme'
    })

    if (result.kind !== 'assigned_member') throw new Error(`expected assigned_member, got ${result.kind}`)

    expect(result.memberId).toBe('member-42')
    expect(result.clientId).toBe('client-acme')
    expect(result.assignmentId).toBe('assignment-7')
    expect(result.roleTitleOverride).toBe('Account Lead')
    expect(result.activeFrom).toBeInstanceOf(Date)
    expect(result.activeUntil).toBeNull()
  })

  it('resolves client_portal_user only for tenant=client subjects (cross-tenant isolation)', async () => {
    mockQuery.mockResolvedValueOnce([buildRow({ client_id_portal: 'client-globe-sky' })])

    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-sky-rep',
      subjectTenantType: 'client',
      organizationId: 'org-sky'
    })

    if (result.kind !== 'client_portal_user') throw new Error(`expected client_portal_user, got ${result.kind}`)
    expect(result.clientId).toBe('client-globe-sky')
  })

  it('does NOT promote internal subject to client_portal_user even if SQL accidentally returned a client_id_portal', async () => {
    // defense-in-depth: even if DB CTE somehow returned a portal row, internal tenant cannot be client_portal_user.
    mockQuery.mockResolvedValueOnce([buildRow({ client_id_portal: 'client-impossible-leak' })])

    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-internal',
      subjectTenantType: 'efeonce_internal',
      organizationId: 'org-acme'
    })

    expect(result.kind).toBe('unrelated_internal')
  })

  it('returns unrelated_internal when internal subject has no admin/assignment match', async () => {
    mockQuery.mockResolvedValueOnce([buildRow()])

    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-internal-no-link',
      subjectTenantType: 'efeonce_internal',
      organizationId: 'org-acme'
    })

    expect(result.kind).toBe('unrelated_internal')
  })

  it('returns no_relation when client subject has no client_users row mapping to this org', async () => {
    mockQuery.mockResolvedValueOnce([buildRow()])

    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-client-foreign',
      subjectTenantType: 'client',
      organizationId: 'org-other'
    })

    expect(result.kind).toBe('no_relation')
  })

  it('returns no_relation (or unrelated_internal) when DB query returns zero rows', async () => {
    mockQuery.mockResolvedValueOnce([])

    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-1',
      subjectTenantType: 'client',
      organizationId: 'org-1'
    })

    expect(result.kind).toBe('no_relation')
  })

  it('returns unrelated_internal when DB query returns zero rows and subject is internal', async () => {
    mockQuery.mockResolvedValueOnce([])

    const result = await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-1',
      subjectTenantType: 'efeonce_internal',
      organizationId: 'org-1'
    })

    expect(result.kind).toBe('unrelated_internal')
  })

  it('rethrows DB errors after captureWithDomain identity', async () => {
    const dbError = new Error('connection refused')

    mockQuery.mockRejectedValueOnce(dbError)

    await expect(
      resolveSubjectOrganizationRelation({
        subjectUserId: 'user-1',
        subjectTenantType: 'efeonce_internal',
        organizationId: 'org-1'
      })
    ).rejects.toThrow('connection refused')

    expect(captureMock).toHaveBeenCalledWith(
      dbError,
      'identity',
      expect.objectContaining({
        tags: { source: 'workspace_projection_relationship_resolver' }
      })
    )
  })

  it('serializes start_date/end_date strings into Date instances', async () => {
    mockQuery.mockResolvedValueOnce([
      buildRow({
        assignment_id: 'a-1',
        member_id: 'm-1',
        client_id_assignment: 'c-1',
        start_date: '2025-12-31T00:00:00Z',
        end_date: '2026-12-31T00:00:00Z'
      })
    ])

    const result = (await resolveSubjectOrganizationRelation({
      subjectUserId: 'user-1',
      subjectTenantType: 'efeonce_internal',
      organizationId: 'org-1'
    })) as Extract<ResolverResult, { kind: 'assigned_member' }>

    expect(result.activeFrom).toBeInstanceOf(Date)
    expect(result.activeUntil).toBeInstanceOf(Date)
    expect(result.activeFrom?.toISOString()).toBe('2025-12-31T00:00:00.000Z')
  })
})
