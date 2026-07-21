import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMeetingPrivacyHasher } from '../privacy'
import type { MeetingSchedulingProvider } from '../provider/types'
import { readMeetingAvailability, readMeetingSchedulerConfig } from '../readers'
import { getMeetingSurfaceAuthority } from '../store'

vi.mock('../store', () => ({
  getMeetingSurfaceAuthority: vi.fn(),
}))

const provider: MeetingSchedulingProvider = {
  getConfiguration: vi.fn().mockResolvedValue({
    meetingDurationMillis: 1_800_000,
    onlineUserIds: ['42'],
    companyRequired: true,
    legalConsentEnabled: true,
    communicationConsents: [],
  }),
  getAvailability: vi.fn(),
  book: vi.fn(),
}

const hasher = createMeetingPrivacyHasher('a-secure-test-secret-that-is-at-least-thirty-two-bytes')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMeetingSurfaceAuthority).mockResolvedValue({
    surfaceId: 'fhsf-public-test',
    schedulerKey: 'discovery',
    origins: ['https://efeoncepro.com'],
    fallbackUrl: 'https://meetings.hubspot.com/efeoncepro/agenda-discovery',
    defaultTimezone: 'America/Santiago',
    defaultLocale: 'es',
  })
})

describe('meeting scheduler config reader', () => {
  it('uses the existing public Turnstile site-key lane and exposes only browser-safe metadata', async () => {
    const config = await readMeetingSchedulerConfig({
      surfaceId: 'fhsf-public-test',
      origin: 'https://efeoncepro.com',
      provider,
      hasher,
      env: { NODE_ENV: 'test', NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'public-site-key' },
    })

    expect(config).toMatchObject({
      state: 'available',
      security: {
        captcha: {
          provider: 'turnstile',
          siteKey: 'public-site-key',
          action: 'meeting_booking',
          execution: 'submit',
        },
      },
    })
    expect(JSON.stringify(config)).not.toContain('secret')
  })

  it('fails closed to fallback-only when no public site key is configured', async () => {
    const config = await readMeetingSchedulerConfig({
      surfaceId: 'fhsf-public-test',
      origin: 'https://efeoncepro.com',
      provider,
      hasher,
      env: { NODE_ENV: 'test' },
    })

    expect(config).toMatchObject({
      state: 'fallback_only',
      security: { captcha: { siteKey: null } },
      fallback: { enabled: true },
    })
  })

  it('resuelve configuración y disponibilidad en la zona IANA del visitante', async () => {
    vi.mocked(provider.getAvailability).mockResolvedValueOnce({
      hasMore: false,
      slots: [{ startsAt: '2026-07-22T13:15:00.000Z', endsAt: '2026-07-22T13:45:00.000Z' }],
    })

    const config = await readMeetingSchedulerConfig({
      surfaceId: 'fhsf-public-test',
      origin: 'https://efeoncepro.com',
      timezone: 'America/Lima',
      provider,
      hasher,
      env: { NODE_ENV: 'test', NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'public-site-key' },
    })

    const availability = await readMeetingAvailability({
      surfaceId: 'fhsf-public-test',
      origin: 'https://efeoncepro.com',
      timezone: 'America/Lima',
      monthOffset: 0,
      provider,
      hasher,
      now: new Date('2026-07-21T12:00:00.000Z'),
    })

    expect(config?.timezonePolicy).toEqual({
      defaultTimezone: 'America/Santiago',
      allowedTimezones: ['America/Lima'],
      mode: 'visitor',
      resolvedTimezone: 'America/Lima',
    })
    expect(availability).toMatchObject({ timezone: 'America/Lima', days: [{ date: '2026-07-22' }] })
    expect(provider.getConfiguration).toHaveBeenCalledWith({ timezone: 'America/Lima' })
    expect(provider.getAvailability).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'America/Lima' }))
  })

  it('rechaza availability con una zona inventada antes de consultar HubSpot', async () => {
    const availability = await readMeetingAvailability({
      surfaceId: 'fhsf-public-test',
      origin: 'https://efeoncepro.com',
      timezone: 'Mars/Olympus',
      monthOffset: 0,
      provider,
      hasher,
    })

    expect(availability).toBeNull()
    expect(provider.getAvailability).not.toHaveBeenCalled()
  })
})
