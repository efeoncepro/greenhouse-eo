import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/release/manifest-store', () => ({
  listRecentReleases: vi.fn()
}))

import { listRecentReleases } from '@/lib/release/manifest-store'

import {
  getReleaseLastStatusSignal,
  RELEASE_LAST_STATUS_SIGNAL_ID
} from './release-last-status'

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

describe('getReleaseLastStatusSignal', () => {
  beforeEach(() => {
    mockedListRecent.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T12:00:00.000Z'))
  })

  afterEach(() => {
    mockedListRecent.mockReset()
    vi.useRealTimers()
  })

  it('exposes canonical signal ID', async () => {
    mockedListRecent.mockResolvedValue([])

    const signal = await getReleaseLastStatusSignal()

    expect(signal.signalId).toBe(RELEASE_LAST_STATUS_SIGNAL_ID)
    expect(signal.signalId).toBe('platform.release.last_status')
    expect(signal.kind).toBe('drift')
  })

  it('severity unknown when no releases', async () => {
    mockedListRecent.mockResolvedValue([])

    const signal = await getReleaseLastStatusSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('Sin releases')
  })

  it('severity ok when last release = released', async () => {
    mockedListRecent.mockResolvedValue([
      buildManifest({
        state: 'released',
        completedAt: '2026-05-10T11:00:00.000Z' // 1h ago
      })
    ])

    const signal = await getReleaseLastStatusSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('released')
  })

  it('severity unknown when release in-flight (preflight/ready/deploying/verifying)', async () => {
    for (const state of ['preflight', 'ready', 'deploying', 'verifying'] as const) {
      mockedListRecent.mockResolvedValue([
        buildManifest({ state, completedAt: null })
      ])

      const signal = await getReleaseLastStatusSignal()

      expect(signal.severity, `state ${state} should give unknown`).toBe('unknown')
      expect(signal.summary).toContain('in-flight')
    }
  })

  it('severity error when last release = degraded < 24h ago', async () => {
    mockedListRecent.mockResolvedValue([
      buildManifest({
        state: 'degraded',
        completedAt: '2026-05-10T08:00:00.000Z' // 4h ago
      })
    ])

    const signal = await getReleaseLastStatusSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('degraded')
  })

  it('severity warning when last release = aborted between 24h and 7d ago', async () => {
    mockedListRecent.mockResolvedValue([
      buildManifest({
        state: 'aborted',
        completedAt: '2026-05-08T12:00:00.000Z' // 2 days ago
      })
    ])

    const signal = await getReleaseLastStatusSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('aborted')
  })

  it('severity ok when last problematic release > 7d ago (resolved historicamente)', async () => {
    mockedListRecent.mockResolvedValue([
      buildManifest({
        state: 'rolled_back',
        completedAt: '2026-04-30T12:00:00.000Z' // 10 days ago
      })
    ])

    const signal = await getReleaseLastStatusSignal()

    expect(signal.severity).toBe('ok')
  })

  it('severity unknown when reader throws', async () => {
    mockedListRecent.mockRejectedValue(new Error('PG unreachable'))

    const signal = await getReleaseLastStatusSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })

  it('exposes evidence with last_release_id + last_target_sha + last_state', async () => {
    mockedListRecent.mockResolvedValue([
      buildManifest({
        releaseId: 'manifest-xyz-uuid',
        targetSha: 'abcd1234567890ef',
        state: 'released',
        completedAt: '2026-05-10T11:00:00.000Z'
      })
    ])

    const signal = await getReleaseLastStatusSignal()

    expect(signal.evidence).toContainEqual(
      expect.objectContaining({ label: 'last_release_id', value: 'manifest-xyz-uuid' })
    )
    expect(signal.evidence).toContainEqual(
      expect.objectContaining({ label: 'last_state', value: 'released' })
    )
    expect(signal.evidence).toContainEqual(
      expect.objectContaining({ label: 'last_target_sha' })
    )
  })
})
