import { describe, expect, it } from 'vitest'

import { resolveIterationVelocityMetric } from '@/lib/ico-engine/iteration-velocity'

describe('resolveIterationVelocityMetric', () => {
  it('returns degraded proxy contract with useful iterations separated from corrective work', () => {
    const result = resolveIterationVelocityMetric({
      now: '2026-04-30T00:00:00.000Z',
      tasks: [
        {
          completedAt: '2026-04-28T00:00:00.000Z',
          frameVersions: 3,
          clientChangeRounds: 0,
          workflowChangeRounds: 1,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-24T00:00:00.000Z',
          frameVersions: 2,
          clientChangeRounds: 0,
          workflowChangeRounds: 0,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-22T00:00:00.000Z',
          frameVersions: 4,
          clientChangeRounds: 2,
          workflowChangeRounds: 1,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-10T00:00:00.000Z',
          frameVersions: 1,
          clientChangeRounds: null,
          workflowChangeRounds: null,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        }
      ]
    })

    expect(result.value).toBe(2)
    expect(result.dataStatus).toBe('degraded')
    expect(result.confidenceLevel).toBe('medium')
    expect(result.evidenceMode).toBe('proxy')
    expect(result.evidence.usefulIterationTasks).toBe(2)
    expect(result.evidence.correctiveReworkTasks).toBe(1)
    expect(result.qualityGateReasons).toContain('Sin evidencia observada de mercado; usando proxy operativo de delivery.')
  })

  it('returns available contract when market evidence is observed and coverage is strong', () => {
    const result = resolveIterationVelocityMetric({
      now: '2026-04-30T00:00:00.000Z',
      hasObservedMarketEvidence: true,
      tasks: [
        {
          completedAt: '2026-04-28T00:00:00.000Z',
          frameVersions: 3,
          clientChangeRounds: 0,
          workflowChangeRounds: 1,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-24T00:00:00.000Z',
          frameVersions: 2,
          clientChangeRounds: 0,
          workflowChangeRounds: 0,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-22T00:00:00.000Z',
          frameVersions: 3,
          clientChangeRounds: 0,
          workflowChangeRounds: 1,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-18T00:00:00.000Z',
          frameVersions: 2,
          clientChangeRounds: 0,
          workflowChangeRounds: 1,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-12T00:00:00.000Z',
          frameVersions: 2,
          clientChangeRounds: 0,
          workflowChangeRounds: 0,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        }
      ]
    })

    expect(result.value).toBe(5)
    expect(result.dataStatus).toBe('available')
    expect(result.confidenceLevel).toBe('high')
    expect(result.evidenceMode).toBe('observed')
    expect(result.qualityGateReasons).toEqual([])
  })

  it('returns unavailable when there are no completed tasks in the window', () => {
    const result = resolveIterationVelocityMetric({
      now: '2026-04-30T00:00:00.000Z',
      tasks: [
        {
          completedAt: '2026-02-01T00:00:00.000Z',
          frameVersions: 3,
          clientChangeRounds: 0,
          workflowChangeRounds: 1,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        }
      ]
    })

    expect(result.value).toBeNull()
    expect(result.dataStatus).toBe('unavailable')
    expect(result.confidenceLevel).toBeNull()
    expect(result.evidenceMode).toBe('missing')
    expect(result.qualityGateReasons).toContain(
      'Sin tareas completadas en los ultimos 30 dias para estimar Iteration Velocity.'
    )
  })

  it('keeps the metric available as zero when only corrective evidence exists', () => {
    const result = resolveIterationVelocityMetric({
      now: '2026-04-30T00:00:00.000Z',
      tasks: [
        {
          completedAt: '2026-04-28T00:00:00.000Z',
          frameVersions: 4,
          clientChangeRounds: 2,
          workflowChangeRounds: 1,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-26T00:00:00.000Z',
          frameVersions: 2,
          clientChangeRounds: 1,
          workflowChangeRounds: 0,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        },
        {
          completedAt: '2026-04-24T00:00:00.000Z',
          frameVersions: 1,
          clientChangeRounds: 1,
          workflowChangeRounds: null,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 1
        }
      ]
    })

    expect(result.value).toBe(0)
    expect(result.dataStatus).toBe('degraded')
    expect(result.confidenceLevel).toBe('medium')
    expect(result.qualityGateReasons).toContain('No hay iteraciones utiles cerradas en la ventana de 30 dias.')
    expect(result.qualityGateReasons).toContain('La ventana tiene mas correccion cliente que iteracion util.')
  })
})
