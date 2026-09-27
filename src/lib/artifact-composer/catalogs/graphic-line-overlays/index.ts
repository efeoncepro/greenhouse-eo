/**
 * Catálogo `graphic-line-overlays` — capas de «La órbita» para producción audiovisual: cartela, zócalo,
 * llamada con selección, dato, pantalla dividida y subtítulos. Un PNG por capa, con FONDO TRANSPARENTE
 * (`render.background: "transparent"` en cada plantilla) para montarlo sobre el plano en el editor. El plan
 * de planos es la única plantilla opaca (TASK-1919).
 *
 * El texto nunca se genera dentro de la toma: se compone aquí, en las reservas planeadas del plano. El
 * cierre con el reveal es video y sale del pipeline de motion, no de este catálogo.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog, CatalogLayoutHook } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import type { GraphicLineCatalogOptions } from '../graphic-line-shared/options'
import { graphicLineResolvers } from '../graphic-line-shared/resolvers'

export const graphicLineOverlaysCatalogDir = path.dirname(fileURLToPath(import.meta.url))

export const createCatalog = (options: GraphicLineCatalogOptions = {}): ArtifactCatalog => {
  void options

  const layoutHooks: Record<string, CatalogLayoutHook> = {}

  return {
    name: 'graphic-line-overlays',
    ownerOrgId: 'efeonce',
    templatesDir: graphicLineOverlaysCatalogDir,
    outputTarget: 'png-set',
    resolvers: graphicLineResolvers(),
    layoutHooks,
    brand: {
      packName: 'axis',
      compiledFiles: ['deck-fonts.css', 'graphic-line-tokens.css'],
      fontsManifestPath: path.join(axisPackDir, 'fonts.json'),
      packExtensions: ['graphic-line']
    }
  }
}

export const graphicLineOverlaysCatalog = createCatalog()
