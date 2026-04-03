import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WebhookEnvelope } from '@/lib/webhooks/types'

vi.mock('server-only', () => ({}))

const mockDispatch = vi.fn()
const mockEnsureNotificationSchema = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()
const mockGetCanonicalPersonsByMemberIds = vi.fn()

vi.mock('@/lib/notifications/notification-service', () => ({
  buildNotificationRecipientKey: (recipient: {
    userId?: string
    identityProfileId?: string
    memberId?: string
    email?: string
  }) =>
    recipient.userId
    ?? (recipient.identityProfileId ? `person:${recipient.identityProfileId.trim()}` : null)
    ?? (recipient.memberId ? `member:${recipient.memberId.trim()}` : null)
    ?? (recipient.email ? `external:${recipient.email.trim().toLowerCase()}` : null),
  NotificationService: {
    dispatch: (...args: unknown[]) => mockDispatch(...args)
  }
}))

vi.mock('@/lib/notifications/schema', () => ({
  ensureNotificationSchema: (...args: unknown[]) => mockEnsureNotificationSchema(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/identity/canonical-person', () => ({
  getCanonicalPersonsByMemberIds: (...args: unknown[]) => mockGetCanonicalPersonsByMemberIds(...args),
  getCanonicalPersonByUserId: vi.fn().mockResolvedValue(null),
  getCanonicalPersonsByIdentityProfileIds: vi.fn().mockResolvedValue(new Map())
}))

const { dispatchNotificationWebhook } = await import('./notification-dispatch')

const makeEnvelope = (overrides: Partial<WebhookEnvelope> = {}): WebhookEnvelope => ({
  eventId: 'evt-1',
  eventType: 'assignment.created',
  aggregateType: 'assignment',
  aggregateId: 'assignment-1',
  occurredAt: '2026-03-29T10:00:00.000Z',
  version: 1,
  source: 'greenhouse',
  data: {
    assignmentId: 'assignment-1',
    memberId: 'member-1',
    clientId: 'client-1'
  },
  ...overrides
})

describe('dispatchNotificationWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureNotificationSchema.mockResolvedValue(undefined)
    mockGetCanonicalPersonsByMemberIds.mockResolvedValue(new Map())
  })

  it('returns unmapped when the event type is not supported', async () => {
    await expect(dispatchNotificationWebhook(makeEnvelope({ eventType: 'service.created' }))).resolves.toEqual({
      eventType: 'service.created',
      mapped: false,
      recipientsResolved: 0,
      unresolvedRecipients: 0,
      deduped: 0,
      sent: 0,
      skipped: 0,
      failed: 0
    })
  })

  it('dispatches with metadata for a mapped event', async () => {
    mockGetCanonicalPersonsByMemberIds.mockResolvedValueOnce(
      new Map([
        ['member-1', {
          memberId: 'member-1',
          identityProfileId: 'profile-1',
          userId: 'user-1',
          portalEmail: 'user1@example.com',
          canonicalEmail: 'user1@example.com',
          memberEmail: 'user1@example.com',
          portalDisplayName: 'User One',
          displayName: 'User One Canonical'
        }]
      ])
    )
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])

    mockDispatch.mockResolvedValueOnce({
      sent: [{ userId: 'user-1', channels: ['in_app'] }],
      skipped: [],
      failed: []
    })

    const result = await dispatchNotificationWebhook(makeEnvelope())

    expect(result).toMatchObject({
      mapped: true,
      recipientsResolved: 1,
      unresolvedRecipients: 0,
      deduped: 0,
      sent: 1,
      skipped: 0,
      failed: 0
    })
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'assignment_change',
        metadata: {
          eventId: 'evt-1',
          eventType: 'assignment.created',
          aggregateType: 'assignment',
          aggregateId: 'assignment-1',
          source: 'webhook_notifications'
        }
      })
    )
  })

  it('does not redispatch a deduped notification', async () => {
    mockGetCanonicalPersonsByMemberIds.mockResolvedValueOnce(
      new Map([
        ['member-1', {
          memberId: 'member-1',
          identityProfileId: 'profile-1',
          userId: 'user-1',
          portalEmail: 'user1@example.com',
          canonicalEmail: 'user1@example.com',
          memberEmail: 'user1@example.com',
          portalDisplayName: 'User One',
          displayName: 'User One Canonical'
        }]
      ])
    )
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ user_id: 'user-1' }])

    const result = await dispatchNotificationWebhook(makeEnvelope())

    expect(result).toMatchObject({
      mapped: true,
      recipientsResolved: 1,
      deduped: 1,
      sent: 0,
      skipped: 0,
      failed: 0
    })
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('returns zero sent when no recipients resolve', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    const result = await dispatchNotificationWebhook(
      makeEnvelope({
        eventType: 'compensation_version.created',
        aggregateType: 'compensation_version',
        aggregateId: 'comp-v1',
        data: {
          versionId: 'comp-v1',
          memberId: 'member-missing',
          effectiveFrom: '2026-04-01'
        }
      })
    )

    expect(result).toMatchObject({
      mapped: true,
      recipientsResolved: 0,
      unresolvedRecipients: 0,
      sent: 0
    })
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('dispatches canonical recipients without portal user ids', async () => {
    mockGetCanonicalPersonsByMemberIds.mockResolvedValueOnce(
      new Map([
        ['member-1', {
          memberId: 'member-1',
          identityProfileId: 'profile-1',
          userId: null,
          portalEmail: null,
          canonicalEmail: 'member.one@efeonce.org',
          memberEmail: 'member.one@efeonce.org',
          portalDisplayName: null,
          displayName: 'Member One Canonical'
        }]
      ])
    )
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { user_id: 'person:profile-1' },
        { user_id: 'member:member-1' },
        { user_id: 'external:member.one@efeonce.org' }
      ])
    mockDispatch.mockResolvedValueOnce({
      sent: [{ userId: 'person:profile-1', channels: ['email'] }],
      skipped: [],
      failed: []
    })

    const result = await dispatchNotificationWebhook(makeEnvelope())

    expect(result).toMatchObject({
      mapped: true,
      recipientsResolved: 1,
      deduped: 0,
      sent: 1
    })
    expect(mockDispatch).toHaveBeenCalledTimes(1)
  })
})
