import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  HIRING_DOSSIER_AUTO_PROPOSE_ACTOR,
  autoProposeEvaluationDossier,
} from './auto-propose'

afterEach(() => {
  delete process.env.HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED
})

describe('autoProposeEvaluationDossier', () => {
  it('does not call the provider path while the worker gate is off', async () => {
    const propose = vi.fn()
    const hasScoredAssessment = vi.fn()

    await expect(autoProposeEvaluationDossier('happ-1', { propose, hasScoredAssessment })).resolves.toEqual({ outcome: 'disabled' })
    expect(propose).not.toHaveBeenCalled()
    expect(hasScoredAssessment).not.toHaveBeenCalled()
  })

  it('waits without provider cost until the application has a scored assessment', async () => {
    process.env.HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED = 'true'
    const propose = vi.fn()
    const hasScoredAssessment = vi.fn().mockResolvedValue(false)

    await expect(autoProposeEvaluationDossier('happ-1', { propose, hasScoredAssessment })).resolves.toEqual({
      outcome: 'waiting_for_assessment',
    })
    expect(propose).not.toHaveBeenCalled()
  })

  it('creates an operator-only proposal when the CV and scored assessment are ready', async () => {
    process.env.HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED = 'true'
    const propose = vi.fn().mockResolvedValue({ proposalId: 'hdp-1' })
    const hasScoredAssessment = vi.fn().mockResolvedValue(true)

    await expect(autoProposeEvaluationDossier('happ-1', { propose, hasScoredAssessment })).resolves.toEqual({
      outcome: 'proposed',
      proposalId: 'hdp-1',
    })
    expect(propose).toHaveBeenCalledWith('happ-1', HIRING_DOSSIER_AUTO_PROPOSE_ACTOR)
  })
})
