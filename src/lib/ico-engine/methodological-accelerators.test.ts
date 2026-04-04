import { describe, expect, it } from 'vitest'

import { buildMethodologicalAcceleratorsContract } from './methodological-accelerators'

describe('buildMethodologicalAcceleratorsContract', () => {
  it('keeps Design System as proxy while the lane still depends on canonical outcomes', () => {
    const contract = buildMethodologicalAcceleratorsContract({
      metricsSummary: {
        ftrPct: 78,
        rpaAvg: 1.9,
        otdPct: 92,
        throughput: 24,
        cycleTimeDays: 6.4,
        source: 'materialized'
      },
      iterationVelocity: {
        value: 3,
        cadenceWindowDays: 30,
        dataStatus: 'degraded',
        confidenceLevel: 'medium',
        evidenceMode: 'proxy',
        qualityGateReasons: ['Sin evidencia observada de mercado; usando proxy operativo de delivery.'],
        evidence: {
          candidateTasks: 6,
          signalCoverageTasks: 5,
          tasksWithVersionSignal: 5,
          tasksWithWorkflowSignal: 5,
          tasksWithClientRoundSignal: 5,
          usefulIterationTasks: 3,
          correctiveReworkTasks: 1
        }
      },
      revenueEnabled: {
        policyVersion: 're_v1',
        attributionClass: 'estimated',
        levers: {
          earlyLaunch: {
            code: 'early_launch',
            label: 'Early Launch Advantage',
            supportingMetric: 'time_to_market',
            supportingValue: null,
            supportingUnit: 'days',
            attributionClass: 'unavailable',
            confidenceLevel: null,
            qualityGateReasons: []
          },
          iteration: {
            code: 'iteration',
            label: 'Iteration Velocity Impact',
            supportingMetric: 'iteration_velocity',
            supportingValue: 3,
            supportingUnit: 'iterations',
            attributionClass: 'estimated',
            confidenceLevel: 'medium',
            qualityGateReasons: []
          },
          throughput: {
            code: 'throughput',
            label: 'Throughput Expandido',
            supportingMetric: 'throughput',
            supportingValue: 24,
            supportingUnit: 'tasks',
            attributionClass: 'estimated',
            confidenceLevel: 'low',
            qualityGateReasons: []
          }
        },
        qualityGateReasons: []
      }
    })

    expect(contract.designSystem.evidenceMode).toBe('proxy')
    expect(contract.designSystem.dataStatus).toBe('available')
    expect(contract.designSystem.summaryValue).toBe('5/5 outcomes')
  })

  it('keeps Brand Voice unavailable without an audited brand score', () => {
    const contract = buildMethodologicalAcceleratorsContract({
      metricsSummary: null,
      iterationVelocity: {
        value: null,
        cadenceWindowDays: 30,
        dataStatus: 'unavailable',
        confidenceLevel: null,
        evidenceMode: 'missing',
        qualityGateReasons: [],
        evidence: {
          candidateTasks: 0,
          signalCoverageTasks: 0,
          tasksWithVersionSignal: 0,
          tasksWithWorkflowSignal: 0,
          tasksWithClientRoundSignal: 0,
          usefulIterationTasks: 0,
          correctiveReworkTasks: 0
        }
      },
      revenueEnabled: {
        policyVersion: 're_v1',
        attributionClass: 'unavailable',
        levers: {
          earlyLaunch: {
            code: 'early_launch',
            label: 'Early Launch Advantage',
            supportingMetric: 'time_to_market',
            supportingValue: null,
            supportingUnit: 'days',
            attributionClass: 'unavailable',
            confidenceLevel: null,
            qualityGateReasons: []
          },
          iteration: {
            code: 'iteration',
            label: 'Iteration Velocity Impact',
            supportingMetric: 'iteration_velocity',
            supportingValue: null,
            supportingUnit: 'iterations',
            attributionClass: 'unavailable',
            confidenceLevel: null,
            qualityGateReasons: []
          },
          throughput: {
            code: 'throughput',
            label: 'Throughput Expandido',
            supportingMetric: 'throughput',
            supportingValue: null,
            supportingUnit: 'tasks',
            attributionClass: 'unavailable',
            confidenceLevel: null,
            qualityGateReasons: []
          }
        },
        qualityGateReasons: []
      },
      brandVoiceAiEvidence: null
    })

    expect(contract.brandVoiceAi.dataStatus).toBe('unavailable')
    expect(contract.brandVoiceAi.qualityGateReasons.join(' ')).toContain('brand_consistency_score')
  })
})
