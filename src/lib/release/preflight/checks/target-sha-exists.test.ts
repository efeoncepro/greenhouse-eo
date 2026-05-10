import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkTargetShaExists } from './target-sha-exists'

const buildInput = () => ({
  targetSha: 'abc1234567890def1234567890abcdef12345678',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: 'jreye@efeonce.org',
  overrideBatchPolicy: false
})

describe('checkTargetShaExists', () => {
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

  it('severity unknown + status not_configured when no token configured', async () => {
    const result = await checkTargetShaExists(buildInput())

    expect(result.checkId).toBe('target_sha_exists')
    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('not_configured')
    expect(result.summary).toContain('Sin GITHUB_RELEASE_OBSERVER_TOKEN')
  })

  it('severity error when commit returns 404', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake-token'
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })) as never

    const result = await checkTargetShaExists(buildInput())

    expect(result.severity).toBe('error')
    expect(result.summary).toContain('no existe')
    expect(result.recommendation).toContain('SHA correcto')
  })

  it('severity ok when commit returns 200', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake-token'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        sha: 'abc1234567890def1234567890abcdef12345678',
        html_url: 'https://github.com/efeoncepro/greenhouse-eo/commit/abc1234567890'
      })
    })) as never

    const result = await checkTargetShaExists(buildInput())

    expect(result.severity).toBe('ok')
    expect(result.summary).toContain('verificado')
    expect(result.evidence).toMatchObject({ exists: true })
  })

  it('severity unknown when GitHub API returns 5xx', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake-token'
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    })) as never

    const result = await checkTargetShaExists(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('error')
    expect(result.error).toContain('503')
  })

  it('severity unknown when fetch throws (network failure)', async () => {
    process.env.GITHUB_RELEASE_OBSERVER_TOKEN = 'fake-token'
    global.fetch = vi.fn(async () => {
      throw new Error('network unreachable')
    }) as never

    const result = await checkTargetShaExists(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.error).toContain('network unreachable')
  })
})
