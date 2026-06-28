import 'server-only'

/**
 * TASK-1239 — Growth AI Visibility · Public report snapshot (EPIC-020 A, server-only).
 *
 * `publishGraderReportSnapshot` congela el `PublicGraderReport` vigente (vía
 * `readGraderReport`) en una fila INMUTABLE de `grader_reports` + emite un token NO
 * enumerable. Idempotente por `(run_id, score_version, report_version,
 * recommendation_pack_version)`: re-publicar el mismo estado devuelve el snapshot
 * existente (no duplica, no muta). NO publica un score gateado (`review_required`/
 * `insufficient_data`). `readPublicGraderReport(token)` lo sirve sin sesión interna
 * (el token ES la auth) respetando `expires_at`. El reporte INTERNO sigue on-read.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isReportReviewApproved } from '../review/queries'

import { readGraderReport } from './command'
import { type PublicGraderReport } from './contracts'

export class GraderSnapshotError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GraderSnapshotError'
    this.code = code
  }
}

export interface PublishedSnapshot {
  reportId: string
  runId: string
  reportToken: string
  asOf: string
  expiresAt: string | null
  publicReport: PublicGraderReport
}

type RawSnapshot = {
  report_id: unknown
  run_id: unknown
  report_token: unknown
  as_of: unknown
  expires_at: unknown
  public_report_json: unknown
}

const toIso = (value: unknown): string => new Date(value as string | number | Date).toISOString()

const projectSnapshot = (row: RawSnapshot): PublishedSnapshot => ({
  reportId: String(row.report_id),
  runId: String(row.run_id),
  reportToken: String(row.report_token),
  asOf: toIso(row.as_of),
  expiresAt: row.expires_at ? toIso(row.expires_at) : null,
  publicReport: row.public_report_json as PublicGraderReport
})

/**
 * Publica (congela) el snapshot público de un run. Idempotente por versión; no
 * publica scores gateados. Propaga `GraderReportError` (run/score not found).
 */
export const publishGraderReportSnapshot = async (input: {
  runId: string
  scoreVersion?: string
  expiresAt?: string | null
  createdBy?: string | null
}): Promise<PublishedSnapshot> => {
  const { report, publicReport } = await readGraderReport({ runId: input.runId, scoreVersion: input.scoreVersion })

  // `insufficient_data` NUNCA es publicable (cobertura insuficiente; no hay revisión que lo
  // desbloquee). `review_required` SÓLO es publicable con aprobación humana vigente para esa
  // `score_version` (TASK-1244): el gate consulta el estado de revisión, no lo bloquea ciego.
  if (report.gate.status === 'insufficient_data') {
    throw new GraderSnapshotError(
      'not_releasable',
      'El reporte no es publicable: cobertura insuficiente.'
    )
  }

  if (report.gate.status === 'review_required') {
    const approved = await isReportReviewApproved(report.runId, report.scoreVersion)

    if (!approved) {
      throw new GraderSnapshotError(
        'not_releasable',
        'El reporte requiere revisión humana antes de publicarse (aprobación pendiente o rechazada).'
      )
    }
  }

  const inserted = await runGreenhousePostgresQuery<RawSnapshot>(
    `INSERT INTO greenhouse_growth.grader_reports
       (run_id, score_version, report_version, recommendation_pack_version, audience, public_report_json, expires_at, created_by)
     VALUES ($1, $2, $3, $4, 'public', $5::jsonb, $6, $7)
     ON CONFLICT (run_id, score_version, report_version, recommendation_pack_version) DO NOTHING
     RETURNING report_id, run_id, report_token, as_of, expires_at, public_report_json`,
    [
      report.runId,
      report.scoreVersion,
      report.reportVersion,
      report.recommendationPackVersion,
      JSON.stringify(publicReport),
      input.expiresAt ?? null,
      input.createdBy ?? null
    ]
  )

  if (inserted[0]) {
    return projectSnapshot(inserted[0])
  }

  // Conflicto (mismo estado ya publicado): devolver el snapshot INMUTABLE existente
  // (el payload congelado original, no el recién derivado).
  const existing = await runGreenhousePostgresQuery<RawSnapshot>(
    `SELECT report_id, run_id, report_token, as_of, expires_at, public_report_json
       FROM greenhouse_growth.grader_reports
      WHERE run_id = $1 AND score_version = $2 AND report_version = $3 AND recommendation_pack_version = $4
      LIMIT 1`,
    [report.runId, report.scoreVersion, report.reportVersion, report.recommendationPackVersion]
  )

  if (!existing[0]) {
    throw new GraderSnapshotError('snapshot_persist_failed', 'No fue posible persistir ni recuperar el snapshot.')
  }

  return projectSnapshot(existing[0])
}

/**
 * Lee el snapshot público por token (sin sesión; el token ES la auth). Respeta
 * `expires_at` en SQL (expirado o inexistente → null, sin distinguir para no filtrar
 * existencia). NUNCA recomputa: sirve el payload congelado.
 */
export const readPublicGraderReport = async (reportToken: string): Promise<PublishedSnapshot | null> => {
  const rows = await runGreenhousePostgresQuery<RawSnapshot>(
    `SELECT report_id, run_id, report_token, as_of, expires_at, public_report_json
       FROM greenhouse_growth.grader_reports
      WHERE report_token = $1 AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1`,
    [reportToken]
  )

  return rows[0] ? projectSnapshot(rows[0]) : null
}
