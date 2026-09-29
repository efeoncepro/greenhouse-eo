/**
 * `method-migration-reconcile` (TASK-1942, deck Salesforce SF13): «¿Cómo sabes que migró todo? Porque cuadra.». El
 * intent de ejemplo compone la plantilla `MethodMigrationReconcile` con su contrato de slots limpio; lo que falta o se
 * pasa de largo falla cerrado; los números cuadran (origen − duplicados = carga completa = los dos lados de la
 * reconciliación) o la lámina no compone; la selección «Cliente» toma la reconciliación con ancla `bottom-start`; el
 * ícono de la plataforma sale de `AXIS_PARTNER_ASSETS` y todo color del plan sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-method-migration-reconcile-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>
type Stage = { label: string; value: string; description: string }

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'method-migration-reconcile.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'MethodMigrationReconcile' } as SlideSpec, contract)

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

const withStages = (values: string[], reconciliation?: string): Intent => {
  const intent = example()

  return {
    ...intent,
    stages: (intent.stages as Stage[]).map((stage, i) => ({ ...stage, value: values[i]! })),
    ...(reconciliation ? { reconciliation } : {})
  } as Intent
}

const G = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  slogan: { leadColor: { onDark: string } }
  lines: { key: string; accentOnDark: string }[]
  surfaces: { deck: { recipes: Record<string, Record<string, unknown>> } }
}

const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

describe('deck · method-migration-reconcile (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre la reconciliación', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.method-migration-reconcile')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Porque', answer: 'cuadra' })
    expect(slots.reconcile).toMatchObject({ step: '05', result: '46.368 = 46.368 · cuadra', badge: 'Rollback listo' })
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-start', participantKind: 'role', targetKind: 'object', padding: 'compact' })

    const template = fs.readFileSync(path.join(CATALOG, 'method-migration-reconcile.html'), 'utf8')

    expect(template.match(/data-gl-selection-target/g)).toHaveLength(1)
    expect(template).toMatch(/class="gl-ls-doc gl-mmr-rec" data-slot="reconcile" data-gl-selection-target/)
  })

  it('las etapas van numeradas 01–04 y bajan en escalera desde el token', () => {
    const stages = plan(example()).slots.stages as Record<string, string>[]

    expect(stages.map(stage => stage.label)).toEqual(['01 · Origen', '02 · Claves y duplicados', '03 · Carga de prueba', '04 · Carga completa'])
    expect(stages.map(stage => stage.left)).toEqual(['--gl-mmr-left=790px', '--gl-mmr-left=1040px', '--gl-mmr-left=1290px', '--gl-mmr-left=1540px'])
    expect(stages.map(stage => stage.top)).toEqual(['--gl-mmr-top=300px', '--gl-mmr-top=326px', '--gl-mmr-top=352px', '--gl-mmr-top=378px'])
  })

  it('los haces unen cada bloque con el siguiente, del borde derecho al izquierdo a la altura del token', () => {
    const svg = (plan(example()).piece.assets.find(asset => asset.ref === 'asset-ref:layer:method-migration-reconcile-beams') as { svg: string }).svg

    expect(svg.match(/<path /g)).toHaveLength(6)
    expect(svg).toContain('M 1012 440 Q 1031 440 1050 466')
  })

  it('los números cuadran: origen − duplicados = carga completa = los dos lados de la reconciliación', () => {
    expectCode(() => plan(withStages(['48.210', '1.842', '500', '46.000'])), 'invalid-intent')
    expectCode(() => plan({ ...example(), reconciliation: '46.368 = 46.300 · cuadra' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), reconciliation: '46.368 → 46.368' } as Intent), 'invalid-intent')
    expectCode(() => plan(withStages(['48210', '1.842', '500', '46.368'])), 'invalid-intent')
    expect(plan(withStages(['12.000', '400', '100', '11.600'], '11.600 = 11.600 · cuadra')).violations).toEqual([])
  })

  it('el ícono de la reconciliación es el de la plataforma, archivo de AXIS_PARTNER_ASSETS', () => {
    const files = plan(example()).piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual(['src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-platform.svg'])
    expect(fs.existsSync(path.resolve(__dirname, '../../../..', files[0]!.path))).toBe(true)
  })

  it('un campo obligatorio ausente o una cuenta que no calza no compone', () => {
    const stages = example().stages as Stage[]

    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), rollbackBadge: '' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), reconciliation: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Porque cuadra'] } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), stages: stages.slice(0, 3) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), stages: stages.map((s, i) => (i === 2 ? { ...s, description: ' ' } : s)) } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const violated = (intent: Intent, slot: string) => plan(intent).violations.some(v => (v as { slot?: string }).slot === slot)
    const stages = example().stages as Stage[]

    // 43 con el número: «01 · » + 38 caracteres = 43 pasa; uno más, no.
    expect(violated({ ...example(), stages: stages.map((s, i) => (i === 0 ? { ...s, label: 'x'.repeat(38) } : s)) } as Intent, 'stages')).toBe(false)
    expect(violated({ ...example(), stages: stages.map((s, i) => (i === 0 ? { ...s, label: 'x'.repeat(39) } : s)) } as Intent, 'stages')).toBe(true)
    expect(violated({ ...example(), stages: stages.map((s, i) => (i === 2 ? { ...s, description: 'x'.repeat(48) } : s)) } as Intent, 'stages')).toBe(true)
    expect(violated({ ...example(), rollbackBadge: 'x'.repeat(19) } as Intent, 'reconcile')).toBe(true)
    expect(violated({ ...example(), note: 'x'.repeat(116) } as Intent, 'note')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['method-migration-reconcile']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
