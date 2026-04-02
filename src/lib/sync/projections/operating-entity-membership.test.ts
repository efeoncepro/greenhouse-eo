import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSyncOperatingEntityMembershipForMember = vi.fn()

vi.mock('@/lib/account-360/operating-entity-membership', () => ({
  syncOperatingEntityMembershipForMember: (...args: unknown[]) =>
    mockSyncOperatingEntityMembershipForMember(...args)
}))

import { operatingEntityMembershipProjection } from './operating-entity-membership'

describe('operatingEntityMembershipProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts member scope from canonical member events', () => {
    expect(operatingEntityMembershipProjection.extractScope({ memberId: 'member-1' }))
      .toEqual({ entityType: 'member', entityId: 'member-1' })

    expect(operatingEntityMembershipProjection.extractScope({ member_id: 'member-2' }))
      .toEqual({ entityType: 'member', entityId: 'member-2' })

    expect(operatingEntityMembershipProjection.extractScope({})).toBeNull()
  })

  it('delegates the refresh to the operating entity membership sync helper', async () => {
    mockSyncOperatingEntityMembershipForMember.mockResolvedValue({
      action: 'created',
      membershipId: 'mbr-operating-1'
    })

    await expect(
      operatingEntityMembershipProjection.refresh(
        { entityType: 'member', entityId: 'member-1' },
        { memberId: 'member-1' }
      )
    ).resolves.toContain('created operating entity membership mbr-operating-1')
  })
})
