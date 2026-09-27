/**
 * Puente superficie → Artifact Composer para «La órbita» (TASK-1919).
 *
 * `planSurfacePiece(intent)` hace tres cosas y nada más:
 *   1. Exige que la receta esté APROBADA. Una opción o una pendiente no tiene plantilla, y pedirla es un
 *      error explícito, no una pieza a medio camino.
 *   2. Resuelve el intent con el contrato `efeonce.surface-composition` de AXIS. Si AXIS devuelve issues
 *      (formato que no es de la superficie, receta que no es del papel, texto de acento bajo 24 px…), falla
 *      con esos códigos: el composer nunca recibe una pieza que el contrato rechazó.
 *   3. Traduce el manifest a un plan del composer (`contentType = <surface>.<recipe>`) con el builder de la
 *      receta, y declara los assets que quien compone debe materializar (plates, íconos).
 *
 * Es puro: no lee archivos ni renderiza. Lo usan el CLI local (`pnpm brand:compose`) y, cuando exista, la
 * ruta productiva (TASK-1921). Sólo importa TIPOS del composer, como exige la frontera del motor.
 */

import { resolveSurfaceComposition } from '@efeoncepro/axis-ui-contracts'
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import { DECK_BUILDERS, type RecipeBuilder } from './recipes/deck'
import { OVERLAY_BUILDERS } from './recipes/overlays'
import { STILL_BUILDERS } from './recipes/stills'
import type { SurfaceIntent, SurfaceManifest } from './shared'
import { SurfacePieceError, type GraphicLineCatalogName, type SurfacePiecePlan } from './types'

export { SurfacePieceError } from './types'
export type { GraphicLineCatalogName, SurfaceAssetRequest, SurfacePiecePlan } from './types'
export type { SurfaceIntent } from './shared'

const CATALOG_BY_SURFACE: Record<string, GraphicLineCatalogName> = {
  deck: 'graphic-line-deck',
  web: 'graphic-line-stills',
  dooh: 'graphic-line-stills',
  motion: 'graphic-line-stills',
  audiovisual: 'graphic-line-overlays'
}

/**
 * Recetas aprobadas que NO son una imagen fija: son video. Las produce el pipeline de motion, y pedírselas al
 * composer es un error con la ruta correcta, no una lámina vacía. El composer sí entrega el ÚLTIMO CUADRO del
 * loop de motion (`motion.loop-lens-reveal`), que es su estático de respaldo.
 */
const OUTSIDE_COMPOSER: Record<string, string> = {
  'audiovisual.close-reveal':
    'es el cierre en video con el reveal aprobado: usa los masters del reveal v1.1 (efeonceGraphicLine.motion) o pnpm orbit:video en AXIS'
}

/** Builders por superficie. Una receta aprobada sin builder falla con `recipe-without-template`. */
const BUILDERS: Record<string, Record<string, RecipeBuilder>> = {
  deck: DECK_BUILDERS,
  web: STILL_BUILDERS.web ?? {},
  dooh: STILL_BUILDERS.dooh ?? {},
  motion: STILL_BUILDERS.motion ?? {},
  audiovisual: OVERLAY_BUILDERS
}

export interface PlanSurfacePieceOptions {
  /** Identidad del artefacto (nombre del archivo de salida, id del manifest del composer). */
  artifactId: string
}

export const planSurfacePiece = (intent: SurfaceIntent, options: PlanSurfacePieceOptions): SurfacePiecePlan => {
  const surfaces = efeonceGraphicLine.surfaces as unknown as Record<string, { recipes: Record<string, Record<string, unknown>> }>
  const recipe = surfaces[intent.surface]?.recipes?.[intent.recipe]

  if (!recipe || recipe.status !== 'approved') {
    throw new SurfacePieceError(
      `La receta ${intent.surface}.${intent.recipe} está en «${String(recipe?.status ?? 'desconocida')}». Sólo una receta aprobada por el operador tiene plantilla.`,
      'recipe-not-approved'
    )
  }

  const manifest = resolveSurfaceComposition(intent as never) as unknown as SurfaceManifest & {
    issues?: { code: string; message?: string }[]
    status?: string
  }

  const issues = manifest.issues ?? []

  if (issues.length > 0) {
    throw new SurfacePieceError(
      `El contrato de superficie rechazó la pieza: ${issues.map(issue => issue.code).join(', ')}.`,
      'surface-issues',
      issues
    )
  }

  const outside = OUTSIDE_COMPOSER[`${intent.surface}.${intent.recipe}`]

  if (outside) {
    throw new SurfacePieceError(`${intent.surface}.${intent.recipe} ${outside}.`, 'recipe-outside-composer')
  }

  const builder = BUILDERS[intent.surface]?.[intent.recipe]
  const catalog = CATALOG_BY_SURFACE[intent.surface]

  if (!builder || !catalog) {
    throw new SurfacePieceError(
      `La receta aprobada ${intent.surface}.${intent.recipe} todavía no tiene plantilla en el composer.`,
      'recipe-without-template'
    )
  }

  const built = builder({ intent, manifest, recipe })
  const { slots, assets } = built
  const contentType = built.contentType ?? `${intent.surface}.${intent.recipe}`

  if (!contentType.startsWith(`${intent.surface}.${intent.recipe}`)) {
    throw new SurfacePieceError(`El builder de ${intent.surface}.${intent.recipe} devolvió un contentType ajeno (${contentType}).`, 'invalid-intent')
  }

  return {
    catalog,
    contentType,
    plan: {
      artifactId: options.artifactId,
      slides: [{ slideId: `${intent.surface}-${intent.recipe}`, contentType, slots: slots as never }]
    },
    assets,
    manifest
  }
}
