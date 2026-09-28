/**
 * `decision-ai-answer` (TASK-1934): «¿A quién recomienda la IA? A tu competencia.» El mismo prompt en dos ventanas de un
 * motor de IA GENÉRICO: atrás, «Hoy», girada y atenuada, con tres competidores y la fila «Tu marca no aparece»; al
 * frente, «Con AEO», plana y destacada, con tu marca primera (descripción y citas) y dos competidores. Un haz une las
 * ventanas, la plataforma de luz las sostiene (la única órbita) y la voz «viva» va a la izquierda. Referencia aprobada:
 * DeckIARespuesta (MX1-ia-responde).
 *
 * Todo lo que pinta sale de AXIS: la voz, de las reservas y tipos del manifest y del token; las ventanas, el haz, la
 * plataforma, el escenario y la marca, de `surfaces.deck.recipes['decision-ai-answer']`. Dos reglas propias:
 *   - `generic-ai-interface`: el disco del motor lleva un destello dibujado aquí con los colores del token, nunca un
 *     logo, color o forma de un producto real; ninguna imagen externa.
 *   - `illustrative-data-marked`: con datos de muestra (`dataOrigin: 'illustrative'`, el valor por defecto) la marca
 *     «Ejemplo ilustrativo…» es obligatoria; con datos reales del cliente (`'client'`, TASK-1930) se exige su evidencia
 *     (`evidenceRef`) y la marca puede omitirse.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import type { SurfaceAssetRequest } from '../../types'
import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots, type SurfaceManifest } from '../../shared'

import { documentVars, platformSvg, type Glass, type PlatformTokens } from '../close'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured, n, paletteColor, stageSvg, text, type StageTokens } from '../kit'
import { liveVoiceFrame } from '../sections'

type Border = { px: number; color: string; opacity?: number }
type Tint = { color: string; opacity: number }

type RowKind = {
  padding: [number, number]
  gapTopPx: number
  radiusPx?: number
  fill?: Tint
  border?: Border
  number: { px: number; color: string }
  name: { px: number; weight: number }
  desc: { px: number; lineHeight: number; gapPx: number }
}

type CiteKind = { fill: string | Tint; border: Border; color: string }

type AiAnswerTokens = {
  stage: StageTokens
  platform: PlatformTokens
  beam: { from: [number, number]; to: [number, number]; liftPx: number; strokePx: number; glow: { strokePx: number; opacity: number; blurPx: number }; color: string; fromOpacity: number }
  windows: {
    back: { xPx: number; yPx: number; widthPx: number; padding: [number, number, number]; radiusPx: number; perspectivePx: number; rotateYDeg: number; origin: string; opacity: number }
    front: {
      xPx: number
      yPx: number
      widthPx: number
      padding: [number, number, number]
      radiusPx: number
      border: Border
      shadow: { yPx: number; blurPx: number; color: string; opacity: number }
      halo: { blurPx: number; opacity: number }
    }
    header: {
      paddingBottomPx: number
      rule: Border
      disc: { px: number; glyphPx: number; fill: string; glyph: string }
      gapPx: number
      label: { px: number; weight: number }
      status: { px: number; weight: number; tracking: string; uppercase: boolean; padding: [number, number] }
    }
    statusBack: { fill: string; color: string; border: Border }
    statusFront: { fill: string; color: string }
    prompt: { px: number; lineHeight: number; gapTopPx: number; padding: [number, number]; radiusPx: [number, number, number, number]; fill: string; insetPx: number }
    intro: { px: number; lineHeight: number; gapTopPx: number; gapBottomPx: number }
    row: { gapPx: number; numberWidthPx: number; numberLineHeight: number; rest: RowKind; client: RowKind; citesGapTopPx: number; max: number }
    cite: { px: number; weight: number; padding: [number, number]; gapPx: number; globePx: number; max: number; rest: CiteKind; client: CiteKind }
    absent: {
      gapTopPx: number
      padding: [number, number]
      radiusPx: number
      gapPx: number
      fill: string
      border: Border
      circle: { px: number; strokePx: number; color: string }
      text: { px: number; weight: number; color: string }
    }
  }
  mark: { xPx: number; yPx: number; widthPx: number; align: string; px: number; weight: number; color: string }
  glass: Glass
  answerShadow: { color: string }
  signature: { urlBubble: { widthPx: number; bottomPx: number } }
}

type CompetitorIntent = { name?: unknown; description?: unknown; citations?: unknown }

/** El gris suave de la voz sobre oscuro: el `soft` de los tokens de la receta. */
const SOFT = (efeonceGraphicLine as unknown as { slogan: { leadColor: { onDark: string } } }).slogan.leadColor.onDark

/**
 * Un color del token de la receta: `ink`, `muted`, `rule`, `chip` y `fill` son las claves del documento claro
 * (`glass.document`), `soft` es el gris de la voz sobre oscuro, y el resto, la paleta de la línea gráfica o un HEX medido.
 */
const colorOf = (glass: Glass, value: string, what: string): string => {
  if (value === 'soft') return SOFT.toLowerCase()

  const documentColor = (glass.document as unknown as Record<string, unknown>)[value]

  if (typeof documentColor === 'string') return paletteColor(documentColor, what)

  return paletteColor(value, what)
}

/**
 * El destello del motor de IA genérico: cuatro puntas dentro de un disco. Es la forma de la dirección aprobada (en una
 * caja de 20 unidades), no el ícono de ningún producto; sus colores y medidas salen del token.
 */
const SPARK = 'M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8z'

const engineDiscSvg = (disc: AiAnswerTokens['windows']['header']['disc'], fill: string, glyph: string): string => {
  const { px, glyphPx } = disc
  const offset = (px - glyphPx) / 2

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(px)} ${n(px)}" width="${n(px)}" height="${n(px)}" aria-hidden="true" focusable="false">` +
    `<circle cx="${n(px / 2)}" cy="${n(px / 2)}" r="${n(px / 2)}" fill="${fill}"/>` +
    `<svg x="${n(offset)}" y="${n(offset)}" width="${n(glyphPx)}" height="${n(glyphPx)}" viewBox="0 0 20 20"><path d="${SPARK}" fill="${glyph}"/></svg>` +
    '</svg>'
  )
}

/** El globo de una cita (un dominio): círculo, ecuador y meridiano, en una caja de 16 unidades, del color del chip. */
const globeSvg = (globePx: number, color: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${n(globePx)}" height="${n(globePx)}" aria-hidden="true" focusable="false">` +
  `<circle cx="8" cy="8" r="6.4" fill="none" stroke="${color}" stroke-width="1.3"/>` +
  `<path d="M1.8 8h12.4M8 1.6c2.1 2.2 2.1 10.6 0 12.8M8 1.6c-2.1 2.2-2.1 10.6 0 12.8" fill="none" stroke="${color}" stroke-width="1.1"/>` +
  '</svg>'

/** El haz de la ventana de hoy a la de con AEO: una curva que se apaga hacia su destino, con su resplandor. */
const beamSvg = (manifest: SurfaceManifest, beam: AiAnswerTokens['beam']): string => {
  const { width, height } = manifest.canvas
  const [x1, y1] = beam.from
  const [x2, y2] = beam.to
  const color = paletteColor(beam.color, 'el haz')
  const path = `M ${n(x1)} ${n(y1)} Q ${n((x1 + x2) / 2)} ${n(Math.min(y1, y2) - beam.liftPx)} ${n(x2)} ${n(y2)}`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false">` +
    `<defs><linearGradient id="aa-beam" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"><stop offset="0" stop-color="${color}" stop-opacity="${n(beam.fromOpacity)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>` +
    `<filter id="aa-beam-glow"><feGaussianBlur stdDeviation="${n(beam.glow.blurPx)}"/></filter></defs>` +
    `<path d="${path}" fill="none" stroke="url(#aa-beam)" stroke-width="${n(beam.glow.strokePx)}" opacity="${n(beam.glow.opacity)}" filter="url(#aa-beam-glow)"/>` +
    `<path d="${path}" fill="none" stroke="url(#aa-beam)" stroke-width="${n(beam.strokePx)}"/>` +
    '</svg>'
  )
}

/** Las citas de una fila: de 0 a `max` dominios, cada uno con el globo de su tono. */
const citationsOf = (value: unknown, max: number, icon: string, what: string): { icon: string; text: string }[] | undefined => {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value)) throw new SurfacePieceError(`${what} va como lista de dominios.`, 'invalid-intent')
  if (value.length > max) throw new SurfacePieceError(`${what} lleva hasta ${max} citas.`, 'invalid-intent')
  if (value.length === 0) return undefined

  return value.map((cite, i) => ({ icon, text: text(cite, `${what} (${i + 1})`) }))
}

/** El texto de una fila del intent, recortado; vacío o ausente devuelve `undefined` (el campo es opcional). */
const optional = (value: unknown): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : ''

  return trimmed || undefined
}

/** El relleno vertical y horizontal de una pieza como dos custom properties (`--gl-aa-<pieza>-pad-y|x`). */
const pad = (name: string, [y, x]: [number, number]) => ({
  [`${name}PadY`]: css(`aa-${name}-pad-y`, y),
  [`${name}PadX`]: css(`aa-${name}-pad-x`, x)
})

export const decisionAiAnswer: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const tokens = recipe as unknown as AiAnswerTokens
  const windows = measured(tokens.windows, 'las ventanas del motor de IA')
  const glass = measured(tokens.glass, 'el documento claro de las ventanas')
  const mark = measured(tokens.mark, 'la marca de datos ilustrativos')
  const lum = measured(tokens.signature?.urlBubble, 'la burbuja en luminosidad')
  const { header, row, cite, absent, prompt, intro } = windows
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)

  if (!content.body) throw new SurfacePieceError('La lámina lleva su evidencia (`body`).', 'invalid-intent')
  if (!voice.answerLead) throw new SurfacePieceError('La respuesta va en dos líneas (`voice.answer`, p. ej. «A tu» / «competencia»).', 'invalid-intent')
  if (windows.back.origin !== 'end') throw new SurfacePieceError(`La ventana de hoy gira desde su borde final; AXIS pide «${windows.back.origin}».`, 'invalid-intent')
  if (mark.align !== 'end') throw new SurfacePieceError(`La marca de datos va alineada al final; AXIS pide «${mark.align}».`, 'invalid-intent')
  if (!header.status.uppercase) throw new SurfacePieceError('La etiqueta de estado de la ventana va en mayúsculas.', 'invalid-intent')

  // `illustrative-data-marked`: la muestra se marca siempre; los datos reales llegan con su evidencia.
  const dataOrigin = intent.dataOrigin === undefined ? 'illustrative' : intent.dataOrigin

  if (dataOrigin !== 'illustrative' && dataOrigin !== 'client') {
    throw new SurfacePieceError('`dataOrigin` es «illustrative» (muestra, el valor por defecto) o «client» (datos reales del cliente).', 'invalid-intent')
  }

  const markText = optional(intent.mark)
  const evidenceRef = optional(intent.evidenceRef)

  if (dataOrigin === 'illustrative' && !markText) {
    throw new SurfacePieceError('Con datos ilustrativos la lámina lleva su marca (`mark`: «Ejemplo ilustrativo · tu diagnóstico muestra tu situación real»).', 'invalid-intent')
  }

  if (dataOrigin === 'client' && !evidenceRef) {
    throw new SurfacePieceError('Con datos reales del cliente la lámina exige su evidencia (`evidenceRef`).', 'invalid-intent')
  }

  const today = (intent.today ?? {}) as { status?: unknown; intro?: unknown; competitors?: unknown; absent?: unknown }
  const withAeo = (intent.withAeo ?? {}) as { status?: unknown; intro?: unknown; client?: CompetitorIntent; competitors?: unknown }
  const competitorsToday = (Array.isArray(today.competitors) ? today.competitors : []) as CompetitorIntent[]
  const competitorsWithAeo = Array.isArray(withAeo.competitors) ? withAeo.competitors : []
  const client = withAeo.client ?? {}

  if (competitorsToday.length !== row.max) {
    throw new SurfacePieceError(`La ventana de hoy lleva ${row.max} competidores (\`today.competitors\`).`, 'invalid-intent')
  }

  if (competitorsWithAeo.length !== row.max - 1) {
    throw new SurfacePieceError(`La ventana con AEO lleva ${row.max - 1} competidores después de tu marca (\`withAeo.competitors\`).`, 'invalid-intent')
  }

  const color = (value: string, what: string) => colorOf(glass, value, what)

  // Los activos: todos SVG dibujados aquí con los colores del token (interfaz genérica: ninguna imagen externa).
  const stage = layerAsset('decision-ai-answer-stage', stageSvg(manifest, measured(tokens.stage, 'el escenario'), 'aa'))
  const platform = layerAsset('decision-ai-answer-platform', platformSvg(manifest, measured(tokens.platform, 'la plataforma'), 'aa'))
  const beam = layerAsset('decision-ai-answer-beam', beamSvg(manifest, measured(tokens.beam, 'el haz entre las ventanas')))
  const disc = layerAsset('decision-ai-answer-engine', engineDiscSvg(header.disc, color(header.disc.fill, 'el disco del motor'), color(header.disc.glyph, 'el destello del motor')))
  const globeRest = layerAsset('decision-ai-answer-globe-rest', globeSvg(cite.globePx, color(cite.rest.color, 'las citas')))
  const globeClient = layerAsset('decision-ai-answer-globe-client', globeSvg(cite.globePx, color(cite.client.color, 'las citas de tu marca')))
  const assets: SurfaceAssetRequest[] = [stage.asset, platform.asset, beam.asset, disc.asset, globeRest.asset, globeClient.asset]

  const promptText = text(intent.prompt, 'El prompt del comprador (`prompt`)')
  const engine = text(intent.engine, 'El nombre del motor genérico (`engine`, p. ej. «Motor de IA»)')

  const clientCite = cite.client.fill as Tint
  const clientFill = measured(row.client.fill, 'el relleno de la fila de tu marca')
  const clientBorder = measured(row.client.border, 'el borde de la fila de tu marca')
  const clientRadius = measured(row.client.radiusPx, 'el radio de la fila de tu marca')

  const frame: Record<string, unknown> = {
    line: intent.line,
    ...liveVoiceFrame(manifest, recipe, voice.question ?? '', 'aa'),
    ...documentVars(glass, 'aa'),
    docEdge: css('aa-doc-edge', measured((glass.document.edge as { px?: number }).px, 'el filete del documento claro')),
    docEdgeColor: colorVar('aa-doc-edge', color(glass.document.edge.color, 'el filete del documento claro')),
    answerShadowColor: colorVar('aa-answer-shadow', color(measured(tokens.answerShadow?.color, 'el color de la sombra de la respuesta'), 'la sombra de la respuesta')),
    haloColor: colorVar('aa-halo', paletteColor('halo', 'el halo')),
    // la ventana de hoy: atrás, girada desde su borde final y atenuada
    backLeft: css('aa-back-left', windows.back.xPx),
    backTop: css('aa-back-top', windows.back.yPx),
    backWidth: css('aa-back-width', windows.back.widthPx),
    backPadTop: css('aa-back-pad-top', windows.back.padding[0]),
    backPadX: css('aa-back-pad-x', windows.back.padding[1]),
    backPadBottom: css('aa-back-pad-bottom', windows.back.padding[2]),
    backRadius: css('aa-back-radius', windows.back.radiusPx),
    backPerspective: css('aa-back-perspective', windows.back.perspectivePx),
    backRotate: css('aa-back-rotate', windows.back.rotateYDeg, 'deg'),
    backOpacity: css('aa-back-opacity', windows.back.opacity, ''),
    // la ventana con AEO: al frente, plana, con el borde de halo, su sombra y su resplandor
    frontLeft: css('aa-front-left', windows.front.xPx),
    frontTop: css('aa-front-top', windows.front.yPx),
    frontWidth: css('aa-front-width', windows.front.widthPx),
    frontPadTop: css('aa-front-pad-top', windows.front.padding[0]),
    frontPadX: css('aa-front-pad-x', windows.front.padding[1]),
    frontPadBottom: css('aa-front-pad-bottom', windows.front.padding[2]),
    frontRadius: css('aa-front-radius', windows.front.radiusPx),
    frontBorder: css('aa-front-border', windows.front.border.px),
    frontBorderColor: colorVar('aa-front-border', color(windows.front.border.color, 'el borde de la ventana con AEO')),
    frontBorderOpacity: css('aa-front-border-opacity', (windows.front.border.opacity ?? 1) * 100, '%'),
    frontShadowColor: colorVar('aa-front-shadow', color(windows.front.shadow.color, 'la sombra de la ventana con AEO')),
    frontShadowY: css('aa-front-shadow-y', windows.front.shadow.yPx),
    frontShadowBlur: css('aa-front-shadow-blur', windows.front.shadow.blurPx),
    frontShadowOpacity: css('aa-front-shadow-opacity', windows.front.shadow.opacity * 100, '%'),
    frontHaloBlur: css('aa-front-halo-blur', windows.front.halo.blurPx),
    frontHaloOpacity: css('aa-front-halo-opacity', windows.front.halo.opacity * 100, '%'),
    // la cabecera: el disco del motor, su nombre y la etiqueta de estado
    headPadBottom: css('aa-head-pad-bottom', header.paddingBottomPx),
    headRule: css('aa-head-rule', header.rule.px),
    headRuleColor: colorVar('aa-head-rule', color(header.rule.color, 'el filete de la cabecera')),
    discPx: css('aa-disc-px', header.disc.px),
    headGap: css('aa-head-gap', header.gapPx),
    labelPx: css('aa-label-px', header.label.px),
    labelWeight: css('aa-label-wght', header.label.weight, ''),
    statusPx: css('aa-status-px', header.status.px),
    statusWeight: css('aa-status-wght', header.status.weight, ''),
    statusTracking: css('aa-status-tracking', Number.parseFloat(header.status.tracking), 'em'),
    ...pad('status', header.status.padding),
    statusBackFill: colorVar('aa-status-back-fill', color(windows.statusBack.fill, 'la etiqueta de hoy')),
    statusBackColor: colorVar('aa-status-back', color(windows.statusBack.color, 'la etiqueta de hoy')),
    statusBackBorder: css('aa-status-back-border', windows.statusBack.border.px),
    statusBackBorderColor: colorVar('aa-status-back-border', color(windows.statusBack.border.color, 'el borde de la etiqueta de hoy')),
    statusFrontFill: colorVar('aa-status-front-fill', color(windows.statusFront.fill, 'la etiqueta con AEO')),
    statusFrontColor: colorVar('aa-status-front', color(windows.statusFront.color, 'la etiqueta con AEO')),
    // el prompt del comprador: la burbuja del usuario, idéntica en las dos ventanas
    promptPx: css('aa-prompt-px', prompt.px),
    promptLeading: css('aa-prompt-leading', prompt.lineHeight, ''),
    promptGap: css('aa-prompt-gap', prompt.gapTopPx),
    ...pad('prompt', prompt.padding),
    promptRadiusA: css('aa-prompt-radius-a', prompt.radiusPx[0]),
    promptRadiusB: css('aa-prompt-radius-b', prompt.radiusPx[1]),
    promptRadiusC: css('aa-prompt-radius-c', prompt.radiusPx[2]),
    promptRadiusD: css('aa-prompt-radius-d', prompt.radiusPx[3]),
    promptFill: colorVar('aa-prompt-fill', color(prompt.fill, 'la burbuja del prompt')),
    promptInset: css('aa-prompt-inset', prompt.insetPx),
    // la entrada de la respuesta
    introPx: css('aa-intro-px', intro.px),
    introLeading: css('aa-intro-leading', intro.lineHeight, ''),
    introGapTop: css('aa-intro-gap-top', intro.gapTopPx),
    introGapBottom: css('aa-intro-gap-bottom', intro.gapBottomPx),
    // las filas de la respuesta: el resto y la de tu marca
    rowGap: css('aa-row-gap', row.gapPx),
    numberWidth: css('aa-number-width', row.numberWidthPx),
    numberLeading: css('aa-number-leading', measured(row.numberLineHeight, 'el interlineado del número de fila'), ''),
    ...pad('rest', row.rest.padding),
    restGapTop: css('aa-rest-gap-top', row.rest.gapTopPx),
    restNumberPx: css('aa-rest-number-px', row.rest.number.px),
    restNumberColor: colorVar('aa-rest-number', color(row.rest.number.color, 'el número de las filas')),
    restNamePx: css('aa-rest-name-px', row.rest.name.px),
    restNameWeight: css('aa-rest-name-wght', row.rest.name.weight, ''),
    restDescPx: css('aa-rest-desc-px', row.rest.desc.px),
    restDescLeading: css('aa-rest-desc-leading', row.rest.desc.lineHeight, ''),
    restDescGap: css('aa-rest-desc-gap', row.rest.desc.gapPx),
    ...pad('client', row.client.padding),
    clientGapTop: css('aa-client-gap-top', row.client.gapTopPx),
    clientRadius: css('aa-client-radius', clientRadius),
    clientFill: colorVar('aa-client-fill', color(clientFill.color, 'la fila de tu marca')),
    clientFillOpacity: css('aa-client-fill-opacity', clientFill.opacity * 100, '%'),
    clientBorder: css('aa-client-border', clientBorder.px),
    clientBorderColor: colorVar('aa-client-border', color(clientBorder.color, 'el borde de la fila de tu marca')),
    clientNumberPx: css('aa-client-number-px', row.client.number.px),
    clientNumberColor: colorVar('aa-client-number', color(row.client.number.color, 'el número de tu marca')),
    clientNamePx: css('aa-client-name-px', row.client.name.px),
    clientNameWeight: css('aa-client-name-wght', row.client.name.weight, ''),
    clientDescPx: css('aa-client-desc-px', row.client.desc.px),
    clientDescLeading: css('aa-client-desc-leading', row.client.desc.lineHeight, ''),
    clientDescGap: css('aa-client-desc-gap', row.client.desc.gapPx),
    citesGap: css('aa-cites-gap', row.citesGapTopPx),
    // las citas: el dominio con su globo
    citePx: css('aa-cite-px', cite.px),
    citeWeight: css('aa-cite-wght', cite.weight, ''),
    ...pad('cite', cite.padding),
    citeGap: css('aa-cite-gap', cite.gapPx),
    globePx: css('aa-globe-px', cite.globePx),
    citeRestFill: colorVar('aa-cite-rest-fill', color(cite.rest.fill as string, 'las citas')),
    citeRestBorder: css('aa-cite-rest-border', cite.rest.border.px),
    citeRestBorderColor: colorVar('aa-cite-rest-border', color(cite.rest.border.color, 'el borde de las citas')),
    citeRestColor: colorVar('aa-cite-rest', color(cite.rest.color, 'las citas')),
    citeClientFill: colorVar('aa-cite-client-fill', color(clientCite.color, 'las citas de tu marca')),
    citeClientFillOpacity: css('aa-cite-client-fill-opacity', clientCite.opacity * 100, '%'),
    citeClientBorder: css('aa-cite-client-border', cite.client.border.px),
    citeClientBorderColor: colorVar('aa-cite-client-border', color(cite.client.border.color, 'el borde de las citas de tu marca')),
    citeClientBorderOpacity: css('aa-cite-client-border-opacity', (cite.client.border.opacity ?? 1) * 100, '%'),
    citeClientColor: colorVar('aa-cite-client', color(cite.client.color, 'las citas de tu marca')),
    // la fila «tu marca no aparece»
    absentGapTop: css('aa-absent-gap-top', absent.gapTopPx),
    ...pad('absent', absent.padding),
    absentRadius: css('aa-absent-radius', absent.radiusPx),
    absentGap: css('aa-absent-gap', absent.gapPx),
    absentFill: colorVar('aa-absent-fill', color(absent.fill, 'la fila ausente')),
    absentBorder: css('aa-absent-border', absent.border.px),
    absentBorderColor: colorVar('aa-absent-border', color(absent.border.color, 'el borde de la fila ausente')),
    absentCirclePx: css('aa-absent-circle-px', absent.circle.px),
    absentCircleStroke: css('aa-absent-circle-stroke', absent.circle.strokePx),
    absentCircleColor: colorVar('aa-absent-circle', color(absent.circle.color, 'el círculo vacío')),
    absentPx: css('aa-absent-px', absent.text.px),
    absentWeight: css('aa-absent-wght', absent.text.weight, ''),
    absentColor: colorVar('aa-absent', color(absent.text.color, 'la fila ausente')),
    // la marca de datos ilustrativos, bajo la ventana con AEO
    markLeft: css('aa-mark-left', mark.xPx),
    markTop: css('aa-mark-top', mark.yPx),
    markWidth: css('aa-mark-width', mark.widthPx),
    markPx: css('aa-mark-px', mark.px),
    markWeight: css('aa-mark-wght', mark.weight, ''),
    markColor: colorVar('aa-mark', color(mark.color, 'la marca de datos')),
    lumWidth: css('lum-width', lum.widthPx),
    lumBottom: css('lum-bottom', lum.bottomPx)
  }

  const numberOf = (i: number) => String(i + 1)

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.decision-ai-answer',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beam: { src: beam.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      back: {
        engineIcon: disc.ref,
        engine,
        status: text(today.status, 'La etiqueta de la ventana de hoy (`today.status`, p. ej. «Hoy»)'),
        prompt: promptText,
        intro: text(today.intro, 'La entrada de la respuesta de hoy (`today.intro`)'),
        absent: text(today.absent, 'La fila de tu marca ausente (`today.absent`, p. ej. «Tu marca no aparece»)')
      },
      backRows: competitorsToday.map((competitor, i) => {
        const description = optional(competitor.description)
        const citations = citationsOf(competitor.citations, cite.max, globeRest.ref, `Las citas del competidor ${i + 1} de hoy`)

        return {
          number: numberOf(i),
          name: text(competitor.name, `El competidor ${i + 1} de hoy (\`today.competitors[${i}].name\`)`),
          ...(description ? { description } : {}),
          ...(citations ? { citations } : {})
        }
      }),
      front: {
        engineIcon: disc.ref,
        engine,
        status: text(withAeo.status, 'La etiqueta de la ventana con AEO (`withAeo.status`, p. ej. «Con AEO»)'),
        prompt: promptText,
        intro: text(withAeo.intro, 'La entrada de la respuesta con AEO (`withAeo.intro`)')
      },
      client: (() => {
        const citations = citationsOf(client.citations, cite.max, globeClient.ref, 'Las citas de tu marca (`withAeo.client.citations`)')

        return {
          number: numberOf(0),
          name: text(client.name, 'Tu marca (`withAeo.client.name`)'),
          description: text(client.description, 'La descripción de tu marca (`withAeo.client.description`)'),
          ...(citations ? { citations } : {})
        }
      })(),
      frontRows: competitorsWithAeo.map((name, i) => ({
        number: numberOf(i + 1),
        name: text(name, `El competidor ${i + 1} con AEO (\`withAeo.competitors[${i}]\`)`)
      })),
      ...(markText ? { mark: markText } : {}),
      provenance: { dataOrigin, ...(evidenceRef ? { evidenceRef } : {}) },
      ...(selection ? { selection } : {})
    },
    assets
  }
}
