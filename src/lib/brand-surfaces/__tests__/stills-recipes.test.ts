/**
 * Recetas aprobadas de web, DOOH y motion → catálogo `graphic-line-stills` (TASK-1919).
 *
 * Por receta: el plan sale en el catálogo y el contentType correctos, con las medidas que resolvió AXIS, y cada
 * slot que el contrato de la plantilla exige llega del builder (ni uno de más, ni uno de menos). Y lo que la pieza
 * aprobada tiene y el intent no trae, falla cerrado.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import { STILLS_CTA_OPTIONS } from '@/lib/artifact-composer/catalogs/graphic-line-stills'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'
import { __test } from '../recipes/stills'

const EXAMPLES = path.join(__dirname, '..', 'examples')
const CATALOG = path.resolve(__dirname, '../../artifact-composer/catalogs/graphic-line-stills')

const load = (name: string): SurfaceIntent =>
  JSON.parse(fs.readFileSync(path.join(EXAMPLES, `${name}-intent.json`), 'utf8')) as SurfaceIntent

const registry = JSON.parse(fs.readFileSync(path.join(CATALOG, 'registry.json'), 'utf8')) as {
  templates: { name: string; slotsRef: string }[]
  selector: { map: Record<string, string> }
}

type SlotContract = {
  type: string
  required?: boolean
  shape?: Record<string, { required?: boolean; resolver?: string }>
  item?: { shape?: Record<string, { required?: boolean; resolver?: string }> }
}

const contractOf = (contentType: string) => {
  const template = registry.selector.map[contentType]!
  const entry = registry.templates.find(t => t.name === template)!

  return JSON.parse(fs.readFileSync(path.join(CATALOG, entry.slotsRef), 'utf8')) as {
    viewport: { width: number; height: number }
    slots: Record<string, SlotContract>
  }
}

/** El número de un `--gl-*=<n><unidad>`: los círculos salen de fracciones de AXIS con 4 decimales. */
const cssNumber = (value: unknown): number => Number(/=(-?\d+(?:\.\d+)?)/.exec(String(value))?.[1])

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

const RECIPES = [
  ['web-hero-lens', 'web.hero-lens'],
  ['web-hero-bleed', 'web.hero-bleed'],
  ['web-hero-uniform-tablet', 'web.hero-uniform-tablet'],
  ['web-hero-mobile-native', 'web.hero-mobile-native.phone-390'],
  ['dooh-caminero-lens', 'dooh.caminero-lens'],
  ['motion-loop-lens-reveal', 'motion.loop-lens-reveal'],
  ['motion-storyboard', 'motion.storyboard']
] as const

describe('recetas de graphic-line-stills', () => {
  it.each(RECIPES)('%s → %s: plan en el catálogo de piezas fijas, con el contrato de la plantilla completo', (example, contentType) => {
    const piece = planSurfacePiece(load(example), { artifactId: 'prueba' })
    const contract = contractOf(contentType)
    const slots = piece.plan.slides[0]!.slots as Record<string, unknown>

    expect(piece.catalog).toBe('graphic-line-stills')
    expect(piece.contentType).toBe(contentType)

    // El lienzo de la plantilla es el de la superficie (salvo la hoja del cuadro a cuadro, que es su propia lámina).
    if (contentType !== 'motion.storyboard') {
      expect(contract.viewport).toEqual({
        width: (piece.manifest.canvas as { width: number }).width,
        height: (piece.manifest.canvas as { height: number }).height
      })
    }

    for (const [name, slot] of Object.entries(contract.slots)) {
      if (slot.type.startsWith('fixed-')) continue
      if (slot.required) expect(slots[name], `slot requerido «${name}»`).toBeDefined()

      const value = slots[name] as Record<string, unknown> | Record<string, unknown>[] | undefined
      const shape = slot.shape ?? slot.item?.shape

      if (!value || !shape) continue

      for (const record of Array.isArray(value) ? value : [value]) {
        for (const [field, spec] of Object.entries(shape)) {
          // Un campo con resolver corre aunque no venga: tiene que venir siempre.
          if (spec.required || spec.resolver) expect(record[field], `«${name}.${field}»`).toBeDefined()
        }

        for (const field of Object.keys(record)) expect(shape, `«${name}.${field}» no está en el contrato`).toHaveProperty(field)
      }
    }

    // Todo lo que el plan referencia viaja como asset externo: el catálogo nunca lee rutas.
    const refs = JSON.stringify(slots).match(/asset-ref:[a-z]+:[^"]+/g) ?? []

    for (const ref of refs) expect(piece.assets.some(a => a.ref === ref), ref).toBe(true)
  })

  it('hero con lente: medidas de AXIS y la órbita pintada por el paquete de la línea gráfica', () => {
    const piece = planSurfacePiece(load('web-hero-lens'), { artifactId: 'prueba' })
    const frame = (piece.plan.slides[0]!.slots as Record<string, Record<string, unknown>>).frame!

    expect(frame.margin).toBe(96)
    expect(frame.questionTop).toBe(250)
    expect(frame.answerPx).toBe(200)
    expect(frame.bodyTop).toBe(560)
    expect(frame.ctaTop).toBe('--gl-cta-top=676px')
    expect(frame.answerTracking).toBe('--gl-answer-tracking=-0.045em')
    expect(cssNumber(frame.lensCx)).toBeCloseTo(1050, 0)
    expect(cssNumber(frame.lensCy)).toBeCloseTo(500, 0)
    expect(cssNumber(frame.lensR)).toBeCloseTo(330, 0)

    const layer = piece.assets.find(a => a.kind === 'svg')

    expect(layer?.kind === 'svg' && layer.svg).toContain('data-axis-part="arc"')
    expect(layer?.kind === 'svg' && layer.svg).toContain('data-axis-part="sphere"')
    expect(piece.assets.filter(a => a.kind === 'plate')).toHaveLength(1)
  })

  it('caminero: logo de 2 m abajo a la izquierda y el interior de la lente acercado por AXIS', () => {
    const piece = planSurfacePiece(load('dooh-caminero-lens'), { artifactId: 'prueba' })
    const frame = (piece.plan.slides[0]!.slots as Record<string, Record<string, unknown>>).frame!

    expect(frame.margin).toBe(90)
    expect(frame.signatureWidth).toBe('--gl-signature-width=500px')
    expect(frame.questionPx).toBe('--gl-question-px=110px')
    expect(frame.answerPx).toBe(330)

    const plates = piece.assets.filter(a => a.kind === 'plate')

    expect(plates.map(p => p.kind === 'plate' && p.fit)).toEqual([
      { width: 3000, height: 1000 },
      { width: 3750, height: 1250 }
    ])
  })

  it('loop: la pregunta se parte en dos líneas para no tocar el anillo, y la última se apoya en la reserva', () => {
    const piece = planSurfacePiece(load('motion-loop-lens-reveal'), { artifactId: 'prueba' })
    const slots = piece.plan.slides[0]!.slots as Record<string, Record<string, unknown>>

    expect(slots.voice!.question).toBe('¿Tu marketing mide<br>lo que vende?')
    expect(slots.voice!.answerLead).toBe('Ahora')
    expect(slots.voice!.answer).toBe('sí')
    expect(slots.frame!.questionTop).toBe(262 - 48)
    expect(slots.frame!.answerTop).toBe(352)
    expect(cssNumber(slots.frame!.lensR)).toBeCloseTo(350, 0)
    expect(slots.selection!.label).toBe('Growth')

    // Una pregunta corta cabe en una línea.
    expect(__test.questionLines('¿Lo medimos?', 40, 140, 711)).toEqual(['¿Lo medimos?'])
  })

  it('el CTA del catálogo es espejo de los tokens de la web', () => {
    const cta = efeonceGraphicLine.surfaces.web.cta as unknown as {
      desktop: { localCursorScale: number; descriptor: { belowCursorPx: number } }
      phone: { localCursorScaleOfWidth: number; descriptor: { belowCursorOfWidth: number } }
    }

    expect(STILLS_CTA_OPTIONS.HeroLens).toEqual({
      cursorScale: cta.desktop.localCursorScale,
      descriptorGapOfWidth: cta.desktop.descriptor.belowCursorPx / 1440
    })

    for (const width of [360, 390, 430]) {
      const options = STILLS_CTA_OPTIONS[`HeroMobileNative${width}`]!

      expect(options.cursorScale).toBeCloseTo(cta.phone.localCursorScaleOfWidth * width, 6)
      expect(options.descriptorGapOfWidth).toBe(cta.phone.descriptor.belowCursorOfWidth)
    }
  })

  it('el teléfono elige su plantilla por ancho: 360, 390 y 430', () => {
    for (const format of ['phone-360', 'phone-390', 'phone-430']) {
      const piece = planSurfacePiece({ ...load('web-hero-mobile-native'), format }, { artifactId: 'prueba' })

      expect(piece.contentType).toBe(`web.hero-mobile-native.${format}`)
      expect(piece.plan.slides[0]!.contentType).toBe(`web.hero-mobile-native.${format}`)
    }
  })

  describe('falla cerrado', () => {
    it('un hero web sin CTA no se compone', () => {
      const intent = load('web-hero-bleed')

      delete intent.cta
      expectCode(() => planSurfacePiece(intent, { artifactId: 'prueba' }), 'invalid-intent')
    })

    it('un teléfono sin plantilla para su ancho no se compone', () => {
      expectCode(
        () => planSurfacePiece({ ...load('web-hero-mobile-native'), format: 'phone-500' }, { artifactId: 'prueba' }),
        'surface-issues'
      )
    })

    it('la toma hecha para la lente sin su foco no se ubica a ciegas', () => {
      const intent = load('motion-loop-lens-reveal')

      delete (intent.photo as Record<string, unknown>).focus
      expectCode(() => planSurfacePiece(intent, { artifactId: 'prueba' }), 'missing-photo')
    })

    it('una pregunta que no cabe antes del anillo ni en dos líneas se rechaza', () => {
      const intent = load('motion-loop-lens-reveal')

      intent.voice = { ...intent.voice, question: '¿Tu estrategia de marketing digital mide de verdad lo que vende tu equipo comercial?' }
      expectCode(() => planSurfacePiece(intent, { artifactId: 'prueba' }), 'invalid-intent')
    })

    it('la hoja exige las ocho escenas del timeline, en su orden', () => {
      const intent = load('motion-storyboard')

      expectCode(
        () => planSurfacePiece({ ...intent, frames: (intent.frames as unknown[]).slice(0, 7) }, { artifactId: 'prueba' }),
        'invalid-intent'
      )
    })
  })
})
