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
  emergencyFallbackUrl?: string | null
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

const timePeriod = (startsAt: string, timezone: string): 'Mañana' | 'Tarde' | 'Noche' => {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).format(new Date(startsAt)))

  if (hour < 12) return 'Mañana'
  if (hour < 18) return 'Tarde'

  return 'Noche'
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

  return `Tu horario · ${displayName}`
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
let rendererInstanceSequence = 0

type EmailVerificationState = {
  status: 'idle' | 'verifying' | 'accepted' | 'rejected' | 'degraded'
  email: string
  result?: Extract<MeetingEmailVerificationResult, { outcome: 'ok' }>
}

const FIELD_ICON_CLASS: Record<'firstName' | 'lastName' | 'email' | 'company', string> = {
  firstName: 'tabler-user',
  lastName: 'tabler-id',
  email: 'tabler-mail',
  company: 'tabler-building-skyscraper',
}

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

    if (this.previousPhase !== this.state.phase && ['details', 'confirmed', 'error', 'ambiguous'].includes(this.state.phase)) {
      const focusSelector = this.state.phase === 'details' ? '.ghm-form-title' : '.ghm-message-title'

      queueMicrotask(() => scene.querySelector<HTMLElement>(focusSelector)?.focus())
    }
  }

  private renderSignalRail(): HTMLElement {
    const rail = element('header', 'ghm-signal')
    const atmosphere = element('span', 'ghm-signal-atmosphere')
    const eyebrow = element('p', 'ghm-eyebrow', copy.eyebrow)
    const title = element('h2', 'ghm-title', copy.title)

    atmosphere.setAttribute('aria-hidden', 'true')
    title.tabIndex = -1
    title.dataset.ghmFocus = ''
    rail.append(atmosphere, eyebrow, title, element('p', 'ghm-intro', copy.intro))

    const facts = element('div', 'ghm-facts')

    facts.append(
      element('span', 'ghm-fact', `${this.state.config?.durationsMinutes[0] ?? 30} min`),
      element('span', 'ghm-fact', 'Microsoft Teams'),
      element('span', 'ghm-fact', formatMeetingTimezoneLabel(this.timezone(), this.options.now?.())),
    )
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
      work.append(this.renderDetails())

      return work
    }

    if (this.state.phase === 'confirmed') {
      work.append(this.renderMessage(copy.confirmedTitle, copy.confirmedBody, 'success'))

      return work
    }

    if (this.state.phase === 'ambiguous') {
      work.append(this.renderMessage(copy.ambiguousTitle, copy.ambiguousBody, 'warning'))

      return work
    }

    if (this.state.phase === 'fallback_only') {
      work.append(this.renderMessage(copy.genericError, copy.fallbackOnly, 'neutral'))

      return work
    }

    if (this.state.phase === 'error' && !this.state.availability) {
      work.append(this.renderMessage(copy.genericError, copy.fallbackOnly, 'warning'))

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

  private renderCalendar(): HTMLElement {
    const root = element('div', 'ghm-calendar-panel')

    root.dataset.capture = 'meeting-calendar'
    const header = element('div', 'ghm-calendar-panel-header')
    const days = this.state.availability?.days ?? []
    const referenceDate = this.state.selectedDate ?? days[0]?.date

    header.append(element('div', 'ghm-calendar-panel-title', copy.calendarTitle))

    if (referenceDate) {
      const monthNavigation = element('div', 'ghm-month-navigation')
      const previous = element('button', 'ghm-month-button', '←')
      const next = element('button', 'ghm-month-button', '→')
      const monthOffset = this.state.availability?.monthOffset ?? 0
      const canGoNext = Boolean(this.state.availability?.hasMore) && monthOffset < (this.state.config?.bookingWindow.maxMonthOffset ?? 0)

      previous.type = 'button'
      previous.setAttribute('aria-label', copy.previousMonth)
      previous.disabled = monthOffset === 0
      previous.addEventListener('click', () => void this.loadMonth(monthOffset - 1))
      next.type = 'button'
      next.setAttribute('aria-label', copy.nextMonth)
      next.disabled = !canGoNext
      next.addEventListener('click', () => void this.loadMonth(monthOffset + 1))
      monthNavigation.append(previous, element('div', 'ghm-month-label', monthLabel(referenceDate)), next)
      header.append(monthNavigation)
    }

    root.append(header)

    if (!referenceDate) {
      root.append(element('p', 'ghm-empty', copy.noSlots))

      return root
    }

    const availabilityByDate = new Map(days.map(day => [day.date, day]))
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

          button.type = 'button'
          button.dataset.selected = String(date === this.state.selectedDate)
          button.setAttribute('aria-pressed', String(date === this.state.selectedDate))
          const slotLabel = day.slots.length === 1 ? '1 horario disponible' : `${day.slots.length} horarios disponibles`

          button.setAttribute('aria-label', `${formatMeetingDate(date, this.timezone(), 'long')}, ${slotLabel}`)
          button.append(
            element('span', 'ghm-calendar-number', String(Number(date.slice(-2)))),
            element('span', 'ghm-calendar-available', `${day.slots.length} ${day.slots.length === 1 ? 'hora' : 'horas'}`),
          )
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
    root.append(table, element('div', 'ghm-timezone-lens', formatMeetingTimezoneLabel(this.timezone(), this.options.now?.())))

    return root
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

    form.append(processing)

    for (const consent of this.state.config?.consent.communications ?? []) {
      form.append(this.communicationCheckbox(consent.consentKey, consent.label))
    }

    form.append(element('div', 'ghm-turnstile'))

    if (this.state.fieldErrors.includes('captchaToken')) {
      const captchaError = element('p', 'ghm-field-error', copy.captchaRequired)

      captchaError.setAttribute('role', 'alert')
      form.append(captchaError)
    }

    const actions = element('div', 'ghm-form-actions')
    const back = element('button', 'ghm-secondary', copy.back)
    const submit = element('button', 'ghm-primary', this.state.phase === 'submitting' ? copy.processing : copy.reserve)

    back.type = 'button'
    back.disabled = this.state.phase === 'submitting'
    back.addEventListener('click', () => this.transition({ type: 'back' }))
    submit.type = 'submit'
    submit.disabled = this.state.phase === 'submitting' || this.emailVerification.status === 'verifying' ||
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
    input.setAttribute('aria-invalid', String(this.state.fieldErrors.includes(key)))
    if (this.state.fieldErrors.includes(key)) input.setAttribute('aria-describedby', `ghm-${this.instanceId}-${key}-error`)
    input.addEventListener('input', () => {
      this.state = reduceMeetingState(this.state, { type: 'form', values: { [key]: input.value } })
      this.patchClearedFieldError(key, input)
      if (key === 'email') this.scheduleEmailVerification(input.value)
    })
    control.append(fieldIcon(key), input)
    label.append(element('span', 'ghm-label', labelText), control)

    if (this.state.fieldErrors.includes(key)) {
      const error = element('span', 'ghm-field-error', key === 'email' ? copy.invalidEmail : copy.requiredField)

      error.id = `ghm-${this.instanceId}-${key}-error`
      label.append(error)
    }

    if (key === 'email') {
      const verification = element('span', 'ghm-email-verification')

      verification.id = `ghm-${this.instanceId}-email-verification`
      label.append(verification)
      queueMicrotask(() => this.patchEmailVerificationDom())
    }

    return label
  }

  private patchClearedFieldError(key: string, control: HTMLElement): void {
    if (this.state.fieldErrors.includes(key)) return

    const errorId = `ghm-${this.instanceId}-${key}-error`

    control.closest('.ghm-field, .ghm-check-group')?.querySelector(`[id="${errorId}"]`)?.remove()
    const describedBy = new Set((control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean))

    describedBy.delete(errorId)
    control.setAttribute('aria-invalid', 'false')
    if (describedBy.size) control.setAttribute('aria-describedby', [...describedBy].join(' '))
    else control.removeAttribute('aria-describedby')

    if (this.state.fieldErrors.length === 0) this.host.querySelector('.ghm-error-summary')?.remove()
  }

  private resetEmailVerification(): void {
    if (this.emailVerifyTimer) clearTimeout(this.emailVerifyTimer)
    this.emailVerifyTimer = null
    this.emailVerifyController?.abort()
    this.emailVerifyController = null
    this.emailVerification = { status: 'idle', email: '' }
  }

  private scheduleEmailVerification(value: string): void {
    if (this.emailVerifyTimer) clearTimeout(this.emailVerifyTimer)
    this.emailVerifyController?.abort()
    this.emailVerifyController = null

    const email = normalizedEmail(value)

    this.emailVerification = { status: 'idle', email }
    this.patchEmailVerificationDom()

    if (!emailLooksValid(email)) return

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
    const status = this.host.querySelector<HTMLElement>('.ghm-email-verification')
    const submit = this.host.querySelector<HTMLButtonElement>('.ghm-form-actions .ghm-primary')

    if (!input || !status) return

    const state = this.emailVerification
    const applies = state.email === normalizedEmail(input.value)
    const rejected = applies && state.status === 'rejected'
    const verifying = applies && state.status === 'verifying'
    const accepted = applies && state.status === 'accepted'

    status.className = 'ghm-email-verification'
    status.removeAttribute('role')
    status.textContent = ''

    if (verifying) {
      status.classList.add('is-verifying')
      status.setAttribute('role', 'status')
      status.textContent = copy.verifyingEmail
    } else if (rejected) {
      status.classList.add('is-error')
      status.setAttribute('role', 'alert')
      status.textContent = state.result?.reasonCode === 'email_disposable'
        ? copy.disposableEmail
        : `${copy.corporateEmail}${state.result?.suggestion ? ` ¿Quisiste decir ${state.result.suggestion}?` : ''}`
    } else if (accepted) {
      status.classList.add('is-success')
      status.setAttribute('role', 'status')
      status.textContent = copy.emailVerified
    }

    input.setAttribute('aria-invalid', String(this.state.fieldErrors.includes('email') || rejected))
    const describedBy = new Set((input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean))

    if (verifying || rejected || accepted) describedBy.add(status.id)
    else describedBy.delete(status.id)

    if (describedBy.size) input.setAttribute('aria-describedby', [...describedBy].join(' '))
    else input.removeAttribute('aria-describedby')

    if (submit && this.state.phase !== 'submitting') submit.disabled = verifying || rejected
  }

  private checkbox(key: 'processingAccepted', labelText: string, checked: boolean): HTMLElement {
    const group = element('div', 'ghm-check-group')
    const label = element('label', 'ghm-check')
    const input = element('input')

    input.type = 'checkbox'
    input.checked = checked
    input.required = true
    input.setAttribute('aria-invalid', String(this.state.fieldErrors.includes(key)))
    if (this.state.fieldErrors.includes(key)) input.setAttribute('aria-describedby', `ghm-${this.instanceId}-${key}-error`)
    input.addEventListener('change', () => {
      this.state = reduceMeetingState(this.state, { type: 'form', values: { [key]: input.checked } })
      this.patchClearedFieldError(key, input)
    })
    label.append(input, element('span', undefined, labelText))

    group.append(label)

    if (this.state.fieldErrors.includes(key)) {
      const error = element('span', 'ghm-field-error', copy.consentRequired)

      error.id = `ghm-${this.instanceId}-${key}-error`
      error.setAttribute('role', 'alert')
      group.append(error)
    }

    return group
  }

  private communicationCheckbox(consentKey: string, labelText: string): HTMLElement {
    const label = element('label', 'ghm-check')
    const input = element('input')

    input.type = 'checkbox'
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
    label.append(input, element('span', undefined, labelText))

    return label
  }

  private renderAgenda(): HTMLElement {
    const agenda = element('aside', 'ghm-agenda')

    agenda.dataset.capture = 'meeting-agenda'
    agenda.setAttribute('aria-label', copy.chooseTime)

    if (this.state.phase === 'schedule') {
      const selectedDay = this.state.availability?.days.find(day => day.date === this.state.selectedDate)

      const guidedBack = element('button', 'ghm-guided-back', copy.viewCalendar)

      guidedBack.type = 'button'
      guidedBack.addEventListener('click', () => {
        this.navigationView = 'calendar'
        this.updateScenePresentation()
        queueMicrotask(() => this.host
          .querySelector<HTMLButtonElement>('.ghm-calendar-day[aria-pressed="true"]')
          ?.focus({ preventScroll: true }))
      })
      agenda.append(guidedBack, element('span', 'ghm-agenda-kicker', copy.chooseTime))

      if (selectedDay) {
        agenda.append(
          element('h3', 'ghm-agenda-date', `${copy.timesFor} ${formatMeetingDate(selectedDay.date, this.timezone(), 'long').toLocaleLowerCase('es-CL')}`),
          element('p', 'ghm-agenda-help', copy.chooseTimeHelp),
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
      if (!selectedDay?.slots.length) slots.append(element('p', 'ghm-empty', copy.noSlots))

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
    } else {
      agenda.append(element('span', 'ghm-agenda-kicker', copy.meetingSummary))
    }

    const slot = this.state.confirmation?.appointment ?? this.state.selectedSlot

    if (slot) {
      const selection = element('div', 'ghm-selection')

      selection.dataset.capture = 'meeting-summary'
      selection.setAttribute('aria-live', 'polite')
      selection.append(
        element('span', 'ghm-selection-label', copy.selectedTime),
        element('strong', 'ghm-agenda-date', formatMeetingDate(slot.startsAt, this.timezone(), 'long')),
        element('span', 'ghm-agenda-time', formatMeetingTimeWithOffset(slot.startsAt, this.timezone())),
        element('span', 'ghm-agenda-meta', `${'durationMinutes' in slot ? slot.durationMinutes : 30} min · Microsoft Teams`),
      )
      agenda.append(selection)
    } else if (this.state.phase !== 'schedule') {
      agenda.append(element('p', 'ghm-agenda-empty', copy.selected))
    }

    if (this.state.phase === 'schedule') {
      const actionLabel = this.state.selectedSlot
        ? `${copy.continueWithTime} ${formatTime(this.state.selectedSlot.startsAt, this.timezone())}`
        : copy.selectSlotPrompt

      const button = element('button', 'ghm-primary ghm-agenda-action', actionLabel)

      button.type = 'button'
      button.setAttribute('aria-disabled', String(!this.state.selectedSlot))
      button.addEventListener('click', () => {
        if (!this.state.selectedSlot) return
        this.transition(
          { type: 'details', idempotencyKey: idempotencyKey() },
          { type: 'step_reached', step: 'details_started', context: this.selectedContext() },
        )
      })
      agenda.append(button)
    }

    const fallbackUrl = this.state.config?.fallback.url ?? this.options.emergencyFallbackUrl

    if (fallbackUrl && !['submitting', 'ambiguous', 'confirmed'].includes(this.state.phase)) {
      const fallback = element('a', 'ghm-fallback', copy.fallback)

      fallback.href = fallbackUrl
      fallback.target = '_blank'
      fallback.rel = 'noopener noreferrer'
      fallback.addEventListener('click', () => this.telemetry({
        type: 'step_reached',
        step: 'fallback_opened',
        context: {
          availability_state: this.state.phase === 'fallback_only' ? 'fallback_only' : undefined,
          error_category: this.state.phase === 'error' ? 'provider_degraded' : undefined,
        },
      }))
      agenda.append(fallback)
    }

    return agenda
  }

  private mountTurnstile(scene: HTMLElement): void {
    const container = scene.querySelector<HTMLElement>('.ghm-turnstile')
    const captcha = this.state.config?.security.captcha

    if (!container || !captcha?.siteKey) return

    this.turnstileHandle = this.options.turnstile.mount({
      container,
      siteKey: captcha.siteKey,
      action: captcha.action,
      onToken: token => {
        this.state = reduceMeetingState(this.state, { type: 'captcha', token })
      },
      onExpired: () => {
        this.state = reduceMeetingState(this.state, { type: 'captcha', token: null })
      },
    })
  }

  private validate(): string[] {
    const errors: string[] = []

    if (!this.state.form.firstName.trim()) errors.push('firstName')
    if (!this.state.form.lastName.trim()) errors.push('lastName')
    if (!emailLooksValid(this.state.form.email.trim())) errors.push('email')
    if (!this.state.form.company.trim()) errors.push('company')
    if (!this.state.form.processingAccepted) errors.push('processingAccepted')
    if (!this.state.captchaToken) errors.push('captchaToken')

    return errors
  }

  private async submit(): Promise<void> {
    if (!this.state.selectedSlot || !this.state.config || !this.state.idempotencyKey) return

    const errors = this.validate()

    if (errors.length > 0) {
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
      captchaToken: this.state.captchaToken ?? '',
      attribution: {
        placement: this.options.telemetryBase.placement,
        pagePath: typeof location !== 'undefined' ? location.pathname : '/',
      },
    }

    const result = await this.options.api.book(payload, this.state.idempotencyKey)

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
