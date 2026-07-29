import type { CtaRenderOpenMeetingSchedulerActionMirror } from './contract'
import type { CtaSystemCopy } from './copy'

export const MEETING_RENDERER_LOADER_URL = 'https://efeonce-public-renderers.vercel.app/loader.js'
const MEETING_ELEMENT_TAG = 'efeonce-meeting-scheduler'
const MEETING_DEFINE_TIMEOUT_MS = 10_000
const MOBILE_QUERY = '(max-width: 639px)'

const bundleLoads = new WeakMap<Document, Map<string, Promise<boolean>>>()
const scrollLocks = new WeakMap<Document, { count: number; previousOverflow: string }>()

const ensureMeetingBundle = (doc: Document): Promise<boolean> => {
  if (typeof customElements === 'undefined') return Promise.resolve(false)
  if (customElements.get(MEETING_ELEMENT_TAG)) return Promise.resolve(true)

  const src = MEETING_RENDERER_LOADER_URL
  const loads = bundleLoads.get(doc) ?? new Map<string, Promise<boolean>>()

  bundleLoads.set(doc, loads)

  const existing = loads.get(src)

  if (existing) return existing

  const load = (async () => {
    if (!doc.querySelector(`script[src="${src}"]`)) {
      const script = doc.createElement('script')

      script.src = src
      script.defer = true
      script.dataset.ghcMeetingBundle = 'true'
      doc.head.appendChild(script)
    }

    try {
      await Promise.race([
        customElements.whenDefined(MEETING_ELEMENT_TAG),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), MEETING_DEFINE_TIMEOUT_MS)),
      ])

      return true
    } catch {
      doc.querySelector<HTMLScriptElement>(`script[src="${src}"][data-ghc-meeting-bundle]`)?.remove()
      loads.delete(src)

      return false
    }
  })()

  loads.set(src, load)

  return load
}

const lockDocumentScroll = (doc: Document): void => {
  const current = scrollLocks.get(doc)

  if (current) {
    current.count += 1

    return
  }

  scrollLocks.set(doc, { count: 1, previousOverflow: doc.documentElement.style.overflow })
  doc.documentElement.style.overflow = 'hidden'
}

const unlockDocumentScroll = (doc: Document): void => {
  const current = scrollLocks.get(doc)

  if (!current) return

  if (current.count > 1) {
    current.count -= 1

    return
  }

  doc.documentElement.style.overflow = current.previousOverflow
  scrollLocks.delete(doc)
}

export interface MeetingActivationControllerOptions {
  doc: Document
  action: CtaRenderOpenMeetingSchedulerActionMirror
  baseUrl: string
  locale?: string | null
  colorScheme?: string | null
  placement: string
  copy: CtaSystemCopy
  onLoadError?: () => void
  /** Harness interno: monta el mismo controller con un renderer fixture-backed. */
  createSchedulerElement?: (doc: Document) => { element: HTMLElement; dispose?: () => void }
}

/**
 * Task surface única y stateful. Cerrar llama `dialog.close()` y mantiene el Web
 * Component conectado: selección, formulario, idempotencia y requests críticos
 * sobreviven hasta el teardown real del CTA.
 */
export class MeetingActivationController {
  private readonly options: MeetingActivationControllerOptions
  private dialog: HTMLDialogElement | null = null
  private scheduler: HTMLElement | null = null
  private invoker: HTMLElement | null = null
  private openPromise: Promise<boolean> | null = null
  private media: MediaQueryList | null = null
  private disposed = false
  private scrollLocked = false
  private disposeScheduler: (() => void) | null = null

  constructor(options: MeetingActivationControllerOptions) {
    this.options = options
  }

  prewarm(): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false)
    if (this.options.createSchedulerElement) return Promise.resolve(true)

    const connection = (this.options.doc.defaultView?.navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    } | undefined)?.connection

    if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType ?? '')) {
      return Promise.resolve(false)
    }

    return ensureMeetingBundle(this.options.doc)
  }

  async open(invoker: HTMLElement): Promise<boolean> {
    if (this.disposed) return false
    this.invoker = invoker

    if (this.dialog?.open) {
      this.focusCurrentStep()

      return true
    }

    this.ensureDialog()
    this.showDialog()

    if (this.scheduler) {
      this.focusCurrentStep()

      return true
    }

    if (!this.openPromise) this.openPromise = this.mountScheduler()

    return this.openPromise
  }

  close(): void {
    if (!this.dialog?.open) return

    try {
      this.dialog.close()
    } catch {
      this.dialog.removeAttribute('open')
      this.handleClosed()
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.media?.removeEventListener('change', this.syncPresentation)

    if (this.dialog?.open) {
      try { this.dialog.close() } catch { this.dialog.removeAttribute('open') }
    }

    this.handleClosed(false)
    this.disposeScheduler?.()
    this.disposeScheduler = null
    this.dialog?.remove()
    this.dialog = null
    this.scheduler = null
    this.invoker = null
  }

  private ensureDialog(): void {
    if (this.dialog) return

    const doc = this.options.doc
    const dialog = doc.createElement('dialog')
    const headingId = `ghc-meeting-title-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`

    dialog.className = 'ghc-meeting-surface'
    dialog.setAttribute('aria-labelledby', headingId)
    dialog.innerHTML = `
      <div class="ghc-meeting-frame">
        <header class="ghc-meeting-toolbar">
          <div>
            <span class="ghc-meeting-kicker"></span>
            <h2 id="${headingId}" class="ghc-meeting-heading" tabindex="-1"></h2>
          </div>
          <button class="ghc-meeting-close" type="button"></button>
        </header>
        <div class="ghc-meeting-stage" aria-live="polite">
          <div class="ghc-meeting-loading" role="status"></div>
        </div>
      </div>`

    const { copy } = this.options

    dialog.querySelector<HTMLElement>('.ghc-meeting-kicker')!.textContent = copy.schedulerKicker
    dialog.querySelector<HTMLElement>('.ghc-meeting-heading')!.textContent = copy.schedulerHeading
    dialog.querySelector<HTMLButtonElement>('.ghc-meeting-close')!.textContent = copy.schedulerClose
    dialog.querySelector<HTMLElement>('.ghc-meeting-loading')!.textContent = copy.schedulerLoading

    dialog.querySelector<HTMLButtonElement>('.ghc-meeting-close')?.addEventListener('click', () => this.close())
    dialog.addEventListener('cancel', event => {
      event.preventDefault()
      this.close()
    })
    dialog.addEventListener('click', event => {
      if (event.target === dialog && !this.isMobile()) this.close()
    })
    dialog.addEventListener('close', () => this.handleClosed())
    doc.body.appendChild(dialog)

    this.dialog = dialog
    this.media = doc.defaultView?.matchMedia?.(MOBILE_QUERY) ?? null
    this.media?.addEventListener('change', this.syncPresentation)
    this.syncPresentation()
  }

  private showDialog(): void {
    if (!this.dialog || this.dialog.open) return

    try {
      this.dialog.showModal()
    } catch {
      this.dialog.setAttribute('open', '')
    }

    if (!this.scrollLocked) {
      lockDocumentScroll(this.options.doc)
      this.scrollLocked = true
    }

    queueMicrotask(() => this.dialog?.querySelector<HTMLElement>('.ghc-meeting-heading')?.focus())
  }

  private async mountScheduler(): Promise<boolean> {
    const loaded = this.options.createSchedulerElement
      ? true
      : await ensureMeetingBundle(this.options.doc)

    if (this.disposed) return false

    const stage = this.dialog?.querySelector<HTMLElement>('.ghc-meeting-stage')

    if (!stage) return false

    if (!loaded) {
      const recovery = this.options.doc.createElement('div')
      const message = this.options.doc.createElement('p')
      const retry = this.options.doc.createElement('button')

      recovery.className = 'ghc-meeting-recovery'
      message.textContent = this.options.copy.schedulerLoadFailed
      retry.className = 'ghc-meeting-retry'
      retry.type = 'button'
      retry.textContent = this.options.copy.schedulerRetry
      retry.addEventListener('click', () => void this.retryMountScheduler())
      recovery.append(message, retry)
      stage.replaceChildren(recovery)
      this.options.onLoadError?.()
      retry.focus()

      return false
    }

    const fixture = this.options.createSchedulerElement?.(this.options.doc)
    const scheduler = fixture?.element ?? this.options.doc.createElement(MEETING_ELEMENT_TAG)

    this.disposeScheduler = fixture?.dispose ?? null

    scheduler.setAttribute('surface', this.options.action.meetingSurfaceId)
    scheduler.setAttribute('scheduler-key', this.options.action.schedulerKey)
    scheduler.setAttribute('base-url', this.options.baseUrl)
    scheduler.setAttribute('locale', this.options.locale ?? 'es-CL')
    scheduler.setAttribute('placement', this.options.placement)
    if (this.options.colorScheme) scheduler.setAttribute('color-scheme', this.options.colorScheme)
    this.scheduler = scheduler
    this.syncPresentation()
    stage.replaceChildren(scheduler)
    this.focusWhenReady()

    return true
  }

  private async retryMountScheduler(): Promise<void> {
    const stage = this.dialog?.querySelector<HTMLElement>('.ghc-meeting-stage')

    if (!stage) return

    const loading = this.options.doc.createElement('div')

    loading.className = 'ghc-meeting-loading'
    loading.setAttribute('role', 'status')
    loading.textContent = this.options.copy.schedulerLoading
    stage.replaceChildren(loading)
    this.openPromise = this.mountScheduler()
    await this.openPromise
  }

  private readonly syncPresentation = (): void => {
    const mobile = this.isMobile()

    this.dialog?.toggleAttribute('data-full-screen', mobile)
    this.scheduler?.setAttribute('activation-mode', mobile ? 'full_screen' : 'dialog')
    this.scheduler?.setAttribute('max-recipe', mobile ? 'guided' : 'command')
  }

  private isMobile(): boolean {
    return this.media?.matches ?? false
  }

  private focusWhenReady(): void {
    if (!this.scheduler) return

    const observer = new MutationObserver(() => {
      if (!this.dialog?.open) return
      const target = this.scheduler?.querySelector<HTMLElement>('[data-ghm-focus], .ghm-title')

      if (!target) return
      observer.disconnect()
      target.focus()
    })

    observer.observe(this.scheduler, { childList: true, subtree: true })
    queueMicrotask(() => this.focusCurrentStep())
  }

  private focusCurrentStep(): void {
    if (!this.dialog?.open) return

    const target = this.scheduler?.querySelector<HTMLElement>('[data-ghm-focus], .ghm-title')
      ?? this.dialog.querySelector<HTMLElement>('.ghc-meeting-heading')

    if (target) {
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1
      target.focus()
    }
  }

  private handleClosed(restoreFocus = true): void {
    if (this.scrollLocked) {
      unlockDocumentScroll(this.options.doc)
      this.scrollLocked = false
    }

    if (restoreFocus && this.invoker?.isConnected) this.invoker.focus()
  }
}
