import { describe, expect, it } from 'vitest'

import { SAMPLE_PUBLIC_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'
import type { ReportHeader } from '@/components/growth/ai-visibility/report-artifact/web/AiVisibilityReportArtifact'

import {
  buildAiVisibilityReportAttachment,
  buildAiVisibilityReportAttachmentFilename
} from '../build-report-attachment'

const HEADER: ReportHeader = {
  organizationName: 'Globe',
  reportDate: '19 may 2026',
  periodLabel: '4 – 19 de mayo de 2026'
}

// Strings internal-only que viven en SAMPLE_INTERNAL_REPORT y NUNCA deben cruzar al
// adjunto público (mismo contrato que report-artifact-pdf-no-leak).
const INTERNAL_LEAK_STRINGS = [
  'INTERNAL',
  'invisible en Perplexity',
  'confusión con una marca homónima'
]

describe('buildAiVisibilityReportAttachment', () => {
  it('input contract is leak-safe: the public snapshot carries no internal-only markers', () => {
    // Capa C en el borde del builder: el DTO que alimenta el render PDF es el público,
    // derivado del interno por el builder real — debe estar limpio de campos internos.
    const serialized = JSON.stringify(SAMPLE_PUBLIC_REPORT)

    for (const leak of INTERNAL_LEAK_STRINGS) {
      expect(serialized).not.toContain(leak)
    }
  })

  it('produces a valid, non-empty PDF buffer from the public snapshot', async () => {
    const attachment = await buildAiVisibilityReportAttachment({ publicReport: SAMPLE_PUBLIC_REPORT, header: HEADER })

    expect(attachment.contentType).toBe('application/pdf')
    expect(attachment.content.length).toBeGreaterThan(1000)
    // PDF signature
    expect(attachment.content.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(attachment.byteLength).toBe(attachment.content.length)
    expect(attachment.sizeLabel).toMatch(/^(~\d+(\.\d)?\s(KB|MB)|\d+\sB)$/)
  })

  it('builds a slugified, ascii-safe filename from the evaluated brand', () => {
    expect(buildAiVisibilityReportAttachmentFilename('Globe')).toBe('informe-visibilidad-ia-globe.pdf')
    expect(buildAiVisibilityReportAttachmentFilename('Acme Córp & Cía.')).toBe('informe-visibilidad-ia-acme-corp-cia.pdf')
    expect(buildAiVisibilityReportAttachmentFilename('   ')).toBe('informe-visibilidad-ia-reporte.pdf')
  })
})
