import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockGenerateMembershipId = vi.fn(() => 'mbr-test-001')

const mockNextPublicId = vi.fn((_prefix?: string) => {
  void _prefix

  return Promise.resolve('EO-MBR-0042')
})

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/account-360/id-generation', () => ({
  generateMembershipId: () => mockGenerateMembershipId(),
  nextPublicId: (prefix: string) => mockNextPublicId(prefix)
}))

import { assignmentMembershipSyncProjection } from './assignment-membership-sync'
import { ensureProjectionsRegistered } from './index'
import { getRegisteredProjections } from '../projection-registry'

describe('assignmentMembershipSyncProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a team_member membership when assignment is created', async () => {
    // member lookup
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ identity_profile_id: 'profile-melkin', role_title: 'Developer' }])

      // space bridge
      .mockResolvedValueOnce([{ space_id: 'space-sky', organization_id: 'org-sky' }])

      // existing membership check
      .mockResolvedValueOnce([])

      // INSERT membership
      .mockResolvedValueOnce([])

    const result = await assignmentMembershipSyncProjection.refresh(
      { entityType: 'member', entityId: 'member-melkin' },
      { memberId: 'member-melkin', clientId: 'client-sky' }
    )

    expect(result).toContain('synced membership')
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(4)
    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent.mock.calls[0][0]).toMatchObject({
      eventType: 'membership.created',
      payload: expect.objectContaining({
        profileId: 'profile-melkin',
        organizationId: 'org-sky',
        source: 'assignment_sync'
      })
    })
  })

  it('skips if membership already exists and is active', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ identity_profile_id: 'profile-melkin', role_title: 'Developer' }])
      .mockResolvedValueOnce([{ space_id: 'space-sky', organization_id: 'org-sky' }])
      .mockResolvedValueOnce([{ membership_id: 'mbr-existing', active: true }])

    const result = await assignmentMembershipSyncProjection.refresh(
      { entityType: 'member', entityId: 'member-melkin' },
      { memberId: 'member-melkin', clientId: 'client-sky' }
    )

    expect(result).toContain('synced membership mbr-existing')
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(3)
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })

  it('returns null when no space bridge exists for the client', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ identity_profile_id: 'profile-melkin', role_title: 'Developer' }])
      .mockResolvedValueOnce([]) // no space

    const result = await assignmentMembershipSyncProjection.refresh(
      { entityType: 'member', entityId: 'member-melkin' },
      { memberId: 'member-melkin', clientId: 'client-no-org' }
    )

    expect(result).toContain('no org bridge')
  })

  it('deactivates membership on assignment.removed when no other assignments remain', async () => {
    mockRunGreenhousePostgresQuery

      // member lookup
      .mockResolvedValueOnce([{ identity_profile_id: 'profile-melkin' }])

      // space bridge
      .mockResolvedValueOnce([{ space_id: 'space-sky', organization_id: 'org-sky' }])

      // other assignments count
      .mockResolvedValueOnce([{ cnt: 0 }])

      // deactivate returns membership_id
      .mockResolvedValueOnce([{ membership_id: 'mbr-existing' }])

    const result = await assignmentMembershipSyncProjection.refresh(
      { entityType: 'member', entityId: 'member-melkin' },
      { memberId: 'member-melkin', clientId: 'client-sky', eventType: 'assignment.removed' }
    )

    expect(result).toContain('deactivated membership mbr-existing')
  })

  it('keeps membership on assignment.removed when other assignments to same org exist', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ identity_profile_id: 'profile-melkin' }])
      .mockResolvedValueOnce([{ space_id: 'space-sky', organization_id: 'org-sky' }])
      .mockResolvedValueOnce([{ cnt: 1 }]) // still has another assignment

    const result = await assignmentMembershipSyncProjection.refresh(
      { entityType: 'member', entityId: 'member-melkin' },
      { memberId: 'member-melkin', clientId: 'client-sky', eventType: 'assignment.removed' }
    )

    expect(result).toContain('no membership change')
  })

  it('extracts member scope from payload', () => {
    expect(assignmentMembershipSyncProjection.extractScope({ memberId: 'member-1' }))
      .toEqual({ entityType: 'member', entityId: 'member-1' })

    expect(assignmentMembershipSyncProjection.extractScope({})).toBeNull()
  })

  it('is registered in the projection registry', () => {
    ensureProjectionsRegistered()

    expect(getRegisteredProjections().some(p => p.name === 'assignment_membership_sync')).toBe(true)
  })

  it('triggers on assignment events', () => {
    expect(assignmentMembershipSyncProjection.triggerEvents).toContain('assignment.created')
    expect(assignmentMembershipSyncProjection.triggerEvents).toContain('assignment.updated')
    expect(assignmentMembershipSyncProjection.triggerEvents).toContain('assignment.removed')
  })
})
