import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkCiGreen } from './ci-green'

const buildInput = () => ({
  targetSha: 'abc1234567890def1234567890abcdef12345678',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: 'jreye@efeonce.org',
  overrideBatchPolicy: false
})

const buildRun = (overrides: Record<string, unknown>) => ({
  id: 1,
  name: 'CI',
  status: 'completed',
  conclusion: 'success',
  html_url: 'https://github.com/efeoncepro/greenhouse-eo/actions/runs/1',
  head_sha: 'abc1234567890',
  ...overrides
})

describe('checkCiGreen', () => {
  const originalToken = process.env.GITHUB_RELEASE_OBSERVER_TOKEN
  const originalGithubToken = process.env.GITHUB_TOKEN
  const originalAppId = process.env.GITHUB_APP_ID
  const originalFetch = global.fetch

  beforeEach(() => {
    delete process.env.GITHUB_RELEASE_OBSERVER_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_APP_ID
    global.fetch = vi.fn()
  })

  afterEach(() => {
    if (originalToken !== undefined) process.env.GITHUB_RELEASE_OBSERVER_TOKEN = originalToken
    if (originalGithubToken !== undefined) process.env.GITHUB_TOKEN = originalGithubToken
    if (originalAppId !== undefined) process.env.GITHUB_APP_ID = originalAppId
    global.fetch = originalFetch
  })

  it('severity unknown when no token configured', async () => {
    const result = await checkCiGreen(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('not_configured')
  })

  it('severity unknown when 0 non-deploy workflows ran', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ total_count: 0, workflow_runs: [] })
    })) as never

    const result = await checkCiGreen(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.summary).toContain('0 workflows CI')
  })

  it('severity ok when all CI workflows succeeded', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 2,
        workflow_runs: [
          buildRun({ id: 1, name: 'CI', conclusion: 'success' }),
          buildRun({ id: 2, name: 'Lint', conclusion: 'success' })
        ]
      })
    })) as never

    const result = await checkCiGreen(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('2 workflow(s) CI verde')
  })

  it('severity error when any CI workflow failed', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 2,
        workflow_runs: [
          buildRun({ id: 1, name: 'CI', conclusion: 'success' }),
          buildRun({ id: 2, name: 'Lint', conclusion: 'failure' })
        ]
      })
    })) as never

    const result = await checkCiGreen(buildInput())

    expect(result.severity).toBe('error')
    expect(result.summary).toContain('1 workflow(s) CI fallaron')
  })

  it('severity warning when CI workflows still running', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 1,
        workflow_runs: [
          buildRun({ id: 1, name: 'CI', status: 'in_progress', conclusion: null })
        ]
      })
    })) as never

    const result = await checkCiGreen(buildInput())

    expect(result.severity).toBe('warning')
    expect(result.summary).toContain('aun corriendo')
  })

  it('filters out release deploy workflows from CI check', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 2,
        workflow_runs: [
          buildRun({ id: 1, name: 'Ops Worker Deploy', conclusion: 'failure' }),
          buildRun({ id: 2, name: 'CI', conclusion: 'success' })
        ]
      })
    })) as never

    const result = await checkCiGreen(buildInput())

    // Deploy workflow excluded; CI ok → severity ok
    expect(result.severity).toBe('ok')
  })
})
