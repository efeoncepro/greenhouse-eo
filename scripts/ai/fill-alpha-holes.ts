/**
 * Relleno de huecos internos del matting automático (`pnpm ai:image:rmbg`).
 *
 * El matting IMG.LY puede dejar transparentes zonas INTERNAS del sujeto que se parecen a "fondo" para el
 * modelo: cuencas de ojos oscuras, visores, glifos emisivos, un guion blanco sobre el pecho. Caso fuente
 * (2026-09-17, bibliotecas de poses 3D de Clawd y Codex): el `_` del emblema `>_` de Codex salió
 * transparente y sobre fondo navy se veía un rectángulo oscuro.
 *
 * Regla: un componente semitransparente (alpha < 250) que NO toca el borde del lienzo se rellena con el
 * píxel original, salvo que su color original promedio sea el del fondo de estudio (estimado como la
 * mediana del borde del original) o ese mismo gris neutro en sombra (caso: el piso visto por el aro del sprocket
 * apoyado en cenital). Así se conservan los huecos reales de fondo (el espacio dentro del
 * arco de unos audífonos) y se reparan los huecos falsos del sujeto.
 *
 * LÍMITE de esta regla, medido el 2026-09-21 con la biblioteca de Gigi: cuando el objeto interno es de verdad
 * del color del fondo, la heurística NO puede distinguirlo y no hay tolerancia que lo arregle. La utilería
 * blanca de los accesorios salió del render en (222,221,223) contra un fondo de estudio de (218,217,220):
 * Δ 4 por canal contra `backgroundTolerance = 18`. Gorro, lente, audífonos y birrete quedaron como agujeros.
 * Subir la tolerancia sólo empieza a comerse huecos de fondo reales. La corrección va AGUAS ARRIBA, en la
 * generación: pedir la utilería en un tono que se separe del fondo (ahí se usó hueso cálido #D3C8B4, Δ ≈ 40,
 * que sigue leyéndose «blanco»). Si llegas acá porque un prop claro volvió transparente, no toques este número.
 */

export interface AlphaHoleFillResult {
  rgba: Uint8Array
  filledPixels: number
  components: number
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/**
 * @param cutRgba recorte RGBA (salida del matting), width × height × 4
 * @param originalRgb imagen original RGB (entrada del matting), width × height × 3
 * @param backgroundTolerance distancia máxima por canal al color de borde para considerar el hueco como fondo real
 */
export const fillEnclosedAlphaHoles = (
  cutRgba: Uint8Array,
  originalRgb: Uint8Array,
  width: number,
  height: number,
  backgroundTolerance = 18
): AlphaHoleFillResult => {
  const W = width
  const H = height
  const out = new Uint8Array(cutRgba)
  const clear = (i: number) => out[i * 4 + 3] < 250

  // Color de fondo de estudio = mediana de los píxeles del borde del original.
  const border: number[][] = [[], [], []]

  for (let x = 0; x < W; x++) {
    for (const y of [0, H - 1]) for (let c = 0; c < 3; c++) border[c].push(originalRgb[(y * W + x) * 3 + c])
  }

  for (let y = 0; y < H; y++) {
    for (const x of [0, W - 1]) for (let c = 0; c < 3; c++) border[c].push(originalRgb[(y * W + x) * 3 + c])
  }

  const bg = border.map(median)

  // Transparencia conectada al borde = fondo exterior; no se toca.
  const outside = new Uint8Array(W * H)
  const stack: number[] = []

  const push = (i: number) => {
    if (!outside[i] && clear(i)) {
      outside[i] = 1
      stack.push(i)
    }
  }

  for (let x = 0; x < W; x++) {
    push(x)
    push((H - 1) * W + x)
  }

  for (let y = 0; y < H; y++) {
    push(y * W)
    push(y * W + W - 1)
  }

  const neighbors = (i: number): number[] => {
    const x = i % W
    const y = (i / W) | 0
    const n: number[] = []

    if (x > 0) n.push(i - 1)
    if (x < W - 1) n.push(i + 1)
    if (y > 0) n.push(i - W)
    if (y < H - 1) n.push(i + W)

    return n
  }

  while (stack.length) for (const j of neighbors(stack.pop() as number)) push(j)

  const assigned = new Uint8Array(W * H)
  let filledPixels = 0
  let components = 0

  for (let s = 0; s < W * H; s++) {
    if (outside[s] || assigned[s] || !clear(s)) continue

    const members = [s]

    assigned[s] = 1
    const sum = [0, 0, 0]

    for (let k = 0; k < members.length; k++) {
      const i = members[k]

      for (let c = 0; c < 3; c++) sum[c] += originalRgb[i * 3 + c]

      for (const j of neighbors(i)) {
        if (!outside[j] && !assigned[j] && clear(j)) {
          assigned[j] = 1
          members.push(j)
        }
      }
    }

    const mean = sum.map(v => v / members.length)
    const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    const neutral = Math.max(...mean) - Math.min(...mean) <= 16

    // Fondo visto a través de un hueco real: igual al borde, o el mismo gris neutro pero en sombra (el piso bajo un
    // objeto apoyado se ve más oscuro). Un blanco neutro MÁS claro que el fondo (glifos, brillos) sigue siendo sujeto,
    // y un neutro mucho más oscuro (cuencas, visores, negros del objeto) también.
    const shadowedBackground = neutral && lum(mean) <= lum(bg) + 8 && lum(mean) >= lum(bg) - 70

    const isBackground = mean.every((v, c) => Math.abs(v - bg[c]) <= backgroundTolerance) || shadowedBackground

    if (isBackground) continue

    for (const i of members) {
      out[i * 4] = originalRgb[i * 3]
      out[i * 4 + 1] = originalRgb[i * 3 + 1]
      out[i * 4 + 2] = originalRgb[i * 3 + 2]
      out[i * 4 + 3] = 255
    }

    filledPixels += members.length
    components += 1
  }

  return { rgba: out, filledPixels, components }
}
