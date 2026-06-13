/**
 * Manifest builder — escribe `manifest.json` por captura con:
 * - scenario metadata
 * - timing (start, end, duration)
 * - lista de frames marker-based con label + timestamp relativo
 * - output paths (webm, gif, frames dir)
 * - exit code + error si aplica
 *
 * Output append-only en el run dir.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { CaptureEnv } from './env'

/** Rectángulo en píxeles del frame ya escalado por deviceScaleFactor. */
export interface FrameMaskRect {
  x: number
  y: number
  width: number
  height: number
}

export interface FrameRecord {
  index: number
  label: string
  path: string
  /** ms desde el inicio del recording */
  tMs: number
  note?: string
  viewportName?: string
  interactionName?: string
  qualityFindings?: CaptureFinding[]
  /**
   * Regiones a enmascarar en el visual diff (datos dinámicos). Resueltas en
   * capture-time desde `scenario.baseline.maskSelectors` y persistidas en
   * coordenadas de imagen para que el diff offline las pueda aplicar.
   */
  maskRects?: FrameMaskRect[]
  /**
   * Observación máquina-legible: ruta al snapshot del árbol de accesibilidad
   * (`<NN>-<label>.aria.txt`) de la región capturada en este frame. Convierte
   * "mirá el PNG y adiviná el selector" en "leé el a11y tree y escribí el
   * `getByRole(...)` correcto". Técnica de `microsoft/webwright`
   * (`local_browser.py`: `page.locator('body').aria_snapshot()`). Best-effort:
   * ausente si la captura del snapshot falló (graceful degrade, nunca rompe el mark).
   */
  ariaSnapshotPath?: string
}

export type FailureCategory =
  | 'auth_redirect'
  | 'selector_timeout'
  | 'app_error'
  | 'visual_timeout'
  | 'frame_quality'
  | 'assertion_failed'
  | 'helper_error'

export type FindingCategory =
  | FailureCategory
  | 'readiness'
  | 'microinteraction'
  | 'baseline'
  | 'accessibility'
  | 'layout'
  | 'runtime'
  | 'keyboard'
  | 'performance'
  | 'enterprise'

export interface CaptureFinding {
  severity: 'info' | 'warning' | 'error'
  category: FindingCategory
  code: string
  message: string
  frameLabel?: string
  selector?: string
  stepIndex?: number
}

export interface ReadinessResult {
  status: 'passed' | 'failed' | 'skipped'
  selector?: string
  absentSelectors?: string[]
  waitForFonts?: boolean
  durationMs: number
  error?: string
}

export interface AssertionResult {
  kind: string
  status: 'passed' | 'failed'
  selector?: string
  reason?: string
  message?: string
}

export interface InteractionSegment {
  name: string
  intent: string
  actionKind: string
  selector?: string
  startMs: number
  endMs: number
  frameLabels: string[]
  keyboardEquivalent?: string
  reducedMotion?: 'capture' | 'skip'
  findings?: CaptureFinding[]
}

/** Metadata declarativa del contrato baseline mockup → runtime (Slice 1). */
export interface CaptureBaselineMeta {
  surfaceId?: string
  baselineName?: string
  approvedMockupCaptureDir?: string
  requiredFrameLabels?: string[]
  maskSelectors?: string[]
  maxDiffRatio?: number
  maxChangedPixels?: number
  requiredRegions?: string[]
}

export type BaselineDiffStatus =
  | 'match'
  | 'exceeded'
  | 'baseline_missing'
  | 'baseline_stale'
  | 'dimension_mismatch'
  | 'frame_missing'
  | 'error'

/** Resultado del diff de un frame runtime contra su baseline durable. */
export interface BaselineFrameDiff {
  frameLabel: string
  viewportName?: string
  surfaceId?: string
  status: BaselineDiffStatus
  baselinePath?: string
  changedPixels?: number
  totalPixels?: number
  diffRatio?: number
  maxDiffRatio?: number
  maxChangedPixels?: number
  diffArtifact?: string
  detail?: string
}

/** Resumen de los collectors runtime (console/page/hydration/network). Slice 3. */
export interface RuntimeSummary {
  consoleErrorCount: number
  pageErrorCount: number
  hydrationWarningCount: number
  httpFailureCount: number
  /** Muestras saneadas y truncadas (cap por categoría). */
  consoleErrorSamples: string[]
  pageErrorSamples: string[]
  hydrationWarningSamples: string[]
  httpFailureSamples: Array<{ url: string; status: number; resourceType: string }>
}

export type EnterpriseRubricVerdict = 'pass' | 'warning' | 'blocked'

/** Resumen estructurado del enterprise rubric (Slice 7). Advisory, no juicio absoluto. */
export interface EnterpriseRubricSummary {
  verdict: EnterpriseRubricVerdict
  findingCount: number
}

/** Snapshot liviano de performance/recursos (Slice 6). */
export interface PerformanceSummary {
  domNodes: number
  requestCount: number
  transferBytes: number
  fcpMs?: number
  domContentLoadedMs?: number
  jsHeapBytes?: number
}

export interface CaptureVariantSummary {
  name: string
  viewport: { width: number; height: number }
  device?: string
  outputDir: string
  manifestPath: string
  exitCode: 0 | 1
  durationMs: number
  frameCount: number
}

export interface CaptureManifest {
  schemaVersion: 1
  scenarioName: string
  route: string
  env: CaptureEnv
  viewport: { width: number; height: number }
  startedAt: string
  finishedAt: string
  durationMs: number
  outputs: {
    recordingWebm: string | null
    framesDir: string
    flipbookGif: string | null
    /** trace.zip de Playwright cuando la captura falló (retain-on-failure). */
    trace?: string | null
  }
  frames: FrameRecord[]
  viewportName?: string
  readiness?: ReadinessResult
  assertions?: AssertionResult[]
  qualityFindings?: CaptureFinding[]
  interactions?: InteractionSegment[]
  failureCategory?: FailureCategory
  reportHtml?: string
  variants?: CaptureVariantSummary[]
  baseline?: CaptureBaselineMeta
  baselineDiffs?: BaselineFrameDiff[]
  runtimeSummary?: RuntimeSummary
  performanceSummary?: PerformanceSummary
  enterpriseRubric?: EnterpriseRubricSummary
  exitCode: 0 | 1
  error?: {
    message: string
    stepIndex: number
  }
}

export const writeManifest = (dir: string, manifest: CaptureManifest): void => {
  const path = join(dir, 'manifest.json')

  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
}
