import { describe, expect, it } from 'vitest'

import {
  durableBaselineDir,
  durableFramePaths,
  promoteCaptureToBaseline,
  runBaselineDiffContract
} from './baseline-contract'
import type { CaptureManifest } from './manifest'

describe('baseline-contract durable home', () => {
  it('keys the durable dir by sanitized surfaceId', () => {
    expect(durableBaselineDir('agency.organizations.list')).toMatch(/scripts\/frontend\/baselines\/agency\.organizations\.list$/)
    expect(durableBaselineDir('weird/surface id')).toMatch(/baselines\/weird-surface-id$/)
  })

  it('keys frame files by viewport + label with a mask sidecar', () => {
    const { png, mask } = durableFramePaths('hr.contractors', 'mobile', 'first-fold')

    expect(png).toMatch(/hr\.contractors\/mobile__first-fold\.png$/)
    expect(mask).toMatch(/hr\.contractors\/mobile__first-fold\.mask\.json$/)
  })

  it('defaults viewport key to "default" when absent', () => {
    const { png } = durableFramePaths('hr.contractors', undefined, 'snapshot')

    expect(png).toMatch(/default__snapshot\.png$/)
  })
})

describe('baseline-contract promotion guards', () => {
  const baseManifest = (overrides: Partial<CaptureManifest>): CaptureManifest =>
    ({
      schemaVersion: 1,
      scenarioName: 'x',
      route: '/x',
      env: 'local',
      viewport: { width: 1, height: 1 },
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      outputs: { recordingWebm: null, framesDir: 'frames/', flipbookGif: null },
      frames: [],
      exitCode: 0,
      ...overrides
    }) as CaptureManifest

  it('throws when the capture has no surfaceId', () => {
    expect(() => promoteCaptureToBaseline('/tmp/x', baseManifest({ frames: [{ index: 1, label: 'a', path: 'frames/01-a.png', tMs: 0 }] }))).toThrow(/surfaceId/)
  })

  it('throws when the capture has no frames (root multi-viewport manifest)', () => {
    expect(() => promoteCaptureToBaseline('/tmp/x', baseManifest({ baseline: { surfaceId: 's' }, frames: [] }))).toThrow(/no tiene frames/)
  })
})

describe('runBaselineDiffContract', () => {
  it('is a no-op without surfaceId', () => {
    const result = runBaselineDiffContract({ baseline: {}, outputDir: '/tmp', frames: [] })

    expect(result.findings).toEqual([])
    expect(result.baselineDiffs).toEqual([])
  })

  it('emits frame_label_missing (error) and baseline_stale (warning) when a required frame is absent and the durable home does not exist', () => {
    const result = runBaselineDiffContract({
      baseline: { surfaceId: 'task1018.nonexistent.surface', requiredFrameLabels: ['matrix-mode'] },
      outputDir: '/tmp',
      frames: [{ index: 1, label: 'first-fold', path: 'frames/01-first-fold.png', tMs: 0 }]
    })

    const codes = result.findings.map(f => f.code)

    expect(codes).toContain('frame_label_missing')
    expect(codes).toContain('baseline_stale')
    expect(result.findings.find(f => f.code === 'frame_label_missing')?.severity).toBe('error')
    expect(result.findings.find(f => f.code === 'baseline_stale')?.severity).toBe('warning')
    expect(result.baselineDiffs.find(d => d.frameLabel === 'matrix-mode')?.status).toBe('frame_missing')
  })
})
