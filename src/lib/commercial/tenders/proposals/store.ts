import 'server-only'

/**
 * Proposal Studio F0 — store canónico del aggregate `Proposal` (TASK-1392).
 *
 * ÚNICO write path de `greenhouse_commercial.proposals` y su historial: API, CLI, el Proposal
 * Intake Agent (vía confirmación humana) y los futuros UI/Nexa/MCP consumen ESTOS commands — nadie
 * escribe las tablas por fuera (el ADR de ownership lo prohíbe; la DB lo defiende con triggers).
 *
 * Invariantes que este módulo enforcea EN APLICACIÓN (la DB es la última defensa, no la única):
 *   - TODO read/write va scopeado por `owner_org_id` (un reader sin ese filtro es una fuga
 *     cross-tenant, no un descuido). El test `org-scope.test.ts` lo verifica mecánicamente.
 *   - Transiciones = matriz TS (`assertValidTenderStateTransition`) + gates humanos con actor
 *     member (`propose → confirm → execute`).
 *   - Gate GO (`fit_review → producing`): margen REAL de la Quote vinculada, fail-closed
 *     (`evaluateQuoteMarginGate`).
 *   - Al entrar a `packaging`, la Quote se CONGELA en snapshot inmutable (el PDF no puede mentir
 *     sobre su propio precio).
 *   - Retry no duplica: promoción pública idempotente por `public_opportunity_id`; orígenes
 *     privados por `idempotency_key`; transición idéntica repetida = no-op idempotente.
 */

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import {
  assertValidTenderStateTransition,
  requiresHumanGate,
  isTenderState,
  type TenderState
} from '../tender-state-machine'
import {
  ProposalHumanGateError,
  ProposalInputError,
  ProposalNotFoundError,
  ProposalQuoteGateError,
  ProposalQuoteMismatchError
} from './errors'
import { evaluateQuoteMarginGate, type QuoteMarginSnapshot } from './quote-gate'
import type {
  CreateProposalInput,
  ProposalActor,
  ProposalRecord,
  ProposalStateTransitionRecord,
  TransitionProposalStateInput
} from './types'

interface ProposalRow {
  // pg exige QueryResultRow (index signature); las props tipadas de abajo dominan el acceso.
  [column: string]: unknown
  proposal_id: string
  owner_org_id: string
  client_organization_id: string
  origin: ProposalRecord['origin']
  public_opportunity_id: string | null
  quote_id: string | null
  quote_snapshot_taken_at: string | null
  title: string
  platform: string | null
  state: string
  deadline: string | null
  deadline_confidence: ProposalRecord['deadlineConfidence']
  deadline_assumption: string | null
  currency: string | null
  created_by_member_id: string | null
  created_at: string
  updated_at: string
}

const PROPOSAL_COLUMNS = `proposal_id, owner_org_id, client_organization_id, origin, public_opportunity_id,
  quote_id, quote_snapshot_taken_at::text, title, platform, state, deadline::text, deadline_confidence,
  deadline_assumption, currency, created_by_member_id, created_at::text, updated_at::text`

const toRecord = (row: ProposalRow): ProposalRecord => {
  if (!isTenderState(row.state)) {
    // Imposible con el CHECK de DB; si pasa, es corrupción y debe sonar, no degradar.
    throw new ProposalInputError(`Estado desconocido en DB para ${row.proposal_id}: ${row.state}`)
  }

  return {
    proposalId: row.proposal_id,
    ownerOrgId: row.owner_org_id,
    clientOrganizationId: row.client_organization_id,
    origin: row.origin,
    publicOpportunityId: row.public_opportunity_id,
    quoteId: row.quote_id,
    quoteSnapshotTakenAt: row.quote_snapshot_taken_at,
    title: row.title,
    platform: row.platform,
    state: row.state,
    deadline: row.deadline,
    deadlineConfidence: row.deadline_confidence,
    deadlineAssumption: row.deadline_assumption,
    currency: row.currency,
    createdByMemberId: row.created_by_member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const assertActor = (actor: ProposalActor): void => {
  if (actor.kind === 'member' && !actor.memberId) {
    throw new ProposalInputError('Un actor member debe traer memberId.')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createProposal — también ES la promoción del radar (origin=public_tender)
// ─────────────────────────────────────────────────────────────────────────────

export const createProposal = async (
  input: CreateProposalInput
): Promise<{ proposal: ProposalRecord; idempotent: boolean }> => {
  assertActor(input.actor)

  if (input.title.trim().length < 3) {
    throw new ProposalInputError('El título debe tener al menos 3 caracteres.')
  }

  if ((input.origin === 'public_tender') !== Boolean(input.publicOpportunityId)) {
    throw new ProposalInputError(
      'origin=public_tender exige publicOpportunityId (la promoción del radar), y ningún otro origin lo admite.'
    )
  }

  if (input.deadline && !input.deadlineConfidence) {
    throw new ProposalInputError(
      'Un deadline exige declarar su confianza (confirmed | ambiguous): la ambigüedad se captura, no se esconde.'
    )
  }

  if (input.deadlineAssumption && input.deadlineConfidence !== 'ambiguous') {
    throw new ProposalInputError('deadlineAssumption sólo existe cuando la fecha es ambigua.')
  }

  return withGreenhousePostgresTransaction(async client => {
    // Idempotencia de retry: la MISMA promoción u la MISMA clave devuelven la fila existente.
    const existing = await client.query<ProposalRow>(
      `SELECT ${PROPOSAL_COLUMNS}
         FROM greenhouse_commercial.proposals
        WHERE owner_org_id = $1
          AND (
            ($2::text IS NOT NULL AND public_opportunity_id = $2)
            OR ($3::text IS NOT NULL AND idempotency_key = $3)
          )
        LIMIT 1`,
      [input.ownerOrgId, input.publicOpportunityId ?? null, input.idempotencyKey ?? null]
    )

    if (existing.rows[0]) {
      return { proposal: toRecord(existing.rows[0]), idempotent: true }
    }

    const inserted = await client.query<ProposalRow>(
      `INSERT INTO greenhouse_commercial.proposals
         (owner_org_id, client_organization_id, origin, public_opportunity_id, title, platform,
          deadline, deadline_confidence, deadline_assumption, currency, idempotency_key, created_by_member_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING ${PROPOSAL_COLUMNS}`,
      [
        input.ownerOrgId,
        input.clientOrganizationId,
        input.origin,
        input.publicOpportunityId ?? null,
        input.title.trim(),
        input.platform ?? null,
        input.deadline ?? null,
        input.deadline ? input.deadlineConfidence : 'none_declared',
        input.deadlineAssumption ?? null,
        input.currency ?? null,
        input.idempotencyKey ?? null,
        input.actor.memberId ?? null
      ]
    )

    const proposal = toRecord(inserted.rows[0]!)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.proposal,
        aggregateId: proposal.proposalId,
        eventType: EVENT_TYPES.proposalCreated,
        payload: {
          version: 1,
          proposalId: proposal.proposalId,
          ownerOrgId: proposal.ownerOrgId,
          clientOrganizationId: proposal.clientOrganizationId,
          origin: proposal.origin,
          publicOpportunityId: proposal.publicOpportunityId,
          state: proposal.state,
          deadline: proposal.deadline,
          actorKind: input.actor.kind
        }
      },
      client
    )

    return { proposal, idempotent: false }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// attachProposalQuote — la costura con el cotizador (pre-GO)
// ─────────────────────────────────────────────────────────────────────────────

export const attachProposalQuote = async (input: {
  ownerOrgId: string
  proposalId: string
  quoteId: string
  actor: ProposalActor
}): Promise<ProposalRecord> => {
  assertActor(input.actor)

  return withGreenhousePostgresTransaction(async client => {
    const proposal = await lockProposal(client, input.ownerOrgId, input.proposalId)

    const quote = await client.query<{ quotation_id: string; organization_id: string | null }>(
      `SELECT quotation_id, organization_id FROM greenhouse_commercial.quotations WHERE quotation_id = $1`,
      [input.quoteId]
    )

    if (!quote.rows[0]) {
      throw new ProposalQuoteMismatchError(`La cotización "${input.quoteId}" no existe.`)
    }

    // La Quote es del MISMO comprador: una económica de otra org en el PDF es la clase de error
    // que no se detecta mirando.
    if (quote.rows[0].organization_id && quote.rows[0].organization_id !== proposal.clientOrganizationId) {
      throw new ProposalQuoteMismatchError(
        `La cotización "${input.quoteId}" pertenece a otra organización: no puede vincularse a esta propuesta.`
      )
    }

    if (proposal.quoteId === input.quoteId) {
      return proposal
    }

    if (proposal.quoteSnapshotTakenAt) {
      throw new ProposalQuoteMismatchError(
        'La Quote de esta propuesta ya fue congelada en packaging: no se re-apunta (el artefacto no puede mentir sobre su precio).'
      )
    }

    const updated = await client.query<ProposalRow>(
      `UPDATE greenhouse_commercial.proposals
          SET quote_id = $3, updated_at = now()
        WHERE owner_org_id = $1 AND proposal_id = $2
        RETURNING ${PROPOSAL_COLUMNS}`,
      [input.ownerOrgId, input.proposalId, input.quoteId]
    )

    const record = toRecord(updated.rows[0]!)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.proposal,
        aggregateId: record.proposalId,
        eventType: EVENT_TYPES.proposalQuoteAttached,
        payload: {
          version: 1,
          proposalId: record.proposalId,
          ownerOrgId: record.ownerOrgId,
          quoteId: input.quoteId,
          actorKind: input.actor.kind
        }
      },
      client
    )

    return record
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// transitionProposalState — el único camino por el que el ciclo avanza
// ─────────────────────────────────────────────────────────────────────────────

const lockProposal = async (
  client: Pick<PoolClient, 'query'>,
  ownerOrgId: string,
  proposalId: string
): Promise<ProposalRecord> => {
  const result = await client.query<ProposalRow>(
    `SELECT ${PROPOSAL_COLUMNS}
       FROM greenhouse_commercial.proposals
      WHERE owner_org_id = $1 AND proposal_id = $2
      FOR UPDATE`,
    [ownerOrgId, proposalId]
  )

  if (!result.rows[0]) {
    throw new ProposalNotFoundError(proposalId)
  }

  return toRecord(result.rows[0])
}

const readQuoteMarginSnapshot = async (
  client: Pick<PoolClient, 'query'>,
  quoteId: string
): Promise<QuoteMarginSnapshot | null> => {
  const result = await client.query<{
    quotation_id: string
    status: string | null
    effective_margin_pct: string | null
    margin_floor_pct: string | null
  }>(
    `SELECT quotation_id, status, effective_margin_pct::text, margin_floor_pct::text
       FROM greenhouse_commercial.quotations
      WHERE quotation_id = $1`,
    [quoteId]
  )

  const row = result.rows[0]

  if (!row) return null

  return {
    quotationId: row.quotation_id,
    status: row.status,
    effectiveMarginPct: row.effective_margin_pct === null ? null : Number.parseFloat(row.effective_margin_pct),
    marginFloorPct: row.margin_floor_pct === null ? null : Number.parseFloat(row.margin_floor_pct)
  }
}

export const transitionProposalState = async (
  input: TransitionProposalStateInput
): Promise<{ proposal: ProposalRecord; idempotent: boolean }> => {
  assertActor(input.actor)

  if (input.reason.trim().length < 5) {
    throw new ProposalInputError('La transición exige un reason de al menos 5 caracteres.')
  }

  return withGreenhousePostgresTransaction(async client => {
    const proposal = await lockProposal(client, input.ownerOrgId, input.proposalId)
    const fromState = proposal.state

    // Retry idempotente: la transición ya ocurrió.
    if (fromState === input.toState) {
      return { proposal, idempotent: true }
    }

    assertValidTenderStateTransition(fromState, input.toState, input.proposalId)

    const humanGate = requiresHumanGate(fromState, input.toState)

    if (humanGate && (input.actor.kind !== 'member' || !input.actor.memberId)) {
      throw new ProposalHumanGateError(fromState, input.toState)
    }

    const gateMetadata: Record<string, unknown> = {}

    // Gate GO: "NUNCA un GO sin margen sobre loaded cost" — fail-closed.
    if (fromState === 'fit_review' && input.toState === 'producing') {
      const quote = proposal.quoteId ? await readQuoteMarginSnapshot(client, proposal.quoteId) : null
      const gate = evaluateQuoteMarginGate(quote)

      if (!gate.ok) {
        throw new ProposalQuoteGateError(proposal.quoteId ? gate.code : 'quote_missing', gate.message)
      }

      gateMetadata.quoteMarginGate = {
        quoteId: proposal.quoteId,
        effectiveMarginPct: gate.effectiveMarginPct,
        marginFloorPct: gate.marginFloorPct
      }
    }

    // Al ENTRAR a packaging la Quote se congela: snapshot inmutable que el artefacto renderiza.
    if (input.toState === 'packaging' && !proposal.quoteSnapshotTakenAt) {
      if (!proposal.quoteId) {
        // Irrepresentable por el CHECK post-GO, pero el command falla tipado antes que la DB.
        throw new ProposalQuoteGateError('quote_missing', 'No se puede empaquetar sin Quote vinculada.')
      }

      const frozen = await client.query<{ snapshot: unknown }>(
        `UPDATE greenhouse_commercial.proposals p
            SET quote_snapshot_json = to_jsonb(q.*),
                quote_snapshot_taken_at = now(),
                updated_at = now()
           FROM greenhouse_commercial.quotations q
          WHERE p.owner_org_id = $1 AND p.proposal_id = $2 AND q.quotation_id = p.quote_id
          RETURNING p.quote_snapshot_json AS snapshot`,
        [input.ownerOrgId, input.proposalId]
      )

      if (!frozen.rows[0]) {
        throw new ProposalQuoteGateError('quote_not_found', 'La Quote vinculada ya no existe: no se puede congelar.')
      }

      gateMetadata.quoteSnapshotFrozen = true
    }

    const updated = await client.query<ProposalRow>(
      `UPDATE greenhouse_commercial.proposals
          SET state = $3, updated_at = now()
        WHERE owner_org_id = $1 AND proposal_id = $2
        RETURNING ${PROPOSAL_COLUMNS}`,
      [input.ownerOrgId, input.proposalId, input.toState]
    )

    await client.query(
      `INSERT INTO greenhouse_commercial.proposal_state_transitions
         (proposal_id, owner_org_id, from_state, to_state, requires_human_gate, actor_kind, actor_member_id, reason, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        input.proposalId,
        input.ownerOrgId,
        fromState,
        input.toState,
        humanGate,
        input.actor.kind,
        input.actor.memberId ?? null,
        input.reason.trim(),
        JSON.stringify({ ...gateMetadata, ...(input.metadata ?? {}) })
      ]
    )

    const record = toRecord(updated.rows[0]!)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.proposal,
        aggregateId: record.proposalId,
        eventType: EVENT_TYPES.proposalStateTransitioned,
        payload: {
          version: 1,
          proposalId: record.proposalId,
          ownerOrgId: record.ownerOrgId,
          fromState,
          toState: input.toState,
          requiresHumanGate: humanGate,
          actorKind: input.actor.kind
        }
      },
      client
    )

    return { proposal: record, idempotent: false }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Readers — SIEMPRE org-scoped
// ─────────────────────────────────────────────────────────────────────────────

export const getProposalById = async (input: {
  ownerOrgId: string
  proposalId: string
}): Promise<ProposalRecord | null> => {
  const rows = await runGreenhousePostgresQuery<ProposalRow>(
    `SELECT ${PROPOSAL_COLUMNS}
       FROM greenhouse_commercial.proposals
      WHERE owner_org_id = $1 AND proposal_id = $2`,
    [input.ownerOrgId, input.proposalId]
  )

  return rows[0] ? toRecord(rows[0]) : null
}

export const listProposals = async (input: {
  ownerOrgId: string
  state?: TenderState
  limit?: number
  offset?: number
}): Promise<{ items: ProposalRecord[]; total: number }> => {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)
  const offset = Math.max(input.offset ?? 0, 0)

  const rows = await runGreenhousePostgresQuery<ProposalRow & { total: string }>(
    `SELECT ${PROPOSAL_COLUMNS}, count(*) OVER() AS total
       FROM greenhouse_commercial.proposals
      WHERE owner_org_id = $1
        AND ($2::text IS NULL OR state = $2)
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4`,
    [input.ownerOrgId, input.state ?? null, limit, offset]
  )

  return {
    items: rows.map(toRecord),
    total: rows[0] ? Number.parseInt(rows[0].total, 10) : 0
  }
}

export const listProposalTransitions = async (input: {
  ownerOrgId: string
  proposalId: string
}): Promise<ProposalStateTransitionRecord[]> => {
  const rows = await runGreenhousePostgresQuery<{
    transition_id: string
    proposal_id: string
    from_state: TenderState
    to_state: TenderState
    requires_human_gate: boolean
    actor_kind: ProposalActor['kind']
    actor_member_id: string | null
    reason: string
    created_at: string
  }>(
    `SELECT transition_id, proposal_id, from_state, to_state, requires_human_gate,
            actor_kind, actor_member_id, reason, created_at::text
       FROM greenhouse_commercial.proposal_state_transitions
      WHERE owner_org_id = $1 AND proposal_id = $2
      ORDER BY created_at ASC`,
    [input.ownerOrgId, input.proposalId]
  )

  return rows.map(row => ({
    transitionId: row.transition_id,
    proposalId: row.proposal_id,
    fromState: row.from_state,
    toState: row.to_state,
    requiresHumanGate: row.requires_human_gate,
    actorKind: row.actor_kind,
    actorMemberId: row.actor_member_id,
    reason: row.reason,
    createdAt: row.created_at
  }))
}
