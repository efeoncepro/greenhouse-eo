import 'server-only'

import { HiringValidationError } from '../errors'
import {
  detectDegenerateCandidateNames,
  isRemediableFinding,
  type DegenerateCandidateNameFinding
} from './detect-degenerate'
import { normalizeCandidateIdentityInput } from './index'
import { CANDIDATE_NAME_NORMALIZATION_VERSION, type CandidateNameCasingClass } from './normalize-name'
import {
  reconcileCandidateIdentityDisplayName,
  type ReconcileCandidateDisplayReasonCode
} from './reconcile-display'

// TASK-1736 Slice 3 — Remediación histórica gobernada: `planCandidateIdentityRemediation`
// (reader/report, read-only) + `applyCandidateIdentityRemediation` (command allowlisted).
//
// Contrato ADR D4: `dry-run → allowlist humana exacta → apply en lotes de 1 con CAS + audit →
// rollback`. La ÚNICA puerta de mutación es `reconcileCandidateIdentityDisplayName` (fuente
// `reconcile`, compare-and-set, audit append-only en TODAS las ramas): este módulo NO escribe SQL
// propio sobre `identity_profiles`.
//
// FLAG (ADR D4, explícito): el apply NO lee `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED`.
// El flag gatea el writer del intake nuevo y por sí solo NUNCA autoriza el backfill; la remediación
// histórica es un acto humano explícito autorizado por la allowlist revisada + actor + reason —
// no depende del flag ni lo sustituye.
//
// Corrección humana previa: SIEMPRE gana. El reconcile la detecta en el audit (`source='human'`,
// `outcome='applied'`) y salta con `human_correction_present` — este orquestador no la re-chequea
// por fuera: confía en la puerta canónica y lo cubre con tests del flujo CLI.
//
// PII: los objetos retornados llevan nombres before/proposed porque su destino es la revisión
// humana local (stdout/archivo gitignoreado). Nada de esto va a logs compartidos, Sentry, eventos
// ni métricas (hard rule del ADR).

export const CANDIDATE_REMEDIATION_REASON_MIN = 10

/** Una línea de la allowlist: exactamente lo que el humano revisa y aprueba (ADR D4). */
export interface CandidateIdentityRemediationAllowlistEntry {
  profileId: string
  publicId: string | null
  /** Application de lineage para el audit del reconcile; null si la Person no tiene applications. */
  applicationId: string | null
  /** Nombre vigente observado en el dry-run — el before-value esperado del CAS. */
  beforeFullName: string
  /** Propuesta high_confidence del clasificador al momento del dry-run. */
  proposedFullName: string
  classification: CandidateNameCasingClass
  normalizationVersion: string
}

export interface CandidateIdentityRemediationPlan {
  generatedAt: string
  normalizationVersion: typeof CANDIDATE_NAME_NORMALIZATION_VERSION
  totalCandidateProfiles: number
  countsByClassification: Partial<Record<CandidateNameCasingClass, number>>
  /** Degenerados con propuesta pero con corrección humana previa — excluidos del universo. */
  excludedByHumanCorrectionCount: number
  /** Universo remediable propuesto para revisión humana línea a línea. */
  allowlistEntries: CandidateIdentityRemediationAllowlistEntry[]
  findings: DegenerateCandidateNameFinding[]
}

/**
 * Reader/report del dry-run (read-only): corre el detector y deriva la allowlist PROPUESTA.
 * No escribe nada; el humano revisa/poda las entries antes de cualquier apply.
 */
export const planCandidateIdentityRemediation = async (): Promise<CandidateIdentityRemediationPlan> => {
  const report = await detectDegenerateCandidateNames()

  const allowlistEntries: CandidateIdentityRemediationAllowlistEntry[] = report.findings
    .filter(isRemediableFinding)
    .map(finding => ({
      profileId: finding.profileId,
      publicId: finding.publicId,
      applicationId: finding.latestApplicationId,
      beforeFullName: finding.currentFullName ?? '',
      proposedFullName: finding.proposedDisplayName as string,
      classification: finding.classification,
      normalizationVersion: report.normalizationVersion
    }))

  return {
    generatedAt: report.scannedAt,
    normalizationVersion: report.normalizationVersion,
    totalCandidateProfiles: report.totalCandidateProfiles,
    countsByClassification: report.countsByClassification,
    excludedByHumanCorrectionCount: report.excludedByHumanCorrectionCount,
    allowlistEntries,
    findings: report.findings
  }
}

export type CandidateIdentityRemediationEntryOutcome = 'applied' | 'skipped' | 'needs_review'

export type CandidateIdentityRemediationReasonCode =
  | ReconcileCandidateDisplayReasonCode
  | 'allowlist_version_drift' // la policy cambió de versión desde el dry-run — regenerar allowlist
  | 'allowlist_proposal_drift' // la propuesta re-derivada no coincide con la aprobada — no se toca DB

export interface CandidateIdentityRemediationEntryResult {
  profileId: string
  publicId: string | null
  outcome: CandidateIdentityRemediationEntryOutcome
  reasonCode: CandidateIdentityRemediationReasonCode
}

export interface ApplyCandidateIdentityRemediationSummary {
  /** Conteo esperado = largo exacto de la allowlist revisada. */
  expected: number
  applied: number
  skipped: number
  needsReview: number
  /** false ⇒ el apply NO dejó el estado prometido por la allowlist — el caller debe abortar/alertar. */
  countMatchesExpected: boolean
  results: CandidateIdentityRemediationEntryResult[]
}

export interface ApplyCandidateIdentityRemediationInput {
  entries: CandidateIdentityRemediationAllowlistEntry[]
  actorUserId: string
  /** Motivo operativo del apply (≥10 chars). Queda en el output del operador, no en logs. */
  reason: string
}

/**
 * Command de apply histórico: procesa la allowlist EXACTA, uno a uno (lote de 1), cada registro
 * vía `reconcileCandidateIdentityDisplayName`. Si el nombre cambió en DB desde el dry-run, el
 * CAS/searchKey del reconcile lo detecta (needs_review o skip) — jamás last-write-wins. El caller
 * aborta si `countMatchesExpected` es false.
 */
export const applyCandidateIdentityRemediation = async (
  input: ApplyCandidateIdentityRemediationInput
): Promise<ApplyCandidateIdentityRemediationSummary> => {
  if (!input.actorUserId || typeof input.actorUserId !== 'string' || input.actorUserId.trim().length === 0) {
    throw new HiringValidationError('Falta el actor del apply.', 'hiring_invalid_input', 400)
  }

  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''

  if (reason.length < CANDIDATE_REMEDIATION_REASON_MIN) {
    throw new HiringValidationError(
      `El motivo del apply debe tener al menos ${CANDIDATE_REMEDIATION_REASON_MIN} caracteres.`,
      'hiring_invalid_input',
      400
    )
  }

  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    throw new HiringValidationError('La allowlist está vacía: nada que aplicar.', 'hiring_invalid_input', 400)
  }

  const uniqueProfileIds = new Set(input.entries.map(entry => entry.profileId))

  if (uniqueProfileIds.size !== input.entries.length) {
    throw new HiringValidationError(
      'La allowlist tiene profileIds duplicados: revísala antes de aplicar.',
      'hiring_invalid_input',
      400
    )
  }

  const results: CandidateIdentityRemediationEntryResult[] = []

  // Lotes de 1, secuencial (ADR D4): un registro por vez, sin paralelismo.
  for (const entry of input.entries) {
    if (!entry.profileId || !entry.beforeFullName || !entry.proposedFullName) {
      throw new HiringValidationError(
        'Entrada de allowlist incompleta (profileId/beforeFullName/proposedFullName).',
        'hiring_invalid_input',
        400
      )
    }

    // Drift de versión de policy: la allowlist se generó bajo otra versión — regenerar dry-run.
    if (entry.normalizationVersion !== CANDIDATE_NAME_NORMALIZATION_VERSION) {
      results.push({
        profileId: entry.profileId,
        publicId: entry.publicId,
        outcome: 'needs_review',
        reasonCode: 'allowlist_version_drift'
      })
      continue
    }

    // Re-derivar la propuesta desde el before-value aprobado: si no coincide con lo que el humano
    // aprobó (archivo editado a mano / policy drift), no se toca la DB.
    const intake = normalizeCandidateIdentityInput({ firstName: entry.beforeFullName, lastName: '' })

    if (intake.casing.proposedDisplayName !== entry.proposedFullName) {
      results.push({
        profileId: entry.profileId,
        publicId: entry.publicId,
        outcome: 'needs_review',
        reasonCode: 'allowlist_proposal_drift'
      })
      continue
    }

    // Única puerta de mutación (ADR D3/D4): CAS + audit fuente `reconcile`. Si el nombre en DB
    // cambió desde el dry-run: substantivo ⇒ needs_review; sólo casing ya corregido ⇒ skipped;
    // corrección humana nueva ⇒ skipped (human_correction_present — la corrección humana gana).
    const result = await reconcileCandidateIdentityDisplayName({
      identityProfileId: entry.profileId,
      applicationId: entry.applicationId,
      intake
    })

    results.push({
      profileId: entry.profileId,
      publicId: entry.publicId,
      outcome: result.outcome,
      reasonCode: result.reasonCode
    })
  }

  const applied = results.filter(result => result.outcome === 'applied').length
  const skipped = results.filter(result => result.outcome === 'skipped').length
  const needsReview = results.filter(result => result.outcome === 'needs_review').length

  return {
    expected: input.entries.length,
    applied,
    skipped,
    needsReview,
    countMatchesExpected: applied === input.entries.length,
    results
  }
}
