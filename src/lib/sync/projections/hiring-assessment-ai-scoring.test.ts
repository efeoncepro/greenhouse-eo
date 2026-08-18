import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// TASK-1734 Slice 2 — La proyección de enqueue es LIVIANA y flag-gated: con
// HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED OFF (default en todos los runtimes) es un
// no-op honesto; ON, delega en el command idempotente. Cero provider acá (ADR D4).

const startRunMock = vi.fn()

vi.mock('@/lib/hiring/assessment/ai/scoring-run/commands', () => ({
  startAssessmentAiScoringRun: (...args: unknown[]) => startRunMock(...args),
}))

const { hiringAssessmentAiScoringProjection } = await import('./hiring-assessment-ai-scoring')

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED
})

afterEach(() => {
  delete process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED
})

describe('hiringAssessmentAiScoringProjection', () => {
  it('escucha hiring.assessment.submitted con scope por assessment exacto', () => {
    expect(hiringAssessmentAiScoringProjection.triggerEvents).toEqual(['hiring.assessment.submitted'])

    expect(hiringAssessmentAiScoringProjection.extractScope({ assessmentId: ' asmt-1 ' })).toEqual({
      entityType: 'hiring_assessment',
      entityId: 'asmt-1',
    })
    expect(hiringAssessmentAiScoringProjection.extractScope({})).toBeNull()
    expect(hiringAssessmentAiScoringProjection.extractScope({ assessmentId: 42 })).toBeNull()
  })

  it('flag OFF (default) → no-op: NO crea run ni toca la DB', async () => {
    const result = await hiringAssessmentAiScoringProjection.refresh(
      { entityType: 'hiring_assessment', entityId: 'asmt-1' },
      { assessmentId: 'asmt-1', actorUserId: 'user-1' },
    )

    expect(result).toContain('skip')
    expect(startRunMock).not.toHaveBeenCalled()
  })

  it('flag ON → delega en startAssessmentAiScoringRun (idempotente) con el actor del evento', async () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'true'
    startRunMock.mockResolvedValue({
      created: true,
      run: { runId: 'asrun-1', status: 'scoring' },
      items: [{}, {}],
    })

    const result = await hiringAssessmentAiScoringProjection.refresh(
      { entityType: 'hiring_assessment', entityId: 'asmt-1' },
      { assessmentId: 'asmt-1', actorUserId: 'user-1' },
    )

    expect(startRunMock).toHaveBeenCalledWith('asmt-1', 'user-1')
    expect(result).toContain('created')
    expect(result).toContain('asrun-1')
  })

  it('replay del evento (run ya existente) reporta existing sin duplicar', async () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'true'
    startRunMock.mockResolvedValue({
      created: false,
      run: { runId: 'asrun-1', status: 'scoring' },
      items: [],
    })

    const result = await hiringAssessmentAiScoringProjection.refresh(
      { entityType: 'hiring_assessment', entityId: 'asmt-1' },
      { assessmentId: 'asmt-1' },
    )

    expect(startRunMock).toHaveBeenCalledWith('asmt-1', null)
    expect(result).toContain('existing')
  })
})
