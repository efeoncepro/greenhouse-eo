/**
 * `content-live-chat` (deck Salesforce, SF16, TASK-1942): «¿Y si le preguntas a tu CRM? Te responde.». Una conversación
 * con el asistente de un partner conectado al CRM, en una ventana genérica de papel crema abierta en perspectiva: la
 * consulta del usuario, la respuesta con tres registros vivos (montos siempre `[MONTO]`, a lo sumo uno «En riesgo») y la
 * acción gobernada que el asistente propone con «Confirmar», que espera al ejecutivo: es el objeto de la selección
 * «Ejecutivo». Debajo, tres garantías en vidrio; arriba a la derecha, la nota (estado del producto y «ejemplo
 * ilustrativo»).
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-live-chat']`); las claves de color
 * del documento (`ink`, `muted`) se resuelven con el documento de la familia (`familyDocument`), sobre el papel y el filete
 * medidos de la ventana. La ventana no recrea la interfaz real del asistente. Las marcas de terceros sujetas a
 * autorización son OPCIONALES y fallan cerradas sin su `authorizationRef`: `assistantMark` (el logotipo del asistente
 * del registro de logos del repo) y `platformMark` (el wordmark Claudeforce de `AXIS_PARTNER_ASSETS`, en su tarjeta
 * navy `coBrand`). El logo de la plataforma del chip de conexión es el del registro del repo.
 */

import { SurfacePieceError, type SurfaceAssetRequest } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, measured } from '../kit'

import { familyDocument, twoLineAnswer } from './content-day-release-cycle'
import {
  documentVars,
  exactly,
  glassVars,
  lineColor,
  lineVoiceFrame,
  lumVars,
  noteVars,
  partnerFile,
  req,
  stageLayers,
  uniqueAssets,
  type FrostedGlass,
  type LineDocument,
  type Shadow
} from './kit'

type Text = { px: number; weight?: number; lineHeight?: number; gapPx?: number; gapBottomPx?: number; color?: string; family?: string }

type Border = { px: number; color: string }

type WindowTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  fill: string
  rule: string
  shadow: Shadow
  halo: LineDocument['halo']
  edge: LineDocument['edge']
  perspectivePx: number
  rotateYDeg: number
  origin: string
  header: {
    paddingBottomPx: number
    assistantLogoHeightPx: number
    connection: { padding: [number, number]; radiusPx: number; fill: string; border: Border; px: number; weight: number; platformLogoHeightPx: number; gapPx: number }
  }
  user: { gapTopPx: number; maxWidthPx: number; padding: [number, number]; radiusPx: [number, number, number, number]; fill: string; px: number; lineHeight: number; align: string }
  answer: {
    gapTopPx: number
    padding: [number, number]
    radiusPx: number
    fill: string
    border: Border
    intro: Text
    rows: {
      max: number
      paddingYPx: number
      gapPx: number
      name: Text
      stage: Text
      amount: Text & { placeholder: string }
      risk: { padding: [number, number]; radiusPx: number; ring: Border; px: number; weight: number; color: string; slotPx: number }
    }
  }
  action: {
    gapTopPx: number
    padding: [number, number]
    radiusPx: number
    fill: string
    border: Border
    text: Text
    button: { padding: [number, number]; radiusPx: number; fill: string; color: string; px: number; weight: number; text: string }
  }
}

type GuaranteeTokens = { count: number; yPx: number; xPx: number[]; widthPx: number; padding: [number, number]; radiusPx: number; glass: FrostedGlass; title: Text; desc: Text }

type CoBrandTokens = {
  xPx: number
  yPx: number
  sizePx: number
  radiusPx: number
  fill: string
  border: Border & { opacity: number }
  shadow: Shadow
  markWidthPx: number
}

type ChatIntent = { connectionLabel?: unknown; userPrompt?: unknown; answerIntro?: unknown; records?: unknown; proposedAction?: unknown }
type RecordIntent = { name?: unknown; stage?: unknown; amount?: unknown; atRisk?: unknown }
type GuaranteeIntent = { title?: unknown; detail?: unknown }
type MarkIntent = { authorizationRef?: unknown }

/** El logotipo del asistente y el logo de la plataforma, del registro de logos del repo (sujetos a autorización). */
const ASSISTANT_LOGO = 'public/images/logos/partners/claude-logotype.svg'
const PLATFORM_LOGO = 'public/images/logos/partners/salesforce.com_logo.svg'

/** La píldora de la fila en riesgo («En riesgo»): a lo sumo una fila la lleva. */
const RISK_LABEL = 'En riesgo'

const fileAsset = (id: string, file: string): { ref: string; asset: SurfaceAssetRequest } => {
  const ref = `asset-ref:file:${id}`

  return { ref, asset: { ref, kind: 'file', path: file } }
}

/** Una marca de tercero opcional: sin el intent no se pinta; con él exige la referencia a su autorización escrita. */
const authorizedMark = (value: unknown, what: string): boolean => {
  if (value === undefined) return false

  req((value as MarkIntent | null)?.authorizationRef, `${what}: la referencia a su autorización escrita (\`authorizationRef\`)`)

  return true
}

/** Texto con `**negrita**` (varias): escapado y con `<strong>`. */
const richHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

export const contentLiveChat: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const win = measured(recipe.window as WindowTokens | undefined, 'la ventana del asistente')
  const guarantees = measured(recipe.guarantees as GuaranteeTokens | undefined, 'las garantías')
  const coBrand = measured(recipe.coBrand as CoBrandTokens | undefined, 'la co-marca')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const { header, user, answer, action } = win
  const { rows } = answer

  twoLineAnswer(voice, 'el CRM en una conversación')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')
  if (win.origin !== 'start' || user.align !== 'end') throw new SurfacePieceError('AXIS abre la ventana desde su borde inicial y alinea al usuario al final.', 'surface-issues')

  // `illustrative-data-marked` y el estado del producto: la nota es obligatoria y dice «ejemplo ilustrativo».
  const note = req(content.note ?? intent.note, 'La nota de la lámina (`note`: estado del producto con su fecha y «ejemplo ilustrativo»)')

  if (!/ejemplo ilustrativo/i.test(note)) throw new SurfacePieceError('La nota marca la conversación como «ejemplo ilustrativo».', 'invalid-intent')

  // La ventana es el papel de la familia sobre el crema medido: toma la sombra, el halo y el filo del documento.
  const family = familyDocument(win.shadow)
  const doc: LineDocument = { ...family, fill: win.fill, rule: win.rule, shadow: win.shadow, halo: win.halo, edge: win.edge }
  const color = (value: string, what: string) => lineColor(value, line, what, doc)

  const chat = (intent.chat ?? {}) as ChatIntent
  const records = exactly<RecordIntent>(chat.records, rows.max, 'Los registros de la respuesta (`chat.records`)')

  // `prices-as-placeholder`: el monto es siempre el marcador de AXIS; a lo sumo una fila en riesgo.
  for (const [i, record] of records.entries()) {
    if (record.amount !== undefined && record.amount !== rows.amount.placeholder) {
      throw new SurfacePieceError(`El monto del registro ${i + 1} va siempre como «${rows.amount.placeholder}» (\`chat.records[${i}].amount\`).`, 'invalid-intent')
    }

    if (record.atRisk !== undefined && typeof record.atRisk !== 'boolean') {
      throw new SurfacePieceError(`«En riesgo» del registro ${i + 1} es sí o no (\`chat.records[${i}].atRisk\`).`, 'invalid-intent')
    }
  }

  if (records.filter(record => record.atRisk === true).length > 1) throw new SurfacePieceError('A lo sumo un registro va «En riesgo».', 'invalid-intent')

  const list = exactly<GuaranteeIntent>(intent.guarantees, guarantees.count, 'Las garantías (`guarantees`)')
  const withAssistant = authorizedMark(intent.assistantMark, 'El logotipo del asistente (`assistantMark`)')
  const withPlatform = authorizedMark(intent.platformMark, 'El wordmark de la co-marca (`platformMark`)')
  const assistantLogo = withAssistant ? fileAsset('claude-logotype', ASSISTANT_LOGO) : null
  const platformMark = withPlatform ? partnerFile('claudeforce-wordmark') : null
  const platformLogo = fileAsset('salesforce-logo', PLATFORM_LOGO)

  const { stage, platform } = stageLayers(manifest, recipe, line, 'clc')

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...documentVars(doc, line),
    ...glassVars(guarantees.glass, line),
    // La ventana
    windowLeft: css('clc-window-left', win.xPx),
    windowTop: css('clc-window-top', win.yPx),
    windowWidth: css('clc-window-width', win.widthPx),
    windowPadTop: css('clc-window-pad-top', win.padding[0]),
    windowPadX: css('clc-window-pad-x', win.padding[1]),
    windowPadBottom: css('clc-window-pad-bottom', win.padding[2]),
    windowRadius: css('clc-window-radius', win.radiusPx),
    windowPerspective: css('clc-window-perspective', win.perspectivePx),
    windowRotateY: css('clc-window-rotate-y', win.rotateYDeg, 'deg'),
    // La cabecera
    headerPadBottom: css('clc-header-pad-bottom', header.paddingBottomPx),
    assistantHeight: css('clc-assistant-height', header.assistantLogoHeightPx),
    connectionPadY: css('clc-connection-pad-y', header.connection.padding[0]),
    connectionPadX: css('clc-connection-pad-x', header.connection.padding[1]),
    connectionRadius: css('clc-connection-radius', header.connection.radiusPx),
    connectionFill: colorVar('clc-connection-fill', color(header.connection.fill, 'el chip de conexión')),
    connectionBorder: css('clc-connection-border', header.connection.border.px),
    connectionBorderColor: colorVar('clc-connection-border', color(header.connection.border.color, 'el filete del chip de conexión')),
    connectionPx: css('clc-connection-px', header.connection.px),
    connectionWeight: css('clc-connection-wght', header.connection.weight, ''),
    connectionGap: css('clc-connection-gap', header.connection.gapPx),
    platformLogoHeight: css('clc-platform-logo-height', header.connection.platformLogoHeightPx),
    // El usuario
    userGap: css('clc-user-gap', user.gapTopPx),
    userWidth: css('clc-user-width', user.maxWidthPx),
    userPadY: css('clc-user-pad-y', user.padding[0]),
    userPadX: css('clc-user-pad-x', user.padding[1]),
    userRadius1: css('clc-user-radius-1', user.radiusPx[0]),
    userRadius2: css('clc-user-radius-2', user.radiusPx[1]),
    userRadius3: css('clc-user-radius-3', user.radiusPx[2]),
    userRadius4: css('clc-user-radius-4', user.radiusPx[3]),
    userFill: colorVar('clc-user-fill', color(user.fill, 'la burbuja del usuario')),
    userPx: css('clc-user-px', user.px),
    userLeading: css('clc-user-leading', user.lineHeight, ''),
    // La respuesta
    answerGap: css('clc-answer-gap', answer.gapTopPx),
    answerPadY: css('clc-answer-pad-y', answer.padding[0]),
    answerPadX: css('clc-answer-pad-x', answer.padding[1]),
    answerRadius: css('clc-answer-radius', answer.radiusPx),
    answerFill: colorVar('clc-answer-fill', color(answer.fill, 'la respuesta')),
    answerBorder: css('clc-answer-border', answer.border.px),
    answerBorderColor: colorVar('clc-answer-border', color(answer.border.color, 'el filete de la respuesta')),
    introPx: css('clc-intro-px', answer.intro.px),
    introLeading: css('clc-intro-leading', measured(answer.intro.lineHeight, 'el interlineado de la respuesta'), ''),
    introGap: css('clc-intro-gap', measured(answer.intro.gapBottomPx, 'el aire bajo la respuesta')),
    rowPadY: css('clc-row-pad-y', rows.paddingYPx),
    rowGap: css('clc-row-gap', rows.gapPx),
    nameWeight: css('clc-name-wght', measured(rows.name.weight, 'el peso del nombre'), ''),
    namePx: css('clc-name-px', rows.name.px),
    stagePx: css('clc-stage-px', rows.stage.px),
    stageWeight: css('clc-stage-wght', measured(rows.stage.weight, 'el peso de la etapa'), ''),
    stageColor: colorVar('clc-stage', color(measured(rows.stage.color, 'el color de la etapa'), 'la etapa')),
    amountPx: css('clc-amount-px', rows.amount.px),
    amountWeight: css('clc-amount-wght', measured(rows.amount.weight, 'el peso del monto'), ''),
    riskSlot: css('clc-risk-slot', rows.risk.slotPx),
    riskPadY: css('clc-risk-pad-y', rows.risk.padding[0]),
    riskPadX: css('clc-risk-pad-x', rows.risk.padding[1]),
    riskRadius: css('clc-risk-radius', rows.risk.radiusPx),
    riskRing: css('clc-risk-ring', rows.risk.ring.px),
    riskRingColor: colorVar('clc-risk-ring', color(rows.risk.ring.color, 'el contorno de «En riesgo»')),
    riskPx: css('clc-risk-px', rows.risk.px),
    riskWeight: css('clc-risk-wght', rows.risk.weight, ''),
    riskColor: colorVar('clc-risk', color(rows.risk.color, '«En riesgo»')),
    // La acción gobernada
    actionGap: css('clc-action-gap', action.gapTopPx),
    actionPadY: css('clc-action-pad-y', action.padding[0]),
    actionPadX: css('clc-action-pad-x', action.padding[1]),
    actionRadius: css('clc-action-radius', action.radiusPx),
    actionFill: colorVar('clc-action-fill', color(action.fill, 'la acción')),
    actionBorder: css('clc-action-border', action.border.px),
    actionBorderColor: colorVar('clc-action-border', color(action.border.color, 'el contorno de la acción')),
    actionPx: css('clc-action-px', action.text.px),
    actionWeight: css('clc-action-wght', measured(action.text.weight, 'el peso de la acción'), ''),
    actionLeading: css('clc-action-leading', measured(action.text.lineHeight, 'el interlineado de la acción'), ''),
    buttonPadY: css('clc-button-pad-y', action.button.padding[0]),
    buttonPadX: css('clc-button-pad-x', action.button.padding[1]),
    buttonRadius: css('clc-button-radius', action.button.radiusPx),
    buttonFill: colorVar('clc-button-fill', color(action.button.fill, 'el botón de confirmar')),
    buttonColor: colorVar('clc-button', color(action.button.color, 'el texto del botón de confirmar')),
    buttonPx: css('clc-button-px', action.button.px),
    buttonWeight: css('clc-button-wght', action.button.weight, ''),
    // Las garantías
    guaranteeTop: css('clc-guarantee-top', guarantees.yPx),
    guaranteeWidth: css('clc-guarantee-width', guarantees.widthPx),
    guaranteePadY: css('clc-guarantee-pad-y', guarantees.padding[0]),
    guaranteePadX: css('clc-guarantee-pad-x', guarantees.padding[1]),
    guaranteeRadius: css('clc-guarantee-radius', guarantees.radiusPx),
    guaranteeTitlePx: css('clc-guarantee-title-px', guarantees.title.px),
    guaranteeTitleLeading: css('clc-guarantee-title-leading', measured(guarantees.title.lineHeight, 'el interlineado de la garantía'), ''),
    guaranteeTitleColor: colorVar('clc-guarantee-title', lineColor(measured(guarantees.title.color, 'el color de la garantía'), line, 'la garantía')),
    guaranteeDescPx: css('clc-guarantee-desc-px', guarantees.desc.px),
    guaranteeDescWeight: css('clc-guarantee-desc-wght', measured(guarantees.desc.weight, 'el peso del detalle'), ''),
    guaranteeDescLeading: css('clc-guarantee-desc-leading', measured(guarantees.desc.lineHeight, 'el interlineado del detalle'), ''),
    guaranteeDescGap: css('clc-guarantee-desc-gap', measured(guarantees.desc.gapPx, 'el aire del detalle')),
    guaranteeDescColor: colorVar('clc-guarantee-desc', lineColor(measured(guarantees.desc.color, 'el color del detalle'), line, 'el detalle')),
    // La tarjeta navy de la co-marca: el frame es uno solo; la tarjeta se pinta sólo con la marca autorizada.
    coBrandLeft: css('clc-cobrand-left', coBrand.xPx),
    coBrandTop: css('clc-cobrand-top', coBrand.yPx),
    coBrandSize: css('clc-cobrand-size', coBrand.sizePx),
    coBrandRadius: css('clc-cobrand-radius', coBrand.radiusPx),
    coBrandFill: colorVar('clc-cobrand-fill', lineColor(coBrand.fill, line, 'la tarjeta de la co-marca')),
    coBrandBorder: css('clc-cobrand-border', coBrand.border.px),
    coBrandBorderColor: colorVar('clc-cobrand-border', lineColor(coBrand.border.color, line, 'el filo de la co-marca')),
    coBrandBorderOpacity: css('clc-cobrand-border-opacity', coBrand.border.opacity * 100, '%'),
    coBrandShadowY: css('clc-cobrand-shadow-y', coBrand.shadow.yPx),
    coBrandShadowBlur: css('clc-cobrand-shadow-blur', coBrand.shadow.blurPx),
    coBrandShadowColor: colorVar('clc-cobrand-shadow', lineColor(coBrand.shadow.color, line, 'la sombra de la co-marca')),
    coBrandShadowOpacity: css('clc-cobrand-shadow-opacity', coBrand.shadow.opacity * 100, '%'),
    coBrandMarkWidth: css('clc-cobrand-mark-width', coBrand.markWidthPx)
    
  }

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.content-live-chat',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      ...(assistantLogo ? { assistantMark: { src: assistantLogo.ref } } : {}),
      connection: {
        logo: platformLogo.ref,
        label: req(chat.connectionLabel, 'El chip de conexión (`chat.connectionLabel`)')
      },
      prompt: req(chat.userPrompt, 'La consulta del usuario (`chat.userPrompt`)'),
      intro: richHtml(req(chat.answerIntro, 'La respuesta del asistente (`chat.answerIntro`)')),
      records: records.map((record, i) => ({
        name: req(record.name, `El nombre del registro ${i + 1} (\`chat.records[${i}].name\`)`),
        stage: req(record.stage, `La etapa del registro ${i + 1} (\`chat.records[${i}].stage\`)`),
        amount: rows.amount.placeholder,
        ...(record.atRisk === true ? { risk: RISK_LABEL } : {})
      })),
      action: {
        text: req(chat.proposedAction, 'La acción que el asistente propone (`chat.proposedAction`)'),
        button: action.button.text
      },
      guarantees: list.map((guarantee, i) => ({
        title: req(guarantee.title, `La garantía ${i + 1} (\`guarantees[${i}].title\`)`),
        detail: req(guarantee.detail, `El detalle de la garantía ${i + 1} (\`guarantees[${i}].detail\`)`),
        left: css('clc-left', measured(guarantees.xPx[i], `la posición de la garantía ${i + 1}`))
      })),
      ...(platformMark ? { platformMark: { src: platformMark.ref } } : {}),
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([
      stage.asset,
      platform.asset,
      platformLogo.asset,
      ...(assistantLogo ? [assistantLogo.asset] : []),
      ...(platformMark ? [platformMark.asset] : [])
    ])
  }
}

