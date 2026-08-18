import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  OPENING_ASSESSMENT_POLICY_EVENT_TYPES,
  OPENING_ASSESSMENT_POLICY_MODES,
  OPENING_ASSESSMENT_POLICY_STATES,
  OPENING_ASSESSMENT_TRIGGER_STAGES,
  type OpeningAssessmentPolicy,
  type OpeningAssessmentPolicyEvent,
  type OpeningAssessmentPolicyEventType,
  type OpeningAssessmentPolicyMode,
  type OpeningAssessmentPolicyState,
  type OpeningAssessmentTriggerStage,
} from '@/types/hiring-assessment-policy'

import { HiringNotFoundError, HiringValidationError } from '../../errors'

// TASK-1719 Slice 1 — Store de la policy de assessment por opening (espejo del store de
// TASK-1734: insert con arbiter de índice único parcial + ON CONFLICT, lock FOR UPDATE y
// mutaciones que SIEMPRE dejan historia append-only en el event log).

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
    throw new HiringValidationError(
      `El valor de ${field} de la policy no es válido.`,
      'assessment_policy_invalid_enum',
      500,
      { field },
    )
  }

  return v as T
}

const jsonObj = (v: unknown): Record<string, unknown> => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>

  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return {}
}

// ── Rows + normalizers ──

type PolicyRow = {
  policy_id: unknown
  opening_id: unknown
  template_id: unknown
  policy_version: unknown
  mode: unknown
  state: unknown
  trigger_stage: unknown
  time_limit_minutes: unknown
  template_content_digest: unknown
  volume_cap_per_window: unknown
  volume_window_minutes: unknown
  created_by: unknown
  enabled_by: unknown
  enabled_at: unknown
  created_at: unknown
  updated_at: unknown
}

const POLICY_COLS = `
  policy_id, opening_id, template_id, policy_version, mode, state, trigger_stage,
  time_limit_minutes, template_content_digest, volume_cap_per_window, volume_window_minutes,
  created_by, enabled_by, enabled_at, created_at, updated_at`

const normalizePolicy = (row: PolicyRow): OpeningAssessmentPolicy => ({
  policyId: str(row.policy_id),
  openingId: str(row.opening_id),
  templateId: str(row.template_id),
  policyVersion: int(row.policy_version),
  mode: assertEnum(row.mode, OPENING_ASSESSMENT_POLICY_MODES, 'mode'),
  state: assertEnum(row.state, OPENING_ASSESSMENT_POLICY_STATES, 'state'),
  triggerStage:
    row.trigger_stage == null
      ? null
      : assertEnum(row.trigger_stage, OPENING_ASSESSMENT_TRIGGER_STAGES, 'trigger_stage'),
  timeLimitMinutes: row.time_limit_minutes == null ? null : int(row.time_limit_minutes),
  templateContentDigest: nstr(row.template_content_digest),
  volumeCapPerWindow: int(row.volume_cap_per_window),
  volumeWindowMinutes: int(row.volume_window_minutes),
  createdBy: nstr(row.created_by),
  enabledBy: nstr(row.enabled_by),
  enabledAt: ts(row.enabled_at),
  createdAt: ts(row.created_at) ?? '',
  updatedAt: ts(row.updated_at) ?? '',
})

type PolicyEventRow = {
  policy_event_id: unknown
  policy_id: unknown
  policy_version: unknown
  event_type: unknown
  from_state: unknown
  to_state: unknown
  reason_code: unknown
  actor_user_id: unknown
  detail_json: unknown
  created_at: unknown
}

const POLICY_EVENT_COLS = `
  policy_event_id, policy_id, policy_version, event_type, from_state, to_state,
  reason_code, actor_user_id, detail_json, created_at`

const normalizePolicyEvent = (row: PolicyEventRow): OpeningAssessmentPolicyEvent => ({
  policyEventId: str(row.policy_event_id),
  policyId: str(row.policy_id),
  policyVersion: int(row.policy_version),
  eventType: assertEnum(row.event_type, OPENING_ASSESSMENT_POLICY_EVENT_TYPES, 'event_type'),
  fromState:
    row.from_state == null ? null : assertEnum(row.from_state, OPENING_ASSESSMENT_POLICY_STATES, 'from_state'),
  toState: assertEnum(row.to_state, OPENING_ASSESSMENT_POLICY_STATES, 'to_state'),
  reasonCode: nstr(row.reason_code),
  actorUserId: nstr(row.actor_user_id),
  detail: jsonObj(row.detail_json),
  createdAt: ts(row.created_at) ?? '',
})

// ── Historia append-only ──

export const insertPolicyEvent = async (
  client: PoolClient,
  input: {
    policyId: string
    policyVersion: number
    eventType: OpeningAssessmentPolicyEventType
    fromState?: OpeningAssessmentPolicyState | null
    toState: OpeningAssessmentPolicyState
    reasonCode?: string | null
    actorUserId?: string | null
    detail?: Record<string, unknown>
  },
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_hiring.hiring_opening_assessment_policy_event
       (policy_id, policy_version, event_type, from_state, to_state, reason_code, actor_user_id, detail_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      input.policyId,
      input.policyVersion,
      input.eventType,
      input.fromState ?? null,
      input.toState,
      input.reasonCode ?? null,
      input.actorUserId ?? null,
      JSON.stringify(input.detail ?? {}),
    ],
  )
}

export const listPolicyEvents = async (
  policyId: string,
  client: PoolClient | null = null,
): Promise<OpeningAssessmentPolicyEvent[]> => {
  const rows = await runQuery<PolicyEventRow>(
    client,
    `SELECT ${POLICY_EVENT_COLS} FROM greenhouse_hiring.hiring_opening_assessment_policy_event
     WHERE policy_id = $1 ORDER BY created_at DESC, policy_event_id DESC`,
    [policyId],
  )

  return rows.map(normalizePolicyEvent)
}

// ── Policy CRUD gobernado ──

/** Policy ACTIVA (draft|enabled) de un opening — la base de "una sola policy por vacante". */
export const findActivePolicyForOpening = async (
  openingId: string,
  client: PoolClient | null = null,
): Promise<OpeningAssessmentPolicy | null> => {
  const rows = await runQuery<PolicyRow>(
    client,
    `SELECT ${POLICY_COLS} FROM greenhouse_hiring.hiring_opening_assessment_policy
     WHERE opening_id = $1 AND state <> 'disabled' LIMIT 1`,
    [openingId],
  )

  return rows[0] ? normalizePolicy(rows[0]) : null
}

export const getPolicyById = async (
  policyId: string,
  client: PoolClient | null = null,
): Promise<OpeningAssessmentPolicy | null> => {
  const rows = await runQuery<PolicyRow>(
    client,
    `SELECT ${POLICY_COLS} FROM greenhouse_hiring.hiring_opening_assessment_policy WHERE policy_id = $1`,
    [policyId],
  )

  return rows[0] ? normalizePolicy(rows[0]) : null
}

/** Lee + bloquea la policy (`FOR UPDATE`) dentro de la tx del command (anti doble-transición). */
export const lockPolicyForUpdate = async (
  client: PoolClient,
  policyId: string,
): Promise<OpeningAssessmentPolicy> => {
  const rows = await runQuery<PolicyRow>(
    client,
    `SELECT ${POLICY_COLS} FROM greenhouse_hiring.hiring_opening_assessment_policy
     WHERE policy_id = $1 FOR UPDATE`,
    [policyId],
  )

  if (!rows[0]) {
    throw new HiringNotFoundError('La policy de evaluación no existe.', 'assessment_policy_not_found')
  }

  return normalizePolicy(rows[0])
}

export interface InsertPolicyInput {
  openingId: string
  templateId: string
  mode: OpeningAssessmentPolicyMode
  triggerStage: OpeningAssessmentTriggerStage | null
  timeLimitMinutes: number | null
  volumeCapPerWindow?: number | null
  volumeWindowMinutes?: number | null
  createdBy: string | null
}

/**
 * Inserta la policy `draft`. Carrera del índice único parcial (dos configuraciones
 * concurrentes del mismo opening) → devuelve la ganadora con `created=false`, SIN excepción:
 * la carrera no es un error, es un resultado tipado (patrón `createScoringRun`).
 */
export const insertPolicy = async (
  client: PoolClient,
  input: InsertPolicyInput,
): Promise<{ policy: OpeningAssessmentPolicy; created: boolean }> => {
  const rows = await runQuery<PolicyRow>(
    client,
    `INSERT INTO greenhouse_hiring.hiring_opening_assessment_policy
       (opening_id, template_id, mode, trigger_stage, time_limit_minutes,
        volume_cap_per_window, volume_window_minutes, created_by)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 3), COALESCE($7, 60), $8)
     ON CONFLICT (opening_id) WHERE state <> 'disabled'
     DO NOTHING
     RETURNING ${POLICY_COLS}`,
    [
      input.openingId,
      input.templateId,
      input.mode,
      input.triggerStage,
      input.timeLimitMinutes,
      input.volumeCapPerWindow ?? null,
      input.volumeWindowMinutes ?? null,
      input.createdBy,
    ],
  )

  if (rows[0]) {
    return { policy: normalizePolicy(rows[0]), created: true }
  }

  const winner = await findActivePolicyForOpening(input.openingId, client)

  if (!winner) {
    throw new HiringValidationError(
      'No se pudo registrar la policy de evaluación.',
      'assessment_policy_conflict',
      409,
    )
  }

  return { policy: winner, created: false }
}

export interface UpdatePolicyConfigInput {
  templateId: string
  mode: OpeningAssessmentPolicyMode
  triggerStage: OpeningAssessmentTriggerStage | null
  timeLimitMinutes: number | null
  volumeCapPerWindow?: number | null
  volumeWindowMinutes?: number | null
}

/**
 * Reconfigura la policy e incrementa `policy_version`. Reconfigurar SIEMPRE devuelve la
 * policy a `draft` + limpia el digest/enabled: cambiar la plantilla o la etapa trigger no
 * puede heredar en silencio una habilitación concedida sobre otro contenido (D5.1).
 */
export const updatePolicyConfig = async (
  client: PoolClient,
  policyId: string,
  input: UpdatePolicyConfigInput,
): Promise<OpeningAssessmentPolicy> => {
  const rows = await runQuery<PolicyRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_opening_assessment_policy
       SET template_id = $2,
           mode = $3,
           trigger_stage = $4,
           time_limit_minutes = $5,
           volume_cap_per_window = COALESCE($6, volume_cap_per_window),
           volume_window_minutes = COALESCE($7, volume_window_minutes),
           policy_version = policy_version + 1,
           state = 'draft',
           template_content_digest = NULL,
           enabled_by = NULL,
           enabled_at = NULL,
           updated_at = NOW()
     WHERE policy_id = $1
     RETURNING ${POLICY_COLS}`,
    [
      policyId,
      input.templateId,
      input.mode,
      input.triggerStage,
      input.timeLimitMinutes,
      input.volumeCapPerWindow ?? null,
      input.volumeWindowMinutes ?? null,
    ],
  )

  if (!rows[0]) {
    throw new HiringNotFoundError('La policy de evaluación no existe.', 'assessment_policy_not_found')
  }

  return normalizePolicy(rows[0])
}

/** Marca la policy `enabled` con el digest de contenido OBSERVADO en ese momento (D4). */
export const markPolicyEnabled = async (
  client: PoolClient,
  policyId: string,
  input: { templateContentDigest: string; enabledBy: string | null },
): Promise<OpeningAssessmentPolicy> => {
  const rows = await runQuery<PolicyRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_opening_assessment_policy
       SET state = 'enabled',
           template_content_digest = $2,
           enabled_by = $3,
           enabled_at = NOW(),
           updated_at = NOW()
     WHERE policy_id = $1
     RETURNING ${POLICY_COLS}`,
    [policyId, input.templateContentDigest, input.enabledBy],
  )

  if (!rows[0]) {
    throw new HiringNotFoundError('La policy de evaluación no existe.', 'assessment_policy_not_found')
  }

  return normalizePolicy(rows[0])
}

/** Kill switch: deja la policy `disabled` (nunca DELETE — la fila queda como histórico). */
export const markPolicyDisabled = async (
  client: PoolClient,
  policyId: string,
): Promise<OpeningAssessmentPolicy> => {
  const rows = await runQuery<PolicyRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_opening_assessment_policy
       SET state = 'disabled', updated_at = NOW()
     WHERE policy_id = $1
     RETURNING ${POLICY_COLS}`,
    [policyId],
  )

  if (!rows[0]) {
    throw new HiringNotFoundError('La policy de evaluación no existe.', 'assessment_policy_not_found')
  }

  return normalizePolicy(rows[0])
}
