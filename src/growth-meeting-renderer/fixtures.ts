import type { MeetingApiClient } from './api-client'
import {
  MEETING_SCHEDULER_SCHEMA_VERSION,
  type MeetingAvailability,
  type MeetingBookingConfirmed,
  type MeetingPublicError,
  type MeetingSchedulerConfig,
} from './contract'

export const meetingConfigFixture = (): MeetingSchedulerConfig => ({
  schemaVersion: MEETING_SCHEDULER_SCHEMA_VERSION,
  schedulerKey: 'efeonce-discovery-30',
  state: 'available',
  durationsMinutes: [30],
  timezonePolicy: {
    defaultTimezone: 'America/Santiago',
    allowedTimezones: ['America/Santiago'],
  },
  localePolicy: { defaultLocale: 'es', allowedLocales: ['es'] },
  bookingWindow: { maxMonthOffset: 2 },
  fields: [
    { key: 'first_name', inputType: 'text', label: 'Nombre', required: true, autocomplete: 'given-name', maxLength: 80 },
    { key: 'last_name', inputType: 'text', label: 'Apellido', required: true, autocomplete: 'family-name', maxLength: 80 },
    { key: 'email', inputType: 'email', label: 'Correo de trabajo', required: true, autocomplete: 'email', maxLength: 254 },
    { key: 'company', inputType: 'text', label: 'Empresa', required: true, autocomplete: 'organization', maxLength: 160 },
  ],
  consent: {
    processing: { required: true, policyVersion: '2026-07-21' },
    communications: [{ consentKey: 'growth_updates', label: 'Quiero recibir ideas y novedades de Efeonce.', required: false }],
  },
  security: {
    captcha: {
      provider: 'turnstile',
      required: true,
      siteKey: 'preview-turnstile-site-key',
      action: 'meeting_booking',
      execution: 'submit',
    },
  },
  fallback: { enabled: true, url: 'https://meetings.hubspot.com/efeonce' },
})

const slot = (startsAt: string) => {
  const start = new Date(startsAt)
  const end = new Date(start.getTime() + 30 * 60_000)

  return {
    slotId: `preview-${start.toISOString()}`,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    durationMinutes: 30,
  }
}

export const meetingAvailabilityFixture = (): MeetingAvailability => ({
  schemaVersion: MEETING_SCHEDULER_SCHEMA_VERSION,
  schedulerKey: 'efeonce-discovery-30',
  timezone: 'America/Santiago',
  monthOffset: 0,
  fetchedAt: '2026-07-21T12:00:00.000Z',
  expiresAt: '2026-07-21T12:05:00.000Z',
  hasMore: true,
  state: 'available',
  days: [
    { date: '2026-07-22', slots: [slot('2026-07-22T13:15:00.000Z'), slot('2026-07-22T14:30:00.000Z'), slot('2026-07-22T18:00:00.000Z')] },
    { date: '2026-07-23', slots: [slot('2026-07-23T12:30:00.000Z'), slot('2026-07-23T15:00:00.000Z'), slot('2026-07-23T16:30:00.000Z'), slot('2026-07-23T19:00:00.000Z')] },
    { date: '2026-07-24', slots: [slot('2026-07-24T14:00:00.000Z'), slot('2026-07-24T17:30:00.000Z')] },
    { date: '2026-07-27', slots: [slot('2026-07-27T13:00:00.000Z'), slot('2026-07-27T15:30:00.000Z'), slot('2026-07-27T18:30:00.000Z')] },
    { date: '2026-07-28', slots: [slot('2026-07-28T14:30:00.000Z')] },
  ],
})

export const meetingConfirmedFixture = (): MeetingBookingConfirmed => ({
  outcome: 'confirmed',
  appointment: {
    startsAt: '2026-07-22T13:15:00.000Z',
    endsAt: '2026-07-22T13:45:00.000Z',
    timezone: 'America/Santiago',
    durationMinutes: 30,
    channel: 'microsoft_teams',
  },
  conversionEligible: true,
  conversionReceipt: 'preview-receipt-00000000000000000000000000000000',
})

export type MeetingFixtureOutcome = 'confirmed' | 'ambiguous' | 'slot_unavailable'

export const createMeetingFixtureApi = (outcome: MeetingFixtureOutcome = 'confirmed'): MeetingApiClient => ({
  async config() {
    return meetingConfigFixture()
  },
  async availability() {
    return meetingAvailabilityFixture()
  },
  async book() {
    if (outcome === 'confirmed') return meetingConfirmedFixture()

    const error: MeetingPublicError = outcome === 'ambiguous'
      ? { outcome: 'error', error: { code: 'provider_degraded', recovery: 'check_email', retryable: false } }
      : { outcome: 'error', error: { code: 'slot_unavailable', recovery: 'refresh_availability', retryable: true } }

    return error
  },
})
