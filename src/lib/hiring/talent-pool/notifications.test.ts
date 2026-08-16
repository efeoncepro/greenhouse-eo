import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockAlreadySent = vi.fn()
const mockIssueToken = vi.fn()
const mockSendEmail = vi.fn()
const mockFlags = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))
vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  wasEmailAlreadySent: (...args: unknown[]) => mockAlreadySent(...args)
}))
vi.mock('@/lib/hiring/notifications', () => ({ hiringPublicBaseUrl: () => 'https://greenhouse.example' }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('./config', () => ({ talentPoolFlags: () => mockFlags() }))
vi.mock('./self-service', () => ({
  issueTalentPoolSelfServiceToken: (...args: unknown[]) => mockIssueToken(...args)
}))

const { sendTalentPoolVerificationEmail } = await import('./notifications')

describe('sendTalentPoolVerificationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFlags.mockReturnValue({ selfService: true })
    mockAlreadySent.mockResolvedValue(false)
    mockIssueToken.mockResolvedValue({ token: 'private-token', tokenTtlDays: 30 })
    mockSendEmail.mockResolvedValue({ status: 'sent' })
    mockQuery.mockResolvedValue([
      {
        consent_event_id: 'consent-1',
        membership_id: 'membership-1',
        talent_profile_id: 'talent-public-1',
        candidate_email: 'candidate@example.com',
        candidate_name: 'Candidate Example',
        is_current_request: true
      }
    ])
  })

  it('does not read, mint a token, or send while self-service is disabled', async () => {
    mockFlags.mockReturnValue({ selfService: false })

    expect(await sendTalentPoolVerificationEmail('consent-1', {})).toContain('flag OFF')
    expect(mockQuery).not.toHaveBeenCalled()
    expect(mockIssueToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('checks durable delivery dedupe before rotating the private link', async () => {
    mockAlreadySent.mockResolvedValue(true)

    expect(await sendTalentPoolVerificationEmail('consent-1', { _eventId: 'event-1' })).toContain('dedupe')
    expect(mockAlreadySent).toHaveBeenCalledWith('event-1', 'consent-1', 'candidate@example.com')
    expect(mockIssueToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends the agency-branded verification link without putting PII in the outbox payload', async () => {
    const result = await sendTalentPoolVerificationEmail('consent-1', { _eventId: 'event-1' })

    expect(result).toContain('sent')
    expect(mockIssueToken).toHaveBeenCalledWith({ membershipId: 'membership-1' })
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'hiring_talent_pool_verification',
        recipients: [{ email: 'candidate@example.com', name: 'Candidate Example' }],
        context: expect.objectContaining({
          profileUrl: 'https://greenhouse.example/public/careers/talent-profile/private-token',
          tokenTtlDays: 30
        }),
        sourceEventId: 'event-1',
        sourceEntity: 'consent-1'
      })
    )
  })
})
