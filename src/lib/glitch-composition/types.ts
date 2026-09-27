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
      /** Duotono navy de la falla en bytes (valores del token), o `color` para el detalle de la lente. */
      treatment: 'duotone' | 'color'
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
