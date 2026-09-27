/**
 * El carrusel de Glitch se sube a LinkedIn como DOCUMENTO (PDF). Antes de entregarlo, se mide contra los límites de la
 * plataforma; si no los cumple, falla con `carousel-too-heavy` en vez de entregar un archivo que LinkedIn rechazaría.
 */

import { PDFDocument } from 'pdf-lib'

import { GlitchPieceError } from '@/lib/glitch-composition'

/**
 * Límites de LinkedIn para documentos (el carrusel se sube como documento). Fuente: LinkedIn Help, «Upload and share
 * documents on LinkedIn» (https://www.linkedin.com/help/linkedin/answer/a518909), verificado el 2026-09-27: «The file
 * size cannot exceed 100MB and 300 pages» y «PDFs with multiple sized pages must be fit to the same page size».
 */
export const LINKEDIN_DOCUMENT_LIMITS = {
  maxBytes: 100 * 1024 * 1024,
  maxPages: 300,
  uniformPageSize: true,
  source: 'https://www.linkedin.com/help/linkedin/answer/a518909',
  verifiedOn: '2026-09-27'
} as const

/** Verifica el PDF del carrusel contra los límites de LinkedIn; devuelve lo medido. */
export const checkCarouselForLinkedIn = async (pdf: Buffer) => {
  const doc = await PDFDocument.load(pdf)
  const sizes = new Set(doc.getPages().map((p) => `${Math.round(p.getWidth())}x${Math.round(p.getHeight())}`))
  const measured = { bytes: pdf.length, pages: doc.getPageCount(), pageSizes: [...sizes] }
  const problems: string[] = []

  if (measured.bytes > LINKEDIN_DOCUMENT_LIMITS.maxBytes) problems.push(`pesa ${(measured.bytes / 1_048_576).toFixed(1)} MB (máximo 100 MB)`)
  if (measured.pages > LINKEDIN_DOCUMENT_LIMITS.maxPages) problems.push(`tiene ${measured.pages} páginas (máximo 300)`)
  if (sizes.size > 1) problems.push(`mezcla tamaños de página (${measured.pageSizes.join(', ')})`)

  if (problems.length > 0) {
    throw new GlitchPieceError(`El carrusel no se puede subir a LinkedIn como documento: ${problems.join('; ')}.`, 'carousel-too-heavy', problems.map((message) => ({ code: 'carousel-too-heavy', message })))
  }

  return measured
}

