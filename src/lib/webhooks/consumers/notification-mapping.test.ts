import { describe, expect, it } from 'vitest'

import { findNotificationMapping, NOTIFICATION_EVENT_TYPES } from './notification-mapping'
import type { WebhookEnvelope } from '@/lib/webhooks/types'

const makeEnvelope = (overrides: Partial<WebhookEnvelope> = {}): WebhookEnvelope => ({
  eventId: 'evt-1',
  eventType: 'payroll_period.exported',
  aggregateType: 'payroll_period',
  aggregateId: '2026-03',
  occurredAt: '2026-03-29T10:00:00.000Z',
  version: 1,
  source: 'greenhouse',
  data: {
    periodId: '2026-03',
    year: 2026,
    month: 3
  },
  ...overrides
})

describe('notification mappings', () => {
  it('exposes the expected first-lot event types', () => {
    expect(NOTIFICATION_EVENT_TYPES).toEqual([
      'assignment.created',
      'assignment.updated',
      'assignment.removed',
      'compensation_version.created',
      'member.created',
      'identity.email_verification.completed',
      'payroll_period.exported'
    ])
  })

  it('returns null for unmapped events', () => {
    expect(findNotificationMapping('service.created')).toBeNull()
  })

  it('builds the payroll exported title and action url', () => {
    const mapping = findNotificationMapping('payroll_period.exported')

    expect(mapping).not.toBeNull()
    expect(mapping?.title(makeEnvelope())).toBe('Tu nómina de marzo de 2026 está lista')
    expect(mapping?.actionUrl?.(makeEnvelope())).toBe('/my/payroll')
  })

  it('builds the member-created action url from the member id', () => {
    const mapping = findNotificationMapping('member.created')

    expect(mapping?.actionUrl?.(makeEnvelope({
      eventType: 'member.created',
      aggregateType: 'member',
      aggregateId: 'member-julio',
      data: {
        memberId: 'member-julio',
        displayName: 'Julio Reyes'
      }
    }))).toBe('/people/member-julio')
  })
})
