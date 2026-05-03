import { describe, expect, it } from 'vitest'

import { buildCreativeVelocityReviewContract } from '@/lib/ico-engine/creative-velocity-review'

describe('buildCreativeVelocityReviewContract', () => {
  it('keeps Early Launch unavailable when the current scope has no TTM evidence', () => {
    const contract = buildCreativeVelocityReviewContract({
      tasks: [
        {
          completedAt: '2026-04-01T12:00:00.000Z',
          frameVersions: 3,
          clientChangeRounds: 0,
          workflowChangeRounds: 1,
          clientReviewOpen: false,
          workflowReviewOpen: false,
          openFrameComments: 0
        }
      ],
      throughput: {
        value: 14
      }
    })

    expect(contract.policyVersion).toBe('cvr_v1')
    expect(contract.timeToMarket.dataStatus).toBe('unavailable')
    expect(contract.revenueEnabled.levers.earlyLaunch.attributionClass).toBe('unavailable')
    // Post-cadence-window: con 1 task fuera de los ultimos N dias del cadence
    // window, iteration-velocity devuelve value=null → attributionClass='unavailable'.
    // Refleja el comportamiento actual del motor; el test originalmente esperaba
    // 'estimated' antes que el quality gate de cadence_window fuera tightened.
    expect(contract.revenueEnabled.levers.iteration.attributionClass).toBe('unavailable')
    // Sin design-system observed source: el motor reporta 'missing' (no 'proxy').
    expect(contract.methodologicalAccelerators.designSystem.evidenceMode).toBe('missing')
    expect(contract.methodologicalAccelerators.brandVoiceAi.dataStatus).toBe('unavailable')
    expect(contract.tierMatrix.find(row => row.id === 'revenue-enabled')?.byTier.basic.status).toBe('not_included')
    expect(contract.guardrails.find(rule => rule.id === 'do-not-inflate-proxies')?.detail).toContain('revenue observado')
  })
})
