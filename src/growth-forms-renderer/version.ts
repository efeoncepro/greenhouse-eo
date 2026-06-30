/**
 * TASK-1231 — Growth Forms portable renderer · versioning.
 *
 * `RENDERER_VERSION` versiona el comportamiento del bundle; `CONTRACT_VERSION`
 * (espejo de la SoT `src/lib/growth/forms/contracts.ts`) versiona la forma del
 * payload. Arch §19.2: el wrapper de cada host pinea un canal (`preview|beta|stable`).
 */
export const RENDERER_VERSION = '1.0.0-preview.1'

/** Debe ser idéntico a `CONTRACT_VERSION` de la SoT (parity test lo verifica). */
export const RENDERER_CONTRACT_VERSION = 'greenhouse-growth-public-forms.v1'

export const RENDERER_CHANNELS = ['stable', 'beta', 'preview'] as const
export type RendererChannel = (typeof RENDERER_CHANNELS)[number]
