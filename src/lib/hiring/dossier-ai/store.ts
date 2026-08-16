import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  DOSSIER_PROPOSAL_STATUSES,
  type DossierProposal,
  type DossierProposalStatus
} from '@/types/hiring-dossier-ai'

import { HiringNotFoundError, HiringValidationError } from '../errors'

// TASK-1735 — Ledger de propuestas del dossier (espejo del proposal-store de TASK-1361).
// Terminal-once: el confirm/reject muta status UNA vez, con FOR UPDATE + state machine en
// código (sin trigger — por eso la tabla lleva GRANT UPDATE).

const runQuery = async <T extends Record<string, unknown>>(
  client: PoolClient | null,
  text: string,
  values: unknown[]
): Promise<T[]> => {
  if (client) {
    const result = await client.query(text, values)

    return result.rows as T[]
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const str = (value: unknown): string => (value == null ? '' : String(value))
const nstr = (value: unknown): string | null => (value == null ? null : String(value))

const ts = (value: unknown): string | null =>
  value == null ? null : value instanceof Date ? value.toISOString() : String(value)

const jsonObj = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return {}
}

type DossierProposalRow = {
  proposal_id: unknown
  application_id: unknown
  proposed_json: unknown
  provider: unknown
  model: unknown
  prompt_version: unknown
  input_digest: unknown
  status: unknown
  decision_note: unknown
  confirmed_by: unknown
  confirmed_at: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

const DOSSIER_PROPOSAL_COLS = `
  proposal_id, application_id, proposed_json, provider, model, prompt_version,
  input_digest, status, decision_note, confirmed_by, confirmed_at, created_by,
  created_at, updated_at`

const normalizeDossierProposal = (row: DossierProposalRow): DossierProposal => {
  const status = str(row.status) as DossierProposalStatus

  if (!DOSSIER_PROPOSAL_STATUSES.includes(status)) {
    throw new HiringValidationError('El estado de la propuesta no es válido.', 'hiring_dossier_invalid_status', 500)
  }

  return {
    proposalId: str(row.proposal_id),
    applicationId: str(row.application_id),
    proposed: jsonObj(row.proposed_json),
    provider: str(row.provider),
    model: str(row.model),
    promptVersion: str(row.prompt_version),
    inputDigest: str(row.input_digest),
    status,
    decisionNote: nstr(row.decision_note),
    confirmedBy: nstr(row.confirmed_by),
    confirmedAt: ts(row.confirmed_at),
    createdBy: nstr(row.created_by),
    createdAt: ts(row.created_at) ?? '',
    updatedAt: ts(row.updated_at) ?? ''
  }
}

/** Propuesta `proposed` activa por (application, digest) — la base de la idempotencia. */
export const findActiveDossierProposal = async (
  applicationId: string,
  inputDigest: string,
  client: PoolClient | null = null
): Promise<DossierProposal | null> => {
  const rows = await runQuery<DossierProposalRow>(
    client,
    `SELECT ${DOSSIER_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_application_dossier_proposal
     WHERE application_id = $1 AND input_digest = $2 AND status = 'proposed' LIMIT 1`,
    [applicationId, inputDigest]
  )

  return rows[0] ? normalizeDossierProposal(rows[0]) : null
}

export interface CreateDossierProposalInput {
  applicationId: string
  proposed: Record<string, unknown>
  provider: string
  model: string
  promptVersion: string
  inputDigest: string
  createdBy: string | null
}

/**
 * Inserta la propuesta `proposed`. Carrera del índice único parcial → devuelve la ganadora
 * con `created=false` (el caller NO re-emite el evento en ese caso).
 */
export const createDossierProposal = async (
  client: PoolClient,
  input: CreateDossierProposalInput
): Promise<{ proposal: DossierProposal; created: boolean }> => {
  const rows = await runQuery<DossierProposalRow>(
    client,
    `INSERT INTO greenhouse_hiring.hiring_application_dossier_proposal
       (application_id, proposed_json, provider, model, prompt_version, input_digest, created_by)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7)
     ON CONFLICT (application_id, input_digest) WHERE status = 'proposed'
     DO NOTHING
     RETURNING ${DOSSIER_PROPOSAL_COLS}`,
    [
      input.applicationId,
      JSON.stringify(input.proposed ?? {}),
      input.provider,
      input.model,
      input.promptVersion,
      input.inputDigest,
      input.createdBy
    ]
  )

  if (rows[0]) {
    return { proposal: normalizeDossierProposal(rows[0]), created: true }
  }

  const winner = await findActiveDossierProposal(input.applicationId, input.inputDigest, client)

  if (!winner) {
    throw new HiringValidationError(
      'No se pudo registrar la propuesta del expediente.',
      'hiring_dossier_proposal_conflict',
      409
    )
  }

  return { proposal: winner, created: false }
}

export const getDossierProposalById = async (
  proposalId: string,
  client: PoolClient | null = null
): Promise<DossierProposal | null> => {
  const rows = await runQuery<DossierProposalRow>(
    client,
    `SELECT ${DOSSIER_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_application_dossier_proposal
     WHERE proposal_id = $1`,
    [proposalId]
  )

  return rows[0] ? normalizeDossierProposal(rows[0]) : null
}

/** Lee + bloquea la propuesta (`FOR UPDATE`) dentro de la tx del confirm (anti doble-confirm). */
export const lockDossierProposalForUpdate = async (
  client: PoolClient,
  proposalId: string
): Promise<DossierProposal> => {
  const rows = await runQuery<DossierProposalRow>(
    client,
    `SELECT ${DOSSIER_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_application_dossier_proposal
     WHERE proposal_id = $1 FOR UPDATE`,
    [proposalId]
  )

  if (!rows[0]) {
    throw new HiringNotFoundError('La propuesta del expediente no existe.', 'hiring_dossier_proposal_not_found')
  }

  return normalizeDossierProposal(rows[0])
}

/**
 * Propuesta vigente de una application: la `proposed` activa más reciente; si no hay,
 * la última decidida (para que el GET muestre el estado terminal).
 */
export const getCurrentDossierProposalForApplication = async (
  applicationId: string
): Promise<DossierProposal | null> => {
  const rows = await runQuery<DossierProposalRow>(
    null,
    `SELECT ${DOSSIER_PROPOSAL_COLS} FROM greenhouse_hiring.hiring_application_dossier_proposal
     WHERE application_id = $1
     ORDER BY (status = 'proposed') DESC, created_at DESC
     LIMIT 1`,
    [applicationId]
  )

  return rows[0] ? normalizeDossierProposal(rows[0]) : null
}

/**
 * Marca la propuesta `confirmed`|`rejected` DENTRO de la tx del confirm (client obligatorio).
 * NO aplica el efecto downstream — eso lo hace confirmEvaluationDossier antes de llamar esto.
 */
export const markDossierProposalDecided = async (
  client: PoolClient,
  input: {
    proposalId: string
    status: 'confirmed' | 'rejected'
    decisionNote: string | null
    actorUserId: string
  }
): Promise<DossierProposal> => {
  const rows = await runQuery<DossierProposalRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_application_dossier_proposal
       SET status = $2, decision_note = $3, confirmed_by = $4, confirmed_at = NOW(), updated_at = NOW()
     WHERE proposal_id = $1
     RETURNING ${DOSSIER_PROPOSAL_COLS}`,
    [input.proposalId, input.status, input.decisionNote, input.actorUserId]
  )

  return normalizeDossierProposal(rows[0])
}
