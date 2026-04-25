import { describe, expect, it, vi } from 'vitest'

const mockMaterializePartyLifecycleSnapshot = vi.fn()

vi.mock('@/lib/commercial/party', () => ({
  materializePartyLifecycleSnapshot: (...args: unknown[]) =>
    mockMaterializePartyLifecycleSnapshot(...args)
}))

import { partyLifecycleSnapshotProjection } from './party-lifecycle-snapshot'

describe('partyLifecycleSnapshotProjection', () => {
  it('extracts organization scope from common payload keys', () => {
    expect(
      partyLifecycleSnapshotProjection.extractScope({
        organizationId: 'org-1'
      })
    ).toEqual({ entityType: 'organization', entityId: 'org-1' })

    expect(
      partyLifecycleSnapshotProjection.extractScope({
        organization_id: 'org-2'
      })
    ).toEqual({ entityType: 'organization', entityId: 'org-2' })
  })

  it('materializes the snapshot and returns a concise trace', async () => {
    mockMaterializePartyLifecycleSnapshot.mockResolvedValue({
      organizationId: 'org-1',
      lifecycleStage: 'opportunity'
    })

    await expect(
      partyLifecycleSnapshotProjection.refresh(
        { entityType: 'organization', entityId: 'org-1' },
        {}
      )
    ).resolves.toBe('party_lifecycle_snapshot org-1: opportunity')
  })
})
