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
  const originalFetch = global.fetch

  beforeEach(() => {
    delete process.env.SENTRY_AUTH_TOKEN
    global.fetch = vi.fn()
  })

  afterEach(() => {
    if (originalToken !== undefined) process.env.SENTRY_AUTH_TOKEN = originalToken
    global.fetch = originalFetch
  })

  it('severity unknown when SENTRY_AUTH_TOKEN missing', async () => {
    const result = await checkSentryCriticalIssues(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('not_configured')
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
