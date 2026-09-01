/**
 * TASK-1340 — Growth CTA renderer: identidad de versión del bundle público.
 * Espejo del patrón forms-renderer (`src/growth-forms-renderer/version.ts`).
 */
/**
 * 🔴 Este valor viaja en la telemetría (`renderer_version` del dataLayer y del ledger
 * de conversión), así que SUBIRLO es lo único que permite después distinguir qué
 * hosts corren qué comportamiento. Un cambio de comportamiento del bundle público
 * SIN bump deja el ledger sin forma de separar el antes del después.
 *
 * `1.3.0` (2026-09-01, ISSUE-167): el form revelado por el CTA ahora recibe el foco y
 * `Escape` lo colapsa. Minor y no patch porque cambia comportamiento observable, y
 * porque `dismissed` dejó de emitirse al cerrar por teclado — un consumidor que mida
 * la tasa de rechazo verá la serie cambiar de sentido en esta versión.
 */
export const RENDERER_VERSION = '1.3.0'

/** Debe coincidir EXACTO con `CTA_CONTRACT_VERSION` del server (parity test). */
export const RENDERER_CONTRACT_VERSION = 'greenhouse-growth-cta-popup.v1'

export const RENDERER_CHANNELS = ['preview', 'beta', 'stable'] as const
export type RendererChannel = (typeof RENDERER_CHANNELS)[number]
