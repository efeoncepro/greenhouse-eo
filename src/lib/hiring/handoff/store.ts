import 'server-only'

// TASK-356 — Store del aggregate HiringHandoff. Row mapping + readers + helpers de tx.
// Las mutaciones SOLO ocurren dentro de materialize.ts (sistema) y transition.ts (command);
// este archivo no exporta writes sueltos fuera de los helpers `withClient`.

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { HiringFulfillmentMode } from '@/types/hiring'

import type { HiringHandoff, HiringHandoffBlockedReason, HiringHandoffState } from './types'

export interface HiringHandoffRow extends Record<string, unknown> {
  hiring_handoff_id: string
  hiring_application_id: string
  opening_id: string
  decision_id: string
  identity_profile_id: string
  candidate_facet_id: string
  selected_destination: string
  state: string
  expected_legal_entity: string | null
  tentative_start_date: string | Date | null
  prerequisites_snapshot_json: unknown
  downstream_ref: string | null
  blocked_reason: string | null
  blocked_detail: string | null
  state_changed_at: string | Date
  created_at: string | Date
  updated_at: string | Date
}

export const HIRING_HANDOFF_COLUMNS = `
  hiring_handoff_id, hiring_application_id, opening_id, decision_id, identity_profile_id,
  candidate_facet_id, selected_destination, state, expected_legal_entity, tentative_start_date,
  prerequisites_snapshot_json, downstream_ref, blocked_reason, blocked_detail,
  state_changed_at, created_at, updated_at`

const toIso = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const toIsoDateOnly = (value: string | Date | null): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const normalizeHiringHandoff = (row: HiringHandoffRow): HiringHandoff => ({
  handoffId: row.hiring_handoff_id,
  applicationId: row.hiring_application_id,
  openingId: row.opening_id,
  decisionId: row.decision_id,
  identityProfileId: row.identity_profile_id,
  candidateFacetId: row.candidate_facet_id,
  selectedDestination: row.selected_destination as HiringFulfillmentMode,
  state: row.state as HiringHandoffState,
  expectedLegalEntity: row.expected_legal_entity,
  tentativeStartDate: toIsoDateOnly(row.tentative_start_date),
  prerequisitesSnapshot: isRecord(row.prerequisites_snapshot_json) ? row.prerequisites_snapshot_json : {},
  downstreamRef: row.downstream_ref,
  blockedReason: (row.blocked_reason as HiringHandoffBlockedReason | null) ?? null,
  blockedDetail: row.blocked_detail,
  stateChangedAt: toIso(row.state_changed_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
})

// ── Readers (pool compartido) ──

export const getHiringHandoffById = async (handoffId: string): Promise<HiringHandoff | null> => {
  const rows = await runGreenhousePostgresQuery<HiringHandoffRow>(
    `SELECT ${HIRING_HANDOFF_COLUMNS} FROM greenhouse_hiring.hiring_handoff WHERE hiring_handoff_id = $1 LIMIT 1`,
    [handoffId],
  )

  return rows[0] ? normalizeHiringHandoff(rows[0]) : null
}

export const getHiringHandoffByApplicationId = async (
  applicationId: string,
): Promise<HiringHandoff | null> => {
  const rows = await runGreenhousePostgresQuery<HiringHandoffRow>(
    `SELECT ${HIRING_HANDOFF_COLUMNS} FROM greenhouse_hiring.hiring_handoff WHERE hiring_application_id = $1 LIMIT 1`,
    [applicationId],
  )

  return rows[0] ? normalizeHiringHandoff(rows[0]) : null
}

// ── Helpers de tx (reciben el PoolClient de la transacción dueña) ──

export const lockHandoffByApplicationId = async (
  client: PoolClient,
  applicationId: string,
): Promise<HiringHandoffRow | null> => {
  const result = await client.query<HiringHandoffRow>(
    `SELECT ${HIRING_HANDOFF_COLUMNS} FROM greenhouse_hiring.hiring_handoff
     WHERE hiring_application_id = $1 FOR UPDATE`,
    [applicationId],
  )

  return result.rows[0] ?? null
}

export const lockHandoffById = async (
  client: PoolClient,
  handoffId: string,
): Promise<HiringHandoffRow | null> => {
  const result = await client.query<HiringHandoffRow>(
    `SELECT ${HIRING_HANDOFF_COLUMNS} FROM greenhouse_hiring.hiring_handoff
     WHERE hiring_handoff_id = $1 FOR UPDATE`,
    [handoffId],
  )

  return result.rows[0] ?? null
}

export interface InsertHandoffInput {
  applicationId: string
  openingId: string
  decisionId: string
  identityProfileId: string
  candidateFacetId: string
  selectedDestination: HiringFulfillmentMode
  state: Extract<HiringHandoffState, 'pending' | 'blocked'>
  expectedLegalEntity: string | null
  tentativeStartDate: string | null
  prerequisitesSnapshot: Record<string, unknown>
  blockedReason: HiringHandoffBlockedReason | null
  blockedDetail: string | null
}

export const insertHandoff = async (
  client: PoolClient,
  input: InsertHandoffInput,
): Promise<HiringHandoffRow> => {
  const result = await client.query<HiringHandoffRow>(
    `INSERT INTO greenhouse_hiring.hiring_handoff (
       hiring_handoff_id, hiring_application_id, opening_id, decision_id, identity_profile_id,
       candidate_facet_id, selected_destination, state, expected_legal_entity,
       tentative_start_date, prerequisites_snapshot_json, blocked_reason, blocked_detail
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
     RETURNING ${HIRING_HANDOFF_COLUMNS}`,
    [
      `hhof-${randomUUID()}`,
      input.applicationId,
      input.openingId,
      input.decisionId,
      input.identityProfileId,
      input.candidateFacetId,
      input.selectedDestination,
      input.state,
      input.expectedLegalEntity,
      input.tentativeStartDate,
      JSON.stringify(input.prerequisitesSnapshot),
      input.blockedReason,
      input.blockedDetail,
    ],
  )

  return result.rows[0]
}

export interface UpdateHandoffStateInput {
  handoffId: string
  state: HiringHandoffState
  decisionId?: string
  selectedDestination?: HiringFulfillmentMode
  expectedLegalEntity?: string | null
  tentativeStartDate?: string | null
  prerequisitesSnapshot?: Record<string, unknown>
  downstreamRef?: string | null
  blockedReason: HiringHandoffBlockedReason | null
  blockedDetail: string | null
}

export const updateHandoffState = async (
  client: PoolClient,
  input: UpdateHandoffStateInput,
): Promise<HiringHandoffRow> => {
  const sets: string[] = [
    'state = $2',
    'blocked_reason = $3',
    'blocked_detail = $4',
    'state_changed_at = NOW()',
  ]

  const values: unknown[] = [input.handoffId, input.state, input.blockedReason, input.blockedDetail]

  if (input.decisionId !== undefined) {
    values.push(input.decisionId)
    sets.push(`decision_id = $${values.length}`)
  }

  if (input.selectedDestination !== undefined) {
    values.push(input.selectedDestination)
    sets.push(`selected_destination = $${values.length}`)
  }

  if (input.expectedLegalEntity !== undefined) {
    values.push(input.expectedLegalEntity)
    sets.push(`expected_legal_entity = $${values.length}`)
  }

  if (input.tentativeStartDate !== undefined) {
    values.push(input.tentativeStartDate)
    sets.push(`tentative_start_date = $${values.length}`)
  }

  if (input.prerequisitesSnapshot !== undefined) {
    values.push(JSON.stringify(input.prerequisitesSnapshot))
    sets.push(`prerequisites_snapshot_json = $${values.length}::jsonb`)
  }

  if (input.downstreamRef !== undefined) {
    values.push(input.downstreamRef)
    sets.push(`downstream_ref = $${values.length}`)
  }

  const result = await client.query<HiringHandoffRow>(
    `UPDATE greenhouse_hiring.hiring_handoff
     SET ${sets.join(', ')}
     WHERE hiring_handoff_id = $1
     RETURNING ${HIRING_HANDOFF_COLUMNS}`,
    values,
  )

  return result.rows[0]
}

export interface AppendHandoffAuditInput {
  handoffId: string
  fromState: HiringHandoffState | null
  toState: HiringHandoffState
  decisionId: string | null
  actorUserId: string | null
  reasonCode: string | null
  reasonDetail: string | null
  downstreamRef: string | null
  openPrerequisites: Record<string, unknown>
}

export const appendHandoffAudit = async (
  client: PoolClient,
  input: AppendHandoffAuditInput,
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_hiring.hiring_handoff_audit (
       audit_id, hiring_handoff_id, from_state, to_state, decision_id, actor_user_id,
       reason_code, reason_detail, downstream_ref, open_prerequisites_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      `hhau-${randomUUID()}`,
      input.handoffId,
      input.fromState,
      input.toState,
      input.decisionId,
      input.actorUserId,
      input.reasonCode,
      input.reasonDetail,
      input.downstreamRef,
      JSON.stringify(input.openPrerequisites),
    ],
  )
}
