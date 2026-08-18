import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ autoPropose: vi.fn() }))

vi.mock('@/lib/hiring/dossier-ai/auto-propose', () => ({
  autoProposeEvaluationDossier: mocks.autoPropose
}))

import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import { hiringEvaluationDossierAutoProposeProjection } from './hiring-evaluation-dossier-auto-propose'

beforeEach(() => vi.clearAllMocks())

describe('hiringEvaluationDossierAutoProposeProjection', () => {
  it('extracts the exact application from assessment.scored', () => {
    expect(hiringEvaluationDossierAutoProposeProjection.triggerEvents).toEqual([
      EVENT_TYPES.hiringAssessmentScored
    ])
    expect(hiringEvaluationDossierAutoProposeProjection.extractScope({ applicationId: ' happ-1 ' }))
      .toEqual({ entityType: 'hiring_application', entityId: 'happ-1' })
  })

  it('proposes idempotently after the assessment becomes scored', async () => {
    mocks.autoPropose.mockResolvedValue({ outcome: 'proposed', proposalId: 'hdp-1' })

    await expect(hiringEvaluationDossierAutoProposeProjection.refresh(
      { entityType: 'hiring_application', entityId: 'happ-1' },
      {}
    )).resolves.toContain('evaluation_dossier proposed')

    expect(mocks.autoPropose).toHaveBeenCalledWith('happ-1')
  })
})
