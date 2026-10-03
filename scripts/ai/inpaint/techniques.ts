import type { InpaintImageAdapter } from './adapters/types'
import { createMask, dilate, feather, maskStats, squaredDistanceTransform, union, type CanonicalMask } from './mask'
import type { RgbaImage } from './raw'

/**
 * Técnicas de edición sobre el pipeline de inpainting (TASK-1973): borrar con clean plate o con modelo, y la medición
 * de residuo. Todo termina en la recomposición y la verificación del núcleo (`runImageInpaint`).
 */

/** Prompt por defecto para borrar con un modelo con máscara. */
export const ERASE_DEFAULT_PROMPT =
  'Remove the object in the marked area completely, including its shadow and reflection. Reconstruct what is behind it so the surface, texture and lighting continue naturally. Leave the area empty: no new objects.'

/**
 * Máscara de borrado DERIVADA (de capa o de sujeto): se agranda para llevarse el borde y la sombra de contacto, y se
 * difumina. Una máscara explícita del operador nunca pasa por acá.
 */
export const prepareEraseMask = async (mask: CanonicalMask, growPx = 16, featherPx = 12): Promise<CanonicalMask> => feather(dilate(mask, growPx), featherPx)

export interface ShadowDetection {
  mask: CanonicalMask
  /** Píxeles de sombra agregados (fuera del objeto). */
  pixels: number
  /** Cuánto más oscura es la original que el plate dentro de la sombra (luminancia media, 0–255). */
  meanDarkening: number
}

const luminance = (data: Uint8Array, offset: number) => 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]

/**
 * Sombra proyectada del objeto, medida contra el clean plate: la capa de la superficie viene SIN la sombra (medido en
 * el canario del 2026-10-03: la original 50–100 niveles más oscura que el plate bajo la sombra de la taza, ±2 en el
 * resto). Crece por conectividad DESDE el borde del objeto, sólo por píxeles donde la original es más oscura que el
 * plate, y nunca más allá de `radius`: una zona oscura que no toca al objeto no es su sombra.
 *
 * El oscurecimiento se mide relativo a la mediana del anillo de búsqueda, porque el plate regenerado puede venir
 * corrido de color en bloque (+9 niveles en el mismo canario).
 *
 * `others` son los DEMÁS objetos de la escena (no las superficies sobre las que descansa): una sombra nunca se toma
 * encima de otro objeto ni más cerca de él que del elegido. Sin esa regla, mover el cuaderno se llevó la base y la
 * sombra de la taza vecina, porque las dos sombras se tocan (canario del 2026-10-03).
 */
export const detectCastShadow = (
  original: RgbaImage,
  plate: RgbaImage,
  objectMask: CanonicalMask,
  options: { radius?: number; threshold?: number; others?: CanonicalMask } = {}
): ShadowDetection => {
  const { width, height } = original
  const box = maskStats(objectMask).bbox
  const empty = { mask: createMask(width, height), pixels: 0, meanDarkening: 0 }

  if (!box) return empty

  const radius = options.radius ?? Math.round(Math.max(box.width, box.height) * 0.6)
  const threshold = options.threshold ?? 14
  const reach = dilate(objectMask, radius)
  const darkening = new Float32Array(width * height)
  const ring: number[] = []

  for (let i = 0; i < width * height; i += 1) {
    if (!reach.data[i] || objectMask.data[i] > 127) continue
    darkening[i] = luminance(plate.data, i * 4) - luminance(original.data, i * 4)
    ring.push(darkening[i])
  }

  if (!ring.length) return empty

  ring.sort((a, b) => a - b)

  const median = ring[Math.floor(ring.length / 2)]
  const others = options.others && maskStats(options.others).bbox ? options.others : null
  // Distancia al objeto elegido y a los demás: cada píxel de sombra pertenece al objeto más cercano.
  const toObject = others ? squaredDistanceTransform(width, height, i => objectMask.data[i] > 127) : null
  const toOthers = others ? squaredDistanceTransform(width, height, i => others.data[i] > 0) : null
  const owned = (i: number) => !toObject || (others!.data[i] === 0 && toObject[i] <= toOthers![i])
  const isShadow = (i: number) => reach.data[i] > 0 && objectMask.data[i] <= 127 && darkening[i] - median > threshold && owned(i)
  const seeds = dilate(objectMask, 2)
  const out = createMask(width, height)
  const queue: number[] = []

  for (let i = 0; i < width * height; i += 1) {
    if (seeds.data[i] && isShadow(i)) {
      out.data[i] = 255
      queue.push(i)
    }
  }

  let sum = 0

  for (let head = 0; head < queue.length; head += 1) {
    const i = queue[head]
    const x = i % width
    const y = (i - x) / width

    sum += darkening[i] - median

    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue

      const n = ny * width + nx

      if (!out.data[n] && isShadow(n)) {
        out.data[n] = 255
        queue.push(n)
      }
    }
  }

  return { mask: out, pixels: queue.length, meanDarkening: queue.length ? Math.round((sum / queue.length) * 10) / 10 : 0 }
}

/** Máscara de borrado con la sombra del objeto incluida (agrandada y difuminada como el resto). */
export const withCastShadow = (objectMask: CanonicalMask, shadow: ShadowDetection): CanonicalMask => (shadow.pixels ? union(objectMask, dilate(shadow.mask, 4)) : objectMask)

/**
 * Adaptador local «clean plate»: devuelve la base de Layerize (la escena sin los elementos) ya en el tamaño de la
 * original, sin llamar a ningún proveedor ni gastar. El pipeline la trata como cualquier salida cruda: corrige color,
 * recompone sólo la zona y verifica.
 */
export const createPlateAdapter = (plate: { png: Buffer; width: number; height: number; source: string }): InpaintImageAdapter => ({
  id: 'plate',
  provider: 'fal',
  label: 'Clean plate de Layerize (sin proveedor)',
  defaultModel: 'clean-plate',
  sendsMask: false,
  maskConvention: null,
  // Verificado en vivo sobre capas reales de Layerize (canario TASK-1973, 2026-10-03).
  verifiedAt: '2026-10-03',
  revision: 1,
  // La máscara no viaja, pero tampoco hay guía que mandar: el plate ya es la escena sin el objeto.
  willSendMask: () => true,
  validate({ model, quality, seed }) {
    if (model !== 'clean-plate' || quality !== undefined || seed !== undefined) throw new Error('El clean plate no admite --model, --quality ni --seed.')
  },
  pickSize: () => () => ({ width: plate.width, height: plate.height }),
  async estimate() {
    return { usd: 0, basis: `clean plate local (${plate.source}); sin proveedor` }
  },
  async run({ size }) {
    if (size.width !== plate.width || size.height !== plate.height) {
      throw new Error('El clean plate se usa sobre la imagen completa: corre con --crop off.')
    }

    return { image: plate.png, providerModel: 'clean-plate', outputUsd: 0, usage: null, meta: { source: plate.source } }
  }
})

export interface ErasureReport {
  /** Diferencia media (0–255) entre la original y el resultado en el NÚCLEO de la zona: bajo = el objeto sigue ahí. */
  changeInCore: number
  corePixels: number
  /**
   * Con clean plate: distancia del resultado al fondo limpio, relativa a la del objeto original (0 = es el fondo,
   * 1 = tan lejos del fondo como el objeto). Alto = el modelo dibujó OTRA cosa en vez del fondo. null sin plate.
   */
  objectLikeness: number | null
  residueSuspected: boolean
}

/** Sobre esta semejanza a objeto, el modelo dibujó algo en vez de borrar (canario 2026-10-03: Flux Fill puso otra taza). */
export const ERASE_OBJECT_LIKENESS_THRESHOLD = 0.5

/** Prompt por defecto para borrar con un modelo de RELLENO: describe el fondo vacío; «quita el objeto» no le dice qué dibujar. */
export const ERASE_FILL_PROMPT =
  'The empty background continues naturally: the same wall, the same surface, its texture and light, with nothing placed on it. No objects, no cups, no props.'

/** Bajo este cambio medio en el núcleo de la zona, el objeto probablemente no se borró. */
export const ERASE_RESIDUE_THRESHOLD = 18

/** Mide si el borrado ocurrió: sólo el núcleo de la máscara (255), donde estaba el objeto. */
export const measureErasure = (base: RgbaImage, final: RgbaImage, mask: CanonicalMask, plate?: RgbaImage): ErasureReport => {
  let sum = 0
  let toPlate = 0
  let objectToPlate = 0
  let count = 0

  for (let i = 0; i < mask.data.length; i += 1) {
    if (mask.data[i] !== 255) continue

    for (let c = 0; c < 3; c += 1) {
      sum += Math.abs(base.data[i * 4 + c] - final.data[i * 4 + c])

      if (plate) {
        toPlate += Math.abs(final.data[i * 4 + c] - plate.data[i * 4 + c])
        objectToPlate += Math.abs(base.data[i * 4 + c] - plate.data[i * 4 + c])
      }
    }

    count += 1
  }

  const changeInCore = count ? Math.round((sum / (count * 3)) * 100) / 100 : 0
  // Cambiar no es borrar: un modelo de relleno puede dibujar otro objeto (cambio alto, objeto presente).
  const objectLikeness = plate && objectToPlate > 0 ? Math.round((toPlate / objectToPlate) * 100) / 100 : null
  const residueSuspected = count > 0 && (changeInCore < ERASE_RESIDUE_THRESHOLD || (objectLikeness !== null && objectLikeness > ERASE_OBJECT_LIKENESS_THRESHOLD))

  return { changeInCore, corePixels: count, objectLikeness, residueSuspected }
}
