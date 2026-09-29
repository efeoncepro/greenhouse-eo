/**
 * `content-day-live-approval` (TASK-1942, deck Salesforce SF18): «¿Dónde apruebas al agente? Donde trabajas.». El intent
 * de ejemplo compone la plantilla `ContentDayLiveApproval` con su contrato de slots limpio y la selección «Supervisora»
 * sobre «Aprobar»; los botones van separados por el `gapPx` del token; el canal es Slack (ícono oficial) o Teams
 * (isotipo del catálogo); los avatares de producto son opcionales; los montos van siempre como «[MONTO]»; la nota marca
 * el ejemplo ilustrativo; lo ejecutado dice que quedó registrado quién aprobó; lo que falta o se pasa de largo falla
 * cerrado y todo color sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const ID = 'content-day-live-approval'
const EXAMPLE = path.join(__dirname, '..', 'examples', `deck-${ID}-intent.json`)
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

/** El bloque de CSS de la receta en `graphic-line.css`: desde el ancla anterior hasta la suya. */
const cssSectionOf = (css: string, id: string): string => {
  const end = css.indexOf(`ancla TASK-1942 · ${id} `)

  if (end < 0) throw new Error(`graphic-line.css no trae el ancla de ${id}`)

  const start = css.lastIndexOf('── ancla ', end - 4)

  return css.slice(start + 1, end)
}

const styles = cssSectionOf(fs.readFileSync(path.join(CATALOG, 'graphic-line.css'), 'utf8'), ID)

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, `${ID}.slots.json`), 'utf8')) as TemplateContract
const template = fs.readFileSync(path.join(CATALOG, `${ID}.html`), 'utf8')

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentDayLiveApproval' } as SlideSpec, contract)

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
const patch = (key: string, value: Record<string, unknown>): Intent => ({ ...example(), [key]: { ...(example()[key] as Record<string, unknown>), ...value } }) as Intent
const filesOf = (piece: ReturnType<typeof plan>['piece']) => (piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]).map(file => file.path)

const without = (intent: Record<string, unknown>, key: string): Record<string, unknown> => {
  const copy = { ...intent }

  delete copy[key]

  return copy
}

describe('deck · content-day-live-approval (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Supervisora» sobre «Aprobar»', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-day-live-approval')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Donde', answer: 'trabajas' })
    expect(slots.actions).toEqual({ primary: 'Aprobar', secondary: 'Editar', tertiary: 'Rechazar' })
    expect(slots.message).toBe('Caso <strong>#4821</strong>: el cliente pide reembolso de <strong>[MONTO]</strong>. Según la política 3.2 corresponde aprobarlo.')
    expect(slots.selection).toMatchObject({ label: 'Supervisora', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact' })

    // Un solo objetivo de selección: el primer botón.
    expect(template.match(/data-gl-selection-target/g)).toHaveLength(1)
    expect(template).toMatch(/data-slot-field="primary" data-gl-selection-target/)
  })

  it('los botones van separados por el gapPx del token, para que la selección no pise el segundo', () => {
    const recipe = G.surfaces.deck.recipes[ID] as { message: { actions: { gapPx: number } } }

    expect(recipe.message.actions.gapPx).toBe(26)
    expect((plan(example()).slots.frame as Record<string, unknown>).actionsGap).toBe('--gl-cla-actions-gap=26px')
  })

  it('el paso de la persona sale de `currentLoopStep` y los pasos se numeran', () => {
    expect((plan(example()).slots.loop as Record<string, string>[]).map(step => [step.number, step.state])).toEqual([
      ['01', 'todo'],
      ['02', 'now'],
      ['03', 'todo'],
      ['04', 'todo']
    ])

    for (const bad of [0, 5, '2', undefined]) expectCode(() => plan({ ...example(), currentLoopStep: bad } as Intent), 'invalid-intent')
  })

  it('el canal es Slack (ícono oficial) o Teams (isotipo del catálogo); nunca otro', () => {
    expect(filesOf(plan(example()).piece)[0]).toBe('src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-slack.svg')
    expect(filesOf(plan(patch('channel', { tool: 'teams' })).piece)[0]).toBe('src/lib/artifact-composer/catalogs/deck-axis/assets/tools/teams-isotype.svg')
    expectCode(() => plan(patch('channel', { tool: 'notion' })), 'invalid-intent')
    expectCode(() => plan(patch('channel', { name: ' ' })), 'invalid-intent')
  })

  it('los avatares de producto son opcionales: sin ellos compone y no se pintan; con ellos, archivos de AXIS', () => {
    const bare = plan({ ...example(), agent: without(example().agent as Record<string, unknown>, 'icon'), executed: without(example().executed as Record<string, unknown>, 'icon') } as Intent)

    expect(bare.violations).toEqual([])
    expect(bare.slots).not.toHaveProperty('agentIcon')
    expect(bare.slots).not.toHaveProperty('executedIcon')
    expect(filesOf(bare.piece)).toHaveLength(1)

    const full = plan(example())

    expect(full.slots.agentIcon).toEqual({ src: 'asset-ref:file:salesforce-icon-agentforce' })
    expect(full.slots.executedIcon).toEqual({ src: 'asset-ref:file:salesforce-icon-service' })

    for (const file of filesOf(full.piece)) expect(fs.existsSync(path.resolve(__dirname, '../../../..', file)), file).toBe(true)

    expectCode(() => plan(patch('agent', { icon: 'hubspot' })), 'invalid-intent')
    expectCode(() => plan(patch('executed', { icon: 'public/images/logos/partners/salesforce.com_logo.svg' })), 'invalid-intent')
  })

  it('prices-as-placeholder, nota ilustrativa y registro de quién aprobó', () => {
    expectCode(() => plan({ ...example(), message: 'Caso **#4821**: el cliente pide reembolso de **$ 120.000**.' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), message: 'Reembolso de **120 USD** según la política 3.2.' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: 'La política y los límites se definen con tu equipo' } as Intent), 'invalid-intent')
    expectCode(() => plan(without(example(), 'note') as Intent), 'invalid-intent')
    expectCode(() => plan(patch('executed', { text: 'Reembolso aplicado y cliente notificado.' })), 'invalid-intent')
  })

  it('un campo obligatorio ausente no compone', () => {
    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), evidenceChips: ['Historial del cliente'] } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), actions: ['Aprobar', 'Rechazar'] } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), actions: ['Aprobar', ' ', 'Rechazar'] } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), loop: (example().loop as unknown[]).slice(0, 3) } as Intent), 'invalid-intent')
    expectCode(() => plan(patch('agent', { badge: ' ' })), 'invalid-intent')
    expectCode(() => plan(patch('executed', { title: ' ' })), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Aquí'] } } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const over = (intent: Intent, slot: string) => expect(plan(intent).violations.some(v => (v as { slot?: string }).slot === slot), slot).toBe(true)

    over({ ...example(), note: `Ejemplo ilustrativo · ${'x'.repeat(100)}` } as Intent, 'note')
    over(patch('channel', { name: 'x'.repeat(70) }), 'channel')
    over(patch('agent', { badge: 'x'.repeat(17) }), 'agent')
    over({ ...example(), message: `Caso ${'x'.repeat(145)}` } as Intent, 'message')
    over({ ...example(), evidenceChips: ['x'.repeat(42), 'Política 3.2'] } as Intent, 'chips')
    over({ ...example(), actions: ['x'.repeat(15), 'Editar', 'Rechazar'] } as Intent, 'actions')
    over(patch('executed', { title: 'x'.repeat(40) }), 'executed')
    over({ ...example(), loop: (example().loop as Record<string, unknown>[]).map((s, i) => (i === 0 ? { ...s, detail: 'x'.repeat(25) } : s)) } as Intent, 'loop')
    over({ ...example(), body: 'x'.repeat(180) } as Intent, 'body')
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(G.surfaces.deck.recipes[ID]), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
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
