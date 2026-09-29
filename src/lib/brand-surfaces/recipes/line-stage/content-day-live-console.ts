/**
 * `content-day-live-console` (deck Salesforce, SF11, TASK-1942): «¿Y después del go-live? Lo operamos.». La consola de
 * la operación gestionada abierta, en papel y en perspectiva sobre la plataforma de luz: cabecera (el ícono oficial del
 * producto, opcional; título, productos operados y la píldora «Datos de muestra»), tres cifras del mes con su detalle,
 * cuatro controles con su estado y la franja de la revisión trimestral, que es lo que toma la selección «Cliente».
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-day-live-console']`). El CONTENIDO
 * llega en el intent: `console` con `icon` (opcional), `title`, `subtitle`, `sampleMark`, `metrics` (tres: `value`,
 * `label`, `detail`), `checks` (cuatro: `label`, `status`, `done`) y `review` (`kicker`, `title`, `cta`).
 *
 * Reglas de la receta que se cierran aquí: cada cifra con su detalle (de dónde sale); al menos un control en curso (la
 * operación no se muestra terminada); y la píldora «Datos de muestra» sólo se omite con datos del cliente respaldados
 * por evidencia (`console.evidenceRef`).
 */

import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, measured } from '../kit'

import { twoLineAnswer } from './content-day-release-cycle'
import { cssFine, documentVars, exactly, lineColor, lineVoiceFrame, lumVars, productIcon, req, stageLayers, uniqueAssets, type LineDocument } from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; gapTopPx?: number; color?: string; uppercase?: boolean }
type Border = { px: number; color: string; inset?: boolean }

type ConsoleTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  document: LineDocument
  perspectivePx: number
  rotateYDeg: number
  rotateXDeg: number
  origin: 'start' | 'end'
  header: { paddingBottomPx: number; gapBottomPx: number; rule: string; icon: { px: number; gapPx: number }; title: Text; subtitle: Text }
  mark: Text & { padding: [number, number]; radiusPx: number; fill: string; border: Border }
  metrics: { count: number; columns: number; gapPx: number; padding: [number, number]; radiusPx: number; fill: string; border: Border; label: Text; value: Text; detail: Text }
  checks: {
    count: number
    gapTopPx: number
    paddingYPx: number
    gapPx: number
    rule: string
    label: Text
    status: { padding: [number, number]; radiusPx: number; px: number; weight: number; done: { fill: string; color: string }; open: { ring: { px: number; color: string }; color: string } }
  }
  review: {
    gapTopPx: number
    padding: [number, number]
    radiusPx: number
    fill: string
    gapPx: number
    kicker: Text
    title: Text
    cta: { padding: [number, number]; radiusPx: number; fill: string; color: string; px: number; weight: number }
  }
}

type MetricIntent = { value?: unknown; label?: unknown; detail?: unknown }
type CheckIntent = { label?: unknown; status?: unknown; done?: unknown }
type ConsoleIntent = {
  icon?: unknown
  title?: unknown
  subtitle?: unknown
  sampleMark?: unknown
  evidenceRef?: unknown
  metrics?: unknown
  checks?: unknown
  review?: { kicker?: unknown; title?: unknown; cta?: unknown }
}

/**
 * Un término compuesto de la pregunta («go-live») no se corta en su guion (catálogo de recetas, `question`): el
 * WORD JOINER (U+2060, invisible) después del guion quita esa oportunidad de corte sin cambiar el texto que se ve.
 */
export const joinCompounds = (text: string): string => text.replace(/(\p{L})-(?=\p{L})/gu, '$1-\u2060')

const tracking = (value: string | undefined, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

export const contentDayLiveConsole: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const t = measured(recipe.console as ConsoleTokens | undefined, 'la consola de la operación')
  const content = contentOf(manifest)
  const voiceRaw = voiceSlots(manifest)
  const voice = { ...voiceRaw, question: joinCompounds(voiceRaw.question!) }
  const doc = t.document
  const { header, mark, metrics: metricsT, checks: checksT, review: reviewT } = t

  twoLineAnswer(voice, 'la operación gestionada')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const c = (intent.console ?? {}) as ConsoleIntent
  const sampleMark = typeof c.sampleMark === 'string' && c.sampleMark.trim() ? c.sampleMark.trim() : null

  // La píldora es obligatoria mientras las cifras sean de muestra: sólo se omite con datos del cliente con evidencia.
  if (!sampleMark && !(typeof c.evidenceRef === 'string' && c.evidenceRef.trim())) {
    throw new SurfacePieceError('La consola lleva «Datos de muestra» (`console.sampleMark`) salvo que las cifras vengan del cliente con su evidencia (`console.evidenceRef`).', 'invalid-intent')
  }

  const metrics = exactly<MetricIntent>(c.metrics, metricsT.count, 'Las cifras del mes (`console.metrics`)').map((m, i) => ({
    value: req(m.value, `La cifra ${i + 1} (\`console.metrics[${i}].value\`)`),
    label: req(m.label, `El rótulo de la cifra ${i + 1} (\`console.metrics[${i}].label\`)`),
    detail: req(m.detail, `La cifra ${i + 1} va con su detalle, de dónde sale (\`console.metrics[${i}].detail\`)`)
  }))

  const checks = exactly<CheckIntent>(c.checks, checksT.count, 'Los controles (`console.checks`)').map((check, i) => {
    if (typeof check.done !== 'boolean') throw new SurfacePieceError(`El control ${i + 1} (\`console.checks[${i}].done\`) declara si está resuelto (true o false).`, 'invalid-intent')

    return {
      label: req(check.label, `El control ${i + 1} (\`console.checks[${i}].label\`)`),
      status: req(check.status, `El estado del control ${i + 1} (\`console.checks[${i}].status\`)`),
      state: check.done ? 'done' : 'todo'
    }
  })

  if (checks.every(check => check.state === 'done')) {
    throw new SurfacePieceError('Al menos un control va en curso: la operación gestionada no se muestra terminada.', 'invalid-intent')
  }

  const r = c.review ?? {}
  const icon = c.icon === undefined || c.icon === null ? null : productIcon(c.icon, 'El ícono de la consola (`console.icon`)')
  const { stage, platform } = stageLayers(manifest, recipe, line, 'clv')
  const status = checksT.status

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...documentVars(doc, line),
    // La consola en perspectiva
    consoleLeft: css('clv-left', t.xPx),
    consoleTop: css('clv-top', t.yPx),
    consoleWidth: css('clv-width', t.widthPx),
    consolePadTop: css('clv-pad-top', t.padding[0]),
    consolePadX: css('clv-pad-x', t.padding[1]),
    consolePadBottom: css('clv-pad-bottom', t.padding[2]),
    consoleRadius: css('clv-radius', t.radiusPx),
    perspective: css('clv-perspective', t.perspectivePx),
    rotateY: css('clv-rotate-y', t.rotateYDeg, 'deg'),
    rotateX: css('clv-rotate-x', t.rotateXDeg, 'deg'),
    // `origin: 'start'` = el borde izquierdo al centro (0 %); `end` = el derecho (100 %).
    originX: css('clv-origin-x', t.origin === 'start' ? 0 : 100, '%'),
    // La cabecera
    headPadBottom: css('clv-head-pad-bottom', header.paddingBottomPx),
    headGapBottom: css('clv-head-gap-bottom', header.gapBottomPx),
    headRule: colorVar('clv-head-rule', lineColor(header.rule, line, 'el filete de la cabecera', doc)),
    iconSize: css('clv-icon', header.icon.px),
    iconGap: css('clv-icon-gap', header.icon.gapPx),
    titlePx: css('clv-title-px', header.title.px),
    titleTracking: cssFine('clv-title-tracking', tracking(header.title.tracking, 'el título de la consola')),
    subtitlePx: css('clv-subtitle-px', header.subtitle.px),
    subtitleWeight: css('clv-subtitle-wght', measured(header.subtitle.weight, 'el peso de la bajada de la consola'), ''),
    subtitleGap: css('clv-subtitle-gap', measured(header.subtitle.gapPx, 'el aire de la bajada de la consola')),
    subtitleColor: colorVar('clv-subtitle', lineColor(measured(header.subtitle.color, 'el color de la bajada'), line, 'la bajada de la consola', doc)),
    // La píldora de muestra
    markPadY: css('clv-mark-pad-y', mark.padding[0]),
    markPadX: css('clv-mark-pad-x', mark.padding[1]),
    markRadius: css('clv-mark-radius', mark.radiusPx),
    markFill: colorVar('clv-mark-fill', lineColor(mark.fill, line, 'la píldora de muestra', doc)),
    markBorder: css('clv-mark-border', mark.border.px),
    markBorderColor: colorVar('clv-mark-border', lineColor(mark.border.color, line, 'el filete de la píldora', doc)),
    markPx: css('clv-mark-px', mark.px),
    markWeight: css('clv-mark-wght', measured(mark.weight, 'el peso de la píldora'), ''),
    markTracking: cssFine('clv-mark-tracking', tracking(mark.tracking, 'la píldora')),
    markColor: colorVar('clv-mark', lineColor(measured(mark.color, 'el color de la píldora'), line, 'la píldora', doc)),
    // Las cifras
    metricsColumns: css('clv-metrics-columns', metricsT.columns, ''),
    metricsGap: css('clv-metrics-gap', metricsT.gapPx),
    metricPadY: css('clv-metric-pad-y', metricsT.padding[0]),
    metricPadX: css('clv-metric-pad-x', metricsT.padding[1]),
    metricRadius: css('clv-metric-radius', metricsT.radiusPx),
    metricFill: colorVar('clv-metric-fill', lineColor(metricsT.fill, line, 'la ficha de la cifra', doc)),
    metricBorder: css('clv-metric-border', metricsT.border.px),
    metricBorderColor: colorVar('clv-metric-border', lineColor(metricsT.border.color, line, 'el filete de la cifra', doc)),
    metricLabelPx: css('clv-metric-label-px', metricsT.label.px),
    metricLabelWeight: css('clv-metric-label-wght', measured(metricsT.label.weight, 'el peso del rótulo de la cifra'), ''),
    metricLabelTracking: cssFine('clv-metric-label-tracking', tracking(metricsT.label.tracking, 'el rótulo de la cifra')),
    metricLabelColor: colorVar('clv-metric-label', lineColor(measured(metricsT.label.color, 'el color del rótulo'), line, 'el rótulo de la cifra', doc)),
    metricValuePx: css('clv-metric-value-px', metricsT.value.px),
    metricValueTracking: cssFine('clv-metric-value-tracking', tracking(metricsT.value.tracking, 'la cifra')),
    metricValueGap: css('clv-metric-value-gap', measured(metricsT.value.gapTopPx, 'el aire de la cifra')),
    metricDetailPx: css('clv-metric-detail-px', metricsT.detail.px),
    metricDetailWeight: css('clv-metric-detail-wght', measured(metricsT.detail.weight, 'el peso del detalle'), ''),
    metricDetailGap: css('clv-metric-detail-gap', measured(metricsT.detail.gapTopPx, 'el aire del detalle')),
    metricDetailColor: colorVar('clv-metric-detail', lineColor(measured(metricsT.detail.color, 'el color del detalle'), line, 'el detalle de la cifra', doc)),
    // Los controles
    checksGap: css('clv-checks-gap', checksT.gapTopPx),
    checkPadY: css('clv-check-pad-y', checksT.paddingYPx),
    checkGap: css('clv-check-gap', checksT.gapPx),
    checkRule: colorVar('clv-check-rule', lineColor(checksT.rule, line, 'el filete de los controles', doc)),
    checkLabelPx: css('clv-check-label-px', checksT.label.px),
    checkLabelWeight: css('clv-check-label-wght', measured(checksT.label.weight, 'el peso del control'), ''),
    statusPadY: css('clv-status-pad-y', status.padding[0]),
    statusPadX: css('clv-status-pad-x', status.padding[1]),
    statusRadius: css('clv-status-radius', status.radiusPx),
    statusPx: css('clv-status-px', status.px),
    statusWeight: css('clv-status-wght', status.weight, ''),
    statusDoneFill: colorVar('clv-status-done-fill', lineColor(status.done.fill, line, 'el estado resuelto', doc)),
    statusDoneInk: colorVar('clv-status-done-ink', lineColor(status.done.color, line, 'el texto del estado resuelto', doc)),
    statusOpenRing: css('clv-status-open-ring', status.open.ring.px),
    statusOpenRingColor: colorVar('clv-status-open-ring', lineColor(status.open.ring.color, line, 'el contorno del estado en curso', doc)),
    statusOpenInk: colorVar('clv-status-open-ink', lineColor(status.open.color, line, 'el texto del estado en curso', doc)),
    // La revisión trimestral
    reviewGap: css('clv-review-gap', reviewT.gapTopPx),
    reviewPadY: css('clv-review-pad-y', reviewT.padding[0]),
    reviewPadX: css('clv-review-pad-x', reviewT.padding[1]),
    reviewRadius: css('clv-review-radius', reviewT.radiusPx),
    reviewFill: colorVar('clv-review-fill', lineColor(reviewT.fill, line, 'la franja de la revisión', doc)),
    reviewInnerGap: css('clv-review-inner-gap', reviewT.gapPx),
    reviewKickerPx: css('clv-review-kicker-px', reviewT.kicker.px),
    reviewKickerWeight: css('clv-review-kicker-wght', measured(reviewT.kicker.weight, 'el peso del antetítulo'), ''),
    reviewKickerTracking: cssFine('clv-review-kicker-tracking', tracking(reviewT.kicker.tracking, 'el antetítulo')),
    reviewKickerColor: colorVar('clv-review-kicker', lineColor(measured(reviewT.kicker.color, 'el color del antetítulo'), line, 'el antetítulo de la revisión')),
    reviewTitlePx: css('clv-review-title-px', reviewT.title.px),
    reviewTitleWeight: css('clv-review-title-wght', measured(reviewT.title.weight, 'el peso de la revisión'), ''),
    reviewTitleGap: css('clv-review-title-gap', measured(reviewT.title.gapPx, 'el aire de la revisión')),
    reviewTitleColor: colorVar('clv-review-title', lineColor(measured(reviewT.title.color, 'el color de la revisión'), line, 'la revisión')),
    ctaPadY: css('clv-cta-pad-y', reviewT.cta.padding[0]),
    ctaPadX: css('clv-cta-pad-x', reviewT.cta.padding[1]),
    ctaRadius: css('clv-cta-radius', reviewT.cta.radiusPx),
    ctaFill: colorVar('clv-cta-fill', lineColor(reviewT.cta.fill, line, 'el botón', doc)),
    ctaInk: colorVar('clv-cta-ink', lineColor(reviewT.cta.color, line, 'el texto del botón', doc)),
    ctaPx: css('clv-cta-px', reviewT.cta.px),
    ctaWeight: css('clv-cta-wght', reviewT.cta.weight, '')
  }

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.content-day-live-console',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      console: {
        title: req(c.title, 'El título de la consola (`console.title`)'),
        subtitle: req(c.subtitle, 'Los productos operados (`console.subtitle`), en texto')
      },
      ...(icon ? { consoleIcon: { src: icon.ref } } : {}),
      ...(sampleMark ? { sampleMark } : {}),
      metrics,
      checks,
      review: {
        kicker: req(r.kicker, 'El antetítulo de la revisión (`console.review.kicker`)'),
        title: req(r.title, 'Qué se revisa (`console.review.title`)'),
        cta: req(r.cta, 'El botón de la revisión (`console.review.cta`)')
      },
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, ...(icon ? [icon.asset] : [])])
  }
}
