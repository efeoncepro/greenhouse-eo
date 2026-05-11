import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkPlaywrightSmoke } from './playwright-smoke'

const buildInput = () => ({
  targetSha: 'abc1234567890def1234567890abcdef12345678',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: null,
  overrideBatchPolicy: false
})

const buildRun = (overrides: Record<string, unknown>) => ({
  id: 1,
  name: 'Playwright smoke',
  status: 'completed',
  conclusion: 'success',
  html_url: 'https://github.com/efeoncepro/greenhouse-eo/actions/runs/1',
  head_sha: 'abc1234567890',
  path: '.github/workflows/playwright-smoke.yml',
  created_at: '2026-05-11T10:00:00Z',
  ...overrides
})

describe('checkPlaywrightSmoke', () => {
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

  it('severity warning when 0 smoke runs found', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 1,
        workflow_runs: [
          buildRun({ name: 'CI', path: '.github/workflows/ci.yml' })
        ]
      })
    })) as never

    const result = await checkPlaywrightSmoke(buildInput())

    expect(result.severity).toBe('warning')
    expect(result.summary).toContain('0 workflows Playwright smoke')
  })

  it('severity ok when smoke run succeeded', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 1,
        workflow_runs: [buildRun({ conclusion: 'success' })]
      })
    })) as never

    const result = await checkPlaywrightSmoke(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('Playwright smoke verde')
  })

  it('severity error when smoke run failed', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 1,
        workflow_runs: [buildRun({ conclusion: 'failure' })]
      })
    })) as never

    const result = await checkPlaywrightSmoke(buildInput())

    expect(result.severity).toBe('error')
    expect(result.summary).toContain('Playwright smoke fallaron')
  })

  it('detects smoke runs by path even when name does not include keyword', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 1,
        workflow_runs: [
          buildRun({
            name: 'Custom Name',
            path: '.github/workflows/e2e-smoke.yml',
            conclusion: 'success'
          })
        ]
      })
    })) as never

    const result = await checkPlaywrightSmoke(buildInput())

    expect(result.severity).toBe('ok')
  })

  it('uses the latest smoke run so a repaired rerun supersedes an older failure', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 2,
        workflow_runs: [
          buildRun({
            id: 1,
            conclusion: 'failure',
            created_at: '2026-05-11T10:00:00Z'
          }),
          buildRun({
            id: 2,
            conclusion: 'success',
            created_at: '2026-05-11T10:05:00Z'
          })
        ]
      })
    })) as never

    const result = await checkPlaywrightSmoke(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('1 workflow(s) Playwright smoke verde')
  })
})
