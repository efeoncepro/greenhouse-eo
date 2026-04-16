import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadLatestSpaceMetrics = vi.fn()
const mockRunIcoEngineQuery = vi.fn()
const mockGetIcoEngineProjectId = vi.fn(() => 'greenhouse-test')
const mockPublishOutboxEvent = vi.fn()
const mockGetServiceSlaContext = vi.fn()
const mockListServiceSlaComplianceSnapshots = vi.fn()
const mockListServiceSlaDefinitions = vi.fn()
const mockReplaceServiceSlaComplianceSnapshots = vi.fn()

vi.mock('@/lib/ico-engine/read-metrics', () => ({
  readLatestSpaceMetrics: (...args: unknown[]) => mockReadLatestSpaceMetrics(...args)
}))

vi.mock('@/lib/ico-engine/shared', () => ({
  getIcoEngineProjectId: () => mockGetIcoEngineProjectId(),
  runIcoEngineQuery: (...args: unknown[]) => mockRunIcoEngineQuery(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/services/service-sla-store', () => ({
  getServiceSlaContext: (...args: unknown[]) => mockGetServiceSlaContext(...args),
  listServiceSlaComplianceSnapshots: (...args: unknown[]) => mockListServiceSlaComplianceSnapshots(...args),
  listServiceSlaDefinitions: (...args: unknown[]) => mockListServiceSlaDefinitions(...args),
  replaceServiceSlaComplianceSnapshots: (...args: unknown[]) => mockReplaceServiceSlaComplianceSnapshots(...args)
}))

describe('refreshServiceSlaCompliance', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetIcoEngineProjectId.mockReturnValue('greenhouse-test')
    mockPublishOutboxEvent.mockResolvedValue('outbox-1')
    mockReplaceServiceSlaComplianceSnapshots.mockResolvedValue([])
  })

  it('marks ICO-backed indicators as breached when the actual value is below the contractual boundary', async () => {
    const { refreshServiceSlaCompliance } = await import('./sla-compliance')

    mockGetServiceSlaContext.mockResolvedValue({
      serviceId: 'service-1',
      spaceId: 'space-1',
      serviceName: 'Creative Retainer',
      organizationId: 'org-1',
      notionProjectId: 'notion-project-1'
    })
    mockListServiceSlaDefinitions.mockResolvedValue([
      {
        definitionId: 'def-1',
        serviceId: 'service-1',
        spaceId: 'space-1',
        indicatorCode: 'otd_pct',
        indicatorFormula: 'on_time / completed',
        measurementSource: 'ico_engine.v_metric_latest',
        comparisonMode: 'at_least',
        unit: 'percent',
        sliLabel: 'OTD',
        sloTargetValue: 92,
        slaTargetValue: 90,
        breachThreshold: 88,
        warningThreshold: 90,
        displayOrder: 10,
        active: true,
        createdBy: null,
        updatedBy: null,
        createdAt: '2026-04-15T00:00:00.000Z',
        updatedAt: '2026-04-15T00:00:00.000Z'
      }
    ])
    mockListServiceSlaComplianceSnapshots.mockResolvedValue([])
    mockReadLatestSpaceMetrics.mockResolvedValue({
      spaceId: 'space-1',
      clientId: 'client-1',
      clientName: 'Sky',
      periodYear: 2026,
      periodMonth: 4,
      metrics: [
        {
          metricId: 'otd_pct',
          value: 87,
          qualityGateStatus: 'healthy',
          qualityGateReasons: [],
          confidenceLevel: 'high'
        }
      ],
      cscDistribution: [],
      context: {
        totalTasks: 10,
        completedTasks: 10,
        activeTasks: 0,
        onTimeTasks: 9,
        lateDropTasks: 1,
        overdueTasks: 0,
        carryOverTasks: 0,
        overdueCarriedForwardTasks: 0
      },
      computedAt: '2026-04-15T00:00:00.000Z',
      engineVersion: 'test',
      source: 'materialized'
    })
    mockRunIcoEngineQuery.mockResolvedValue([
      { metric_value: 87 },
      { metric_value: 90 }
    ])

    const report = await refreshServiceSlaCompliance({
      serviceId: 'service-1',
      spaceId: 'space-1'
    })

    expect(report.overallStatus).toBe('breached')
    expect(report.summary.breachedCount).toBe(1)
    expect(report.items[0]).toMatchObject({
      complianceStatus: 'breached',
      sourceStatus: 'ready',
      actualValue: 87,
      deltaToTarget: -3
    })
    expect(mockReplaceServiceSlaComplianceSnapshots).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    expect(mockPublishOutboxEvent.mock.calls[0]?.[0]).toMatchObject({
      eventType: 'service.sla_status.changed',
      aggregateId: 'service-1'
    })
  })

  it('marks revision rounds as unavailable when the service lacks project linkage', async () => {
    const { refreshServiceSlaCompliance } = await import('./sla-compliance')

    mockGetServiceSlaContext.mockResolvedValue({
      serviceId: 'service-2',
      spaceId: 'space-9',
      serviceName: 'Performance Media',
      organizationId: 'org-9',
      notionProjectId: null
    })
    mockListServiceSlaDefinitions.mockResolvedValue([
      {
        definitionId: 'def-2',
        serviceId: 'service-2',
        spaceId: 'space-9',
        indicatorCode: 'revision_rounds',
        indicatorFormula: 'avg(client_change_round_final + workflow_change_round)',
        measurementSource: 'ico_engine.v_tasks_enriched',
        comparisonMode: 'at_most',
        unit: 'rounds',
        sliLabel: 'Revisiones',
        sloTargetValue: 1.5,
        slaTargetValue: 2,
        breachThreshold: 3,
        warningThreshold: 2.5,
        displayOrder: 20,
        active: true,
        createdBy: null,
        updatedBy: null,
        createdAt: '2026-04-15T00:00:00.000Z',
        updatedAt: '2026-04-15T00:00:00.000Z'
      }
    ])
    mockListServiceSlaComplianceSnapshots.mockResolvedValue([])

    const report = await refreshServiceSlaCompliance({
      serviceId: 'service-2',
      spaceId: 'space-9',
      emitStatusChangeEvents: false
    })

    expect(report.overallStatus).toBe('partial')
    expect(report.summary.sourceUnavailableCount).toBe(1)
    expect(report.items[0]).toMatchObject({
      complianceStatus: 'source_unavailable',
      sourceStatus: 'insufficient_linkage',
      actualValue: null
    })
    expect(report.items[0].evidence.reasons[0]).toContain('notion_project_id')
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })
})
