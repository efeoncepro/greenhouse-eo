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

export type FractureEdge = 'bottom' | 'left' | 'right'

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
  /** Regiones de rostro normalizadas a la foto (0–1). `[]` = sin rostros. */
  faceRegions: readonly { x: number; y: number; w: number; h: number }[]
  /** Tamaño de celda y paso en px. Por defecto, los medidos en el canvas (27 / 30). */
  cell?: number
  pitch?: number
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
}

export interface ByteFracture {
  edge: FractureEdge
  cell: number
  pitch: number
  /** Cuántas muestras de color espera (una por posición a lo largo del borde). */
  samples: number
  cells: ByteCell[]
}

const ROW_OPACITY = [1, 0.87, 0.74, 0.61, 0.48] as const
/** Probabilidad de que haya celda en cada fila (medida en las láminas del canvas). */
const ROW_PRESENCE = [0.95, 0.62, 0.58, 0.42, 0.24] as const

/** Cuánto se funde el color hacia el fondo en cada fila (0 = color del borde). */
export const ROW_FADE = [0, 0.08, 0.16, 0.28, 0.4] as const

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
  if (edge === 'left') return { x: photo.x, y: photo.y, w: depth, h: photo.h }

  return { x: photo.x + photo.w - depth, y: photo.y, w: depth, h: photo.h }
}

export const computeByteFracture = (input: ByteFractureInput): ByteFracture => {
  const cell = input.cell ?? 27
  const pitch = input.pitch ?? 30
  const { photo, edge, canvas } = input
  const faces: Box[] = input.faceRegions.map((f) => ({ x: photo.x + f.x * photo.w, y: photo.y + f.y * photo.h, w: f.w * photo.w, h: f.h * photo.h }))
  const band = fractureBand(photo, edge, cell)

  if (faces.some((face) => overlaps(face, band))) {
    throw new GlitchPieceError('La falla en bytes caería sobre un rostro: elige otro borde (fractureEdge) o declara bien las regiones.', 'fracture-over-face', [
      { code: 'fracture-over-face', message: 'La franja del borde de la foto intersecta una región de rostro declarada.' }
    ])
  }

  const random = rng(input.seed)
  const along = edge === 'bottom' ? photo.w : photo.h
  const count = Math.floor((along - cell) / pitch) + 1
  const cells: ByteCell[] = []

  for (let i = 0; i < count; i++) {
    for (let row = 0; row < ROW_OPACITY.length; row++) {
      // Se consumen siempre los dos números (presencia y desvío) para que la secuencia no dependa de los saltos.
      const present = random() < ROW_PRESENCE[row]
      const jitter = random() * 12

      if (!present) continue

      const offset = round1(row * 34.5 + jitter)

      const box: Box =
        edge === 'bottom'
          ? { x: photo.x + 1 + i * pitch, y: round1(photo.y + photo.h + offset), w: cell, h: cell }
          : edge === 'left'
            ? { x: round1(photo.x - cell - offset), y: photo.y + 1 + i * pitch, w: cell, h: cell }
            : { x: round1(photo.x + photo.w + offset), y: photo.y + 1 + i * pitch, w: cell, h: cell }

      const inside = box.x >= 0 && box.y >= 0 && box.x + box.w <= canvas.width && box.y + box.h <= canvas.height

      if (!inside || faces.some((face) => overlaps(face, box))) continue

      cells.push({ x: box.x, y: box.y, size: cell, row, opacity: ROW_OPACITY[row], sample: i })
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

  return fracture.cells.map((c) => ({ x: c.x, y: c.y, size: c.size, opacity: c.opacity, fill: fadeToward(samples[c.sample], ground, ROW_FADE[c.row]) }))
}
