import 'server-only'

import type { InsightAudience, InsightRequestV1 } from '../contracts/request'
import type { InsightActor, InsightEditionState, InsightFailedPhase } from '../contracts/states'
import {
  assertValidInsightEditionTransition,
  recoveryPhaseForTransition,
  requiresInsightHumanGate
} from '../edition-state-machine'
import { InsightsHumanGateError, InsightsInputError, InsightsNotFoundError } from '../errors'
import { type InsightsDbClient, runInsightsQuery, toIso } from './db'
import type { InsightEditionRecord, InsightEditionTransitionRecord } from './records'

interface EditionRow extends Record<string, unknown> {
  edition_id: string
  report_id: string
  organization_id: string
  version: number
  audience: InsightAudience
  state: InsightEditionState
  failed_phase: InsightFailedPhase | null
  request_json: InsightRequestV1
  request_hash: string
  idempotency_key: string | null
  modules: string[]
  outputs: string[]
  period_time_zone: string
  period_start_utc: Date | string
  period_end_utc: Date | string
  supersedes_edition_id: string | null
  review_owner_user_id: string | null
  issued_at: Date | string | null
  issued_by_user_id: string | null
  issued_hash: string | null
  withdrawn_at: Date | string | null
  created_by_actor_kind: InsightEditionRecord['createdByActorKind']
  created_by_user_id: string | null
  created_by_member_id: string | null
  created_at: Date | string
  updated_at: Date | string
}

const EDITION_COLUMNS = `edition_id, report_id, organization_id, version, audience, state, failed_phase,
  request_json, request_hash, idempotency_key, modules, outputs, period_time_zone, period_start_utc,
  period_end_utc, supersedes_edition_id, review_owner_user_id, issued_at, issued_by_user_id, issued_hash,
  withdrawn_at, created_by_actor_kind, created_by_user_id, created_by_member_id, created_at, updated_at`

const mapEdition = (row: EditionRow): InsightEditionRecord => ({
  editionId: row.edition_id,
  reportId: row.report_id,
  organizationId: row.organization_id,
  version: Number(row.version),
  audience: row.audience,
  state: row.state,
  failedPhase: row.failed_phase,
  request: row.request_json,
  requestHash: row.request_hash,
  idempotencyKey: row.idempotency_key,
  modules: row.modules,
  outputs: row.outputs,
  periodTimeZone: row.period_time_zone,
  periodStartUtc: toIso(row.period_start_utc) ?? '',
  periodEndUtc: toIso(row.period_end_utc) ?? '',
  supersedesEditionId: row.supersedes_edition_id,
  reviewOwnerUserId: row.review_owner_user_id,
  issuedAt: toIso(row.issued_at),
  issuedByUserId: row.issued_by_user_id,
  issuedHash: row.issued_hash,
  withdrawnAt: toIso(row.withdrawn_at),
  createdByActorKind: row.created_by_actor_kind,
  createdByUserId: row.created_by_user_id,
  createdByMemberId: row.created_by_member_id,
  createdAt: toIso(row.created_at) ?? '',
  updatedAt: toIso(row.updated_at) ?? ''
})

interface TransitionRow extends Record<string, unknown> {
  transition_id: string
  edition_id: string
  organization_id: string
  from_state: InsightEditionState
  to_state: InsightEditionState
  requires_human_gate: boolean
  actor_kind: InsightEditionTransitionRecord['actorKind']
  actor_user_id: string | null
  actor_member_id: string | null
  reason: string
  metadata_json: Record<string, unknown>
  created_at: Date | string
}

const mapTransition = (row: TransitionRow): InsightEditionTransitionRecord => ({
  transitionId: row.transition_id,
  editionId: row.edition_id,
  organizationId: row.organization_id,
  fromState: row.from_state,
  toState: row.to_state,
  requiresHumanGate: row.requires_human_gate,
  actorKind: row.actor_kind,
  actorUserId: row.actor_user_id,
  actorMemberId: row.actor_member_id,
  reason: row.reason,
  metadata: row.metadata_json ?? {},
  createdAt: toIso(row.created_at) ?? ''
})

export interface InsertInsightEditionInput {
  reportId: string
  organizationId: string
  audience: InsightAudience
  request: InsightRequestV1
  requestHash: string
  idempotencyKey: string | null
  modules: string[]
  outputs: string[]
  periodTimeZone: string
  periodStartUtc: string
  periodEndUtc: string
  supersedesEditionId: string | null
  actor: InsightActor
}

/**
 * Inserta la siguiente versión del reporte. Exige tx + `lockInsightReport` previo: la versión
 * es MAX+1 bajo el lock del aggregate (la UNIQUE (report_id, version) es la última defensa).
 */
export const insertInsightEdition = async (
  client: InsightsDbClient,
  input: InsertInsightEditionInput
): Promise<InsightEditionRecord> => {
  if (input.modules.length === 0) throw new InsightsInputError('modules no puede estar vacío')
  if (input.outputs.length === 0) throw new InsightsInputError('outputs no puede estar vacío')

  const rows = await runInsightsQuery<EditionRow>(
    client,
    `INSERT INTO greenhouse_insights.insight_editions
       (report_id, organization_id, version, audience, request_json, request_hash, idempotency_key,
        modules, outputs, period_time_zone, period_start_utc, period_end_utc, supersedes_edition_id,
        created_by_actor_kind, created_by_user_id, created_by_member_id)
     VALUES ($1, $2,
       (SELECT COALESCE(MAX(e.version), 0) + 1 FROM greenhouse_insights.insight_editions e WHERE e.report_id = $1),
       $3, $4::jsonb, $5, $6, $7::text[], $8::text[], $9, $10::timestamptz, $11::timestamptz, $12, $13, $14, $15)
     RETURNING ${EDITION_COLUMNS}`,
    [
      input.reportId,
      input.organizationId,
      input.audience,
      JSON.stringify(input.request),
      input.requestHash,
      input.idempotencyKey,
      input.modules,
      input.outputs,
      input.periodTimeZone,
      input.periodStartUtc,
      input.periodEndUtc,
      input.supersedesEditionId,
      input.actor.kind,
      input.actor.userId,
      input.actor.memberId
    ]
  )

  return mapEdition(rows[0]!)
}

export const findInsightEditionByIdempotencyKey = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  idempotencyKey: string
): Promise<InsightEditionRecord | null> => {
  const rows = await runInsightsQuery<EditionRow>(
    client,
    `SELECT ${EDITION_COLUMNS} FROM greenhouse_insights.insight_editions
      WHERE organization_id = $1 AND idempotency_key = $2`,
    [organizationId, idempotencyKey]
  )

  return rows[0] ? mapEdition(rows[0]) : null
}

export const getInsightEditionById = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  editionId: string,
  options: { forUpdate?: boolean } = {}
): Promise<InsightEditionRecord | null> => {
  const rows = await runInsightsQuery<EditionRow>(
    client,
    `SELECT ${EDITION_COLUMNS} FROM greenhouse_insights.insight_editions
      WHERE organization_id = $1 AND edition_id = $2${options.forUpdate ? ' FOR UPDATE' : ''}`,
    [organizationId, editionId]
  )

  return rows[0] ? mapEdition(rows[0]) : null
}

export interface ListInsightEditionsInput {
  organizationId: string
  reportId?: string | null
  states?: InsightEditionState[] | null
  audience?: InsightAudience | null
  limit: number
  offset: number
}

export const listInsightEditions = async (
  client: InsightsDbClient | undefined,
  input: ListInsightEditionsInput
): Promise<{ items: InsightEditionRecord[]; total: number }> => {
  const limit = Math.min(Math.max(1, Math.floor(input.limit)), 200)
  const offset = Math.max(0, Math.floor(input.offset))

  const where = `organization_id = $1
    AND ($2::text IS NULL OR report_id = $2)
    AND ($3::text[] IS NULL OR state = ANY($3::text[]))
    AND ($4::text IS NULL OR audience = $4)`

  const params = [input.organizationId, input.reportId ?? null, input.states ?? null, input.audience ?? null]

  const [rows, totals] = await Promise.all([
    runInsightsQuery<EditionRow>(
      client,
      `SELECT ${EDITION_COLUMNS} FROM greenhouse_insights.insight_editions
        WHERE ${where}
        ORDER BY created_at DESC, edition_id COLLATE "C" DESC
        LIMIT $5 OFFSET $6`,
      [...params, limit, offset]
    ),
    runInsightsQuery<{ total: number | string }>(
      client,
      `SELECT count(*)::int AS total FROM greenhouse_insights.insight_editions WHERE ${where}`,
      params
    )
  ])

  return { items: rows.map(mapEdition), total: Number(totals[0]?.total ?? 0) }
}

export interface TransitionInsightEditionInput {
  organizationId: string
  editionId: string
  toState: InsightEditionState
  actor: InsightActor
  reason: string
  metadata?: Record<string, unknown>
  /** Cambios acoplados a la transición (issue/withdraw/review owner). */
  patch?: {
    reviewOwnerUserId?: string | null
    issued?: { byUserId: string; hash: string }
  }
}

export interface TransitionInsightEditionResult {
  edition: InsightEditionRecord
  transition: InsightEditionTransitionRecord
  idempotent: boolean
}

/**
 * Cambio de estado + historial append-only en la MISMA tx (el caller publica el outbox con el
 * mismo client). Reintentar con el estado ya alcanzado es idempotente (no duplica historial).
 */
export const transitionInsightEditionState = async (
  client: InsightsDbClient,
  input: TransitionInsightEditionInput
): Promise<TransitionInsightEditionResult> => {
  if (input.reason.trim().length < 5) throw new InsightsInputError('reason debe tener al menos 5 caracteres')

  const current = await getInsightEditionById(client, input.organizationId, input.editionId, { forUpdate: true })

  if (!current) throw new InsightsNotFoundError('edition', input.editionId)

  if (current.state === input.toState) {
    const last = await runInsightsQuery<TransitionRow>(
      client,
      `SELECT * FROM greenhouse_insights.insight_edition_transitions
        WHERE edition_id = $1 AND to_state = $2 ORDER BY created_at DESC LIMIT 1`,
      [current.editionId, input.toState]
    )

    if (last[0]) return { edition: current, transition: mapTransition(last[0]), idempotent: true }
  }

  assertValidInsightEditionTransition(current.state, input.toState, current.editionId)

  const humanGate = requiresInsightHumanGate(current.state, input.toState)

  if (humanGate && !((input.actor.kind === 'member' || input.actor.kind === 'client_user') && input.actor.userId)) {
    throw new InsightsHumanGateError(current.state, input.toState)
  }

  const failedPhase: InsightFailedPhase | null =
    input.toState === 'failed'
      ? current.state === 'collecting' || current.state === 'composing' || current.state === 'validating'
        ? current.state
        : null
      : null

  if (input.toState === 'failed' && !failedPhase) {
    throw new InsightsInputError('failed sólo se alcanza desde una fase recuperable')
  }

  const issued = input.toState === 'issued' ? input.patch?.issued ?? null : null

  if (input.toState === 'issued' && !issued) throw new InsightsInputError('issue exige byUserId + hash')

  const rows = await runInsightsQuery<EditionRow>(
    client,
    `UPDATE greenhouse_insights.insight_editions
        SET state = $3,
            failed_phase = $4,
            review_owner_user_id = COALESCE($5, review_owner_user_id),
            issued_at = CASE WHEN $6::text IS NOT NULL THEN now() ELSE issued_at END,
            issued_by_user_id = COALESCE($6, issued_by_user_id),
            issued_hash = COALESCE($7, issued_hash),
            withdrawn_at = CASE WHEN $3 = 'withdrawn' THEN now() ELSE withdrawn_at END
      WHERE organization_id = $1 AND edition_id = $2
      RETURNING ${EDITION_COLUMNS}`,
    [
      input.organizationId,
      input.editionId,
      input.toState,
      failedPhase,
      input.patch?.reviewOwnerUserId ?? null,
      issued?.byUserId ?? null,
      issued?.hash ?? null
    ]
  )

  const transitions = await runInsightsQuery<TransitionRow>(
    client,
    `INSERT INTO greenhouse_insights.insight_edition_transitions
       (edition_id, organization_id, from_state, to_state, requires_human_gate, actor_kind, actor_user_id,
        actor_member_id, reason, metadata_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING *`,
    [
      current.editionId,
      current.organizationId,
      current.state,
      input.toState,
      humanGate,
      input.actor.kind,
      input.actor.userId,
      input.actor.memberId,
      input.reason.trim(),
      JSON.stringify({
        ...(input.metadata ?? {}),
        recoveryPhase: recoveryPhaseForTransition(current.state, input.toState)
      })
    ]
  )

  return { edition: mapEdition(rows[0]!), transition: mapTransition(transitions[0]!), idempotent: false }
}

export const listInsightEditionTransitions = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  editionId: string
): Promise<InsightEditionTransitionRecord[]> => {
  const rows = await runInsightsQuery<TransitionRow>(
    client,
    `SELECT * FROM greenhouse_insights.insight_edition_transitions
      WHERE organization_id = $1 AND edition_id = $2 ORDER BY created_at ASC`,
    [organizationId, editionId]
  )

  return rows.map(mapTransition)
}
