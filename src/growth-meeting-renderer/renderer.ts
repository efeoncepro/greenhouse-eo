import type { MeetingApiClient, MeetingBookingPayload, MeetingEmailVerificationResult } from './api-client'
import type { MeetingPublicErrorCode } from './contract'
import { GH_GROWTH_MEETINGS_COPY as copy } from './copy'
import {
  initialMeetingRendererState,
  reduceMeetingState,
  type MeetingRendererState,
  type MeetingStateAction,
} from './state'
import {
  daysAheadBucket,
  emitMeetingTelemetry,
  initialMeetingTelemetryState,
  reduceMeetingTelemetry,
  timeOfDayBucket,
  type MeetingStepContext,
  type MeetingTelemetryAction,
  type MeetingTelemetryIdentity,
  type MeetingTelemetryState,
} from './telemetry'
import type { MeetingTurnstileHandle, MeetingTurnstilePort } from './turnstile'
import {
  resolveMeetingLayout,
  type MeetingActivationMode,
  type MeetingLayoutRecipe,
} from './layout'

export interface MeetingRendererOptions {
  api: MeetingApiClient
  turnstile: MeetingTurnstilePort
  telemetryBase: MeetingTelemetryIdentity
  surfaceId: string
  schedulerKey: string
  requestedTimezone: string
  now?: () => Date
  dataLayerEnabled?: boolean
  activationMode?: MeetingActivationMode
  maxRecipe?: MeetingLayoutRecipe
}

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)

  if (className) node.className = className
  if (text !== undefined) node.textContent = text

  return node
}

const idempotencyKey = (): string => {
  const webCrypto = globalThis.crypto

  if (webCrypto?.randomUUID) return webCrypto.randomUUID()

  const bytes = new Uint8Array(16)

  webCrypto.getRandomValues(bytes)

  return `booking_${[...bytes].map(value => value.toString(16).padStart(2, '0')).join('')}`
}

export const formatMeetingDate = (date: string, timezone: string, style: 'short' | 'long' = 'short'): string => {
  const isInstant = date.includes('T')

  const formatted = new Intl.DateTimeFormat('es-CL', style === 'short'
    ? { timeZone: isInstant ? timezone : 'UTC', weekday: 'short', day: 'numeric' }
    : { timeZone: isInstant ? timezone : 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(isInstant ? date : `${date}T12:00:00Z`))

  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
}

const formatTime = (startsAt: string, timezone: string): string =>
  new Intl.DateTimeFormat('es-CL', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(startsAt))

const timePeriod = (startsAt: string, timezone: string): string => {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).format(new Date(startsAt)))

  if (hour < 12) return copy.morning
  if (hour < 18) return copy.afternoon

  return copy.evening
}

export const formatMeetingTimezoneLabel = (timezone: string, at = new Date()): string => {
  let name = timezone

  try {
    name = new Intl.DateTimeFormat('es-CL', { timeZone: timezone, timeZoneName: 'longGeneric' })
      .formatToParts(at)
      .find(part => part.type === 'timeZoneName')?.value ?? timezone
  } catch {
    // The server validates IANA zones; the identifier remains a safe fallback.
  }

  const displayName = `${name.charAt(0).toUpperCase()}${name.slice(1)}`

  return `${copy.timezonePrefix} · ${displayName}`
}

export const formatMeetingTimeWithOffset = (startsAt: string, timezone: string): string => {
  const parts = new Intl.DateTimeFormat('es-CL', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(startsAt))

  const time = `${parts.find(part => part.type === 'hour')?.value ?? ''}:${parts.find(part => part.type === 'minute')?.value ?? ''}`
  const offset = parts.find(part => part.type === 'timeZoneName')?.value ?? ''

  return `${time}${offset ? ` ${offset}` : ''}`
}

export const formatMeetingTimeRangeWithOffset = (startsAt: string, endsAt: string, timezone: string): string => {
  const start = formatTime(startsAt, timezone)
  const end = formatTime(endsAt, timezone)

  const offset = new Intl.DateTimeFormat('es-CL', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(startsAt)).find(part => part.type === 'timeZoneName')?.value ?? ''

  return `${start}–${end}${offset ? ` ${offset}` : ''}`
}

const monthLabel = (date: string): string => {
  const formatted = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date.slice(0, 7)}-15T12:00:00Z`))

  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
}

const calendarDates = (date: string): Array<string | null> => {
  const [year, month] = date.split('-').map(Number)
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const dates = Array.from({ length: leading + days }, (_, index) => {
    if (index < leading) return null

    return `${year}-${String(month).padStart(2, '0')}-${String(index - leading + 1).padStart(2, '0')}`
  })

  while (dates.length % 7 !== 0) dates.push(null)

  return dates
}

const emailLooksValid = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const normalizedEmail = (value: string): string => value.trim().toLowerCase()
const LEGACY_ENGLISH_COMMUNICATION_CONSENT = 'I agree to receive other communications from Efeonce Group.'
let rendererInstanceSequence = 0

type EmailVerificationState = {
  status: 'idle' | 'queued' | 'verifying' | 'accepted' | 'rejected' | 'degraded'
  email: string
  result?: Extract<MeetingEmailVerificationResult, { outcome: 'ok' }>
}

type MeetingFormFieldKey = 'firstName' | 'lastName' | 'email' | 'company' | 'processingAccepted'
type FieldValidationState = 'neutral' | 'pending' | 'valid' | 'invalid'

type MeetingSummarySlot = {
  startsAt: string
  endsAt?: string
  timezone?: string
  durationMinutes?: number
  channel?: 'microsoft_teams'
}

const FIELD_ICON_CLASS: Record<'firstName' | 'lastName' | 'email' | 'company', string> = {
  firstName: 'tabler-user',
  lastName: 'tabler-id',
  email: 'tabler-mail',
  company: 'tabler-building-skyscraper',
}

const uiIcon = (name: string, className = 'ghm-icon'): HTMLElement => {
  const icon = element('i', `${className} tabler-${name}`)

  icon.setAttribute('aria-hidden', 'true')

  return icon
}

const dateKeyInTimezone = (date: Date, timezone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find(part => part.type === type)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

const shiftDateKey = (date: string, days: number): string => {
  const value = new Date(`${date}T12:00:00Z`)

  value.setUTCDate(value.getUTCDate() + days)

  return value.toISOString().slice(0, 10)
}

const monthReferenceDate = (date: Date, timezone: string, monthOffset: number): string => {
  const current = dateKeyInTimezone(date, timezone)
  const [year, month] = current.split('-').map(Number)
  const reference = new Date(Date.UTC(year, month - 1 + monthOffset, 1))

  return reference.toISOString().slice(0, 10)
}

const noSlotsForMonth = (referenceDate: string): string =>
  copy.noSlotsForMonth.replace('{month}', monthLabel(referenceDate).toLocaleLowerCase('es-CL'))

const fieldIcon = (key: keyof typeof FIELD_ICON_CLASS): HTMLElement => {
  const icon = element('i', `ghm-field-icon ${FIELD_ICON_CLASS[key]}`)

  icon.setAttribute('aria-hidden', 'true')

  return icon
}

export class MeetingRenderer {
  private state: MeetingRendererState = initialMeetingRendererState()
  private telemetryState: MeetingTelemetryState = initialMeetingTelemetryState()
  private abortController: AbortController | null = null
  private generation = 0
  private turnstileHandle: MeetingTurnstileHandle | null = null
  private submissionPending = false
  private viewedCleanup: (() => void) | null = null
  private resizeObserver: ResizeObserver | null = null
  private previousPhase = this.state.phase
  private layoutRecipe: MeetingLayoutRecipe = 'command'
  private layoutInitialized = false
  private activationMode: MeetingActivationMode
  private maxRecipe: MeetingLayoutRecipe
  private navigationView: 'calendar' | 'slots' = 'calendar'
  private emailVerification: EmailVerificationState = { status: 'idle', email: '' }
  private emailVerifyTimer: ReturnType<typeof setTimeout> | null = null
  private emailVerifyController: AbortController | null = null
  private readonly touchedFields = new Set<MeetingFormFieldKey>()
  private readonly instanceId = ++rendererInstanceSequence

  constructor(private readonly host: HTMLElement, private readonly options: MeetingRendererOptions) {
    this.activationMode = options.activationMode ?? 'inline'
    this.maxRecipe = options.maxRecipe ?? 'command'
  }

  async load(): Promise<void> {
    this.generation += 1
    const generation = this.generation

    this.abortController?.abort()
    this.abortController = new AbortController()
    this.state = initialMeetingRendererState()
    this.touchedFields.clear()
    this.resetEmailVerification()
    this.navigationView = 'calendar'
    this.observeLayout()
    this.render()
    this.observeViewed()

    try {
      const config = await this.options.api.config({
        surfaceId: this.options.surfaceId,
        schedulerKey: this.options.schedulerKey,
        timezone: this.options.requestedTimezone,
        signal: this.abortController.signal,
      })

      if (generation !== this.generation) return

      const timezone = config.timezonePolicy.resolvedTimezone

      const availability = config.state === 'available'
        ? await this.options.api.availability({
          surfaceId: this.options.surfaceId,
          schedulerKey: this.options.schedulerKey,
          timezone,
          monthOffset: 0,
          signal: this.abortController.signal,
        })
        : null

      if (generation !== this.generation) return

      this.transition(
        { type: 'loaded', config, availability },
        {
          type: 'step_reached',
          step: 'availability_loaded',
          context: { availability_state: config.state === 'fallback_only' ? 'fallback_only' : availability?.state ?? 'empty' },
        },
      )

    } catch {
      if (generation !== this.generation || this.abortController.signal.aborted) return

      this.transition(
        { type: 'load_failed' },
        {
          type: 'step_reached',
          step: 'availability_failed',
          context: { availability_state: 'unavailable', error_category: 'provider_degraded' },
        },
      )
    }
  }

  destroy(): void {
    this.generation += 1
    this.abortController?.abort()
    this.abortController = null
    this.turnstileHandle?.destroy()
    this.turnstileHandle = null
    this.viewedCleanup?.()
    this.viewedCleanup = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.resetEmailVerification()
  }

  updatePresentation(input: { activationMode: MeetingActivationMode; maxRecipe: MeetingLayoutRecipe }): void {
    this.activationMode = input.activationMode
    this.maxRecipe = input.maxRecipe
    this.applyLayout(this.host.getBoundingClientRect().width, this.host.getBoundingClientRect().height)
  }

  private async loadMonth(monthOffset: number): Promise<void> {
    const config = this.state.config
    const currentMonthOffset = this.state.availability?.monthOffset ?? 0
    const focusDirection = monthOffset > currentMonthOffset ? 'next' : 'previous'

    if (!config || monthOffset < 0 || monthOffset > config.bookingWindow.maxMonthOffset) return

    this.generation += 1
    const generation = this.generation

    this.abortController?.abort()
    this.abortController = new AbortController()
    this.transition({ type: 'availability_loading' })

    try {
      const availability = await this.options.api.availability({
        surfaceId: this.options.surfaceId,
        schedulerKey: this.options.schedulerKey,
        timezone: this.timezone(),
        monthOffset,
        signal: this.abortController.signal,
      })

      if (generation !== this.generation) return

      this.transition({ type: 'loaded', config, availability })
      queueMicrotask(() => {
        const requestedControl = this.host.querySelector<HTMLButtonElement>(
          `.ghm-month-button[data-month-direction="${focusDirection}"]:not(:disabled)`,
        )

        if (requestedControl) requestedControl.focus({ preventScroll: true })
        else this.host.querySelector<HTMLElement>('.ghm-month-label')?.focus({ preventScroll: true })
      })
    } catch {
      if (generation !== this.generation || this.abortController.signal.aborted) return
      this.transition({ type: 'load_failed' })
    }
  }

  private observeViewed(): void {
    this.viewedCleanup?.()

    let timer: ReturnType<typeof setTimeout> | null = null
    let observer: IntersectionObserver | null = null
    const emit = () => this.telemetry({ type: 'step_reached', step: 'viewed' })

    if (typeof IntersectionObserver === 'undefined') {
      timer = setTimeout(emit, 300)
    } else {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
          if (!timer) timer = setTimeout(emit, 300)
        } else if (timer) {
          clearTimeout(timer)
          timer = null
        }
      }, { threshold: [0.5] })
      observer.observe(this.host)
    }

    this.viewedCleanup = () => {
      if (timer) clearTimeout(timer)
      observer?.disconnect()
    }
  }

  private observeLayout(): void {
    this.resizeObserver?.disconnect()

    const rect = this.host.getBoundingClientRect()

    this.applyLayout(rect.width, rect.height)

    if (typeof ResizeObserver === 'undefined') return

    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries.find(item => item.target === this.host)

      if (entry) this.applyLayout(entry.contentRect.width, entry.contentRect.height)
    })
    this.resizeObserver.observe(this.host)
  }

  private applyLayout(width: number, height: number): void {
    const next = resolveMeetingLayout({
      width,
      height,
      current: this.layoutInitialized ? this.layoutRecipe : undefined,
      maxRecipe: this.maxRecipe,
    })

    if (next === 'guided' && this.layoutRecipe !== 'guided' && this.state.selectedSlot) {
      this.navigationView = 'slots'
    }

    this.layoutRecipe = next
    this.layoutInitialized = true
    this.host.dataset.ghmRecipe = next
    this.host.dataset.ghmActivation = this.activationMode
    this.updateScenePresentation()
  }

  private updateScenePresentation(): void {
    const scene = this.host.querySelector<HTMLElement>('.ghm-scene')

    if (!scene) return
    scene.dataset.recipe = this.layoutRecipe
    scene.dataset.activation = this.activationMode
    scene.dataset.navigation = this.navigationView
  }

  private telemetry(action: MeetingTelemetryAction): void {
    const result = reduceMeetingTelemetry(this.telemetryState, {
      ...this.options.telemetryBase,
      presentation_variant: this.layoutRecipe,
      activation_mode: this.activationMode,
    }, action)

    this.telemetryState = result.state

    for (const effect of result.effects) {
      emitMeetingTelemetry(this.host, effect, { dataLayerEnabled: this.options.dataLayerEnabled })
    }
  }

  private transition(action: MeetingStateAction, telemetryAction?: MeetingTelemetryAction): void {
    this.previousPhase = this.state.phase
    this.state = reduceMeetingState(this.state, action)
    if (telemetryAction) this.telemetry(telemetryAction)
    this.render()
  }

  private selectedContext(slot = this.state.selectedSlot): MeetingStepContext {
    if (!slot || !this.state.config) return {}
    const timezone = this.timezone()

    return {
      days_ahead_bucket: daysAheadBucket(slot.startsAt, timezone, this.options.now?.() ?? new Date()),
      time_of_day_bucket: timeOfDayBucket(slot.startsAt, timezone),
    }
  }

  private render(): void {
    this.turnstileHandle?.destroy()
    this.turnstileHandle = null

    const scene = element('section', 'ghm-scene')

    scene.setAttribute('aria-label', copy.regionLabel)
    scene.dataset.capture = 'native-meeting-scheduler'
    scene.dataset.surfaceRecipe = 'public-meeting-calendar'
    scene.dataset.phase = this.state.phase
    scene.dataset.recipe = this.layoutRecipe
    scene.dataset.activation = this.activationMode
    scene.dataset.navigation = this.navigationView
    scene.append(this.renderSignalRail(), this.renderWorkPlane(), this.renderAgenda())
    this.host.replaceChildren(scene)
    this.host.dataset.ghmState = this.state.phase

    if (this.state.phase === 'details') this.mountTurnstile(scene)

    if (this.previousPhase !== this.state.phase && ['details', 'confirmed', 'error', 'ambiguous', 'fallback_only'].includes(this.state.phase)) {
      const focusSelector = this.state.phase === 'details'
        ? '.ghm-form-title'
        : this.state.phase === 'confirmed' ? '.ghm-confirmation-title' : '.ghm-message-title'

      queueMicrotask(() => scene.querySelector<HTMLElement>(focusSelector)?.focus())
    }
  }

  private renderSignalRail(): HTMLElement {
    const rail = element('header', 'ghm-signal')
    const confirmed = this.state.phase === 'confirmed'
    const eyebrow = element('p', 'ghm-eyebrow', confirmed ? copy.confirmedEyebrow : copy.eyebrow)

    const title = element('h2', 'ghm-title', confirmed
      ? copy.confirmedRailTitle
      : this.layoutRecipe === 'guided' ? copy.compactTitle : copy.title)

    title.tabIndex = -1
    title.dataset.ghmFocus = ''
    const liveStatus = element('div', 'ghm-live-status')

    liveStatus.append(
      element('span', 'ghm-live-dot'),
      element('span', undefined, confirmed ? copy.confirmedRailStatus : copy.availabilitySynced),
    )
    rail.append(liveStatus, eyebrow, title, element('p', 'ghm-intro', confirmed ? copy.confirmedRailBody : copy.intro))

    if (confirmed) {
      const assurance = element('div', 'ghm-confirmation-assurance')

      assurance.append(uiIcon('shield-check', 'ghm-confirmation-assurance-icon'), element('span', undefined, copy.confirmationAssurance))
      rail.append(assurance)

      return rail
    }

    const facts = element('div', 'ghm-facts')

    for (const [iconName, label] of [
      ['clock', `${this.state.config?.durationsMinutes[0] ?? 30} min`],
      ['brand-teams', copy.meetingPlatform],
      ['world', formatMeetingTimezoneLabel(this.timezone(), this.options.now?.())],
    ]) {
      const fact = element('span', 'ghm-fact')

      fact.append(uiIcon(iconName, iconName === 'brand-teams' ? 'ghm-fact-icon ghm-teams-mark' : 'ghm-fact-icon'), element('span', undefined, label))
      facts.append(fact)
    }

    rail.append(facts, this.renderStepRail())

    return rail
  }

  private renderStepRail(): HTMLElement {
    const steps = element('ol', 'ghm-steps')

    const phaseIndex = ['loading', 'schedule'].includes(this.state.phase) ? 0
      : ['details', 'submitting', 'error', 'ambiguous'].includes(this.state.phase) ? 1 : 2

    for (const [index, label] of [copy.scheduleStep, copy.detailsStep, copy.confirmationStep].entries()) {
      const item = element('li', 'ghm-step', label)

      item.dataset.active = String(index === phaseIndex)
      item.dataset.complete = String(index < phaseIndex)
      if (index === phaseIndex) item.setAttribute('aria-current', 'step')
      steps.append(item)
    }

    return steps
  }

  private renderWorkPlane(): HTMLElement {
    const work = element('div', 'ghm-work')

    if (this.state.phase === 'loading') {
      const status = element('div', 'ghm-status ghm-loading', copy.loading)

      status.setAttribute('role', 'status')
      status.setAttribute('aria-busy', 'true')
      work.append(status)

      return work
    }

    if (this.state.phase === 'details' || this.state.phase === 'submitting') {
      const slot = this.state.confirmation?.appointment ?? this.state.selectedSlot

      if (this.layoutRecipe === 'guided' && slot) {
        const brief = element('div', 'ghm-mobile-appointment')

        brief.append(element('span', 'ghm-agenda-kicker', copy.meetingSummary), this.renderSelection(slot))
        work.append(brief)
      }

      work.append(this.renderDetails())

      return work
    }

    if (this.state.phase === 'confirmed') {
      work.append(this.renderConfirmation())

      return work
    }

    if (this.state.phase === 'ambiguous') {
      work.append(this.renderMessage(copy.ambiguousTitle, copy.ambiguousBody, 'warning'))

      return work
    }

    if (this.state.phase === 'fallback_only') {
      work.append(this.renderLoadRecovery('neutral'))

      return work
    }

    if (this.state.phase === 'error' && !this.state.availability) {
      work.append(this.renderLoadRecovery('warning'))

      return work
    }

    if (this.state.phase === 'error') {
      const notice = element('div', 'ghm-inline-error')
      const refresh = element('button', 'ghm-secondary', copy.refreshAvailability)

      notice.setAttribute('role', 'alert')
      notice.append(element(
        'p',
        undefined,
        this.state.publicError?.error.code === 'slot_unavailable' ? copy.conflict : copy.genericError,
      ))
      refresh.type = 'button'
      refresh.addEventListener('click', () => void this.load())
      notice.append(refresh)
      work.append(notice)
    }

    work.append(this.renderCalendar())

    return work
  }

  private renderMessage(titleText: string, bodyText: string, kind: string): HTMLElement {
    const message = element('div', 'ghm-message')

    message.dataset.kind = kind
    message.setAttribute('role', kind === 'warning' ? 'alert' : 'status')
    const title = element('h3', 'ghm-message-title', titleText)

    title.tabIndex = -1
    title.dataset.ghmFocus = ''
    message.append(title, element('p', 'ghm-message-body', bodyText))

    return message
  }

  private renderLoadRecovery(kind: 'neutral' | 'warning'): HTMLElement {
    const message = this.renderMessage(copy.genericError, copy.unavailableHelp, kind)
    const retry = element('button', 'ghm-secondary ghm-retry', copy.retry)

    retry.type = 'button'
    retry.addEventListener('click', () => void this.load())
    message.append(retry)

    return message
  }

  private renderConfirmation(): HTMLElement {
    const appointment = this.state.confirmation?.appointment
    const confirmation = element('section', 'ghm-confirmation')
    const titleId = `ghm-${this.instanceId}-confirmation-title`

    confirmation.dataset.capture = 'meeting-confirmation'
    confirmation.setAttribute('role', 'status')
    confirmation.setAttribute('aria-live', 'polite')
    confirmation.setAttribute('aria-atomic', 'true')
    confirmation.setAttribute('aria-labelledby', titleId)

    const status = element('div', 'ghm-confirmation-status')
    const iconShell = element('span', 'ghm-confirmation-icon-shell')

    iconShell.append(uiIcon('circle-check', 'ghm-confirmation-icon'))
    status.append(iconShell, element('span', 'ghm-confirmation-eyebrow', copy.confirmedEyebrow))

    const title = element('h3', 'ghm-confirmation-title', copy.confirmedTitle)

    title.id = titleId
    title.tabIndex = -1
    title.dataset.ghmFocus = ''
    confirmation.append(status, title, element('p', 'ghm-confirmation-body', copy.confirmedBody))

    if (appointment) confirmation.append(this.renderConfirmationReceipt(appointment))
    if (this.layoutRecipe === 'guided') confirmation.append(this.renderConfirmationNextSteps())

    return confirmation
  }

  private renderConfirmationReceipt(slot: MeetingSummarySlot): HTMLElement {
    const timezone = slot.timezone ?? this.timezone()
    const receipt = element('div', 'ghm-confirmation-receipt')
    const label = element('span', 'ghm-receipt-label')

    receipt.dataset.capture = 'meeting-confirmation-receipt'
    label.append(uiIcon('calendar-check', 'ghm-receipt-label-icon'), element('span', undefined, copy.confirmedReceiptLabel))
    receipt.append(
      label,
      element('strong', 'ghm-receipt-date', formatMeetingDate(slot.startsAt, timezone, 'long')),
      element(
        'span',
        'ghm-receipt-time',
        slot.endsAt
          ? formatMeetingTimeRangeWithOffset(slot.startsAt, slot.endsAt, timezone)
          : formatMeetingTimeWithOffset(slot.startsAt, timezone),
      ),
    )

    const facts = element('div', 'ghm-receipt-facts')

    for (const [iconName, labelText] of [
      ['clock', `${slot.durationMinutes ?? 30} min`],
      ['video', copy.meetingPlatform],
      ['world', formatMeetingTimezoneLabel(timezone, new Date(slot.startsAt))],
    ]) {
      const fact = element('span', 'ghm-receipt-fact')

      fact.append(uiIcon(iconName, 'ghm-receipt-fact-icon'), element('span', undefined, labelText))
      facts.append(fact)
    }

    receipt.append(facts)

    return receipt
  }

  private renderConfirmationNextSteps(): HTMLElement {
    const next = element('div', 'ghm-confirmation-next')
    const list = element('ul', 'ghm-next-list')

    next.dataset.capture = 'meeting-confirmation-next-steps'
    next.append(element('h3', 'ghm-next-title', copy.confirmedNextTitle))

    for (const [iconName, label] of [
      ['mail', copy.confirmedNextEmail],
      ['video', copy.confirmedNextTeams],
      ['calendar-cog', copy.confirmedNextChanges],
    ]) {
      const item = element('li', 'ghm-next-item')

      item.append(uiIcon(iconName, 'ghm-next-icon'), element('span', undefined, label))
      list.append(item)
    }

    next.append(list, element('p', 'ghm-confirmation-help', copy.confirmedHelp))

    return next
  }

  private renderCalendar(): HTMLElement {
    const root = element('div', 'ghm-calendar-panel')

    root.dataset.capture = 'meeting-calendar'
    const header = element('div', 'ghm-calendar-panel-header')
    const days = this.state.availability?.days ?? []
    const monthOffset = this.state.availability?.monthOffset ?? 0

    const referenceDate = this.state.selectedDate
      ?? days[0]?.date
      ?? monthReferenceDate(this.options.now?.() ?? new Date(), this.timezone(), monthOffset)

    const calendarIdentity = element('div', 'ghm-calendar-identity')

    calendarIdentity.append(
      element('span', 'ghm-calendar-eyebrow', copy.calendarEyebrow),
      element('div', 'ghm-calendar-panel-title', copy.calendarTitle),
    )
    header.append(calendarIdentity)

    const monthNavigation = element('div', 'ghm-month-navigation')
    const previous = element('button', 'ghm-month-button')
    const next = element('button', 'ghm-month-button')
    const canGoNext = Boolean(this.state.availability?.hasMore) && monthOffset < (this.state.config?.bookingWindow.maxMonthOffset ?? 0)

    previous.type = 'button'
    previous.dataset.monthDirection = 'previous'
    previous.append(uiIcon('chevron-left'))
    previous.setAttribute('aria-label', `${copy.previousMonth}: ${monthLabel(monthReferenceDate(this.options.now?.() ?? new Date(), this.timezone(), monthOffset - 1))}`)
    previous.disabled = monthOffset === 0
    previous.addEventListener('click', () => void this.loadMonth(monthOffset - 1))
    next.type = 'button'
    next.dataset.monthDirection = 'next'
    next.append(uiIcon('chevron-right'))
    next.setAttribute('aria-label', `${copy.nextMonth}: ${monthLabel(monthReferenceDate(this.options.now?.() ?? new Date(), this.timezone(), monthOffset + 1))}`)
    next.disabled = !canGoNext
    next.addEventListener('click', () => void this.loadMonth(monthOffset + 1))
    const visibleMonth = element('div', 'ghm-month-label', monthLabel(referenceDate))

    visibleMonth.tabIndex = -1
    visibleMonth.setAttribute('aria-live', 'polite')
    monthNavigation.append(previous, visibleMonth, next)
    header.append(monthNavigation)

    root.append(header)

    const availabilityByDate = new Map(days.map(day => [day.date, day]))
    const availableDates = days.filter(day => day.slots.length > 0).map(day => day.date).sort()

    const rovingDate = this.state.selectedDate && availableDates.includes(this.state.selectedDate)
      ? this.state.selectedDate
      : availableDates[0]

    const today = dateKeyInTimezone(this.options.now?.() ?? new Date(), this.timezone())
    const table = element('table', 'ghm-calendar')
    const caption = element('caption', 'ghm-visually-hidden', `${copy.calendarRegion}: ${monthLabel(referenceDate)}`)
    const head = element('thead')
    const headingRow = element('tr')

    for (const [short, full] of [
      ['L', 'Lunes'], ['M', 'Martes'], ['X', 'Miércoles'], ['J', 'Jueves'],
      ['V', 'Viernes'], ['S', 'Sábado'], ['D', 'Domingo'],
    ]) {
      const cell = element('th')
      const abbreviation = element('abbr', undefined, short)

      cell.scope = 'col'
      abbreviation.title = full
      cell.append(abbreviation)
      headingRow.append(cell)
    }

    head.append(headingRow)
    table.append(caption, head)

    const body = element('tbody')
    const dates = calendarDates(referenceDate)

    for (let rowIndex = 0; rowIndex < dates.length; rowIndex += 7) {
      const row = element('tr')

      for (const date of dates.slice(rowIndex, rowIndex + 7)) {
        const cell = element('td')
        const day = date ? availabilityByDate.get(date) : undefined

        if (!date) {
          cell.append(element('span', 'ghm-calendar-blank'))
        } else if (day?.slots.length) {
          const button = element('button', 'ghm-calendar-day')
          const availabilityLevel = day.slots.length >= 6 ? 'high' : day.slots.length >= 3 ? 'medium' : 'low'
          const isToday = date === today

          button.type = 'button'
          button.tabIndex = date === rovingDate ? 0 : -1
          button.dataset.date = date
          button.dataset.today = String(isToday)
          button.dataset.availability = availabilityLevel
          button.dataset.selected = String(date === this.state.selectedDate)
          button.setAttribute('aria-pressed', String(date === this.state.selectedDate))
          if (isToday) button.setAttribute('aria-current', 'date')
          const slotLabel = `${day.slots.length} ${day.slots.length === 1 ? copy.slotSingular : copy.slotPlural}`

          button.setAttribute('aria-label', `${isToday ? `${copy.today}, ` : ''}${formatMeetingDate(date, this.timezone(), 'long')}, ${slotLabel}`)
          const meter = element('span', 'ghm-availability-meter')
          const availability = element('span', 'ghm-calendar-available')

          meter.setAttribute('aria-hidden', 'true')
          meter.append(element('span'), element('span'), element('span'))
          availability.setAttribute('aria-hidden', 'true')
          availability.append(
            element('span', 'ghm-calendar-available-count', String(day.slots.length)),
            element('span', 'ghm-calendar-available-label', day.slots.length === 1 ? copy.optionSingular : copy.optionPlural),
          )
          button.append(
            element('span', 'ghm-calendar-number', String(Number(date.slice(-2)))),
            availability,
            meter,
          )
          if (isToday) button.append(element('span', 'ghm-today-label', copy.today))
          if (date === this.state.selectedDate) button.append(uiIcon('check', 'ghm-calendar-check'))
          button.addEventListener('keydown', event => this.handleCalendarKeydown(event, date, availableDates))
          button.addEventListener('click', () => {
            this.navigationView = 'slots'
            this.transition(
              { type: 'select_date', date },
              {
                type: 'step_reached',
                step: 'date_selected',
                context: { days_ahead_bucket: daysAheadBucket(day.slots[0].startsAt, this.timezone(), this.options.now?.() ?? new Date()) },
              },
            )
            queueMicrotask(() => {
              const focusTarget = this.layoutRecipe === 'guided'
                ? this.host.querySelector<HTMLButtonElement>('.ghm-slot')
                : this.host.querySelector<HTMLButtonElement>('.ghm-calendar-day[aria-pressed="true"]')

              focusTarget?.focus({ preventScroll: true })
            })
          })
          cell.append(button)
        } else {
          const unavailable = element('span', 'ghm-calendar-day ghm-calendar-day--unavailable', String(Number(date.slice(-2))))

          unavailable.setAttribute('aria-hidden', 'true')
          cell.append(unavailable)
        }

        row.append(cell)
      }

      body.append(row)
    }

    table.append(body)
    const legend = element('div', 'ghm-calendar-footer')
    const densityLegend = element('span', 'ghm-density-legend')
    const timezoneLens = element('div', 'ghm-timezone-lens')

    densityLegend.append(element('span', 'ghm-density-dot'), element('span', undefined, copy.moreOptions))
    timezoneLens.append(uiIcon('world', 'ghm-timezone-icon'), element('span', undefined, formatMeetingTimezoneLabel(this.timezone(), this.options.now?.())))
    legend.append(densityLegend, timezoneLens)
    root.append(table)

    if (availableDates.length === 0) {
      const empty = element('div', 'ghm-calendar-empty')

      empty.dataset.capture = 'meeting-calendar-empty'
      empty.setAttribute('role', 'status')
      empty.append(
        uiIcon('calendar-off', 'ghm-calendar-empty-icon'),
        element('strong', 'ghm-calendar-empty-title', noSlotsForMonth(referenceDate)),
        element('span', 'ghm-calendar-empty-body', copy.noSlotsHelp),
      )
      root.dataset.availabilityState = 'empty'
      root.append(empty)
    }

    root.append(legend)

    return root
  }

  private handleCalendarKeydown(event: KeyboardEvent, date: string, availableDates: string[]): void {
    let targetDate: string | undefined

    if (event.key === 'ArrowLeft') targetDate = shiftDateKey(date, -1)
    else if (event.key === 'ArrowRight') targetDate = shiftDateKey(date, 1)
    else if (event.key === 'ArrowUp') targetDate = shiftDateKey(date, -7)
    else if (event.key === 'ArrowDown') targetDate = shiftDateKey(date, 7)
    else if (event.key === 'Home') targetDate = shiftDateKey(date, -(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7)
    else if (event.key === 'End') targetDate = shiftDateKey(date, 6 - ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7))
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      const offset = this.state.availability?.monthOffset ?? 0

      void this.loadMonth(offset + (event.key === 'PageUp' ? -1 : 1))

      return
    } else return

    event.preventDefault()
    const direction = targetDate < date ? -1 : 1

    const candidate = direction < 0
      ? [...availableDates].reverse().find(item => item <= targetDate)
      : availableDates.find(item => item >= targetDate)

    const fallback = direction < 0
      ? [...availableDates].reverse().find(item => item < date)
      : availableDates.find(item => item > date)

    const next = candidate ?? fallback

    if (!next) return
    const buttons = this.host.querySelectorAll<HTMLButtonElement>('.ghm-calendar-day[data-date]')

    for (const button of buttons) button.tabIndex = button.dataset.date === next ? 0 : -1
    this.host.querySelector<HTMLButtonElement>(`.ghm-calendar-day[data-date="${next}"]`)?.focus()
  }

  private renderDetails(): HTMLElement {
    const form = element('form', 'ghm-form')

    form.dataset.capture = 'meeting-details'
    form.noValidate = true
    form.addEventListener('submit', event => {
      event.preventDefault()
      void this.submit()
    })

    const heading = element('h3', 'ghm-form-title', copy.detailsStep)

    heading.tabIndex = -1
    heading.dataset.ghmFocus = ''
    form.append(heading)

    if (this.state.fieldErrors.length > 0) {
      const errorSummary = element('div', 'ghm-error-summary', copy.requiredSummary)

      errorSummary.setAttribute('role', 'alert')
      errorSummary.tabIndex = -1
      form.append(errorSummary)
    }

    const fields = element('div', 'ghm-fields')

    fields.append(
      this.input('firstName', copy.firstName, 'given-name'),
      this.input('lastName', copy.lastName, 'family-name'),
      this.input('email', copy.email, 'email', 'email'),
      this.input('company', copy.company, 'organization'),
    )
    form.append(fields)

    const processing = this.checkbox('processingAccepted', copy.processingConsent, this.state.form.processingAccepted)
    const consents = element('fieldset', 'ghm-consents')
    const consentLegend = element('legend', 'ghm-visually-hidden', copy.consentGroup)

    consents.append(consentLegend, processing)

    for (const consent of this.state.config?.consent.communications ?? []) {
      consents.append(this.communicationCheckbox(consent.consentKey, consent.label, consent.required))
    }

    form.append(consents)
    form.append(element('div', 'ghm-turnstile'))

    if (this.state.fieldErrors.includes('captchaToken')) {
      const captchaError = element('p', 'ghm-field-error', copy.captchaRequired)

      captchaError.setAttribute('role', 'alert')
      form.append(captchaError)
    }

    const actions = element('div', 'ghm-form-actions')
    const back = element('button', 'ghm-secondary', copy.back)
    const submit = element('button', 'ghm-primary', this.state.phase === 'submitting' || this.submissionPending ? copy.processing : copy.reserve)

    back.type = 'button'
    back.disabled = this.state.phase === 'submitting'
    back.addEventListener('click', () => this.transition({ type: 'back' }))
    submit.type = 'submit'
    submit.disabled = this.state.phase === 'submitting' || this.submissionPending || this.emailVerification.status === 'verifying' ||
      this.emailVerification.status === 'rejected'
    actions.append(back, submit)
    form.append(actions)

    return form
  }

  private input(
    key: 'firstName' | 'lastName' | 'email' | 'company',
    labelText: string,
    autocomplete: string,
    type = 'text',
  ): HTMLElement {
    const label = element('label', 'ghm-field')
    const control = element('span', 'ghm-control')
    const input = element('input', 'ghm-input')

    input.name = key
    input.type = type
    input.setAttribute('autocomplete', autocomplete)
    input.required = true
    input.maxLength = key === 'email' ? 254 : key === 'company' ? 160 : 80
    input.value = this.state.form[key]
    const invalid = this.state.fieldErrors.includes(key)
    const feedback = element('span', `ghm-field-feedback${key === 'email' ? ' ghm-email-verification' : ''}`)
    const statusIcon = uiIcon('circle-check', 'ghm-validation-icon')

    label.dataset.validation = invalid ? 'invalid' : 'neutral'
    feedback.id = `ghm-${this.instanceId}-${key}-feedback`
    feedback.setAttribute('aria-live', 'polite')
    input.setAttribute('aria-invalid', String(invalid))
    input.setAttribute('aria-describedby', feedback.id)
    input.addEventListener('input', () => {
      this.state = reduceMeetingState(this.state, { type: 'form', values: { [key]: input.value } })
      if (key === 'email') this.scheduleEmailVerification(input.value)
      else if (this.touchedFields.has(key)) this.patchFieldValidation(key)
      this.patchErrorSummary()
    })
    input.addEventListener('blur', () => {
      this.touchedFields.add(key)
      this.patchFieldValidation(key)

      if (key === 'email' && emailLooksValid(normalizedEmail(input.value))) {
        this.scheduleEmailVerification(input.value, true)
      }
    })
    control.append(fieldIcon(key), input, statusIcon)
    label.append(element('span', 'ghm-label', labelText), control, feedback)
    queueMicrotask(() => this.patchFieldValidation(key, false))

    return label
  }

  private fieldError(key: MeetingFormFieldKey): string | null {
    if (key === 'processingAccepted') return this.state.form.processingAccepted ? null : copy.consentRequired
    const value = this.state.form[key].trim()

    if (!value) return copy.requiredField
    if (key === 'email' && !emailLooksValid(value)) return copy.invalidEmail

    return null
  }

  private patchFieldValidation(key: MeetingFormFieldKey, announce = true): void {
    const input = this.host.querySelector<HTMLInputElement>(`[name='${key}']`)
    const wrap = input?.closest<HTMLElement>('.ghm-field, .ghm-check-group')
    const feedback = wrap?.querySelector<HTMLElement>('.ghm-field-feedback')

    if (!input || !wrap || !feedback) return

    const forcedInvalid = this.state.fieldErrors.includes(key)
    const hasInteraction = this.touchedFields.has(key) || forcedInvalid
    const error = hasInteraction ? this.fieldError(key) : null
    let validation: FieldValidationState = 'neutral'
    let message = key === 'email' && !hasInteraction ? copy.emailHint : ''

    if (error) {
      validation = 'invalid'
      message = error
    } else if (hasInteraction) {
      validation = 'valid'
      message = key === 'processingAccepted' ? '' : copy.fieldReady
    }

    wrap.dataset.validation = validation
    input.setAttribute('aria-invalid', String(validation === 'invalid'))
    feedback.className = `ghm-field-feedback${key === 'email' ? ' ghm-email-verification' : ''}${validation === 'invalid' ? ' ghm-field-error' : ''}`
    feedback.textContent = message
    if (!announce) feedback.setAttribute('aria-live', 'off')
    else feedback.setAttribute('aria-live', 'polite')
    this.patchValidationIcon(wrap, validation)
  }

  private patchValidationIcon(wrap: HTMLElement, validation: FieldValidationState): void {
    const icon = wrap.querySelector<HTMLElement>('.ghm-validation-icon')

    if (!icon) return
    const name = validation === 'invalid' ? 'alert-circle' : validation === 'pending' ? 'loader-2' : 'circle-check'

    icon.className = `ghm-validation-icon tabler-${name}`
  }

  private patchErrorSummary(): void {
    if (this.state.fieldErrors.length === 0) this.host.querySelector('.ghm-error-summary')?.remove()
  }

  private resetEmailVerification(): void {
    if (this.emailVerifyTimer) clearTimeout(this.emailVerifyTimer)
    this.emailVerifyTimer = null
    this.emailVerifyController?.abort()
    this.emailVerifyController = null
    this.emailVerification = { status: 'idle', email: '' }
  }

  private scheduleEmailVerification(value: string, immediate = false): void {
    if (this.emailVerifyTimer) clearTimeout(this.emailVerifyTimer)
    this.emailVerifyController?.abort()
    this.emailVerifyController = null

    const email = normalizedEmail(value)

    this.emailVerification = { status: emailLooksValid(email) ? 'queued' : 'idle', email }
    this.patchEmailVerificationDom()

    if (!emailLooksValid(email)) return

    if (immediate) {
      void this.runEmailVerification(email)

      return
    }

    this.emailVerifyTimer = setTimeout(() => {
      this.emailVerifyTimer = null
      void this.runEmailVerification(email)
    }, 450)
  }

  private async runEmailVerification(email: string): Promise<boolean | null> {
    if (this.emailVerifyTimer) clearTimeout(this.emailVerifyTimer)
    this.emailVerifyTimer = null

    const currentEmail = normalizedEmail(this.state.form.email)

    if (!emailLooksValid(email) || email !== currentEmail) return false

    this.emailVerifyController?.abort()
    const controller = new AbortController()

    this.emailVerifyController = controller
    this.emailVerification = { status: 'verifying', email }
    this.patchEmailVerificationDom()

    const result = await this.options.api.verifyEmail({
      surfaceId: this.options.surfaceId,
      schedulerKey: this.options.schedulerKey,
      email,
      signal: controller.signal,
    })

    if (controller.signal.aborted || normalizedEmail(this.state.form.email) !== email) return null

    this.emailVerifyController = null

    if (result.outcome !== 'ok') {
      this.emailVerification = { status: 'degraded', email }
      this.patchEmailVerificationDom()

      return null
    }

    this.emailVerification = {
      status: result.accepted ? 'accepted' : 'rejected',
      email,
      result,
    }
    this.patchEmailVerificationDom()

    return result.accepted
  }

  private patchEmailVerificationDom(): void {
    const input = this.host.querySelector<HTMLInputElement>("[name='email']")
    const status = input?.closest('.ghm-field')?.querySelector<HTMLElement>('.ghm-email-verification')
    const submit = this.host.querySelector<HTMLButtonElement>('.ghm-form-actions .ghm-primary')

    if (!input || !status) return

    const state = this.emailVerification
    const applies = state.email === normalizedEmail(input.value)
    const rejected = applies && state.status === 'rejected'
    const verifying = applies && (state.status === 'queued' || state.status === 'verifying')
    const accepted = applies && state.status === 'accepted'

    status.className = `ghm-field-feedback ghm-email-verification${rejected ? ' ghm-field-error' : ''}`
    status.setAttribute('aria-live', 'polite')
    const wrap = input.closest<HTMLElement>('.ghm-field')

    if (verifying) {
      status.classList.add('is-verifying')
      status.textContent = copy.verifyingEmail
    } else if (rejected) {
      status.classList.add('is-error')
      status.textContent = state.result?.reasonCode === 'email_disposable'
        ? copy.disposableEmail
        : `${copy.corporateEmail}${state.result?.suggestion ? ` ¿Quisiste decir ${state.result.suggestion}?` : ''}`
    } else if (accepted) {
      status.classList.add('is-success')
      status.textContent = copy.emailVerified
    } else {
      this.patchFieldValidation('email')

      return
    }

    input.setAttribute('aria-invalid', String(this.state.fieldErrors.includes('email') || rejected))

    if (wrap) {
      const validation: FieldValidationState = rejected ? 'invalid' : verifying ? 'pending' : 'valid'

      wrap.dataset.validation = validation
      this.patchValidationIcon(wrap, validation)
    }

    if (submit && this.state.phase !== 'submitting') submit.disabled = verifying || rejected
  }

  private checkbox(key: 'processingAccepted', labelText: string, checked: boolean): HTMLElement {
    const group = element('div', 'ghm-check-group')
    const label = element('label', 'ghm-check')
    const input = element('input')

    input.type = 'checkbox'
    input.checked = checked
    input.required = true
    const invalid = this.state.fieldErrors.includes(key)
    const feedback = element('span', 'ghm-field-feedback')

    group.dataset.validation = invalid ? 'invalid' : 'neutral'
    feedback.id = `ghm-${this.instanceId}-${key}-feedback`
    feedback.setAttribute('aria-live', 'polite')
    input.name = key
    input.setAttribute('aria-invalid', String(invalid))
    input.setAttribute('aria-describedby', feedback.id)
    input.addEventListener('change', () => {
      this.state = reduceMeetingState(this.state, { type: 'form', values: { [key]: input.checked } })
      this.touchedFields.add(key)
      this.patchFieldValidation(key)
      this.patchErrorSummary()
    })
    label.append(input, element('span', undefined, labelText))

    group.append(label)

    group.append(feedback)
    queueMicrotask(() => this.patchFieldValidation(key, false))

    return group
  }

  private communicationCheckbox(consentKey: string, labelText: string, required: boolean): HTMLElement {
    const label = element('label', 'ghm-check')
    const input = element('input')

    const localizedLabel = labelText.trim() === LEGACY_ENGLISH_COMMUNICATION_CONSENT
      ? copy.communicationConsent
      : labelText

    const visibleLabel = required ? localizedLabel : `${localizedLabel} ${copy.optional}`

    input.type = 'checkbox'
    input.name = 'communications'
    input.value = consentKey
    input.required = required
    input.checked = this.state.form.communicationKeys.includes(consentKey)
    input.addEventListener('change', () => {
      const values = new Set(this.state.form.communicationKeys)

      if (input.checked) values.add(consentKey)
      else values.delete(consentKey)
      this.state = reduceMeetingState(this.state, {
        type: 'form',
        values: { communicationKeys: [...values] },
      })
    })
    label.append(input, element('span', undefined, visibleLabel))

    return label
  }

  private renderAgenda(): HTMLElement {
    const agenda = element('aside', 'ghm-agenda')

    agenda.dataset.capture = 'meeting-agenda'
    agenda.setAttribute('aria-label', copy.timeRegion)

    if (this.state.phase === 'confirmed') {
      if (this.layoutRecipe === 'guided') {
        agenda.hidden = true
        agenda.setAttribute('aria-hidden', 'true')

        return agenda
      }

      agenda.classList.add('ghm-confirmation-aside')
      agenda.setAttribute('aria-label', copy.confirmedNextTitle)
      agenda.append(this.renderConfirmationNextSteps())

      return agenda
    }

    if (this.state.phase === 'schedule') {
      const selectedDay = this.state.availability?.days.find(day => day.date === this.state.selectedDate)

      const guidedBack = element('button', 'ghm-guided-back')

      guidedBack.type = 'button'
      guidedBack.append(uiIcon('chevron-left'), element('span', undefined, copy.viewCalendar))
      guidedBack.addEventListener('click', () => {
        this.navigationView = 'calendar'
        this.updateScenePresentation()
        queueMicrotask(() => this.host
          .querySelector<HTMLButtonElement>('.ghm-calendar-day[aria-pressed="true"]')
          ?.focus({ preventScroll: true }))
      })
      const availabilityStatus = element('div', 'ghm-agenda-status')

      availabilityStatus.append(element('span', 'ghm-live-dot'), element('span', undefined, copy.agendaUpdated))
      agenda.append(guidedBack, availabilityStatus, element('span', 'ghm-agenda-kicker', copy.chooseTime))

      if (selectedDay) {
        agenda.append(
          element('h3', 'ghm-agenda-date', `${copy.timesFor} ${formatMeetingDate(selectedDay.date, this.timezone(), 'long').toLocaleLowerCase('es-CL')}`),
          element('p', 'ghm-agenda-help', `${selectedDay.slots.length} ${selectedDay.slots.length === 1 ? copy.slotSingular : copy.slotPlural} · ${copy.chooseTimeHelp}`),
        )
      }

      const slots = element('div', 'ghm-slots')

      const duplicateTimes = new Set(
        (selectedDay?.slots ?? [])
          .map(slot => formatTime(slot.startsAt, this.timezone()))
          .filter((time, index, all) => all.indexOf(time) !== index),
      )

      let previousPeriod: string | null = null

      slots.setAttribute('aria-label', copy.chooseTime)

      if (!selectedDay?.slots.length) {
        const referenceDate = this.state.availability?.days[0]?.date
          ?? monthReferenceDate(
            this.options.now?.() ?? new Date(),
            this.timezone(),
            this.state.availability?.monthOffset ?? 0,
          )

        slots.append(element('p', 'ghm-empty', noSlotsForMonth(referenceDate)))
      }

      for (const availabilitySlot of selectedDay?.slots ?? []) {
        const period = timePeriod(availabilitySlot.startsAt, this.timezone())

        if (period !== previousPeriod) {
          const group = element('span', 'ghm-slot-group', period)

          group.setAttribute('aria-hidden', 'true')
          slots.append(group)
          previousPeriod = period
        }

        const button = element('button', 'ghm-slot')

        button.type = 'button'
        button.dataset.period = period.toLocaleLowerCase('es-CL')
        button.dataset.selected = String(availabilitySlot.slotId === this.state.selectedSlot?.slotId)
        button.setAttribute('aria-pressed', String(availabilitySlot.slotId === this.state.selectedSlot?.slotId))
        button.append(
          element(
            'strong',
            'ghm-slot-time',
            duplicateTimes.has(formatTime(availabilitySlot.startsAt, this.timezone()))
              ? formatMeetingTimeWithOffset(availabilitySlot.startsAt, this.timezone())
              : formatTime(availabilitySlot.startsAt, this.timezone()),
          ),
          element('span', 'ghm-slot-duration', `${availabilitySlot.durationMinutes} min`),
        )
        if (availabilitySlot.slotId === this.state.selectedSlot?.slotId) button.append(uiIcon('check', 'ghm-slot-check'))
        button.addEventListener('click', () => {
          this.transition(
            { type: 'select_slot', slot: availabilitySlot },
            { type: 'step_reached', step: 'slot_selected', context: this.selectedContext(availabilitySlot) },
          )
          queueMicrotask(() => this.host
            .querySelector<HTMLButtonElement>('.ghm-slot[aria-pressed="true"]')
            ?.focus({ preventScroll: true }))
        })
        slots.append(button)
      }

      agenda.append(slots)
    } else if (!(this.layoutRecipe === 'guided' && ['details', 'submitting'].includes(this.state.phase))) {
      agenda.append(element('span', 'ghm-agenda-kicker', copy.meetingSummary))
    }

    const slot = this.state.confirmation?.appointment ?? this.state.selectedSlot

    if (slot && !(this.layoutRecipe === 'guided' && ['details', 'submitting'].includes(this.state.phase))) {
      agenda.append(this.renderSelection(slot))
    } else if (this.state.phase !== 'schedule' && !(this.layoutRecipe === 'guided' && ['details', 'submitting'].includes(this.state.phase))) {
      agenda.append(element('p', 'ghm-agenda-empty', copy.selected))
    }

    if (this.state.phase === 'schedule') {
      const actionLabel = this.state.selectedSlot
        ? `${copy.continueWithTime} ${formatTime(this.state.selectedSlot.startsAt, this.timezone())}`
        : copy.selectSlotPrompt

      const button = element('button', 'ghm-primary ghm-agenda-action', actionLabel)

      button.type = 'button'
      button.setAttribute('aria-disabled', String(!this.state.selectedSlot))
      if (this.state.selectedSlot) button.append(uiIcon('arrow-right', 'ghm-action-icon'))
      button.addEventListener('click', () => {
        if (!this.state.selectedSlot) return
        this.transition(
          { type: 'details', idempotencyKey: idempotencyKey() },
          { type: 'step_reached', step: 'details_started', context: this.selectedContext() },
        )
      })
      agenda.append(button)
    }

    return agenda
  }

  private renderSelection(slot: MeetingSummarySlot): HTMLElement {
    const selection = element('div', 'ghm-selection')
    const selectionHeader = element('span', 'ghm-selection-label')

    selection.dataset.capture = 'meeting-summary'
    selection.setAttribute('aria-live', 'polite')
    selectionHeader.append(uiIcon('calendar-check', 'ghm-selection-icon'), element('span', undefined, copy.selectedTime))
    selection.append(
      selectionHeader,
      element('strong', 'ghm-agenda-date', formatMeetingDate(slot.startsAt, slot.timezone ?? this.timezone(), 'long')),
      element('span', 'ghm-agenda-time', formatMeetingTimeWithOffset(slot.startsAt, slot.timezone ?? this.timezone())),
      element('span', 'ghm-agenda-meta', `${slot.durationMinutes ?? 30} min · ${copy.meetingPlatform}`),
    )

    return selection
  }

  private mountTurnstile(scene: HTMLElement): void {
    const container = scene.querySelector<HTMLElement>('.ghm-turnstile')
    const captcha = this.state.config?.security.captcha

    if (!container || !captcha?.siteKey) return

    this.turnstileHandle = this.options.turnstile.mount({
      container,
      siteKey: captcha.siteKey,
      action: captcha.action,
    })
  }

  private validate(): string[] {
    const errors: string[] = []

    if (!this.state.form.firstName.trim()) errors.push('firstName')
    if (!this.state.form.lastName.trim()) errors.push('lastName')
    if (!emailLooksValid(this.state.form.email.trim())) errors.push('email')
    if (!this.state.form.company.trim()) errors.push('company')
    if (!this.state.form.processingAccepted) errors.push('processingAccepted')

    return errors
  }

  private async submit(): Promise<void> {
    if (this.submissionPending || !this.state.selectedSlot || !this.state.config || !this.state.idempotencyKey) return

    const errors = this.validate()

    if (errors.length > 0) {
      for (const field of errors) {
        if (field !== 'captchaToken') this.touchedFields.add(field as MeetingFormFieldKey)
      }

      this.transition(
        { type: 'validation_failed', fields: errors },
        { type: 'step_reached', step: 'validation_failed', context: { error_category: 'validation_failed' } },
      )
      queueMicrotask(() => this.host.querySelector<HTMLElement>('.ghm-error-summary')?.focus())

      return
    }

    const email = normalizedEmail(this.state.form.email)
    const alreadyAccepted = this.emailVerification.status === 'accepted' && this.emailVerification.email === email
    const corporate = alreadyAccepted ? true : await this.runEmailVerification(email)

    if (corporate === false) {
      this.telemetry({
        type: 'step_reached',
        step: 'validation_failed',
        context: { error_category: 'validation_failed' },
      })
      this.host.querySelector<HTMLInputElement>("[name='email']")?.focus()

      return
    }

    this.submissionPending = true
    const submitButton = this.host.querySelector<HTMLButtonElement>('.ghm-form-actions .ghm-primary')
    const backButton = this.host.querySelector<HTMLButtonElement>('.ghm-form-actions .ghm-secondary')

    if (submitButton) {
      submitButton.disabled = true
      submitButton.textContent = copy.processing
    }

    if (backButton) backButton.disabled = true

    let captchaToken: string

    try {
      if (!this.turnstileHandle) throw new Error('turnstile_unavailable')
      captchaToken = await this.turnstileHandle.execute()
    } catch {
      this.submissionPending = false
      this.turnstileHandle?.reset()
      this.transition(
        { type: 'validation_failed', fields: ['captchaToken'] },
        { type: 'step_reached', step: 'validation_failed', context: { error_category: 'validation_failed' } },
      )
      queueMicrotask(() => this.host.querySelector<HTMLElement>('.ghm-error-summary')?.focus())

      return
    }

    const selectedContext = this.selectedContext()

    this.transition(
      { type: 'submit' },
      { type: 'step_reached', step: 'booking_started', context: selectedContext },
    )

    const payload: MeetingBookingPayload = {
      schedulerKey: this.options.schedulerKey,
      surfaceId: this.options.surfaceId,
      slot: {
        startsAt: this.state.selectedSlot.startsAt,
        durationMinutes: this.state.selectedSlot.durationMinutes,
        timezone: this.timezone(),
      },
      locale: this.state.config.localePolicy.defaultLocale,
      contact: {
        email: this.state.form.email,
        firstName: this.state.form.firstName,
        lastName: this.state.form.lastName,
        company: this.state.form.company,
      },
      consent: {
        processingAccepted: this.state.form.processingAccepted,
        communicationKeys: this.state.form.communicationKeys,
      },
      captchaToken,
      attribution: {
        placement: this.options.telemetryBase.placement,
        pagePath: typeof location !== 'undefined' ? location.pathname : '/',
      },
    }

    const result = await this.options.api.book(payload, this.state.idempotencyKey)

    this.submissionPending = false

    if (result.outcome === 'confirmed') {
      this.telemetry({ type: 'booking_confirmed', response: result, context: selectedContext })
    } else {
      this.telemetry({
        type: 'step_reached',
        step: 'booking_failed',
        context: { ...selectedContext, error_category: result.error.code as MeetingPublicErrorCode },
      })
    }

    this.transition({ type: 'booking_result', result })
  }

  private timezone(): string {
    const policy = this.state.config?.timezonePolicy

    return policy?.resolvedTimezone ?? policy?.defaultTimezone ?? this.options.requestedTimezone
  }
}
