/**
 * Builders de las recetas APROBADAS de la superficie deck (catálogo `graphic-line-deck`).
 *
 * Cada builder recibe el intent, el manifest que resolvió AXIS y los tokens de la receta, y devuelve los
 * slots de la lámina. No decide copy ni elige plantilla: traduce medidas y contenido ya gobernados.
 */

import { paintGraphicLine } from '@efeoncepro/axis-graphic-line'
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { resolveGraphicLineIntent } from '@efeoncepro/axis-ui-contracts'

import type { RecipeSlots, SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import {
  answerPxWithinRange,
  clamp,
  contentOf,
  iconAsset,
  lower,
  ofHeight,
  plateAsset,
  plateFrom,
  reserve,
  selectionSlot,
  upper,
  voiceSlots,
  type SurfaceContent,
  type SurfaceIntent,
  type SurfaceManifest
} from '../shared'

export interface RecipeContext {
  intent: SurfaceIntent
  manifest: SurfaceManifest
  /** `efeonceGraphicLine.surfaces.<surface>.recipes.<recipe>` */
  recipe: Record<string, unknown>
}

export type RecipeBuilder = (ctx: RecipeContext) => RecipeSlots

type StepsLayoutToken = {
  count: number
  xStepPx: number
  widthPx: number
  fromTop?: number
  fromTopRange?: [number, number]
  iconPx: number
  kicker: { px: number }
  title: { px: number }
}

/**
 * `proposal-cinematic`: vende un servicio con una imagen que se recuerda. Foto de cine a sangre con el sujeto
 * a la derecha, voz en el espacio oscuro de la izquierda, prueba con fuente y hasta cuatro pasos con íconos de
 * la voz de la línea en reposo. Hasta tres pasos van en fila (`inline-3`); cuatro, en columnas (`columns-4`).
 */
export const proposalCinematic: RecipeBuilder = ctx => {
  // La composición es la que resolvió AXIS (`manifest.layout`), nunca se infiere de los campos presentes. Un intent
  // anterior a 0.1.2 no trae layout y compone `service`, como siempre.
  const layout = ctx.manifest.layout ?? 'service'

  if (layout === 'hero') return proposalCinematicHero(ctx)
  if (layout === 'lines') return proposalCinematicLines(ctx)

  if (layout !== 'service') {
    throw new SurfacePieceError(`\`proposal-cinematic\` no tiene plantilla para la composición «${layout}».`, 'recipe-without-template')
  }

  return proposalCinematicService(ctx)
}

const proposalCinematicService: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const type = manifest.type ?? {}
  const margin = manifest.safeArea?.marginPx ?? Math.round(width * 0.0729)
  const textShare = reserve(manifest, 'text')?.share ?? 0.45

  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const answerRange: [number, number] = [lower(type.answer?.px, 140), upper(type.answer?.px, 176)]
  const answerPx = answerPxWithinRange(voice.answer!, answerRange, textShare * width - margin)

  // La respuesta vive en su rango de altura: más grande, más arriba, para que la bajada conserve su aire.
  const answerBand = reserve(manifest, 'answer')?.fromTopRange ?? [0.2639, 0.2944]
  const answerTop = Math.round(ofHeight(manifest, answerBand[1]) - (answerPx - answerRange[0]) * 0.2)
  const answerLines = voice.answerLead ? 2 : 1
  const answerBottom = answerTop + answerPx * 0.95 * answerLines

  const bodyBand = reserve(manifest, 'body')?.fromTopRange ?? [0.463, 0.5185]
  const bodyTop = Math.round(clamp(answerBottom + answerPx * 0.34, ofHeight(manifest, bodyBand[0]), ofHeight(manifest, bodyBand[1])))
  const bodyPx = lower(type.body?.px, 26)
  const bodyWidth = Math.round((lower(type.body?.maxWidthPx, 500) + upper(type.body?.maxWidthPx, 640)) / 2)

  const steps = intent.steps ?? []

  if (steps.length === 0 || steps.length > 4) {
    throw new SurfacePieceError('`proposal-cinematic` lleva entre uno y cuatro pasos.', 'invalid-intent')
  }

  const layouts = (recipe.steps as { layouts: Record<string, StepsLayoutToken> }).layouts
  const layoutKey = steps.length <= 3 ? 'inline-3' : 'columns-4'
  const layout = layouts[layoutKey]!
  const stepsTop = ofHeight(manifest, layout.fromTop ?? layout.fromTopRange![0])

  const assets: RecipeSlots['assets'] = []
  const photo = plateAsset(manifest, { width, height })

  assets.push(photo.asset)

  const stepItems = steps.map(step => {
    const icon = iconAsset(step.glyph, intent.line, layout.iconPx, step.name)

    if (!assets.some(a => a.ref === icon.ref)) assets.push(icon.asset)

    return { icon: icon.ref, kicker: step.kicker, name: step.name }
  })

  // La prueba es opcional desde el contrato 0.1.2 (la regla es «cifras sólo con fuente», no «siempre una cifra»).
  // Cuando viene, va con su fuente: AXIS lo exige (`proof-source-required`) y el builder lo confirma.
  if (content.proof && (!content.proof.text || !content.proof.source)) {
    throw new SurfacePieceError('La prueba va con su fuente (`proof.text` y `proof.source`).', 'invalid-intent')
  }

  if (!content.body) throw new SurfacePieceError('La receta lleva bajada (`body`).', 'invalid-intent')

  const slots: Record<string, unknown> = {
    frame: {
      line: intent.line,
      stepsLayout: layoutKey === 'inline-3' ? 'inline' : 'columns',
      margin,
      eyebrowTop: ofHeight(manifest, reserve(manifest, 'eyebrow')?.fromTop ?? 0.1111),
      questionTop: ofHeight(manifest, reserve(manifest, 'question')?.fromTop ?? 0.1722),
      answerTop,
      answerPx,
      bodyTop,
      bodyPx,
      bodyWidth,
      proofTop: ofHeight(manifest, reserve(manifest, 'proof')?.fromTop ?? 0.6852),
      stepsTop,
      stepsGap: layout.xStepPx,
      stepWidth: layout.widthPx,
      iconPx: layout.iconPx,
      kickerPx: layout.kicker.px,
      stepNamePx: layout.title.px
    },
    photo: { src: photo.ref, alt: photo.alt },
    voice,
    body: content.body,
    steps: stepItems
  }

  if (content.proof) slots.proof = { text: content.proof.text, source: content.proof.source }

  const selection = selectionSlot(manifest)

  if (selection) slots.selection = selection

  return { slots, assets }
}

/** Una medida que el manifest de AXIS debe traer: si falta, la plantilla no la inventa. */
const measured = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) {
    throw new SurfacePieceError(`El manifest de AXIS no midió ${what}.`, 'invalid-intent')
  }

  return value
}

type MeasuredType = { px?: number | [number, number]; weight?: number; lineHeight?: number | null; tracking?: string | null; maxWidthPx?: number | [number, number] }

const typeOf = (manifest: SurfaceManifest, voice: string): MeasuredType =>
  measured((manifest.type as Record<string, MeasuredType> | undefined)?.[voice], `la tipografía de «${voice}»`)

const fixedPx = (type: MeasuredType, what: string): number => {
  if (typeof type.px !== 'number') throw new SurfacePieceError(`El manifest de AXIS no fijó el tamaño de ${what}.`, 'invalid-intent')

  return type.px
}

const topOf = (manifest: SurfaceManifest, band: string): number =>
  ofHeight(manifest, measured(reserve(manifest, band)?.fromTop, `la altura de «${band}»`))

/**
 * `proposal-cinematic` · `hero`: la escena es la protagonista (Nexa en la partida). Voz completa, la respuesta a su
 * tamaño mayor y la selección sobre la respuesta; AXIS prohíbe prueba y pasos en esta composición.
 */
const proposalCinematicHero: RecipeBuilder = ({ intent, manifest }) => {
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const body = typeOf(manifest, 'body')

  if (!voice.eyebrow) throw new SurfacePieceError('La composición `hero` lleva eyebrow.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La composición `hero` lleva bajada (`body`).', 'invalid-intent')

  const photo = plateAsset(manifest, manifest.canvas)

  const slots: Record<string, unknown> = {
    frame: {
      line: intent.line,
      margin: measured(manifest.safeArea?.marginPx, 'el margen'),
      eyebrowTop: topOf(manifest, 'eyebrow'),
      questionTop: topOf(manifest, 'question'),
      answerTop: topOf(manifest, 'answer'),
      answerPx: fixedPx(typeOf(manifest, 'answer'), 'la respuesta'),
      bodyTop: topOf(manifest, 'body'),
      bodyPx: fixedPx(body, 'la bajada'),
      bodyWidth: measured(typeof body.maxWidthPx === 'number' ? body.maxWidthPx : null, 'el ancho de la bajada')
    },
    photo: { src: photo.ref, alt: photo.alt },
    voice,
    body: content.body
  }

  const selection = selectionSlot(manifest)

  if (selection) slots.selection = selection

  return { contentType: 'deck.proposal-cinematic.hero', slots, assets: [photo.asset] }
}

/**
 * `proposal-cinematic` · `lines`: el portafolio. El stack sale de `content.lines` (nombre y palabra de cada línea, de
 * `efeonceGraphicLine.lines`); el intent sólo elige cuáles. La selección toma el grupo y la marca es el sujeto: logo
 * junto a la frase, burbuja URL en el pie.
 */
const proposalCinematicLines: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const content = contentOf(manifest) as SurfaceContent & { lines?: { key: string; name: string; sloganWord: string; accent: string }[] | null }
  const lines = content.lines ?? []

  if (lines.length === 0) throw new SurfacePieceError('La composición `lines` lleva al menos una línea.', 'invalid-intent')
  if (!content.eyebrow) throw new SurfacePieceError('La composición `lines` lleva eyebrow.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La composición `lines` lleva la frase (`body`).', 'invalid-intent')

  const tokens = measured(
    (recipe.layouts as Record<string, { lines?: { rowGapPx?: number; wordGapPx?: number } }> | undefined)?.lines?.lines,
    'el stack de líneas'
  )

  const signature = manifest.signature as { logo?: { heightPx?: number; assetId?: string } } | undefined

  if (signature?.logo?.assetId !== 'efeonce-logo-negative') {
    throw new SurfacePieceError('La composición `lines` firma con el logo oficial junto a la frase.', 'invalid-intent')
  }

  const phrase = typeOf(manifest, 'body')
  const name = typeOf(manifest, 'lineName')
  const word = typeOf(manifest, 'lineWord')
  const photo = plateAsset(manifest, manifest.canvas)

  const slots: Record<string, unknown> = {
    frame: {
      line: intent.line,
      margin: measured(manifest.safeArea?.marginPx, 'el margen'),
      eyebrowTop: topOf(manifest, 'eyebrow'),
      logoTop: px('logo-top', topOf(manifest, 'logo')),
      logoHeight: px('logo-height', measured(signature.logo.heightPx, 'el alto del logo')),
      phraseLeft: px('phrase-left', ofWidth(manifest, measured((reserve(manifest, 'body') as { inset?: number } | undefined)?.inset, 'la sangría de la frase'))),
      phraseTop: px('phrase-top', topOf(manifest, 'body')),
      phrasePx: px('phrase-px', fixedPx(phrase, 'la frase')),
      phraseWeight: px('phrase-wght', measured(phrase.weight, 'el peso de la frase'), ''),
      linesTop: px('lines-top', topOf(manifest, 'lines')),
      rowGap: px('lines-row-gap', measured(tokens.rowGapPx, 'el aire entre líneas')),
      wordGap: px('lines-word-gap', measured(tokens.wordGapPx, 'el aire entre nombre y palabra')),
      lineNamePx: px('line-name-px', fixedPx(name, 'el nombre de la línea')),
      lineNameWeight: px('line-name-wght', measured(name.weight, 'el peso del nombre de la línea'), ''),
      lineNameTracking: `--gl-line-name-tracking=${measured(name.tracking, 'el tracking del nombre de la línea')}`,
      lineWordPx: px('line-word-px', fixedPx(word, 'la palabra de la línea')),
      lineWordLeading: px('line-word-leading', measured(word.lineHeight, 'el interlineado de la palabra'), ''),
      lineWordTracking: `--gl-line-word-tracking=${measured(word.tracking, 'el tracking de la palabra')}`
    },
    photo: { src: photo.ref, alt: photo.alt },
    eyebrow: content.eyebrow,
    body: content.body,
    lines: lines.map(line => ({ key: line.key, name: line.name, word: line.sloganWord }))
  }

  const selection = selectionSlot(manifest)

  if (selection) slots.selection = selection

  return { contentType: 'deck.proposal-cinematic.lines', slots, assets: [photo.asset] }
}

/* ── Capas de la órbita ─────────────────────────────────────────────────────────────────────────────────────
 *
 * La órbita de una lámina (el progreso de sección, el indicador, la medida alrededor de la lente) la pinta
 * `paintGraphicLine` de AXIS sobre el intent que el manifest delegó (`delegates.orbit`), con la pieza medida del
 * canvas (`efeonceGraphicLine.pieces`). Sale como SVG transparente (`asset-ref:layer:*`): la plantilla sólo lo
 * coloca a lienzo completo, nunca dibuja un anillo.
 */

type OrbitElement = Record<string, unknown> & {
  kind: string
  id: string
  ring?: Record<string, unknown>
  arc?: Record<string, unknown> | null
  sphere?: Record<string, unknown> | null
}

type OrbitPiece = {
  ring: { cx: number; cy: number; r: number; strokePx: number; opacity: number }
  arc: { strokePx: number; startDeg?: number; endDeg?: number }
  sphereRadiusPx: number
}

const GL = efeonceGraphicLine as unknown as {
  pieces: { deck: Record<string, OrbitPiece>; lens: Record<string, OrbitPiece> }
  orbit: { ringAirRatio: number }
  surfaces: { deck: { base: { answer: { rangePx: [number, number] } } } }
}

/** El intent de la órbita que AXIS delegó para la lámina, con sólo los elementos de `kind` pedido. */
const orbitDelegate = (manifest: SurfaceManifest, kind: string): { canvas: Record<string, unknown>; element: Record<string, unknown> } => {
  const delegates = manifest.delegates as
    | { orbit?: { intent?: { canvas: Record<string, unknown>; elements: Record<string, unknown>[] } }[] }
    | undefined

  const intent = delegates?.orbit?.[0]?.intent
  const element = intent?.elements.find(el => el.kind === kind)

  if (!intent || !element) {
    throw new SurfacePieceError(`El manifest de AXIS no delegó la órbita «${kind}» que la receta necesita.`, 'invalid-intent')
  }

  return { canvas: intent.canvas, element }
}

/** Resuelve un elemento de la órbita con el contrato `efeonce.graphic-line-orbit` y devuelve el elemento resuelto. */
const resolveOrbit = (canvas: Record<string, unknown>, element: Record<string, unknown>) => {
  const resolved = resolveGraphicLineIntent({ canvas, elements: [element] } as never) as unknown as {
    elements: OrbitElement[]
    issues?: { code: string }[]
  }

  if (resolved.issues && resolved.issues.length > 0) {
    throw new SurfacePieceError(
      `El contrato de la órbita rechazó la capa: ${resolved.issues.map(i => i.code).join(', ')}.`,
      'surface-issues',
      resolved.issues
    )
  }

  return resolved
}

/** Aplica la pieza MEDIDA del canvas (grosor y opacidad del anillo, trazo del arco, esfera), como `deckSlideHtml`. */
const applyPiece = (element: OrbitElement, piece: OrbitPiece, overrides: { ringOpacity?: number; arc?: Record<string, unknown> } = {}) => {
  if (element.ring) element.ring = { ...element.ring, strokePx: piece.ring.strokePx, opacity: overrides.ringOpacity ?? piece.ring.opacity }
  if (element.arc) element.arc = { ...element.arc, strokePx: piece.arc.strokePx, ...(overrides.arc ?? {}) }
  if (element.sphere) element.sphere = { ...element.sphere, radiusPx: piece.sphereRadiusPx }
}

const layerAsset = (id: string, svg: string): { ref: string; asset: SurfaceAssetRequest } => {
  const ref = `asset-ref:layer:${id}`

  return { ref, asset: { ref, kind: 'svg', svg } }
}

const px = (name: string, value: number, unit = 'px'): string => `--gl-${name}=${Math.round(value * 100) / 100}${unit}`

/** Una fracción del ancho del lienzo, en px enteros. */
const ofWidth = (manifest: SurfaceManifest, fraction: number): number => Math.round(fraction * manifest.canvas.width)

/**
 * `section-classic`: la sección de siempre, tal como la pinta `deckSlideHtml('section')` de AXIS. Sobre papel, el número
 * de la sección DENTRO del anillo (pieza `pieces.deck.section`) con «Sección n de N» debajo; la pregunta y la respuesta
 * a la izquierda, sin cruzar el anillo. El arco suma su tramo desde las 12. Sin foto, sin logo.
 */
export const sectionClassic: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const progress = contentOf(manifest).progress

  if (!progress) throw new SurfacePieceError('`section-classic` lleva `progress` (sección n de N).', 'invalid-intent')

  const margin = manifest.safeArea?.marginPx ?? 140
  const piece = GL.pieces.deck.section!
  const ring = { cx: piece.ring.cx, cy: piece.ring.cy, r: piece.ring.r }
  const { canvas, element } = orbitDelegate(manifest, 'progress')
  const resolved = resolveOrbit(canvas, element)

  applyPiece(resolved.elements[0]!, piece)

  const layer = layerAsset(
    `section-progress-${progress.current}-of-${progress.sections}-${intent.line}`,
    paintGraphicLine(resolved as never, { background: false, idPrefix: 'gl-sc', circles: { [String(element.id)]: ring } }).svg
  )

  const voice = voiceSlots(manifest)

  // Las posiciones son las de `deckSlideHtml('section')` (el pintor canónico de esta lámina), atadas al anillo: la
  // pregunta 120 px sobre su centro, la respuesta 45 px, el número 110 px y su rótulo 100 px bajo el centro.
  const textWidth = ring.cx - ring.r - margin - 40
  const answerPx = Math.floor(Math.min(120, textWidth / ((voice.answer!.length + 0.6) * 0.56)))
  const type = (recipe.type ?? {}) as { number?: { px?: number } }

  return {
    slots: {
      frame: {
        line: intent.line,
        margin,
        questionTop: ring.cy - 120,
        answerTop: ring.cy - 45,
        answerPx,
        ringCx: px('ring-cx', ring.cx),
        numberTop: px('number-top', ring.cy - 110),
        labelTop: px('label-top', ring.cy + 100),
        numberPx: px('number-px', type.number?.px ?? 190),
        // Peso del número y cuerpo del rótulo: los de `deckSlideHtml('section')` (la receta sólo mide el tamaño).
        numberWeight: px('number-wght', 300, ''),
        labelPx: px('label-px', 24),
        columnWidth: px('column-width', ring.cx - ring.r - 40)
      },
      orbit: { src: layer.ref },
      progress: {
        number: String(progress.current).padStart(2, '0'),
        label: `Sección ${progress.current} de ${progress.sections}`
      },
      voice: { question: voice.question, answer: voice.answer }
    },
    assets: [layer.asset]
  }
}

/**
 * `section-split`: un panel de papel con UNA esquina curva grande y la foto que se extiende bajo la curva. El indicador
 * de sección (pieza `pieces.deck.content`, 80 px) nace abajo a la izquierda y SUBE POR LA IZQUIERDA en sentido horario
 * (corrección del operador, regla `split-indicator-rises-start`). Tres composiciones (`manifest.layout`): `corner-top`
 * (la de siempre, también sin layout), `corner-bottom` y `panel-end` (panel a la derecha, foto espejada). Número,
 * «Sección n de N», pregunta y respuesta sobre el papel, en sus reservas de AXIS.
 */
type SplitTokens = {
  panel: { side: 'start' | 'end'; share: number; cornerRadiusPx: number; corner: string }
  photo: { fromOfWidth: number; widthOfWidth?: number; mirrored?: boolean }
  progress: {
    indicator: { cxOfWidth: number; cyOfHeight: number; rPx: number }
    startFromTopDeg?: number
    direction?: string
    sweep?: { rule?: string }
  }
  type: { number: { px: number; weight?: number }; sectionLabel: { px: number }; question: { px: number }; answer: { px: number } }
  layouts?: Record<string, Partial<Pick<SplitTokens, 'panel' | 'photo' | 'progress' | 'type'>>>
}

const SPLIT_CORNER_BY_LAYOUT: Record<string, string> = { 'corner-top': 'top-end', 'corner-bottom': 'bottom-end', 'panel-end': 'top-start' }

export const sectionSplit: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const progress = contentOf(manifest).progress

  if (!progress) throw new SurfacePieceError('`section-split` lleva `progress` (sección n de N).', 'invalid-intent')

  const base = recipe as unknown as SplitTokens
  const layout = manifest.layout ?? 'corner-top'
  const override = base.layouts?.[layout]

  if (!override) throw new SurfacePieceError(`\`section-split\` no tiene la composición «${layout}».`, 'recipe-without-template')

  // La composición trae lo que cambia y hereda el resto de la receta (como `withLayout` de AXIS).
  const tokens = {
    panel: { ...base.panel, ...override.panel },
    photo: { ...base.photo, ...override.photo },
    progress: { ...base.progress, ...override.progress, indicator: { ...base.progress.indicator, ...override.progress?.indicator } },
    type: { ...base.type, ...override.type }
  }

  if (tokens.panel.corner !== SPLIT_CORNER_BY_LAYOUT[layout]) {
    throw new SurfacePieceError(`La composición «${layout}» declara la esquina «${tokens.panel.corner}» y la plantilla pinta otra.`, 'recipe-without-template')
  }

  const startFromTop = tokens.progress.startFromTopDeg

  if (typeof startFromTop !== 'number' || tokens.progress.direction !== 'clockwise' || tokens.progress.sweep?.rule !== 'sections-completed') {
    throw new SurfacePieceError('El token de AXIS no declara el arco de la sección partida (inicio, sentido y barrido).', 'invalid-intent')
  }

  const { width, height } = manifest.canvas

  const indicator = {
    cx: ofWidth(manifest, tokens.progress.indicator.cxOfWidth),
    cy: ofHeight(manifest, tokens.progress.indicator.cyOfHeight),
    r: tokens.progress.indicator.rPx
  }

  const piece = GL.pieces.deck.content!
  const { canvas, element } = orbitDelegate(manifest, 'progress')

  // El delegado apunta al indicador como objeto (`targetId: indicator`); su círculo es el que midió la receta.
  const resolved = resolveOrbit(canvas, element)

  // El arco nace donde dice el token (desde las 12, en sentido horario) y barre las secciones YA recorridas:
  // (n − 1) / N de la vuelta, como las tres referencias aprobadas.
  const sweepDeg = ((progress.current - 1) / progress.sections) * 360

  applyPiece(resolved.elements[0]!, piece, { arc: { startDeg: -90 + startFromTop, sweepDeg } })

  const layer = layerAsset(
    `section-split-indicator-${layout}-${progress.current}-of-${progress.sections}-${intent.line}`,
    paintGraphicLine(resolved as never, { background: false, idPrefix: 'gl-ss', circles: { [String(element.id)]: indicator } }).svg
  )

  const panelWidth = ofWidth(manifest, tokens.panel.share)
  const panelLeft = tokens.panel.side === 'end' ? width - panelWidth : 0
  const photoLeft = ofWidth(manifest, tokens.photo.fromOfWidth)
  const photoWidth = tokens.photo.widthOfWidth ? ofWidth(manifest, tokens.photo.widthOfWidth) : width - photoLeft
  const photo = plateAsset(manifest, { width: photoWidth, height })
  const voice = voiceSlots(manifest)

  // La columna de la voz: su sangría es la de la reserva (el margen, o el interior del panel cuando va a la derecha).
  const inset = (reserve(manifest, 'voice') as { inset?: number } | undefined)?.inset
  const margin = typeof inset === 'number' ? ofWidth(manifest, inset) : (manifest.safeArea?.marginPx ?? 140)
  const edge = manifest.safeArea?.marginPx ?? 140

  return {
    slots: {
      frame: {
        line: intent.line,
        layout,
        margin,
        questionTop: ofHeight(manifest, reserve(manifest, 'voice')?.fromTop ?? 0.5556),
        answerTop: ofHeight(manifest, reserve(manifest, 'answer')?.fromTop ?? 0.6204),
        answerPx: tokens.type.answer.px,
        numberTop: px('number-top', ofHeight(manifest, reserve(manifest, 'number')?.fromTop ?? 0.2407)),
        labelTop: px('label-top', ofHeight(manifest, reserve(manifest, 'sectionLabel')?.fromTop ?? 0.4167)),
        numberPx: px('number-px', tokens.type.number.px),
        numberWeight: px('number-wght', tokens.type.number.weight ?? 300, ''),
        labelPx: px('label-px', tokens.type.sectionLabel.px),
        panelWidth: px('panel-width', panelWidth),
        panelRadius: px('panel-radius', tokens.panel.cornerRadiusPx),
        photoLeft: px('photo-left', photoLeft),
        photoWidth: px('photo-width', photoWidth),
        panelLeft: px('panel-left', panelLeft),
        // La voz vive en el papel: nunca cruza al borde del panel (mismo margen a ambos lados).
        columnWidth: px('column-width', panelLeft + panelWidth - edge)
      },
      indicator: { src: layer.ref },
      photo: { src: photo.ref, alt: photo.alt },
      progress: {
        number: String(progress.current).padStart(2, '0'),
        label: `Sección ${progress.current} de ${progress.sections}`
      },
      voice: { question: voice.question, answer: voice.answer }
    },
    assets: [layer.asset, photo.asset],
    // Las tres composiciones comparten plantilla; cada una tiene su contrato de slots (y su frame en el gate).
    ...(layout === 'corner-top' ? {} : { contentType: `deck.section-split.${layout}` })
  }
}

/**
 * `content-measure`: la cifra es la respuesta y la órbita de la lente la MIDE: la esfera parte a las 12 y recorre el
 * valor (`measure.value`). Foto de la lente con el tratamiento de AXIS fuera del círculo (gris, contraste, brillo y
 * multiplicado sobre el fondo Efeonce) y limpia dentro. Bajada, hasta dos cifras de apoyo y la nota de fuente.
 */
export const contentMeasure: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const content = contentOf(manifest)
  const measure = content.measure

  if (!measure) throw new SurfacePieceError('`content-measure` lleva `measure` con su fuente.', 'invalid-intent')

  const margin = manifest.safeArea?.marginPx ?? 140
  const lensReserve = reserve(manifest, 'lens') as unknown as { circle: { cxOfWidth: number; cyOfHeight: number; rOfHeight: number } } | undefined

  if (!lensReserve?.circle) throw new SurfacePieceError('El manifest no reservó la lente de `content-measure`.', 'invalid-intent')

  const orbitCircle = {
    cx: ofWidth(manifest, lensReserve.circle.cxOfWidth),
    cy: ofHeight(manifest, lensReserve.circle.cyOfHeight),
    r: lensReserve.circle.rOfHeight * manifest.canvas.height
  }

  // El círculo de la foto deja el aire oficial del anillo (`orbit.ringAirRatio`).
  const photoR = orbitCircle.r / (1 + GL.orbit.ringAirRatio)
  const lensPiece = GL.pieces.lens[(recipe.measure as { lensPiece: string }).lensPiece]!

  const { canvas, element } = orbitDelegate(manifest, 'measure')
  const resolved = resolveOrbit(canvas, element)

  // La medida: el arco parte a las 12 y recorre el valor (lámina aprobada DeckContenidoFoto).
  applyPiece(resolved.elements[0]!, lensPiece, { arc: { startDeg: -90, sweepDeg: measure.value * 360 } })

  // La lámina aprobada no lleva la marca de origen de la medida: el arco mismo nace a las 12 y la muestra.
  resolved.elements[0]!.originMark = null

  const layer = layerAsset(
    `measure-${Math.round(measure.value * 1000)}-${intent.line}`,
    paintGraphicLine(resolved as never, { background: false, idPrefix: 'gl-cm', circles: { [String(element.id)]: orbitCircle } }).svg
  )

  // Tratamiento de la foto fuera del círculo: el de la lente de AXIS (`kind: lens`, elemento `outside`).
  const lensElement = resolveOrbit(canvas, { kind: 'lens', id: 'lens', photoId: 'photo', alt: 'lente', region: 'center-end' })
    .elements[0] as unknown as { outside: { grayscale: number; contrast: number; brightness: number; multiplyColor: string; multiplyOpacity: number } }

  const palette = manifest.palette as { background?: string } | undefined

  if (palette?.background && lensElement.outside.multiplyColor.toLowerCase() !== palette.background.toLowerCase()) {
    throw new SurfacePieceError('La lente multiplica sobre un color que no es el fondo Efeonce: la plantilla no lo puede pintar.', 'invalid-intent')
  }

  const photo = plateAsset(manifest, manifest.canvas)
  const voice = voiceSlots(manifest)
  const type = (recipe.type ?? {}) as Record<string, { px?: number }>

  // Las cifras de apoyo ya llegan validadas por AXIS: hasta `figures.max` de la receta (`figures-over-limit`) y cada
  // una con su fuente (`figure-source-required`). La lámina aprobada muestra valor y leyenda; la fuente va en la nota.
  const figures = (content.figures ?? []).map(figure => ({ value: figure.value, label: figure.label }))

  if (!content.body) throw new SurfacePieceError('`content-measure` lleva bajada (`body`).', 'invalid-intent')

  return {
    slots: {
      frame: {
        line: intent.line,
        margin,
        // Alturas de la lámina aprobada (DeckContenidoFoto): AXIS no las mide todavía (hueco del deck).
        eyebrowTop: 150,
        questionTop: 215,
        answerTop: 270,
        answerPx: type.answer?.px ?? 300,
        bodyTop: 590,
        bodyPx: type.body?.px ?? 26,
        bodyWidth: 560,
        eyebrowPx: px('eyebrow-px', type.eyebrow?.px ?? 20),
        figurePx: px('figure-px', type.figure?.px ?? 64),
        notePx: px('note-px', type.note?.px ?? 17),
        lensCx: px('lens-cx', orbitCircle.cx),
        lensCy: px('lens-cy', orbitCircle.cy),
        lensR: px('lens-r', photoR),
        lensGrayscale: px('lens-grayscale', lensElement.outside.grayscale, ''),
        lensContrast: px('lens-contrast', lensElement.outside.contrast, ''),
        lensBrightness: px('lens-brightness', lensElement.outside.brightness, ''),
        lensMultiply: px('lens-multiply', lensElement.outside.multiplyOpacity, ''),
        // La voz nunca cruza el anillo: la columna termina 40 px antes de la órbita (como `deckSlideHtml`).
        columnWidth: px('column-width', orbitCircle.cx - orbitCircle.r - 40)
      },
      photo: { src: photo.ref, lensSrc: photo.ref, alt: photo.alt },
      orbit: { src: layer.ref },
      voice,
      body: content.body,
      figures: figures.length > 0 ? figures : null,
      note: measure.source
    },
    assets: [photo.asset, layer.asset]
  }
}

/**
 * `triptych`: tres tomas verticales nativas a altura completa separadas por un canal fino, y UNA palabra por toma, cada
 * una cerrada por su esfera (`voice.sphere: 'per-panel'`, regla `triptych-word-per-panel`: la excepción aprobada a una
 * esfera por pieza). La pregunta va arriba sobre un difuminado
 * de la primera foto (`questionBed`). Las tres fotos y la palabra de cada una salen de `content.panels` del manifest
 * (AXIS valida que sean exactamente las de la receta, cada una con su plate y su alt: `panels-count-invalid`).
 */
export const triptych: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const tokens = recipe as {
    voice: { sphere?: string; wordsPerPanel?: number }
    panels: { count: number; widthPx: number; gutterPx: number; native: string }
    questionBed: { blurPx: number; maskPx: [number, number]; gradient: { from: number; to: number; heightPx: number } }
    type: { question: { px: number }; answer: { px: number } }
  }

  const content = contentOf(manifest)
  const panels = content.panels ?? []

  if (panels.length !== tokens.panels.count) {
    throw new SurfacePieceError(`El tríptico lleva ${tokens.panels.count} fotos en \`panels\`.`, 'missing-photo')
  }

  // AXIS reparte la frase panel a panel (`word`) pero no exige que las líneas sean tantas como las tomas: una línea
  // de más se perdería y una de menos dejaría un panel mudo. Eso lo sostiene la receta.
  if (content.answer.length !== tokens.panels.count || panels.some(panel => !panel.word)) {
    throw new SurfacePieceError(
      `El tríptico reparte UNA frase en ${tokens.panels.count} paneles: la respuesta trae ${content.answer.length} líneas.`,
      'invalid-intent'
    )
  }

  // La plantilla pinta una esfera por toma: es lo que AXIS aprobó. Si el token dijera otra cosa, no hay plantilla.
  if (tokens.voice.sphere !== 'per-panel') {
    throw new SurfacePieceError(`El tríptico aprobado lleva una esfera por toma; el token dice «${String(tokens.voice.sphere)}».`, 'recipe-without-template')
  }

  // AXIS declara cuántas palabras lleva cada toma (`wordsPerPanel`) pero su resolver no lo exige, para no rechazar
  // intents publicados: lo sostiene la receta.
  const wordsPerPanel = tokens.voice.wordsPerPanel ?? 1

  if (panels.some(panel => panel.word!.trim().split(/\s+/).length > wordsPerPanel)) {
    throw new SurfacePieceError(
      `Cada toma del tríptico lleva ${wordsPerPanel === 1 ? 'una palabra' : `hasta ${wordsPerPanel} palabras`}, con su esfera.`,
      'invalid-intent'
    )
  }

  // La voz del tríptico es la frase en las tomas: AXIS no exige la pregunta, la lámina aprobada sí la lleva.
  if (!content.question) throw new SurfacePieceError('El tríptico lleva la pregunta arriba.', 'invalid-intent')

  // Las tomas son verticales nativas: se entregan en su proporción (9:16) y la plantilla las recorta abajo.
  const [nw, nh] = tokens.panels.native.split(':').map(Number) as [number, number]
  const fit = { width: tokens.panels.widthPx, height: Math.round((tokens.panels.widthPx * nh) / nw) }

  const plates = panels.map(panel => plateFrom(panel, fit, `El panel ${panel.index + 1}`))
  const voiceReserve = reserve(manifest, 'voice') as unknown as { inset: number; fromTop: number } | undefined
  const phraseTop = ofHeight(manifest, reserve(manifest, 'phrase')?.fromTop ?? 0.8741)

  return {
    slots: {
      frame: {
        line: intent.line,
        questionTop: ofHeight(manifest, voiceReserve?.fromTop ?? 0.0444),
        answerTop: phraseTop,
        answerPx: tokens.type.answer.px,
        questionInset: px('question-inset', ofWidth(manifest, voiceReserve?.inset ?? 0.025)),
        questionPx: px('question-px', tokens.type.question.px),
        panelWidth: px('panel-width', tokens.panels.widthPx),
        gutter: px('gutter', tokens.panels.gutterPx),
        // Sangría de la palabra dentro de su panel: la de la lámina aprobada (DeckTriptico); AXIS no la mide.
        wordInset: px('word-inset', 42),
        bedBlur: px('bed-blur', tokens.questionBed.blurPx),
        bedMaskSolid: px('bed-mask-solid', tokens.questionBed.maskPx[0]),
        bedMaskEnd: px('bed-mask-end', tokens.questionBed.maskPx[1]),
        bedShade: px('bed-shade', tokens.questionBed.gradient.from * 100, '%'),
        bedShadeHeight: px('bed-shade-height', tokens.questionBed.gradient.heightPx)
      },
      bed: { src: plates[0]!.ref },
      question: content.question,
      panels: plates.map((plate, i) => ({ src: plate.ref, alt: plate.alt, word: panels[i]!.word! }))
    },
    assets: plates.map(plate => plate.asset)
  }
}

/**
 * `method-staircase`: un método por niveles como una escalera. Peldaños de vidrio que se iluminan al subir y sangran por
 * la derecha; el nivel de llegada es sólido en el acento de la línea, con brillo. La selección toma el nivel que se está
 * trabajando. AXIS aprobó la receta SIN medir su geometría (hueco `method-staircase` del deck): las medidas de abajo
 * son las de la lámina aprobada DeckBexEscalera (F2b), en un solo lugar, hasta que AXIS las mida.
 *
 * El contenido (voz, niveles, nota) y la selección salen del manifest: AXIS valida el número de niveles de la receta
 * (`levels-count-invalid`), que cada uno tenga nombre y que la selección tome un nivel existente con su etiqueta
 * (`selection-level-invalid`, `selection-label-required`), y delega la selección del peldaño como objeto con su
 * variante, aire y velo.
 */
const STAIRCASE_BOARD = {
  x0: 760,
  dx: 70,
  y0: 798,
  dy: 132,
  slabHeight: 124,
  nameLevelPx: 76,
  nameTopPx: 86,
  numberPx: 30,
  descriptorPx: 23,
  eyebrowTop: 110,
  questionTop: 200,
  answerTop: 270,
  bodyTop: 590,
  bodyPx: 25,
  bodyWidth: 500,
  notePx: 17,
  noteFromBottom: 150
} as const

export const methodStaircase: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const content = contentOf(manifest)
  const levels = content.levels ?? []
  const expected = (recipe.levels as { count: number }).count

  // AXIS ya rechazó otro número de niveles; aquí sólo se cierra el caso de un manifest sin ellos (un intent 0.1.0).
  if (levels.length !== expected) {
    throw new SurfacePieceError(`\`method-staircase\` lleva ${expected} niveles en \`levels\`; llegaron ${levels.length}.`, 'invalid-intent')
  }

  // AXIS deja el descriptor opcional; el peldaño aprobado lo lleva siempre bajo el nombre.
  if (levels.some(level => !level.descriptor)) {
    throw new SurfacePieceError('Cada nivel de la escalera lleva su descriptor (`levels[].descriptor`).', 'invalid-intent')
  }

  if (!content.body) throw new SurfacePieceError('`method-staircase` lleva bajada (`body`).', 'invalid-intent')

  const margin = manifest.safeArea?.marginPx ?? 140
  const voice = voiceSlots(manifest)
  const B = STAIRCASE_BOARD

  // La respuesta: el mayor tamaño del rango del deck que cabe antes del primer peldaño (calibrado: «por capa» → 139,
  // contra 140 aprobado).
  const longest = [voice.answerLead ?? '', voice.answer!].sort((a, b) => b.length - a.length)[0]!
  const answerPx = answerPxWithinRange(longest, GL.surfaces.deck.base.answer.rangePx, B.x0 - margin - 40)

  // La selección del peldaño: nivel, etiqueta, ancla, escala y el objetivo (objeto, sin velo sobre el vidrio, como la
  // lámina aprobada F2b), todo del delegado de AXIS.
  const selection = selectionSlot(manifest)

  return {
    slots: {
      frame: {
        line: intent.line,
        margin,
        eyebrowTop: B.eyebrowTop,
        questionTop: B.questionTop,
        answerTop: B.answerTop,
        answerPx,
        bodyTop: B.bodyTop,
        bodyPx: B.bodyPx,
        bodyWidth: B.bodyWidth,
        stairX0: px('stair-x0', B.x0),
        stairDx: px('stair-dx', B.dx),
        stairY0: px('stair-y0', B.y0),
        stairDy: px('stair-dy', B.dy),
        slabHeight: px('slab-height', B.slabHeight),
        levelNamePx: px('level-name-px', B.nameLevelPx),
        levelTopNamePx: px('level-top-name-px', B.nameTopPx),
        levelNumberPx: px('level-number-px', B.numberPx),
        levelDescriptorPx: px('level-descriptor-px', B.descriptorPx),
        notePx: px('note-px', B.notePx),
        noteTop: px('note-top', manifest.canvas.height - B.noteFromBottom),
        columnWidth: px('column-width', B.x0 - 20)
      },
      voice,
      body: content.body,
      levels: levels.map(level => ({ name: level.name, descriptor: level.descriptor! })),
      note: content.note,
      selection
    },
    assets: []
  }
}

export const DECK_BUILDERS: Record<string, RecipeBuilder> = {
  'proposal-cinematic': proposalCinematic,
  'section-classic': sectionClassic,
  'section-split': sectionSplit,
  'content-measure': contentMeasure,
  triptych,
  'method-staircase': methodStaircase
}
