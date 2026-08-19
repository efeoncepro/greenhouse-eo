import type { RendererCaptchaSecurity } from './contract'

type TurnstileWidgetId = string | number

interface TurnstileRenderOptions {
  sitekey: string
  appearance: 'interaction-only'
  execution: 'execute'
  callback: (token: string) => void
  // Cloudflare los dispara al entrar y salir de un desafío interactivo. Son la única señal de que
  // el widget dejó de ser invisible y necesita espacio real en pantalla.
  'before-interactive-callback'?: () => void
  'after-interactive-callback'?: () => void
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
      callback: token => {
        this.hideInteractiveChallenge()
        this.resolveToken(token)
      },
      // Cloudflare avisa ANTES de pintar un desafío interactivo. Sin esto, el checkbox se
      // renderiza dentro de un contenedor de 1px clipeado y colgado del body: el usuario lo ve
      // flotando en una esquina, desconectado del formulario, o no lo ve en absoluto — y el envío
      // falla con "no pudimos verificar" sin que nada explique por qué. Pasó con una postulante
      // real. El widget invisible es el caso feliz, no el único.
      'before-interactive-callback': () => this.showInteractiveChallenge(),
      'after-interactive-callback': () => this.hideInteractiveChallenge(),
      'error-callback': () => {
        this.hideInteractiveChallenge()
        this.rejectToken(new Error('turnstile_token_failed'))
      },
      'expired-callback': () => {
        this.hideInteractiveChallenge()
        this.rejectToken(new Error('turnstile_token_expired'))
      },
    })

    return api
  }

  private ensureContainer(): HTMLElement {
    if (this.container && this.container.isConnected) return this.container

    const container = this.doc.createElement('div')

    container.className = 'ghf-turnstile'
    this.applyHiddenContainerStyles(container)

    ;(this.doc.body ?? this.doc.documentElement).appendChild(container)
    this.container = container

    return container
  }

  /** Estado por defecto: el widget existe pero no ocupa espacio ni se anuncia. */
  private applyHiddenContainerStyles(container: HTMLElement): void {
    container.setAttribute('aria-hidden', 'true')
    container.style.position = 'absolute'
    container.style.insetBlockStart = '0'
    container.style.insetInlineStart = '0'
    container.style.inlineSize = '1px'
    container.style.blockSize = '1px'
    container.style.overflow = 'hidden'
    container.style.clipPath = 'inset(50%)'
    container.style.zIndex = ''
    container.style.background = ''
    container.style.padding = ''
    container.style.borderRadius = ''
    container.style.boxShadow = ''
    container.style.display = ''
    container.style.placeItems = ''
  }

  /**
   * Cloudflare escaló a desafío interactivo: el usuario TIENE que poder verlo y tocarlo. Se muestra
   * centrado y por encima de todo, porque el contenedor cuelga del `body` y no del formulario — no
   * hay forma de anclarlo al botón de envío desde acá sin acoplar el renderer al DOM del form.
   * Deja de ser `aria-hidden` para que un lector de pantalla lo anuncie cuando aparece.
   */
  private showInteractiveChallenge(): void {
    const container = this.container

    if (!container) return

    container.removeAttribute('aria-hidden')
    container.style.position = 'fixed'
    container.style.insetBlockStart = '50%'
    container.style.insetInlineStart = '50%'
    container.style.transform = 'translate(-50%, -50%)'
    container.style.inlineSize = 'auto'
    container.style.blockSize = 'auto'
    container.style.overflow = 'visible'
    container.style.clipPath = 'none'
    container.style.zIndex = '2147483647'
    container.style.display = 'grid'
    container.style.placeItems = 'center'
    container.style.padding = '16px'
    container.style.background = '#fff'
    container.style.borderRadius = '12px'
    container.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.24)'
  }

  private hideInteractiveChallenge(): void {
    const container = this.container

    if (!container) return

    container.style.transform = ''
    this.applyHiddenContainerStyles(container)
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
