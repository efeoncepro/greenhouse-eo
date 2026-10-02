/**
 * `decision-diagnosis-map` (TASK-1934): «¿Qué recibes primero? El mapa.». El informe del diagnóstico abierto, en papel y
 * girado sobre la plataforma de luz: la cabecera (el isotipo de Efeonce en su ficha oscura, el kicker, la marca y el
 * mercado, y la marca «Datos de muestra») y cuatro módulos en rejilla 2×2 — 01 el score por motor (barras que salen de
 * su valor), 02 el share of voice (una dona que sale de los porcentajes, que suman 100), 03 los prompts donde la marca
 * no aparece y 04 el plan priorizado, que toma la selección «Cliente» —. Abajo a la derecha, la ficha «Lectura experta».
 *
 * Todo lo que pinta sale de AXIS: la voz, de las reservas del manifest y del token (`liveVoiceFrame`); el escenario, la
 * plataforma, el documento, la rejilla, las barras, la dona, los prompts, el plan y la ficha, del token de la receta
 * (`report`, `chip`, `platform`, `stage`, `glass`). El CONTENIDO (los motores y sus scores, el share of voice, los
 * prompts, el plan, la nota) llega en el intent y lo validan este builder y el contrato de slots.
 *
 * Dos reglas de la receta se cierran aquí:
 *   - `generic-ai-interface`: los motores van SÓLO como texto; ningún logo, color ni forma de sus productos. Un motor
 *     que trae algo más que su nombre y su score no compone.
 *   - `illustrative-data-marked`: con datos de muestra (`dataOrigin: 'illustrative'`, el valor por defecto) la marca
 *     `sampleMark` es obligatoria; con datos del cliente (`dataOrigin: 'client'`) se exige su evidencia (`evidenceRef`)
 *     y la marca puede omitirse.
 */

import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'

import { documentVars, platformSvg, type Glass, type PlatformTokens } from '../close'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured, n, paletteColor, stageSvg, text, type StageTokens } from '../kit'
import { liveVoiceFrame } from '../sections'

type Weighted = { px: number; weight: number }
type Tracked = Weighted & { tracking: string; uppercase?: boolean; color: string }
type Bordered = { px: number; color: string }

type ReportTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  perspectivePx: number
  rotateYDeg: number
  origin: 'start' | 'center' | 'end'
  header: { tilePx: number; tileRadiusPx: number; isotypePx: number; gapPx: number; kicker: Tracked; title: { px: number; lineHeight: number; tracking: string; gapPx: number } }
  mark: Weighted & { padding: [number, number]; fill: string; color: string }
  grid: { columns: number; gapPx: number; gapTopPx: number }
  module: { padding: [number, number]; radiusPx: number; fill: string; border: Bordered; kicker: Tracked; title: { px: number; tracking: string; gapTopPx: number; gapBottomPx: number } }
  bars: {
    count: number
    gapTopPx: number
    gapPx: number
    label: Weighted & { widthPx: number; color: string }
    bar: { heightPx: number; track: string; fill: string }
    value: Weighted & { widthPx: number }
    max: number
  }
  donut: {
    px: number
    viewBox: number
    radius: number
    strokePx: number
    track: string
    fills: string[]
    gapPx: number
    legend: Weighted & { lineHeight: number; color: string; lead: { weight: number; color: string } }
  }
  prompts: Weighted & {
    count: number
    gapTopPx: number
    gapPx: number
    icon: { px: number; strokePx: number; color: string; glyph: { box: number; radius: number; cross: [number, number] } }
  }
  plan: {
    count: number
    gapPx: number
    padding: [number, number]
    radiusPx: number
    fill: string
    border: Bordered
    number: { px: number; color: string }
    title: Weighted & { lineHeight: number; gapPx: number }
    kind: Tracked & { gapPx: number }
  }
}

type ChipTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number]
  radiusPx: number
  perspectivePx: number
  rotateYDeg: number
  angleDeg: number
  fill: [string, string]
  border: { px: number; color: string; opacity: number }
  shadow: { yPx: number; blurPx: number; color: string; opacity: number }
  glow: { blurPx: number; opacity: number }
  kicker: Tracked
  text: Weighted & { lineHeight: number; gapPx: number }
}

type DiagnosisTokens = {
  stage: StageTokens
  platform: PlatformTokens
  report: ReportTokens
  chip: ChipTokens
  glass: Glass & { document: { edge: { px: number } } }
  answerShadow: { color: string }
}

type ModuleIntent = { kicker?: unknown; title?: unknown }

/** El papel del informe nombra sus colores con las claves de `glass.document` del token (tinta, apagado, filete…). */
const DOCUMENT_KEYS = ['fill', 'ink', 'muted', 'rule', 'chip'] as const

/** Un color del token de la receta: una clave del documento, un nombre de la paleta de la línea o un HEX medido. */
const colorOf = (glass: Glass, value: string, what: string): string => {
  if ((DOCUMENT_KEYS as readonly string[]).includes(value)) {
    return paletteColor(glass.document[value as (typeof DOCUMENT_KEYS)[number]] as string, what)
  }

  return paletteColor(value, what)
}

/** El origen del giro del informe (`start` = el borde izquierdo) como porcentaje del ancho. */
const ORIGIN_PERCENT: Record<ReportTokens['origin'], number> = { start: 0, center: 50, end: 100 }

/** La marca de falta de un prompt: un círculo con una X; glifo, tamaño, trazo y color salen de `report.prompts.icon`. */
const missIconSvg = (icon: ReportTokens['prompts']['icon'], color: string): string => {
  const { box, radius, cross } = measured(icon.glyph, 'el glifo de la marca de falta')
  const [from, to] = cross
  const c = box / 2
  const stroke = `stroke="${color}" stroke-width="${n(icon.strokePx)}"`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" width="${n(icon.px)}" height="${n(icon.px)}" aria-hidden="true" focusable="false">` +
    `<circle cx="${n(c)}" cy="${n(c)}" r="${n(radius)}" fill="none" ${stroke}/>` +
    `<path d="M${n(from)} ${n(from)}L${n(to)} ${n(to)}M${n(to)} ${n(from)}L${n(from)} ${n(to)}" fill="none" ${stroke} stroke-linecap="round"/>` +
    '</svg>'
  )
}

/** La dona del share of voice: cada tramo mide su porcentaje y el primero (tu marca) arranca arriba, en el color oscuro. */
const donutSvg = (donut: ReportTokens['donut'], percents: number[], glass: Glass): string => {
  const c = donut.viewBox / 2
  const circumference = 2 * Math.PI * donut.radius

  const ring = (color: string, extra = '') =>
    `<circle cx="${n(c)}" cy="${n(c)}" r="${n(donut.radius)}" fill="none" stroke="${color}" stroke-width="${n(donut.strokePx)}"${extra}/>`

  let before = 0

  const arcs = percents.map((percent, i) => {
    const length = (percent / 100) * circumference
    const offset = circumference / 4 - before

    before += length

    return ring(
      colorOf(glass, measured(donut.fills[i], `el color del tramo ${i + 1} de la dona`), 'la dona'),
      ` stroke-dasharray="${n(length)} ${n(circumference - length)}" stroke-dashoffset="${n(offset)}"`
    )
  })

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(donut.viewBox)} ${n(donut.viewBox)}" width="${n(donut.px)}" height="${n(donut.px)}" aria-hidden="true" focusable="false">` +
    ring(colorOf(glass, donut.track, 'el fondo de la dona')) +
    arcs.join('') +
    '</svg>'
  )
}

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** Un número del intent (score o porcentaje): finito y dentro de su rango, o no compone. */
const numberIn = (value: unknown, min: number, max: number, what: string): number => {
  const number = typeof value === 'number' ? value : Number.NaN

  if (!Number.isFinite(number) || number < min || number > max) throw new SurfacePieceError(`${what} va de ${min} a ${max}.`, 'invalid-intent')

  return number
}

/** `illustrative-data-marked`: la marca de muestra, obligatoria salvo con datos del cliente y su evidencia. */
const sampleMarkOf = (intent: Record<string, unknown>): string | null => {
  const origin = intent.dataOrigin ?? 'illustrative'

  if (origin !== 'illustrative' && origin !== 'client') {
    throw new SurfacePieceError('El origen de los datos (`dataOrigin`) es `illustrative` o `client`.', 'invalid-intent')
  }

  const mark = typeof intent.sampleMark === 'string' ? intent.sampleMark.trim() : ''

  if (origin === 'illustrative') {
    if (!mark) throw new SurfacePieceError('Con datos de muestra, el informe lleva su marca visible (`sampleMark`, «Datos de muestra»).', 'invalid-intent')

    return mark
  }

  text(intent.evidenceRef, 'Con datos del cliente, la evidencia de esos datos (`evidenceRef`)')

  return mark || null
}

export const decisionDiagnosisMap: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const tokens = recipe as unknown as DiagnosisTokens
  const report = measured(tokens.report, 'el informe del diagnóstico')
  const chip = measured(tokens.chip, 'la ficha de la lectura experta')
  const glass = measured(tokens.glass, 'el vidrio y el papel de la receta')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta del mapa va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('El mapa lleva su bajada (`body`).', 'invalid-intent')

  const mark = sampleMarkOf(intent)
  const head = (intent.report ?? {}) as { kicker?: unknown; title?: unknown }
  const modules = listOf(intent.modules) as ModuleIntent[]

  if (modules.length !== 4) throw new SurfacePieceError('El informe lleva sus cuatro módulos (`modules`): score, share of voice, prompts y plan.', 'invalid-intent')

  // `generic-ai-interface`: cada motor es su nombre y su score, nada más (ni logo, ni color, ni ícono).
  const engines = listOf(intent.engineScores) as Record<string, unknown>[]

  if (engines.length !== report.bars.count) throw new SurfacePieceError(`El score por motor lleva ${report.bars.count} motores (\`engineScores\`).`, 'invalid-intent')

  const scores = engines.map((engine, i) => {
    const extra = Object.keys(engine ?? {}).filter(key => key !== 'engine' && key !== 'score')

    if (extra.length > 0) {
      throw new SurfacePieceError(`El motor ${i + 1} va sólo como texto (\`engine\` y \`score\`): la interfaz es genérica, sin «${extra.join('», «')}».`, 'invalid-intent')
    }

    const score = numberIn(engine.score, 0, report.bars.max, `El score del motor ${i + 1}`)

    return {
      engine: text(engine.engine, `El nombre del motor ${i + 1}`),
      score: n(score),
      value: css('dm-value', (score / report.bars.max) * 100, '%')
    }
  })

  const share = listOf(intent.shareOfVoice) as { label?: unknown; percent?: unknown }[]

  if (share.length < 3 || share.length > report.donut.fills.length) {
    throw new SurfacePieceError(`El share of voice lleva de 3 a ${report.donut.fills.length} participantes (\`shareOfVoice\`).`, 'invalid-intent')
  }

  const percents = share.map((entry, i) => numberIn(entry?.percent, 0, 100, `El porcentaje ${i + 1} del share of voice`))
  const total = percents.reduce((sum, percent) => sum + percent, 0)

  if (Math.abs(total - 100) > 1e-9) throw new SurfacePieceError(`El share of voice suma 100 (hoy suma ${n(total)}).`, 'invalid-intent')

  const prompts = listOf(intent.lostPrompts)

  if (prompts.length !== report.prompts.count) throw new SurfacePieceError(`Los prompts donde no apareces son ${report.prompts.count} (\`lostPrompts\`).`, 'invalid-intent')

  const plan = listOf(intent.plan) as { title?: unknown; kind?: unknown }[]

  if (plan.length !== report.plan.count) throw new SurfacePieceError(`El plan priorizado lleva ${report.plan.count} movimientos (\`plan\`).`, 'invalid-intent')

  const note = (intent.expertNote ?? {}) as { kicker?: unknown; text?: unknown }
  const stage = layerAsset('decision-diagnosis-map-stage', stageSvg(manifest, measured(tokens.stage, 'el escenario'), 'dm'))
  const platform = layerAsset('decision-diagnosis-map-platform', platformSvg(manifest, measured(tokens.platform, 'la plataforma'), 'dm'))
  const donut = layerAsset('decision-diagnosis-map-donut', donutSvg(report.donut, percents, glass))
  const miss = layerAsset('decision-diagnosis-map-miss', missIconSvg(report.prompts.icon, colorOf(glass, report.prompts.icon.color, 'la marca de falta')))
  const lum = (recipe.signature as { urlBubble?: { widthPx?: number; bottomPx?: number } } | undefined)?.urlBubble
  const { header, module: mod, bars, prompts: promptTokens, plan: planTokens } = report
  const selection = selectionSlot(manifest)

  const frame: Record<string, unknown> = {
    line: intent.line,
    ...liveVoiceFrame(manifest, recipe, voice.question ?? '', 'dm'),
    lumWidth: css('lum-width', measured(lum?.widthPx, 'la burbuja en luminosidad')),
    lumBottom: css('lum-bottom', measured(lum?.bottomPx, 'la burbuja en luminosidad')),
    haloColor: colorVar('dm-halo', paletteColor('halo', 'el halo')),
    docEdgeColor: colorVar('dm-doc-edge', paletteColor(glass.document.edge.color, 'el filo del documento')),
    docEdgeWidth: css('dm-doc-edge-width', measured(glass.document.edge.px, 'el grosor del filo del documento')),
    answerShadowColor: colorVar('dm-answer-shadow', paletteColor(measured(tokens.answerShadow?.color, 'el color de la sombra de la respuesta'), 'la sombra de la respuesta')),
    ...documentVars(glass, 'dm'),
    // El informe
    reportLeft: css('dm-report-left', report.xPx),
    reportTop: css('dm-report-top', report.yPx),
    reportWidth: css('dm-report-width', report.widthPx),
    reportPadTop: css('dm-report-pad-top', report.padding[0]),
    reportPadX: css('dm-report-pad-x', report.padding[1]),
    reportPadBottom: css('dm-report-pad-bottom', report.padding[2]),
    reportRadius: css('dm-report-radius', report.radiusPx),
    reportPerspective: css('dm-report-perspective', report.perspectivePx),
    reportRotate: css('dm-report-rotate', report.rotateYDeg, 'deg'),
    reportOrigin: css('dm-report-origin', measured(ORIGIN_PERCENT[report.origin], `el origen «${report.origin}» del giro del informe`), '%'),
    // La cabecera
    tileSize: css('dm-tile', header.tilePx),
    tileRadius: css('dm-tile-radius', header.tileRadiusPx),
    isotypeSize: css('dm-isotype', header.isotypePx),
    headerGap: css('dm-header-gap', header.gapPx),
    kickerPx: css('dm-kicker-px', header.kicker.px),
    kickerWeight: css('dm-kicker-wght', header.kicker.weight, ''),
    kickerTracking: css('dm-kicker-tracking', Number.parseFloat(header.kicker.tracking), 'em'),
    kickerColor: colorVar('dm-kicker', colorOf(glass, header.kicker.color, 'el kicker del informe')),
    titlePx: css('dm-title-px', header.title.px),
    titleLeading: css('dm-title-leading', header.title.lineHeight, ''),
    titleTracking: css('dm-title-tracking', Number.parseFloat(header.title.tracking), 'em'),
    titleGap: css('dm-title-gap', header.title.gapPx),
    markPx: css('dm-mark-px', report.mark.px),
    markWeight: css('dm-mark-wght', report.mark.weight, ''),
    markPadY: css('dm-mark-pad-y', report.mark.padding[0]),
    markPadX: css('dm-mark-pad-x', report.mark.padding[1]),
    markFill: colorVar('dm-mark-fill', colorOf(glass, report.mark.fill, 'la marca de muestra')),
    markColor: colorVar('dm-mark', colorOf(glass, report.mark.color, 'la marca de muestra')),
    // La rejilla y sus módulos
    gridColumns: css('dm-grid-columns', report.grid.columns, ''),
    gridGap: css('dm-grid-gap', report.grid.gapPx),
    gridGapTop: css('dm-grid-gap-top', report.grid.gapTopPx),
    modulePadY: css('dm-module-pad-y', mod.padding[0]),
    modulePadX: css('dm-module-pad-x', mod.padding[1]),
    moduleRadius: css('dm-module-radius', mod.radiusPx),
    moduleFill: colorVar('dm-module-fill', colorOf(glass, mod.fill, 'los módulos')),
    moduleBorder: css('dm-module-border', mod.border.px),
    moduleBorderColor: colorVar('dm-module-border', colorOf(glass, mod.border.color, 'el filete de los módulos')),
    moduleKickerPx: css('dm-module-kicker-px', mod.kicker.px),
    moduleKickerWeight: css('dm-module-kicker-wght', mod.kicker.weight, ''),
    moduleKickerTracking: css('dm-module-kicker-tracking', Number.parseFloat(mod.kicker.tracking), 'em'),
    moduleKickerColor: colorVar('dm-module-kicker', colorOf(glass, mod.kicker.color, 'el kicker de los módulos')),
    moduleTitlePx: css('dm-module-title-px', mod.title.px),
    moduleTitleTracking: css('dm-module-title-tracking', Number.parseFloat(mod.title.tracking), 'em'),
    moduleTitleGapTop: css('dm-module-title-gap-top', mod.title.gapTopPx),
    moduleTitleGapBottom: css('dm-module-title-gap-bottom', mod.title.gapBottomPx),
    // 01 · las barras
    barsGapTop: css('dm-bars-gap-top', bars.gapTopPx),
    barsGap: css('dm-bars-gap', bars.gapPx),
    barLabelWidth: css('dm-bar-label-width', bars.label.widthPx),
    barLabelPx: css('dm-bar-label-px', bars.label.px),
    barLabelWeight: css('dm-bar-label-wght', bars.label.weight, ''),
    barLabelColor: colorVar('dm-bar-label', colorOf(glass, bars.label.color, 'los motores')),
    barHeight: css('dm-bar-height', bars.bar.heightPx),
    barTrack: colorVar('dm-bar-track', colorOf(glass, bars.bar.track, 'el fondo de las barras')),
    barFill: colorVar('dm-bar-fill', colorOf(glass, bars.bar.fill, 'las barras')),
    barValueWidth: css('dm-bar-value-width', bars.value.widthPx),
    barValuePx: css('dm-bar-value-px', bars.value.px),
    barValueWeight: css('dm-bar-value-wght', bars.value.weight, ''),
    // 02 · la dona
    donutPx: css('dm-donut-px', report.donut.px),
    donutGap: css('dm-donut-gap', report.donut.gapPx),
    legendPx: css('dm-legend-px', report.donut.legend.px),
    legendWeight: css('dm-legend-wght', report.donut.legend.weight, ''),
    legendLeading: css('dm-legend-leading', report.donut.legend.lineHeight, ''),
    legendColor: colorVar('dm-legend', colorOf(glass, report.donut.legend.color, 'la leyenda de la dona')),
    legendLeadWeight: css('dm-legend-lead-wght', measured(report.donut.legend.lead?.weight, 'el peso de tu marca en la leyenda'), ''),
    legendLeadColor: colorVar('dm-legend-lead', colorOf(glass, measured(report.donut.legend.lead?.color, 'el color de tu marca en la leyenda'), 'tu marca en la leyenda')),
    // 03 · los prompts
    promptsGapTop: css('dm-prompts-gap-top', promptTokens.gapTopPx),
    promptsGap: css('dm-prompts-gap', promptTokens.gapPx),
    promptPx: css('dm-prompt-px', promptTokens.px),
    promptWeight: css('dm-prompt-wght', promptTokens.weight, ''),
    promptIconPx: css('dm-prompt-icon', promptTokens.icon.px),
    // 04 · el plan
    planGap: css('dm-plan-gap', planTokens.gapPx),
    planPadY: css('dm-plan-pad-y', planTokens.padding[0]),
    planPadX: css('dm-plan-pad-x', planTokens.padding[1]),
    planRadius: css('dm-plan-radius', planTokens.radiusPx),
    planFill: colorVar('dm-plan-fill', colorOf(glass, planTokens.fill, 'las fichas del plan')),
    planBorder: css('dm-plan-border', planTokens.border.px),
    planBorderColor: colorVar('dm-plan-border', colorOf(glass, planTokens.border.color, 'el filete del plan')),
    planNumberPx: css('dm-plan-number-px', planTokens.number.px),
    planNumberColor: colorVar('dm-plan-number', colorOf(glass, planTokens.number.color, 'el número del plan')),
    planTitlePx: css('dm-plan-title-px', planTokens.title.px),
    planTitleWeight: css('dm-plan-title-wght', planTokens.title.weight, ''),
    planTitleLeading: css('dm-plan-title-leading', planTokens.title.lineHeight, ''),
    planTitleGap: css('dm-plan-title-gap', planTokens.title.gapPx),
    planKindPx: css('dm-plan-kind-px', planTokens.kind.px),
    planKindWeight: css('dm-plan-kind-wght', planTokens.kind.weight, ''),
    planKindTracking: css('dm-plan-kind-tracking', Number.parseFloat(planTokens.kind.tracking), 'em'),
    planKindGap: css('dm-plan-kind-gap', planTokens.kind.gapPx),
    planKindColor: colorVar('dm-plan-kind', colorOf(glass, planTokens.kind.color, 'el tipo de movimiento')),
    // La ficha «Lectura experta»
    chipLeft: css('dm-chip-left', chip.xPx),
    chipTop: css('dm-chip-top', chip.yPx),
    chipWidth: css('dm-chip-width', chip.widthPx),
    chipPadY: css('dm-chip-pad-y', chip.padding[0]),
    chipPadX: css('dm-chip-pad-x', chip.padding[1]),
    chipRadius: css('dm-chip-radius', chip.radiusPx),
    chipPerspective: css('dm-chip-perspective', chip.perspectivePx),
    chipRotate: css('dm-chip-rotate', chip.rotateYDeg, 'deg'),
    chipAngle: css('dm-chip-angle', chip.angleDeg, 'deg'),
    chipFrom: colorVar('dm-chip-from', paletteColor(chip.fill[0], 'la ficha de la lectura experta')),
    chipTo: colorVar('dm-chip-to', paletteColor(chip.fill[1], 'la ficha de la lectura experta')),
    chipBorder: css('dm-chip-border', chip.border.px),
    chipBorderColor: colorVar('dm-chip-border', paletteColor(chip.border.color, 'el filo de la ficha')),
    chipBorderOpacity: css('dm-chip-border-opacity', chip.border.opacity * 100, '%'),
    chipShadowY: css('dm-chip-shadow-y', chip.shadow.yPx),
    chipShadowBlur: css('dm-chip-shadow-blur', chip.shadow.blurPx),
    chipShadowColor: colorVar('dm-chip-shadow', paletteColor(chip.shadow.color, 'la sombra de la ficha')),
    chipShadowOpacity: css('dm-chip-shadow-opacity', chip.shadow.opacity * 100, '%'),
    chipGlowBlur: css('dm-chip-glow-blur', chip.glow.blurPx),
    chipGlowOpacity: css('dm-chip-glow-opacity', chip.glow.opacity * 100, '%'),
    chipKickerPx: css('dm-chip-kicker-px', chip.kicker.px),
    chipKickerWeight: css('dm-chip-kicker-wght', chip.kicker.weight, ''),
    chipKickerTracking: css('dm-chip-kicker-tracking', Number.parseFloat(chip.kicker.tracking), 'em'),
    chipKickerColor: colorVar('dm-chip-kicker', paletteColor(chip.kicker.color, 'el kicker de la ficha')),
    chipTextPx: css('dm-chip-text-px', chip.text.px),
    chipTextWeight: css('dm-chip-text-wght', chip.text.weight, ''),
    chipTextLeading: css('dm-chip-text-leading', chip.text.lineHeight, ''),
    chipTextGap: css('dm-chip-text-gap', chip.text.gapPx)
  }

  const moduleSlot = (i: number, name: string) => ({
    [`${name}Kicker`]: text(modules[i]?.kicker, `El kicker del módulo ${i + 1} (\`modules[${i}].kicker\`)`),
    [`${name}Title`]: text(modules[i]?.title, `El título del módulo ${i + 1} (\`modules[${i}].title\`)`)
  })

  return {
    contentType: 'deck.decision-diagnosis-map',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      report: {
        kicker: text(head.kicker, 'El kicker del informe (`report.kicker`)'),
        title: text(head.title, 'La marca y el mercado del informe (`report.title`)'),
        ...(mark ? { mark } : {})
      },
      modules: { ...moduleSlot(0, 'scores'), ...moduleSlot(1, 'share'), ...moduleSlot(2, 'prompts'), ...moduleSlot(3, 'plan') },
      engineScores: scores,
      donut: { src: donut.ref },
      shareOfVoice: share.map((entry, i) => ({ label: text(entry?.label, `El participante ${i + 1} del share of voice`), percent: `${n(percents[i]!)}%` })),
      lostPrompts: prompts.map((prompt, i) => ({ icon: miss.ref, text: text(prompt, `El prompt ${i + 1} donde no apareces`) })),
      plan: plan.map((move, i) => ({
        number: String(i + 1),
        title: text(move?.title, `El movimiento ${i + 1} del plan (\`plan[${i}].title\`)`),
        kind: text(move?.kind, `El tipo del movimiento ${i + 1} (\`plan[${i}].kind\`)`)
      })),
      expertNote: {
        kicker: text(note.kicker, 'El kicker de la lectura experta (`expertNote.kicker`)'),
        text: text(note.text, 'La lectura experta (`expertNote.text`)')
      },
      ...(selection ? { selection } : {})
    },
    assets: [stage.asset, platform.asset, donut.asset, miss.asset]
  }
}
