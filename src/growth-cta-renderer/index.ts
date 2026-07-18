/**
 * TASK-1340 — Growth CTA renderer: entrypoint del bundle público.
 * Registrar el custom element al cargar (idempotente, SSR-safe).
 */
export { GreenhouseCtaElement, defineGreenhouseCtaElement, ELEMENT_TAG } from './element'
export { CtaRenderer, resolveStyleVariant, resolveVisualUrl } from './renderer'
export { SlideInController, observeVisibleOnce, SLIDE_IN_TRIGGER_DWELL_MS, SLIDE_IN_TRIGGER_SCROLL_RATIO } from './slide-in'
export { resolveVisitorIdentity, parseConsentState, isLocallyDismissed, markLocallyDismissed } from './visitor'
export { RENDERER_CSS, RENDERER_STYLE_ID, ensureStylesInjected } from './styles'
export { RENDERER_GTM_EVENTS, RENDERER_ALLOWED_PAYLOAD_KEYS, createTelemetryEmitter, sanitizeTelemetryPayload } from './telemetry'
export { RENDERER_VERSION, RENDERER_CONTRACT_VERSION } from './version'
export type { CtaRenderContractMirror, ArbitratedRenderResultMirror } from './contract'

import { defineGreenhouseCtaElement } from './element'

defineGreenhouseCtaElement()
