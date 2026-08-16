import { createHash } from 'node:crypto'

export const CANDIDATE_REVIEW_EXTRACTION_VERSION = 'pdfjs-5.4.296-v1'
export const CANDIDATE_REVIEW_REDACTION_VERSION = 'contact-minimization-v1'

const MAX_PAGES = 40
const MAX_TEXT_CHARS = 120_000
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PHONE_PATTERN = /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/g
const NATIONAL_ID_PATTERN = /\b\d{1,3}(?:[.\s]\d{3}){2}-?[\dkK]\b/g

export const redactCandidateContactText = (value: string) =>
  value
    .replace(EMAIL_PATTERN, '[correo omitido]')
    .replace(PHONE_PATTERN, '[teléfono omitido]')
    .replace(NATIONAL_ID_PATTERN, '[identidad omitida]')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export const hashCandidateDocument = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

export const parseCandidatePdf = async (bytes: Uint8Array) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const task = pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: false,
    stopAtErrors: true
  })

  const document = await task.promise

  try {
    if (document.numPages > MAX_PAGES) throw new Error('candidate_review_pdf_page_limit')

    const parts: string[] = []
    let total = 0

    for (let index = 1; index <= document.numPages; index += 1) {
      const page = await document.getPage(index)
      const content = await page.getTextContent()

      const text = content.items
        .map(item => ('str' in item && typeof item.str === 'string' ? item.str : ''))
        .filter(Boolean)
        .join(' ')

      total += text.length
      if (total > MAX_TEXT_CHARS) throw new Error('candidate_review_pdf_text_limit')
      parts.push(text)
      page.cleanup()
    }

    const redactedText = redactCandidateContactText(parts.join('\n'))

    return {
      status: redactedText ? ('ready' as const) : ('ocr_required' as const),
      text: redactedText || null,
      pageCount: document.numPages
    }
  } finally {
    await document.destroy()
  }
}

export const chunkCandidateText = (text: string, size = 6000) => {
  const chunks: string[] = []

  for (let offset = 0; offset < text.length; offset += size) chunks.push(text.slice(offset, offset + size))

  return chunks
}
