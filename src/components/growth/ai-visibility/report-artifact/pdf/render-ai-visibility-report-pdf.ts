import 'server-only'

import { createElement } from 'react'

import { renderToBuffer } from '@react-pdf/renderer'

import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'

import type { ReportArtifactModel } from '../model'
import type { ReportHeader } from '../web/AiVisibilityReportArtifact'

import AiVisibilityReportPdf from './AiVisibilityReportPdf'

/**
 * TASK-1273 — Render del informe AI Visibility a un Buffer PDF (server-side).
 *
 * Único punto de entrada para consumers (TASK-1250 attachment). Garantiza las
 * fuentes registradas antes del render. El `model` DEBE ser el variant
 * `attachment` (`modelFromPublicReport(report, 'attachment')`) — leak-safe por
 * tipo; este renderer NO recibe `GraderReport` interno ni raw provider data.
 *
 * Uso:
 *   const model = modelFromPublicReport(publicReport, 'attachment')
 *   const buffer = await renderAiVisibilityReportPdf({ model, header })
 *   // adjuntar `buffer` como application/pdf
 */
export const renderAiVisibilityReportPdf = async (input: {
  model: ReportArtifactModel
  header: ReportHeader
}): Promise<Buffer> => {
  await ensurePdfFontsRegistered()

  const element = createElement(AiVisibilityReportPdf, input)

  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0])
}
