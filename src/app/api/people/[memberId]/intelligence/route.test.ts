import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePeopleTenantContext = vi.fn()
const mockReadPersonIntelligence = vi.fn()
const mockReadPersonIntelligenceTrend = vi.fn()
const mockReadMemberCapacityEconomicsSnapshot = vi.fn()
const mockReadMemberCapacityEconomicsTrend = vi.fn()
const mockReadMemberAiLlmSummary = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requirePeopleTenantContext: (...args: unknown[]) => mockRequirePeopleTenantContext(...args)
}))

vi.mock('@/lib/person-intelligence/store', () => ({
  readPersonIntelligence: (...args: unknown[]) => mockReadPersonIntelligence(...args),
  readPersonIntelligenceTrend: (...args: unknown[]) => mockReadPersonIntelligenceTrend(...args)
}))

vi.mock('@/lib/member-capacity-economics/store', () => ({
  readMemberCapacityEconomicsSnapshot: (...args: unknown[]) => mockReadMemberCapacityEconomicsSnapshot(...args),
  readMemberCapacityEconomicsTrend: (...args: unknown[]) => mockReadMemberCapacityEconomicsTrend(...args)
}))

vi.mock('@/lib/ico-engine/ai/llm-enrichment-reader', () => ({
  readMemberAiLlmSummary: (...args: unknown[]) => mockReadMemberAiLlmSummary(...args)
}))

import { GET } from '@/app/api/people/[memberId]/intelligence/route'

describe('GET /api/people/[memberId]/intelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))
    mockRequirePeopleTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['people'], roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('overlays capacity and cost from member_capacity_economics on top of person intelligence', async () => {
    mockReadPersonIntelligence.mockResolvedValue({
      memberId: 'member-1',
      period: { year: 2026, month: 3 },
      deliveryMetrics: [],
      derivedMetrics: [
        { metricId: 'cost_per_hour', value: 12000, zone: null },
        { metricId: 'utilization_pct', value: 44, zone: null }
      ],
      capacity: {
        contractedHoursMonth: 999,
        assignedHoursMonth: 999,
        usedHoursMonth: 999,
        availableHoursMonth: 999,
        overcommitted: false,
        roleCategory: 'design',
        totalFteAllocation: 9,
        expectedThroughput: 20,
        capacityHealth: 'balanced',
        activeAssignmentCount: 9
      },
      cost: {
        currency: 'USD',
        monthlyBaseSalary: 1000,
        monthlyTotalComp: 1200,
        compensationVersionId: 'legacy'
      },
      health: 'green',
      materializedAt: '2026-03-26T00:00:00.000Z',
      engineVersion: 'v2',
      source: 'person_intelligence'
    })
    mockReadPersonIntelligenceTrend.mockResolvedValue([])
    mockReadMemberCapacityEconomicsSnapshot.mockResolvedValue({
      memberId: 'member-1',
      periodYear: 2026,
      periodMonth: 3,
      contractedFte: 1,
      contractedHours: 160,
      assignedHours: 120,
      usageKind: 'percent',
      usedHours: null,
      usagePercent: 82,
      commercialAvailabilityHours: 40,
      operationalAvailabilityHours: null,
      sourceCurrency: 'USD',
      targetCurrency: 'CLP',
      totalCompSource: 2400,
      totalLaborCostTarget: 2160000,
      directOverheadTarget: 0,
      sharedOverheadTarget: 0,
      loadedCostTarget: 2160000,
      costPerHourTarget: 13500,
      suggestedBillRateTarget: 18225,
      fxRate: 900,
      fxRateDate: '2026-03-31',
      fxProvider: 'mindicador',
      fxStrategy: 'period_last_business_day',
      snapshotStatus: 'complete',
      sourceCompensationVersionId: 'cv-1',
      sourcePayrollPeriodId: '2026-03',
      assignmentCount: 2,
      materializedAt: '2026-03-26T01:00:00.000Z'
    })
    mockReadMemberCapacityEconomicsTrend.mockResolvedValue([])
    mockReadMemberAiLlmSummary.mockResolvedValue({
      summarySource: 'active',
      activeAnalyzed: 2,
      historicalAnalyzed: 2,
      totalAnalyzed: 2,
      lastAnalysis: '2026-03-26T02:00:00.000Z',
      runStatus: 'succeeded',
      insights: [
        {
          id: 'EO-AIE-1',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'critical',
          explanation: '@[Space A](space:space-a) está retrasado.',
          recommendedAction: 'Revisar bloqueadores con @[Ana](member:member-2).'
        }
      ],
      activePreview: [
        {
          id: 'EO-AIE-1',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'critical',
          explanation: '@[Space A](space:space-a) está retrasado.',
          recommendedAction: 'Revisar bloqueadores con @[Ana](member:member-2).'
        }
      ],
      historicalPreview: [
        {
          id: 'EO-AIE-1',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'critical',
          explanation: '@[Space A](space:space-a) está retrasado.',
          recommendedAction: 'Revisar bloqueadores con @[Ana](member:member-2).'
        }
      ],
      timeline: []
    })

    const response = await GET(
      new Request('http://localhost/api/people/member-1/intelligence?trend=6'),
      { params: Promise.resolve({ memberId: 'member-1' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.current.capacity).toMatchObject({
      contractedHoursMonth: 160,
      assignedHoursMonth: 120,
      usedHoursMonth: null,
      availableHoursMonth: 40,
      usageKind: 'percent',
      usagePercent: 82,
      totalFteAllocation: 1,
      activeAssignmentCount: 2
    })
    expect(body.current.cost).toMatchObject({
      currency: 'USD',
      monthlyTotalComp: 2400,
      targetCurrency: 'CLP',
      costPerHourTarget: 13500,
      suggestedBillRateTarget: 18225
    })
    expect(mockReadMemberAiLlmSummary).toHaveBeenCalledWith('member-1', 2026, 4)
    expect(body.nexaInsights).toEqual({
      summarySource: 'active',
      activeAnalyzed: 2,
      historicalAnalyzed: 2,
      totalAnalyzed: 2,
      lastAnalysis: '2026-03-26T02:00:00.000Z',
      runStatus: 'succeeded',
      insights: [
        {
          id: 'EO-AIE-1',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'critical',
          explanation: '@[Space A](space:space-a) está retrasado.',
          recommendedAction: 'Revisar bloqueadores con @[Ana](member:member-2).'
        }
      ],
      activePreview: [
        {
          id: 'EO-AIE-1',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'critical',
          explanation: '@[Space A](space:space-a) está retrasado.',
          recommendedAction: 'Revisar bloqueadores con @[Ana](member:member-2).'
        }
      ],
      historicalPreview: [
        {
          id: 'EO-AIE-1',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'critical',
          explanation: '@[Space A](space:space-a) está retrasado.',
          recommendedAction: 'Revisar bloqueadores con @[Ana](member:member-2).'
        }
      ],
      timeline: []
    })
    expect(body.current.derivedMetrics.find((metric: { metricId: string }) => metric.metricId === 'cost_per_hour')?.value).toBe(13500)
    expect(body.current.derivedMetrics.find((metric: { metricId: string }) => metric.metricId === 'utilization_pct')?.value).toBe(82)
  })

  it('returns 403 for client tenants because person intelligence is internal-only', async () => {
    mockRequirePeopleTenantContext.mockResolvedValue({
      tenant: { tenantType: 'client', routeGroups: ['client'] },
      errorResponse: null
    })

    const response = await GET(
      new Request('http://localhost/api/people/member-1/intelligence?trend=6'),
      { params: Promise.resolve({ memberId: 'member-1' }) }
    )

    expect(response.status).toBe(403)
    expect(mockReadPersonIntelligence).not.toHaveBeenCalled()
    expect(mockReadMemberCapacityEconomicsSnapshot).not.toHaveBeenCalled()
    expect(mockReadMemberAiLlmSummary).not.toHaveBeenCalled()
  })
})
