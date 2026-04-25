import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockPromoteParty = vi.fn()
const mockMaterializePartyLifecycleSnapshot = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('../commands/promote-party', () => ({
  promoteParty: (...args: unknown[]) => mockPromoteParty(...args)
}))

vi.mock('../party-lifecycle-snapshot-store', () => ({
  materializePartyLifecycleSnapshot: (...args: unknown[]) =>
    mockMaterializePartyLifecycleSnapshot(...args)
}))

import { runPartyLifecycleInactivitySweep } from '../party-lifecycle-sweep'

describe('runPartyLifecycleInactivitySweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery.mockResolvedValue([
      {
        organization_id: 'org-1',
        commercial_party_id: 'party-1',
        organization_name: 'Acme',
        lifecycle_stage_since: '2026-01-01T00:00:00.000Z',
        last_quote_at: '2025-08-01T00:00:00.000Z',
        last_contract_at: '2025-07-01T00:00:00.000Z'
      }
    ])
  })

  it('returns candidates without mutating state in dry-run mode', async () => {
    const result = await runPartyLifecycleInactivitySweep({ dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.considered).toBe(1)
    expect(result.transitioned).toBe(0)
    expect(mockPromoteParty).not.toHaveBeenCalled()
  })

  it('transitions candidates when dryRun=false', async () => {
    mockPromoteParty.mockResolvedValue({
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      fromStage: 'active_client',
      toStage: 'inactive',
      transitionedAt: '2026-04-21T10:00:00.000Z',
      historyId: 'hist-1'
    })

    const result = await runPartyLifecycleInactivitySweep({ dryRun: false })

    expect(mockPromoteParty).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        toStage: 'inactive',
        source: 'inactivity_sweep'
      })
    )
    expect(mockMaterializePartyLifecycleSnapshot).toHaveBeenCalledWith('org-1')
    expect(result.transitioned).toBe(1)
  })
})
