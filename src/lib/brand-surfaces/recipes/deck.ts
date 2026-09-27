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
  iconAsset,
  lower,
  ofHeight,
  plateAsset,
  reserve,
  selectionSlot,
  upper,
  voiceSlots,
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
export const proposalCinematic: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const type = manifest.type ?? {}
  const margin = manifest.safeArea?.marginPx ?? Math.round(width * 0.0729)
  const textShare = reserve(manifest, 'text')?.share ?? 0.45

  const voice = voiceSlots(intent)
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
  const photo = plateAsset(intent, { width, height })

  assets.push(photo.asset)

  const stepItems = steps.map(step => {
    const icon = iconAsset(step.glyph, intent.line, layout.iconPx, step.name)

    if (!assets.some(a => a.ref === icon.ref)) assets.push(icon.asset)

    return { icon: icon.ref, kicker: step.kicker, name: step.name }
  })

  if (!intent.proof?.text || !intent.proof.source) {
    throw new SurfacePieceError('La prueba va con su fuente (`proof.text` y `proof.source`).', 'invalid-intent')
  }

  if (!intent.body) throw new SurfacePieceError('La receta lleva bajada (`body`).', 'invalid-intent')

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
    body: intent.body,
    proof: { text: intent.proof.text, source: intent.proof.source },
    steps: stepItems
  }

  const selection = selectionSlot(manifest)

  if (selection) slots.selection = selection

  return { slots, assets }
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
  type: { answer: { maxWords: number; tracking: string } }
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

/* ── Contenido que el contrato 0.1.0 aún no modela ──────────────────────────────────────────────────────────
 *
 * ⚠️ WORKAROUND TEMPORAL, dueño TASK-1919, se retira cuando AXIS modele estas piezas en
 * `efeonce.surface-composition` (hueco declarado en SURFACE_COMPOSITION_DECISION_V1 §Holes). Hoy el contrato
 * declara `voice.mode: 'none'` en `section-classic` y `method-staircase` aunque sus láminas APROBADAS llevan pregunta
 * y respuesta (`deckSlideHtml('section')` las pinta), no tiene campo para los niveles de la escalera, ni para las tres
 * fotos del tríptico, ni para las cifras de apoyo de `content-measure`, ni selección en la escalera. Ese contenido
 * viaja en `intent.unmodeled` (el validador de AXIS lo ignora; el schema JSON de AXIS lo rechazaría) y el builder le
 * aplica aquí las mismas reglas que AXIS aplicaría (máximo de palabras de la respuesta, una esfera, cifras con fuente).
 * Cuando el contrato lo modele, el builder lee primero las claves canónicas (`voice`, …) y `unmodeled` se borra.
 */
interface UnmodeledContent {
  voice?: { eyebrow?: string; question?: string; answer?: string[] }
  figures?: { value: string; label: string }[]
  panels?: { plateRef: string; alt: string }[]
  levels?: { name: string; descriptor: string }[]
  note?: string
  selection?: { level: number; label: string; anchor?: string; participantKind?: string; scale?: number }
}

const unmodeled = (intent: SurfaceIntent): UnmodeledContent => (intent.unmodeled ?? {}) as UnmodeledContent

/** La voz de la lámina: la canónica si el contrato la acepta, si no la de `unmodeled`, con las reglas de AXIS. */
const voiceOf = (intent: SurfaceIntent, recipeId: string): Record<string, string> => {
  if (intent.voice?.answer?.length) return voiceSlots(intent)

  const voice = unmodeled(intent).voice

  if (!voice?.question || !voice.answer?.length) {
    throw new SurfacePieceError(
      `\`${recipeId}\` lleva pregunta y respuesta (lámina aprobada) y el contrato 0.1.0 todavía no las modela: van en \`unmodeled.voice\`.`,
      'invalid-intent'
    )
  }

  const words = voice.answer.join(' ').trim().split(/\s+/).length

  if (words > GL.type.answer.maxWords) {
    throw new SurfacePieceError(
      `La respuesta tiene ${words} palabras; el máximo de AXIS es ${GL.type.answer.maxWords} (voice-answer-too-long).`,
      'invalid-intent'
    )
  }

  return voiceSlots({ ...intent, voice })
}

/** Una fracción del ancho del lienzo, en px enteros. */
const ofWidth = (manifest: SurfaceManifest, fraction: number): number => Math.round(fraction * manifest.canvas.width)

/**
 * `section-classic`: la sección de siempre, tal como la pinta `deckSlideHtml('section')` de AXIS. Sobre papel, el número
 * de la sección DENTRO del anillo (pieza `pieces.deck.section`) con «Sección n de N» debajo; la pregunta y la respuesta
 * a la izquierda, sin cruzar el anillo. El arco suma su tramo desde las 12. Sin foto, sin logo.
 */
export const sectionClassic: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const progress = intent.progress as { sections: number; current: number } | undefined

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

  const voice = voiceOf(intent, 'section-classic')

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
 * `section-split`: un panel de papel con UNA esquina curva grande arriba a la derecha y la foto que se extiende bajo
 * la curva. El indicador de sección (pieza `pieces.deck.content`, 80 px) nace abajo y sube por la derecha
 * (`progress.flipped`). Número, «Sección n de N», pregunta y respuesta sobre el papel, en sus reservas de AXIS.
 */
export const sectionSplit: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const progress = intent.progress as { sections: number; current: number } | undefined

  if (!progress) throw new SurfacePieceError('`section-split` lleva `progress` (sección n de N).', 'invalid-intent')

  const { width, height } = manifest.canvas
  const margin = manifest.safeArea?.marginPx ?? 140

  const tokens = recipe as {
    panel: { share: number; cornerRadiusPx: number }
    photo: { fromOfWidth: number }
    progress: { indicator: { cxOfWidth: number; cyOfHeight: number; rPx: number }; sweepDeg: number; flipped: boolean }
    type: { number: { px: number; weight?: number }; sectionLabel: { px: number }; question: { px: number }; answer: { px: number } }
  }

  const indicator = {
    cx: ofWidth(manifest, tokens.progress.indicator.cxOfWidth),
    cy: ofHeight(manifest, tokens.progress.indicator.cyOfHeight),
    r: tokens.progress.indicator.rPx
  }

  const piece = GL.pieces.deck.content!
  const { canvas, element } = orbitDelegate(manifest, 'progress')

  // El delegado apunta al indicador como objeto (`targetId: indicator`); su círculo es el que midió la receta.
  const resolved = resolveOrbit(canvas, element)

  // El arco de la receta mide `sweepDeg` desde las 12 y, volteado en vertical, nace abajo y sube por la derecha.
  applyPiece(resolved.elements[0]!, piece, { arc: { startDeg: -90, sweepDeg: tokens.progress.sweepDeg } })

  let svg = paintGraphicLine(resolved as never, {
    background: false,
    idPrefix: 'gl-ss',
    circles: { [String(element.id)]: indicator }
  }).svg

  if (tokens.progress.flipped) {
    svg = svg.replace(/(<svg[^>]*>)/, `$1<g transform="matrix(1 0 0 -1 0 ${2 * indicator.cy})">`).replace(/<\/svg>$/, '</g></svg>')
  }

  const layer = layerAsset(`section-split-indicator-${progress.current}-of-${progress.sections}-${intent.line}`, svg)
  const photoLeft = ofWidth(manifest, tokens.photo.fromOfWidth)
  const photo = plateAsset(intent, { width: width - photoLeft, height })
  const panelWidth = ofWidth(manifest, tokens.panel.share)
  const voice = voiceOf(intent, 'section-split')

  return {
    slots: {
      frame: {
        line: intent.line,
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
        // La voz vive en el papel: nunca cruza al borde del panel (mismo margen a ambos lados).
        columnWidth: px('column-width', panelWidth - margin)
      },
      indicator: { src: layer.ref },
      photo: { src: photo.ref, alt: photo.alt },
      progress: {
        number: String(progress.current).padStart(2, '0'),
        label: `Sección ${progress.current} de ${progress.sections}`
      },
      voice: { question: voice.question, answer: voice.answer }
    },
    assets: [layer.asset, photo.asset]
  }
}

/**
 * `content-measure`: la cifra es la respuesta y la órbita de la lente la MIDE: la esfera parte a las 12 y recorre el
 * valor (`measure.value`). Foto de la lente con el tratamiento de AXIS fuera del círculo (gris, contraste, brillo y
 * multiplicado sobre el fondo Efeonce) y limpia dentro. Bajada, hasta dos cifras de apoyo y la nota de fuente.
 */
export const contentMeasure: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const measure = intent.measure as { value: number; source: string } | undefined

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

  const photo = plateAsset(intent, manifest.canvas)
  const voice = voiceSlots(intent)
  const type = (recipe.type ?? {}) as Record<string, { px?: number }>
  const figures = unmodeled(intent).figures ?? []

  if (figures.length > 2) throw new SurfacePieceError('`content-measure` lleva hasta dos cifras de apoyo.', 'invalid-intent')

  if (!intent.body) throw new SurfacePieceError('`content-measure` lleva bajada (`body`).', 'invalid-intent')

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
      body: intent.body,
      figures: figures.length > 0 ? figures : null,
      note: measure.source
    },
    assets: [photo.asset, layer.asset]
  }
}

/**
 * `triptych`: tres tomas verticales nativas a altura completa separadas por un canal fino, y UNA frase que recorre las
 * tres (una línea de la respuesta por panel); la esfera va sólo al final. La pregunta va arriba sobre un difuminado
 * de la primera foto (`questionBed`). Las tres fotos viajan en `unmodeled.panels` (el contrato admite una sola).
 */
export const triptych: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const tokens = recipe as {
    panels: { count: number; widthPx: number; gutterPx: number; native: string }
    questionBed: { blurPx: number; maskPx: [number, number]; gradient: { from: number; to: number; heightPx: number } }
    type: { question: { px: number }; answer: { px: number } }
  }

  const answer = intent.voice?.answer ?? []
  const panels = unmodeled(intent).panels ?? []

  if (answer.length !== tokens.panels.count) {
    throw new SurfacePieceError(
      `El tríptico reparte UNA frase en ${tokens.panels.count} paneles: la respuesta trae ${answer.length} líneas.`,
      'invalid-intent'
    )
  }

  if (panels.length !== tokens.panels.count) {
    throw new SurfacePieceError(`El tríptico lleva ${tokens.panels.count} fotos en \`unmodeled.panels\`.`, 'missing-photo')
  }

  if (!intent.voice?.question) throw new SurfacePieceError('El tríptico lleva la pregunta arriba.', 'invalid-intent')

  // Las tomas son verticales nativas: se entregan en su proporción (9:16) y la plantilla las recorta abajo.
  const [nw, nh] = tokens.panels.native.split(':').map(Number) as [number, number]
  const fit = { width: tokens.panels.widthPx, height: Math.round((tokens.panels.widthPx * nh) / nw) }

  const plates = panels.map(panel => plateAsset({ ...intent, photo: { plateRef: panel.plateRef, alt: panel.alt } }, fit))
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
      question: intent.voice.question,
      panels: plates.map((plate, i) => ({ src: plate.ref, alt: plate.alt, word: answer[i]! }))
    },
    assets: plates.map(plate => plate.asset)
  }
}

/**
 * `method-staircase`: un método por niveles como una escalera. Peldaños de vidrio que se iluminan al subir y sangran por
 * la derecha; el nivel de llegada es sólido en el acento de la línea, con brillo. La selección toma el nivel que se está
 * trabajando. AXIS aprobó la receta SIN medir su geometría (hueco `method-staircase` del deck): las medidas de abajo
 * son las de la lámina aprobada DeckBexEscalera (F2b), en un solo lugar, hasta que AXIS las mida.
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
  const content = unmodeled(intent)
  const levels = content.levels ?? []
  const expected = (recipe.levels as { count: number }).count

  if (levels.length !== expected) {
    throw new SurfacePieceError(`\`method-staircase\` lleva ${expected} niveles en \`unmodeled.levels\`; llegaron ${levels.length}.`, 'invalid-intent')
  }

  if (!intent.body) throw new SurfacePieceError('`method-staircase` lleva bajada (`body`).', 'invalid-intent')

  const margin = manifest.safeArea?.marginPx ?? 140
  const voice = voiceOf(intent, 'method-staircase')
  const B = STAIRCASE_BOARD

  // La respuesta: el mayor tamaño del rango del deck que cabe antes del primer peldaño (calibrado: «por capa» → 139,
  // contra 140 aprobado).
  const longest = [voice.answerLead ?? '', voice.answer!].sort((a, b) => b.length - a.length)[0]!
  const answerPx = answerPxWithinRange(longest, GL.surfaces.deck.base.answer.rangePx, B.x0 - margin - 40)

  const selection = content.selection

  if (selection && (selection.level < 1 || selection.level > levels.length || !selection.label?.trim())) {
    throw new SurfacePieceError('La selección de la escalera toma un nivel existente y lleva su etiqueta.', 'invalid-intent')
  }

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
      body: intent.body,
      levels: levels.map(level => ({ name: level.name, descriptor: level.descriptor })),
      note: content.note ?? null,
      selection: selection
        ? {
            level: selection.level,
            label: selection.label,
            anchor: selection.anchor ?? 'bottom-end',
            participantKind: selection.participantKind ?? 'department',
            scale: selection.scale ?? 1.1,
            // La lámina aprobada (F2b) selecciona el PELDAÑO como objeto, sin velo sobre el vidrio.
            targetKind: 'object',
            overlay: 'none'
          }
        : null
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
