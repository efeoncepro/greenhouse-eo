import 'server-only'

// TASK-1364 — Persistencia de la evidencia de validez (append-only, documentación AI-Act).
// Snapshot inmutable de un reporte computado: reproducible desde fuentes append-only
// (scores congelados por 1383 + outcomes canónicos), nunca editable.

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { AssessmentValidityReport } from './get-validity'

export interface ValidityEvidenceRecord {
  evidenceId: string
  computedAt: string
}

export const persistValidityEvidence = async (
  report: AssessmentValidityReport,
  actorUserId: string | null,
): Promise<ValidityEvidenceRecord> => {
  const evidenceId = `avev-${randomUUID()}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_hr.assessment_validity_evidence
       (evidence_id, scope_json, window_months, outcome_source, sample_size, verdict, result_json, computed_by)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7::jsonb, $8)`,
    [
      evidenceId,
      JSON.stringify(report.scope),
      report.windowMonths,
      report.outcomeSource,
      report.overall.sampleSize,
      report.overall.verdict,
      JSON.stringify(report),
      actorUserId,
    ],
  )

  return { evidenceId, computedAt: report.computedAt }
}
