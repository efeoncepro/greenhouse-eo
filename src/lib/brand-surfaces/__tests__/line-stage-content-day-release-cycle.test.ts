/**
 * `content-day-release-cycle` (TASK-1942, deck Salesforce SF14): «¿Cómo trabajamos contigo? Sin sorpresas.». El intent de
 * ejemplo compone la plantilla `ContentDayReleaseCycle` con su contrato de slots limpio y la selección «Cliente» sobre el
 * botón de aprobación; el ciclo es fijo y el estado de cada paso sale de `currentStep`; las herramientas son isotipos del
 * catálogo o íconos oficiales de producto; lo que falta o se pasa de largo falla cerrado y todo color sale de AXIS.
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

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-content-day-release-cycle-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'content-day-release-cycle.slots.json'), 'utf8')) as TemplateContract
const template = fs.readFileSync(path.join(CATALOG, 'content-day-release-cycle.html'), 'utf8')
const styles = cssSectionOf(fs.readFileSync(path.join(CATALOG, 'graphic-line.css'), 'utf8'), 'content-day-release-cycle')

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentDayReleaseCycle' } as SlideSpec, contract)

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
const release = (patch: Record<string, unknown>): Intent => ({ ...example(), release: { ...(example().release as Record<string, unknown>), ...patch } }) as Intent
const tools = () => example().tools as Record<string, unknown>[]

describe('deck · content-day-release-cycle (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre el botón de aprobación', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-day-release-cycle')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Sin', answer: 'sorpresas' })
    expect(slots.approval).toMatchObject({ cta: 'Aprobar release', caption: 'Qué cambia en tu consola, en 3 minutos' })
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-start', participantKind: 'role', targetKind: 'object', padding: 'compact' })

    // Un solo objetivo de selección: el botón «Aprobar release».
    expect(template.match(/data-gl-selection-target/g)).toHaveLength(1)
    expect(template).toMatch(/data-slot-field="cta" data-gl-selection-target/)
  })

  it('el ciclo es fijo y el estado de cada paso sale de `currentStep`', () => {
    expect(plan(example()).slots.steps).toEqual([
      { label: 'Sandbox', state: 'done', glyph: '✓' },
      { label: 'Pruebas', state: 'done', glyph: '✓' },
      { label: 'Tu aprobación', state: 'now', glyph: '•' },
      { label: 'Producción', state: 'todo' }
    ])

    expect((plan(release({ currentStep: 1 })).slots.steps as { state: string }[]).map(step => step.state)).toEqual(['now', 'todo', 'todo', 'todo'])
    expect((plan(release({ currentStep: 4 })).slots.steps as { state: string }[]).map(step => step.state)).toEqual(['done', 'done', 'done', 'now'])

    for (const bad of [0, 5, 2.5, '3', undefined]) expectCode(() => plan(release({ currentStep: bad })), 'invalid-intent')
  })

  it('las herramientas: isotipos del catálogo o el ícono oficial de un producto, con su posición y su cuerpo del token', () => {
    const { piece, slots } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual([
      'src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-service.svg',
      'src/lib/artifact-composer/catalogs/deck-axis/assets/tools/loom-isotype.svg',
      'src/lib/artifact-composer/catalogs/deck-axis/assets/tools/teams-isotype.svg',
      'src/lib/artifact-composer/catalogs/deck-axis/assets/tools/notion-isotype.svg',
      'src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-platform.svg'
    ])

    for (const file of files) expect(fs.existsSync(path.resolve(__dirname, '../../../..', file.path)), file.path).toBe(true)

    const items = slots.tools as Record<string, string>[]

    expect(items[0]).toMatchObject({ left: '--gl-crc-left=700px', top: '--gl-crc-top=150px', iconPx: '--gl-crc-mark-px=64px' })
    expect(items[2]!.iconPx).toBe('--gl-crc-mark-px=72px')
    expect(items[3]!.iconPx).toBe('--gl-crc-mark-px=68px')

    expectCode(() => plan({ ...example(), tools: tools().map((t, i) => (i === 0 ? { ...t, tool: 'zoom' } : t)) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), tools: tools().map((t, i) => (i === 3 ? { ...t, tool: 'sf-icon:hubspot' } : t)) } as Intent), 'invalid-intent')
    expectCode(() => plan(release({ icon: 'public/images/logos/partners/salesforce.com_logo.svg' })), 'invalid-intent')
    expectCode(() => plan(release({ videoTool: 'youtube' })), 'invalid-intent')
  })

  it('un campo obligatorio ausente no compone', () => {
    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), tools: tools().slice(0, 3) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Sorpresas'] } } as Intent), 'invalid-intent')

    for (const key of ['kicker', 'title', 'videoDuration', 'presenterInitials', 'videoCaption', 'approveCta']) {
      expectCode(() => plan(release({ [key]: ' ' })), 'invalid-intent')
    }

    expectCode(() => plan(release({ videoDuration: '3 min' })), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const over = (intent: Intent, slot: string) => expect(plan(intent).violations.some(v => (v as { slot?: string }).slot === slot), slot).toBe(true)

    over(release({ title: 'x'.repeat(40) }), 'release')
    over(release({ approveCta: 'x'.repeat(23) }), 'approval')
    over({ ...example(), tools: tools().map((t, i) => (i === 0 ? { ...t, label: 'x'.repeat(37) } : t)) } as Intent, 'tools')
    over({ ...example(), body: 'x'.repeat(180) } as Intent, 'body')
    over({ ...example(), voice: { ...(example().voice as object), answer: ['Sin', 'sorpresass'] } } as Intent, 'voice')

    // 16 caracteres entre las dos líneas.
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Siempre', 'informado'] } } as Intent), 'invalid-intent')
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['content-day-release-cycle']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
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
