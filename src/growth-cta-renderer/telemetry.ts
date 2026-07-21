/**
 * TASK-1340 — Growth CTA renderer: telemetría browser (`greenhouse_cta_*`).
 *
 * Namespace CANÓNICO del arch spec §13: los eventos browser/host-facing son
 * `greenhouse_cta_*` — deliberadamente distinto del namespace interno `growth.cta.*`
 * (outbox/signals/capabilities) y del rail legacy ad-hoc `gh_cta_clicked` de los
 * widgets WordPress pre-motor (deprecar-no-renombrar; ver TRACKING-PLAN §CTAs).
 *
 * Cada emisión pasa por la ALLOWLIST DURA antes de salir por CustomEvent + dataLayer:
 * cualquier clave fuera del set (o valor no escalar) se descarta — PII jamás entra al
 * dataLayer (arch §13/§16). Espejo del SoT server:
 * `CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS` en `src/lib/growth/ctas/contracts.ts`
 * (paridad garantizada por test).
 */

/** Eventos browser canónicos de esta rebanada (arch §13; eligible/suppressed son del arbiter server y viewed-exposure masivo es Tier B futuro). */
export const RENDERER_GTM_EVENTS = {
  viewed: 'greenhouse_cta_viewed',
  clicked: 'greenhouse_cta_clicked',
  actionStarted: 'greenhouse_cta_action_started',
  dismissed: 'greenhouse_cta_dismissed',
  formOpened: 'greenhouse_cta_form_opened',
  formSubmitted: 'greenhouse_cta_form_submitted',
  error: 'greenhouse_cta_error',
} as const

export type RendererGtmEvent = (typeof RENDERER_GTM_EVENTS)[keyof typeof RENDERER_GTM_EVENTS]

/**
 * Espejo de `CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS` (SoT server, TASK-1340).
 * Params por familia según doc 04 §2 + arch §13: identidad del CTA por PARÁMETRO
 * (cta_id/cta_slug/cta_location…), NUNCA un evento por superficie/posición.
 */
export const RENDERER_ALLOWED_PAYLOAD_KEYS = [
  'event',
  'cta_id',
  'cta_slug',
  'cta_version_id',
  'cta_kind',
  'cta_location',
  'campaign_slug',
  'surface_id',
  'placement',
  'variant_id',
  'action_kind',
  'form_slug',
  'form_key',
  'form_submission_id',
  'reason_class',
  'renderer_version',
  'contract_version',
  'page_uri',
] as const

export type RendererAllowedPayloadKey = (typeof RENDERER_ALLOWED_PAYLOAD_KEYS)[number]

export type TelemetryPayload = Partial<Record<RendererAllowedPayloadKey, string | number | boolean>>

export interface TelemetryPolicy {
  /** `false` desactiva el push a dataLayer (CustomEvent siempre se emite). */
  gtmDataLayer?: boolean
}

const ALLOWED = new Set<string>(RENDERER_ALLOWED_PAYLOAD_KEYS)

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'

/** Descarta toda clave no allowlisted y todo valor no escalar. Sin excepciones. */
export const sanitizeTelemetryPayload = (payload: Record<string, unknown>): Record<string, string | number | boolean> => {
  const clean: Record<string, string | number | boolean> = {}

  for (const [key, value] of Object.entries(payload)) {
    if (!ALLOWED.has(key)) continue
    if (!isScalar(value)) continue
    clean[key] = value
  }

  return clean
}

export interface TelemetryEmitter {
  emit: (event: RendererGtmEvent, payload: TelemetryPayload) => void
}

interface DataLayerWindow {
  dataLayer?: Array<Record<string, unknown>>
}

/**
 * Emite CustomEvent (host integration, bubbles+composed) + dataLayer.push (GTM).
 * El payload ya sale sanitizado; `event` viaja dentro del detail para GTM.
 */
export const createTelemetryEmitter = (
  host: HTMLElement,
  policy: TelemetryPolicy = {},
  win: (Window & DataLayerWindow) | undefined = typeof window !== 'undefined' ? (window as Window & DataLayerWindow) : undefined,
): TelemetryEmitter => ({
  emit: (event, payload) => {
    const detail = { event, ...sanitizeTelemetryPayload(payload as Record<string, unknown>) }

    try {
      host.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }))
    } catch {
      // nunca romper la UX del host por telemetría
    }

    if (policy.gtmDataLayer === false || !win) return

    try {
      win.dataLayer = win.dataLayer || []
      win.dataLayer.push(detail)
    } catch {
      // dataLayer bloqueado/ausente: silencioso (el ingest server-side es el rail primario)
    }
  },
})
