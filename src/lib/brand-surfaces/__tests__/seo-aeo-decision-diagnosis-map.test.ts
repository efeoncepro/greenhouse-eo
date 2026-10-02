/**
 * `decision-diagnosis-map` (TASK-1934): «¿Qué recibes primero? El mapa.». El intent de ejemplo compone la plantilla
 * `DecisionDiagnosisMap` y pasa su contrato de slots; lo que falta o se pasa de largo falla cerrado; y se sostienen las
 * reglas propias de la lámina: los datos de muestra van marcados (`illustrative-data-marked`), el share of voice suma
 * 100, las barras salen de su valor y la interfaz de los motores es genérica (`generic-ai-interface`: sólo texto, sin
 * logos ni colores de sus productos).
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-decision-diagnosis-map-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const example = (): SurfaceIntent & Record<string, unknown> => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as SurfaceIntent & Record<string, unknown>

const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'decision-diagnosis-map.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'DecisionDiagnosisMap' } as SlideSpec, contract)

  return { piece, violations, slots: slide.slots as Record<string, unknown> }
}

const without = (intent: SurfaceIntent, key: string): SurfaceIntent => {
  const copy: Record<string, unknown> = { ...intent }

  delete copy[key]

  return copy as SurfaceIntent
}

const expectCode = (fn: () => unknown, code: SurfacePieceError['code']) => {
  let caught: unknown

  try {
    fn()
  } catch (error) {
    caught = error
  }

  expect(caught).toBeInstanceOf(SurfacePieceError)
  expect((caught as SurfacePieceError).code).toBe(code)
}

const G = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  surfaces: { deck: { recipes: Record<string, Record<string, unknown>> } }
}

/** Todo HEX que vive en un objeto (el token de la receta), en minúsculas. */
const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

describe('deck · decision-diagnosis-map (TASK-1934)', () => {
  it('compone la plantilla del mapa con el contrato de slots limpio', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.decision-diagnosis-map')
    expect(violations).toEqual([])
    expect(slots.report).toMatchObject({ kicker: 'Diagnóstico de visibilidad en IA', title: 'Tu marca · Chile', mark: 'Datos de muestra' })
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-end', participantKind: 'role', padding: 'compact', targetKind: 'object' })
    expect((slots.plan as unknown[]).length).toBe(3)
  })

  it('las barras salen de su valor sobre el máximo del eje', () => {
    const scores = plan(example()).slots.engineScores as { engine: string; score: string; value: string }[]

    expect(scores.map(score => score.engine)).toEqual(['ChatGPT', 'AI Overviews', 'Gemini', 'Perplexity', 'Copilot', 'Claude'])
    expect(scores[1]).toMatchObject({ score: '52', value: '--gl-dm-value=52%' })
    expectCode(() => plan({ ...example(), engineScores: [...(example().engineScores as unknown[]).slice(0, 5), { engine: 'Claude', score: 140 }] } as SurfaceIntent), 'invalid-intent')
  })

  it('un campo obligatorio ausente no compone', () => {
    for (const key of ['body', 'report', 'modules', 'engineScores', 'shareOfVoice', 'lostPrompts', 'plan', 'expertNote']) {
      expectCode(() => plan(without(example(), key)), 'invalid-intent')
    }
  })

  it('un texto sobre su largo del catálogo hace fallar la composición en su slot', () => {
    const long = { ...example(), plan: (example().plan as { title: string; kind: string }[]).map((move, i) => (i === 0 ? { ...move, title: 'x'.repeat(46) } : move)) }

    expect(plan(long as SurfaceIntent).violations.some(violation => (violation as { slot?: string }).slot === 'plan')).toBe(true)
    expect(plan({ ...example(), body: 'x'.repeat(162) } as SurfaceIntent).violations.some(violation => (violation as { slot?: string }).slot === 'body')).toBe(true)
  })

  it('illustrative-data-marked: con datos de muestra, sin su marca no compone', () => {
    expectCode(() => plan(without(example(), 'sampleMark')), 'invalid-intent')
    expectCode(() => plan({ ...example(), sampleMark: '  ' } as SurfaceIntent), 'invalid-intent')
    // Sin `dataOrigin` los datos son de muestra: la marca sigue siendo obligatoria.
    expectCode(() => plan(without(without(example(), 'dataOrigin'), 'sampleMark')), 'invalid-intent')
    expectCode(() => plan({ ...example(), dataOrigin: 'inventado' } as SurfaceIntent), 'invalid-intent')
  })

  it('illustrative-data-marked: con datos del cliente se exige su evidencia y la marca puede omitirse', () => {
    const client = { ...without(example(), 'sampleMark'), dataOrigin: 'client' } as SurfaceIntent

    expectCode(() => plan(client), 'invalid-intent')
    expectCode(() => plan({ ...client, evidenceRef: ' ' } as SurfaceIntent), 'invalid-intent')

    const { slots, violations } = plan({ ...client, evidenceRef: 'diagnostico-2026-09-28.json' } as SurfaceIntent)

    expect(violations).toEqual([])
    expect(slots.report).not.toHaveProperty('mark')
  })

  it('el share of voice suma 100', () => {
    const share = example().shareOfVoice as { label: string; percent: number }[]

    expectCode(() => plan({ ...example(), shareOfVoice: share.map((entry, i) => (i === 0 ? { ...entry, percent: 20 } : entry)) } as SurfaceIntent), 'invalid-intent')
    expect(plan(example()).slots.shareOfVoice).toEqual([
      { label: 'Tu marca', percent: '14%' },
      { label: 'Competidor A', percent: '41%' },
      { label: 'Competidor B', percent: '28%' },
      { label: 'Otros', percent: '17%' }
    ])
  })

  it('generic-ai-interface: los motores van sólo como texto, sin logos, íconos ni colores de sus productos', () => {
    const engines = example().engineScores as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), engineScores: engines.map((e, i) => (i === 0 ? { ...e, logo: 'openai.svg' } : e)) } as SurfaceIntent), 'invalid-intent')
    expectCode(() => plan({ ...example(), engineScores: engines.map((e, i) => (i === 0 ? { ...e, color: '#10a37f' } : e)) } as SurfaceIntent), 'invalid-intent')

    const { piece, slots } = plan(example())

    // Ningún asset de archivo ni de logo: sólo capas que pinta el builder desde el token (el isotipo de Efeonce es un
    // asset fijo de la plantilla, no del plan).
    expect(piece.assets.every(asset => asset.kind === 'svg')).toBe(true)
    expect(piece.assets.map(asset => asset.ref).join(' ')).not.toMatch(/logo|file/)

    // Todo color del plan (slots y capas) sale de AXIS: la paleta de la línea, el papel del documento o el token de la receta.
    const recipe = G.surfaces.deck.recipes['decision-diagnosis-map']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe.glass), ...hexesIn(recipe)])
    const used = [...hexesIn(slots), ...piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))]

    expect(used.length).toBeGreaterThan(0)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
