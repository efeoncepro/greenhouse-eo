import 'server-only'

/**
 * Proposal Studio F0 — proyección ALLOWLISTED para autoría/render (TASK-1392 Slice 6).
 *
 * ESTE ES EL CONTRATO QUE TASK-1391 (renderer) Y LA AUTORÍA F1 CONSUMEN. La capa de render nunca
 * toca DB/storage directo: recibe esta proyección y nada más. Por construcción NO contiene:
 *   - contenido de RFP crudo (sólo metadata del vínculo asset: id/kind/audience/version),
 *   - costos internos ni el quote snapshot (el precio final entra por otro seam, ya gateado),
 *   - `external_source_snapshot` (puede llevar dato comercial: se proyecta sólo su EXISTENCIA),
 *   - prompts, URLs privadas ni handles de storage.
 *
 * Regla raíz de audience (acceptance test del task): un artefacto `client_facing` que referencie
 * UNA SOLA evidencia `internal` FALLA CERRADO (`assertEvidenceAllowedForAudience`). El filtro del
 * reader ya excluye lo interno de la proyección client_facing; el assert existe porque el render
 * valida las REFERENCIAS del artefacto, no confía en que el autor haya filtrado bien.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { ProposalAudienceError, ProposalNotFoundError } from './errors'
import type {
  ProposalAudience,
  ProposalAssetKind,
  ProposalAssetStatus,
  ProposalEvidenceClassification,
  ProposalRequirementKind
} from './types'

/** Metadata mínima de un asset vinculado — nunca el binario ni una URL de storage. */
export interface ProposalRenderAssetRef {
  proposalAssetId: string
  assetId: string
  kind: ProposalAssetKind
  audience: ProposalAudience
  status: ProposalAssetStatus
  version: number
}

/** Referencia de evidencia permitida: lo que un claim del artefacto puede citar. */
export interface ProposalRenderEvidenceRef {
  evidenceId: string
  classification: ProposalEvidenceClassification
  audience: ProposalAudience
  locator: string
  method: string
  asOf: string
  contentHash: string
  /** Id del asset fuente vinculado a ESTA propuesta (si la fuente es asset). */
  sourceAssetId: string | null
  /** La fuente externa existe pero su contenido NO se proyecta. */
  hasExternalSnapshot: boolean
}

export interface ProposalRenderRequirementRef {
  requirementId: string
  requirementKind: ProposalRequirementKind
  label: string
  value: string | null
  weight: number | null
  sourceLocator: string | null
  isBlocking: boolean
  requiresHumanAttestation: boolean
}

export interface ProposalRenderProjection {
  proposalId: string
  ownerOrgId: string
  /** Audience objetivo de la proyección: define qué evidencia entra al allowlist. */
  audience: ProposalAudience
  title: string
  origin: string
  state: string
  deadline: string | null
  deadlineConfidence: string
  assets: ProposalRenderAssetRef[]
  /** SOLO evidencia permitida para el audience objetivo. */
  allowedEvidence: ProposalRenderEvidenceRef[]
  requirements: ProposalRenderRequirementRef[]
  projectedAt: string
}

/**
 * Construye la proyección allowlisted de una propuesta para un audience objetivo.
 *
 * - `audience='internal'` → toda la evidencia (interna + client_facing): la autoría interna ve todo.
 * - `audience='client_facing'` → SOLO evidencia declarada client_facing. Lo interno ni siquiera
 *   aparece como id: no existe para esa proyección.
 */
export const buildProposalRenderProjection = async (input: {
  ownerOrgId: string
  proposalId: string
  audience: ProposalAudience
}): Promise<ProposalRenderProjection> => {
  const proposals = await runGreenhousePostgresQuery<{
    proposal_id: string
    owner_org_id: string
    title: string
    origin: string
    state: string
    deadline: string | null
    deadline_confidence: string
  }>(
    `SELECT proposal_id, owner_org_id, title, origin, state,
            deadline::text AS deadline, deadline_confidence
       FROM greenhouse_commercial.proposals
      WHERE owner_org_id = $1 AND proposal_id = $2`,
    [input.ownerOrgId, input.proposalId]
  )

  const proposal = proposals[0]

  if (!proposal) {
    throw new ProposalNotFoundError(input.proposalId)
  }

  const [assets, evidence, requirements] = await Promise.all([
    runGreenhousePostgresQuery<{
      proposal_asset_id: string
      asset_id: string
      kind: ProposalAssetKind
      audience: ProposalAudience
      status: ProposalAssetStatus
      version: number
    }>(
      `SELECT proposal_asset_id, asset_id, kind, audience, status, version
         FROM greenhouse_commercial.proposal_assets
        WHERE owner_org_id = $1 AND proposal_id = $2
          AND ($3 = 'internal' OR audience = 'client_facing')
        ORDER BY created_at`,
      [input.ownerOrgId, input.proposalId, input.audience]
    ),
    runGreenhousePostgresQuery<{
      evidence_id: string
      classification: ProposalEvidenceClassification
      audience: ProposalAudience
      locator: string
      method: string
      as_of: string
      content_hash: string
      source_asset_id: string | null
      has_external_snapshot: boolean
    }>(
      `SELECT evidence_id, classification, audience, locator, method,
              as_of::text AS as_of, content_hash, source_asset_id,
              (external_source_snapshot IS NOT NULL) AS has_external_snapshot
         FROM greenhouse_commercial.proposal_evidence
        WHERE owner_org_id = $1 AND proposal_id = $2
          AND ($3 = 'internal' OR audience = 'client_facing')
        ORDER BY created_at`,
      [input.ownerOrgId, input.proposalId, input.audience]
    ),
    runGreenhousePostgresQuery<{
      requirement_id: string
      requirement_kind: ProposalRequirementKind
      label: string
      value: string | null
      weight: number | null
      source_locator: string | null
      is_blocking: boolean
      requires_human_attestation: boolean
    }>(
      `SELECT requirement_id, requirement_kind, label, value, weight,
              source_locator, is_blocking, requires_human_attestation
         FROM greenhouse_commercial.proposal_requirements
        WHERE owner_org_id = $1 AND proposal_id = $2
        ORDER BY created_at`,
      [input.ownerOrgId, input.proposalId]
    )
  ])

  return {
    proposalId: proposal.proposal_id,
    ownerOrgId: proposal.owner_org_id,
    audience: input.audience,
    title: proposal.title,
    origin: proposal.origin,
    state: proposal.state,
    deadline: proposal.deadline,
    deadlineConfidence: proposal.deadline_confidence,
    assets: assets.map(a => ({
      proposalAssetId: a.proposal_asset_id,
      assetId: a.asset_id,
      kind: a.kind,
      audience: a.audience,
      status: a.status,
      version: Number(a.version)
    })),
    allowedEvidence: evidence.map(e => ({
      evidenceId: e.evidence_id,
      classification: e.classification,
      audience: e.audience,
      locator: e.locator,
      method: e.method,
      asOf: e.as_of,
      contentHash: e.content_hash,
      sourceAssetId: e.source_asset_id,
      hasExternalSnapshot: e.has_external_snapshot
    })),
    requirements: requirements.map(r => ({
      requirementId: r.requirement_id,
      requirementKind: r.requirement_kind,
      label: r.label,
      value: r.value,
      weight: r.weight === null ? null : Number(r.weight),
      sourceLocator: r.source_locator,
      isBlocking: r.is_blocking,
      requiresHumanAttestation: r.requires_human_attestation
    })),
    projectedAt: new Date().toISOString()
  }
}

/**
 * Gate FAIL-CLOSED de audience para un artefacto (pura, testeable sin DB).
 *
 * El render/autoría llama esto con las referencias de evidencia que el artefacto cita. Reglas:
 *   1. Toda referencia debe existir en el allowlist de la proyección — un id fuera del allowlist
 *      RECHAZA el artefacto completo (una evidencia inventada o interna no "se omite": aborta).
 *   2. En un artefacto `client_facing`, UNA SOLA evidencia `internal` rechaza todo (defensa en
 *      profundidad: el filtro del reader ya la excluyó, pero el assert no confía en el autor).
 */
export const assertEvidenceAllowedForAudience = (
  projection: Pick<ProposalRenderProjection, 'audience' | 'allowedEvidence'>,
  referencedEvidenceIds: readonly string[],
  artifactAudience: ProposalAudience
): void => {
  if (artifactAudience === 'client_facing' && projection.audience !== 'client_facing') {
    throw new ProposalAudienceError(
      'Un artefacto client_facing sólo se construye desde una proyección client_facing: la proyección interna contiene evidencia que el comprador no puede ver.'
    )
  }

  const allowed = new Map(projection.allowedEvidence.map(e => [e.evidenceId, e]))

  for (const evidenceId of referencedEvidenceIds) {
    const entry = allowed.get(evidenceId)

    if (!entry) {
      throw new ProposalAudienceError(
        `La evidencia "${evidenceId}" no está en el allowlist de la proyección: el artefacto se rechaza completo (fail-closed).`
      )
    }

    if (artifactAudience === 'client_facing' && entry.audience !== 'client_facing') {
      throw new ProposalAudienceError(
        `La evidencia "${evidenceId}" es internal: un artefacto client_facing con una sola evidencia interna se rechaza completo.`
      )
    }
  }
}
