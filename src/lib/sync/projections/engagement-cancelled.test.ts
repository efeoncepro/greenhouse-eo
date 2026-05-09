import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockEnsureNotificationSchema = vi.fn()
const mockGetRecipients = vi.fn()
const mockDispatch = vi.fn()
const mockRunQuery = vi.fn()

vi.mock('@/lib/notifications/schema', () => ({
  ensureNotificationSchema: () => mockEnsureNotificationSchema()
}))

vi.mock('@/lib/notifications/person-recipient-resolver', () => ({
  getRoleCodeNotificationRecipients: (...args: unknown[]) => mockGetRecipients(...args)
}))

vi.mock('@/lib/notifications/notification-service', () => ({
  NotificationService: {
    dispatch: (...args: unknown[]) => mockDispatch(...args)
  }
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunQuery(...args)
}))

import { engagementCancelledProjection } from './engagement-cancelled'

describe('engagementCancelledProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureNotificationSchema.mockResolvedValue(undefined)
  })

  it('dispatches an internal-only manual follow-up notification', async () => {
    mockRunQuery.mockResolvedValueOnce([
      {
        service_id: 'SVC-HS-123',
        name: 'Discovery Sprint',
        organization_id: 'org-1',
        created_by: 'user-1'
      }
    ])
    mockGetRecipients.mockResolvedValueOnce([
      { userId: 'admin-1', email: 'admin@example.com', fullName: 'Admin' }
    ])
    mockDispatch.mockResolvedValueOnce({ sent: [{ userId: 'admin-1' }], failed: [], skipped: [] })

    await expect(
      engagementCancelledProjection.refresh(
        { entityType: 'service', entityId: 'SVC-HS-123' },
        {
          version: 1,
          serviceId: 'SVC-HS-123',
          cancellationReason: 'Client paused the engagement.'
        }
      )
    ).resolves.toContain('notified 1 admins')

    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      category: 'system_event',
      metadata: expect.objectContaining({
        automaticClientEmail: false,
        serviceId: 'SVC-HS-123'
      })
    }))
  })
})
