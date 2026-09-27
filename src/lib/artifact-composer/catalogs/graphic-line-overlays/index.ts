/**
 * Catálogo `graphic-line-overlays` — capas de «La órbita» para producción audiovisual: cartela, zócalo,
 * llamada con selección, dato, pantalla dividida y subtítulos. Un PNG por capa, con FONDO TRANSPARENTE
 * (`render.background: "transparent"` en cada plantilla) para montarlo sobre el plano en el editor. Son opacas
 * la pantalla dividida (sus dos planos SON la composición) y el plan de planos, que es una hoja (TASK-1919).
 *
 * El texto nunca se genera dentro de la toma: se compone aquí, en las reservas planeadas del plano. El
 * cierre con el reveal es video y sale del pipeline de motion, no de este catálogo.
 *
 * Selección colaborativa: la cartela la lleva sobre la respuesta (texto → hook compartido); el zócalo sobre el
 * grupo entero y la llamada sobre un objeto del plano (caja). Las tres usan el hook compartido, que mide texto o caja
 * según el `targetKind` del plan; la pintura la inyecta el consumidor, porque el motor no importa paquetes.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog, CatalogLayoutHook } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import type { GraphicLineCatalogOptions } from '../graphic-line-shared/options'
import { graphicLineResolvers } from '../graphic-line-shared/resolvers'
import { makeSelectionHook } from '../graphic-line-shared/selection-hook'

export const graphicLineOverlaysCatalogDir = path.dirname(fileURLToPath(import.meta.url))

/** Plantillas con selección colaborativa: la cartela sobre texto; el zócalo y la llamada sobre una caja. */
const TEMPLATES_WITH_SELECTION = ['Cartela', 'Zocalo', 'CalloutSelection'] as const

export const createCatalog = (options: GraphicLineCatalogOptions = {}): ArtifactCatalog => {
  const selection = makeSelectionHook(options.selectionPainter)
  const layoutHooks: Record<string, CatalogLayoutHook> = {}

  for (const template of TEMPLATES_WITH_SELECTION) layoutHooks[template] = selection

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
