import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  materialize: vi.fn(),
  invalidate: vi.fn(),
  autoPropose: vi.fn(),
}))

vi.mock('@/lib/hiring/candidate-review/projection', () => ({
  materializeCandidateReviewProjection: mocks.materialize,
  invalidateCandidateReviewProjection: mocks.invalidate,
}))

vi.mock('@/lib/hiring/dossier-ai/auto-propose', () => ({
  autoProposeEvaluationDossier: mocks.autoPropose,
}))

import { hiringCandidateReviewProjection } from './hiring-candidate-review'

beforeEach(() => vi.clearAllMocks())

describe('hiringCandidateReviewProjection', () => {
  it('automatically proposes the dossier after a clean CV becomes ready', async () => {
    mocks.materialize.mockResolvedValue({
      outcome: 'ready',
      applicationId: 'happ-1',
      contentHash: 'hash-1',
    })
    mocks.autoPropose.mockResolvedValue({ outcome: 'proposed', proposalId: 'hdp-1' })

    await expect(hiringCandidateReviewProjection.refresh(
      { entityType: 'candidate_cv_asset', entityId: 'asset-1' },
      { ownerAggregateType: 'hiring_application_cv' } as never
    )).resolves.toContain('dossier proposed')

    expect(mocks.autoPropose).toHaveBeenCalledWith('happ-1')
  })

  it('does not invoke dossier generation for OCR or blocked projections', async () => {
    mocks.materialize.mockResolvedValue({ outcome: 'ocr_required', applicationId: 'happ-1' })

    await hiringCandidateReviewProjection.refresh(
      { entityType: 'candidate_cv_asset', entityId: 'asset-1' },
      { ownerAggregateType: 'hiring_application_cv' } as never
    )

    expect(mocks.autoPropose).not.toHaveBeenCalled()
  })
})
