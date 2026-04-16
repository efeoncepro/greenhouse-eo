import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetNotifications = vi.fn()
const mockBuildHomeEntitlementsContext = vi.fn()
const mockReadTopAiLlmEnrichments = vi.fn()
const mockReadAgencyAiLlmSummary = vi.fn()

vi.mock('@/lib/notifications/notification-service', () => ({
  NotificationService: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args)
  }
}))

vi.mock('@/lib/home/build-home-entitlements-context', () => ({
  buildHomeEntitlementsContext: (...args: unknown[]) => mockBuildHomeEntitlementsContext(...args)
}))

vi.mock('@/lib/ico-engine/ai/llm-enrichment-reader', () => ({
  readAgencyAiLlmSummary: (...args: unknown[]) => mockReadAgencyAiLlmSummary(...args),
  readTopAiLlmEnrichments: (...args: unknown[]) => mockReadTopAiLlmEnrichments(...args)
}))

const { getHomeSnapshot } = await import('./get-home-snapshot')

describe('getHomeSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))

    mockBuildHomeEntitlementsContext.mockReturnValue({
      entitlements: {
        audienceKey: 'internal',
        startupPolicyKey: 'internal_default',
        moduleKeys: []
      },
      accessContext: {
        audienceKey: 'internal',
        startupPolicyKey: 'internal_default',
        moduleKeys: []
      },
      recommendedShortcuts: [],
      visibleCapabilityModules: [
        {
          id: 'agency',
          label: 'Agency',
          description: 'Command Center',
          icon: 'tabler-building',
          route: '/agency'
        }
      ],
      canSeeFinanceStatus: false
    })

    mockGetNotifications.mockResolvedValue({
      items: [],
      total: 0
    })

    mockReadTopAiLlmEnrichments.mockResolvedValue([
      {
        enrichmentId: 'EO-AIE-1',
        signalId: 'signal-1',
        spaceId: 'space-1',
        metricName: 'otd_pct',
        signalType: 'anomaly',
        severity: 'critical',
        qualityScore: 97,
        explanationSummary: '@[Space 1](space:space-1) tiene retrasos recurrentes.',
        recommendedAction: 'Revisar @[Project 1](project:project-1).',
        confidence: 0.93,
        processedAt: '2026-04-15T13:10:00.000Z'
      },
      {
        enrichmentId: 'EO-AIE-2',
        signalId: 'signal-2',
        spaceId: 'space-2',
        metricName: 'rpa_avg',
        signalType: 'prediction',
        severity: 'warning',
        qualityScore: 91,
        explanationSummary: 'Mayor carga en @[Space 2](space:space-2).',
        recommendedAction: 'Priorizar revisión.',
        confidence: 0.88,
        processedAt: '2026-04-15T12:45:00.000Z'
      },
      {
        enrichmentId: 'EO-AIE-3',
        signalId: 'signal-3',
        spaceId: 'space-3',
        metricName: 'ftr_pct',
        signalType: 'root_cause',
        severity: 'info',
        qualityScore: 80,
        explanationSummary: 'Sincronización pendiente.',
        recommendedAction: null,
        confidence: 0.7,
        processedAt: '2026-04-15T11:20:00.000Z'
      }
    ])

    mockReadAgencyAiLlmSummary.mockResolvedValue({
      totals: {
        total: 3,
        succeeded: 3,
        failed: 0,
        avgQualityScore: 89.3
      },
      latestRun: {
        runId: 'EO-AIR-1',
        status: 'partial',
        startedAt: '2026-04-15T12:00:00.000Z',
        completedAt: '2026-04-15T12:06:00.000Z',
        signalsSeen: 4,
        signalsEnriched: 3,
        signalsFailed: 1
      },
      recentEnrichments: [],
      lastProcessedAt: '2026-04-15T13:10:00.000Z'
    })
  })

  it('maps the current Santiago period into a serializable Nexa insights payload', async () => {
    const snapshot = await getHomeSnapshot({
      userId: 'user-1',
      clientId: 'client-1',
      firstName: 'Julio',
      lastName: 'Reyes',
      roleName: 'admin',
      tenantType: 'efeonce_internal',
      primaryRoleCode: 'efeonce_admin',
      businessLines: [],
      serviceModules: [],
      roleCodes: [],
      routeGroups: [],
      authorizedViews: [],
      portalHomePath: '/home'
    })

    expect(mockReadTopAiLlmEnrichments).toHaveBeenCalledWith(2026, 4, 3)
    expect(mockReadAgencyAiLlmSummary).toHaveBeenCalledWith(2026, 4, 1)
    expect(snapshot.nexaInsights).toEqual({
      totalAnalyzed: 3,
      lastAnalysis: '2026-04-15T13:10:00.000Z',
      runStatus: 'partial',
      insights: [
        {
          id: 'EO-AIE-1',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'critical',
          explanation: '@[Space 1](space:space-1) tiene retrasos recurrentes.',
          recommendedAction: 'Revisar @[Project 1](project:project-1).'
        },
        {
          id: 'EO-AIE-2',
          signalType: 'prediction',
          metricId: 'rpa_avg',
          severity: 'warning',
          explanation: 'Mayor carga en @[Space 2](space:space-2).',
          recommendedAction: 'Priorizar revisión.'
        },
        {
          id: 'EO-AIE-3',
          signalType: 'root_cause',
          metricId: 'ftr_pct',
          severity: 'info',
          explanation: 'Sincronización pendiente.',
          recommendedAction: null
        }
      ]
    })
  })
})
