/**
 * Tipos del puente superficie → Artifact Composer (TASK-1919).
 *
 * Un agente o una persona declara la pieza como INTENCIÓN (`efeonce.surface-composition` de AXIS):
 * superficie, formato, papel, receta, línea, voz, foto, pasos. Este módulo la resuelve con el contrato de
 * AXIS y la traduce a un plan del composer. Nunca elige coordenadas ni plantilla a mano.
 */

import type { CompositionPlanInput } from '@/lib/artifact-composer/pure'

/** Los catálogos del composer que materializan La órbita. */
export type GraphicLineCatalogName = 'graphic-line-deck' | 'graphic-line-stills' | 'graphic-line-overlays'

/**
 * Un asset que el plan referencia (`asset-ref:<kind>:<id>`) y que quien compone debe materializar en
 * bytes antes de renderizar. El mapper no lee archivos: sólo dice qué hace falta.
 */
export type SurfaceAssetRequest =
  | { ref: string; kind: 'plate'; path: string; fit: { width: number; height: number } }
  | { ref: string; kind: 'svg'; svg: string }

/** Lo que un builder de receta devuelve: los slots de UNA lámina y los assets que referencia. */
export interface RecipeSlots {
  slots: Record<string, unknown>
  assets: SurfaceAssetRequest[]
}

export interface SurfacePiecePlan {
  catalog: GraphicLineCatalogName
  contentType: string
  plan: CompositionPlanInput
  assets: SurfaceAssetRequest[]
  /** El manifest de AXIS que gobernó la traducción (se guarda junto a la pieza para auditarla). */
  manifest: Record<string, unknown>
}

export class SurfacePieceError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'surface-issues'
      | 'recipe-not-approved'
      | 'recipe-without-template'
      | 'recipe-outside-composer'
      | 'missing-photo'
      | 'invalid-intent',
    readonly issues: readonly unknown[] = []
  ) {
    super(message)
    this.name = 'SurfacePieceError'
  }
}
