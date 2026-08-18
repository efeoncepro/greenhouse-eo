import 'server-only'

import { isCandidateIdentityNormalizationEnabled } from '@/lib/hiring/candidate-intake/config'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1736 Slice 4 — Reliability signals de la identidad del intake de candidatos
 * (ADR `GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1`, §Resilience).
 *
 * Dos señales PII-free (solo counts/IDs agregados; JAMÁS nombres, correos ni before/after —
 * hard rule del ADR: la PII vive en las tablas restringidas y en la revisión humana local,
 * nunca en observabilidad):
 *
 *  1. `hiring.candidate_identity.needs_review_backlog` — filas de audit `needs_review`
 *     (reconcile D3 o remediación D4) sin corrección humana posterior. Steady=0.
 *  2. `hiring.candidate_identity.evidence_coverage_gap` — applications nuevas sin fila de
 *     evidencia con el flag ON (detecta el silent-skip del write path del intake). Con el
 *     flag OFF reporta `ok` con nota: no escribir evidencia es el comportamiento esperado.
 *
 * Runbook de rollout/canary: `docs/operations/runbooks/candidate-identity-rollout.md`.
 */

export const HIRING_CANDIDATE_IDENTITY_NEEDS_REVIEW_BACKLOG_SIGNAL_ID =
  'hiring.candidate_identity.needs_review_backlog'
export const HIRING_CANDIDATE_IDENTITY_EVIDENCE_COVERAGE_GAP_SIGNAL_ID =
  'hiring.candidate_identity.evidence_coverage_gap'

const AUDIT_TABLE = 'greenhouse_hiring.candidate_identity_display_audit'
const EVIDENCE_TABLE = 'greenhouse_hiring.candidate_identity_intake_evidence'
const APPLICATION_TABLE = 'greenhouse_hiring.hiring_application'

const RUNBOOK_EVIDENCE = {
  kind: 'doc' as const,
  label: 'Runbook',
  value: 'docs/operations/runbooks/candidate-identity-rollout.md',
}

const ADR_EVIDENCE = {
  kind: 'doc' as const,
  label: 'ADR',
  value: 'docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md',
}

const unknownSignal = (
  signalId: string,
  source: string,
  label: string,
): ReliabilitySignal => ({
  signalId,
  moduleKey: 'hiring',
  kind: 'data_quality',
  source,
  label,
  severity: 'unknown',
  observedAt: null,
  summary: 'No se pudo evaluar la señal de identidad del intake de candidatos.',
  evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
})

// ── 1. Backlog de needs_review sin corrección humana (data_quality, steady=0) ──

type NeedsReviewBacklogRow = {
  pending_rows: number
  pending_profiles: number
}

/**
 * Filas del audit con `outcome='needs_review'` (discrepancia sustantiva, CAS conflict o drift
 * de allowlist) cuya Person NO tiene una corrección humana aplicada DESPUÉS de esa fila. Cada
 * una es una decisión humana pendiente: el automatismo derivó fail-closed (D3) y nadie resolvió.
 *
 * Steady=0. Severidad: 1-5 ⇒ `warning` (resolver con el command de corrección humana —
 * capability `hiring.candidate.correct_display`); >5 ⇒ `error` (backlog sistemático: o el
 * clasificador está derivando demasiado o nadie está drenando la cola).
 */
export const getHiringCandidateIdentityNeedsReviewBacklogSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Identidad de candidatos: needs_review sin resolver'

  try {
    const rows = await runGreenhousePostgresQuery<NeedsReviewBacklogRow>(`
      SELECT COUNT(*)::int AS pending_rows,
             COUNT(DISTINCT a.identity_profile_id)::int AS pending_profiles
        FROM ${AUDIT_TABLE} a
       WHERE a.outcome = 'needs_review'
         AND NOT EXISTS (
           SELECT 1
             FROM ${AUDIT_TABLE} h
            WHERE h.identity_profile_id = a.identity_profile_id
              AND h.source = 'human'
              AND h.outcome = 'applied'
              AND h.created_at >= a.created_at
         )`)

    const row = rows[0] ?? { pending_rows: 0, pending_profiles: 0 }
    const pendingRows = Number(row.pending_rows)
    const pendingProfiles = Number(row.pending_profiles)

    return {
      signalId: HIRING_CANDIDATE_IDENTITY_NEEDS_REVIEW_BACKLOG_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringCandidateIdentityNeedsReviewBacklogSignal',
      label,
      severity: pendingRows === 0 ? 'ok' : pendingRows <= 5 ? 'warning' : 'error',
      summary:
        pendingRows === 0
          ? 'Sin needs_review pendientes: toda derivación a humano fue resuelta o no ha ocurrido.'
          : `${pendingRows} fila(s) needs_review sobre ${pendingProfiles} identidad(es) sin corrección humana posterior. El automatismo derivó fail-closed (D3) y falta la decisión humana: resolver vía correctCandidateIdentityDisplayName (capability hiring.candidate.correct_display), nunca SQL manual.`,
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'pending_rows', value: String(pendingRows) },
        { kind: 'metric', label: 'pending_profiles', value: String(pendingProfiles) },
        {
          kind: 'sql',
          label: 'Query',
          value: `${AUDIT_TABLE} outcome='needs_review' sin fila human/applied posterior de la misma identidad`,
        },
        RUNBOOK_EVIDENCE,
        ADR_EVIDENCE,
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', {
      tags: { source: 'reliability_hiring_candidate_identity_needs_review' },
    })

    return unknownSignal(
      HIRING_CANDIDATE_IDENTITY_NEEDS_REVIEW_BACKLOG_SIGNAL_ID,
      'getHiringCandidateIdentityNeedsReviewBacklogSignal',
      label,
    )
  }
}

// ── 2. Gap de cobertura de evidencia con flag ON (data_quality, steady=0) ────

type EvidenceCoverageRow = {
  evidence_rows: number
  missing_applications: number
}

/**
 * Con `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED=true`, TODA application nueva debe dejar
 * su fila de evidencia (el write vive en el mismo submit; el degrade a Sentry existe pero no
 * debe volverse régimen). Esta señal detecta el silent-skip: applications posteriores a la
 * primera evidencia observada (o de las últimas 24h si aún no existe ninguna) sin fila en
 * `candidate_identity_intake_evidence`, con 5 min de gracia por submissions en vuelo.
 *
 * Flag OFF ⇒ `ok` con nota (no escribir evidencia es el comportamiento esperado; la señal no
 * consulta la DB). Steady=0 con flag ON. Severidad: 1-3 ⇒ `warning`; >3 ⇒ `error`.
 */
export const getHiringCandidateIdentityEvidenceCoverageGapSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Identidad de candidatos: cobertura de evidencia del intake'

  if (!isCandidateIdentityNormalizationEnabled()) {
    return {
      signalId: HIRING_CANDIDATE_IDENTITY_EVIDENCE_COVERAGE_GAP_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringCandidateIdentityEvidenceCoverageGapSignal',
      label,
      severity: 'ok',
      summary:
        'Flag HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED OFF: el intake no escribe evidencia por diseño (señal inactiva hasta el flip — ver runbook).',
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'flag', value: 'off' },
        RUNBOOK_EVIDENCE,
        ADR_EVIDENCE,
      ],
    }
  }

  try {
    const rows = await runGreenhousePostgresQuery<EvidenceCoverageRow>(`
      SELECT
        (SELECT COUNT(*)::int FROM ${EVIDENCE_TABLE}) AS evidence_rows,
        (SELECT COUNT(*)::int
           FROM ${APPLICATION_TABLE} ha
          WHERE ha.created_at >= COALESCE(
                  (SELECT MIN(created_at) FROM ${EVIDENCE_TABLE}),
                  NOW() - INTERVAL '24 hours')
            AND ha.created_at < NOW() - INTERVAL '5 minutes'
            AND NOT EXISTS (
              SELECT 1 FROM ${EVIDENCE_TABLE} e
               WHERE e.application_id = ha.application_id
            )) AS missing_applications`)

    const row = rows[0] ?? { evidence_rows: 0, missing_applications: 0 }
    const evidenceRows = Number(row.evidence_rows)
    const missing = Number(row.missing_applications)

    return {
      signalId: HIRING_CANDIDATE_IDENTITY_EVIDENCE_COVERAGE_GAP_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringCandidateIdentityEvidenceCoverageGapSignal',
      label,
      severity: missing === 0 ? 'ok' : missing <= 3 ? 'warning' : 'error',
      summary:
        missing === 0
          ? 'Flag ON y sin gap: toda application nueva del período observado tiene su fila de evidencia.'
          : evidenceRows === 0
            ? `Flag ON, CERO filas de evidencia y ${missing} application(s) en las últimas 24h sin evidencia. Si hubo postulaciones desde el flip, el write path está silencioso (revisar Sentry dominio hiring); si el flag recién se prendió, correr el canary del runbook para confirmar.`
            : `${missing} application(s) posteriores a la primera evidencia sin fila propia con el flag ON: el write path del intake está saltándose la evidencia (degrade silencioso). Revisar Sentry dominio hiring y el canary del runbook.`,
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'missing_applications', value: String(missing) },
        { kind: 'metric', label: 'evidence_rows_total', value: String(evidenceRows) },
        {
          kind: 'sql',
          label: 'Query',
          value: `${APPLICATION_TABLE} creadas post-primera-evidencia (o 24h) sin fila en ${EVIDENCE_TABLE} (gracia 5 min)`,
        },
        RUNBOOK_EVIDENCE,
        ADR_EVIDENCE,
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', {
      tags: { source: 'reliability_hiring_candidate_identity_evidence_gap' },
    })

    return unknownSignal(
      HIRING_CANDIDATE_IDENTITY_EVIDENCE_COVERAGE_GAP_SIGNAL_ID,
      'getHiringCandidateIdentityEvidenceCoverageGapSignal',
      label,
    )
  }
}

// ── Agregador (wiring canónico en get-reliability-overview) ─────────────────

/**
 * Las dos señales de identidad del intake. Cada getter degrada honesto a `unknown` por su
 * cuenta; el agregador nunca lanza (mismo patrón que `getHiringAssessmentAiRunSignals`).
 */
export const getHiringCandidateIdentitySignals = async (): Promise<ReliabilitySignal[]> =>
  Promise.all([
    getHiringCandidateIdentityNeedsReviewBacklogSignal(),
    getHiringCandidateIdentityEvidenceCoverageGapSignal(),
  ])
