/**
 * Tipos compartidos de la composición de Glitch (TASK-1923).
 *
 * Glitch es el magazine semanal de Efeonce (sub-línea de «La órbita», sólo Glitch). Una edición entra como un
 * MANIFIESTO de datos (`GlitchEditionManifest`, ver `manifest.ts`) y este módulo la traduce a planes del Artifact
 * Composer. El autor nunca elige plantilla ni coordenadas: la portada la decide el contenido y la regla de rotación, y
 * los valores (color, tipo, zonas) salen del token `glitchLine` de AXIS.
 */

import type { CompositionPlanInput } from '@/lib/artifact-composer/pure'

/** Los tres catálogos delgados de Glitch, sobre la misma carpeta de plantillas. */
export type GlitchCatalogName = 'glitch-carousel' | 'glitch-stills' | 'glitch-overlays'

/**
 * Códigos estables de error. El CLI y la ruta productiva los muestran con su ruta de campo y un mensaje en es-CL;
 * nunca un stack trace crudo como único mensaje.
 */
export type GlitchPieceErrorCode =
  | 'manifest-invalid'
  | 'piece-not-approved'
  | 'cover-rotation-unsatisfiable'
  | 'font-license-missing'
  | 'photo-license-missing'
  | 'fracture-over-face'
  | 'contract-issues'
  | 'carousel-too-heavy'
  | 'edition-number-already-published'
  | 'published-editions-unavailable'

export interface GlitchIssue {
  code: string
  /** Ruta del campo en el manifiesto (`news[2].photo.credit`) o id de lámina. */
  path?: string
  message: string
}

export class GlitchPieceError extends Error {
  constructor(
    message: string,
    readonly code: GlitchPieceErrorCode,
    readonly issues: readonly GlitchIssue[] = []
  ) {
    super(message)
    this.name = 'GlitchPieceError'
  }
}

/** Dónde y cómo se desarma en bytes una foto en UNA lámina. El perfil lo fija la plantilla (medido en el canvas). */
export interface GlitchFractureRequest {
  slideIds: string[]
  box: { x: number; y: number; w: number; h: number }
  edge: 'bottom' | 'top' | 'left' | 'right'
  profile: 'band' | 'side' | 'host' | 'card'
  faceRegions: { x: number; y: number; w: number; h: number }[]
  /** La tarjeta del mosaico: ninguna celda sale de ella. */
  clip?: { x: number; y: number; w: number; h: number }
  canvas: { width: number; height: number }
}

/**
 * Un asset que el plan referencia (`asset-ref:<kind>:<id>`) y que quien compone debe materializar en bytes. El mapper
 * no lee archivos: sólo dice qué hace falta y a qué tamaño exacto (así el render no re-muestrea; ISSUE-122).
 */
export type GlitchAssetRequest =
  | {
      ref: string
      kind: 'photo'
      /** Ruta relativa al manifiesto. */
      path: string
      /** Tamaño exacto del hueco en px CSS; el materializador lo multiplica por el deviceScaleFactor. */
      fit: { width: number; height: number }
      /** Duotono navy (noticias) o color (el host del video). */
      treatment: 'duotone' | 'color'
      /** Dónde se desarma en bytes (una foto puede romperse por dos bordes: el banner A del blog). */
      fractures: GlitchFractureRequest[]
    }
  | {
      ref: string
      kind: 'lens'
      path: string
      /** La foto de la lámina, a su tamaño: el detalle se corta de ahí. */
      fit: { width: number; height: number }
      region: { x: number; y: number; w: number; h: number }
      diameter: number
    }

export interface GlitchCatalogPlan {
  catalog: GlitchCatalogName
  plan: CompositionPlanInput
}

export interface GlitchEditionPlan {
  edition: number
  /** La plantilla de portada que resolvió la rotación. */
  coverTemplate: 'A' | 'B' | 'C'
  carousel: GlitchCatalogPlan
  stills: GlitchCatalogPlan
  overlays: GlitchCatalogPlan
  assets: GlitchAssetRequest[]
}

/**
 * Plan de un Glitch Flash (operador, 2026-09-28): una sola noticia, sin número de edición ni rotación de portada. El
 * carrusel son tres láminas (portada, la noticia, contraportada); las sueltas, Threads y el blog. No tiene overlays.
 */
/**
 * Una foto publicada con la excepción `press` (sólo Glitch Flash): crédito pintado, fuente pública y aprobación del
 * operador para ESTA pieza. La procedencia la registra tal cual (`licenseExceptions`).
 */
export interface GlitchLicenseException {
  photo: 'cover' | 'news'
  file: string
  kind: 'press'
  ref: string
  credit: string
  approvedBy: string
  approverName: string | null
  approvedOn: string
  flash: string
  reason: string
}

export interface GlitchFlashPlan {
  kind: 'flash'
  slug: string
  /** «Glitch Flash · <título>» (título del documento de LinkedIn). */
  title: string
  edition: null
  coverTemplate: null
  carousel: GlitchCatalogPlan
  stills: GlitchCatalogPlan
  overlays: GlitchCatalogPlan
  assets: GlitchAssetRequest[]
  /** Fotos publicadas con la excepción de prensa aprobada (vacío si todas tienen licencia). */
  licenseExceptions: GlitchLicenseException[]
}

export const isGlitchFlashPlan = (plan: GlitchEditionPlan | GlitchFlashPlan): plan is GlitchFlashPlan => 'kind' in plan && plan.kind === 'flash'
