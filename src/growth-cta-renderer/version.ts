/**
 * TASK-1340 — Growth CTA renderer: identidad de versión del bundle público.
 * Espejo del patrón forms-renderer (`src/growth-forms-renderer/version.ts`).
 */
export const RENDERER_VERSION = '1.2.0-preview.1'

/** Debe coincidir EXACTO con `CTA_CONTRACT_VERSION` del server (parity test). */
export const RENDERER_CONTRACT_VERSION = 'greenhouse-growth-cta-popup.v1'

export const RENDERER_CHANNELS = ['preview', 'beta', 'stable'] as const
export type RendererChannel = (typeof RENDERER_CHANNELS)[number]
