/**
 * Catálogos de Glitch (TASK-1923) — sólo Glitch, nunca piezas de Efeonce.
 *
 * Tres catálogos delgados sobre la MISMA carpeta de plantillas (`catalogs/glitch/`), porque la misma edición sale en
 * tres destinos y un catálogo declara un solo `outputTarget`:
 *   - `glitch-carousel` → `pdf-merged`: el documento del carrusel de LinkedIn (portada + 8 interiores + contraportada).
 *   - `glitch-stills`   → `png-set`: láminas sueltas, banners del blog, portada del reel y miniatura del vlog.
 *   - `glitch-overlays` → `png-set` con alfa: hoy sin plantillas (el kit del reel es motion, TASK-1924).
 *
 * El motor no cambia: la pertenencia de cada plantilla y su aprobación son DATO del registry, y los validadores de
 * `validators.ts` las hacen cumplir. Los valores (color, tipo, zonas) llegan compilados desde el token `glitchLine`
 * de AXIS (`glitch-tokens.css`); el catálogo no importa paquetes.
 */

import path from 'node:path'

import type { ArtifactCatalog, CatalogLayoutHook, CatalogSemanticValidator, OutputTarget } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import { GLITCH_COMPILED_FILES, GLITCH_PACK_EXTENSIONS, glitchCatalogDir } from './brand'
import { glitchEditionValidators } from './edition-validators'
import { glitchFractureHook } from './fracture-hook'
import { glitchResolvers } from './resolvers'
import { catalogMembershipValidator, pieceApprovalValidator, type GlitchCatalogKey } from './validators'

export { glitchCatalogDir } from './brand'

export interface GlitchCatalogOptions {
  /** Validadores extra del consumer (los de edición —rotación, esfera, crédito, rostros…— ya vienen siempre). */
  editionValidators?: CatalogSemanticValidator[]
  /** Hooks de maquetación (la falla en bytes), por plantilla. */
  layoutHooks?: Record<string, CatalogLayoutHook>
}

/** Plantillas con foto que se desarma en bytes: el hook pinta la geometría que trae el plan. */
export const GLITCH_FRACTURE_TEMPLATES = ['CoverPhoto', 'CoverMosaic', 'Interior', 'InteriorOpening', 'InteriorLens'] as const

const create = (key: GlitchCatalogKey, outputTarget: OutputTarget, options: GlitchCatalogOptions): ArtifactCatalog => ({
  name: `glitch-${key}`,
  ownerOrgId: 'efeonce',
  templatesDir: glitchCatalogDir,
  outputTarget,
  resolvers: glitchResolvers(),
  layoutHooks: { ...Object.fromEntries(GLITCH_FRACTURE_TEMPLATES.map((t) => [t, glitchFractureHook])), ...options.layoutHooks },
  semanticValidators: [catalogMembershipValidator(key), pieceApprovalValidator, ...glitchEditionValidators(key), ...(options.editionValidators ?? [])],
  brand: {
    packName: 'axis',
    compiledFiles: [...GLITCH_COMPILED_FILES],
    fontsManifestPath: path.join(axisPackDir, 'fonts.json'),
    packExtensions: GLITCH_PACK_EXTENSIONS
  }
})

export const createGlitchCarouselCatalog = (options: GlitchCatalogOptions = {}): ArtifactCatalog => create('carousel', 'pdf-merged', options)
export const createGlitchStillsCatalog = (options: GlitchCatalogOptions = {}): ArtifactCatalog => create('stills', 'png-set', options)
export const createGlitchOverlaysCatalog = (options: GlitchCatalogOptions = {}): ArtifactCatalog => create('overlays', 'png-set', options)

export const GLITCH_CATALOG_FACTORIES = {
  'glitch-carousel': createGlitchCarouselCatalog,
  'glitch-stills': createGlitchStillsCatalog,
  'glitch-overlays': createGlitchOverlaysCatalog
} as const
