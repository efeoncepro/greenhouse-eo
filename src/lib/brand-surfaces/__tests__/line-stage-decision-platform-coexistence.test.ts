/**
 * `decision-platform-coexistence` (TASK-1942, deck Salesforce SF3): «¿Hay que migrar a Next? No por defecto.». El intent
 * de ejemplo compone la plantilla `DecisionPlatformCoexistence` con su contrato de slots limpio; lo que falta o se pasa
 * de largo falla cerrado; los veredictos son el vocabulario fijo de AXIS y nunca todos «Migrar»; la selección «Cliente»
 * toma la fila elegida por ítem; los íconos de producto salen de `AXIS_PARTNER_ASSETS` y todo color del plan sale de
 * AXIS, con el escenario en el acento de la LÍNEA de la pieza.
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

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-decision-platform-coexistence-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>
type Platform = { icon: string; base: string; name: string; items: string[] }
type Capability = { capability: string; verdict: string }

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'decision-platform-coexistence.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'DecisionPlatformCoexistence' } as SlideSpec, contract)

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

const withPlatform = (i: number, patch: Partial<Platform>): Intent => {
  const intent = example()

  return { ...intent, platforms: (intent.platforms as Platform[]).map((p, j) => (j === i ? { ...p, ...patch } : p)) } as Intent
}

const withRow = (i: number, patch: Partial<Capability>): Intent => {
  const intent = example()

  return { ...intent, capabilities: (intent.capabilities as Capability[]).map((c, j) => (j === i ? { ...c, ...patch } : c)) } as Intent
}

const G = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  slogan: { leadColor: { onDark: string } }
  lines: { key: string; accentOnDark: string }[]
  surfaces: { deck: { recipes: Record<string, Record<string, unknown>> } }
}

const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

describe('deck · decision-platform-coexistence (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre la fila elegida', () => {
    const { piece, violations, slots } = plan(example())
    const rows = slots.capabilities as { role: string }[]

    expect(piece.contentType).toBe('deck.decision-platform-coexistence')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'No por', answer: 'defecto' })
    expect(rows.map(row => row.role)).toEqual(['rest', 'rest', 'rest', 'lead', 'rest'])
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact', item: 4 })

    const template = fs.readFileSync(path.join(CATALOG, 'decision-platform-coexistence.html'), 'utf8')

    expect(template).toMatch(/<li class="gl-dpc-row" data-gl-select-item>/)
    expect(template).not.toMatch(/data-gl-selection-target/)
  })

  it('la escena se corre con `sceneOffsetXPx` y cada tarjeta trae su posición y su giro del token', () => {
    const { slots } = plan(example())
    const platforms = slots.platforms as Record<string, string>[]

    // [790, 170, 16] en el token, corrido −80 px.
    expect(platforms[0]).toMatchObject({ left: '--gl-dpc-left=710px', top: '--gl-dpc-top=170px', rotate: '--gl-dpc-rotate=16deg' })
    expect((slots.frame as Record<string, unknown>).tableLeft).toBe('--gl-dpc-table-left=950px')
  })

  it('cada veredicto pinta sus colores de AXIS y sale del vocabulario fijo; nunca todas las filas en «Migrar»', () => {
    const rows = plan(example()).slots.capabilities as Record<string, string>[]
    const verdicts = (G.surfaces.deck.recipes['decision-platform-coexistence']!.decisions as { verdict: { fills: Record<string, { fill: string }> } }).verdict.fills

    expect(Object.keys(verdicts)).toEqual(['Mantener', 'Integrar', 'Modernizar', 'Migrar', 'Retirar'])
    expect(rows[0]).toMatchObject({ verdict: 'Mantener', pillFill: '--gl-dpc-pill-color=#0b1f33', pillInk: '--gl-dpc-pill-ink-color=#ffffff' })
    expect(rows[4]).toMatchObject({ verdict: 'Retirar', pillFill: '--gl-dpc-pill-color=#f5f7fa', pillInk: '--gl-dpc-pill-ink-color=#5f6b7a' })

    expectCode(() => plan(withRow(0, { verdict: 'Reemplazar' })), 'invalid-intent')

    const all = example().capabilities as Capability[]

    expectCode(() => plan({ ...example(), capabilities: all.map(c => ({ ...c, verdict: 'Migrar' })) } as Intent), 'invalid-intent')
  })

  it('la fila elegida va de 1 a 5', () => {
    expectCode(() => plan({ ...example(), selectedCapability: 0 } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), selectedCapability: 6 } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), selectedCapability: undefined } as unknown as Intent), 'invalid-intent')
  })

  it('los íconos de producto son archivos de AXIS_PARTNER_ASSETS, validados contra la lista cerrada', () => {
    const { piece } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual(['src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-marketing.svg'])
    expect(fs.existsSync(path.resolve(__dirname, '../../../..', files[0]!.path))).toBe(true)
    expectCode(() => plan(withPlatform(0, { icon: 'hubspot' })), 'invalid-intent')
  })

  it('el ícono de la tabla es opcional: con dos productos distintos la tabla va sin ícono y compone', () => {
    expect(plan(example()).slots.tableIcon).toEqual({ src: 'asset-ref:file:salesforce-icon-marketing' })

    const { violations, slots } = plan(withPlatform(1, { icon: 'data-cloud' }))

    expect(violations).toEqual([])
    expect(slots.tableIcon).toBeUndefined()
    expect(slots.tableTitle).toBe('Decisión por capacidad')

    const styles = cssSectionOf(fs.readFileSync(path.join(CATALOG, 'graphic-line.css'), 'utf8'), 'decision-platform-coexistence')

    expect(styles).toMatch(/\.gl-dpc-head-icon:empty\s*\{\s*display: none;/)
  })

  it('un campo obligatorio ausente o una cuenta que no calza no compone', () => {
    const platforms = example().platforms as Platform[]
    const rows = example().capabilities as Capability[]

    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), tableTitle: '' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['No por defecto'] } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), platforms: platforms.slice(0, 1) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), capabilities: rows.slice(0, 4) } as Intent), 'invalid-intent')
    expectCode(() => plan(withPlatform(0, { items: platforms[0]!.items.slice(0, 3) })), 'invalid-intent')
    expectCode(() => plan(withRow(2, { capability: ' ' })), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const violated = (intent: Intent, slot: string) => plan(intent).violations.some(v => (v as { slot?: string }).slot === slot)

    expect(violated(withPlatform(0, { name: 'x'.repeat(15) }), 'platforms')).toBe(true)
    expect(violated(withRow(0, { capability: 'x'.repeat(43) }), 'capabilities')).toBe(true)
    expect(violated({ ...example(), tableTitle: 'x'.repeat(40) } as Intent, 'tableTitle')).toBe(true)
    expect(violated({ ...example(), note: 'x'.repeat(116) } as Intent, 'note')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['decision-platform-coexistence']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
