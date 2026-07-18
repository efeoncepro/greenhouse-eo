/**
 * TASK-1340 — Custom element `<greenhouse-cta>` (light DOM + ElementInternals).
 *
 * Light DOM a propósito (mismo verdict a11y que forms): el orden de tab y los
 * announcements viven en el árbol del host, y los tokens del host pueden
 * re-tematizar el card. El custom element ES el scope CSS.
 *
 * Atributos:
 *  - `surface` (surface_id del CTA, TASK-1339) · `embed-key` (credencial de surface;
 *    autentica la SURFACE, no al visitante) · `base-url` (origen Greenhouse)
 *  - `route` (default: pathname del host) · `cta` (opcional: slug específico a montar)
 *  - `form-surface` (surface del FORM para open_growth_form, config del host)
 *  - `locale` · `color-scheme` · `appearance` · `cta-location` (param de medición)
 *
 * Fail-closed: sin contrato elegible / error ⇒ el element queda `data-ghc-state=empty`
 * (display none) — nunca un card roto en superficie pública.
 */
import { CtaContractLoadError, fetchArbitratedContracts, postCtaEvent, type CtaApiConfig } from './api-client'
import type { CtaRenderContractMirror } from './contract'
import { resolveCtaSystemCopy } from './copy'
import { openGrowthForm } from './action'
import { CtaRenderer } from './renderer'
import { observeVisibleOnce, SlideInController } from './slide-in'
import { ensureStylesInjected } from './styles'
import { createTelemetryEmitter, RENDERER_GTM_EVENTS } from './telemetry'
import { RENDERER_CONTRACT_VERSION, RENDERER_VERSION } from './version'
import { parseConsentState, resolveVisitorIdentity, type CtaVisitorIdentity } from './visitor'

export const ELEMENT_TAG = 'greenhouse-cta'

const DEFAULT_BASE_URL = 'https://greenhouse.efeoncepro.com'

export class GreenhouseCtaElement extends HTMLElement {
  static readonly observedAttributes = [
    'surface',
    'embed-key',
    'base-url',
    'route',
    'cta',
    'form-surface',
    'locale',
    'color-scheme',
    'appearance',
    'cta-location',
    'consent-state',
    'consent-source',
  ]

  private internals: ElementInternals | null = null
  private renderer: CtaRenderer | null = null
  private slideIn: SlideInController | null = null
  private viewedCleanup: (() => void) | null = null
  private loaded = false

  static get version(): string {
    return RENDERER_VERSION
  }

  static get contractVersion(): string {
    return RENDERER_CONTRACT_VERSION
  }

  connectedCallback(): void {
    try {
      this.internals = this.attachInternals?.() ?? null
    } catch {
      this.internals = null
    }

    const copy = resolveCtaSystemCopy(this.getAttribute('locale') ?? undefined)

    this.applyRegionSemantics(copy.ctaRegionAria)

    if (this.getAttribute('color-scheme') === 'light') this.dataset.colorScheme = 'light'
    if (this.getAttribute('appearance') === 'bare') this.dataset.appearance = 'bare'

    void this.load()
  }

  disconnectedCallback(): void {
    this.viewedCleanup?.()
    this.viewedCleanup = null
    this.renderer?.destroy()
    this.renderer = null
    this.slideIn?.destroy()
    this.slideIn = null
  }

  attributeChangedCallback(): void {
    if (this.loaded) void this.load()
  }

  private applyRegionSemantics(label: string): void {
    if (this.internals) {
      try {
        this.internals.role = 'complementary'
        this.internals.ariaLabel = label

        return
      } catch {
        // fallback a atributos
      }
    }

    if (!this.hasAttribute('role')) this.setAttribute('role', 'complementary')
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', label)
  }

  private apiConfig(identity: CtaVisitorIdentity): CtaApiConfig | null {
    const surfaceId = this.getAttribute('surface')

    if (!surfaceId) return null

    const route =
      this.getAttribute('route') ?? (typeof location !== 'undefined' ? location.pathname : '/')

    return {
      baseUrl: this.getAttribute('base-url') ?? DEFAULT_BASE_URL,
      surfaceId,
      embedKey: this.getAttribute('embed-key'),
      route,
      identity,
    }
  }

  private renderSkeleton(copy: { loadingAria: string }): void {
    this.dataset.ghcState = 'loading'

    const skeleton = document.createElement('div')

    skeleton.className = 'ghc-skeleton'
    skeleton.setAttribute('role', 'status')
    skeleton.setAttribute('aria-busy', 'true')

    for (let index = 0; index < 3; index += 1) {
      skeleton.appendChild(Object.assign(document.createElement('span'), { className: 'ghc-skeleton-row' }))
    }

    const srOnly = document.createElement('span')

    srOnly.className = 'ghc-sr-only'
    srOnly.textContent = copy.loadingAria
    skeleton.appendChild(srOnly)

    this.replaceChildren(skeleton)
  }

  private renderEmpty(): void {
    this.dataset.ghcState = 'empty'
    this.replaceChildren()
  }

  private pickContract(contracts: CtaRenderContractMirror[]): CtaRenderContractMirror | null {
    const wantedSlug = this.getAttribute('cta')

    if (wantedSlug) return contracts.find(contract => contract.cta.slug === wantedSlug) ?? null

    return contracts[0] ?? null
  }

  /** Ingest fire-and-forget con la identidad pseudónima (TASK-1428/1429). */
  private ingestFor(
    config: CtaApiConfig,
    contract: CtaRenderContractMirror,
    identity: CtaVisitorIdentity,
    pageUri: string | undefined,
  ): (eventKind: 'viewed' | 'clicked' | 'dismissed' | 'form_opened' | 'form_submitted' | 'error', extra?: { formSubmissionId?: string; reason?: string }) => void {
    return (eventKind, extra) =>
      void postCtaEvent(config, {
        ctaSlug: contract.cta.slug,
        ctaVersionId: contract.cta.ctaVersionId,
        eventKind,
        pageUri,
        placement: contract.placement,
        variantId: contract.variantId,
        actionKind: contract.action.kind,
        visitorKey: identity.visitorKey ?? undefined,
        sessionKey: identity.sessionKey ?? undefined,
        consentState: identity.consentState,
        consentSource: identity.consentSource,
        formSubmissionId: extra?.formSubmissionId,
        payload: extra?.reason ? { reason: extra.reason } : undefined,
      })
  }

  private primaryFor(
    config: CtaApiConfig,
    contract: CtaRenderContractMirror,
    getRenderer: () => CtaRenderer | null,
  ): (slot: HTMLElement) => Promise<boolean> {
    return slot => {
      const action = contract.action

      // TASK-1431: solo la familia growth_form ejecuta este callback; la familia
      // navigate vive en el renderer (anchor nativo) y jamás llega acá. Defensivo:
      // un mismatch retorna false (el renderer restaura el CTA fail-closed).
      if (action.kind !== 'open_growth_form') return Promise.resolve(false)

      return openGrowthForm({
        doc: document,
        slot,
        action,
        baseUrl: config.baseUrl,
        formSurfaceId: this.getAttribute('form-surface'),
        locale: this.getAttribute('locale'),
        colorScheme: this.getAttribute('color-scheme'),
        onSubmitted: formSubmissionId => getRenderer()?.notifyFormSubmitted(formSubmissionId),
      })
    }
  }

  private async load(): Promise<void> {
    this.loaded = true

    const copy = resolveCtaSystemCopy(this.getAttribute('locale') ?? undefined)

    // Identidad pseudónima consent-aware (TASK-1428/1429): session siempre; visitor
    // durable SOLO con `consent-state="granted"` declarado por el host (CMP hook).
    const identity = resolveVisitorIdentity({
      consentState: parseConsentState(this.getAttribute('consent-state')),
      consentSource: this.getAttribute('consent-source'),
    })

    const config = this.apiConfig(identity)
    const telemetry = createTelemetryEmitter(this)

    if (!config) {
      this.renderEmpty()

      return
    }

    ensureStylesInjected(document)
    this.renderSkeleton(copy)

    let embedded: CtaRenderContractMirror | null = null
    let interruptive: CtaRenderContractMirror | null = null

    try {
      const result = await fetchArbitratedContracts(config)

      // Kill switch (§16.3): retiro operativo — nada se monta, jamás un falso dismissed.
      if (result.engineState === 'killed') {
        this.renderEmpty()

        return
      }

      embedded = this.pickContract(result.nonInterruptive)
      interruptive = result.interruptive
    } catch (error) {
      const reason = error instanceof CtaContractLoadError ? error.reason : 'error'

      // `disabled` (flag OFF) es un estado esperado, no un error de telemetría.
      if (reason !== 'disabled') {
        telemetry.emit(RENDERER_GTM_EVENTS.error, {
          surface_id: config.surfaceId,
          reason_class: `contract_${reason}`,
          renderer_version: RENDERER_VERSION,
          contract_version: RENDERER_CONTRACT_VERSION,
        })
      }

      this.renderEmpty()

      return
    }

    const pageUri = typeof location !== 'undefined' ? `${location.pathname}${location.search}` : undefined

    // ── Card embedded/no-interruptivo (in-place, TASK-1340) ──────────────────
    if (embedded) {
      const embeddedContract = embedded

      this.renderer?.destroy()
      this.renderer = new CtaRenderer({
        root: this,
        contract: embeddedContract,
        copy,
        telemetry,
        ctaLocation: this.getAttribute('cta-location') ?? undefined,
        pageUri,
        onPrimary: this.primaryFor(config, embeddedContract, () => this.renderer),
        onIngest: this.ingestFor(config, embeddedContract, identity, pageUri),
        emitViewedOnRender: false,
      })

      this.renderer.render()

      // `viewed` visibility-gated (TASK-1429): visible ≥50% + dwell, no al montar.
      this.viewedCleanup?.()
      this.viewedCleanup = observeVisibleOnce(this, () => this.renderer?.notifyViewed())
    } else {
      this.renderEmpty()
    }

    // ── Slide-in interruptivo (0–1, arch §11; único interruptivo V1) ─────────
    this.slideIn?.destroy()
    this.slideIn = null

    if (interruptive && interruptive.placement === 'slide_in') {
      const interruptiveContract = interruptive
      let controller: SlideInController | null = null

      controller = new SlideInController({
        doc: document,
        host: this,
        contract: interruptiveContract,
        copy,
        telemetry,
        ctaLocation: this.getAttribute('cta-location') ?? undefined,
        pageUri,
        onPrimary: this.primaryFor(config, interruptiveContract, () => controller?.activeRenderer ?? null),
        onIngest: this.ingestFor(config, interruptiveContract, identity, pageUri),
      })

      this.slideIn = controller
      controller.arm()

      // Con interruptivo armado y sin embedded, el element no debe colapsar a display:none.
      if (!embedded) this.dataset.ghcState = 'host'
    }
  }
}

/** Registro idempotente y SSR-safe. */
export const defineGreenhouseCtaElement = (): void => {
  if (typeof customElements === 'undefined') return
  if (customElements.get(ELEMENT_TAG)) return
  customElements.define(ELEMENT_TAG, GreenhouseCtaElement)
}
