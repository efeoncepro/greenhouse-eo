import 'server-only'

// TASK-770 — Store del hiring_activation_request. Mutaciones SOLO dentro de service.ts
// (helpers de tx con PoolClient); readers sobre el pool compartido.

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type {
  HiringActivationBlockedReason,
  HiringActivationMemberOutcome,
  HiringActivationRequest,
  HiringActivationState,
} from './types'

export interface HiringActivationRequestRow extends Record<string, unknown> {
  activation_request_id: string
  hiring_handoff_id: string
  hiring_application_id: string
  identity_profile_id: string
  candidate_facet_id: string
  member_id: string | null
  member_outcome: string | null
  onboarding_instance_id: string | null
  onboarding_case_id: string | null
  state: string
  blocked_reason: string | null
  blocked_detail: string | null
  state_changed_at: string | Date
  created_by_user_id: string | null
  created_at: string | Date
  updated_at: string | Date
}

export const HIRING_ACTIVATION_COLUMNS = `
  activation_request_id, hiring_handoff_id, hiring_application_id, identity_profile_id,
  candidate_facet_id, member_id, member_outcome, onboarding_instance_id, onboarding_case_id,
  state, blocked_reason, blocked_detail, state_changed_at, created_by_user_id, created_at, updated_at`

const toIso = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

export const normalizeActivationRequest = (row: HiringActivationRequestRow): HiringActivationRequest => ({
  activationRequestId: row.activation_request_id,
  hiringHandoffId: row.hiring_handoff_id,
  hiringApplicationId: row.hiring_application_id,
  identityProfileId: row.identity_profile_id,
  candidateFacetId: row.candidate_facet_id,
  memberId: row.member_id,
  memberOutcome: (row.member_outcome as HiringActivationMemberOutcome | null) ?? null,
  onboardingInstanceId: row.onboarding_instance_id,
  onboardingCaseId: row.onboarding_case_id,
  state: row.state as HiringActivationState,
  blockedReason: (row.blocked_reason as HiringActivationBlockedReason | null) ?? null,
  blockedDetail: row.blocked_detail,
  stateChangedAt: toIso(row.state_changed_at),
  createdByUserId: row.created_by_user_id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
})

// ── Readers (pool compartido) ──

export const getActivationRequestByHandoffId = async (
  hiringHandoffId: string,
): Promise<HiringActivationRequest | null> => {
  const rows = await runGreenhousePostgresQuery<HiringActivationRequestRow>(
    `SELECT ${HIRING_ACTIVATION_COLUMNS} FROM greenhouse_hr.hiring_activation_request
     WHERE hiring_handoff_id = $1 LIMIT 1`,
    [hiringHandoffId],
  )

  return rows[0] ? normalizeActivationRequest(rows[0]) : null
}

// ── Helpers de tx ──

export const lockActivationRequestByHandoffId = async (
  client: PoolClient,
  hiringHandoffId: string,
): Promise<HiringActivationRequestRow | null> => {
  const result = await client.query<HiringActivationRequestRow>(
    `SELECT ${HIRING_ACTIVATION_COLUMNS} FROM greenhouse_hr.hiring_activation_request
     WHERE hiring_handoff_id = $1 FOR UPDATE`,
    [hiringHandoffId],
  )

  return result.rows[0] ?? null
}

export interface InsertActivationRequestInput {
  hiringHandoffId: string
  hiringApplicationId: string
  identityProfileId: string
  candidateFacetId: string
  createdByUserId: string | null
}

export const insertActivationRequest = async (
  client: PoolClient,
  input: InsertActivationRequestInput,
): Promise<HiringActivationRequestRow> => {
  const result = await client.query<HiringActivationRequestRow>(
    `INSERT INTO greenhouse_hr.hiring_activation_request (
       activation_request_id, hiring_handoff_id, hiring_application_id,
       identity_profile_id, candidate_facet_id, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (hiring_handoff_id) DO NOTHING
     RETURNING ${HIRING_ACTIVATION_COLUMNS}`,
    [
      `hact-${randomUUID()}`,
      input.hiringHandoffId,
      input.hiringApplicationId,
      input.identityProfileId,
      input.candidateFacetId,
      input.createdByUserId,
    ],
  )

  if (result.rows[0]) return result.rows[0]

  // Carrera perdida: otro claim insertó primero — lock y retorna el existente.
  const existing = await lockActivationRequestByHandoffId(client, input.hiringHandoffId)

  if (!existing) {
    throw new Error('hiring_activation_request claim race sin fila resultante')
  }

  return existing
}

export interface UpdateActivationRequestInput {
  activationRequestId: string
  state: HiringActivationState
  memberId?: string
  memberOutcome?: HiringActivationMemberOutcome
  onboardingInstanceId?: string | null
  onboardingCaseId?: string | null
  blockedReason: HiringActivationBlockedReason | null
  blockedDetail: string | null
}

export const updateActivationRequestState = async (
  client: PoolClient,
  input: UpdateActivationRequestInput,
): Promise<HiringActivationRequestRow> => {
  const sets = ['state = $2', 'blocked_reason = $3', 'blocked_detail = $4', 'state_changed_at = NOW()']
  const values: unknown[] = [input.activationRequestId, input.state, input.blockedReason, input.blockedDetail]

  if (input.memberId !== undefined) {
    values.push(input.memberId)
    sets.push(`member_id = $${values.length}`)
  }

  if (input.memberOutcome !== undefined) {
    values.push(input.memberOutcome)
    sets.push(`member_outcome = $${values.length}`)
  }

  if (input.onboardingInstanceId !== undefined) {
    values.push(input.onboardingInstanceId)
    sets.push(`onboarding_instance_id = $${values.length}`)
  }

  if (input.onboardingCaseId !== undefined) {
    values.push(input.onboardingCaseId)
    sets.push(`onboarding_case_id = $${values.length}`)
  }

  const result = await client.query<HiringActivationRequestRow>(
    `UPDATE greenhouse_hr.hiring_activation_request
     SET ${sets.join(', ')}
     WHERE activation_request_id = $1
     RETURNING ${HIRING_ACTIVATION_COLUMNS}`,
    values,
  )

  return result.rows[0]
}

export interface AppendActivationEventInput {
  activationRequestId: string
  fromState: HiringActivationState | null
  toState: HiringActivationState
  actorUserId: string | null
  reasonCode: string | null
  reasonDetail: string | null
  memberId?: string | null
  onboardingInstanceId?: string | null
  onboardingCaseId?: string | null
  metadata?: Record<string, unknown>
}

export const appendActivationEvent = async (
  client: PoolClient,
  input: AppendActivationEventInput,
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_hr.hiring_activation_request_events (
       event_id, activation_request_id, from_state, to_state, actor_user_id,
       reason_code, reason_detail, member_id, onboarding_instance_id, onboarding_case_id, metadata_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
    [
      `hace-${randomUUID()}`,
      input.activationRequestId,
      input.fromState,
      input.toState,
      input.actorUserId,
      input.reasonCode,
      input.reasonDetail,
      input.memberId ?? null,
      input.onboardingInstanceId ?? null,
      input.onboardingCaseId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  )
}
