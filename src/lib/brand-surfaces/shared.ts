/**
 * Piezas compartidas por los builders de receta: la voz, los íconos y la foto.
 *
 * Todas las medidas salen del manifest de AXIS o de los tokens de la receta (`efeonceGraphicLine.surfaces`).
 * Cuando una receta da un RANGO (tamaño de la respuesta, altura de la bajada), el builder elige dentro del
 * rango con una regla escrita aquí y probada contra las láminas aprobadas, nunca un número suelto.
 */

import { resolveIcon } from '@efeoncepro/axis-graphic-line'

import type { SurfaceAssetRequest } from './types'
import { SurfacePieceError } from './types'

export interface SurfaceIntent {
  contract: string
  version: string
  surface: string
  format: string
  role: string
  recipe: string
  line: string
  /** Para qué documento es la lámina (`efeonce.surface-composition` 0.1.2). Sin él, AXIS resuelve el uso de la receta. */
  use?: 'proposal' | 'brochure'
  /** Composición de la receta cuando declara varias. Siempre explícita: AXIS nunca la infiere de los campos presentes. */
  layout?: string
  /** Las líneas que muestra el layout `lines` de `proposal-cinematic` (hasta cinco, sin repetir). */
  lines?: string[]
  progress?: { sections?: number; current?: number }
  theme?: string
  voice?: { eyebrow?: string; question?: string; answer?: string[] }
  body?: string
  proof?: { text: string; source: string }
  /** Con ícono (`glyph`, la propuesta cine) o como tarjeta sin ícono con `desc` (la propuesta sobria, TASK-1928). */
  steps?: { glyph?: string; kicker: string; name: string; desc?: string }[]
  photo?: { register?: string; subject?: string; plateRef?: string; alt?: string; native?: string; focus?: SurfaceFocus }
  selection?: { target?: string; label?: string; participantKind?: string; anchor?: string; level?: number; box?: Record<string, number> }
  [key: string]: unknown
}

/** Dónde está el sujeto de una toma, en fracciones del ARCHIVO (`efeonce.surface-composition` 0.1.1). */
export interface SurfaceFocus {
  xOfWidth?: number
  yOfHeight?: number
}

/**
 * El contenido que AXIS validó y resolvió (`manifest.content`, contrato 0.1.1). Los builders leen de aquí, nunca del
 * intent crudo: lo que llega es lo que el contrato aceptó (recortado, en el orden del timeline, con sus tiempos).
 */
export interface SurfaceContent {
  eyebrow: string | null
  question: string | null
  answer: string[]
  body: string | null
  proof: { text: string; source: string | null } | null
  measure: { value: number; source: string; label?: string } | null
  progress: { sections: number; current: number } | null
  cta: { label?: string; descriptor?: string } | null
  levels: { level: number; name: string; descriptor: string | null }[] | null
  note: string | null
  panels:
    | { index: number; plateRef: string; alt: string; focus: SurfaceFocus | null; word: string | null }[]
    | null
  figures: { value: string; label: string; source: string }[] | null
  nav: { links: string[]; action: string } | null
  title: string | null
  frames: { segment: string; title: string; caption: string; fromMs: number | null; toMs: number | null }[] | null
  chapter: { title: string; label: string | null; current: number | null; sections: number | null } | null
  shots:
    | {
        segment: string
        fromMs: number
        toMs: number
        lensMm: number | null
        close: string | null
        title: string
        spec: string
        note: string
        plateRef: string
        alt: string
      }[]
    | null
  subtitles: { lines: string[]; maxLines: number | null } | null
}

/** La tarjeta de la foto que AXIS delegó (`delegates.photo`): el plate, su alt, la proporción y el foco. */
export interface SurfacePhotoDelegate {
  plateRef: string | null
  alt: string | null
  native: string | null
  focus: SurfaceFocus | null
  [key: string]: unknown
}

export type SurfaceManifest = Record<string, unknown> & {
  canvas: { width: number; height: number }
  safeArea?: { marginPx?: number }
  reserves?: { band: string; fromTop?: number; fromTopRange?: [number, number]; share?: number; inset?: number }[]
  type?: Record<string, { px?: number | [number, number]; maxWidthPx?: number | [number, number] }>
  content?: Partial<SurfaceContent>
  selection?: Record<string, unknown> | null
  /** El uso que resolvió AXIS (`null` fuera del deck) y la composición de la receta (`null` si no declara varias). */
  use?: 'proposal' | 'brochure' | null
  layout?: string | null
}

/** El contenido resuelto por AXIS. Sin él, el manifest no es de un contrato que el builder sepa leer. */
export const contentOf = (manifest: SurfaceManifest): SurfaceContent => {
  const content = manifest.content

  if (!content) throw new SurfacePieceError('El manifest de AXIS no trae `content`.', 'surface-issues')

  return { answer: [], ...content } as SurfaceContent
}

/** La foto que AXIS delegó, o `null` si la receta y el intent no llevan foto. */
export const photoOf = (manifest: SurfaceManifest): SurfacePhotoDelegate | null =>
  ((manifest.delegates as { photo?: SurfacePhotoDelegate | null } | undefined)?.photo ?? null)

export const lower = (value: number | [number, number] | undefined, fallback: number): number =>
  Array.isArray(value) ? value[0] : (value ?? fallback)

export const upper = (value: number | [number, number] | undefined, fallback: number): number =>
  Array.isArray(value) ? value[1] : (value ?? fallback)

export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n))

export const reserve = (manifest: SurfaceManifest, band: string) => manifest.reserves?.find(r => r.band === band)

/** Una fracción del alto del lienzo, en px enteros. */
export const ofHeight = (manifest: SurfaceManifest, fraction: number): number => Math.round(fraction * manifest.canvas.height)

/**
 * Tamaño de la respuesta dentro del rango de la receta: el mayor que cabe en la reserva de texto.
 * La respuesta ocupa ~0,52 em por carácter en Bricolage 760 con el tracking de la receta; calibrado sobre
 * las láminas aprobadas («En todas» → 174, «Para todos» → 140, contra 168 y 140 aprobados).
 */
export const answerPxWithinRange = (text: string, range: [number, number], budgetPx: number): number => {
  const chars = Math.max(1, text.trim().length)

  return Math.round(clamp(budgetPx / (chars * 0.52), range[0], range[1]))
}

/** Los slots de la voz (del contenido que resolvió AXIS): eyebrow, pregunta y respuesta (la última línea lleva la esfera). */
export const voiceSlots = (manifest: SurfaceManifest): Record<string, string> => {
  const { eyebrow, question, answer } = contentOf(manifest)

  if (!question || answer.length === 0) {
    throw new SurfacePieceError('La receta lleva voz y el intent no trae pregunta y respuesta.', 'invalid-intent')
  }

  const slots: Record<string, string> = {
    question,
    answer: answer[answer.length - 1]!
  }

  if (eyebrow) slots.eyebrow = eyebrow
  if (answer.length > 1) slots.answerLead = answer.slice(0, -1).join(' ')

  return slots
}

/**
 * El ícono de un paso, resuelto por AXIS (`resolveIcon`) en la voz que corresponde a la línea
 * (Brand = Plastilina, el resto Trazo) y en reposo. Se entrega como SVG para que el composer lo
 * incruste como asset externo; el catálogo nunca dibuja un ícono.
 */
export const iconAsset = (
  glyph: string,
  line: string,
  size: number,
  label: string,
  surface: 'dark' | 'light' = 'dark'
): { ref: string; asset: SurfaceAssetRequest } => {
  const icon = resolveIcon({ glyph, size, line, surface, state: 'rest', label, idPrefix: `gl-${glyph}-${line}` } as never) as {
    svg: string
  }

  const ref = `asset-ref:icon:${glyph}-${line}-${surface}-${size}`

  return { ref, asset: { ref, kind: 'svg', svg: icon.svg } }
}

/**
 * Un plate aprobado como asset externo, recortado al lienzo por quien compone. La fuente es la foto que AXIS delegó
 * (`photoOf`) o un panel/plano de `manifest.content`; `crop` distingue dos recortes del mismo archivo.
 */
export const plateFrom = (
  source: { plateRef?: string | null; alt?: string | null } | null | undefined,
  fit: { width: number; height: number },
  what = 'La foto',
  crop?: string
): { ref: string; alt: string; asset: SurfaceAssetRequest } => {
  const plateRef = source?.plateRef?.trim()
  const alt = source?.alt?.trim()

  if (!plateRef) throw new SurfacePieceError(`${what}: la receta lleva foto y no llegó su \`plateRef\`.`, 'missing-photo')
  if (!alt) throw new SurfacePieceError(`${what} necesita \`alt\`: describe la escena, no el copy.`, 'missing-photo')

  const id = plateRef.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')
  const size = { width: Math.round(fit.width), height: Math.round(fit.height) }
  const ref = crop ? `asset-ref:plate:${id}-${crop}-${size.width}x${size.height}` : `asset-ref:plate:${id}`

  return { ref, alt, asset: { ref, kind: 'plate', path: plateRef, fit: crop ? size : fit } }
}

/** La foto de la pieza (la que AXIS delegó), recortada al lienzo por quien compone. */
export const plateAsset = (
  manifest: SurfaceManifest,
  fit: { width: number; height: number }
): { ref: string; alt: string; asset: SurfaceAssetRequest } => plateFrom(photoOf(manifest), fit)

type SelectionDelegate = {
  intent?: { cursors?: Record<string, unknown>[] } & Record<string, unknown>
  collaboratorScale?: number | null
  targetKind?: string
  variant?: string
  padding?: string
  overlay?: string
  level?: number
  box?: { left: number; top: number; right: number; bottom: number; px: { x: number; y: number; width: number; height: number } }
}

/** El delegado de selección del COLABORADOR (el del CTA lleva un cursor local y lo pinta el hook del CTA). */
export const selectionDelegate = (manifest: SurfaceManifest): SelectionDelegate | null => {
  const delegates = manifest.delegates as { selection?: SelectionDelegate[] } | undefined

  return delegates?.selection?.find(d => d.intent?.cursors?.some(c => c.kind === 'collaborator')) ?? null
}

/**
 * La selección colaborativa que resolvió AXIS (`delegates.selection`: el intent listo para
 * `efeonce.collaboration-selection`), en el shape del slot `selection`. Sin delegado, no hay selección.
 *
 * Todo sale del delegado: etiqueta, ancla, tipo de participante, escala del cursor y, cuando el objetivo no es texto
 * (un objeto, un grupo, un nivel), el tipo de objetivo con la variante, el aire y el velo que AXIS resolvió para la
 * receta. Sobre texto, el painter usa los de la selección de texto (los mismos que AXIS declara).
 */
export const selectionSlot = (manifest: SurfaceManifest): Record<string, unknown> | null => {
  const delegate = selectionDelegate(manifest)
  const cursor = delegate?.intent?.cursors?.find(c => c.kind === 'collaborator')

  if (!delegate || !cursor?.label) return null

  if (typeof delegate.collaboratorScale !== 'number') {
    throw new SurfacePieceError('AXIS delegó la selección sin la escala del cursor del colaborador.', 'surface-issues')
  }

  const slot: Record<string, unknown> = {
    label: String(cursor.label),
    anchor: String(cursor.anchor ?? 'top-end'),
    participantKind: String(cursor.participantKind ?? 'department'),
    scale: delegate.collaboratorScale
  }

  const targetKind = delegate.targetKind ?? String(delegate.intent?.targetKind ?? 'text')

  if (targetKind !== 'text') {
    slot.targetKind = targetKind

    for (const key of ['variant', 'padding', 'overlay'] as const) {
      if (delegate[key]) slot[key] = String(delegate[key])
    }
  }

  if (typeof delegate.level === 'number') slot.level = delegate.level

  return slot
}
