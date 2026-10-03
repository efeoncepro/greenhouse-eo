import sharp from 'sharp'

import { readRaw, singleChannel, type RgbaImage } from './raw'

/**
 * Máscara canónica del pipeline de inpainting (TASK-1965).
 *
 * Un solo formato interno: 1 canal, 8 bits, 255 = editable, 0 = protegido, intermedios = borde difuminado. Las
 * convenciones de cada proveedor (OpenAI quiere alfa 0 = editable; fal, blanco = editable) se resuelven SÓLO en
 * `toProviderMaskPng`, así que ningún otro código del pipeline necesita saber qué espera cada uno.
 */
export interface CanonicalMask {
  readonly width: number
  readonly height: number
  readonly data: Uint8Array
}

export type MaskConvention = 'white-editable' | 'alpha-transparent-editable'

export const MASK_CONVENTIONS: readonly MaskConvention[] = ['white-editable', 'alpha-transparent-editable']

export class MaskError extends Error {}

export interface FractionRect {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface PixelBox {
  left: number
  top: number
  width: number
  height: number
}

const assertDimensions = (width: number, height: number) => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new MaskError(`Dimensiones de máscara inválidas: ${width}x${height}.`)
  }
}

const assertSameSize = (a: CanonicalMask, b: CanonicalMask, label: string) => {
  if (a.width !== b.width || a.height !== b.height) {
    throw new MaskError(`${label}: las máscaras miden ${a.width}x${a.height} y ${b.width}x${b.height}.`)
  }
}

export const createMask = (width: number, height: number, fill = 0): CanonicalMask => {
  assertDimensions(width, height)

  return { width, height, data: new Uint8Array(width * height).fill(fill) }
}

const assertFraction = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new MaskError(`${label} debe estar entre 0 y 1 (recibido ${value}).`)
}

/** Rectángulo en fracciones del ancho y del alto; un píxel entra si su centro cae dentro. */
export const maskFromRect = (width: number, height: number, rect: FractionRect): CanonicalMask => {
  for (const [key, value] of Object.entries(rect)) assertFraction(value, key)

  if (rect.x1 <= rect.x0 || rect.y1 <= rect.y0) throw new MaskError('El rectángulo necesita x1 > x0 e y1 > y0.')

  const mask = createMask(width, height)

  for (let y = 0; y < height; y += 1) {
    const cy = (y + 0.5) / height

    if (cy < rect.y0 || cy > rect.y1) continue

    for (let x = 0; x < width; x += 1) {
      const cx = (x + 0.5) / width

      if (cx >= rect.x0 && cx <= rect.x1) mask.data[y * width + x] = 255
    }
  }

  return mask
}

/** Polígono en fracciones, relleno par-impar evaluado en el centro de cada píxel. */
export const maskFromPolygon = (width: number, height: number, points: ReadonlyArray<readonly [number, number]>): CanonicalMask => {
  if (points.length < 3) throw new MaskError('El polígono necesita al menos 3 puntos.')

  points.forEach(([x, y], index) => {
    assertFraction(x, `punto ${index + 1} x`)
    assertFraction(y, `punto ${index + 1} y`)
  })

  const mask = createMask(width, height)
  const px = points.map(([x, y]) => [x * width, y * height] as const)

  for (let y = 0; y < height; y += 1) {
    const cy = y + 0.5
    const crossings: number[] = []

    for (let i = 0; i < px.length; i += 1) {
      const [ax, ay] = px[i]
      const [bx, by] = px[(i + 1) % px.length]

      if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) crossings.push(ax + ((cy - ay) / (by - ay)) * (bx - ax))
    }

    crossings.sort((a, b) => a - b)

    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const from = Math.max(0, Math.ceil(crossings[k] - 0.5))
      const to = Math.min(width - 1, Math.floor(crossings[k + 1] - 0.5))

      for (let x = from; x <= to; x += 1) mask.data[y * width + x] = 255
    }
  }

  return mask
}

const parseNumbers = (raw: string, label: string): number[] =>
  raw.split(',').map(part => {
    const value = Number(part.trim())

    if (!part.trim() || !Number.isFinite(value)) throw new MaskError(`${label}: "${raw}" no es una lista de números.`)

    return value
  })

/** `x0,y0,x1,y1` en fracciones. */
export const parseRect = (raw: string): FractionRect => {
  const values = parseNumbers(raw, '--rect')

  if (values.length !== 4) throw new MaskError('--rect espera x0,y0,x1,y1 en fracciones (p. ej. 0.33,0.42,0.67,0.72).')

  const [x0, y0, x1, y1] = values

  return { x0, y0, x1, y1 }
}

/** `x,y;x,y;x,y` en fracciones. */
export const parsePolygon = (raw: string): Array<[number, number]> =>
  raw.split(';').map(pair => {
    const values = parseNumbers(pair, '--polygon')

    if (values.length !== 2) throw new MaskError('--polygon espera puntos x,y separados por ";".')

    return [values[0], values[1]]
  })

const threshold = (value: number, limit: number) => (value > limit ? 255 : 0)

/**
 * Desde el alfa de una imagen: por defecto lo transparente es lo editable (convención de los recortes). Con
 * `threshold` binariza; con `threshold: null` conserva el alfa intermedio como borde suave (lectura sin pérdida de
 * una máscara de OpenAI).
 */
export const maskFromAlpha = async (
  input: string | Buffer,
  options: { editable?: 'transparent' | 'opaque'; threshold?: number | null } = {}
): Promise<CanonicalMask> => {
  const raw = await readRaw(sharp(input).ensureAlpha().extractChannel(3).toColourspace('b-w'), 1, 'alfa de la fuente')
  const data = new Uint8Array(raw.data.length)
  const editableWhenTransparent = (options.editable ?? 'transparent') === 'transparent'
  const limit = options.threshold === undefined ? 127 : options.threshold

  for (let i = 0; i < data.length; i += 1) {
    const alpha = raw.data[i]

    if (limit === null) data[i] = editableWhenTransparent ? 255 - alpha : alpha
    else data[i] = (alpha > limit) === editableWhenTransparent ? 0 : 255
  }

  return { width: raw.width, height: raw.height, data }
}

/** Desde la luminancia: por defecto lo claro es editable (una máscara pintada en blanco sobre negro). */
export const maskFromLuminance = async (
  input: string | Buffer,
  options: { editable?: 'light' | 'dark'; threshold?: number } = {}
): Promise<CanonicalMask> => {
  const limit = options.threshold ?? 127
  const raw = await readRaw(sharp(input).flatten({ background: '#000000' }).toColourspace('b-w'), 1, 'luminancia de la fuente')
  const light = (options.editable ?? 'light') === 'light'
  const data = new Uint8Array(raw.data.length)

  for (let i = 0; i < data.length; i += 1) data[i] = light ? threshold(raw.data[i], limit) : 255 - threshold(raw.data[i], limit)

  return { width: raw.width, height: raw.height, data }
}

/**
 * Desde el sujeto, con el matting local de IMG.LY (gratis, sin red; el mismo motor de `pnpm ai:image:rmbg`). Se
 * importa sólo al usarlo porque carga el modelo ONNX.
 */
export const maskFromSubject = async (
  inputPath: string,
  options: { editable?: 'subject' | 'background'; model?: 'small' | 'medium' } = {}
): Promise<CanonicalMask> => {
  const { readFile } = await import('node:fs/promises')
  const { removeBackground } = await import('@imgly/background-removal-node')
  const bytes = await readFile(inputPath)
  const lower = inputPath.toLowerCase()
  const type = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : lower.endsWith('.webp') ? 'image/webp' : 'image/png'
  const blob = await removeBackground(new Blob([new Uint8Array(bytes)], { type }), { model: options.model ?? 'medium', output: { format: 'image/png', quality: 1 } })
  const cut = Buffer.from(await blob.arrayBuffer())

  return maskFromAlpha(cut, { editable: (options.editable ?? 'subject') === 'subject' ? 'opaque' : 'transparent' })
}

/**
 * Transformada de distancia euclidiana al cuadrado (Felzenszwalb y Huttenlocher), O(n): dilatar y erosionar con
 * radios grandes sobre piezas de 8 MP sin un filtro O(n·r).
 */
const squaredDistanceTransform = (width: number, height: number, isSeed: (index: number) => boolean): Float64Array => {
  const INF = 1e20
  const grid = new Float64Array(width * height)

  for (let i = 0; i < grid.length; i += 1) grid[i] = isSeed(i) ? 0 : INF

  const size = Math.max(width, height)
  const f = new Float64Array(size)
  const d = new Float64Array(size)
  const v = new Int32Array(size)
  const z = new Float64Array(size + 1)

  const pass = (n: number) => {
    let k = 0

    v[0] = 0
    z[0] = -INF
    z[1] = INF

    for (let q = 1; q < n; q += 1) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])

      while (s <= z[k]) {
        k -= 1
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      }

      k += 1
      v[k] = q
      z[k] = s
      z[k + 1] = INF
    }

    k = 0

    for (let q = 0; q < n; q += 1) {
      while (z[k + 1] < q) k += 1
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
    }
  }

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) f[y] = grid[y * width + x]
    pass(height)
    for (let y = 0; y < height; y += 1) grid[y * width + x] = d[y]
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) f[x] = grid[y * width + x]
    pass(width)
    for (let x = 0; x < width; x += 1) grid[y * width + x] = d[x]
  }

  return grid
}

const assertRadius = (radius: number, label: string) => {
  if (!Number.isFinite(radius) || radius < 0) throw new MaskError(`${label}: el radio debe ser un número ≥ 0.`)
}

/** Agranda la zona editable `radius` px. Binariza (umbral 127): difumina después, no antes. */
export const dilate = (mask: CanonicalMask, radius: number): CanonicalMask => {
  assertRadius(radius, 'dilatar')
  if (radius === 0) return mask

  const distance = squaredDistanceTransform(mask.width, mask.height, i => mask.data[i] > 127)
  const limit = radius * radius
  const data = new Uint8Array(mask.data.length)

  for (let i = 0; i < data.length; i += 1) data[i] = distance[i] <= limit ? 255 : 0

  return { ...mask, data }
}

/** Achica la zona editable `radius` px. Binariza (umbral 127). */
export const erode = (mask: CanonicalMask, radius: number): CanonicalMask => {
  assertRadius(radius, 'erosionar')
  if (radius === 0) return mask

  const distance = squaredDistanceTransform(mask.width, mask.height, i => mask.data[i] <= 127)
  const limit = radius * radius
  const data = new Uint8Array(mask.data.length)

  for (let i = 0; i < data.length; i += 1) data[i] = distance[i] > limit ? 255 : 0

  return { ...mask, data }
}

/**
 * Difumina el borde hacia afuera y hacia adentro sin perder el núcleo: el blur de sharp redondea y deja el centro en
 * 253–254 (medido 2026-10-02: una zona de 441×615 px quedó sin un solo píxel en 255, toda «borde», y la recomposición
 * mezclaba restos de la base). El núcleo erosionado se repone en 255 y los restos ≤ 2 vuelven a 0 para que la zona
 * protegida sea protegida de verdad. La lectura exige 1 canal: sin `toColourspace('b-w')`, sharp devolvería 3.
 */
export const feather = async (mask: CanonicalMask, radius: number): Promise<CanonicalMask> => {
  assertRadius(radius, 'difuminar')
  if (radius === 0) return mask

  const sigma = Math.min(1000, Math.max(0.3, radius / 2))
  const raw = await readRaw(singleChannel(mask.data, mask.width, mask.height).blur(sigma).toColourspace('b-w'), 1, 'máscara difuminada')
  const core = erode(mask, radius)
  const data = new Uint8Array(raw.data.length)

  for (let i = 0; i < data.length; i += 1) {
    const value = Math.max(raw.data[i], core.data[i])

    data[i] = value <= 2 ? 0 : value >= 253 ? 255 : value
  }

  return { width: mask.width, height: mask.height, data }
}

export const invert = (mask: CanonicalMask): CanonicalMask => ({ ...mask, data: mask.data.map(value => 255 - value) })

export const union = (a: CanonicalMask, b: CanonicalMask): CanonicalMask => {
  assertSameSize(a, b, 'unir')

  return { ...a, data: a.data.map((value, i) => Math.max(value, b.data[i])) }
}

export const intersect = (a: CanonicalMask, b: CanonicalMask): CanonicalMask => {
  assertSameSize(a, b, 'intersectar')

  return { ...a, data: a.data.map((value, i) => Math.min(value, b.data[i])) }
}

export const resizeMask = async (mask: CanonicalMask, width: number, height: number): Promise<CanonicalMask> => {
  assertDimensions(width, height)
  if (width === mask.width && height === mask.height) return mask

  const raw = await readRaw(
    singleChannel(mask.data, mask.width, mask.height).resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).toColourspace('b-w'),
    1,
    'máscara reescalada'
  )

  return { width, height, data: raw.data }
}

/** Recorta la máscara a una caja en píxeles. */
export const cropMask = (mask: CanonicalMask, box: PixelBox): CanonicalMask => {
  const data = new Uint8Array(box.width * box.height)

  for (let y = 0; y < box.height; y += 1) {
    const from = (box.top + y) * mask.width + box.left

    data.set(mask.data.subarray(from, from + box.width), y * box.width)
  }

  return { width: box.width, height: box.height, data }
}

export interface MaskStats {
  /** Píxeles totalmente editables (255). */
  editable: number
  /** Píxeles de borde (1..254). */
  soft: number
  /** Píxeles totalmente protegidos (0). */
  protected: number
  total: number
  /** Fracción tocable por el modelo: todo lo que no es 0. */
  touchedFraction: number
  /** Caja de todo lo que no es 0; null si la máscara está vacía. */
  bbox: PixelBox | null
}

export const maskStats = (mask: CanonicalMask): MaskStats => {
  let editable = 0
  let soft = 0
  let minX = mask.width
  let minY = mask.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      const value = mask.data[y * mask.width + x]

      if (value === 0) continue
      if (value === 255) editable += 1
      else soft += 1

      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  const total = mask.width * mask.height

  return {
    editable,
    soft,
    protected: total - editable - soft,
    total,
    touchedFraction: (editable + soft) / total,
    bbox: maxX < 0 ? null : { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
  }
}

/**
 * Guarda antes de gastar: una máscara vacía no edita nada y una llena deja al modelo repintar la pieza entera (el
 * síntoma exacto de la trampa de canales). Ambas se rechazan salvo pedido explícito.
 */
export const assertMaskUsable = (mask: CanonicalMask, options: { allowEmpty?: boolean; allowFull?: boolean } = {}): MaskStats => {
  const stats = maskStats(mask)

  if (stats.editable + stats.soft === 0 && !options.allowEmpty) {
    throw new MaskError('La máscara no abre ningún píxel: no hay nada que editar. Revisa la fuente o el umbral.')
  }

  if (stats.protected === 0 && !options.allowFull) {
    throw new MaskError(
      'La máscara deja editable el 100 % de la imagen: el modelo repintaría la pieza entera. ' +
        'Si es intencional, pasa --allow-full; si no, revisa la fuente (un canal mal leído produce exactamente esto).'
    )
  }

  return stats
}

/** Lee una máscara de disco en la convención indicada y la devuelve canónica. */
export const loadMask = async (input: string | Buffer, convention: MaskConvention = 'white-editable'): Promise<CanonicalMask> => {
  if (convention === 'alpha-transparent-editable') return maskFromAlpha(input, { editable: 'transparent', threshold: null })

  const raw = await readRaw(sharp(input).flatten({ background: '#000000' }).toColourspace('b-w'), 1, 'máscara')

  return { width: raw.width, height: raw.height, data: raw.data }
}

/** Formato de disco canónico: PNG en escala de grises, blanco = editable. */
export const encodeMaskPng = (mask: CanonicalMask): Promise<Buffer> =>
  // Sin `toColourspace('b-w')`, sharp escribe el plano de 1 canal como PNG RGB de 3 canales (la misma trampa, del
  // lado de la escritura).
  singleChannel(mask.data, mask.width, mask.height).toColourspace('b-w').png({ compressionLevel: 9 }).toBuffer()

/** Máscara en la convención de un proveedor. */
export const toProviderMaskPng = async (mask: CanonicalMask, convention: MaskConvention): Promise<Buffer> => {
  if (convention === 'white-editable') return encodeMaskPng(mask)

  const rgba = Buffer.alloc(mask.width * mask.height * 4)

  for (let i = 0; i < mask.data.length; i += 1) rgba[i * 4 + 3] = 255 - mask.data[i]

  return sharp(rgba, { raw: { width: mask.width, height: mask.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer()
}

/** Vista previa: la zona editable teñida sobre la base, para mirar ANTES de gastar. */
export const renderMaskPreview = async (base: RgbaImage, mask: CanonicalMask): Promise<Buffer> => {
  if (base.width !== mask.width || base.height !== mask.height) {
    throw new MaskError(`La máscara (${mask.width}x${mask.height}) no mide lo mismo que la base (${base.width}x${base.height}).`)
  }

  const out = Buffer.alloc(base.width * base.height * 3)
  const tint = [255, 40, 120]

  for (let i = 0; i < mask.data.length; i += 1) {
    const weight = (mask.data[i] / 255) * 0.55

    for (let c = 0; c < 3; c += 1) out[i * 3 + c] = Math.round(base.data[i * 4 + c] * (1 - weight) + tint[c] * weight)
  }

  return sharp(out, { raw: { width: base.width, height: base.height, channels: 3 } }).png().toBuffer()
}
