/**
 * Builders de las recetas APROBADAS de web, DOOH y motion (catálogo `graphic-line-stills`, un PNG por pieza).
 * Ver `deck.ts` para el contrato de un builder.
 *
 * Qué hace cada builder y qué no:
 *   - Traduce el manifest de AXIS (reservas, escala de voces, lente, firma, delegados) y los tokens de la
 *     receta (`efeonceGraphicLine.surfaces.<surface>`) a custom properties `--gl-*` del molde (`gl-px-*`,
 *     `gl-css`). Nunca inventa una coordenada: cuando la receta da un RANGO o no da la medida, la regla está
 *     escrita aquí y calibrada contra la pieza aprobada, con la cifra aprobada en el comentario.
 *   - Pinta la órbita de la lente (anillo, arco y esfera) con `@efeoncepro/axis-graphic-line` y la entrega
 *     como capa SVG externa (`asset-ref:layer:*`). La plantilla nunca dibuja una órbita.
 *   - Declara los plates que quien compone debe materializar, ya con el recorte que la plantilla necesita: la
 *     plantilla sólo desplaza la foto con `object-position` y nunca la saca de su caja.
 *   - Falla cerrado si falta algo que la pieza aprobada tiene (CTA en la web, foco de la toma hecha para la
 *     lente, las ocho escenas del cuadro a cuadro) o si el formato no tiene plantilla.
 */

import { paintGraphicLine } from '@efeoncepro/axis-graphic-line'
import { resolveGraphicLineIntent, resolveSurfaceComposition } from '@efeoncepro/axis-ui-contracts'
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import type { RecipeSlots, SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import { contentOf, photoOf, plateFrom, selectionSlot, voiceSlots, type SurfaceManifest } from '../shared'
import type { RecipeBuilder } from './deck'

// ── Tipos mínimos de lo que se lee de AXIS ──────────────────────────────────────────────────────────

type Circle = { cx: number; cy: number; r: number }

type ManifestReserve = {
  band: string
  side?: string
  share?: number
  inset?: number
  fromTop?: number
  circle?: { cxOfWidth: number; cyOfHeight: number; rOfHeight: number }
}

type ManifestType = {
  px?: number
  lineHeight?: number | null
  tracking?: string | null
  maxWidthPx?: number
  gapBelowQuestionPx?: number
}

type LensElement = {
  outside: { grayscale: number; contrast: number; brightness: number; multiplyOpacity: number }
  inside: { zoom: number }
  ring: { strokePx: number; opacity: number; color: string; airRatio?: number; innerOrbits: unknown[] }
  arc: { startDeg: number; sweepDeg: number; strokePx: number; color: string; linecap?: string; gradient?: boolean }
  sphere: { radiusPx: number; color: string; at: string; ring: { radiusPx: number; opacity: number } | null }
  placement: unknown
}

type LensPiece = {
  ring: { cx: number; cy: number; r: number; strokePx: number; opacity: number }
  arc: { startDeg: number; endDeg: number; strokePx: number }
  sphereRadiusPx: number
}

const GL = efeonceGraphicLine as unknown as {
  orbit: { ringAirRatio: number }
  pieces: { lens: Record<string, LensPiece> }
  slogan: { lead: string }
  surfaces: {
    web: {
      orbitChannel: string
      chrome: {
        desktop: {
          navHeightOfHeight: number
          navPaddingInlinePx: number
          navLogoWidthPx: number
          navLinkPx: number
          textInsetOfWidth: number
        }
        phone: { marginOfWidth: number; statusBarOfHeight: number; navOfHeight: number; navLogoOfWidth: number }
      }
      cta: {
        desktop: {
          px: number
          paddingPx: [number, number]
          radiusPx: number
          descriptor: { px: number; lineHeight: number; maxWidthPx: [number, number]; belowCursorPx: number }
          localCursorScale: number
        }
        phone: {
          fromTopOfHeight: number
          fontOfWidth: number
          paddingOfWidth: [number, number]
          descriptor: { fontOfWidth: number; belowCursorOfWidth: number }
          localCursorScaleOfWidth: number
        }
      }
    }
    dooh: { orbitChannel: string }
    motion: { orbitChannel: string; recipes: Record<string, Record<string, unknown>> }
  }
}

// ── Utilidades de traducción ────────────────────────────────────────────────────────────────────────

const round4 = (n: number): number => Math.round(n * 10000) / 10000

/** Una custom property `--gl-*` para el resolver `gl-css` (sólo números con unidad: nunca un color). */
const css = (name: string, value: number, unit: 'px' | 'em' | '' = 'px'): string => `--gl-${name}=${round4(value)}${unit}`

const reserveOf = (manifest: SurfaceManifest, band: string): ManifestReserve | undefined =>
  (manifest.reserves as ManifestReserve[] | undefined)?.find(r => r.band === band)

const requireReserve = (manifest: SurfaceManifest, band: string): ManifestReserve => {
  const found = reserveOf(manifest, band)

  if (!found) {
    throw new SurfacePieceError(`El manifest de AXIS no trae la reserva «${band}» que la receta necesita.`, 'invalid-intent')
  }

  return found
}

const typeOf = (manifest: SurfaceManifest, role: string): ManifestType =>
  ((manifest.type ?? {}) as Record<string, ManifestType>)[role] ?? {}

const requirePx = (manifest: SurfaceManifest, role: string): number => {
  const px = typeOf(manifest, role).px

  if (typeof px !== 'number') {
    throw new SurfacePieceError(`El manifest de AXIS no resolvió el tamaño de «${role}».`, 'invalid-intent')
  }

  return px
}

/** El tracking del manifest (`-0.045em`) como número en em. */
const trackingEm = (value: string | null | undefined, fallback: number): number => {
  const match = /^(-?\d+(?:\.\d+)?)em$/.exec(String(value ?? '').trim())

  return match ? Number(match[1]) : fallback
}

/** El círculo de la reserva `lens` en px del lienzo. */
const lensCircleOf = (manifest: SurfaceManifest): Circle => {
  const circle = requireReserve(manifest, 'lens').circle

  if (!circle) throw new SurfacePieceError('La reserva de la lente no trae su círculo.', 'invalid-intent')

  const { width, height } = manifest.canvas

  return { cx: circle.cxOfWidth * width, cy: circle.cyOfHeight * height, r: circle.rOfHeight * height }
}

/** El elemento lente que resuelve el contrato de la órbita para el lienzo, la línea y el canal de la pieza. */
const resolveLens = (manifest: SurfaceManifest, line: string, channel: string): LensElement => {
  const { width, height } = manifest.canvas

  const resolved = resolveGraphicLineIntent({
    canvas: { width, height, line, surface: 'dark', channel },
    elements: [{ kind: 'lens', id: 'lens', photoId: 'plate', alt: 'lente', region: 'center-end' }]
  } as never) as unknown as { elements: LensElement[] }

  return resolved.elements[0]!
}

/**
 * La órbita de una lente (anillo con su aire, arco corto y esfera) pintada por AXIS, SIN la foto: la foto la
 * compone la plantilla con el plate. Se pinta como elemento `orbit` del mismo contrato, con los valores de
 * anillo, arco y esfera que resolvió la lente, sobre el círculo del ANILLO.
 */
const orbitLayer = (
  manifest: SurfaceManifest,
  line: string,
  channel: string,
  id: string,
  ringCircle: Circle,
  parts: { ring: LensElement['ring'] | null; arc: LensElement['arc']; sphere: LensElement['sphere'] }
): { ref: string; asset: SurfaceAssetRequest } => {
  const { width, height } = manifest.canvas

  const base = resolveGraphicLineIntent({
    canvas: { width, height, line, surface: 'dark', channel },
    elements: [{ kind: 'lens', id: 'lens', photoId: 'plate', alt: 'lente', region: 'center-end' }]
  } as never) as unknown as Record<string, unknown> & { elements: LensElement[] }

  const element = {
    kind: 'orbit',
    id,
    placement: base.elements[0]!.placement,
    ring: parts.ring ? { ...parts.ring, innerOrbits: [] } : null,
    arc: parts.arc,
    sphere: parts.sphere,
    halo: null,
    innerOrbits: false
  }

  const painted = paintGraphicLine({ ...base, elements: [element] } as never, {
    background: false,
    idPrefix: `gl-${id}`,
    circles: { [id]: ringCircle }
  })

  const ref = `asset-ref:layer:${id}-${line}-${width}x${height}`

  return { ref, asset: { ref, kind: 'svg', svg: painted.svg } }
}

/**
 * Los trazos de una lente que reproduce una pieza MEDIDA (`pieces.lens.<pieza>`): la pieza se escala al radio de
 * la foto de esta lente (misma cuenta que usaron las láminas aprobadas: k = r_foto / r_foto_de_la_pieza).
 */
const lensPartsFromPiece = (
  lens: LensElement,
  pieceName: string,
  photoR: number,
  arcSpan?: { startDeg: number; endDeg: number }
): { ring: LensElement['ring']; arc: LensElement['arc']; sphere: LensElement['sphere'] } => {
  const piece = GL.pieces.lens[pieceName]

  if (!piece) throw new SurfacePieceError(`AXIS no tiene la pieza medida de lente «${pieceName}».`, 'invalid-intent')

  const k = photoR / (piece.ring.r / (1 + GL.orbit.ringAirRatio))
  const span = arcSpan ?? piece.arc

  return {
    ring: { ...lens.ring, strokePx: piece.ring.strokePx * k, opacity: piece.ring.opacity },
    arc: { ...lens.arc, strokePx: piece.arc.strokePx * k, startDeg: span.startDeg, sweepDeg: span.endDeg - span.startDeg },
    sphere: { ...lens.sphere, radiusPx: piece.sphereRadiusPx * k }
  }
}

/**
 * Un plate con un recorte propio (la misma foto puede entrar dos veces con encuadres distintos). La foto es la que
 * AXIS delegó (`delegates.photo`): el plate y su alt que el contrato aceptó.
 */
const plateAt = (
  manifest: SurfaceManifest,
  fit: { width: number; height: number },
  crop: string
): { ref: string; alt: string; asset: SurfaceAssetRequest } => plateFrom(photoOf(manifest), fit, 'La foto', crop)

/** La pregunta que resolvió AXIS: las recetas de web, DOOH y motion la llevan siempre. */
const questionOf = (manifest: SurfaceManifest): string => {
  const question = contentOf(manifest).question

  if (!question) throw new SurfacePieceError('La receta lleva pregunta y el intent no la trae (`voice.question`).', 'invalid-intent')

  return question
}

const pushAsset = (assets: SurfaceAssetRequest[], asset: SurfaceAssetRequest): void => {
  if (!assets.some(a => a.ref === asset.ref)) assets.push(asset)
}

/**
 * Ancho promedio de un carácter de la pregunta (Poppins 300), en em. Calibrado sobre la pregunta aprobada del
 * hero a sangre: «¿Tu marketing ya mide lo que vende?» a 30 px ocupa 557 px después del anillo (35 caracteres).
 */
const QUESTION_EM_PER_CHAR = 0.53

/** El anillo que abre la pregunta ocupa 0,42 em + 0,35 em de aire (mismo trazo que `recipeHtml` de AXIS). */
const QUESTION_RING_EM = 0.77

/**
 * La pregunta en una o dos líneas: si en una línea cruzaría el anillo de la lente (regla
 * `text-never-crosses-ring`), se parte en el límite de palabra más cercano a la mitad. La pieza aprobada del loop
 * lo hace así: «¿Tu marketing mide / lo que vende?».
 */
const questionLines = (question: string, px: number, left: number, maxRight: number): string[] => {
  const width = (question.length * QUESTION_EM_PER_CHAR + QUESTION_RING_EM) * px

  if (left + width <= maxRight) return [question]

  const words = question.split(' ')
  let best = 1
  let bestDistance = Infinity

  for (let i = 1; i < words.length; i++) {
    const distance = Math.abs(words.slice(0, i).join(' ').length - question.length / 2)

    if (distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  }

  const lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
  const widest = Math.max(...lines.map(l => (l.length * QUESTION_EM_PER_CHAR + QUESTION_RING_EM) * px))

  if (left + widest > maxRight) {
    throw new SurfacePieceError(
      `La pregunta «${question}» no cabe antes del anillo de la lente ni en dos líneas: acórtala.`,
      'invalid-intent'
    )
  }

  return lines
}

/** El borde por el que la voz no puede pasar: el anillo de la lente menos su aire. */
const ringGuard = (ring: Circle, lens: LensElement): number => ring.cx - ring.r - ring.r * (lens.ring.airRatio ?? GL.orbit.ringAirRatio)

// ── Web ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * La respuesta empieza un poco antes que la pregunta: el lado izquierdo de las mayúsculas de Bricolage trae aire
 * propio. Las tres láminas aprobadas lo corrigen entre 0,02 y 0,045 em (4 px a 200, 6 px a 166, 8 px a 176);
 * se usa el punto medio.
 */
const DESKTOP_ANSWER_NUDGE_EM = -0.03

/**
 * Distancia entre el tope de la pregunta y el de la respuesta, en tamaños de pregunta. Calibrado sobre las tres
 * láminas aprobadas (50 px a 30, 52 px a 30, 56 px a 32 → 1,67 · 1,73 · 1,75).
 */
const DESKTOP_ANSWER_GAP_OF_QUESTION = 1.7

type WebCopy = { label: string; descriptor: string }

const webCta = (manifest: SurfaceManifest): WebCopy => {
  const cta = (manifest.content as { cta?: WebCopy | null } | undefined)?.cta

  if (!cta?.label || !cta.descriptor) {
    throw new SurfacePieceError(
      'El hero web lleva CTA con su descriptor (`cta.label` y `cta.descriptor`): así se aprobó y así se compone.',
      'invalid-intent'
    )
  }

  return { label: cta.label, descriptor: cta.descriptor }
}

/**
 * El encabezado del sitio: los enlaces y la acción que AXIS validó (`nav-invalid`: 1–5 enlaces y una acción). La marca
 * firma con el logo del encabezado.
 */
const webNav = (manifest: SurfaceManifest): { links: string[]; action: string } | null => contentOf(manifest).nav ?? null

/** Las medidas comunes del hero de escritorio (voz, CTA y encabezado). */
const desktopFrame = (manifest: SurfaceManifest, line: string, hasBody: boolean): Record<string, unknown> => {
  const { width, height } = manifest.canvas
  const chrome = GL.surfaces.web.chrome.desktop
  const ctaTokens = GL.surfaces.web.cta.desktop
  const voice = requireReserve(manifest, 'voice')
  const cta = requireReserve(manifest, 'cta')
  const nav = reserveOf(manifest, 'nav')
  const answer = typeOf(manifest, 'answer')

  // El texto de la web entra por `chrome.textInsetOfWidth` (96 px en 1440). Cuando la receta corre la voz más
  // afuera (`voice.inset` menor: la tableta, 88 px), eso mueve sólo la RESPUESTA; si no, la respuesta lleva la
  // corrección óptica de Bricolage.
  const margin = Math.round(chrome.textInsetOfWidth * width)
  const voiceLeft = Math.round((voice.inset ?? chrome.textInsetOfWidth) * width)
  const answerPx = requirePx(manifest, 'answer')
  const answerNudge = voiceLeft < margin ? (voiceLeft - margin) / answerPx : DESKTOP_ANSWER_NUDGE_EM
  const questionPx = requirePx(manifest, 'question')
  const questionTop = Math.round((voice.fromTop ?? 0) * height)

  // El descriptor mide lo que la bajada cuando la hay (360 en el hero con lente) y el mínimo del rango cuando no
  // (330 en los heroes a sangre): así se aprobaron.
  const [descMin, descMax] = ctaTokens.descriptor.maxWidthPx

  return {
    line,
    margin,
    questionTop,
    questionPx: css('question-px', questionPx),
    answerTop: questionTop + Math.round(questionPx * DESKTOP_ANSWER_GAP_OF_QUESTION),
    answerPx,
    answerLineHeight: css('answer-lh', answer.lineHeight ?? 1, ''),
    answerTracking: css('answer-tracking', trackingEm(answer.tracking, -0.035), 'em'),
    answerNudge: css('answer-nudge', answerNudge, 'em'),
    ctaTop: css('cta-top', Math.round((cta.fromTop ?? 0) * height)),
    ctaPx: css('cta-px', ctaTokens.px),
    ctaPadY: css('cta-pad-y', ctaTokens.paddingPx[0]),
    ctaPadX: css('cta-pad-x', ctaTokens.paddingPx[1]),
    ctaRadius: css('cta-radius', ctaTokens.radiusPx),
    descriptorPx: css('descriptor-px', ctaTokens.descriptor.px),
    descriptorLineHeight: css('descriptor-lh', ctaTokens.descriptor.lineHeight, ''),
    descriptorWidth: css('descriptor-width', hasBody ? descMax : descMin),
    navHeight: css('nav-height', Math.round((nav?.share ?? chrome.navHeightOfHeight) * height)),
    navPadX: css('nav-pad-x', chrome.navPaddingInlinePx),
    navLogoWidth: css('nav-logo-width', chrome.navLogoWidthPx),
    navLinkPx: css('nav-link-px', chrome.navLinkPx)
  }
}

const webSlotsBase = (manifest: SurfaceManifest): Record<string, unknown> => {
  const slots: Record<string, unknown> = {
    voice: voiceSlots(manifest),
    cta: webCta(manifest)
  }

  const nav = webNav(manifest)

  if (nav) slots.nav = nav

  const selection = selectionSlot(manifest)

  if (selection) slots.selection = selection

  return slots
}

/**
 * `web.hero-lens`: la lente gigante a la derecha (anatomía de la portada del deck) con la foto del oficio dentro,
 * la voz y la bajada a la izquierda, el CTA con corchetes y cursor local y el descriptor bajo el cursor.
 */
export const heroLens: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const channel = GL.surfaces.web.orbitChannel
  const photoCircle = lensCircleOf(manifest)
  const lens = resolveLens(manifest, intent.line, channel)
  const lensTokens = recipe.lens as { anatomyFrom?: string; arc?: { startDeg: number; endDeg: number } }
  const ringCircle = { ...photoCircle, r: photoCircle.r * (1 + (lens.ring.airRatio ?? GL.orbit.ringAirRatio)) }

  const content = contentOf(manifest)

  if (!content.body) throw new SurfacePieceError('El hero con lente lleva bajada (`body`).', 'invalid-intent')

  const frame = desktopFrame(manifest, intent.line, true)
  const questionPx = requirePx(manifest, 'question')
  const lines = questionLines(questionOf(manifest), questionPx, Number(frame.margin), ringGuard(ringCircle, lens))

  if (lines.length > 1) throw new SurfacePieceError('En el hero con lente la pregunta va en una línea: acórtala.', 'invalid-intent')

  const body = typeOf(manifest, 'body')
  const assets: RecipeSlots['assets'] = []
  const photo = plateAt(manifest, { width, height }, 'canvas')

  pushAsset(assets, photo.asset)

  const orbit = orbitLayer(
    manifest,
    intent.line,
    channel,
    'hero-lens-orbit',
    ringCircle,
    lensPartsFromPiece(lens, lensTokens.anatomyFrom ?? 'deck-cover', photoCircle.r, lensTokens.arc)
  )

  pushAsset(assets, orbit.asset)

  const slots: Record<string, unknown> = {
    frame: {
      ...frame,
      bodyTop: Math.round((requireReserve(manifest, 'body').fromTop ?? 0) * height),
      bodyPx: body.px ?? 20,
      bodyWidth: body.maxWidthPx ?? 470,
      bodyLineHeight: css('body-lh', body.lineHeight ?? 1.55, ''),
      lensCx: css('lens-cx', photoCircle.cx),
      lensCy: css('lens-cy', photoCircle.cy),
      lensR: css('lens-r', photoCircle.r),
      lensGray: css('lens-gray', lens.outside.grayscale, ''),
      lensContrast: css('lens-contrast', lens.outside.contrast, ''),
      lensBrightness: css('lens-brightness', lens.outside.brightness, ''),
      lensVeil: css('lens-veil', lens.outside.multiplyOpacity, '')
    },
    photo: { src: photo.ref, lensSrc: photo.ref, alt: photo.alt },
    orbit: { src: orbit.ref },
    body: content.body,
    ...webSlotsBase(manifest)
  }

  return { slots, assets }
}

/**
 * `web.hero-bleed` y `web.hero-uniform-tablet`: la foto de puesta en escena a sangre y la voz gigante sobre el
 * aire de la toma. Mismo molde (`hero-bleed.html`); la respuesta en una o dos líneas sale del intent.
 */
const heroBleedLike: RecipeBuilder = ({ intent, manifest }) => {
  const { width, height } = manifest.canvas
  const assets: RecipeSlots['assets'] = []
  const photo = plateAt(manifest, { width, height }, 'canvas')

  pushAsset(assets, photo.asset)

  const slots: Record<string, unknown> = {
    frame: desktopFrame(manifest, intent.line, false),
    photo: { src: photo.ref, alt: photo.alt },
    ...webSlotsBase(manifest)
  }

  return { slots, assets }
}

export const heroBleed: RecipeBuilder = heroBleedLike
export const heroUniformTablet: RecipeBuilder = heroBleedLike

/** Anchos de teléfono con plantilla propia (el viewport de una plantilla es fijo). */
export const PHONE_TEMPLATES: Record<string, string> = {
  'phone-360': 'HeroMobileNative360',
  'phone-390': 'HeroMobileNative390',
  'phone-430': 'HeroMobileNative430'
}

/**
 * La respuesta del teléfono entra un poco a la DERECHA del margen (0,04 em): así se aprobó en los tres anchos,
 * para que la «A» de Bricolage quede óptica con el anillo de la pregunta.
 */
const PHONE_ANSWER_NUDGE_EM = 0.04

/** Interlineado del descriptor en el teléfono aprobado (el de escritorio es 1,45). */
const PHONE_DESCRIPTOR_LINE_HEIGHT = 1.4

const parseAspect = (value: unknown): number | null => {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(String(value ?? ''))

  return match ? Number(match[1]) / Number(match[2]) : null
}

/**
 * `web.hero-mobile-native`: teléfono con la toma vertical nativa a sangre, la voz gigante arriba sobre el aire de
 * la toma con su selección y el CTA en la zona del pulgar (79 % del alto). Todo sale del ancho y del alto.
 */
export const heroMobileNative: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const format = String(manifest.format ?? intent.format)

  if (!PHONE_TEMPLATES[format]) {
    throw new SurfacePieceError(`El teléfono ${format} no tiene plantilla.`, 'recipe-without-template')
  }

  const { width, height } = manifest.canvas
  const chrome = GL.surfaces.web.chrome.phone
  const ctaTokens = GL.surfaces.web.cta.phone
  const voice = requireReserve(manifest, 'voice')
  const answer = typeOf(manifest, 'answer')
  // La proporción de la toma y su centro de recorte: los que AXIS delegó con la foto (tokens de la receta).
  const photoTokens = (photoOf(manifest) ?? recipe.photo) as { native?: string | null; cropCenterXOfFile?: number }

  const margin = Math.round((voice.inset ?? chrome.marginOfWidth) * width)
  const questionPx = Math.round(requirePx(manifest, 'question'))
  const answerPx = Math.round(requirePx(manifest, 'answer'))
  const questionTop = Math.round((voice.fromTop ?? 0) * height)
  const answerTop = questionTop + Math.round(answer.gapBelowQuestionPx ?? 0.085 * width)

  // La toma vertical nativa se escala al alto del teléfono y se encuadra en el centro que fijó la receta.
  const aspect = parseAspect(photoTokens.native) ?? 9 / 16
  const photoWidth = Math.round(height * aspect)
  const centerX = photoTokens.cropCenterXOfFile ?? 0.5
  const photoLeft = Math.max(0, Math.min(photoWidth - width, Math.round(centerX * photoWidth - width / 2)))

  const assets: RecipeSlots['assets'] = []
  const photo = plateAt(manifest, { width: photoWidth, height }, 'native')

  pushAsset(assets, photo.asset)

  const slots: Record<string, unknown> = {
    frame: {
      line: intent.line,
      margin,
      questionTop,
      questionPx: css('question-px', questionPx),
      answerTop,
      answerPx,
      answerLineHeight: css('answer-lh', answer.lineHeight ?? 0.9, ''),
      answerTracking: css('answer-tracking', trackingEm(answer.tracking, -0.055), 'em'),
      answerNudge: css('answer-nudge', PHONE_ANSWER_NUDGE_EM, 'em'),
      ctaTop: css('cta-top', Math.round(ctaTokens.fromTopOfHeight * height)),
      ctaPx: css('cta-px', Math.round(ctaTokens.fontOfWidth * width)),
      ctaPadY: css('cta-pad-y', Math.round(ctaTokens.paddingOfWidth[0] * width)),
      ctaPadX: css('cta-pad-x', Math.round(ctaTokens.paddingOfWidth[1] * width)),
      ctaRadius: css('cta-radius', GL.surfaces.web.cta.desktop.radiusPx),
      descriptorPx: css('descriptor-px', Math.round(ctaTokens.descriptor.fontOfWidth * width)),
      descriptorLineHeight: css('descriptor-lh', PHONE_DESCRIPTOR_LINE_HEIGHT, ''),
      descriptorWidth: css('descriptor-width', width - 2 * margin),
      statusHeight: css('status-height', Math.round(chrome.statusBarOfHeight * height)),
      navHeight: css('nav-height', Math.round(chrome.navOfHeight * height)),
      navPadX: css('nav-pad-x', margin),
      navLogoWidth: css('nav-logo-width', Math.round(chrome.navLogoOfWidth * width)),
      photoX: css('photo-x', -photoLeft)
    },
    photo: { src: photo.ref, alt: photo.alt },
    ...webSlotsBase(manifest)
  }

  delete slots.nav

  // Una plantilla por ancho: el contentType lleva el formato para que el selector elija la del teléfono pedido.
  return { slots, assets, contentType: `web.hero-mobile-native.${format}` }
}

// ── DOOH ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * `dooh.caminero-lens`: caminero 12 × 4 m. La lente de AXIS a la derecha (canal de impresión), la voz arriba a la
 * izquierda y el logo de 2 m ABAJO A LA IZQUIERDA, al final del recorrido de lectura.
 */
export const camineroLens: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const channel = GL.surfaces.dooh.orbitChannel
  const photoCircle = lensCircleOf(manifest)
  const lens = resolveLens(manifest, intent.line, channel)
  const lensTokens = recipe.lens as { ringROfHeight?: number }
  const ringCircle = { ...photoCircle, r: (lensTokens.ringROfHeight ?? 0) * height || photoCircle.r * (1 + GL.orbit.ringAirRatio) }
  const signature = manifest.signature as { widthPx?: number; marginPx?: number; anchor?: string } | undefined

  if (signature?.anchor !== 'bottom-start' || !signature.widthPx || !signature.marginPx) {
    throw new SurfacePieceError('El caminero firma con el logo abajo a la izquierda (`signature.anchor: bottom-start`).', 'invalid-intent')
  }

  const margin = manifest.safeArea?.marginPx ?? signature.marginPx
  const questionPx = requirePx(manifest, 'question')
  const answer = typeOf(manifest, 'answer')
  const lines = questionLines(questionOf(manifest), questionPx, margin, ringGuard(ringCircle, lens))

  if (lines.length > 1) throw new SurfacePieceError('En el caminero la pregunta va en una línea: acórtala.', 'invalid-intent')

  // El interior de la lente se acerca `inside.zoom` alrededor de su centro (así lo pinta `paintGraphicLine`): es
  // otro recorte del mismo plate, desplazado para que el centro de la lente quede quieto.
  const zoom = lens.inside.zoom
  const assets: RecipeSlots['assets'] = []
  const photo = plateAt(manifest, { width, height }, 'canvas')
  const inside = plateAt(manifest, { width: width * zoom, height: height * zoom }, `lens-${zoom}`)

  pushAsset(assets, photo.asset)
  pushAsset(assets, inside.asset)

  const orbit = orbitLayer(manifest, intent.line, channel, 'caminero-orbit', ringCircle, {
    ring: lens.ring,
    arc: lens.arc,
    sphere: lens.sphere
  })

  pushAsset(assets, orbit.asset)

  const slots: Record<string, unknown> = {
    frame: {
      line: intent.line,
      margin,
      questionTop: Math.round((requireReserve(manifest, 'voice').fromTop ?? 0) * height),
      questionPx: css('question-px', questionPx),
      answerTop: Math.round((requireReserve(manifest, 'answer').fromTop ?? 0) * height),
      answerPx: requirePx(manifest, 'answer'),
      answerLineHeight: css('answer-lh', answer.lineHeight ?? 1, ''),
      answerTracking: css('answer-tracking', trackingEm(answer.tracking, -0.035), 'em'),
      answerNudge: css('answer-nudge', 0, 'em'),
      signatureWidth: css('signature-width', signature.widthPx),
      signatureMargin: css('signature-margin', signature.marginPx),
      lensCx: css('lens-cx', photoCircle.cx),
      lensCy: css('lens-cy', photoCircle.cy),
      lensR: css('lens-r', photoCircle.r),
      lensGray: css('lens-gray', lens.outside.grayscale, ''),
      lensContrast: css('lens-contrast', lens.outside.contrast, ''),
      lensBrightness: css('lens-brightness', lens.outside.brightness, ''),
      lensVeil: css('lens-veil', lens.outside.multiplyOpacity, ''),
      lensInsideX: css('lens-inside-x', -(zoom - 1) * photoCircle.cx),
      lensInsideY: css('lens-inside-y', -(zoom - 1) * photoCircle.cy)
    },
    photo: { src: photo.ref, lensSrc: inside.ref, alt: photo.alt },
    orbit: { src: orbit.ref },
    voice: voiceSlots(manifest)
  }

  return { slots, assets }
}

// ── Motion ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * La toma HECHA para la lente (`photo.madeForLens`) se ubica por su foco, no por un recorte centrado: el intent
 * declara la proporción del archivo (`photo.native`, «4:7») y dónde está la cara (`photo.focus`: `xOfWidth` y
 * `yOfHeight`, fracciones del archivo); AXIS valida ambos (`photo-native-invalid`, `photo-focus-invalid`) y los
 * devuelve en `delegates.photo`. Calibrado sobre la pieza aprobada (M1 · polo): a escala 1 el ancho de la toma mide 1,463 diámetros de
 * la foto de la lente, la receta la agranda `photo.scale` (1,1 → 1126 px para una foto de 350 px de radio) y la
 * cara queda sobre el centro de la lente, 0,257 radios más arriba (cabeza, hombros, polo y credencial adentro).
 */
const MADE_FOR_LENS_WIDTH_OF_DIAMETER = 1.4629
const MADE_FOR_LENS_FACE_ABOVE_CENTER_OF_R = 0.257

type LensPhotoPlacement = { fit: { width: number; height: number }; x: number; y: number }

const madeForLensPlacement = (manifest: SurfaceManifest, recipe: Record<string, unknown>, photoCircle: Circle): LensPhotoPlacement => {
  const photo = photoOf(manifest)
  const aspect = parseAspect(photo?.native)
  const fx = photo?.focus?.xOfWidth
  const fy = photo?.focus?.yOfHeight

  // AXIS valida el formato del foco y de la proporción cuando vienen, pero no los exige: la toma hecha para la lente
  // no se ubica sin los dos ejes del foco.
  if (!aspect || typeof fx !== 'number' || typeof fy !== 'number') {
    throw new SurfacePieceError(
      'La toma hecha para la lente se ubica por su foco: el intent trae `photo.native` («4:7») y `photo.focus` ({ xOfWidth, yOfHeight }).',
      'missing-photo'
    )
  }

  const scale = Number((recipe.photo as { scale?: number } | undefined)?.scale ?? 1)
  const width = MADE_FOR_LENS_WIDTH_OF_DIAMETER * 2 * photoCircle.r * scale
  const height = width / aspect

  return {
    fit: { width: Math.round(width), height: Math.round(height) },
    x: Math.round(photoCircle.cx - fx * width),
    y: Math.round(photoCircle.cy - MADE_FOR_LENS_FACE_ABOVE_CENTER_OF_R * photoCircle.r - fy * height)
  }
}

/** La lente del loop: la pieza medida `lens.wall` (el círculo de la reserva es el del ANILLO). */
const loopLens = (manifest: SurfaceManifest, line: string) => {
  const channel = GL.surfaces.motion.orbitChannel
  const ringCircle = lensCircleOf(manifest)
  const lens = resolveLens(manifest, line, channel)
  const photoCircle = { ...ringCircle, r: ringCircle.r / (1 + (lens.ring.airRatio ?? GL.orbit.ringAirRatio)) }

  return { channel, ringCircle, photoCircle, lens }
}

/** El interlineado de la pregunta en dos líneas del loop aprobado. */
const MOTION_QUESTION_LINE_HEIGHT = 1.2

/** La voz del loop: la última línea de la pregunta se apoya en la reserva (así sube cuando se parte en dos). */
const motionVoice = (manifest: SurfaceManifest, guard: number) => {
  const { width, height } = manifest.canvas
  const voiceReserve = requireReserve(manifest, 'voice')
  const answerReserve = requireReserve(manifest, 'answer')
  const questionPx = requirePx(manifest, 'question')
  const answerPx = requirePx(manifest, 'answer')
  const answer = typeOf(manifest, 'answer')
  const margin = Math.round((voiceReserve.inset ?? 0) * width)
  const answerLeft = Math.round((answerReserve.inset ?? voiceReserve.inset ?? 0) * width)
  const lines = questionLines(questionOf(manifest), questionPx, margin, guard)
  const lastLineTop = Math.round((voiceReserve.fromTop ?? 0) * height)

  return {
    lines,
    frame: {
      margin,
      questionTop: lastLineTop - Math.round((lines.length - 1) * questionPx * MOTION_QUESTION_LINE_HEIGHT),
      questionPx: css('question-px', questionPx),
      questionLineHeight: css('question-lh', MOTION_QUESTION_LINE_HEIGHT, ''),
      answerTop: Math.round((answerReserve.fromTop ?? 0) * height),
      answerPx,
      answerLineHeight: css('answer-lh', answer.lineHeight ?? 1, ''),
      answerTracking: css('answer-tracking', trackingEm(answer.tracking, -0.035), 'em'),
      answerNudge: css('answer-nudge', (answerLeft - margin) / answerPx, 'em')
    }
  }
}

/** La pregunta partida como la escribe la plantilla (texto plano con `<br>` entre las dos líneas). */
const joinLines = (lines: string[]): string => lines.join('<br>')

/**
 * `motion.loop-lens-reveal`: el composer NO hace el video (lo hace el pipeline de motion). Entrega el ÚLTIMO
 * CUADRO del sostén, que es el estático de respaldo completo (regla `last-frame-static-fallback`): la lente abierta
 * con la toma hecha para ella, la voz en dos líneas sin tocar el anillo, la respuesta y su selección.
 */
export const loopLensReveal: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { line } = intent
  const { channel, ringCircle, photoCircle, lens } = loopLens(manifest, line)
  const voice = motionVoice(manifest, ringGuard(ringCircle, lens))
  const placement = madeForLensPlacement(manifest, recipe, photoCircle)
  const assets: RecipeSlots['assets'] = []
  const photo = plateAt(manifest, placement.fit, 'lens')

  pushAsset(assets, photo.asset)

  const orbit = orbitLayer(
    manifest,
    line,
    channel,
    'loop-orbit',
    ringCircle,
    lensPartsFromPiece(lens, 'wall', photoCircle.r)
  )

  pushAsset(assets, orbit.asset)

  const slots: Record<string, unknown> = {
    frame: {
      line,
      ...voice.frame,
      lensCx: css('lens-cx', photoCircle.cx),
      lensCy: css('lens-cy', photoCircle.cy),
      lensR: css('lens-r', photoCircle.r),
      photoX: css('photo-x', placement.x),
      photoY: css('photo-y', placement.y)
    },
    photo: { lensSrc: photo.ref, alt: photo.alt },
    orbit: { src: orbit.ref },
    voice: { ...voiceSlots(manifest), question: joinLines(voice.lines) }
  }

  const selection = selectionSlot(manifest)

  if (selection) slots.selection = selection

  return { slots, assets }
}

// ── Motion · la hoja del cuadro a cuadro ────────────────────────────────────────────────────────────

/** Las escenas de la hoja, en el orden del timeline de AXIS. Cada una sabe qué capas muestra. */
const STORYBOARD_SCENES = [
  'anticipation',
  'lens-opens',
  'arc-runs-sphere-hits',
  'voice-enters',
  'selection-settles',
  'hold',
  'close-reveal',
  'end-card'
] as const

type StoryboardScene = (typeof STORYBOARD_SCENES)[number]

/** Tiempo de un segmento en segundos con coma decimal: «0,3–0,8 s». */
const secondsRange = (fromMs: number, toMs: number): string => {
  const s = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',')

  return `${s(fromMs)}–${s(toMs)} s`
}

/**
 * Cómo se ve la lente en cada escena de la hoja. Son los estados del lenguaje de movimiento que animó la pieza
 * aprobada (`MotionStoryboard`), expresados sobre la pieza medida `lens.wall`:
 *   - anticipación: el anillo nace chico (70 px, 0,35 de opacidad) y la esfera retrocede antes de salir;
 *   - la lente se abre: la foto al 58 % de su radio y el arco apenas nace (18°);
 *   - el arco corre y la esfera golpea: el tramo rápido con su estela (el degradé del arco de AXIS) y el pulso
 *     de impacto (el anillo de la esfera);
 *   - de ahí en adelante, la lente asentada.
 */
const ANTICIPATION_RING_PX = 70
const ANTICIPATION_RING_OPACITY = 0.35
const ANTICIPATION_SPHERE_DEG = -112
const OPENING_PHOTO_OF_R = 0.58
const OPENING_ARC_DEG = 18
const IMPACT_PULSE_OF_SPHERE = 2.6
const IMPACT_PULSE_OPACITY = 0.55

/**
 * `motion.storyboard`: la hoja del cuadro a cuadro del loop. Cada cuadro es el mismo lienzo 16:9 del loop en un
 * estado de su timeline; la voz, la lente y la toma son las de `loop-lens-reveal`, resueltas por AXIS con el mismo
 * intent (la hoja documenta ESA pieza). El cierre (reveal y tapa) se representa con los archivos oficiales de la
 * marca: el isotipo en su órbita y el logo con el eslogan.
 */
export const storyboard: RecipeBuilder = ({ intent, manifest }) => {
  const timeline = manifest.timeline as { segments?: { id: string; fromMs: number; toMs: number }[] } | null
  const segments = timeline?.segments ?? []
  const { frames, title } = contentOf(manifest)

  if (
    segments.length !== STORYBOARD_SCENES.length ||
    segments.some((segment, i) => segment.id !== STORYBOARD_SCENES[i])
  ) {
    throw new SurfacePieceError(
      `La hoja dibuja las ocho escenas del timeline aprobado (${STORYBOARD_SCENES.join(', ')}); AXIS resolvió otras.`,
      'invalid-intent'
    )
  }

  // AXIS ya exige un cuadro por escena del timeline, en su orden, con título y pie (`frames-segments-mismatch`,
  // `frame-text-required`) y el título de la hoja (`title-required`): aquí sólo se cierra un manifest sin ellos.
  if (!frames || frames.length !== segments.length || !title) {
    throw new SurfacePieceError('La hoja lleva título y un cuadro por escena del timeline (`title`, `frames`).', 'invalid-intent')
  }

  // La pieza que documenta la hoja: el loop, resuelto por AXIS con la misma voz, toma y línea.
  const loopRecipe = GL.surfaces.motion.recipes['loop-lens-reveal']!
  const loopSelectionTokens = loopRecipe.selection as { target: string; label: string; participantKind: string }

  const loopIntent = {
    ...intent,
    role: 'loop',
    recipe: 'loop-lens-reveal',
    selection: { target: loopSelectionTokens.target, label: loopSelectionTokens.label, participantKind: loopSelectionTokens.participantKind }
  }

  delete (loopIntent as Record<string, unknown>).title
  delete (loopIntent as Record<string, unknown>).frames

  const loopManifest = resolveSurfaceComposition(loopIntent as never) as unknown as SurfaceManifest & { issues?: { code: string }[] }

  if ((loopManifest.issues ?? []).length > 0) {
    throw new SurfacePieceError(
      `El loop que documenta la hoja no resuelve: ${(loopManifest.issues ?? []).map(i => i.code).join(', ')}.`,
      'surface-issues',
      loopManifest.issues
    )
  }

  const { line } = intent
  const { channel, ringCircle, photoCircle, lens } = loopLens(loopManifest, line)
  const voice = motionVoice(loopManifest, ringGuard(ringCircle, lens))
  const placement = madeForLensPlacement(manifest, loopRecipe, photoCircle)
  const settled = lensPartsFromPiece(lens, 'wall', photoCircle.r)
  const assets: RecipeSlots['assets'] = []
  const photo = plateAt(manifest, placement.fit, 'lens')

  pushAsset(assets, photo.asset)

  const layer = (scene: StoryboardScene, circle: Circle, parts: Parameters<typeof orbitLayer>[5]) => {
    const painted = orbitLayer(loopManifest, line, channel, `storyboard-${scene}`, circle, parts)

    pushAsset(assets, painted.asset)

    return painted.ref
  }

  const answerVoice = voiceSlots(manifest)
  const question = joinLines(voice.lines)
  const loopSelection = selectionSlot(loopManifest)

  const sceneSlots = (scene: StoryboardScene): Record<string, unknown> => {
    switch (scene) {
      case 'anticipation': {
        const small = { ...ringCircle, r: ANTICIPATION_RING_PX }

        return {
          kind: 'orbit',
          orbit: layer(scene, small, {
            ring: { ...settled.ring, opacity: ANTICIPATION_RING_OPACITY },
            arc: { ...settled.arc, startDeg: ANTICIPATION_SPHERE_DEG, sweepDeg: 0 },
            sphere: settled.sphere
          })
        }
      }

      case 'lens-opens': {
        const r = photoCircle.r * OPENING_PHOTO_OF_R

        return {
          kind: 'lens',
          lensR: css('lens-r', r),
          orbit: layer(scene, { ...ringCircle, r: r * (1 + (lens.ring.airRatio ?? GL.orbit.ringAirRatio)) }, {
            ...settled,
            arc: { ...settled.arc, sweepDeg: OPENING_ARC_DEG }
          })
        }
      }

      case 'arc-runs-sphere-hits':
        return {
          kind: 'lens',
          orbit: layer(scene, ringCircle, {
            ...settled,
            arc: { ...settled.arc, gradient: true },
            sphere: {
              ...settled.sphere,
              ring: { radiusPx: settled.sphere.radiusPx * IMPACT_PULSE_OF_SPHERE, opacity: IMPACT_PULSE_OPACITY }
            }
          })
        }

      case 'voice-enters':
      case 'selection-settles':
      case 'hold':
        // «sí» todavía no asienta en la entrada de la voz; la selección encaja recién en la escena siguiente.
        return { kind: scene === 'voice-enters' ? 'overshoot' : 'voice' }

      case 'close-reveal':
        return { kind: 'reveal' }

      case 'end-card':
        return { kind: 'endcard' }
    }
  }

  // Todo cuadro trae todas sus capas (el molde enciende las de su escena): la lente asentada y la voz son la base.
  const settledOrbit = layer('hold', ringCircle, settled)

  const items = segments.map((segment, i) => ({
    time: secondsRange(segment.fromMs, segment.toMs),
    title: frames[i]!.title,
    caption: frames[i]!.caption,
    lensR: css('lens-r', photoCircle.r),
    orbit: settledOrbit,
    question,
    ...(answerVoice.answerLead ? { answerLead: answerVoice.answerLead } : {}),
    answer: answerVoice.answer,
    ...sceneSlots(segment.id as StoryboardScene)
  }))

  const slots: Record<string, unknown> = {
    frame: {
      line,
      ...voice.frame,
      lensCx: css('lens-cx', photoCircle.cx),
      lensCy: css('lens-cy', photoCircle.cy),
      photoX: css('photo-x', placement.x),
      photoY: css('photo-y', placement.y)
    },
    title,
    photo: { src: photo.ref, alt: photo.alt },
    frames: items
  }

  if (loopSelection) slots.selection = loopSelection

  return { slots, assets }
}

export const STILL_BUILDERS: Record<'web' | 'dooh' | 'motion', Record<string, RecipeBuilder>> = {
  web: {
    'hero-lens': heroLens,
    'hero-bleed': heroBleed,
    'hero-uniform-tablet': heroUniformTablet,
    'hero-mobile-native': heroMobileNative
  },
  dooh: {
    'caminero-lens': camineroLens
  },
  motion: {
    'loop-lens-reveal': loopLensReveal,
    storyboard
  }
}

/** Para las pruebas: la regla que parte la pregunta antes del anillo. */
export const __test = { questionLines }
