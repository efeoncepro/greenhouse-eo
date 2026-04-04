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
        rpa_eligible_task_count: 14,
        rpa_missing_task_count: 1,
        rpa_non_positive_task_count: 0,
        total_tasks: 18,
        completed_tasks: 14,
        active_tasks: 4,
        on_time_count: 11,
        late_drop_count: 1,
        overdue_count: 0,
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
        rpaMetric: expect.objectContaining({
          metricId: 'rpa',
          benchmarkType: 'adapted',
          qualityGateStatus: 'healthy',
          confidenceLevel: 'high'
        }),
        otdPct: 92,
        otdMetric: expect.objectContaining({
          metricId: 'otd_pct',
          benchmarkType: 'external',
          qualityGateStatus: 'healthy',
          confidenceLevel: 'high'
        }),
        assetsActivos: 5,
        feedbackPendiente: 2
      })
    ])
  })

  it('reads Agency pulse global RpA and OTD live from ICO enriched tasks for the current month', async () => {
    mockBigQueryQuery.mockResolvedValueOnce([[
      {
        rpa_global: 1.8,
        rpa_eligible_task_count: 18,
        rpa_missing_task_count: 2,
        rpa_non_positive_task_count: 0,
        assets_activos: 12,
        feedback_pendiente: 4,
        last_synced_at: '2026-03-25T10:00:00.000Z',
        total_projects: 8,
        otd_pct_global: 87,
        total_spaces: 5,
        total_tasks: 24,
        completed_tasks: 18,
        active_tasks: 6,
        on_time_count: 16,
        late_drop_count: 2,
        overdue_count: 0
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
      rpaMetric: expect.objectContaining({
        metricId: 'rpa',
        benchmarkType: 'adapted',
        qualityGateStatus: 'healthy',
        confidenceLevel: 'high'
      }),
      assetsActivos: 12,
      otdPctGlobal: 87,
      otdMetric: expect.objectContaining({
        metricId: 'otd_pct',
        benchmarkType: 'external',
        qualityGateStatus: 'healthy',
        confidenceLevel: 'high'
      }),
      feedbackPendiente: 4,
      totalSpaces: 5,
      totalProjects: 8,
      lastSyncedAt: '2026-03-25T10:00:00.000Z'
    })
  })
})
