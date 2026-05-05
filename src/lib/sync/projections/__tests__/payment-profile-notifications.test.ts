import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/finance/beneficiary-payment-profiles/notify-beneficiary', () => ({
  notifyBeneficiaryOfPaymentProfileChange: vi.fn()
}))

import { notifyBeneficiaryOfPaymentProfileChange } from '@/lib/finance/beneficiary-payment-profiles/notify-beneficiary'

import { paymentProfileNotificationsProjection } from '../payment-profile-notifications'

const mockedNotify = notifyBeneficiaryOfPaymentProfileChange as unknown as ReturnType<typeof vi.fn>

describe('TASK-753 paymentProfileNotificationsProjection', () => {
  beforeEach(() => mockedNotify.mockReset())

  describe('extractScope', () => {
    it('returns null when payload missing profileId', () => {
      const scope = paymentProfileNotificationsProjection.extractScope({})

      expect(scope).toBeNull()
    })

    it('extracts profileId from camelCase', () => {
      const scope = paymentProfileNotificationsProjection.extractScope({ profileId: 'bpp-123' })

      expect(scope).toEqual({ entityType: 'beneficiary_payment_profile', entityId: 'bpp-123' })
    })

    it('extracts profileId from snake_case', () => {
      const scope = paymentProfileNotificationsProjection.extractScope({ profile_id: 'bpp-456' })

      expect(scope).toEqual({ entityType: 'beneficiary_payment_profile', entityId: 'bpp-456' })
    })
  })

  describe('refresh', () => {
    const scope = { entityType: 'beneficiary_payment_profile', entityId: 'bpp-1' }

    it('maps approved event → kind=approved', async () => {
      mockedNotify.mockResolvedValueOnce({ status: 'sent', deliveryId: 'd-1' })

      await paymentProfileNotificationsProjection.refresh(scope, {
        _eventType: 'finance.beneficiary_payment_profile.approved',
        _eventId: 'evt-1',
        profileId: 'bpp-1'
      })

      expect(mockedNotify).toHaveBeenCalledWith({
        profileId: 'bpp-1',
        kind: 'approved',
        sourceEventId: 'evt-1'
      })
    })

    it('maps cancelled event → kind=cancelled', async () => {
      mockedNotify.mockResolvedValueOnce({ status: 'sent', deliveryId: 'd-2' })

      await paymentProfileNotificationsProjection.refresh(scope, {
        _eventType: 'finance.beneficiary_payment_profile.cancelled',
        _eventId: 'evt-2'
      })

      expect(mockedNotify).toHaveBeenCalledWith({
        profileId: 'bpp-1',
        kind: 'cancelled',
        sourceEventId: 'evt-2'
      })
    })

    it('skips silently when event type is unknown (no throw)', async () => {
      const result = await paymentProfileNotificationsProjection.refresh(scope, {
        _eventType: 'finance.unrelated.event'
      })

      expect(result).toContain('skipped')
      expect(mockedNotify).not.toHaveBeenCalled()
    })

    it('throws when notify returns failed (so reactive consumer retries)', async () => {
      mockedNotify.mockResolvedValueOnce({ status: 'failed', error: 'Resend down' })

      await expect(
        paymentProfileNotificationsProjection.refresh(scope, {
          _eventType: 'finance.beneficiary_payment_profile.approved'
        })
      ).rejects.toThrow(/Resend down/)
    })

    it('does NOT throw on skipped_no_email (legitimate skip, no retry)', async () => {
      mockedNotify.mockResolvedValueOnce({ status: 'skipped_no_email' })

      const result = await paymentProfileNotificationsProjection.refresh(scope, {
        _eventType: 'finance.beneficiary_payment_profile.approved'
      })

      expect(result).toContain('skipped_no_email')
    })

    it('triggerEvents covers all 4 lifecycle events', () => {
      expect(paymentProfileNotificationsProjection.triggerEvents).toContain('finance.beneficiary_payment_profile.created')
      expect(paymentProfileNotificationsProjection.triggerEvents).toContain('finance.beneficiary_payment_profile.approved')
      expect(paymentProfileNotificationsProjection.triggerEvents).toContain('finance.beneficiary_payment_profile.superseded')
      expect(paymentProfileNotificationsProjection.triggerEvents).toContain('finance.beneficiary_payment_profile.cancelled')
    })
  })
})
