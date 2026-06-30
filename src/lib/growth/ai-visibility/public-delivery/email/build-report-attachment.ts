import 'server-only'

// Import from the SPECIFIC modules (pure model + server-only PDF renderer), NOT the
// report-artifact barrel: the barrel re-exports the 'use client' web component (MUI),
// which would bloat / break the ops-worker esbuild bundle (@core boundary) where the
// reactive email consumer runs. The model is pure TS; the PDF renderer is server-only.
import { modelFromPublicReport, type ReportArtifactModel } from '@/components/growth/ai-visibility/report-artifact/model'
import { renderAiVisibilityReportPdf } from '@/components/growth/ai-visibility/report-artifact/pdf/render-ai-visibility-report-pdf'
import type { ReportHeader } from '@/components/growth/ai-visibility/report-artifact/web/AiVisibilityReportArtifact'
import type { PublicGraderReport } from '@/lib/growth/ai-visibility/report/contracts'

/**
 * TASK-1250 Slice 2 — AI Visibility report email attachment builder.
 *
 * Deterministic server-side generator of the full report PDF attached to the lead
 * delivery email. Renders the TASK-1273 premium PDF from the FROZEN public snapshot
 * (`PublicGraderReport`) via the `attachment` variant of the report-artifact model.
 *
 * Leak-safe by construction: the input is the public DTO (`PublicGraderReport`) — a type
 * that structurally CANNOT carry `providerFindings`, `accuracyFindings`, raw provider
 * text, internal ids or PII. The `attachment` variant restricts disclosure further. Same
 * snapshot → same bytes (deterministic), which backs an idempotent resend.
 */
export interface AiVisibilityReportAttachment {
  filename: string
  content: Buffer
  contentType: 'application/pdf'
  /** Human-readable size for the email "attachment notice" (e.g. "~2.3 MB"). */
  sizeLabel: string
  /** Raw byte length, for delivery metadata / observability. */
  byteLength: number
}

/** Slugify the evaluated brand into a safe ASCII filename fragment. */
const slugifyOrganization = (organizationName: string): string => {
  const slug = organizationName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return slug || 'reporte'
}

/** Format a byte count into a compact, email-friendly size label. */
const formatSizeLabel = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024

  if (kb < 1024) return `~${Math.round(kb)} KB`
  const mb = kb / 1024

  return `~${mb.toFixed(1)} MB`
}

export const buildAiVisibilityReportAttachmentFilename = (organizationName: string): string =>
  `informe-visibilidad-ia-${slugifyOrganization(organizationName)}.pdf`

/**
 * Núcleo: renderiza el adjunto desde un `ReportArtifactModel` ya armado. Lo usan tanto el path
 * público (snapshot → modelFromPublicReport) como el cross-sell operador (TASK-1279, reporte
 * leak-safe del cliente → modelFromClientReport), sin duplicar el render PDF.
 */
export const buildAiVisibilityReportAttachmentFromModel = async (input: {
  model: ReportArtifactModel
  header: ReportHeader
}): Promise<AiVisibilityReportAttachment> => {
  const content = await renderAiVisibilityReportPdf({ model: input.model, header: input.header })

  return {
    filename: buildAiVisibilityReportAttachmentFilename(input.header.organizationName),
    content,
    contentType: 'application/pdf',
    sizeLabel: formatSizeLabel(content.length),
    byteLength: content.length
  }
}

export const buildAiVisibilityReportAttachment = async (input: {
  publicReport: PublicGraderReport
  header: ReportHeader
}): Promise<AiVisibilityReportAttachment> =>
  buildAiVisibilityReportAttachmentFromModel({
    model: modelFromPublicReport(input.publicReport, 'attachment'),
    header: input.header
  })
