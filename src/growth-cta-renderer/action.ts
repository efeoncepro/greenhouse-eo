/**
 * TASK-1340 — Growth CTA renderer: acción `open_growth_form`.
 *
 * Monta el `<greenhouse-form>` GOBERNADO in-place — el CTA jamás duplica schema,
 * validación ni consent del form (arch §12/§20; el form es la autoridad del submit).
 * Si el bundle del forms-renderer no está cargado en el host, lo carga lazy desde
 * el mismo origen Greenhouse (bundle pineado `renderer-latest.js`).
 *
 * La conversión-verdad sigue siendo el ledger de Growth Forms; el CTA solo guarda
 * la relación. El evento browser `gh_form_submission_accepted` del form dispara el
 * `greenhouse_cta_form_submitted` (join por `form_submission_id` cuando el detail
 * lo trae; browser_reported en ambos casos).
 */

import type { CtaRenderActionMirror } from './contract'

const FORMS_BUNDLE_PATH = '/growth-forms/renderer-latest.js'
const FORMS_ELEMENT_TAG = 'greenhouse-form'
const FORMS_ACCEPTED_EVENT = 'gh_form_submission_accepted'
const FORMS_DEFINE_TIMEOUT_MS = 8000

// ─── Familias de ejecución (TASK-1431) ────────────────────────────────────────

export type RendererActionFamily = 'growth_form' | 'navigate' | 'meeting_scheduler'

/**
 * Espejo browser-safe de `CTA_ACTION_KIND_FAMILIES` (SoT server en
 * `src/lib/growth/ctas/contracts.ts`; parity test los mantiene idénticos). El
 * renderer dispatchea SOLO por familia — jamás lógica de integración por kind.
 */
export const RENDERER_ACTION_FAMILIES = {
  open_growth_form: 'growth_form',
  link_url: 'navigate',
  open_think_tool: 'navigate',
  book_meeting: 'navigate',
  open_meeting_scheduler: 'meeting_scheduler',
} as const satisfies Record<CtaRenderActionMirror['kind'], RendererActionFamily>

/** Familia del action o `null` para un kind desconocido (contrato más nuevo que el bundle ⇒ fail-closed, jamás adivinar destino). */
export const resolveActionFamily = (action: { kind: string }): RendererActionFamily | null =>
  (RENDERER_ACTION_FAMILIES as Record<string, RendererActionFamily | undefined>)[action.kind] ?? null

/**
 * Defensa en profundidad del executor: re-valida que el href resuelto sea https
 * absoluta o path root-relative (sin protocol-relative `//`/`/\`). El server ya
 * validó; un contrato corrupto/stale jamás produce navegación fuera del contrato.
 */
export const isSafeNavigateHref = (href: string): boolean => {
  const trimmed = href.trim()

  if (trimmed.length === 0) return false

  if (trimmed.startsWith('/')) return !trimmed.startsWith('//') && !trimmed.startsWith('/\\')

  try {
    const url = new URL(trimmed)

    return url.protocol === 'https:' && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

/** ¿El destino sale del host actual? (affordance de salida + `rel` seguro). */
export const isExternalNavigateHref = (href: string, currentHost: string): boolean => {
  const trimmed = href.trim()

  if (trimmed.startsWith('/')) return false

  try {
    return new URL(trimmed).host !== currentHost
  } catch {
    return true
  }
}

export interface OpenGrowthFormInput {
  doc: Document
  slot: HTMLElement
  action: { formSlug: string; formKey?: string }
  baseUrl: string
  /** Surface del FORM en el host (config del host, ≠ surface del CTA). */
  formSurfaceId?: string | null
  locale?: string | null
  colorScheme?: string | null
  onSubmitted: (formSubmissionId?: string) => void
}

const ensureFormsBundle = async (doc: Document, baseUrl: string): Promise<boolean> => {
  if (typeof customElements === 'undefined') return false
  if (customElements.get(FORMS_ELEMENT_TAG)) return true

  const src = `${baseUrl.replace(/\/$/, '')}${FORMS_BUNDLE_PATH}`

  if (!doc.querySelector(`script[src="${src}"]`)) {
    const script = doc.createElement('script')

    script.src = src
    script.defer = true
    doc.head.appendChild(script)
  }

  try {
    await Promise.race([
      customElements.whenDefined(FORMS_ELEMENT_TAG),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), FORMS_DEFINE_TIMEOUT_MS)),
    ])

    return true
  } catch {
    return false
  }
}

/**
 * Monta el form gobernado dentro del slot. `false` si el bundle no cargó (el
 * renderer restaura el CTA — fail-closed sin card colgado).
 */
export const openGrowthForm = async (input: OpenGrowthFormInput): Promise<boolean> => {
  const loaded = await ensureFormsBundle(input.doc, input.baseUrl)

  if (!loaded) return false

  const form = input.doc.createElement(FORMS_ELEMENT_TAG)

  if (input.action.formKey) {
    form.setAttribute('form-key', input.action.formKey)
  } else {
    form.setAttribute('form', input.action.formSlug)
  }

  if (input.formSurfaceId) form.setAttribute('surface', input.formSurfaceId)
  form.setAttribute('base-url', input.baseUrl)
  form.setAttribute('locale', input.locale ?? 'es-CL')
  form.setAttribute('appearance', 'bare')

  if (input.colorScheme) form.setAttribute('color-scheme', input.colorScheme)

  form.addEventListener(FORMS_ACCEPTED_EVENT, event => {
    const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {}
    const submissionId = typeof detail.form_submission_id === 'string' ? detail.form_submission_id : undefined

    input.onSubmitted(submissionId)
  })

  input.slot.replaceChildren(form)

  return true
}
