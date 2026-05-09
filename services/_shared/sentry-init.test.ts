import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { initMock, setTagMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  setTagMock: vi.fn()
}))

vi.mock('@sentry/node', () => ({
  init: initMock,
  setTag: setTagMock
}))

import { initSentryForService, __resetSentryInitForTests } from './sentry-init'

describe('initSentryForService (TASK-844 — canonical Cloud Run Sentry init)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    initMock.mockClear()
    setTagMock.mockClear()
    __resetSentryInitForTests()
    delete process.env.SENTRY_DSN
    delete process.env.SENTRY_ENVIRONMENT
    delete process.env.SENTRY_RELEASE
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('warns and skips init when SENTRY_DSN is missing', () => {
    initSentryForService('ops-worker')

    expect(initMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/ops-worker.*SENTRY_DSN not configured/)
  })

  it('initializes Sentry with canonical fields when DSN is configured', () => {
    process.env.SENTRY_DSN = 'https://test-key@sentry.example.com/123'
    vi.stubEnv('NODE_ENV', 'production')

    initSentryForService('ops-worker')

    expect(initMock).toHaveBeenCalledTimes(1)
    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://test-key@sentry.example.com/123',
        environment: 'production',
        serverName: 'ops-worker',
        tracesSampleRate: 0
      })
    )
    expect(setTagMock).toHaveBeenCalledWith('service', 'ops-worker')
  })

  it('prefers SENTRY_ENVIRONMENT over NODE_ENV for environment tag', () => {
    process.env.SENTRY_DSN = 'https://x@sentry.example.com/1'
    vi.stubEnv('NODE_ENV', 'production')
    process.env.SENTRY_ENVIRONMENT = 'staging'

    initSentryForService('ops-worker')

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'staging' })
    )
  })

  it('uses SENTRY_RELEASE env var for release identifier', () => {
    process.env.SENTRY_DSN = 'https://x@sentry.example.com/1'
    process.env.SENTRY_RELEASE = 'commit-abc123'

    initSentryForService('ops-worker')

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({ release: 'commit-abc123' })
    )
  })

  it('respects explicit options over env vars', () => {
    process.env.SENTRY_DSN = 'https://x@sentry.example.com/1'
    process.env.SENTRY_ENVIRONMENT = 'staging'

    initSentryForService('ops-worker', {
      environment: 'production',
      release: 'override-release',
      tracesSampleRate: 0.1
    })

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'production',
        release: 'override-release',
        tracesSampleRate: 0.1
      })
    )
  })

  it('is idempotent — second call is no-op', () => {
    process.env.SENTRY_DSN = 'https://x@sentry.example.com/1'

    initSentryForService('ops-worker')
    initSentryForService('ops-worker')
    initSentryForService('ops-worker')

    expect(initMock).toHaveBeenCalledTimes(1)
    expect(setTagMock).toHaveBeenCalledTimes(1)
  })

  it('marks itself initialized even when DSN is missing — prevents re-warn spam', () => {
    initSentryForService('ops-worker')
    initSentryForService('ops-worker')

    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('trims whitespace from DSN env var (defensive)', () => {
    process.env.SENTRY_DSN = '  https://x@sentry.example.com/1  '

    initSentryForService('ops-worker')

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://x@sentry.example.com/1' })
    )
  })
})
