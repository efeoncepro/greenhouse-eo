/**
 * `content-day-live-library` (TASK-1942, deck Salesforce SF15): «¿Cómo aprende tu equipo? A su ritmo.». El intent de
 * ejemplo compone la plantilla `ContentDayLiveLibrary` con su contrato de slots limpio y sin selección; la marca de datos
 * de muestra es obligatoria con datos de muestra y opcional con datos del cliente y su evidencia; la herramienta de la
 * biblioteca es opcional (sólo si la cuenta la usa); los íconos de producto salen de AXIS_PARTNER_ASSETS; lo que falta o
 * se pasa de largo falla cerrado y todo color sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

/** El bloque de CSS de la receta en `graphic-line.css`: desde el ancla anterior hasta la suya. */
const cssSectionOf = (css: string, id: string): string => {
  const end = css.indexOf(`ancla TASK-1942 · ${id} `)
  const start = css.lastIndexOf('── ancla ', end - 4)

  return css.slice(start + 1, end)
}

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-content-day-live-library-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'content-day-live-library.slots.json'), 'utf8')) as TemplateContract
const template = fs.readFileSync(path.join(CATALOG, 'content-day-live-library.html'), 'utf8')
const styles = cssSectionOf(fs.readFileSync(path.join(CATALOG, 'graphic-line.css'), 'utf8'), 'content-day-live-library')

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentDayLiveLibrary' } as SlideSpec, contract)

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

const without = (intent: Intent, key: string): Intent => {
  const copy = { ...intent }

  delete copy[key]

  return copy
}

const videos = () => example().videos as Record<string, unknown>[]
const library = (patch: Record<string, unknown>): Intent => ({ ...example(), library: { ...(example().library as Record<string, unknown>), ...patch } }) as Intent

describe('deck · content-day-live-library (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio, sin selección', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-day-live-library')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'A su', answer: 'ritmo' })
    expect(slots.library).toEqual({ kicker: 'En Loom · sobre tu org', title: 'Tutoriales de tu equipo' })
    expect(slots.sampleMark).toBe('Datos de muestra')
    expect(slots).not.toHaveProperty('selection')
    expect(template).not.toMatch(/data-gl-selection-target|data-slot="selection"/)
  })

  it('cada video trae el ícono oficial de su producto y el tono de su miniatura del token', () => {
    const { piece, slots } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual([
      'src/lib/artifact-composer/catalogs/deck-axis/assets/tools/loom-isotype.svg',
      ...['sales', 'service', 'marketing', 'agentforce'].map(name => `src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-${name}.svg`)
    ])

    for (const file of files) expect(fs.existsSync(path.resolve(__dirname, '../../../..', file.path)), file.path).toBe(true)

    expect((slots.videos as { from: string }[]).map(video => video.from)).toEqual(
      ['#16395c', '#1b3f5e', '#14324f', '#10304d'].map(hex => `--gl-cll-thumb-from-color=${hex}`)
    )

    expectCode(() => plan({ ...example(), videos: videos().map((v, i) => (i === 0 ? { ...v, icon: 'hubspot' } : v)) } as Intent), 'invalid-intent')
  })

  it('la herramienta de la biblioteca es opcional: sin ella compone y no se pinta; con ella compone', () => {
    const bare = plan({ ...example(), library: { kicker: 'Sobre tu org', title: 'Tutoriales de tu equipo' } } as Intent)

    expect(bare.violations).toEqual([])
    expect(bare.slots).not.toHaveProperty('libraryTool')
    expect(bare.piece.assets.some(asset => asset.ref === 'asset-ref:file:tool-loom')).toBe(false)
    expect(plan(example()).slots.libraryTool).toEqual({ src: 'asset-ref:file:tool-loom' })
    expectCode(() => plan(library({ tool: 'youtube' })), 'invalid-intent')
  })

  it('illustrative-data-marked: con datos de muestra, sin su marca no compone', () => {
    expectCode(() => plan(without(example(), 'sampleMark')), 'invalid-intent')
    expectCode(() => plan({ ...example(), sampleMark: '  ' } as Intent), 'invalid-intent')
    expectCode(() => plan(without(without(example(), 'dataOrigin'), 'sampleMark')), 'invalid-intent')
    expectCode(() => plan({ ...example(), dataOrigin: 'inventado' } as Intent), 'invalid-intent')
  })

  it('illustrative-data-marked: con datos del cliente se exige su evidencia y la marca puede omitirse (no se pinta)', () => {
    const client = { ...without(example(), 'sampleMark'), dataOrigin: 'client' } as Intent

    expectCode(() => plan(client), 'invalid-intent')
    expectCode(() => plan({ ...client, evidenceRef: ' ' } as Intent), 'invalid-intent')

    const { slots, violations } = plan({ ...client, evidenceRef: 'adopcion-2026-09.json' } as Intent)

    expect(violations).toEqual([])
    expect(slots).not.toHaveProperty('sampleMark')
  })

  it('un campo obligatorio ausente no compone', () => {
    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), videos: videos().slice(0, 3) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), stats: (example().stats as unknown[]).slice(0, 2) } as Intent), 'invalid-intent')
    expectCode(() => plan(library({ title: ' ' })), 'invalid-intent')
    expectCode(() => plan({ ...example(), videos: videos().map((v, i) => (i === 1 ? { ...v, duration: '3 min' } : v)) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Rápido'] } } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const over = (intent: Intent, slot: string) => expect(plan(intent).violations.some(v => (v as { slot?: string }).slot === slot), slot).toBe(true)

    over(library({ title: 'x'.repeat(44) }), 'library')
    over({ ...example(), sampleMark: 'x'.repeat(17) } as Intent, 'sampleMark')
    over({ ...example(), videos: videos().map((v, i) => (i === 0 ? { ...v, title: 'x'.repeat(56) } : v)) } as Intent, 'videos')
    over({ ...example(), stats: (example().stats as Record<string, unknown>[]).map((s, i) => (i === 2 ? { ...s, label: 'x'.repeat(67) } : s)) } as Intent, 'stats')
    over({ ...example(), body: 'x'.repeat(180) } as Intent, 'body')
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipes = G.surfaces.deck.recipes
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipes['content-day-live-library']), ...hexesIn(recipes['content-one-platform']), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })

  it('la plantilla y su CSS no escriben valores de diseño: todo llega del builder', () => {
    for (const source of [template, styles]) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(source).not.toMatch(/rgba?\(/)
      expect(source.replace(/1px solid/g, '')).not.toMatch(/\b\d+(\.\d+)?px\b/)
      expect(source).not.toMatch(/Poppins|Bricolage|Geist/)
    }
  })
})
