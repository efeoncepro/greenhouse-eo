/**
 * `method-waves` (TASK-1942, deck Salesforce SF10): «¿Cómo se suma un agente? Por olas.». El intent de ejemplo compone la
 * plantilla `MethodWaves` con su contrato de slots limpio; cuatro escalones numerados con las alturas del token; la
 * trayectoria une sus cimas y es la única órbita (sin plataforma); la selección «Cliente» toma por ítem el escalón por
 * donde se empieza; el ícono de la cima es opcional (en sus dos caras) y sólo oficial; lo que falta o se pasa de largo
 * falla cerrado y todo color del plan sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const ID = 'method-waves'
const EXAMPLE = path.join(__dirname, '..', 'examples', `deck-${ID}-intent.json`)
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

/** El bloque de CSS de la receta en `graphic-line.css`: desde el ancla anterior hasta la suya. */
const cssOf = (id: string): string => {
  const css = fs.readFileSync(path.join(CATALOG, 'graphic-line.css'), 'utf8')
  const end = css.indexOf(`ancla TASK-1942 · ${id} `)

  if (end < 0) throw new Error(`graphic-line.css no trae el ancla de ${id}`)

  return css.slice(css.lastIndexOf('── ancla ', end - 4) + 1, end)
}

type Intent = SurfaceIntent & Record<string, unknown>
type Step = { kicker: string; name: string; desc: string }

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, `${ID}.slots.json`), 'utf8')) as TemplateContract
const template = fs.readFileSync(path.join(CATALOG, `${ID}.html`), 'utf8')

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'MethodWaves' } as SlideSpec, contract)

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

const withStep = (i: number, patch: Partial<Step>): Intent => {
  const intent = example()

  return { ...intent, steps: (intent.steps as Step[]).map((s, j) => (j === i ? { ...s, ...patch } : s)) } as Intent
}

const G = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  slogan: { leadColor: { onDark: string } }
  lines: { key: string; accentOnDark: string }[]
  surfaces: { deck: { recipes: Record<string, Record<string, unknown>> } }
}

const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

describe('deck · method-waves (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre el escalón elegido', () => {
    const { piece, violations, slots } = plan(example())
    const steps = slots.steps as Record<string, string>[]

    expect(piece.contentType).toBe('deck.method-waves')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Por', answer: 'olas' })
    expect(steps.map(s => s.role)).toEqual(['lead', 'rest', 'rest', 'rest'])
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact', item: 1 })
    expect(template).toMatch(/<li class="gl-mwv-step" data-gl-select-item>/)
    expect(template).not.toMatch(/data-gl-selection-target/)
  })

  it('cuatro escalones numerados que suben desde la base con las alturas del token', () => {
    const steps = plan(example()).slots.steps as Record<string, string>[]

    expect(steps.map(s => s.number)).toEqual(['01', '02', '03', '04'])
    expect(steps.map(s => s.left)).toEqual(['--gl-mwv-left=760px', '--gl-mwv-left=1020px', '--gl-mwv-left=1280px', '--gl-mwv-left=1540px'])
    expect(steps.map(s => s.height)).toEqual(['--gl-mwv-height=250px', '--gl-mwv-height=355px', '--gl-mwv-height=460px', '--gl-mwv-height=565px'])
    expect(steps.map(s => s.top)).toEqual(['--gl-mwv-top=600px', '--gl-mwv-top=495px', '--gl-mwv-top=390px', '--gl-mwv-top=285px'])
  })

  it('la trayectoria une las cimas y termina en la esfera; es la única órbita (sin plataforma)', () => {
    const { piece, slots } = plan(example())
    const svg = (piece.assets.find(asset => asset.ref === 'asset-ref:layer:method-waves-trajectory') as { svg: string }).svg

    expect(svg).toContain('d="M 879 570 L 1139 465 L 1399 360 L 1659 255"')
    expect(svg).toContain('<circle cx="1659" cy="255" r="11"')
    expect(slots.platform).toBeUndefined()
    expect(piece.assets.some(asset => /platform/.test(asset.ref))).toBe(false)
  })

  it('el ícono de la cima es opcional: sin él compone y la plantilla no lo pinta; con él es el oficial', () => {
    const bare = plan(example())

    expect(bare.slots.topMark).toBeUndefined()
    expect(bare.piece.assets.filter(asset => asset.kind === 'file')).toEqual([])
    expect(cssOf(ID)).toMatch(/\.gl-mwv-mark:empty\s*\{\s*display: none;/)

    const marked = plan({ ...example(), topMark: 'agentforce' } as Intent)
    const files = marked.piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(marked.violations).toEqual([])
    // 60 px centrado sobre la esfera (x 1659) y 92 px sobre su centro (y 255).
    expect(marked.slots.topMark).toMatchObject({ left: '--gl-mwv-mark-left=1629px', top: '--gl-mwv-mark-top=163px', size: '--gl-mwv-mark=60px' })
    expect(files.map(file => file.path)).toEqual(['src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-agentforce.svg'])
    expect(fs.existsSync(path.resolve(__dirname, '../../../..', files[0]!.path))).toBe(true)
    expectCode(() => plan({ ...example(), topMark: 'integracion' } as Intent), 'invalid-intent')
  })

  it('el escalón elegido va de 1 a 4 y toma los colores de papel del token', () => {
    const frame = plan({ ...example(), selectedStep: 3 } as Intent).slots.frame as Record<string, string>

    expect((plan({ ...example(), selectedStep: 3 } as Intent).slots.steps as Record<string, string>[]).map(s => s.role)).toEqual(['rest', 'rest', 'lead', 'rest'])
    expect(frame).toMatchObject({ titleSelected: '--gl-mwv-title-selected-color=#0b1f33', descColor: '--gl-mwv-desc-color=#e6edf3' })
    expectCode(() => plan({ ...example(), selectedStep: 0 } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), selectedStep: 5 } as Intent), 'invalid-intent')
  })

  it('un campo obligatorio ausente o una cuenta que no calza no compone', () => {
    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Por olas'] } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), steps: (example().steps as unknown[]).slice(0, 3) } as Intent), 'invalid-intent')
    // Los escalones van en `steps` (AXIS 0.3.34, delta (r)); la clave provisional `waves` ya no compone.
    const { steps: legacy, ...rest } = example()

    expectCode(() => plan({ ...rest, waves: legacy } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan(withStep(1, { kicker: ' ' })), 'invalid-intent')
    expectCode(() => plan(withStep(2, { desc: '' })), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const violated = (intent: Intent, slot: string) => plan(intent).violations.some(v => (v as { slot?: string }).slot === slot)

    expect(violated(withStep(0, { kicker: 'x'.repeat(23) }), 'steps')).toBe(true)
    expect(violated(withStep(1, { name: 'x'.repeat(32) }), 'steps')).toBe(true)
    expect(violated(withStep(3, { desc: 'x'.repeat(98) }), 'steps')).toBe(true)
  })

  it('todo color del plan sale de AXIS y la trayectoria toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes[ID]!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
