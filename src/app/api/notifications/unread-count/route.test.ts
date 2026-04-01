import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireTenantContext = vi.fn()
const mockEnsureNotificationSchema = vi.fn()
const mockGetUnreadCount = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireTenantContext: (...args: unknown[]) => mockRequireTenantContext(...args)
}))

vi.mock('@/lib/notifications/schema', () => ({
  ensureNotificationSchema: (...args: unknown[]) => mockEnsureNotificationSchema(...args)
}))

vi.mock('@/lib/notifications/notification-service', () => ({
  NotificationService: {
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args)
  }
}))

import { GET } from '@/app/api/notifications/unread-count/route'

describe('GET /api/notifications/unread-count', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      unauthorizedResponse: null
    })
  })

  it('returns the unread count when notifications storage is available', async () => {
    mockEnsureNotificationSchema.mockResolvedValue(undefined)
    mockGetUnreadCount.mockResolvedValue(4)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.unreadCount).toBe(4)
  })

  it('falls back to zero when notifications storage access is denied', async () => {
    mockEnsureNotificationSchema.mockRejectedValue(new Error('permission denied for schema greenhouse_notifications'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.unreadCount).toBe(0)
  })
})
