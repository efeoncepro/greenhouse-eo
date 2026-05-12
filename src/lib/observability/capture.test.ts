import { describe, it, expect, vi, beforeEach } from 'vitest'

const { captureExceptionMock, captureMessageMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(() => 'test-event-id'),
  captureMessageMock: vi.fn(() => 'test-message-id')
}))

vi.mock('@sentry/node', () => ({
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock
}))

import { captureWithDomain, captureMessageWithDomain } from './capture'

describe('captureWithDomain (TASK-844 — runtime-portable wrapper)', () => {
  beforeEach(() => {
    captureExceptionMock.mockClear()
    captureMessageMock.mockClear()
  })

  it('attaches the canonical `domain` tag', () => {
    const err = new Error('boom')

    captureWithDomain(err, 'finance')

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    expect(captureExceptionMock).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: expect.objectContaining({ domain: 'finance' }),
        level: 'error'
      })
    )
  })

  it('preserves caller-provided extra and tags without overriding domain', () => {
    const err = new Error('boom')

    captureWithDomain(err, 'integrations.hubspot', {
      extra: { hubspotCompanyId: '27778972424' },
      tags: { source: 'hubspot-companies-webhook', step: 'classify' }
    })

    expect(captureExceptionMock).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: {
          source: 'hubspot-companies-webhook',
          step: 'classify',
          domain: 'integrations.hubspot'
        },
        extra: { hubspotCompanyId: '27778972424' }
      })
    )
  })

  it('uses the provided level', () => {
    const err = new Error('warn-only')

    captureWithDomain(err, 'sync', { level: 'warning' })

    expect(captureExceptionMock).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ level: 'warning' })
    )
  })

  it('returns the event id from Sentry', () => {
    const eventId = captureWithDomain(new Error('x'), 'cloud')

    expect(eventId).toBe('test-event-id')
  })

  it('forwards user context and fingerprint when provided', () => {
    const err = new Error('with context')

    captureWithDomain(err, 'identity', {
      user: { id: 'u-1', email: 'jreye@example.com' },
      fingerprint: ['auth', 'azure-ad', 'callback']
    })

    expect(captureExceptionMock).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        user: { id: 'u-1', email: 'jreye@example.com' },
        fingerprint: ['auth', 'azure-ad', 'callback']
      })
    )
  })
})

describe('captureMessageWithDomain (TASK-844)', () => {
  beforeEach(() => {
    captureExceptionMock.mockClear()
    captureMessageMock.mockClear()
  })

  it('attaches the canonical `domain` tag and defaults level to warning', () => {
    captureMessageWithDomain('Reactive consumer skipped: empty batch', 'sync')

    expect(captureMessageMock).toHaveBeenCalledTimes(1)
    expect(captureMessageMock).toHaveBeenCalledWith(
      'Reactive consumer skipped: empty batch',
      expect.objectContaining({
        tags: expect.objectContaining({ domain: 'sync' }),
        level: 'warning'
      })
    )
  })

  it('respects custom level (info/debug)', () => {
    captureMessageWithDomain('Background backfill started', 'finance', { level: 'info' })

    expect(captureMessageMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ level: 'info' })
    )
  })
})

describe('client_portal Sentry domain (TASK-822 Slice 2)', () => {
  beforeEach(() => {
    captureExceptionMock.mockClear()
    captureMessageMock.mockClear()
  })

  it('captureWithDomain accepts client_portal and tags the exception correctly', () => {
    const err = new Error('client portal read failure')

    // Type-level assertion: 'client_portal' must be assignable to CaptureDomain.
    // If the union doesn't include it, this line fails to compile.
    captureWithDomain(err, 'client_portal', {
      extra: { organizationId: 'org-test-123' },
      tags: { source: 'account-summary', stage: 'read' }
    })

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    expect(captureExceptionMock).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: {
          source: 'account-summary',
          stage: 'read',
          domain: 'client_portal'
        },
        extra: { organizationId: 'org-test-123' },
        level: 'error'
      })
    )
  })

  it('captureMessageWithDomain accepts client_portal for degraded-mode signals', () => {
    captureMessageWithDomain('Client portal module assignment orphaned', 'client_portal', {
      level: 'warning',
      extra: { orphanModuleKey: 'unknown_module' }
    })

    expect(captureMessageMock).toHaveBeenCalledTimes(1)
    expect(captureMessageMock).toHaveBeenCalledWith(
      'Client portal module assignment orphaned',
      expect.objectContaining({
        tags: expect.objectContaining({ domain: 'client_portal' }),
        level: 'warning'
      })
    )
  })
})
