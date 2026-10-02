/**
 * `method-identity-consent` (TASK-1942, deck Salesforce SF12): «¿Puedes contactar a ese cliente? Con permiso.». El
 * intent de ejemplo compone la plantilla `MethodIdentityConsent` con su contrato de slots limpio y la selección
 * «Cliente» sobre el perfil unificado. Las reglas de la receta se cierran en el builder: al menos un canal sin permiso,
 * ninguna activación por un canal sin permiso y el número de fuentes del perfil que cuadra; lo que falta o se pasa de
 * largo falla cerrado, los íconos salen de `AXIS_PARTNER_ASSETS` y todo color sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-method-identity-consent-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const template = fs.readFileSync(path.join(CATALOG, 'method-identity-consent.html'), 'utf8')
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'method-identity-consent.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'MethodIdentityConsent' } as SlideSpec, contract)

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

describe('deck · method-identity-consent (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre el perfil', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.method-identity-consent')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Con', answer: 'permiso' })
    expect(slots.note).toBe('Ejemplo ilustrativo · el diseño sale de tu inventario de datos')
    expect(slots.profile).toMatchObject({ kicker: 'Perfil unificado', title: 'Una persona, 5 fuentes' })
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact' })
    expect(template.match(/data-gl-selection-target/g)).toHaveLength(1)
    expect(template).toMatch(/<section class="[^"]*gl-mic-profile"[^>]*data-gl-selection-target/)
  })

  it('las fuentes bajan por su paso, cada canal marca su permiso y la primera activación va en papel', () => {
    const { slots } = plan(example())

    expect((slots.sources as Record<string, string>[]).map(source => source.top)).toEqual([250, 360, 470, 580, 690].map(y => `--gl-mic-source-top=${y}px`))
    expect((slots.sources as Record<string, string>[])[0]).toMatchObject({ kicker: 'Fuente', name: 'CRM' })
    expect((slots.channels as Record<string, string>[]).map(c => [c.state, c.mark])).toEqual([['yes', '✓'], ['yes', '✓'], ['no', '—'], ['yes', '✓']])
    expect((slots.activations as Record<string, string>[]).map(a => a.role)).toEqual(['lead', 'rest', 'rest'])
    expect((slots.activations as Record<string, string>[]).map(a => a.top)).toEqual([250, 400, 710].map(y => `--gl-mic-act-top=${y}px`))
  })

  it('al menos un canal va sin permiso', () => {
    const channels = example().channels as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), channels: channels.map(c => ({ ...c, permitted: true })) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), channels: channels.map((c, i) => (i === 2 ? { ...c, permitted: 'no' } : c)) } as Intent), 'invalid-intent')
  })

  it('ninguna activación sale de un canal sin permiso: ni lo declara ni lo nombra', () => {
    const activations = example().activations as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), activations: activations.map((a, i) => (i === 0 ? { ...a, channel: 'SMS' } : a)) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), activations: activations.map((a, i) => (i === 0 ? { ...a, channel: 'Fax' } : a)) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), activations: activations.map((a, i) => (i === 1 ? { title: 'Recordatorio', detail: 'Por SMS', icon: 'service' } : a)) } as Intent), 'invalid-intent')

    // El canal es opcional: sin él, la regla se comprueba por lo que la activación nombra.
    expect(plan({ ...example(), activations: activations.map(a => ({ ...a, channel: undefined })) } as Intent).violations).toEqual([])
  })

  it('el número de fuentes del perfil coincide con las fuentes de la lámina', () => {
    expectCode(() => plan({ ...example(), profileTitle: 'Una persona, 6 fuentes' } as Intent), 'invalid-intent')
    expect(plan({ ...example(), profileTitle: 'Una sola persona' } as Intent).violations).toEqual([])
  })

  it('los íconos de producto son archivos de AXIS_PARTNER_ASSETS: el de datos en el perfil y el de cada activación', () => {
    const { piece } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual(
      ['data-cloud', 'marketing', 'agentforce', 'sales'].map(name => `src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-${name}.svg`)
    )

    for (const file of files) expect(fs.existsSync(path.resolve(__dirname, '../../../..', file.path)), file.path).toBe(true)

    const activations = example().activations as Record<string, unknown>[]

    expectCode(() => plan({ ...example(), activations: activations.map((a, i) => (i === 0 ? { ...a, icon: 'mulesoft' } : a)) } as Intent), 'invalid-intent')
  })

  it('un campo obligatorio ausente no compone', () => {
    const sources = example().sources as string[]
    const channels = example().channels as unknown[]

    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), sources: sources.slice(0, 4) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), channels: channels.slice(0, 3) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), profileTitle: ' ' } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const sources = example().sources as string[]
    const channels = example().channels as Record<string, unknown>[]

    expect(plan({ ...example(), sources: sources.map((s, i) => (i === 0 ? 'x'.repeat(13) : s)) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'sources')).toBe(true)
    expect(plan({ ...example(), channels: channels.map((c, i) => (i === 0 ? { ...c, purpose: 'x'.repeat(19) } : c)) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'channels')).toBe(true)
    expect(plan({ ...example(), note: 'x'.repeat(116) } as Intent).violations.some(v => (v as { slot?: string }).slot === 'note')).toBe(true)
    expect(plan({ ...example(), profileTitle: 'Una persona y sus fuentes' } as Intent).violations.some(v => (v as { slot?: string }).slot === 'profile')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['method-identity-consent']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })

  it('el aire de la cabecera, el peso de la marca y los colores de las activaciones salen de AXIS (delta q)', () => {
    const frame = plan(example()).slots.frame as Record<string, string>

    expect(frame).toMatchObject({
      profileHeaderGap: '--gl-mic-profile-header-gap=10px',
      consentGlyphWeight: '--gl-mic-consent-glyph-wght=700',
      actTitleLead: '--gl-mic-act-title-lead-color=#0b1f33',
      actTitleRest: '--gl-mic-act-title-rest-color=#ffffff',
      actDescLead: '--gl-mic-act-desc-lead-color=#5f6b7a',
      actDescRest: `--gl-mic-act-desc-rest-color=${G.slogan.leadColor.onDark.toLowerCase()}`
    })
  })
})
