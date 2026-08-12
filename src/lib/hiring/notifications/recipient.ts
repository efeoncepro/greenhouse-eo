import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1689 — Contexto de email de una postulación, re-leído SIEMPRE desde PG al momento
 * de consumir (los eventos hiring no llevan PII: el email/nombre del candidato y el título
 * de la vacante se resuelven acá, nunca desde el payload del outbox).
 */
export interface HiringApplicationEmailContext {
  applicationId: string
  applicationPublicId: string
  stage: string
  source: string
  decision: string | null
  candidateEmail: string | null
  candidateName: string | null
  openingId: string
  openingPublicId: string
  /** Título candidate-facing: public_title si existe, si no internal_title. */
  openingTitle: string
  openingIsPublished: boolean
}

interface Row extends Record<string, unknown> {
  application_id: string
  application_public_id: string
  stage: string
  source: string
  decision: string | null
  canonical_email: string | null
  full_name: string | null
  opening_id: string
  opening_public_id: string
  internal_title: string
  public_title: string | null
  opening_status: string
  published_at: string | null
}

export const resolveHiringApplicationEmailContext = async (
  applicationId: string,
): Promise<HiringApplicationEmailContext | null> => {
  const rows = await runGreenhousePostgresQuery<Row>(
    `SELECT ha.application_id,
            ha.public_id AS application_public_id,
            ha.stage,
            ha.source,
            ha.decision,
            ip.canonical_email,
            ip.full_name,
            ho.opening_id,
            ho.public_id AS opening_public_id,
            ho.internal_title,
            ho.public_title,
            ho.status AS opening_status,
            ho.published_at
     FROM greenhouse_hiring.hiring_application ha
     JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = ha.identity_profile_id
     JOIN greenhouse_hiring.hiring_opening ho ON ho.opening_id = ha.opening_id
     WHERE ha.application_id = $1`,
    [applicationId],
  )

  const row = rows[0]

  if (!row) return null

  return {
    applicationId: row.application_id,
    applicationPublicId: row.application_public_id,
    stage: row.stage,
    source: row.source,
    decision: row.decision,
    candidateEmail: row.canonical_email?.trim() || null,
    candidateName: row.full_name?.trim() || null,
    openingId: row.opening_id,
    openingPublicId: row.opening_public_id,
    openingTitle: row.public_title?.trim() || row.internal_title,
    openingIsPublished: row.opening_status === 'active' && row.published_at != null,
  }
}
