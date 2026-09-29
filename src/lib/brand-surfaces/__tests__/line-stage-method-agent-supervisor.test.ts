/**
 * `method-agent-supervisor` (TASK-1942, deck Salesforce SF2): «¿Quién responde por el agente? Una persona.». El intent de
 * ejemplo compone la plantilla `MethodAgentSupervisor` con su contrato de slots limpio; lo que falta o se pasa de largo
 * falla cerrado; toda ficha dice qué NO hace el agente solo; la propuesta que espera aprobación vive sólo en el primer
 * agente y es el objeto de la selección «Supervisora»; el ícono de Agentforce sale de `AXIS_PARTNER_ASSETS` y todo color
 * del plan sale de AXIS, con el escenario en el acento de la LÍNEA de la pieza.
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

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-method-agent-supervisor-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>
type Agent = { title: string; job: string; levels: { kind: string; value: string; state: string }[] }

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'method-agent-supervisor.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'MethodAgentSupervisor' } as SlideSpec, contract)

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

const withAgent = (i: number, patch: (agent: Agent) => Agent): Intent => {
  const intent = example()

  return { ...intent, agents: (intent.agents as Agent[]).map((agent, j) => (j === i ? patch(agent) : agent)) } as Intent
}

const G = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  slogan: { leadColor: { onDark: string } }
  lines: { key: string; accentOnDark: string }[]
  surfaces: { deck: { recipes: Record<string, Record<string, unknown>> } }
}

const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

describe('deck · method-agent-supervisor (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Supervisora» sobre la propuesta', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.method-agent-supervisor')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Una', answer: 'persona' })
    expect(slots.note).toBe('Ejemplo ilustrativo · cada ficha se define con tu equipo')
    expect(slots.supervisor).toEqual({ initials: 'SV', kicker: 'Persona responsable', role: 'Supervisora de servicio', duty: 'Aprueba, corrige y detiene' })
    expect(slots.selection).toMatchObject({ label: 'Supervisora', anchor: 'bottom-end', participantKind: 'role', targetKind: 'object', padding: 'compact' })
  })

  it('la propuesta que espera aprobación vive sólo en el primer agente; en los demás la plantilla no pinta la fila', () => {
    const agents = plan(example()).slots.agents as Record<string, unknown>[]

    expect(agents[0]!.pending).toBe('Respuesta propuesta al caso #4821')
    expect(agents.slice(1).every(agent => !('pending' in agent))).toBe(true)

    const template = fs.readFileSync(path.join(CATALOG, 'method-agent-supervisor.html'), 'utf8')
    const styles = cssSectionOf(fs.readFileSync(path.join(CATALOG, 'graphic-line.css'), 'utf8'), 'method-agent-supervisor')

    expect(template.match(/data-gl-selection-target/g)).toHaveLength(1)
    expect(template).toMatch(/class="gl-mas-approval" data-gl-selection-target>\s*<span class="gl-mas-pending" data-slot-field="pending"/)
    expect(styles).toMatch(/\.gl-mas-approval:not\(:has\(\.gl-mas-pending\)\)\s*\{\s*display: none;/)
  })

  it('la escena se corre con `sceneOffsetXPx`; cada ficha trae su posición, su giro y su orden de pintura del token', () => {
    const { slots } = plan(example())
    const agents = slots.agents as Record<string, string>[]

    // [1175, 470, −6] en el token, corrido −100 px; el primero se pinta encima (paintOrder [1, 2, 0]).
    expect(agents[0]).toMatchObject({ left: '--gl-mas-left=1075px', top: '--gl-mas-top=470px', rotate: '--gl-mas-rotate=-6deg', depth: '--gl-mas-depth=2' })
    expect(agents[1]).toMatchObject({ depth: '--gl-mas-depth=0' })
    expect((slots.frame as Record<string, unknown>).supLeft).toBe('--gl-mas-sup-left=1005px')
  })

  it('cada fila de autonomía pinta su estado y su clave sale del vocabulario de AXIS', () => {
    const agents = plan(example()).slots.agents as { levels: { state: string; kind: string }[] }[]

    expect(agents[1]!.levels.map(level => level.state)).toEqual(['yes', 'yes', 'half', 'no'])
    expectCode(() => plan(withAgent(0, a => ({ ...a, levels: a.levels.map((l, j) => (j === 0 ? { ...l, kind: 'Decide' } : l)) }))), 'invalid-intent')
    expectCode(() => plan(withAgent(0, a => ({ ...a, levels: a.levels.map((l, j) => (j === 0 ? { ...l, state: 'yes' } : l)) }))), 'invalid-intent')
  })

  it('el ícono de Agentforce es el archivo de AXIS_PARTNER_ASSETS, uno para las tres fichas', () => {
    const { piece, slots } = plan(example())
    const files = piece.assets.filter(asset => asset.kind === 'file') as { path: string; ref: string }[]

    expect(files.map(file => file.path)).toEqual(['src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-agentforce.svg'])
    expect(fs.existsSync(path.resolve(__dirname, '../../../..', files[0]!.path))).toBe(true)
    expect((slots.agents as { icon: string }[]).every(agent => agent.icon === files[0]!.ref)).toBe(true)
  })

  it('un agente sin supervisión no se dibuja: toda ficha lleva al menos una fila en «no»', () => {
    expectCode(() => plan(withAgent(2, a => ({ ...a, levels: a.levels.map(l => ({ ...l, state: 'y' })) }))), 'invalid-intent')
  })

  it('los montos van como [MONTO]: una cifra de dinero en una ficha o en la propuesta no compone', () => {
    expectCode(() => plan(withAgent(1, a => ({ ...a, levels: a.levels.map((l, j) => (j === 3 ? { ...l, value: 'Cambiar $1.200' } : l)) }))), 'invalid-intent')
    expectCode(() => plan({ ...example(), pendingApproval: 'Descuento de 500 USD al caso' } as Intent), 'invalid-intent')
    expect(plan(withAgent(1, a => ({ ...a, levels: a.levels.map((l, j) => (j === 3 ? { ...l, value: 'Cambiar [MONTO]' } : l)) }))).violations).toEqual([])
  })

  it('un campo obligatorio ausente o una cuenta que no calza no compone', () => {
    const agents = example().agents as Agent[]

    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), note: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), pendingApproval: ' ' } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Una persona'] } } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), agents: agents.slice(0, 2) } as Intent), 'invalid-intent')
    expectCode(() => plan({ ...example(), supervisor: { ...(example().supervisor as object), role: '' } } as Intent), 'invalid-intent')
    expectCode(() => plan(withAgent(2, a => ({ ...a, levels: a.levels.slice(0, 2) }))), 'invalid-intent')
    expectCode(() => plan(withAgent(0, a => ({ ...a, levels: [...a.levels, a.levels[0]!] }))), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const violated = (intent: Intent, slot: string) => plan(intent).violations.some(v => (v as { slot?: string }).slot === slot)

    expect(violated(withAgent(0, a => ({ ...a, title: 'x'.repeat(19) })), 'agents')).toBe(true)
    expect(violated({ ...example(), pendingApproval: 'x'.repeat(48) } as Intent, 'agents')).toBe(true)
    expect(violated({ ...example(), supervisor: { ...(example().supervisor as object), role: 'x'.repeat(42) } } as Intent, 'supervisor')).toBe(true)
    expect(violated({ ...example(), note: 'x'.repeat(116) } as Intent, 'note')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['method-agent-supervisor']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })
})
