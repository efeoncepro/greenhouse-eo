/**
 * TASK-1231 — Growth Forms portable renderer · custom element `<greenhouse-form>`.
 *
 * Runtime portable primario (Arch §19). Light DOM + `ElementInternals` (a11y verdict):
 * IDREF/role=alert viven en el mismo árbol; el form nativo interno habilita autofill
 * y validación nativa. Renderiza en el host DOM por defecto (NO iframe). Degrada
 * accesiblemente: el contenido inicial del elemento (fallback no-JS) permanece si el
 * script no carga; si carga pero el contract falla, muestra error + reintentar.
 *
 * Embed (Arch §19): <greenhouse-form form="slug" surface="astro" locale="es-CL"
 *                      base-url="https://greenhouse.efeoncepro.com"></greenhouse-form>
 */
import type { RenderContract } from './contract'
import { ContractLoadError, fetchRenderContract, type RendererApiConfig } from './api-client'
import { resolveSystemCopy } from './copy'
import { ensureStylesInjected } from './styles'
import { FormRenderer } from './renderer'
import { RENDERER_VERSION } from './version'

export const ELEMENT_TAG = 'greenhouse-form'

const DEFAULT_BASE_URL = 'https://greenhouse.efeoncepro.com'

const el = (doc: Document, tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement => {
  const node = doc.createElement(tag)

  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  if (text !== undefined) node.textContent = text

  return node
}

export class GreenhouseFormElement extends HTMLElement {
  static readonly observedAttributes = ['form', 'form-key', 'surface', 'locale', 'base-url', 'embed-key', 'appearance']

  private internals: ElementInternals | null = null
  private renderer: FormRenderer | null = null
  private loaded = false

  static get version(): string {
    return RENDERER_VERSION
  }

  connectedCallback(): void {
    try {
      this.internals = this.attachInternals?.() ?? null
    } catch {
      this.internals = null
    }

    const copy = resolveSystemCopy(this.getAttribute('locale') ?? undefined)

    this.applyRegionSemantics(copy.formRegionAria)
    if (this.getAttribute('color-scheme') === 'light') this.dataset.colorScheme = 'light'
    // TASK-1297 — `appearance="bare"` (chromeless): el host neutraliza el fill del renderer
    // (`--ghf-bg: transparent`) sin escribir CSS scoped propio. Transversal a cualquier host.
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
    // Preferir ElementInternals (no contamina atributos); fallback a atributos.
    if (this.internals && 'role' in this.internals) {
      try {
        this.internals.role = 'group'
        this.internals.ariaLabel = label

        return
      } catch {
        // continúa al fallback
      }
    }

    if (!this.hasAttribute('role')) this.setAttribute('role', 'group')
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', label)
  }

  private get apiConfig(): RendererApiConfig {
    return {
      baseUrl: this.getAttribute('base-url') || DEFAULT_BASE_URL,
      slug: this.getAttribute('form') || '',
      // TASK-1297 — identidad estable opaca; cuando está presente, el cliente la usa como
      // segmento de ruta (formRef) en vez del slug. Backward-compatible con `form`.
      formKey: this.getAttribute('form-key') || undefined,
      surfaceId: this.getAttribute('surface') || undefined,
      embedKey: this.getAttribute('embed-key') || undefined,
    }
  }

  private async load(): Promise<void> {
    const doc = this.ownerDocument

    ensureStylesInjected(doc)
    const copy = resolveSystemCopy(this.getAttribute('locale') ?? undefined)
    const slug = this.getAttribute('form')
    const formKey = this.getAttribute('form-key')

    if (!slug && !formKey) {
      this.renderUnavailable(copy.unavailable)

      return
    }

    this.renderLoading(copy.loadingForm, copy.loadingAria)

    try {
      const contract = await fetchRenderContract(this.apiConfig)

      this.loaded = true
      this.renderContract(contract)
    } catch (error) {
      this.loaded = true

      if (error instanceof ContractLoadError && error.kind === 'unavailable') {
        this.renderUnavailable(copy.unavailable)

        return
      }

      this.renderLoadError(copy.loadError, copy.retry)
    }
  }

  private renderContract(contract: RenderContract): void {
    const doc = this.ownerDocument

    this.replaceChildren()
    const root = el(doc, 'div', { class: 'ghf-root' })

    this.appendChild(root)

    this.renderer?.destroy()
    this.renderer = new FormRenderer({
      root,
      contract,
      api: this.apiConfig,
      locale: this.getAttribute('locale') ?? undefined,
      pageContext: this.pageContext(),
      colorScheme: this.getAttribute('color-scheme') === 'light' ? 'light' : undefined,
      doc,
    })
    this.renderer.mount()
  }

  private pageContext(): { pageUri?: string; pageName?: string; referrer?: string } {
    if (typeof window === 'undefined') return {}

    return {
      pageUri: window.location?.href,
      pageName: this.ownerDocument?.title || undefined,
      referrer: this.ownerDocument?.referrer || undefined,
    }
  }

  private renderLoading(text: string, ariaLabel: string): void {
    const doc = this.ownerDocument

    this.replaceChildren()

    const wrap = el(doc, 'div', {
      class: 'ghf-skeleton',
      role: 'status',
      'aria-busy': 'true',
      'aria-label': ariaLabel,
    })

    wrap.appendChild(el(doc, 'span', { class: 'ghf-skeleton-row' }))
    wrap.appendChild(el(doc, 'span', { class: 'ghf-skeleton-row' }))
    wrap.appendChild(el(doc, 'span', { class: 'ghf-skeleton-row' }))
    wrap.appendChild(el(doc, 'span', { class: 'ghf-skeleton-row' }))
    // Texto accesible (no decorativo) para SR; visualmente oculto en favor del skeleton.
    wrap.appendChild(el(doc, 'span', { class: 'ghf-honeypot' }, text))
    this.appendChild(wrap)
  }

  private renderUnavailable(text: string): void {
    const doc = this.ownerDocument

    this.replaceChildren()
    this.appendChild(el(doc, 'p', { class: 'ghf-status', role: 'status' }, text))
  }

  private renderLoadError(text: string, retryLabel: string): void {
    const doc = this.ownerDocument

    this.replaceChildren()
    const wrap = el(doc, 'div', { class: 'ghf-form' })

    wrap.appendChild(el(doc, 'p', { class: 'ghf-status ghf-status--error', role: 'alert' }, text))
    const retry = el(doc, 'button', { type: 'button', class: 'ghf-btn' }, retryLabel)

    retry.addEventListener('click', () => void this.load())
    const actions = el(doc, 'div', { class: 'ghf-actions' })

    actions.appendChild(retry)
    wrap.appendChild(actions)
    this.appendChild(wrap)
  }
}

/** Registra el custom element (idempotente). Seguro en SSR (no-op sin `customElements`). */
export const defineGreenhouseFormElement = (): void => {
  if (typeof customElements === 'undefined') return
  if (customElements.get(ELEMENT_TAG)) return
  customElements.define(ELEMENT_TAG, GreenhouseFormElement)
}
