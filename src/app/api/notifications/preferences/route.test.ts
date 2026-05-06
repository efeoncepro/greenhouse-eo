import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireTenantContext = vi.fn()
const mockEnsureNotificationSchema = vi.fn()
const mockGetPreferences = vi.fn()
const mockUpsertPreference = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireTenantContext: (...args: unknown[]) => mockRequireTenantContext(...args)
}))

vi.mock('@/lib/notifications/schema', () => ({
  ensureNotificationSchema: (...args: unknown[]) => mockEnsureNotificationSchema(...args)
}))

vi.mock('@/lib/notifications/notification-service', () => ({
  NotificationService: {
    getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
    upsertPreference: (...args: unknown[]) => mockUpsertPreference(...args)
  }
}))

import { GET, PUT } from './route'

describe('/api/notifications/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      unauthorizedResponse: null
    })
    mockEnsureNotificationSchema.mockResolvedValue(undefined)
    mockGetPreferences.mockResolvedValue([])
    mockUpsertPreference.mockResolvedValue(undefined)
  })

  it('returns preferences for the 13 runtime categories with dictionary-backed copy', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.preferences).toHaveLength(13)
    expect(body.preferences[0]).toMatchObject({
      category: 'delivery_update',
      label: 'Delivery updates',
      description: 'Asset aprobado, entregado o con cambios solicitados',
      inAppEnabled: true,
      emailEnabled: false
    })
    expect(body.preferences.find((preference: { category: string }) => preference.category === 'feedback_requested'))
      .toMatchObject({
        label: 'Feedback solicitado',
        emailEnabled: true
      })
  })

  it('updates only known notification categories and ignores unknown input safely', async () => {
    const response = await PUT(
      new Request('https://greenhouse.local/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          preferences: [
            { category: 'feedback_requested', inAppEnabled: false, emailEnabled: true },
            { category: 'unknown_category', inAppEnabled: true, emailEnabled: true }
          ]
        })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ updated: true })
    expect(mockUpsertPreference).toHaveBeenCalledTimes(1)
    expect(mockUpsertPreference).toHaveBeenCalledWith('user-1', 'feedback_requested', false, true)
  })
})
