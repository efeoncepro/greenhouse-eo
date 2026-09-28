/**
 * La estela de bytes de la cabecera del Glitch Flash — generador puro y determinista. Sólo Glitch.
 *
 * AXIS fija la estela en `glitchLine.editions.flash.masthead.trail` (celda cuadrada en el acento, 13 × 5, celda 10 /
 * paso 12, opacidad 0,18 → 1 hacia la palabra, densidad creciente, semilla 1755) y dice que el generador NO vive en
 * AXIS: vive aquí. Reproduce, celda por celda, el SVG del primer Flash aprobado y publicado por el operador el
 * 2026-09-28 (autorado en la sesión con `random.seed(1755)` de Python): por eso el azar es un Mersenne Twister
 * MT19937 con la siembra y las lecturas del módulo `random` de CPython (`seed(int)`, `random()`, `choice()`).
 *
 * Lo que decide el token: la rejilla (columnas, filas, celda, paso), la opacidad de salida y de llegada, el color y la
 * semilla. Lo que es forma del generador aprobado (no un valor de diseño del token): la curva de densidad
 * `0,12 + 0,8·t^1,4`, la curva de opacidad `t^1,2` entre `from` y `to` y el temblor vertical de ±1 px (`[0, 0, 1, -1]`).
 * Cambiar cualquiera de ellos cambia la pieza aprobada.
 *
 * Sin DOM, sin archivos, sin reloj: la misma entrada da el mismo SVG. El compilador de tokens (`pnpm glitch:tokens`)
 * lo escribe como asset del catálogo con el acento ya resuelto.
 */

import { glitchLine } from '@efeoncepro/axis-tokens'

/** Parámetros de la estela que usa el generador (los publica AXIS en `glitchLine.editions.flash.masthead.trail`). */
export interface GlitchFlashTrailSpec {
  cellPx: number
  stepPx: number
  columns: number
  rows: number
  opacity: { from: number; to: number }
  seed: number
}

export interface GlitchFlashTrailCell {
  x: number
  y: number
  /** Opacidad redondeada a dos decimales (como la publicada). */
  opacity: number
}

export interface GlitchFlashTrail {
  cells: GlitchFlashTrailCell[]
  cell: number
  /** Ancho y alto del viewBox: la rejilla entera, del borde de la primera celda al de la última. */
  width: number
  height: number
}

/** Forma del generador aprobado (ver cabecera): no son valores del token. */
const DENSITY_BASE = 0.12
const DENSITY_GAIN = 0.8
const DENSITY_CURVE = 1.4
const OPACITY_CURVE = 1.2
const JITTER = [0, 0, 1, -1] as const

/**
 * MT19937 con la siembra y las lecturas de CPython (`Modules/_randommodule.c` y `Lib/random.py`). Enteros sin signo de
 * 32 bits con `Math.imul` y `>>> 0`.
 */
class PythonRandom {
  private readonly mt = new Uint32Array(624)
  private index = 625

  constructor(seed: number) {
    // `random.seed(n)` con un entero: `init_by_array` sobre los trozos de 32 bits de |n|.
    const key: number[] = []
    let n = Math.abs(Math.trunc(seed))

    do {
      key.push(n % 0x100000000)
      n = Math.floor(n / 0x100000000)
    } while (n > 0)

    this.initByArray(key)
  }

  private initGenrand(s: number) {
    const mt = this.mt

    mt[0] = s >>> 0

    for (let i = 1; i < 624; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30)

      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0
    }

    this.index = 624
  }

  private initByArray(key: number[]) {
    const mt = this.mt

    this.initGenrand(19650218)

    let i = 1
    let j = 0

    for (let k = Math.max(624, key.length); k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30)

      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0
      i++
      j++

      if (i >= 624) {
        mt[0] = mt[623]
        i = 1
      }

      if (j >= key.length) j = 0
    }

    for (let k = 623; k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30)

      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0
      i++

      if (i >= 624) {
        mt[0] = mt[623]
        i = 1
      }
    }

    mt[0] = 0x80000000
  }

  private nextUint32(): number {
    const mt = this.mt

    if (this.index >= 624) {
      for (let k = 0; k < 624; k++) {
        const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff)

        mt[k] = (mt[(k + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0)) >>> 0
      }

      this.index = 0
    }

    let y = mt[this.index++]

    y ^= y >>> 11
    y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0
    y = (y ^ ((y << 15) & 0xefc60000)) >>> 0
    y ^= y >>> 18

    return y >>> 0
  }

  /** `random.random()`: 53 bits de dos lecturas. */
  random(): number {
    const a = this.nextUint32() >>> 5
    const b = this.nextUint32() >>> 6

    return (a * 67108864 + b) / 9007199254740992
  }

  /** `random.choice(seq)`: `_randbelow` con `getrandbits(bit_length(n))` y rechazo. */
  choice<T>(seq: readonly T[]): T {
    const n = seq.length
    const k = n.toString(2).length
    let r = this.nextUint32() >>> (32 - k)

    while (r >= n) r = this.nextUint32() >>> (32 - k)

    return seq[r]
  }
}

/** Redondeo a dos decimales como `round(x, 2)` de Python sobre los valores de la estela (sin empates reales). */
const round2 = (value: number) => Math.round(value * 100) / 100

/** Las celdas de la estela: columna a columna hacia la palabra, fila a fila. */
export const computeGlitchFlashTrail = (spec: GlitchFlashTrailSpec = glitchLine.editions.flash.masthead.trail): GlitchFlashTrail => {
  const rng = new PythonRandom(spec.seed)
  const { from, to } = spec.opacity
  const cells: GlitchFlashTrailCell[] = []

  for (let c = 0; c < spec.columns; c++) {
    const t = (c + 1) / spec.columns

    for (let r = 0; r < spec.rows; r++) {
      if (rng.random() < DENSITY_BASE + DENSITY_GAIN * t ** DENSITY_CURVE) {
        const opacity = round2(from + (to - from) * t ** OPACITY_CURVE)
        const dy = rng.choice(JITTER)

        cells.push({ x: c * spec.stepPx, y: r * spec.stepPx + dy, opacity })
      }
    }
  }

  return {
    cells,
    cell: spec.cellPx,
    width: (spec.columns - 1) * spec.stepPx + spec.cellPx,
    height: (spec.rows - 1) * spec.stepPx + spec.cellPx
  }
}

/** Opacidad como la escribió el SVG aprobado (`1.0`, `0.5`, `0.22`). */
const formatOpacity = (opacity: number) => (Number.isInteger(opacity) ? opacity.toFixed(1) : String(opacity))

/**
 * El SVG de la estela con el color ya resuelto (un `<img>` no hereda `currentColor`). Sin tamaño propio: el ancho lo
 * pone la plantilla y el alto sale de la proporción del viewBox.
 */
export const buildGlitchFlashTrailSvg = (color: string, spec: GlitchFlashTrailSpec = glitchLine.editions.flash.masthead.trail): string => {
  const trail = computeGlitchFlashTrail(spec)

  const rects = trail.cells
    .map((c) => `<rect x="${c.x}" y="${c.y}" width="${trail.cell}" height="${trail.cell}" fill-opacity="${formatOpacity(c.opacity)}"/>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${trail.width} ${trail.height}" width="${trail.width}" height="${trail.height}"><g fill="${color}">${rects}</g></svg>\n`
}
