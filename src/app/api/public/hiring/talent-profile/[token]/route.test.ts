import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockCheckAllowed = vi.fn()
const mockResolve = vi.fn()
const mockRecordConsent = vi.fn()
const mockUpdateAvailability = vi.fn()
const mockWithdrawConsent = vi.fn()
const mockRevokeTokens = vi.fn()
const mockFlags = vi.fn()

vi.mock('@/lib/hiring/talent-pool', () => ({
  checkTalentPoolPublicRequestAllowed: (...args: unknown[]) => mockCheckAllowed(...args),
  deriveTalentPoolAccess: () => ({
    discoverable: false,
    contactable: false,
    allowedActions: [],
    reasonCodes: ['withdrawn']
  }),
  recordTalentPoolConsent: (...args: unknown[]) => mockRecordConsent(...args),
  resolveTalentPoolSelfServiceToken: (...args: unknown[]) => mockResolve(...args),
  revokeTalentPoolSelfServiceTokens: (...args: unknown[]) => mockRevokeTokens(...args),
  talentPoolFlags: () => mockFlags(),
  updateTalentAvailability: (...args: unknown[]) => mockUpdateAvailability(...args),
  withdrawTalentPoolConsent: (...args: unknown[]) => mockWithdrawConsent(...args)
}))

const { GET, POST } = await import('./route')

const token = 'A'.repeat(43)
const params = { params: Promise.resolve({ token }) }

const profile = {
  talentProfileId: 'talent-public-1',
  lifecycleStatus: 'needs_reconsent',
  futureConsentExpiresAt: null,
  availability: null,
  aggregateVersion: 2,
  access: {
    discoverable: false,
    contactable: false,
    allowedActions: ['read', 'grant_future_consent', 'withdraw'],
    reasonCodes: ['future_consent_required']
  },
  receipts: []
}

describe('/api/public/hiring/talent-profile/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFlags.mockReturnValue({ selfService: true })
    mockCheckAllowed.mockResolvedValue(true)
    mockResolve.mockResolvedValue({ membershipId: 'membership-private-1', profile })
    mockRevokeTokens.mockResolvedValue(undefined)
  })

  it('fails closed with the same unavailable response while the rollout flag is off', async () => {
    mockFlags.mockReturnValue({ selfService: false })

    const response = await GET(new Request(`https://greenhouse.local/${token}`), params)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.code).toBe('talent_pool_link_unavailable')
    expect(mockResolve).not.toHaveBeenCalled()
  })

  it('returns only the public profile allowlist and no private membership identifier', async () => {
    const response = await GET(new Request(`https://greenhouse.local/${token}`), params)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, profile })
    expect(JSON.stringify(body)).not.toContain('membership-private-1')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('records candidate consent canonically and returns its public receipt', async () => {
    mockRecordConsent.mockResolvedValue({ receiptId: 'EO-TLPR-ABC123', idempotent: false })
    mockResolve
      .mockResolvedValueOnce({ membershipId: 'membership-private-1', profile })
      .mockResolvedValueOnce({
        membershipId: 'membership-private-1',
        profile: { ...profile, lifecycleStatus: 'pool_eligible' }
      })

    const response = await POST(
      new Request(`https://greenhouse.local/${token}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'confirm', idempotencyKey: 'confirm_12345678' })
      }),
      params
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.receiptId).toBe('EO-TLPR-ABC123')
    expect(mockRecordConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        talentProfileId: 'talent-public-1',
        actorType: 'candidate',
        source: 'candidate_self_service',
        idempotencyKey: 'confirm_12345678'
      })
    )
  })

  it('withdraws first and revokes every active private link for that membership', async () => {
    mockWithdrawConsent.mockResolvedValue({
      receiptId: 'EO-TLPR-WITHDRAWN',
      idempotent: false,
      lifecycleStatus: 'withdrawn'
    })

    const response = await POST(
      new Request(`https://greenhouse.local/${token}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'withdraw', idempotencyKey: 'withdraw_12345678' })
      }),
      params
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.profile.lifecycleStatus).toBe('withdrawn')
    expect(mockWithdrawConsent).toHaveBeenCalledOnce()
    expect(mockRevokeTokens).toHaveBeenCalledWith('membership-private-1')
  })

  it('preserves an active process and its token when future contact is withdrawn', async () => {
    const activeProfile = { ...profile, lifecycleStatus: 'active_process' }

    mockResolve
      .mockResolvedValueOnce({ membershipId: 'membership-private-1', profile: activeProfile })
      .mockResolvedValueOnce({ membershipId: 'membership-private-1', profile: activeProfile })
    mockWithdrawConsent.mockResolvedValue({
      receiptId: 'EO-TLPR-ACTIVE',
      idempotent: false,
      lifecycleStatus: 'active_process'
    })

    const response = await POST(
      new Request(`https://greenhouse.local/${token}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'withdraw', idempotencyKey: 'withdraw_active_12345678' })
      }),
      params
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.profile.lifecycleStatus).toBe('active_process')
    expect(mockRevokeTokens).not.toHaveBeenCalled()
  })

  it('does not let a paused read-only profile reactivate itself through confirm', async () => {
    mockResolve.mockResolvedValue({
      membershipId: 'membership-private-1',
      profile: { ...profile, lifecycleStatus: 'paused', access: { ...profile.access, allowedActions: ['read'] } }
    })

    const response = await POST(
      new Request(`https://greenhouse.local/${token}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'confirm', idempotencyKey: 'confirm_paused_12345678' })
      }),
      params
    )

    expect(response.status).toBe(409)
    expect(mockRecordConsent).not.toHaveBeenCalled()
  })

  it('rate-limits before resolving a token', async () => {
    mockCheckAllowed.mockResolvedValue(false)

    const response = await GET(new Request(`https://greenhouse.local/${token}`), params)

    expect(response.status).toBe(429)
    expect(mockResolve).not.toHaveBeenCalled()
  })
})
