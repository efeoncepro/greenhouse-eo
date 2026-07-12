import { describe, expect, it } from 'vitest'

import {
  computeRenderBlockers,
  hashProposalRenderAgentContext,
  validateProposalRenderProposal,
  type ProposalRenderAgentContext,
  type ProposalRenderAgentProposal
} from '../render-agent'
import { ProposalInputError } from '../errors'
import { DEFAULT_MAX_PDF_MB } from '../render-constraints'

/**
 * TASK-1391 Slice 1c — EVAL FIXTURE determinista del Proposal Render Agent Contract.
 * El gate para tocar el prompt o el schema: la validación fail-closed contra el contexto es lo
 * que garantiza que el modelo no pueda citar evidencia fuera del allowlist, cambiar el audience,
 * esconder bloqueos ni inventar jobs.
 */

const evidence = (evidenceId: string, audience: 'internal' | 'client_facing') => ({
  evidenceId,
  classification: 'measured' as const,
  audience,
  locator: 'p.4',
  method: 'cita',
  asOf: '2026-07-01',
  contentHash: 'a'.repeat(64),
  sourceAssetId: null,
  hasExternalSnapshot: true
})

const CONTEXT: ProposalRenderAgentContext = {
  ownerOrgId: 'org-efeonce',
  proposalId: 'prop-sky',
  audience: 'client_facing',
  proposal: { title: 'SKY Blog 2026', state: 'producing', deadline: '2099-01-01T00:00:00Z', deadlineConfidence: 'confirmed' },
  allowedEvidence: [evidence('ev-publica', 'client_facing')],
  requirements: [],
  constraints: {
    maxPdfMb: DEFAULT_MAX_PDF_MB,
    maxPdfMbFromRfp: false,
    maxPages: null,
    accessibilityRequired: false,
    sourceRequirementIds: []
  },
  existingJobs: [
    { renderJobId: 'prnd-viejo', artifactPurpose: 'deck', audience: 'client_facing', state: 'failed', manifestHash: 'b'.repeat(64) }
  ],
  measuredEstimate: { basis: 'no_data' }
}

const GOLDEN: ProposalRenderAgentProposal = {
  artifactPurpose: 'deck',
  audience: 'client_facing',
  outputTarget: 'pdf-merged',
  evidenceIds: ['ev-publica'],
  citedInputs: ['operatorBrief: deck final para subir a Wherex', 'allowedEvidence: ev-publica'],
  blockers: []
}

describe('render agent eval fixture (fail-closed contra el contexto)', () => {
  it('la propuesta golden valida', () => {
    expect(() => validateProposalRenderProposal(GOLDEN, CONTEXT)).not.toThrow()
  })

  it('evidencia fuera del allowlist RECHAZA la propuesta completa', () => {
    expect(() =>
      validateProposalRenderProposal({ ...GOLDEN, evidenceIds: ['ev-fantasma'] }, CONTEXT)
    ).toThrow(ProposalInputError)
  })

  it('el modelo NO puede cambiar el audience del contexto', () => {
    expect(() => validateProposalRenderProposal({ ...GOLDEN, audience: 'internal' }, CONTEXT)).toThrow(
      ProposalInputError
    )
  })

  it('ACCEPTANCE: esconder un bloqueo real (accesibilidad exigida) rechaza la propuesta', () => {
    const blocked: ProposalRenderAgentContext = {
      ...CONTEXT,
      constraints: { ...CONTEXT.constraints, accessibilityRequired: true, sourceRequirementIds: ['preq-508'] }
    }

    expect(computeRenderBlockers(blocked)).toContain('accessibility_required')

    // La propuesta que NO declara el bloqueo se rechaza:
    expect(() => validateProposalRenderProposal(GOLDEN, blocked)).toThrow(ProposalInputError)

    // La que lo declara, valida (pero la confirmación la frenará después):
    expect(() =>
      validateProposalRenderProposal({ ...GOLDEN, blockers: ['accessibility_required'] }, blocked)
    ).not.toThrow()
  })

  it('deadline vencido es bloqueo real y no puede omitirse', () => {
    const expired: ProposalRenderAgentContext = {
      ...CONTEXT,
      proposal: { ...CONTEXT.proposal, deadline: '2020-01-01T00:00:00Z' }
    }

    expect(computeRenderBlockers(expired)).toContain('deadline_expired')
    expect(() => validateProposalRenderProposal(GOLDEN, expired)).toThrow(ProposalInputError)
  })

  it('un duplicado citado que no existe en el contexto RECHAZA; uno real pasa', () => {
    expect(() =>
      validateProposalRenderProposal({ ...GOLDEN, possibleDuplicateRenderJobId: 'prnd-inventado' }, CONTEXT)
    ).toThrow(ProposalInputError)

    expect(() =>
      validateProposalRenderProposal({ ...GOLDEN, possibleDuplicateRenderJobId: 'prnd-viejo' }, CONTEXT)
    ).not.toThrow()
  })

  it('sin inputs citados RECHAZA', () => {
    expect(() => validateProposalRenderProposal({ ...GOLDEN, citedInputs: [] }, CONTEXT)).toThrow(
      ProposalInputError
    )
  })

  it('el hash del contexto es determinista', () => {
    expect(hashProposalRenderAgentContext(CONTEXT)).toBe(hashProposalRenderAgentContext({ ...CONTEXT }))
    expect(hashProposalRenderAgentContext(CONTEXT)).toMatch(/^[0-9a-f]{64}$/)
  })
})
