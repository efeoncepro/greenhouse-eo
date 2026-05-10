import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/release/manifest-store', () => ({
  listRecentReleases: vi.fn()
}))

import { listRecentReleases } from '@/lib/release/manifest-store'

import {
  getReleaseDeployDurationSignal,
  RELEASE_DEPLOY_DURATION_SIGNAL_ID
} from './release-deploy-duration'

const mockedListRecent = vi.mocked(listRecentReleases)

const buildManifest = (overrides: Partial<Awaited<ReturnType<typeof listRecentReleases>>[number]>) => ({
  releaseId: 'abc123def456-uuid',
  targetSha: 'abc123def4567890',
  sourceBranch: 'develop',
  targetBranch: 'main',
  state: 'released' as const,
  attemptN: 1,
  triggeredBy: 'test',
  operatorMemberId: null,
  startedAt: '2026-05-10T10:00:00.000Z',
  completedAt: '2026-05-10T10:10:00.000Z',
  vercelDeploymentUrl: null,
  previousVercelDeploymentUrl: null,
  workerRevisions: {},
  previousWorkerRevisions: {},
  workflowRuns: [],
  preflightResult: {},
  postReleaseHealth: {},
  rollbackPlan: {},
  ...overrides
})

describe('getReleaseDeployDurationSignal', () => {
  beforeEach(() => {
    mockedListRecent.mockReset()
  })

  afterEach(() => {
    mockedListRecent.mockReset()
  })

  it('exposes canonical signal ID', async () => {
    mockedListRecent.mockResolvedValue([])

    const signal = await getReleaseDeployDurationSignal()

    expect(signal.signalId).toBe(RELEASE_DEPLOY_DURATION_SIGNAL_ID)
    expect(signal.signalId).toBe('platform.release.deploy_duration_p95')
    expect(signal.moduleKey).toBe('platform')
    expect(signal.kind).toBe('lag')
  })

  it('severity unknown when zero releases in window', async () => {
    mockedListRecent.mockResolvedValue([])

    const signal = await getReleaseDeployDurationSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('Sin releases terminales')
  })

  it('severity ok when p95 < 30min (steady)', async () => {
    const baseStart = new Date('2026-05-10T10:00:00.000Z').getTime()

    // 5 releases con duraciones 5, 10, 15, 20, 25 min — p95 = 25 min < 30 min
    const releases = [5, 10, 15, 20, 25].map((minutes, idx) =>
      buildManifest({
        releaseId: `release-${idx}`,
        startedAt: new Date(baseStart + idx * 1000).toISOString(),
        completedAt: new Date(baseStart + idx * 1000 + minutes * 60_000).toISOString()
      })
    )

    mockedListRecent.mockResolvedValue(releases)

    const signal = await getReleaseDeployDurationSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('p95')
    expect(signal.summary).toContain('25min')
  })

  it('severity warning when 30 <= p95 < 60 min', async () => {
    const baseStart = new Date('2026-05-10T10:00:00.000Z').getTime()

    const releases = [10, 25, 35, 45, 50].map((minutes, idx) =>
      buildManifest({
        releaseId: `release-${idx}`,
        startedAt: new Date(baseStart + idx * 1000).toISOString(),
        completedAt: new Date(baseStart + idx * 1000 + minutes * 60_000).toISOString()
      })
    )

    mockedListRecent.mockResolvedValue(releases)

    const signal = await getReleaseDeployDurationSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('50min')
  })

  it('severity error when p95 >= 60 min', async () => {
    const baseStart = new Date('2026-05-10T10:00:00.000Z').getTime()

    const releases = [10, 30, 60, 90, 120].map((minutes, idx) =>
      buildManifest({
        releaseId: `release-${idx}`,
        startedAt: new Date(baseStart + idx * 1000).toISOString(),
        completedAt: new Date(baseStart + idx * 1000 + minutes * 60_000).toISOString()
      })
    )

    mockedListRecent.mockResolvedValue(releases)

    const signal = await getReleaseDeployDurationSignal()

    expect(signal.severity).toBe('error')
  })

  it('filters out non-released states (degraded, aborted, in-flight)', async () => {
    const baseStart = new Date('2026-05-10T10:00:00.000Z').getTime()

    const releases = [
      buildManifest({
        releaseId: 'released-1',
        state: 'released',
        startedAt: new Date(baseStart).toISOString(),
        completedAt: new Date(baseStart + 10 * 60_000).toISOString()
      }),
      buildManifest({
        releaseId: 'degraded-1',
        state: 'degraded',
        startedAt: new Date(baseStart + 1000).toISOString(),
        completedAt: new Date(baseStart + 1000 + 50 * 60_000).toISOString()
      }),
      buildManifest({
        releaseId: 'in-flight-1',
        state: 'verifying',
        startedAt: new Date(baseStart + 2000).toISOString(),
        completedAt: null
      })
    ]

    mockedListRecent.mockResolvedValue(releases)

    const signal = await getReleaseDeployDurationSignal()

    // Only 1 released (10 min) → p95 = 10 min → ok
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('1 release')
  })

  it('severity unknown when reader throws', async () => {
    mockedListRecent.mockRejectedValue(new Error('PG unreachable'))

    const signal = await getReleaseDeployDurationSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })
})
