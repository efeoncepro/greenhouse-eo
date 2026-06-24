import 'server-only'

/**
 * TASK-1235 — Growth AI Visibility · Report command (Slice 2, server-only).
 *
 * `readGraderReport` es el primitive canónico (Full API parity) del reporte:
 * carga el `grader_score` + `normalized_findings` persistidos (TASK-1227) + la
 * metadata del run y delega en el builder PURO. NO computa score ni corre LLM —
 * el reporte es derivación on-read pura (sin tabla `grader_reports` en V1). Todos
 * los consumers (admin, superficie pública futura, HubSpot handoff, Nexa/MCP) LEEN
 * por acá; ninguno reimplementa la derivación.
 */

import { captureWithDomain } from '@/lib/observability/capture'

import { readGraderScore } from '../scoring/command'
import { getPreviousComparableScore } from '../scoring/store'
import { getGraderRun } from '../store'
import { buildGraderReport, toPublicGraderReport, type ReportRunMeta } from './builder'
import { type PreviousScoreInput } from './trend'
import { type GraderReport, type PublicGraderReport } from './contracts'

export class GraderReportError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GraderReportError'
    this.code = code
  }
}

export interface GraderReportResult {
  report: GraderReport
  publicReport: PublicGraderReport
}

/**
 * Construye el reporte interno + el DTO público de un run.
 * - `run_not_found`: el run no existe.
 * - `score_not_found`: el run no tiene score persistido (correr `scoreGraderRun` antes).
 */
export const readGraderReport = async (input: {
  runId: string
  scoreVersion?: string
}): Promise<GraderReportResult> => {
  const run = await getGraderRun(input.runId)

  if (!run) {
    throw new GraderReportError('run_not_found', 'El run no existe.')
  }

  const { score, findings } = await readGraderScore(input.runId, input.scoreVersion)

  if (!score) {
    throw new GraderReportError('score_not_found', 'El run no tiene score persistido todavía.')
  }

  try {
    const runMeta: ReportRunMeta = {
      runId: run.runId,
      status: run.status,
      promptPackVersion: run.promptPackVersion,
      finishedAt: run.finishedAt
    }

    // Run previo comparable para la tendencia (TASK-1236): el score más reciente
    // del mismo perfil + score_version anterior a este run. null → sin histórico.
    const previousRow = await getPreviousComparableScore({
      profileId: run.profileId,
      scoreVersion: score.scoreVersion,
      currentRunId: run.runId
    })

    const previous: PreviousScoreInput | null = previousRow
      ? { score: previousRow.score, promptPackVersion: previousRow.promptPackVersion, finishedAt: previousRow.finishedAt }
      : null

    const report = buildGraderReport({ score, findings, run: runMeta, previous })

    return { report, publicReport: toPublicGraderReport(report) }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_report_command' },
      extra: { runId: input.runId }
    })

    throw new GraderReportError('report_build_failed', 'No fue posible construir el reporte.')
  }
}
