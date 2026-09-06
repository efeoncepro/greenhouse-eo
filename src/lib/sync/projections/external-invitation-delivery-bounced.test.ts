import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const recordMock = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }))
vi.mock('@/lib/identity/external-access', () => ({
  EXTERNAL_INVITATION_EMAIL_TYPE: 'external_access_invitation',
  EXTERNAL_INVITATION_SOURCE_ENTITY: 'external_member_invitations',
  recordExternalInvitationDeliveryOutcome: (...args: unknown[]) => recordMock(...args)
}))

const { externalInvitationDeliveryBouncedProjection } = await import('./external-invitation-delivery-bounced')

describe('TASK-1837 — external_invitation_delivery_bounced projection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listens to email_delivery.bounced in the notifications domain and scopes by deliveryId', () => {
    expect(externalInvitationDeliveryBouncedProjection.domain).toBe('notifications')
    expect(externalInvitationDeliveryBouncedProjection.triggerEvents).toEqual(['email_delivery.bounced'])
    expect(externalInvitationDeliveryBouncedProjection.extractScope({ deliveryId: ' d-1 ' })).toEqual({
      entityType: 'email_delivery',
      entityId: 'd-1'
    })
    expect(externalInvitationDeliveryBouncedProjection.extractScope({})).toBeNull()
  })

  it('marks the invitation bounced through the canonical writer (never writes the table itself)', async () => {
    queryMock.mockResolvedValueOnce([
      { email_type: 'external_access_invitation', source_entity: 'external_member_invitations', source_event_id: 'xmi-1' }
    ])
    recordMock.mockResolvedValueOnce({ invitationId: 'xmi-1' })

    const result = await externalInvitationDeliveryBouncedProjection.refresh(
      { entityType: 'email_delivery', entityId: 'd-1' },
      { deliveryId: 'd-1', bounceType: 'hard' }
    )

    expect(result).toBe('bounced: xmi-1')
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({ invitationId: 'xmi-1', outcome: 'bounced', errorCode: 'bounce:hard', countsAsAttempt: false })
    )
  })

  it('skips bounces of other email types', async () => {
    queryMock.mockResolvedValueOnce([{ email_type: 'invitation', source_entity: 'client_users', source_event_id: null }])

    const result = await externalInvitationDeliveryBouncedProjection.refresh(
      { entityType: 'email_delivery', entityId: 'd-2' },
      { deliveryId: 'd-2' }
    )

    expect(result).toContain('skip')
    expect(recordMock).not.toHaveBeenCalled()
  })
})
