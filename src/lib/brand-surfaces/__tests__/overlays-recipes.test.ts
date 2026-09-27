/**
 * Recetas audiovisuales de «La órbita» (catálogo `graphic-line-overlays`, TASK-1919): cada intent de ejemplo se
 * traduce a un plan con las medidas que resolvió AXIS, las órbitas llegan pintadas por el paquete de la línea
 * gráfica, y todo lo que el contrato o la receta no permite falla cerrado. El cierre con el reveal es video y no
 * llega al composer.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it, vi } from 'vitest'

import type { SlideSpec } from '@/lib/artifact-composer/pure'
import { makeSelectionHook } from '../../artifact-composer/catalogs/graphic-line-shared/selection-hook'
import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLES_DIR = path.resolve(__dirname, '../examples')
const CATALOG_DIR = path.resolve(__dirname, '../../artifact-composer/catalogs/graphic-line-overlays')

const intentOf = (recipe: string): SurfaceIntent =>
  JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, `audiovisual-${recipe}-intent.json`), 'utf8')) as SurfaceIntent

type Slots = Record<string, Record<string, unknown>>

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })

  return { piece, slots: piece.plan.slides[0]!.slots as unknown as Slots }
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

const RECIPES = ['cartela', 'zocalo', 'callout-selection', 'data-super', 'split-screen', 'subtitles', 'shot-plan']

const recipeTokens = efeonceGraphicLine.surfaces.audiovisual.recipes as unknown as Record<string, Record<string, unknown>>

describe('recetas audiovisuales → catálogo graphic-line-overlays', () => {
  it('cada receta aprobada que no es video tiene plantilla, y cada intent de ejemplo llena exactamente su contrato', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'registry.json'), 'utf8')) as {
      selector: { map: Record<string, string> }
      templates: { name: string; slotsRef: string }[]
    }

    const approved = Object.entries(recipeTokens)
      .filter(([, token]) => token.status === 'approved')
      .map(([id]) => id)

    expect(approved.filter(id => id !== 'close-reveal').sort()).toEqual([...RECIPES].sort())

    for (const recipe of RECIPES) {
      const { piece, slots } = plan(intentOf(recipe))
      const template = registry.selector.map[`audiovisual.${recipe}`]!
      const entry = registry.templates.find(t => t.name === template)!

      const contract = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, entry.slotsRef), 'utf8')) as {
        render?: { background?: string }
        slots: Record<string, { shape?: Record<string, { required?: boolean }> }>
      }

      expect(piece.catalog).toBe('graphic-line-overlays')
      expect(piece.contentType).toBe(`audiovisual.${recipe}`)

      // El frame lleva todas las medidas que la plantilla declara, ni una más ni una menos.
      expect(Object.keys(slots.frame!).sort()).toEqual(Object.keys(contract.slots.frame!.shape!).sort())

      // Capas transparentes, salvo las que son el cuadro completo.
      const opaque = recipe === 'split-screen' || recipe === 'shot-plan'

      expect(contract.render?.background === 'transparent').toBe(!opaque)
    }
  })

  it('cartela: voz y anillo del capítulo con las medidas de AXIS; el arco lo pinta el paquete con el grosor de la receta', () => {
    const { piece, slots } = plan(intentOf('cartela'))
    const progress = recipeTokens.cartela!.progress as { arcStrokePx: number; spherePx: number }

    expect(slots.frame).toMatchObject({
      voiceLeft: '--gl-voice-left=150px',
      voiceTop: '--gl-voice-top=196px',
      answerLeft: '--gl-answer-left=128px',
      answerTop: '--gl-answer-top=318px',
      questionPx: '--gl-question-px=52px',
      answerPx: '--gl-answer-px=400px',
      answerTracking: '--gl-answer-tracking=-0.06em',
      ringCx: '--gl-ring-cx=1420px',
      ringCy: '--gl-ring-cy=520px',
      ringR: '--gl-ring-r=380px'
    })
    expect(slots.chapter).toEqual({ title: 'Escucha', label: 'capítulo 1 de 3' })
    expect(slots.voice).toEqual({ question: '¿Cómo trabajamos?', answer: 'Así' })
    expect(slots.selection).toMatchObject({ label: 'Dirección de arte', anchor: 'bottom-end', participantKind: 'role', scale: 1.6 })

    const layer = piece.assets.find(a => a.ref === slots.orbit!.src)

    expect(layer?.kind).toBe('svg')

    const svg = (layer as { svg: string }).svg

    expect(svg).toContain('data-axis-kind="progress"')
    expect(svg).toContain(`stroke-width="${progress.arcStrokePx}"`)
    expect(svg).toContain(`r="${progress.spherePx}"`)
  })

  it('zócalo: la reserva inferior de AXIS y los corchetes sobre el grupo con la variante que resolvió AXIS', () => {
    const { slots } = plan(intentOf('zocalo'))

    expect(slots.frame).toMatchObject({
      voiceLeft: '--gl-voice-left=120px',
      voiceTop: '--gl-voice-top=800px',
      questionPx: '--gl-question-px=38px',
      answerPx: '--gl-answer-px=128px'
    })
    expect(slots.selection).toMatchObject({
      label: 'Producción',
      anchor: 'top-end',
      targetKind: 'group',
      variant: 'open-brackets',
      padding: 'compact',
      scale: 1.2
    })
  })

  it('llamada: la caja del objeto sale de las fracciones del intent, sin texto propio', () => {
    const { piece, slots } = plan(intentOf('callout-selection'))

    expect(slots.target).toEqual({
      left: '--gl-target-left=720px',
      top: '--gl-target-top=560px',
      width: '--gl-target-width=340px',
      height: '--gl-target-height=240px'
    })
    expect(slots.selection).toMatchObject({ label: 'Dirección de arte', anchor: 'top-start', targetKind: 'object', scale: 1.6 })
    expect(piece.assets).toEqual([])
  })

  it('super de dato: el anillo de la receta, la cifra con su fuente y el arco de medida canónico de AXIS', () => {
    const { piece, slots } = plan(intentOf('data-super'))
    const measure = recipeTokens['data-super']!.measure as { arcStrokePx: number; spherePx: number }

    expect(slots.frame).toMatchObject({
      ringCx: '--gl-ring-cx=300px',
      ringCy: '--gl-ring-cy=760px',
      ringR: '--gl-ring-r=150px',
      valuePx: '--gl-value-px=88px',
      captionPx: '--gl-caption-px=34px',
      captionLeft: '--gl-caption-left=500px',
      captionWidth: '--gl-caption-width=420px'
    })
    expect(slots.datum).toMatchObject({ value: '62%', caption: 'de los cortes se aprueban a la primera' })
    expect(String(slots.datum!.source).length).toBeGreaterThan(0)

    const svg = (piece.assets.find(a => a.ref === slots.orbit!.src) as { svg: string }).svg

    expect(svg).toContain('data-axis-kind="measure"')
    expect(svg).toContain('data-axis-value="0.62"')
    expect(svg).toContain(`stroke-width="${measure.arcStrokePx}"`)
    expect(svg).toContain(`r="${measure.spherePx}"`)
  })

  it('pantalla dividida: la divisoria del token, una palabra por plano y dos plates como asset externo', () => {
    const { piece, slots } = plan(intentOf('split-screen'))

    expect(slots.frame).toMatchObject({ dividerLeft: '--gl-divider-left=957px', dividerPx: '--gl-divider-px=6px', answerPx: '--gl-answer-px=90px' })
    expect(slots.start).toMatchObject({ word: 'Escucha', focus: '--gl-focus-x=83.33%' })
    expect(slots.end).toMatchObject({ word: 'mide', focus: '--gl-focus-x=93.75%' })
    expect(piece.assets.filter(a => a.kind === 'plate')).toHaveLength(2)
  })

  it('subtítulos: peso, tamaño, interlineado, máximo de líneas y sombra del token de AXIS', () => {
    const { slots } = plan(intentOf('subtitles'))

    expect(slots.frame).toMatchObject({
      top: '--gl-subtitle-top=880px',
      px: '--gl-subtitle-px=46px',
      weight: '--gl-subtitle-weight=600',
      lineHeight: '--gl-subtitle-line-height=1.3',
      maxLines: '--gl-subtitle-max-lines=2',
      shadowY: '--gl-subtitle-shadow-y=2px',
      shadowBlur: '--gl-subtitle-shadow-blur=6px',
      shadowAlpha: '--gl-subtitle-shadow-alpha=55%'
    })
    expect(slots.lines).toEqual(['«Ya no discutimos el gusto:', 'vemos qué corte vende.»'])
  })

  it('plan de planos: tiempos y lentes del timeline, reglas de producción con el texto de AXIS', () => {
    const { piece, slots } = plan(intentOf('shot-plan'))
    const shots = slots.shots as unknown as { heading: string }[]
    const rules = slots.rules as unknown as string[]

    expect(shots.map(s => s.heading)).toEqual([
      '01 · 0–3 s · Plano general',
      '02 · 3–5 s · Inserto',
      '03 · 5–9 s · Plano medio',
      '04 · 9–12,6 s · Cierre'
    ])
    expect(rules).toHaveLength(6)
    expect(rules[0]).toMatch(/^El primer cuadro de cada plano/)
    expect(piece.assets.filter(a => a.kind === 'plate')).toHaveLength(4)
  })
})

describe('recetas audiovisuales: falla cerrado', () => {
  it('el cierre con el reveal es video y no llega al composer', () => {
    expectCode(
      () =>
        planSurfacePiece(
          {
            contract: 'efeonce.surface-composition',
            version: '0.1.0',
            surface: 'audiovisual',
            format: '16x9',
            role: 'close',
            recipe: 'close-reveal',
            line: 'growth'
          },
          { artifactId: 'prueba' }
        ),
      'recipe-outside-composer'
    )
  })

  it('lo que AXIS exige y el intent no trae (progreso, medida) nunca llega al composer', () => {
    const { progress, ...cartelaSinProgreso } = intentOf('cartela')
    const { measure, ...superSinMedida } = intentOf('data-super')

    void progress
    void measure

    expectCode(() => plan(cartelaSinProgreso as SurfaceIntent), 'surface-issues')
    expectCode(() => plan(superSinMedida as SurfaceIntent), 'surface-issues')
  })

  it('una respuesta de cartela que cruzaría el anillo se rechaza', () => {
    const intent = intentOf('cartela')

    expectCode(() => plan({ ...intent, voice: { ...intent.voice, answer: ['Siempre'] } }), 'invalid-intent')
  })

  it('el zócalo lleva el rol en una línea', () => {
    const intent = intentOf('zocalo')

    expectCode(() => plan({ ...intent, voice: { ...intent.voice, answer: ['Producción', 'y posproducción'] } }), 'invalid-intent')
  })

  it('una llamada sin caja o con una caja invertida se rechaza', () => {
    const intent = intentOf('callout-selection')

    expectCode(() => plan({ ...intent, selection: { ...intent.selection, box: undefined } } as SurfaceIntent), 'invalid-intent')
    expectCode(
      () => plan({ ...intent, selection: { ...intent.selection, box: { left: 0.6, top: 0.5, right: 0.4, bottom: 0.7 } } } as SurfaceIntent),
      'invalid-intent'
    )
  })

  it('subtítulos de tres líneas no pasan', () => {
    expectCode(() => plan({ ...intentOf('subtitles'), subtitles: { lines: ['uno', 'dos', 'tres'] } }), 'invalid-intent')
  })

  it('la pantalla dividida lleva una palabra por plano', () => {
    const intent = intentOf('split-screen')

    expectCode(() => plan({ ...intent, voice: { answer: ['Escucha'] } }), 'invalid-intent')
  })

  it('el plan de planos no contradice el timeline de AXIS (duración ni lente)', () => {
    const intent = intentOf('shot-plan')
    const shots = intent.shots as { segment: string; spec: string }[]

    expectCode(() => plan({ ...intent, title: 'Un video de 15 s «Cómo trabajamos»' }), 'invalid-intent')
    expectCode(
      () => plan({ ...intent, shots: shots.map(s => (s.segment === 'shot-01-wide' ? { ...s, spec: s.spec.replace('35 mm', '24 mm') } : s)) }),
      'invalid-intent'
    )
  })
})

describe('selección sobre una caja (hook del catálogo)', () => {
  const slide = (selection: Record<string, unknown> | null) =>
    ({ slideId: 'prueba', template: 'CalloutSelection', slots: { selection } }) as unknown as SlideSpec

  const selection = { label: 'Dirección de arte', anchor: 'top-start', participantKind: 'role', targetKind: 'object', variant: 'eight-handles', scale: 1.6 }

  const pageMeasuring = (bounds: { left: number; top: number; right: number; bottom: number }) => {
    const evaluate = vi
      .fn()
      .mockResolvedValueOnce(undefined) // document.fonts.ready
      .mockResolvedValueOnce({ bounds, canvas: { width: 1920, height: 1080 } })
      .mockResolvedValueOnce(undefined)

    return { page: { evaluate } as never, evaluate }
  }

  it('mide la caja tal cual y le pasa al painter el objetivo real y la variante de AXIS', async () => {
    const painter = vi.fn().mockReturnValue({ underlay: '', overlay: '<g/>', withinCanvas: true })
    const { page, evaluate } = pageMeasuring({ left: 720, top: 560, right: 1060, bottom: 800 })

    await makeSelectionHook(painter)(page, slide(selection))

    expect(painter).toHaveBeenCalledWith(
      expect.objectContaining({
        bounds: { left: 720, top: 560, right: 1060, bottom: 800 },
        targetKind: 'object',
        anchor: 'top-start',
        variant: 'eight-handles',
        scale: 1.6
      })
    )
    expect(evaluate).toHaveBeenCalledTimes(3)
  })

  it('falla cerrado sin painter, con una caja de tamaño cero o con un objetivo desconocido', async () => {
    const painter = vi.fn().mockReturnValue({ underlay: '', overlay: '', withinCanvas: true })

    await expect(makeSelectionHook(undefined)(pageMeasuring({ left: 0, top: 0, right: 10, bottom: 10 }).page, slide(selection))).rejects.toThrow(
      /sin painter/
    )
    await expect(makeSelectionHook(painter)(pageMeasuring({ left: 5, top: 5, right: 5, bottom: 5 }).page, slide(selection))).rejects.toThrow(
      /mide cero/
    )
    await expect(
      makeSelectionHook(painter)(pageMeasuring({ left: 0, top: 0, right: 10, bottom: 10 }).page, slide({ ...selection, targetKind: 'imagen' }))
    ).rejects.toThrow(/objetivo/)
  })
})
