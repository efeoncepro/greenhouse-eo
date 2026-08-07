import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/reliability/queries/release-pending-without-jobs', () => ({
  listPendingRuns: vi.fn()
}))

import { listPendingRuns } from '@/lib/reliability/queries/release-pending-without-jobs'

import { checkPendingWithoutJobs } from './pending-without-jobs'

const buildInput = () => ({
  targetSha: 'abc1234567890def1234567890abcdef12345678',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: null,
  overrideBatchPolicy: false
})

describe('checkPendingWithoutJobs', () => {
  const originalToken = process.env.GITHUB_RELEASE_OBSERVER_TOKEN
  const originalGithubToken = process.env.GITHUB_TOKEN
  const originalAppId = process.env.GITHUB_APP_ID

  beforeEach(() => {
    delete process.env.GITHUB_RELEASE_OBSERVER_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_APP_ID
    vi.mocked(listPendingRuns).mockReset()
  })

  afterEach(() => {
    if (originalToken !== undefined) process.env.GITHUB_RELEASE_OBSERVER_TOKEN = originalToken
    if (originalGithubToken !== undefined) process.env.GITHUB_TOKEN = originalGithubToken
    if (originalAppId !== undefined) process.env.GITHUB_APP_ID = originalAppId
  })

  it('severity unknown when no token configured', async () => {
    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('not_configured')
    expect(listPendingRuns).not.toHaveBeenCalled()
  })

  it('severity ok when zero pending records', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockResolvedValue([])

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('Sin runs queued/in_progress')
  })

  it('severity error when records exist (any) — sintoma deadlock', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockResolvedValue([
      {
        runId: 1,
        workflowName: 'Ops Worker Deploy',
        status: 'queued',
        ageMs: 10 * 60 * 1000,
        htmlUrl: 'https://github.com/x/y/actions/runs/1',
        branch: 'main',
        sha: 'abc'
      }
    ])

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('error')
    expect(result.summary).toContain('sintoma deadlock')
    expect(result.recommendation).toContain('gh run cancel')
  })

  it('exclusión forense: un run de la lista vigente no bloquea, queda en evidencia y la severidad es ok', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockResolvedValue([
      {
        // Zombie del outage 2026-08-06 (entrada real de ignored-pending-runs.ts, vigente hasta 2026-08-21).
        runId: 31126022507,
        workflowName: 'Ops Worker Deploy',
        status: 'queued',
        ageMs: 20 * 60 * 60 * 1000,
        htmlUrl: 'https://github.com/x/y/actions/runs/31126022507',
        branch: 'develop',
        sha: '26005a619'
      }
    ])

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('lista forense')
    expect(result.evidence).toMatchObject({
      count: 0,
      ignored: [expect.objectContaining({ runId: 31126022507 })]
    })
  })

  it('exclusión forense NO tapa runs fuera de la lista: deadlock real sigue bloqueando', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockResolvedValue([
      {
        runId: 31126022507,
        workflowName: 'Ops Worker Deploy',
        status: 'queued',
        ageMs: 20 * 60 * 60 * 1000,
        htmlUrl: 'https://github.com/x/y/actions/runs/31126022507',
        branch: 'develop',
        sha: '26005a619'
      },
      {
        runId: 999,
        workflowName: 'Ops Worker Deploy',
        status: 'queued',
        ageMs: 10 * 60 * 1000,
        htmlUrl: 'https://github.com/x/y/actions/runs/999',
        branch: 'main',
        sha: 'def'
      }
    ])

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('error')
    expect(result.evidence).toMatchObject({ count: 1 })
  })

  it('severity unknown when reader throws', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listPendingRuns).mockRejectedValue(new Error('rate limit'))

    const result = await checkPendingWithoutJobs(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.error).toContain('rate limit')
  })
})
