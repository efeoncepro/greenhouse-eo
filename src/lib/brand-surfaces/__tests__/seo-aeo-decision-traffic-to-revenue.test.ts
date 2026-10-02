/**
 * `decision-traffic-to-revenue` (TASK-1934): el intent de ejemplo compone contra el contrato de slots de
 * `DecisionTrafficToRevenue`; lo que la lámina no admite (un escalón de menos, un campo ausente o sobre su largo) falla
 * cerrado, los escalones suben desde la base medida por AXIS con el último iluminado, y la trayectoria de luz es la
 * única órbita de la lámina (una sola capa, una sola esfera).
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'
import type { SurfaceAssetRequest } from '../types'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-decision-traffic-to-revenue-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const example = (): SurfaceIntent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as SurfaceIntent

const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'decision-traffic-to-revenue.slots.json'), 'utf8')) as TemplateContract

type Step = { role: string; left: string; top: string; height: string; z: string; fillOpacity: string; number: string; title: string; description: string; channel: string }

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'DecisionTrafficToRevenue' } as SlideSpec, contract)

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

const svgOf = (assets: SurfaceAssetRequest[], ref: string): string => (assets.find(asset => asset.ref === ref) as Extract<SurfaceAssetRequest, { kind: 'svg' }>).svg

describe('decision-traffic-to-revenue', () => {
  it('compone el intent de ejemplo con `deck.decision-traffic-to-revenue` y pasa el contrato de slots', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.decision-traffic-to-revenue')
    expect(violations).toEqual([])
    expect((slots.voice as Record<string, string>).answerLead).toBe('En')
    expect((slots.voice as Record<string, string>).answer).toBe('ingresos')
    expect((slots.frame as Record<string, unknown>).answerPx).toBe(132)
    expect(slots.cutLabel).toBe('La mayoría de las agencias se detiene aquí')
    expect(slots.body).toContain('<strong>ingresos</strong>')
  })

  it('los cuatro escalones suben desde la base de AXIS y el último es el iluminado', () => {
    const steps = plan(example()).slots.steps as Step[]

    expect(steps.map(step => step.role)).toEqual(['rest', 'rest', 'rest', 'lead'])
    expect(steps.map(step => step.left)).toEqual(['--gl-ttr-left=790px', '--gl-ttr-left=1056px', '--gl-ttr-left=1322px', '--gl-ttr-left=1588px'])
    expect(steps.map(step => step.height)).toEqual(['--gl-ttr-height=250px', '--gl-ttr-height=360px', '--gl-ttr-height=470px', '--gl-ttr-height=580px'])
    expect(steps.map(step => step.top)).toEqual(['--gl-ttr-top=620px', '--gl-ttr-top=510px', '--gl-ttr-top=400px', '--gl-ttr-top=290px'])
    expect(steps.map(step => step.fillOpacity)).toEqual(['--gl-ttr-fill-opacity=10%', '--gl-ttr-fill-opacity=15%', '--gl-ttr-fill-opacity=20%', '--gl-ttr-fill-opacity=25%'])
    expect(steps.map(step => step.title)).toEqual(['Tráfico calificado', 'Leads', 'Pipeline', 'Ingresos'])
  })

  it('con tres escalones no compone', () => {
    const intent = example()

    intent.steps = (intent.steps as unknown[]).slice(0, 3) as never

    expect(() => planSurfacePiece(intent, { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })

  it('el plan lleva una sola capa de trayectoria: una órbita, con una sola esfera sobre el último escalón', () => {
    const { piece, slots } = plan(example())
    const refs = piece.assets.map(asset => asset.ref)

    expect(refs).toEqual([
      'asset-ref:layer:decision-traffic-to-revenue-stage',
      'asset-ref:layer:decision-traffic-to-revenue-cut',
      'asset-ref:layer:decision-traffic-to-revenue-trajectory'
    ])
    expect(refs.filter(ref => ref.includes('trajectory'))).toHaveLength(1)
    expect((slots.trajectory as { src: string }).src).toBe('asset-ref:layer:decision-traffic-to-revenue-trajectory')

    const trajectory = svgOf(piece.assets, 'asset-ref:layer:decision-traffic-to-revenue-trajectory')

    // Tres puntos en las cimas intermedias + la esfera y su brillo sobre la cima del último (x 1713, y 870 − 580 − 34).
    expect(trajectory.match(/<circle /g)).toHaveLength(5)
    expect(trajectory.match(/<circle cx="1713" cy="256"/g)).toHaveLength(2)

    // Ninguna otra capa dibuja una órbita: el corte es una línea y el escenario, halo y piso.
    for (const ref of refs.filter(ref => !ref.includes('trajectory'))) {
      expect(svgOf(piece.assets, ref)).not.toMatch(/<circle |<ellipse |<path /)
    }
  })

  it('el corte punteado va entre el primer y el segundo escalón, con su rótulo a la izquierda', () => {
    const { piece, slots } = plan(example())
    const cut = svgOf(piece.assets, 'asset-ref:layer:decision-traffic-to-revenue-cut')
    const frame = slots.frame as Record<string, unknown>

    expect(cut).toContain('x1="1048" y1="300" x2="1048" y2="900"')
    expect(cut).toContain('stroke-dasharray="7 8"')
    expect(frame.cutLabelLeft).toBe('--gl-ttr-cut-left=848px')
    expect(frame.cutLabelAlign).toBe('end')
  })

  it.each(['body', 'steps', 'cutLabel'])('sin `%s` no compone', key => {
    const intent = example() as Record<string, unknown>

    delete intent[key]

    expectInvalid(intent as SurfaceIntent)
  })

  it.each(['number', 'name', 'description', 'channel'])('un escalón sin `%s` no compone', key => {
    const intent = example()

    delete (intent.steps as Record<string, unknown>[])[2]![key]

    expect(() => planSurfacePiece(intent, { artifactId: 'prueba' })).toThrow(SurfacePieceError)
  })

  it.each([
    ['la descripción de un escalón', (i: Record<string, unknown>) => ((i.steps as Record<string, string>[])[0]!.description = 'x'.repeat(103))],
    ['el nombre de un escalón', (i: Record<string, unknown>) => ((i.steps as Record<string, string>[])[1]!.name = 'x'.repeat(29))],
    ['el canal de un escalón', (i: Record<string, unknown>) => ((i.steps as Record<string, string>[])[2]!.channel = 'x'.repeat(25))],
    ['el rótulo del corte', (i: Record<string, unknown>) => (i.cutLabel = 'x'.repeat(69))],
    ['la bajada', (i: Record<string, unknown>) => (i.body = 'x'.repeat(162))],
    ['la pregunta', (i: Record<string, unknown>) => ((i.voice as Record<string, string>).question = `¿${'x'.repeat(43)}?`)]
  ])('%s sobre su largo falla', (_what, mutate) => {
    const intent = example() as Record<string, unknown>

    mutate(intent)

    expectInvalid(intent as SurfaceIntent)
  })
})
