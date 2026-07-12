import { describe, expect, it } from 'vitest'

import {
  hashProposalAgentContext,
  validateProposalIntakeProposal,
  type ProposalAgentContext,
  type ProposalIntakeProposal
} from '../intake-agent'
import { ProposalInputError } from '../errors'

/**
 * TASK-1392 Slice 5 — EVAL FIXTURE determinista del Proposal Intake Agent Contract.
 *
 * Este fixture ES el gate para tocar el prompt/schema del agente: la validación fail-closed contra
 * el contexto allowlisted es lo que garantiza que el modelo no pueda inventar orgs, assets,
 * duplicados ni deadlines — y que "propuesta ≠ ejecución" se sostenga aunque el modelo alucine.
 */

const CONTEXT: ProposalAgentContext = {
  ownerOrgId: 'org-efeonce',
  candidateClientOrganizations: [{ organizationId: 'org-sky', name: 'SKY Airline' }],
  assetManifest: [
    { assetId: 'asset-bases', filename: 'bases.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 120_000 },
    { assetId: 'asset-planilla', filename: 'planilla.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sizeBytes: 80_000 }
  ],
  existingProposals: [{ proposalId: 'prop-existente', title: 'SKY Blog 2026', state: 'intake' }]
}

const GOLDEN: ProposalIntakeProposal = {
  clientOrganizationId: 'org-sky',
  origin: 'private_rfp',
  title: 'SKY — Gestión del blog 2026 (Wherex)',
  platform: 'Wherex',
  deadline: '2026-07-15T18:00:00Z',
  deadlineConfidence: 'ambiguous',
  deadlineAssumption: 'Las bases muestran apertura 10/07 y entrega 15/07; se asume la fecha de entrega.',
  rfpAssetIds: ['asset-bases', 'asset-planilla'],
  citedInputs: ['operatorBrief: proceso Wherex de SKY', 'assetManifest: bases.docx + planilla.xlsx']
}

describe('intake agent eval fixture (fail-closed contra el contexto)', () => {
  it('la propuesta golden valida', () => {
    expect(() => validateProposalIntakeProposal(GOLDEN, CONTEXT)).not.toThrow()
  })

  it('una org fuera del contexto RECHAZA la propuesta completa', () => {
    expect(() =>
      validateProposalIntakeProposal({ ...GOLDEN, clientOrganizationId: 'org-inventada' }, CONTEXT)
    ).toThrow(ProposalInputError)
  })

  it('un asset fuera del manifest RECHAZA', () => {
    expect(() =>
      validateProposalIntakeProposal({ ...GOLDEN, rfpAssetIds: ['asset-fabricado'] }, CONTEXT)
    ).toThrow(ProposalInputError)
  })

  it('public_tender sin oportunidad (y viceversa) RECHAZA — el enum congelado se respeta', () => {
    expect(() =>
      validateProposalIntakeProposal({ ...GOLDEN, origin: 'public_tender' }, CONTEXT)
    ).toThrow(ProposalInputError)
    expect(() =>
      validateProposalIntakeProposal({ ...GOLDEN, publicOpportunityId: 'op-123' }, CONTEXT)
    ).toThrow(ProposalInputError)
  })

  it('deadline sin confianza declarada RECHAZA (la ambigüedad se captura, no se esconde)', () => {
    expect(() =>
      validateProposalIntakeProposal({ ...GOLDEN, deadlineConfidence: undefined }, CONTEXT)
    ).toThrow(ProposalInputError)
  })

  it('un supuesto de deadline sobre fecha confirmada RECHAZA', () => {
    expect(() =>
      validateProposalIntakeProposal({ ...GOLDEN, deadlineConfidence: 'confirmed' }, CONTEXT)
    ).toThrow(ProposalInputError)
  })

  it('una propuesta sin inputs citados RECHAZA (sin fuentes no es confirmable)', () => {
    expect(() => validateProposalIntakeProposal({ ...GOLDEN, citedInputs: [] }, CONTEXT)).toThrow(
      ProposalInputError
    )
  })

  it('un duplicado citado que no existe en el contexto RECHAZA (el agente no inventa propuestas)', () => {
    expect(() =>
      validateProposalIntakeProposal({ ...GOLDEN, possibleDuplicateProposalId: 'prop-fantasma' }, CONTEXT)
    ).toThrow(ProposalInputError)

    expect(() =>
      validateProposalIntakeProposal({ ...GOLDEN, possibleDuplicateProposalId: 'prop-existente' }, CONTEXT)
    ).not.toThrow()
  })

  it('el hash del contexto es determinista (la traza es reproducible)', () => {
    expect(hashProposalAgentContext(CONTEXT)).toBe(hashProposalAgentContext({ ...CONTEXT }))
    expect(hashProposalAgentContext(CONTEXT)).toMatch(/^[0-9a-f]{64}$/)
  })
})
