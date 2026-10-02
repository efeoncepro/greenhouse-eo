/**
 * Catálogos de Marketing con Manzanitas (TASK-1939) — sólo piezas de MCM: el registro complementa La órbita y nunca se
 * mezcla con Glitch.
 *
 * Dos catálogos delgados sobre la MISMA carpeta de plantillas, porque la misma pieza sale en dos destinos y un catálogo
 * declara un solo `outputTarget`:
 *   - `manzanitas-carousel` → `pdf-merged`: el documento del carrusel (portada, interiores, gráficos, cierre).
 *   - `manzanitas-stills`   → `png-set`: las láminas sueltas del carrusel, la story, el banner del blog, YouTube y pódcast.
 *
 * El motor no cambia: la pertenencia de cada plantilla y su aprobación son DATO del registry. Los valores llegan
 * compilados desde el token `manzanitasRegister` de AXIS (`manzanitas-tokens.css`); el catálogo no importa paquetes, y
 * los gráficos los pinta el `chartPainter` que inyecta quien compone.
 */

import path from 'node:path'

import type { ArtifactCatalog, CatalogLayoutHook, OutputTarget } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import { MANZANITAS_COMPILED_FILES, MANZANITAS_PACK_EXTENSIONS, manzanitasCatalogDir } from './brand'
import { makeManzanitasChartHook, type ManzanitasChartPainter } from './chart-hook'
import { manzanitasResolvers } from './resolvers'
import { MANZANITAS_SLOGAN_TEMPLATES, manzanitasSloganHook } from './slogan-hook'
import { catalogMembershipValidator, pieceApprovalValidator, singleLineValidator, type ManzanitasCatalogKey } from './validators'

export { manzanitasCatalogDir, MANZANITAS_LINES, type ManzanitasLine } from './brand'
export { parseChartRequest, type ManzanitasChartPainter, type ManzanitasChartRequest } from './chart-hook'
export { MANZANITAS_SLOGAN_TEMPLATES } from './slogan-hook'

export interface ManzanitasCatalogOptions {
  /** Pinta los gráficos (`manzanitasChartSvg`); sin él, una lámina de gráfico falla cerrada. */
  chartPainter?: ManzanitasChartPainter
}

/** Plantillas con gráfico: el hook pinta la receta desde el dato. */
export const MANZANITAS_CHART_TEMPLATES = ['ChartVoice', 'ChartQuestion'] as const

const create = (key: ManzanitasCatalogKey, outputTarget: OutputTarget, options: ManzanitasCatalogOptions): ArtifactCatalog => {
  const chartHook: CatalogLayoutHook = makeManzanitasChartHook(options.chartPainter)

  return {
    name: `manzanitas-${key}`,
    ownerOrgId: 'efeonce',
    templatesDir: manzanitasCatalogDir,
    outputTarget,
    resolvers: manzanitasResolvers(),
    layoutHooks: {
      ...Object.fromEntries(MANZANITAS_CHART_TEMPLATES.map((t) => [t, chartHook])),
      ...Object.fromEntries(MANZANITAS_SLOGAN_TEMPLATES.map((t) => [t, manzanitasSloganHook]))
    },
    semanticValidators: [catalogMembershipValidator(key), pieceApprovalValidator, singleLineValidator],
    brand: {
      packName: 'axis',
      compiledFiles: [...MANZANITAS_COMPILED_FILES],
      fontsManifestPath: path.join(axisPackDir, 'fonts.json'),
      packExtensions: MANZANITAS_PACK_EXTENSIONS
    }
  }
}

export const createManzanitasCarouselCatalog = (options: ManzanitasCatalogOptions = {}): ArtifactCatalog => create('carousel', 'pdf-merged', options)
export const createManzanitasStillsCatalog = (options: ManzanitasCatalogOptions = {}): ArtifactCatalog => create('stills', 'png-set', options)

export const MANZANITAS_CATALOG_FACTORIES = {
  'manzanitas-carousel': createManzanitasCarouselCatalog,
  'manzanitas-stills': createManzanitasStillsCatalog
} as const
