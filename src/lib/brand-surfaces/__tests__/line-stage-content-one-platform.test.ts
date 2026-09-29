/**
 * `content-one-platform` (TASK-1942, deck Salesforce SF1): «¿Cuántos Salesforce tienes? Uno.». El intent de ejemplo
 * compone la plantilla `ContentOnePlatform` con su contrato de slots limpio; lo que falta o se pasa de largo falla
 * cerrado; los íconos de producto salen de `AXIS_PARTNER_ASSETS` (nunca de una ruta local) y todo color del plan sale de
 * AXIS, con el escenario en el acento de la LÍNEA de la pieza.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-content-one-platform-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'content-one-platform.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentOnePlatform' } as SlideSpec, contract)

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

describe('deck · content-one-platform (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre la cuenta', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-one-platform')
    expect(violations).toEqual([])
    expect(slots.account).toEqual({ initials: 'TC', name: 'Tu cliente', subtitle: 'Una sola cuenta, todos los equipos' })
    expect((slots.workAreas as unknown[]).length).toBe(5)
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact' })
  })

  it('la escena se corre con `sceneOffsetXPx` y cada ficha trae su posición y su giro del token', () => {
    const areas = plan(example()).slots.workAreas as Record<string, string>[]

    // [880, 250, −10] en el token, corrido −120 px.
    expect(areas[0]).toMatchObject({ left: '--gl-opl-left=760px', top: '--gl-opl-top=250px', rotate: '--gl-opl-rotate=-10deg' })
    expect((plan(example()).slots.frame as Record<string, unknown>).accountLeft).toBe('--gl-opl-account-left=1010px')
  })

  it('los íconos de producto son archivos de AXIS_PARTNER_ASSETS, validados contra la lista cerrada', () => {
    const { piece } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual(
      ['sales', 'service', 'marketing', 'data-cloud', 'agentforce'].map(name => `src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-${name}.svg`)
    )

    for (const file of files) expect(fs.existsSync(path.resolve(__dirname, '../../../..', file.path)), file.path).toBe(true)

    const areas = example().workAreas as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), workAreas: areas.map((a, i) => (i === 0 ? { ...a, icon: 'hubspot' } : a)) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), workAreas: areas.map((a, i) => (i === 0 ? { ...a, icon: 'public/images/logos/partners/salesforce.com_logo.svg' } : a)) } as Intent), 'invalid-intent')
  })

  it('un campo obligatorio ausente no compone', () => {
    const areas = example().workAreas as unknown[]
    const account = example().account as Record<string, unknown>

    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), workAreas: areas.slice(0, 4) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), account: { ...account, name: ' ' } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), account: { ...account, facts: (account.facts as unknown[]).slice(0, 3) } } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const areas = example().workAreas as Record<string, unknown>[]

    expect(plan({ ...example(), workAreas: areas.map((a, i) => (i === 0 ? { ...a, area: 'x'.repeat(13) } : a)) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'workAreas')).toBe(true)
    expect(plan({ ...example(), body: 'x'.repeat(180) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'body')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['content-one-platform']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
