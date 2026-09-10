import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const upsertMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: (...a: unknown[]) => queryMock(...a) }))
vi.mock('./notification-service', () => ({ NotificationService: { upsertPreference: (...a: unknown[]) => upsertMock(...a) } }))

import { NOTIFICATION_CATEGORIES } from '@/config/notification-categories'
import { applyClientNotificationPreferencePolicy, CLIENT_SERVICE_NOTIFICATION_POLICY_V1 } from './client-preference-policy'

beforeEach(() => { queryMock.mockReset(); upsertMock.mockReset(); upsertMock.mockResolvedValue(undefined) })

describe('client notification preference policy (TASK-1852)', () => {
  it('only names client-audience categories and keeps high-frequency ones off email', () => {
    for (const [code, setting] of Object.entries(CLIENT_SERVICE_NOTIFICATION_POLICY_V1.categories)) {
      expect(NOTIFICATION_CATEGORIES[code as keyof typeof NOTIFICATION_CATEGORIES].audience).toBe('client')
      expect(setting.inApp).toBe(true)
    }

    expect(CLIENT_SERVICE_NOTIFICATION_POLICY_V1.categories.delivery_update.email).toBe(false)
    expect(CLIENT_SERVICE_NOTIFICATION_POLICY_V1.categories.report_ready.email).toBe(true)
  })

  it('applies four explicit rows per person of the client and skips strangers without writing', async () => {
    queryMock.mockResolvedValueOnce([
      { user_id: 'u-sky-1', client_id: 'client-sky', tenant_type: 'client' },
      { user_id: 'u-other', client_id: 'client-other', tenant_type: 'client' },
      { user_id: 'u-internal', client_id: 'client-sky', tenant_type: 'efeonce_internal' }
    ])

    const result = await applyClientNotificationPreferencePolicy({ clientId: 'client-sky', userIds: ['u-sky-1', 'u-other', 'u-internal', 'u-missing', 'u-sky-1'] })

    expect(result.results).toEqual([
      { userId: 'u-sky-1', outcome: 'applied', categories: ['report_ready', 'feedback_requested', 'sprint_milestone', 'delivery_update'] },
      { userId: 'u-other', outcome: 'not_in_client' },
      { userId: 'u-internal', outcome: 'not_client_tenant' },
      { userId: 'u-missing', outcome: 'not_in_client' }
    ])
    expect(upsertMock).toHaveBeenCalledTimes(4)
    expect(upsertMock).toHaveBeenCalledWith('u-sky-1', 'report_ready', true, true)
    expect(upsertMock).toHaveBeenCalledWith('u-sky-1', 'delivery_update', true, false)
  })

  it('rejects empty batches before reading', async () => {
    await expect(applyClientNotificationPreferencePolicy({ clientId: 'c', userIds: [] })).rejects.toThrow()
    expect(queryMock).not.toHaveBeenCalled()
  })
})
