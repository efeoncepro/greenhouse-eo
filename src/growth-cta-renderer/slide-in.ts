/**
 * TASK-1429 — Growth CTA renderer: controller del placement interruptivo `slide_in`.
 *
 * El único interruptivo V1 (wireframe/flow/motion TASK-1429). NO modal por contrato:
 * `role='complementary'`, sin `aria-modal`, sin focus trap — Tab sigue el orden del
 * documento. El shell es un hijo del custom element con clase `ghc-scope` propia
 * (scope CSS independiente del card embedded; paridad preview↔público intacta).
 *
 * Ciclo: waiting (cero DOM focusable) → trigger gobernado → open (sin robar foco)
 * → action/dismiss → estado persistido ANTES de la salida visual. El trigger vive
 * en el BUNDLE (dwell o scroll, lo primero) — el host jamás define triggers ni
 * suppression (flow doc §Trigger Contract). La elegibilidad ya la decidió el server
 * (TASK-1428): este controller solo presenta el resultado.
 */
import type { CtaRenderContractMirror } from './contract'
import type { CtaSystemCopy } from './copy'
import { CtaRenderer, type CtaRendererOptions } from './renderer'
import type { TelemetryEmitter } from './telemetry'
import { isLocallyDismissed, markLocallyDismissed } from './visitor'

/** Trigger gobernado del bundle (flow doc): dwell en página O profundidad de scroll, lo primero. */
export const SLIDE_IN_TRIGGER_DWELL_MS = 8000
export const SLIDE_IN_TRIGGER_SCROLL_RATIO = 0.35

/** Dwell de visibilidad antes de emitir `viewed` (IO ≥50%; espejo del embedded). */
export const VIEWED_DWELL_MS = 300

/**
 * `viewed` visibility-gated (TASK-1429, integridad de medición): dispara `onVisible`
 * UNA vez cuando el target es visible ≥50% con dwell corto. Compartido por el card
 * embedded (element) y el slide-in. Sin IntersectionObserver (host muy legacy) el
 * caller decide el fallback. Devuelve un cleanup.
 */
export const observeVisibleOnce = (
  target: Element,
  onVisible: () => void,
  win: Window | null = typeof window !== 'undefined' ? window : null,
): (() => void) => {
  if (typeof IntersectionObserver === 'undefined' || !win) {
    onVisible()

    return () => undefined
  }

  let dwellTimer: number | null = null

  const observer = new IntersectionObserver(
    entries => {
      const visible = entries.some(entry => entry.isIntersecting)

      if (visible && dwellTimer === null) {
        dwellTimer = win.setTimeout(() => {
          observer.disconnect()
          onVisible()
        }, VIEWED_DWELL_MS)
      } else if (!visible && dwellTimer !== null) {
        win.clearTimeout(dwellTimer)
        dwellTimer = null
      }
    },
    { threshold: 0.5 },
  )

  observer.observe(target)

  return () => {
    if (dwellTimer !== null) win.clearTimeout(dwellTimer)
    observer.disconnect()
  }
}

export interface SlideInControllerOptions {
  doc: Document
  /** Custom element host (el shell se agrega como hijo). */
  host: HTMLElement
  contract: CtaRenderContractMirror
  copy: CtaSystemCopy
  telemetry: TelemetryEmitter
  ctaLocation?: string
  pageUri?: string
  onPrimary: CtaRendererOptions['onPrimary']
  onIngest: CtaRendererOptions['onIngest']
  /** `immediate` = abre sin trigger (preview/GVC/tests); default = trigger gobernado. */
  triggerMode?: 'default' | 'immediate'
  /** TASK-1431 — passthrough al renderer (SOLO preview/tests): navegación inerte. */
  inertNavigation?: boolean
  win?: Window
}

export class SlideInController {
  private readonly options: SlideInControllerOptions
  private readonly win: Window | null
  private shell: HTMLElement | null = null
  private renderer: CtaRenderer | null = null
  private opened = false
  private destroyed = false
  private dwellTimer: number | null = null
  private focusReturnTarget: Element | null = null
  private readonly onScroll = (): void => this.evaluateScrollTrigger()
  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.renderer?.dismiss()
  }

  constructor(options: SlideInControllerOptions) {
    this.options = options
    this.win = options.win ?? (typeof window !== 'undefined' ? window : null)
  }

  /** Renderer del card abierto (null en waiting). El element lo usa para `notifyFormSubmitted`. */
  get activeRenderer(): CtaRenderer | null {
    return this.renderer
  }

  /**
   * Monta el shell en waiting (display:none, CERO contenido focusable — estados
   * suppressed/capped/killed nunca llegan acá: el server no los sirve) y arma el
   * trigger. El guard local de sesión evita reabrir tras un dismiss aunque el
   * server esté en shadow (defensa en profundidad; la autoridad es server-side).
   */
  arm(): void {
    if (this.destroyed || isLocallyDismissed(this.options.contract.cta.ctaId)) return

    const shell = this.options.doc.createElement('div')

    shell.className = 'ghc-scope ghc-slidein'
    shell.dataset.ghcState = 'waiting'
    shell.setAttribute('role', 'complementary')
    shell.setAttribute('aria-label', this.options.copy.ctaRegionAria)
    shell.setAttribute('data-capture', 'cta-interruptive-shell')

    this.shell = shell
    this.options.host.appendChild(shell)

    if (this.options.triggerMode === 'immediate') {
      this.open()

      return
    }

    if (!this.win) return

    this.dwellTimer = this.win.setTimeout(() => this.open(), SLIDE_IN_TRIGGER_DWELL_MS)
    this.win.addEventListener('scroll', this.onScroll, { passive: true })
    this.evaluateScrollTrigger()
  }

  private evaluateScrollTrigger(): void {
    if (this.opened || this.destroyed || !this.win) return

    const doc = this.options.doc.documentElement
    const scrollable = doc.scrollHeight - this.win.innerHeight

    if (scrollable <= 0) return

    if (this.win.scrollY / scrollable >= SLIDE_IN_TRIGGER_SCROLL_RATIO) this.open()
  }

  private clearTrigger(): void {
    if (this.dwellTimer !== null && this.win) this.win.clearTimeout(this.dwellTimer)
    this.dwellTimer = null
    this.win?.removeEventListener('scroll', this.onScroll)
  }

  /**
   * Apertura pasiva: construye el card DENTRO del shell y deja que el CSS
   * (`@starting-style` + `allow-discrete`) pinte la entrada. NO mueve el foco
   * (a11y contract: passive reveal no roba atención); guarda el focus-return
   * target por si el visitante interactúa y luego cierra.
   */
  private open(): void {
    if (this.opened || this.destroyed || !this.shell) return

    this.opened = true
    this.clearTrigger()
    this.focusReturnTarget = this.options.doc.activeElement

    this.renderer = new CtaRenderer({
      root: this.shell,
      contract: this.options.contract,
      copy: this.options.copy,
      telemetry: this.options.telemetry,
      ctaLocation: this.options.ctaLocation,
      pageUri: this.options.pageUri,
      onPrimary: this.options.onPrimary,
      onIngest: this.options.onIngest,
      retainDomOnDismiss: true,
      emitViewedOnRender: false,
      inertNavigation: this.options.inertNavigation,
      onDismissed: () => this.handleDismissed(),
    })

    this.renderer.render()
    this.shell.addEventListener('keydown', this.onKeydown)
    this.observeViewed()
  }

  /** `viewed` cuando el shell es visible ≥50% con dwell corto (integridad de medición). */
  private viewedCleanup: (() => void) | null = null

  private observeViewed(): void {
    const shell = this.shell

    if (!shell || !this.renderer) return

    this.viewedCleanup = observeVisibleOnce(shell, () => this.renderer?.notifyViewed(), this.win)
  }

  /**
   * Post-dismiss (la persistencia ingest YA salió): guard local + focus return
   * determinista. El shell queda [data-ghc-state='dismissed'] y el CSS pinta la
   * salida hacia display:none — el estado jamás espera `animationend`.
   */
  private handleDismissed(): void {
    markLocallyDismissed(this.options.contract.cta.ctaId)

    const shell = this.shell

    if (shell && this.options.doc.activeElement && shell.contains(this.options.doc.activeElement)) {
      const target = this.focusReturnTarget

      if (target instanceof HTMLElement && target.isConnected && typeof target.focus === 'function') {
        target.focus()
      } else {
        (this.options.doc.activeElement as HTMLElement).blur?.()
      }
    }

    shell?.removeEventListener('keydown', this.onKeydown)
  }

  destroy(): void {
    this.destroyed = true
    this.clearTrigger()
    this.viewedCleanup?.()
    this.viewedCleanup = null
    this.shell?.removeEventListener('keydown', this.onKeydown)
    this.renderer?.destroy()
    this.renderer = null
    this.shell?.remove()
    this.shell = null
  }
}
