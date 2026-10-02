/**
 * `content-live-chat` (TASK-1942, deck Salesforce SF16): «¿Y si le preguntas a tu CRM? Te responde.». El intent de ejemplo
 * compone la plantilla `ContentLiveChat` con su contrato de slots limpio y la selección «Ejecutivo» sobre la acción
 * gobernada con «Confirmar»; los montos son siempre `[MONTO]` y a lo sumo un registro va «En riesgo»; la nota marca el
 * ejemplo ilustrativo; las marcas de terceros (logotipo del asistente, wordmark Claudeforce) son OPCIONALES, van fuera
 * del ejemplo y fallan cerradas sin su `authorizationRef`; lo que falta o se pasa de largo falla cerrado y todo color
 * sale de AXIS.
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

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-content-live-chat-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'content-live-chat.slots.json'), 'utf8')) as TemplateContract
const template = fs.readFileSync(path.join(CATALOG, 'content-live-chat.html'), 'utf8')
const styles = cssSectionOf(fs.readFileSync(path.join(CATALOG, 'graphic-line.css'), 'utf8'), 'content-live-chat')

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentLiveChat' } as SlideSpec, contract)

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
const chat = (patch: Record<string, unknown>): Intent => ({ ...example(), chat: { ...(example().chat as Record<string, unknown>), ...patch } }) as Intent
const records = () => (example().chat as { records: Record<string, unknown>[] }).records
const filesOf = (piece: ReturnType<typeof plan>['piece']) => (piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]).map(file => file.path)

const AUTH = { authorizationRef: 'autorizacion-escrita-2026-10.pdf' }

describe('deck · content-live-chat (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Ejecutivo» sobre la acción gobernada', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-live-chat')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ eyebrow: 'Claudeforce · Enablement conversacional', answerLead: 'Te', answer: 'responde' })
    expect(slots.action).toEqual({ text: 'Propongo agendar reunión y crear tarea para el ejecutivo en Salesforce', button: 'Confirmar' })
    expect(slots.intro).toBe('Tienes <strong>3 oportunidades</strong> con cierre este mes. <strong>Andes Retail</strong> lleva 21 días sin actividad:')
    expect(slots.selection).toMatchObject({ label: 'Ejecutivo', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact' })

    // Un solo objetivo de selección: la fila de la acción con «Confirmar».
    expect(template.match(/data-gl-selection-target/g)).toHaveLength(1)
    expect(template).toMatch(/data-slot="action" data-gl-selection-target/)
  })

  it('prices-as-placeholder: los montos son siempre [MONTO] y a lo sumo un registro va «En riesgo»', () => {
    expect(plan(example()).slots.records).toEqual([
      { name: 'Andes Retail', stage: 'Propuesta', amount: '[MONTO]', risk: 'En riesgo' },
      { name: 'Grupo Norte', stage: 'Negociación', amount: '[MONTO]' },
      { name: 'Clínica Sur', stage: 'Cierre', amount: '[MONTO]' }
    ])

    // Sin monto en el intent, el builder pone el marcador; un monto real no compone.
    const bare = plan(chat({ records: records().map(r => ({ name: r.name, stage: r.stage })) }))

    expect(bare.violations).toEqual([])
    expect((bare.slots.records as { amount: string; risk?: string }[]).every(r => r.amount === '[MONTO]' && r.risk === undefined)).toBe(true)
    expectCode(() => plan(chat({ records: records().map((r, i) => (i === 1 ? { ...r, amount: '$ 12.000.000' } : r)) })), 'invalid-intent')
    expectCode(() => plan(chat({ records: records().map((r, i) => (i === 1 ? { ...r, atRisk: true } : r)) })), 'invalid-intent')
    expectCode(() => plan(chat({ records: records().map((r, i) => (i === 1 ? { ...r, atRisk: 'sí' } : r)) })), 'invalid-intent')
  })

  it('la nota es obligatoria y marca el ejemplo ilustrativo', () => {
    expectCode(() => plan({ ...example(), note: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: 'Salesforce en Claude · beta abierta desde sep. 2026' } as Intent), 'invalid-intent')
  })

  it('las marcas de terceros son opcionales: sin ellas compone y la plantilla no las pinta', () => {
    const { slots, piece } = plan(example())

    expect(slots).not.toHaveProperty('assistantMark')
    expect(slots).not.toHaveProperty('platformMark')
    expect(filesOf(piece)).toEqual(['public/images/logos/partners/salesforce.com_logo.svg'])
  })

  it('con su autorización, el logotipo del asistente y el wordmark Claudeforce componen', () => {
    const { slots, piece, violations } = plan({ ...example(), assistantMark: AUTH, platformMark: AUTH } as Intent)

    expect(violations).toEqual([])
    expect(slots.assistantMark).toEqual({ src: 'asset-ref:file:claude-logotype' })
    expect(slots.platformMark).toEqual({ src: 'asset-ref:file:claudeforce-wordmark' })
    expect(filesOf(piece)).toEqual([
      'public/images/logos/partners/salesforce.com_logo.svg',
      'public/images/logos/partners/claude-logotype.svg',
      'src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/claudeforce-wordmark.svg'
    ])

    for (const file of filesOf(piece)) expect(fs.existsSync(path.resolve(__dirname, '../../../..', file)), file).toBe(true)
  })

  it('third-party-mark-authorization: una marca sin su autorización no compone', () => {
    for (const key of ['assistantMark', 'platformMark']) {
      expectCode(() => plan({ ...example(), [key]: {} } as Intent), 'invalid-intent')
      expectCode(() => plan({ ...example(), [key]: { authorizationRef: ' ' } } as Intent), 'invalid-intent')
      expectCode(() => plan({ ...example(), [key]: null } as Intent), 'invalid-intent')
    }
  })

  it('un campo obligatorio ausente no compone', () => {
    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan(chat({ records: records().slice(0, 2) })), 'invalid-intent')
    expectCode(() => plan({ ...example(), guarantees: (example().guarantees as unknown[]).slice(0, 2) } as Intent), 'invalid-intent')

    for (const key of ['connectionLabel', 'userPrompt', 'answerIntro', 'proposedAction']) expectCode(() => plan(chat({ [key]: ' ' })), 'invalid-intent')

    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Responde'] } } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const over = (intent: Intent, slot: string) => expect(plan(intent).violations.some(v => (v as { slot?: string }).slot === slot), slot).toBe(true)

    over({ ...example(), note: `${'x'.repeat(100)} · ejemplo ilustrativo` } as Intent, 'note')
    over(chat({ userPrompt: 'x'.repeat(128) }), 'prompt')
    over(chat({ answerIntro: 'x'.repeat(178) }), 'intro')
    over(chat({ connectionLabel: 'x'.repeat(31) }), 'connection')
    over(chat({ proposedAction: 'x'.repeat(140) }), 'action')
    over(chat({ records: records().map((r, i) => (i === 0 ? { ...r, name: 'x'.repeat(26) } : r)) }), 'records')
    over({ ...example(), guarantees: (example().guarantees as Record<string, unknown>[]).map((g, i) => (i === 0 ? { ...g, detail: 'x'.repeat(58) } : g)) } as Intent, 'guarantees')
    over({ ...example(), body: 'x'.repeat(180) } as Intent, 'body')
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan({ ...example(), assistantMark: AUTH, platformMark: AUTH } as Intent)
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipes = G.surfaces.deck.recipes
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipes['content-live-chat']), ...hexesIn(recipes['content-one-platform']), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
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
