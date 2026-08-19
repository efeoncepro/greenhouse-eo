import type { RendererCaptchaSecurity } from './contract'

type TurnstileWidgetId = string | number

interface TurnstileRenderOptions {
  sitekey: string
  appearance: 'interaction-only'
  execution: 'execute'
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => TurnstileWidgetId
  execute: (widgetId: TurnstileWidgetId) => void
  reset: (widgetId: TurnstileWidgetId) => void
  remove?: (widgetId: TurnstileWidgetId) => void
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi }

const SCRIPT_ID = 'greenhouse-form-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TOKEN_TIMEOUT_MS = 15_000

let loadPromise: Promise<TurnstileApi> | null = null

const getWindow = (doc: Document): TurnstileWindow => {
  const win = doc.defaultView as TurnstileWindow | null

  if (!win) throw new Error('turnstile_window_unavailable')

  return win
}

export const loadTurnstile = (doc: Document): Promise<TurnstileApi> => {
  const win = getWindow(doc)

  if (win.turnstile) return Promise.resolve(win.turnstile)
  if (loadPromise) return loadPromise

  loadPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = doc.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? doc.createElement('script')

    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }

    const onLoad = () => {
      cleanup()
      if (win.turnstile) resolve(win.turnstile)
      else reject(new Error('turnstile_api_unavailable'))
    }

    const onError = () => {
      cleanup()
      loadPromise = null
      reject(new Error('turnstile_script_failed'))
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    if (!existing) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      ;(doc.head ?? doc.documentElement).appendChild(script)
    }
  })

  return loadPromise
}

export const resetTurnstileLoaderForTests = (): void => {
  loadPromise = null
}

export class TurnstileTokenClient {
  private widgetId: TurnstileWidgetId | null = null
  private container: HTMLElement | null = null
  private api: TurnstileApi | null = null
  private pending: { resolve: (token: string) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> } | null = null

  constructor(
    private readonly doc: Document,
    private readonly config: RendererCaptchaSecurity,
  ) {}

  async execute(): Promise<string> {
    const api = await this.ensureWidget()

    if (this.pending) {
      this.pending.reject(new Error('turnstile_execute_interrupted'))
      clearTimeout(this.pending.timeout)
      this.pending = null
    }

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending = null
        reject(new Error('turnstile_token_timeout'))
      }, TOKEN_TIMEOUT_MS)

      this.pending = { resolve, reject, timeout }
      api.execute(this.widgetId!)
    })
  }

  reset(): void {
    if (this.api && this.widgetId !== null) this.api.reset(this.widgetId)
  }

  destroy(): void {
    if (this.api && this.widgetId !== null && typeof this.api.remove === 'function') this.api.remove(this.widgetId)

    if (this.pending) {
      clearTimeout(this.pending.timeout)
      this.pending.reject(new Error('turnstile_destroyed'))
      this.pending = null
    }

    this.container?.remove()
    this.container = null
    this.widgetId = null
  }

  private async ensureWidget(): Promise<TurnstileApi> {
    if (this.api && this.widgetId !== null) return this.api

    const api = await loadTurnstile(this.doc)
    const container = this.ensureContainer()

    this.api = api
    this.widgetId = api.render(container, {
      sitekey: this.config.siteKey,
      appearance: 'interaction-only',
      execution: 'execute',
      callback: token => this.resolveToken(token),
      'error-callback': () => this.rejectToken(new Error('turnstile_token_failed')),
      'expired-callback': () => this.rejectToken(new Error('turnstile_token_expired')),
    })

    return api
  }

  private ensureContainer(): HTMLElement {
    if (this.container && this.container.isConnected) return this.container

    const container = this.doc.createElement('div')

    container.className = 'ghf-turnstile'
    container.setAttribute('aria-hidden', 'true')
    container.style.position = 'absolute'
    container.style.inlineSize = '1px'
    container.style.blockSize = '1px'
    container.style.overflow = 'hidden'
    container.style.clipPath = 'inset(50%)'

    ;(this.doc.body ?? this.doc.documentElement).appendChild(container)
    this.container = container

    return container
  }

  private resolveToken(token: string): void {
    if (!this.pending) return

    const pending = this.pending

    clearTimeout(pending.timeout)
    this.pending = null
    if (token) pending.resolve(token)
    else pending.reject(new Error('turnstile_token_empty'))
  }

  private rejectToken(error: Error): void {
    if (!this.pending) return

    const pending = this.pending

    clearTimeout(pending.timeout)
    this.pending = null
    pending.reject(error)
  }
}
