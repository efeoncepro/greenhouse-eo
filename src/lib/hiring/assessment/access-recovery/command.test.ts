import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ email: vi.fn(), secureLink: vi.fn() }))

vi.mock('./recover-email', () => ({ recoverCandidateTestAccessByEmail: mocks.email }))
vi.mock('./recover-secure-link', () => ({ recoverCandidateTestAccessBySecureLink: mocks.secureLink }))

import { recoverCandidateTestAccess } from './command'

const base = {
  assessmentId: 'asmt-11111111-1111-4111-8111-111111111111',
  reasonCode: 'alternate_channel_requested' as const,
  idempotencyKey: 'operator-action-0001',
  actorUserId: 'user-human',
}

describe('recoverCandidateTestAccess', () => {
  beforeEach(() => vi.clearAllMocks())

  it('delega exactamente un canal y deriva el actor sólo del input gobernado', async () => {
    mocks.email.mockResolvedValue({ replayed: false })

    await recoverCandidateTestAccess({ ...base, channel: 'email' })

    expect(mocks.email).toHaveBeenCalledWith({
      assessmentId: base.assessmentId,
      reasonCode: base.reasonCode,
      idempotencyKey: base.idempotencyKey,
    }, base.actorUserId)
    expect(mocks.secureLink).not.toHaveBeenCalled()

    mocks.secureLink.mockResolvedValue({ replayed: false })

    await recoverCandidateTestAccess({ ...base, channel: 'secure_link' })

    expect(mocks.secureLink).toHaveBeenCalledTimes(1)
    expect(mocks.email).toHaveBeenCalledTimes(1)
  })

  it('rechaza fail-closed un canal ajeno al contrato', async () => {
    await expect(recoverCandidateTestAccess({
      ...base,
      channel: 'sms' as 'email',
    })).rejects.toMatchObject({ code: 'assessment_recovery_invalid_channel' })
    expect(mocks.email).not.toHaveBeenCalled()
    expect(mocks.secureLink).not.toHaveBeenCalled()
  })
})
