import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  AI_PROPOSAL_KINDS,
  AI_PROPOSAL_STATUSES,
  type AiProposal,
  type CreateAiProposalInput,
  type ListAiProposalFilters,
} from '@/types/hiring-assessment-ai'

import { HiringNotFoundError, HiringValidationError } from '../../errors'

// ── Query helper + coerción (convención autónoma por módulo, espeja assessment/store.ts) ──

const runQuery = async <T extends Record<string, unknown>>(
  client: PoolClient | null,
  text: string,
  values: unknown[],
): Promise<T[]> => {
  if (client) {
    const result = await client.query(text, values)

    return result.rows as T[]
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const str = (v: unknown): string => (v == null ? '' : String(v))
const nstr = (v: unknown): string | null => (v == null ? null : String(v))
const ts = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v))

const jsonObj = (v: unknown): Record<string, unknown> => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>

  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)

      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return {}
}

const assertEnum = <T extends string>(v: unknown, allowed: readonly T[], field: string): T => {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new HiringValidationError(`El valor de ${field} no es válido.`, 'assessment_ai_invalid_enum', 400, { field, allowed })
  }

  return v as T
}

const assertNonEmpty = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new HiringValidationError(`El campo ${field} es obligatorio.`, 'assessment_ai_field_required', 400, { field })
  }

  return v.trim()
}

// ── Row + normalizer ──

type AiProposalRow = {
  proposal_id: unknown
  kind: unknown
  target_ref: unknown
  proposed_json: unknown
  provider: unknown
  model: unknown
  prompt_version: unknown
  input_digest: unknown
  usage_json: unknown
  status: unknown
  confirmed_ref: unknown
  decision_note: unknown
  confirmed_by: unknown
  confirmed_at: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

const AI_PROPOSAL_COLS = `
  proposal_id, kind, target_ref, proposed_json, provider, model, prompt_version,
  input_digest, usage_json, status, confirmed_ref, decision_note, confirmed_by,
  confirmed_at, created_by, created_at, updated_at`

const normalizeProposal = (row: AiProposalRow): AiProposal => ({
  proposalId: str(row.proposal_id),
  kind: assertEnum(row.kind, AI_PROPOSAL_KINDS, 'kind'),
  targetRef: str(row.target_ref),
  proposed: jsonObj(row.proposed_json),
  provider: str(row.provider),
  model: str(row.model),
  promptVersion: str(row.prompt_version),
  inputDigest: nstr(row.input_digest),
  usage: jsonObj(row.usage_json),
  status: assertEnum(row.status, AI_PROPOSAL_STATUSES, 'status'),
  confirmedRef: nstr(row.confirmed_ref),
  decisionNote: nstr(row.decision_note),
  confirmedBy: nstr(row.confirmed_by),
  confirmedAt: ts(row.confirmed_at),
  createdBy: nstr(row.created_by),
  createdAt: ts(row.created_at) ?? '',
  updatedAt: ts(row.updated_at) ?? '',
})

// ══════════════════════════════════════════════════════════════════════════
// AI proposal ledger (append-only)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Persiste una propuesta IA `proposed`. Emite `hiring.assessment.ai_proposed` transaccionalmente.
 * `client` opcional para participar en una tx del caller (los propose commands corren su propia tx).
 */
export const createAiProposal = async (
  input: CreateAiProposalInput,
  actorUserId: string | null,
  client: PoolClient | null = null,
): Promise<AiProposal> => {
  const kind = assertEnum(input.kind, AI_PROPOSAL_KINDS, 'kind')
  const targetRef = assertNonEmpty(input.targetRef, 'targetRef')
  const provider = assertNonEmpty(input.provider, 'provider')
  const model = assertNonEmpty(input.model, 'model')
  const promptVersion = assertNonEmpty(input.promptVersion, 'promptVersion')

  // TASK-1383: dedupe — un propose repetido con el mismo (kind, input_digest) pendiente
  // retorna la proposal existente (no duplica la cola ni re-emite el evento).
  if (input.inputDigest) {
    const existing = await runQuery<AiProposalRow>(
      client,
      `SELECT ${AI_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_ai_proposal
       WHERE kind = $1 AND input_digest = $2 AND status = 'proposed' LIMIT 1`,
      [kind, input.inputDigest],
    )

    if (existing[0]) return normalizeProposal(existing[0])
  }

  const rows = await runQuery<AiProposalRow>(
    client,
    `INSERT INTO greenhouse_hiring.hiring_assessment_ai_proposal
       (kind, target_ref, proposed_json, provider, model, prompt_version, input_digest, usage_json, created_by)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::jsonb, $9)
     ON CONFLICT (kind, input_digest) WHERE status = 'proposed' AND input_digest IS NOT NULL
     DO NOTHING
     RETURNING ${AI_PROPOSAL_COLS}`,
    [
      kind,
      targetRef,
      JSON.stringify(input.proposed ?? {}),
      provider,
      model,
      promptVersion,
      input.inputDigest ?? null,
      JSON.stringify(input.usage ?? {}),
      actorUserId,
    ],
  )

  // Carrera perdida del ON CONFLICT: retornar la pendiente ganadora.
  if (!rows[0] && input.inputDigest) {
    const winner = await runQuery<AiProposalRow>(
      client,
      `SELECT ${AI_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_ai_proposal
       WHERE kind = $1 AND input_digest = $2 AND status = 'proposed' LIMIT 1`,
      [kind, input.inputDigest],
    )

    if (winner[0]) return normalizeProposal(winner[0])
  }

  const proposal = normalizeProposal(rows[0])

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.hiringAssessmentAiProposal,
      aggregateId: proposal.proposalId,
      eventType: EVENT_TYPES.hiringAssessmentAiProposed,
      payload: { proposalId: proposal.proposalId, kind, targetRef, provider, model, actorUserId },
    },
    client ?? undefined,
  )

  return proposal
}

/** Lee una propuesta por id (con client opcional para lock dentro de la tx de confirmación). */
export const getAiProposalById = async (
  proposalId: string,
  client: PoolClient | null = null,
): Promise<AiProposal | null> => {
  const rows = await runQuery<AiProposalRow>(
    client,
    `SELECT ${AI_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE proposal_id = $1`,
    [proposalId],
  )

  return rows.length > 0 ? normalizeProposal(rows[0]) : null
}

export const requireAiProposalById = async (
  proposalId: string,
  client: PoolClient | null = null,
): Promise<AiProposal> => {
  const proposal = await getAiProposalById(proposalId, client)

  if (!proposal) {
    throw new HiringNotFoundError('La propuesta de IA no existe.', 'assessment_ai_proposal_not_found')
  }

  return proposal
}

/** Lee + bloquea la propuesta (`FOR UPDATE`) dentro de la tx de confirmación (anti doble-confirm). */
export const lockAiProposalForUpdate = async (client: PoolClient, proposalId: string): Promise<AiProposal> => {
  const rows = await runQuery<AiProposalRow>(
    client,
    `SELECT ${AI_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE proposal_id = $1 FOR UPDATE`,
    [proposalId],
  )

  if (!rows[0]) {
    throw new HiringNotFoundError('La propuesta de IA no existe.', 'assessment_ai_proposal_not_found')
  }

  return normalizeProposal(rows[0])
}

/** Lista propuestas (cola de revisión humana). Filtros opcionales; limit clamp 1–200. */
export const listAiProposals = async (filters: ListAiProposalFilters = {}): Promise<AiProposal[]> => {
  const conditions: string[] = []
  const values: unknown[] = []

  if (filters.kind) {
    values.push(assertEnum(filters.kind, AI_PROPOSAL_KINDS, 'kind'))
    conditions.push(`kind = $${values.length}`)
  }

  if (filters.status) {
    values.push(assertEnum(filters.status, AI_PROPOSAL_STATUSES, 'status'))
    conditions.push(`status = $${values.length}`)
  }

  if (filters.targetRef) {
    values.push(filters.targetRef)
    conditions.push(`target_ref = $${values.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  const rows = await runQuery<AiProposalRow>(
    null,
    `SELECT ${AI_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_ai_proposal
     ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    values,
  )

  return rows.map(normalizeProposal)
}

/**
 * Marca una propuesta como `confirmed`|`rejected` DENTRO de la tx del confirm (client obligatorio).
 * NO aplica el efecto downstream — eso lo hace confirmAiProposal antes de llamar esto.
 */
export const markProposalDecided = async (
  client: PoolClient,
  input: { proposalId: string; status: 'confirmed' | 'rejected'; confirmedRef: string | null; decisionNote: string | null; actorUserId: string | null },
): Promise<AiProposal> => {
  const rows = await runQuery<AiProposalRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_ai_proposal
       SET status = $2, confirmed_ref = $3, decision_note = $4, confirmed_by = $5, confirmed_at = NOW()
     WHERE proposal_id = $1
     RETURNING ${AI_PROPOSAL_COLS}`,
    [input.proposalId, input.status, input.confirmedRef, input.decisionNote, input.actorUserId],
  )

  return normalizeProposal(rows[0])
}
