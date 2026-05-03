import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockIsGreenhousePostgresConfigured = vi.fn(() => true)

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  isGreenhousePostgresConfigured: () => mockIsGreenhousePostgresConfigured(),
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

describe('campaign-store readiness', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRunGreenhousePostgresQuery.mockReset()
    mockIsGreenhousePostgresConfigured.mockReset()
    mockIsGreenhousePostgresConfigured.mockReturnValue(true)
  })

  it('fails fast when the canonical campaign objects are not provisioned', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        spaces_regclass: 'greenhouse_core.spaces',
        campaigns_regclass: null,
        campaign_project_links_regclass: null,
        campaigns_eo_id_seq_regclass: null,
        has_budget_clp: false,
        has_currency: false
      }
    ])

    const { assertCampaignSchemaReady } = await import('./campaign-store')

    await expect(assertCampaignSchemaReady()).rejects.toThrow(
      /Run pnpm setup:postgres:campaigns/
    )
  })

  it('reads campaigns only after the schema readiness check succeeds', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          spaces_regclass: 'greenhouse_core.spaces',
          campaigns_regclass: 'greenhouse_core.campaigns',
          campaign_project_links_regclass: 'greenhouse_core.campaign_project_links',
          campaigns_eo_id_seq_regclass: 'greenhouse_core.campaigns_eo_id_seq',
          has_budget_clp: true,
          has_currency: true
        }
      ])
      .mockResolvedValueOnce([
        {
          campaign_id: 'cmp-1',
          eo_id: 'EO-CMP-0001',
          slug: 'hot-sale-0001',
          space_id: 'spc-1',
          display_name: 'Hot Sale',
          description: null,
          campaign_type: 'campaign',
          status: 'active',
          planned_start_date: '2026-03-01',
          planned_end_date: '2026-03-31',
          actual_start_date: null,
          actual_end_date: null,
          planned_launch_date: null,
          actual_launch_date: null,
          owner_user_id: null,
          created_by_user_id: null,
          tags: [],
          channels: [],
          notes: null,
          budget_clp: '1200000',
          currency: 'CLP',
          project_count: 2,
          created_at: '2026-03-25T00:00:00.000Z',
          updated_at: '2026-03-25T00:00:00.000Z'
        }
      ])

    const { listAllCampaigns } = await import('./campaign-store')
    const campaigns = await listAllCampaigns({ status: 'active' })

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
    expect(String(mockRunGreenhousePostgresQuery.mock.calls[0]?.[0])).toContain(
      "to_regclass('greenhouse_core.campaigns')"
    )
    expect(String(mockRunGreenhousePostgresQuery.mock.calls[1]?.[0])).toContain(
      'FROM greenhouse_core.campaigns c'
    )
    expect(campaigns).toEqual([
      expect.objectContaining({
        campaignId: 'cmp-1',
        displayName: 'Hot Sale',
        budgetClp: 1200000,
        projectCount: 2
      })
    ])
  })
})
