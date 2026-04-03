import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBigQueryQuery = vi.fn()

vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'test-project',
  getBigQueryClient: () => ({
    query: (...args: unknown[]) => mockBigQueryQuery(...args)
  })
}))

import { getAgencyPulseKpis, getAgencySpacesHealth } from '@/lib/agency/agency-queries'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('agency-queries', () => {
  it('reads Agency > Spaces RpA and OTD live from ICO enriched tasks for the current month', async () => {
    mockBigQueryQuery.mockResolvedValueOnce([[
      {
        client_id: 'client-1',
        client_name: 'Sky Airline',
        business_lines: ['reach'],
        rpa_avg: 1.4,
        otd_pct: 92,
        assets_activos: 5,
        feedback_pendiente: 2,
        project_count: 3,
        notion_project_count: 3,
        scoped_project_count: 2,
        assigned_members: 4,
        allocated_fte: 2.5,
        total_users: 7,
        active_users: 6
      }
    ]])

    const result = await getAgencySpacesHealth()
    const query = String(mockBigQueryQuery.mock.calls[0]?.[0]?.query ?? '')
    const params = mockBigQueryQuery.mock.calls[0]?.[0]?.params ?? {}

    expect(query).toContain('ico_engine.v_tasks_enriched')
    expect(query).not.toContain('AVG(SAFE_CAST(t.rpa AS FLOAT64))')
    expect(query).toContain('@periodYear')
    expect(query).toContain('@periodMonth')
    expect(params).toHaveProperty('periodYear')
    expect(params).toHaveProperty('periodMonth')
    expect(result).toEqual([
      expect.objectContaining({
        clientId: 'client-1',
        clientName: 'Sky Airline',
        rpaAvg: 1.4,
        otdPct: 92,
        assetsActivos: 5,
        feedbackPendiente: 2
      })
    ])
  })

  it('reads Agency pulse global RpA and OTD live from ICO enriched tasks for the current month', async () => {
    mockBigQueryQuery.mockResolvedValueOnce([[
      {
        rpa_global: 1.8,
        assets_activos: 12,
        feedback_pendiente: 4,
        last_synced_at: '2026-03-25T10:00:00.000Z',
        total_projects: 8,
        otd_pct_global: 87,
        total_spaces: 5
      }
    ]])

    const result = await getAgencyPulseKpis()
    const query = String(mockBigQueryQuery.mock.calls[0]?.[0]?.query ?? '')
    const params = mockBigQueryQuery.mock.calls[0]?.[0]?.params ?? {}

    expect(query).toContain('ico_engine.v_tasks_enriched')
    expect(query).not.toContain('AVG(SAFE_CAST(t.rpa AS FLOAT64))')
    expect(query).toContain('@periodYear')
    expect(query).toContain('@periodMonth')
    expect(params).toHaveProperty('periodYear')
    expect(params).toHaveProperty('periodMonth')
    expect(result).toEqual({
      rpaGlobal: 1.8,
      assetsActivos: 12,
      otdPctGlobal: 87,
      feedbackPendiente: 4,
      totalSpaces: 5,
      totalProjects: 8,
      lastSyncedAt: '2026-03-25T10:00:00.000Z'
    })
  })
})
