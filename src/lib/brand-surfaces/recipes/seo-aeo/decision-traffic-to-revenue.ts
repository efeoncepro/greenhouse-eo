/**
 * `decision-traffic-to-revenue` (TASK-1934): «¿Dónde termina el SEO? En ingresos.». Cuatro escalones de vidrio que
 * suben (tráfico calificado → leads → pipeline → ingresos), el último iluminado; la línea base, el corte punteado tras
 * el primero con su rótulo («la mayoría de las agencias se detiene aquí») y la trayectoria de luz que une las cimas y
 * termina en la esfera sobre el último escalón: la ÚNICA órbita de la lámina, pintada como capa SVG. Referencia:
 * DeckTraficoNegocio (MD3-trafico-negocio).
 *
 * Todo sale de AXIS: la voz «viva», de las reservas y tipos del manifest y del token (`liveVoiceFrame`); el escenario,
 * los escalones, la base, el corte y la trayectoria, de `steps`, `base`, `cut`, `trajectory` y `stage` de la receta;
 * el color del título de cada escalón, del manifest (`steps.items[].title.color`). El CONTENIDO (los cuatro escalones
 * y el rótulo del corte) llega en el intent: AXIS exige el nombre de cada escalón (`steps[].name`) y este builder, su
 * número, descripción y canal, y que sean exactamente los de la composición medida.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import type { SurfaceAssetRequest } from '../../types'
import { SurfacePieceError } from '../../types'
import { contentOf, voiceSlots, type SurfaceManifest } from '../../shared'

import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured, n, paletteColor, stageSvg, svgOpen, text, type StageTokens } from '../kit'
import { liveVoiceFrame } from '../sections'

type Tone = { px: number; color: string; opacity: number }

type StepsTokens = {
  layouts: Record<string, { count: number }>
  xPx: number
  widthPx: number
  gapPx: number
  baseYPx: number
  heightPx: number
  risePx: number
  padding: number
  radiusPx: [number, number, number, number]
  angleDeg: number
  fill: { from: { color: string; opacity: number; stepOpacity: number }; to: string; lead: [string, string] }
  border: { lead: Tone; rest: Tone }
  shadow: { yPx: number; blurPx: number; color: string; opacity: number }
  glow: { lead: { blurPx: number; opacity: number }; rest: { blurPx: number; opacity: number } }
  number: { px: number; weight: number; lineHeight: number; color: string; leadColor: string }
  title: { leadPx: number; px: number; lineHeight: number; tracking: string; gapPx: number }
  desc: { px: number; weight: number; lineHeight: number; gapPx: number; color: string }
  channel: { px: number; weight: number; tracking: string; insetPx: number; bottomPx: number; color: string; leadColor: string }
}

type BaseTokens = { outsetPx: number; rule: Tone }

type CutTokens = {
  afterStep: number
  fromYPx: number
  belowBasePx: number
  strokePx: number
  dash: number[]
  color: string
  opacity: number
  label: { topPx: number; widthPx: number; gapPx: number; px: number; weight: number; lineHeight: number; color: string; align: string }
}

type TrajectoryTokens = {
  liftPx: number
  leadInPx: [number, number]
  gradient: { from: { color: string; opacity: number }; to: string }
  strokePx: number
  glow: { strokePx: number; opacity: number; blurPx: number }
  dots: { radiusPx: number; color: string; opacity: number }
  sphere: { radiusPx: number; glow: { radiusPx: number; blurPx: number } }
}

type StepIntent = { number?: unknown; name?: unknown; description?: unknown; channel?: unknown }

/** El gris suave de la voz sobre oscuro (`slogan.leadColor.onDark`): el `soft` de los tokens de la receta. */
const SOFT_ON_DARK = (efeonceGraphicLine as unknown as { slogan: { leadColor: { onDark: string } } }).slogan.leadColor.onDark

const tone = (value: string, what: string): string => (value === 'soft' ? SOFT_ON_DARK : paletteColor(value, what))

/** Un tracking de AXIS en em, como custom property, con su precisión (`css` redondea a centésimas: -0.025em no cabe). */
const trackingVar = (name: string, value: string, what: string): string => {
  const match = /^(-?\d+(?:\.\d+)?)em$/.exec(value.trim())

  if (!match) throw new SurfacePieceError(`AXIS no midió ${what} en em.`, 'invalid-intent')

  return `--gl-${name}=${match[1]}em`
}

/** El alto de cada escalón: el primero mide `heightPx` y cada uno sube `risePx` sobre el anterior. */
const stepHeight = (steps: StepsTokens, i: number): number => steps.heightPx + i * steps.risePx

const stepLeft = (steps: StepsTokens, i: number): number => steps.xPx + i * (steps.widthPx + steps.gapPx)

/** El corte punteado: la vertical entre el escalón `afterStep` y el siguiente, del rótulo hasta bajo la base. */
const cutX = (steps: StepsTokens, cut: CutTokens): number => stepLeft(steps, cut.afterStep) - steps.gapPx / 2

const cutSvg = (manifest: SurfaceManifest, steps: StepsTokens, cut: CutTokens): string => {
  const x = cutX(steps, cut)

  return (
    svgOpen(manifest) +
    `<line x1="${n(x)}" y1="${n(cut.fromYPx)}" x2="${n(x)}" y2="${n(steps.baseYPx + cut.belowBasePx)}" stroke="${paletteColor(cut.color, 'el corte')}" stroke-opacity="${n(cut.opacity)}" stroke-width="${n(cut.strokePx)}" stroke-dasharray="${cut.dash.map(n).join(' ')}"/>` +
    '</svg>'
  )
}

/**
 * La trayectoria de luz (la órbita de la lámina): entra desde la izquierda del primer escalón, pasa por la cima de
 * cada uno y termina en la esfera sobre el último. Los puntos marcan las cimas intermedias; la esfera, la última.
 */
const trajectorySvg = (manifest: SurfaceManifest, steps: StepsTokens, trajectory: TrajectoryTokens, count: number): string => {
  const tops = Array.from({ length: count }, (_, i) => ({
    x: stepLeft(steps, i) + steps.widthPx / 2,
    y: steps.baseYPx - stepHeight(steps, i) - trajectory.liftPx
  }))

  const first = tops[0]!
  const last = tops[count - 1]!
  const d = `M ${n(first.x - trajectory.leadInPx[0])} ${n(first.y + trajectory.leadInPx[1])} ` + tops.map(p => `L ${n(p.x)} ${n(p.y)}`).join(' ')
  const to = paletteColor(trajectory.gradient.to, 'el final de la trayectoria')
  const from = paletteColor(trajectory.gradient.from.color, 'el inicio de la trayectoria')
  const dot = paletteColor(trajectory.dots.color, 'los puntos de la trayectoria')

  const dots = tops
    .slice(0, -1)
    .map(p => `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(trajectory.dots.radiusPx)}" fill="${dot}" fill-opacity="${n(trajectory.dots.opacity)}"/>`)
    .join('')

  return (
    svgOpen(manifest) +
    `<defs><linearGradient id="ttr-flow" x1="${n(steps.xPx)}" y1="0" x2="${n(steps.xPx + count * steps.widthPx)}" y2="0" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${from}" stop-opacity="${n(trajectory.gradient.from.opacity)}"/><stop offset="1" stop-color="${to}"/></linearGradient>` +
    `<filter id="ttr-flow-glow" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="${n(trajectory.glow.blurPx)}"/></filter>` +
    `<filter id="ttr-sphere-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${n(trajectory.sphere.glow.blurPx)}"/></filter></defs>` +
    `<path d="${d}" fill="none" stroke="url(#ttr-flow)" stroke-width="${n(trajectory.glow.strokePx)}" stroke-opacity="${n(trajectory.glow.opacity)}" stroke-linejoin="round" filter="url(#ttr-flow-glow)"/>` +
    `<path d="${d}" fill="none" stroke="url(#ttr-flow)" stroke-width="${n(trajectory.strokePx)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    dots +
    `<circle cx="${n(last.x)}" cy="${n(last.y)}" r="${n(trajectory.sphere.glow.radiusPx)}" fill="${to}" filter="url(#ttr-sphere-glow)"/>` +
    `<circle cx="${n(last.x)}" cy="${n(last.y)}" r="${n(trajectory.sphere.radiusPx)}" fill="${to}"/>` +
    '</svg>'
  )
}

export const decisionTrafficToRevenue: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const steps = measured(recipe.steps as StepsTokens | undefined, 'los escalones')
  const base = measured(recipe.base as BaseTokens | undefined, 'la línea base')
  const cut = measured(recipe.cut as CutTokens | undefined, 'el corte')
  const trajectory = measured(recipe.trajectory as TrajectoryTokens | undefined, 'la trayectoria')
  const signature = measured((recipe.signature as { urlBubble?: { widthPx: number; bottomPx: number } } | undefined)?.urlBubble, 'la burbuja en luminosidad')
  const resolved = (manifest as unknown as { steps?: { layout?: string; items?: { title?: { color?: string } }[] } }).steps
  const layout = measured(resolved?.layout, 'la composición de los escalones')
  const count = measured(steps.layouts[layout]?.count, `los escalones de la composición «${layout}»`)
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const items = (Array.isArray(intent.steps) ? intent.steps : []) as StepIntent[]

  if (items.length !== count) throw new SurfacePieceError(`Del tráfico al negocio va en ${count} escalones (\`steps\`); llegaron ${items.length}.`, 'invalid-intent')
  if (cut.afterStep < 1 || cut.afterStep >= count) throw new SurfacePieceError('El corte va entre dos escalones.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('Del tráfico al negocio lleva su bajada (`body`).', 'invalid-intent')

  const titleColor = measured(resolved?.items?.[0]?.title?.color, 'el color del título del escalón')
  const lead = count - 1
  const stage = layerAsset('decision-traffic-to-revenue-stage', stageSvg(manifest, measured(recipe.stage as StageTokens | undefined, 'el escenario'), 'ttr'))
  const cutLayer = layerAsset('decision-traffic-to-revenue-cut', cutSvg(manifest, steps, cut))
  const orbit = layerAsset('decision-traffic-to-revenue-trajectory', trajectorySvg(manifest, steps, trajectory, count))
  const assets: SurfaceAssetRequest[] = [stage.asset, cutLayer.asset, orbit.asset]
  const [radiusTl, radiusTr, radiusBr, radiusBl] = steps.radiusPx
  const cutLeft = cutX(steps, cut) - cut.label.gapPx - cut.label.widthPx
  const answerShadow = measured((recipe.answerShadow as { color?: string } | undefined)?.color, 'el color de la sombra de la respuesta')

  const frame = {
    line: intent.line,
    ...liveVoiceFrame(manifest, recipe, voice.question ?? '', 'ttr'),
    answerShadowColor: colorVar('ttr-answer-shadow', paletteColor(answerShadow, 'la sombra de la respuesta')),
    stepWidth: css('ttr-step-width', steps.widthPx),
    stepPad: css('ttr-step-pad', steps.padding),
    radiusTl: css('ttr-radius-tl', radiusTl),
    radiusTr: css('ttr-radius-tr', radiusTr),
    radiusBr: css('ttr-radius-br', radiusBr),
    radiusBl: css('ttr-radius-bl', radiusBl),
    angle: css('ttr-angle', steps.angleDeg, 'deg'),
    haloColor: colorVar('ttr-halo', paletteColor(steps.fill.from.color, 'el vidrio de los escalones')),
    fillTo: colorVar('ttr-fill-to', paletteColor(steps.fill.to, 'el vidrio de los escalones')),
    leadFrom: colorVar('ttr-lead-from', paletteColor(steps.fill.lead[0], 'el escalón iluminado')),
    leadTo: colorVar('ttr-lead-to', paletteColor(steps.fill.lead[1], 'el escalón iluminado')),
    leadBorder: css('ttr-lead-border', steps.border.lead.px),
    leadBorderColor: colorVar('ttr-lead-border', paletteColor(steps.border.lead.color, 'el filete del escalón iluminado')),
    leadBorderOpacity: css('ttr-lead-border-opacity', steps.border.lead.opacity * 100, '%'),
    restBorder: css('ttr-rest-border', steps.border.rest.px),
    restBorderColor: colorVar('ttr-rest-border', paletteColor(steps.border.rest.color, 'el filete de los escalones')),
    restBorderOpacity: css('ttr-rest-border-opacity', steps.border.rest.opacity * 100, '%'),
    shadowY: css('ttr-shadow-y', steps.shadow.yPx),
    shadowBlur: css('ttr-shadow-blur', steps.shadow.blurPx),
    shadowColor: colorVar('ttr-shadow', paletteColor(steps.shadow.color, 'la sombra de los escalones')),
    shadowOpacity: css('ttr-shadow-opacity', steps.shadow.opacity * 100, '%'),
    leadGlowBlur: css('ttr-lead-glow-blur', steps.glow.lead.blurPx),
    leadGlowOpacity: css('ttr-lead-glow-opacity', steps.glow.lead.opacity * 100, '%'),
    restGlowBlur: css('ttr-rest-glow-blur', steps.glow.rest.blurPx),
    restGlowOpacity: css('ttr-rest-glow-opacity', steps.glow.rest.opacity * 100, '%'),
    numberPx: css('ttr-number-px', steps.number.px),
    numberWeight: css('ttr-number-wght', steps.number.weight, ''),
    numberLeading: css('ttr-number-leading', measured(steps.number.lineHeight, 'el interlineado del número'), ''),
    numberColor: colorVar('ttr-number', tone(steps.number.color, 'el número del escalón')),
    leadNumberColor: colorVar('ttr-lead-number', tone(steps.number.leadColor, 'el número del escalón iluminado')),
    titlePx: css('ttr-title-px', steps.title.px),
    leadTitlePx: css('ttr-lead-title-px', steps.title.leadPx),
    titleLeading: css('ttr-title-leading', steps.title.lineHeight, ''),
    titleTracking: trackingVar('ttr-title-tracking', steps.title.tracking, 'el tracking del título'),
    titleGap: css('ttr-title-gap', steps.title.gapPx),
    titleColor: colorVar('ttr-title', paletteColor(titleColor, 'el título del escalón')),
    descPx: css('ttr-desc-px', steps.desc.px),
    descWeight: css('ttr-desc-wght', steps.desc.weight, ''),
    descLeading: css('ttr-desc-leading', steps.desc.lineHeight, ''),
    descGap: css('ttr-desc-gap', steps.desc.gapPx),
    descColor: colorVar('ttr-desc', tone(steps.desc.color, 'la descripción del escalón')),
    channelPx: css('ttr-channel-px', steps.channel.px),
    channelWeight: css('ttr-channel-wght', steps.channel.weight, ''),
    channelTracking: trackingVar('ttr-channel-tracking', steps.channel.tracking, 'el tracking del canal'),
    channelInset: css('ttr-channel-inset', steps.channel.insetPx),
    channelBottom: css('ttr-channel-bottom', steps.channel.bottomPx),
    channelColor: colorVar('ttr-channel', tone(steps.channel.color, 'el canal del escalón')),
    leadChannelColor: colorVar('ttr-lead-channel', tone(steps.channel.leadColor, 'el canal del escalón iluminado')),
    baseLeft: css('ttr-base-left', steps.xPx - base.outsetPx),
    baseTop: css('ttr-base-top', steps.baseYPx),
    baseWidth: css('ttr-base-width', count * steps.widthPx + (count - 1) * steps.gapPx + 2 * base.outsetPx),
    baseRule: css('ttr-base-rule', base.rule.px),
    baseColor: colorVar('ttr-base', paletteColor(base.rule.color, 'la línea base')),
    baseOpacity: css('ttr-base-opacity', base.rule.opacity * 100, '%'),
    cutLabelLeft: css('ttr-cut-left', cutLeft),
    cutLabelTop: css('ttr-cut-top', cut.label.topPx),
    cutLabelWidth: css('ttr-cut-width', cut.label.widthPx),
    cutLabelPx: css('ttr-cut-px', cut.label.px),
    cutLabelWeight: css('ttr-cut-wght', cut.label.weight, ''),
    cutLabelLeading: css('ttr-cut-leading', cut.label.lineHeight, ''),
    cutLabelColor: colorVar('ttr-cut', tone(cut.label.color, 'el rótulo del corte')),
    cutLabelAlign: cut.label.align,
    lumWidth: css('lum-width', signature.widthPx),
    lumBottom: css('lum-bottom', signature.bottomPx)
  }

  return {
    contentType: 'deck.decision-traffic-to-revenue',
    slots: {
      frame,
      stage: { src: stage.ref },
      cut: { src: cutLayer.ref },
      trajectory: { src: orbit.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      steps: items.map((step, i) => {
        const height = stepHeight(steps, i)

        return {
          role: i === lead ? 'lead' : 'rest',
          left: css('ttr-left', stepLeft(steps, i)),
          top: css('ttr-top', steps.baseYPx - height),
          height: css('ttr-height', height),
          z: css('ttr-z', i + 2, ''),
          fillOpacity: css('ttr-fill-opacity', (steps.fill.from.opacity + i * steps.fill.from.stepOpacity) * 100, '%'),
          number: text(step.number, `El número del escalón ${i + 1} (\`steps[${i}].number\`)`),
          title: text(step.name, `El nombre del escalón ${i + 1} (\`steps[${i}].name\`)`),
          description: text(step.description, `La descripción del escalón ${i + 1} (\`steps[${i}].description\`)`),
          channel: text(step.channel, `El canal del escalón ${i + 1} (\`steps[${i}].channel\`)`)
        }
      }),
      cutLabel: text(intent.cutLabel, 'El rótulo del corte (`cutLabel`)')
    },
    assets
  }
}
