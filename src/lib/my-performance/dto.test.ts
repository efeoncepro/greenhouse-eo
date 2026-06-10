import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockEnsureIcoInfra = vi.fn()
const mockReadMemberMetrics = vi.fn()
const mockComputeMetricsByContext = vi.fn()
const mockGetPersonIcoProfile = vi.fn()
const mockGetPersonOperationalServing = vi.fn()
const mockReadMemberAiLlmSummary = vi.fn()

vi.mock('@/lib/copy', () => ({
  getMicrocopy: () => ({
    months: {
      long: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ]
    }
  })
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/ico-engine/schema', () => ({
  ensureIcoEngineInfrastructure: (...args: unknown[]) => mockEnsureIcoInfra(...args)
}))

vi.mock('@/lib/ico-engine/read-metrics', () => ({
  readMemberMetrics: (...args: unknown[]) => mockReadMemberMetrics(...args),
  computeMetricsByContext: (...args: unknown[]) => mockComputeMetricsByContext(...args)
}))

vi.mock('@/lib/person-360/get-person-ico-profile', () => ({
  getPersonIcoProfile: (...args: unknown[]) => mockGetPersonIcoProfile(...args)
}))

vi.mock('@/lib/person-360/get-person-operational-serving', () => ({
  getPersonOperationalServing: (...args: unknown[]) => mockGetPersonOperationalServing(...args)
}))

vi.mock('@/lib/ico-engine/ai/llm-enrichment-reader', () => ({
  readMemberAiLlmSummary: (...args: unknown[]) => mockReadMemberAiLlmSummary(...args)
}))

import { composeMyPerformance } from '@/lib/my-performance/dto'

const FORBIDDEN_KEYS = [
  'monthlyBaseSalary',
  'monthlyTotalComp',
  'compensationVersionId',
  'loadedCostTarget',
  'costPerHourTarget',
  'suggestedBillRateTarget',
  'cost'
]

const icoSnapshot = (overrides: Record<string, unknown> = {}) => ({
  dimension: 'member',
  dimensionValue: 'member-1',
  dimensionLabel: null,
  periodYear: 2026,
  periodMonth: 6,
  metrics: [
    // A cost field smuggled into a metric object must be stripped by projection.
    { metricId: 'otd_pct', value: 86, zone: 'optimal', costPerHourTarget: 99999 },
    { metricId: 'ftr_pct', value: 66, zone: 'attention' }
  ],
  cscDistribution: [{ phase: 'entrega', label: 'Entrega', count: 24, pct: 100 }],
  context: {
    totalTasks: 30,
    completedTasks: 24,
    activeTasks: 6,
    onTimeTasks: 0,
    lateDropTasks: 0,
    overdueTasks: 0,
    carryOverTasks: 3,
    overdueCarriedForwardTasks: 0
  },
  computedAt: '2026-06-10T00:00:00.000Z',
  engineVersion: 'v1',
  source: 'materialized',
  ...overrides
})

const icoProfile = () => ({
  memberId: 'member-1',
  hasData: true,
  current: null,
  trend: [
    { periodYear: 2026, periodMonth: 5, otdPct: 80, ftrPct: 70 },
    { periodYear: 2026, periodMonth: 4, otdPct: 75, ftrPct: 65 }
  ],
  health: 'green'
})

const operationalServing = () => ({
  memberId: 'member-1',
  hasData: true,
  source: 'postgres',
  current: {
    periodYear: 2026,
    periodMonth: 6,
    tasksCompleted: 24,
    tasksActive: 6,
    tasksTotal: 30,
    rpaAvg: 1.4,
    otdPct: 86,
    ftrPct: 66,
    cycleTimeAvgDays: 4.3,
    throughputCount: 24,
    stuckAssetCount: 3,
    projectBreakdown: []
  },
  materializedAt: '2026-06-09T00:00:00.000Z'
})

const nexaPayload = () => ({
  summarySource: 'active',
  activeAnalyzed: 2,
  historicalAnalyzed: 0,
  totalAnalyzed: 2,
  lastAnalysis: '2026-06-08T00:00:00.000Z',
  runStatus: 'succeeded',
  insights: [],
  activePreview: [],
  historicalPreview: [],
  timeline: []
})

describe('composeMyPerformance (TASK-1027 self-service DTO)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // June 2026 → America/Santiago (UTC-4 in winter) = same calendar date.
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))
    mockEnsureIcoInfra.mockResolvedValue(undefined)
    mockReadMemberMetrics.mockResolvedValue(icoSnapshot())
    mockComputeMetricsByContext.mockResolvedValue(null)
    mockGetPersonIcoProfile.mockResolvedValue(icoProfile())
    mockGetPersonOperationalServing.mockResolvedValue(operationalServing())
    mockReadMemberAiLlmSummary.mockResolvedValue(nexaPayload())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('redacts cost/compensation fields by construction — never present in the DTO', async () => {
    const dto = await composeMyPerformance({ memberId: 'member-1', year: 2026, month: 6 })
    const serialized = JSON.stringify(dto)

    for (const key of FORBIDDEN_KEYS) {
      expect(serialized).not.toContain(key)
    }

    // The leaky intelligence readers must not be the source.
    expect(dto.ico?.metrics).toEqual([
      { metricId: 'otd_pct', value: 86, zone: 'optimal' },
      { metricId: 'ftr_pct', value: 66, zone: 'attention' }
    ])
  })

  it('marks the current Santiago period as current_partial', async () => {
    const dto = await composeMyPerformance({ memberId: 'member-1', year: 2026, month: 6 })

    expect(dto.period.isCurrentPeriod).toBe(true)
    expect(dto.period.status).toBe('current_partial')
    expect(dto.period.label).toBe('Junio 2026')
    expect(dto.subject.memberId).toBe('member-1')
  })

  it('marks a past period as closed_snapshot', async () => {
    mockReadMemberMetrics.mockResolvedValue(icoSnapshot({ periodMonth: 3 }))
    const dto = await composeMyPerformance({ memberId: 'member-1', year: 2026, month: 3 })

    expect(dto.period.isCurrentPeriod).toBe(false)
    expect(dto.period.status).toBe('closed_snapshot')
  })

  it('reports no_data when every source is empty', async () => {
    mockReadMemberMetrics.mockResolvedValue(null)
    mockComputeMetricsByContext.mockResolvedValue(null)
    mockGetPersonOperationalServing.mockResolvedValue({
      memberId: 'member-1', hasData: false, source: 'none', current: null, materializedAt: null
    })
    mockReadMemberAiLlmSummary.mockResolvedValue({ ...nexaPayload(), totalAnalyzed: 0 })

    const dto = await composeMyPerformance({ memberId: 'member-1', year: 2026, month: 6 })

    expect(dto.ico).toBeNull()
    expect(dto.operational).toBeNull()
    expect(dto.period.status).toBe('no_data')
  })

  it('degrades honestly when a source rejects', async () => {
    mockReadMemberMetrics.mockRejectedValue(new Error('bq timeout'))
    mockComputeMetricsByContext.mockRejectedValue(new Error('bq timeout'))

    const dto = await composeMyPerformance({ memberId: 'member-1', year: 2026, month: 6 })

    expect(dto.ico).toBeNull()
    expect(dto.meta.degradedSources).toContain('ico')
    expect(dto.period.status).toBe('degraded')
    // Other sources still populate.
    expect(dto.operational).not.toBeNull()
    expect(dto.trend.length).toBe(2)
  })

  it('propagates trend, operational and nexa payloads safely', async () => {
    const dto = await composeMyPerformance({ memberId: 'member-1', year: 2026, month: 6 })

    expect(dto.trend).toEqual([
      { periodYear: 2026, periodMonth: 5, otdPct: 80, ftrPct: 70 },
      { periodYear: 2026, periodMonth: 4, otdPct: 75, ftrPct: 65 }
    ])
    expect(dto.operational).toEqual({ tasksCompleted: 24, tasksActive: 6, stuckAssetCount: 3 })
    expect(dto.nexaInsights?.totalAnalyzed).toBe(2)
    expect(dto.meta.materializedAt).toBe('2026-06-10T00:00:00.000Z')
  })
})
