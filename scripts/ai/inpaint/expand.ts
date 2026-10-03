import sharp from 'sharp'

import { createMask, type CanonicalMask } from './mask'
import { readRaw, type RgbaImage } from './raw'

/**
 * Expandir el lienzo (outpaint) sobre el núcleo de inpainting (TASK-1973, Slice 1).
 *
 * Es inpainting al revés: la zona editable es el ÁREA NUEVA del lienzo y la protegida es la escena. Una franja de
 * fundido de `blend` px sobre los bordes de la escena que dan al área nueva se deja editable con degradado, para que
 * la unión no se note; el interior de la escena queda en delta 0 (lo verifica el núcleo).
 *
 * El área nueva se rellena antes con ESPEJO de los bordes de la escena: un relleno sólido invita al modelo a inventar
 * un panel plano (medido; ver `.claude/rules/brand-photography.md`, «Editar con otro aspect ratio»).
 */
export const FORMAT_RATIOS: Readonly<Record<string, number>> = {
  '4:5': 4 / 5,
  '9:16': 9 / 16,
  '1:1': 1,
  '1.91:1': 1.91,
  '16:9': 16 / 9,
  '3:4': 3 / 4,
  '2:3': 2 / 3,
  '3:2': 3 / 2
}

export type ExpandAnchor = 'center' | 'left' | 'right' | 'top' | 'bottom'

export interface ExpansionPlan {
  canvas: { width: number; height: number }
  /** Dónde queda la escena dentro del lienzo, ya escalada. */
  scene: { left: number; top: number; width: number; height: number }
  scale: number
}

const even = (value: number) => Math.max(2, Math.round(value / 2) * 2)

/**
 * Lienzo destino y ubicación de la escena. Con `to`, el lienzo es el más chico de esa proporción que contiene la
 * escena a escala 1 (crece sólo en un eje); `canvas` lo fija explícito. `scale` < 1 achica la escena dentro del lienzo
 * (zoom out: más área nueva, y la escena se re-muestrea).
 */
export const planExpansion = (params: {
  sourceWidth: number
  sourceHeight: number
  to?: string
  canvas?: { width: number; height: number }
  scale?: number
  anchor?: ExpandAnchor
}): ExpansionPlan => {
  const { sourceWidth: sw, sourceHeight: sh } = params
  const scale = params.scale ?? 1

  if (!(scale > 0.3 && scale <= 1)) throw new Error('--scale debe estar entre 0,3 y 1.')

  let canvas = params.canvas

  if (!canvas) {
    const ratio = params.to ? FORMAT_RATIOS[params.to] : undefined

    if (!ratio) throw new Error(`Formato desconocido: "${params.to}". Válidos: ${Object.keys(FORMAT_RATIOS).join(', ')} (o --canvas WxH).`)

    canvas = ratio > sw / sh ? { width: even(sh * ratio), height: sh } : { width: sw, height: even(sw / ratio) }
  }

  // La escena entra entera en el lienzo y se achica por `scale`.
  const fit = Math.min(canvas.width / sw, canvas.height / sh) * scale
  const width = Math.min(canvas.width, Math.round(sw * fit))
  const height = Math.min(canvas.height, Math.round(sh * fit))
  const anchor = params.anchor ?? 'center'
  const left = anchor === 'left' ? 0 : anchor === 'right' ? canvas.width - width : Math.round((canvas.width - width) / 2)
  const top = anchor === 'top' ? 0 : anchor === 'bottom' ? canvas.height - height : Math.round((canvas.height - height) / 2)

  if (width === canvas.width && height === canvas.height) throw new Error('La escena ya llena el lienzo: no hay nada que expandir (cambia --to, --canvas o baja --scale).')

  return { canvas, scene: { left, top, width, height }, scale: Math.round(fit * 10_000) / 10_000 }
}

/** Reflejo de un índice en [0, n): período 2n (espejo sin repetir el borde). */
const reflect = (index: number, n: number) => {
  const period = 2 * n
  const t = ((index % period) + period) % period

  return t < n ? t : period - 1 - t
}

/** Lienzo con la escena ubicada y el área nueva rellena con espejo de sus bordes (`mirror`) o con su color medio (`neutral`). */
export const buildExpandedCanvas = async (source: RgbaImage, plan: ExpansionPlan, fill: 'mirror' | 'neutral' = 'mirror'): Promise<RgbaImage> => {
  const { scene, canvas } = plan

  const placed =
    scene.width === source.width && scene.height === source.height
      ? source
      : {
          ...(await readRaw(
            sharp(Buffer.from(source.data.buffer, source.data.byteOffset, source.data.length), { raw: { width: source.width, height: source.height, channels: 4 } }).resize(
              scene.width,
              scene.height,
              { fit: 'fill', kernel: 'lanczos3' }
            ),
            4,
            'escena reescalada'
          )),
          channels: 4 as const,
          hadAlpha: source.hadAlpha
        }

  const out = new Uint8Array(canvas.width * canvas.height * 4)
  const mean = [0, 0, 0, 0]

  if (fill === 'neutral') {
    for (let i = 0; i < placed.data.length; i += 4) for (let c = 0; c < 4; c += 1) mean[c] += placed.data[i + c]
    for (let c = 0; c < 4; c += 1) mean[c] = Math.round(mean[c] / (placed.width * placed.height))
  }

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const sx = x - scene.left
      const sy = y - scene.top
      const inside = sx >= 0 && sy >= 0 && sx < scene.width && sy < scene.height
      const o = (y * canvas.width + x) * 4

      if (!inside && fill === 'neutral') {
        out.set(mean, o)
        continue
      }

      const i = (reflect(sy, scene.height) * scene.width + reflect(sx, scene.width)) * 4

      out.set(placed.data.subarray(i, i + 4), o)
    }
  }

  return { width: canvas.width, height: canvas.height, channels: 4, hadAlpha: source.hadAlpha, data: out }
}

/**
 * Máscara de expansión: el área nueva editable (255), el interior de la escena protegido (0) y una franja de `blend` px
 * con degradado SÓLO en los bordes de la escena que dan al área nueva (un borde pegado al lienzo no se toca).
 */
export const expansionMask = (plan: ExpansionPlan, blend = 24): CanonicalMask => {
  const { canvas, scene } = plan
  const mask = createMask(canvas.width, canvas.height, 255)

  const edges = {
    left: scene.left > 0,
    right: scene.left + scene.width < canvas.width,
    top: scene.top > 0,
    bottom: scene.top + scene.height < canvas.height
  }

  for (let y = scene.top; y < scene.top + scene.height; y += 1) {
    for (let x = scene.left; x < scene.left + scene.width; x += 1) {
      const distances = [
        edges.left ? x - scene.left : Infinity,
        edges.right ? scene.left + scene.width - 1 - x : Infinity,
        edges.top ? y - scene.top : Infinity,
        edges.bottom ? scene.top + scene.height - 1 - y : Infinity
      ]

      const d = Math.min(...distances)

      mask.data[y * canvas.width + x] = d >= blend ? 0 : Math.round(255 * (1 - d / blend))
    }
  }

  return mask
}
