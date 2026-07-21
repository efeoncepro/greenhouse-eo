import 'server-only'

import { randomBytes } from 'node:crypto'

import { turnstileCaptchaVerifier, type CaptchaVerifier } from '@/lib/growth/public-submission/captcha'

import type { MeetingBookingConfirmed, MeetingBookingRequest, MeetingPublicError } from './contracts'
import { isNativeMeetingSchedulerEnabled } from './flags'
import { resolveMeetingPrivacyHasher, type MeetingPrivacyHasher } from './privacy'
import { createHubSpotMeetingSchedulingProvider } from './provider/hubspot'
import { MeetingProviderError, type MeetingSchedulingProvider } from './provider/types'
import { buildMeetingConsentKey } from './readers'
import { isSupportedMeetingTimezone } from './timezone'
import {
  claimMeetingBooking,
  finalizeMeetingExecution,
  getMeetingSurfaceAuthority,
  markMeetingProviderDispatched,
  recordMeetingMetric,
} from './store'
import { normalizeMeetingBookingRequest, parseMeetingBookingRequest } from './validation'

type BookingResult = MeetingBookingConfirmed | MeetingPublicError

const error = (
  code: MeetingPublicError['error']['code'],
  recovery: MeetingPublicError['error']['recovery'],
  retryable: boolean,
): MeetingPublicError => ({ outcome: 'error', error: { code, recovery, retryable } })

const resolveLimits = (env: NodeJS.ProcessEnv) => ({
  email: Number(env.GROWTH_MEETING_BOOK_PER_EMAIL_PER_DAY) || 3,
  ip: Number(env.GROWTH_MEETING_BOOK_PER_IP_PER_DAY) || 10,
})

const monthKey = (date: Date, timezone: string): { year: number; month: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)

  return {
    year: Number(parts.find(part => part.type === 'year')?.value),
    month: Number(parts.find(part => part.type === 'month')?.value),
  }
}

const resolveMonthOffset = (startsAt: string, timezone: string, now: Date): number => {
  const current = monthKey(now, timezone)
  const selected = monthKey(new Date(startsAt), timezone)

  return (selected.year - current.year) * 12 + selected.month - current.month
}

const confirmedReplay = (input: { startsAt: string; durationMs: number; timezone: string }): MeetingBookingConfirmed => ({
  outcome: 'confirmed',
  appointment: {
    startsAt: input.startsAt,
    endsAt: new Date(Date.parse(input.startsAt) + input.durationMs).toISOString(),
    timezone: input.timezone,
    durationMinutes: input.durationMs / 60_000,
    channel: 'microsoft_teams',
  },
  conversionReceipt: null,
  conversionEligible: false,
})

const providerFailure = async (
  executionId: string,
  providerError: MeetingProviderError,
  metricScope: { surfaceId: string; schedulerKey: string },
): Promise<MeetingPublicError> => {
  await recordMeetingMetric({ ...metricScope, metricKind: 'booking_failed' })

  if (providerError.category === 'slot_conflict') {
    await finalizeMeetingExecution({
      executionId,
      state: 'failed_terminal',
      safeOutcome: 'slot_unavailable',
      safeErrorCategory: 'slot_unavailable',
    })

    return error('slot_unavailable', 'refresh_availability', true)
  }

  if (providerError.category === 'degraded_booking') {
    await recordMeetingMetric({ ...metricScope, metricKind: 'offline_booking_detected' })
    await finalizeMeetingExecution({
      executionId,
      state: 'provider_created_invalid',
      safeOutcome: 'provider_created_invalid',
      safeErrorCategory: 'provider_degraded',
    })

    return error('provider_degraded', 'check_email', false)
  }

  if (providerError.category === 'timeout_ambiguous' || providerError.category === 'transport' || providerError.category === 'schema_drift') {
    await finalizeMeetingExecution({
      executionId,
      state: 'ambiguous',
      safeOutcome: 'write_outcome_unknown',
      safeErrorCategory: 'provider_degraded',
    })

    return error('provider_degraded', 'check_email', false)
  }

  await finalizeMeetingExecution({
    executionId,
    state: 'failed_terminal',
    safeOutcome: 'booking_rejected',
    safeErrorCategory: 'booking_rejected',
  })

  return error('booking_rejected', 'open_fallback', false)
}

export const bookMeeting = async (
  rawInput: unknown,
  context: {
    origin: string | null
    ip: string | null
    env?: NodeJS.ProcessEnv
    provider?: MeetingSchedulingProvider
    hasher?: MeetingPrivacyHasher
    captchaVerifier?: CaptchaVerifier
    now?: Date
  },
): Promise<BookingResult> => {
  const env = context.env ?? process.env

  if (!isNativeMeetingSchedulerEnabled(env)) return error('unavailable', 'open_fallback', false)

  const parsed = parseMeetingBookingRequest(rawInput)

  if (!parsed) return error('validation_failed', 'retry', false)

  const input: MeetingBookingRequest = normalizeMeetingBookingRequest(parsed)
  const now = context.now ?? new Date()
  const surface = await getMeetingSurfaceAuthority(input.surfaceId, input.schedulerKey)

  if (!surface || !context.origin || !surface.origins.includes(context.origin)) {
    return error('unavailable', 'open_fallback', false)
  }

  if (!isSupportedMeetingTimezone(input.slot.timezone) || input.locale !== surface.defaultLocale) {
    return error('validation_failed', 'refresh_availability', false)
  }

  if (Date.parse(input.slot.startsAt) <= now.valueOf()) return error('slot_unavailable', 'refresh_availability', true)

  const captcha = context.captchaVerifier ?? turnstileCaptchaVerifier(env, {
    expectedHostname: new URL(context.origin).hostname,
    expectedAction: 'meeting_booking',
  })

  const captchaResult = await captcha.verify(input.captchaToken, context.ip)

  if (!captchaResult.ok) return error('captcha_failed', 'retry', true)

  let hasher: MeetingPrivacyHasher

  try {
    hasher = context.hasher ?? await resolveMeetingPrivacyHasher(env)
  } catch {
    return error('unavailable', 'open_fallback', false)
  }

  const provider = context.provider ?? createHubSpotMeetingSchedulingProvider()
  let configuration
  let availability
  const monthOffset = resolveMonthOffset(input.slot.startsAt, input.slot.timezone, now)

  if (monthOffset < 0 || monthOffset > 2) return error('slot_unavailable', 'refresh_availability', true)

  try {
    configuration = await provider.getConfiguration({ timezone: input.slot.timezone })
    availability = await provider.getAvailability({
      timezone: input.slot.timezone,
      monthOffset,
      meetingDurationMillis: configuration.meetingDurationMillis,
    })
  } catch {
    return error('provider_degraded', 'open_fallback', true)
  }

  const durationMs = input.slot.durationMinutes * 60_000

  const slotAvailable = configuration.meetingDurationMillis === durationMs && availability.slots.some(
    slot => slot.startsAt === input.slot.startsAt && Date.parse(slot.endsAt) - Date.parse(slot.startsAt) === durationMs,
  )

  if (!slotAvailable) return error('slot_unavailable', 'refresh_availability', true)

  const consentByKey = new Map(configuration.communicationConsents.map(item => [
    buildMeetingConsentKey(hasher, item.providerId),
    item,
  ]))

  if (input.consent.communicationKeys.some(key => !consentByKey.has(key))) {
    return error('validation_failed', 'retry', false)
  }

  if (configuration.communicationConsents.some(item => item.required && !input.consent.communicationKeys.includes(
    buildMeetingConsentKey(hasher, item.providerId),
  ))) return error('validation_failed', 'retry', false)

  const semanticRequest = {
    surfaceId: input.surfaceId,
    schedulerKey: input.schedulerKey,
    slot: input.slot,
    locale: input.locale,
    contact: input.contact,
    consent: input.consent,
    attribution: input.attribution ?? {},
  }

  const limits = resolveLimits(env)

  const claim = await claimMeetingBooking({
    surfaceId: input.surfaceId,
    schedulerKey: input.schedulerKey,
    idempotencyKeyHmac: hasher.hmac('idempotency', input.idempotencyKey),
    requestFingerprint: hasher.fingerprint(semanticRequest),
    bookingFingerprint: hasher.hmac('booking', `${input.contact.email}:${input.slot.startsAt}:${durationMs}`),
    emailHmac: hasher.hmac('email', input.contact.email),
    ipHmac: context.ip ? hasher.hmac('ip', context.ip) : null,
    digestKeyVersion: hasher.keyVersion,
    requestedStartAt: input.slot.startsAt,
    requestedDurationMs: durationMs,
    requestedTimezone: input.slot.timezone,
    requestedLocale: input.locale,
    attribution: input.attribution ?? {},
    emailLimit: limits.email,
    ipLimit: limits.ip,
  })

  if (claim.kind === 'rate_limited') return error('rate_limited', 'open_fallback', false)
  if (claim.kind === 'conflict') return error('booking_rejected', 'retry', false)

  if (claim.kind === 'replay') {
    await recordMeetingMetric({
      metricKind: 'duplicate_prevented',
      surfaceId: input.surfaceId,
      schedulerKey: input.schedulerKey,
    })

    return confirmedReplay(claim)
  }

  if (claim.kind === 'in_progress_or_unknown') return error('provider_degraded', 'check_email', false)

  const dispatched = await markMeetingProviderDispatched(claim.executionId)

  if (!dispatched) return error('provider_degraded', 'check_email', false)

  try {
    const booking = await provider.book({
      startsAt: input.slot.startsAt,
      meetingDurationMillis: durationMs,
      timezone: input.slot.timezone,
      locale: input.locale,
      ...input.contact,
      likelyAvailableUserIds: configuration.onlineUserIds,
      legalConsentResponses: configuration.communicationConsents.map(item => ({
        providerId: item.providerId,
        consented: input.consent.communicationKeys.includes(buildMeetingConsentKey(hasher, item.providerId)),
      })),
    })

    const receipt = randomBytes(32).toString('base64url')

    const persisted = await finalizeMeetingExecution({
      executionId: claim.executionId,
      state: 'succeeded',
      safeOutcome: 'confirmed',
      conversionReceiptHash: hasher.hmac('receipt', receipt),
    })

    if (!persisted) return error('provider_degraded', 'check_email', false)

    await recordMeetingMetric({
      metricKind: 'booking_confirmed',
      surfaceId: input.surfaceId,
      schedulerKey: input.schedulerKey,
    })

    return {
      outcome: 'confirmed',
      appointment: {
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        timezone: booking.timezone,
        durationMinutes: booking.meetingDurationMillis / 60_000,
        channel: booking.channel,
      },
      conversionReceipt: receipt,
      conversionEligible: true,
    }
  } catch (caught) {
    const providerError = caught instanceof MeetingProviderError
      ? caught
      : new MeetingProviderError('timeout_ambiguous', false)

    return providerFailure(claim.executionId, providerError, {
      surfaceId: input.surfaceId,
      schedulerKey: input.schedulerKey,
    })
  }
}
