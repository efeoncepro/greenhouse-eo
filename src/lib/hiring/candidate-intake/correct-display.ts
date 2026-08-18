import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { HiringNotFoundError, HiringValidationError } from '../errors'
import { CANDIDATE_NAME_NORMALIZATION_VERSION, normalizeNameStructural } from './normalize-name'

// TASK-1736 Slice 2 — Corrección HUMANA del display name de la identidad de un candidato.
// Capability-gated en la ruta (`hiring.candidate.correct_display`, tier gobernanza role-only —
// patrón TASK-1714); este command exige actor + reason y escribe el audit append-only con fuente
// `human` + el UPDATE de `identity_profiles.full_name` en UNA transacción. Una corrección humana
// SIEMPRE gana: `reconcileCandidateIdentityDisplayName` la detecta en el audit y nunca la pisa.
// La evidencia submitted de las aplicaciones JAMÁS se toca (ADR D1). Compatible con
// propose → confirm → execute: el endpoint de confirmación humana es el único que muta.

export const CANDIDATE_DISPLAY_CORRECTION_REASON_MIN = 5
export const CANDIDATE_DISPLAY_CORRECTION_REASON_MAX = 1000
export const CANDIDATE_DISPLAY_NAME_MAX = 400

export interface CorrectCandidateDisplayNameInput {
  identityProfileId: string
  correctedName: string
  reason: string
  actorUserId: string
}

export interface CorrectCandidateDisplayNameResult {
  identityProfileId: string
  beforeFullName: string | null
  afterFullName: string
}

/**
 * Command canónico de corrección humana del display. Valida no-vacío/longitud, aplica la
 * normalización ESTRUCTURAL al valor corregido (NFC + controles fuera + whitespace — el casing
 * del operador se respeta tal cual) y persiste UPDATE + audit atómicamente.
 */
export const correctCandidateDisplayName = async (
  input: CorrectCandidateDisplayNameInput
): Promise<CorrectCandidateDisplayNameResult> => {
  if (!input.identityProfileId || typeof input.identityProfileId !== 'string') {
    throw new HiringValidationError('Falta el identificador de la identidad.', 'hiring_invalid_input', 400)
  }

  if (!input.actorUserId || typeof input.actorUserId !== 'string') {
    throw new HiringValidationError('Falta el actor de la corrección.', 'hiring_invalid_input', 400)
  }

  const correctedName = normalizeNameStructural(
    typeof input.correctedName === 'string' ? input.correctedName : ''
  )

  if (correctedName.length === 0 || correctedName.length > CANDIDATE_DISPLAY_NAME_MAX) {
    throw new HiringValidationError(
      `El nombre corregido debe tener entre 1 y ${CANDIDATE_DISPLAY_NAME_MAX} caracteres.`,
      'hiring_display_correction_invalid_name',
      400
    )
  }

  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''

  if (reason.length < CANDIDATE_DISPLAY_CORRECTION_REASON_MIN || reason.length > CANDIDATE_DISPLAY_CORRECTION_REASON_MAX) {
    throw new HiringValidationError(
      `El motivo debe tener entre ${CANDIDATE_DISPLAY_CORRECTION_REASON_MIN} y ${CANDIDATE_DISPLAY_CORRECTION_REASON_MAX} caracteres.`,
      'hiring_display_correction_invalid_reason',
      400
    )
  }

  return withGreenhousePostgresTransaction(async client => {
    const profileRows = await client.query(
      `SELECT full_name FROM greenhouse_core.identity_profiles WHERE profile_id = $1 FOR UPDATE`,
      [input.identityProfileId]
    )

    if (!profileRows.rows[0]) {
      throw new HiringNotFoundError('La identidad del candidato no existe.', 'hiring_candidate_identity_not_found')
    }

    const beforeFullName: string | null = (profileRows.rows[0] as { full_name: string | null }).full_name ?? null

    // CAS sobre el before-value leído bajo FOR UPDATE (defensa en profundidad; jamás LWW ciego).
    await client.query(
      `UPDATE greenhouse_core.identity_profiles
       SET full_name = $2, updated_at = CURRENT_TIMESTAMP
       WHERE profile_id = $1 AND full_name IS NOT DISTINCT FROM $3`,
      [input.identityProfileId, correctedName, beforeFullName]
    )

    // Audit fuente `human`: aunque el valor coincida con el vigente, la fila registra la
    // afirmación humana "este nombre es correcto" — y bloquea automatismos futuros (D3.2).
    await client.query(
      `INSERT INTO greenhouse_hiring.candidate_identity_display_audit
         (identity_profile_id, application_id, source, outcome, before_full_name, after_full_name,
          proposed_full_name, reason, actor_user_id, normalization_version)
       VALUES ($1, NULL, 'human', 'applied', $2, $3, NULL, $4, $5, $6)`,
      [input.identityProfileId, beforeFullName, correctedName, reason, input.actorUserId, CANDIDATE_NAME_NORMALIZATION_VERSION]
    )

    return { identityProfileId: input.identityProfileId, beforeFullName, afterFullName: correctedName }
  })
}
