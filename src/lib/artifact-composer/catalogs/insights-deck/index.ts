/**
 * Catálogo `insights-deck` — deck ejecutivo 16:9 de Efeonce Insights (TASK-1847).
 *
 * Existe porque el deck de un informe no es una propuesta comercial. Hasta ahora Insights componía
 * con `deck-axis`, y eso traía tres problemas medidos: su portada `CoverFull` imprime «Propuesta
 * Técnica» —vocabulario de una oferta, no de un informe—, sus presupuestos de slot están
 * dimensionados para copy de licitación (`kpis.value` 8, `title` 32) y el copy de un plan editorial
 * congelado los excede, y relajarlos allá degradaría los decks comerciales que ese catálogo protege.
 *
 * Comparte con el informe A4 lo que debe compartir: el brand pack, su compilación y la geometría de
 * gráficos. Lo que no comparte es el molde — una lámina que se proyecta y una hoja que se lee a
 * treinta centímetros no tienen la misma densidad ni la misma tipografía.
 *
 * Pie: SÓLO la URL bubble. El pie completo con dirección y teléfono es de los informes escritos
 * (`EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`, distinción de formato del 2026-09-04).
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import { makeColumnsHook, makeLinesHook, withDeckFigureSize } from '../insights-shared/figure-hooks'
import { DECK_COLUMNS_BOX, DECK_LINES_BOX } from '../insights-shared/figure-svg'
import { makeChapterNumeralHook } from '../insights-shared/layout-hooks'
import { insightsDeckResolvers } from './resolvers'

export const insightsDeckCatalogDir = path.dirname(fileURLToPath(import.meta.url))

export const insightsDeckCatalog: ArtifactCatalog = {
  name: 'insights-deck',
  ownerOrgId: 'efeonce',
  templatesDir: insightsDeckCatalogDir,
  outputTarget: 'pdf-merged',
  resolvers: insightsDeckResolvers,
  layoutHooks: {
    InsightsChapterSlide: makeChapterNumeralHook(1330),
    InsightsFigureComparisonSlide: withDeckFigureSize(),
    InsightsFigureColumnsSlide: withDeckFigureSize(makeColumnsHook(DECK_COLUMNS_BOX)),
    InsightsFigureTargetsSlide: withDeckFigureSize(),
    InsightsFigureTrendSlide: withDeckFigureSize(makeLinesHook(DECK_LINES_BOX))
  },
  brand: {
    packName: 'axis',
    compiledFiles: ['deck-tokens.css', 'deck-fonts.css'],
    fontsManifestPath: path.join(axisPackDir, 'fonts.json'),
    packExtensions: ['editorial']
  }
}
