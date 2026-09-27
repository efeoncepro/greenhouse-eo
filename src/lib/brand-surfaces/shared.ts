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
  theme?: string
  voice?: { eyebrow?: string; question?: string; answer?: string[] }
  body?: string
  proof?: { text: string; source: string }
  steps?: { glyph: string; kicker: string; name: string }[]
  photo?: { register?: string; subject?: string; plateRef?: string; alt?: string }
  selection?: { target?: string; label?: string; participantKind?: string; anchor?: string }
  [key: string]: unknown
}

export type SurfaceManifest = Record<string, unknown> & {
  canvas: { width: number; height: number }
  safeArea?: { marginPx?: number }
  reserves?: { band: string; fromTop?: number; fromTopRange?: [number, number]; share?: number }[]
  type?: Record<string, { px?: number | [number, number]; maxWidthPx?: number | [number, number] }>
  content?: Record<string, unknown>
  selection?: Record<string, unknown> | null
}

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

/** Los slots de la voz: eyebrow, pregunta y respuesta (la última línea lleva la esfera). */
export const voiceSlots = (intent: SurfaceIntent): Record<string, string> => {
  const answer = intent.voice?.answer ?? []

  if (!intent.voice?.question || answer.length === 0) {
    throw new SurfacePieceError('La receta lleva voz y el intent no trae pregunta y respuesta.', 'invalid-intent')
  }

  const slots: Record<string, string> = {
    question: intent.voice.question,
    answer: answer[answer.length - 1]!
  }

  if (intent.voice.eyebrow) slots.eyebrow = intent.voice.eyebrow
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

/** La foto de la pieza: un plate aprobado, recortado al lienzo por quien compone. */
export const plateAsset = (
  intent: SurfaceIntent,
  fit: { width: number; height: number }
): { ref: string; alt: string; asset: SurfaceAssetRequest } => {
  const plateRef = intent.photo?.plateRef
  const alt = intent.photo?.alt?.trim()

  if (!plateRef) throw new SurfacePieceError('La receta lleva foto y el intent no trae `photo.plateRef`.', 'missing-photo')
  if (!alt) throw new SurfacePieceError('La foto necesita `photo.alt`: describe la escena, no el copy.', 'missing-photo')

  const id = plateRef.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')
  const ref = `asset-ref:plate:${id}`

  return { ref, alt, asset: { ref, kind: 'plate', path: plateRef, fit } }
}

/**
 * La selección colaborativa que resolvió AXIS (`delegates.selection[0]`: el intent listo para
 * `efeonce.collaboration-selection`), en el shape del slot `selection`. Sin delegado, no hay selección.
 */
export const selectionSlot = (manifest: SurfaceManifest): Record<string, unknown> | null => {
  const delegates = manifest.delegates as { selection?: Record<string, unknown>[] } | undefined
  const delegate = delegates?.selection?.[0]

  if (!delegate) return null

  const intent = delegate.intent as { cursors?: Record<string, unknown>[] } | undefined
  const cursor = intent?.cursors?.[0]

  if (!cursor?.label) return null

  return {
    label: String(cursor.label),
    anchor: String(cursor.anchor ?? 'top-end'),
    participantKind: String(cursor.participantKind ?? 'department'),
    scale: Number(delegate.collaboratorScale ?? 1.2)
  }
}
