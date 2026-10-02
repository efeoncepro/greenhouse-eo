import sharp from 'sharp'

import type { CanonicalMask, PixelBox } from './mask'
import { cloneRgba, readRaw, type RgbaImage } from './raw'

/**
 * Recomposición y verificación (TASK-1965).
 *
 * Por qué es obligatoria: ningún proveedor preserva lo que está fuera de la máscara. Medido 2026-09-17 con GPT Image
 * 2.5: la zona protegida cambió hasta 221/255 con media 4,85. La garantía la da este paso, no el modelo: la salida
 * entra SÓLO donde la máscara abre, con su degradado, y donde la máscara vale 0 queda el byte original.
 */
export class RecomposeError extends Error {}

const assertSameSize = (a: { width: number; height: number }, b: { width: number; height: number }, label: string) => {
  if (a.width !== b.width || a.height !== b.height) {
    throw new RecomposeError(`${label}: ${a.width}x${a.height} vs ${b.width}x${b.height}.`)
  }
}

/**
 * Mezcla `generated` sobre `base` con el peso de la máscara. Con peso 0 el resultado es exactamente el byte de la
 * base (aritmética entera: base·255/255), así que la zona protegida queda idéntica bit a bit por construcción.
 */
export const recompose = (base: RgbaImage, generated: RgbaImage, mask: CanonicalMask): RgbaImage => {
  assertSameSize(base, generated, 'La salida del modelo no mide lo mismo que la base')
  assertSameSize(base, mask, 'La máscara no mide lo mismo que la base')

  const out = cloneRgba(base)

  for (let i = 0; i < mask.data.length; i += 1) {
    const weight = mask.data[i]

    if (weight === 0) continue

    for (let c = 0; c < 4; c += 1) {
      const index = i * 4 + c

      out.data[index] = weight === 255 ? generated.data[index] : Math.round((base.data[index] * (255 - weight) + generated.data[index] * weight) / 255)
    }
  }

  return out
}

/** Copia de la base con `patch` (del tamaño de `box`) pegado en `box`. */
export const placePatch = (base: RgbaImage, patch: RgbaImage, box: PixelBox): RgbaImage => {
  if (patch.width !== box.width || patch.height !== box.height) {
    throw new RecomposeError(`El parche mide ${patch.width}x${patch.height} y la caja ${box.width}x${box.height}.`)
  }

  if (box.left < 0 || box.top < 0 || box.left + box.width > base.width || box.top + box.height > base.height) {
    throw new RecomposeError('La caja del parche se sale de la base.')
  }

  const out = cloneRgba(base)

  for (let y = 0; y < box.height; y += 1) {
    const from = y * box.width * 4

    out.data.set(patch.data.subarray(from, from + box.width * 4), ((box.top + y) * base.width + box.left) * 4)
  }

  return out
}

/** Recorta una caja de una imagen RGBA. */
export const cropRgba = (image: RgbaImage, box: PixelBox): RgbaImage => {
  const data = new Uint8Array(box.width * box.height * 4)

  for (let y = 0; y < box.height; y += 1) {
    const from = ((box.top + y) * image.width + box.left) * 4

    data.set(image.data.subarray(from, from + box.width * 4), y * box.width * 4)
  }

  return { width: box.width, height: box.height, channels: 4, hadAlpha: image.hadAlpha, data }
}

/** Reescala una imagen RGBA a un tamaño exacto (la salida del proveedor al tamaño de la caja). */
export const resizeRgba = async (image: RgbaImage, width: number, height: number): Promise<RgbaImage> => {
  if (image.width === width && image.height === height) return image

  const raw = await readRaw(
    sharp(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.length), { raw: { width: image.width, height: image.height, channels: 4 } }).resize(width, height, {
      fit: 'fill',
      kernel: 'lanczos3'
    }),
    4,
    'imagen reescalada'
  )

  return { ...raw, channels: 4, hadAlpha: image.hadAlpha }
}

export interface ZoneDelta {
  pixels: number
  /** Máxima diferencia absoluta en cualquier canal (0–255). */
  maxDelta: number
  meanDelta: number
  worst: { x: number; y: number } | null
}

export interface VerificationReport {
  verdict: 'PASS' | 'FAIL'
  reason: string
  /** Máscara = 0: debe quedar idéntica. */
  protected: ZoneDelta
  /** Máscara = 255: lo que cambió el modelo. */
  editable: ZoneDelta
  /** Máscara intermedia: la costura. */
  seam: ZoneDelta
}

const emptyZone = (): ZoneDelta & { sum: number } => ({ pixels: 0, maxDelta: 0, meanDelta: 0, worst: null, sum: 0 })

/** Diferencias por zona entre dos imágenes del mismo tamaño. */
export const measureZones = (base: RgbaImage, candidate: RgbaImage, mask: CanonicalMask): Pick<VerificationReport, 'protected' | 'editable' | 'seam'> => {
  assertSameSize(base, candidate, 'Comparación')
  assertSameSize(base, mask, 'Comparación con máscara')

  const zones = { protected: emptyZone(), editable: emptyZone(), seam: emptyZone() }

  for (let i = 0; i < mask.data.length; i += 1) {
    let delta = 0

    for (let c = 0; c < 4; c += 1) delta = Math.max(delta, Math.abs(base.data[i * 4 + c] - candidate.data[i * 4 + c]))

    const zone = mask.data[i] === 0 ? zones.protected : mask.data[i] === 255 ? zones.editable : zones.seam

    zone.pixels += 1
    zone.sum += delta

    if (delta > zone.maxDelta) {
      zone.maxDelta = delta
      zone.worst = { x: i % base.width, y: Math.floor(i / base.width) }
    }
  }

  const finish = ({ sum, ...zone }: ZoneDelta & { sum: number }): ZoneDelta => ({ ...zone, meanDelta: zone.pixels ? Math.round((sum / zone.pixels) * 1000) / 1000 : 0 })

  return { protected: finish(zones.protected), editable: finish(zones.editable), seam: finish(zones.seam) }
}

/**
 * Veredicto: la zona protegida exige delta MÁXIMO 0. La media no sirve como criterio: un objeto chico mueve muy poco el
 * promedio (manual «editar una zona», §4).
 */
export const verifyRecomposition = (base: RgbaImage, final: RgbaImage, mask: CanonicalMask): VerificationReport => {
  const zones = measureZones(base, final, mask)

  if (zones.protected.pixels === 0) {
    return { verdict: 'PASS', reason: 'la máscara no deja zona protegida (pedido explícito con --allow-full)', ...zones }
  }

  if (zones.protected.maxDelta === 0) return { verdict: 'PASS', reason: 'zona protegida idéntica bit a bit', ...zones }

  const at = zones.protected.worst ? ` en (${zones.protected.worst.x}, ${zones.protected.worst.y})` : ''

  return { verdict: 'FAIL', reason: `la zona protegida cambió: delta máximo ${zones.protected.maxDelta}/255${at}`, ...zones }
}

/** Diferencia amplificada ×8 para mirar dónde cambió algo. */
export const renderDiff = (base: RgbaImage, candidate: RgbaImage): Promise<Buffer> => {
  assertSameSize(base, candidate, 'Diff')

  const out = Buffer.alloc(base.width * base.height * 3)

  for (let i = 0; i < base.width * base.height; i += 1) {
    for (let c = 0; c < 3; c += 1) out[i * 3 + c] = Math.min(255, Math.abs(base.data[i * 4 + c] - candidate.data[i * 4 + c]) * 8)
  }

  return sharp(out, { raw: { width: base.width, height: base.height, channels: 3 } }).png().toBuffer()
}
