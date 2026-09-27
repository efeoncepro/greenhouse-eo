/**
 * Materializador de fotos de Glitch (TASK-1923).
 *
 * - Duotono navy de la falla en bytes: luminancia → mezcla entre `glitchLine.bytes.duotone.from` y `.to` (valores del
 *   token, nunca literales). La foto de la lente conserva su color (`treatment: 'color'`).
 * - Pre-rasterizado al tamaño EXACTO del hueco × deviceScaleFactor, PNG sin perfil embebido: Chromium hace blit 1:1 sin
 *   re-muestrear (mitigación de ISSUE-122).
 * - Devuelve el SHA-256 de la foto procesada (la semilla de la falla) y las muestras de color del borde, una por
 *   posición de la cuadrícula de la falla.
 */

import { createHash } from 'node:crypto'

import sharp from 'sharp'

import { glitchLine } from '@efeoncepro/axis-tokens'

import type { FractureEdge } from '../../src/lib/glitch-composition/byte-fracture'

const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
const hex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`

export interface ProcessedPhoto {
  png: Buffer
  sha256: string
  dataUri: string
  width: number
  height: number
}

export const processPhoto = async (input: Buffer, fit: { width: number; height: number }, treatment: 'duotone' | 'color', scale = 1): Promise<ProcessedPhoto> => {
  const width = Math.round(fit.width * scale)
  const height = Math.round(fit.height * scale)
  const resized = sharp(input).rotate().resize(width, height, { fit: 'cover', position: 'attention' }).removeAlpha()
  let png: Buffer

  if (treatment === 'color') {
    png = await resized.png({ compressionLevel: 9 }).toBuffer()
  } else {
    const { data } = await resized.grayscale().raw().toBuffer({ resolveWithObject: true })
    const [from, to] = [rgb(glitchLine.bytes.duotone.from), rgb(glitchLine.bytes.duotone.to)]
    const out = Buffer.alloc(width * height * 3)

    for (let p = 0; p < width * height; p++) {
      const t = data[p] / 255

      for (let k = 0; k < 3; k++) out[p * 3 + k] = Math.round(from[k] + (to[k] - from[k]) * t)
    }

    png = await sharp(out, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9 }).toBuffer()
  }

  const sha256 = createHash('sha256').update(png).digest('hex')

  return { png, sha256, dataUri: `data:image/png;base64,${png.toString('base64')}`, width, height }
}

/** Color medio del borde de la foto procesada en cada posición de la cuadrícula de la falla (en px CSS). */
export const sampleEdge = async (photo: ProcessedPhoto, edge: FractureEdge, samples: number, cell: number, pitch: number, scale = 1): Promise<string[]> => {
  const { data, info } = await sharp(photo.png).raw().toBuffer({ resolveWithObject: true })

  const px = (x: number, y: number) => {
    const i = (Math.min(info.height - 1, y) * info.width + Math.min(info.width - 1, x)) * info.channels

    return [data[i], data[i + 1], data[i + 2]]
  }

  const s = (n: number) => Math.round(n * scale)
  const out: string[] = []

  for (let i = 0; i < samples; i++) {
    const acc = [0, 0, 0]
    let n = 0
    const start = s(1 + i * pitch)
    const len = s(cell)

    for (let a = start; a < start + len; a += 2) {
      for (let d = 0; d < len; d += 2) {
        const [x, y] =
          edge === 'bottom' ? [a, info.height - 1 - d] : edge === 'left' ? [d, a] : [info.width - 1 - d, a]

        const c = px(x, y)

        acc[0] += c[0]
        acc[1] += c[1]
        acc[2] += c[2]
        n++
      }
    }

    out.push(hex(acc.map((v) => v / n)))
  }

  return out
}

/**
 * Detalle a color de la lente: la foto al tamaño del hueco (color), un corte centrado en la región del detalle y el
 * zoom de la lente de La órbita (1,25), entregado al diámetro exacto del recorte.
 */
export const processLensDetail = async (
  input: Buffer,
  fit: { width: number; height: number },
  region: { x: number; y: number; w: number; h: number },
  diameter: number,
  zoom = 1.25,
  scale = 1
): Promise<ProcessedPhoto> => {
  const base = await sharp(input).rotate().resize(fit.width, fit.height, { fit: 'cover', position: 'attention' }).removeAlpha().png().toBuffer()
  const side = Math.round(diameter / zoom)
  const cx = (region.x + region.w / 2) * fit.width
  const cy = (region.y + region.h / 2) * fit.height
  const left = Math.max(0, Math.min(fit.width - side, Math.round(cx - side / 2)))
  const top = Math.max(0, Math.min(fit.height - side, Math.round(cy - side / 2)))
  const size = Math.round(diameter * scale)

  const png = await sharp(base)
    .extract({ left, top, width: side, height: side })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()

  const sha256 = createHash('sha256').update(png).digest('hex')

  return { png, sha256, dataUri: `data:image/png;base64,${png.toString('base64')}`, width: size, height: size }
}
