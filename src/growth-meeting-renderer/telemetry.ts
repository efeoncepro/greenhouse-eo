import {
  MEETING_AVAILABILITY_STATES,
  MEETING_DAYS_AHEAD_BUCKETS,
  MEETING_GTM_EVENTS,
  MEETING_STEPS,
  MEETING_TIME_OF_DAY_BUCKETS,
  type MeetingAvailabilityState,
  type MeetingDaysAheadBucket,
  type MeetingPublicErrorCode,
  type MeetingStep,
  type MeetingTimeOfDayBucket,
} from './contract'

export interface MeetingTelemetryBase {
  scheduler_key: string
  surface_id: string
  placement: string
  renderer_version: string
  contract_version: string
}

export interface MeetingStepContext {
  availability_state?: MeetingAvailabilityState
  days_ahead_bucket?: MeetingDaysAheadBucket
  time_of_day_bucket?: MeetingTimeOfDayBucket
  error_category?: MeetingPublicErrorCode
}

export interface MeetingTelemetryState {
  reached: ReadonlySet<MeetingStep>
  consumedReceipts: ReadonlySet<string>
}

export type MeetingTelemetryAction =
  | { type: 'step_reached'; step: MeetingStep; context?: MeetingStepContext }
  | { type: 'booking_confirmed'; response: unknown; context?: Pick<MeetingStepContext, 'days_ahead_bucket' | 'time_of_day_bucket'> }

export interface MeetingTelemetryEffect {
  event: (typeof MEETING_GTM_EVENTS)[keyof typeof MEETING_GTM_EVENTS]
  payload: Record<string, string>
  dispatchHostEvent: boolean
}

export const initialMeetingTelemetryState = (): MeetingTelemetryState => ({
  reached: new Set(),
  consumedReceipts: new Set(),
})

const steps = new Set<string>(MEETING_STEPS)
const availabilityStates = new Set<string>(MEETING_AVAILABILITY_STATES)
const dayBuckets = new Set<string>(MEETING_DAYS_AHEAD_BUCKETS)
const timeBuckets = new Set<string>(MEETING_TIME_OF_DAY_BUCKETS)

const errorCategories = new Set<string>([
  'unavailable',
  'slot_unavailable',
  'validation_failed',
  'captcha_failed',
  'rate_limited',
  'booking_rejected',
  'provider_degraded',
])

const slug = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const version = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

const sanitizeBase = (base: MeetingTelemetryBase): Record<string, string> | null => {
  if (
    !slug.test(base.scheduler_key) ||
    !slug.test(base.surface_id) ||
    !slug.test(base.placement) ||
    !version.test(base.renderer_version) ||
    !version.test(base.contract_version)
  ) return null

  return { ...base }
}

const validContextValue = (value: unknown, allowed: Set<string>): value is string =>
  typeof value === 'string' && allowed.has(value)

const sanitizeStep = (
  base: MeetingTelemetryBase,
  step: MeetingStep,
  context: MeetingStepContext = {},
): Record<string, string> | null => {
  const cleanBase = sanitizeBase(base)

  if (!cleanBase || !steps.has(step)) return null

  const availability = validContextValue(context.availability_state, availabilityStates)
    ? context.availability_state
    : undefined

  const days = validContextValue(context.days_ahead_bucket, dayBuckets)
    ? context.days_ahead_bucket
    : undefined

  const time = validContextValue(context.time_of_day_bucket, timeBuckets)
    ? context.time_of_day_bucket
    : undefined

  const failure = validContextValue(context.error_category, errorCategories)
    ? context.error_category
    : undefined

  if (step === 'availability_loaded' && !['available', 'empty', 'partial', 'fallback_only'].includes(availability ?? '')) return null
  if (step === 'availability_failed' && (!['degraded', 'unavailable'].includes(availability ?? '') || !failure)) return null
  if (step === 'date_selected' && !days) return null
  if (['slot_selected', 'details_started', 'booking_started'].includes(step) && (!days || !time)) return null
  if (step === 'validation_failed' && failure !== 'validation_failed') return null
  if (step === 'booking_failed' && !failure) return null

  return {
    ...cleanBase,
    meeting_step: step,
    ...(availability ? { availability_state: availability } : {}),
    ...(days ? { days_ahead_bucket: days } : {}),
    ...(time ? { time_of_day_bucket: time } : {}),
    ...(failure ? { error_category: failure } : {}),
  }
}

const confirmedReceipt = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') return null
  const response = value as Record<string, unknown>

  return response.outcome === 'confirmed' &&
    response.conversionEligible === true &&
    typeof response.conversionReceipt === 'string' &&
    response.conversionReceipt.length >= 32 &&
    response.conversionReceipt.length <= 256
    ? response.conversionReceipt
    : null
}

export const reduceMeetingTelemetry = (
  state: MeetingTelemetryState,
  base: MeetingTelemetryBase,
  action: MeetingTelemetryAction,
): { state: MeetingTelemetryState; effects: MeetingTelemetryEffect[] } => {
  if (action.type === 'step_reached') {
    if (state.reached.has(action.step)) return { state, effects: [] }

    const payload = sanitizeStep(base, action.step, action.context)

    if (!payload) return { state, effects: [] }

    return {
      state: { ...state, reached: new Set([...state.reached, action.step]) },
      effects: [{ event: MEETING_GTM_EVENTS.stepReached, payload, dispatchHostEvent: true }],
    }
  }

  const receipt = confirmedReceipt(action.response)
  const cleanBase = sanitizeBase(base)

  if (!receipt || !cleanBase || state.consumedReceipts.has(receipt)) return { state, effects: [] }

  const days = validContextValue(action.context?.days_ahead_bucket, dayBuckets)
    ? action.context.days_ahead_bucket
    : undefined

  const time = validContextValue(action.context?.time_of_day_bucket, timeBuckets)
    ? action.context.time_of_day_bucket
    : undefined

  return {
    state: { ...state, consumedReceipts: new Set([...state.consumedReceipts, receipt]) },
    effects: [{
      event: MEETING_GTM_EVENTS.bookingConfirmed,
      payload: {
        ...cleanBase,
        ...(days ? { days_ahead_bucket: days } : {}),
        ...(time ? { time_of_day_bucket: time } : {}),
      },
      dispatchHostEvent: false,
    }],
  }
}

interface DataLayerWindow {
  dataLayer?: Array<Record<string, unknown>>
}

export const emitMeetingTelemetry = (
  host: HTMLElement,
  effect: MeetingTelemetryEffect,
  options: {
    dataLayerEnabled?: boolean
    win?: (Window & DataLayerWindow)
  } = {},
): void => {
  const detail = { ...effect.payload, event: effect.event }

  if (effect.dispatchHostEvent) {
    try {
      host.dispatchEvent(new CustomEvent(effect.event, { detail, bubbles: true, composed: true }))
    } catch {
      // Telemetry never breaks scheduling UX.
    }
  }

  const win = options.win ?? (typeof window !== 'undefined' ? window as Window & DataLayerWindow : undefined)

  if (options.dataLayerEnabled === false || !win) return

  try {
    win.dataLayer = win.dataLayer || []
    win.dataLayer.push(detail)
  } catch {
    // Analytics blockers remain UX-safe.
  }
}

const calendarDayNumber = (date: Date, timezone: string): number => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const value = (kind: string) => Number(parts.find(part => part.type === kind)?.value)

  return Date.UTC(value('year'), value('month') - 1, value('day')) / 86_400_000
}

export const daysAheadBucket = (
  startsAt: string,
  timezone: string,
  now = new Date(),
): MeetingDaysAheadBucket => {
  const days = Math.max(0, calendarDayNumber(new Date(startsAt), timezone) - calendarDayNumber(now, timezone))

  if (days === 0) return 'same_day'
  if (days <= 3) return '1_3_days'
  if (days <= 7) return '4_7_days'
  if (days <= 14) return '8_14_days'
  if (days <= 30) return '15_30_days'

  return '31_plus_days'
}

export const timeOfDayBucket = (startsAt: string, timezone: string): MeetingTimeOfDayBucket => {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(startsAt)))

  if (hour < 6) return 'overnight'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'

  return 'evening'
}
