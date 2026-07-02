/**
 * TASK-1231 — Growth Forms portable renderer · telemetría browser-safe (Arch §15, §15.1).
 *
 * Dos superficies: `CustomEvent` en el host DOM (framework-agnóstico) + `dataLayer.push`
 * opcional para GTM. NUNCA emite valores crudos, PII, internals de HubSpot, URLs privadas
 * ni tokens: el payload se filtra contra una allowlist dura y se descartan claves prohibidas.
 */
import type { RendererTelemetryPolicy } from './contract'

/** Espejo de `GTM_EVENT_NAMES` de la SoT (contracts.ts). */
export const RENDERER_GTM_EVENTS = [
  'gh_form_viewed',
  'gh_form_started',
  'gh_form_field_validation_failed',
  'gh_form_submitted',
  'gh_form_submission_accepted',
  'gh_form_submission_rejected',
  'gh_form_destination_delivered',
  'gh_form_asset_accessed',
  // TASK-1319 success card capability — eventos render-only (espejo de GTM_EVENT_NAMES).
  'gh_form_success_viewed',
  'gh_form_success_action_clicked',
] as const
export type RendererGtmEvent = (typeof RENDERER_GTM_EVENTS)[number]

/** Espejo de `TELEMETRY_ALLOWED_PAYLOAD_KEYS`. Solo estas claves cruzan al browser. */
export const RENDERER_ALLOWED_PAYLOAD_KEYS = [
  'form_id',
  'form_key',
  'form_slug',
  'form_version_id',
  'form_kind',
  'surface_id',
  'surface_kind',
  'renderer_version',
  'contract_version',
  'page_uri',
  'page_name',
  'referrer',
  'locale',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'correlation_id',
  'reason_class',
  'success_behavior',
  'destination_kind',
  // TASK-1319 success card capability — clasificadores browser-safe (nunca valores/PII).
  'action_kind',
  'reward_kind',
] as const
export type RendererAllowedPayloadKey = (typeof RENDERER_ALLOWED_PAYLOAD_KEYS)[number]

export type TelemetryPayload = Partial<Record<RendererAllowedPayloadKey, string | number>>

const ALLOWED = new Set<string>(RENDERER_ALLOWED_PAYLOAD_KEYS)

/** Filtra cualquier objeto a SOLO las claves permitidas con valores escalares. */
export const sanitizeTelemetryPayload = (input: Record<string, unknown>): TelemetryPayload => {
  const out: TelemetryPayload = {}

  for (const key of Object.keys(input)) {
    if (!ALLOWED.has(key)) continue
    const value = input[key]

    if (typeof value === 'string' || typeof value === 'number') {
      out[key as RendererAllowedPayloadKey] = value
    }
  }

  return out
}

interface DataLayerWindow extends Window {
  dataLayer?: Array<Record<string, unknown>>
}

export interface TelemetryEmitter {
  emit: (event: RendererGtmEvent, payload: Record<string, unknown>) => void
}

/**
 * Crea un emisor ligado a un host element. Cada evento:
 *  1. Se sanea contra la allowlist.
 *  2. Se despacha como `CustomEvent` (bubbles + composed) sobre el element.
 *  3. Si la policy habilita `gtmDataLayer`, se empuja a `window.dataLayer`.
 */
export const createTelemetryEmitter = (
  host: EventTarget,
  policy: RendererTelemetryPolicy | undefined,
  base: TelemetryPayload,
  win: DataLayerWindow | undefined = typeof window !== 'undefined' ? (window as DataLayerWindow) : undefined,
): TelemetryEmitter => {
  const enabled = policy?.enabled !== false
  const gtm = policy?.gtmDataLayer !== false

  return {
    emit(event, payload) {
      if (!enabled) return
      const detail = { event, ...base, ...sanitizeTelemetryPayload(payload) }

      try {
        host.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }))
      } catch {
        // entornos sin CustomEvent (SSR) — no-op defensivo.
      }

      if (gtm && win) {
        win.dataLayer = win.dataLayer ?? []
        win.dataLayer.push(detail)
      }
    },
  }
}
