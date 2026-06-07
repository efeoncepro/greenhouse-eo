/**
 * Baseline visual contract (TASK-1018 Slice 1).
 *
 * Resuelve el baseline durable (SSOT del mockup aprobado), promueve capturas a
 * ese home y corre el diff mockup → runtime emitiendo findings + baselineDiffs.
 *
 * Home durable: `scripts/frontend/baselines/<surfaceId>/<viewport>__<label>.png`
 *   - committeable (gitignored solo `.captures/`), liviano (clipSelector),
 *     keyed por surfaceId → contrato compartido cross-máquina/cross-agente.
 *   - cada PNG lleva sidecar `<viewport>__<label>.mask.json` con los maskRects.
 *
 * El diff degrada honesto a `baseline_stale` (warning) cuando el home durable no
 * existe, en vez de romper duro.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FINDING_CODES } from './failure-taxonomy'
import type {
  BaselineFrameDiff,
  CaptureBaselineMeta,
  CaptureFinding,
  CaptureManifest,
  FrameMaskRect,
  FrameRecord
} from './manifest'
import { compareImages, loadPng } from './visual-diff'

const LIB_DIR = dirname(fileURLToPath(import.meta.url))

export const BASELINES_ROOT = resolve(LIB_DIR, '..', 'baselines')

const DEFAULT_VIEWPORT_KEY = 'default'

const sanitizeKey = (value: string): string => value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '')

export const durableBaselineDir = (surfaceId: string): string => join(BASELINES_ROOT, sanitizeKey(surfaceId))

export const durableFramePaths = (
  surfaceId: string,
  viewportName: string | undefined,
  frameLabel: string
): { png: string; mask: string } => {
  const dir = durableBaselineDir(surfaceId)
  const key = `${sanitizeKey(viewportName || DEFAULT_VIEWPORT_KEY)}__${sanitizeKey(frameLabel)}`

  return { png: join(dir, `${key}.png`), mask: join(dir, `${key}.mask.json`) }
}

const readMaskSidecar = (path: string): FrameMaskRect[] => {
  if (!existsSync(path)) return []

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { rects?: FrameMaskRect[] } | FrameMaskRect[]

    if (Array.isArray(parsed)) return parsed

    return parsed.rects ?? []
  } catch {
    return []
  }
}

export interface PromotionResult {
  surfaceId: string
  viewportName: string
  promoted: Array<{ frameLabel: string; png: string }>
  skipped: string[]
}

/**
 * Promueve los frames de una captura aprobada al home durable keyed por
 * surfaceId. Manual + explícito (V1) — el operador corre `fe:capture:diff --promote`.
 */
export const promoteCaptureToBaseline = (captureDir: string, manifest: CaptureManifest): PromotionResult => {
  const surfaceId = manifest.baseline?.surfaceId

  if (!surfaceId) {
    throw new Error(
      `La captura ${captureDir} no declara baseline.surfaceId — no se puede promover a un home durable.\n` +
        `Agregá baseline.surfaceId al scenario antes de promover.`
    )
  }

  if (!manifest.frames.length) {
    throw new Error(
      `La captura ${captureDir} no tiene frames (¿es un manifest raíz multi-viewport?).\n` +
        `Promové cada subdir de variante por separado.`
    )
  }

  const viewportName = manifest.viewportName || DEFAULT_VIEWPORT_KEY
  const dir = durableBaselineDir(surfaceId)

  mkdirSync(dir, { recursive: true })

  const promoted: PromotionResult['promoted'] = []
  const skipped: string[] = []

  for (const frame of manifest.frames) {
    const srcPng = join(captureDir, frame.path)

    if (!existsSync(srcPng)) {
      skipped.push(frame.label)
      continue
    }

    const { png, mask } = durableFramePaths(surfaceId, viewportName, frame.label)

    copyFileSync(srcPng, png)
    writeFileSync(mask, JSON.stringify({ rects: frame.maskRects ?? [] }, null, 2) + '\n', 'utf8')
    promoted.push({ frameLabel: frame.label, png })
  }

  return { surfaceId, viewportName, promoted, skipped }
}

export interface BaselineContractInput {
  baseline: CaptureBaselineMeta
  outputDir: string
  frames: FrameRecord[]
  viewportName?: string
}

export interface BaselineContractResult {
  findings: CaptureFinding[]
  baselineDiffs: BaselineFrameDiff[]
}

/**
 * Corre el contrato baseline contra los frames runtime. Lee el home durable +
 * los PNG runtime; no necesita browser vivo.
 */
export const runBaselineDiffContract = (input: BaselineContractInput): BaselineContractResult => {
  const { baseline, outputDir, frames, viewportName } = input
  const findings: CaptureFinding[] = []
  const baselineDiffs: BaselineFrameDiff[] = []

  if (!baseline.surfaceId) return { findings, baselineDiffs }

  const surfaceId = baseline.surfaceId
  const presentLabels = new Set(frames.map(frame => frame.label))

  // Required frame labels: deben existir en la captura runtime.
  for (const required of baseline.requiredFrameLabels ?? []) {
    if (!presentLabels.has(required)) {
      findings.push({
        severity: 'error',
        category: 'baseline',
        code: FINDING_CODES.frame_label_missing,
        message: `Frame requerido "${required}" no fue capturado (baseline ${surfaceId}).`,
        frameLabel: required
      })
      baselineDiffs.push({ frameLabel: required, viewportName, surfaceId, status: 'frame_missing' })
    }
  }

  const durableDir = durableBaselineDir(surfaceId)

  if (!existsSync(durableDir)) {
    findings.push({
      severity: 'warning',
      category: 'baseline',
      code: FINDING_CODES.baseline_stale,
      message:
        `Baseline durable ausente para "${surfaceId}" (${durableDir.replace(/.*\/scripts\//, 'scripts/')}). ` +
        `Promové el mockup aprobado con: pnpm fe:capture:diff --promote <capture-dir>.`
    })

    return { findings, baselineDiffs }
  }

  for (const frame of frames) {
    const { png: baselinePng, mask: baselineMask } = durableFramePaths(surfaceId, viewportName, frame.label)

    if (!existsSync(baselinePng)) {
      // Solo reportar baseline_missing para frames que el contrato espera comparar.
      const isRequired = baseline.requiredFrameLabels?.includes(frame.label)

      if (isRequired) {
        findings.push({
          severity: 'warning',
          category: 'baseline',
          code: FINDING_CODES.baseline_missing,
          message: `No hay baseline durable para el frame "${frame.label}" (${viewportName ?? 'default'}). Promové el mockup aprobado.`,
          frameLabel: frame.label
        })
        baselineDiffs.push({ frameLabel: frame.label, viewportName, surfaceId, status: 'baseline_missing', baselinePath: baselinePng })
      }

      continue
    }

    const runtimePng = join(outputDir, frame.path)

    try {
      const baselineImg = loadPng(baselinePng)
      const runtimeImg = loadPng(runtimePng)
      const maskRects = [...readMaskSidecar(baselineMask), ...(frame.maskRects ?? [])]
      const diffArtifactRel = frame.path.replace(/\.png$/i, '.diff.png')
      const diffOutputPath = join(outputDir, diffArtifactRel)

      const result = compareImages(baselineImg, runtimeImg, {
        maskRects,
        maxDiffRatio: baseline.maxDiffRatio,
        maxChangedPixels: baseline.maxChangedPixels,
        diffOutputPath
      })

      if (result.status === 'dimension_mismatch') {
        findings.push({
          severity: 'error',
          category: 'baseline',
          code: FINDING_CODES.visual_diff_dimension_mismatch,
          message: `Frame "${frame.label}": dimensiones runtime ≠ baseline (${runtimeImg.width}×${runtimeImg.height} vs ${baselineImg.width}×${baselineImg.height}). El layout cambió de tamaño o el viewport difiere.`,
          frameLabel: frame.label
        })
        baselineDiffs.push({
          frameLabel: frame.label,
          viewportName,
          surfaceId,
          status: 'dimension_mismatch',
          baselinePath: baselinePng,
          detail: `${runtimeImg.width}×${runtimeImg.height} vs ${baselineImg.width}×${baselineImg.height}`
        })
        continue
      }

      if (result.status === 'exceeded') {
        findings.push({
          severity: result.explicitThreshold ? 'error' : 'warning',
          category: 'baseline',
          code: FINDING_CODES.visual_diff_exceeded,
          message:
            `Frame "${frame.label}" difiere del baseline aprobado: ${(result.diffRatio * 100).toFixed(2)}% ` +
            `(${result.changedPixels}/${result.totalPixels} px) > ${(((result.effectiveMaxDiffRatio ?? 0) * 100)).toFixed(2)}%` +
            `${result.explicitThreshold ? '' : ' [threshold default — declará baseline.maxDiffRatio para fail-hard]'}. ` +
            `Diff: ${diffArtifactRel}`,
          frameLabel: frame.label
        })
      }

      baselineDiffs.push({
        frameLabel: frame.label,
        viewportName,
        surfaceId,
        status: result.status,
        baselinePath: baselinePng,
        changedPixels: result.changedPixels,
        totalPixels: result.totalPixels,
        diffRatio: result.diffRatio,
        maxDiffRatio: result.effectiveMaxDiffRatio,
        maxChangedPixels: result.effectiveMaxChangedPixels,
        diffArtifact: result.diffArtifactWritten ? diffArtifactRel : undefined
      })
    } catch (err) {
      findings.push({
        severity: 'warning',
        category: 'baseline',
        code: FINDING_CODES.visual_diff_failed,
        message: `No se pudo comparar el frame "${frame.label}" contra el baseline: ${err instanceof Error ? err.message : String(err)}`,
        frameLabel: frame.label
      })
      baselineDiffs.push({ frameLabel: frame.label, viewportName, surfaceId, status: 'error', baselinePath: baselinePng })
    }
  }

  return { findings, baselineDiffs }
}
