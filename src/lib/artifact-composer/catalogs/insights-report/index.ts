/**
 * Catálogo `insights-report` — informe editorial A4 vertical de Efeonce Insights (TASK-1847).
 *
 * Un catálogo es DATO, no una rama del motor: plantillas `.html` + `registry.json` + contratos
 * `*.slots.json` + tokens compilados + assets. Este módulo sólo publica DÓNDE vive ese dato,
 * resuelto module-relative — nunca relativo al `cwd` del proceso.
 *
 * Diferencia con `deck-axis`, y la razón de que sea un catálogo aparte y no una extensión:
 *
 * 1. **Canvas y molde distintos.** A4 retrato con retícula editorial, marginalia y pie completo en
 *    cada página, frente a una lámina 16:9 con pie de sólo URL bubble.
 * 2. **Presupuestos de slot propios.** Los de `deck-axis` están dimensionados para copy de
 *    licitación; el copy de un plan editorial congelado los excede. Extender aquel catálogo
 *    obligaría a relajar budgets que hoy protegen los decks comerciales.
 * 3. **Vocabulario.** `CoverFull` imprime "Propuesta Técnica": es vocabulario de una propuesta
 *    comercial y no pertenece a un informe.
 *
 * Lo que SÍ comparte: el brand pack, su compilación y la geometría de gráficos. La marca se
 * compila una vez — dos compilaciones serían dos marcas.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import { insightsReportResolvers } from './resolvers'

export const insightsReportCatalogDir = path.dirname(fileURLToPath(import.meta.url))

export const insightsReportCatalog: ArtifactCatalog = {
  name: 'insights-report',
  ownerOrgId: 'efeonce',
  templatesDir: insightsReportCatalogDir,
  outputTarget: 'pdf-merged',
  resolvers: insightsReportResolvers,
  brand: {
    packName: 'axis',
    compiledFiles: ['report-tokens.css', 'report-fonts.css'],
    fontsManifestPath: path.join(axisPackDir, 'fonts.json')
  }
}
