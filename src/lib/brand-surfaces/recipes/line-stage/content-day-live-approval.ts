/**
 * `content-day-live-approval` (deck Salesforce, SF18, TASK-1942): «¿Dónde apruebas al agente? Donde trabajas.». El
 * «vívelo» de method-agent-supervisor: el mensaje del agente en el canal del equipo (Slack o Teams), en papel y en
 * perspectiva, con su propuesta, dos fichas de evidencia y tres botones; la selección «Supervisora» toma «Aprobar».
 * A la derecha, en vidrio, lo ejecutado y registrado; debajo, el ciclo propone → apruebas → ejecuta → queda registrado,
 * con el paso de la persona en papel. Arriba a la derecha, la nota.
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-day-live-approval']`). Los botones
 * van separados por `actions.gapPx` (26 px) para que la selección no pise el segundo. El CONTENIDO llega en el intent:
 * `channel` (`tool`: `slack` —ícono oficial de Salesforce— o `teams` —isotipo del catálogo—, y `name`), `agent`
 * (`icon` opcional —ícono oficial del producto—, `name`, `badge`), `message` (con `**negrita**`, montos siempre
 * `[MONTO]`), `evidenceChips` (dos), `actions` (tres), `executed` (`icon` opcional, `title`, `text`), `loop` (cuatro:
 * `title`, `detail`), `currentLoopStep` (1–4) y `note` (con «ejemplo ilustrativo»).
 */

import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, measured } from '../kit'

import { toolIsotype, twoLineAnswer } from './content-day-release-cycle'
import { richHtml } from './content-live-chat'
import {
  documentVars,
  exactly,
  glassVars,
  indexIn,
  lineColor,
  lineVoiceFrame,
  lumVars,
  noteVars,
  productIcon,
  req,
  stageLayers,
  uniqueAssets,
  type FrostedGlass,
  type LineDocument
} from './kit'

type Text = { px: number; weight?: number; lineHeight?: number; gapPx?: number; gapTopPx?: number; color?: string; currentColor?: string; family?: string }

type Ring = { px: number; color: string }

type MessageTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number]
  radiusPx: number
  document: LineDocument
  perspectivePx: number
  rotateYDeg: number
  origin: string
  channel: { iconPx: number; gapPx: number; px: number; weight: number; paddingBottomPx: number; rule: string; options: string[] }
  agent: {
    gapTopPx: number
    gapPx: number
    icon: { px: number }
    name: Text
    badge: { padding: [number, number]; radiusPx: number; fill: string; px: number; weight: number; color: string; gapPx: number }
  }
  text: Text
  chips: { count: number; gapPx: number; gapTopPx: number; padding: [number, number]; radiusPx: number; fill: string; border: Ring; px: number; weight: number; color: string }
  actions: {
    count: number
    gapPx: number
    gapTopPx: number
    padding: [number, number]
    radiusPx: number
    px: number
    weight: number
    primary: { fill: string; color: string }
    secondary: { ring: Ring; color: string }
    tertiary: { ring: Ring; color: string }
  }
}

type ExecutedTokens = { xPx: number; yPx: number; widthPx: number; padding: [number, number]; radiusPx: number; glass: FrostedGlass; icon: { px: number; gapPx: number }; title: Text; text: Text }

type LoopTokens = {
  count: number
  xPx: number
  yPx: number
  widthPx: number
  gapPx: number
  padding: [number, number]
  radiusPx: number
  glass: FrostedGlass
  current: { fill: string }
  number: Text & { numbered: boolean }
  title: Text
  detail: Text
}

type ChannelIntent = { tool?: unknown; name?: unknown }
type AgentIntent = { icon?: unknown; name?: unknown; badge?: unknown }
type ExecutedIntent = { icon?: unknown; title?: unknown; text?: unknown }
type LoopIntent = { title?: unknown; detail?: unknown }

/** `prices-as-placeholder`: un monto va siempre como «[MONTO]», nunca con moneda. */
const CURRENCY = /[$€£]|\b(?:USD|CLP|MXN|COP|PEN|EUR|UF)\b/


/**
 * El color del número del bucle. AXIS 0.3.33 lo mide a 15 px «en el acento», pero su propia regla transversal
 * `accent-text-min-size` dice que el acento nunca colorea texto de menos de 24 px y que ahí el texto va «en blanco o
 * suave sobre oscuro». La regla manda sobre el token (el gate de La órbita la exige sobre la lámina renderizada): bajo
 * 24 px el acento cae a `soft`. Defecto reportado a AXIS: `loop.number.color` debe dejar de ser `accent`.
 */
const numberColor = (number: { px: number; color?: string }): string => {
  const value = measured(number.color, 'el color del número')

  return number.px < 24 && value === 'accent' ? 'soft' : value
}

export const contentDayLiveApproval: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const message = measured(recipe.message as MessageTokens | undefined, 'el mensaje del canal')
  const executed = measured(recipe.executed as ExecutedTokens | undefined, 'lo ejecutado')
  const loop = measured(recipe.loop as LoopTokens | undefined, 'el ciclo')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const { channel, agent, text, chips, actions } = message
  const doc = measured(message.document, 'el documento del mensaje')
  const color = (value: string, what: string) => lineColor(value, line, what, doc)

  twoLineAnswer(voice, 'la supervisión en vivo')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')
  if (message.origin !== 'start') throw new SurfacePieceError('AXIS abre el mensaje desde su borde inicial (`origin: start`).', 'surface-issues')

  // `illustrative-data-marked`: la nota es obligatoria y dice «ejemplo ilustrativo».
  const note = req(content.note ?? intent.note, 'La nota de la lámina (`note`: «ejemplo ilustrativo» y la política con el equipo)')

  if (!/ejemplo ilustrativo/i.test(note)) throw new SurfacePieceError('La nota marca el mensaje como «ejemplo ilustrativo».', 'invalid-intent')

  // El canal: Slack con el ícono oficial de Salesforce o Teams con el isotipo del catálogo; nunca otro.
  const ch = (intent.channel ?? {}) as ChannelIntent

  if (typeof ch.tool !== 'string' || !channel.options.includes(ch.tool)) {
    throw new SurfacePieceError(`El canal (\`channel.tool\`) es uno de ${channel.options.join(' · ')}.`, 'invalid-intent')
  }

  const channelIcon = ch.tool === 'slack' ? productIcon('slack', 'El canal (`channel.tool`)') : toolIsotype(ch.tool, 'El canal (`channel.tool`)')

  const ag = (intent.agent ?? {}) as AgentIntent
  const agentIcon = ag.icon === undefined ? null : productIcon(ag.icon, 'El avatar del agente (`agent.icon`)')
  const said = req(intent.message, 'La propuesta del agente (`message`)')

  if (CURRENCY.test(said)) throw new SurfacePieceError('Los montos del mensaje van siempre como «[MONTO]» (`message`).', 'invalid-intent')

  const evidence = exactly<unknown>(intent.evidenceChips, chips.count, 'Las fichas de evidencia (`evidenceChips`)')
  const buttons = exactly<unknown>(intent.actions, actions.count, 'Los botones (`actions`)')

  const ex = (intent.executed ?? {}) as ExecutedIntent
  const executedIcon = ex.icon === undefined ? null : productIcon(ex.icon, 'El producto donde se ejecuta (`executed.icon`)')
  const executedText = req(ex.text, 'Lo ejecutado (`executed.text`)')

  if (!/registr/i.test(executedText) || !/aprob/i.test(executedText)) {
    throw new SurfacePieceError('Lo ejecutado dice que quedó registrado quién aprobó (`executed.text`).', 'invalid-intent')
  }

  const steps = exactly<LoopIntent>(intent.loop, loop.count, 'Los pasos del ciclo (`loop`)')
  const current = indexIn(intent.currentLoopStep, loop.count, 'El paso de la persona (`currentLoopStep`)')

  if (!loop.number.numbered) throw new SurfacePieceError('AXIS numera los pasos del ciclo (`loop.number.numbered`).', 'surface-issues')

  const { stage, platform } = stageLayers(manifest, recipe, line, 'cla')

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...documentVars(doc, line),
    ...glassVars(loop.glass, line),
    ...glassVars(executed.glass, line, 'cla-ex'),
    // El mensaje
    messageLeft: css('cla-message-left', message.xPx),
    messageTop: css('cla-message-top', message.yPx),
    messageWidth: css('cla-message-width', message.widthPx),
    messagePadY: css('cla-message-pad-y', message.padding[0]),
    messagePadX: css('cla-message-pad-x', message.padding[1]),
    messageRadius: css('cla-message-radius', message.radiusPx),
    messagePerspective: css('cla-message-perspective', message.perspectivePx),
    messageRotateY: css('cla-message-rotate-y', message.rotateYDeg, 'deg'),
    // El canal
    channelIconPx: css('cla-channel-icon-px', channel.iconPx),
    channelGap: css('cla-channel-gap', channel.gapPx),
    channelPx: css('cla-channel-px', channel.px),
    channelWeight: css('cla-channel-wght', channel.weight, ''),
    channelPadBottom: css('cla-channel-pad-bottom', channel.paddingBottomPx),
    channelRule: colorVar('cla-channel-rule', color(channel.rule, 'el filete del canal')),
    // El agente
    agentGapTop: css('cla-agent-gap-top', agent.gapTopPx),
    agentGap: css('cla-agent-gap', agent.gapPx),
    agentIconPx: css('cla-agent-icon-px', agent.icon.px),
    agentNamePx: css('cla-agent-name-px', agent.name.px),
    agentNameWeight: css('cla-agent-name-wght', measured(agent.name.weight, 'el peso del nombre del agente'), ''),
    badgePadY: css('cla-badge-pad-y', agent.badge.padding[0]),
    badgePadX: css('cla-badge-pad-x', agent.badge.padding[1]),
    badgeRadius: css('cla-badge-radius', agent.badge.radiusPx),
    badgeFill: colorVar('cla-badge-fill', color(agent.badge.fill, 'la etiqueta del agente')),
    badgePx: css('cla-badge-px', agent.badge.px),
    badgeWeight: css('cla-badge-wght', agent.badge.weight, ''),
    badgeColor: colorVar('cla-badge', color(agent.badge.color, 'el texto de la etiqueta')),
    badgeGap: css('cla-badge-gap', agent.badge.gapPx),
    textPx: css('cla-text-px', text.px),
    textWeight: css('cla-text-wght', measured(text.weight, 'el peso de la propuesta'), ''),
    textLeading: css('cla-text-leading', measured(text.lineHeight, 'el interlineado de la propuesta'), ''),
    textGapTop: css('cla-text-gap-top', measured(text.gapTopPx, 'el aire de la propuesta')),
    // Las fichas de evidencia
    chipsGap: css('cla-chips-gap', chips.gapPx),
    chipsGapTop: css('cla-chips-gap-top', chips.gapTopPx),
    chipPadY: css('cla-chip-pad-y', chips.padding[0]),
    chipPadX: css('cla-chip-pad-x', chips.padding[1]),
    chipRadius: css('cla-chip-radius', chips.radiusPx),
    chipFill: colorVar('cla-chip-fill', color(chips.fill, 'la ficha de evidencia')),
    chipBorder: css('cla-chip-border', chips.border.px),
    chipBorderColor: colorVar('cla-chip-border', color(chips.border.color, 'el filete de la ficha')),
    chipPx: css('cla-chip-px', chips.px),
    chipWeight: css('cla-chip-wght', chips.weight, ''),
    chipColor: colorVar('cla-chip', color(chips.color, 'el texto de la ficha')),
    // Los botones
    actionsGap: css('cla-actions-gap', actions.gapPx),
    actionsGapTop: css('cla-actions-gap-top', actions.gapTopPx),
    actionPadY: css('cla-action-pad-y', actions.padding[0]),
    actionPadX: css('cla-action-pad-x', actions.padding[1]),
    actionRadius: css('cla-action-radius', actions.radiusPx),
    actionPx: css('cla-action-px', actions.px),
    actionWeight: css('cla-action-wght', actions.weight, ''),
    primaryFill: colorVar('cla-primary-fill', color(actions.primary.fill, 'el botón principal')),
    primaryColor: colorVar('cla-primary', color(actions.primary.color, 'el texto del botón principal')),
    secondaryRing: css('cla-secondary-ring', actions.secondary.ring.px),
    secondaryRingColor: colorVar('cla-secondary-ring', color(actions.secondary.ring.color, 'el contorno del segundo botón')),
    secondaryColor: colorVar('cla-secondary', color(actions.secondary.color, 'el texto del segundo botón')),
    tertiaryRing: css('cla-tertiary-ring', actions.tertiary.ring.px),
    tertiaryRingColor: colorVar('cla-tertiary-ring', color(actions.tertiary.ring.color, 'el contorno del tercer botón')),
    tertiaryColor: colorVar('cla-tertiary', color(actions.tertiary.color, 'el texto del tercer botón')),
    // Lo ejecutado
    executedLeft: css('cla-executed-left', executed.xPx),
    executedTop: css('cla-executed-top', executed.yPx),
    executedWidth: css('cla-executed-width', executed.widthPx),
    executedPadY: css('cla-executed-pad-y', executed.padding[0]),
    executedPadX: css('cla-executed-pad-x', executed.padding[1]),
    executedRadius: css('cla-executed-radius', executed.radiusPx),
    executedIconPx: css('cla-executed-icon-px', executed.icon.px),
    executedIconGap: css('cla-executed-icon-gap', executed.icon.gapPx),
    executedTitlePx: css('cla-executed-title-px', executed.title.px),
    executedTitleLeading: css('cla-executed-title-leading', measured(executed.title.lineHeight, 'el interlineado de lo ejecutado'), ''),
    executedTitleColor: colorVar('cla-executed-title', lineColor(measured(executed.title.color, 'el color de lo ejecutado'), line, 'lo ejecutado')),
    executedTextPx: css('cla-executed-text-px', executed.text.px),
    executedTextWeight: css('cla-executed-text-wght', measured(executed.text.weight, 'el peso del texto ejecutado'), ''),
    executedTextLeading: css('cla-executed-text-leading', measured(executed.text.lineHeight, 'el interlineado del texto ejecutado'), ''),
    executedTextGap: css('cla-executed-text-gap', measured(executed.text.gapTopPx, 'el aire del texto ejecutado')),
    executedTextColor: colorVar('cla-executed-text', lineColor(measured(executed.text.color, 'el color del texto ejecutado'), line, 'el texto ejecutado')),
    // El ciclo
    loopLeft: css('cla-loop-left', loop.xPx),
    loopTop: css('cla-loop-top', loop.yPx),
    loopGap: css('cla-loop-gap', loop.gapPx),
    stepWidth: css('cla-step-width', loop.widthPx),
    stepPadY: css('cla-step-pad-y', loop.padding[0]),
    stepPadX: css('cla-step-pad-x', loop.padding[1]),
    stepRadius: css('cla-step-radius', loop.radiusPx),
    currentFill: colorVar('cla-current-fill', color(loop.current.fill, 'el paso de la persona')),
    numberPx: css('cla-number-px', loop.number.px),
    numberColor: colorVar('cla-number', lineColor(numberColor(loop.number), line, 'el número')),
    numberCurrentColor: colorVar('cla-number-current', color(measured(loop.number.currentColor, 'el color del número actual'), 'el número actual')),
    stepTitlePx: css('cla-step-title-px', loop.title.px),
    stepTitleGap: css('cla-step-title-gap', measured(loop.title.gapPx, 'el aire del paso')),
    stepTitleColor: colorVar('cla-step-title', lineColor(measured(loop.title.color, 'el color del paso'), line, 'el paso')),
    stepTitleCurrentColor: colorVar('cla-step-title-current', color(measured(loop.title.currentColor, 'el color del paso actual'), 'el paso actual')),
    stepDetailPx: css('cla-step-detail-px', loop.detail.px),
    stepDetailWeight: css('cla-step-detail-wght', measured(loop.detail.weight, 'el peso del detalle del paso'), ''),
    stepDetailGap: css('cla-step-detail-gap', measured(loop.detail.gapPx, 'el aire del detalle del paso')),
    stepDetailColor: colorVar('cla-step-detail', lineColor(measured(loop.detail.color, 'el color del detalle'), line, 'el detalle')),
    stepDetailCurrentColor: colorVar('cla-step-detail-current', color(measured(loop.detail.currentColor, 'el color del detalle actual'), 'el detalle actual'))
  }

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.content-day-live-approval',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      channel: {
        icon: channelIcon.ref,
        name: req(ch.name, 'El nombre del canal (`channel.name`)')
      },
      ...(agentIcon ? { agentIcon: { src: agentIcon.ref } } : {}),
      agent: {
        name: req(ag.name, 'El nombre del agente (`agent.name`)'),
        badge: req(ag.badge, 'La etiqueta del agente (`agent.badge`)')
      },
      message: richHtml(said),
      chips: evidence.map((chip, i) => ({ label: req(chip, `La ficha de evidencia ${i + 1} (\`evidenceChips[${i}]\`)`) })),
      actions: {
        primary: req(buttons[0], 'El botón principal (`actions[0]`)'),
        secondary: req(buttons[1], 'El segundo botón (`actions[1]`)'),
        tertiary: req(buttons[2], 'El tercer botón (`actions[2]`)')
      },
      ...(executedIcon ? { executedIcon: { src: executedIcon.ref } } : {}),
      executed: {
        title: req(ex.title, 'El título de lo ejecutado (`executed.title`)'),
        text: executedText
      },
      loop: steps.map((step, i) => ({
        number: String(i + 1).padStart(2, '0'),
        title: req(step.title, `El paso ${i + 1} del ciclo (\`loop[${i}].title\`)`),
        detail: req(step.detail, `El detalle del paso ${i + 1} (\`loop[${i}].detail\`)`),
        state: i + 1 === current ? 'now' : 'todo'
      })),
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([
      stage.asset,
      platform.asset,
      channelIcon.asset,
      ...(agentIcon ? [agentIcon.asset] : []),
      ...(executedIcon ? [executedIcon.asset] : [])
    ])
  }
}
