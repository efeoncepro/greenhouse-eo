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

    await expect(autoProposeEvaluationDossier('happ-1', { propose })).resolves.toEqual({ outcome: 'disabled' })
    expect(propose).not.toHaveBeenCalled()
  })

  it('creates an operator-only proposal with a traceable system actor when the CV is ready', async () => {
    process.env.HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED = 'true'
    const propose = vi.fn().mockResolvedValue({ proposalId: 'hdp-1' })

    await expect(autoProposeEvaluationDossier('happ-1', { propose })).resolves.toEqual({
      outcome: 'proposed',
      proposalId: 'hdp-1',
    })
    expect(propose).toHaveBeenCalledWith('happ-1', HIRING_DOSSIER_AUTO_PROPOSE_ACTOR)
  })
})
