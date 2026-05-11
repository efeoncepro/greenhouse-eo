import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const clearMock = vi.fn<(subjectId: string) => number>()

vi.mock('@/lib/organization-workspace/cache', () => ({
  clearProjectionCacheForSubject: (id: string) => clearMock(id)
}))

const { organizationWorkspaceCacheInvalidationProjection } = await import(
  './organization-workspace-cache-invalidation'
)

const projection = organizationWorkspaceCacheInvalidationProjection

describe('TASK-611 Slice 6 — organization workspace cache invalidation projection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('declares the 5 canonical trigger events from V1.1 Delta', () => {
    expect(projection.triggerEvents).toEqual(
      expect.arrayContaining([
        'access.entitlement_role_default_changed',
        'access.entitlement_user_override_changed',
        'role.assigned',
        'role.revoked',
        'user.deactivated'
      ])
    )
    expect(projection.triggerEvents).toHaveLength(5)
    expect(projection.domain).toBe('organization')
    expect(projection.maxRetries).toBe(1)
  })

  it('extracts subject from userId payload key', () => {
    const scope = projection.extractScope({ userId: 'user-42', _eventType: 'role.assigned' })

    expect(scope).toEqual({ entityType: 'workspace_projection_cache', entityId: 'user-42' })
  })

  it('falls back to subjectUserId / targetUserId / user_id / subject_id payload keys', () => {
    expect(projection.extractScope({ subjectUserId: 'user-a' })).toEqual({
      entityType: 'workspace_projection_cache',
      entityId: 'user-a'
    })

    expect(projection.extractScope({ targetUserId: 'user-b' })).toEqual({
      entityType: 'workspace_projection_cache',
      entityId: 'user-b'
    })

    expect(projection.extractScope({ user_id: 'user-c' })).toEqual({
      entityType: 'workspace_projection_cache',
      entityId: 'user-c'
    })

    expect(projection.extractScope({ subject_id: 'user-d' })).toEqual({
      entityType: 'workspace_projection_cache',
      entityId: 'user-d'
    })
  })

  it('returns null scope when payload has no recognizable subject id', () => {
    expect(projection.extractScope({ event_type: 'foo', amount: 10 })).toBeNull()
    expect(projection.extractScope({ userId: '   ' })).toBeNull()
    expect(projection.extractScope({})).toBeNull()
  })

  it('extracts every affected user id when role-default governance events fan out', () => {
    expect(
      projection.extractScopes?.({
        affectedUserIds: ['user-a', ' user-b ', 'user-a', '', 123]
      })
    ).toEqual([
      { entityType: 'workspace_projection_cache', entityId: 'user-a' },
      { entityType: 'workspace_projection_cache', entityId: 'user-b' }
    ])
  })

  it('refresh calls clearProjectionCacheForSubject with the scoped id and returns a summary string', async () => {
    clearMock.mockReturnValueOnce(3)

    const result = await projection.refresh(
      { entityType: 'workspace_projection_cache', entityId: 'user-x' },
      { userId: 'user-x' }
    )

    expect(clearMock).toHaveBeenCalledWith('user-x')
    expect(result).toBe('cleared 3 workspace projection cache entries for subject user-x')
  })

  it('refresh is idempotent — second call returns 0 cleared without error', async () => {
    clearMock.mockReturnValueOnce(2).mockReturnValueOnce(0)

    const first = await projection.refresh(
      { entityType: 'workspace_projection_cache', entityId: 'user-y' },
      {}
    )

    const second = await projection.refresh(
      { entityType: 'workspace_projection_cache', entityId: 'user-y' },
      {}
    )

    expect(first).toContain('cleared 2')
    expect(second).toContain('cleared 0')
  })
})
