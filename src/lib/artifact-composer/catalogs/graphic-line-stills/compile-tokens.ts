/**
 * Catálogo `graphic-line-stills` — font pack del brand pack `axis` con la extensión `graphic-line`
 * (Bricolage Grotesque para la respuesta, Poppins 400/500 para la voz). Los colores y medidas de La órbita
 * NO salen de aquí: los compila `pnpm brand:tokens` desde @efeoncepro/axis-tokens (`graphic-line-tokens.css`).
 */

import path from 'node:path'

import {
  buildCatalogTokensCss,
  syncPackFontBinariesTo,
  type CatalogTokensBuild,
  type PackFontEntry
} from '../../compile-catalog-tokens'
import { buildAxisBrandPack, axisPackDir } from '../../brand-packs/axis'
import { graphicLineStillsCatalog, graphicLineStillsCatalogDir } from './index'

export const GRAPHIC_LINE_STILLS_TOKENS_PATH = path.join(graphicLineStillsCatalogDir, 'deck-tokens.css')
export const GRAPHIC_LINE_STILLS_FONTS_PATH = path.join(graphicLineStillsCatalogDir, 'deck-fonts.css')

export const syncGraphicLineStillsFontBinaries = (fonts: PackFontEntry[]): void => {
  syncPackFontBinariesTo(graphicLineStillsCatalogDir, axisPackDir, fonts)
}

export const buildGraphicLineStillsTokensCss = (): CatalogTokensBuild =>
  buildCatalogTokensCss({
    catalogDir: graphicLineStillsCatalogDir,
    catalogName: 'graphic-line-stills',
    packDir: axisPackDir,
    rolePrefix: 'axis-deck',
    pack: buildAxisBrandPack(),
    packExtensions: graphicLineStillsCatalog.brand?.packExtensions
  })
