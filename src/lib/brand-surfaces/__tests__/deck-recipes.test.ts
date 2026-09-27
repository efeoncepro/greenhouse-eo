/**
 * Las recetas aprobadas de la superficie deck (TASK-1919): cada intent de ejemplo se traduce a un plan del catálogo
 * `graphic-line-deck` con las medidas que resolvió AXIS, el plan pasa el contrato de slots de su plantilla, y lo que
 * la receta no admite falla cerrado.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLES = path.join(__dirname, '..', 'examples')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const example = (recipe: string): SurfaceIntent =>
  JSON.parse(fs.readFileSync(path.join(EXAMPLES, `deck-${recipe}-intent.json`), 'utf8')) as SurfaceIntent

const registry = JSON.parse(fs.readFileSync(path.join(CATALOG, 'registry.json'), 'utf8')) as {
  selector: { map: Record<string, string> }
  templates: { name: string; slotsRef: string }[]
}

/** El plan de la receta, validado contra el contrato de slots de la plantilla que el registry le asigna. */
const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const template = registry.selector.map[piece.contentType]!
  const entry = registry.templates.find(t => t.name === template)!
  const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, entry.slotsRef), 'utf8')) as TemplateContract
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template } as SlideSpec, contract)

  return { piece, template, violations, slots: slide.slots as Record<string, Record<string, unknown>> }
}

/** El intent sin una de sus claves. */
const without = (intent: SurfaceIntent, key: string): SurfaceIntent => {
  const copy: Record<string, unknown> = { ...intent }

  delete copy[key]

  return copy as SurfaceIntent
}

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

describe('recetas aprobadas del deck', () => {
  it('section-classic: número dentro del anillo de pieces.deck.section y la voz a su izquierda', () => {
    const { piece, template, violations, slots } = plan(example('section-classic'))

    expect(piece.catalog).toBe('graphic-line-deck')
    expect(piece.contentType).toBe('deck.section-classic')
    expect(template).toBe('SectionClassic')
    expect(violations).toEqual([])
    expect(slots.frame!.ringCx).toBe('--gl-ring-cx=1420px')
    expect(slots.frame!.numberPx).toBe('--gl-number-px=190px')
    expect(slots.frame!.columnWidth).toBe('--gl-column-width=1080px')
    expect(slots.progress).toEqual({ number: '02', label: 'Sección 2 de 5' })
    expect(slots.voice!.answer).toBe('El dato')

    // El anillo y su arco los pinta AXIS: una capa SVG externa, nunca la plantilla.
    const layer = piece.assets.find(a => a.kind === 'svg')

    expect(layer?.ref).toMatch(/^asset-ref:layer:/)
    expect(layer && 'svg' in layer ? layer.svg : '').toContain('data-axis-kind="progress"')
  })

  it('section-classic: sin la voz de la lámina aprobada falla, y en la clave canónica la rechaza AXIS', () => {
    const bare = without(example('section-classic'), 'unmodeled')

    expectCode(() => planSurfacePiece(bare as SurfaceIntent, { artifactId: 'prueba' }), 'invalid-intent')
    expectCode(
      () => planSurfacePiece({ ...bare, voice: { question: '¿Quién?', answer: ['El dato'] } } as SurfaceIntent, { artifactId: 'prueba' }),
      'surface-issues'
    )
  })

  it('section-split: reservas, panel e indicador volteado salen de la receta de AXIS', () => {
    const { piece, violations, slots } = plan(example('section-split'))

    expect(piece.contentType).toBe('deck.section-split')
    expect(violations).toEqual([])
    expect(slots.frame!.numberTop).toBe('--gl-number-top=260px')
    expect(slots.frame!.labelTop).toBe('--gl-label-top=450px')
    expect(slots.frame!.questionTop).toBe(600)
    expect(slots.frame!.answerTop).toBe(670)
    expect(slots.frame!.answerPx).toBe(120)
    expect(slots.frame!.panelWidth).toBe('--gl-panel-width=960px')
    expect(slots.frame!.panelRadius).toBe('--gl-panel-radius=300px')
    expect(slots.frame!.photoLeft).toBe('--gl-photo-left=660px')

    const plate = piece.assets.find(a => a.kind === 'plate')

    expect(plate && 'fit' in plate ? plate.fit : null).toEqual({ width: 1260, height: 1080 })

    const layer = piece.assets.find(a => a.kind === 'svg')

    // El arco nace abajo y sube por la derecha: la capa va volteada en vertical sobre el centro del indicador.
    expect(layer && 'svg' in layer ? layer.svg : '').toContain('matrix(1 0 0 -1 0 340)')
  })

  it('section-split: sin foto falla cerrado', () => {
    const bare = without(example('section-split'), 'photo')

    expectCode(() => planSurfacePiece(bare as SurfaceIntent, { artifactId: 'prueba' }), 'missing-photo')
  })

  it('content-measure: la lente de la reserva de AXIS y la medida recorren el valor', () => {
    const { piece, violations, slots } = plan(example('content-measure'))

    expect(piece.contentType).toBe('deck.content-measure')
    expect(violations).toEqual([])
    expect(slots.frame!.answerPx).toBe(300)
    expect(slots.frame!.lensCx).toBe('--gl-lens-cx=1420px')
    expect(slots.frame!.lensCy).toBe('--gl-lens-cy=600px')
    // El radio de la foto deja el aire oficial del anillo: 403,2 / 1,12 ≈ 360 (la reserva viene redondeada a 4 decimales).
    expect(Math.abs(Number(String(slots.frame!.lensR).match(/=([\d.]+)px$/)![1]) - 360)).toBeLessThan(0.5)
    expect(slots.frame!.lensMultiply).toBe('--gl-lens-multiply=0.8')
    expect(slots.note).toBe('Datos de muestra')
    expect(slots.figures).toHaveLength(2)

    const layer = piece.assets.find(a => a.kind === 'svg')

    expect(layer && 'svg' in layer ? layer.svg : '').toContain('data-axis-kind="measure"')
  })

  it('content-measure: sin medida la rechaza AXIS; con tres cifras de apoyo falla', () => {
    const bare = without(example('content-measure'), 'measure')

    expectCode(() => planSurfacePiece(bare as SurfaceIntent, { artifactId: 'prueba' }), 'surface-issues')

    const intent = example('content-measure')
    const figures = [...(intent.unmodeled as { figures: unknown[] }).figures, { value: '3x', label: 'más' }]

    expectCode(() => planSurfacePiece({ ...intent, unmodeled: { figures } }, { artifactId: 'prueba' }), 'invalid-intent')
  })

  it('triptych: tres tomas nativas 9:16 de 636 px y una línea de la frase por toma', () => {
    const { piece, violations, slots } = plan(example('triptych'))

    expect(piece.contentType).toBe('deck.triptych')
    expect(violations).toEqual([])
    expect(slots.frame!.panelWidth).toBe('--gl-panel-width=636px')
    expect(slots.frame!.gutter).toBe('--gl-gutter=6px')
    expect(slots.frame!.answerTop).toBe(944)
    expect(slots.frame!.answerPx).toBe(108)

    const panels = slots.panels as unknown as { word: string }[]

    expect(panels.map(p => p.word)).toEqual(['Escucha,', 'crea', 'y mide'])

    const plates = piece.assets.filter(a => a.kind === 'plate')

    expect(plates).toHaveLength(3)
    expect(plates.every(p => 'fit' in p && p.fit.width === 636 && p.fit.height === 1131)).toBe(true)
  })

  it('triptych: una frase que no reparte en tres tomas falla cerrado', () => {
    const intent = example('triptych')

    expectCode(
      () => planSurfacePiece({ ...intent, voice: { ...intent.voice, answer: ['Escucha', 'y crea'] } }, { artifactId: 'prueba' }),
      'invalid-intent'
    )
    expectCode(() => planSurfacePiece({ ...intent, unmodeled: {} }, { artifactId: 'prueba' }), 'missing-photo')
  })

  it('method-staircase: los cinco niveles del token, la respuesta en el rango del deck y la selección de un nivel', () => {
    const { piece, violations, slots } = plan(example('method-staircase'))

    expect(piece.contentType).toBe('deck.method-staircase')
    expect(violations).toEqual([])
    expect(slots.levels).toHaveLength(5)
    expect(slots.frame!.answerPx).toBeGreaterThanOrEqual(104)
    expect(slots.frame!.answerPx).toBeLessThanOrEqual(176)
    expect(Math.abs((slots.frame!.answerPx as number) - 140)).toBeLessThanOrEqual(3)
    expect(slots.selection).toMatchObject({ level: 3, label: 'SEO · AEO', anchor: 'bottom-end' })
    expect(piece.assets).toEqual([])
  })

  it('method-staircase: otro número de niveles o una selección fuera de la escalera fallan cerrado', () => {
    const intent = example('method-staircase')
    const content = intent.unmodeled as { levels: unknown[]; selection: Record<string, unknown> }

    expectCode(
      () => planSurfacePiece({ ...intent, unmodeled: { ...content, levels: content.levels.slice(0, 4) } }, { artifactId: 'prueba' }),
      'invalid-intent'
    )
    expectCode(
      () =>
        planSurfacePiece(
          { ...intent, unmodeled: { ...content, selection: { ...content.selection, level: 7 } } },
          { artifactId: 'prueba' }
        ),
      'invalid-intent'
    )
  })

  it('una respuesta de más de tres palabras fuera del contrato también la frena la regla de AXIS', () => {
    const intent = example('method-staircase')
    const content = intent.unmodeled as Record<string, unknown>

    expectCode(
      () =>
        planSurfacePiece(
          { ...intent, unmodeled: { ...content, voice: { question: '¿Te recomienda la IA?', answer: ['Capa por capa', 'siempre'] } } },
          { artifactId: 'prueba' }
        ),
      'invalid-intent'
    )
  })
})
