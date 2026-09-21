/**
 * Catálogo `insights-deck` — tokens de marca.
 *
 * Misma compilación y mismo brand pack que el informe A4 y que el catálogo comercial: el cliente
 * puede recibir un deck y un informe la misma semana, y dos compilaciones serían dos marcas.
 */

import path from 'node:path'

import {
  buildCatalogTokensCss,
  syncPackFontBinariesTo,
  type CatalogTokensBuild,
  type PackFontEntry
} from '../../compile-catalog-tokens'
import { buildAxisBrandPack, axisPackDir } from '../../brand-packs/axis'
import { insightsDeckCatalogDir } from './index'

export const INSIGHTS_DECK_TOKENS_PATH = path.join(insightsDeckCatalogDir, 'deck-tokens.css')
export const INSIGHTS_DECK_FONTS_PATH = path.join(insightsDeckCatalogDir, 'deck-fonts.css')

export type InsightsDeckTokensBuild = CatalogTokensBuild

export const syncInsightsDeckFontBinaries = (fonts: PackFontEntry[]): void => {
  syncPackFontBinariesTo(insightsDeckCatalogDir, axisPackDir, fonts)
}

export const buildInsightsDeckTokensCss = (): InsightsDeckTokensBuild =>
  buildCatalogTokensCss({
    catalogDir: insightsDeckCatalogDir,
    catalogName: 'insights-deck',
    packDir: axisPackDir,
    rolePrefix: 'axis-deck',
    pack: buildAxisBrandPack()
  })
