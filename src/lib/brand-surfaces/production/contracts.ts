/**
 * Contrato del render gobernado de piezas de marca (TASK-1921). Puro: lo comparten el command (Vercel), el consumer
 * del `artifact-worker` y los tests. Sólo Greenhouse por ahora; nace extraíble hacia Marketing Studio o Globe
 * (decisión del operador, 2026-09-28): la forma del pedido no nombra al dueño.
 *
 * Un pedido es UNA de tres familias:
 *   - `graphic_line_piece`    — una pieza de «La órbita» por superficie (intent `efeonce.surface-composition`)
 *   - `graphic_line_document` — un brochure o una propuesta de varias páginas (intent con `pages`)
 *   - `glitch_edition`        — una edición de Glitch: la semanal (`GlitchEditionManifest`) o el Glitch Flash
 *                               (`GlitchFlashManifest`, `edition.kind: 'flash'`); el mapper despacha por `edition.kind`
 *
 * Las fotos, plates y logos NUNCA viajan por ruta: el intent o el manifiesto los nombran con la misma cadena que usa
 * el taller local (`path`/`file`), y `sources` traduce cada una a un asset subido por el uploader canónico
 * (`/api/assets/private`, contexto `brand_render_source_draft`).
 */

import { z } from 'zod'

export const BRAND_RENDER_FAMILIES = ['graphic_line_piece', 'graphic_line_document', 'glitch_edition'] as const

export type BrandRenderFamily = (typeof BRAND_RENDER_FAMILIES)[number]

/** Los seis catálogos que el render gobernado conoce, y su salida (la declara el catálogo; aquí se registra). */
export const BRAND_RENDER_OUTPUT_TARGET = {
  'graphic-line-deck': 'pdf-merged',
  'graphic-line-stills': 'png-set',
  'graphic-line-overlays': 'png-set',
  'glitch-carousel': 'pdf-merged',
  'glitch-stills': 'png-set',
  'glitch-overlays': 'png-set'
} as const

export type BrandRenderCatalogName = keyof typeof BRAND_RENDER_OUTPUT_TARGET

export type BrandRenderOutputTarget = (typeof BRAND_RENDER_OUTPUT_TARGET)[BrandRenderCatalogName]

export const isBrandRenderCatalogName = (name: string): name is BrandRenderCatalogName => Object.hasOwn(BRAND_RENDER_OUTPUT_TARGET, name)

const ASSET_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,127}$/

/** Nombre de la fuente en el intent → assetId del uploader canónico. */
const sourcesSchema = z
  .record(z.string().trim().min(1).max(512), z.string().regex(ASSET_ID, 'assetId no válido'))
  .refine((record) => Object.keys(record).length <= 64, 'como máximo 64 fuentes por pedido')

export const brandRenderRequestSchema = z.discriminatedUnion('family', [
  z
    .object({
      family: z.literal('graphic_line_piece'),
      intent: z.record(z.string(), z.unknown()),
      sources: sourcesSchema.default({}),
      organizationId: z.string().trim().min(1).optional()
    })
    .strict(),
  z
    .object({
      family: z.literal('graphic_line_document'),
      intent: z.record(z.string(), z.unknown()),
      sources: sourcesSchema.default({}),
      organizationId: z.string().trim().min(1).optional()
    })
    .strict(),
  z
    .object({
      family: z.literal('glitch_edition'),
      manifest: z.record(z.string(), z.unknown()),
      sources: sourcesSchema.default({}),
      organizationId: z.string().trim().min(1).optional()
    })
    .strict()
])

export type BrandRenderRequestInput = z.input<typeof brandRenderRequestSchema>
export type BrandRenderRequest = z.output<typeof brandRenderRequestSchema>

export type BrandRenderActorKind = 'member' | 'agent' | 'system' | 'cli'

export interface BrandRenderActor {
  kind: BrandRenderActorKind
  userId: string | null
}

export const BRAND_RENDER_JOB_STATES = ['queued', 'running', 'completed', 'failed', 'dead_letter', 'cancelled'] as const

export type BrandRenderJobState = (typeof BRAND_RENDER_JOB_STATES)[number]

export const BRAND_RENDER_REQUEST_STATES = ['pending', 'running', 'completed', 'partial_failed', 'failed', 'cancelled'] as const

export type BrandRenderRequestState = (typeof BRAND_RENDER_REQUEST_STATES)[number]

/**
 * Transiciones del job. Un fallo reintentable vuelve a `queued` solo (hasta agotar intentos) y el siguiente despacho lo
 * toma; uno terminal o sin intentos va a `dead_letter`. `running → running` es el reclamo por lease vencido.
 */
export const BRAND_RENDER_JOB_TRANSITIONS: Readonly<Record<BrandRenderJobState, readonly BrandRenderJobState[]>> = {
  queued: ['running', 'cancelled'],
  running: ['running', 'completed', 'queued', 'dead_letter'],
  completed: [],
  failed: ['queued', 'dead_letter'],
  dead_letter: [],
  cancelled: []
}

export const isBrandRenderJobTransitionAllowed = (from: BrandRenderJobState, to: BrandRenderJobState): boolean =>
  BRAND_RENDER_JOB_TRANSITIONS[from]?.includes(to) ?? false

export const BRAND_RENDER_FAILURE_CODES = [
  'semantic_rejected',
  'size_rejected',
  'geometry_rejected',
  'font_fallback_detected',
  'missing_asset',
  'blank_slide',
  'manifest_drift',
  'render_error',
  'timeout',
  'dispatch_error',
  'cancelled'
] as const

export type BrandRenderFailureCode = (typeof BRAND_RENDER_FAILURE_CODES)[number]

/** Reintentar no cambia el resultado: el plan o sus fuentes están mal, no el entorno. */
export const BRAND_RENDER_NON_RETRYABLE_FAILURES: ReadonlySet<BrandRenderFailureCode> = new Set([
  'semantic_rejected',
  'geometry_rejected',
  'blank_slide',
  'manifest_drift',
  'size_rejected',
  'cancelled'
])

export const toBrandRenderFailureCode = (code: string): BrandRenderFailureCode =>
  (BRAND_RENDER_FAILURE_CODES as readonly string[]).includes(code) ? (code as BrandRenderFailureCode) : 'render_error'

/**
 * Slots que el worker DERIVA de los bytes de las fotos y agrega al plan antes de componer (la falla en bytes de
 * Glitch). No están en el input sellado: el worker los quita antes de comparar el input emitido contra el sellado.
 */
export const BRAND_RENDER_DERIVED_SLOTS = ['bytes'] as const
