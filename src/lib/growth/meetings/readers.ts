import 'server-only'

import { createHubSpotMeetingSchedulingProvider } from './provider/hubspot'
import type { MeetingSchedulingProvider } from './provider/types'
import type { MeetingAvailability, MeetingSchedulerConfig } from './contracts'
import { MEETING_SCHEDULER_SCHEMA_VERSION } from './contracts'
import { resolveMeetingPrivacyHasher, type MeetingPrivacyHasher } from './privacy'
import { getMeetingSurfaceAuthority } from './store'
import { canonicalizeMeetingTimezone, resolveMeetingTimezone } from './timezone'

const DEFAULT_SCHEDULER_KEY = 'discovery'
const MAX_MONTH_OFFSET = 2
const AVAILABILITY_TTL_MS = 60_000

const consentKey = (hasher: MeetingPrivacyHasher, providerId: string): string =>
  `communications_${hasher.hmac('booking', `consent:${providerId}`).slice(0, 12)}`

const slotId = (hasher: MeetingPrivacyHasher, startsAt: string, durationMinutes: number): string =>
  `slot_${hasher.hmac('booking', `${startsAt}:${durationMinutes}`).slice(0, 16)}`

const calendarDateInTimezone = (startsAt: string, timezone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(startsAt))

  const value = (kind: string) => parts.find(part => part.type === kind)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

export const readMeetingSchedulerConfig = async (input: {
  surfaceId: string
  schedulerKey?: string
  origin: string | null
  timezone?: string | null
  provider?: MeetingSchedulingProvider
  hasher?: MeetingPrivacyHasher
  env?: NodeJS.ProcessEnv
}): Promise<MeetingSchedulerConfig | null> => {
  const schedulerKey = input.schedulerKey ?? DEFAULT_SCHEDULER_KEY
  const surface = await getMeetingSurfaceAuthority(input.surfaceId, schedulerKey)

  if (!surface || !input.origin || !surface.origins.includes(input.origin)) return null

  const provider = input.provider ?? createHubSpotMeetingSchedulingProvider()
  const hasher = input.hasher ?? await resolveMeetingPrivacyHasher()
  const resolvedTimezone = resolveMeetingTimezone(input.timezone, surface.defaultTimezone)
  const configuration = await provider.getConfiguration({ timezone: resolvedTimezone })
  const env = input.env ?? process.env
  const turnstileSiteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || env.TURNSTILE_SITE_KEY?.trim() || null

  return {
    schemaVersion: MEETING_SCHEDULER_SCHEMA_VERSION,
    schedulerKey,
    state: turnstileSiteKey ? 'available' : 'fallback_only',
    durationsMinutes: [configuration.meetingDurationMillis / 60_000],
    timezonePolicy: {
      defaultTimezone: surface.defaultTimezone,
      allowedTimezones: [resolvedTimezone],
      mode: 'visitor',
      resolvedTimezone,
    },
    localePolicy: { defaultLocale: 'es', allowedLocales: ['es'] },
    bookingWindow: { maxMonthOffset: MAX_MONTH_OFFSET },
    fields: [
      { key: 'first_name', inputType: 'text', label: 'Nombre', required: true, autocomplete: 'given-name', maxLength: 80 },
      { key: 'last_name', inputType: 'text', label: 'Apellido', required: true, autocomplete: 'family-name', maxLength: 80 },
      { key: 'email', inputType: 'email', label: 'Correo de trabajo', required: true, autocomplete: 'email', maxLength: 254 },
      { key: 'company', inputType: 'text', label: 'Empresa', required: configuration.companyRequired, autocomplete: 'organization', maxLength: 160 },
    ],
    consent: {
      processing: { required: true, policyVersion: 'efeonce-meeting-booking-v1' },
      communications: configuration.communicationConsents.map(item => ({
        consentKey: consentKey(hasher, item.providerId),
        label: item.label,
        required: item.required,
      })),
    },
    security: {
      captcha: {
        provider: 'turnstile',
        required: true,
        siteKey: turnstileSiteKey,
        action: 'meeting_booking',
        execution: 'submit',
      },
    },
    fallback: { enabled: true, url: surface.fallbackUrl },
  }
}

export const readMeetingAvailability = async (input: {
  surfaceId: string
  schedulerKey?: string
  origin: string | null
  timezone: string
  monthOffset: number
  provider?: MeetingSchedulingProvider
  hasher?: MeetingPrivacyHasher
  now?: Date
}): Promise<MeetingAvailability | null> => {
  const schedulerKey = input.schedulerKey ?? DEFAULT_SCHEDULER_KEY
  const surface = await getMeetingSurfaceAuthority(input.surfaceId, schedulerKey)
  const timezone = canonicalizeMeetingTimezone(input.timezone)

  if (
    !surface ||
    !input.origin ||
    !surface.origins.includes(input.origin) ||
    !timezone ||
    !Number.isInteger(input.monthOffset) ||
    input.monthOffset < 0 ||
    input.monthOffset > MAX_MONTH_OFFSET
  ) return null

  const provider = input.provider ?? createHubSpotMeetingSchedulingProvider()
  const hasher = input.hasher ?? await resolveMeetingPrivacyHasher()
  const config = await provider.getConfiguration({ timezone })

  const availability = await provider.getAvailability({
    timezone,
    monthOffset: input.monthOffset,
    meetingDurationMillis: config.meetingDurationMillis,
  })

  const now = input.now ?? new Date()
  const durationMinutes = config.meetingDurationMillis / 60_000
  const futureSlots = availability.slots.filter(slot => Date.parse(slot.startsAt) > now.valueOf())
  const grouped = new Map<string, MeetingAvailability['days'][number]['slots']>()

  for (const slot of futureSlots) {
    const date = calendarDateInTimezone(slot.startsAt, timezone)
    const slots = grouped.get(date) ?? []

    slots.push({
      slotId: slotId(hasher, slot.startsAt, durationMinutes),
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      durationMinutes,
    })
    grouped.set(date, slots)
  }

  return {
    schemaVersion: MEETING_SCHEDULER_SCHEMA_VERSION,
    schedulerKey,
    timezone,
    monthOffset: input.monthOffset,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.valueOf() + AVAILABILITY_TTL_MS).toISOString(),
    hasMore: availability.hasMore,
    state: grouped.size > 0 ? 'available' : 'empty',
    days: [...grouped.entries()].map(([date, slots]) => ({ date, slots })),
  }
}

export { consentKey as buildMeetingConsentKey, DEFAULT_SCHEDULER_KEY, MAX_MONTH_OFFSET }
