import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { HiringNotFoundError, HiringValidationError } from '../errors'
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
  /** Subconjunto de `skipped` con reasonCode `already_canonical` (retry idempotente: cuenta como éxito). */
  skippedAlreadyCanonical: number
  needsReview: number
  /**
   * false ⇒ el apply NO dejó el estado prometido por la allowlist — el caller debe abortar/alertar.
   * Un `skipped (already_canonical)` SÍ cuenta como estado prometido: el retry de un apply exitoso
   * es idempotente y NO aborta (TASK-1736 A6).
   */
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
    // TASK-1736 A1: el actor + reason del apply SIEMPRE viajan al audit del reconcile — el "quién/
    // por qué" del backfill histórico queda persistido, no sólo validado.
    const result = await reconcileCandidateIdentityDisplayName({
      identityProfileId: entry.profileId,
      applicationId: entry.applicationId,
      intake,
      actorUserId: input.actorUserId,
      reasonNote: reason
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

  const skippedAlreadyCanonical = results.filter(
    result => result.outcome === 'skipped' && result.reasonCode === 'already_canonical'
  ).length

  const needsReview = results.filter(result => result.outcome === 'needs_review').length

  return {
    expected: input.entries.length,
    applied,
    skipped,
    skippedAlreadyCanonical,
    needsReview,
    // TASK-1736 A6 — `already_canonical` ES el estado prometido por la allowlist (el display ya
    // quedó en la propuesta): el retry de un apply exitoso es idempotente y no debe abortar.
    countMatchesExpected: applied + skippedAlreadyCanonical === input.entries.length,
    results
  }
}

// ── Rollback per-record (TASK-1736 A2 — contrato ADR D4: CAS del before-value del audit) ─────────

export type RollbackCandidateIdentityRemediationOutcome = 'applied' | 'needs_review'

export type RollbackCandidateIdentityRemediationReasonCode =
  | 'rollback_applied' // CAS OK: el display volvió al before-value exacto del audit
  | 'rollback_cas_mismatch' // el full_name vigente ya NO es el after del audit — decide un humano
  | 'rollback_before_value_unavailable' // el audit no tiene before restaurable (p. ej. empty_display_filled)

export interface RollbackCandidateIdentityRemediationInput {
  /** `audit_id` de la fila `source='reconcile'` + `outcome='applied'` que se quiere revertir. */
  auditId: string
  actorUserId: string
  /** Motivo operativo del rollback (≥10 chars). Queda en el audit, jamás en logs. */
  reason: string
}

export interface RollbackCandidateIdentityRemediationResult {
  auditId: string
  profileId: string
  outcome: RollbackCandidateIdentityRemediationOutcome
  reasonCode: RollbackCandidateIdentityRemediationReasonCode
  /** Nombre restaurado cuando `applied`; null cuando no se mutó. */
  restoredFullName: string | null
}

/**
 * Rollback gobernado de UN apply de remediación: lee la fila de audit `reconcile`+`applied`,
 * y con CAS — si el `full_name` vigente sigue siendo EXACTAMENTE el `after_full_name` de ese
 * audit — restaura el `before_full_name`. La reversión se registra como corrección HUMANA
 * (`source='human'`, misma mecánica de `correctCandidateDisplayName`): actor + reason obligatorios
 * y, al quedar registrada, bloquea automatismos futuros sobre esa identidad (D3.2 — deliberado:
 * un humano decidió el valor). Si el vigente difiere del after ⇒ `needs_review` SIN mutar (alguien
 * lo cambió después del apply; jamás last-write-wins). Todas las ramas escriben audit.
 */
export const rollbackCandidateIdentityRemediation = async (
  input: RollbackCandidateIdentityRemediationInput
): Promise<RollbackCandidateIdentityRemediationResult> => {
  if (!input.auditId || typeof input.auditId !== 'string' || input.auditId.trim().length === 0) {
    throw new HiringValidationError('Falta el auditId del rollback.', 'hiring_invalid_input', 400)
  }

  if (!input.actorUserId || typeof input.actorUserId !== 'string' || input.actorUserId.trim().length === 0) {
    throw new HiringValidationError('Falta el actor del rollback.', 'hiring_invalid_input', 400)
  }

  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''

  if (reason.length < CANDIDATE_REMEDIATION_REASON_MIN) {
    throw new HiringValidationError(
      `El motivo del rollback debe tener al menos ${CANDIDATE_REMEDIATION_REASON_MIN} caracteres.`,
      'hiring_invalid_input',
      400
    )
  }

  return withGreenhousePostgresTransaction(async client => {
    // 1. La fila de audit a revertir: SOLO un apply del automatismo (`reconcile` + `applied`).
    const auditRows = await client.query(
      `SELECT audit_id, identity_profile_id, application_id, before_full_name, after_full_name,
              normalization_version
         FROM greenhouse_hiring.candidate_identity_display_audit
        WHERE audit_id = $1 AND source = 'reconcile' AND outcome = 'applied'`,
      [input.auditId]
    )

    const audit = auditRows.rows[0] as
      | {
          audit_id: string
          identity_profile_id: string
          application_id: string | null
          before_full_name: string | null
          after_full_name: string | null
          normalization_version: string
        }
      | undefined

    if (!audit) {
      throw new HiringNotFoundError(
        'No existe una fila de audit reconcile/applied con ese auditId.',
        'hiring_candidate_identity_not_found'
      )
    }

    const profileRows = await client.query(
      `SELECT full_name FROM greenhouse_core.identity_profiles WHERE profile_id = $1 FOR UPDATE`,
      [audit.identity_profile_id]
    )

    if (!profileRows.rows[0]) {
      throw new HiringNotFoundError('La identidad del candidato no existe.', 'hiring_candidate_identity_not_found')
    }

    const currentFullName: string | null = (profileRows.rows[0] as { full_name: string | null }).full_name ?? null

    const writeRollbackAudit = async (
      outcome: RollbackCandidateIdentityRemediationOutcome,
      reasonCode: RollbackCandidateIdentityRemediationReasonCode,
      afterFullName: string | null
    ): Promise<void> => {
      await client.query(
        `INSERT INTO greenhouse_hiring.candidate_identity_display_audit
           (identity_profile_id, application_id, source, outcome, before_full_name, after_full_name,
            proposed_full_name, reason, actor_user_id, normalization_version)
         VALUES ($1, $2, 'human', $3, $4, $5, NULL, $6, $7, $8)`,
        [
          audit.identity_profile_id,
          audit.application_id,
          outcome,
          currentFullName,
          afterFullName,
          `${reasonCode} (audit ${audit.audit_id}) — ${reason}`.slice(0, 1000),
          input.actorUserId.trim(),
          audit.normalization_version
        ]
      )
    }

    const conclude = async (
      outcome: RollbackCandidateIdentityRemediationOutcome,
      reasonCode: RollbackCandidateIdentityRemediationReasonCode,
      restoredFullName: string | null = null
    ): Promise<RollbackCandidateIdentityRemediationResult> => {
      await writeRollbackAudit(outcome, reasonCode, restoredFullName)

      return { auditId: audit.audit_id, profileId: audit.identity_profile_id, outcome, reasonCode, restoredFullName }
    }

    // Before no restaurable (p. ej. `empty_display_filled` nació de vigente NULL/vacío): restaurar
    // un display vacío/invisible está prohibido (A5) — decide un humano con el command de corrección.
    const beforeFullName = audit.before_full_name

    if (!beforeFullName || beforeFullName.trim().length === 0) {
      return conclude('needs_review', 'rollback_before_value_unavailable')
    }

    // 2. CAS: el runbook promete revertir "con el before-value del audit" SOLO si el vigente sigue
    // siendo el after de ese apply. Cualquier otra cosa (re-submit, corrección humana posterior,
    // otro reconcile) ⇒ needs_review SIN mutar.
    if (currentFullName !== audit.after_full_name) {
      return conclude('needs_review', 'rollback_cas_mismatch')
    }

    const updated = await client.query(
      `UPDATE greenhouse_core.identity_profiles
       SET full_name = $2, updated_at = CURRENT_TIMESTAMP
       WHERE profile_id = $1 AND full_name IS NOT DISTINCT FROM $3`,
      [audit.identity_profile_id, beforeFullName, currentFullName]
    )

    if ((updated.rowCount ?? 0) !== 1) {
      return conclude('needs_review', 'rollback_cas_mismatch')
    }

    return conclude('applied', 'rollback_applied', beforeFullName)
  })
}
