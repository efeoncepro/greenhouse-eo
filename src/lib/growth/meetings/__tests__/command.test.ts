import { beforeEach, describe, expect, it, vi } from 'vitest'

import { bookMeeting } from '../command'
import { createMeetingPrivacyHasher } from '../privacy'
import { MeetingProviderError, type MeetingSchedulingProvider } from '../provider/types'
import {
  claimMeetingBooking,
  finalizeMeetingExecution,
  getMeetingSurfaceAuthority,
  markMeetingProviderDispatched,
  recordMeetingMetric,
} from '../store'

vi.mock('../store', () => ({
  claimMeetingBooking: vi.fn(),
  finalizeMeetingExecution: vi.fn(),
  getMeetingSurfaceAuthority: vi.fn(),
  markMeetingProviderDispatched: vi.fn(),
  recordMeetingMetric: vi.fn(),
}))

const startsAt = '2026-07-22T13:15:00.000Z'

const input = {
  schedulerKey: 'discovery',
  surfaceId: 'fhsf-public-test',
  idempotencyKey: 'booking_12345678',
  slot: { startsAt, durationMinutes: 30, timezone: 'America/Santiago' },
  locale: 'es',
  contact: { email: 'person@example.com', firstName: 'Ada', lastName: 'Lovelace', company: 'Engines' },
  consent: { processingAccepted: true, communicationKeys: [] },
  captchaToken: 'captcha',
}

const hasher = createMeetingPrivacyHasher('a-secure-test-secret-that-is-at-least-thirty-two-bytes')

const provider = (): MeetingSchedulingProvider => ({
  getConfiguration: vi.fn().mockResolvedValue({
    meetingDurationMillis: 1_800_000,
    onlineUserIds: ['42'],
    companyRequired: true,
    legalConsentEnabled: true,
    communicationConsents: [{ providerId: '7', label: 'News', required: false }],
  }),
  getAvailability: vi.fn().mockResolvedValue({
    hasMore: false,
    slots: [{ startsAt, endsAt: '2026-07-22T13:45:00.000Z' }],
  }),
  book: vi.fn().mockResolvedValue({
    startsAt,
    endsAt: '2026-07-22T13:45:00.000Z',
    timezone: 'America/Santiago',
    meetingDurationMillis: 1_800_000,
    channel: 'microsoft_teams',
    providerEvidence: {
      calendarEventId: 'private-calendar-id',
      contactId: 'private-contact-id',
      webConferenceUrl: 'https://teams.microsoft.com/private',
    },
  }),
})

const context = (meetingProvider: MeetingSchedulingProvider) => ({
  origin: 'https://efeoncepro.com',
  ip: '192.0.2.1',
  env: { ...process.env, GROWTH_NATIVE_MEETING_SCHEDULER_ENABLED: 'true' },
  provider: meetingProvider,
  hasher,
  captchaVerifier: { verify: vi.fn().mockResolvedValue({ ok: true, reason: 'verified' }) },
  now: new Date('2026-07-21T12:00:00.000Z'),
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMeetingSurfaceAuthority).mockResolvedValue({
    surfaceId: input.surfaceId,
    schedulerKey: input.schedulerKey,
    origins: ['https://efeoncepro.com'],
    fallbackUrl: 'https://meetings.hubspot.com/efeoncepro/agenda-discovery',
    defaultTimezone: 'America/Santiago',
    defaultLocale: 'es',
  })
  vi.mocked(claimMeetingBooking).mockResolvedValue({ kind: 'claimed', executionId: 'mbex-test' })
  vi.mocked(markMeetingProviderDispatched).mockResolvedValue(true)
  vi.mocked(finalizeMeetingExecution).mockResolvedValue(true)
  vi.mocked(recordMeetingMetric).mockResolvedValue(undefined)
})

describe('meeting booking command', () => {
  it('returns a browser-safe confirmed response only after ledger success', async () => {
    const meetingProvider = provider()
    const result = await bookMeeting(input, context(meetingProvider))

    expect(result).toMatchObject({
      outcome: 'confirmed',
      conversionEligible: true,
      appointment: { channel: 'microsoft_teams', durationMinutes: 30 },
    })
    expect(JSON.stringify(result)).not.toContain('private-calendar-id')
    expect(JSON.stringify(result)).not.toContain('private-contact-id')
    expect(JSON.stringify(result)).not.toContain('teams.microsoft.com')
    expect(markMeetingProviderDispatched).toHaveBeenCalledBefore(vi.mocked(meetingProvider.book))
    expect(finalizeMeetingExecution).toHaveBeenCalledWith(expect.objectContaining({ state: 'succeeded' }))
  })

  it('reserva en la zona del visitante aunque la surface tenga Santiago como default', async () => {
    const meetingProvider = provider()

    const visitorInput = {
      ...input,
      slot: { ...input.slot, timezone: 'America/Lima' },
    }

    vi.mocked(meetingProvider.book).mockResolvedValueOnce({
      startsAt,
      endsAt: '2026-07-22T13:45:00.000Z',
      timezone: 'America/Lima',
      meetingDurationMillis: 1_800_000,
      channel: 'microsoft_teams',
      providerEvidence: {
        calendarEventId: 'private-calendar-id',
        contactId: 'private-contact-id',
        webConferenceUrl: 'https://teams.microsoft.com/private',
      },
    })

    const result = await bookMeeting(visitorInput, context(meetingProvider))

    expect(result).toMatchObject({ outcome: 'confirmed', appointment: { timezone: 'America/Lima' } })
    expect(meetingProvider.getAvailability).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'America/Lima' }))
    expect(meetingProvider.book).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'America/Lima' }))
    expect(claimMeetingBooking).toHaveBeenCalledWith(expect.objectContaining({ requestedTimezone: 'America/Lima' }))
  })

  it('rechaza una zona inválida antes de consultar o escribir en HubSpot', async () => {
    const meetingProvider = provider()

    const result = await bookMeeting({
      ...input,
      slot: { ...input.slot, timezone: 'Mars/Olympus' },
    }, context(meetingProvider))

    expect(result).toMatchObject({ outcome: 'error', error: { code: 'validation_failed' } })
    expect(meetingProvider.getConfiguration).not.toHaveBeenCalled()
    expect(meetingProvider.getAvailability).not.toHaveBeenCalled()
    expect(meetingProvider.book).not.toHaveBeenCalled()
  })

  it('replays without a provider write or a second conversion receipt', async () => {
    const meetingProvider = provider()

    vi.mocked(claimMeetingBooking).mockResolvedValue({
      kind: 'replay',
      executionId: 'mbex-test',
      startsAt,
      durationMs: 1_800_000,
      timezone: 'America/Santiago',
    })

    const result = await bookMeeting(input, context(meetingProvider))

    expect(result).toMatchObject({ outcome: 'confirmed', conversionEligible: false, conversionReceipt: null })
    expect(meetingProvider.book).not.toHaveBeenCalled()
  })

  it('marks every post-dispatch transport uncertainty ambiguous and requires email recovery', async () => {
    const meetingProvider = provider()

    vi.mocked(meetingProvider.book).mockRejectedValue(new MeetingProviderError('timeout_ambiguous', false))

    const result = await bookMeeting(input, context(meetingProvider))

    expect(result).toEqual({
      outcome: 'error',
      error: { code: 'provider_degraded', recovery: 'check_email', retryable: false },
    })
    expect(finalizeMeetingExecution).toHaveBeenCalledWith(expect.objectContaining({ state: 'ambiguous' }))
  })

  it('fails before provider access when the origin is not authorized', async () => {
    const meetingProvider = provider()
    const result = await bookMeeting(input, { ...context(meetingProvider), origin: 'https://attacker.example' })

    expect(result).toMatchObject({ outcome: 'error', error: { code: 'unavailable' } })
    expect(meetingProvider.getConfiguration).not.toHaveBeenCalled()
    expect(meetingProvider.book).not.toHaveBeenCalled()
  })
})
