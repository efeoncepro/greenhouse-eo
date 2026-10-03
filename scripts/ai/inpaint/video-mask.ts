import { readFile } from 'node:fs/promises'

import { dilate, feather, loadMask, maskFromPolygon, maskFromRect, type CanonicalMask, type MaskConvention } from './mask'

/**
 * Máscara de video (TASK-1965): fija (cámara quieta, un PNG del tamaño del video) o por keyframes interpolados.
 *
 * Archivo de keyframes (fracciones del cuadro, tiempo en segundos):
 *   { "keyframes": [ { "t": 0, "rect": [0.1, 0.2, 0.4, 0.7] }, { "t": 3, "rect": [0.3, 0.2, 0.6, 0.7] } ],
 *     "dilate": 0, "feather": 16 }
 * o con `polygon: [[x,y], …]`, con el MISMO número de puntos en todos los keyframes. Antes del primero y después del
 * último, la máscara se queda quieta. El seguimiento automático de objetos (SAM 2) es un follow-up.
 */
export interface MaskKeyframe {
  t: number
  rect?: [number, number, number, number]
  polygon?: Array<[number, number]>
}

export interface KeyframeSpec {
  keyframes: MaskKeyframe[]
  dilate?: number
  feather?: number
}

export type VideoMaskSource = { kind: 'static'; path: string; convention: MaskConvention } | { kind: 'keyframes'; path: string }

export interface VideoMask {
  /** Máscara del cuadro en el segundo `t`. Cacheada por cuadro cuando es fija. */
  at(seconds: number): Promise<CanonicalMask>
  /** Huella del contenido para el hash de la corrida. */
  fingerprint: string
  isStatic: boolean
}

export const validateKeyframes = (spec: KeyframeSpec): MaskKeyframe[] => {
  if (!Array.isArray(spec.keyframes) || spec.keyframes.length === 0) throw new Error('El archivo de keyframes necesita "keyframes" con al menos uno.')

  const sorted = [...spec.keyframes].sort((a, b) => a.t - b.t)
  const shape = sorted[0].rect ? 'rect' : sorted[0].polygon ? 'polygon' : null

  if (!shape) throw new Error('Cada keyframe declara "rect" o "polygon".')

  for (const keyframe of sorted) {
    if (!Number.isFinite(keyframe.t) || keyframe.t < 0) throw new Error(`Keyframe con t inválido: ${keyframe.t}.`)
    if (shape === 'rect' && keyframe.rect?.length !== 4) throw new Error('Todos los keyframes deben usar "rect" de 4 números.')

    if (shape === 'polygon' && keyframe.polygon?.length !== sorted[0].polygon!.length) {
      throw new Error('Todos los keyframes de polígono deben tener el mismo número de puntos.')
    }
  }

  return sorted
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Forma interpolada en el segundo `t` (pura, probada sin imágenes). */
export const shapeAt = (keyframes: MaskKeyframe[], seconds: number): MaskKeyframe => {
  if (seconds <= keyframes[0].t) return keyframes[0]

  const last = keyframes[keyframes.length - 1]

  if (seconds >= last.t) return last

  const nextIndex = keyframes.findIndex(keyframe => keyframe.t > seconds)
  const a = keyframes[nextIndex - 1]
  const b = keyframes[nextIndex]
  const k = (seconds - a.t) / (b.t - a.t)

  if (a.rect && b.rect) return { t: seconds, rect: a.rect.map((value, i) => lerp(value, b.rect![i], k)) as MaskKeyframe['rect'] }

  return { t: seconds, polygon: a.polygon!.map(([x, y], i) => [lerp(x, b.polygon![i][0], k), lerp(y, b.polygon![i][1], k)]) }
}

export const loadVideoMask = async (source: VideoMaskSource, width: number, height: number): Promise<VideoMask> => {
  if (source.kind === 'static') {
    const mask = await loadMask(source.path, source.convention)

    if (mask.width !== width || mask.height !== height) {
      throw new Error(`La máscara mide ${mask.width}x${mask.height} y el video ${width}x${height}: deben medir lo mismo.`)
    }

    const { sha256 } = await import('./run-io')

    return { at: async () => mask, fingerprint: sha256(mask.data), isStatic: true }
  }

  const raw = await readFile(source.path, 'utf8')
  const spec = JSON.parse(raw) as KeyframeSpec
  const keyframes = validateKeyframes(spec)
  const cache = new Map<string, CanonicalMask>()

  return {
    isStatic: keyframes.length === 1,
    fingerprint: raw,
    async at(seconds) {
      const shape = shapeAt(keyframes, seconds)
      const key = JSON.stringify(shape.rect ?? shape.polygon)
      const cached = cache.get(key)

      if (cached) return cached

      const [x0, y0, x1, y1] = shape.rect ?? [0, 0, 0, 0]
      const base = shape.rect ? maskFromRect(width, height, { x0, y0, x1, y1 }) : maskFromPolygon(width, height, shape.polygon!)
      const mask = await feather(dilate(base, spec.dilate ?? 0), spec.feather ?? 0)

      cache.set(key, mask)

      return mask
    }
  }
}
