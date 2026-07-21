import 'server-only'

import { createHash } from 'node:crypto'

import { z } from 'zod'

import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { canonicalizeMeetingTimezone } from '@/lib/growth/meetings/timezone'

import {
  MeetingProviderError,
  type MeetingSchedulingProvider,
  type ProviderAvailability,
  type ProviderBookingInput,
  type ProviderBookingOutcome,
  type ProviderConfiguration,
} from './types'

const API_BASE = 'https://api.hubapi.com/scheduler/2026-03/meetings/meeting-links/book'
const DEFAULT_SLUG = 'efeoncepro/agenda-discovery'
const REQUEST_TIMEOUT_MS = 8_000
const MAX_RESPONSE_BYTES = 1_000_000

const nonEmptyString = z.string().trim().min(1)

const detailsSchema = z.object({
  linkId: z.union([nonEmptyString, z.number()]),
  linkType: z.literal('GROUP_CALENDAR'),
  isOffline: z.literal(false),
  allUsersBusyTimes: z.array(z.object({
    isOffline: z.boolean(),
    meetingsUser: z.object({
      userId: z.union([z.string(), z.number()]),
      calendarProvider: z.string(),
    }).passthrough(),
  }).passthrough()),
  customParams: z.object({
    durations: z.array(z.number().int().positive()).min(1),
    formFields: z.array(z.object({
      name: z.string(),
      fieldType: z.string(),
      isRequired: z.boolean().optional(),
    }).passthrough()),
    legalConsentEnabled: z.boolean(),
    legalConsentOptions: z.object({
      communicationConsentCheckboxes: z.array(z.object({
        communicationTypeId: z.union([z.string(), z.number()]),
        label: nonEmptyString,
        required: z.boolean().optional(),
      }).passthrough()).default([]),
    }).passthrough().optional(),
  }).passthrough(),
}).passthrough()

const availabilitySchema = z.object({
  linkAvailability: z.object({
    hasMore: z.boolean().optional(),
    linkAvailabilityByDuration: z.record(z.string(), z.object({
      availabilities: z.array(z.object({
        startMillisUtc: z.number().int().safe().positive(),
        endMillisUtc: z.number().int().safe().positive(),
      }).passthrough()),
    }).passthrough()),
  }).passthrough(),
}).passthrough()

const bookingSchema = z.object({
  isOffline: z.literal(false),
  calendarEventId: nonEmptyString,
  contactId: z.union([nonEmptyString, z.number()]).transform(String),
  webConferenceUrl: z.string().url(),
  bookingTimezone: nonEmptyString,
  start: z.union([z.number().int().safe(), nonEmptyString]),
  end: z.union([z.number().int().safe(), nonEmptyString]),
  duration: z.number().int().positive(),
}).passthrough()

const encodeSlug = (slug: string): string => encodeURIComponent(slug)

const toIso = (value: string | number): string => {
  const date = new Date(typeof value === 'number' ? value : value)

  if (!Number.isFinite(date.valueOf())) throw new MeetingProviderError('schema_drift', false)

  return date.toISOString()
}

const safeResponseMetadata = (response: Response) => ({
  httpStatus: response.status,
  requestIdPresent: Boolean(response.headers.get('x-hubspot-correlation-id')),
})

const classifyHttpError = (status: number): { category: ConstructorParameters<typeof MeetingProviderError>[0]; retryable: boolean } => {
  if (status === 401 || status === 403) return { category: 'authentication', retryable: false }
  if (status === 409) return { category: 'slot_conflict', retryable: false }
  if (status === 429) return { category: 'rate_limited', retryable: true }
  if (status >= 400 && status < 500) return { category: 'policy_rejected', retryable: false }

  return { category: 'transport', retryable: true }
}

const requestJson = async (
  token: string,
  url: string,
  init: RequestInit,
  ambiguousOnTimeout: boolean,
): Promise<unknown> => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  let response: Response

  try {
    response = await fetch(url, {
      ...init,
      signal,
      cache: 'no-store',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch (error) {
    const timedOut = timeout.aborted

    throw new MeetingProviderError(
      timedOut && ambiguousOnTimeout ? 'timeout_ambiguous' : 'transport',
      !ambiguousOnTimeout,
      { cause: error instanceof Error ? error.name : 'unknown' },
    )
  }

  if (!response.ok) {
    if (ambiguousOnTimeout && response.status >= 500) {
      throw new MeetingProviderError('timeout_ambiguous', false, safeResponseMetadata(response))
    }

    const classified = classifyHttpError(response.status)

    throw new MeetingProviderError(classified.category, classified.retryable, safeResponseMetadata(response))
  }

  const contentType = response.headers.get('content-type') ?? ''
  const contentLength = Number(response.headers.get('content-length') ?? 0)

  if (!contentType.toLowerCase().includes('application/json') || contentLength > MAX_RESPONSE_BYTES) {
    throw new MeetingProviderError(ambiguousOnTimeout ? 'timeout_ambiguous' : 'schema_drift', false, safeResponseMetadata(response))
  }

  const text = await response.text()

  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
    throw new MeetingProviderError(ambiguousOnTimeout ? 'timeout_ambiguous' : 'schema_drift', false)
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new MeetingProviderError(ambiguousOnTimeout ? 'timeout_ambiguous' : 'schema_drift', false, safeResponseMetadata(response))
  }
}

const consentKey = (providerId: string): string =>
  `communications_${createHash('sha256').update(providerId).digest('hex').slice(0, 12)}`

export const createHubSpotMeetingSchedulingProvider = (options: {
  slug?: string
  getAccessToken?: () => Promise<string>
} = {}): MeetingSchedulingProvider => {
  const slug = options.slug?.trim() || process.env.HUBSPOT_SCHEDULER_SLUG?.trim() || DEFAULT_SLUG
  const getAccessToken = options.getAccessToken ?? getHubSpotAccessToken

  return {
    async getConfiguration({ timezone, signal }): Promise<ProviderConfiguration> {
      const token = await getAccessToken()
      const requestedTimezone = canonicalizeMeetingTimezone(timezone)

      if (!requestedTimezone) throw new MeetingProviderError('schema_drift', false)

      const raw = await requestJson(
        token,
        `${API_BASE}/${encodeSlug(slug)}?timezone=${encodeURIComponent(requestedTimezone)}`,
        { method: 'GET', signal },
        false,
      )

      const parsed = detailsSchema.safeParse(raw)

      if (!parsed.success) throw new MeetingProviderError('schema_drift', false)

      const durations = [...new Set(parsed.data.customParams.durations)]

      const onlineUsers = parsed.data.allUsersBusyTimes.filter(
        user => user.isOffline === false && user.meetingsUser.calendarProvider === 'OFFICE365',
      )

      if (durations.length !== 1 || durations[0] % 60_000 !== 0 || onlineUsers.length === 0) {
        throw new MeetingProviderError('schema_drift', false)
      }

      const companyField = parsed.data.customParams.formFields.find(field => field.name === 'company')
      const providerConsents = parsed.data.customParams.legalConsentOptions?.communicationConsentCheckboxes ?? []

      if (!companyField || companyField.fieldType !== 'text' || companyField.isRequired !== true) {
        throw new MeetingProviderError('schema_drift', false)
      }

      if (parsed.data.customParams.legalConsentEnabled !== true || providerConsents.length === 0) {
        throw new MeetingProviderError('schema_drift', false)
      }

      return {
        meetingDurationMillis: durations[0],
        onlineUserIds: onlineUsers.map(user => String(user.meetingsUser.userId)),
        companyRequired: true,
        legalConsentEnabled: parsed.data.customParams.legalConsentEnabled,
        communicationConsents: providerConsents.map(item => ({
          providerId: String(item.communicationTypeId),
          label: item.label,
          required: item.required === true,
        })),
      }
    },

    async getAvailability({ timezone, monthOffset, meetingDurationMillis, signal }): Promise<ProviderAvailability> {
      const token = await getAccessToken()
      const requestedTimezone = canonicalizeMeetingTimezone(timezone)

      if (!requestedTimezone) throw new MeetingProviderError('schema_drift', false)

      const raw = await requestJson(
        token,
        `${API_BASE}/availability-page/${encodeSlug(slug)}?timezone=${encodeURIComponent(requestedTimezone)}&monthOffset=${monthOffset}`,
        { method: 'GET', signal },
        false,
      )

      const parsed = availabilitySchema.safeParse(raw)

      if (!parsed.success) throw new MeetingProviderError('schema_drift', false)

      const entry = parsed.data.linkAvailability.linkAvailabilityByDuration[String(meetingDurationMillis)]

      if (!entry) throw new MeetingProviderError('schema_drift', false)

      const unique = new Map<number, { startsAt: string; endsAt: string }>()

      for (const slot of entry.availabilities) {
        if (slot.endMillisUtc - slot.startMillisUtc !== meetingDurationMillis) {
          throw new MeetingProviderError('schema_drift', false)
        }

        unique.set(slot.startMillisUtc, {
          startsAt: new Date(slot.startMillisUtc).toISOString(),
          endsAt: new Date(slot.endMillisUtc).toISOString(),
        })
      }

      return {
        hasMore: parsed.data.linkAvailability.hasMore === true,
        slots: [...unique.entries()].sort(([left], [right]) => left - right).map(([, slot]) => slot),
      }
    },

    async book(input: ProviderBookingInput, options): Promise<ProviderBookingOutcome> {
      const token = await getAccessToken()
      const requestedTimezone = canonicalizeMeetingTimezone(input.timezone)

      if (!requestedTimezone) throw new MeetingProviderError('degraded_booking', false)

      const raw = await requestJson(
        token,
        `${API_BASE}?timezone=${encodeURIComponent(requestedTimezone)}`,
        {
          method: 'POST',
          signal: options?.signal,
          body: JSON.stringify({
            duration: input.meetingDurationMillis,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            formFields: [{ name: 'company', value: input.company }],
            legalConsentResponses: input.legalConsentResponses.map(item => ({
              communicationTypeId: item.providerId,
              consented: item.consented,
            })),
            likelyAvailableUserIds: input.likelyAvailableUserIds,
            slug,
            startTime: input.startsAt,
            locale: input.locale,
            timezone: requestedTimezone,
          }),
        },
        true,
      )

      const parsed = bookingSchema.safeParse(raw)

      if (!parsed.success) throw new MeetingProviderError('degraded_booking', false)

      const startsAt = toIso(parsed.data.start)
      const endsAt = toIso(parsed.data.end)
      const conferenceUrl = new URL(parsed.data.webConferenceUrl)
      const expectedEnd = Date.parse(input.startsAt) + input.meetingDurationMillis
      const bookingTimezone = canonicalizeMeetingTimezone(parsed.data.bookingTimezone)

      if (
        bookingTimezone !== requestedTimezone ||
        parsed.data.duration !== input.meetingDurationMillis ||
        startsAt !== new Date(input.startsAt).toISOString() ||
        Date.parse(endsAt) !== expectedEnd ||
        conferenceUrl.protocol !== 'https:' ||
        conferenceUrl.hostname !== 'teams.microsoft.com'
      ) {
        throw new MeetingProviderError('degraded_booking', false)
      }

      return {
        startsAt,
        endsAt,
        timezone: bookingTimezone,
        meetingDurationMillis: parsed.data.duration,
        channel: 'microsoft_teams',
        providerEvidence: {
          calendarEventId: parsed.data.calendarEventId,
          contactId: parsed.data.contactId,
          webConferenceUrl: parsed.data.webConferenceUrl,
        },
      }
    },
  }
}

export { consentKey }
