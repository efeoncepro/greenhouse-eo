export const MEETING_SCHEDULER_SCHEMA_VERSION = 'growth-meeting-scheduler.v1' as const

export const MEETING_GTM_EVENTS = {
  stepReached: 'gh_meeting_step_reached',
  bookingConfirmed: 'gh_meeting_booking_confirmed',
} as const

export const MEETING_STEPS = [
  'viewed',
  'availability_loaded',
  'availability_failed',
  'date_selected',
  'slot_selected',
  'details_started',
  'validation_failed',
  'booking_started',
  'booking_failed',
  'fallback_opened',
] as const

export const MEETING_AVAILABILITY_STATES = [
  'available',
  'empty',
  'partial',
  'fallback_only',
  'degraded',
  'unavailable',
] as const

export const MEETING_DAYS_AHEAD_BUCKETS = [
  'same_day',
  '1_3_days',
  '4_7_days',
  '8_14_days',
  '15_30_days',
  '31_plus_days',
] as const

export const MEETING_TIME_OF_DAY_BUCKETS = ['overnight', 'morning', 'afternoon', 'evening'] as const

export const MEETING_TELEMETRY_PAYLOAD_KEYS = [
  'meeting_step',
  'scheduler_key',
  'surface_id',
  'placement',
  'availability_state',
  'days_ahead_bucket',
  'time_of_day_bucket',
  'error_category',
  'renderer_version',
  'contract_version',
] as const

export type MeetingStep = (typeof MEETING_STEPS)[number]
export type MeetingAvailabilityState = (typeof MEETING_AVAILABILITY_STATES)[number]
export type MeetingDaysAheadBucket = (typeof MEETING_DAYS_AHEAD_BUCKETS)[number]
export type MeetingTimeOfDayBucket = (typeof MEETING_TIME_OF_DAY_BUCKETS)[number]

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
  security: {
    captcha: {
      provider: 'turnstile'
      required: true
      siteKey: string | null
      action: 'meeting_booking'
      execution: 'submit'
    }
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
