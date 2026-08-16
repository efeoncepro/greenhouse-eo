import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { HiringNotFoundError, HiringValidationError } from '../errors'
import { buildCandidateSearchKey } from './search-key'
import type { CandidateIdentityIntake } from './index'

// TASK-1736 Slice 2 — `reconcileCandidateIdentityDisplayName` (ADR D3): el ÚNICO camino para
// refrescar el display (`identity_profiles.full_name`) de una identidad ya resuelta por
// email/`identity_profile_id` authoritative. Compare-and-set sobre el before-value; JAMÁS
// last-write-wins. Cierra el "sticky name": la rama email-first de `createIdentityProfile`
// devuelve el perfil previo sin reconciliar, y su `ON CONFLICT (profile_id)` ahora PRESERVA el
// nombre existente — el refresh legítimo pasa exclusivamente por acá.
//
// Precondiciones para mutar (TODAS, D3):
// 1. Person resuelta por ID authoritative (el caller ya la trae; nombre/searchKey jamás resuelven).
// 2. Sin corrección humana previa (`source='human'` + `outcome='applied'` en el audit): una
//    corrección humana SIEMPRE gana sobre cualquier automatismo.
// 3. Clasificación degenerada evidente con propuesta `high_confidence`, y la propuesta difiere del
//    vigente SOLO en casing/whitespace/NFC — misma cardinalidad y contenido de tokens bajo
//    searchKey (comparador sancionado por el ADR) — O el vigente está vacío/placeholder.
// 4. El CAS sobre el before-value exacto tiene éxito; conflicto concurrente ⇒ `needs_review`.
//
// SIEMPRE escribe una fila de audit con fuente `reconcile` (applied | needs_review | skipped),
// mutación haya o no. Discrepancia sustantiva (tokens distintos bajo searchKey) ⇒ `needs_review`
// SIN mutar — decide un humano.

export type ReconcileCandidateDisplayOutcome = 'applied' | 'needs_review' | 'skipped'

export type ReconcileCandidateDisplayReasonCode =
  | 'display_refreshed' // CAS exitoso: el display quedó en la propuesta high_confidence
  | 'empty_display_filled' // el vigente estaba vacío/placeholder; se materializó el display del intake
  | 'human_correction_present' // existe corrección humana previa — el automatismo nunca la pisa
  | 'substantive_name_discrepancy' // tokens distintos bajo searchKey — posible cambio real/homónimo
  | 'cas_conflict' // el before-value cambió concurrentemente — fail-closed a humano
  | 'already_canonical' // el vigente ya es la propuesta (o no hay delta) — nada que aplicar
  | 'not_high_confidence' // clasificación no elegible para automatismo (la policy no adivina)

export interface ReconcileCandidateIdentityDisplayNameInput {
  identityProfileId: string
  /** Application origen del intake; null cuando el contexto no tiene application resuelta. */
  applicationId: string | null
  intake: CandidateIdentityIntake
}

export interface ReconcileCandidateIdentityDisplayNameResult {
  outcome: ReconcileCandidateDisplayOutcome
  reasonCode: ReconcileCandidateDisplayReasonCode
  beforeFullName: string | null
  afterFullName: string | null
}

const isEmptyDisplay = (value: string | null): boolean => !value || value.trim().length === 0

const writeReconcileAudit = async (
  client: PoolClient,
  input: ReconcileCandidateIdentityDisplayNameInput,
  outcome: ReconcileCandidateDisplayOutcome,
  reasonCode: ReconcileCandidateDisplayReasonCode,
  beforeFullName: string | null,
  afterFullName: string | null
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_hiring.candidate_identity_display_audit
       (identity_profile_id, application_id, source, outcome, before_full_name, after_full_name,
        proposed_full_name, reason, actor_user_id, normalization_version)
     VALUES ($1, $2, 'reconcile', $3, $4, $5, $6, $7, NULL, $8)`,
    [
      input.identityProfileId,
      input.applicationId,
      outcome,
      beforeFullName,
      afterFullName,
      input.intake.casing.proposedDisplayName,
      reasonCode,
      input.intake.normalizationVersion
    ]
  )
}

/**
 * Command idempotente de reconciliación del display de una identidad (nueva o existente).
 * Retorna el outcome + reasonCode (IDs/códigos — sin PII); el detalle con nombres queda en el
 * audit append-only, nunca en logs/eventos.
 */
export const reconcileCandidateIdentityDisplayName = async (
  input: ReconcileCandidateIdentityDisplayNameInput
): Promise<ReconcileCandidateIdentityDisplayNameResult> => {
  if (!input.identityProfileId || typeof input.identityProfileId !== 'string') {
    throw new HiringValidationError('Falta el identificador de la identidad.', 'hiring_invalid_input', 400)
  }

  return withGreenhousePostgresTransaction(async client => {
    const profileRows = await client.query(
      `SELECT full_name FROM greenhouse_core.identity_profiles WHERE profile_id = $1 FOR UPDATE`,
      [input.identityProfileId]
    )

    if (!profileRows.rows[0]) {
      throw new HiringNotFoundError('La identidad del candidato no existe.', 'hiring_candidate_identity_not_found')
    }

    const currentFullName: string | null = (profileRows.rows[0] as { full_name: string | null }).full_name ?? null

    const conclude = async (
      outcome: ReconcileCandidateDisplayOutcome,
      reasonCode: ReconcileCandidateDisplayReasonCode,
      afterFullName: string | null = null
    ): Promise<ReconcileCandidateIdentityDisplayNameResult> => {
      await writeReconcileAudit(client, input, outcome, reasonCode, currentFullName, afterFullName)

      return { outcome, reasonCode, beforeFullName: currentFullName, afterFullName }
    }

    // Precondición 2 — corrección humana previa SIEMPRE gana sobre el automatismo.
    const humanCorrection = await client.query(
      `SELECT 1 FROM greenhouse_hiring.candidate_identity_display_audit
       WHERE identity_profile_id = $1 AND source = 'human' AND outcome = 'applied'
       LIMIT 1`,
      [input.identityProfileId]
    )

    if (humanCorrection.rows.length > 0) {
      return conclude('skipped', 'human_correction_present')
    }

    const proposal = input.intake.casing.proposedDisplayName

    // Vigente vacío/placeholder: materializar el display del intake es seguro (la evidencia raw
    // se preserva aparte). Preferimos la propuesta high_confidence si existe; si no, el display
    // estructural (lo mismo que habría recibido la Person al nacer).
    if (isEmptyDisplay(currentFullName)) {
      const filled = proposal ?? input.intake.display.fullName

      await client.query(
        `UPDATE greenhouse_core.identity_profiles
         SET full_name = $2, updated_at = CURRENT_TIMESTAMP
         WHERE profile_id = $1 AND full_name IS NOT DISTINCT FROM $3`,
        [input.identityProfileId, filled, currentFullName]
      )

      return conclude('applied', 'empty_display_filled', filled)
    }

    // Discrepancia sustantiva bajo searchKey (tokens distintos): posible cambio de nombre real,
    // typo nuevo u homónimo con correo compartido — decide un humano, SIN mutar (D3).
    const currentSearchKey = buildCandidateSearchKey(currentFullName ?? '')

    if (currentSearchKey.value !== input.intake.searchKey.value) {
      return conclude('needs_review', 'substantive_name_discrepancy')
    }

    // Precondición 3 — sólo el degenerado evidente con propuesta high_confidence automatiza.
    if (!proposal) {
      const reasonCode: ReconcileCandidateDisplayReasonCode =
        input.intake.casing.confidence === 'high_confidence' ? 'already_canonical' : 'not_high_confidence'

      return conclude('skipped', reasonCode)
    }

    if (proposal === currentFullName) {
      return conclude('skipped', 'already_canonical')
    }

    // Precondición 4 — CAS sobre el before-value exacto. El FOR UPDATE ya serializa dentro de la
    // tx; el predicado se conserva igual como defensa en profundidad (jamás last-write-wins).
    const updated = await client.query(
      `UPDATE greenhouse_core.identity_profiles
       SET full_name = $2, updated_at = CURRENT_TIMESTAMP
       WHERE profile_id = $1 AND full_name IS NOT DISTINCT FROM $3`,
      [input.identityProfileId, proposal, currentFullName]
    )

    if ((updated.rowCount ?? 0) !== 1) {
      return conclude('needs_review', 'cas_conflict')
    }

    return conclude('applied', 'display_refreshed', proposal)
  })
}
