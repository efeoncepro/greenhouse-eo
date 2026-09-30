/**
 * `productMark` (TASK-1949, deck SEO/AEO): el lockup OFICIAL de una submarca de Efeonce en la lámina — Search Visibility 360
 * y sus piezas (AEO, AEO Assessment, AI Visibility Report, Insights). Es un slot OPCIONAL: sin él, la receta compone
 * exactamente como antes (el nodo de la plantilla se vacía).
 *
 * El intent sólo NOMBRA el lockup (`productMark: "sv360-lockup-negative"`), de una lista cerrada de
 * `@efeoncepro/axis-brand-assets` que `pnpm brand:tokens` copia al catálogo sin editarlos. Dónde va y a qué alto lo decide
 * la receta: la portada de línea lo lleva al pie de la columna, la de propuesta sobre el bloque del cliente, la propuesta
 * de cine sin eyebrow en el lugar del eyebrow y el resto arriba a la izquierda, sobre el margen.
 */

import { SurfacePieceError, type SurfaceAssetRequest } from '../types'
import { css } from './kit'

/** El directorio del catálogo al que `pnpm brand:tokens` copia los archivos de `axis-brand-assets`. */
const CATALOG_ASSET_DIR = 'src/lib/artifact-composer/catalogs/graphic-line-deck/assets'

/**
 * Los lockups de submarca que una lámina puede llevar, con el texto alternativo de cada uno (el nombre como se lee). Lista
 * cerrada: un lockup que no está aquí no compone.
 */
export const PRODUCT_MARKS = {
  'sv360-lockup-negative': 'Efeonce | SV360',
  'sv360-logo-negative': 'SV360 · Search Visibility 360',
  'aeo-lockup-negative': 'Efeonce | AEO',
  'aeo-assessment-lockup-negative': 'Efeonce | AEO Assessment',
  'ai-visibility-report-lockup-negative': 'Efeonce | AI Visibility Report',
  'insights-lockup-negative': 'Efeonce | Insights'
} as const

export type ProductMarkId = keyof typeof PRODUCT_MARKS

/**
 * Los archivos de submarca que viajan en el catálogo (`assets/<archivo>`): los seis lockups del slot y el nombre completo
 * de Search Visibility 360, que la lámina de la familia de marcas usa como cabecera de la columna.
 */
export const PRODUCT_MARK_FILES = [...Object.keys(PRODUCT_MARKS), 'sv360-name-lockup-negative'].map(id => `${id}.svg`)

export type ProductMarkPlacement = { xPx: number; topPx: number; heightPx: number }

/**
 * Dónde va el lockup en cada receta, medido en las láminas aprobadas del 2026-09-30 (`render-src/bake.cjs`, `ov`).
 * TODO AXIS TASK-1949: estos lugares pasan a `efeonceGraphicLine.surfaces.deck.recipes.<receta>.productMark` y este
 * mapa se borra cuando AXIS los publique.
 */
export const PRODUCT_MARK_PLACEMENTS: Record<string, ProductMarkPlacement> = {
  // Arriba a la izquierda, sobre el margen: el lugar común de las láminas de contenido, método y decisión.
  default: { xPx: 140, topPx: 44, heightPx: 40 },
  // Portada de línea (`cover-brochure`, composición `line`): al pie de la columna, bajo la bajada.
  'cover-brochure': { xPx: 140, topPx: 790, heightPx: 64 },
  // Portada de propuesta (`cover-proposal`, órbita): bajo la columna del cliente.
  'cover-proposal': { xPx: 140, topPx: 880, heightPx: 56 },
  // Propuesta de cine sin eyebrow: el lockup toma el lugar del eyebrow.
  'proposal-cinematic-no-eyebrow': { xPx: 140, topPx: 112, heightPx: 40 }
}

/** Un archivo de submarca como asset externo (copiado byte a byte al catálogo por `pnpm brand:tokens`). */
export const productMarkFile = (id: string): { ref: string; asset: SurfaceAssetRequest } => {
  const ref = `asset-ref:file:${id}`

  return { ref, asset: { ref, kind: 'file', path: `${CATALOG_ASSET_DIR}/${id}.svg` } }
}

/**
 * El id del lockup del intent, validado contra la lista cerrada. `undefined` = la lámina va sin lockup. El intent lo
 * nombra (`"sv360-lockup-negative"`) o lo trae como en el catálogo de recetas (`{ asset: "sv360-lockup-negative" }`); el
 * texto alternativo siempre es el del lockup, no el del intent.
 */
export const productMarkId = (value: unknown): ProductMarkId | undefined => {
  if (value === undefined || value === null) return undefined

  const asked = typeof value === 'object' ? (value as { asset?: unknown }).asset : value

  if (typeof asked !== 'string' || !(asked in PRODUCT_MARKS)) {
    throw new SurfacePieceError(
      `El lockup de submarca (\`productMark\`) es uno de ${Object.keys(PRODUCT_MARKS).join(' · ')}: los archivos oficiales de @efeoncepro/axis-brand-assets, sin editar.`,
      'invalid-intent'
    )
  }

  return asked as ProductMarkId
}

/**
 * El slot `productMark` de una lámina y su asset, o `null` si el intent no lo pide. `placement` es la clave de
 * `PRODUCT_MARK_PLACEMENTS` (por defecto, arriba a la izquierda).
 */
export const productMarkSlot = (
  value: unknown,
  placement: keyof typeof PRODUCT_MARK_PLACEMENTS = 'default'
): { slot: Record<string, string>; asset: SurfaceAssetRequest } | null => {
  const id = productMarkId(value)

  if (!id) return null

  const at = PRODUCT_MARK_PLACEMENTS[placement]!
  const file = productMarkFile(id)

  return {
    slot: {
      src: file.ref,
      alt: PRODUCT_MARKS[id],
      left: css('pmk-left', at.xPx),
      top: css('pmk-top', at.topPx),
      height: css('pmk-height', at.heightPx)
    },
    asset: file.asset
  }
}

/** Suma el slot `productMark` (si lo hay) a los slots y los assets de un builder ya resuelto. */
export const withProductMark = <T extends { slots: Record<string, unknown>; assets: SurfaceAssetRequest[] }>(
  built: T,
  value: unknown,
  placement: keyof typeof PRODUCT_MARK_PLACEMENTS = 'default'
): T => {
  const mark = productMarkSlot(value, placement)

  if (!mark) return built

  return { ...built, slots: { ...built.slots, productMark: mark.slot }, assets: [...built.assets, mark.asset] }
}

type PlacementRule = (ctx: { layout: string | null; eyebrow: boolean }) => keyof typeof PRODUCT_MARK_PLACEMENTS | null

/**
 * Las recetas EXISTENTES que admiten el lockup (brecha 1 del inventario del deck SEO/AEO) y dónde lo llevan según su
 * composición. `null` = esa composición no tiene plantilla con el slot: pedir el lockup ahí falla cerrado. Las recetas
 * nuevas del deck (familia de marcas, servicios, informe, comité, industrias y mercados) lo resuelven en su builder.
 */
const EXISTING_RECIPES: Record<string, PlacementRule> = {
  'cover-brochure': ({ layout }) => (layout === 'line' ? 'cover-brochure' : null),
  'cover-proposal': ({ layout }) => (layout === null || layout === 'orbit' ? 'cover-proposal' : null),
  // La AEO de cine sin eyebrow: el lockup ocupa su lugar (operador, 2026-09-30).
  'proposal-cinematic': ({ layout, eyebrow }) => (layout === null || layout === 'service' ? (eyebrow ? 'default' : 'proposal-cinematic-no-eyebrow') : null),
  'proposal-service': () => 'default',
  'method-staircase': ({ layout }) => (layout === null || layout === 'steps' ? 'default' : null),
  'method-score-ring': () => 'default',
  'decision-diagnosis-map': () => 'default',
  'content-day': ({ layout }) => (layout === 'live-results' ? 'default' : null)
}

/**
 * El lockup de una receta EXISTENTE (lo aplica `planFromManifest` después del builder de la receta). Una receta nueva del
 * deck SEO/AEO resuelve el suyo en su builder y se salta este paso. Sin `productMark` en el intent devuelve la lámina tal
 * cual: el slot es opcional y su ausencia compone exactamente la lámina de siempre.
 */
export const applyExistingProductMark = <T extends { slots: Record<string, unknown>; assets: SurfaceAssetRequest[] }>(
  built: T,
  recipe: string,
  value: unknown,
  ctx: { layout: string | null; eyebrow: boolean }
): T => {
  if (value === undefined || value === null || 'productMark' in built.slots) return built

  const rule = EXISTING_RECIPES[recipe]
  const placement = rule?.(ctx) ?? null

  if (!placement) {
    throw new SurfacePieceError(
      `La receta ${recipe}${ctx.layout ? ` (composición «${ctx.layout}»)` : ''} no lleva lockup de submarca (\`productMark\`).`,
      'invalid-intent'
    )
  }

  return withProductMark(built, value, placement)
}

/** Las recetas existentes que admiten `productMark` (para los tests y el reporte). */
export const PRODUCT_MARK_EXISTING_RECIPES = Object.keys(EXISTING_RECIPES)
