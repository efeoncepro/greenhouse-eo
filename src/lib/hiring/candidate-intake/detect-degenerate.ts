import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  CANDIDATE_NAME_NORMALIZATION_VERSION,
  proposeDisplayName,
  type CandidateNameCasingClass
} from './normalize-name'

// TASK-1736 Slice 3 — Detector READ-ONLY de display names degenerados (ADR D4).
//
// Barre las Person candidatas (`identity_profiles.profile_type = 'external_contact'` con
// `candidate_facet` vinculada — el JOIN es el filtro: sin faceta no es candidato) y clasifica el
// `full_name` VIGENTE con el clasificador versionado del Slice 1. No escribe nada: una sola query
// SELECT; la clasificación ocurre en memoria.
//
// PII: el reporte contiene el nombre vigente y la propuesta porque su ÚNICO destino es la revisión
// humana local del operador (stdout o archivo local gitignoreado — ADR D4 allowlist). JAMÁS
// loggear, emitir a Sentry/eventos/métricas ni compartir este reporte: los canales compartidos
// sólo llevan IDs, hashes y conteos (hard rule del ADR).

type CandidateProfileRow = {
  profile_id: string
  public_id: string | null
  full_name: string | null
  latest_application_id: string | null
  has_human_correction: boolean
}

export interface DegenerateCandidateNameFinding {
  profileId: string
  publicId: string | null
  /** Display VIGENTE en `identity_profiles` al momento del barrido (PII — sólo revisión local). */
  currentFullName: string | null
  /** Application más reciente de la Person — lineage exacto para el audit del apply (ADR D4). */
  latestApplicationId: string | null
  classification: CandidateNameCasingClass
  confidence: 'high_confidence' | 'needs_review'
  /** Propuesta sólo para degenerados evidentes (`degenerate_lower`/`degenerate_upper`). */
  proposedDisplayName: string | null
  /** true = existe corrección humana aplicada en el audit; el automatismo JAMÁS la pisa (D3.2). */
  hasHumanCorrection: boolean
}

export interface DetectDegenerateCandidateNamesReport {
  scannedAt: string
  normalizationVersion: typeof CANDIDATE_NAME_NORMALIZATION_VERSION
  totalCandidateProfiles: number
  countsByClassification: Partial<Record<CandidateNameCasingClass, number>>
  /** Degenerados evidentes CON propuesta y SIN corrección humana previa — el universo remediable. */
  remediableCount: number
  excludedByHumanCorrectionCount: number
  findings: DegenerateCandidateNameFinding[]
}

/** Un finding es remediable si tiene propuesta high_confidence y ninguna corrección humana previa. */
export const isRemediableFinding = (finding: DegenerateCandidateNameFinding): boolean =>
  finding.proposedDisplayName !== null && !finding.hasHumanCorrection

/**
 * Detector read-only del Slice 3. Opcionalmente acotado a `profileIds` (re-verificación de una
 * allowlist). No muta nada; retorna el reporte completo para revisión humana local.
 */
export const detectDegenerateCandidateNames = async (
  options: { profileIds?: string[] } = {}
): Promise<DetectDegenerateCandidateNamesReport> => {
  const params: unknown[] = []
  let profileFilter = ''

  if (options.profileIds && options.profileIds.length > 0) {
    params.push(options.profileIds)
    profileFilter = 'AND ip.profile_id = ANY($1::text[])'
  }

  const rows = await runGreenhousePostgresQuery<CandidateProfileRow>(
    `SELECT ip.profile_id,
            ip.public_id,
            ip.full_name,
            la.application_id AS latest_application_id,
            EXISTS (
              SELECT 1
                FROM greenhouse_hiring.candidate_identity_display_audit a
               WHERE a.identity_profile_id = ip.profile_id
                 AND a.source = 'human'
                 AND a.outcome = 'applied'
            ) AS has_human_correction
       FROM greenhouse_core.identity_profiles ip
       JOIN greenhouse_hiring.candidate_facet cf ON cf.identity_profile_id = ip.profile_id
       LEFT JOIN LATERAL (
         SELECT ha.application_id
           FROM greenhouse_hiring.hiring_application ha
          WHERE ha.identity_profile_id = ip.profile_id
          ORDER BY ha.created_at DESC
          LIMIT 1
       ) la ON TRUE
      WHERE ip.profile_type = 'external_contact' ${profileFilter}
      ORDER BY ip.created_at ASC`,
    params
  )

  const countsByClassification: Partial<Record<CandidateNameCasingClass, number>> = {}
  let remediableCount = 0
  let excludedByHumanCorrectionCount = 0

  const findings: DegenerateCandidateNameFinding[] = rows.map(row => {
    const assessment = proposeDisplayName(row.full_name ?? '')

    const finding: DegenerateCandidateNameFinding = {
      profileId: row.profile_id,
      publicId: row.public_id,
      currentFullName: row.full_name,
      latestApplicationId: row.latest_application_id,
      classification: assessment.classification,
      confidence: assessment.confidence,
      proposedDisplayName: assessment.proposedDisplayName,
      hasHumanCorrection: row.has_human_correction
    }

    countsByClassification[finding.classification] = (countsByClassification[finding.classification] ?? 0) + 1

    if (finding.proposedDisplayName !== null && finding.hasHumanCorrection) {
      excludedByHumanCorrectionCount += 1
    }

    if (isRemediableFinding(finding)) {
      remediableCount += 1
    }

    return finding
  })

  return {
    scannedAt: new Date().toISOString(),
    normalizationVersion: CANDIDATE_NAME_NORMALIZATION_VERSION,
    totalCandidateProfiles: findings.length,
    countsByClassification,
    remediableCount,
    excludedByHumanCorrectionCount,
    findings
  }
}
