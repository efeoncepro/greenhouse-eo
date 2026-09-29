/**
 * `decision-provider-fit` (TASK-1942, deck Salesforce SF4): «¿Salesforce o HubSpot? El que encaje.». El intent de
 * ejemplo compone la plantilla `DecisionProviderFit` con su contrato de slots limpio; lo que falta o se pasa de largo
 * falla cerrado; los íconos son Trazo de AXIS (`resolveIcon`), nunca logos de proveedores; el halo y el haz vertical se
 * centran en el monolito encendido; la selección «Cliente» lo toma por ítem y todo color del plan sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-decision-provider-fit-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>
type Verdict = { glyph: string; title: string; description: string }

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'decision-provider-fit.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'DecisionProviderFit' } as SlideSpec, contract)

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

const withVerdict = (i: number, patch: Partial<Verdict>): Intent => {
  const intent = example()

  return { ...intent, verdicts: (intent.verdicts as Verdict[]).map((v, j) => (j === i ? { ...v, ...patch } : v)) } as Intent
}

const layerSvg = (piece: ReturnType<typeof plan>['piece'], id: string): string =>
  ((piece.assets.find(asset => asset.ref === `asset-ref:layer:${id}`) as { svg?: string } | undefined)?.svg ?? '')

const G = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  slogan: { leadColor: { onDark: string } }
  lines: { key: string; accentOnDark: string }[]
  surfaces: { deck: { recipes: Record<string, Record<string, unknown>> } }
}

const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

describe('deck · decision-provider-fit (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre el veredicto encendido', () => {
    const { piece, violations, slots } = plan(example())
    const verdicts = slots.verdicts as Record<string, string>[]

    expect(piece.contentType).toBe('deck.decision-provider-fit')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'El que', answer: 'encaje' })
    expect(verdicts.map(v => v.role)).toEqual(['rest', 'rest', 'lead', 'rest'])
    expect(verdicts.every(v => v.kicker === 'Veredicto')).toBe(true)
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact', item: 3 })

    const template = fs.readFileSync(path.join(CATALOG, 'decision-provider-fit.html'), 'utf8')

    expect(template).toMatch(/<li class="gl-dpf-mono" data-gl-select-item>/)
    expect(template).not.toMatch(/data-gl-selection-target/)
  })

  it('el pie «Tu caso · con evidencia» vive sólo en el encendido; en los demás el campo no llega', () => {
    const verdicts = plan(example()).slots.verdicts as Record<string, string>[]

    expect(verdicts[2]!.footer).toBe('Tu caso · con evidencia')
    expect(verdicts.filter((_, i) => i !== 2).every(v => !('footer' in v))).toBe(true)
  })

  it('alturas escalonadas del token: 360/390 en reposo y 470 el encendido, todos parados en la base', () => {
    const verdicts = plan(example()).slots.verdicts as Record<string, string>[]

    expect(verdicts.map(v => v.height)).toEqual(['--gl-dpf-height=360px', '--gl-dpf-height=390px', '--gl-dpf-height=470px', '--gl-dpf-height=390px'])
    expect(verdicts.map(v => v.left)).toEqual(['--gl-dpf-left=700px', '--gl-dpf-left=976px', '--gl-dpf-left=1252px', '--gl-dpf-left=1528px'])
    expect(verdicts[2]!.top).toBe('--gl-dpf-top=380px')
  })

  it('el halo y el haz vertical se centran en el monolito encendido y lo siguen', () => {
    const lit = plan(example()).piece

    // Tercero encendido: 700 + 2 × (250 + 26) + 125 = 1377.
    expect(layerSvg(lit, 'dpf-stage')).toContain('cx="1377"')
    expect(layerSvg(lit, 'decision-provider-fit-shaft')).toContain('M 1337 0 L 1417 0 L 1567 850 L 1187 850 Z')

    const first = plan({ ...example(), selectedVerdict: 1 } as Intent).piece

    expect(layerSvg(first, 'dpf-stage')).toContain('cx="825"')
    expect(layerSvg(first, 'decision-provider-fit-shaft')).toContain('M 785 0 ')
  })

  it('los íconos son Trazo de AXIS, nunca un logo de proveedor ni un archivo', () => {
    const { piece } = plan(example())

    expect(piece.assets.filter(asset => asset.kind === 'file')).toEqual([])
    expect(piece.assets.filter(asset => asset.ref.startsWith('asset-ref:icon:')).map(asset => asset.ref)).toEqual([
      'asset-ref:icon:crm-revenue-salesforce-dark-30',
      'asset-ref:icon:embudo-revenue-salesforce-dark-30',
      'asset-ref:icon:integracion-revenue-salesforce-dark-30',
      'asset-ref:icon:checklist-revenue-salesforce-dark-30'
    ])
    expectCode(() => plan(withVerdict(0, { glyph: 'salesforce' })), 'invalid-intent')
    expectCode(() => plan(withVerdict(1, { glyph: 'public/images/logos/partners/hubspot.svg' })), 'invalid-intent')
  })

  it('el veredicto encendido va de 1 a 4', () => {
    expectCode(() => plan({ ...example(), selectedVerdict: 0 } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), selectedVerdict: 5 } as Intent), 'invalid-intent')
  })

  it('un campo obligatorio ausente o una cuenta que no calza no compone', () => {
    const verdicts = example().verdicts as Verdict[]

    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['El que encaje'] } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), verdicts: verdicts.slice(0, 3) } as Intent), 'invalid-intent')
    expectCode(() => plan(withVerdict(3, { description: '' })), 'invalid-intent')
    expectCode(() => plan(withVerdict(3, { title: ' ' })), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const violated = (intent: Intent, slot: string) => plan(intent).violations.some(v => (v as { slot?: string }).slot === slot)

    expect(violated(withVerdict(0, { title: 'x'.repeat(12) }), 'verdicts')).toBe(true)
    expect(violated(withVerdict(0, { description: 'x'.repeat(95) }), 'verdicts')).toBe(true)
    expect(violated({ ...example(), note: 'x'.repeat(116) } as Intent, 'note')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['decision-provider-fit']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    // Los íconos Trazo los pinta `resolveIcon` de AXIS: sus colores no son del plan.
    const layers = piece.assets.filter(asset => asset.ref.startsWith('asset-ref:layer:')).flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
