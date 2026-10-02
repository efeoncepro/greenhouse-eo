/**
 * `decision-difference` (TASK-1934): la alternativa genérica frente al método medible, con la objeción del equipo
 * propio al pie. Compone con su plantilla desde el intent de ejemplo, cumple su contrato de slots y falla cerrado
 * cuando falta un campo, cuando un texto supera su largo, cuando la comparación no trae sus cinco filas o la franja
 * sus tres pilares.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-decision-difference-intent.json')
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

  return { piece, template, violations, slots: slide.slots as Record<string, unknown> }
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

describe('deck · decision-difference (TASK-1934)', () => {
  it('compone con su plantilla y pasa su contrato de slots', () => {
    const { piece, template, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.decision-difference')
    expect(template).toBe('DecisionDifference')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ eyebrow: 'La diferencia', answerLead: 'Lo puedes', answer: 'ver' })
    expect(slots.versus).toBe('vs')
  })

  it('la respuesta mide lo que dice AXIS (120 px, 3× la pregunta) y baja con la pregunta en dos líneas', () => {
    const frame = plan(example()).slots.frame as Record<string, unknown>

    expect(frame.answerPx).toBe(120)
    expect(frame.answerTop).toBe(330)
    expect(frame.bodyTop).toBe(690)
  })

  it('las tarjetas salen del token: la alternativa atrás girada, Efeonce al frente, y las filas en pares con su ícono', () => {
    const { slots, piece } = plan(example())
    const frame = slots.frame as Record<string, string>
    const alternative = slots.alternativeRows as { mark: string; text: string }[]
    const efeonce = slots.efeonceRows as { mark: string; text: string }[]

    expect(frame.altLeft).toBe('--gl-df-alt-left=790px')
    expect(frame.altRotate).toBe('--gl-df-alt-rotate=14deg')
    expect(frame.efRotate).toBe('--gl-df-ef-rotate=-6deg')
    expect(alternative).toHaveLength(5)
    expect(efeonce).toHaveLength(5)
    expect(alternative[0]!.text).toBe('Promete «el #1 en Google» garantizado')
    expect(efeonce[0]!.text).toBe('Estima según tu punto de partida, sin promesas vacías')
    expect(new Set(alternative.map(row => row.mark))).toEqual(new Set(['asset-ref:layer:decision-difference-cross']))
    expect(new Set(efeonce.map(row => row.mark))).toEqual(new Set(['asset-ref:layer:decision-difference-check']))

    const check = piece.assets.find(asset => asset.ref === 'asset-ref:layer:decision-difference-check') as { svg: string }

    // El disco del check va en el acento de la línea (teal) y el visto en oscuro, desde `comparison.efeonce.mark`.
    expect(check.svg).toContain('fill="#36c8bf"')
    expect(check.svg).toContain('stroke="#001a33"')
  })

  it('un campo obligatorio ausente falla cerrado', () => {
    const intent = example() as Record<string, unknown>

    expectCode(() => plan({ ...intent, alternative: { kicker: 'La alternativa' } } as unknown as SurfaceIntent), 'invalid-intent')
    expectCode(() => plan({ ...intent, versus: undefined } as unknown as SurfaceIntent), 'invalid-intent')
    expectCode(() => plan({ ...intent, body: undefined } as SurfaceIntent), 'invalid-intent')
  })

  it('un texto sobre su largo no se achica: el contrato lo rechaza', () => {
    const intent = example() as Record<string, unknown>
    const rows = (intent.rows as { alternative: string; efeonce: string }[]).map(row => ({ ...row }))

    rows[0]!.efeonce = 'x'.repeat(86)

    expect(plan({ ...intent, rows } as unknown as SurfaceIntent).violations.length).toBeGreaterThan(0)
    expect(plan({ ...intent, efeonce: { kicker: 'Efeonce', title: 'Un método medible y verificable' } } as unknown as SurfaceIntent).violations.length).toBeGreaterThan(0)
  })

  it('con cuatro filas no compone: la comparación va en cinco pares alineados', () => {
    const intent = example() as Record<string, unknown>

    expectCode(() => plan({ ...intent, rows: (intent.rows as unknown[]).slice(0, 4) } as unknown as SurfaceIntent), 'invalid-intent')
  })

  it('con dos pilares no compone: la franja del equipo propio lleva tres', () => {
    const intent = example() as Record<string, unknown>
    const ownTeam = intent.ownTeam as { pillars: unknown[] }

    expectCode(() => plan({ ...intent, ownTeam: { ...ownTeam, pillars: ownTeam.pillars.slice(0, 2) } } as unknown as SurfaceIntent), 'invalid-intent')
  })
})
