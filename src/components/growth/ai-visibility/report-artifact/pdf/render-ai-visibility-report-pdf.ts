import 'server-only'

import { createElement } from 'react'

import { renderToBuffer } from '@react-pdf/renderer'

import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'

import type { ReportArtifactModel } from '../model'
import type { ReportHeader } from '../web/AiVisibilityReportArtifact'

import AiVisibilityReportPdf from './AiVisibilityReportPdf'
import {
  resolveAiVisibilityReportPdfPresentation,
  type AiVisibilityReportPdfPresentationContext
} from './report-pdf-presentation'
import { fitReportPdfOrganizationName } from './report-pdf-name-fit'
import { ReportPdfBrand as B, ReportPdfEditorial as E, ReportPdfFonts as F, px } from './report-pdf-tokens'

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
  context?: AiVisibilityReportPdfPresentationContext
}): Promise<Buffer> => {
  await ensurePdfFontsRegistered()

  const presentation = resolveAiVisibilityReportPdfPresentation(input)

  const role =
    presentation.audience === 'client' ? E.type.editorial.organizationClient : E.type.editorial.organizationProspect

  const contentWidth = 595.28 - px(B.cover.paddingPx[1] + B.cover.paddingPx[3])

  const logoWidth = presentation.clientLogo
    ? px(E.layout.cover.identity.logoBoxPx[0] + E.layout.cover.identity.clientGapPx)
    : 0

  const nameFit = await fitReportPdfOrganizationName({
    text: presentation.organizationName,
    fontFamily: F.display(role.weight),
    widthPt: contentWidth - logoWidth,
    maxHeightPt: px(E.type.editorial.organizationClient.sizePx * 3),
    maxFontSizePt: px(role.sizePx),
    minFontSizePt: px(E.type.editorial.emphasis.sizePx),
    lineHeight: role.lineHeight,
    trackingEm: role.tracking
  })

  // An unbreakable, oversized identity must never produce a clipped downloadable report.
  if (!nameFit.fits) throw new Error('ai_visibility_pdf_organization_name_overflow')
  const caption = E.type.editorial.caption

  const footerFit = await fitReportPdfOrganizationName({
    text: `${presentation.organizationName} · ${presentation.periodLabel}`,
    fontFamily: F.body,
    widthPt: contentWidth * 0.33 - px(E.layout.interior.footer.gapPx),
    maxHeightPt: px(B.interior.footer.centerHeightPx * 2),
    maxFontSizePt: px(caption.sizePx),
    minFontSizePt: px(caption.sizePx),
    lineHeight: caption.lineHeight,
    trackingEm: 0
  })

  const element = createElement(AiVisibilityReportPdf, {
    ...input,
    layout: { organizationNameFontSize: nameFit.fontSizePt, footerExpanded: !footerFit.fits }
  })

  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0])
}
