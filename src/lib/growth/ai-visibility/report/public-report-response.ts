/**
 * TASK-1330 — Ensamblador compartido del payload público del informe (headless).
 *
 * SSOT del body que sirven AMBAS rutas públicas: `/report/[token]` (largo) y
 * `/report/short-link/[code]` (corto, render-in-place). Un solo lugar arma
 * `{ report, model, modelVersion, header, ... }` → cero drift entre superficies
 * (Full API Parity). PURO (sin IO): recibe el snapshot ya leído + el `reportUrl`
 * que va en `shareFacts` (largo o corto según la superficie).
 */

import {
  modelFromPublicReport,
  type ReportArtifactModel
} from '@/components/growth/ai-visibility/report-artifact/model'
import { GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION } from '@/lib/growth/ai-visibility/report/contracts'
import { buildReportHeader } from '@/lib/growth/ai-visibility/report/report-header'
import { type PublicReportSnapshot } from '@/lib/growth/ai-visibility/report/snapshot'

export interface PublicReportResponseBody {
  report: PublicReportSnapshot['publicReport']
  model: ReportArtifactModel
  modelVersion: typeof GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION
  header: ReturnType<typeof buildReportHeader>
  runPublicId: string
  asOf: string
  expiresAt: string | null
}

/**
 * Arma el body render-ready desde un snapshot público inmutable. `reportUrl` es el URL que se
 * expone en `model.viewFacts.shareFacts.reportUrl` (TASK-1331): la ruta del token pasa el largo,
 * la ruta del short link pasa el corto — mismo modelo, misma derivación, sin recomputar scoring.
 */
export const buildPublicReportResponseBody = (input: {
  snapshot: PublicReportSnapshot
  reportUrl: string
}): PublicReportResponseBody => {
  const model = modelFromPublicReport(input.snapshot.publicReport, 'publicWeb', {
    reportUrl: input.reportUrl
  })

  const header = buildReportHeader({
    organizationName: input.snapshot.brandName,
    asOf: input.snapshot.asOf
  })

  return {
    report: input.snapshot.publicReport,
    model,
    modelVersion: GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION,
    header,
    runPublicId: input.snapshot.runPublicId,
    asOf: input.snapshot.asOf,
    expiresAt: input.snapshot.expiresAt
  }
}
