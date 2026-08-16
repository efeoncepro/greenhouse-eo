import 'server-only'

import { createHash } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { CandidateIdentityIntake } from './index'

// TASK-1736 Slice 2 — Persistencia de la capa `submitted` del ADR D1: evidencia application-scoped
// INMUTABLE (tabla append-only `greenhouse_hiring.candidate_identity_intake_evidence`) + las
// representaciones derivadas versionadas de esa aplicación. Idempotente por
// (application_id, identity_profile_id, normalization_version, input_digest): un retry del mismo
// intake es no-op (`ON CONFLICT DO NOTHING` sobre el UNIQUE de la migración).
//
// El caller (submit path) DEGRADA ante error: el submit público jamás falla por esta capa
// (ADR §Resilience). Este módulo no captura — lanzar es parte del contrato; el degrade vive donde
// está el submit.

/** Digest sha256 del input raw (first/last como entregó el parser). Nunca sale de la DB. */
export const buildCandidateIdentityInputDigest = (submitted: { firstName: string; lastName: string }): string =>
  createHash('sha256').update(JSON.stringify([submitted.firstName, submitted.lastName])).digest('hex')

export interface PersistCandidateIdentityIntakeEvidenceInput {
  applicationId: string
  identityProfileId: string
  intake: CandidateIdentityIntake
}

/**
 * Escribe la fila de evidencia del intake (append-only, idempotente). El `submitted_full_name` es
 * el RAW exacto del postulante; `normalized_structural`/clasificación/propuesta/search key son las
 * representaciones derivadas de ESTA aplicación bajo la versión vigente de la policy.
 */
export const persistCandidateIdentityIntakeEvidence = async (
  input: PersistCandidateIdentityIntakeEvidenceInput
): Promise<void> => {
  const { intake } = input

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_hiring.candidate_identity_intake_evidence
       (application_id, identity_profile_id, submitted_full_name, normalized_structural,
        casing_classification, proposed_display_name, search_key, search_key_version,
        normalization_version, input_digest)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (application_id, identity_profile_id, normalization_version, input_digest) DO NOTHING`,
    [
      input.applicationId,
      input.identityProfileId,
      intake.submitted.fullName,
      intake.display.fullName,
      intake.casing.classification,
      intake.casing.proposedDisplayName,
      intake.searchKey.value,
      intake.searchKey.version,
      intake.normalizationVersion,
      buildCandidateIdentityInputDigest(intake.submitted)
    ]
  )
}
