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

  it('una foto sin texto alternativo falla', () => {
    expectCode(
      () => planSurfacePiece({ ...intent, photo: { ...intent.photo, alt: '' } }, { artifactId: 'prueba' }),
      'missing-photo'
    )
  })
})
