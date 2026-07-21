#!/usr/bin/env node

import { createHash } from 'node:crypto'

const API_BASE = 'https://api.hubapi.com/scheduler/2026-03/meetings/meeting-links/book'
const DEFAULT_SLUG = 'efeoncepro/agenda-discovery'
const DEFAULT_TIMEZONE = 'America/Santiago'
const BOOKING_CONFIRMATION = 'TASK-1366-BOOK-ONCE'

class SmokeError extends Error {
  constructor(code, details = {}) {
    super(code)
    this.name = 'SmokeError'
    this.code = code
    this.details = details
  }
}

function digest(value) {
  if (!value) return null

  return createHash('sha256').update(String(value)).digest('hex').slice(0, 12)
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()

  if (!value) throw new SmokeError('missing_required_input', { input: name })

  return value
}

function parseArgs(argv) {
  const executeBooking = argv.includes('--execute-booking')
  const unknown = argv.filter(arg => arg !== '--inspect' && arg !== '--execute-booking')

  if (unknown.length > 0) throw new SmokeError('unknown_argument', { argument: unknown[0] })

  return { executeBooking }
}

function encodedSlug(slug) {
  return encodeURIComponent(slug)
}

async function hubspotRequest(token, url, init = {}) {
  let response

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error) {
    throw new SmokeError('scheduler_unavailable', {
      cause: error instanceof Error ? error.name : 'unknown',
    })
  }

  let body

  try {
    body = await response.json()
  } catch {
    throw new SmokeError('scheduler_invalid_json', { httpStatus: response.status })
  }

  if (!response.ok) {
    throw new SmokeError('scheduler_request_failed', {
      httpStatus: response.status,
      providerStatus: typeof body?.status === 'string' ? body.status : null,
      providerCategory: typeof body?.category === 'string' ? body.category : null,
      providerSubCategory: typeof body?.subCategory === 'string' ? body.subCategory : null,
      providerContextKeys:
        body?.context && typeof body.context === 'object' ? Object.keys(body.context).sort() : [],
      correlationIdPresent: Boolean(body?.correlationId),
    })
  }

  return body
}

function detailsSummary(details) {
  const users = Array.isArray(details?.allUsersBusyTimes) ? details.allUsersBusyTimes : []
  const formFields = Array.isArray(details?.customParams?.formFields) ? details.customParams.formFields : []

  const consentCheckboxes = Array.isArray(details?.customParams?.legalConsentOptions?.communicationConsentCheckboxes)
    ? details.customParams.legalConsentOptions.communicationConsentCheckboxes
    : []

  return {
    linkIdPresent: Boolean(details?.linkId),
    linkType: details?.linkType ?? null,
    isOffline: details?.isOffline ?? null,
    durations: details?.customParams?.durations ?? [],
    formFields: formFields.map(field => ({
      name: field?.name ?? null,
      fieldType: field?.fieldType ?? null,
      required: Boolean(field?.isRequired),
      custom: Boolean(field?.isCustom),
    })),
    legalConsentEnabled: Boolean(details?.customParams?.legalConsentEnabled),
    communicationConsentCheckboxes: consentCheckboxes.map(item => ({
      communicationTypeIdDigest: digest(item?.communicationTypeId),
      required: Boolean(item?.required),
    })),
    userCount: users.length,
    calendarProviders: [...new Set(users.map(item => item?.meetingsUser?.calendarProvider).filter(Boolean))],
    offlineUserCount: users.filter(item => item?.isOffline === true).length,
  }
}

function availabilitySlots(availability, duration) {
  const byDuration = availability?.linkAvailability?.linkAvailabilityByDuration ?? {}
  const entry = byDuration[String(duration)]

  return Array.isArray(entry?.availabilities) ? entry.availabilities : []
}

function availabilitySummary(availability, duration) {
  const slots = availabilitySlots(availability, duration)

  return {
    duration,
    slotCount: slots.length,
    hasMore: availability?.linkAvailability?.hasMore ?? null,
    sampleSlots: slots.slice(0, 12).map(slot => ({
      start: new Date(slot.startMillisUtc).toISOString(),
      end: new Date(slot.endMillisUtc).toISOString(),
    })),
  }
}

function bookingInput(details, availability, duration) {
  if (process.env.HUBSPOT_SCHEDULER_CONFIRM !== BOOKING_CONFIRMATION) {
    throw new SmokeError('booking_confirmation_missing', {
      expectedInput: 'HUBSPOT_SCHEDULER_CONFIRM',
    })
  }

  const startTime = requiredEnv('HUBSPOT_TEST_START_TIME')
  const startMillis = Date.parse(startTime)

  if (!Number.isFinite(startMillis)) {
    throw new SmokeError('invalid_start_time', { input: 'HUBSPOT_TEST_START_TIME' })
  }

  const slots = availabilitySlots(availability, duration)

  if (!slots.some(slot => slot?.startMillisUtc === startMillis)) {
    throw new SmokeError('selected_slot_not_available', { startTime })
  }

  const availableUsers = (details?.allUsersBusyTimes ?? [])
    .filter(item => item?.isOffline === false && item?.meetingsUser?.userId)

  if (availableUsers.length === 0) throw new SmokeError('calendar_missing')

  const communicationConsentCheckboxes =
    details?.customParams?.legalConsentOptions?.communicationConsentCheckboxes ?? []

  const legalConsentResponses = communicationConsentCheckboxes.map(item => ({
    communicationTypeId: String(item.communicationTypeId),
    consented: item?.required === true,
  }))

  if (details?.customParams?.legalConsentEnabled && legalConsentResponses.length === 0) {
    throw new SmokeError('legal_consent_contract_missing')
  }

  const payload = {
    duration,
    email: requiredEnv('HUBSPOT_TEST_EMAIL'),
    firstName: requiredEnv('HUBSPOT_TEST_FIRST_NAME'),
    lastName: requiredEnv('HUBSPOT_TEST_LAST_NAME'),
    formFields: [{ name: 'company', value: requiredEnv('HUBSPOT_TEST_COMPANY') }],
    legalConsentResponses,
    likelyAvailableUserIds: availableUsers.map(item => String(item.meetingsUser.userId)),
    slug: process.env.HUBSPOT_SCHEDULER_SLUG?.trim() || DEFAULT_SLUG,
    startTime: new Date(startMillis).toISOString(),
    locale: process.env.HUBSPOT_TEST_LOCALE?.trim() || 'es',
    timezone: process.env.HUBSPOT_TEST_TIMEZONE?.trim() || DEFAULT_TIMEZONE,
  }

  return payload
}

function bookingSummary(booking) {
  let conferenceHost = null

  try {
    conferenceHost = booking?.webConferenceUrl ? new URL(booking.webConferenceUrl).hostname : null
  } catch {
    conferenceHost = 'invalid_url'
  }

  return {
    isOffline: booking?.isOffline ?? null,
    calendarEventIdPresent: Boolean(booking?.calendarEventId),
    calendarEventIdDigest: digest(booking?.calendarEventId),
    contactIdPresent: Boolean(booking?.contactId),
    contactIdDigest: digest(booking?.contactId),
    webConferenceMeetingIdPresent: Boolean(booking?.webConferenceMeetingId),
    webConferenceMeetingIdDigest: digest(booking?.webConferenceMeetingId),
    webConferenceUrlPresent: Boolean(booking?.webConferenceUrl),
    webConferenceUrlHost: conferenceHost,
    bookingTimezone: booking?.bookingTimezone ?? null,
    start: booking?.start ?? null,
    end: booking?.end ?? null,
    duration: booking?.duration ?? null,
  }
}

async function main() {
  const { executeBooking } = parseArgs(process.argv.slice(2))
  const token = requiredEnv('HUBSPOT_ACCESS_TOKEN')
  const slug = process.env.HUBSPOT_SCHEDULER_SLUG?.trim() || DEFAULT_SLUG
  const timezone = process.env.HUBSPOT_TEST_TIMEZONE?.trim() || DEFAULT_TIMEZONE
  const monthOffset = Number.parseInt(process.env.HUBSPOT_MONTH_OFFSET ?? '0', 10)

  if (!Number.isInteger(monthOffset) || monthOffset < 0 || monthOffset > 11) {
    throw new SmokeError('invalid_month_offset', { input: 'HUBSPOT_MONTH_OFFSET' })
  }

  const detailsUrl = `${API_BASE}/${encodedSlug(slug)}?timezone=${encodeURIComponent(timezone)}`
  const availabilityUrl = `${API_BASE}/availability-page/${encodedSlug(slug)}?timezone=${encodeURIComponent(timezone)}&monthOffset=${monthOffset}`
  const details = await hubspotRequest(token, detailsUrl)
  const duration = details?.customParams?.durations?.[0]

  if (!Number.isInteger(duration) || duration <= 0) throw new SmokeError('duration_missing')

  const availability = await hubspotRequest(token, availabilityUrl)

  const output = {
    mode: executeBooking ? 'execute-booking' : 'inspect',
    details: detailsSummary(details),
    availability: availabilitySummary(availability, duration),
  }

  if (executeBooking) {
    const payload = bookingInput(details, availability, duration)

    const booking = await hubspotRequest(token, API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    output.booking = bookingSummary(booking)
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
}

main().catch(error => {
  const safe = error instanceof SmokeError
    ? { ok: false, code: error.code, details: error.details }
    : { ok: false, code: 'unexpected_error' }

  process.stderr.write(`${JSON.stringify(safe)}\n`)
  process.exitCode = 1
})
