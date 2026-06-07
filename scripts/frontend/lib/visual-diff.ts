/**
 * Offline pixel diff engine para el contrato baseline mockup → runtime (TASK-1018 Slice 1).
 *
 * Compara dos PNG ya en disco (baseline durable vs frame runtime) con
 * `pixelmatch` + `pngjs`, soportando masks rectangulares por región para datos
 * dinámicos. NO depende de un browser vivo — opera sobre buffers.
 *
 * Determinismo: el diff SOLO es válido si baseline y runtime se capturaron bajo
 * condiciones idénticas (animaciones off, caret oculto, deviceScaleFactor fijo,
 * fonts settled, reduced-motion). Ese contrato se aplica en capture-time
 * (`applyCaptureDeterminism`), no acá.
 */

import { readFileSync, writeFileSync } from 'node:fs'

import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

import type { FrameMaskRect } from './manifest'

export interface PngImage {
  width: number
  height: number
  data: Buffer
}

/** Pixelmatch threshold por defecto. `includeAA=false` (default) ignora anti-aliasing → menos flaky cross-máquina. */
const DEFAULT_PIXELMATCH_THRESHOLD = 0.1

/**
 * Default conservador cuando hay baseline durable pero el scenario no declaró
 * thresholds. Evita el falso "pass silencioso" sin convertir el gate en
 * fail-hard (severidad warning, ver baseline-contract).
 */
export const DEFAULT_MAX_DIFF_RATIO = 0.1

export const loadPng = (path: string): PngImage => {
  const png = PNG.sync.read(readFileSync(path))

  return { width: png.width, height: png.height, data: png.data }
}

/** Pinta de negro opaco las regiones enmascaradas (in-place) antes del diff. */
export const applyMaskRects = (img: PngImage, rects: FrameMaskRect[]): void => {
  for (const rect of rects) {
    const x0 = Math.max(0, Math.floor(rect.x))
    const y0 = Math.max(0, Math.floor(rect.y))
    const x1 = Math.min(img.width, Math.ceil(rect.x + rect.width))
    const y1 = Math.min(img.height, Math.ceil(rect.y + rect.height))

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (img.width * y + x) << 2

        img.data[idx] = 0
        img.data[idx + 1] = 0
        img.data[idx + 2] = 0
        img.data[idx + 3] = 255
      }
    }
  }
}

export interface CompareOptions {
  maskRects?: FrameMaskRect[]
  threshold?: number
  maxDiffRatio?: number
  maxChangedPixels?: number
  /** Si se provee, escribe el PNG diff acá. */
  diffOutputPath?: string
}

export interface CompareResult {
  status: 'match' | 'exceeded' | 'dimension_mismatch'
  changedPixels: number
  totalPixels: number
  diffRatio: number
  width: number
  height: number
  effectiveMaxDiffRatio?: number
  effectiveMaxChangedPixels?: number
  /** true si el scenario declaró thresholds explícitos (=> exceeded es error). */
  explicitThreshold: boolean
  diffArtifactWritten: boolean
}

/**
 * Compara dos imágenes RGBA de dimensiones idénticas. Aplica masks (unión) a
 * ambas antes del diff. Devuelve métricas + status. Escribe diff PNG si se pide.
 */
export const compareImages = (baseline: PngImage, runtime: PngImage, opts: CompareOptions = {}): CompareResult => {
  if (baseline.width !== runtime.width || baseline.height !== runtime.height) {
    return {
      status: 'dimension_mismatch',
      changedPixels: -1,
      totalPixels: baseline.width * baseline.height,
      diffRatio: 1,
      width: baseline.width,
      height: baseline.height,
      explicitThreshold: opts.maxDiffRatio !== undefined || opts.maxChangedPixels !== undefined,
      diffArtifactWritten: false
    }
  }

  const rects = opts.maskRects ?? []

  if (rects.length) {
    applyMaskRects(baseline, rects)
    applyMaskRects(runtime, rects)
  }

  const { width, height } = baseline
  const totalPixels = width * height
  const diff = opts.diffOutputPath ? new PNG({ width, height }) : null

  const changedPixels = pixelmatch(baseline.data, runtime.data, diff ? diff.data : null, width, height, {
    threshold: opts.threshold ?? DEFAULT_PIXELMATCH_THRESHOLD
  })

  const diffRatio = totalPixels > 0 ? changedPixels / totalPixels : 0
  const explicitThreshold = opts.maxDiffRatio !== undefined || opts.maxChangedPixels !== undefined

  const effectiveMaxDiffRatio = opts.maxDiffRatio ?? (opts.maxChangedPixels === undefined ? DEFAULT_MAX_DIFF_RATIO : undefined)
  const effectiveMaxChangedPixels = opts.maxChangedPixels

  const exceedsRatio = effectiveMaxDiffRatio !== undefined && diffRatio > effectiveMaxDiffRatio
  const exceedsPixels = effectiveMaxChangedPixels !== undefined && changedPixels > effectiveMaxChangedPixels
  const status: CompareResult['status'] = exceedsRatio || exceedsPixels ? 'exceeded' : 'match'

  let diffArtifactWritten = false

  if (diff && opts.diffOutputPath && status === 'exceeded') {
    writeFileSync(opts.diffOutputPath, PNG.sync.write(diff))
    diffArtifactWritten = true
  }

  return {
    status,
    changedPixels,
    totalPixels,
    diffRatio,
    width,
    height,
    effectiveMaxDiffRatio,
    effectiveMaxChangedPixels,
    explicitThreshold,
    diffArtifactWritten
  }
}

/** Une dos sets de mask rects (baseline + runtime) para enmascarar ambos lados. */
export const mergeMaskRects = (a?: FrameMaskRect[], b?: FrameMaskRect[]): FrameMaskRect[] => [
  ...(a ?? []),
  ...(b ?? [])
]
