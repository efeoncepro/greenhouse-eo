/**
 * TASK-1340 — Growth CTA renderer: motor framework-light que pinta el card desde
 * el contrato arbitrado (light DOM). Lo consumen el custom element público Y el
 * preview interno del portal (mismo contrato = parity real).
 *
 * El renderer NO decide política: recibe el contrato ya arbitrado y lo pinta
 * (arch §11). Telemetría: `viewed` es DIRECCIONAL y va SOLO a dataLayer/CustomEvent
 * (la exposición masiva es Tier B, fuera del ledger OLTP — arch §9.4); los kinds
 * Tier A (clicked/dismissed/form_opened/form_submitted) van además al ingest.
 */
import type { CtaRenderContractMirror } from './contract'
import type { CtaSystemCopy } from './copy'
import type { TelemetryEmitter } from './telemetry'
import { RENDERER_GTM_EVENTS } from './telemetry'
import { RENDERER_CONTRACT_VERSION, RENDERER_VERSION } from './version'

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
  /** Ingest Tier A (fire-and-forget). El caller inyecta el binding surface+key. */
  onIngest: (eventKind: 'clicked' | 'dismissed' | 'form_opened' | 'form_submitted' | 'error', extra?: { formSubmissionId?: string; reason?: string }) => void
  doc?: Document
}

export class CtaRenderer {
  private readonly options: CtaRendererOptions
  private readonly doc: Document
  private destroyed = false

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

    const primary = this.doc.createElement('button')

    primary.type = 'button'
    primary.className = 'ghc-primary'
    primary.textContent = contract.content.ctaLabel
    primary.addEventListener('click', () => void this.handlePrimary(primary, card))
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
    root.dataset.ghcState = 'visible'

    // viewed = direccional (dataLayer/CustomEvent); NUNCA al ledger Tier A (arch §9.4).
    this.options.telemetry.emit(RENDERER_GTM_EVENTS.viewed, this.basePayload())
  }

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

    this.options.root.dataset.ghcState = 'form_open'
    this.options.telemetry.emit(RENDERER_GTM_EVENTS.formOpened, {
      ...this.basePayload(),
      form_slug: this.options.contract.action.formSlug,
    })
    this.options.onIngest('form_opened')
  }

  /** El módulo element/action llama esto cuando el form acepta la submission. */
  notifyFormSubmitted(formSubmissionId?: string): void {
    const payload = { ...this.basePayload(), form_slug: this.options.contract.action.formSlug } as Record<string, string | number | boolean>

    if (formSubmissionId) payload.form_submission_id = formSubmissionId

    this.options.telemetry.emit(RENDERER_GTM_EVENTS.formSubmitted, payload)
    this.options.onIngest('form_submitted', { formSubmissionId })
  }

  private handleDismiss(): void {
    this.options.telemetry.emit(RENDERER_GTM_EVENTS.dismissed, this.basePayload())
    this.options.onIngest('dismissed')
    this.options.root.dataset.ghcState = 'dismissed'
    this.options.root.replaceChildren()
  }

  destroy(): void {
    this.destroyed = true
    this.options.root.replaceChildren()
  }
}
