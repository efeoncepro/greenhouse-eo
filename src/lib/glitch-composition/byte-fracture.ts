/**
 * La falla en bytes de Glitch, como geometría PURA (TASK-1923). Sin DOM, sin Chromium, sin azar vivo: la misma foto
 * da la misma lista de celdas en cualquier proceso, y el taller de motion (TASK-1924) usa la misma función para
 * animarla. La página sólo pinta lo que esta función devuelve.
 *
 * Modelo (medido en las láminas aprobadas del canvas «Glitch en La órbita»): la foto «se desarma» por su borde en una
 * cuadrícula de celdas de 27 px con paso de 30 px; hay hasta cinco filas que se alejan del borde, cada una más
 * transparente (1 → 0,48) y con menos celdas. El color de cada celda es el del borde de la foto en esa columna, que se
 * funde hacia el fondo en cada fila. Nunca sobre un rostro: si el borde elegido toca una región de rostro, falla.
 */

import { GlitchPieceError } from './types'

export type FractureEdge = 'bottom' | 'top' | 'left' | 'right'

/**
 * Perfiles de la falla, medidos pieza por pieza en el canvas «Glitch en La órbita». El perfil lo fija la PLANTILLA
 * (nunca el autor): el carrusel usa `band`; el borde lateral del banner A del blog y de la miniatura del vlog, `side`; la
 * foto del host en la portada del reel se desarma HACIA ADENTRO (`host`); las tarjetas del banner C del blog, `card`.
 */
export interface FractureProfile {
  cell: number
  pitch: number
  /** Distancia entre filas que se alejan del borde. */
  step: number
  /** Desvío máximo de cada celda dentro de su fila. */
  jitter: number
  opacity: readonly number[]
  /** Probabilidad de que haya celda en cada fila. */
  presence: readonly number[]
  /** Cuánto se funde el color hacia el fondo en cada fila (0 = color del borde). */
  fade: readonly number[]
  /**
   * Las celdas caen dentro de la foto (el fondo se come el borde) en vez de salir de ella; por eso su `fade` va casi
   * al fondo: son huecos, no pedazos de la foto.
   */
  inward?: boolean
}

export const FRACTURE_PROFILES = {
  band: { cell: 27, pitch: 30, step: 34.5, jitter: 12, opacity: [1, 0.87, 0.74, 0.61, 0.48], presence: [0.95, 0.62, 0.58, 0.42, 0.24], fade: [0, 0.08, 0.16, 0.28, 0.4] },
  side: { cell: 23, pitch: 26, step: 30, jitter: 9, opacity: [1, 0.85, 0.7], presence: [0.92, 0.45, 0.2], fade: [0, 0.08, 0.16] },
  host: { cell: 31, pitch: 34, step: 38, jitter: 7, opacity: [1, 0.8, 0.6], presence: [0.72, 0.42, 0.2], fade: [0.85, 0.8, 0.75], inward: true },
  card: { cell: 15, pitch: 18, step: 22.5, jitter: 6, opacity: [1, 0.85, 0.7, 0.55, 0.4, 0.25], presence: [0.95, 0.78, 0.55, 0.32, 0.15, 0.05], fade: [0, 0.08, 0.16, 0.28, 0.4, 0.5] }
} as const satisfies Record<string, FractureProfile>

export type FractureProfileName = keyof typeof FRACTURE_PROFILES

/** Caja en px del lienzo. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface ByteFractureInput {
  /** Semilla: SHA-256 (hex) de los bytes de la foto PROCESADA. */
  seed: string
  /** Caja de la foto en el lienzo. */
  photo: Box
  edge: FractureEdge
  /** Lienzo: ninguna celda sale de él. */
  canvas: { width: number; height: number }
  /** Recorte opcional (la tarjeta del mosaico): ninguna celda sale de esta caja. */
  clip?: Box
  /** Regiones de rostro normalizadas a la foto (0–1). `[]` = sin rostros. */
  faceRegions: readonly { x: number; y: number; w: number; h: number }[]
  /** Perfil medido de la pieza (por defecto `band`, el del carrusel). */
  profile?: FractureProfileName
}

export interface ByteCell {
  x: number
  y: number
  size: number
  /** Fila desde el borde (0 = la más cercana). */
  row: number
  opacity: number
  /** Índice de la muestra de color a lo largo del borde (columna o fila de la foto). */
  sample: number
  /** Cuánto se funde hacia el fondo (del perfil). */
  fade: number
}

export interface ByteFracture {
  edge: FractureEdge
  cell: number
  pitch: number
  /** Cuántas muestras de color espera (una por posición a lo largo del borde). */
  samples: number
  cells: ByteCell[]
}

/** Cuánto se funde el color hacia el fondo en cada fila del carrusel (0 = color del borde). */
export const ROW_FADE = FRACTURE_PROFILES.band.fade

/** PRNG determinista (mulberry32) sembrado con los primeros 32 bits de un hex. */
const rng = (seedHex: string) => {
  let a = Number.parseInt(seedHex.slice(0, 8) || '0', 16) >>> 0

  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const round1 = (n: number) => Math.round(n * 10) / 10

/** La franja del borde de la foto que «se rompe»: si toca un rostro, la falla no se compone. */
export const fractureBand = (photo: Box, edge: FractureEdge, cell: number): Box => {
  const depth = cell * 2

  if (edge === 'bottom') return { x: photo.x, y: photo.y + photo.h - depth, w: photo.w, h: depth }
  if (edge === 'top') return { x: photo.x, y: photo.y, w: photo.w, h: depth }
  if (edge === 'left') return { x: photo.x, y: photo.y, w: depth, h: photo.h }

  return { x: photo.x + photo.w - depth, y: photo.y, w: depth, h: photo.h }
}

export const computeByteFracture = (input: ByteFractureInput): ByteFracture => {
  const profile: FractureProfile = FRACTURE_PROFILES[input.profile ?? 'band']
  const { cell, pitch } = profile
  const { photo, edge, canvas } = input
  const faces: Box[] = input.faceRegions.map((f) => ({ x: photo.x + f.x * photo.w, y: photo.y + f.y * photo.h, w: f.w * photo.w, h: f.h * photo.h }))
  const band = fractureBand(photo, edge, cell)

  if (faces.some((face) => overlaps(face, band))) {
    throw new GlitchPieceError('La falla en bytes caería sobre un rostro: elige otro borde (fractureEdge) o declara bien las regiones.', 'fracture-over-face', [
      { code: 'fracture-over-face', message: 'La franja del borde de la foto intersecta una región de rostro declarada.' }
    ])
  }

  const random = rng(input.seed)
  const horizontal = edge === 'bottom' || edge === 'top'
  const along = horizontal ? photo.w : photo.h
  const count = Math.floor((along - cell) / pitch) + 1
  const clip = input.clip ?? { x: 0, y: 0, w: canvas.width, h: canvas.height }
  const cells: ByteCell[] = []

  /** Posición de la celda a `offset` px del borde, hacia afuera (o hacia adentro con `inward`). */
  const place = (i: number, offset: number): Box => {
    const a = (horizontal ? photo.x : photo.y) + 1 + i * pitch
    const inward = profile.inward === true

    switch (edge) {
      case 'bottom':
        return { x: a, y: round1(inward ? photo.y + photo.h - cell - offset : photo.y + photo.h + offset), w: cell, h: cell }
      case 'top':
        return { x: a, y: round1(inward ? photo.y + offset : photo.y - cell - offset), w: cell, h: cell }
      case 'left':
        return { x: round1(inward ? photo.x + offset : photo.x - cell - offset), y: a, w: cell, h: cell }
      default:
        return { x: round1(inward ? photo.x + photo.w - cell - offset : photo.x + photo.w + offset), y: a, w: cell, h: cell }
    }
  }

  for (let i = 0; i < count; i++) {
    for (let row = 0; row < profile.opacity.length; row++) {
      // Se consumen siempre los dos números (presencia y desvío) para que la secuencia no dependa de los saltos.
      const present = random() < profile.presence[row]
      const jitter = random() * profile.jitter

      if (!present) continue

      const box = place(i, round1(row * profile.step + jitter))
      const inside = box.x >= clip.x && box.y >= clip.y && box.x + box.w <= clip.x + clip.w && box.y + box.h <= clip.y + clip.h

      if (!inside || faces.some((face) => overlaps(face, box))) continue

      cells.push({ x: box.x, y: box.y, size: cell, row, opacity: profile.opacity[row], sample: i, fade: profile.fade[row] })
    }
  }

  return { edge, cell, pitch, samples: count, cells }
}

/** Mezcla un color del borde hacia el fondo según la fila (sRGB lineal simple, determinista). */
export const fadeToward = (hex: string, ground: string, amount: number): string => {
  const parse = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16))
  const [a, b] = [parse(hex), parse(ground)]
  const mixed = a.map((v, i) => Math.round(v + (b[i] - v) * amount))

  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Celdas listas para pintar: posición, tamaño, opacidad y color (muestras del borde de la foto procesada). */
export interface PaintedByteCell {
  x: number
  y: number
  size: number
  opacity: number
  fill: string
}

export const paintByteFracture = (fracture: ByteFracture, samples: readonly string[], ground: string): PaintedByteCell[] => {
  if (samples.length !== fracture.samples) {
    throw new Error(`La falla espera ${fracture.samples} muestras de color del borde y recibió ${samples.length}.`)
  }

  return fracture.cells.map((c) => ({ x: c.x, y: c.y, size: c.size, opacity: c.opacity, fill: fadeToward(samples[c.sample], ground, c.fade) }))
}
