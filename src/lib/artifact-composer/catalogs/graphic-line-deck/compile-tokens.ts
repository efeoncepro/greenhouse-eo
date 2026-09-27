/**
 * Catálogo `graphic-line-deck` — font pack del brand pack `axis` con la extensión `graphic-line`
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
import { graphicLineDeckCatalog, graphicLineDeckCatalogDir } from './index'

export const GRAPHIC_LINE_DECK_TOKENS_PATH = path.join(graphicLineDeckCatalogDir, 'deck-tokens.css')
export const GRAPHIC_LINE_DECK_FONTS_PATH = path.join(graphicLineDeckCatalogDir, 'deck-fonts.css')

export const syncGraphicLineDeckFontBinaries = (fonts: PackFontEntry[]): void => {
  syncPackFontBinariesTo(graphicLineDeckCatalogDir, axisPackDir, fonts)
}

export const buildGraphicLineDeckTokensCss = (): CatalogTokensBuild =>
  buildCatalogTokensCss({
    catalogDir: graphicLineDeckCatalogDir,
    catalogName: 'graphic-line-deck',
    packDir: axisPackDir,
    rolePrefix: 'axis-deck',
    pack: buildAxisBrandPack(),
    packExtensions: graphicLineDeckCatalog.brand?.packExtensions
  })
