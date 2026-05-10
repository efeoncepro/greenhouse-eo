import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/reliability/queries/release-stale-approval', () => ({
  listWaitingProductionRuns: vi.fn()
}))

import { listWaitingProductionRuns } from '@/lib/reliability/queries/release-stale-approval'

import { checkStaleApprovals } from './stale-approvals'

const buildInput = () => ({
  targetSha: 'abc1234567890def1234567890abcdef12345678',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: null,
  overrideBatchPolicy: false
})

describe('checkStaleApprovals', () => {
  const originalToken = process.env.GITHUB_RELEASE_OBSERVER_TOKEN
  const originalGithubToken = process.env.GITHUB_TOKEN
  const originalAppId = process.env.GITHUB_APP_ID

  beforeEach(() => {
    delete process.env.GITHUB_RELEASE_OBSERVER_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_APP_ID
    vi.mocked(listWaitingProductionRuns).mockReset()
  })

  afterEach(() => {
    if (originalToken !== undefined) process.env.GITHUB_RELEASE_OBSERVER_TOKEN = originalToken
    if (originalGithubToken !== undefined) process.env.GITHUB_TOKEN = originalGithubToken
    if (originalAppId !== undefined) process.env.GITHUB_APP_ID = originalAppId
  })

  it('severity unknown when no token configured', async () => {
    const result = await checkStaleApprovals(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('not_configured')
    expect(listWaitingProductionRuns).not.toHaveBeenCalled()
  })

  it('severity ok when zero stale records', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listWaitingProductionRuns).mockResolvedValue([])

    const result = await checkStaleApprovals(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('Sin runs production')
  })

  it('severity warning when records exist but max age < 7d', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listWaitingProductionRuns).mockResolvedValue([
      {
        runId: 1,
        workflowName: 'Ops Worker Deploy',
        ageMs: 30 * 60 * 60 * 1000, // 30h
        htmlUrl: 'https://github.com/x/y/actions/runs/1',
        branch: 'main',
        sha: 'abc'
      }
    ])

    const result = await checkStaleApprovals(buildInput())

    expect(result.severity).toBe('warning')
    expect(result.summary).toContain('1 run(s) production')
  })

  it('severity error when max age >= 7d', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listWaitingProductionRuns).mockResolvedValue([
      {
        runId: 1,
        workflowName: 'Ops Worker Deploy',
        ageMs: 8 * 24 * 60 * 60 * 1000, // 8d
        htmlUrl: 'https://github.com/x/y/actions/runs/1',
        branch: 'main',
        sha: 'abc'
      }
    ])

    const result = await checkStaleApprovals(buildInput())

    expect(result.severity).toBe('error')
  })

  it('severity unknown when reader throws', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    vi.mocked(listWaitingProductionRuns).mockRejectedValue(new Error('boom'))

    const result = await checkStaleApprovals(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.error).toContain('boom')
  })
})
