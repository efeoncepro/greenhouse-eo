/**
 * `method-agent-supervisor` (deck Salesforce, SF2, TASK-1942): «¿Quién responde por el agente? Una persona.». La persona
 * responsable, por su ROL, arriba en vidrio con el avatar anillado en el acento; tres agentes en papel, a distinta
 * profundidad sobre la plataforma, cada uno con el ícono oficial de Agentforce y su ficha de autonomía (qué lee, qué
 * propone, qué ejecuta, quién aprueba o qué nunca hace). La propuesta del primer agente espera la aprobación: la
 * selección «Supervisora» toma esa fila con su botón «Aprobar».
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['method-agent-supervisor']`): la voz, el
 * escenario, la plataforma, los haces, la persona, las fichas y la fila de aprobación. `sceneOffsetXPx` corre la escena
 * entera (plataforma, haces, persona y fichas; no el halo). El CONTENIDO llega en el intent: `supervisor` (`kicker`,
 * `role`, `initials`, `duty`), `agents` (tres: `title`, `job` y tres o cuatro `levels` con `kind`, `value` y `state`
 * y | h | n), `pendingApproval` (la propuesta del primer agente) y la `note` obligatoria.
 */

import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured } from '../kit'

import {
  beamsSvg,
  documentVars,
  exactly,
  glassVars,
  lineColor,
  lineVoiceFrame,
  lumVars,
  noteVars,
  productIcon,
  req,
  stageLayers,
  uniqueAssets,
  type FrostedGlass,
  type LineBeam,
  type LineDocument, cssFine } from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; gapBottomPx?: number; lineHeight?: number; color?: string; widthPx?: number }
type Ring = { px: number; color: string; opacity?: number }

type SupervisorTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number]
  radiusPx: number
  gapPx: number
  glass: FrostedGlass
  avatar: { px: number; fill: { color: string; opacity: number }; ring: Ring; glow: { blurPx: number; color: string; opacity: number }; initials: Text }
  kicker: Text
  name: Text
  duty: Text
}

type AgentTokens = {
  count: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  perspectivePx: number
  positions: [number, number, number][]
  paintOrder: number[]
  document: LineDocument
  icon: { px: number; gapPx: number }
  kicker: Text
  title: Text
  job: Text
  autonomy: {
    levels: string[]
    row: { paddingYPx: number; gapPx: number; rule: string }
    dot: { px: number; full: string; half: { ring: Ring; fill: string }; empty: { ring: Ring } }
    key: Text
    value: Text
    maxRows: number
  }
  approval: {
    gapTopPx: number
    padding: [number, number]
    radiusPx: number
    fill: string
    border: Ring
    text: Text
    button: { padding: [number, number]; radiusPx: number; fill: string; color: string; px: number; weight: number }
  }
}

type SupervisorIntent = { kicker?: unknown; role?: unknown; initials?: unknown; duty?: unknown }
type LevelIntent = { kind?: unknown; value?: unknown; state?: unknown }
type AgentIntent = { title?: unknown; job?: unknown; levels?: unknown }

/** El estado de una fila de autonomía: sí (punto lleno), acotado (medio) o no (vacío). */
const STATES: Record<string, 'yes' | 'half' | 'no'> = { y: 'yes', h: 'half', n: 'no' }

/** Las filas de autonomía de una ficha: la mínima dice lee, propone y ejecuta. */
const MIN_ROWS = 3

/** Un monto escrito en cifra: el ejemplo aprobado nunca lo lleva, va como `[MONTO]`. */
const AMOUNT = /[$€£]\s*\d|\d[\d.,]*\s*(?:CLP|USD|UF|MXN|COP|PEN|EUR)\b/i

const tracking = (value: string | undefined, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

const noAmount = (value: string, what: string): string => {
  if (AMOUNT.test(value)) throw new SurfacePieceError(`${what}: los montos van como [MONTO]; el agente nunca cambia montos en el ejemplo.`, 'invalid-intent')

  return value
}

export const methodAgentSupervisor: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const supervisor = measured(recipe.supervisor as SupervisorTokens | undefined, 'la persona responsable')
  const agents = measured(recipe.agents as AgentTokens | undefined, 'los agentes')
  const beamTokens = measured(recipe.beams as { from: [number, number]; to: [number, number][]; bendPx: number } | undefined, 'los haces de la persona')
  const beam = measured(recipe.beam as LineBeam | undefined, 'el haz de luz')
  const dx = measured(recipe.sceneOffsetXPx as number | undefined, 'el corrimiento de la escena')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = agents.document
  const autonomy = agents.autonomy
  const approval = agents.approval

  if (!voice.answerLead) throw new SurfacePieceError('La respuesta va en dos líneas (`voice.answer` con dos tramos).', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const note = req(content.note, 'La nota de ejemplo (`note`): las fichas se definen con el equipo del cliente, y')
  const s = (intent.supervisor ?? {}) as SupervisorIntent
  const list = exactly<AgentIntent>(intent.agents, agents.count, 'Los agentes (`agents`)')
  const pending = noAmount(req(intent.pendingApproval, 'La propuesta que espera aprobación (`pendingApproval`)'), 'La propuesta (`pendingApproval`)')
  const icon = productIcon('agentforce', 'El ícono de los agentes')

  const cards = list.map((agent, i) => {
    const where = `el agente ${i + 1} (\`agents[${i}]\`)`
    const levels = Array.isArray(agent.levels) ? (agent.levels as LevelIntent[]) : []

    if (levels.length < MIN_ROWS || levels.length > autonomy.maxRows) {
      throw new SurfacePieceError(`La ficha de ${where} lleva de ${MIN_ROWS} a ${autonomy.maxRows} filas (\`levels\`).`, 'invalid-intent')
    }

    const rows = levels.map((level, j) => {
      const at = `la fila ${j + 1} de ${where}`
      const kind = req(level.kind, `La clave de ${at} (\`kind\`)`)
      const state = STATES[String(level.state)]

      if (!autonomy.levels.includes(kind.toLowerCase())) {
        throw new SurfacePieceError(`La clave de ${at} es una de ${autonomy.levels.join(' · ')}.`, 'invalid-intent')
      }

      if (!state) throw new SurfacePieceError(`El estado de ${at} (\`state\`) es y (sí), h (acotado) o n (no).`, 'invalid-intent')

      return { state, kind, value: noAmount(req(level.value, `El valor de ${at} (\`value\`)`), `El valor de ${at}`) }
    })

    // Un agente sin supervisión no se dibuja: toda ficha dice al menos una cosa que el agente NO hace solo.
    if (!rows.some(row => row.state === 'no')) {
      throw new SurfacePieceError(`La ficha de ${where} dice quién aprueba o qué nunca hace: al menos una fila en n (no).`, 'invalid-intent')
    }

    const [x, y, rotate] = measured(agents.positions[i], `la posición del agente ${i + 1}`)
    const depth = agents.paintOrder.indexOf(i)

    if (depth < 0) throw new SurfacePieceError(`AXIS no midió el orden de pintura del agente ${i + 1}.`, 'invalid-intent')

    return {
      left: css('mas-left', x + dx),
      top: css('mas-top', y),
      rotate: css('mas-rotate', rotate, 'deg'),
      depth: css('mas-depth', depth, ''),
      icon: icon.ref,
      title: noAmount(req(agent.title, `El nombre de ${where} (\`title\`)`), `El nombre de ${where}`),
      job: noAmount(req(agent.job, `El trabajo de ${where} (\`job\`)`), `El trabajo de ${where}`),
      levels: rows,
      // La propuesta que espera aprobación vive sólo en el primer agente: en los demás el renderer quita el campo.
      ...(i === 0 ? { pending } : {})
    }
  })

  const { stage, platform } = stageLayers(manifest, recipe, line, 'mas', { dx })

  const beams = layerAsset(
    'method-agent-supervisor-beams',
    beamsSvg(
      manifest,
      beamTokens.to.map(to => ({ from: beamTokens.from, to, bend: beamTokens.bendPx })),
      beam,
      line,
      'mas',
      dx
    )
  )

  const k = autonomy.key
  const v = autonomy.value
  const color = (value: string | undefined, what: string) => lineColor(measured(value, `el color de ${what}`), line, what, doc)

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...glassVars(supervisor.glass, line),
    ...documentVars(doc, line),
    // La persona responsable
    supLeft: css('mas-sup-left', supervisor.xPx + dx),
    supTop: css('mas-sup-top', supervisor.yPx),
    supWidth: css('mas-sup-width', supervisor.widthPx),
    supPadY: css('mas-sup-pad-y', supervisor.padding[0]),
    supPadX: css('mas-sup-pad-x', supervisor.padding[1]),
    supRadius: css('mas-sup-radius', supervisor.radiusPx),
    supGap: css('mas-sup-gap', supervisor.gapPx),
    avatarSize: css('mas-avatar', supervisor.avatar.px),
    avatarFill: colorVar('mas-avatar', lineColor(supervisor.avatar.fill.color, line, 'el avatar')),
    avatarFillOpacity: css('mas-avatar-opacity', supervisor.avatar.fill.opacity * 100, '%'),
    avatarRing: css('mas-avatar-ring', supervisor.avatar.ring.px),
    avatarRingColor: colorVar('mas-avatar-ring', lineColor(supervisor.avatar.ring.color, line, 'el anillo del avatar')),
    avatarGlowBlur: css('mas-avatar-glow', supervisor.avatar.glow.blurPx),
    avatarGlowColor: colorVar('mas-avatar-glow', lineColor(supervisor.avatar.glow.color, line, 'el brillo del avatar')),
    avatarGlowOpacity: css('mas-avatar-glow-opacity', supervisor.avatar.glow.opacity * 100, '%'),
    initialsPx: css('mas-initials-px', supervisor.avatar.initials.px),
    initialsColor: colorVar('mas-initials', lineColor(measured(supervisor.avatar.initials.color, 'el color de las iniciales'), line, 'las iniciales')),
    supKickerPx: css('mas-sup-kicker-px', supervisor.kicker.px),
    supKickerWeight: css('mas-sup-kicker-wght', measured(supervisor.kicker.weight, 'el peso del rótulo de la persona'), ''),
    supKickerTracking: cssFine('mas-sup-kicker-tracking', tracking(supervisor.kicker.tracking, 'el rótulo de la persona')),
    supKickerColor: colorVar('mas-sup-kicker', lineColor(measured(supervisor.kicker.color, 'el color del rótulo'), line, 'el rótulo de la persona')),
    supRolePx: css('mas-sup-role-px', supervisor.name.px),
    supRoleTracking: cssFine('mas-sup-role-tracking', tracking(supervisor.name.tracking, 'el rol')),
    supRoleGap: css('mas-sup-role-gap', measured(supervisor.name.gapPx, 'el aire del rol')),
    supRoleColor: colorVar('mas-sup-role', lineColor(measured(supervisor.name.color, 'el color del rol'), line, 'el rol')),
    supDutyPx: css('mas-sup-duty-px', supervisor.duty.px),
    supDutyWeight: css('mas-sup-duty-wght', measured(supervisor.duty.weight, 'el peso de la tarea'), ''),
    supDutyGap: css('mas-sup-duty-gap', measured(supervisor.duty.gapPx, 'el aire de la tarea')),
    supDutyColor: colorVar('mas-sup-duty', lineColor(measured(supervisor.duty.color, 'el color de la tarea'), line, 'la tarea')),
    // Las fichas de los agentes
    cardWidth: css('mas-card-width', agents.widthPx),
    cardPadTop: css('mas-card-pad-top', agents.padding[0]),
    cardPadX: css('mas-card-pad-x', agents.padding[1]),
    cardPadBottom: css('mas-card-pad-bottom', agents.padding[2]),
    cardRadius: css('mas-card-radius', agents.radiusPx),
    cardPerspective: css('mas-card-perspective', agents.perspectivePx),
    iconSize: css('mas-icon', agents.icon.px),
    iconGap: css('mas-icon-gap', agents.icon.gapPx),
    kickerPx: css('mas-kicker-px', agents.kicker.px),
    kickerWeight: css('mas-kicker-wght', measured(agents.kicker.weight, 'el peso del rótulo del agente'), ''),
    kickerTracking: cssFine('mas-kicker-tracking', tracking(agents.kicker.tracking, 'el rótulo del agente')),
    kickerColor: colorVar('mas-kicker', color(agents.kicker.color, 'el rótulo del agente')),
    titlePx: css('mas-title-px', agents.title.px),
    titleTracking: cssFine('mas-title-tracking', tracking(agents.title.tracking, 'el nombre del agente')),
    titleGap: css('mas-title-gap', measured(agents.title.gapPx, 'el aire del nombre del agente')),
    jobPx: css('mas-job-px', agents.job.px),
    jobWeight: css('mas-job-wght', measured(agents.job.weight, 'el peso del trabajo'), ''),
    jobLeading: css('mas-job-leading', measured(agents.job.lineHeight, 'el interlineado del trabajo'), ''),
    jobGap: css('mas-job-gap', measured(agents.job.gapBottomPx, 'el aire bajo el trabajo')),
    jobColor: colorVar('mas-job', color(agents.job.color, 'el trabajo')),
    // La ficha de autonomía
    rowPadY: css('mas-row-pad-y', autonomy.row.paddingYPx),
    rowGap: css('mas-row-gap', autonomy.row.gapPx),
    rowRule: colorVar('mas-row-rule', lineColor(autonomy.row.rule, line, 'el filete de la fila', doc)),
    dotSize: css('mas-dot', autonomy.dot.px),
    dotFull: colorVar('mas-dot-full', lineColor(autonomy.dot.full, line, 'el punto lleno', doc)),
    dotHalfRing: css('mas-dot-half-ring', autonomy.dot.half.ring.px),
    dotHalfColor: colorVar('mas-dot-half', lineColor(autonomy.dot.half.ring.color, line, 'el punto acotado', doc)),
    dotEmptyRing: css('mas-dot-empty-ring', autonomy.dot.empty.ring.px),
    dotEmptyColor: colorVar('mas-dot-empty', lineColor(autonomy.dot.empty.ring.color, line, 'el punto vacío', doc)),
    keyPx: css('mas-key-px', k.px),
    keyWeight: css('mas-key-wght', measured(k.weight, 'el peso de la clave'), ''),
    keyTracking: cssFine('mas-key-tracking', tracking(k.tracking, 'la clave')),
    keyWidth: css('mas-key-width', measured(k.widthPx, 'el ancho de la clave')),
    keyColor: colorVar('mas-key', color(k.color, 'la clave')),
    valuePx: css('mas-value-px', v.px),
    valueWeight: css('mas-value-wght', measured(v.weight, 'el peso del valor'), ''),
    valueLeading: css('mas-value-leading', measured(v.lineHeight, 'el interlineado del valor'), ''),
    valueColor: colorVar('mas-value', color(v.color, 'el valor')),
    // La propuesta que espera aprobación (el objeto de la selección)
    approvalGap: css('mas-approval-gap', approval.gapTopPx),
    approvalPadY: css('mas-approval-pad-y', approval.padding[0]),
    approvalPadX: css('mas-approval-pad-x', approval.padding[1]),
    approvalRadius: css('mas-approval-radius', approval.radiusPx),
    approvalFill: colorVar('mas-approval', lineColor(approval.fill, line, 'la fila de aprobación', doc)),
    approvalBorder: css('mas-approval-border', approval.border.px),
    approvalBorderColor: colorVar('mas-approval-border', lineColor(approval.border.color, line, 'el filo de la fila de aprobación', doc)),
    approvalPx: css('mas-approval-px', approval.text.px),
    approvalWeight: css('mas-approval-wght', measured(approval.text.weight, 'el peso de la propuesta'), ''),
    approvalLeading: css('mas-approval-leading', measured(approval.text.lineHeight, 'el interlineado de la propuesta'), ''),
    buttonPadY: css('mas-button-pad-y', approval.button.padding[0]),
    buttonPadX: css('mas-button-pad-x', approval.button.padding[1]),
    buttonRadius: css('mas-button-radius', approval.button.radiusPx),
    buttonFill: colorVar('mas-button', lineColor(approval.button.fill, line, 'el botón', doc)),
    buttonColor: colorVar('mas-button-ink', lineColor(approval.button.color, line, 'el texto del botón', doc)),
    buttonPx: css('mas-button-px', approval.button.px),
    buttonWeight: css('mas-button-wght', approval.button.weight, '')
  }

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.method-agent-supervisor',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beams: { src: beams.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      supervisor: {
        initials: req(s.initials, 'Las iniciales del rol (`supervisor.initials`)'),
        kicker: req(s.kicker, 'El rótulo de la persona (`supervisor.kicker`)'),
        role: req(s.role, 'El rol de la persona (`supervisor.role`)'),
        duty: req(s.duty, 'Lo que hace la persona (`supervisor.duty`)')
      },
      agents: cards,
      // El contrato de la propuesta (largo y obligatoriedad de la receta): la pinta el primer agente (`agents[0].pending`).
      approval: { text: pending },
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, beams.asset, icon.asset])
  }
}
