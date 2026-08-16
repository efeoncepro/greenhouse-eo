import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  flags: vi.fn(),
  availability: vi.fn(),
  consent: vi.fn(),
  withdraw: vi.fn(),
  propose: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/lib/entitlements/runtime', () => ({ can: mocks.can }))
vi.mock('@/lib/hiring/talent-pool', () => ({
  talentPoolFlags: mocks.flags,
  updateTalentAvailability: mocks.availability,
  requestTalentPoolFutureConsent: mocks.consent,
  withdrawTalentPoolConsent: mocks.withdraw,
  proposeTalentInvitation: mocks.propose,
  inviteTalentToOpening: mocks.confirm
}))

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'

import {
  confirmAppTalentInvitation,
  proposeAppTalentInvitation,
  requestAppTalentFutureConsent,
  updateAppTalentAvailability,
  withdrawAppTalentFutureConsent
} from './app-hiring-talent-pool-commands'

const context = {
  requestId: 'request-1',
  tenant: { userId: 'user-1', tenantType: 'efeonce_internal' },
  oauthCorrelationId: 'corr-1'
} as unknown as AppPlatformRequestContext

const request = new Request('https://greenhouse.test/api/platform/app/hiring/talent-pool/EO-TLP-1', {
  method: 'POST',
  headers: { 'idempotency-key': 'idem_12345678' }
})

describe('Talent Pool App API commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.can.mockReturnValue(true)
    mocks.flags.mockReturnValue({ invite: true, selfService: true })

    for (const fn of [mocks.availability, mocks.consent, mocks.withdraw, mocks.propose, mocks.confirm]) {
      fn.mockResolvedValue({ ok: true })
    }
  })

  it('exposes each canonical command with actor, correlation and shared idempotency', async () => {
    await updateAppTalentAvailability({ context, request, talentProfileId: 'EO-TLP-1', body: { availability: 'now' } })
    await requestAppTalentFutureConsent({ context, request, talentProfileId: 'EO-TLP-1', body: {} })
    await withdrawAppTalentFutureConsent({ context, request, talentProfileId: 'EO-TLP-1', body: {} })
    await proposeAppTalentInvitation({ context, request, talentProfileId: 'EO-TLP-1', body: { openingId: 'open-1' } })
    await confirmAppTalentInvitation({
      context,
      request,
      talentProfileId: 'EO-TLP-1',
      body: { openingId: 'open-1', proposalRef: 'proposal-1' }
    })

    expect(mocks.availability).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1', idempotencyKey: 'idem_12345678', correlationId: 'corr-1' })
    )
    expect(mocks.consent).toHaveBeenCalledWith(expect.objectContaining({ source: 'internal_operator' }))
    expect(mocks.withdraw).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'internal_operator', actorType: 'operator' })
    )
    expect(mocks.propose).toHaveBeenCalledWith(expect.objectContaining({ requestedBy: 'user-1' }))
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ requestedBy: 'user-1', confirmedBy: 'user-1' })
    )
  })

  it('fails closed for a client tenant and while a rollout flag is off', async () => {
    await expect(
      updateAppTalentAvailability({
        context: { ...context, tenant: { ...context.tenant, tenantType: 'client' } },
        request,
        talentProfileId: 'EO-TLP-1',
        body: { availability: 'now' }
      })
    ).rejects.toMatchObject({ statusCode: 403 })

    mocks.flags.mockReturnValue({ invite: false, selfService: false })
    await expect(
      proposeAppTalentInvitation({
        context,
        request,
        talentProfileId: 'EO-TLP-1',
        body: { openingId: 'open-1' }
      })
    ).rejects.toMatchObject({ statusCode: 503 })
  })
})
