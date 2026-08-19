import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockClaimIntent = vi.fn()
const mockIssueToken = vi.fn()
const mockSendEmail = vi.fn()
const mockFlags = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))
vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  claimTokenSensitiveEmailIntent: (...args: unknown[]) => mockClaimIntent(...args)
}))
vi.mock('@/lib/hiring/notifications', () => ({ hiringPublicBaseUrl: () => 'https://greenhouse.example' }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('./config', () => ({ talentPoolFlags: () => mockFlags() }))
vi.mock('./self-service', () => ({
  issueTalentPoolSelfServiceTokenWithClient: (...args: unknown[]) => mockIssueToken(...args)
}))

const { sendTalentPoolVerificationEmail } = await import('./notifications')

describe('sendTalentPoolVerificationEmail', () => {
  const consentEventId = 'tlpc-11111111-1111-4111-8111-111111111111'
  const outboxEventId = 'outbox-22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    vi.clearAllMocks()
    mockFlags.mockReturnValue({ selfService: true })
    mockIssueToken.mockResolvedValue({ token: 'private-token', tokenTtlDays: 30 })
    mockClaimIntent.mockImplementation(async input => ({
      claimed: true,
      deliveryId: 'delivery-intent-1',
      value: await input.issueCredential({})
    }))
    mockSendEmail.mockResolvedValue({ status: 'sent' })
    mockQuery.mockResolvedValue([
      {
        consent_event_id: consentEventId,
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

    expect(await sendTalentPoolVerificationEmail(consentEventId, {})).toContain('flag OFF')
    expect(mockQuery).not.toHaveBeenCalled()
    expect(mockIssueToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('checks durable delivery dedupe before rotating the private link', async () => {
    mockClaimIntent.mockResolvedValue({ claimed: false, deliveryId: 'delivery-existing', value: null })

    expect(await sendTalentPoolVerificationEmail(consentEventId, { _eventId: outboxEventId })).toContain('dedupe')
    expect(mockIssueToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not send when the consent request is no longer current inside the claim transaction', async () => {
    mockIssueToken.mockResolvedValue(null)

    const result = await sendTalentPoolVerificationEmail(consentEventId, { _eventId: outboxEventId })

    expect(result).toContain('sin token emitido')
    expect(mockIssueToken).toHaveBeenCalledWith({}, { membershipId: 'membership-1', consentEventId })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends the agency-branded verification link without putting PII in the outbox payload', async () => {
    const result = await sendTalentPoolVerificationEmail(consentEventId, { _eventId: outboxEventId })

    expect(result).toContain('sent')
    expect(mockIssueToken).toHaveBeenCalledWith({}, { membershipId: 'membership-1', consentEventId })
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'hiring_talent_pool_verification',
        recipients: [{ email: 'candidate@example.com', name: 'Candidate Example' }],
        context: expect.objectContaining({
          profileUrl: 'https://greenhouse.example/public/careers/talent-profile/private-token',
          tokenTtlDays: 30
        }),
        sourceEventId: outboxEventId,
        sourceEntity: consentEventId,
        persistence: expect.objectContaining({ deliveryIntentId: 'delivery-intent-1' })
      })
    )
  })
})
