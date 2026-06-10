import type { MyPerformanceResponse } from '@/lib/my-performance/types'

/**
 * Rich mock payload for `/my/performance/mockup` — TASK-1027.
 *
 * Mirrors the approved "Tablero de foco personal" reference so the full
 * enterprise dashboard can be reviewed (via GVC) by operators who do not have
 * personal ICO metrics of their own (e.g. admins). Same shape the real
 * `/api/my/performance` returns; the view renders it identically.
 */
export const MY_PERFORMANCE_MOCK: MyPerformanceResponse = {
  subject: { memberId: 'mem-mock-1' },
  period: {
    year: 2026,
    month: 5,
    label: 'Mayo 2026',
    isCurrentPeriod: true,
    status: 'current_partial'
  },
  ico: {
    hasData: true,
    metrics: [
      { metricId: 'rpa', value: 1.42, zone: 'optimal' },
      { metricId: 'otd_pct', value: 86, zone: 'optimal' },
      { metricId: 'ftr_pct', value: 66, zone: 'attention' },
      { metricId: 'throughput', value: 24, zone: 'optimal' },
      { metricId: 'cycle_time', value: 4.3, zone: 'optimal' },
      { metricId: 'stuck_assets', value: 3, zone: 'attention' },
      { metricId: 'pipeline_velocity', value: 0.74, zone: 'attention' }
    ],
    context: { totalTasks: 31, completedTasks: 24, activeTasks: 7, carryOverTasks: 2 },
    cscDistribution: [
      { phase: 'briefing', label: 'Briefing', count: 3, pct: 12.5 },
      { phase: 'produccion', label: 'Producción', count: 9, pct: 37.5 },
      { phase: 'revision_interna', label: 'Revisión interna', count: 5, pct: 20.8 },
      { phase: 'cambios_cliente', label: 'Cambios cliente', count: 3, pct: 12.5 },
      { phase: 'entrega', label: 'Entrega', count: 4, pct: 16.7 }
    ]
  },
  trend: [
    { periodYear: 2025, periodMonth: 12, otdPct: 78, ftrPct: 60 },
    { periodYear: 2026, periodMonth: 1, otdPct: 80, ftrPct: 62 },
    { periodYear: 2026, periodMonth: 2, otdPct: 83, ftrPct: 64 },
    { periodYear: 2026, periodMonth: 3, otdPct: 81, ftrPct: 70 },
    { periodYear: 2026, periodMonth: 4, otdPct: 88, ftrPct: 72 },
    { periodYear: 2026, periodMonth: 5, otdPct: 86, ftrPct: 66 }
  ],
  nexaInsights: {
    summarySource: 'active',
    activeAnalyzed: 2,
    historicalAnalyzed: 4,
    totalAnalyzed: 2,
    lastAnalysis: '2026-05-21T14:00:00.000Z',
    runStatus: 'succeeded',
    dataStatus: 'ready',
    insights: [
      {
        id: 'EO-AIS-mock0001',
        signalType: 'quality_drop',
        metricId: 'ftr_pct',
        severity: 'medium',
        explanation:
          'Tu calidad de primera entrega bajó respecto al mes pasado en @[Sky](space:spc-9). Aparecen más rebotes en revisión de cliente.',
        rootCauseNarrative:
          'Las piezas con más rondas se concentran en cambios de copy pedidos después de la primera aprobación interna.',
        recommendedAction: 'Cierra el brief de copy con el cliente antes de mandar a aprobación.',
        processedAt: '2026-05-21T14:00:00.000Z'
      },
      {
        id: 'EO-AIS-mock0002',
        signalType: 'flow_stable',
        metricId: 'otd_pct',
        severity: 'low',
        explanation: 'Mantienes buena puntualidad de entrega este período. Sigue priorizando lo que vence primero.',
        rootCauseNarrative: null,
        recommendedAction: 'Revisa tus 3 Stuck Assets para que no afecten los próximos cierres.',
        processedAt: '2026-05-20T11:00:00.000Z'
      }
    ],
    activePreview: [],
    historicalPreview: [],
    timeline: []
  },
  operational: { tasksCompleted: 24, tasksActive: 7, stuckAssetCount: 3 },
  meta: { materializedAt: '2026-05-21T03:00:00.000Z', degradedSources: [] }
}
