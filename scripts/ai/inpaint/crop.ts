import type { PixelBox } from './mask'

/**
 * Recorte con contexto (TASK-1965).
 *
 * Una zona chica en una imagen grande sale borrosa si se genera a la resolución de la imagen completa: el proveedor
 * reparte sus píxeles en toda la pieza. El plan recorta la zona con margen de contexto (para que luz, color y grano
 * calcen), genera ese recorte al tamaño válido del proveedor y la recomposición lo devuelve a su lugar.
 */
export interface TargetSize {
  width: number
  height: number
}

/** Elige un tamaño válido para el proveedor dada una relación de aspecto y un área deseada. */
export type PickTargetSize = (aspect: number, desiredArea: number) => TargetSize

export type CropMode = 'auto' | 'on' | 'off'

export interface CropPlan {
  mode: 'crop' | 'full'
  box: PixelBox
  target: TargetSize
  /** |aspecto de la caja − aspecto del tamaño pedido| / aspecto pedido; la salida se reescala con esa deformación. */
  aspectError: number
  reason: string
}

export interface PlanCropOptions {
  imageWidth: number
  imageHeight: number
  /** Caja de lo que la máscara toca (incluido el borde suave). */
  maskBox: PixelBox
  pick: PickTargetSize
  mode?: CropMode
  /** Margen de contexto como fracción del lado mayor de la zona (default 0,5). */
  contextFraction?: number
  minContextPx?: number
  /** En `auto`, recorta sólo si la caja con contexto ocupa menos que esta fracción del área (default 0,25). */
  autoThreshold?: number
  /** Área mínima a la que se pide generar un recorte (default 1024²). */
  minTargetArea?: number
}

export const DEFAULT_AUTO_CROP_THRESHOLD = 0.25

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Extiende un intervalo [start, start+size) a `want` píxeles centrado en el original, sin salir de [0, limit). */
const growInterval = (start: number, size: number, want: number, limit: number): [number, number] => {
  const target = Math.min(limit, Math.max(size, Math.round(want)))
  const center = start + size / 2
  const from = clamp(Math.round(center - target / 2), 0, limit - target)

  return [from, target]
}

const aspectError = (box: PixelBox, target: TargetSize) => {
  const wanted = target.width / target.height

  return Math.abs(box.width / box.height - wanted) / wanted
}

const fullPlan = (options: PlanCropOptions, reason: string): CropPlan => {
  const box = { left: 0, top: 0, width: options.imageWidth, height: options.imageHeight }
  const target = options.pick(box.width / box.height, Math.max(box.width * box.height, options.minTargetArea ?? 1024 * 1024))

  return { mode: 'full', box, target, aspectError: aspectError(box, target), reason }
}

export const planCrop = (options: PlanCropOptions): CropPlan => {
  const { imageWidth: W, imageHeight: H, maskBox } = options
  const mode = options.mode ?? 'auto'

  if (mode === 'off') return fullPlan(options, 'recorte desactivado (--crop off)')

  const context = Math.max(options.minContextPx ?? 64, (options.contextFraction ?? 0.5) * Math.max(maskBox.width, maskBox.height))
  const left = clamp(Math.floor(maskBox.left - context), 0, W)
  const top = clamp(Math.floor(maskBox.top - context), 0, H)
  const right = clamp(Math.ceil(maskBox.left + maskBox.width + context), 0, W)
  const bottom = clamp(Math.ceil(maskBox.top + maskBox.height + context), 0, H)
  const region: PixelBox = { left, top, width: right - left, height: bottom - top }
  const share = (region.width * region.height) / (W * H)
  const threshold = options.autoThreshold ?? DEFAULT_AUTO_CROP_THRESHOLD

  if (mode === 'auto' && share >= threshold) {
    return fullPlan(options, `la zona con contexto ocupa ${(share * 100).toFixed(0)} % de la imagen (umbral ${(threshold * 100).toFixed(0)} %)`)
  }

  const minArea = options.minTargetArea ?? 1024 * 1024
  let target = options.pick(region.width / region.height, Math.max(region.width * region.height, minArea))
  let box = region

  // Dos pasadas: ajustar la caja al aspecto del tamaño elegido y, si los bordes de la imagen lo impidieron, volver a
  // elegir el tamaño con el aspecto que de verdad quedó.
  for (let pass = 0; pass < 2; pass += 1) {
    const wanted = target.width / target.height
    const [x, width] = box.width / box.height < wanted ? growInterval(box.left, box.width, box.height * wanted, W) : [box.left, box.width]
    const [y, height] = box.width / box.height > wanted ? growInterval(box.top, box.height, box.width / wanted, H) : [box.top, box.height]

    box = { left: x, top: y, width, height }

    if (aspectError(box, target) <= 0.02) break

    target = options.pick(box.width / box.height, Math.max(box.width * box.height, minArea))
  }

  return {
    mode: 'crop',
    box,
    target,
    aspectError: aspectError(box, target),
    reason: `la zona con contexto ocupa ${(share * 100).toFixed(1)} % de la imagen: se genera recortada a ${target.width}x${target.height}`
  }
}

/** Tamaño en múltiplos de `step` que respeta aspecto, área y límites de lado/relación. */
export const pickGridSize = (
  aspect: number,
  desiredArea: number,
  rules: { step: number; minArea: number; maxArea: number; maxEdge: number; maxRatio: number }
): TargetSize => {
  const ratio = clamp(aspect, 1 / rules.maxRatio, rules.maxRatio)
  const area = clamp(desiredArea, rules.minArea, rules.maxArea)
  let width = Math.sqrt(area * ratio)
  let height = width / ratio

  const edgeScale = Math.min(1, rules.maxEdge / Math.max(width, height))

  width *= edgeScale
  height *= edgeScale

  const snap = (value: number) => Math.max(rules.step, Math.round(value / rules.step) * rules.step)
  let w = snap(width)
  let h = snap(height)

  // El redondeo puede sacar el área de rango por un escalón: corregir hacia adentro.
  while (w * h > rules.maxArea || Math.max(w, h) > rules.maxEdge) {
    if (w >= h) w -= rules.step
    else h -= rules.step
  }

  while (w * h < rules.minArea) {
    if (w <= h && w + rules.step <= rules.maxEdge) w += rules.step
    else h += rules.step
  }

  return { width: w, height: h }
}
