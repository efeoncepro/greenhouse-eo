/**
 * `content-service-lanes` (TASK-1942, deck Salesforce SF8): «¿Qué hacemos en Salesforce? Todo el ciclo.». El intent de
 * ejemplo compone la plantilla `ContentServiceLanes` con su contrato de slots limpio y SIN mascota (la plataforma queda
 * vacía); con la mascota del partner compone sólo con ruta local explícita y la referencia a la autorización escrita.
 * Lo que falta o se pasa de largo falla cerrado, los íconos de producto salen de `AXIS_PARTNER_ASSETS` y todo color del
 * plan sale de AXIS, con el escenario en el acento de la LÍNEA.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-content-service-lanes-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')
const MASCOT = 'ai-generations/2026-09-29_deck-salesforce/astro/agent-astro-v2-saluda-alpha.png'

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'content-service-lanes.slots.json'), 'utf8')) as TemplateContract
const template = fs.readFileSync(path.join(CATALOG, 'content-service-lanes.html'), 'utf8')

const withMascot = (mascot: Record<string, unknown> = {}): Intent =>
  ({ ...example(), mascot: { path: MASCOT, alt: 'Agent Astro saluda de pie sobre la plataforma de luz', authorizationRef: 'SF-AUT-PRUEBA', ...mascot } }) as Intent

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentServiceLanes' } as SlideSpec, contract)

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

describe('deck · content-service-lanes (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio, sin bajada, sin nota y sin selección', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-service-lanes')
    expect(violations).toEqual([])
    expect(slots.voice).toEqual({ eyebrow: 'Nuestros servicios Salesforce', question: '¿Qué hacemos en Salesforce?', answer: 'Todo el ciclo' })
    expect(slots.body).toBeUndefined()
    expect(slots.selection).toBeUndefined()
    expect((slots.lanes as unknown[]).length).toBe(6)
    expect(template).not.toContain('data-gl-selection-target')
    expect(template).not.toContain('gl-ls-note')
  })

  it('la voz es la propia de la lámina: pregunta en 170, respuesta de una línea a 124 px en 228', () => {
    const frame = plan(example()).slots.frame as Record<string, unknown>

    expect(frame).toMatchObject({ eyebrowTop: 110, questionTop: 170, answerTop: 228, answerPx: 124 })
    expect(frame.bodyTop).toBeUndefined()
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Todo', 'el ciclo'] } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), body: 'Una bajada que la lámina no lleva.' } as Intent), 'invalid-intent')
  })

  it('los carriles van en la rejilla 3 × 2 del token y las fases salen numeradas', () => {
    const { slots } = plan(example())
    const lanes = slots.lanes as Record<string, string>[]

    expect(lanes[0]).toMatchObject({ left: '--gl-csl-left=140px', top: '--gl-csl-top=380px' })
    expect(lanes[4]).toMatchObject({ left: '--gl-csl-left=562px', top: '--gl-csl-top=616px' })
    expect(slots.phases).toEqual([
      { number: '01', label: 'Diagnóstico y arquitectura' },
      { number: '02', label: 'Implementación e integración' },
      { number: '03', label: 'Activación y adopción' },
      { number: '04', label: 'Operación gestionada' }
    ])
  })

  it('los íconos de producto son archivos de AXIS_PARTNER_ASSETS, validados contra la lista cerrada', () => {
    const { piece } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual(
      ['sales', 'service', 'marketing', 'data-cloud', 'agentforce', 'platform'].map(name => `src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-${name}.svg`)
    )

    for (const file of files) expect(fs.existsSync(path.resolve(__dirname, '../../../..', file.path)), file.path).toBe(true)

    const lanes = example().lanes as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), lanes: lanes.map((l, i) => (i === 0 ? { ...l, icon: 'hubspot' } : l)) } as Intent), 'invalid-intent')
  })

  it('un campo obligatorio ausente o una cuenta equivocada no compone', () => {
    const lanes = example().lanes as Record<string, unknown>[]
    const phases = example().phases as string[]

    expectCode(() => plan({ ...example(), lanes: lanes.slice(0, 5) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), lanes: lanes.map((l, i) => (i === 2 ? { ...l, description: ' ' } : l)) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), phases: phases.slice(0, 3) } as Intent), 'invalid-intent')
  })

  it('las cuatro fases no pasan de 95 caracteres entre todas: la tira termina antes de la mascota', () => {
    const phases = example().phases as string[]

    expect(phases.join('').length).toBe(95)
    expectCode(() => plan({ ...example(), phases: [...phases.slice(0, 3), 'Operación gestionada y más'] } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const lanes = example().lanes as Record<string, unknown>[]

    expect(plan({ ...example(), lanes: lanes.map((l, i) => (i === 0 ? { ...l, description: 'x'.repeat(109) } : l)) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'lanes')).toBe(true)
    expect(plan({ ...example(), voice: { ...(example().voice as object), question: 'x'.repeat(58) } } as Intent).violations.some(v => (v as { slot?: string }).slot === 'voice')).toBe(true)
  })

  it('sin mascota compone y la plataforma queda vacía; con ella compone desde su ruta local', () => {
    const without = plan(example())

    expect(without.slots.mascot).toBeUndefined()
    expect(without.piece.assets.some(asset => asset.ref.includes('mascot'))).toBe(false)
    expect((contract.slots as Record<string, { required?: boolean }>).mascot?.required).toBe(false)
    expect(template).not.toContain('agent-astro')

    const withIt = plan(withMascot())

    expect(withIt.violations).toEqual([])
    expect(withIt.slots.mascot).toMatchObject({ alt: 'Agent Astro saluda de pie sobre la plataforma de luz', left: '--gl-csl-mascot-left=1450px', top: '--gl-csl-mascot-top=430px', width: '--gl-csl-mascot-width=320px' })
    expect(withIt.piece.assets.find(asset => asset.ref === (withIt.slots.mascot as { src: string }).src)).toEqual({ ref: 'asset-ref:file:mascot-agent-astro-v2-saluda-alpha', kind: 'file', path: MASCOT })
  })

  it('la mascota sin autorización, fuera de ruta local o copiada al catálogo falla cerrado', () => {
    expectCode(() => plan(withMascot({ authorizationRef: undefined })), 'invalid-intent')
    expectCode(() => plan(withMascot({ authorizationRef: '  ' })), 'invalid-intent')
    expectCode(() => plan(withMascot({ alt: undefined })), 'invalid-intent')
    expectCode(() => plan(withMascot({ path: '/tmp/astro.png' })), 'invalid-intent')
    expectCode(() => plan(withMascot({ path: '../astro.png' })), 'invalid-intent')
    expectCode(() => plan(withMascot({ path: 'src/lib/artifact-composer/catalogs/graphic-line-deck/assets/astro.png' })), 'invalid-intent')
    expectCode(() => plan(withMascot({ path: 'ai-generations/astro.jpg' })), 'invalid-intent')
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(withMascot())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['content-service-lanes']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
