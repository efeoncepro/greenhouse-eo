import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockGetSpaceFinanceMetrics = vi.fn()
const mockReadLatestSpaceMetrics = vi.fn()
const mockReadProjectMetrics = vi.fn()
const mockRunIcoEngineQuery = vi.fn()
const mockReadMemberCapacityEconomicsBatch = vi.fn()
const mockGetServicesBySpace = vi.fn()
const mockReadSpaceAiLlmSummary = vi.fn()
const mockGetScopeOwnership = vi.fn()
const mockGetSpaceSkillCoverage = vi.fn()
const mockGetEmptySpaceSkillCoverage = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/agency/agency-finance-metrics', () => ({
  getSpaceFinanceMetrics: () => mockGetSpaceFinanceMetrics()
}))

vi.mock('@/lib/ico-engine/read-metrics', () => ({
  readLatestSpaceMetrics: (...args: unknown[]) => mockReadLatestSpaceMetrics(...args),
  readProjectMetrics: (...args: unknown[]) => mockReadProjectMetrics(...args)
}))

vi.mock('@/lib/ico-engine/shared', () => ({
  getIcoEngineProjectId: () => 'greenhouse-test',
  runIcoEngineQuery: (...args: unknown[]) => mockRunIcoEngineQuery(...args),
  toNumber: (value: unknown) => Number(value),
  normalizeString: (value: unknown) => String(value ?? '').trim()
}))

vi.mock('@/lib/ico-engine/schema', () => ({
  ICO_DATASET: 'ico_engine'
}))

vi.mock('@/lib/member-capacity-economics/store', () => ({
  readMemberCapacityEconomicsBatch: (...args: unknown[]) => mockReadMemberCapacityEconomicsBatch(...args)
}))

vi.mock('@/lib/services/service-store', () => ({
  getServicesBySpace: (...args: unknown[]) => mockGetServicesBySpace(...args)
}))

vi.mock('@/lib/ico-engine/ai/llm-enrichment-reader', () => ({
  readSpaceAiLlmSummary: (...args: unknown[]) => mockReadSpaceAiLlmSummary(...args)
}))

vi.mock('@/lib/operational-responsibility/readers', () => ({
  getScopeOwnership: (...args: unknown[]) => mockGetScopeOwnership(...args)
}))

vi.mock('@/lib/agency/skills-staffing', () => ({
  getSpaceSkillCoverage: (...args: unknown[]) => mockGetSpaceSkillCoverage(...args),
  getEmptySpaceSkillCoverage: (...args: unknown[]) => mockGetEmptySpaceSkillCoverage(...args)
}))

import { getAgencySpace360 } from './space-360'

describe('getAgencySpace360', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))
    vi.clearAllMocks()

    mockGetSpaceFinanceMetrics.mockResolvedValue([])
    mockReadLatestSpaceMetrics.mockResolvedValue(null)
    mockReadProjectMetrics.mockResolvedValue([])
    mockRunIcoEngineQuery.mockResolvedValue([])
    mockReadMemberCapacityEconomicsBatch.mockResolvedValue(new Map())
    mockGetServicesBySpace.mockResolvedValue([])
    mockReadSpaceAiLlmSummary.mockResolvedValue(null)
    mockGetScopeOwnership.mockResolvedValue({
      accountLead: null,
      deliveryLead: null,
      financeReviewer: null,
      operationsLead: null
    })
    mockGetSpaceSkillCoverage.mockResolvedValue({
      summary: {
        requiredSkillCount: 0,
        coveredSkillCount: 0,
        gapSkillCount: 0,
        serviceCountWithRequirements: 0,
        coveragePct: null
      },
      memberSkillsByMember: {},
      services: []
    })
    mockGetEmptySpaceSkillCoverage.mockReturnValue({
      summary: {
        requiredSkillCount: 0,
        coveredSkillCount: 0,
        gapSkillCount: 0,
        serviceCountWithRequirements: 0,
        coveragePct: null
      },
      memberSkillsByMember: {},
      services: []
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when the client/space cannot be resolved', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    await expect(getAgencySpace360('missing-space')).resolves.toBeNull()
  })

  it('builds a partial client-first detail when there is no canonical space resolution', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          client_name: 'Acme',
          tenant_type: 'client',
          space_id: null,
          space_name: null,
          organization_id: null,
          organization_name: null,
          organization_public_id: null
        }
      ])
      .mockResolvedValueOnce([{ module_code: 'creative_hub' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ receivables_clp: 1500000, payables_clp: 220000 }])
      .mockResolvedValueOnce([
        {
          income_id: 'inc-1',
          invoice_number: 'FAC-1',
          invoice_date: '2026-03-10',
          due_date: '2026-03-25',
          client_name: 'Acme',
          currency: 'CLP',
          total_amount_clp: 1800000,
          amount_paid: 1200000,
          payment_status: 'partial',
          description: 'Retainer marzo'
        }
      ])
      .mockResolvedValueOnce([
        {
          expense_id: 'exp-1',
          expense_type: 'supplier',
          description: 'Media spend',
          payment_date: '2026-03-18',
          due_date: '2026-03-20',
          supplier_name: 'Meta',
          payment_status: 'paid',
          total_amount_clp: 220000,
          member_name: null
        }
      ])
      .mockResolvedValueOnce([
        {
          assignment_id: 'asg-1',
          member_id: 'member-1',
          display_name: 'Ana',
          role_title: 'Designer',
          role_category: 'design',
          fte_allocation: 1,
          contracted_hours_month: 160,
          assignment_type: 'commercial',
          start_date: '2026-03-01',
          placement_id: null,
          placement_status: null,
          placement_provider_id: null,
          placement_provider_name: null
        }
      ])
      .mockResolvedValueOnce([
        {
          active_count: 0,
          provider_count: 0,
          projected_revenue_clp: 0,
          payroll_employer_cost_clp: 0,
          commercial_loaded_cost_clp: 0,
          tooling_cost_clp: 0
        }
      ])
      .mockResolvedValueOnce([
        {
          event_id: 'evt-1',
          aggregate_type: 'assignment',
          aggregate_id: 'client-1',
          event_type: 'assignment.updated',
          payload_json: {},
          occurred_at: '2026-03-30T10:00:00.000Z'
        }
      ])

    mockGetSpaceFinanceMetrics.mockResolvedValue([
      {
        clientId: 'client-1',
        organizationId: null,
        spaceId: null,
        revenueCurrentMonth: 1800000,
        revenuePreviousMonth: 1600000,
        revenueTrend: 12,
        expensesCurrentMonth: 600000,
        marginPct: 67,
        periodYear: 2026,
        periodMonth: 3,
        periodClosed: false,
        snapshotRevision: 2
      }
    ])

    mockReadMemberCapacityEconomicsBatch.mockResolvedValue(new Map([
      ['member-1', {
        usagePercent: 92,
        loadedCostTarget: 950000,
        costPerHourTarget: 15000,
        targetCurrency: 'CLP'
      }]
    ]))

    const detail = await getAgencySpace360('client-1')

    expect(detail).not.toBeNull()
    expect(detail).toMatchObject({
      clientId: 'client-1',
      clientName: 'Acme',
      resolutionStatus: 'client_only',
      dataStatus: 'partial',
      businessLines: ['creative_hub'],
      kpis: {
        revenueClp: 1800000,
        totalCostClp: 600000,
        assignedMembers: 1
      },
      finance: {
        receivablesClp: 1500000,
        payablesClp: 220000
      }
    })
    expect(detail?.overview.alerts.some(alert => /vínculo canónico/i.test(alert))).toBe(true)
    expect(detail?.overview.recentActivity[0]).toMatchObject({
      eventType: 'assignment.updated'
    })
    expect(detail?.team.members[0]).toMatchObject({
      displayName: 'Ana',
      usagePercent: 92,
      capacityHealth: 'attention'
    })
  })

  it('hydrates nexa insights for canonical spaces', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          client_id: 'client-2',
          client_name: 'Acme Space',
          tenant_type: 'client',
          space_id: 'space-2',
          space_name: 'Acme Space',
          organization_id: 'org-2',
          organization_name: 'Acme Org',
          organization_public_id: 'ORG-2'
        }
      ])
      .mockResolvedValueOnce([{ module_code: 'creative_hub' }])
      .mockResolvedValueOnce([
        {
          scope_type: 'space',
          scope_id: 'space-2',
          scope_name: 'Acme Space',
          period_year: 2026,
          period_month: 3,
          period_closed: false,
          snapshot_revision: 1,
          revenue_clp: 2500000,
          labor_cost_clp: 900000,
          direct_expense_clp: 120000,
          overhead_clp: 80000,
          total_cost_clp: 1100000,
          gross_margin_clp: 1400000,
          gross_margin_pct: 56,
          headcount_fte: 2,
          revenue_per_fte_clp: 1250000,
          cost_per_fte_clp: 550000,
          materialized_at: '2026-03-31T12:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([{ receivables_clp: 100000, payables_clp: 20000 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          active_count: 0,
          provider_count: 0,
          projected_revenue_clp: 0,
          payroll_employer_cost_clp: 0,
          commercial_loaded_cost_clp: 0,
          tooling_cost_clp: 0
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockGetSpaceFinanceMetrics.mockResolvedValue([
      {
        clientId: 'client-2',
        organizationId: 'org-2',
        spaceId: 'space-2',
        revenueCurrentMonth: 2500000,
        revenuePreviousMonth: 2100000,
        revenueTrend: 19,
        expensesCurrentMonth: 1100000,
        marginPct: 56,
        periodYear: 2026,
        periodMonth: 3,
        periodClosed: false,
        snapshotRevision: 1
      }
    ])

    mockReadSpaceAiLlmSummary.mockResolvedValue({
      summarySource: 'active',
      activeAnalyzed: 2,
      historicalAnalyzed: 2,
      totalAnalyzed: 2,
      lastAnalysis: '2026-03-31T12:10:00.000Z',
      runStatus: 'succeeded',
      insights: [
        {
          id: 'EO-AIE-30',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'warning',
          explanation: 'Space insight',
          recommendedAction: 'Revisar'
        }
      ],
      activePreview: [
        {
          id: 'EO-AIE-30',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'warning',
          explanation: 'Space insight',
          recommendedAction: 'Revisar'
        }
      ],
      historicalPreview: [
        {
          id: 'EO-AIE-30',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'warning',
          explanation: 'Space insight',
          recommendedAction: 'Revisar'
        }
      ],
      timeline: []
    })

    const detail = await getAgencySpace360('space-2')

    expect(detail).not.toBeNull()
    expect(detail?.resolutionStatus).toBe('client_and_space')
    expect(detail?.nexaInsights).toEqual({
      summarySource: 'active',
      activeAnalyzed: 2,
      historicalAnalyzed: 2,
      totalAnalyzed: 2,
      lastAnalysis: '2026-03-31T12:10:00.000Z',
      runStatus: 'succeeded',
      insights: [
        {
          id: 'EO-AIE-30',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'warning',
          explanation: 'Space insight',
          recommendedAction: 'Revisar'
        }
      ],
      activePreview: [
        {
          id: 'EO-AIE-30',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'warning',
          explanation: 'Space insight',
          recommendedAction: 'Revisar'
        }
      ],
      historicalPreview: [
        {
          id: 'EO-AIE-30',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'warning',
          explanation: 'Space insight',
          recommendedAction: 'Revisar'
        }
      ],
      timeline: []
    })
    expect(mockReadSpaceAiLlmSummary).toHaveBeenCalledWith('space-2', 2026, 4)
  })
})
