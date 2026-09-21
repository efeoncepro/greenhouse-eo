/**
 * Catálogo `insights-report` — composición del CSS de tokens.
 *
 * Consume la MISMA compilación que el catálogo comercial (`../../compile-catalog-tokens`) con el
 * mismo brand pack. Es deliberado: el cliente puede recibir un deck y un informe la misma semana,
 * y dos compilaciones separadas serían dos marcas en cuanto una se toque.
 *
 * Este catálogo todavía no declara gradient recipes propias — las recipes son del catálogo, no del
 * pack, y un catálogo sin ninguna es un catálogo que aún no las necesita, no un error.
 */

import path from 'node:path'

import {
  buildCatalogTokensCss,
  syncPackFontBinariesTo,
  type CatalogTokensBuild,
  type PackFontEntry
} from '../../compile-catalog-tokens'
import { buildAxisBrandPack, axisPackDir } from '../../brand-packs/axis'
import { insightsReportCatalogDir } from './index'

export const REPORT_TOKENS_PATH = path.join(insightsReportCatalogDir, 'report-tokens.css')
export const REPORT_FONTS_PATH = path.join(insightsReportCatalogDir, 'report-fonts.css')

export type InsightsReportTokensBuild = CatalogTokensBuild

export const syncReportFontBinaries = (fonts: PackFontEntry[]): void => {
  syncPackFontBinariesTo(insightsReportCatalogDir, axisPackDir, fonts)
}

export const buildInsightsReportTokensCss = (): InsightsReportTokensBuild =>
  buildCatalogTokensCss({
    catalogDir: insightsReportCatalogDir,
    catalogName: 'insights-report',
    packDir: axisPackDir,
    rolePrefix: 'axis-report',
    pack: buildAxisBrandPack()
  })
