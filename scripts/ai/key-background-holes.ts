/**
 * Llave de fondo sobre huecos opacos del matting (`pnpm ai:image:rmbg --key-background`).
 *
 * Caso inverso al relleno de huecos (`fill-alpha-holes.ts`): con un objeto CLARO sobre fondo de estudio OSCURO, el
 * matting IMG.LY deja opacos los huecos pasantes que muestran el fondo (cortes de una órbita, ventanas). Caso fuente
 * (2026-09-17, nave de Efeonce 3D blanca sobre navy): el navy quedaba visible dentro de cada corte y ventana.
 *
 * Regla: color de fondo = mediana del borde del original. Cada componente conexo (4 vecinos) de píxeles aún visibles
 * cuyo color original está a menos de `threshold` (distancia RGB) del fondo y que mide al menos `minPixels` pasa a
 * alfa 0. Un borde de 2 px alrededor recibe alfa proporcional a la distancia al fondo y se descontamina el color
 * (C − (1 − a)·fondo)/a para que no quede halo. Es opt-in: un sujeto con zonas del mismo color que el fondo las
 * perdería.
 */

export interface KeyBackgroundOptions {
  /** Distancia RGB euclidiana máxima al color de fondo. */
  threshold?: number
  /** Tamaño mínimo del componente para vaciarlo (evita tocar píxeles sueltos del sujeto). */
  minPixels?: number
}

export interface KeyBackgroundResult {
  rgba: Uint8Array
  clearedPixels: number
  components: number
  background: number[]
}

export const KEY_BACKGROUND_DEFAULTS = { threshold: 42, minPixels: 30 } as const

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/**
 * @param cutRgba recorte RGBA (salida del matting), width × height × 4
 * @param originalRgb imagen original RGB (entrada del matting), width × height × 3
 */
export const keyBackgroundHoles = (
  cutRgba: Uint8Array,
  originalRgb: Uint8Array,
  width: number,
  height: number,
  options: KeyBackgroundOptions = {}
): KeyBackgroundResult => {
  const W = width
  const H = height
  const N = W * H
  const threshold = options.threshold ?? KEY_BACKGROUND_DEFAULTS.threshold
  const minPixels = options.minPixels ?? KEY_BACKGROUND_DEFAULTS.minPixels
  const out = new Uint8Array(cutRgba)

  const border: number[][] = [[], [], []]

  for (let x = 0; x < W; x++) {
    for (const y of [0, H - 1]) for (let c = 0; c < 3; c++) border[c].push(originalRgb[(y * W + x) * 3 + c])
  }

  for (let y = 0; y < H; y++) {
    for (const x of [0, W - 1]) for (let c = 0; c < 3; c++) border[c].push(originalRgb[(y * W + x) * 3 + c])
  }

  const bg = border.map(median)

  const dist = (i: number) =>
    Math.hypot(originalRgb[i * 3] - bg[0], originalRgb[i * 3 + 1] - bg[1], originalRgb[i * 3 + 2] - bg[2])

  const candidate = (i: number) => out[i * 4 + 3] > 0 && dist(i) < threshold
  const seen = new Uint8Array(N)
  const kill = new Uint8Array(N)
  let clearedPixels = 0
  let components = 0

  for (let s = 0; s < N; s++) {
    if (seen[s] || !candidate(s)) continue

    const members = [s]

    seen[s] = 1

    for (let k = 0; k < members.length; k++) {
      const i = members[k]
      const x = i % W
      const next: number[] = []

      if (x > 0) next.push(i - 1)
      if (x < W - 1) next.push(i + 1)
      if (i >= W) next.push(i - W)
      if (i < N - W) next.push(i + W)

      for (const j of next) {
        if (!seen[j] && candidate(j)) {
          seen[j] = 1
          members.push(j)
        }
      }
    }

    if (members.length < minPixels) continue

    for (const i of members) kill[i] = 1
    clearedPixels += members.length
    components += 1
  }

  if (components === 0) return { rgba: out, clearedPixels, components, background: bg }

  const ring = new Uint8Array(N)

  for (let i = 0; i < N; i++) {
    if (!kill[i]) continue

    const x = i % W
    const y = (i / W) | 0

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx
        const ny = y + dy

        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue

        const j = ny * W + nx

        if (!kill[j]) ring[j] = 1
      }
    }
  }

  for (let i = 0; i < N; i++) {
    if (kill[i]) {
      out[i * 4 + 3] = 0
      continue
    }

    if (!ring[i] || out[i * 4 + 3] === 0) continue

    const a = Math.min(1, Math.max(0, (dist(i) - threshold * 0.5) / (threshold * 1.5)))

    if (a >= 1) continue

    out[i * 4 + 3] = Math.min(out[i * 4 + 3], Math.round(a * 255))

    if (a > 0.05) {
      for (let c = 0; c < 3; c++) {
        out[i * 4 + c] = Math.max(0, Math.min(255, Math.round((originalRgb[i * 3 + c] - (1 - a) * bg[c]) / a)))
      }
    }
  }

  return { rgba: out, clearedPixels, components, background: bg }
}
