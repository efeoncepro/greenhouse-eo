/**
 * `decision-ai-answer` (TASK-1934): «¿A quién recomienda la IA? A tu competencia.» El intent de ejemplo compone con su
 * plantilla y pasa su contrato de slots; lo obligatorio ausente o sobre su largo falla cerrado; la marca de datos
 * ilustrativos es obligatoria con la muestra y los datos reales exigen su evidencia; y la interfaz del motor es genérica
 * (sólo SVG dibujado desde los tokens de AXIS, ningún nombre ni color de un producto real).
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-decision-ai-answer-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const example = (): SurfaceIntent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as SurfaceIntent

const registry = JSON.parse(fs.readFileSync(path.join(CATALOG, 'registry.json'), 'utf8')) as {
  selector: { map: Record<string, string> }
  templates: { name: string; slotsRef: string }[]
}

/** El plan de la lámina, validado contra el contrato de slots de la plantilla que el registry le asigna. */
const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const template = registry.selector.map[piece.contentType]!
  const entry = registry.templates.find(t => t.name === template)!
  const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, entry.slotsRef), 'utf8')) as TemplateContract
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template } as SlideSpec, contract)

  return { piece, template, violations, slots: slide.slots as Record<string, Record<string, unknown>> }
}

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

const slotOf = (violation: unknown): string | undefined => (violation as { slot?: string }).slot

describe('deck · decision-ai-answer', () => {
  it('el intent de ejemplo compone con su plantilla y pasa el contrato de slots', () => {
    const { piece, template, violations, slots } = plan(example())

    expect(piece.catalog).toBe('graphic-line-deck')
    expect(piece.contentType).toBe('deck.decision-ai-answer')
    expect(template).toBe('DecisionAiAnswer')
    expect(violations).toEqual([])

    // La voz: la respuesta en dos líneas, a 3× la pregunta; con la pregunta en dos líneas baja 50 px.
    expect(slots.voice).toMatchObject({ question: '¿A quién recomienda la IA?', answerLead: 'A tu', answer: 'competencia' })
    expect(slots.frame!.answerPx).toBe(120)
    expect(slots.frame!.answerTop).toBe(330)

    // Las ventanas y la marca, corridas a la derecha de la referencia (lo decidió el token): la de hoy, además, más
    // angosta, para dejar aire a «competencia» y su esfera (AXIS 0.3.23).
    expect(slots.frame!.backLeft).toBe('--gl-aa-back-left=860px')
    expect(slots.frame!.backWidth).toBe('--gl-aa-back-width=450px')
    expect(slots.frame!.frontLeft).toBe('--gl-aa-front-left=1100px')
    expect(slots.frame!.markLeft).toBe('--gl-aa-mark-left=1100px')

    expect((slots.backRows as unknown as unknown[]).length).toBe(3)
    expect((slots.frontRows as unknown as unknown[]).length).toBe(2)
    expect(slots.client).toMatchObject({ number: '1', name: 'Tu marca' })
    expect(slots.mark).toBe('Ejemplo ilustrativo · tu diagnóstico muestra tu situación real')
    expect(slots.provenance).toEqual({ dataOrigin: 'illustrative' })

    // La selección «Cliente» toma la fila de tu marca (el objeto), anclada abajo al final y compacta.
    expect(slots.selection).toMatchObject({ label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', targetKind: 'object', padding: 'compact' })

    const html = fs.readFileSync(path.join(CATALOG, 'decision-ai-answer.html'), 'utf8')

    expect(html).toMatch(/data-slot="client"[^>]*data-gl-selection-target/)
  })

  it('un campo obligatorio ausente falla cerrado', () => {
    expectCode(() => planSurfacePiece(without(example(), 'prompt'), { artifactId: 'prueba' }), 'invalid-intent')
    expectCode(() => planSurfacePiece(without(example(), 'withAeo'), { artifactId: 'prueba' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...example(), body: undefined } as SurfaceIntent, { artifactId: 'prueba' }), 'invalid-intent')
    expectCode(
      () => planSurfacePiece({ ...example(), today: { ...(example().today as object), competitors: [{ name: 'Competidor A' }] } } as SurfaceIntent, { artifactId: 'prueba' }),
      'invalid-intent'
    )
  })

  it('un texto sobre su largo hace fallar la composición en el slot que lo recibe', () => {
    const long = 'x'.repeat(87)
    const { violations } = plan({ ...example(), prompt: long } as SurfaceIntent)

    expect(violations.some(violation => slotOf(violation) === 'back')).toBe(true)

    const { violations: mark } = plan({ ...example(), mark: 'x'.repeat(63) } as SurfaceIntent)

    expect(mark.some(violation => slotOf(violation) === 'mark')).toBe(true)
  })

  it('illustrative-data-marked: con datos ilustrativos, sin la marca no compone', () => {
    expectCode(() => planSurfacePiece(without(example(), 'mark'), { artifactId: 'prueba' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...example(), mark: '   ' } as SurfaceIntent, { artifactId: 'prueba' }), 'invalid-intent')
    // `illustrative` es el valor por defecto: sin `dataOrigin` la marca sigue siendo obligatoria.
    expectCode(() => planSurfacePiece(without(without(example(), 'dataOrigin'), 'mark'), { artifactId: 'prueba' }), 'invalid-intent')
  })

  it('illustrative-data-marked: con datos del cliente exige su evidencia y, sin la marca, compone', () => {
    const client = { ...without(example(), 'mark'), dataOrigin: 'client' } as SurfaceIntent

    expectCode(() => planSurfacePiece(client, { artifactId: 'prueba' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...client, evidenceRef: '  ' } as SurfaceIntent, { artifactId: 'prueba' }), 'invalid-intent')

    const { violations, slots } = plan({ ...client, evidenceRef: 'diagnostico:ej-001' } as SurfaceIntent)

    expect(violations).toEqual([])
    expect(slots.mark).toBeUndefined()
    expect(slots.provenance).toEqual({ dataOrigin: 'client', evidenceRef: 'diagnostico:ej-001' })

    expectCode(() => planSurfacePiece({ ...example(), dataOrigin: 'captured' } as SurfaceIntent, { artifactId: 'prueba' }), 'invalid-intent')
  })

  it('generic-ai-interface: sólo SVG dibujado desde los tokens de AXIS, sin nombres ni colores de un producto real', () => {
    const { piece, slots } = plan(example())

    // Ningún activo de archivo, logo ni foto: el motor es genérico.
    expect(piece.assets.length).toBeGreaterThan(0)
    expect(piece.assets.every(asset => asset.kind === 'svg')).toBe(true)

    const svgs = piece.assets.map(asset => ('svg' in asset ? String(asset.svg) : ''))
    const everything = [JSON.stringify(slots), ...svgs].join('\n')

    for (const brand of ['ChatGPT', 'Gemini', 'OpenAI', 'Perplexity', 'Claude', 'Copilot']) {
      expect(everything.toLowerCase()).not.toContain(brand.toLowerCase())
    }

    // Todo HEX pertenece a AXIS: la paleta de la línea gráfica, el documento claro del token, el blanco, el gris suave
    // de la voz y los HEX que el propio token de la receta midió (piso, sombra, círculo vacío).
    const G = efeonceGraphicLine as unknown as {
      color: Record<string, string>
      slogan: { leadColor: { onDark: string } }
      surfaces: { deck: { recipes: Record<string, { glass: { document: Record<string, unknown> } }> } }
    }

    const recipe = G.surfaces.deck.recipes['decision-ai-answer']!
    const hexesIn = (value: string): string[] => (value.match(/#[0-9a-f]{6}\b/gi) ?? []).map(hex => hex.toLowerCase())

    const allowed = new Set([
      ...Object.values(G.color).map(hex => hex.toLowerCase()),
      ...Object.values(recipe.glass.document)
        .filter((value): value is string => typeof value === 'string')
        .map(hex => hex.toLowerCase()),
      '#ffffff',
      G.slogan.leadColor.onDark.toLowerCase(),
      ...hexesIn(JSON.stringify(recipe))
    ])

    const used = hexesIn(everything)

    expect(used.length).toBeGreaterThan(0)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
