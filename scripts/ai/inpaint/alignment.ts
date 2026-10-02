import sharp from 'sharp'

import type { CanonicalMask } from './mask'
import { readRaw, type RgbaImage } from './raw'

/**
 * Detector de reencuadre (TASK-1965).
 *
 * Por qué no basta la diferencia media: en el canario del 2026-10-02, Sunburst sin máscara acercó la cámara y movió
 * la taza y el cuaderno, y la diferencia media de la zona protegida fue sólo 8,5/255 —una pared lisa y madera cambian
 * poco aunque todo se haya corrido—. Se comparan BORDES: se busca el desplazamiento y la escala que mejor alinean los
 * gradientes de la salida con los de la base en la zona protegida. Si el mejor ajuste no es «quieto» y mejora claro
 * sobre el «quieto», el modelo reencuadró y recomponer pega una zona que no corresponde.
 */
export interface AlignmentEstimate {
  /** Desplazamiento estimado en píxeles de la imagen original. */
  dx: number
  dy: number
  scale: number
  /** Error de bordes con el modelo «quieto» y con el mejor ajuste (menor es mejor). */
  stillError: number
  bestError: number
  misaligned: boolean
}

const WORK_WIDTH = 192

const gradients = async (image: RgbaImage, width: number, height: number): Promise<Float32Array> => {
  const gray = await readRaw(
    sharp(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.length), { raw: { width: image.width, height: image.height, channels: 4 } })
      .resize(width, height, { fit: 'fill' })
      .toColourspace('b-w'),
    1,
    'gris para alineación'
  )

  const out = new Float32Array(width * height)

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x
      const gx = gray.data[i + 1] - gray.data[i - 1]
      const gy = gray.data[i + width] - gray.data[i - width]

      out[i] = Math.sqrt(gx * gx + gy * gy)
    }
  }

  return out
}

export const estimateAlignment = async (base: RgbaImage, generated: RgbaImage, mask: CanonicalMask): Promise<AlignmentEstimate> => {
  const width = Math.min(WORK_WIDTH, base.width)
  const height = Math.max(8, Math.round((base.height / base.width) * width))
  const [gb, gg] = await Promise.all([gradients(base, width, height), gradients(generated, width, height)])
  const protectedAt: number[] = []

  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      const mx = Math.min(mask.width - 1, Math.round((x / width) * mask.width))
      const my = Math.min(mask.height - 1, Math.round((y / height) * mask.height))

      if (mask.data[my * mask.width + mx] === 0) protectedAt.push(y * width + x)
    }
  }

  if (protectedAt.length < 50) return { dx: 0, dy: 0, scale: 1, stillError: 0, bestError: 0, misaligned: false }

  const cx = width / 2
  const cy = height / 2

  const errorFor = (dx: number, dy: number, scale: number) => {
    let sum = 0
    let count = 0

    for (const index of protectedAt) {
      const x = index % width
      const y = (index - x) / width
      const sx = Math.round((x - cx) * scale + cx + dx)
      const sy = Math.round((y - cy) * scale + cy + dy)

      if (sx < 1 || sy < 1 || sx >= width - 1 || sy >= height - 1) continue

      sum += Math.abs(gb[index] - gg[sy * width + sx])
      count += 1
    }

    return count > protectedAt.length * 0.6 ? sum / count : Number.POSITIVE_INFINITY
  }

  const stillError = errorFor(0, 0, 1)
  let best = { dx: 0, dy: 0, scale: 1, error: stillError }
  const range = Math.round(width * 0.08)

  for (let scale = 0.88; scale <= 1.121; scale += 0.02) {
    for (let dy = -range; dy <= range; dy += 1) {
      for (let dx = -range; dx <= range; dx += 1) {
        const error = errorFor(dx, dy, scale)

        if (error < best.error) best = { dx, dy, scale, error }
      }
    }
  }

  const moved = Math.abs(best.dx) > 1 || Math.abs(best.dy) > 1 || Math.abs(best.scale - 1) > 0.015
  const ratio = base.width / width

  return {
    dx: Math.round(best.dx * ratio),
    dy: Math.round(best.dy * ratio),
    scale: Math.round(best.scale * 1000) / 1000,
    stillError: Math.round(stillError * 100) / 100,
    bestError: Math.round(best.error * 100) / 100,
    // Reencuadre = el mejor ajuste no es quieto Y explica los bordes claramente mejor (15 %).
    misaligned: moved && best.error < stillError * 0.85
  }
}

/**
 * Guía automática cuando la máscara no viaja (Sunburst): la base con el CONTORNO de la zona en magenta, que el modelo
 * recibe como imagen 2 de posición. Sin ella, Sunburst no sabe dónde va el objeto (canario 2026-10-02: lo puso en otro
 * lugar y reencuadró). Es el equivalente automático de la selección de ChatGPT.
 */
export const renderZoneGuide = (image: RgbaImage, mask: CanonicalMask, thickness = 4): RgbaImage => {
  const out = new Uint8Array(image.data)
  const { width, height } = mask
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask.data[y * width + x] > 127

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!inside(x, y)) continue

      let edge = false

      for (let d = 1; d <= thickness && !edge; d += 1) edge = !inside(x - d, y) || !inside(x + d, y) || !inside(x, y - d) || !inside(x, y + d)

      if (!edge) continue

      const i = (y * width + x) * 4

      out[i] = 255
      out[i + 1] = 0
      out[i + 2] = 255
    }
  }

  return { ...image, data: out }
}
