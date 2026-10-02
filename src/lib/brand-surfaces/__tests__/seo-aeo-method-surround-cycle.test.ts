/**
 * `method-surround-cycle` (TASK-1934): el método en ciclo. El intent de ejemplo compone con su plantilla y pasa su
 * contrato de slots; lo que la receta no admite (una estación de más o de menos, un texto sobre su largo, un campo
 * obligatorio ausente) falla cerrado; y la lámina pide exactamente sus cuatro íconos como assets externos y UNA sola
 * capa de loop (una órbita por lámina).
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-method-surround-cycle-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const example = (): SurfaceIntent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as SurfaceIntent

const registry = JSON.parse(fs.readFileSync(path.join(CATALOG, 'registry.json'), 'utf8')) as {
  selector: { map: Record<string, string> }
  templates: { name: string; slotsRef: string }[]
}

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const template = registry.selector.map[piece.contentType]!
  const entry = registry.templates.find(t => t.name === template)!
  const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, entry.slotsRef), 'utf8')) as TemplateContract
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template } as SlideSpec, contract)

  return { piece, template, violations, slots: slide.slots as Record<string, unknown> }
}

/** Falla cerrado: con `SurfacePieceError` (el builder o AXIS) o con violaciones del contrato de slots. */
const rejects = (intent: SurfaceIntent) => {
  let planned: ReturnType<typeof plan>

  try {
    planned = plan(intent)
  } catch (error) {
    expect(error).toBeInstanceOf(SurfacePieceError)

    return
  }

  expect(planned.violations.length).toBeGreaterThan(0)
}

type Station = { icon: string; title: string; description: string }

const withStations = (stations: Station[]): SurfaceIntent => ({ ...example(), stations } as unknown as SurfaceIntent)

const stationsOf = (): Station[] => (example() as unknown as { stations: Station[] }).stations

describe('deck · method-surround-cycle (TASK-1934)', () => {
  it('compone con su plantilla y pasa su contrato de slots', () => {
    const planned = plan(example())

    expect(planned.template).toBe('MethodSurroundCycle')
    expect(planned.piece.contentType).toBe('deck.method-surround-cycle')
    expect(planned.violations).toEqual([])
  })

  it('la estación 1 lleva el rótulo de inicio y el borde destacado; las demás no', () => {
    const stations = plan(example()).slots.stations as { role: string; number: string; start?: string }[]

    expect(stations.map(station => station.role)).toEqual(['lead', 'rest', 'rest', 'rest'])
    expect(stations.map(station => station.number)).toEqual(['01', '02', '03', '04'])
    expect(stations[0]!.start).toBe('Empieza aquí')
    expect(stations.slice(1).every(station => station.start === undefined)).toBe(true)
  })

  it('con tres estaciones no compone (siempre cuatro)', () => {
    rejects(withStations(stationsOf().slice(0, 3)))
  })

  it('con cinco estaciones tampoco compone', () => {
    rejects(withStations([...stationsOf(), stationsOf()[0]!]))
  })

  it('pide exactamente los cuatro íconos como assets externos y una sola capa de loop (una órbita)', () => {
    const { piece } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file')
    const layers = piece.assets.filter(asset => asset.kind === 'svg') as { ref: string; svg: string }[]

    expect(files.map(asset => (asset as { path: string }).path)).toEqual(stationsOf().map(station => station.icon))
    expect(piece.assets.every(asset => asset.kind === 'file' || asset.kind === 'svg')).toBe(true)
    expect(layers.map(layer => layer.ref)).toEqual(['asset-ref:layer:method-surround-cycle-stage', 'asset-ref:layer:method-surround-cycle-loop'])

    const orbits = layers.filter(layer => layer.svg.includes('<ellipse'))

    expect(orbits.map(layer => layer.ref)).toEqual(['asset-ref:layer:method-surround-cycle-loop'])
    // La órbita es UNA elipse: su relleno y su anillo son la misma geometría.
    expect(new Set([...orbits[0]!.svg.matchAll(/<ellipse cx="([^"]+)" cy="([^"]+)" rx="([^"]+)" ry="([^"]+)"/g)].map(m => m.slice(1).join(','))).size).toBe(1)
  })

  it('un campo obligatorio ausente falla cerrado', () => {
    const noCore = { ...example() } as unknown as Record<string, unknown>

    delete noCore.core
    rejects(noCore as unknown as SurfaceIntent)

    const noStart = { ...example() } as unknown as Record<string, unknown>

    delete noStart.startLabel
    rejects(noStart as unknown as SurfaceIntent)

    rejects(withStations(stationsOf().map((station, i) => (i === 2 ? { ...station, description: '' } : station))))
  })

  it('un texto sobre su largo falla cerrado, nunca se achica', () => {
    rejects(withStations(stationsOf().map((station, i) => (i === 0 ? { ...station, description: `${station.description} ${'x'.repeat(60)}` } : station))))
    rejects(withStations(stationsOf().map((station, i) => (i === 1 ? { ...station, title: 'Crear y publicar hoy' } : station))))
    rejects({ ...example(), core: { title: 'Tu marca en la IA hoy', caption: 'sube un nivel en cada vuelta' } } as unknown as SurfaceIntent)
    rejects({ ...example(), voice: { eyebrow: 'Surround Discovery', question: '¿Cómo se sostiene en el tiempo?', answer: ['En ciclo'] } } as unknown as SurfaceIntent)
  })

  it('cada descripción cabe en SU tarjeta: 126 en las laterales aunque las anchas admitan 155', () => {
    const lateral = 'x'.repeat(127)

    expect(() => plan(withStations(stationsOf().map((station, i) => (i === 1 ? { ...station, description: lateral } : station))))).toThrow(SurfacePieceError)
    expect(() => plan(withStations(stationsOf().map((station, i) => (i === 3 ? { ...station, description: lateral } : station))))).toThrow(/126 caracteres/)

    // En una tarjeta ancha el mismo largo sí cabe.
    expect(plan(withStations(stationsOf().map((station, i) => (i === 2 ? { ...station, description: lateral } : station)))).violations).toEqual([])
  })

  it('las flechas llevan su punta adelante del nodo y los brillos, su color de AXIS', () => {
    const { piece, slots } = plan(example())
    const loop = piece.assets.find(asset => asset.ref.endsWith('-loop')) as { svg: string }
    const frame = slots.frame as Record<string, string>

    expect(loop.svg).toContain('d="M -9 -8 L 5 0 L -9 8"')
    expect(frame.cardGlowColor).toBe('--gl-sur-card-glow-color=#72ded8')
    expect(frame.coreGlowColor).toBe('--gl-sur-core-glow-color=#72ded8')
    expect(frame.answerShadowColor).toBe('--gl-sur-answer-shadow-color=#000000')
  })

  it('la respuesta va en una línea', () => {
    rejects({ ...example(), voice: { eyebrow: 'Surround Discovery', question: '¿Cómo se sostiene?', answer: ['En', 'ciclo'] } } as unknown as SurfaceIntent)
  })
})
