import {
  MEETING_SCHEDULER_SCHEMA_VERSION,
  type MeetingAvailability,
  type MeetingBookingConfirmed,
  type MeetingPublicError,
  type MeetingPublicErrorCode,
  type MeetingSchedulerConfig,
} from './contract'

export interface MeetingBookingPayload {
  schedulerKey: string
  surfaceId: string
  slot: { startsAt: string; durationMinutes: number; timezone: string }
  locale: 'es'
  contact: { email: string; firstName: string; lastName: string; company: string }
  consent: { processingAccepted: boolean; communicationKeys: string[] }
  captchaToken: string
  attribution?: { placement?: string; pagePath?: string }
}

export interface MeetingApiClient {
  config(input: { surfaceId: string; schedulerKey: string; timezone: string; signal?: AbortSignal }): Promise<MeetingSchedulerConfig>
  availability(input: {
    surfaceId: string
    schedulerKey: string
    timezone: string
    monthOffset: number
    signal?: AbortSignal
  }): Promise<MeetingAvailability>
  book(input: MeetingBookingPayload, idempotencyKey: string, signal?: AbortSignal): Promise<MeetingBookingConfirmed | MeetingPublicError>
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object'
const string = (value: unknown): value is string => typeof value === 'string'
const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const PUBLIC_ERRORS = new Set<MeetingPublicErrorCode>([
  'unavailable', 'slot_unavailable', 'validation_failed', 'captcha_failed',
  'rate_limited', 'booking_rejected', 'provider_degraded',
])

export const isMeetingSchedulerConfig = (value: unknown): value is MeetingSchedulerConfig => {
  if (!object(value) || value.schemaVersion !== MEETING_SCHEDULER_SCHEMA_VERSION) return false
  if (!string(value.schedulerKey) || !['available', 'fallback_only', 'unavailable'].includes(String(value.state))) return false
  if (!Array.isArray(value.durationsMinutes) || !value.durationsMinutes.every(finiteNumber)) return false
  if (
    !object(value.timezonePolicy) ||
    !string(value.timezonePolicy.defaultTimezone) ||
    !Array.isArray(value.timezonePolicy.allowedTimezones) ||
    value.timezonePolicy.mode !== 'visitor' ||
    !string(value.timezonePolicy.resolvedTimezone)
  ) return false
  if (!Array.isArray(value.fields) || !object(value.consent) || !object(value.fallback) || !string(value.fallback.url)) return false
  if (!object(value.security) || !object(value.security.captcha)) return false

  const captcha = value.security.captcha

  return captcha.provider === 'turnstile' && captcha.required === true &&
    (captcha.siteKey === null || string(captcha.siteKey)) && captcha.action === 'meeting_booking'
}

export const isMeetingAvailability = (value: unknown): value is MeetingAvailability => {
  if (!object(value) || value.schemaVersion !== MEETING_SCHEDULER_SCHEMA_VERSION) return false
  if (!string(value.schedulerKey) || !string(value.timezone) || !finiteNumber(value.monthOffset) || !Array.isArray(value.days)) return false

  return value.days.every(day => object(day) && string(day.date) && Array.isArray(day.slots) && day.slots.every(slot =>
    object(slot) && string(slot.slotId) && string(slot.startsAt) && string(slot.endsAt) && finiteNumber(slot.durationMinutes),
  ))
}

export const isMeetingBookingResponse = (value: unknown): value is MeetingBookingConfirmed | MeetingPublicError => {
  if (!object(value)) return false

  if (value.outcome === 'confirmed') {
    return object(value.appointment) && string(value.appointment.startsAt) && string(value.appointment.endsAt) &&
      string(value.appointment.timezone) && finiteNumber(value.appointment.durationMinutes) &&
      value.appointment.channel === 'microsoft_teams' && typeof value.conversionEligible === 'boolean' &&
      (value.conversionReceipt === null || string(value.conversionReceipt))
  }

  if (value.outcome !== 'error' || !object(value.error) || !string(value.error.code)) return false

  return PUBLIC_ERRORS.has(value.error.code as MeetingPublicErrorCode) &&
    ['retry', 'refresh_availability', 'open_fallback', 'check_email'].includes(String(value.error.recovery)) &&
    typeof value.error.retryable === 'boolean'
}

const parseJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.toLowerCase().includes('application/json')) throw new Error('meeting_contract_error')

  return response.json() as Promise<unknown>
}

export const createMeetingApiClient = (baseUrl: string, fetcher: typeof fetch = fetch): MeetingApiClient => {
  const base = baseUrl.replace(/\/$/, '')

  return {
    async config(input) {
      const query = new URLSearchParams({
        surfaceId: input.surfaceId,
        schedulerKey: input.schedulerKey,
        timezone: input.timezone,
      })

      const response = await fetcher(`${base}/api/public/growth/meetings/config?${query}`, {
        signal: input.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      const data = await parseJson(response)

      if (!response.ok || !isMeetingSchedulerConfig(data)) throw new Error('meeting_config_unavailable')

      return data
    },

    async availability(input) {
      const query = new URLSearchParams({
        surfaceId: input.surfaceId,
        schedulerKey: input.schedulerKey,
        timezone: input.timezone,
        monthOffset: String(input.monthOffset),
      })

      const response = await fetcher(`${base}/api/public/growth/meetings/availability?${query}`, {
        signal: input.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      const data = await parseJson(response)

      if (!response.ok || !isMeetingAvailability(data)) throw new Error('meeting_availability_unavailable')

      return data
    },

    async book(input, idempotencyKey, signal) {
      let response: Response

      try {
        response = await fetcher(`${base}/api/public/growth/meetings/book`, {
          method: 'POST',
          signal,
          cache: 'no-store',
          redirect: 'error',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(input),
        })
      } catch {
        return {
          outcome: 'error',
          error: { code: 'provider_degraded', recovery: 'check_email', retryable: false },
        }
      }

      const data = await parseJson(response)

      if (!isMeetingBookingResponse(data)) {
        return {
          outcome: 'error',
          error: { code: 'provider_degraded', recovery: 'check_email', retryable: false },
        }
      }

      return data
    },
  }
}
