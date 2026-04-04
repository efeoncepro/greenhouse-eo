import { describe, expect, it } from 'vitest'

import { buildRevenueEnabledMeasurementModel } from './revenue-enabled'

describe('buildRevenueEnabledMeasurementModel', () => {
  it('classifies early launch as range when TTM is observed but revenue is only comparable', () => {
    const model = buildRevenueEnabledMeasurementModel({
      timeToMarket: {
        valueDays: 9,
        dataStatus: 'available',
        confidenceLevel: 'high',
        start: {
          date: '2026-04-01',
          label: 'Brief efectivo',
          source: 'ico_engine.ai_metric_scores.processed_at',
          mode: 'observed'
        },
        activation: {
          date: '2026-04-10',
          label: 'Activacion real',
          source: 'greenhouse_core.campaigns.actual_launch_date',
          mode: 'observed'
        },
        qualityGateReasons: []
      },
      hasComparableRevenueBaseline: true
    })

    expect(model.levers.earlyLaunch.attributionClass).toBe('range')
    expect(model.levers.earlyLaunch.supportingValue).toBe(9)
  })

  it('keeps iteration as estimated while the signal remains proxy', () => {
    const model = buildRevenueEnabledMeasurementModel({
      iterationVelocity: {
        value: 3,
        cadenceWindowDays: 30,
        dataStatus: 'degraded',
        confidenceLevel: 'medium',
        evidenceMode: 'proxy',
        qualityGateReasons: ['Sin evidencia observada de mercado; usando proxy operativo de delivery.'],
        evidence: {
          candidateTasks: 6,
          signalCoverageTasks: 4,
          tasksWithVersionSignal: 4,
          tasksWithWorkflowSignal: 4,
          tasksWithClientRoundSignal: 4,
          usefulIterationTasks: 3,
          correctiveReworkTasks: 1
        }
      }
    })

    expect(model.levers.iteration.attributionClass).toBe('estimated')
    expect(model.levers.iteration.qualityGateReasons.join(' ')).toContain('proxy operativo')
  })

  it('keeps throughput as estimated even with a comparable revenue baseline', () => {
    const model = buildRevenueEnabledMeasurementModel({
      throughput: {
        value: 18,
        qualityGateStatus: 'healthy',
        qualityGateReasons: [],
        confidenceLevel: null
      },
      hasComparableRevenueBaseline: true
    })

    expect(model.levers.throughput.attributionClass).toBe('estimated')
    expect(model.levers.throughput.qualityGateReasons.join(' ')).toContain('tareas completadas')
  })
})
