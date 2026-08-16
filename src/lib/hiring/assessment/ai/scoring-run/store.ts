import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  AI_SCORING_RISK_CLASSES,
  AI_SCORING_RUN_ITEM_STATUSES,
  AI_SCORING_RUN_STATUSES,
  type AiScoringRiskClass,
  type AiScoringRun,
  type AiScoringRunItem,
  type AiScoringRunItemStatus,
  type AiScoringRunStatus,
} from '@/types/hiring-assessment-ai-run'

import { HiringNotFoundError, HiringValidationError } from '../../../errors'
import { resolveItemTransition, resolveRunTransition } from './state'

// TASK-1734 Slice 1 — Store del run aggregate (espejo del dossier-ai/store de TASK-1735):
// insert con arbiter de índice único parcial + ON CONFLICT, lock FOR UPDATE y transiciones
// terminal-safe que SIEMPRE dejan historia append-only en run_event.

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
const int = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0)

const assertEnum = <T extends string>(v: unknown, allowed: readonly T[], field: string): T => {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new HiringValidationError(`El valor de ${field} no es válido.`, 'assessment_ai_run_invalid_enum', 500, { field })
  }

  return v as T
}

// ── Rows + normalizers ──

type RunRow = {
  run_id: unknown
  assessment_id: unknown
  application_id: unknown
  input_digest: unknown
  model: unknown
  prompt_version: unknown
  policy_version: unknown
  status: unknown
  status_reason: unknown
  lease_owner: unknown
  lease_expires_at: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

const RUN_COLS = `
  run_id, assessment_id, application_id, input_digest, model, prompt_version,
  policy_version, status, status_reason, lease_owner, lease_expires_at,
  created_by, created_at, updated_at`

const normalizeRun = (row: RunRow): AiScoringRun => ({
  runId: str(row.run_id),
  assessmentId: str(row.assessment_id),
  applicationId: str(row.application_id),
  inputDigest: str(row.input_digest),
  model: str(row.model),
  promptVersion: str(row.prompt_version),
  policyVersion: str(row.policy_version),
  status: assertEnum(row.status, AI_SCORING_RUN_STATUSES, 'status'),
  statusReason: nstr(row.status_reason),
  leaseOwner: nstr(row.lease_owner),
  leaseExpiresAt: ts(row.lease_expires_at),
  createdBy: nstr(row.created_by),
  createdAt: ts(row.created_at) ?? '',
  updatedAt: ts(row.updated_at) ?? '',
})

type RunItemRow = {
  run_item_id: unknown
  run_id: unknown
  assessment_id: unknown
  application_id: unknown
  response_id: unknown
  proposal_id: unknown
  input_digest: unknown
  status: unknown
  risk_class: unknown
  reason_code: unknown
  routing_reasons: unknown
  attempt_count: unknown
  created_at: unknown
  updated_at: unknown
}

const RUN_ITEM_COLS = `
  run_item_id, run_id, assessment_id, application_id, response_id, proposal_id,
  input_digest, status, risk_class, reason_code, routing_reasons, attempt_count, created_at, updated_at`

const strArray = (v: unknown): string[] => {
  const parsed = typeof v === 'string' ? (() => { try { return JSON.parse(v) } catch { return [] } })() : v

  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
}

const normalizeRunItem = (row: RunItemRow): AiScoringRunItem => ({
  runItemId: str(row.run_item_id),
  runId: str(row.run_id),
  assessmentId: str(row.assessment_id),
  applicationId: str(row.application_id),
  responseId: str(row.response_id),
  proposalId: nstr(row.proposal_id),
  inputDigest: nstr(row.input_digest),
  status: assertEnum(row.status, AI_SCORING_RUN_ITEM_STATUSES, 'status'),
  riskClass: row.risk_class == null ? null : assertEnum(row.risk_class, AI_SCORING_RISK_CLASSES, 'risk_class'),
  reasonCode: nstr(row.reason_code),
  routingReasons: strArray(row.routing_reasons),
  attemptCount: int(row.attempt_count),
  createdAt: ts(row.created_at) ?? '',
  updatedAt: ts(row.updated_at) ?? '',
})

// ── Historia append-only ──

export const insertRunEvent = async (
  client: PoolClient,
  input: {
    runId: string
    runItemId?: string | null
    eventType: 'run_transition' | 'item_transition' | 'reconciliation'
    fromStatus?: string | null
    toStatus?: string | null
    reasonCode?: string | null
    actorUserId?: string | null
    detail?: Record<string, unknown>
  },
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_hiring.hiring_assessment_ai_scoring_run_event
       (run_id, run_item_id, event_type, from_status, to_status, reason_code, actor_user_id, detail_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      input.runId,
      input.runItemId ?? null,
      input.eventType,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      input.reasonCode ?? null,
      input.actorUserId ?? null,
      JSON.stringify(input.detail ?? {}),
    ],
  )
}

// ── Run CRUD gobernado ──

/** Run ACTIVO (no terminal) por (assessment, digest) — la base de la idempotencia D1. */
export const findActiveScoringRun = async (
  assessmentId: string,
  inputDigest: string,
  client: PoolClient | null = null,
): Promise<AiScoringRun | null> => {
  const rows = await runQuery<RunRow>(
    client,
    `SELECT ${RUN_COLS} FROM greenhouse_hiring.hiring_assessment_ai_scoring_run
     WHERE assessment_id = $1 AND input_digest = $2
       AND status NOT IN ('confirmed', 'cancelled', 'failed')
     LIMIT 1`,
    [assessmentId, inputDigest],
  )

  return rows[0] ? normalizeRun(rows[0]) : null
}

export interface CreateScoringRunInput {
  assessmentId: string
  applicationId: string
  inputDigest: string
  model: string
  promptVersion: string
  policyVersion: string
  createdBy: string | null
}

/**
 * Inserta el run `created`. Carrera del índice único parcial (dos submits/replays
 * concurrentes) → devuelve el run activo ganador con `created=false`; el caller NO
 * re-enumera items ni re-emite el evento en ese caso.
 */
export const createScoringRun = async (
  client: PoolClient,
  input: CreateScoringRunInput,
): Promise<{ run: AiScoringRun; created: boolean }> => {
  const rows = await runQuery<RunRow>(
    client,
    `INSERT INTO greenhouse_hiring.hiring_assessment_ai_scoring_run
       (assessment_id, application_id, input_digest, model, prompt_version, policy_version, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (assessment_id, input_digest) WHERE status NOT IN ('confirmed', 'cancelled', 'failed')
     DO NOTHING
     RETURNING ${RUN_COLS}`,
    [
      input.assessmentId,
      input.applicationId,
      input.inputDigest,
      input.model,
      input.promptVersion,
      input.policyVersion,
      input.createdBy,
    ],
  )

  if (rows[0]) {
    return { run: normalizeRun(rows[0]), created: true }
  }

  const winner = await findActiveScoringRun(input.assessmentId, input.inputDigest, client)

  if (!winner) {
    throw new HiringValidationError(
      'No se pudo registrar el run de scoring.',
      'assessment_ai_run_conflict',
      409,
    )
  }

  return { run: winner, created: false }
}

export const getScoringRunById = async (
  runId: string,
  client: PoolClient | null = null,
): Promise<AiScoringRun | null> => {
  const rows = await runQuery<RunRow>(
    client,
    `SELECT ${RUN_COLS} FROM greenhouse_hiring.hiring_assessment_ai_scoring_run WHERE run_id = $1`,
    [runId],
  )

  return rows[0] ? normalizeRun(rows[0]) : null
}

/** Runs de un assessment EXACTO (reader scoped, nunca lista global). */
export const listScoringRunsForAssessment = async (
  assessmentId: string,
  client: PoolClient | null = null,
): Promise<AiScoringRun[]> => {
  const rows = await runQuery<RunRow>(
    client,
    `SELECT ${RUN_COLS} FROM greenhouse_hiring.hiring_assessment_ai_scoring_run
     WHERE assessment_id = $1 ORDER BY created_at DESC`,
    [assessmentId],
  )

  return rows.map(normalizeRun)
}

/** Lee + bloquea el run (`FOR UPDATE`) dentro de la tx del command (anti doble-transición). */
export const lockScoringRunForUpdate = async (client: PoolClient, runId: string): Promise<AiScoringRun> => {
  const rows = await runQuery<RunRow>(
    client,
    `SELECT ${RUN_COLS} FROM greenhouse_hiring.hiring_assessment_ai_scoring_run
     WHERE run_id = $1 FOR UPDATE`,
    [runId],
  )

  if (!rows[0]) {
    throw new HiringNotFoundError('El run de scoring no existe.', 'assessment_ai_run_not_found')
  }

  return normalizeRun(rows[0])
}

/**
 * Transición terminal-safe del run: valida contra la state machine pura y deja historia
 * append-only en la MISMA tx. `apply=false` (mismo terminal) → no-op idempotente.
 */
export const transitionScoringRun = async (
  client: PoolClient,
  run: AiScoringRun,
  target: AiScoringRunStatus,
  opts: { reasonCode?: string | null; actorUserId?: string | null } = {},
): Promise<AiScoringRun> => {
  const transition = resolveRunTransition(run.status, target)

  if (!transition.apply) return run

  const rows = await runQuery<RunRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_ai_scoring_run
       SET status = $2, status_reason = $3, updated_at = NOW()
     WHERE run_id = $1
     RETURNING ${RUN_COLS}`,
    [run.runId, transition.next, opts.reasonCode ?? null],
  )

  await insertRunEvent(client, {
    runId: run.runId,
    eventType: 'run_transition',
    fromStatus: run.status,
    toStatus: transition.next,
    reasonCode: opts.reasonCode ?? null,
    actorUserId: opts.actorUserId ?? null,
  })

  return normalizeRun(rows[0])
}

// ── Items ──

export const insertRunItems = async (
  client: PoolClient,
  run: AiScoringRun,
  responseIds: string[],
): Promise<AiScoringRunItem[]> => {
  if (responseIds.length === 0) return []

  const rows = await runQuery<RunItemRow>(
    client,
    `INSERT INTO greenhouse_hiring.hiring_assessment_ai_scoring_run_item
       (run_id, assessment_id, application_id, response_id)
     SELECT $1, $2, $3, unnest($4::text[])
     ON CONFLICT (run_id, response_id) DO NOTHING
     RETURNING ${RUN_ITEM_COLS}`,
    [run.runId, run.assessmentId, run.applicationId, responseIds],
  )

  return rows.map(normalizeRunItem)
}

export const listRunItems = async (
  runId: string,
  client: PoolClient | null = null,
): Promise<AiScoringRunItem[]> => {
  const rows = await runQuery<RunItemRow>(
    client,
    `SELECT ${RUN_ITEM_COLS} FROM greenhouse_hiring.hiring_assessment_ai_scoring_run_item
     WHERE run_id = $1 ORDER BY created_at, run_item_id`,
    [runId],
  )

  return rows.map(normalizeRunItem)
}

/**
 * Transición terminal-safe de un item + historia. El caller pasa el item YA leído bajo
 * el lock del run (los items se mueven solo dentro de una tx que tiene el run bloqueado).
 */
export const transitionRunItem = async (
  client: PoolClient,
  item: AiScoringRunItem,
  target: AiScoringRunItemStatus,
  opts: {
    reasonCode?: string | null
    actorUserId?: string | null
    proposalId?: string | null
    riskClass?: AiScoringRiskClass | null
    /** Reason codes estables del risk router (Slice 2); null = conservar los existentes. */
    routingReasons?: string[] | null
    /** Intentos de provider consumidos por esta transición (suma a attempt_count). */
    attemptDelta?: number
  } = {},
): Promise<AiScoringRunItem> => {
  const transition = resolveItemTransition(item.status, target)

  if (!transition.apply) return item

  const rows = await runQuery<RunItemRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_ai_scoring_run_item
       SET status = $2, reason_code = $3,
           proposal_id = COALESCE($4, proposal_id),
           risk_class = COALESCE($5, risk_class),
           routing_reasons = COALESCE($6::jsonb, routing_reasons),
           attempt_count = attempt_count + $7,
           updated_at = NOW()
     WHERE run_item_id = $1
     RETURNING ${RUN_ITEM_COLS}`,
    [
      item.runItemId,
      transition.next,
      opts.reasonCode ?? null,
      opts.proposalId ?? null,
      opts.riskClass ?? null,
      opts.routingReasons ? JSON.stringify(opts.routingReasons) : null,
      Math.max(0, Math.floor(opts.attemptDelta ?? 0)),
    ],
  )

  await insertRunEvent(client, {
    runId: item.runId,
    runItemId: item.runItemId,
    eventType: 'item_transition',
    fromStatus: item.status,
    toStatus: transition.next,
    reasonCode: opts.reasonCode ?? null,
    actorUserId: opts.actorUserId ?? null,
    detail: opts.routingReasons ? { routingReasons: opts.routingReasons } : undefined,
  })

  return normalizeRunItem(rows[0])
}

// ── Lease del run (drain claim atómico — patrón conditional-UPDATE TASK-1664) ──

/** Run IDs reclamables por el drain: no terminales de scoring con lease libre o vencida. */
export const listClaimableScoringRunIds = async (limit: number): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ run_id: unknown }>(
    `SELECT run_id FROM greenhouse_hiring.hiring_assessment_ai_scoring_run
     WHERE status IN ('enumerating', 'scoring')
       AND (lease_owner IS NULL OR lease_expires_at IS NULL OR lease_expires_at < NOW())
     ORDER BY created_at
     LIMIT $1`,
    [Math.max(1, Math.floor(limit))],
  )

  return rows.map(r => str(r.run_id))
}

/**
 * Claim atómico del run por lease: UN UPDATE condicional es el lock (el segundo drain
 * concurrente matchea cero filas y recibe `null` — nunca dos drains sobre el mismo run).
 */
export const claimScoringRunLease = async (
  runId: string,
  leaseOwner: string,
  leaseSeconds: number,
): Promise<AiScoringRun | null> => {
  const rows = await runGreenhousePostgresQuery<RunRow>(
    `UPDATE greenhouse_hiring.hiring_assessment_ai_scoring_run
       SET lease_owner = $2,
           lease_expires_at = NOW() + make_interval(secs => $3),
           updated_at = NOW()
     WHERE run_id = $1
       AND status IN ('enumerating', 'scoring')
       AND (lease_owner IS NULL OR lease_expires_at IS NULL OR lease_expires_at < NOW())
     RETURNING ${RUN_COLS}`,
    [runId, leaseOwner, Math.max(1, Math.floor(leaseSeconds))],
  )

  return rows[0] ? normalizeRun(rows[0]) : null
}

/** Libera la lease SOLO si sigue siendo del owner (un drain nunca pisa la lease ajena). */
export const releaseScoringRunLease = async (
  runId: string,
  leaseOwner: string,
  client: PoolClient | null = null,
): Promise<void> => {
  await runQuery(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_ai_scoring_run
       SET lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW()
     WHERE run_id = $1 AND lease_owner = $2`,
    [runId, leaseOwner],
  )
}
