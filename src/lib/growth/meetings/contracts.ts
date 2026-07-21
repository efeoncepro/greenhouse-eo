export const MEETING_SCHEDULER_SCHEMA_VERSION = 'growth-meeting-scheduler.v1' as const

export type MeetingSchedulerState = 'available' | 'fallback_only' | 'unavailable'

export type MeetingFieldKey = 'first_name' | 'last_name' | 'email' | 'company'

export interface MeetingSchedulerConfig {
  schemaVersion: typeof MEETING_SCHEDULER_SCHEMA_VERSION
  schedulerKey: string
  state: MeetingSchedulerState
  durationsMinutes: number[]
  timezonePolicy: {
    defaultTimezone: string
    allowedTimezones: string[]
  }
  localePolicy: {
    defaultLocale: 'es'
    allowedLocales: ['es']
  }
  bookingWindow: {
    maxMonthOffset: number
  }
  fields: Array<{
    key: MeetingFieldKey
    inputType: 'text' | 'email'
    label: string
    required: boolean
    autocomplete: string
    maxLength: number
  }>
  consent: {
    processing: { required: true; policyVersion: string }
    communications: Array<{ consentKey: string; label: string; required: boolean }>
  }
  fallback: {
    enabled: boolean
    url: string
  }
}

export interface MeetingAvailabilitySlot {
  slotId: string
  startsAt: string
  endsAt: string
  durationMinutes: number
}

export interface MeetingAvailability {
  schemaVersion: typeof MEETING_SCHEDULER_SCHEMA_VERSION
  schedulerKey: string
  timezone: string
  monthOffset: number
  fetchedAt: string
  expiresAt: string
  hasMore: boolean
  state: 'available' | 'empty' | 'fallback_only'
  days: Array<{ date: string; slots: MeetingAvailabilitySlot[] }>
}

export interface MeetingBookingRequest {
  schedulerKey: string
  surfaceId: string
  idempotencyKey: string
  slot: {
    startsAt: string
    durationMinutes: number
    timezone: string
  }
  locale: 'es'
  contact: {
    email: string
    firstName: string
    lastName: string
    company: string
  }
  consent: {
    processingAccepted: boolean
    communicationKeys: string[]
  }
  captchaToken: string
  attribution?: {
    placement?: string
    pagePath?: string
    referrerHost?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }
}

export interface MeetingBookingConfirmed {
  outcome: 'confirmed'
  appointment: {
    startsAt: string
    endsAt: string
    timezone: string
    durationMinutes: number
    channel: 'microsoft_teams'
  }
  /** Present only on the first confirmed response; replays never re-enable analytics conversion. */
  conversionReceipt: string | null
  conversionEligible: boolean
}

export type MeetingPublicErrorCode =
  | 'unavailable'
  | 'slot_unavailable'
  | 'validation_failed'
  | 'captcha_failed'
  | 'rate_limited'
  | 'booking_rejected'
  | 'provider_degraded'

export interface MeetingPublicError {
  outcome: 'error'
  error: {
    code: MeetingPublicErrorCode
    recovery: 'retry' | 'refresh_availability' | 'open_fallback' | 'check_email'
    retryable: boolean
  }
}
