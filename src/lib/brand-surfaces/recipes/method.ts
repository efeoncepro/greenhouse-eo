/**
 * Builders de la familia MÉTODO del deck (TASK-1928): `decision-plan` (la trayectoria del plan) y `method-score-ring`
 * (el anillo del puntaje). La escalera (`method-staircase`, con su composición `flat`) vive en `deck.ts`.
 *
 * Todo lo que pintan sale de AXIS: las reservas y la tipografía de la voz, del manifest; la geometría y la pintura de
 * la figura (la curva, las paradas y sus fichas; el anillo, sus segmentos y sus rótulos), de los tokens de la receta.
 * El CONTENIDO propio de cada lámina (las paradas del plan, las dimensiones del anillo) no lo modela el contrato: llega
 * en el intent y lo validan este builder y el contrato de slots de la plantilla.
 */

import { SurfacePieceError } from '../types'
import { contentOf, ofHeight, plateAsset, reserve, selectionSlot, voiceSlots, type SurfaceManifest } from '../shared'

import { progressIndicatorLayer, type RecipeBuilder } from './deck'
import { evidenceHtml } from './frame'
import {
  accentOf,
  colorVar,
  css,
  fixedPx,
  layerAsset,
  measured,
  n,
  paletteColor,
  stageSvg,
  svgOpen,
  text,
  topOf,
  typeOf,
  type Pt,
  type StageTokens
} from './kit'

/* ── decision-plan: la trayectoria ──────────────────────────────────────────────────────────────────────── */

type PlanTokens = {
  stops: number
  answerShadow: { yPx: number; blurPx: number; opacity: number }
  horizon: { xPx: number; yPx: number; px: number; tracking: string; color: string; opacity: number }
  stage: StageTokens
  trajectory: {
    p0: [number, number]
    control: [number, number]
    p2: [number, number]
    base: { strokePx: number; color: string; opacityFrom: number; opacityTo: number }
    lit: { tFrom: number; tTo: number; strokePx: number; glow: { strokePx: number; opacity: number; blurPx: number } }
  }
  stop: {
    t: number[]
    stemPx: number
    node: { current: { radiusPx: number; strokePx: number; glowBlurPx: number }; other: { radiusPx: number; strokePx: number; fill: string } }
    stem: { strokePx: number; otherOpacity: number }
    card: {
      widthPx: number
      radiusPx: number
      padding: { topPx: number; xPx: number; bottomPx: number }
      rangeGapPx: number
      descGapPx: number
      current: { fill: [string, string]; border: { px: number; color: string; opacity: number }; glow: { blurPx: number; opacity: number } }
      other: { fill: [string, string]; border: { px: number; color: string; opacity: number }; glow: { blurPx: number; opacity: number } }
      shadow: { yPx: number; blurPx: number; color: string; opacity: number }
      fillAngleDeg: number
    }
    type: {
      range: { px: number; weight: number; tracking: string; current: string; other: string; currentMarker: string }
      title: { px: number; tracking: string }
      desc: { px: number; weight: number; lineHeight: number; color: string }
    }
  }
}

type PlanStopIntent = { range?: unknown; title?: unknown; desc?: unknown }

/** El punto de la curva cuadrática en `t`. */
const bezier = (p0: Pt, c: Pt, p2: Pt, t: number): Pt => ({
  x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t ** 2 * p2.x,
  y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t ** 2 * p2.y
})

const trajectorySvg = (manifest: SurfaceManifest, plan: PlanTokens, accent: string, current: number, nodes: Pt[]): string => {
  const { trajectory, stop } = plan
  const [p0, c, p2] = [trajectory.p0, trajectory.control, trajectory.p2].map(([x, y]) => ({ x, y }))
  const halo = paletteColor(trajectory.base.color, 'la trayectoria')
  const steps = 30
  const lit = Array.from({ length: steps + 1 }, (_, i) => bezier(p0!, c!, p2!, trajectory.lit.tFrom + ((trajectory.lit.tTo - trajectory.lit.tFrom) * i) / steps))
  const litPath = lit.map((point, i) => `${i === 0 ? 'M' : 'L'} ${n(point.x)} ${n(point.y)}`).join(' ')
  const nodeHalo = paletteColor('halo', 'los nodos')

  const stems = nodes
    .map((node, i) => {
      const isCurrent = i === current

      return `<line x1="${n(node.x)}" y1="${n(node.y)}" x2="${n(node.x)}" y2="${n(node.y - stop.stemPx)}" stroke="${isCurrent ? accent : nodeHalo}" stroke-opacity="${isCurrent ? 1 : n(stop.stem.otherOpacity)}" stroke-width="${n(stop.stem.strokePx)}"/>`
    })
    .join('')

  const dots = nodes
    .map((node, i) =>
      i === current
        ? `<circle cx="${n(node.x)}" cy="${n(node.y)}" r="${n(stop.node.current.radiusPx)}" fill="${accent}" stroke="${nodeHalo}" stroke-width="${n(stop.node.current.strokePx)}" filter="url(#dp-node-glow)"/>`
        : `<circle cx="${n(node.x)}" cy="${n(node.y)}" r="${n(stop.node.other.radiusPx)}" fill="${paletteColor(stop.node.other.fill, 'el nodo')}" stroke="${nodeHalo}" stroke-width="${n(stop.node.other.strokePx)}"/>`
    )
    .join('')

  return (
    svgOpen(manifest) +
    '<defs>' +
    `<linearGradient id="dp-base" x1="${n(p0!.x)}" y1="${n(p0!.y)}" x2="${n(p2!.x)}" y2="${n(p2!.y)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${halo}" stop-opacity="${n(trajectory.base.opacityFrom)}"/><stop offset="1" stop-color="${halo}" stop-opacity="${n(trajectory.base.opacityTo)}"/></linearGradient>` +
    `<filter id="dp-lit-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${n(trajectory.lit.glow.blurPx)}"/></filter>` +
    `<filter id="dp-node-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${n(stop.node.current.glowBlurPx)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    '</defs>' +
    `<path d="M ${n(p0!.x)} ${n(p0!.y)} Q ${n(c!.x)} ${n(c!.y)} ${n(p2!.x)} ${n(p2!.y)}" fill="none" stroke="url(#dp-base)" stroke-width="${n(trajectory.base.strokePx)}"/>` +
    `<path d="${litPath}" fill="none" stroke="${accent}" stroke-opacity="${n(trajectory.lit.glow.opacity)}" stroke-width="${n(trajectory.lit.glow.strokePx)}" stroke-linecap="round" filter="url(#dp-lit-glow)"/>` +
    `<path d="${litPath}" fill="none" stroke="${accent}" stroke-width="${n(trajectory.lit.strokePx)}" stroke-linecap="round"/>` +
    stems +
    dots +
    '</svg>'
  )
}

export const decisionPlan: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const plan = measured(recipe.plan as PlanTokens | undefined, 'la trayectoria del plan')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta del plan va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('El plan lleva su bajada (`body`).', 'invalid-intent')

  const horizon = Number(intent.horizon)

  if (!Number.isInteger(horizon) || horizon <= 0) {
    throw new SurfacePieceError('El plan lleva su horizonte en días (`horizon`, un entero).', 'invalid-intent')
  }

  const stops = Array.isArray(intent.stops) ? (intent.stops as PlanStopIntent[]) : []

  if (stops.length !== plan.stops) throw new SurfacePieceError(`El plan lleva ${plan.stops} paradas (\`stops\`).`, 'invalid-intent')

  const current = Number(intent.currentStop)

  if (!Number.isInteger(current) || current < 1 || current > plan.stops) {
    throw new SurfacePieceError(`La parada actual (\`currentStop\`) va de 1 a ${plan.stops}.`, 'invalid-intent')
  }

  const { trajectory, stop } = plan
  const [p0, c, p2] = [trajectory.p0, trajectory.control, trajectory.p2].map(([x, y]) => ({ x, y }))
  const nodes = stop.t.map(t => bezier(p0!, c!, p2!, t))
  const accent = accentOf(intent.line)
  const { height } = manifest.canvas

  const stage = layerAsset(`decision-plan-stage`, stageSvg(manifest, plan.stage))
  const path = layerAsset(`decision-plan-trajectory-${intent.line}-${current}`, trajectorySvg(manifest, plan, accent, current - 1, nodes))

  // La respuesta cuelga de la pregunta: el aire entre ambas es el de la reserva con la pregunta en una línea.
  const question = typeOf(manifest, 'question')
  const questionTop = topOf(manifest, 'question')
  const answerRange = measured(reserve(manifest, 'answer')?.fromTopRange, 'la altura de la respuesta')
  const questionLine = fixedPx(question, 'la pregunta') * measured(question.lineHeight, 'el interlineado de la pregunta')
  const answerGap = ofHeight(manifest, answerRange[0]) - questionTop - questionLine
  const answer = typeOf(manifest, 'answer')
  const body = typeOf(manifest, 'body')
  const card = stop.card
  const halo = paletteColor('halo', 'el halo')
  const signature = recipe.signature as { urlBubble?: { form?: string; widthPx?: number; bottomPx?: number } } | undefined
  const lum = signature?.urlBubble

  if (lum?.form !== 'source-luminosity' || typeof lum.widthPx !== 'number' || typeof lum.bottomPx !== 'number') {
    throw new SurfacePieceError('AXIS no midió la burbuja en luminosidad del plan.', 'invalid-intent')
  }

  const lumSize = { widthPx: lum.widthPx, bottomPx: lum.bottomPx }

  const frame: Record<string, unknown> = {
    line: intent.line,
    margin: measured(manifest.safeArea?.marginPx, 'el margen del deck'),
    eyebrowTop: topOf(manifest, 'eyebrow'),
    questionTop,
    bodyTop: topOf(manifest, 'body'),
    bodyPx: fixedPx(body, 'la bajada'),
    bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada'),
    questionWidth: css('dp-question-width', measured(question.maxWidthPx, 'el ancho de la pregunta')),
    answerGap: css('dp-answer-gap', answerGap),
    answerSize: css('dp-answer-px', fixedPx(answer, 'la respuesta')),
    answerLeading: css('dp-answer-leading', measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
    answerShadowY: css('dp-answer-shadow-y', plan.answerShadow.yPx),
    answerShadowBlur: css('dp-answer-shadow-blur', plan.answerShadow.blurPx),
    answerShadowOpacity: css('dp-answer-shadow-opacity', plan.answerShadow.opacity * 100, '%'),
    horizonLeft: css('dp-horizon-left', plan.horizon.xPx),
    horizonTop: css('dp-horizon-top', plan.horizon.yPx),
    horizonPx: css('dp-horizon-px', plan.horizon.px),
    horizonOpacity: css('dp-horizon-opacity', plan.horizon.opacity, ''),
    haloColor: colorVar('dp-halo', halo),
    cardWidth: css('dp-card-width', card.widthPx),
    cardRadius: css('dp-card-radius', card.radiusPx),
    cardPadTop: css('dp-card-pad-top', card.padding.topPx),
    cardPadX: css('dp-card-pad-x', card.padding.xPx),
    cardPadBottom: css('dp-card-pad-bottom', card.padding.bottomPx),
    rangeGap: css('dp-range-gap', card.rangeGapPx),
    descGap: css('dp-desc-gap', card.descGapPx),
    rangePx: css('dp-range-px', stop.type.range.px),
    titlePx: css('dp-title-px', stop.type.title.px),
    descPx: css('dp-desc-px', stop.type.desc.px),
    descColor: colorVar('dp-desc', paletteColor(stop.type.desc.color, 'la descripción')),
    currentFillFrom: colorVar('dp-current-from', paletteColor(card.current.fill[0], 'la ficha actual')),
    currentFillTo: colorVar('dp-current-to', paletteColor(card.current.fill[1], 'la ficha actual')),
    otherFillFrom: colorVar('dp-other-from', paletteColor(card.other.fill[0], 'las fichas')),
    otherFillTo: colorVar('dp-other-to', paletteColor(card.other.fill[1], 'las fichas')),
    fillAngle: css('dp-fill-angle', card.fillAngleDeg, 'deg'),
    currentBorder: css('dp-current-border', card.current.border.px),
    currentBorderOpacity: css('dp-current-border-opacity', card.current.border.opacity * 100, '%'),
    currentGlowBlur: css('dp-current-glow-blur', card.current.glow.blurPx),
    currentGlowOpacity: css('dp-current-glow-opacity', card.current.glow.opacity * 100, '%'),
    otherBorder: css('dp-other-border', card.other.border.px),
    otherBorderOpacity: css('dp-other-border-opacity', card.other.border.opacity * 100, '%'),
    otherGlowBlur: css('dp-other-glow-blur', card.other.glow.blurPx),
    otherGlowOpacity: css('dp-other-glow-opacity', card.other.glow.opacity * 100, '%'),
    shadowColor: colorVar('dp-shadow', paletteColor(card.shadow.color, 'la sombra de las fichas')),
    shadowY: css('dp-shadow-y', card.shadow.yPx),
    shadowBlur: css('dp-shadow-blur', card.shadow.blurPx),
    shadowOpacity: css('dp-shadow-opacity', card.shadow.opacity * 100, '%'),
    currentStop: String(current),
    lumWidth: css('lum-width', lumSize.widthPx),
    lumBottom: css('lum-bottom', lumSize.bottomPx)
  }

  // Cada ficha, centrada sobre su nodo y apoyada en la punta de su tallo.
  nodes.forEach((node, i) => {
    frame[`card${i + 1}Left`] = css(`dp-card${i + 1}-left`, node.x - card.widthPx / 2)
    frame[`card${i + 1}Bottom`] = css(`dp-card${i + 1}-bottom`, height - (node.y - stop.stemPx))
  })

  return {
    slots: {
      frame,
      stage: { src: stage.ref },
      trajectory: { src: path.ref },
      horizon: String(horizon),
      voice,
      body: evidenceHtml(content.body, 'none'),
      stops: stops.map((item, i) => ({
        range: `${i + 1} · ${text(item.range, `El rango de la parada ${i + 1}`)}`,
        title: text(item.title, `El título de la parada ${i + 1}`),
        desc: text(item.desc, `La descripción de la parada ${i + 1}`)
      }))
    },
    assets: [stage.asset, path.asset]
  }
}

/* ── method-score-ring: el anillo del puntaje ───────────────────────────────────────────────────────────── */

type RingTokens = {
  cxOfWidth: number
  cyPx: number
  rPx: number
  startDeg: number
  degPerPoint: number
  gapDeg: number
  stroke: { heaviestPx: number; restPx: number }
  opacity: { heaviest: number; restFrom: number; restStep: number }
  total: { px: number; weight: number; tracking: string; boxPx: number; topPx: number }
  totalLabel: { px: number; weight: number; topPx: number }
  label: { radiusOffsetPx: number; boxPx: number; topOffsetPx: number; verticalCos: number; weight: { px: number; weight: number }; name: { px: number; weight: number; gapPx: number } }
}

type CtaTokens = { button: { px: number; weight: number; padding: { yPx: number; xPx: number }; radiusPx: number }; descriptorGapPx: number; cursorScale: number }

type Dimension = { name: string; weight: number }

const rad = (deg: number): number => (deg * Math.PI) / 180

/** Un arco del anillo, de `from` a `to` grados (0° = +x, sentido horario). */
const arc = (cx: number, cy: number, r: number, from: number, to: number): string => {
  const a = { x: cx + r * Math.cos(rad(from)), y: cy + r * Math.sin(rad(from)) }
  const b = { x: cx + r * Math.cos(rad(to)), y: cy + r * Math.sin(rad(to)) }

  return `M ${n(a.x)} ${n(a.y)} A ${n(r)} ${n(r)} 0 ${to - from > 180 ? 1 : 0} 1 ${n(b.x)} ${n(b.y)}`
}

export const methodScoreRing: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const ring = measured(recipe.ring as RingTokens | undefined, 'el anillo del puntaje')
  const cta = measured(recipe.cta as CtaTokens | undefined, 'el CTA del anillo')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta del anillo va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('El anillo lleva su bajada (`body`).', 'invalid-intent')

  const dimensions = (Array.isArray(intent.dimensions) ? intent.dimensions : []) as Dimension[]

  if (dimensions.length === 0) throw new SurfacePieceError('El anillo lleva sus dimensiones (`dimensions`).', 'invalid-intent')

  for (const [i, dimension] of dimensions.entries()) {
    text(dimension?.name, `El nombre de la dimensión ${i + 1}`)

    if (!Number.isFinite(dimension?.weight) || dimension.weight <= 0) {
      throw new SurfacePieceError(`La dimensión «${dimension?.name}» lleva un peso positivo.`, 'invalid-intent')
    }
  }

  // El anillo es el puntaje completo: los pesos suman lo que mide una vuelta (100 × 3,6° = 360°).
  const points = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0)

  if (Math.abs(points * ring.degPerPoint - 360) > 1e-6) {
    throw new SurfacePieceError(`Los pesos del anillo suman ${points}; una vuelta son ${360 / ring.degPerPoint}.`, 'invalid-intent')
  }

  // Toda cifra con su fuente: el total y los pesos salen de la misma fuente, impresa en el pie.
  const total = intent.total as { value?: unknown; label?: unknown; source?: unknown } | undefined
  const totalValue = text(total?.value, 'El total del anillo')
  const totalLabel = text(total?.label, 'El rótulo del total')
  const source = text(total?.source, 'La fuente de los pesos y el total')
  // `cta` es el campo de la web en el contrato; en el deck el botón y su descriptor viajan en `ctaButton`.
  const button = intent.ctaButton as { text?: unknown; descriptor?: unknown } | undefined
  const ctaText = text(button?.text, 'El texto del botón (`ctaButton.text`)')
  const ctaUrl = text(button?.descriptor, 'El descriptor del botón (`ctaButton.descriptor`)')

  const { width } = manifest.canvas
  const cx = Math.round(ring.cxOfWidth * width)
  const cy = ring.cyPx
  const accent = accentOf(intent.line)
  const heaviest = dimensions.reduce((best, dimension, i) => (dimension.weight > dimensions[best]!.weight ? i : best), 0)

  let at = ring.startDeg
  let rest = 0
  const arcs: string[] = []
  const labels: Record<string, string>[] = []

  dimensions.forEach((dimension, i) => {
    const sweep = dimension.weight * ring.degPerPoint
    const from = at + ring.gapDeg / 2
    const to = at + sweep - ring.gapDeg / 2
    const isHeaviest = i === heaviest
    const opacity = isHeaviest ? ring.opacity.heaviest : ring.opacity.restFrom - ring.opacity.restStep * rest++
    const stroke = isHeaviest ? ring.stroke.heaviestPx : ring.stroke.restPx

    arcs.push(`<path d="${arc(cx, cy, ring.rPx, from, to)}" fill="none" stroke="${accent}" stroke-opacity="${n(opacity)}" stroke-width="${n(stroke)}"/>`)

    const mid = at + sweep / 2
    const radius = ring.rPx + ring.label.radiusOffsetPx
    const x = cx + radius * Math.cos(rad(mid))
    const y = cy + radius * Math.sin(rad(mid))
    const cos = Math.cos(rad(mid))
    const side = cos >= 0 || Math.abs(cos) < ring.label.verticalCos ? 'start' : 'end'

    labels.push({
      left: css('sr-label-left', Math.round(side === 'start' ? x : x - ring.label.boxPx)),
      top: css('sr-label-top', Math.round(y + ring.label.topOffsetPx)),
      side,
      weight: String(dimension.weight),
      name: dimension.name.trim()
    })

    at += sweep
  })

  const layer = layerAsset(`method-score-ring-${intent.line}-${dimensions.map(d => d.weight).join('-')}`, svgOpen(manifest) + arcs.join('') + '</svg>')
  const body = typeOf(manifest, 'body')

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
        ctaTop: css('sr-cta-top', topOf(manifest, 'cta')),
        ctaPx: css('sr-cta-px', cta.button.px),
        ctaPadY: css('sr-cta-pad-y', cta.button.padding.yPx),
        ctaPadX: css('sr-cta-pad-x', cta.button.padding.xPx),
        ctaRadius: css('sr-cta-radius', cta.button.radiusPx),
        ctaUrlPx: css('sr-cta-url-px', fixedPx(typeOf(manifest, 'ctaUrl'), 'el descriptor del CTA')),
        totalLeft: css('sr-total-left', cx - ring.total.boxPx / 2),
        totalWidth: css('sr-total-width', ring.total.boxPx),
        totalTop: css('sr-total-top', ring.total.topPx),
        totalPx: css('sr-total-px', ring.total.px),
        totalLabelTop: css('sr-total-label-top', ring.totalLabel.topPx),
        totalLabelPx: css('sr-total-label-px', ring.totalLabel.px),
        labelWidth: css('sr-label-width', ring.label.boxPx),
        labelWeightPx: css('sr-label-weight-px', ring.label.weight.px),
        labelNamePx: css('sr-label-name-px', ring.label.name.px),
        labelNameGap: css('sr-label-name-gap', ring.label.name.gapPx),
        sourceLeft: css('sr-source-left', Math.round(measured(reserve(manifest, 'source')?.inset, 'el inicio de la fuente') * width)),
        sourceTop: css('sr-source-top', topOf(manifest, 'source')),
        sourcePx: css('sr-source-px', fixedPx(typeOf(manifest, 'source'), 'la fuente'))
      },
      ring: { src: layer.ref },
      voice,
      body: content.body,
      total: { value: totalValue, label: totalLabel },
      labels,
      cta: { text: ctaText, url: ctaUrl, cursorScale: cta.cursorScale, descriptorGapPx: cta.descriptorGapPx },
      source
    },
    assets: [layer.asset]
  }
}

/* ── method-hybrid-workforce: personas y agentes sobre el mismo trabajo ──────────────────────────────────── */

type LadderTokens = {
  count: number
  xPx: number
  baseYPx: number
  barWidthPx: number
  gapPx: number
  heightFromPx: number
  heightStepPx: number
  radiusTopPx: number
  padding: { topPx: number; xPx: number }
  number: { px: number; weight: number }
  label: { px: number; weight: number; lineHeight: number; gapPx: number }
  glass: { color: string; opacityFrom: number; opacityStep: number }
  baseline: { strokePx: number }
}

type HybridSelection = {
  also?: { label: string; anchor: string; action: string; participantKind: string }[]
  targets?: { count: number; agentColorLine: string }
}

type TargetIntent = { label?: unknown; anchor?: unknown; box?: { x?: unknown; y?: unknown; width?: unknown; height?: unknown } }

/** Las etiquetas de la voz y la bajada de la fuerza híbrida, comunes a sus dos composiciones. */
const hybridVoice = (manifest: SurfaceManifest) => {
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (!content.body) throw new SurfacePieceError('La fuerza híbrida lleva su bajada (`body`).', 'invalid-intent')

  const body = typeOf(manifest, 'body')

  return {
    voice,
    body: content.body,
    frame: {
      margin: measured(manifest.safeArea?.marginPx, 'el margen del deck'),
      eyebrowTop: topOf(manifest, 'eyebrow'),
      questionTop: topOf(manifest, 'question'),
      answerTop: topOf(manifest, 'answer'),
      answerPx: fixedPx(typeOf(manifest, 'answer'), 'la respuesta'),
      bodyTop: topOf(manifest, 'body'),
      bodyPx: fixedPx(body, 'la bajada'),
      bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada')
    }
  }
}

export const methodHybridWorkforce: RecipeBuilder = ctx => {
  const layout = ctx.manifest.layout ?? 'ladder'

  if (layout === 'scene') return hybridScene(ctx)

  if (layout !== 'ladder') {
    throw new SurfacePieceError(`\`method-hybrid-workforce\` no tiene plantilla para la composición «${layout}».`, 'recipe-without-template')
  }

  return hybridLadder(ctx)
}

/** `ladder`: la autoridad del agente crece por tramos; la respuesta la toman dos cursores a la vez. */
const hybridLadder: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const ladder = measured(recipe.ladder as LadderTokens | undefined, 'la escalera de autoridad')
  const tramos = (Array.isArray(intent.ladder) ? intent.ladder : []) as unknown[]

  if (tramos.length !== ladder.count) throw new SurfacePieceError(`La escalera de autoridad lleva ${ladder.count} tramos (\`ladder\`).`, 'invalid-intent')

  const { voice, body, frame } = hybridVoice(manifest)
  const width = manifest.canvas.width
  const glass = paletteColor(ladder.glass.color, 'el vidrio de la escalera')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-hw')
  const path = typeof intent.path === 'string' && intent.path.trim() ? intent.path.trim() : null

  // Los dos cursores sobre la respuesta: el de la receta (delegado por AXIS) y los que la receta suma (`also`).
  const selection = selectionSlot(manifest)
  const also = (recipe.selection as HybridSelection | undefined)?.also ?? []

  if (!selection) throw new SurfacePieceError('La fuerza híbrida lleva su selección sobre la respuesta.', 'invalid-intent')

  return {
    slots: {
      frame: {
        line: intent.line,
        ...frame,
        ladderTitleLeft: css('hw-title-left', Math.round(measured(reserve(manifest, 'ladderTitle')?.inset, 'el inicio del título') * width)),
        ladderTitleTop: css('hw-title-top', topOf(manifest, 'ladderTitle')),
        ladderTitlePx: css('hw-title-px', fixedPx(typeOf(manifest, 'ladderTitle'), 'el título de la escalera')),
        ladderX: css('hw-x', ladder.xPx),
        ladderBase: css('hw-base', ladder.baseYPx),
        barWidth: css('hw-bar-width', ladder.barWidthPx),
        barGap: css('hw-bar-gap', ladder.gapPx),
        barFrom: css('hw-bar-from', ladder.heightFromPx),
        barStep: css('hw-bar-step', ladder.heightStepPx),
        barRadius: css('hw-bar-radius', ladder.radiusTopPx),
        barPadTop: css('hw-bar-pad-top', ladder.padding.topPx),
        barPadX: css('hw-bar-pad-x', ladder.padding.xPx),
        glassFrom: css('hw-glass-from', ladder.glass.opacityFrom * 100, '%'),
        glassStep: css('hw-glass-step', ladder.glass.opacityStep * 100, '%'),
        glassColor: colorVar('hw-glass', glass),
        numberPx: css('hw-number-px', ladder.number.px),
        labelPx: css('hw-label-px', ladder.label.px),
        labelGap: css('hw-label-gap', ladder.label.gapPx),
        baselineWidth: css('hw-baseline-width', ladder.count * ladder.barWidthPx + (ladder.count - 1) * ladder.gapPx),
        baselineStroke: css('hw-baseline-stroke', ladder.baseline.strokePx),
        pathLeft: css('hw-path-left', Math.round(measured(reserve(manifest, 'path')?.inset, 'el inicio del camino') * width)),
        pathTop: css('hw-path-top', topOf(manifest, 'path')),
        pathPx: css('hw-path-px', fixedPx(typeOf(manifest, 'path'), 'el camino')),
        pathWidth: css('hw-path-width', measured(typeOf(manifest, 'path').maxWidthPx, 'el ancho del camino'))
      },
      indicator: { src: indicator.ref },
      voice,
      body,
      ladderTitle: text(intent.ladderTitle, 'El título de la escalera (`ladderTitle`)'),
      ladder: tramos.map((label, i) => ({ label: text(label, `El tramo ${i + 1} de la escalera`) })),
      ...(path ? { path } : {}),
      // La caja de la respuesta en dos líneas se mide con el aire POR LÍNEA, como la lámina aprobada (DeckHibrido).
      selection: {
        ...selection,
        textPad: 'per-line',
        also: also.map(cursor => ({ label: cursor.label, anchor: cursor.anchor, action: cursor.action, participantKind: cursor.participantKind }))
      }
    },
    assets: [indicator.asset]
  }
}

/** `scene`: la estratega y un agente sobre la misma pantalla, con dos selecciones medidas en la toma. */
const hybridScene: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { voice, body, frame } = hybridVoice(manifest)
  const { width, height } = manifest.canvas
  const photo = plateAsset(manifest, { width, height })
  const layoutSelection = (recipe.layouts as Record<string, { selection?: HybridSelection & Record<string, unknown> }>).scene?.selection
  const targetsToken = measured(layoutSelection?.targets, 'las selecciones de la escena')
  const targets = (Array.isArray(intent.selectionTargets) ? intent.selectionTargets : []) as TargetIntent[]

  if (targets.length !== targetsToken.count) {
    throw new SurfacePieceError(`La escena lleva ${targetsToken.count} selecciones (\`selectionTargets\`), cada una con su caja medida en la toma.`, 'invalid-intent')
  }

  const agentColor = accentOf(targetsToken.agentColorLine)

  const boxes = targets.map((target, i) => {
    const box = target.box ?? {}
    const [x, y, w, h] = [box.x, box.y, box.width, box.height].map(Number)

    if (![x, y, w, h].every(Number.isFinite) || w! <= 0 || h! <= 0 || x! < 0 || y! < 0 || x! + w! > width || y! + h! > height) {
      throw new SurfacePieceError(`La caja de la selección ${i + 1} va dentro del lienzo, en px del master.`, 'invalid-intent')
    }

    return {
      label: text(target.label, `La etiqueta de la selección ${i + 1}`),
      anchor: text(target.anchor, `El ancla de la selección ${i + 1}`),
      participantKind: String(layoutSelection?.participantKind ?? 'department'),
      // La primera es la persona (color del participante por orden); la segunda, el agente, en el acento medido.
      ...(i === 1 ? { color: agentColor } : {}),
      box: { left: x!, top: y!, right: x! + w!, bottom: y! + h! }
    }
  })

  return {
    contentType: 'deck.method-hybrid-workforce.scene',
    slots: {
      frame: { line: intent.line, ...frame },
      photo: { src: photo.ref, alt: photo.alt },
      voice,
      body,
      selection: {
        targets: boxes,
        scale: layoutSelection?.collaboratorScale,
        variant: layoutSelection?.variant,
        padding: layoutSelection?.padding,
        overlay: layoutSelection?.overlay,
        participantKind: layoutSelection?.participantKind
      }
    },
    assets: [photo.asset]
  }
}

export const METHOD_BUILDERS: Record<string, RecipeBuilder> = {
  'decision-plan': decisionPlan,
  'method-score-ring': methodScoreRing,
  'method-hybrid-workforce': methodHybridWorkforce
}
