/**
 * El documento (TASK-1927, contrato 0.1.2): varias páginas validadas como un todo. Greenhouse no reimplementa ninguna
 * regla: las lee del resultado de `resolveSurfaceDocument`, y un solo issue deja al documento sin plan.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { planSurfaceDocument, planSurfacePiece, SurfacePieceError, type SurfaceDocumentIntent, type SurfaceIntent } from '../index'

const EXAMPLES = path.join(__dirname, '..', 'examples')

const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(EXAMPLES, file), 'utf8')) as T

const proposal = (): SurfaceDocumentIntent => read<SurfaceDocumentIntent>('deck-proposal-document.json')
const brochure = (): SurfaceDocumentIntent => read<SurfaceDocumentIntent>('deck-brochure-document.json')

const failure = (fn: () => unknown): SurfacePieceError => {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(SurfacePieceError)

    return error as SurfacePieceError
  }

  throw new Error('se esperaba SurfacePieceError')
}

const codes = (error: SurfacePieceError): string[] => error.issues.map(issue => (issue as { code: string }).code)

describe('planSurfaceDocument', () => {
  it('planea una lámina por página, en el orden del outline, con el manifest de documento de AXIS', () => {
    const document = planSurfaceDocument(proposal(), { artifactId: 'propuesta' })

    expect(document.catalog).toBe('graphic-line-deck')
    expect(document.use).toBe('proposal')
    expect(document.manifest.schema).toBe('axis.surface-document.v1')
    expect(document.manifest.pageCount).toBe(7)
    expect(document.plan.artifactId).toBe('propuesta')
    expect(document.plan.slides.map(slide => slide.contentType)).toEqual([
      'deck.proposal-cinematic',
      'deck.proposal-cinematic',
      'deck.proposal-cinematic',
      'deck.proposal-cinematic',
      'deck.proposal-cinematic.hero',
      'deck.proposal-cinematic.lines',
      'deck.method-staircase'
    ])
  })

  it('cada lámina tiene un id propio aunque la receta se repita', () => {
    const ids = planSurfaceDocument(proposal(), { artifactId: 'propuesta' }).plan.slides.map(slide => slide.slideId)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toMatch(/^p01-/)
    expect(ids[6]).toMatch(/^p07-/)
  })

  it('la línea del documento llega a la página que la omite y una página de servicio conserva la suya', () => {
    const slides = planSurfaceDocument(proposal(), { artifactId: 'propuesta' }).plan.slides
    const line = (index: number) => (slides[index]!.slots as Record<string, Record<string, unknown>>).frame!.line

    expect(line(0)).toBe('brand')
    expect(line(1)).toBe('engine')
    expect(line(4)).toBe('growth')
  })

  it('los assets son la unión de las páginas, sin repetir una referencia', () => {
    const document = planSurfaceDocument(proposal(), { artifactId: 'propuesta' })
    const refs = document.assets.map(asset => asset.ref)

    expect(new Set(refs).size).toBe(refs.length)
    expect(document.assets.filter(asset => asset.kind === 'plate')).toHaveLength(6)
  })

  it('la página de un documento compone igual que la misma pieza suelta', () => {
    const intent = proposal()
    const page = intent.pages[4] as Partial<SurfaceIntent>

    const alone = planSurfacePiece(
      { contract: 'efeonce.surface-composition', version: '0.1.2', surface: intent.surface, format: intent.format, use: intent.use, role: 'proposal', line: intent.line!, ...page } as SurfaceIntent,
      { artifactId: 'sola' }
    )

    const inDocument = planSurfaceDocument(intent, { artifactId: 'propuesta' }).plan.slides[4]!

    expect(inDocument.slots).toEqual(alone.plan.slides[0]!.slots)
  })

  it('una página de servicio sin prueba compone: la regla es «cifras sólo con fuente», no «siempre una cifra»', () => {
    const slots = planSurfaceDocument(proposal(), { artifactId: 'propuesta' }).plan.slides[1]!.slots as Record<string, unknown>

    expect(slots.proof).toBeUndefined()
    expect(slots.steps).toHaveLength(4)
  })

  it('un brochure sin portada al inicio ni cierre al final no se planea', () => {
    const intent = brochure()
    const error = failure(() => planSurfaceDocument({ ...intent, pages: intent.pages.slice(1, -1) }, { artifactId: 'brochure' }))

    expect(error.code).toBe('surface-issues')
    expect(codes(error)).toEqual(expect.arrayContaining(['brochure-cover-first', 'brochure-close-last']))
  })

  it('un brochure sin página de servicio no se planea', () => {
    const intent = brochure()
    const pages = intent.pages.filter(page => !((page as { recipe?: string }).recipe === 'proposal-cinematic' && ((page as { layout?: string }).layout ?? 'service') === 'service'))
    const error = failure(() => planSurfaceDocument({ ...intent, pages }, { artifactId: 'brochure' }))

    expect(codes(error)).toContain('brochure-needs-service-page')
  })

  it('el marco lleva la línea del documento: una portada con otra línea no se planea', () => {
    const intent = brochure()
    const pages = intent.pages.map((page, index) => (index === 0 ? { ...page, line: 'brand' } : page))
    const error = failure(() => planSurfaceDocument({ ...intent, pages } as SurfaceDocumentIntent, { artifactId: 'brochure' }))

    expect(codes(error)).toContain('document-line-mismatch')
  })

  it('el issue de una página llega con su índice y deja al documento entero sin plan', () => {
    const intent = proposal()
    const pages = intent.pages.map((page, index) => (index === 4 ? { ...page, proof: { text: 'Sky: +2.000 piezas', source: 'deck Sky' } } : page))
    const error = failure(() => planSurfaceDocument({ ...intent, pages } as SurfaceDocumentIntent, { artifactId: 'propuesta' }))

    expect(error.code).toBe('surface-issues')
    expect(codes(error).some(code => code.startsWith('page[4]:'))).toBe(true)
  })

  it('un documento sin páginas o de otra superficie lo rechaza AXIS', () => {
    const intent = proposal()

    expect(codes(failure(() => planSurfaceDocument({ ...intent, pages: [] }, { artifactId: 'x' })))).toContain('document-pages-required')
    expect(codes(failure(() => planSurfaceDocument({ ...intent, surface: 'web' }, { artifactId: 'x' })))).toContain('document-surface-invalid')
  })

  // PENDIENTE de TASK-1927 (Slice 3): AXIS acepta el brochure de ejemplo, pero su portada y su cierre
  // (`cover-brochure`, `close-brochure`) todavía no tienen plantilla. Cuando la tengan, este test pasa a exigir el plan.
  it('el brochure de ejemplo es válido para AXIS y hoy se detiene en la portada, que aún no tiene plantilla', () => {
    const error = failure(() => planSurfaceDocument(brochure(), { artifactId: 'brochure' }))

    expect(error.code).toBe('recipe-without-template')
    expect(error.message).toContain('cover-brochure')
  })
})
