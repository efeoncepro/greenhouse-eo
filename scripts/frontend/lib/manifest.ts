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
}

export type FailureCategory =
  | 'auth_redirect'
  | 'selector_timeout'
  | 'app_error'
  | 'visual_timeout'
  | 'frame_quality'
  | 'assertion_failed'
  | 'helper_error'

export interface CaptureFinding {
  severity: 'info' | 'warning' | 'error'
  category: FailureCategory | 'readiness' | 'microinteraction' | 'baseline'
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
  baseline?: {
    surfaceId?: string
    baselineName?: string
    approvedMockupCaptureDir?: string
  }
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
