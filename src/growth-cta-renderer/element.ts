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
import { ensureStylesInjected } from './styles'
import { createTelemetryEmitter, RENDERER_GTM_EVENTS } from './telemetry'
import { RENDERER_CONTRACT_VERSION, RENDERER_VERSION } from './version'

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
  ]

  private internals: ElementInternals | null = null
  private renderer: CtaRenderer | null = null
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
    this.renderer?.destroy()
    this.renderer = null
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

  private apiConfig(): CtaApiConfig | null {
    const surfaceId = this.getAttribute('surface')

    if (!surfaceId) return null

    const route =
      this.getAttribute('route') ?? (typeof location !== 'undefined' ? location.pathname : '/')

    return {
      baseUrl: this.getAttribute('base-url') ?? DEFAULT_BASE_URL,
      surfaceId,
      embedKey: this.getAttribute('embed-key'),
      route,
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

  private async load(): Promise<void> {
    this.loaded = true

    const copy = resolveCtaSystemCopy(this.getAttribute('locale') ?? undefined)
    const config = this.apiConfig()
    const telemetry = createTelemetryEmitter(this)

    if (!config) {
      this.renderEmpty()

      return
    }

    ensureStylesInjected(document)
    this.renderSkeleton(copy)

    let contract: CtaRenderContractMirror | null = null

    try {
      const result = await fetchArbitratedContracts(config)

      // Esta rebanada monta placements no-interruptivos (embedded/inline_banner);
      // el interruptivo (0–1, arch §11) llega con la task siguiente.
      contract = this.pickContract(result.nonInterruptive)
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

    if (!contract) {
      this.renderEmpty()

      return
    }

    const pageUri = typeof location !== 'undefined' ? `${location.pathname}${location.search}` : undefined
    const activeContract = contract

    this.renderer?.destroy()
    this.renderer = new CtaRenderer({
      root: this,
      contract: activeContract,
      copy,
      telemetry,
      ctaLocation: this.getAttribute('cta-location') ?? undefined,
      pageUri,
      onPrimary: slot =>
        openGrowthForm({
          doc: document,
          slot,
          action: activeContract.action,
          baseUrl: config.baseUrl,
          formSurfaceId: this.getAttribute('form-surface'),
          locale: this.getAttribute('locale'),
          colorScheme: this.getAttribute('color-scheme'),
          onSubmitted: formSubmissionId => this.renderer?.notifyFormSubmitted(formSubmissionId),
        }),
      onIngest: (eventKind, extra) =>
        void postCtaEvent(config, {
          ctaSlug: activeContract.cta.slug,
          ctaVersionId: activeContract.cta.ctaVersionId,
          eventKind,
          pageUri,
          placement: activeContract.placement,
          variantId: activeContract.variantId,
          actionKind: activeContract.action.kind,
          consentState: 'unknown',
          consentSource: 'none',
          formSubmissionId: extra?.formSubmissionId,
          payload: extra?.reason ? { reason: extra.reason } : undefined,
        }),
    })

    this.renderer.render()
  }
}

/** Registro idempotente y SSR-safe. */
export const defineGreenhouseCtaElement = (): void => {
  if (typeof customElements === 'undefined') return
  if (customElements.get(ELEMENT_TAG)) return
  customElements.define(ELEMENT_TAG, GreenhouseCtaElement)
}
