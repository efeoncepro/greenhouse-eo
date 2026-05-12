import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkSentryCriticalIssues } from './sentry-critical-issues'

const buildInput = () => ({
  targetSha: 'abc123',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: null,
  overrideBatchPolicy: false
})

const buildIssue = (overrides: Record<string, unknown>) => ({
  id: '1',
  title: 'TypeError: undefined',
  level: 'error',
  status: 'unresolved',
  count: '5',
  userCount: 1,
  permalink: 'https://sentry.io/issue/1',
  firstSeen: '2026-05-10T00:00:00Z',
  lastSeen: '2026-05-10T01:00:00Z',
  ...overrides
})

describe('checkSentryCriticalIssues', () => {
  const originalToken = process.env.SENTRY_AUTH_TOKEN
  const originalIncidentsToken = process.env.SENTRY_INCIDENTS_AUTH_TOKEN
  const originalIncidentsTokenRef = process.env.SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF
  const originalEnvironment = process.env.SENTRY_RELEASE_PREFLIGHT_ENVIRONMENT
  const originalSentryEnvironment = process.env.SENTRY_ENVIRONMENT
  const originalFetch = global.fetch

  beforeEach(() => {
    delete process.env.SENTRY_AUTH_TOKEN
    delete process.env.SENTRY_INCIDENTS_AUTH_TOKEN
    delete process.env.SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF
    delete process.env.SENTRY_RELEASE_PREFLIGHT_ENVIRONMENT
    delete process.env.SENTRY_ENVIRONMENT
    global.fetch = vi.fn()
  })

  afterEach(() => {
    if (originalToken !== undefined) process.env.SENTRY_AUTH_TOKEN = originalToken
    else delete process.env.SENTRY_AUTH_TOKEN
    if (originalIncidentsToken !== undefined) process.env.SENTRY_INCIDENTS_AUTH_TOKEN = originalIncidentsToken
    else delete process.env.SENTRY_INCIDENTS_AUTH_TOKEN
    if (originalIncidentsTokenRef !== undefined) process.env.SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF = originalIncidentsTokenRef
    else delete process.env.SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF
    if (originalEnvironment !== undefined) process.env.SENTRY_RELEASE_PREFLIGHT_ENVIRONMENT = originalEnvironment
    else delete process.env.SENTRY_RELEASE_PREFLIGHT_ENVIRONMENT
    if (originalSentryEnvironment !== undefined) process.env.SENTRY_ENVIRONMENT = originalSentryEnvironment
    else delete process.env.SENTRY_ENVIRONMENT
    global.fetch = originalFetch
  })

  it('severity unknown when SENTRY_INCIDENTS_AUTH_TOKEN/SENTRY_AUTH_TOKEN missing', async () => {
    const result = await checkSentryCriticalIssues(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('not_configured')
  })

  it('uses SENTRY_INCIDENTS_AUTH_TOKEN before build-time SENTRY_AUTH_TOKEN', async () => {
    process.env.SENTRY_INCIDENTS_AUTH_TOKEN = 'incidents-token'
    process.env.SENTRY_AUTH_TOKEN = 'build-token'

    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => []
    })) as never

    await checkSentryCriticalIssues(buildInput())

    const [, init] = vi.mocked(global.fetch).mock.calls[0] ?? []
    const headers = init?.headers as Record<string, string>

    expect(headers.Authorization).toBe('Bearer incidents-token')
  })

  it('severity ok when 0 critical issues', async () => {
    process.env.SENTRY_AUTH_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => []
    })) as never

    const result = await checkSentryCriticalIssues(buildInput())

    expect(result.severity).toBe('ok')

    const [url] = vi.mocked(global.fetch).mock.calls[0] ?? []

    expect(String(url)).toContain('lastSeen%3A-24h')
    expect(String(url)).toContain('environment=production')
  })

  it('allows overriding the production Sentry environment explicitly', async () => {
    process.env.SENTRY_AUTH_TOKEN = 'fake'
    process.env.SENTRY_RELEASE_PREFLIGHT_ENVIRONMENT = 'staging'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => []
    })) as never

    const result = await checkSentryCriticalIssues(buildInput())

    expect(result.severity).toBe('ok')

    const [url] = vi.mocked(global.fetch).mock.calls[0] ?? []

    expect(String(url)).toContain('environment=staging')
  })

  it('severity warning when 1-9 critical issues', async () => {
    process.env.SENTRY_AUTH_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => Array.from({ length: 5 }, (_, i) => buildIssue({ id: String(i) }))
    })) as never

    const result = await checkSentryCriticalIssues(buildInput())

    expect(result.severity).toBe('warning')
    expect(result.summary).toContain('5')
  })

  it('severity error when 10+ critical issues', async () => {
    process.env.SENTRY_AUTH_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => Array.from({ length: 12 }, (_, i) => buildIssue({ id: String(i) }))
    })) as never

    const result = await checkSentryCriticalIssues(buildInput())

    expect(result.severity).toBe('error')
    expect(result.summary).toContain('12')
  })

  it('filters out warning/info levels', async () => {
    process.env.SENTRY_AUTH_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        buildIssue({ id: '1', level: 'error' }),
        buildIssue({ id: '2', level: 'warning' }),
        buildIssue({ id: '3', level: 'info' })
      ]
    })) as never

    const result = await checkSentryCriticalIssues(buildInput())

    expect(result.severity).toBe('warning')
    // Only 1 'error' counts as critical
    expect(result.summary).toContain('1')
  })

  it('severity unknown when API throws (Sentry strict per Decision 4)', async () => {
    process.env.SENTRY_AUTH_TOKEN = 'fake'
    global.fetch = vi.fn(async () => {
      throw new Error('5xx')
    }) as never

    const result = await checkSentryCriticalIssues(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.recommendation).toContain('NO podemos verificar production health')
  })
})
