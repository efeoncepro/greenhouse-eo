/**
 * TASK-1340 — Growth CTA renderer: motor framework-light que pinta el card desde
 * el contrato arbitrado (light DOM). Lo consumen el custom element público Y el
 * preview interno del portal (mismo contrato = parity real).
 *
 * El renderer NO decide política: recibe el contrato ya arbitrado y lo pinta
 * (arch §11). Telemetría (TASK-1429): `viewed` es visibility-gated (IO ≥50% + dwell,
 * vía `notifyViewed`) y va a dataLayer/CustomEvent + ingest Tier B (rollup agregado
 * server-side, JAMÁS el ledger OLTP — arch §9.4/TASK-1428); los kinds Tier A
 * (clicked/dismissed/form_opened/form_submitted) van al ledger de conversión.
 */
import { isExternalNavigateHref, isSafeNavigateHref, resolveActionFamily } from './action'
import type { CtaRenderContractMirror, CtaRenderNavigateActionMirror } from './contract'
import type { CtaSystemCopy } from './copy'
import type { TelemetryEmitter } from './telemetry'
import { RENDERER_GTM_EVENTS } from './telemetry'
import { RENDERER_CONTRACT_VERSION, RENDERER_VERSION } from './version'

/**
 * TASK-1431 — recovery acotado de una navegación same-context que no descargó la
 * página (cancelada/atascada): rehabilita el primary sin spinner largo ficticio.
 */
const NAVIGATE_RECOVERY_TIMEOUT_MS = 4000

/** Variantes de estilo shipeadas; desconocida ⇒ default (fail-safe visual). */
const KNOWN_STYLE_VARIANTS = new Set(['default', 'spotlight', 'minimal'])

export const resolveStyleVariant = (styleVariant: string | undefined): string =>
  styleVariant && KNOWN_STYLE_VARIANTS.has(styleVariant) ? styleVariant : 'default'

/** Solo URLs https/relativas entran al slot visual (nunca refs internos crudos). */
export const resolveVisualUrl = (visualAssetRef: string | undefined): string | null => {
  if (!visualAssetRef) return null
  if (visualAssetRef.startsWith('https://') || visualAssetRef.startsWith('/')) return visualAssetRef

  return null
}

export interface CtaRendererOptions {
  /** Host donde se pinta (el custom element en público; un div en el preview). */
  root: HTMLElement
  contract: CtaRenderContractMirror
  copy: CtaSystemCopy
  telemetry: TelemetryEmitter
  /** Ubicación semántica del CTA en la página (param `cta_location`, doc 04 §2). */
  ctaLocation?: string
  pageUri?: string
  /** Callback del primary (el módulo action monta el form). Retorna false si no pudo abrir. */
  onPrimary: (slot: HTMLElement) => Promise<boolean>
  /** Ingest (fire-and-forget). Tier A + `viewed` Tier B (TASK-1428). El caller inyecta el binding surface+key. */
  onIngest: (eventKind: 'viewed' | 'clicked' | 'dismissed' | 'form_opened' | 'form_submitted' | 'error', extra?: { formSubmissionId?: string; reason?: string }) => void
  /**
   * TASK-1429 — el slide-in retiene el DOM al descartar para que el exit CSS
   * (`allow-discrete` → display:none) pinte; el embedded sigue limpiando al instante.
   */
  retainDomOnDismiss?: boolean
  /** Hook post-dismiss (focus return + guard local del interruptivo). La persistencia YA ocurrió. */
  onDismissed?: () => void
  /**
   * TASK-1429 — `viewed` visibility-gated: el caller (element/controller) decide CUÁNDO
   * el card es visible (IO ≥50% + dwell). `false` ⇒ render() no emite viewed; el caller
   * llama `notifyViewed()` al confirmar visibilidad. Default `true` (compat preview/tests).
   */
  emitViewedOnRender?: boolean
  /**
   * TASK-1431 — SOLO preview/tests: bloquea la navegación real del anchor
   * (`preventDefault`) conservando telemetría y la demo del estado pending. El
   * bundle público NUNCA lo activa.
   */
  inertNavigation?: boolean
  doc?: Document
}

export class CtaRenderer {
  private readonly options: CtaRendererOptions
  private readonly doc: Document
  private destroyed = false
  /** Card propio de ESTA instancia: destroy/dismiss remueven SOLO este nodo (dos
   * instancias sobre el mismo root — p.ej. StrictMode double-effect en el preview —
   * jamás se borran el contenido entre sí). */
  private card: HTMLElement | null = null

  constructor(options: CtaRendererOptions) {
    this.options = options
    this.doc = options.doc ?? document
  }

  private basePayload(): Record<string, string | number | boolean> {
    const { contract, ctaLocation, pageUri } = this.options

    const payload: Record<string, string | number | boolean> = {
      cta_id: contract.cta.ctaId,
      cta_slug: contract.cta.slug,
      cta_version_id: contract.cta.ctaVersionId,
      surface_id: contract.surfacePolicy.surfaceId,
      placement: contract.placement,
      variant_id: contract.variantId,
      action_kind: contract.action.kind,
      renderer_version: RENDERER_VERSION,
      contract_version: RENDERER_CONTRACT_VERSION,
    }

    if (contract.cta.campaignSlug) payload.campaign_slug = contract.cta.campaignSlug
    if (ctaLocation) payload.cta_location = ctaLocation
    if (pageUri) payload.page_uri = pageUri

    return payload
  }

  render(): void {
    const { root, contract, copy } = this.options

    // Fail-closed (TASK-1431): un kind desconocido (contrato más nuevo que este
    // bundle) o un href fuera del contrato NO pinta card ni adivina destino.
    const family = resolveActionFamily(contract.action)

    const navigateAction = family === 'navigate' ? (contract.action as CtaRenderNavigateActionMirror) : null

    if (family === null || (navigateAction !== null && !isSafeNavigateHref(navigateAction.href))) {
      const reason = family === null ? 'action_unsupported' : 'action_destination_invalid'

      root.dataset.ghcState = 'empty'
      this.options.telemetry.emit(RENDERER_GTM_EVENTS.error, { ...this.basePayload(), reason_class: reason })
      this.options.onIngest('error', { reason })

      return
    }

    root.dataset.ghcVariant = resolveStyleVariant(contract.styleVariant)
    root.dataset.ghcPlacement = contract.placement

    const visualUrl = resolveVisualUrl(contract.visualAssetRef)

    root.dataset.ghcHasVisual = visualUrl ? 'true' : 'false'

    const card = this.doc.createElement('div')

    card.className = 'ghc-card'
    card.setAttribute('data-capture', 'cta-card')

    if (visualUrl) {
      const visual = this.doc.createElement('img')

      visual.className = 'ghc-visual'
      visual.src = visualUrl
      visual.alt = ''
      visual.loading = 'lazy'
      visual.decoding = 'async'
      card.appendChild(visual)
    }

    const content = this.doc.createElement('div')

    content.className = 'ghc-content'
    content.style.display = 'grid'
    content.style.gap = 'calc(var(--gh-cta-gap) * 0.6)'

    if (contract.content.eyebrow) {
      const eyebrow = this.doc.createElement('span')

      eyebrow.className = 'ghc-eyebrow'
      eyebrow.textContent = contract.content.eyebrow
      content.appendChild(eyebrow)
    }

    const headline = this.doc.createElement('p')

    headline.className = 'ghc-headline'
    headline.textContent = contract.content.headline
    content.appendChild(headline)

    if (contract.content.body) {
      const body = this.doc.createElement('p')

      body.className = 'ghc-body'
      body.textContent = contract.content.body
      content.appendChild(body)
    }

    if (contract.content.footnote) {
      const footnote = this.doc.createElement('p')

      footnote.className = 'ghc-footnote'
      footnote.textContent = contract.content.footnote
      content.appendChild(footnote)
    }

    card.appendChild(content)

    const actions = this.doc.createElement('div')

    actions.className = 'ghc-actions'

    // Dispatch por FAMILIA (TASK-1431): growth_form conserva el botón + form slot;
    // navigate es un anchor `<a href>` REAL (middle-click/cmd-click, historial,
    // copy-link, a11y de link nativas) — jamás un botón con location.assign.
    const primary =
      navigateAction !== null
        ? this.buildNavigatePrimary(navigateAction, contract.content.ctaLabel, copy, card)
        : this.buildFormPrimary(contract.content.ctaLabel, card)

    actions.appendChild(primary)
    card.appendChild(actions)

    const dismiss = this.doc.createElement('button')

    dismiss.type = 'button'
    dismiss.className = 'ghc-dismiss'
    dismiss.setAttribute('aria-label', contract.content.dismissLabel ?? copy.dismissAria)
    dismiss.textContent = '✕'
    dismiss.addEventListener('click', () => this.handleDismiss())
    card.appendChild(dismiss)

    root.replaceChildren(card)
    this.card = card
    root.dataset.ghcState = 'visible'

    // viewed: visibility-gated por default en el element (TASK-1429 — IO ≥50% + dwell);
    // acá solo cuando el caller no gatea (preview/tests con emitViewedOnRender=true).
    if (this.options.emitViewedOnRender !== false) this.notifyViewed()
  }

  private viewedEmitted = false

  /**
   * TASK-1429 — `viewed` cuando el card ES visible (una sola vez): dataLayer/CustomEvent
   * (familia `greenhouse_cta_*`) + ingest Tier B (rollup agregado, jamás el ledger —
   * TASK-1428/arch §9.4). Corte de semántica registrado en TRACKING-PLAN §CTAs.
   */
  notifyViewed(): void {
    if (this.viewedEmitted || this.destroyed) return

    this.viewedEmitted = true
    this.options.telemetry.emit(RENDERER_GTM_EVENTS.viewed, this.basePayload())
    this.options.onIngest('viewed')
  }

  // ─── Familia navigate (TASK-1431) ───────────────────────────────────────────

  private navigatePending = false
  private navigateClickedEmitted = false
  private navigateRestoreTimer: ReturnType<typeof setTimeout> | null = null

  /** Narrow del action de form (la familia growth_form es la única que lo usa). */
  private formAction(): { formSlug: string; formKey?: string } | null {
    const action = this.options.contract.action

    return action.kind === 'open_growth_form' ? action : null
  }

  private buildFormPrimary(label: string, card: HTMLElement): HTMLButtonElement {
    const primary = this.doc.createElement('button')

    primary.type = 'button'
    primary.className = 'ghc-primary'
    primary.textContent = label
    primary.addEventListener('click', () => void this.handlePrimary(primary, card))

    return primary
  }

  /**
   * Primary de navegación: anchor REAL con href validado. Externo (host distinto) o
   * nuevo contexto ⇒ `rel="noopener noreferrer"`; nuevo contexto además `target=_blank`
   * + affordance sr-only perceptible. La telemetría sale ANTES de navegar (el ingest
   * usa `keepalive` — nunca bloquea la navegación ni pierde el evento).
   */
  private buildNavigatePrimary(
    action: CtaRenderNavigateActionMirror,
    label: string,
    copy: CtaSystemCopy,
    card: HTMLElement,
  ): HTMLAnchorElement {
    const anchor = this.doc.createElement('a')

    anchor.className = 'ghc-primary'
    anchor.href = action.href
    anchor.dataset.ghcActionFamily = 'navigate'
    anchor.append(label)

    const currentHost = this.doc.defaultView?.location?.host ?? ''
    const external = isExternalNavigateHref(action.href, currentHost)

    if (action.newContext) {
      anchor.target = '_blank'

      const hint = this.doc.createElement('span')

      hint.className = 'ghc-sr-only'
      hint.textContent = ` (${copy.newTabAria})`
      anchor.appendChild(hint)
    }

    if (external || action.newContext) anchor.rel = 'noopener noreferrer'

    anchor.addEventListener('click', event => this.handleNavigateClick(event, anchor, card))
    anchor.addEventListener('auxclick', event => {
      if (event.button === 1) this.emitNavigateClicked()
    })

    return anchor
  }

  /** `clicked` una sola vez por render (single-dispatch de telemetría; ingest keepalive). */
  private emitNavigateClicked(): void {
    if (this.navigateClickedEmitted || this.destroyed) return

    this.navigateClickedEmitted = true
    this.options.telemetry.emit(RENDERER_GTM_EVENTS.clicked, this.basePayload())
    this.options.onIngest('clicked')
  }

  private handleNavigateClick(event: MouseEvent, anchor: HTMLAnchorElement, card: HTMLElement): void {
    if (this.destroyed) {
      event.preventDefault()

      return
    }

    // Guard de doble activación mientras hay un dispatch same-context en vuelo.
    if (this.navigatePending) {
      event.preventDefault()

      return
    }

    this.emitNavigateClicked()

    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
    const staysOnPage = modified || anchor.target === '_blank'

    if (this.options.inertNavigation) event.preventDefault()

    // Nuevo tab/contexto o click modificado: la página actual permanece usable.
    if (staysOnPage) return

    // Same-context: la página va a descargar. Pending accesible + recovery acotado
    // (si la navegación se cancela/atasca, el mismo control vuelve habilitado).
    this.beginNavigatePending(anchor, card)
  }

  private beginNavigatePending(anchor: HTMLAnchorElement, card: HTMLElement): void {
    this.navigatePending = true
    anchor.setAttribute('aria-disabled', 'true')
    anchor.dataset.ghcPending = 'true'

    const status = this.doc.createElement('span')

    status.className = 'ghc-sr-only'
    status.setAttribute('role', 'status')
    status.textContent = this.options.copy.navigatingAria
    card.appendChild(status)

    this.navigateRestoreTimer = setTimeout(() => this.restoreNavigatePending(anchor, status), NAVIGATE_RECOVERY_TIMEOUT_MS)
  }

  /** La página sigue acá pasado el timeout: navegación cancelada/atascada — restaurar control + foco. */
  private restoreNavigatePending(anchor: HTMLAnchorElement, status: HTMLElement): void {
    this.navigateRestoreTimer = null

    if (this.destroyed) return

    status.remove()
    anchor.removeAttribute('aria-disabled')
    delete anchor.dataset.ghcPending
    this.navigatePending = false
    this.navigateClickedEmitted = false

    // En preview inerte el "fallo" es la demo, no un error real de navegación.
    if (!this.options.inertNavigation) {
      this.options.telemetry.emit(RENDERER_GTM_EVENTS.error, {
        ...this.basePayload(),
        reason_class: 'navigation_stalled',
      })
      this.options.onIngest('error', { reason: 'navigation_stalled' })
    }
  }

  // ─── Familia growth_form (TASK-1340) ────────────────────────────────────────

  private async handlePrimary(primary: HTMLButtonElement, card: HTMLElement): Promise<void> {
    if (this.destroyed) return

    this.options.telemetry.emit(RENDERER_GTM_EVENTS.clicked, this.basePayload())
    this.options.onIngest('clicked')

    primary.disabled = true

    const slot = this.doc.createElement('div')

    slot.className = 'ghc-form-slot'
    slot.setAttribute('data-capture', 'cta-form')

    const status = this.doc.createElement('span')

    status.className = 'ghc-sr-only'
    status.setAttribute('role', 'status')
    status.textContent = this.options.copy.formOpeningAria
    card.appendChild(status)
    card.appendChild(slot)

    const opened = await this.options.onPrimary(slot)

    status.remove()

    if (this.destroyed) return

    if (!opened) {
      // fail-closed sin card colgado: se restaura el CTA y se reporta el handoff roto.
      slot.remove()
      primary.disabled = false
      this.options.telemetry.emit(RENDERER_GTM_EVENTS.error, {
        ...this.basePayload(),
        reason_class: 'form_handoff_failed',
      })
      this.options.onIngest('error', { reason: 'form_handoff_failed' })

      return
    }

    // Morph card→form (TASK-1429): View Transition same-document como ENHANCEMENT —
    // fallback = cambio directo (el crossfade CSS del slot); bypass total en
    // reduced-motion. Nunca una dependencia: el estado se aplica igual sin VT.
    const applyFormOpen = (): void => {
      this.options.root.dataset.ghcState = 'form_open'
    }

    const docWithVt = this.doc as Document & { startViewTransition?: (update: () => void) => unknown }

    const reducedMotion =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

    if (typeof docWithVt.startViewTransition === 'function' && !reducedMotion) {
      try {
        docWithVt.startViewTransition(applyFormOpen)
      } catch {
        applyFormOpen()
      }
    } else {
      applyFormOpen()
    }

    this.options.telemetry.emit(RENDERER_GTM_EVENTS.formOpened, {
      ...this.basePayload(),
      form_slug: this.formAction()?.formSlug ?? '',
    })
    this.options.onIngest('form_opened')
  }

  /** El módulo element/action llama esto cuando el form acepta la submission. */
  notifyFormSubmitted(formSubmissionId?: string): void {
    const payload = { ...this.basePayload(), form_slug: this.formAction()?.formSlug ?? '' } as Record<string, string | number | boolean>

    if (formSubmissionId) payload.form_submission_id = formSubmissionId

    this.options.telemetry.emit(RENDERER_GTM_EVENTS.formSubmitted, payload)
    this.options.onIngest('form_submitted', { formSubmissionId })
  }

  /**
   * Dismiss público (TASK-1429): lo invocan el botón, Escape (controller del slide-in)
   * y el preview. La PERSISTENCIA (ingest + guard local vía onDismissed) ocurre ANTES
   * del cambio visual — jamás depende de animación (motion doc).
   */
  dismiss(): void {
    if (this.destroyed) return

    this.options.telemetry.emit(RENDERER_GTM_EVENTS.dismissed, this.basePayload())
    this.options.onIngest('dismissed')
    this.options.onDismissed?.()
    this.options.root.dataset.ghcState = 'dismissed'

    // El slide-in retiene el DOM: el exit CSS (`allow-discrete` → display:none) pinta
    // la salida y el estado ya quedó comprometido; el embedded limpia al instante.
    if (!this.options.retainDomOnDismiss) this.removeOwnCard()
  }

  private handleDismiss(): void {
    this.dismiss()
  }

  /** Remueve SOLO el card de esta instancia (jamás contenido ajeno en el mismo root). */
  private removeOwnCard(): void {
    this.card?.remove()
    this.card = null
  }

  destroy(): void {
    this.destroyed = true

    if (this.navigateRestoreTimer !== null) {
      clearTimeout(this.navigateRestoreTimer)
      this.navigateRestoreTimer = null
    }

    this.removeOwnCard()
  }
}
