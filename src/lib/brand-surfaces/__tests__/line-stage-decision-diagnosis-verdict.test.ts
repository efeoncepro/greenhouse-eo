/**
 * `decision-diagnosis-verdict` (TASK-1942, deck Salesforce SF5): «¿Qué recibes primero? Una decisión.». El intent de
 * ejemplo compone la plantilla `DecisionDiagnosisVerdict` con su contrato de slots limpio; el informe trae cinco módulos
 * numerados y cada uno sólo su cuerpo; el veredicto es uno de tres con su condición; la píldora de muestra es opcional
 * (en sus dos caras); lo que falta o se pasa de largo falla cerrado; la selección «Cliente» toma las olas y todo color del
 * plan sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const ID = 'decision-diagnosis-verdict'
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
type Module = Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, `${ID}.slots.json`), 'utf8')) as TemplateContract
const template = fs.readFileSync(path.join(CATALOG, `${ID}.html`), 'utf8')

/** Los cinco módulos del plan, en su orden fijo (cada uno es su propio slot). */
const MODULE_SLOTS = ['moduleState', 'moduleVerdict', 'moduleRisks', 'moduleRecord', 'moduleRoadmap']
const modulesOf = (slots: Record<string, unknown>): Module[] => MODULE_SLOTS.map(name => slots[name] as Module)

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'DecisionDiagnosisVerdict' } as SlideSpec, contract)

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

describe('deck · decision-diagnosis-verdict (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre las olas', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.decision-diagnosis-verdict')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Una', answer: 'decisión' })
    expect(slots.report).toMatchObject({ title: 'Diagnóstico de valor y arquitectura', subtitle: 'Salesforce · estado actual, encaje y roadmap' })
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact' })
    expect(template.match(/data-gl-selection-target/g)).toHaveLength(1)
    expect(template).toMatch(/data-slot-field="waves" data-gl-selection-target/)
  })

  it('cinco módulos numerados; cada uno es su slot con su cuerpo y el roadmap ocupa las dos columnas', () => {
    const modules = modulesOf(plan(example()).slots)

    expect(modules.map(m => m.kicker)).toEqual(['01 · Estado actual', '02 · Veredicto', '03 · Riesgos', '04 · Evidencia', '05 · Roadmap'])
    expect(modules.map(m => m.span)).toEqual(['--gl-ddv-span=1', '--gl-ddv-span=1', '--gl-ddv-span=1', '--gl-ddv-span=1', '--gl-ddv-span=2'])
    expect(modules.map(m => Object.keys(m).slice(3))).toEqual([['nodes', 'footnote'], ['options', 'condition'], ['risks'], ['record'], ['waves']])

    // Un rótulo que ya trae su número no se numera dos veces.
    const numbered = { ...example(), modules: (example().modules as Module[]).map((m, i) => (i === 0 ? { ...m, kicker: '01 · Estado actual' } : m)) } as Intent

    expect(modulesOf(plan(numbered).slots)[0]!.kicker).toBe('01 · Estado actual')
  })

  it('el veredicto es uno de tres: la elegida en tinta y más ancha, las otras en la caja angosta', () => {
    const options = modulesOf(plan(example()).slots)[1]!.options as { role: string; text: string }[]

    expect(options).toEqual([
      { role: 'rest', text: 'Fit' },
      { role: 'lead', text: 'Fit condicionado' },
      { role: 'rest', text: 'No fit' }
    ])
    expectCode(() => plan({ ...example(), selectedVerdict: 1 } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), selectedVerdict: 4 } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), verdictOptions: ['Fit', 'Fit condicionado'] } as Intent), 'invalid-intent')
  })

  it('la píldora de muestra es opcional: sin ella compone y la plantilla no la pinta', () => {
    const { violations, slots } = plan({ ...example(), sampleMark: undefined } as unknown as Intent)

    expect(violations).toEqual([])
    expect(slots.sampleMark).toBeUndefined()
    expect(plan(example()).slots.sampleMark).toBe('Datos de muestra')
    expect(cssOf(ID)).toMatch(/\.gl-ddv-mark:empty\s*\{\s*display: none;/)
  })

  it('el ícono del informe es Trazo de AXIS y el triángulo de alerta lleva el color y el trazo del token', () => {
    const { piece } = plan(example())
    const alert = piece.assets.find(asset => asset.ref === 'asset-ref:icon:warning-triangle-15') as { svg: string }

    expect(piece.assets.filter(asset => asset.kind === 'file')).toEqual([])
    expect(piece.assets.map(asset => asset.ref)).toContain('asset-ref:icon:informe-revenue-salesforce-dark-24')
    expect(alert.svg).toContain('stroke="#b4261a"')
    expect(alert.svg).toContain('stroke-width="1.4"')
  })

  it('un campo obligatorio ausente o una cuenta que no calza no compone', () => {
    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), recordText: ' ' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), verdictCondition: '' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), reportTitle: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Una decisión'] } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), modules: (example().modules as unknown[]).slice(0, 4) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), operationNodes: (example().operationNodes as unknown[]).slice(0, 5) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), risks: (example().risks as unknown[]).slice(0, 2) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), waves: (example().waves as unknown[]).slice(0, 2) } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const violated = (intent: Intent, slot: string) => plan(intent).violations.some(v => (v as { slot?: string }).slot === slot)

    expectCode(() => plan({ ...example(), verdictOptions: ['Fit completo ya', 'Fit condicionado', 'No fit'] } as Intent), 'invalid-intent')
    expect(violated({ ...example(), reportTitle: 'x'.repeat(53) } as Intent, 'report')).toBe(true)
    expect(violated({ ...example(), sampleMark: 'x'.repeat(17) } as Intent, 'sampleMark')).toBe(true)
    expect(violated({ ...example(), recordText: 'x'.repeat(158) } as Intent, 'moduleRecord')).toBe(true)
    expect(violated({ ...example(), operationNodes: ['x'.repeat(12), 'b', 'c', 'd', 'e', 'f'] } as Intent, 'moduleState')).toBe(true)
    expect(violated({ ...example(), waves: (example().waves as Module[]).map((w, i) => (i === 0 ? { ...w, title: 'x'.repeat(66) } : w)) } as Intent, 'moduleRoadmap')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes[ID]!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    // El ícono Trazo lo pinta `resolveIcon` de AXIS: sus colores no son del plan.
    const layers = piece.assets.filter(asset => !asset.ref.startsWith('asset-ref:icon:informe')).flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
