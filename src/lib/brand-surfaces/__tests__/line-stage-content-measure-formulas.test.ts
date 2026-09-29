/**
 * `content-measure-formulas` (TASK-1942, deck Salesforce SF17): «¿Cómo sabes que funciona? Lo medimos.». El intent de
 * ejemplo compone la plantilla `ContentMeasureFormulas` con su contrato de slots limpio y sin selección: cinco métricas
 * con ícono Trazo de AXIS (no de producto), fórmula, fuente y dueño, sin cifras. Lo que falta, un glifo que AXIS no
 * tiene, una cifra o un texto que se pasa de largo falla cerrado, y todo color del plan sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-content-measure-formulas-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const template = fs.readFileSync(path.join(CATALOG, 'content-measure-formulas.html'), 'utf8')
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'content-measure-formulas.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentMeasureFormulas' } as SlideSpec, contract)

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

describe('deck · content-measure-formulas (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio, con nota y sin selección', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-measure-formulas')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Lo', answer: 'medimos' })
    expect(slots.note).toBe('Sin cifras de promesa: la línea base se mide en el diagnóstico')
    expect(slots.selection).toBeUndefined()
    expect(template).not.toContain('data-gl-selection-target')
  })

  it('tres fichas arriba y dos abajo, corridas medio paso; fuente y dueño con su rótulo del token', () => {
    const metrics = plan(example()).slots.metrics as Record<string, string>[]

    expect(metrics.map(m => [m.left, m.top])).toEqual([
      ['--gl-cmf-left=760px', '--gl-cmf-top=190px'],
      ['--gl-cmf-left=1110px', '--gl-cmf-top=190px'],
      ['--gl-cmf-left=1460px', '--gl-cmf-top=190px'],
      ['--gl-cmf-left=935px', '--gl-cmf-top=480px'],
      ['--gl-cmf-left=1285px', '--gl-cmf-top=480px']
    ])
    expect(metrics[0]).toMatchObject({ sourceLabel: 'Fuente', source: 'Salesforce', ownerLabel: 'Dueño', owner: 'Líder del área' })
  })

  it('los íconos son glifos Trazo de AXIS en reposo, nunca íconos de producto', () => {
    const { piece, slots } = plan(example())
    const metrics = example().metrics as Record<string, unknown>[]

    expect((slots.metrics as Record<string, string>[]).map(m => m.icon)).toEqual(
      ['medicion', 'reloj', 'checklist', 'base-de-datos', 'ia'].map(glyph => `asset-ref:icon:${glyph}-revenue-salesforce-dark-52`)
    )
    expect(piece.assets.some(asset => asset.kind === 'file')).toBe(false)
    expectCode(() => plan({ ...example(), metrics: metrics.map((m, i) => (i === 0 ? { ...m, glyph: 'salesforce-icon-sales' } : m)) } as Intent), 'invalid-intent')
  })

  it('sin cifras: una meta o un resultado en el nombre o la fórmula no compone', () => {
    const metrics = example().metrics as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), metrics: metrics.map((m, i) => (i === 0 ? { ...m, formula: 'Usuarios activos ÷ licencias ≥ 80 %' } : m)) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), metrics: metrics.map((m, i) => (i === 1 ? { ...m, name: 'Valor en 30 días' } : m)) } as Intent), 'invalid-intent')
    // El nombre de un producto con número en la fuente sí compone (Data 360).
    expect((plan(example()).slots.metrics as Record<string, string>[])[3]!.source).toBe('Data 360 · informes')
  })

  it('un campo obligatorio ausente no compone', () => {
    const metrics = example().metrics as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), metrics: metrics.slice(0, 4) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), metrics: metrics.map((m, i) => (i === 4 ? { ...m, owner: ' ' } : m)) } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const metrics = example().metrics as Record<string, unknown>[]

    expect(plan({ ...example(), metrics: metrics.map((m, i) => (i === 0 ? { ...m, formula: 'x'.repeat(59) } : m)) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'metrics')).toBe(true)
    expect(plan({ ...example(), note: 'x'.repeat(116) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'note')).toBe(true)
    expect(plan({ ...example(), voice: { ...(example().voice as object), answer: ['Lo', 'medimossiempre'] } } as Intent).violations.some(v => (v as { slot?: string }).slot === 'voice')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['content-measure-formulas']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.filter(asset => asset.ref.startsWith('asset-ref:layer:')).flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
