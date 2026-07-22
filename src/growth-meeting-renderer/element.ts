import { createMeetingApiClient } from './api-client'
import { MeetingRenderer } from './renderer'
import { ensureMeetingStyles } from './styles'
import { createMeetingTurnstilePort } from './turnstile'
import { MEETING_RENDERER_VERSION } from './version'
import { parseMeetingActivationMode, parseMeetingLayoutRecipe } from './layout'
import { resolveMeetingTimezone } from '../lib/growth/meetings/timezone'

export const MEETING_SCHEDULER_TAG = 'efeonce-meeting-scheduler'
const DEFAULT_BASE_URL = 'https://greenhouse.efeoncepro.com'
const MEETING_ICON_STYLESHEET = '/growth-meetings/icons.css'

export const ensureMeetingIconStyles = (doc: Document, baseUrl: string): void => {
  if (doc.querySelector('link[data-ghm-icon-styles="artifact"][data-ghm-icon-release]')) return

  const href = `${baseUrl.replace(/\/$/, '')}${MEETING_ICON_STYLESHEET}`

  const exists = [...doc.querySelectorAll<HTMLLinkElement>('link[data-ghm-icon-styles]')]
    .some(link => link.href === new URL(href, doc.baseURI).href)

  if (exists) return

  const link = doc.createElement('link')

  link.rel = 'stylesheet'
  link.href = href
  link.dataset.ghmIconStyles = 'tabler'
  doc.head.append(link)
}

const browserTimezone = (): string => {
  try {
    return resolveMeetingTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone, 'UTC')
  } catch {
    return 'UTC'
  }
}

export class EfeonceMeetingSchedulerElement extends HTMLElement {
  static readonly observedAttributes = [
    'surface', 'scheduler-key', 'base-url', 'locale', 'timezone', 'placement', 'appearance',
    'activation-mode', 'max-recipe',
  ]

  private renderer: MeetingRenderer | null = null
  private internals: ElementInternals | null = null

  constructor() {
    super()
    this.internals = typeof this.attachInternals === 'function' ? this.attachInternals() : null
  }

  connectedCallback(): void {
    this.mount()
  }

  disconnectedCallback(): void {
    this.renderer?.destroy()
    this.renderer = null
  }

  attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    if (previous === next || !this.isConnected) return

    if (name === 'activation-mode' || name === 'max-recipe' || name === 'appearance') {
      this.renderer?.updatePresentation({
        activationMode: parseMeetingActivationMode(this.getAttribute('activation-mode')),
        maxRecipe: parseMeetingLayoutRecipe(this.getAttribute('max-recipe')),
      })

      return
    }

    this.mount()
  }

  private mount(): void {
    this.renderer?.destroy()
    ensureMeetingStyles(this.ownerDocument)

    const baseUrl = this.getAttribute('base-url')?.trim() || DEFAULT_BASE_URL
    const schedulerKey = this.getAttribute('scheduler-key')?.trim() || 'efeonce-discovery-30'
    const surfaceId = this.getAttribute('surface')?.trim() || 'efeonce-public-site'
    const placement = this.getAttribute('placement')?.trim() || 'contact_scheduler'

    ensureMeetingIconStyles(this.ownerDocument, baseUrl)
    this.internals?.states?.add('loading')
    this.renderer = new MeetingRenderer(this, {
      api: createMeetingApiClient(baseUrl),
      turnstile: createMeetingTurnstilePort(window),
      surfaceId,
      schedulerKey,
      requestedTimezone: resolveMeetingTimezone(this.getAttribute('timezone'), browserTimezone()),
      activationMode: parseMeetingActivationMode(this.getAttribute('activation-mode')),
      maxRecipe: parseMeetingLayoutRecipe(this.getAttribute('max-recipe')),
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
