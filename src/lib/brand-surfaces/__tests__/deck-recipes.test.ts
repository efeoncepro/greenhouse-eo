/**
 * Las recetas aprobadas de la superficie deck (TASK-1919): cada intent de ejemplo se traduce a un plan del catálogo
 * `graphic-line-deck` con las medidas que resolvió AXIS, el plan pasa el contrato de slots de su plantilla, y lo que
 * la receta no admite falla cerrado. Desde el contrato 0.1.1 todo el contenido de la lámina viaja en claves canónicas
 * (voz, niveles, nota, paneles, cifras) y lo que AXIS valida (niveles, cifras con fuente, nivel de la selección, largo
 * de la respuesta) lo rechaza AXIS con `surface-issues` antes de llegar al builder.
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

/** Los códigos con que AXIS rechazó el intent (falla si no lo rechazó con `surface-issues`). */
const issuesOf = (candidate: SurfaceIntent): string[] => {
  let caught: unknown

  try {
    planSurfacePiece(candidate, { artifactId: 'prueba' })
  } catch (error) {
    caught = error
  }

  expect(caught).toBeInstanceOf(SurfacePieceError)
  expect((caught as SurfacePieceError).code).toBe('surface-issues')

  return (caught as SurfacePieceError).issues.map(issue => (issue as { code: string }).code)
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

  it('section-classic: sin la voz de la lámina aprobada falla, y una respuesta de más de tres palabras la rechaza AXIS', () => {
    const intent = example('section-classic')

    expectCode(() => planSurfacePiece(without(intent, 'voice'), { artifactId: 'prueba' }), 'invalid-intent')
    expectCode(
      () =>
        planSurfacePiece({ ...intent, voice: { question: '¿Quién decide?', answer: ['El dato', 'de todos los días'] } }, { artifactId: 'prueba' }),
      'surface-issues'
    )
  })

  it('un intent del contrato 0.1.0 no trae el contenido de la lámina y falla cerrado', () => {
    // AXIS lee un 0.1.0 como se escribió (ignora las claves de 0.1.1): la escalera la rechaza el contrato y el
    // tríptico llega sin sus tomas, y el builder no compone una lámina a medias.
    expectCode(() => planSurfacePiece({ ...example('method-staircase'), version: '0.1.0' }, { artifactId: 'prueba' }), 'surface-issues')
    expectCode(() => planSurfacePiece({ ...example('triptych'), version: '0.1.0' }, { artifactId: 'prueba' }), 'missing-photo')
  })

  it('section-split: reservas, panel e indicador salen de la receta de AXIS', () => {
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

    // El arco nace abajo a la izquierda (≈ las 8) y sube por la IZQUIERDA en sentido horario: en la 2 de 5 empieza a
    // la izquierda y debajo del centro del indicador (180 · 170) y termina arriba a la izquierda, donde va la esfera.
    const svg = layer && 'svg' in layer ? layer.svg : ''
    const arc = /data-axis-part="arc"[^>]* d="M ([\d.]+) ([\d.]+) A 40 40 0 0 1 ([\d.]+) ([\d.]+)"/.exec(svg)

    expect(arc).not.toBeNull()

    const [startX, startY, endX, endY] = arc!.slice(1).map(Number) as [number, number, number, number]

    expect(startX).toBeLessThan(180)
    expect(startY).toBeGreaterThan(170)
    expect(endX).toBeLessThan(180)
    expect(endY).toBeLessThan(170)
    expect(svg).not.toContain('matrix(')
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

  it('content-measure: las cifras de apoyo salen del manifest con valor y leyenda', () => {
    const { slots } = plan(example('content-measure'))

    expect(slots.figures).toEqual([
      { value: '12 días', label: 'de idea a pieza' },
      { value: '−38 %', label: 'costo por lead' }
    ])
  })

  it('content-measure: sin medida, con tres cifras o con una cifra sin fuente la rechaza AXIS', () => {
    const bare = without(example('content-measure'), 'measure')

    expectCode(() => planSurfacePiece(bare as SurfaceIntent, { artifactId: 'prueba' }), 'surface-issues')

    const intent = example('content-measure')
    const figures = intent.figures as { value: string; label: string; source: string }[]

    expect(issuesOf({ ...intent, figures: [...figures, { value: '3x', label: 'más', source: 'Datos de muestra' }] })).toContain(
      'figures-over-limit'
    )
    expect(issuesOf({ ...intent, figures: [figures[0], { value: '−38 %', label: 'costo por lead' }] })).toContain('figure-source-required')
  })

  it('triptych: tres tomas nativas 9:16 de 636 px y una palabra por toma, cada una con su esfera', () => {
    const { piece, violations, slots } = plan(example('triptych'))

    expect(piece.contentType).toBe('deck.triptych')
    expect(violations).toEqual([])
    expect(slots.frame!.panelWidth).toBe('--gl-panel-width=636px')
    expect(slots.frame!.gutter).toBe('--gl-gutter=6px')
    expect(slots.frame!.answerTop).toBe(944)
    expect(slots.frame!.answerPx).toBe(108)

    const panels = slots.panels as unknown as { word: string }[]

    expect(panels.map(p => p.word)).toEqual(['Escucha', 'Crea', 'Mide'])

    const plates = piece.assets.filter(a => a.kind === 'plate')

    expect(plates).toHaveLength(3)
    expect(plates.every(p => 'fit' in p && p.fit.width === 636 && p.fit.height === 1131)).toBe(true)
  })

  it('triptych: una toma con más de una palabra falla cerrado', () => {
    const intent = example('triptych')

    expectCode(
      () => planSurfacePiece({ ...intent, voice: { ...intent.voice, answer: ['Escucha,', 'crea', 'y mide'] } }, { artifactId: 'prueba' }),
      'invalid-intent'
    )
  })

  it('triptych: una frase que no reparte en tres tomas falla cerrado; otro número de tomas lo rechaza AXIS', () => {
    const intent = example('triptych')
    const panels = intent.panels as unknown[]

    expectCode(
      () => planSurfacePiece({ ...intent, voice: { ...intent.voice, answer: ['Escucha', 'y crea'] } }, { artifactId: 'prueba' }),
      'invalid-intent'
    )

    expect(issuesOf({ ...intent, panels: panels.slice(0, 2) })).toContain('panels-count-invalid')
  })

  it('method-staircase: los cinco niveles del token, la respuesta en el rango del deck y la selección de un nivel', () => {
    const { piece, violations, slots } = plan(example('method-staircase'))

    expect(piece.contentType).toBe('deck.method-staircase')
    expect(violations).toEqual([])
    expect(slots.levels).toHaveLength(5)
    expect(slots.frame!.answerPx).toBeGreaterThanOrEqual(104)
    expect(slots.frame!.answerPx).toBeLessThanOrEqual(176)
    expect(Math.abs((slots.frame!.answerPx as number) - 140)).toBeLessThanOrEqual(3)
    expect(slots.note).toBe('Be Intrinsic es una trayectoria, no una garantía.')

    // La selección del peldaño sale entera del delegado de AXIS: nivel, escala y el objetivo sin velo.
    expect(slots.selection).toEqual({
      level: 3,
      label: 'SEO · AEO',
      anchor: 'bottom-end',
      participantKind: 'department',
      scale: 1.1,
      targetKind: 'object',
      variant: 'eight-handles',
      padding: 'standard',
      overlay: 'none'
    })
    expect(piece.assets).toEqual([])
  })

  it('method-staircase: otro número de niveles, una selección fuera de la escalera o una respuesta larga los rechaza AXIS', () => {
    const intent = example('method-staircase')
    const levels = intent.levels as unknown[]

    expect(issuesOf({ ...intent, levels: levels.slice(0, 4) })).toContain('levels-count-invalid')
    expect(issuesOf({ ...intent, selection: { ...intent.selection, level: 7 } })).toContain('selection-level-invalid')
    expect(issuesOf({ ...intent, voice: { question: '¿Te recomienda la IA?', answer: ['Capa por capa', 'siempre'] } })).toContain(
      'voice-answer-too-long'
    )
  })

  it('method-staircase: un nivel sin descriptor falla cerrado (AXIS lo deja opcional, el peldaño aprobado no)', () => {
    const intent = example('method-staircase')
    const levels = (intent.levels as { name: string; descriptor: string }[]).map((level, i) => (i === 2 ? { name: level.name } : level))

    expectCode(() => planSurfacePiece({ ...intent, levels }, { artifactId: 'prueba' }), 'invalid-intent')
  })
})

/**
 * Las tres composiciones de `proposal-cinematic` (TASK-1927, contrato 0.1.2). La composición es explícita
 * (`layout` del intent) y cada una tiene su plantilla: la de `service` no cambia.
 */
describe('deck · composiciones de proposal-cinematic', () => {
  const service = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'deck-proposal-cinematic-intent.json'), 'utf8')
  ) as SurfaceIntent

  it('un intent anterior a 0.1.2 compone `service` con su plantilla de siempre', () => {
    const { template, violations, piece } = plan(service)

    expect(service.layout).toBeUndefined()
    expect(template).toBe('ProposalCinematic')
    expect(piece.contentType).toBe('deck.proposal-cinematic')
    expect(violations).toEqual([])
  })

  it('`layout: service` explícito compone el mismo plan que sin layout', () => {
    const implicit = plan({ ...service, version: '0.1.2' }).piece.plan
    const explicit = plan({ ...service, version: '0.1.2', layout: 'service' }).piece.plan

    expect(explicit).toEqual(implicit)
  })

  it('`hero` lleva la respuesta a su tamaño mayor y la selección sobre la respuesta, sin prueba ni pasos', () => {
    const { template, violations, slots, piece } = plan(example('proposal-cinematic-hero'))

    expect(template).toBe('ProposalCinematicHero')
    expect(piece.layout).toBe('hero')
    expect(violations).toEqual([])
    expect(slots.frame).toMatchObject({ answerPx: 176, answerTop: 285, eyebrowTop: 110, questionTop: 200, bodyTop: 560 })
    expect(slots.proof).toBeUndefined()
    expect(slots.steps).toBeUndefined()
    expect(slots.selection).toMatchObject({ label: 'Nexa', anchor: 'top-end' })
  })

  it('`hero` con prueba o pasos lo rechaza AXIS', () => {
    const hero = example('proposal-cinematic-hero')

    expectCode(() => plan({ ...hero, proof: { text: 'Sky: +2.000 piezas', source: 'deck Sky' } }), 'surface-issues')
    expectCode(() => plan({ ...hero, steps: service.steps }), 'surface-issues')
  })

  it('`lines` arma el stack desde `content.lines`, con la selección del grupo', () => {
    const { template, violations, slots, piece } = plan(example('proposal-cinematic-lines'))

    expect(template).toBe('ProposalCinematicLines')
    expect(piece.layout).toBe('lines')
    expect(violations).toEqual([])

    const lines = slots.lines as unknown as { key: string; name: string; word: string }[]

    expect(lines.map(line => line.word)).toEqual(['Growth', 'Brand', 'Engine', 'Voice', 'Revenue'])
    expect(lines[1]).toMatchObject({ key: 'brand', name: 'Creative Services' })
    expect(slots.selection).toMatchObject({ targetKind: 'group', anchor: 'bottom-end', scale: 1.25 })
    expect(slots.voice).toBeUndefined()
  })

  it('el intent elige qué líneas mostrar; una desconocida o repetida la rechaza AXIS', () => {
    const lines = example('proposal-cinematic-lines')
    const two = plan({ ...lines, lines: ['brand', 'engine'] }).slots.lines as unknown as { word: string }[]

    expect(two.map(line => line.word)).toEqual(['Brand', 'Engine'])
    expectCode(() => plan({ ...lines, lines: ['brand', 'brand'] }), 'surface-issues')
    expectCode(() => plan({ ...lines, lines: ['no-existe'] }), 'surface-issues')
  })

  it('`lines` fuera de su composición lo rechaza AXIS', () => {
    expectCode(() => plan({ ...service, version: '0.1.2', lines: ['brand'] }), 'surface-issues')
  })
})

/**
 * La sección partida corregida (TASK-1927, delta d): el indicador sube por la IZQUIERDA y la receta tiene tres
 * composiciones. El arco sale del token de AXIS (`progress.startFromTopDeg`, `sweep.rule`).
 */
describe('deck · section-split por la izquierda y sus composiciones', () => {
  const arcOf = (intent: SurfaceIntent): string => {
    const asset = plan(intent).piece.assets.find(a => a.ref.startsWith('asset-ref:layer:section-split-indicator'))!

    return (asset as { svg: string }).svg
  }

  it('sin layout compone `corner-top`, con su plantilla de siempre', () => {
    const { template, violations, slots, piece } = plan(example('section-split'))

    expect(template).toBe('SectionSplit')
    expect(piece.contentType).toBe('deck.section-split')
    expect(violations).toEqual([])
    expect(slots.frame).toMatchObject({ layout: 'corner-top', margin: 140, panelLeft: '--gl-panel-left=0px', photoLeft: '--gl-photo-left=660px' })
  })

  it('el arco barre las secciones ya recorridas: crece con la sección y no existe en la primera', () => {
    const intent = example('section-split')
    const svg = (current: number) => arcOf({ ...intent, progress: { sections: 5, current } })

    expect(svg(2)).not.toBe(svg(3))
    expect(svg(3)).not.toBe(svg(4))
    // El indicador ya no se voltea: el arco nace donde dice el token, sin transformaciones sobre el SVG.
    expect(svg(2)).not.toContain('matrix(1 0 0 -1')
  })

  it('`corner-bottom` y `panel-end` componen desde su intent con su propio contrato', () => {
    const bottom = plan(example('section-split-corner-bottom'))
    const end = plan(example('section-split-panel-end'))

    expect(bottom.template).toBe('SectionSplitCornerBottom')
    expect(bottom.violations).toEqual([])
    expect(bottom.slots.frame).toMatchObject({ layout: 'corner-bottom', answerPx: 132, margin: 140 })

    expect(end.template).toBe('SectionSplitPanelEnd')
    expect(end.violations).toEqual([])
    expect(end.slots.frame).toMatchObject({
      layout: 'panel-end',
      margin: 1100,
      panelLeft: '--gl-panel-left=960px',
      photoLeft: '--gl-photo-left=0px',
      photoWidth: '--gl-photo-width=1260px'
    })
  })

  it('una composición desconocida la rechaza AXIS', () => {
    expectCode(() => plan({ ...example('section-split'), version: '0.1.2', layout: 'panel-start' }), 'surface-issues')
  })
})
