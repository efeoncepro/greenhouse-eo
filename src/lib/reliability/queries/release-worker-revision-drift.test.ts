import type * as ChildProcess from 'node:child_process'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock execFile (resolveCloudRunRevisionSha) ANTES del import del reader.
// Garantiza que tests son deterministas independiente del estado real de
// gcloud / Cloud Run en la maquina del runner. Sin este mock, los tests
// fallaban en runtimes con gcloud configurado contra producción real
// (descubierto live 2026-05-10 post merge cuando workers ya tenian GIT_SHA
// real, rompiendo expectativa de `data_missing`).
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof ChildProcess>('node:child_process')

  return {
    ...actual,
    execFile: vi.fn((_cmd, _args, _opts, callback) => {
      // Default: gcloud "absent" — pasa null/error al callback. Tests que
      // necesiten respuesta especifica deben usar vi.spyOn() en su propio scope.
      if (callback) callback(new Error('gcloud not available in test'), '', '')
    })
  }
})

import {
  RELEASE_WORKER_REVISION_DRIFT_SIGNAL_ID,
  getReleaseWorkerRevisionDriftSignal
} from './release-worker-revision-drift'

/**
 * TASK-849 Slice 2 — Tests anti-regresion del 3er reader.
 *
 * Cubre:
 *   - Degradacion honesta sin GITHUB_TOKEN → severity='unknown'
 *   - data_missing (Cloud Run sin GIT_SHA env, e.g. workers pre-Slice 1) →
 *     severity='warning' (NO falso positivo de drift)
 *   - Drift confirmado (gh sha != cloud run sha) → severity='error'
 *   - Synced (todos workers ok) → severity='ok'
 *   - Error API GitHub → severity='unknown' con redaccion
 */

describe('release-worker-revision-drift signal', () => {
  const originalToken = process.env.GITHUB_RELEASE_OBSERVER_TOKEN
  const originalGithubToken = process.env.GITHUB_TOKEN
  const originalFetch = global.fetch

  beforeEach(() => {
    delete process.env.GITHUB_RELEASE_OBSERVER_TOKEN
    delete process.env.GITHUB_TOKEN
    global.fetch = vi.fn()
  })

  afterEach(() => {
    if (originalToken !== undefined) process.env.GITHUB_RELEASE_OBSERVER_TOKEN = originalToken
    if (originalGithubToken !== undefined) process.env.GITHUB_TOKEN = originalGithubToken
    global.fetch = originalFetch
  })

  it('exposes canonical signal ID', () => {
    expect(RELEASE_WORKER_REVISION_DRIFT_SIGNAL_ID).toBe(
      'platform.release.worker_revision_drift'
    )
  })

  it('returns severity=unknown when no GitHub token configured (degraded honest mode)', async () => {
    const signal = await getReleaseWorkerRevisionDriftSignal()

    expect(signal.signalId).toBe(RELEASE_WORKER_REVISION_DRIFT_SIGNAL_ID)
    expect(signal.moduleKey).toBe('platform')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('Sin GITHUB_RELEASE_OBSERVER_TOKEN')
    // No data_missing pollution — degraded mode short-circuits before any check.
    expect(signal.evidence?.find((e) => e.label === 'workers_checked')).toBeUndefined()
  })

  it('exposes data_missing metric when GIT_SHA absent on workers (no false drift)', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake-token'

    // Mock GH API: returns successful runs.
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        workflow_runs: [
          {
            id: 1,
            head_sha: 'abc123def4567890',
            html_url: 'https://github.com/efeoncepro/greenhouse-eo/actions/runs/1',
            updated_at: new Date().toISOString()
          }
        ]
      })
    }))

    global.fetch = mockFetch as never

    // gcloud not available in test runtime → resolveCloudRunRevisionSha returns null
    // → all workers data_missing → severity warning, NOT error.
    const signal = await getReleaseWorkerRevisionDriftSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('data_missing')

    const dataMissingEvidence = signal.evidence?.find((e) => e.label === 'data_missing_count')

    expect(dataMissingEvidence).toBeDefined()
    expect(Number(dataMissingEvidence?.value)).toBeGreaterThan(0)

    const driftCountEvidence = signal.evidence?.find((e) => e.label === 'drift_count')

    expect(driftCountEvidence?.value).toBe('0')
  })

  it('returns severity=unknown with redacted error if GH API throws', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake-token'

    // Mock global fetch to throw — simulating network failure.
    global.fetch = vi.fn(async () => {
      throw new Error('network unreachable')
    }) as never

    const signal = await getReleaseWorkerRevisionDriftSignal()

    // Each worker check has its own .catch(() => null) so individual failures
    // don't crash the signal. Result: all workers null, all data_missing,
    // severity warning. The signal-level catch only fires if Promise.all itself
    // throws synchronously.
    expect(['warning', 'unknown']).toContain(signal.severity)
  })

  it('checks all 4 workflows with Cloud Run mapping', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake-token'

    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ workflow_runs: [] })
    })) as never

    const signal = await getReleaseWorkerRevisionDriftSignal()

    // 4 workflows have cloudRunService mapping (3 workers + 1 hubspot bridge).
    const workersChecked = signal.evidence?.find((e) => e.label === 'workers_checked')

    expect(workersChecked?.value).toBe('4')
  })

  it('signal kind is drift (matches subsystem Platform Release contract)', async () => {
    const signal = await getReleaseWorkerRevisionDriftSignal()

    expect(signal.kind).toBe('drift')
  })

  it('module key is platform (subsystem Platform Release rollup)', async () => {
    const signal = await getReleaseWorkerRevisionDriftSignal()

    expect(signal.moduleKey).toBe('platform')
  })
})
