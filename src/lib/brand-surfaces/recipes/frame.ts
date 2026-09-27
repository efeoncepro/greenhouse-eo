/**
 * Builders del MARCO del documento: las portadas y contraportadas aprobadas del brochure y de la propuesta comercial
 * (TASK-1927; `efeonce.surface-composition` 0.1.2, deltas (b) y (e) de AXIS).
 *
 * Todo lo que pintan sale de AXIS: las reservas y la tipografía, del manifest; la columna de voz (`column`), el eje del
 * amanecer (`axis`), la pintura de las órbitas de luz (`orbitPaint`), el estilo del contacto (`contact.style`) y la caja
 * del logo del cliente (`clientLogo.box`), de los tokens de la receta. Los DATOS de contacto son de Efeonce
 * (`EFEONCE_CONTACT`): AXIS sólo define el estilo.
 *
 * Lo que elige quien compone, siempre dentro de lo que AXIS midió:
 *   - `column.topPx` del intent: el alto de la columna de voz según la foto (el sujeto manda). Sin él, el valor por
 *     defecto del token. Fuera del rango de la reserva del logo, falla.
 *   - `clientLogo` del intent: el archivo del logo del cliente y su alt. Sin él, la portada de propuesta sale con el
 *     marcador «Logo del cliente» (la plantilla).
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import { EFEONCE_CONTACT } from '@/config/efeonce-brand'

import type { SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import { contentOf, ofHeight, plateAsset, reserve, selectionDelegate, voiceSlots, type SurfaceIntent, type SurfaceManifest } from '../shared'

import type { RecipeBuilder } from './deck'

/* ── Tokens de la receta ──────────────────────────────────────────────────────────────────────────────────── */

type Stop = { at: number; opacity: number }

type SpherePaint = { radiusPx: number; glowPx: number; core: { radiusPx: number; color: string }; atDeg?: number; at?: string }

type OrbitPaint = {
  giant: { ring: { strokePx: number; glowPx: number }; halo: { radiusRatio: number; stops: Stop[] }; sphere: SpherePaint }
  rising: {
    ring: { strokePx: number; glowPx: number }
    sun: { belowDomeTopPx: number; radiusPx: number; stops: Stop[] }
    dome: { stops: Stop[] }
    sphere: SpherePaint
  }
}

type ColumnTokens = {
  insetPx: number
  logoWidthPx: number
  offsetsPx: { logo: number; eyebrow: number; question: number; answer: number }
  bodyBelowAnswerPx: { plain: number; withSelection: number }
  top: { defaultPx: number; byReference: Record<string, number> }
  answerOpticalInsetPx: number
  body: { emphasis: string; emphasisWeight: number; maxWidthOfWidth: number }
  closeOffsetsPx: { slogan: number; contact: number }
}

type AxisTokens = {
  topPx: number
  logoWidthPx: number
  offsetsPx: { logo: number; eyebrow: number; question: number; answer: number }
  bodyBelowAnswerPx: number
  urlBubbleTopPx: number
}

type ContactTokens = {
  social: string[]
  lines: string[]
  style: {
    rowGapPx: number
    type: { px: number; weight: number; lineHeight: number }
    socialRow: { urlBubbleHeightPx: number; gapPx: number; iconPx: number; iconGapRatio: number }
    item: { iconRatio: number; gapRatio: number }
    icon: { opacity: number }
    icons: Record<string, string>
  }
}

type ClientLogoBox = {
  placeholder: { border: { px: number }; radiusPx: number; label: { px: number; weight: number; lineHeight: number; tracking: string } }
}

type FrameType = { px?: number | [number, number]; weight?: number; lineHeight?: number | null; tracking?: string | null; color?: string | null }

type OrbitReserve = { form?: string; cxOfWidth: number; cyOfHeight: number; rOfHeight: number }

type ClientLogoReserve = { boxPx: [number, number]; cxOfWidth: number; cyOfHeight: number }

/** Las redes y las filas que la plantilla del cierre sabe pintar, en su orden. Si AXIS cambia el set, no hay plantilla. */
const TEMPLATE_SOCIAL = ['spotify', 'instagram', 'linkedin', 'threads', 'youtube', 'tiktok']
const TEMPLATE_CONTACT_LINES = ['email', 'phone', 'phone', 'address']
const TEMPLATE_CONTACT_ICONS: Record<string, string> = { email: 'letter', phone: 'phone-calling', address: 'map-point' }

const measured = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) {
    throw new SurfacePieceError(`AXIS no midió ${what}: la plantilla no lo inventa.`, 'invalid-intent')
  }

  return value
}

const token = <T>(recipe: Record<string, unknown>, key: string, what: string): T => measured(recipe[key] as T | undefined, what)

const cssVar = (name: string, value: number | string, unit = 'px'): string =>
  typeof value === 'number' ? `--gl-${name}=${Math.round(value * 100) / 100}${unit}` : `--gl-${name}=${value}`

const colorVar = (name: string, value: string | null | undefined): string => {
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new SurfacePieceError(`El manifest de AXIS no trae el color de «${name}».`, 'invalid-intent')
  }

  return `--gl-${name}-color=${value}`
}

const typeOf = (manifest: SurfaceManifest, voice: string): FrameType =>
  measured((manifest.type as Record<string, FrameType> | undefined)?.[voice], `la tipografía de «${voice}»`)

const fixedPx = (type: FrameType, what: string): number => {
  if (typeof type.px !== 'number') throw new SurfacePieceError(`AXIS no fijó el tamaño de ${what}.`, 'invalid-intent')

  return type.px
}

const accentOf = (line: string): string => {
  const lines = efeonceGraphicLine.lines as unknown as { key: string; accentOnDark: string }[]

  return measured(lines.find(entry => entry.key === line)?.accentOnDark, `el acento de la línea «${line}»`)
}

/* ── La voz ───────────────────────────────────────────────────────────────────────────────────────────────── */

/** Las custom properties de la tipografía de la voz: todo del manifest. */
const voiceVars = (manifest: SurfaceManifest, voices: ('eyebrow' | 'question' | 'answer')[]) => {
  const vars: Record<string, string> = {}

  if (voices.includes('eyebrow')) {
    const eyebrow = typeOf(manifest, 'eyebrow')

    vars.eyebrowPx = cssVar('eyebrow-px', fixedPx(eyebrow, 'el eyebrow'))
    vars.eyebrowWeight = cssVar('eyebrow-wght', measured(eyebrow.weight, 'el peso del eyebrow'), '')
    vars.eyebrowLeading = cssVar('eyebrow-leading', measured(eyebrow.lineHeight, 'el interlineado del eyebrow'), '')
    vars.eyebrowTracking = cssVar('eyebrow-tracking', measured(eyebrow.tracking, 'el tracking del eyebrow'))
    vars.eyebrowColor = colorVar('eyebrow', eyebrow.color)
  }

  if (voices.includes('question')) {
    const question = typeOf(manifest, 'question')

    vars.questionPx = cssVar('question-px', fixedPx(question, 'la pregunta'))
    vars.questionLeading = cssVar('question-leading', measured(question.lineHeight, 'el interlineado de la pregunta'), '')
    vars.questionColor = colorVar('question', question.color)
  }

  if (voices.includes('answer')) {
    const answer = typeOf(manifest, 'answer')

    vars.answerLeading = cssVar('answer-leading', measured(answer.lineHeight, 'el interlineado de la respuesta'), '')
    vars.answerTracking = cssVar('answer-tracking', measured(answer.tracking, 'el tracking de la respuesta'))
    vars.answerColor = colorVar('answer', answer.color)
  }

  return vars
}

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * La evidencia de la portada: texto del autor con UNA palabra en negrita. El autor la marca con `**palabra**` y parte
 * las líneas con saltos; si no marca ninguna, va en negrita la primera (`column.body.emphasis: 'first-word'`).
 */
export const evidenceHtml = (body: string, emphasis: string): string => {
  const text = escapeHtml(body.trim())
  const marked = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  if ((marked.match(/<strong>/g) ?? []).length > 1) {
    throw new SurfacePieceError('La evidencia lleva UNA sola palabra en negrita.', 'invalid-intent')
  }

  const withEmphasis = marked === text && emphasis === 'first-word' ? text.replace(/^(\S+)/, '<strong>$1</strong>') : marked

  return withEmphasis.replace(/\r?\n/g, '<br>')
}

/** Alto de la respuesta en la columna: sus líneas a su interlineado. */
const answerHeight = (manifest: SurfaceManifest, lines: number): number => {
  const answer = typeOf(manifest, 'answer')

  return Math.round(lines * fixedPx(answer, 'la respuesta') * measured(answer.lineHeight, 'el interlineado de la respuesta'))
}

/** El `top` de la columna: el del intent si viene, o el del token; siempre dentro del rango que reservó AXIS. */
const columnTop = (intent: SurfaceIntent, manifest: SurfaceManifest, column: ColumnTokens): number => {
  const asked = (intent.column as { topPx?: unknown } | undefined)?.topPx
  const top = asked === undefined ? column.top.defaultPx : Number(asked)
  const logo = reserve(manifest, 'logo')
  const range = logo?.fromTopRange ?? (typeof logo?.fromTop === 'number' ? [logo.fromTop, logo.fromTop] : null)

  if (!range) throw new SurfacePieceError('AXIS no reservó el logo de la columna.', 'invalid-intent')

  const [min, max] = [ofHeight(manifest, range[0]!), ofHeight(manifest, range[1]!)]

  if (!Number.isFinite(top) || top < min || top > max) {
    throw new SurfacePieceError(`\`column.topPx\` va entre ${min} y ${max} px (la reserva del logo); llegó ${String(asked)}.`, 'invalid-intent')
  }

  return top
}

/* ── Las órbitas de luz ───────────────────────────────────────────────────────────────────────────────────── */

const layerAsset = (id: string, svg: string): { ref: string; asset: SurfaceAssetRequest } => {
  const ref = `asset-ref:layer:${id}`

  return { ref, asset: { ref, kind: 'svg', svg } }
}

const n = (value: number): string => String(Math.round(value * 100) / 100)

const glowFilter = (id: string, stdDeviation: number): string =>
  `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n(stdDeviation)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`

const stops = (list: Stop[], color: string): string =>
  list.map(stop => `<stop offset="${n(stop.at)}" stop-color="${color}" stop-opacity="${n(stop.opacity)}"/>`).join('')

const sphereSvg = (x: number, y: number, sphere: SpherePaint, color: string, filter: string): string =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(sphere.radiusPx)}" fill="${color}" filter="url(#${filter})"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(sphere.core.radiusPx)}" fill="${sphere.core.color}"/>`

const svgOpen = (manifest: SurfaceManifest): string => {
  const { width, height } = manifest.canvas

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false">`
}

const orbitCircle = (manifest: SurfaceManifest, form: string) => {
  const orbit = reserve(manifest, 'orbit') as unknown as OrbitReserve | undefined

  if (!orbit || orbit.form !== form) throw new SurfacePieceError(`AXIS no reservó la órbita «${form}».`, 'invalid-intent')

  // El manifest entrega fracciones redondeadas: el px del master es el entero más cercano.
  return {
    cx: Math.round(orbit.cxOfWidth * manifest.canvas.width),
    cy: Math.round(orbit.cyOfHeight * manifest.canvas.height),
    r: Math.round(orbit.rOfHeight * manifest.canvas.height)
  }
}

/** La órbita gigante de luz: halo radial, anillo con brillo y la esfera con su núcleo claro. */
export const giantOrbitSvg = (manifest: SurfaceManifest, paint: OrbitPaint['giant'], color: string, id: string): string => {
  const { cx, cy, r } = orbitCircle(manifest, 'giant')
  const angle = (measured(paint.sphere.atDeg, 'el ángulo de la esfera') * Math.PI) / 180
  const halo = r * paint.halo.radiusRatio

  return (
    svgOpen(manifest) +
    `<defs>${glowFilter(`${id}-ring`, paint.ring.glowPx)}${glowFilter(`${id}-sphere`, paint.sphere.glowPx)}` +
    `<radialGradient id="${id}-halo" cx="${n(cx)}" cy="${n(cy)}" r="${n(halo)}" gradientUnits="userSpaceOnUse">${stops(paint.halo.stops, color)}</radialGradient></defs>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(halo)}" fill="url(#${id}-halo)"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${color}" stroke-width="${n(paint.ring.strokePx)}" filter="url(#${id}-ring)"/>` +
    sphereSvg(cx + r * Math.cos(angle), cy + r * Math.sin(angle), paint.sphere, color, `${id}-sphere`) +
    '</svg>'
  )
}

/** La órbita que sale como el sol: resplandor bajo la cima, domo que se enciende hacia su borde y la esfera en la cima. */
export const risingOrbitSvg = (manifest: SurfaceManifest, paint: OrbitPaint['rising'], color: string, id: string): string => {
  const { cx, cy, r } = orbitCircle(manifest, 'rising')
  const { width, height } = manifest.canvas
  const top = cy - r

  if (paint.sphere.at !== 'dome-top') throw new SurfacePieceError('La esfera del amanecer va en la cima del domo.', 'invalid-intent')

  return (
    svgOpen(manifest) +
    `<defs>${glowFilter(`${id}-ring`, paint.ring.glowPx)}${glowFilter(`${id}-sphere`, paint.sphere.glowPx)}` +
    `<radialGradient id="${id}-sun" cx="${n(cx)}" cy="${n(top + paint.sun.belowDomeTopPx)}" r="${n(paint.sun.radiusPx)}" gradientUnits="userSpaceOnUse">${stops(paint.sun.stops, color)}</radialGradient>` +
    `<radialGradient id="${id}-dome" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" gradientUnits="userSpaceOnUse">${stops(paint.dome.stops, color)}</radialGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#${id}-sun)"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#${id}-dome)"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${color}" stroke-width="${n(paint.ring.strokePx)}" filter="url(#${id}-ring)"/>` +
    sphereSvg(cx, top, paint.sphere, color, `${id}-sphere`) +
    '</svg>'
  )
}

/* ── Firma, logo del cliente, selección y contacto ────────────────────────────────────────────────────────── */

type Signature = { mode?: string; widthPx?: number; assetId?: string; urlBubble?: false | { assetId?: string; heightPx?: number } }

const FRAME_LOGO = 'efeonce-logo-negative'
const FRAME_BUBBLE = 'url-bubble-baked-dark'

/** La firma del marco: el logo oficial; la burbuja URL sólo cuando la receta la suma (el logo ya está en la pieza). */
const signatureOf = (manifest: SurfaceManifest, expectBubble: boolean): { logoWidth: number } => {
  const signature = measured(manifest.signature as Signature | undefined, 'la firma')

  if (signature.mode !== 'logo' || signature.assetId !== FRAME_LOGO) {
    throw new SurfacePieceError('El marco firma con el logo oficial de Efeonce.', 'invalid-intent')
  }

  const bubble = signature.urlBubble || null

  if (expectBubble !== Boolean(bubble)) {
    throw new SurfacePieceError(
      expectBubble ? 'La receta lleva la burbuja URL y AXIS no la resolvió.' : 'AXIS resolvió una burbuja URL que la plantilla no lleva.',
      'recipe-without-template'
    )
  }

  if (bubble && bubble.assetId !== FRAME_BUBBLE) {
    throw new SurfacePieceError(`La plantilla trae ${FRAME_BUBBLE} y AXIS pide «${String(bubble.assetId)}».`, 'recipe-without-template')
  }

  return { logoWidth: measured(signature.widthPx, 'el ancho del logo') }
}

/** La caja del logo del cliente y lo que va dentro: su archivo, o el marcador de la plantilla. */
const clientLogoSlots = (intent: SurfaceIntent, manifest: SurfaceManifest, recipe: Record<string, unknown>) => {
  const box = measured(reserve(manifest, 'clientLogo') as unknown as ClientLogoReserve | undefined, 'la caja del logo del cliente')
  const tokens = token<{ placeholder: string; box: ClientLogoBox }>(recipe, 'clientLogo', 'el logo del cliente')
  const [width, height] = box.boxPx
  const placeholder = tokens.box.placeholder

  const frame = {
    clientLeft: cssVar('client-left', Math.round(box.cxOfWidth * manifest.canvas.width - width / 2)),
    clientTop: cssVar('client-top', Math.round(box.cyOfHeight * manifest.canvas.height - height / 2)),
    clientWidth: cssVar('client-width', width),
    clientHeight: cssVar('client-height', height),
    clientBorder: cssVar('client-border', placeholder.border.px),
    clientRadius: cssVar('client-radius', placeholder.radiusPx),
    clientLabelPx: cssVar('client-label-px', placeholder.label.px),
    clientLabelWeight: cssVar('client-label-wght', placeholder.label.weight, ''),
    clientLabelLeading: cssVar('client-label-leading', placeholder.label.lineHeight, ''),
    clientLabelTracking: cssVar('client-label-tracking', placeholder.label.tracking)
  }

  const asked = intent.clientLogo as { path?: unknown; alt?: unknown } | undefined

  if (!asked) return { frame, slots: { clientPlaceholder: tokens.placeholder }, assets: [] as SurfaceAssetRequest[] }

  const file = String(asked.path ?? '').trim()
  const alt = String(asked.alt ?? '').trim()

  if (!file) throw new SurfacePieceError('`clientLogo.path` es el archivo del logo del cliente.', 'invalid-intent')
  if (!alt) throw new SurfacePieceError('`clientLogo.alt` nombra al cliente: el logo no puede ir sin texto alternativo.', 'invalid-intent')

  const ref = `asset-ref:file:${file.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')}`

  return { frame, slots: { clientLogo: { src: ref, alt } }, assets: [{ ref, kind: 'file', path: file } as SurfaceAssetRequest] }
}

/** La selección sobre el logo del cliente (colaborador, 8 manijas): todo del delegado de AXIS. */
const clientSelection = (manifest: SurfaceManifest): Record<string, unknown> | null => {
  const delegate = selectionDelegate(manifest)
  const cursor = delegate?.intent?.cursors?.find(c => c.kind === 'collaborator')

  if (!delegate || !cursor?.label) return null

  if (delegate.targetKind !== 'object') {
    throw new SurfacePieceError('En la portada de propuesta la selección toma el logo del cliente.', 'invalid-intent')
  }

  const slot: Record<string, unknown> = {
    label: String(cursor.label),
    anchor: String(cursor.anchor ?? 'top-end'),
    participantKind: String(cursor.participantKind ?? 'department'),
    targetKind: 'object'
  }

  if (typeof delegate.collaboratorScale === 'number') slot.scale = delegate.collaboratorScale

  for (const key of ['variant', 'padding', 'overlay'] as const) if (delegate[key]) slot[key] = String(delegate[key])

  return slot
}

/** ¿AXIS delegó el cursor propio del lector sobre la respuesta (corchetes abiertos)? Es el CTA del cierre. */
const hasLocalCursor = (manifest: SurfaceManifest): boolean => {
  const delegates = manifest.delegates as { selection?: { intent?: { cursors?: { kind?: string }[] } }[] } | undefined

  return Boolean(delegates?.selection?.some(d => d.intent?.cursors?.some(c => c.kind === 'local')))
}

/** El eslogan en sus tres tramos (`content.slogan.runs`). */
const sloganSlots = (manifest: SurfaceManifest) => {
  const slogan = (manifest.content as { slogan?: { runs?: { text: string; weight: number; italic: boolean; color: string }[] } } | undefined)?.slogan
  const runs = slogan?.runs ?? []

  if (runs.length !== 3) throw new SurfacePieceError(`El eslogan va en tres tramos; AXIS resolvió ${runs.length}.`, 'invalid-intent')

  return runs.map(run => {
    if (!/^#[0-9a-fA-F]{6}$/.test(run.color)) throw new SurfacePieceError('Un tramo del eslogan llegó sin color.', 'invalid-intent')

    return { text: run.text, style: `${run.weight} ${run.italic ? 'italic' : 'normal'} ${run.color}` }
  })
}

/** El bloque de contacto: el estilo es de AXIS; los datos, de Efeonce (`EFEONCE_CONTACT`). */
const contactSlots = (recipe: Record<string, unknown>, top: number) => {
  const contact = token<ContactTokens>(recipe, 'contact', 'el bloque de contacto')
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((value, i) => value === b[i])

  if (!same(contact.social, TEMPLATE_SOCIAL) || !same(contact.lines, TEMPLATE_CONTACT_LINES)) {
    throw new SurfacePieceError('AXIS cambió las redes o las filas del contacto y la plantilla pinta las anteriores.', 'recipe-without-template')
  }

  for (const [line, icon] of Object.entries(TEMPLATE_CONTACT_ICONS)) {
    if (contact.style.icons[line] !== icon) {
      throw new SurfacePieceError(`AXIS pide el ícono «${String(contact.style.icons[line])}» para ${line} y la plantilla trae «${icon}».`, 'recipe-without-template')
    }
  }

  if (EFEONCE_CONTACT.phones.length !== 2) throw new SurfacePieceError('El contacto del cierre lleva dos teléfonos.', 'invalid-intent')

  const style = contact.style

  return {
    frame: {
      contactTop: cssVar('contact-top', top),
      contactPx: cssVar('contact-px', style.type.px),
      contactWeight: cssVar('contact-wght', style.type.weight, ''),
      contactLeading: cssVar('contact-leading', style.type.lineHeight, ''),
      contactRowGap: cssVar('contact-row-gap', style.rowGapPx),
      contactBubbleHeight: cssVar('contact-bubble-height', style.socialRow.urlBubbleHeightPx),
      contactSocialGap: cssVar('contact-social-gap', style.socialRow.gapPx),
      contactSocialIcon: cssVar('contact-social-icon', style.socialRow.iconPx),
      contactSocialIconGap: cssVar('contact-social-icon-gap', Math.round(style.socialRow.iconPx * style.socialRow.iconGapRatio)),
      contactItemIcon: cssVar('contact-item-icon', Math.round(style.type.px * style.item.iconRatio)),
      contactItemGap: cssVar('contact-item-gap', Math.round(style.type.px * style.item.gapRatio)),
      contactIconOpacity: cssVar('contact-icon-opacity', style.icon.opacity, '')
    },
    contact: {
      email: EFEONCE_CONTACT.email,
      phoneFirst: EFEONCE_CONTACT.phones[0].display,
      phoneSecond: EFEONCE_CONTACT.phones[1].display,
      address: EFEONCE_CONTACT.addressDisplay
    }
  }
}

/* ── Portadas ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** La columna de voz de una portada: logo, eyebrow, pregunta, respuesta y evidencia, colgados de `top`. */
const coverColumn = (intent: SurfaceIntent, manifest: SurfaceManifest, recipe: Record<string, unknown>) => {
  const column = token<ColumnTokens>(recipe, 'column', 'la columna de voz')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (!voice.eyebrow) throw new SurfacePieceError('La portada lleva la voz completa: falta el eyebrow.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La portada lleva la evidencia (`body`).', 'invalid-intent')

  const top = columnTop(intent, manifest, column)
  const answerTop = top + column.offsetsPx.answer
  const body = typeOf(manifest, 'body')

  return {
    frame: {
      margin: column.insetPx,
      logoLeft: cssVar('logo-left', column.insetPx),
      logoTop: cssVar('logo-top', top + column.offsetsPx.logo),
      eyebrowTop: top + column.offsetsPx.eyebrow,
      questionTop: top + column.offsetsPx.question,
      answerTop,
      answerPx: fixedPx(typeOf(manifest, 'answer'), 'la respuesta'),
      answerInset: cssVar('answer-inset', column.answerOpticalInsetPx),
      bodyTop: answerTop + answerHeight(manifest, content.answer.length) + column.bodyBelowAnswerPx.plain,
      bodyPx: fixedPx(body, 'la evidencia'),
      bodyWidth: Math.round(column.body.maxWidthOfWidth * manifest.canvas.width),
      bodyLeading: cssVar('body-leading', measured(body.lineHeight, 'el interlineado de la evidencia'), ''),
      bodyWeight: cssVar('body-wght', measured(body.weight, 'el peso de la evidencia'), ''),
      bodyStrongWeight: cssVar('body-strong-wght', column.body.emphasisWeight, ''),
      bodyColor: colorVar('body', body.color),
      ...voiceVars(manifest, ['eyebrow', 'question', 'answer'])
    },
    voice,
    evidence: evidenceHtml(content.body, column.body.emphasis)
  }
}

/**
 * `cover-brochure`: foto de cine a sangre con el sujeto a la derecha y la columna de voz a la izquierda. Composiciones
 * `document` (el brochure general) y `line` (una por línea de servicio, con el acento de SU línea). Sin cliente, sin
 * eslogan, sin selección y sin burbuja URL: firma el logo.
 */
export const coverBrochure: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const column = coverColumn(intent, manifest, recipe)
  const { logoWidth } = signatureOf(manifest, false)
  const photo = plateAsset(manifest, manifest.canvas)

  return {
    slots: {
      frame: { line: intent.line, ...column.frame, logoWidth: cssVar('logo-width', logoWidth) },
      backdrop: { src: photo.ref, alt: photo.alt },
      voice: column.voice,
      evidence: column.evidence
    },
    assets: [photo.asset]
  }
}

/**
 * `cover-proposal`: portada de propuesta comercial SIN foto, con el logo del cliente. `orbit`: la órbita gigante de luz
 * sostiene la caja del cliente y la voz va en la columna. `dawn`: la órbita sale como el sol y todo va en un eje central.
 */
export const coverProposal: RecipeBuilder = ctx => {
  const layout = ctx.manifest.layout ?? 'orbit'

  if (layout === 'orbit') return coverProposalOrbit(ctx)
  if (layout === 'dawn') return coverProposalDawn(ctx)

  throw new SurfacePieceError(`\`cover-proposal\` no tiene plantilla para la composición «${layout}».`, 'recipe-without-template')
}

const coverProposalOrbit: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const column = coverColumn(intent, manifest, recipe)
  const { logoWidth } = signatureOf(manifest, true)
  const paint = token<OrbitPaint>(recipe, 'orbitPaint', 'la pintura de la órbita')
  const layer = layerAsset(`cover-proposal-orbit-${intent.line}`, giantOrbitSvg(manifest, paint.giant, accentOf(intent.line), 'gl-go'))
  const client = clientLogoSlots(intent, manifest, recipe)
  const selection = clientSelection(manifest)

  return {
    slots: {
      frame: { line: intent.line, ...column.frame, logoWidth: cssVar('logo-width', logoWidth), ...client.frame },
      backdrop: { src: layer.ref, alt: '' },
      voice: column.voice,
      evidence: column.evidence,
      ...client.slots,
      ...(selection ? { selection } : {})
    },
    assets: [layer.asset, ...client.assets]
  }
}

const coverProposalDawn: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const axis = token<AxisTokens>(recipe, 'axis', 'el eje central del amanecer')
  const column = token<ColumnTokens>(recipe, 'column', 'la columna de voz')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (!voice.eyebrow) throw new SurfacePieceError('La portada lleva la voz completa: falta el eyebrow.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La portada lleva la evidencia (`body`).', 'invalid-intent')

  const { logoWidth } = signatureOf(manifest, true)
  const bubbleHeight = measured((manifest.signature as { urlBubble?: { heightPx?: number } }).urlBubble?.heightPx, 'el alto de la burbuja URL')

  if (logoWidth !== axis.logoWidthPx) throw new SurfacePieceError('El logo del amanecer no mide lo que declara su eje.', 'invalid-intent')

  const paint = token<OrbitPaint>(recipe, 'orbitPaint', 'la pintura de la órbita')
  const layer = layerAsset(`cover-proposal-dawn-${intent.line}`, risingOrbitSvg(manifest, paint.rising, accentOf(intent.line), 'gl-ro'))
  const client = clientLogoSlots(intent, manifest, recipe)
  const selection = clientSelection(manifest)
  const answerTop = axis.topPx + axis.offsetsPx.answer
  const body = typeOf(manifest, 'body')

  return {
    contentType: 'deck.cover-proposal.dawn',
    slots: {
      frame: {
        line: intent.line,
        margin: column.insetPx,
        logoTop: cssVar('logo-top', axis.topPx + axis.offsetsPx.logo),
        logoWidth: cssVar('logo-width', logoWidth),
        eyebrowTop: axis.topPx + axis.offsetsPx.eyebrow,
        questionTop: axis.topPx + axis.offsetsPx.question,
        answerTop,
        answerPx: fixedPx(typeOf(manifest, 'answer'), 'la respuesta'),
        bodyTop: answerTop + answerHeight(manifest, content.answer.length) + axis.bodyBelowAnswerPx,
        bodyPx: fixedPx(body, 'la evidencia'),
        bodyLeading: cssVar('body-leading', measured(body.lineHeight, 'el interlineado de la evidencia'), ''),
        bodyWeight: cssVar('body-wght', measured(body.weight, 'el peso de la evidencia'), ''),
        bodyStrongWeight: cssVar('body-strong-wght', column.body.emphasisWeight, ''),
        bodyColor: colorVar('body', body.color),
        bubbleTop: cssVar('bubble-top', axis.urlBubbleTopPx),
        bubbleHeight: cssVar('bubble-height', bubbleHeight),
        ...voiceVars(manifest, ['eyebrow', 'question', 'answer']),
        ...client.frame
      },
      backdrop: { src: layer.ref, alt: '' },
      voice,
      evidence: evidenceHtml(content.body, column.body.emphasis),
      ...client.slots,
      ...(selection ? { selection } : {})
    },
    assets: [layer.asset, ...client.assets]
  }
}

/* ── Contraportadas ───────────────────────────────────────────────────────────────────────────────────────── */

const closeLogo = (manifest: SurfaceManifest) => {
  const { logoWidth } = signatureOf(manifest, true)
  const at = reserve(manifest, 'logo') as { inset?: number; fromTop?: number } | undefined
  const top = ofHeight(manifest, measured(at?.fromTop, 'la altura del logo'))
  const inset = Math.round(measured(at?.inset, 'la sangría del logo') * manifest.canvas.width)

  return {
    top,
    frame: {
      margin: inset,
      logoLeft: cssVar('logo-left', inset),
      logoTop: cssVar('logo-top', top),
      logoWidth: cssVar('logo-width', logoWidth)
    }
  }
}

const sloganVars = (manifest: SurfaceManifest, top: number) => {
  const slogan = typeOf(manifest, 'slogan')

  return {
    sloganTop: cssVar('slogan-top', top),
    sloganPx: cssVar('slogan-px', fixedPx(slogan, 'el eslogan')),
    sloganLeading: cssVar('slogan-leading', measured(slogan.lineHeight, 'el interlineado del eslogan'), '')
  }
}

/**
 * `close-brochure`: «¿Conversamos? Cuando quieras.» con el eslogan como firma debajo, la burbuja URL con las redes y el
 * contacto completo. `orbit` (sin foto: la órbita gigante, corchetes abiertos y el cursor del lector sobre la
 * respuesta) y `photo` (Nexa camina hacia la órbita).
 */
export const closeBrochure: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const layout = manifest.layout ?? 'orbit'

  if (layout !== 'orbit' && layout !== 'photo') {
    throw new SurfacePieceError(`\`close-brochure\` no tiene plantilla para la composición «${layout}».`, 'recipe-without-template')
  }

  const column = token<ColumnTokens>(recipe, 'column', 'la columna de voz')
  const logo = closeLogo(manifest)
  const voice = voiceSlots(manifest)
  const contact = contactSlots(recipe, logo.top + column.closeOffsetsPx.contact)
  const assets: SurfaceAssetRequest[] = []
  let backdrop: { src: string; alt: string }

  if (layout === 'orbit') {
    const paint = token<OrbitPaint>(recipe, 'orbitPaint', 'la pintura de la órbita')
    const layer = layerAsset(`close-brochure-orbit-${intent.line}`, giantOrbitSvg(manifest, paint.giant, accentOf(intent.line), 'gl-go'))

    assets.push(layer.asset)
    backdrop = { src: layer.ref, alt: '' }
  } else {
    const photo = plateAsset(manifest, manifest.canvas)

    assets.push(photo.asset)
    backdrop = { src: photo.ref, alt: photo.alt }
  }

  return {
    contentType: layout === 'orbit' ? 'deck.close-brochure' : 'deck.close-brochure.photo',
    slots: {
      frame: {
        line: intent.line,
        ...logo.frame,
        questionTop: ofHeight(manifest, measured(reserve(manifest, 'question')?.fromTop, 'la altura de la pregunta')),
        answerTop: ofHeight(manifest, measured(reserve(manifest, 'answer')?.fromTop, 'la altura de la respuesta')),
        answerPx: fixedPx(typeOf(manifest, 'answer'), 'la respuesta'),
        answerInset: cssVar('answer-inset', column.answerOpticalInsetPx),
        ...voiceVars(manifest, ['question', 'answer']),
        ...sloganVars(manifest, logo.top + column.closeOffsetsPx.slogan),
        ...contact.frame
      },
      backdrop,
      voice,
      slogan: sloganSlots(manifest),
      contact: contact.contact,
      ...(hasLocalCursor(manifest) ? { cta: { target: 'answer' } } : {})
    },
    assets
  }
}

/**
 * `close-proposal`: contraportada de propuesta con foto. El eslogan ES el mensaje (la propuesta llega después de
 * conversar: no lleva voz), con el logo arriba y el contacto debajo.
 */
export const closeProposal: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const logo = closeLogo(manifest)
  const photo = plateAsset(manifest, manifest.canvas)
  const contact = contactSlots(recipe, ofHeight(manifest, measured(reserve(manifest, 'contact')?.fromTop, 'la altura del contacto')))

  if (contentOf(manifest).answer.length > 0) {
    throw new SurfacePieceError('La contraportada de propuesta no lleva voz: su mensaje es el eslogan.', 'invalid-intent')
  }

  return {
    slots: {
      frame: {
        line: intent.line,
        ...logo.frame,
        ...sloganVars(manifest, ofHeight(manifest, measured(reserve(manifest, 'slogan')?.fromTop, 'la altura del eslogan'))),
        ...contact.frame
      },
      backdrop: { src: photo.ref, alt: photo.alt },
      slogan: sloganSlots(manifest),
      contact: contact.contact
    },
    assets: [photo.asset]
  }
}

export const FRAME_BUILDERS: Record<string, RecipeBuilder> = {
  'cover-brochure': coverBrochure,
  'cover-proposal': coverProposal,
  'close-brochure': closeBrochure,
  'close-proposal': closeProposal
}

