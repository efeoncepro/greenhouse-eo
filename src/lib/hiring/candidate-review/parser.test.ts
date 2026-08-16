import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'

import { chunkCandidateText, hashCandidateDocument, parseCandidatePdf, redactCandidateContactText } from './parser'

describe('candidate review parser', () => {
  it('redacts contact and identity-like values before the text can enter the projection', () => {
    const result = redactCandidateContactText(
      'Candidate candidate@example.test +56 9 1234 5678 12.345.678-5 experience'
    )

    expect(result).not.toContain('candidate@example.test')
    expect(result).not.toContain('+56 9 1234 5678')
    expect(result).not.toContain('12.345.678-5')
    expect(result).toContain('[correo omitido]')
    expect(result).toContain('[teléfono omitido]')
  })

  it('extracts a bounded PDF as untrusted redacted text with a stable content hash', async () => {
    const document = await PDFDocument.create()
    const page = document.addPage()
    const font = await document.embedFont(StandardFonts.Helvetica)

    page.drawText('Content creator candidate@example.test portfolio evidence', { x: 40, y: 700, font, size: 12 })
    const bytes = await document.save()
    const parsed = await parseCandidatePdf(bytes)

    expect(parsed.status).toBe('ready')
    expect(parsed.text).toContain('Content creator')
    expect(parsed.text).toContain('[correo omitido]')
    expect(parsed.text).not.toContain('candidate@example.test')
    expect(hashCandidateDocument(bytes)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('chunks deterministically without returning unbounded text', () => {
    expect(chunkCandidateText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij'])
  })
})
