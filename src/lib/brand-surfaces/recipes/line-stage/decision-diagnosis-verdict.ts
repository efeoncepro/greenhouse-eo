/**
 * `decision-diagnosis-verdict` (deck Salesforce, SF5, TASK-1942): «¿Qué recibes primero? Una decisión.». El diagnóstico
 * abierto como informe en papel, en perspectiva sobre la plataforma de luz: cabecera con el ícono Trazo «informe» en su
 * cuadro, título, bajada y la píldora de muestra; cinco módulos numerados en grilla de dos columnas — el mapa de la
 * operación, el veredicto (uno de tres, el elegido en tinta y con su condición), los riesgos, el registro verificable y
 * el roadmap por olas, que ocupa las dos columnas y es el objeto de la selección «Cliente».
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['decision-diagnosis-verdict']`). El
 * CONTENIDO llega en el intent: `reportTitle`, `reportSubtitle`, `sampleMark` (opcional: se omite sólo con datos del
 * cliente con evidencia), `modules` (cinco: `kicker` y `title`; el número lo pone el builder), `operationNodes` (seis),
 * `operationFootnote`, `verdictOptions` (tres), `selectedVerdict`, `verdictCondition`, `risks` (tres), `recordText` y
 * `waves` (tres: `name`, `title`, `kicker`). Cada módulo es su propio slot de la plantilla (`moduleState`,
 * `moduleVerdict`, `moduleRisks`, `moduleRecord`, `moduleRoadmap`) con su rótulo, su título y su cuerpo obligatorio.
 */

import { SurfacePieceError, type SurfaceAssetRequest } from '../../types'
import { contentOf, iconAsset, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, measured, n } from '../kit'

import {
  cssFine,
  documentVars,
  exactly,
  indexIn,
  lineColor,
  lineVoiceFrame,
  lumVars,
  req,
  stageLayers,
  uniqueAssets,
  type LineDocument
} from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; gapTopPx?: number; gapBottomPx?: number; lineHeight?: number; color?: string; numbered?: boolean }
type Border = { px: number; color: string; inset?: boolean }

type ReportTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  document: LineDocument
  perspectivePx: number
  rotateYDeg: number
  rotateXDeg: number
  origin: string
  header: {
    paddingBottomPx: number
    gapBottomPx: number
    rule: string
    icon: { boxPx: number; radiusPx: number; fill: string; px: number; glyph: string; surface: 'dark' | 'light' }
    gapPx: number
    title: Text
    subtitle: Text
  }
  mark: { padding: [number, number]; radiusPx: number; fill: string; border: Border; px: number; weight: number; tracking: string; color: string }
  modules: { count: number; columns: number; gapPx: number; spanFull: number[]; padding: [number, number]; radiusPx: number; fill: string; border: Border; kicker: Text; title: Text }
  nodes: { count: number; gapPx: number; padding: [number, number]; radiusPx: number; fill: string; border: Border; px: number; weight: number; dot: { px: number; fill: string; gapPx: number }; footnote: Text }
  verdict: {
    options: number
    gapPx: number
    flex: { option: number; selected: number }
    padding: [number, number]
    radiusPx: number
    px: number
    weight: number
    selected: { fill: string; color: string }
    other: { fill: string; color: string; border: Border }
    condition: Text
  }
  risks: { count: number; gapTopPx: number; gapPx: number; px: number; weight: number; icon: { px: number; shape: string; strokePx: number; color: string; geometry?: TriangleGeometry } }
  record: Text
  waves: { count: number; gapPx: number; padding: [number, number]; radiusPx: number; fill: string; border: Border; name: Text; title: Text; kicker: Text }
}

/** La forma del triángulo de alerta en su viewBox (AXIS 0.3.34, delta (r)). */
type TriangleGeometry = { viewBox: number; outline: { d: string; join: string }; mark: { d: string; cap: string } }

type ModuleIntent = { kicker?: unknown; title?: unknown }
type WaveIntent = { name?: unknown; title?: unknown; kicker?: unknown }

/** Las opciones del veredicto que no se eligen van en la caja angosta (flex 1): la elegida admite más. */
/** Los cinco módulos del informe, en su orden fijo: cada uno es un slot de la plantilla. */
const MODULE_SLOTS = ['moduleState', 'moduleVerdict', 'moduleRisks', 'moduleRecord', 'moduleRoadmap'] as const

const OTHER_OPTION_MAX = 12

const tracking = (value: string | undefined, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

const step = (index: number): string => String(index).padStart(2, '0')

/**
 * El triángulo de alerta de los riesgos (`risks.icon.shape: 'warning-triangle'`). Todo sale de AXIS: tamaño, trazo y
 * color, y desde 0.3.34 (delta (r)) también su forma (`risks.icon.geometry`: el viewBox, el contorno y el signo de
 * exclamación de la lámina aprobada).
 */
const warningTriangle = (icon: ReportTokens['risks']['icon'], line: string): { ref: string; asset: SurfaceAssetRequest } => {
  if (icon.shape !== 'warning-triangle') throw new SurfacePieceError(`AXIS pide el ícono «${icon.shape}» y el builder sólo sabe pintar «warning-triangle».`, 'invalid-intent')

  const shape = measured(icon.geometry, 'la forma del triángulo de alerta')
  const color = lineColor(icon.color, line, 'el triángulo de alerta')
  const ref = `asset-ref:icon:warning-triangle-${icon.px}`

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(shape.viewBox)} ${n(shape.viewBox)}" width="${n(icon.px)}" height="${n(icon.px)}" aria-hidden="true">` +
    `<path d="${shape.outline.d}" fill="none" stroke="${color}" stroke-width="${n(icon.strokePx)}" stroke-linejoin="${shape.outline.join}"/>` +
    `<path d="${shape.mark.d}" stroke="${color}" stroke-width="${n(icon.strokePx)}" stroke-linecap="${shape.mark.cap}"/>` +
    '</svg>'

  return { ref, asset: { ref, kind: 'svg', svg } }
}

export const decisionDiagnosisVerdict: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const report = measured(recipe.report as ReportTokens | undefined, 'el informe del diagnóstico')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = report.document
  const { header, mark, modules: mod, nodes, verdict, risks, record, waves } = report

  if (report.origin !== 'start') throw new SurfacePieceError(`AXIS pide el origen «${report.origin}» del giro y la plantilla sólo conoce «start».`, 'invalid-intent')
  if (!voice.answerLead) throw new SurfacePieceError('La respuesta va en dos líneas (`voice.answer` con dos tramos).', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const moduleList = exactly<ModuleIntent>(intent.modules, mod.count, 'Los módulos del informe (`modules`)')
  const nodeList = exactly<unknown>(intent.operationNodes, nodes.count, 'Los nodos de la operación (`operationNodes`)')
  const options = exactly<unknown>(intent.verdictOptions, verdict.options, 'Las opciones del veredicto (`verdictOptions`)')
  const chosen = indexIn(intent.selectedVerdict, verdict.options, 'El veredicto del diagnóstico (`selectedVerdict`)')
  const riskList = exactly<unknown>(intent.risks, risks.count, 'Los riesgos (`risks`)')
  const waveList = exactly<WaveIntent>(intent.waves, waves.count, 'Las olas del roadmap (`waves`)')

  const optionTexts = options.map((option, i) => {
    const value = req(option, `La opción ${i + 1} del veredicto (\`verdictOptions[${i}]\`)`)

    if (i + 1 !== chosen && value.length > OTHER_OPTION_MAX) {
      throw new SurfacePieceError(`La opción ${i + 1} del veredicto no es la elegida: va en ${OTHER_OPTION_MAX} caracteres o menos.`, 'invalid-intent')
    }

    return value
  })

  const reportIcon = iconAsset(header.icon.glyph, line, header.icon.px, 'Informe', header.icon.surface)
  const alert = warningTriangle(risks.icon, line)

  // El cuerpo de cada módulo, en el orden fijo (estado, veredicto, riesgos, evidencia, roadmap). Cada módulo es su
  // propio slot de la plantilla: el contrato exige el cuerpo de cada uno (no una unión de campos opcionales).
  const bodies: Record<string, unknown>[] = [
    {
      nodes: nodeList.map((node, i) => ({ text: req(node, `El nodo ${i + 1} de la operación (\`operationNodes[${i}]\`)`) })),
      footnote: req(intent.operationFootnote, 'La nota del mapa (`operationFootnote`)')
    },
    {
      options: optionTexts.map((text, i) => ({ role: i + 1 === chosen ? 'lead' : 'rest', text })),
      // Todo veredicto dice su condición (el condicionado la necesita; los otros dos la explican).
      condition: req(intent.verdictCondition, 'La condición del veredicto (`verdictCondition`)')
    },
    { risks: riskList.map((risk, i) => ({ icon: alert.ref, text: req(risk, `El riesgo ${i + 1} (\`risks[${i}]\`)`) })) },
    // Todo hallazgo tiene fuente: el módulo de evidencia no se omite.
    { record: req(intent.recordText, 'El registro verificable (`recordText`)') },
    {
      waves: waveList.map((wave, i) => ({
        name: req(wave.name, `El nombre de la ola ${i + 1} (\`waves[${i}].name\`)`),
        title: req(wave.title, `El trabajo de la ola ${i + 1} (\`waves[${i}].title\`)`),
        kicker: req(wave.kicker, `El rótulo de la ola ${i + 1} (\`waves[${i}].kicker\`)`)
      }))
    }
  ]

  if (bodies.length !== mod.count) throw new SurfacePieceError('AXIS cambió la cantidad de módulos del informe y el builder conoce cinco.', 'invalid-intent')

  const moduleSlots = moduleList.map((module, i) => {
    const kicker = req(module.kicker, `El rótulo del módulo ${i + 1} (\`modules[${i}].kicker\`)`)
    const prefix = `${step(i + 1)} · `

    return {
      span: css('ddv-span', mod.spanFull.includes(i + 1) ? mod.columns : 1, ''),
      kicker: mod.kicker.numbered && !kicker.startsWith(prefix) ? `${prefix}${kicker}` : kicker,
      title: req(module.title, `El título del módulo ${i + 1} (\`modules[${i}].title\`)`),
      ...bodies[i]
    }
  })

  const { stage, platform } = stageLayers(manifest, recipe, line, 'ddv')
  const color = (value: string | undefined, what: string) => lineColor(measured(value, `el color de ${what}`), line, what, doc)

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...documentVars(doc, line),
    // El informe en perspectiva
    reportLeft: css('ddv-left', report.xPx),
    reportTop: css('ddv-top', report.yPx),
    reportWidth: css('ddv-width', report.widthPx),
    reportPadTop: css('ddv-pad-top', report.padding[0]),
    reportPadX: css('ddv-pad-x', report.padding[1]),
    reportPadBottom: css('ddv-pad-bottom', report.padding[2]),
    reportRadius: css('ddv-radius', report.radiusPx),
    reportPerspective: css('ddv-perspective', report.perspectivePx),
    reportRotateY: css('ddv-rotate-y', report.rotateYDeg, 'deg'),
    reportRotateX: css('ddv-rotate-x', report.rotateXDeg, 'deg'),
    // La cabecera
    headPadBottom: css('ddv-head-pad-bottom', header.paddingBottomPx),
    headGapBottom: css('ddv-head-gap-bottom', header.gapBottomPx),
    headRule: colorVar('ddv-head-rule', color(header.rule, 'el filete de la cabecera')),
    headGap: css('ddv-head-gap', header.gapPx),
    iconBox: css('ddv-icon-box', header.icon.boxPx),
    iconRadius: css('ddv-icon-radius', header.icon.radiusPx),
    iconFill: colorVar('ddv-icon-fill', color(header.icon.fill, 'el cuadro del ícono')),
    iconSize: css('ddv-icon', header.icon.px),
    titlePx: css('ddv-title-px', header.title.px),
    titleTracking: cssFine('ddv-title-tracking', tracking(header.title.tracking, 'el título del informe')),
    subtitlePx: css('ddv-subtitle-px', header.subtitle.px),
    subtitleWeight: css('ddv-subtitle-wght', measured(header.subtitle.weight, 'el peso de la bajada del informe'), ''),
    subtitleGap: css('ddv-subtitle-gap', measured(header.subtitle.gapPx, 'el aire de la bajada del informe')),
    subtitleColor: colorVar('ddv-subtitle', color(header.subtitle.color, 'la bajada del informe')),
    // La píldora de muestra
    markPadY: css('ddv-mark-pad-y', mark.padding[0]),
    markPadX: css('ddv-mark-pad-x', mark.padding[1]),
    markRadius: css('ddv-mark-radius', mark.radiusPx),
    markFill: colorVar('ddv-mark-fill', color(mark.fill, 'la píldora de muestra')),
    markBorder: css('ddv-mark-border', mark.border.px),
    markBorderColor: colorVar('ddv-mark-border', color(mark.border.color, 'el filo de la píldora')),
    markPx: css('ddv-mark-px', mark.px),
    markWeight: css('ddv-mark-wght', mark.weight, ''),
    markTracking: cssFine('ddv-mark-tracking', tracking(mark.tracking, 'la píldora de muestra')),
    markColor: colorVar('ddv-mark', color(mark.color, 'el texto de la píldora')),
    // Los módulos
    gridGap: css('ddv-grid-gap', mod.gapPx),
    gridColumns: css('ddv-grid-columns', mod.columns, ''),
    modulePadY: css('ddv-module-pad-y', mod.padding[0]),
    modulePadX: css('ddv-module-pad-x', mod.padding[1]),
    moduleRadius: css('ddv-module-radius', mod.radiusPx),
    moduleFill: colorVar('ddv-module-fill', color(mod.fill, 'el módulo')),
    moduleBorder: css('ddv-module-border', mod.border.px),
    moduleBorderColor: colorVar('ddv-module-border', color(mod.border.color, 'el filo del módulo')),
    moduleKickerPx: css('ddv-module-kicker-px', mod.kicker.px),
    moduleKickerWeight: css('ddv-module-kicker-wght', measured(mod.kicker.weight, 'el peso del rótulo del módulo'), ''),
    moduleKickerTracking: cssFine('ddv-module-kicker-tracking', tracking(mod.kicker.tracking, 'el rótulo del módulo')),
    moduleKickerColor: colorVar('ddv-module-kicker', color(mod.kicker.color, 'el rótulo del módulo')),
    moduleTitlePx: css('ddv-module-title-px', mod.title.px),
    moduleTitleTracking: cssFine('ddv-module-title-tracking', tracking(mod.title.tracking, 'el título del módulo')),
    moduleTitleGapTop: css('ddv-module-title-gap-top', measured(mod.title.gapTopPx, 'el aire sobre el título del módulo')),
    moduleTitleGapBottom: css('ddv-module-title-gap-bottom', measured(mod.title.gapBottomPx, 'el aire bajo el título del módulo')),
    // 01 · los nodos
    nodeGap: css('ddv-node-gap', nodes.gapPx),
    nodePadY: css('ddv-node-pad-y', nodes.padding[0]),
    nodePadX: css('ddv-node-pad-x', nodes.padding[1]),
    nodeRadius: css('ddv-node-radius', nodes.radiusPx),
    nodeFill: colorVar('ddv-node-fill', color(nodes.fill, 'el nodo')),
    nodeBorder: css('ddv-node-border', nodes.border.px),
    nodeBorderColor: colorVar('ddv-node-border', color(nodes.border.color, 'el filo del nodo')),
    nodePx: css('ddv-node-px', nodes.px),
    nodeWeight: css('ddv-node-wght', nodes.weight, ''),
    nodeDot: css('ddv-node-dot', nodes.dot.px),
    nodeDotFill: colorVar('ddv-node-dot', color(nodes.dot.fill, 'el punto del nodo')),
    nodeDotGap: css('ddv-node-dot-gap', nodes.dot.gapPx),
    footnotePx: css('ddv-footnote-px', nodes.footnote.px),
    footnoteWeight: css('ddv-footnote-wght', measured(nodes.footnote.weight, 'el peso de la nota del mapa'), ''),
    footnoteGap: css('ddv-footnote-gap', measured(nodes.footnote.gapTopPx, 'el aire de la nota del mapa')),
    footnoteColor: colorVar('ddv-footnote', color(nodes.footnote.color, 'la nota del mapa')),
    // 02 · el veredicto
    optionGap: css('ddv-option-gap', verdict.gapPx),
    optionFlex: css('ddv-option-flex', verdict.flex.option, ''),
    optionFlexSelected: css('ddv-option-flex-selected', verdict.flex.selected, ''),
    optionPadY: css('ddv-option-pad-y', verdict.padding[0]),
    optionPadX: css('ddv-option-pad-x', verdict.padding[1]),
    optionRadius: css('ddv-option-radius', verdict.radiusPx),
    optionPx: css('ddv-option-px', verdict.px),
    optionWeight: css('ddv-option-wght', verdict.weight, ''),
    optionSelectedFill: colorVar('ddv-option-selected-fill', color(verdict.selected.fill, 'la opción elegida')),
    optionSelectedInk: colorVar('ddv-option-selected', color(verdict.selected.color, 'el texto de la opción elegida')),
    optionOtherFill: colorVar('ddv-option-other-fill', color(verdict.other.fill, 'la opción')),
    optionOtherInk: colorVar('ddv-option-other', color(verdict.other.color, 'el texto de la opción')),
    optionBorder: css('ddv-option-border', verdict.other.border.px),
    optionBorderColor: colorVar('ddv-option-border', color(verdict.other.border.color, 'el filo de la opción')),
    conditionPx: css('ddv-condition-px', verdict.condition.px),
    conditionWeight: css('ddv-condition-wght', measured(verdict.condition.weight, 'el peso de la condición'), ''),
    conditionLeading: css('ddv-condition-leading', measured(verdict.condition.lineHeight, 'el interlineado de la condición'), ''),
    conditionGap: css('ddv-condition-gap', measured(verdict.condition.gapTopPx, 'el aire de la condición')),
    conditionColor: colorVar('ddv-condition', color(verdict.condition.color, 'la condición')),
    // 03 · los riesgos
    riskGapTop: css('ddv-risk-gap-top', risks.gapTopPx),
    riskGap: css('ddv-risk-gap', risks.gapPx),
    riskPx: css('ddv-risk-px', risks.px),
    riskWeight: css('ddv-risk-wght', risks.weight, ''),
    riskIcon: css('ddv-risk-icon', risks.icon.px),
    // 04 · el registro
    recordPx: css('ddv-record-px', record.px),
    recordWeight: css('ddv-record-wght', measured(record.weight, 'el peso del registro'), ''),
    recordLeading: css('ddv-record-leading', measured(record.lineHeight, 'el interlineado del registro'), ''),
    // 05 · las olas
    waveGap: css('ddv-wave-gap', waves.gapPx),
    wavePadY: css('ddv-wave-pad-y', waves.padding[0]),
    wavePadX: css('ddv-wave-pad-x', waves.padding[1]),
    waveRadius: css('ddv-wave-radius', waves.radiusPx),
    waveFill: colorVar('ddv-wave-fill', color(waves.fill, 'la ola')),
    waveBorder: css('ddv-wave-border', waves.border.px),
    waveBorderColor: colorVar('ddv-wave-border', color(waves.border.color, 'el filo de la ola')),
    waveNamePx: css('ddv-wave-name-px', waves.name.px),
    waveTitlePx: css('ddv-wave-title-px', waves.title.px),
    waveTitleWeight: css('ddv-wave-title-wght', measured(waves.title.weight, 'el peso del trabajo de la ola'), ''),
    waveTitleLeading: css('ddv-wave-title-leading', measured(waves.title.lineHeight, 'el interlineado del trabajo de la ola'), ''),
    waveTitleGap: css('ddv-wave-title-gap', measured(waves.title.gapPx, 'el aire del trabajo de la ola')),
    waveKickerPx: css('ddv-wave-kicker-px', waves.kicker.px),
    waveKickerWeight: css('ddv-wave-kicker-wght', measured(waves.kicker.weight, 'el peso del rótulo de la ola'), ''),
    waveKickerTracking: cssFine('ddv-wave-kicker-tracking', tracking(waves.kicker.tracking, 'el rótulo de la ola')),
    waveKickerGap: css('ddv-wave-kicker-gap', measured(waves.kicker.gapPx, 'el aire del rótulo de la ola')),
    waveKickerColor: colorVar('ddv-wave-kicker', color(waves.kicker.color, 'el rótulo de la ola'))
  }

  const sampleMark = typeof intent.sampleMark === 'string' && intent.sampleMark.trim() ? intent.sampleMark.trim() : null
  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.decision-diagnosis-verdict',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      report: {
        icon: reportIcon.ref,
        title: req(intent.reportTitle, 'El título del informe (`reportTitle`)'),
        subtitle: req(intent.reportSubtitle, 'La bajada del informe (`reportSubtitle`)')
      },
      ...(sampleMark ? { sampleMark } : {}),
      ...Object.fromEntries(MODULE_SLOTS.map((name, i) => [name, moduleSlots[i]])),
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, reportIcon.asset, alert.asset])
  }
}
