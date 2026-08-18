import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  ASSESSMENT_ASSIGNMENT_PROPOSAL_STATUSES,
  ASSESSMENT_ASSIGNMENT_TRIGGERS,
  OPENING_ASSESSMENT_POLICY_MODES,
  type AssessmentAssignmentPreview,
  type AssessmentAssignmentProposal,
  type AssessmentAssignmentProposalStatus,
  type AssessmentAssignmentReasonCode,
} from '@/types/hiring-assessment-policy'

import { HiringNotFoundError, HiringValidationError } from '../../errors'

// TASK-1719 Slice 2 — Ledger de propuestas de asignación (espejo del proposal-store del
// dossier, TASK-1735): insert con arbiter del índice único parcial + `ON CONFLICT DO NOTHING
// RETURNING` + re-lectura de la ganadora, lock `FOR UPDATE` en el confirm y transición
// terminal-once. La base sólo concede UPDATE de (status, confirmed_by, confirmed_at,
// assignment_id, updated_at): el contenido propuesto es INMUTABLE, así que ningún writer de
// acá intenta reescribir `preview_json`, `effect_digest`, `policy_version` ni `proposed_by`.

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

const normalizePreview = (raw: unknown): AssessmentAssignmentPreview => {
  const obj = jsonObj(raw)
  const mode = str(obj.mode)
  const triggerStage = str(obj.triggerStage)

  return {
    openingTitle: nstr(obj.openingTitle),
    templateName: nstr(obj.templateName),
    templateVersion: obj.templateVersion == null ? null : int(obj.templateVersion),
    policyVersion: int(obj.policyVersion),
    mode: OPENING_ASSESSMENT_POLICY_MODES.includes(mode as never) ? (mode as AssessmentAssignmentPreview['mode']) : 'manual',
    triggerStage: ASSESSMENT_ASSIGNMENT_TRIGGERS.includes(triggerStage as never)
      ? (triggerStage as AssessmentAssignmentPreview['triggerStage'])
      : 'manual',
    timeLimitMinutes: obj.timeLimitMinutes == null ? null : int(obj.timeLimitMinutes),
    recipientReady: obj.recipientReady === true,
    existingOpenAssessment: obj.existingOpenAssessment === true,
    existingScoredAssessment: obj.existingScoredAssessment === true,
    blockingReasonCode: (nstr(obj.blockingReasonCode) as AssessmentAssignmentReasonCode | null) ?? null,
  }
}

type ProposalRow = {
  proposal_id: unknown
  application_id: unknown
  policy_id: unknown
  policy_version: unknown
  effect_digest: unknown
  preview_json: unknown
  status: unknown
  proposed_by: unknown
  confirmed_by: unknown
  assignment_id: unknown
  expires_at: unknown
  confirmed_at: unknown
  created_at: unknown
  updated_at: unknown
}

const PROPOSAL_COLS = `
  proposal_id, application_id, policy_id, policy_version, effect_digest, preview_json,
  status, proposed_by, confirmed_by, assignment_id, expires_at, confirmed_at,
  created_at, updated_at`

const normalizeProposal = (row: ProposalRow): AssessmentAssignmentProposal => {
  const status = str(row.status) as AssessmentAssignmentProposalStatus

  if (!ASSESSMENT_ASSIGNMENT_PROPOSAL_STATUSES.includes(status)) {
    throw new HiringValidationError(
      'El estado de la propuesta de asignación no es válido.',
      'assessment_assignment_proposal_invalid_status',
      500,
    )
  }

  return {
    proposalId: str(row.proposal_id),
    applicationId: str(row.application_id),
    policyId: str(row.policy_id),
    policyVersion: int(row.policy_version),
    effectDigest: str(row.effect_digest),
    preview: normalizePreview(row.preview_json),
    status,
    proposedBy: str(row.proposed_by),
    confirmedBy: nstr(row.confirmed_by),
    assignmentId: nstr(row.assignment_id),
    expiresAt: ts(row.expires_at) ?? '',
    confirmedAt: ts(row.confirmed_at),
    createdAt: ts(row.created_at) ?? '',
    updatedAt: ts(row.updated_at) ?? '',
  }
}

/**
 * ¿Esta propuesta ya no sirve para confirmar? FAIL-CLOSED: una fecha imparseable se trata como
 * vencida. Misma regla que el guard del confirm (`confirm-assignment.ts`) — si las dos mitades
 * discreparan, `propose` devolvería una propuesta que `confirm` rechaza siempre.
 */
const isProposalExpired = (proposal: AssessmentAssignmentProposal): boolean => {
  const expiresAt = Date.parse(proposal.expiresAt)

  return !Number.isFinite(expiresAt) || expiresAt <= Date.now()
}

/**
 * Fila `proposed` de (application, digest) SIN mirar el vencimiento. Es la fila que el índice
 * único parcial considera para la colisión — o sea, el arbiter del `ON CONFLICT`. Sólo la usa
 * `createAssignmentProposal` para resolver la carrera; ningún caller de negocio la consume.
 */
const findProposedRowIgnoringExpiry = async (
  applicationId: string,
  effectDigest: string,
  client: PoolClient | null = null,
): Promise<AssessmentAssignmentProposal | null> => {
  const rows = await runQuery<ProposalRow>(
    client,
    `SELECT ${PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_assignment_proposal
     WHERE application_id = $1 AND effect_digest = $2 AND status = 'proposed' LIMIT 1`,
    [applicationId, effectDigest],
  )

  return rows[0] ? normalizeProposal(rows[0]) : null
}

/**
 * Propuesta `proposed` **y todavía vigente** por (application, digest) — la base de la
 * idempotencia.
 *
 * ⚠️ El filtro de vencimiento es load-bearing. Sin él, pasados los 30 minutos de TTL `propose`
 * devolvía la propuesta muerta y `confirm` la rechazaba con 409 `..._expired`: el primer intento
 * de asignar SIEMPRE fallaba y el operador tenía que reintentar sin entender por qué. El estado
 * terminal se escribe en `createAssignmentProposal`, que es quien tiene la tx.
 */
export const findActiveAssignmentProposal = async (
  applicationId: string,
  effectDigest: string,
  client: PoolClient | null = null,
): Promise<AssessmentAssignmentProposal | null> => {
  const proposal = await findProposedRowIgnoringExpiry(applicationId, effectDigest, client)

  return proposal && !isProposalExpired(proposal) ? proposal : null
}

export interface CreateAssignmentProposalInput {
  applicationId: string
  policyId: string
  policyVersion: number
  effectDigest: string
  preview: AssessmentAssignmentPreview
  proposedBy: string
  expiresAt: Date
}

/**
 * Inserta la propuesta `proposed`. Carrera del índice único parcial (dos operadores abriendo el
 * mismo diálogo) → devuelve la ganadora con `created=false`, SIN excepción: la carrera es un
 * resultado tipado, no un error (patrón `createScoringRun`). El caller NO re-emite el evento
 * en esa rama.
 */
export const createAssignmentProposal = async (
  client: PoolClient,
  input: CreateAssignmentProposalInput,
): Promise<{ proposal: AssessmentAssignmentProposal; created: boolean }> => {
  const insert = async (): Promise<AssessmentAssignmentProposal | null> => {
    const rows = await runQuery<ProposalRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_assessment_assignment_proposal
         (application_id, policy_id, policy_version, effect_digest, preview_json, proposed_by, expires_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       ON CONFLICT (application_id, effect_digest) WHERE status = 'proposed'
       DO NOTHING
       RETURNING ${PROPOSAL_COLS}`,
      [
        input.applicationId,
        input.policyId,
        input.policyVersion,
        input.effectDigest,
        JSON.stringify(input.preview),
        input.proposedBy,
        input.expiresAt.toISOString(),
      ],
    )

    return rows[0] ? normalizeProposal(rows[0]) : null
  }

  const first = await insert()

  if (first) return { proposal: first, created: true }

  // El índice parcial NO sabe de vencimiento: una propuesta `proposed` pero VENCIDA sigue
  // ocupando (application, digest) y hace colisionar el INSERT. Si devolviéramos esa fila, el
  // confirm la rechazaría siempre con 409. Se la cierra como `expired` — el mismo estado
  // terminal que escribiría el confirm — y se reintenta el INSERT una vez.
  const blocking = await findProposedRowIgnoringExpiry(input.applicationId, input.effectDigest, client)

  if (blocking && isProposalExpired(blocking)) {
    await markAssignmentProposalTerminal(client, blocking.proposalId, 'expired')

    const retried = await insert()

    if (retried) return { proposal: retried, created: true }
  }

  // Carrera real (dos operadores abriendo el mismo diálogo): gana la otra, sin excepción.
  const winner = await findActiveAssignmentProposal(input.applicationId, input.effectDigest, client)

  if (!winner) {
    throw new HiringValidationError(
      'No se pudo registrar la propuesta de asignación.',
      'assessment_assignment_proposal_conflict',
      409,
    )
  }

  return { proposal: winner, created: false }
}

export const getAssignmentProposalById = async (
  proposalId: string,
  client: PoolClient | null = null,
): Promise<AssessmentAssignmentProposal | null> => {
  const rows = await runQuery<ProposalRow>(
    client,
    `SELECT ${PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_assignment_proposal
     WHERE proposal_id = $1`,
    [proposalId],
  )

  return rows[0] ? normalizeProposal(rows[0]) : null
}

/** Lee + bloquea la propuesta (`FOR UPDATE`) dentro de la tx del confirm (anti doble-confirm). */
export const lockAssignmentProposalForUpdate = async (
  client: PoolClient,
  proposalId: string,
): Promise<AssessmentAssignmentProposal> => {
  const rows = await runQuery<ProposalRow>(
    client,
    `SELECT ${PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_assignment_proposal
     WHERE proposal_id = $1 FOR UPDATE`,
    [proposalId],
  )

  if (!rows[0]) {
    throw new HiringNotFoundError(
      'La propuesta de asignación no existe.',
      'assessment_assignment_proposal_not_found',
    )
  }

  return normalizeProposal(rows[0])
}

/** Cierra la propuesta con el assignment que produjo. SIEMPRE dentro de la tx del confirm. */
export const markAssignmentProposalConfirmed = async (
  client: PoolClient,
  proposalId: string,
  input: { confirmedBy: string; assignmentId: string | null },
): Promise<AssessmentAssignmentProposal> => {
  const rows = await runQuery<ProposalRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_assignment_proposal
       SET status = 'confirmed', confirmed_by = $2, confirmed_at = NOW(),
           assignment_id = $3, updated_at = NOW()
     WHERE proposal_id = $1
     RETURNING ${PROPOSAL_COLS}`,
    [proposalId, input.confirmedBy, input.assignmentId],
  )

  if (!rows[0]) {
    throw new HiringValidationError(
      'No se pudo cerrar la propuesta de asignación.',
      'assessment_assignment_proposal_close_failed',
      500,
      { proposalId },
    )
  }

  return normalizeProposal(rows[0])
}

/**
 * Estado terminal SIN efecto: `expired` (pasó la ventana) o `superseded` (el mundo cambió).
 * El caller lo escribe y deja que la transacción COMMITEE antes de lanzar el 409 — si lanzara
 * dentro, el rollback dejaría la propuesta `proposed` y el expiry sería cosmético.
 */
export const markAssignmentProposalTerminal = async (
  client: PoolClient,
  proposalId: string,
  status: Extract<AssessmentAssignmentProposalStatus, 'expired' | 'superseded'>,
): Promise<AssessmentAssignmentProposal> => {
  const rows = await runQuery<ProposalRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_assignment_proposal
       SET status = $2, updated_at = NOW()
     WHERE proposal_id = $1
     RETURNING ${PROPOSAL_COLS}`,
    [proposalId, status],
  )

  if (!rows[0]) {
    throw new HiringValidationError(
      'No se pudo cerrar la propuesta de asignación.',
      'assessment_assignment_proposal_close_failed',
      500,
      { proposalId },
    )
  }

  return normalizeProposal(rows[0])
}

/**
 * Propuesta vigente de una postulación: la `proposed` activa más reciente; si no hay, la última
 * decidida (para que el GET muestre el estado terminal en vez de un vacío que miente).
 */
export const getCurrentAssignmentProposal = async (
  applicationId: string,
  client: PoolClient | null = null,
): Promise<AssessmentAssignmentProposal | null> => {
  const rows = await runQuery<ProposalRow>(
    client,
    `SELECT ${PROPOSAL_COLS} FROM greenhouse_hiring.hiring_assessment_assignment_proposal
     WHERE application_id = $1
     ORDER BY (status = 'proposed') DESC, created_at DESC
     LIMIT 1`,
    [applicationId],
  )

  return rows[0] ? normalizeProposal(rows[0]) : null
}
