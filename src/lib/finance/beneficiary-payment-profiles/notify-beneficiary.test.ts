import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: vi.fn()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { query } from '@/lib/db'
import { sendEmail } from '@/lib/email/delivery'

import { notifyBeneficiaryOfPaymentProfileChange } from './notify-beneficiary'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedSend = sendEmail as unknown as ReturnType<typeof vi.fn>

describe('TASK-753 notifyBeneficiaryOfPaymentProfileChange — schema + degraded paths', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
    mockedSend.mockReset()
  })

  it('skipped_profile_missing when profile not found', async () => {
    mockedQuery.mockResolvedValueOnce([])

    const result = await notifyBeneficiaryOfPaymentProfileChange({
      profileId: 'bpp-missing',
      kind: 'created'
    })

    expect(result.status).toBe('skipped_profile_missing')
  })

  it('skipped_non_member for non-member beneficiaries (V1 boundary)', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        profile_id: 'bpp-1',
        beneficiary_type: 'shareholder',
        beneficiary_id: 'sh-1',
        currency: 'CLP',
        status: 'active',
        metadata_json: {},
        cancelled_reason: null,
        approved_at: null,
        cancelled_at: null,
        created_at: new Date()
      }
    ])

    const result = await notifyBeneficiaryOfPaymentProfileChange({
      profileId: 'bpp-1',
      kind: 'approved'
    })

    expect(result.status).toBe('skipped_non_member')
  })

  it('skipped_no_email when member email lookup query throws (defensive degraded mode)', async () => {
    // First call: profile lookup OK (member). Second call: member lookup throws.
    mockedQuery
      .mockResolvedValueOnce([
        {
          profile_id: 'bpp-2',
          beneficiary_type: 'member',
          beneficiary_id: 'mem-1',
          currency: 'CLP',
          status: 'pending_approval',
          metadata_json: { requested_by: 'member' },
          cancelled_reason: null,
          approved_at: null,
          cancelled_at: null,
          created_at: new Date()
        }
      ])
      .mockRejectedValueOnce(new Error('column ip.email does not exist'))

    const result = await notifyBeneficiaryOfPaymentProfileChange({
      profileId: 'bpp-2',
      kind: 'created'
    })

    // Critical: must NOT throw — would trip circuit breaker.
    expect(result.status).toBe('skipped_no_email')
    expect(result.error).toContain('Member email lookup failed')
    expect(mockedSend).not.toHaveBeenCalled()
  })

  it('skipped_no_email when member has no email at all', async () => {
    mockedQuery
      .mockResolvedValueOnce([
        {
          profile_id: 'bpp-3',
          beneficiary_type: 'member',
          beneficiary_id: 'mem-2',
          currency: 'CLP',
          status: 'active',
          metadata_json: {},
          cancelled_reason: null,
          approved_at: new Date(),
          cancelled_at: null,
          created_at: new Date()
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'mem-2',
          display_name: 'Test User',
          primary_email: null,
          identity_email: null
        }
      ])

    const result = await notifyBeneficiaryOfPaymentProfileChange({
      profileId: 'bpp-3',
      kind: 'approved'
    })

    expect(result.status).toBe('skipped_no_email')
  })

  it('uses identity_profiles.canonical_email aliased as identity_email (NOT ip.email)', async () => {
    mockedQuery
      .mockResolvedValueOnce([
        {
          profile_id: 'bpp-4',
          beneficiary_type: 'member',
          beneficiary_id: 'mem-3',
          beneficiary_name: 'María',
          provider_slug: null,
          bank_name: 'Banco Falabella',
          account_number_masked: '•••• 1234',
          currency: 'CLP',
          status: 'pending_approval',
          metadata_json: { requested_by: 'member' },
          cancelled_reason: null,
          approved_at: null,
          cancelled_at: null,
          created_at: new Date()
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'mem-3',
          display_name: 'María',
          primary_email: 'maria@efeonce.org',
          identity_email: 'maria-canonical@efeonce.org'
        }
      ])

    mockedSend.mockResolvedValueOnce({ deliveryId: 'd-1', resendId: 'r-1', status: 'sent' })

    const result = await notifyBeneficiaryOfPaymentProfileChange({
      profileId: 'bpp-4',
      kind: 'created'
    })

    expect(result.status).toBe('sent')
    expect(mockedSend).toHaveBeenCalledTimes(1)

    // Anti-regression: verify the SECOND query (member lookup) uses canonical_email
    const memberLookupCall = mockedQuery.mock.calls[1]
    const sql = memberLookupCall[0] as string

    expect(sql).toContain('canonical_email')
    expect(sql).not.toMatch(/\bip\.email\b/) // anti-regression of the breaker bug

    // Verify identity_email (canonical) is preferred over primary_email
    const sendCall = mockedSend.mock.calls[0][0]

    expect(sendCall.recipients[0].email).toBe('maria-canonical@efeonce.org')
  })

  it('falls back to primary_email when identity_email is null', async () => {
    mockedQuery
      .mockResolvedValueOnce([
        {
          profile_id: 'bpp-5',
          beneficiary_type: 'member',
          beneficiary_id: 'mem-4',
          beneficiary_name: null,
          provider_slug: null,
          bank_name: null,
          account_number_masked: '•••• 5678',
          currency: 'CLP',
          status: 'active',
          metadata_json: {},
          cancelled_reason: null,
          approved_at: new Date(),
          cancelled_at: null,
          created_at: new Date()
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'mem-4',
          display_name: 'Carlos',
          primary_email: 'carlos@efeonce.org',
          identity_email: null
        }
      ])

    mockedSend.mockResolvedValueOnce({ deliveryId: 'd-2', resendId: 'r-2', status: 'sent' })

    const result = await notifyBeneficiaryOfPaymentProfileChange({
      profileId: 'bpp-5',
      kind: 'approved'
    })

    expect(result.status).toBe('sent')
    expect(mockedSend.mock.calls[0][0].recipients[0].email).toBe('carlos@efeonce.org')
  })

  it('does not expose payment source/provider context in beneficiary emails', async () => {
    mockedQuery
      .mockResolvedValueOnce([
        {
          profile_id: 'bpp-6',
          beneficiary_type: 'member',
          beneficiary_id: 'mem-5',
          beneficiary_name: 'Felipe Zurita',
          provider_slug: 'santander',
          bank_name: 'Banco Falabella',
          account_number_masked: '•••• 0996',
          currency: 'CLP',
          status: 'active',
          metadata_json: {},
          cancelled_reason: null,
          approved_at: new Date('2026-05-14T12:00:00Z'),
          cancelled_at: null,
          created_at: new Date('2026-05-14T10:00:00Z')
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'mem-5',
          display_name: 'Felipe Zurita',
          primary_email: 'felipe@efeonce.org',
          identity_email: null
        }
      ])

    mockedSend.mockResolvedValueOnce({ deliveryId: 'd-3', resendId: 'r-3', status: 'sent' })

    const result = await notifyBeneficiaryOfPaymentProfileChange({
      profileId: 'bpp-6',
      kind: 'approved'
    })

    expect(result.status).toBe('sent')

    const context = mockedSend.mock.calls[0][0].context

    expect(context).not.toHaveProperty('providerLabel')
    expect(context).toMatchObject({
      bankName: 'Banco Falabella',
      accountNumberMasked: '•••• 0996',
      currency: 'CLP'
    })
  })
})
