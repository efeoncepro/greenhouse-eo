/**
 * `content-season-launches` (TASK-1942, deck Salesforce SF9): «¿Qué trajo Dreamforce? Agentes.». El intent de ejemplo
 * compone la plantilla `ContentSeasonLaunches` con su contrato de slots limpio y SIN mascota; con la mascota compone
 * sólo con ruta local y autorización. Es lámina de temporada: la fecha de corte `asOf` es obligatoria y tiene que verse
 * impresa en el eyebrow y en la nota; lo que falta o se pasa de largo falla cerrado y todo color sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-content-season-launches-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')
const MASCOT = 'ai-generations/2026-09-29_deck-salesforce/astro/agent-astro-v1-alpha.png'

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'content-season-launches.slots.json'), 'utf8')) as TemplateContract
const template = fs.readFileSync(path.join(CATALOG, 'content-season-launches.html'), 'utf8')

const withMascot = (mascot: Record<string, unknown> = {}): Intent =>
  ({ ...example(), mascot: { path: MASCOT, alt: 'Agent Astro camina sobre la plataforma de luz', authorizationRef: 'SF-AUT-PRUEBA', ...mascot } }) as Intent

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentSeasonLaunches' } as SlideSpec, contract)

  return { piece, violations, slots: slide.slots as Record<string, unknown> }
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
  slogan: { leadColor: { onDark: string } }
  lines: { key: string; accentOnDark: string }[]
  surfaces: { deck: { recipes: Record<string, Record<string, unknown>> } }
}

const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

describe('deck · content-season-launches (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio, con nota y sin selección', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-season-launches')
    expect(violations).toEqual([])
    expect(slots.voice).toEqual({ eyebrow: 'Dreamforce 2026 · al 18-09-2026', question: '¿Qué trajo Dreamforce?', answer: 'Agentes' })
    expect(slots.note).toBe('Estado anunciado por Salesforce al 18-09-2026 · se verifica en cada org')
    expect(slots.asOf).toBe('2026-09-18')
    expect(slots.selection).toBeUndefined()
    expect((slots.launches as unknown[]).length).toBe(8)
    expect(template).not.toContain('data-gl-selection-target')
  })

  it('cuatro fichas por columna y el estado disponible en píldora sólida, el resto en contorno', () => {
    const launches = plan(example()).slots.launches as Record<string, string>[]

    expect(launches[0]).toMatchObject({ left: '--gl-csn-left=790px', top: '--gl-csn-top=180px', state: 'solid' })
    expect(launches[3]).toMatchObject({ left: '--gl-csn-left=790px', top: '--gl-csn-top=740px', state: 'outline', status: 'Piloto · GA nov.' })
    expect(launches[4]).toMatchObject({ left: '--gl-csn-left=1480px', top: '--gl-csn-top=180px', state: 'outline' })
    expect(launches.map(launch => launch.state)).toEqual(['solid', 'solid', 'solid', 'outline', 'outline', 'outline', 'outline', 'outline'])
  })

  it('la fecha de corte es obligatoria, válida e impresa en el eyebrow y en la nota', () => {
    const voice = example().voice as Record<string, unknown>

    expectCode(() => plan({ ...example(), asOf: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), asOf: '18-09-2026' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), asOf: '2026-02-30' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), asOf: '2026-09-19' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...voice, eyebrow: 'Dreamforce 2026' } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: 'Estado anunciado por Salesforce · se verifica en cada org' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: 'Estado anunciado por Salesforce al 18-09-2026' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: undefined } as unknown as Intent), 'invalid-intent')
  })

  it('una lámina de temporada no entra en un documento evergreen', () => {
    expectCode(() => plan({ ...example(), evergreen: true } as Intent), 'invalid-intent')
  })

  it('los íconos de producto son archivos de AXIS_PARTNER_ASSETS, validados contra la lista cerrada', () => {
    const { piece } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual(
      ['agentforce', 'platform', 'marketing'].map(name => `src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-${name}.svg`)
    )

    for (const file of files) expect(fs.existsSync(path.resolve(__dirname, '../../../..', file.path)), file.path).toBe(true)

    const launches = example().launches as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), launches: launches.map((l, i) => (i === 0 ? { ...l, icon: 'einstein' } : l)) } as Intent), 'invalid-intent')
  })

  it('un campo obligatorio ausente no compone', () => {
    const launches = example().launches as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), launches: launches.slice(0, 7) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), launches: launches.map((l, i) => (i === 5 ? { ...l, status: '' } : l)) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Muchos', 'agentes'] } } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const launches = example().launches as Record<string, unknown>[]
    const longNote = `Estado anunciado por Salesforce al 18-09-2026 · se verifica en cada org · ${'x'.repeat(60)}`

    expect(plan({ ...example(), launches: launches.map((l, i) => (i === 0 ? { ...l, description: 'x'.repeat(70) } : l)) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'launches')).toBe(true)
    expect(plan({ ...example(), note: longNote } as Intent).violations.some(v => (v as { slot?: string }).slot === 'note')).toBe(true)
    expect(plan({ ...example(), body: 'x'.repeat(180) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'body')).toBe(true)
  })

  it('sin mascota compone y la plataforma queda vacía; con ella compone desde su ruta local', () => {
    const without = plan(example())

    expect(without.slots.mascot).toBeUndefined()
    expect(without.piece.assets.some(asset => asset.ref.includes('mascot'))).toBe(false)
    expect((contract.slots as Record<string, { required?: boolean }>).mascot?.required).toBe(false)
    expect(template).not.toContain('agent-astro')

    const withIt = plan(withMascot())

    expect(withIt.violations).toEqual([])
    expect(withIt.slots.mascot).toMatchObject({ left: '--gl-csn-mascot-left=1095px', top: '--gl-csn-mascot-top=360px', width: '--gl-csn-mascot-width=385px' })
    expect(withIt.piece.assets.find(asset => asset.ref === (withIt.slots.mascot as { src: string }).src)).toEqual({ ref: 'asset-ref:file:mascot-agent-astro-v1-alpha', kind: 'file', path: MASCOT })
    expectCode(() => plan(withMascot({ authorizationRef: undefined })), 'invalid-intent')
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(withMascot())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['content-season-launches']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })

  it('la píldora mide su alto de AXIS y el nombre empieza en su `title.topPx` (delta q)', () => {
    const frame = plan(example()).slots.frame as Record<string, string>
    const launches = G.surfaces.deck.recipes['content-season-launches']!.launches as { padding: number[]; status: { heightPx: number }; title: { gapTopPx: number; topPx: number } }

    expect(frame.statusHeight).toBe('--gl-csn-status-height=26px')
    expect(launches.padding[0]! + launches.status.heightPx + launches.title.gapTopPx).toBe(launches.title.topPx)
  })
})
