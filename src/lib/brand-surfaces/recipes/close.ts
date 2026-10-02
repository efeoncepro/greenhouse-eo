/**
 * Builders de la familia COTIZACIÓN, PRÓXIMOS PASOS Y RESPIRO del deck (TASK-1928): `breather` (la lámina de respiro),
 * `decision-next-steps` (la agenda del diagnóstico) y `content-pricing` (la cotización en tabla, en escenario y en vivo).
 *
 * Todo lo que pintan sale de AXIS: la voz, de las reservas y tipos del manifest; el escenario, la plataforma, las
 * fichas de vidrio y el documento, de los tokens de la receta (piezas compartidas del estilo «vivo»). El CONTENIDO
 * propio de cada lámina (los planes, las líneas de la cotización, los días y horas de la agenda) llega en el intent y
 * lo validan este builder y el contrato de slots. Los montos se imprimen SIEMPRE como marcador; el contacto sale de los
 * datos de Efeonce del consumidor (`EFEONCE_CONTACT`), nunca del intent.
 */

import { EFEONCE_CONTACT } from '@/config/efeonce-brand'

import { SurfacePieceError } from '../types'
import { contentOf, plateAsset, reserve, selectionSlot, voiceSlots, type SurfaceManifest } from '../shared'

import { progressIndicatorLayer, type RecipeBuilder } from './deck'
import { evidenceHtml } from './frame'
import { colorVar, css, fixedPx, layerAsset, measured, n, paletteColor, stageSvg, svgOpen, text, topOf, typeOf, type StageTokens } from './kit'

/* ── breather: la lámina de respiro ─────────────────────────────────────────────────────────────────────── */

type BreatherTokens = { progress?: { ringOpacity?: number } }

/** Foto a sangre, la voz sobre el muro calmo y el indicador de navegación. Sin burbuja ni logo (la receta lo exceptúa). */
export const breather: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const voice = voiceSlots(manifest)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta del respiro va en una línea.', 'invalid-intent')

  const photo = plateAsset(manifest, { width, height })
  const ringOpacity = measured((recipe as BreatherTokens).progress?.ringOpacity, 'la opacidad del indicador del respiro')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-br', { ringOpacity })
  const question = typeOf(manifest, 'question')
  const answer = typeOf(manifest, 'answer')

  return {
    slots: {
      frame: {
        line: intent.line,
        margin: measured(manifest.safeArea?.marginPx, 'el margen del deck'),
        questionTop: topOf(manifest, 'voice'),
        answerTop: topOf(manifest, 'answer'),
        answerPx: fixedPx(answer, 'la respuesta'),
        questionLeading: css('br-question-leading', measured(question.lineHeight, 'el interlineado de la pregunta'), ''),
        answerLeading: css('br-answer-leading', measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
        answerTracking: css('br-answer-tracking', Number.parseFloat(measured(answer.tracking, 'el tracking de la respuesta')), 'em')
      },
      photo: { src: photo.ref, alt: photo.alt },
      indicator: { src: indicator.ref },
      voice
    },
    assets: [photo.asset, indicator.asset]
  }
}

/* ── decision-next-steps: la agenda del diagnóstico ─────────────────────────────────────────────────────── */

export type Glass = {
  document: { fill: string; ink: string; muted: string; rule: string; chip: string; shadow: { yPx: number; blurPx: number; color: string; opacity: number }; halo: { blurPx: number; opacity: number }; edge: { color: string; opacity: number } }
  dark?: DarkGlass
}

type NextStepsTokens = {
  stage: StageTokens
  answerShadow: AnswerShadow
  orbit: {
    cxPx: number
    cyPx: number
    rxPx: number
    ryPx: number
    ring: { color: string; opacity: number; strokePx: number }
    arc: { fromDeg: number; toRad: number; color: string; strokePx: number; glow: { strokePx: number; opacity: number; blurPx: number } }
    sphere: { radiusPx: number; glow: { radiusPx: number; opacity: number; blurPx: number } }
  }
  agenda: {
    xPx: number
    yPx: number
    widthPx: number
    padding: { topPx: number; xPx: number; bottomPx: number }
    radiusPx: number
    header: { tilePx: number; tileRadiusPx: number; isotypePx: number; gapPx: number; kickerGapPx: number }
    kicker: { px: number; color: string }
    title: { px: number }
    descriptor: { px: number; gapPx: number }
    days: { count: number; gapTopPx: number; gapPx: number; widthPx: number; heightPx: number; radiusPx: number; label: { px: number }; number: { px: number } }
    times: { count: number; gapTopPx: number; gapPx: number; widthPx: number; heightPx: number; radiusPx: number; px: number }
    footerGapPx: number
    summary: { px: number }
    cta: { px: number; padding: { yPx: number; xPx: number }; radiusPx: number; cursorScale: number }
  }
  steps: {
    cards: { xPx: number; yPx: number; widthPx: number; rotateYDeg: number; opacity: number }[]
    perspectivePx: number
    padding: { topPx: number; xPx: number; bottomPx: number }
    radiusPx: number
    number: { px: number; color: string; gapPx: number; baselineShiftPx: number }
    label: { px: number }
    title: { px: number; gapPx: number }
    desc: { px: number; gapPx: number; color: string }
    fill: [string, string]
  }
  glass: Glass
}

type AgendaIntent = {
  kicker?: unknown
  title?: unknown
  descriptor?: unknown
  days?: { weekday?: unknown; day?: unknown }[]
  times?: unknown[]
  chosen?: { day?: unknown; time?: unknown }
  summary?: unknown
  cta?: unknown
}

type NextStepIntent = { number?: unknown; label?: unknown; title?: unknown; desc?: unknown }

const choice = (value: unknown, max: number, what: string): number => {
  const index = Number(value)

  if (!Number.isInteger(index) || index < 1 || index > max) throw new SurfacePieceError(`${what} va de 1 a ${max}.`, 'invalid-intent')

  return index
}

/** La órbita elíptica de los próximos pasos: el anillo tenue y el tramo de luz que termina en la esfera. */
const nextStepsOrbitSvg = (manifest: SurfaceManifest, orbit: NextStepsTokens['orbit']): string => {
  const { cxPx: cx, cyPx: cy, rxPx: rx, ryPx: ry } = orbit
  const at = (rad: number) => ({ x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) })
  const from = at((orbit.arc.fromDeg * Math.PI) / 180)
  const to = at(orbit.arc.toRad)
  const arcColor = paletteColor(orbit.arc.color, 'el tramo de la órbita')
  const path = `M ${n(from.x)} ${n(from.y)} A ${n(rx)} ${n(ry)} 0 0 0 ${n(to.x)} ${n(to.y)}`

  return (
    svgOpen(manifest) +
    `<defs><filter id="ns-arc-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${n(orbit.arc.glow.blurPx)}"/></filter>` +
    `<filter id="ns-sphere-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${n(orbit.sphere.glow.blurPx)}"/></filter></defs>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${paletteColor(orbit.ring.color, 'el anillo')}" stroke-opacity="${n(orbit.ring.opacity)}" stroke-width="${n(orbit.ring.strokePx)}"/>` +
    `<path d="${path}" fill="none" stroke="${arcColor}" stroke-opacity="${n(orbit.arc.glow.opacity)}" stroke-width="${n(orbit.arc.glow.strokePx)}" stroke-linecap="round" filter="url(#ns-arc-glow)"/>` +
    `<path d="${path}" fill="none" stroke="${arcColor}" stroke-width="${n(orbit.arc.strokePx)}" stroke-linecap="round"/>` +
    `<circle cx="${n(to.x)}" cy="${n(to.y)}" r="${n(orbit.sphere.glow.radiusPx)}" fill="${arcColor}" fill-opacity="${n(orbit.sphere.glow.opacity)}" filter="url(#ns-sphere-glow)"/>` +
    `<circle cx="${n(to.x)}" cy="${n(to.y)}" r="${n(orbit.sphere.radiusPx)}" fill="${arcColor}"/>` +
    '</svg>'
  )
}

type DarkGlass = { fill: [string, string]; angleDeg: number; border: { opacity: number }; shadow: { yPx: number; blurPx: number; color: string; opacity: number }; halo: { blurPx: number; opacity: number } }

/** Las variables de la ficha oscura de vidrio (las notas de la cotización en vivo). */
const darkGlassVars = (dark: DarkGlass, prefix: string) => ({
  glassFrom: colorVar(`${prefix}-glass-from`, paletteColor(dark.fill[0], 'el vidrio oscuro')),
  glassTo: colorVar(`${prefix}-glass-to`, paletteColor(dark.fill[1], 'el vidrio oscuro')),
  glassAngle: css(`${prefix}-glass-angle`, dark.angleDeg, 'deg'),
  glassEdgeOpacity: css(`${prefix}-glass-edge-opacity`, dark.border.opacity * 100, '%'),
  glassShadowColor: colorVar(`${prefix}-glass-shadow`, paletteColor(dark.shadow.color, 'la sombra del vidrio')),
  glassShadowY: css(`${prefix}-glass-shadow-y`, dark.shadow.yPx),
  glassShadowBlur: css(`${prefix}-glass-shadow-blur`, dark.shadow.blurPx),
  glassShadowOpacity: css(`${prefix}-glass-shadow-opacity`, dark.shadow.opacity * 100, '%'),
  glassHaloBlur: css(`${prefix}-glass-halo-blur`, dark.halo.blurPx),
  glassHaloOpacity: css(`${prefix}-glass-halo-opacity`, dark.halo.opacity * 100, '%')
})

/** Las variables del documento claro (la agenda, la cotización en vivo): tinta, apagado, filete, chip y su sombra. */
export const documentVars = (glass: Glass, prefix: string) => ({
  docFill: colorVar(`${prefix}-doc`, paletteColor(glass.document.fill, 'el documento')),
  docInk: colorVar(`${prefix}-doc-ink`, paletteColor(glass.document.ink, 'la tinta del documento')),
  docMuted: colorVar(`${prefix}-doc-muted`, paletteColor(glass.document.muted, 'el texto apagado del documento')),
  docRule: colorVar(`${prefix}-doc-rule`, paletteColor(glass.document.rule, 'el filete del documento')),
  docChip: colorVar(`${prefix}-doc-chip`, paletteColor(glass.document.chip, 'los chips del documento')),
  docShadowColor: colorVar(`${prefix}-doc-shadow`, paletteColor(glass.document.shadow.color, 'la sombra del documento')),
  docShadowY: css(`${prefix}-doc-shadow-y`, glass.document.shadow.yPx),
  docShadowBlur: css(`${prefix}-doc-shadow-blur`, glass.document.shadow.blurPx),
  docShadowOpacity: css(`${prefix}-doc-shadow-opacity`, glass.document.shadow.opacity * 100, '%'),
  docHaloBlur: css(`${prefix}-doc-halo-blur`, glass.document.halo.blurPx),
  docHaloOpacity: css(`${prefix}-doc-halo-opacity`, glass.document.halo.opacity * 100, '%'),
  docEdgeOpacity: css(`${prefix}-doc-edge-opacity`, glass.document.edge.opacity * 100, '%')
})

export const decisionNextSteps: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const tokens = recipe as unknown as NextStepsTokens
  const agenda = measured(tokens.agenda, 'la agenda')
  const steps = measured(tokens.steps, 'los pasos siguientes')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de los próximos pasos va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('Los próximos pasos llevan su bajada (`body`).', 'invalid-intent')

  const a = (intent.agenda ?? {}) as AgendaIntent
  const days = Array.isArray(a.days) ? a.days : []
  const times = Array.isArray(a.times) ? a.times : []

  if (days.length !== agenda.days.count) throw new SurfacePieceError(`La agenda lleva ${agenda.days.count} días (\`agenda.days\`).`, 'invalid-intent')
  if (times.length !== agenda.times.count) throw new SurfacePieceError(`La agenda lleva ${agenda.times.count} horas (\`agenda.times\`).`, 'invalid-intent')

  const nextSteps = (Array.isArray(intent.nextSteps) ? intent.nextSteps : []) as NextStepIntent[]

  if (nextSteps.length !== steps.cards.length) throw new SurfacePieceError(`Los próximos pasos llevan ${steps.cards.length} fichas (\`nextSteps\`).`, 'invalid-intent')

  const stage = layerAsset('decision-next-steps-stage', stageSvg(manifest, tokens.stage, 'ns'))
  const orbit = layerAsset('decision-next-steps-orbit', nextStepsOrbitSvg(manifest, tokens.orbit))
  const question = typeOf(manifest, 'question')
  const questionTop = topOf(manifest, 'question')
  const answerRange = measured(reserve(manifest, 'answer')?.fromTopRange, 'la altura de la respuesta')
  const answer = typeOf(manifest, 'answer')
  const body = typeOf(manifest, 'body')
  const contact = typeOf(manifest, 'contact')
  const answerGap = Math.round(answerRange[0] * manifest.canvas.height) - questionTop - fixedPx(question, 'la pregunta') * measured(question.lineHeight, 'el interlineado de la pregunta')

  const frame: Record<string, unknown> = {
    line: intent.line,
    margin: measured(manifest.safeArea?.marginPx, 'el margen del deck'),
    eyebrowTop: topOf(manifest, 'eyebrow'),
    questionTop,
    bodyTop: topOf(manifest, 'body'),
    bodyPx: fixedPx(body, 'la bajada'),
    bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada'),
    questionWidth: css('ns-question-width', measured(question.maxWidthPx, 'el ancho de la pregunta')),
    answerGap: css('ns-answer-gap', answerGap),
    answerSize: css('ns-answer-px', fixedPx(answer, 'la respuesta')),
    answerLeading: css('ns-answer-leading', measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
    answerShadowY: css('ns-answer-shadow-y', measured(tokens.answerShadow, 'la sombra de la respuesta').yPx),
    answerShadowBlur: css('ns-answer-shadow-blur', tokens.answerShadow.blurPx),
    answerShadowOpacity: css('ns-answer-shadow-opacity', tokens.answerShadow.opacity * 100, '%'),
    contactPx: css('ns-contact-px', fixedPx(contact, 'el contacto')),
    // El aire del contacto es del token de la receta: el manifest sólo resuelve las claves tipográficas.
    contactGap: css('ns-contact-gap', measured((recipe.type as Record<string, { gapPx?: number }> | undefined)?.contact?.gapPx, 'el aire del contacto')),
    agendaLeft: css('ns-agenda-left', agenda.xPx),
    agendaTop: css('ns-agenda-top', agenda.yPx),
    agendaWidth: css('ns-agenda-width', agenda.widthPx),
    agendaPadTop: css('ns-agenda-pad-top', agenda.padding.topPx),
    agendaPadX: css('ns-agenda-pad-x', agenda.padding.xPx),
    agendaPadBottom: css('ns-agenda-pad-bottom', agenda.padding.bottomPx),
    agendaRadius: css('ns-agenda-radius', agenda.radiusPx),
    tileSize: css('ns-tile', agenda.header.tilePx),
    tileRadius: css('ns-tile-radius', agenda.header.tileRadiusPx),
    isotypeSize: css('ns-isotype', agenda.header.isotypePx),
    headerGap: css('ns-header-gap', agenda.header.gapPx),
    kickerGap: css('ns-kicker-gap', agenda.header.kickerGapPx),
    kickerPx: css('ns-kicker-px', agenda.kicker.px),
    kickerColor: colorVar('ns-kicker', paletteColor(agenda.kicker.color, 'el kicker de la agenda')),
    titlePx: css('ns-title-px', agenda.title.px),
    descriptorPx: css('ns-descriptor-px', agenda.descriptor.px),
    descriptorGap: css('ns-descriptor-gap', agenda.descriptor.gapPx),
    daysGapTop: css('ns-days-gap-top', agenda.days.gapTopPx),
    daysGap: css('ns-days-gap', agenda.days.gapPx),
    dayWidth: css('ns-day-width', agenda.days.widthPx),
    dayHeight: css('ns-day-height', agenda.days.heightPx),
    dayRadius: css('ns-day-radius', agenda.days.radiusPx),
    dayLabelPx: css('ns-day-label-px', agenda.days.label.px),
    dayNumberPx: css('ns-day-number-px', agenda.days.number.px),
    timesGapTop: css('ns-times-gap-top', agenda.times.gapTopPx),
    timesGap: css('ns-times-gap', agenda.times.gapPx),
    timeWidth: css('ns-time-width', agenda.times.widthPx),
    timeHeight: css('ns-time-height', agenda.times.heightPx),
    timeRadius: css('ns-time-radius', agenda.times.radiusPx),
    timePx: css('ns-time-px', agenda.times.px),
    footerGap: css('ns-footer-gap', agenda.footerGapPx),
    summaryPx: css('ns-summary-px', agenda.summary.px),
    ctaPx: css('ns-cta-px', agenda.cta.px),
    ctaPadY: css('ns-cta-pad-y', agenda.cta.padding.yPx),
    ctaPadX: css('ns-cta-pad-x', agenda.cta.padding.xPx),
    ctaRadius: css('ns-cta-radius', agenda.cta.radiusPx),
    haloColor: colorVar('ns-halo', paletteColor('halo', 'el halo')),
    stepPerspective: css('ns-step-perspective', steps.perspectivePx),
    stepPadTop: css('ns-step-pad-top', steps.padding.topPx),
    stepPadX: css('ns-step-pad-x', steps.padding.xPx),
    stepPadBottom: css('ns-step-pad-bottom', steps.padding.bottomPx),
    stepRadius: css('ns-step-radius', steps.radiusPx),
    stepFillFrom: colorVar('ns-step-from', paletteColor(steps.fill[0], 'las fichas de pasos')),
    stepFillTo: colorVar('ns-step-to', paletteColor(steps.fill[1], 'las fichas de pasos')),
    stepNumberPx: css('ns-step-number-px', steps.number.px),
    stepNumberGap: css('ns-step-number-gap', steps.number.gapPx),
    stepNumberShift: css('ns-step-number-shift', steps.number.baselineShiftPx),
    stepLabelPx: css('ns-step-label-px', steps.label.px),
    stepTitlePx: css('ns-step-title-px', steps.title.px),
    stepTitleGap: css('ns-step-title-gap', steps.title.gapPx),
    stepDescPx: css('ns-step-desc-px', steps.desc.px),
    stepDescGap: css('ns-step-desc-gap', steps.desc.gapPx),
    stepDescColor: colorVar('ns-step-desc', paletteColor(steps.desc.color, 'la descripción de los pasos')),
    chosenDay: String(choice(a.chosen?.day, agenda.days.count, 'El día elegido (`agenda.chosen.day`)')),
    chosenTime: String(choice(a.chosen?.time, agenda.times.count, 'La hora elegida (`agenda.chosen.time`)')),
    ...documentVars(tokens.glass, 'ns')
  }

  steps.cards.forEach((card, i) => {
    frame[`step${i + 1}Left`] = css(`ns-step${i + 1}-left`, card.xPx)
    frame[`step${i + 1}Top`] = css(`ns-step${i + 1}-top`, card.yPx)
    frame[`step${i + 1}Width`] = css(`ns-step${i + 1}-width`, card.widthPx)
    frame[`step${i + 1}Rotate`] = css(`ns-step${i + 1}-rotate`, card.rotateYDeg, 'deg')
    frame[`step${i + 1}Opacity`] = css(`ns-step${i + 1}-opacity`, card.opacity, '')
  })

  const lum = (recipe.signature as { urlBubble?: { widthPx?: number; bottomPx?: number } } | undefined)?.urlBubble

  frame.lumWidth = css('lum-width', measured(lum?.widthPx, 'la burbuja en luminosidad'))
  frame.lumBottom = css('lum-bottom', measured(lum?.bottomPx, 'la burbuja en luminosidad'))

  return {
    slots: {
      frame,
      stage: { src: stage.ref },
      orbit: { src: orbit.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      contact: { email: EFEONCE_CONTACT.email, phone: EFEONCE_CONTACT.phones[0].display },
      agenda: {
        kicker: text(a.kicker, 'El kicker de la agenda (`agenda.kicker`)'),
        title: text(a.title, 'El título de la agenda (`agenda.title`)'),
        descriptor: text(a.descriptor, 'El descriptor de la agenda (`agenda.descriptor`)'),
        summary: text(a.summary, 'El resumen de lo elegido (`agenda.summary`)')
      },
      days: days.map((day, i) => ({ weekday: text(day?.weekday, `El día ${i + 1} de la agenda`), day: text(String(day?.day ?? ''), `El número del día ${i + 1}`) })),
      times: times.map((time, i) => ({ time: text(time, `La hora ${i + 1} de la agenda`) })),
      cta: { text: text(a.cta, 'El botón de la agenda (`agenda.cta`)'), cursorScale: agenda.cta.cursorScale },
      nextSteps: nextSteps.map((step, i) => ({
        number: text(step.number, `El número del paso ${i + 2}`),
        label: text(step.label, `El rótulo del paso ${i + 2}`),
        title: text(step.title, `El título del paso ${i + 2}`),
        desc: text(step.desc, `La descripción del paso ${i + 2}`)
      }))
    },
    assets: [stage.asset, orbit.asset]
  }
}

/* ── content-pricing: la cotización por capacidad ───────────────────────────────────────────────────────── */

/** El marcador de un monto: una cotización NUNCA imprime una cifra real en una plantilla (`prices-as-placeholder`). */
const AMOUNT = '[MONTO]'

export type PlatformTokens = {
  cxPx: number
  cyPx: number
  rxPx: number
  ryPx: number
  fill: { stops: { at: number; color: string; opacity: number }[] }
  ring: { color: string; opacity: number; strokePx: number }
  arc: { color: string; strokePx: number; from: [number, number]; to: [number, number]; glow: { strokePx: number; opacity: number; blurPx: number } }
}

type PlansTokens = {
  count: number
  xPx: number
  topPx: number
  widthPx: number
  heightPx: number
  gapPx: number
  radiusPx: number
  recommended: { liftPx: number; extraHeightPx: number; shadow: { yPx: number; blurPx: number; opacity: number }; labelColor: string }
  padding: { regular: { yPx: number; xPx: number }; recommended: { yPx: number; xPx: number } }
  name: { px: number; recommendedPx: number }
  tagline: { px: number; gapPx: number }
  amount: { px: number; recommendedPx: number; gapPx: number; recommendedGapPx: number }
  period: { px: number; gapPx: number }
  feature: { px: number; lineHeight: number; rowPaddingPx: number; ruleStrokePx: number; gapPx: number; recommendedGapPx: number }
  label: { px: number; gapPx: number }
  features: { min: number; max: number }
}

type StageCardsTokens = {
  stage: StageTokens
  platform: PlatformTokens
  perspectivePx: number
  originPx: [number, number]
  cards: { cxPx: number; topPx: number; widthPx: number; rotateYDeg: number; lead?: boolean }[]
  padding: { lead: number[]; side: number[] }
  radiusPx: { lead: number; side: number }
  name: { leadPx: number; px: number }
  tagline: { leadPx: number; px: number; gapPx: number; leadColor: string; color: string }
  amount: { leadPx: number; px: number; gapPx: number; leadGapPx: number }
  period: { px: number; gapPx: number }
  feature: { leadPx: number; px: number; lineHeight: number; rowPaddingPx: { lead: number; side: number }; gapPx: { lead: number; side: number }; ruleStrokePx: number; leadRule: string; sideRuleOpacity: number; leadColor: string; color: string }
  label: { px: number; gapPx: number; color: string }
  lead: { border: { px: number; color: string; opacity: number }; halo: { blurPx: number; opacity: number }; shadow: { yPx: number; blurPx: number; color: string; opacity: number } }
  side: { fill: [string, string]; angleDeg: number; border: { px: number; opacity: number }; halo: { blurPx: number; opacity: number }; shadow: { yPx: number; blurPx: number; color: string; opacity: number } }
  reflection: { gapPx: number; fromStop: number; opacity: number }
}

type LiveTokens = {
  stage: StageTokens
  platform: PlatformTokens
  document: {
    xPx: number
    yPx: number
    widthPx: number
    padding: number[]
    radiusPx: number
    perspectivePx: number
    rotateYDeg: number
    header: { tilePx: number; tileRadiusPx: number; isotypePx: number; gapPx: number; kickerGapPx: number }
    kicker: { px: number; color: string }
    title: { px: number }
    rows: { gapTopPx: number; paddingYPx: number; ruleStrokePx: number; gapPx: number; tilePx: number; tileRadiusPx: number; max: number; number: { px: number }; name: { px: number }; desc: { px: number; gapPx: number }; amount: { px: number } }
    total: { paddingTopPx: number; ruleStrokePx: number; label: { px: number }; amount: { px: number; gapPx: number }; tax: { px: number; gapPx: number } }
    cta: { px: number; padding: { yPx: number; xPx: number }; radiusPx: number }
  }
  chips: { xPx: number; yPx: number; rotateYDeg: number }[]
  chip: { perspectivePx: number; padding: { yPx: number; xPx: number }; radiusPx: number; kicker: { px: number }; text: { px: number; gapPx: number } }
}

type PlanIntent = { name?: unknown; tagline?: unknown; features?: unknown[] }

/** La plataforma elíptica del estilo «vivo»: el relleno de luz, su anillo y el arco del frente. */
export const platformSvg = (manifest: SurfaceManifest, platform: PlatformTokens, idPrefix: string): string => {
  const { cxPx: cx, cyPx: cy, rxPx: rx, ryPx: ry } = platform
  const stops = platform.fill.stops.map(stop => `<stop offset="${n(stop.at)}" stop-color="${paletteColor(stop.color, 'la plataforma')}" stop-opacity="${n(stop.opacity)}"/>`).join('')
  const from = { x: cx + rx * platform.arc.from[0], y: cy + ry * platform.arc.from[1] }
  const to = { x: cx + rx * platform.arc.to[0], y: cy + ry * platform.arc.to[1] }
  const arcColor = paletteColor(platform.arc.color, 'el arco de la plataforma')
  const path = `M ${n(from.x)} ${n(from.y)} A ${n(rx)} ${n(ry)} 0 0 0 ${n(to.x)} ${n(to.y)}`

  return (
    svgOpen(manifest) +
    `<defs><radialGradient id="${idPrefix}-pf" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${n(cy * (1 - ry / rx))}) scale(1 ${n(ry / rx)})">${stops}</radialGradient>` +
    `<filter id="${idPrefix}-pfg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${n(platform.arc.glow.blurPx)}"/></filter></defs>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="url(#${idPrefix}-pf)"/>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${paletteColor(platform.ring.color, 'el anillo de la plataforma')}" stroke-opacity="${n(platform.ring.opacity)}" stroke-width="${n(platform.ring.strokePx)}"/>` +
    `<path d="${path}" fill="none" stroke="${arcColor}" stroke-width="${n(platform.arc.glow.strokePx)}" opacity="${n(platform.arc.glow.opacity)}" filter="url(#${idPrefix}-pfg)"/>` +
    `<path d="${path}" fill="none" stroke="${arcColor}" stroke-width="${n(platform.arc.strokePx)}" stroke-linecap="round"/>` +
    '</svg>'
  )
}

/** La voz en flujo de las láminas «vivas»: la respuesta cuelga de la pregunta y la bajada, de la respuesta. */
type AnswerShadow = { yPx: number; blurPx: number; opacity: number }

const flowVoiceFrame = (manifest: SurfaceManifest, prefix: string, answerLines: number, shadow: AnswerShadow) => {
  const question = typeOf(manifest, 'question')
  const questionTop = topOf(manifest, 'question')
  const answer = typeOf(manifest, 'answer')
  const body = typeOf(manifest, 'body')
  const answerRange = measured(reserve(manifest, 'answer')?.fromTopRange, 'la altura de la respuesta')
  const height = manifest.canvas.height
  const questionLine = fixedPx(question, 'la pregunta') * measured(question.lineHeight, 'el interlineado de la pregunta')
  const answerPx = fixedPx(answer, 'la respuesta')
  const answerLeading = measured(answer.lineHeight, 'el interlineado de la respuesta')
  // Con la pregunta en una línea, la respuesta y la bajada caen donde las midió AXIS; con dos, bajan juntas.
  const answerGap = Math.round(answerRange[0] * height) - questionTop - questionLine
  const bodyGap = topOf(manifest, 'body') - Math.round(answerRange[0] * height) - answerLines * answerPx * answerLeading

  return {
    margin: measured(manifest.safeArea?.marginPx, 'el margen del deck'),
    eyebrowTop: topOf(manifest, 'eyebrow'),
    questionTop,
    bodyPx: fixedPx(body, 'la bajada'),
    bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada'),
    questionWidth: css(`${prefix}-question-width`, measured(question.maxWidthPx, 'el ancho de la pregunta')),
    answerGap: css(`${prefix}-answer-gap`, answerGap),
    bodyGap: css(`${prefix}-body-gap`, bodyGap),
    answerSize: css(`${prefix}-answer-px`, answerPx),
    answerLeading: css(`${prefix}-answer-leading`, answerLeading, ''),
    answerShadowY: css(`${prefix}-answer-shadow-y`, shadow.yPx),
    answerShadowBlur: css(`${prefix}-answer-shadow-blur`, shadow.blurPx),
    answerShadowOpacity: css(`${prefix}-answer-shadow-opacity`, shadow.opacity * 100, '%')
  }
}

/** Los planes del intent, con sus prestaciones; el rótulo del recomendado va SÓLO en su plan (en los demás no existe). */
const plansOf = (intent: Record<string, unknown>, count: number, features: { min: number; max: number }, recommended: number) => {
  const plans = (Array.isArray(intent.plans) ? intent.plans : []) as PlanIntent[]

  if (plans.length !== count) throw new SurfacePieceError(`La cotización lleva ${count} planes (\`plans\`).`, 'invalid-intent')

  return plans.map((plan, i) => {
    const list = Array.isArray(plan.features) ? plan.features : []

    if (list.length < features.min || list.length > features.max) {
      throw new SurfacePieceError(`El plan ${i + 1} lleva de ${features.min} a ${features.max} prestaciones.`, 'invalid-intent')
    }

    return {
      ...(i + 1 === recommended ? { label: text(intent.recommendedLabel, 'El rótulo del plan recomendado (`recommendedLabel`)') } : {}),
      name: text(plan.name, `El nombre del plan ${i + 1}`),
      tagline: text(plan.tagline, `La bajada del plan ${i + 1}`),
      amount: AMOUNT,
      period: text(intent.period, 'El periodo de los montos (`period`, p. ej. «al mes · neto + IVA»)'),
      features: list.map((feature, j) => ({ text: text(feature, `La prestación ${j + 1} del plan ${i + 1}`) }))
    }
  })
}

export const contentPricing: RecipeBuilder = ctx => {
  const layout = ctx.manifest.layout ?? 'table'

  if (layout === 'stage') return pricingStage(ctx)
  if (layout === 'live') return pricingLive(ctx)
  if (layout !== 'table') throw new SurfacePieceError(`\`content-pricing\` no tiene plantilla para la composición «${layout}».`, 'recipe-without-template')

  return pricingTable(ctx)
}

/** `table`: Basic · Pro · Enterprise en una fila; el recomendado sube, crece y va en papel con la selección de Finanzas. */
const pricingTable: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const plans = measured(recipe.plans as PlansTokens | undefined, 'los planes de la cotización')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (!content.body) throw new SurfacePieceError('La cotización lleva su bajada (`body`).', 'invalid-intent')

  const recommended = choice(intent.recommended, plans.count, 'El plan recomendado (`recommended`)')
  const items = plansOf(intent, plans.count, plans.features, recommended)
  const body = typeOf(manifest, 'body')
  const legal = typeOf(manifest, 'legal')
  const selection = selectionSlot(manifest)

  return {
    slots: {
      frame: {
        line: intent.line,
        margin: measured(manifest.safeArea?.marginPx, 'el margen del deck'),
        eyebrowTop: topOf(manifest, 'eyebrow'),
        questionTop: topOf(manifest, 'question'),
        answerTop: topOf(manifest, 'answer'),
        answerPx: fixedPx(typeOf(manifest, 'answer'), 'la respuesta'),
        bodyTop: topOf(manifest, 'body'),
        bodyPx: fixedPx(body, 'la bajada'),
        bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada'),
        legalTop: css('pt-legal-top', topOf(manifest, 'legal')),
        legalPx: css('pt-legal-px', fixedPx(legal, 'la nota legal')),
        plansLeft: css('pt-plans-left', plans.xPx),
        plansTop: css('pt-plans-top', plans.topPx),
        planWidth: css('pt-plan-width', plans.widthPx),
        planHeight: css('pt-plan-height', plans.heightPx),
        planGap: css('pt-plan-gap', plans.gapPx),
        planRadius: css('pt-plan-radius', plans.radiusPx),
        liftPx: css('pt-lift', plans.recommended.liftPx),
        extraHeight: css('pt-extra-height', plans.recommended.extraHeightPx),
        shadowY: css('pt-shadow-y', plans.recommended.shadow.yPx),
        shadowBlur: css('pt-shadow-blur', plans.recommended.shadow.blurPx),
        shadowOpacity: css('pt-shadow-opacity', plans.recommended.shadow.opacity * 100, '%'),
        labelColor: colorVar('pt-label', paletteColor(plans.recommended.labelColor, 'el rótulo del recomendado')),
        padY: css('pt-pad-y', plans.padding.regular.yPx),
        padX: css('pt-pad-x', plans.padding.regular.xPx),
        recPadY: css('pt-rec-pad-y', plans.padding.recommended.yPx),
        namePx: css('pt-name-px', plans.name.px),
        recNamePx: css('pt-rec-name-px', plans.name.recommendedPx),
        taglinePx: css('pt-tagline-px', plans.tagline.px),
        taglineGap: css('pt-tagline-gap', plans.tagline.gapPx),
        amountPx: css('pt-amount-px', plans.amount.px),
        recAmountPx: css('pt-rec-amount-px', plans.amount.recommendedPx),
        amountGap: css('pt-amount-gap', plans.amount.gapPx),
        recAmountGap: css('pt-rec-amount-gap', plans.amount.recommendedGapPx),
        periodPx: css('pt-period-px', plans.period.px),
        periodGap: css('pt-period-gap', plans.period.gapPx),
        featurePx: css('pt-feature-px', plans.feature.px),
        featurePad: css('pt-feature-pad', plans.feature.rowPaddingPx),
        featureRule: css('pt-feature-rule', plans.feature.ruleStrokePx),
        featuresGap: css('pt-features-gap', plans.feature.gapPx),
        recFeaturesGap: css('pt-rec-features-gap', plans.feature.recommendedGapPx),
        labelPx: css('pt-label-px', plans.label.px),
        labelGap: css('pt-label-gap', plans.label.gapPx),
        recommended: String(recommended)
      },
      voice,
      body: content.body,
      legal: text(intent.legal, 'La nota legal de la cotización (`legal`)'),
      plans: items,
      ...(selection ? { selection: { ...selection, item: recommended } } : {})
    },
    assets: []
  }
}

/** `stage`: las tres fichas en perspectiva sobre la plataforma de luz; la recomendada al frente, al centro. */
const pricingStage: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const stage = measured(recipe.stage as StageCardsTokens | undefined, 'el escenario de la cotización')
  const plans = measured(recipe.plans as PlansTokens | undefined, 'los planes de la cotización')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (!content.body) throw new SurfacePieceError('La cotización lleva su bajada (`body`).', 'invalid-intent')

  const lead = stage.cards.findIndex(card => card.lead) + 1
  const recommended = choice(intent.recommended, plans.count, 'El plan recomendado (`recommended`)')

  if (recommended !== lead) throw new SurfacePieceError(`En el escenario, el plan recomendado va al frente (el ${lead}).`, 'invalid-intent')

  const items = plansOf(intent, stage.cards.length, plans.features, recommended)
  const bg = layerAsset('content-pricing-stage-bg', stageSvg(manifest, stage.stage, 'pcs'))
  const platform = layerAsset('content-pricing-stage-platform', platformSvg(manifest, stage.platform, 'pcs'))
  const legal = typeOf(manifest, 'legal')

  const lum = (recipe.layouts as Record<string, { signature?: { urlBubble?: { widthPx?: number; bottomPx?: number } } }>).stage?.signature?.urlBubble

  const frame: Record<string, unknown> = {
    line: intent.line,
    ...flowVoiceFrame(manifest, 'flow', voice.answerLead ? 2 : 1, measured(recipe.answerShadow as AnswerShadow | undefined, 'la sombra de la respuesta')),
    legalPx: css('pcs-legal-px', fixedPx(legal, 'la nota legal')),
    legalGap: css('pcs-legal-gap', measured((recipe.layouts as Record<string, { type?: Record<string, { gapPx?: number }> }>).stage?.type?.legal?.gapPx, 'el aire de la nota legal')),
    perspective: css('pcs-perspective', stage.perspectivePx),
    originX: css('pcs-origin-x', stage.originPx[0]),
    originY: css('pcs-origin-y', stage.originPx[1]),
    leadPad: `--gl-pcs-lead-pad-top=${stage.padding.lead[0]}px`,
    leadRadius: css('pcs-lead-radius', stage.radiusPx.lead),
    sideRadius: css('pcs-side-radius', stage.radiusPx.side),
    leadNamePx: css('pcs-lead-name-px', stage.name.leadPx),
    namePx: css('pcs-name-px', stage.name.px),
    leadTaglinePx: css('pcs-lead-tagline-px', stage.tagline.leadPx),
    taglinePx: css('pcs-tagline-px', stage.tagline.px),
    taglineGap: css('pcs-tagline-gap', stage.tagline.gapPx),
    leadTaglineColor: colorVar('pcs-lead-tagline', paletteColor(stage.tagline.leadColor, 'la bajada del plan al frente')),
    taglineColor: colorVar('pcs-tagline', paletteColor(stage.tagline.color, 'la bajada de los planes')),
    leadAmountPx: css('pcs-lead-amount-px', stage.amount.leadPx),
    amountPx: css('pcs-amount-px', stage.amount.px),
    amountGap: css('pcs-amount-gap', stage.amount.gapPx),
    leadAmountGap: css('pcs-lead-amount-gap', stage.amount.leadGapPx),
    periodPx: css('pcs-period-px', stage.period.px),
    periodGap: css('pcs-period-gap', stage.period.gapPx),
    leadFeaturePx: css('pcs-lead-feature-px', stage.feature.leadPx),
    featurePx: css('pcs-feature-px', stage.feature.px),
    leadFeaturePad: css('pcs-lead-feature-pad', stage.feature.rowPaddingPx.lead),
    featurePad: css('pcs-feature-pad', stage.feature.rowPaddingPx.side),
    leadFeaturesGap: css('pcs-lead-features-gap', stage.feature.gapPx.lead),
    featuresGap: css('pcs-features-gap', stage.feature.gapPx.side),
    featureRule: css('pcs-feature-rule', stage.feature.ruleStrokePx),
    leadRuleColor: colorVar('pcs-lead-rule', paletteColor(stage.feature.leadRule, 'el filete del plan al frente')),
    sideRuleOpacity: css('pcs-side-rule-opacity', stage.feature.sideRuleOpacity * 100, '%'),
    leadFeatureColor: colorVar('pcs-lead-feature', paletteColor(stage.feature.leadColor, 'las prestaciones del plan al frente')),
    featureColor: colorVar('pcs-feature', paletteColor(stage.feature.color, 'las prestaciones')),
    labelPx: css('pcs-label-px', stage.label.px),
    labelGap: css('pcs-label-gap', stage.label.gapPx),
    labelColor: colorVar('pcs-label', paletteColor(stage.label.color, 'el rótulo del recomendado')),
    haloColor: colorVar('pcs-halo', paletteColor('halo', 'el halo')),
    leadBorder: css('pcs-lead-border', stage.lead.border.px),
    leadBorderOpacity: css('pcs-lead-border-opacity', stage.lead.border.opacity * 100, '%'),
    leadHaloBlur: css('pcs-lead-halo-blur', stage.lead.halo.blurPx),
    leadHaloOpacity: css('pcs-lead-halo-opacity', stage.lead.halo.opacity * 100, '%'),
    shadowColor: colorVar('pcs-shadow', paletteColor(stage.lead.shadow.color, 'la sombra de las fichas')),
    shadowY: css('pcs-shadow-y', stage.lead.shadow.yPx),
    shadowBlur: css('pcs-shadow-blur', stage.lead.shadow.blurPx),
    shadowOpacity: css('pcs-shadow-opacity', stage.lead.shadow.opacity * 100, '%'),
    sideFillFrom: colorVar('pcs-side-from', paletteColor(stage.side.fill[0], 'las fichas laterales')),
    sideFillTo: colorVar('pcs-side-to', paletteColor(stage.side.fill[1], 'las fichas laterales')),
    sideAngle: css('pcs-side-angle', stage.side.angleDeg, 'deg'),
    sideBorderOpacity: css('pcs-side-border-opacity', stage.side.border.opacity * 100, '%'),
    sideHaloBlur: css('pcs-side-halo-blur', stage.side.halo.blurPx),
    sideHaloOpacity: css('pcs-side-halo-opacity', stage.side.halo.opacity * 100, '%'),
    reflectGap: css('pcs-reflect-gap', stage.reflection.gapPx),
    reflectFrom: css('pcs-reflect-from', stage.reflection.fromStop * 100, '%'),
    reflectOpacity: css('pcs-reflect-opacity', stage.reflection.opacity * 100, '%'),
    lumWidth: css('lum-width', measured(lum?.widthPx, 'la burbuja en luminosidad')),
    lumBottom: css('lum-bottom', measured(lum?.bottomPx, 'la burbuja en luminosidad')),
    recommended: String(recommended),
    ...documentVars((recipe as unknown as { glass: Glass }).glass, 'pcs')
  }

  stage.cards.forEach((card, i) => {
    const pad = card.lead ? stage.padding.lead : stage.padding.side

    frame[`card${i + 1}Left`] = css(`pcs-card${i + 1}-left`, card.cxPx - card.widthPx / 2)
    frame[`card${i + 1}Top`] = css(`pcs-card${i + 1}-top`, card.topPx)
    frame[`card${i + 1}Width`] = css(`pcs-card${i + 1}-width`, card.widthPx)
    frame[`card${i + 1}Rotate`] = css(`pcs-card${i + 1}-rotate`, card.rotateYDeg, 'deg')
    frame[`card${i + 1}PadTop`] = css(`pcs-card${i + 1}-pad-top`, pad[0]!)
    frame[`card${i + 1}PadX`] = css(`pcs-card${i + 1}-pad-x`, pad[1]!)
    frame[`card${i + 1}PadBottom`] = css(`pcs-card${i + 1}-pad-bottom`, pad[2]!)
  })

  delete frame.leadPad

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.content-pricing.stage',
    slots: {
      frame,
      stage: { src: bg.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      legal: text(intent.legal, 'La nota legal de la cotización (`legal`)'),
      plans: items,
      ...(selection ? { selection: { ...selection, item: recommended } } : {})
    },
    assets: [bg.asset, platform.asset]
  }
}

type QuoteIntent = { kicker?: unknown; title?: unknown; lines?: { name?: unknown; desc?: unknown; period?: unknown }[]; totalLabel?: unknown; tax?: unknown; cta?: unknown }

/** `live`: la cotización como el cliente la recibe, cada línea a la vista, el total y el cursor en el botón. */
const pricingLive: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const live = measured(recipe.live as LiveTokens | undefined, 'la cotización en vivo')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (!content.body) throw new SurfacePieceError('La cotización lleva su bajada (`body`).', 'invalid-intent')

  const quote = (intent.quote ?? {}) as QuoteIntent
  const lines = Array.isArray(quote.lines) ? quote.lines : []
  const doc = live.document

  if (lines.length < 1 || lines.length > doc.rows.max) throw new SurfacePieceError(`La cotización en vivo lleva de 1 a ${doc.rows.max} líneas (\`quote.lines\`).`, 'invalid-intent')

  const chips = (Array.isArray(intent.chips) ? intent.chips : []) as { kicker?: unknown; text?: unknown }[]

  if (chips.length !== live.chips.length) throw new SurfacePieceError(`La cotización en vivo lleva ${live.chips.length} notas (\`chips\`).`, 'invalid-intent')

  const bg = layerAsset('content-pricing-live-bg', stageSvg(manifest, live.stage, 'pl'))
  const platform = layerAsset('content-pricing-live-platform', platformSvg(manifest, live.platform, 'pl'))
  const glass = (recipe as unknown as { glass: Glass }).glass
  const lum = (recipe.layouts as Record<string, { signature?: { urlBubble?: { widthPx?: number; bottomPx?: number } } }>).live?.signature?.urlBubble

  const frame: Record<string, unknown> = {
    line: intent.line,
    ...flowVoiceFrame(manifest, 'flow', voice.answerLead ? 2 : 1, measured(recipe.answerShadow as AnswerShadow | undefined, 'la sombra de la respuesta')),
    docLeft: css('pv-doc-left', doc.xPx),
    docTop: css('pv-doc-top', doc.yPx),
    docWidth: css('pv-doc-width', doc.widthPx),
    docPadTop: css('pv-doc-pad-top', doc.padding[0]!),
    docPadX: css('pv-doc-pad-x', doc.padding[1]!),
    docPadBottom: css('pv-doc-pad-bottom', doc.padding[2]!),
    docRadius: css('pv-doc-radius', doc.radiusPx),
    docPerspective: css('pv-doc-perspective', doc.perspectivePx),
    docRotate: css('pv-doc-rotate', doc.rotateYDeg, 'deg'),
    tileSize: css('pv-tile', doc.header.tilePx),
    tileRadius: css('pv-tile-radius', doc.header.tileRadiusPx),
    isotypeSize: css('pv-isotype', doc.header.isotypePx),
    headerGap: css('pv-header-gap', doc.header.gapPx),
    kickerGap: css('pv-kicker-gap', doc.header.kickerGapPx),
    kickerPx: css('pv-kicker-px', doc.kicker.px),
    kickerColor: colorVar('pv-kicker', paletteColor(doc.kicker.color, 'el kicker de la cotización')),
    titlePx: css('pv-title-px', doc.title.px),
    rowsGapTop: css('pv-rows-gap-top', doc.rows.gapTopPx),
    rowPad: css('pv-row-pad', doc.rows.paddingYPx),
    rowRule: css('pv-row-rule', doc.rows.ruleStrokePx),
    rowGap: css('pv-row-gap', doc.rows.gapPx),
    rowTile: css('pv-row-tile', doc.rows.tilePx),
    rowTileRadius: css('pv-row-tile-radius', doc.rows.tileRadiusPx),
    rowNumberPx: css('pv-row-number-px', doc.rows.number.px),
    rowNamePx: css('pv-row-name-px', doc.rows.name.px),
    rowDescPx: css('pv-row-desc-px', doc.rows.desc.px),
    rowDescGap: css('pv-row-desc-gap', doc.rows.desc.gapPx),
    rowAmountPx: css('pv-row-amount-px', doc.rows.amount.px),
    totalPad: css('pv-total-pad', doc.total.paddingTopPx),
    totalRule: css('pv-total-rule', doc.total.ruleStrokePx),
    totalLabelPx: css('pv-total-label-px', doc.total.label.px),
    totalAmountPx: css('pv-total-amount-px', doc.total.amount.px),
    totalAmountGap: css('pv-total-amount-gap', doc.total.amount.gapPx),
    taxPx: css('pv-tax-px', doc.total.tax.px),
    taxGap: css('pv-tax-gap', doc.total.tax.gapPx),
    ctaPx: css('pv-cta-px', doc.cta.px),
    ctaPadY: css('pv-cta-pad-y', doc.cta.padding.yPx),
    ctaPadX: css('pv-cta-pad-x', doc.cta.padding.xPx),
    ctaRadius: css('pv-cta-radius', doc.cta.radiusPx),
    chipPerspective: css('pv-chip-perspective', live.chip.perspectivePx),
    chipPadY: css('pv-chip-pad-y', live.chip.padding.yPx),
    chipPadX: css('pv-chip-pad-x', live.chip.padding.xPx),
    chipRadius: css('pv-chip-radius', live.chip.radiusPx),
    chipKickerPx: css('pv-chip-kicker-px', live.chip.kicker.px),
    chipTextPx: css('pv-chip-text-px', live.chip.text.px),
    chipTextGap: css('pv-chip-text-gap', live.chip.text.gapPx),
    haloColor: colorVar('pv-halo', paletteColor('halo', 'el halo')),
    lumWidth: css('lum-width', measured(lum?.widthPx, 'la burbuja en luminosidad')),
    lumBottom: css('lum-bottom', measured(lum?.bottomPx, 'la burbuja en luminosidad')),
    ...documentVars(glass, 'pv'),
    ...darkGlassVars(measured(glass.dark, 'el vidrio oscuro'), 'pv')
  }

  live.chips.forEach((chip, i) => {
    frame[`chip${i + 1}Left`] = css(`pv-chip${i + 1}-left`, chip.xPx)
    frame[`chip${i + 1}Top`] = css(`pv-chip${i + 1}-top`, chip.yPx)
    frame[`chip${i + 1}Rotate`] = css(`pv-chip${i + 1}-rotate`, chip.rotateYDeg, 'deg')
  })

  const cursorScale = measured(
    (recipe.layouts as Record<string, { selection?: { collaboratorScale?: number } }>).live?.selection?.collaboratorScale,
    'la escala del cursor del lector'
  )

  return {
    contentType: 'deck.content-pricing.live',
    slots: {
      frame,
      stage: { src: bg.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      quote: {
        kicker: text(quote.kicker, 'El kicker de la cotización (`quote.kicker`)'),
        title: text(quote.title, 'El título de la cotización (`quote.title`)'),
        totalLabel: text(quote.totalLabel, 'El rótulo del total (`quote.totalLabel`)'),
        total: AMOUNT,
        tax: text(quote.tax, 'La nota del impuesto (`quote.tax`)')
      },
      lines: lines.map((line, i) => ({
        number: String(i + 1),
        name: text(line?.name, `El nombre de la línea ${i + 1}`),
        desc: text(line?.desc, `La descripción de la línea ${i + 1}`),
        amount: `${AMOUNT} ${text(line?.period, `El periodo de la línea ${i + 1} (\`/ mes\`, \`· único\`)`)}`
      })),
      chips: chips.map((chip, i) => ({ kicker: text(chip.kicker, `El kicker de la nota ${i + 1}`), text: text(chip.text, `El texto de la nota ${i + 1}`) })),
      cta: { text: text(quote.cta, 'El botón de la cotización (`quote.cta`)'), cursorScale }
    },
    assets: [bg.asset, platform.asset]
  }
}

export const CLOSE_BUILDERS: Record<string, RecipeBuilder> = {
  breather,
  'decision-next-steps': decisionNextSteps,
  'content-pricing': contentPricing
}
