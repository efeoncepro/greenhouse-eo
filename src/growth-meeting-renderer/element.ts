import { createMeetingApiClient } from './api-client'
import { MeetingRenderer } from './renderer'
import { ensureMeetingStyles } from './styles'
import { createMeetingTurnstilePort } from './turnstile'
import { MEETING_RENDERER_VERSION } from './version'

export const MEETING_SCHEDULER_TAG = 'efeonce-meeting-scheduler'
const DEFAULT_BASE_URL = 'https://greenhouse.efeoncepro.com'
const DEFAULT_TIMEZONE = 'America/Santiago'

export class EfeonceMeetingSchedulerElement extends HTMLElement {
  static readonly observedAttributes = [
    'surface', 'scheduler-key', 'base-url', 'locale', 'timezone', 'placement', 'appearance',
  ]

  private renderer: MeetingRenderer | null = null
  private emergencyFallbackUrl: string | null = null
  private internals: ElementInternals | null = null

  constructor() {
    super()
    this.internals = typeof this.attachInternals === 'function' ? this.attachInternals() : null
  }

  connectedCallback(): void {
    if (!this.emergencyFallbackUrl) {
      this.emergencyFallbackUrl = this.querySelector<HTMLAnchorElement>('a[href]')?.href ?? null
    }

    this.mount()
  }

  disconnectedCallback(): void {
    this.renderer?.destroy()
    this.renderer = null
  }

  attributeChangedCallback(_name: string, previous: string | null, next: string | null): void {
    if (previous !== next && this.isConnected) this.mount()
  }

  private mount(): void {
    this.renderer?.destroy()
    ensureMeetingStyles(this.ownerDocument)

    const baseUrl = this.getAttribute('base-url')?.trim() || DEFAULT_BASE_URL
    const schedulerKey = this.getAttribute('scheduler-key')?.trim() || 'efeonce-discovery-30'
    const surfaceId = this.getAttribute('surface')?.trim() || 'efeonce-public-site'
    const placement = this.getAttribute('placement')?.trim() || 'contact_scheduler'

    this.internals?.states?.add('loading')
    this.renderer = new MeetingRenderer(this, {
      api: createMeetingApiClient(baseUrl),
      turnstile: createMeetingTurnstilePort(window),
      surfaceId,
      schedulerKey,
      requestedTimezone: this.getAttribute('timezone')?.trim() || DEFAULT_TIMEZONE,
      emergencyFallbackUrl: this.emergencyFallbackUrl,
      telemetryBase: {
        scheduler_key: schedulerKey,
        surface_id: surfaceId,
        placement,
        renderer_version: MEETING_RENDERER_VERSION,
        contract_version: 'growth-meeting-scheduler.v1',
      },
    })
    void this.renderer.load().finally(() => this.internals?.states?.delete('loading'))
  }
}

export const defineMeetingSchedulerElement = (registry: CustomElementRegistry = customElements): void => {
  if (!registry.get(MEETING_SCHEDULER_TAG)) {
    registry.define(MEETING_SCHEDULER_TAG, EfeonceMeetingSchedulerElement)
  }
}
