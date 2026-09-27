/**
 * Catálogo `graphic-line-stills` — piezas fijas de «La órbita» en web (hero de escritorio y teléfono), DOOH
 * (caminero) y motion (storyboard y el último cuadro del loop, que es su estático de respaldo). Un PNG por
 * pieza; cada plantilla declara su propio lienzo en su `*.slots.json` (TASK-1919).
 *
 * Sólo tiene plantilla una receta APROBADA. El video no se compone aquí: la animación la produce el
 * pipeline de motion (`orbit:video`) y este catálogo entrega los cuadros fijos de la pieza.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog, CatalogLayoutHook } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import type { GraphicLineCatalogOptions } from '../graphic-line-shared/options'
import { graphicLineResolvers } from '../graphic-line-shared/resolvers'

export const graphicLineStillsCatalogDir = path.dirname(fileURLToPath(import.meta.url))

export const createCatalog = (options: GraphicLineCatalogOptions = {}): ArtifactCatalog => {
  void options

  const layoutHooks: Record<string, CatalogLayoutHook> = {}

  return {
    name: 'graphic-line-stills',
    ownerOrgId: 'efeonce',
    templatesDir: graphicLineStillsCatalogDir,
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

export const graphicLineStillsCatalog = createCatalog()
