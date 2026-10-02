/**
 * El puente superficie → composer (TASK-1919): un intent de AXIS se traduce a un plan sin inventar nada, y
 * todo lo que el contrato o el operador no aprobó falla cerrado.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const intent = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'deck-proposal-cinematic-intent.json'), 'utf8')
) as SurfaceIntent

const expectCode = (fn: () => unknown, code: SurfacePieceError['code']) => {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(SurfacePieceError)
    expect((error as SurfacePieceError).code).toBe(code)

    return
  }

  throw new Error(`se esperaba SurfacePieceError ${code}`)
}

describe('planSurfacePiece', () => {
  it('traduce proposal-cinematic al catálogo del deck con las medidas que resolvió AXIS', () => {
    const piece = planSurfacePiece(intent, { artifactId: 'prueba' })

    expect(piece.catalog).toBe('graphic-line-deck')
    expect(piece.contentType).toBe('deck.proposal-cinematic')
    expect(piece.plan.slides).toHaveLength(1)

    const slots = piece.plan.slides[0]!.slots as Record<string, Record<string, unknown>>

    expect(slots.frame!.line).toBe('brand')
    expect(slots.frame!.stepsLayout).toBe('inline')
    expect(slots.frame!.margin).toBe(140)
    expect(slots.frame!.proofTop).toBe(740)
    expect(slots.frame!.answerPx).toBeGreaterThanOrEqual(140)
    expect(slots.frame!.answerPx).toBeLessThanOrEqual(176)
    expect(slots.voice!.answer).toBe('En todas')
    expect(slots.selection!.label).toBe('Cliente')

    // Una foto y tres íconos, todos como asset externo: el catálogo nunca dibuja ni lee rutas.
    expect(piece.assets.filter(a => a.kind === 'plate')).toHaveLength(1)
    expect(piece.assets.filter(a => a.kind === 'svg')).toHaveLength(3)
  })

  it('cuatro pasos pasan a columnas con los tokens de columns-4', () => {
    const four: SurfaceIntent = {
      ...intent,
      steps: [...intent.steps!, { glyph: 'medicion', kicker: 'On-Going', name: 'Performance Ops' }]
    }

    const slots = planSurfacePiece(four, { artifactId: 'prueba' }).plan.slides[0]!.slots as Record<string, Record<string, unknown>>

    expect(slots.frame!.stepsLayout).toBe('columns')
    expect(slots.frame!.iconPx).toBe(44)
  })

  it('una receta pendiente no tiene plantilla', () => {
    expectCode(
      () =>
        planSurfacePiece(
          { ...intent, surface: 'dooh', format: 'paleta-1x2', role: 'billboard', recipe: 'paleta', line: 'growth' },
          { artifactId: 'prueba' }
        ),
      'recipe-not-approved'
    )
  })

  it('lo que el contrato de AXIS rechaza nunca llega al composer', () => {
    expectCode(() => planSurfacePiece({ ...intent, format: 'caminero-3x1' }, { artifactId: 'prueba' }), 'surface-issues')
  })

  it('un intent sin `use` resuelve el uso de la receta: proposal', () => {
    const piece = planSurfacePiece(intent, { artifactId: 'prueba' })

    expect(intent.use).toBeUndefined()
    expect(piece.use).toBe('proposal')
  })

  it('el uso viaja del intent al plan, y en un brochure el eyebrow es el del autor', () => {
    const piece = planSurfacePiece(
      { ...intent, version: '0.1.2', use: 'brochure', voice: { ...intent.voice, eyebrow: 'Servicios creativos' } },
      { artifactId: 'prueba' }
    )

    const slots = piece.plan.slides[0]!.slots as Record<string, Record<string, unknown>>

    expect(piece.use).toBe('brochure')
    expect(piece.layout).toBe('service')
    expect(slots.voice!.eyebrow).toBe('Servicios creativos')
  })

  it('un uso que la receta no admite aborta con el código de AXIS', () => {
    try {
      planSurfacePiece(
        {
          contract: intent.contract,
          version: '0.1.2',
          surface: 'deck',
          format: intent.format,
          role: 'cover',
          recipe: 'cover-classic',
          line: 'growth',
          use: 'brochure',
          voice: { eyebrow: 'Brochure', question: '¿Qué hace Efeonce?', answer: ['Crecer'] }
        },
        { artifactId: 'prueba' }
      )
    } catch (error) {
      expect(error).toBeInstanceOf(SurfacePieceError)
      expect((error as SurfacePieceError).code).toBe('surface-issues')
      expect((error as SurfacePieceError).issues.map(issue => (issue as { code: string }).code)).toContain('use-not-for-recipe')

      return
    }

    throw new Error('se esperaba use-not-for-recipe')
  })

  it('un uso desconocido aborta con `use-invalid`', () => {
    expectCode(() => planSurfacePiece({ ...intent, version: '0.1.2', use: 'flyer' as never }, { artifactId: 'prueba' }), 'surface-issues')
  })

  it('`selection.anchor` del intent llega al adaptador de selección', () => {
    const slotsOf = (anchor?: string) =>
      planSurfacePiece(
        { ...intent, version: '0.1.2', selection: { ...intent.selection, ...(anchor ? { anchor } : {}) } },
        { artifactId: 'prueba' }
      ).plan.slides[0]!.slots as Record<string, Record<string, unknown>>

    expect(slotsOf().selection!.anchor).toBe('top-end')
    expect(slotsOf('bottom-end').selection!.anchor).toBe('bottom-end')
  })

  it('un ancla que no es una esquina del colaborador aborta', () => {
    expectCode(
      () => planSurfacePiece({ ...intent, version: '0.1.2', selection: { ...intent.selection, anchor: 'center' } }, { artifactId: 'prueba' }),
      'surface-issues'
    )
  })

  it('una foto sin texto alternativo falla', () => {
    expectCode(
      () => planSurfacePiece({ ...intent, photo: { ...intent.photo, alt: '' } }, { artifactId: 'prueba' }),
      'missing-photo'
    )
  })
})
