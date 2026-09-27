/**
 * Catálogo `graphic-line-deck` — láminas 16:9 de «La órbita» para decks de marca propia Efeonce (TASK-1919).
 *
 * Existe porque la línea gráfica se compone por SUPERFICIE (contrato `efeonce.surface-composition` de AXIS)
 * y el deck es una de ellas. No vive en `deck-axis`: ése es el catálogo de las ofertas a comité, con su
 * molde, sus presupuestos de slot y el baseline del deck SKY; mezclar ahí el fondo Efeonce, la voz con
 * esfera y las fotos de cine degradaría lo que ese catálogo protege.
 *
 * Sólo tiene plantilla una receta APROBADA por el operador. El contentType es `deck.<receta>` y lo
 * deriva `src/lib/brand-surfaces` desde el manifest de AXIS: un autor nunca elige plantilla.
 *
 * La selección colaborativa necesita medir el DOM ya lleno, así que es un layout hook; su pintura la
 * INYECTA el consumidor (el adaptador de Greenhouse), porque el motor no importa paquetes.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog, CatalogLayoutHook } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import { graphicLineResolvers } from '../graphic-line-shared/resolvers'
import type { GraphicLineCatalogOptions } from '../graphic-line-shared/options'
import { makeSelectionHook } from '../graphic-line-shared/selection-hook'

export const graphicLineDeckCatalogDir = path.dirname(fileURLToPath(import.meta.url))

/** Plantillas que pueden llevar selección colaborativa sobre la respuesta. */
const TEMPLATES_WITH_SELECTION = ['ProposalCinematic'] as const

export const createCatalog = (options: GraphicLineCatalogOptions = {}): ArtifactCatalog => {
  const selectionHook = makeSelectionHook(options.selectionPainter)
  const layoutHooks: Record<string, CatalogLayoutHook> = {}

  for (const template of TEMPLATES_WITH_SELECTION) layoutHooks[template] = selectionHook

  return {
    name: 'graphic-line-deck',
    ownerOrgId: 'efeonce',
    templatesDir: graphicLineDeckCatalogDir,
    outputTarget: 'pdf-merged',
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

/** El catálogo sin painter: sirve para resolver planes y para láminas sin selección. */
export const graphicLineDeckCatalog = createCatalog()
