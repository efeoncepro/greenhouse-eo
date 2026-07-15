import 'server-only'

/**
 * Proposal Studio F0 — intake de RFP, deliverables, evidencia y requisitos (TASK-1392 Slice 3).
 *
 * El binario vive SIEMPRE en el asset store canónico (`greenhouse-assets`): scan/quarantine,
 * ownership, retention y audit no son opcionales para documentos comerciales confidenciales. Este
 * módulo agrega la capa SEMÁNTICA del dominio: el vínculo `proposal_assets`
 * (kind/status/audience/version) y los registros inmutables de evidencia y requisitos.
 *
 * Audience por defecto SEGURO: interno salvo los 3 kinds client-facing (técnica · económica ·
 * deck). El default nunca promueve material interno al comprador — eso exige declaración explícita.
 */

import crypto from 'node:crypto'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { attachAssetToAggregate, getAssetById } from '@/lib/storage/greenhouse-assets'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import { ProposalInputError, ProposalNotFoundError } from './errors'
import type {
  ProposalActor,
  ProposalAssetKind,
  ProposalAudience,
  ProposalEvidenceClassification,
  ProposalRequirementKind
} from './types'

/** Los ÚNICOS kinds que por defecto cruzan al comprador. Todo lo demás nace interno. */
const CLIENT_FACING_DEFAULT_KINDS: ReadonlySet<ProposalAssetKind> = new Set([
  'technical_offer',
  'economic_offer',
  'deck'
])

export const defaultAudienceForKind = (kind: ProposalAssetKind): ProposalAudience =>
  CLIENT_FACING_DEFAULT_KINDS.has(kind) ? 'client_facing' : 'internal'

/** El RFP y sus anexos entran por el contexto de input; los outputs por el de deliverable. */
const assetContextForKind = (kind: ProposalAssetKind): 'proposal_rfp' | 'proposal_deliverable' =>
  kind === 'rfp_source' || kind === 'fillable_template' ? 'proposal_rfp' : 'proposal_deliverable'

const assertProposalExists = async (
  client: { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
  ownerOrgId: string,
  proposalId: string
): Promise<void> => {
  const found = await client.query(
    `SELECT 1 FROM greenhouse_commercial.proposals WHERE owner_org_id = $1 AND proposal_id = $2 FOR UPDATE`,
    [ownerOrgId, proposalId]
  )

  if (!found.rows[0]) {
    throw new ProposalNotFoundError(proposalId)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// attachProposalAsset — ingesta de RFP (kind=rfp_source) y registro de deliverables
// ─────────────────────────────────────────────────────────────────────────────

export interface AttachProposalAssetInput {
  ownerOrgId: string
  proposalId: string
  /** Asset ya subido al store canónico (draft escaneado). */
  assetId: string
  kind: ProposalAssetKind
  /** Sin declarar ⇒ default SEGURO por kind (interno salvo técnica/económica/deck). */
  audience?: ProposalAudience
  actorUserId: string
  actor: ProposalActor
}

export const attachProposalAsset = async (
  input: AttachProposalAssetInput
): Promise<{ proposalAssetId: string; audience: ProposalAudience; version: number; idempotent: boolean }> => {
  const audience = input.audience ?? defaultAudienceForKind(input.kind)
  const context = assetContextForKind(input.kind)

  const asset = await getAssetById(input.assetId)

  if (!asset) {
    throw new ProposalInputError(`El asset "${input.assetId}" no existe en el store canónico.`)
  }

  return withGreenhousePostgresTransaction(async client => {
    await assertProposalExists(client, input.ownerOrgId, input.proposalId)

    // Idempotencia del attach: el vínculo ya existe → no-op.
    const existing = await client.query<{ proposal_asset_id: string; audience: ProposalAudience; version: number }>(
      `SELECT proposal_asset_id, audience, version FROM greenhouse_commercial.proposal_assets
        WHERE owner_org_id = $1 AND proposal_id = $2 AND asset_id = $3`,
      [input.ownerOrgId, input.proposalId, input.assetId]
    )

    if (existing.rows[0]) {
      return {
        proposalAssetId: existing.rows[0].proposal_asset_id,
        audience: existing.rows[0].audience,
        version: existing.rows[0].version,
        idempotent: true
      }
    }

    // El attach canónico del store: enforcea el SCAN GATE (proposal_rfp/proposal_deliverable están
    // en SCAN_REQUIRED_ATTACH_CONTEXTS — sin veredicto limpio, esto lanza y NADA se vincula).
    if (asset.status === 'pending') {
      await attachAssetToAggregate({
        assetId: input.assetId,
        ownerAggregateType: context,
        ownerAggregateId: input.proposalId,
        actorUserId: input.actorUserId,
        client
      })
    } else if (asset.ownerAggregateType !== context || asset.ownerAggregateId !== input.proposalId) {
      // Un asset ya adjuntado a OTRO aggregate no se re-adjunta a una propuesta: el scope de un
      // documento comercial no se comparte entre dominios.
      throw new ProposalInputError(
        `El asset "${input.assetId}" ya pertenece a otro aggregate (${asset.ownerAggregateType ?? 'desconocido'}): no puede vincularse a esta propuesta.`
      )
    }

    // La versión se DERIVA de la historia (MAX+1 por proposal+kind), nunca del caller — misma bug
    // class que los ordinales del composer: un número autorado se contradice al reordenar/reintentar.
    // El FOR UPDATE de assertProposalExists serializa los attach concurrentes de la misma proposal,
    // y el índice único (proposal_id, kind, version) es el cinturón si algo se le escapa al lock.
    const inserted = await client.query<{ proposal_asset_id: string; version: number }>(
      `INSERT INTO greenhouse_commercial.proposal_assets
         (proposal_id, owner_org_id, asset_id, kind, audience, version, created_by_member_id)
       VALUES ($1, $2, $3, $4, $5,
         COALESCE((SELECT MAX(version) FROM greenhouse_commercial.proposal_assets
                    WHERE proposal_id = $1 AND kind = $4), 0) + 1,
         $6)
       RETURNING proposal_asset_id, version`,
      [
        input.proposalId,
        input.ownerOrgId,
        input.assetId,
        input.kind,
        audience,
        input.actor.memberId ?? null
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.proposal,
        aggregateId: input.proposalId,
        eventType: EVENT_TYPES.proposalRfpIngested,
        payload: {
          version: 1,
          proposalId: input.proposalId,
          ownerOrgId: input.ownerOrgId,
          proposalAssetId: inserted.rows[0]!.proposal_asset_id,
          assetId: input.assetId,
          kind: input.kind,
          audience,
          actorKind: input.actor.kind
        }
      },
      client
    )

    return { proposalAssetId: inserted.rows[0]!.proposal_asset_id, audience, version: inserted.rows[0]!.version, idempotent: false }
  })
}

/** Alias semántico del intake: el RFP fuente entra como `rfp_source` (siempre interno). */
export const ingestProposalRfp = async (
  input: Omit<AttachProposalAssetInput, 'kind' | 'audience'>
): Promise<{ proposalAssetId: string; idempotent: boolean }> => {
  const result = await attachProposalAsset({ ...input, kind: 'rfp_source' })

  return { proposalAssetId: result.proposalAssetId, idempotent: result.idempotent }
}

// ─────────────────────────────────────────────────────────────────────────────
// recordProposalEvidence — el registro inmutable que sostiene cada claim
// ─────────────────────────────────────────────────────────────────────────────

export interface RecordProposalEvidenceInput {
  ownerOrgId: string
  proposalId: string
  /** EXACTAMENTE una fuente: asset vinculado a ESTA propuesta, o snapshot externo congelado. */
  sourceAssetId?: string
  externalSourceSnapshot?: Record<string, unknown>
  /** Dónde vive el dato dentro de la fuente (página/tabla/campo/runId). */
  locator: string
  /** Cómo se obtuvo (grader run, medición GA4, cita textual del RFP…). */
  method: string
  asOf: string
  classification: ProposalEvidenceClassification
  /** NO opcional ni derivable: se declara al registrar (la fuga de audience es la amenaza #1). */
  audience: ProposalAudience
  actor: ProposalActor
}

export const recordProposalEvidence = async (
  input: RecordProposalEvidenceInput
): Promise<{ evidenceId: string; contentHash: string }> => {
  const hasAsset = Boolean(input.sourceAssetId)
  const hasSnapshot = Boolean(input.externalSourceSnapshot)

  if (hasAsset === hasSnapshot) {
    throw new ProposalInputError(
      'La evidencia lleva EXACTAMENTE una fuente: sourceAssetId (asset del store) O externalSourceSnapshot (medición congelada).'
    )
  }

  if (input.locator.trim().length < 3 || input.method.trim().length < 3) {
    throw new ProposalInputError('locator y method son obligatorios (≥3 caracteres): sin procedencia no hay evidencia.')
  }

  // El hash sella el CONTENIDO de la referencia: fuente + locator + método + as-of. Un replay
  // puede verificar que nadie sustituyó la evidencia después de registrada.
  const contentHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        sourceAssetId: input.sourceAssetId ?? null,
        externalSourceSnapshot: input.externalSourceSnapshot ?? null,
        locator: input.locator.trim(),
        method: input.method.trim(),
        asOf: input.asOf,
        classification: input.classification
      })
    )
    .digest('hex')

  return withGreenhousePostgresTransaction(async client => {
    await assertProposalExists(client, input.ownerOrgId, input.proposalId)

    if (input.sourceAssetId) {
      // La fuente-asset debe estar VINCULADA a esta propuesta (no cualquier asset del store).
      const linked = await client.query(
        `SELECT 1 FROM greenhouse_commercial.proposal_assets
          WHERE owner_org_id = $1 AND proposal_id = $2 AND asset_id = $3`,
        [input.ownerOrgId, input.proposalId, input.sourceAssetId]
      )

      if (!linked.rows[0]) {
        throw new ProposalInputError(
          `El asset "${input.sourceAssetId}" no está vinculado a esta propuesta: la evidencia referencia fuentes de la propuesta, no del store global.`
        )
      }
    }

    const inserted = await client.query<{ evidence_id: string }>(
      `INSERT INTO greenhouse_commercial.proposal_evidence
         (proposal_id, owner_org_id, source_asset_id, external_source_snapshot, locator, method,
          as_of, classification, audience, content_hash, created_by_member_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING evidence_id`,
      [
        input.proposalId,
        input.ownerOrgId,
        input.sourceAssetId ?? null,
        input.externalSourceSnapshot ? JSON.stringify(input.externalSourceSnapshot) : null,
        input.locator.trim(),
        input.method.trim(),
        input.asOf,
        input.classification,
        input.audience,
        contentHash,
        input.actor.memberId ?? null
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.proposal,
        aggregateId: input.proposalId,
        eventType: EVENT_TYPES.proposalEvidenceRecorded,
        payload: {
          version: 1,
          proposalId: input.proposalId,
          ownerOrgId: input.ownerOrgId,
          evidenceId: inserted.rows[0]!.evidence_id,
          classification: input.classification,
          audience: input.audience,
          // NUNCA el contenido: sólo ids/clasificación (el snapshot puede llevar dato comercial).
          hasSourceAsset: Boolean(input.sourceAssetId),
          actorKind: input.actor.kind
        }
      },
      client
    )

    return { evidenceId: inserted.rows[0]!.evidence_id, contentHash }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// declareProposalRequirement — el requisito-set mínimo (command humano hasta F1)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeclareProposalRequirementInput {
  ownerOrgId: string
  proposalId: string
  requirementKind: ProposalRequirementKind
  /** Literal del RFP (evidencia, no paráfrasis). */
  label: string
  value?: string
  weight?: number
  sourceLocator?: string
  sourceAssetId?: string
  isBlocking?: boolean
  requiresHumanAttestation?: boolean
  actor: ProposalActor
}

export const declareProposalRequirement = async (
  input: DeclareProposalRequirementInput
): Promise<{ requirementId: string }> => {
  if (input.label.trim().length < 3) {
    throw new ProposalInputError('El requisito exige el literal del RFP (label ≥3 caracteres).')
  }

  if (input.weight !== undefined && input.requirementKind !== 'puntua') {
    throw new ProposalInputError('weight sólo aplica a requisitos que puntúan.')
  }

  return withGreenhousePostgresTransaction(async client => {
    await assertProposalExists(client, input.ownerOrgId, input.proposalId)

    const inserted = await client.query<{ requirement_id: string }>(
      `INSERT INTO greenhouse_commercial.proposal_requirements
         (proposal_id, owner_org_id, requirement_kind, label, value, weight, source_locator,
          source_asset_id, is_blocking, requires_human_attestation, created_by_member_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING requirement_id`,
      [
        input.proposalId,
        input.ownerOrgId,
        input.requirementKind,
        input.label.trim(),
        input.value ?? null,
        input.weight ?? null,
        input.sourceLocator ?? null,
        input.sourceAssetId ?? null,
        input.isBlocking ?? false,
        input.requiresHumanAttestation ?? false,
        input.actor.memberId ?? null
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.proposal,
        aggregateId: input.proposalId,
        eventType: EVENT_TYPES.proposalRequirementDeclared,
        payload: {
          version: 1,
          proposalId: input.proposalId,
          ownerOrgId: input.ownerOrgId,
          requirementId: inserted.rows[0]!.requirement_id,
          requirementKind: input.requirementKind,
          isBlocking: input.isBlocking ?? false,
          actorKind: input.actor.kind
        }
      },
      client
    )

    return { requirementId: inserted.rows[0]!.requirement_id }
  })
}
