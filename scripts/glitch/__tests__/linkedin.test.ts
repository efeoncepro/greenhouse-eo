import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'

import { GlitchPieceError } from '@/lib/glitch-composition'

import { checkCarouselForLinkedIn, LINKEDIN_DOCUMENT_LIMITS } from '../linkedin'

const pdfWith = async (sizes: [number, number][]) => {
  const doc = await PDFDocument.create()

  for (const [w, h] of sizes) doc.addPage([w, h])

  return Buffer.from(await doc.save())
}

describe('checkCarouselForLinkedIn (límites de documentos de LinkedIn, verificados el 2026-09-27)', () => {
  it('un carrusel 4:5 de 10 páginas iguales pasa y se mide', async () => {
    const measured = await checkCarouselForLinkedIn(await pdfWith(Array.from({ length: 10 }, () => [810, 1012.5] as [number, number])))

    expect(measured.pages).toBe(10)
    expect(measured.pageSizes).toHaveLength(1)
  })

  it('páginas de distinto tamaño fallan con carousel-too-heavy', async () => {
    const error = await checkCarouselForLinkedIn(await pdfWith([[810, 1012.5], [810, 810]])).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GlitchPieceError)
    expect((error as GlitchPieceError).code).toBe('carousel-too-heavy')
  })

  it('más de 300 páginas falla', async () => {
    const error = await checkCarouselForLinkedIn(await pdfWith(Array.from({ length: LINKEDIN_DOCUMENT_LIMITS.maxPages + 1 }, () => [100, 125] as [number, number]))).catch((e: unknown) => e)

    expect((error as GlitchPieceError).code).toBe('carousel-too-heavy')
  })

  it('la fuente del límite queda citada con fecha de verificación', () => {
    expect(LINKEDIN_DOCUMENT_LIMITS).toMatchObject({ maxBytes: 100 * 1024 * 1024, source: expect.stringContaining('linkedin.com/help'), verifiedOn: '2026-09-27' })
  })
})
