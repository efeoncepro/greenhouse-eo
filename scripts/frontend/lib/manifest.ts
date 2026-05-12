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
