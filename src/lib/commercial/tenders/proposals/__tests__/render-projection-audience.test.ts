import { describe, expect, it } from 'vitest'

import { assertEvidenceAllowedForAudience, type ProposalRenderEvidenceRef } from '../render-projection'
import { ProposalAudienceError } from '../errors'

/**
 * TASK-1392 acceptance test (Delta b): "un artefacto client_facing con UNA SOLA evidencia internal
 * FALLA CERRADO". Este gate es lo que TASK-1391 invoca antes de renderizar cualquier artefacto.
 */

const evidence = (evidenceId: string, audience: 'internal' | 'client_facing'): ProposalRenderEvidenceRef => ({
  evidenceId,
  classification: 'measured',
  audience,
  locator: 'p.4 tabla 2',
  method: 'cita textual del RFP',
  asOf: '2026-07-01',
  contentHash: 'a'.repeat(64),
  sourceAssetId: null,
  hasExternalSnapshot: true
})

const INTERNAL_PROJECTION = {
  audience: 'internal' as const,
  allowedEvidence: [evidence('ev-publica', 'client_facing'), evidence('ev-interna', 'internal')]
}

const CLIENT_PROJECTION = {
  audience: 'client_facing' as const,
  allowedEvidence: [evidence('ev-publica', 'client_facing')]
}

describe('assertEvidenceAllowedForAudience (fail-closed)', () => {
  it('un artefacto client_facing con evidencia toda client_facing pasa', () => {
    expect(() =>
      assertEvidenceAllowedForAudience(CLIENT_PROJECTION, ['ev-publica'], 'client_facing')
    ).not.toThrow()
  })

  it('ACCEPTANCE: un artefacto client_facing con UNA SOLA evidencia internal falla cerrado', () => {
    // Desde la proyección interna (que sí contiene la evidencia interna en su allowlist):
    expect(() =>
      assertEvidenceAllowedForAudience(INTERNAL_PROJECTION, ['ev-publica', 'ev-interna'], 'client_facing')
    ).toThrow(ProposalAudienceError)

    // Desde la proyección client_facing (donde lo interno ni existe): mismo rechazo, vía allowlist.
    expect(() =>
      assertEvidenceAllowedForAudience(CLIENT_PROJECTION, ['ev-publica', 'ev-interna'], 'client_facing')
    ).toThrow(ProposalAudienceError)
  })

  it('una referencia fuera del allowlist rechaza el artefacto completo (evidencia inventada)', () => {
    expect(() =>
      assertEvidenceAllowedForAudience(INTERNAL_PROJECTION, ['ev-fantasma'], 'internal')
    ).toThrow(ProposalAudienceError)
  })

  it('un artefacto client_facing NO se construye desde una proyección internal aunque cite solo evidencia pública', () => {
    expect(() =>
      assertEvidenceAllowedForAudience(INTERNAL_PROJECTION, ['ev-publica'], 'client_facing')
    ).toThrow(ProposalAudienceError)
  })

  it('un artefacto internal puede citar evidencia interna y pública', () => {
    expect(() =>
      assertEvidenceAllowedForAudience(INTERNAL_PROJECTION, ['ev-publica', 'ev-interna'], 'internal')
    ).not.toThrow()
  })
})
