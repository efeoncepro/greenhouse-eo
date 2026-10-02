import { createMask, dilate, erode, feather, maskFromRect, maskStats, union, type CanonicalMask } from './mask'
import { loadRgba, type RgbaImage } from './raw'

/**
 * Edición guiada por boceto y por referencias (TASK-1965), el equivalente por API del «Markup» de ChatGPT: se dibuja
 * sobre la foto dónde, de qué tamaño y con qué silueta va el cambio, y el boceto viaja como IMAGEN DE REFERENCIA, no
 * como máscara. En la API no existe un parámetro «sketch»: el dibujo es una imagen de entrada más (guía de OpenAI de
 * imágenes y de prompting, leída 2026-10-02). La máscara para recomponer se deriva del trazo.
 *
 * Dos formas de boceto, ambas del tamaño de la base:
 * - overlay: PNG con fondo transparente y sólo los trazos;
 * - anotada: la misma foto con los trazos dibujados encima (sin alfa); los trazos se detectan por diferencia con la base.
 */
export interface LoadedSketch {
  /** La base con el boceto encima: la imagen 2 que ve el modelo. */
  guide: RgbaImage
  /** Píxeles del trazo (255 = trazo). */
  strokes: CanonicalMask
  form: 'overlay' | 'annotated'
}

/** Diferencia mínima (máximo por canal) para que un píxel de una foto anotada cuente como trazo. */
export const SKETCH_DIFF_THRESHOLD = 40

export const loadSketch = async (sketchPath: string, base: RgbaImage): Promise<LoadedSketch> => {
  const sketch = await loadRgba(sketchPath, 'boceto')

  if (sketch.width !== base.width || sketch.height !== base.height) {
    throw new Error(`El boceto mide ${sketch.width}x${sketch.height} y la base ${base.width}x${base.height}: deben medir lo mismo.`)
  }

  const strokes = createMask(base.width, base.height)
  const guide = new Uint8Array(base.data)
  let transparent = 0

  for (let i = 0; i < strokes.data.length; i += 1) if (sketch.data[i * 4 + 3] < 250) transparent += 1

  const form: LoadedSketch['form'] = sketch.hadAlpha && transparent > strokes.data.length * 0.5 ? 'overlay' : 'annotated'

  for (let i = 0; i < strokes.data.length; i += 1) {
    if (form === 'overlay') {
      const alpha = sketch.data[i * 4 + 3]

      if (alpha <= 16) continue

      strokes.data[i] = 255

      for (let c = 0; c < 3; c += 1) guide[i * 4 + c] = Math.round((sketch.data[i * 4 + c] * alpha + base.data[i * 4 + c] * (255 - alpha)) / 255)
    } else {
      let delta = 0

      for (let c = 0; c < 3; c += 1) delta = Math.max(delta, Math.abs(sketch.data[i * 4 + c] - base.data[i * 4 + c]))

      if (delta > SKETCH_DIFF_THRESHOLD) strokes.data[i] = 255

      for (let c = 0; c < 3; c += 1) guide[i * 4 + c] = sketch.data[i * 4 + c]
    }
  }

  if (maskStats(strokes).editable === 0) throw new Error('El boceto no tiene trazos: dibuja la silueta o la caja donde va el cambio.')

  return { guide: { ...base, data: guide }, strokes, form }
}

/**
 * Máscara para recomponer desde el trazo: la caja del boceto con `margin` px de holgura (el modelo suele dibujar el
 * objeto algo más grande que la silueta: en el canario las hojas salían del borde) y borde difuminado.
 */
export const maskFromSketch = async (strokes: CanonicalMask, margin = 40, featherPx = 24): Promise<CanonicalMask> => {
  const box = maskStats(strokes).bbox

  if (!box) throw new Error('El boceto no tiene trazos.')

  const x0 = Math.max(0, box.left - margin) / strokes.width
  const y0 = Math.max(0, box.top - margin) / strokes.height
  const x1 = Math.min(strokes.width, box.left + box.width + margin) / strokes.width
  const y1 = Math.min(strokes.height, box.top + box.height + margin) / strokes.height

  return feather(maskFromRect(strokes.width, strokes.height, { x0, y0, x1, y1 }), featherPx)
}

/**
 * Hace crecer una máscara DERIVADA hasta cubrir el objeto que el modelo dibujó de verdad (TASK-1965). Caso fuente:
 * canario 2026-10-02, Sunburst dibujó el helecho de la referencia más grande que el boceto y la caja del trazo + 40 px
 * le cortó las hojas. Se agregan los píxeles donde la salida (ya con el color corregido) difiere fuerte de la base,
 * SÓLO dentro de una ventana alrededor de la zona original, se cierran huecos y se difumina. Nunca se aplica a una
 * máscara que el operador pasó explícita.
 */
export const growMaskToObject = async (
  base: RgbaImage,
  generated: RgbaImage,
  mask: CanonicalMask,
  options: { threshold?: number; windowFraction?: number; featherPx?: number } = {}
): Promise<{ mask: CanonicalMask; addedPixels: number }> => {
  const box = maskStats(mask).bbox

  if (!box) return { mask, addedPixels: 0 }

  const threshold = options.threshold ?? 40
  const pad = Math.round(Math.max(box.width, box.height) * (options.windowFraction ?? 0.5))
  const x0 = Math.max(0, box.left - pad)
  const y0 = Math.max(0, box.top - pad)
  const x1 = Math.min(mask.width, box.left + box.width + pad)
  const y1 = Math.min(mask.height, box.top + box.height + pad)
  const changed = createMask(mask.width, mask.height)

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = y * mask.width + x
      let delta = 0

      for (let c = 0; c < 3; c += 1) delta = Math.max(delta, Math.abs(generated.data[i * 4 + c] - base.data[i * 4 + c]))

      if (delta > threshold) changed.data[i] = 255
    }
  }

  // Cerrar: dilatar y erosionar une las hojas sueltas al cuerpo; luego margen y borde suave.
  const closed = erode(dilate(changed, 6), 6)
  const grown = await feather(dilate(union(mask, closed), 10), options.featherPx ?? 16)
  const merged = { ...grown, data: grown.data.map((value, i) => Math.max(value, mask.data[i])) }
  let added = 0

  for (let i = 0; i < merged.data.length; i += 1) if (merged.data[i] > 0 && mask.data[i] === 0) added += 1

  return { mask: merged, addedPixels: added }
}

/**
 * Preámbulo con el rol de cada imagen, como pide la guía de prompting de 2.5 («Identify each input by number and
 * purpose»; «Place the X from image 2 into image 1… Do not change anything else»). Sólo se agrega cuando hay boceto o
 * referencias; el prompt del operador va después, intacto.
 */
export const buildRolePrompt = (params: { prompt: string; hasSketch: boolean; referenceCount: number; zoneGuide?: boolean }): string => {
  if (!params.hasSketch && !params.zoneGuide && params.referenceCount === 0) return params.prompt

  const lines = ['Image 1 is the photo to edit; the result keeps its framing.']
  let index = 2

  if (params.zoneGuide && !params.hasSketch) {
    lines.push(
      `Image ${index} is the same photo with a magenta outline that marks the exact area where the change goes. Put the change inside that outline only, keep the same camera position and framing as image 1, and do not reproduce the outline.`
    )
    index += 1
  }

  if (params.hasSketch) {
    lines.push(
      `Image ${index} is the same photo with a hand-drawn sketch that marks only where, at what size and with what silhouette the change goes. Use it as a placement guide only: do not reproduce any sketch lines or their color.`
    )
    index += 1
  }

  for (let r = 0; r < params.referenceCount; r += 1) {
    lines.push(`Image ${index} is a reference of the object or element to bring into image 1; match its look, shape and material.`)
    index += 1
  }

  lines.push(params.prompt.trim())
  lines.push('Change only that area. Preserve the framing, camera angle, lighting, color temperature and every other object of image 1 exactly. Do not add text or logos.')

  return lines.join('\n')
}
