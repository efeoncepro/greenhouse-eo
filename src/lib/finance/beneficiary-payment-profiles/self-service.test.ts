import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

vi.mock('./create-profile', () => ({
  createPaymentProfile: vi.fn()
}))

vi.mock('./cancel-profile', () => ({
  cancelPaymentProfile: vi.fn()
}))

vi.mock('./list-profiles', () => ({
  listPaymentProfiles: vi.fn()
}))

import { query } from '@/lib/db'

import { cancelPaymentProfile } from './cancel-profile'
import { createPaymentProfile } from './create-profile'
import { PaymentProfileConflictError, PaymentProfileValidationError } from './errors'
import { listPaymentProfiles } from './list-profiles'
import {
  cancelSelfServicePaymentProfile,
  createSelfServicePaymentProfileRequest,
  listSelfServicePaymentProfiles
} from './self-service'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedCreate = createPaymentProfile as unknown as ReturnType<typeof vi.fn>
const mockedCancel = cancelPaymentProfile as unknown as ReturnType<typeof vi.fn>
const mockedList = listPaymentProfiles as unknown as ReturnType<typeof vi.fn>

describe('TASK-753 self-service helpers', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
    mockedCreate.mockReset()
    mockedCancel.mockReset()
    mockedList.mockReset()
  })

  describe('listSelfServicePaymentProfiles', () => {
    it('filters by beneficiaryType=member + memberId and excludes superseded/cancelled', async () => {
      mockedList.mockResolvedValueOnce({
        items: [
          { profileId: 'p-1', status: 'active' },
          { profileId: 'p-2', status: 'pending_approval' },
          { profileId: 'p-3', status: 'cancelled' },
          { profileId: 'p-4', status: 'superseded' }
        ],
        total: 4
      })

      const result = await listSelfServicePaymentProfiles({ memberId: 'm-1' })

      expect(mockedList).toHaveBeenCalledWith({
        beneficiaryType: 'member',
        beneficiaryId: 'm-1',
        limit: 50
      })
      expect(result.map(p => p.profileId)).toEqual(['p-1', 'p-2'])
    })
  })

  describe('createSelfServicePaymentProfileRequest', () => {
    it('forces beneficiaryId=memberId, requireApproval=true, metadata.requested_by=member', async () => {
      mockedCreate.mockResolvedValueOnce({ profile: { profileId: 'p-1' }, eventId: 'e-1' })

      await createSelfServicePaymentProfileRequest({
        memberId: 'm-1',
        userId: 'u-1',
        currency: 'CLP',
        accountHolderName: 'María González',
        accountNumberFull: '1234567890'
      })

      expect(mockedCreate).toHaveBeenCalledTimes(1)
      const arg = mockedCreate.mock.calls[0][0]

      expect(arg.beneficiaryType).toBe('member')
      expect(arg.beneficiaryId).toBe('m-1')
      expect(arg.requireApproval).toBe(true)
      expect(arg.createdBy).toBe('u-1')
      expect(arg.metadata.requested_by).toBe('member')
      expect(arg.metadata.source).toBe('my_payment_profile_self_service')
      expect(typeof arg.metadata.requested_at).toBe('string')
    })

    it('rejects when memberId/userId missing', async () => {
      await expect(
        createSelfServicePaymentProfileRequest({
          memberId: '',
          userId: 'u-1',
          currency: 'CLP'
        })
      ).rejects.toBeInstanceOf(PaymentProfileValidationError)

      await expect(
        createSelfServicePaymentProfileRequest({
          memberId: 'm-1',
          userId: '',
          currency: 'CLP'
        })
      ).rejects.toBeInstanceOf(PaymentProfileValidationError)
    })
  })

  describe('cancelSelfServicePaymentProfile', () => {
    const baseRow = {
      beneficiary_type: 'member',
      beneficiary_id: 'm-1',
      status: 'pending_approval',
      created_by: 'u-1',
      metadata_json: { requested_by: 'member' }
    }

    it('rejects when reason < 3 chars', async () => {
      await expect(
        cancelSelfServicePaymentProfile({ profileId: 'p-1', memberId: 'm-1', userId: 'u-1', reason: 'no' })
      ).rejects.toBeInstanceOf(PaymentProfileValidationError)
    })

    it('rejects when profile does not exist', async () => {
      mockedQuery.mockResolvedValueOnce([])

      await expect(
        cancelSelfServicePaymentProfile({ profileId: 'p-1', memberId: 'm-1', userId: 'u-1', reason: 'cambio sin efecto' })
      ).rejects.toMatchObject({ code: 'profile_not_found' })
    })

    it('rejects 403 when beneficiary_id ≠ session memberId', async () => {
      mockedQuery.mockResolvedValueOnce([{ ...baseRow, beneficiary_id: 'm-OTHER' }])

      await expect(
        cancelSelfServicePaymentProfile({ profileId: 'p-1', memberId: 'm-1', userId: 'u-1', reason: 'cambio sin efecto' })
      ).rejects.toMatchObject({ statusCode: 403, code: 'self_service_not_owner' })
    })

    it('rejects 409 when status is not pending_approval/draft', async () => {
      mockedQuery.mockResolvedValueOnce([{ ...baseRow, status: 'active' }])

      await expect(
        cancelSelfServicePaymentProfile({ profileId: 'p-1', memberId: 'm-1', userId: 'u-1', reason: 'cambio sin efecto' })
      ).rejects.toMatchObject({ statusCode: 409, code: 'self_service_invalid_status' })
    })

    it('rejects 403 when created_by ≠ session userId (someone else made the request)', async () => {
      mockedQuery.mockResolvedValueOnce([{ ...baseRow, created_by: 'u-OTHER' }])

      await expect(
        cancelSelfServicePaymentProfile({ profileId: 'p-1', memberId: 'm-1', userId: 'u-1', reason: 'cambio sin efecto' })
      ).rejects.toMatchObject({ statusCode: 403, code: 'self_service_not_creator' })
    })

    it('passes ownership/status/creator → calls cancelPaymentProfile', async () => {
      mockedQuery.mockResolvedValueOnce([baseRow])
      mockedCancel.mockResolvedValueOnce({ ok: true })

      await cancelSelfServicePaymentProfile({
        profileId: 'p-1',
        memberId: 'm-1',
        userId: 'u-1',
        reason: 'me equivoque'
      })

      expect(mockedCancel).toHaveBeenCalledWith({
        profileId: 'p-1',
        cancelledBy: 'u-1',
        reason: 'me equivoque'
      })
    })

    it('throws PaymentProfileConflictError instances correctly', async () => {
      mockedQuery.mockResolvedValueOnce([{ ...baseRow, beneficiary_id: 'm-OTHER' }])

      try {
        await cancelSelfServicePaymentProfile({
          profileId: 'p-1',
          memberId: 'm-1',
          userId: 'u-1',
          reason: 'cambio sin efecto'
        })
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(PaymentProfileConflictError)
      }
    })
  })
})
