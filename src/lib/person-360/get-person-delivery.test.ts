import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockResolvePersonIdentifier = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/person-360/resolve-eo-id', () => ({
  resolvePersonIdentifier: (...args: unknown[]) => mockResolvePersonIdentifier(...args)
}))

import { getPersonDeliveryContext } from '@/lib/person-360/get-person-delivery'

describe('getPersonDeliveryContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies organization scoping through organization client ids when requested', async () => {
    mockResolvePersonIdentifier.mockResolvedValue({
      memberId: 'member-1',
      identityProfileId: 'ip-1'
    })

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { client_id: 'client-1' },
        { client_id: 'client-2' }
      ])
      .mockResolvedValueOnce([
        {
          identity_profile_id: 'ip-1',
          eo_id: 'eo-1',
          member_id: 'member-1',
          resolved_display_name: 'Ada Lovelace',
          member_email: 'ada@efeonce.org',
          department_name: 'Design',
          owned_projects_count: '2',
          active_owned_projects: '1',
          total_assigned_tasks: '8',
          active_tasks: '3',
          completed_tasks_30d: '5',
          overdue_tasks: '1',
          avg_rpa_30d: '84.5',
          on_time_pct_30d: '91.2',
          owned_companies_count: '1',
          owned_deals_count: '2',
          open_deals_amount: '1500000'
        }
      ])

    const result = await getPersonDeliveryContext('eo-1', { organizationId: 'org-sky' })

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
    expect(String(mockRunGreenhousePostgresQuery.mock.calls[1]?.[0])).toContain('client_id = ANY($2::text[])')
    expect(result).toMatchObject({
      memberId: 'member-1',
      projects: { ownedCount: 2, activeOwnedCount: 1 },
      tasks: { totalAssigned: 8, active: 3, completed30d: 5, overdue: 1 },
      crm: { ownedCompanies: 1, ownedDeals: 2, openDealsAmount: 1500000 }
    })
  })
})
