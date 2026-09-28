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
  /** `focus` (opcional) fija el recorte hacia un punto del archivo (0–1); sin él, el recorte es centrado. */
  | { ref: string; kind: 'plate'; path: string; fit: { width: number; height: number }; focus?: { xOfWidth?: number; yOfHeight?: number } }
  | { ref: string; kind: 'svg'; svg: string }
  /**
   * Una capa que pinta el motor de la línea gráfica CON una foto adentro (la lente de una sección, TASK-1928): el SVG
   * lleva el marcador `photo` donde va la foto, y quien compone lo reemplaza por los bytes del plate (recortado a `fit`).
   * El builder no lee archivos; el motor pinta la pieza entera (penumbra, círculo, anillo, arco y esfera) tal cual.
   */
  | { ref: string; kind: 'painted'; svg: string; photo: { marker: string; path: string; fit: { width: number; height: number } } }
  /** Un archivo que quien compone lee tal cual (el logo de un cliente): SVG o PNG, sin recorte. */
  | { ref: string; kind: 'file'; path: string }
  /**
   * Un logo de tercero normalizado (TASK-1928, clientes y partners): en UN tono y con el mismo peso óptico (la misma
   * área de tinta), dentro de su caja máxima. `knockout` quita el fondo blanco de un logo en caja; `recolor` es la
   * excepción tonal declarada (se recolorea en tonos del mismo color en vez de aplanarlo) y `recolorBox` su caja.
   */
  | {
      ref: string
      kind: 'logo'
      path: string
      tone: string
      inkArea: number
      maxWidth: number
      maxHeight: number
      knockout?: boolean
      recolor?: Record<string, string>
      recolorBox?: { scaleMax: number; maxWidth: number; maxHeight: number }
    }

/** Lo que un builder de receta devuelve: los slots de UNA lámina y los assets que referencia. */
export interface RecipeSlots {
  slots: Record<string, unknown>
  assets: SurfaceAssetRequest[]
  /**
   * Sólo cuando una receta tiene una plantilla por FORMATO (el teléfono a 360, 390 y 430 px): el builder devuelve
   * `<surface>.<recipe>.<format>` y el selector del catálogo elige la plantilla de ese ancho. Sin él, el contentType
   * es `<surface>.<recipe>`.
   */
  contentType?: string
}

export interface SurfacePiecePlan {
  catalog: GraphicLineCatalogName
  contentType: string
  plan: CompositionPlanInput
  assets: SurfaceAssetRequest[]
  /** El uso y la composición que resolvió AXIS para la lámina (contrato 0.1.2); `null` cuando la receta no los declara. */
  use: 'proposal' | 'brochure' | null
  layout: string | null
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
