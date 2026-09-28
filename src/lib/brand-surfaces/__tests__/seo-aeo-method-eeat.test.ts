/**
 * `method-eeat` (TASK-1934): el intent de ejemplo compone contra el contrato de slots de `MethodEeat`; lo que la lámina
 * no admite (una letra de menos, un medidor fuera de 0–1, un campo ausente o sobre su largo) falla cerrado, y el largo
 * de cada barra sale del `fill` de su lectura (`bars-from-values`), nunca de un ancho fijo.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-method-eeat-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const example = (): SurfaceIntent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as SurfaceIntent

const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'method-eeat.slots.json'), 'utf8')) as TemplateContract

type Reading = { role: string; fill: string; topic: string; label: string; value: string }
type Letter = { role: string; left: string; top: string; height: string; letter: string; name: string; builtWith: string }

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'MethodEeat' } as SlideSpec, contract)

  return { piece, violations, slots: slide.slots as Record<string, unknown> }
}

const expectInvalid = (intent: SurfaceIntent) => {
  try {
    const { violations } = plan(intent)

    // Si el builder lo deja pasar, el contrato de la plantilla lo tiene que rechazar.
    expect(violations.length).toBeGreaterThan(0)
  } catch (error) {
    expect(error).toBeInstanceOf(SurfacePieceError)
  }
}

describe('method-eeat', () => {
  it('compone el intent de ejemplo con `deck.method-eeat` y pasa el contrato de slots', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.method-eeat')
    expect(violations).toEqual([])
    expect((slots.voice as Record<string, string>).answerLead).toBe('Porque')
    expect((slots.voice as Record<string, string>).answer).toBe('confía')
    expect((slots.frame as Record<string, unknown>).answerPx).toBe(120)
    expect(piece.assets.map(asset => asset.ref)).toEqual(['asset-ref:layer:method-eeat-stage', 'asset-ref:layer:method-eeat-platform'])
  })

  it('la cuarta letra (Confianza) es la destacada: más alta y arriba', () => {
    const letters = plan(example()).slots.letters as Letter[]

    expect(letters.map(l => l.role)).toEqual(['rest', 'rest', 'rest', 'lead'])
    expect(letters[3]!.top).toBe('--gl-ee-card-top=250px')
    expect(letters[3]!.height).toBe('--gl-ee-card-height=560px')
    expect(letters[0]!.height).toBe('--gl-ee-card-height=530px')
    expect(letters.map(l => l.left)).toEqual(['--gl-ee-card-left=780px', '--gl-ee-card-left=1030px', '--gl-ee-card-left=1280px', '--gl-ee-card-left=1530px'])
  })

  it('el largo de cada barra sale de su `fill`, y la de la IA es la destacada', () => {
    const readings = plan(example()).slots.meter as Reading[]

    expect(readings.map(r => r.fill)).toEqual(['--gl-ee-fill=55%', '--gl-ee-fill=100%'])
    expect(readings.map(r => r.role)).toEqual(['rest', 'lead'])

    const intent = example()

    ;(intent.meter as { fill: number }[])[0]!.fill = 0.3
    ;(intent.meter as { fill: number }[])[1]!.fill = 0.8

    expect((plan(intent).slots.meter as Reading[]).map(r => r.fill)).toEqual(['--gl-ee-fill=30%', '--gl-ee-fill=80%'])
  })

  it('con tres letras no compone', () => {
    const intent = example()

    intent.letters = (intent.letters as unknown[]).slice(0, 3)

    expect(() => planSurfacePiece(intent, { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })

  it('las letras van siempre en orden E-E-A-T', () => {
    const intent = example()

    const letters = intent.letters as { letter: string }[]

    ;[letters[2], letters[3]] = [letters[3]!, letters[2]!]

    expect(() => planSurfacePiece(intent, { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })

  it.each([1.2, -0.1, '0.5', null])('un `fill` fuera de 0–1 (%s) no compone', fill => {
    const intent = example()

    ;(intent.meter as { fill: unknown }[])[1]!.fill = fill

    expect(() => planSurfacePiece(intent, { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })

  it('el medidor lleva exactamente dos lecturas', () => {
    const intent = example()

    intent.meter = (intent.meter as unknown[]).slice(0, 1)

    expect(() => planSurfacePiece(intent, { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })

  it.each(['body', 'builtWithLabel', 'meterTopic', 'letters', 'meter'])('sin `%s` no compone', key => {
    const intent = example() as Record<string, unknown>

    delete intent[key]

    expectInvalid(intent as SurfaceIntent)
  })

  it('un campo de una letra ausente falla', () => {
    const intent = example()

    delete (intent.letters as Record<string, unknown>[])[1]!.builtWith

    expect(() => planSurfacePiece(intent, { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })

  it.each([
    ['la descripción de una letra', (i: Record<string, unknown>) => ((i.letters as Record<string, string>[])[0]!.description = 'x'.repeat(86))],
    ['el nombre de una letra', (i: Record<string, unknown>) => ((i.letters as Record<string, string>[])[0]!.name = 'x'.repeat(13))],
    ['el rótulo del medidor', (i: Record<string, unknown>) => ((i.meter as Record<string, string>[])[0]!.label = 'x'.repeat(25))],
    ['la lectura del medidor', (i: Record<string, unknown>) => ((i.meter as Record<string, string>[])[0]!.value = 'x'.repeat(15))],
    ['la bajada', (i: Record<string, unknown>) => (i.body = 'x'.repeat(162))]
  ])('%s sobre su largo falla', (_what, mutate) => {
    const intent = example() as Record<string, unknown>

    mutate(intent)

    expectInvalid(intent as SurfaceIntent)
  })
})
