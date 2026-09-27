/**
 * Builders de las recetas APROBADAS de producción audiovisual (catálogo `graphic-line-overlays`): capas PNG
 * con fondo transparente que el editor monta sobre el plano. Ver `deck.ts` para el contrato de un builder.
 *
 * Qué sale de dónde:
 *   - Medidas (reservas, tamaños de voz, anillos, divisoria, subtítulo, timeline): del manifest que resolvió AXIS
 *     (`resolveSurfaceComposition`) y de los tokens de la receta (`efeonceGraphicLine.surfaces.audiovisual`).
 *   - La órbita (el arco que mide el capítulo de la cartela y el que mide la cifra del super): la pinta el paquete de
 *     la línea gráfica (`paintGraphicLine` sobre el delegado `efeonce.graphic-line-orbit` del manifest) y llega a la
 *     plantilla como capa SVG externa (`asset-ref:layer:*`). La plantilla nunca dibuja un arco.
 *   - La selección colaborativa: el delegado `efeonce.collaboration-selection` del manifest, en el shape del slot.
 *   - Lo que AXIS todavía no declara para estas recetas se calibra contra la lámina aprobada con una REGLA escrita
 *     aquí (constantes `CALIBRATED_*`), nunca con un número suelto en la plantilla.
 *
 * El cierre con el reveal (`close-reveal`) es video: no tiene builder y `planSurfacePiece` lo rechaza con
 * `recipe-outside-composer` antes de llegar aquí.
 */

import { paintGraphicLine } from '@efeoncepro/axis-graphic-line'
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { resolveGraphicLineIntent } from '@efeoncepro/axis-ui-contracts'

import type { SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import { selectionSlot, voiceSlots, type SurfaceManifest } from '../shared'
import type { RecipeBuilder } from './deck'

// ── Reglas calibradas contra las láminas aprobadas (AXIS aún no las declara en estas recetas) ─────────────────

/**
 * Escala del cursor del colaborador. AXIS la deja en `null` para las recetas audiovisuales; la lámina aprobada usa
 * 1,6 cuando la selección rodea una respuesta o un objeto (cartela, llamada: la etiqueta mide ~78 px de alto en
 * 1920) y 1,2 cuando firma un grupo pequeño (zócalo).
 */
export const CALIBRATED_COLLABORATOR_SCALE = { text: 1.6, object: 1.6, group: 1.2 } as const

/** Ancho óptico de la respuesta en Bricolage 760 con tracking negativo, por carácter (ver `answerPxWithinRange`). */
const ANSWER_EM_PER_CHAR = 0.52

/** Super de dato: la leyenda arranca a un tercio del radio del anillo y mide 2,8 radios (500 y 420 px en r = 150). */
const CALIBRATED_CAPTION_AIR_OF_R = 1 / 3
const CALIBRATED_CAPTION_WIDTH_OF_R = 2.8

/** Pantalla dividida: cada palabra a 110 px del borde de su plano y a 860 px del borde superior (en 1920 × 1080). */
const CALIBRATED_SPLIT_WORD_INSET_OF_WIDTH = 110 / 1920
const CALIBRATED_SPLIT_WORD_TOP_OF_HEIGHT = 860 / 1080

/** Subtítulos: el área segura de títulos de broadcast (5 % por lado, EBU R 95). */
const SUBTITLE_TITLE_SAFE_OF_WIDTH = 0.05

/** Plan de planos: margen de la hoja, aire entre cuadros y relación del cuadro clave (16:9). */
const SHEET_MARGIN_OF_WIDTH = 80 / 1920
const SHEET_GAP_OF_WIDTH = 40 / 1920

// ── Ayudas ────────────────────────────────────────────────────────────────────────────────────────────────────

type Reserve = { band: string; inset?: number; fromTop?: number; circle?: { cxOfWidth: number; cyOfHeight: number; rOfHeight: number } }
type TypeRole = { px?: number | [number, number]; tracking?: string | null; weight?: number | null; lineHeight?: number | null; maxLines?: number; shadow?: string }
type Circle = { cx: number; cy: number; r: number }

const invalid = (message: string): never => {
  throw new SurfacePieceError(message, 'invalid-intent')
}

/** Una custom property `--gl-*` con su valor, para el resolver `gl-css` del catálogo. */
const css = (name: string, value: number, unit: 'px' | 'em' | '%' | '' = 'px'): string =>
  `${name}=${unit === 'px' ? Math.round(value) : Number(value.toFixed(3))}${unit}`

const reserveOf = (manifest: SurfaceManifest, band: string): Reserve => {
  const found = (manifest.reserves as Reserve[] | undefined)?.find(r => r.band === band)

  if (!found) throw new SurfacePieceError(`El manifest de AXIS no trae la reserva «${band}» de la receta.`, 'surface-issues')

  return found
}

const typeOf = (manifest: SurfaceManifest, role: string): TypeRole => {
  const found = (manifest.type as Record<string, TypeRole> | undefined)?.[role]

  if (!found || typeof found.px !== 'number') {
    throw new SurfacePieceError(`El manifest de AXIS no trae el tamaño de «${role}».`, 'surface-issues')
  }

  return found
}

const pxOf = (role: TypeRole): number => role.px as number

/** `-0.06em` → -0.06. Sin tracking declarado, el de la respuesta en AXIS. */
const trackingEm = (role: TypeRole): number => {
  const match = /^(-?\d*\.?\d+)em$/.exec(String(role.tracking ?? '').trim())

  return match ? Number(match[1]) : Number(String(efeonceGraphicLine.type.answer.tracking).replace('em', ''))
}

const ringCircle = (manifest: SurfaceManifest): Circle => {
  const circle = reserveOf(manifest, 'orbit').circle

  if (!circle) throw new SurfacePieceError('La reserva «orbit» de AXIS no trae su círculo.', 'surface-issues')

  const { width, height } = manifest.canvas

  return { cx: circle.cxOfWidth * width, cy: circle.cyOfHeight * height, r: circle.rOfHeight * height }
}

const answerWidth = (text: string, px: number): number => text.trim().length * ANSWER_EM_PER_CHAR * px

/** Un plate aprobado (o el último cuadro de un master) como asset externo, recortado al tamaño que ocupa. */
const plateFromRef = (
  plateRef: unknown,
  alt: unknown,
  fit: { width: number; height: number },
  what: string
): { ref: string; alt: string; asset: SurfaceAssetRequest } => {
  const refPath = String(plateRef ?? '').trim()
  const altText = String(alt ?? '').trim()

  if (!refPath) throw new SurfacePieceError(`${what}: falta \`plateRef\`.`, 'missing-photo')
  if (!altText) throw new SurfacePieceError(`${what}: falta \`alt\` (describe la escena, no el copy).`, 'missing-photo')

  const id = refPath.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')
  const ref = `asset-ref:plate:${id}-${fit.width}x${fit.height}`

  return { ref, alt: altText, asset: { ref, kind: 'plate', path: refPath, fit } }
}

type OrbitManifest = { elements: Record<string, unknown>[] } & Record<string, unknown>

/**
 * La órbita del delegado `efeonce.graphic-line-orbit` que resolvió AXIS, pintada por el paquete de la línea gráfica.
 * Sólo el elemento que lleva anillo (`progress` o `measure`): la voz es texto de la plantilla. El grosor del arco y
 * el radio de la esfera son los que la receta midió a su escala (`arcStrokePx`, `spherePx`); el resto (anillo,
 * barrido, marca de origen) es el canon del paquete.
 */
const paintRecipeOrbit = (
  manifest: SurfaceManifest,
  kind: 'progress' | 'measure',
  circle: Circle,
  measured: { arcStrokePx: number; spherePx: number },
  idPrefix: string
): { svg: string; element: Record<string, unknown> } => {
  const delegates = manifest.delegates as { orbit?: { intent: { elements: { kind: string }[] } & Record<string, unknown> }[] } | undefined
  const delegate = delegates?.orbit?.[0]?.intent
  const element = delegate?.elements.find(e => e.kind === kind)

  if (!delegate || !element) {
    throw new SurfacePieceError(`El manifest de AXIS no delega la órbita (${kind}) de la receta.`, 'surface-issues')
  }

  const orbit = resolveGraphicLineIntent({ ...delegate, elements: [element] } as never) as unknown as OrbitManifest
  const painted = orbit.elements[0]!

  painted.arc = { ...(painted.arc as Record<string, unknown>), strokePx: measured.arcStrokePx }
  painted.sphere = { ...(painted.sphere as Record<string, unknown>), radiusPx: measured.spherePx }

  // Progreso: el círculo ES el anillo. Medida: el anillo rodea a la cifra con el aire del contrato.
  const air = 1 + efeonceGraphicLine.orbit.ringAirRatio

  const bindings =
    kind === 'progress'
      ? { circles: { [String(painted.id)]: circle } }
      : { targets: { [String((element as { targetId?: string }).targetId ?? 'datum')]: { ...circle, r: circle.r / air } } }

  const { svg } = paintGraphicLine(orbit as never, { background: false, idPrefix, ...bindings })

  return { svg, element: painted }
}

/** La selección que resolvió AXIS, con la escala calibrada cuando la receta no la declara. */
const recipeSelection = (
  manifest: SurfaceManifest,
  targetKind: 'text' | 'object' | 'group'
): Record<string, unknown> => {
  const slot = selectionSlot(manifest)

  if (!slot) throw new SurfacePieceError('La receta lleva selección y AXIS no la delegó con su etiqueta.', 'surface-issues')

  const delegates = manifest.delegates as { selection?: { intent: Record<string, unknown>; collaboratorScale: number | null }[] }
  const delegate = delegates.selection![0]!

  slot.scale = delegate.collaboratorScale ?? CALIBRATED_COLLABORATOR_SCALE[targetKind]

  if (targetKind !== 'text') {
    slot.targetKind = targetKind

    for (const key of ['variant', 'padding', 'overlay'] as const) {
      if (delegate.intent[key]) slot[key] = String(delegate.intent[key])
    }
  }

  return slot
}

/** «12,6» · «3»: segundos con coma decimal, como se leen en la hoja. */
const seconds = (ms: number): string => String(Number((ms / 1000).toFixed(1))).replace('.', ',')

// ── 01 · Cartela de apertura ──────────────────────────────────────────────────────────────────────────────────

/**
 * `cartela`: la voz (pregunta con anillo, respuesta gigante con esfera) y la órbita que mide el capítulo, con el
 * nombre del capítulo dentro del anillo. La respuesta es UNA palabra y nunca cruza el anillo (`text-never-crosses-ring`).
 */
export const cartela: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const voice = voiceSlots(intent)

  if (voice.answerLead) invalid('La cartela lleva una respuesta de una sola línea.')

  const voiceBand = reserveOf(manifest, 'voice')
  const answerBand = reserveOf(manifest, 'answer')
  const question = typeOf(manifest, 'question')
  const answer = typeOf(manifest, 'answer')
  const chapterWord = typeOf(manifest, 'chapterWord')
  const chapterLabel = typeOf(manifest, 'chapterLabel')
  const circle = ringCircle(manifest)

  const answerLeft = (answerBand.inset ?? 0) * width

  if (answerLeft + answerWidth(voice.answer!, pxOf(answer)) > circle.cx - circle.r) {
    invalid(`«${voice.answer}» a ${pxOf(answer)} px cruza el anillo del capítulo: la cartela lleva una palabra corta.`)
  }

  const progress = intent.progress as { sections: number; current: number } | undefined
  const chapter = intent.chapter as { title?: string; label?: string } | undefined

  if (!progress) invalid('La cartela mide el capítulo: falta `progress` (sections, current).')
  if (!chapter?.title?.trim()) invalid('La cartela nombra el capítulo dentro del anillo: falta `chapter.title`.')

  const tokens = recipe.progress as { arcStrokePx: number; spherePx: number }
  const orbit = paintRecipeOrbit(manifest, 'progress', circle, tokens, `gl-cartela-${progress!.current}-${progress!.sections}`)
  const layerRef = `asset-ref:layer:cartela-progress-${intent.line}-${progress!.current}-of-${progress!.sections}`

  return {
    slots: {
      frame: {
        line: intent.line,
        voiceLeft: css('--gl-voice-left', (voiceBand.inset ?? 0) * width),
        voiceTop: css('--gl-voice-top', (voiceBand.fromTop ?? 0) * height),
        answerLeft: css('--gl-answer-left', answerLeft),
        answerTop: css('--gl-answer-top', (answerBand.fromTop ?? 0) * height),
        questionPx: css('--gl-question-px', pxOf(question)),
        answerPx: css('--gl-answer-px', pxOf(answer)),
        answerTracking: css('--gl-answer-tracking', trackingEm(answer), 'em'),
        ringCx: css('--gl-ring-cx', circle.cx),
        ringCy: css('--gl-ring-cy', circle.cy),
        ringR: css('--gl-ring-r', circle.r),
        chapterWordPx: css('--gl-chapter-word-px', pxOf(chapterWord)),
        chapterLabelPx: css('--gl-chapter-label-px', pxOf(chapterLabel))
      },
      orbit: { src: layerRef },
      chapter: {
        title: chapter!.title!.trim(),
        label: chapter!.label?.trim() || `capítulo ${progress!.current} de ${progress!.sections}`
      },
      voice: { question: voice.question, answer: voice.answer },
      selection: recipeSelection(manifest, 'text')
    },
    assets: [{ ref: layerRef, kind: 'svg', svg: orbit.svg }]
  }
}

// ── 02 · Zócalo ───────────────────────────────────────────────────────────────────────────────────────────────

/**
 * `zocalo`: el contexto con su anillo y el rol con su esfera en la reserva inferior. Los corchetes firman el GRUPO
 * entero, como en la lámina aprobada (AXIS declara hoy `targetKind: text` sobre la respuesta; con esa caja los
 * corchetes y el cursor caerían encima del contexto).
 */
export const zocalo: RecipeBuilder = ({ intent, manifest }) => {
  const { width, height } = manifest.canvas
  const voice = voiceSlots(intent)

  if (voice.answerLead) invalid('El zócalo lleva el rol en una sola línea.')

  const band = reserveOf(manifest, 'lowerThird')
  const question = typeOf(manifest, 'question')
  const answer = typeOf(manifest, 'answer')
  const left = (band.inset ?? 0) * width

  if (left + answerWidth(voice.answer!, pxOf(answer)) > width / 2) {
    invalid(`«${voice.answer}» a ${pxOf(answer)} px pasa de la mitad del cuadro: el zócalo es para un rol corto.`)
  }

  return {
    slots: {
      frame: {
        line: intent.line,
        voiceLeft: css('--gl-voice-left', left),
        voiceTop: css('--gl-voice-top', (band.fromTop ?? 0) * height),
        questionPx: css('--gl-question-px', pxOf(question)),
        answerPx: css('--gl-answer-px', pxOf(answer)),
        answerTracking: css('--gl-answer-tracking', trackingEm(answer), 'em')
      },
      voice: { question: voice.question, answer: voice.answer },
      selection: recipeSelection(manifest, 'group')
    },
    assets: []
  }
}

// ── 03 · Llamada con selección ────────────────────────────────────────────────────────────────────────────────

/**
 * `callout-selection`: la selección sobre un OBJETO del plano. La caja la declara el intent en fracciones del
 * lienzo (`selection.box` = left, top, right, bottom entre 0 y 1), medida sobre el plano al que va la capa.
 */
export const calloutSelection: RecipeBuilder = ({ intent, manifest }) => {
  const { width, height } = manifest.canvas
  const box = (intent.selection as { box?: Record<string, unknown> } | undefined)?.box

  if (!box) invalid('La llamada necesita la caja del objeto: `selection.box` en fracciones del lienzo.')

  const [left, top, right, bottom] = (['left', 'top', 'right', 'bottom'] as const).map(key => Number(box![key]))

  if (![left, top, right, bottom].every(n => Number.isFinite(n) && n >= 0 && n <= 1) || !(left! < right!) || !(top! < bottom!)) {
    invalid('`selection.box` va en fracciones del lienzo (0–1) con left < right y top < bottom.')
  }

  return {
    slots: {
      frame: { line: intent.line },
      target: {
        left: css('--gl-target-left', left! * width),
        top: css('--gl-target-top', top! * height),
        width: css('--gl-target-width', (right! - left!) * width),
        height: css('--gl-target-height', (bottom! - top!) * height)
      },
      selection: recipeSelection(manifest, 'object')
    },
    assets: []
  }
}

// ── 04 · Super de dato ────────────────────────────────────────────────────────────────────────────────────────

/**
 * `data-super`: la cifra en grande dentro del anillo que la mide (arco de medida de AXIS: la esfera en la posición
 * del valor desde las 12, con su estela y la marca de origen) y la leyenda al lado. La cifra va con su fuente.
 */
export const dataSuper: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width } = manifest.canvas
  const measure = intent.measure as { value: number; source: string; label?: string } | undefined

  if (!measure) invalid('El super de dato lleva `measure` (value 0–1 y source).')
  if (!intent.body?.trim()) invalid('El super de dato lleva la leyenda de la cifra en `body`.')

  const circle = ringCircle(manifest)
  const value = typeOf(manifest, 'value')
  const caption = typeOf(manifest, 'caption')
  const tokens = recipe.measure as { arcStrokePx: number; spherePx: number }
  const orbit = paintRecipeOrbit(manifest, 'measure', circle, tokens, 'gl-data-super')
  const trajectory = orbit.element.trajectory as { valueLabel: string | null } | undefined
  const label = measure!.label?.trim() || trajectory?.valueLabel || invalid('AXIS no devolvió la etiqueta de la cifra.')

  if (answerWidth(label, pxOf(value)) > 2 * circle.r * 0.9) invalid(`«${label}» no cabe dentro del anillo que la mide.`)

  const captionLeft = circle.cx + circle.r * (1 + CALIBRATED_CAPTION_AIR_OF_R)
  const captionWidth = circle.r * CALIBRATED_CAPTION_WIDTH_OF_R

  if (captionLeft + captionWidth > width) invalid('La leyenda del dato se sale del cuadro.')

  const layerRef = `asset-ref:layer:data-super-${intent.line}-${Math.round(measure!.value * 1000)}`

  return {
    slots: {
      frame: {
        line: intent.line,
        ringCx: css('--gl-ring-cx', circle.cx),
        ringCy: css('--gl-ring-cy', circle.cy),
        ringR: css('--gl-ring-r', circle.r),
        valuePx: css('--gl-value-px', pxOf(value)),
        captionPx: css('--gl-caption-px', pxOf(caption)),
        captionLeft: css('--gl-caption-left', captionLeft),
        captionWidth: css('--gl-caption-width', captionWidth)
      },
      orbit: { src: layerRef },
      datum: { value: label, caption: intent.body!.trim(), source: measure!.source }
    },
    assets: [{ ref: layerRef, kind: 'svg', svg: orbit.svg }]
  }
}

// ── 05 · Pantalla dividida ────────────────────────────────────────────────────────────────────────────────────

/**
 * `split-screen`: dos planos en el mismo cuadro y una frase que los une, una palabra por plano (`voice.answer` =
 * [palabra del primero, palabra del segundo]); la esfera cierra la última. Cada plano es un plate con la parte que
 * se ve elegida por `focusX` (0 = borde izquierdo del plate, 1 = borde derecho). Es opaca: los planos son la capa.
 */
export const splitScreen: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const words = (intent.voice?.answer ?? []).map(word => String(word).trim()).filter(Boolean)
  const panels = intent.panels as { plateRef?: string; alt?: string; focusX?: number }[] | undefined

  if (words.length !== 2) invalid('La pantalla dividida lleva una palabra por plano: `voice.answer` con dos líneas.')
  if (!panels || panels.length !== 2) invalid('La pantalla dividida lleva dos planos: `panels` con dos plates.')

  const divider = recipe.divider as { px: number; color: string; atOfWidth: number }

  // La plantilla pinta la divisoria con `--gl-teal`: si AXIS cambia el color del token, se nota aquí y no en la pieza.
  if (divider.color !== 'teal') {
    throw new SurfacePieceError(`La divisoria de AXIS es «${divider.color}» y la plantilla la pinta en teal.`, 'surface-issues')
  }

  const answer = typeOf(manifest, 'answer')
  const dividerLeft = Math.round(divider.atOfWidth * width)
  const panelWidths = [dividerLeft, width - dividerLeft - divider.px]
  const inset = CALIBRATED_SPLIT_WORD_INSET_OF_WIDTH * width
  const assets: SurfaceAssetRequest[] = []

  const panel = (index: 0 | 1) => {
    const source = panels![index]!
    const focus = source.focusX ?? 0.5

    if (!(focus >= 0 && focus <= 1)) invalid('`panels[].focusX` va entre 0 y 1.')
    if (inset + answerWidth(words[index]!, pxOf(answer)) > panelWidths[index]!) invalid(`«${words[index]}» no cabe en su plano.`)

    const plate = plateFromRef(source.plateRef, source.alt, { width, height }, `panels[${index}]`)

    if (!assets.some(a => a.ref === plate.ref)) assets.push(plate.asset)

    return { src: plate.ref, alt: plate.alt, focus: css('--gl-focus-x', focus * 100, '%'), word: words[index]! }
  }

  return {
    slots: {
      frame: {
        line: intent.line,
        dividerLeft: css('--gl-divider-left', dividerLeft),
        dividerPx: css('--gl-divider-px', divider.px),
        wordInset: css('--gl-word-inset', inset),
        wordTop: css('--gl-word-top', CALIBRATED_SPLIT_WORD_TOP_OF_HEIGHT * height),
        answerPx: css('--gl-answer-px', pxOf(answer)),
        answerTracking: css('--gl-answer-tracking', trackingEm(answer), 'em')
      },
      start: panel(0),
      end: panel(1)
    },
    assets
  }
}

// ── 06 · Subtítulos ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * `subtitles`: una intervención por capa (`subtitles.lines`, dos como máximo). Peso, tamaño, interlineado, máximo de
 * líneas y sombra salen del token `type.subtitle` de AXIS; la reserva, de `reserves.subtitles`.
 */
export const subtitles: RecipeBuilder = ({ intent, manifest }) => {
  const { width, height } = manifest.canvas
  const type = typeOf(manifest, 'subtitle')
  const maxLines = type.maxLines ?? 2
  const lines = ((intent.subtitles as { lines?: string[] } | undefined)?.lines ?? []).map(l => String(l).trim()).filter(Boolean)

  if (lines.length === 0) invalid('Los subtítulos llevan su texto en `subtitles.lines`.')
  if (lines.length > maxLines) invalid(`Los subtítulos van en ${maxLines} líneas como máximo.`)

  // «0 2px 6px rgba(0,0,0,.55)»: el único color del token es el negro de la sombra; su opacidad viaja como medida.
  const shadow = /^0(?:px)?\s+(-?\d*\.?\d+)px\s+(\d*\.?\d+)px\s+rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*(\d*\.?\d+)\s*\)$/.exec(
    String(type.shadow ?? '').trim()
  )

  if (!shadow) {
    throw new SurfacePieceError(`La sombra del subtítulo de AXIS («${type.shadow}») no es una sombra negra que la plantilla sepa pintar.`, 'surface-issues')
  }

  const band = reserveOf(manifest, 'subtitles')

  return {
    slots: {
      frame: {
        line: intent.line,
        inset: css('--gl-subtitle-inset', SUBTITLE_TITLE_SAFE_OF_WIDTH * width),
        top: css('--gl-subtitle-top', (band.fromTop ?? 0) * height),
        px: css('--gl-subtitle-px', pxOf(type)),
        weight: css('--gl-subtitle-weight', type.weight ?? 600, ''),
        lineHeight: css('--gl-subtitle-line-height', type.lineHeight ?? 1.3, ''),
        maxLines: css('--gl-subtitle-max-lines', maxLines, ''),
        shadowY: css('--gl-subtitle-shadow-y', Number(shadow[1])),
        shadowBlur: css('--gl-subtitle-shadow-blur', Number(shadow[2])),
        shadowAlpha: css('--gl-subtitle-shadow-alpha', Number(shadow[3]) * 100, '%')
      },
      lines
    },
    assets: []
  }
}

// ── Plan de planos ────────────────────────────────────────────────────────────────────────────────────────────

type ShotSegment = { id: string; fromMs: number; toMs: number; lensMm?: number; close?: string }

/**
 * `shot-plan`: la hoja del plan. Los planos, sus tiempos y sus lentes salen del timeline de la receta (AXIS); el
 * intent pone el copy de cada plano (`shots[]` por `segment`) y su cuadro clave. Las reglas son las de producción
 * de la superficie con el texto de AXIS; la de la firma no se repite porque la dice el plano de cierre.
 */
export const shotPlan: RecipeBuilder = ({ intent, manifest }) => {
  const { width } = manifest.canvas
  const timeline = manifest.timeline as { durationMs: number; segments: ShotSegment[] } | undefined
  const segments = timeline?.segments ?? []

  if (segments.length === 0) throw new SurfacePieceError('El manifest de AXIS no trae los planos del timeline.', 'surface-issues')

  const shots = (intent.shots as { segment?: string; title?: string; spec?: string; note?: string; plateRef?: string; alt?: string }[] | undefined) ?? []
  const title = String(intent.title ?? '').trim()
  const duration = `${seconds(timeline!.durationMs)} s`

  if (!title) invalid('El plan de planos lleva `title`.')
  if (!title.includes(duration)) invalid(`El título dice otra duración: el timeline de AXIS dura ${duration}.`)

  const unknown = shots.filter(shot => !segments.some(segment => segment.id === shot.segment))

  if (unknown.length > 0) invalid(`Planos que el timeline de AXIS no tiene: ${unknown.map(s => s.segment).join(', ')}.`)

  const margin = Math.round(SHEET_MARGIN_OF_WIDTH * width)
  const gap = Math.round(SHEET_GAP_OF_WIDTH * width)
  const thumbWidth = Math.floor((width - 2 * margin - (segments.length - 1) * gap) / segments.length)
  const thumbHeight = Math.round((thumbWidth * 9) / 16)
  const assets: SurfaceAssetRequest[] = []

  const items = segments.map((segment, index) => {
    const shot = shots.find(s => s.segment === segment.id)

    if (!shot?.title?.trim() || !shot.spec?.trim() || !shot.note?.trim()) {
      invalid(`El plano ${segment.id} necesita title, spec y note en \`shots\`.`)
    }

    // La lente es del token: la ficha la nombra y no puede contradecirla.
    const lenses = [...shot!.spec!.matchAll(/(\d+)\s*mm\b/g)].map(m => Number(m[1]))

    if (segment.lensMm !== undefined && !lenses.includes(segment.lensMm)) {
      invalid(`La ficha de ${segment.id} no nombra su lente del timeline (${segment.lensMm} mm).`)
    }

    if (lenses.some(mm => mm !== segment.lensMm)) invalid(`La ficha de ${segment.id} nombra una lente que no es la del timeline.`)

    const plate = plateFromRef(shot!.plateRef, shot!.alt, { width: thumbWidth, height: thumbHeight }, `shots[${segment.id}]`)

    if (!assets.some(a => a.ref === plate.ref)) assets.push(plate.asset)

    return {
      src: plate.ref,
      alt: plate.alt,
      heading: `${String(index + 1).padStart(2, '0')} · ${seconds(segment.fromMs)}–${seconds(segment.toMs)} s · ${shot!.title!.trim()}`,
      spec: shot!.spec!.trim(),
      note: shot!.note!.trim()
    }
  })

  const surfaceRules = (efeonceGraphicLine.surfaces as unknown as Record<string, { rules: string[] }>).audiovisual!.rules
  const texts = new Map((manifest.rules as { id: string; text: string | null }[]).map(rule => [rule.id, rule.text]))
  const signsClose = segments.some(segment => segment.close)

  const rules = surfaceRules
    .filter(id => !(signsClose && id === 'signature-in-close-own-brand-only'))
    .map(id => texts.get(id) ?? invalid(`AXIS no trae el texto de la regla «${id}».`))

  return {
    slots: {
      frame: {
        line: intent.line,
        sheetMargin: css('--gl-sheet-margin', margin),
        shotGap: css('--gl-shot-gap', gap),
        thumbWidth: css('--gl-thumb-width', thumbWidth),
        thumbHeight: css('--gl-thumb-height', thumbHeight)
      },
      title,
      shots: items,
      rules
    },
    assets
  }
}

export const OVERLAY_BUILDERS: Record<string, RecipeBuilder> = {
  cartela,
  zocalo,
  'callout-selection': calloutSelection,
  'data-super': dataSuper,
  'split-screen': splitScreen,
  subtitles,
  'shot-plan': shotPlan
}

