import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHubSpotMeetingSchedulingProvider } from '../provider/hubspot'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const detailsFixture = {
  linkId: 99,
  linkType: 'GROUP_CALENDAR',
  isOffline: false,
  allUsersBusyTimes: [
    { isOffline: false, meetingsUser: { userId: 42, calendarProvider: 'OFFICE365' } },
  ],
  customParams: {
    durations: [1_800_000],
    formFields: [{ name: 'company', fieldType: 'text', isRequired: true }],
    legalConsentEnabled: true,
    legalConsentOptions: {
      communicationConsentCheckboxes: [
        { communicationTypeId: 7, label: 'Quiero recibir novedades.', required: false },
      ],
    },
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HubSpot meeting scheduling provider', () => {
  it('normalizes configuration without exposing provider identifiers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detailsFixture)))
    const provider = createHubSpotMeetingSchedulingProvider({ getAccessToken: async () => 'secret' })

    const result = await provider.getConfiguration({ timezone: 'America/Santiago' })

    expect(result).toEqual({
      meetingDurationMillis: 1_800_000,
      onlineUserIds: ['42'],
      companyRequired: true,
      legalConsentEnabled: true,
      communicationConsents: [
        { providerId: '7', label: 'Quiero recibir novedades.', required: false },
      ],
    })
  })

  it('sorts and deduplicates exact-duration availability', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      linkAvailability: {
        hasMore: true,
        linkAvailabilityByDuration: {
          '1800000': {
            availabilities: [
              { startMillisUtc: 1_800_000, endMillisUtc: 3_600_000 },
              { startMillisUtc: 0 + 1_800_000, endMillisUtc: 3_600_000 },
              { startMillisUtc: 3_600_000, endMillisUtc: 5_400_000 },
            ],
          },
        },
      },
    })))
    const provider = createHubSpotMeetingSchedulingProvider({ getAccessToken: async () => 'secret' })

    const result = await provider.getAvailability({
      timezone: 'America/Santiago',
      monthOffset: 0,
      meetingDurationMillis: 1_800_000,
    })

    expect(result.hasMore).toBe(true)
    expect(result.slots).toHaveLength(2)
    expect(result.slots[0]?.startsAt).toBe('1970-01-01T00:30:00.000Z')
  })

  it('accepts only an exact online Teams booking', async () => {
    const startsAt = '2026-07-22T13:15:00.000Z'

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      isOffline: false,
      calendarEventId: 'calendar-secret',
      contactId: 123,
      webConferenceUrl: 'https://teams.microsoft.com/l/meetup-join/example',
      bookingTimezone: 'America/Santiago',
      start: Date.parse(startsAt),
      end: Date.parse(startsAt) + 1_800_000,
      duration: 1_800_000,
    })))
    const provider = createHubSpotMeetingSchedulingProvider({ getAccessToken: async () => 'secret' })

    const result = await provider.book({
      startsAt,
      meetingDurationMillis: 1_800_000,
      timezone: 'America/Santiago',
      locale: 'es',
      email: 'person@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      company: 'Analytical Engines',
      likelyAvailableUserIds: ['42'],
      legalConsentResponses: [{ providerId: '7', consented: false }],
    })

    expect(result).toMatchObject({
      startsAt,
      timezone: 'America/Santiago',
      channel: 'microsoft_teams',
    })
  })

  it('envía la zona del visitante en query y body del booking', async () => {
    const startsAt = '2026-07-22T13:15:00.000Z'

    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      isOffline: false,
      calendarEventId: 'calendar-secret',
      contactId: 123,
      webConferenceUrl: 'https://teams.microsoft.com/l/meetup-join/example',
      bookingTimezone: 'America/Lima',
      start: Date.parse(startsAt),
      end: Date.parse(startsAt) + 1_800_000,
      duration: 1_800_000,
    }))

    vi.stubGlobal('fetch', fetcher)
    const provider = createHubSpotMeetingSchedulingProvider({ getAccessToken: async () => 'secret' })

    await provider.book({
      startsAt,
      meetingDurationMillis: 1_800_000,
      timezone: 'America/Lima',
      locale: 'es',
      email: 'person@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      company: 'Analytical Engines',
      likelyAvailableUserIds: ['42'],
      legalConsentResponses: [],
    })

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('?timezone=America%2FLima'),
      expect.objectContaining({ body: expect.stringContaining('"timezone":"America/Lima"') }),
    )
  })

  it('compara aliases IANA por su zona canónica', async () => {
    const startsAt = '2026-07-22T13:15:00.000Z'

    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      isOffline: false,
      calendarEventId: 'calendar-secret',
      contactId: 123,
      webConferenceUrl: 'https://teams.microsoft.com/l/meetup-join/example',
      bookingTimezone: 'America/Los_Angeles',
      start: Date.parse(startsAt),
      end: Date.parse(startsAt) + 1_800_000,
      duration: 1_800_000,
    }))

    vi.stubGlobal('fetch', fetcher)
    const provider = createHubSpotMeetingSchedulingProvider({ getAccessToken: async () => 'secret' })

    const result = await provider.book({
      startsAt,
      meetingDurationMillis: 1_800_000,
      timezone: 'US/Pacific',
      locale: 'es',
      email: 'person@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      company: 'Analytical Engines',
      likelyAvailableUserIds: ['42'],
      legalConsentResponses: [],
    })

    expect(result.timezone).toBe('America/Los_Angeles')
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('?timezone=America%2FLos_Angeles'),
      expect.objectContaining({ body: expect.stringContaining('"timezone":"America/Los_Angeles"') }),
    )
  })

  it('fails closed when HubSpot returns an invalid conference host', async () => {
    const startsAt = '2026-07-22T13:15:00.000Z'

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      isOffline: false,
      calendarEventId: 'calendar-secret',
      contactId: 123,
      webConferenceUrl: 'https://attacker.example/meeting',
      bookingTimezone: 'America/Santiago',
      start: Date.parse(startsAt),
      end: Date.parse(startsAt) + 1_800_000,
      duration: 1_800_000,
    })))
    const provider = createHubSpotMeetingSchedulingProvider({ getAccessToken: async () => 'secret' })

    await expect(provider.book({
      startsAt,
      meetingDurationMillis: 1_800_000,
      timezone: 'America/Santiago',
      locale: 'es',
      email: 'person@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      company: 'Analytical Engines',
      likelyAvailableUserIds: ['42'],
      legalConsentResponses: [],
    })).rejects.toMatchObject({ category: 'degraded_booking', retryable: false })
  })

  it('does not include provider response bodies in safe HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'PII provider error' }, 429)))
    const provider = createHubSpotMeetingSchedulingProvider({ getAccessToken: async () => 'secret' })

    await expect(provider.getConfiguration({ timezone: 'America/Santiago' })).rejects.toMatchObject({
      category: 'rate_limited',
      retryable: true,
      safeMetadata: { httpStatus: 429, requestIdPresent: false },
    })
  })
})
