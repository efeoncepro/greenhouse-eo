/**
 * `decision-ai-market` (TASK-1934): el intent de ejemplo compone contra el contrato de slots de `DecisionAiMarket`; una
 * cifra sin fuente no llega al builder (AXIS la rechaza con `figure-source-required`), la lámina lleva exactamente tres
 * cifras, y cada fuente se imprime al pie de su monolito: el logo del tercero normalizado (un tono, el mismo peso
 * óptico) o, sin logo, el wordmark con el texto de `source`.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'
import type { SurfaceAssetRequest } from '../types'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-decision-ai-market-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const example = (): SurfaceIntent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as SurfaceIntent

const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'decision-ai-market.slots.json'), 'utf8')) as TemplateContract

type Figure = { role: string; size: string; value: string; label: string; detail: string; year: string; wordmark?: string; logo?: { src: string; alt: string }[] }
type FigureIntent = { value: string; label: string; source: string; detail?: string; year?: string; sourceLogo?: string }

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'DecisionAiMarket' } as SlideSpec, contract)

  return { piece, violations, slots: slide.slots as Record<string, unknown> }
}

const withFigures = (edit: (figures: FigureIntent[]) => FigureIntent[]): SurfaceIntent => {
  const intent = example()

  intent.figures = edit(JSON.parse(JSON.stringify(intent.figures)) as FigureIntent[])

  return intent
}

/** Los códigos con que AXIS rechazó el intent (falla si no lo rechazó con `surface-issues`). */
const issuesOf = (intent: SurfaceIntent): string[] => {
  let caught: unknown

  try {
    planSurfacePiece(intent, { artifactId: 'prueba' })
  } catch (error) {
    caught = error
  }

  expect(caught).toBeInstanceOf(SurfacePieceError)
  expect((caught as SurfacePieceError).code).toBe('surface-issues')

  return (caught as SurfacePieceError).issues.map(issue => (issue as { code: string }).code)
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

describe('decision-ai-market', () => {
  it('compone el intent de ejemplo con `deck.decision-ai-market` y pasa el contrato de slots', () => {
    const { piece, violations, slots } = plan(example())
    const figures = slots.figures as Figure[]

    expect(piece.contentType).toBe('deck.decision-ai-market')
    expect(violations).toEqual([])
    expect((slots.voice as Record<string, string>).answer).toBe('En la IA')
    expect((slots.frame as Record<string, unknown>).answerPx).toBe(132)
    expect(slots.body).toContain('<strong>recomendación</strong>')
    expect(figures.map(figure => figure.value)).toEqual(['−27%', '50%', '<1 en 100'])
  })

  it('el monolito del centro va adelante y la cifra larga baja al cuerpo menor de AXIS', () => {
    const figures = plan(example()).slots.figures as Figure[]

    expect(figures.map(figure => figure.role)).toEqual(['rest', 'lead', 'rest'])
    expect(figures.map(figure => figure.size)).toEqual(['large', 'large', 'small'])

    const short = withFigures(figures => figures.map((figure, i) => (i === 2 ? { ...figure, value: '12345' } : figure)))

    expect((plan(short).slots.figures as Figure[])[2]!.size).toBe('large')
  })

  it('una cifra sin fuente no compone: AXIS la rechaza antes del builder (`figure-source-required`)', () => {
    const intent = withFigures(figures => figures.map((figure, i) => (i === 1 ? { ...figure, source: '' } : figure)))

    expect(issuesOf(intent)).toContain('figure-source-required')
  })

  it('con dos cifras en vez de tres no compone', () => {
    expect(() => planSurfacePiece(withFigures(figures => figures.slice(0, 2)), { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })

  it('cada fuente se imprime al pie de su monolito: el logo normalizado o el wordmark con el texto de `source`', () => {
    const { piece, slots } = plan(example())
    const figures = slots.figures as Figure[]
    const logos = piece.assets.filter(asset => asset.kind === 'logo') as Extract<SurfaceAssetRequest, { kind: 'logo' }>[]

    for (const [i, intentFigure] of (example().figures as FigureIntent[]).entries()) {
      const printed = figures[i]!

      if (intentFigure.sourceLogo) {
        expect(printed.wordmark).toBeUndefined()
        expect(printed.logo).toHaveLength(1)
        expect(printed.logo![0]!.alt).toBe(intentFigure.source)
        expect(logos.find(logo => logo.ref === printed.logo![0]!.src)?.path).toBe(intentFigure.sourceLogo)
      } else {
        expect(printed.logo).toBeUndefined()
        expect(printed.wordmark).toBe(intentFigure.source)
      }

      expect(printed.year).toBe(intentFigure.year)
    }

    // Los logos de terceros en UN tono claro y con la altura de AXIS.
    expect(logos).toHaveLength(2)
    expect(new Set(logos.map(logo => logo.tone))).toEqual(new Set(['#e6edf3']))
    expect(logos.every(logo => logo.maxHeight === 26)).toBe(true)
  })

  it('el detalle y el año de cada cifra son obligatorios', () => {
    expect(() => plan(withFigures(figures => figures.map((figure, i) => (i === 0 ? { ...figure, detail: undefined } : figure))))).toThrow(SurfacePieceError)
    expect(() => plan(withFigures(figures => figures.map((figure, i) => (i === 2 ? { ...figure, year: ' ' } : figure))))).toThrow(SurfacePieceError)
  })

  it('un campo sobre su largo no compone: nunca se achica', () => {
    expectInvalid(withFigures(figures => figures.map((figure, i) => (i === 1 ? { ...figure, detail: 'x'.repeat(125) } : figure))))
    expectInvalid(withFigures(figures => figures.map((figure, i) => (i === 0 ? { ...figure, label: 'x'.repeat(60) } : figure))))
    expectInvalid({ ...example(), voice: { ...(example().voice as object), answer: ['En la IA hoy'] } } as SurfaceIntent)
    expectInvalid({ ...example(), body: 'x'.repeat(162) } as SurfaceIntent)
  })

  it('sin bajada no compone', () => {
    const intent: Record<string, unknown> = { ...example() }

    delete intent.body

    expect(() => planSurfacePiece(intent as SurfaceIntent, { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })
})
