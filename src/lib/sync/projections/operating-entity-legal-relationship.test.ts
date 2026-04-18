import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSyncOperatingEntityEmployeeLegalRelationshipForMember = vi.fn()

vi.mock('@/lib/account-360/person-legal-entity-relationships', () => ({
  syncOperatingEntityEmployeeLegalRelationshipForMember: (...args: unknown[]) =>
    mockSyncOperatingEntityEmployeeLegalRelationshipForMember(...args)
}))

import { operatingEntityLegalRelationshipProjection } from './operating-entity-legal-relationship'

describe('operatingEntityLegalRelationshipProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts member scope from canonical member events', () => {
    expect(operatingEntityLegalRelationshipProjection.extractScope({ memberId: 'member-1' }))
      .toEqual({ entityType: 'member', entityId: 'member-1' })

    expect(operatingEntityLegalRelationshipProjection.extractScope({ member_id: 'member-2' }))
      .toEqual({ entityType: 'member', entityId: 'member-2' })

    expect(operatingEntityLegalRelationshipProjection.extractScope({})).toBeNull()
  })

  it('delegates the refresh to the operating entity legal relationship sync helper', async () => {
    mockSyncOperatingEntityEmployeeLegalRelationshipForMember.mockResolvedValue({
      action: 'created',
      relationshipId: 'pler-operating-1'
    })

    await expect(
      operatingEntityLegalRelationshipProjection.refresh(
        { entityType: 'member', entityId: 'member-1' },
        { memberId: 'member-1' }
      )
    ).resolves.toContain('created operating entity legal relationship pler-operating-1')
  })
})
