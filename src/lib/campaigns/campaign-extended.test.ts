import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockAssertCampaignSchemaReady = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: vi.fn(),
  getBigQueryProjectId: vi.fn()
}))

vi.mock('@/lib/campaigns/campaign-store', () => ({
  assertCampaignSchemaReady: (...args: unknown[]) => mockAssertCampaignSchemaReady(...args)
}))

import { getCampaignFinancials } from '@/lib/campaigns/campaign-extended'

describe('getCampaignFinancials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertCampaignSchemaReady.mockResolvedValue(undefined)
  })

  it('resolves campaign revenue through canonical client_id when income only has client_profile_id', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ budget_clp: '1000' }])
      .mockResolvedValueOnce([{ project_source_id: 'proj-1', space_id: 'space-1' }])
      .mockResolvedValueOnce([{ client_id: 'client-1' }])
      .mockResolvedValueOnce([{ total: '500' }])
      .mockResolvedValueOnce([{ total: '100' }])
      .mockResolvedValueOnce([{ direct_costs_clp: '50' }])

    const result = await getCampaignFinancials('camp-1')

    expect(result.revenueClp).toBe(500)

    const revenueQuery = mockRunGreenhousePostgresQuery.mock.calls[3]?.[0] as string

    expect(revenueQuery).toContain('LEFT JOIN greenhouse_finance.client_profiles cp_income')
    expect(revenueQuery).toContain('COALESCE(i.client_id, cp_income.client_id) = $1')
    expect(revenueQuery).not.toContain('COALESCE(client_id, client_profile_id) = $1')
  })
})
