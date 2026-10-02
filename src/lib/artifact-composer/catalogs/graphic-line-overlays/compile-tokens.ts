/**
 * Catálogo `graphic-line-overlays` — font pack del brand pack `axis` con la extensión `graphic-line`
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
import { graphicLineOverlaysCatalog, graphicLineOverlaysCatalogDir } from './index'

export const GRAPHIC_LINE_OVERLAYS_TOKENS_PATH = path.join(graphicLineOverlaysCatalogDir, 'deck-tokens.css')
export const GRAPHIC_LINE_OVERLAYS_FONTS_PATH = path.join(graphicLineOverlaysCatalogDir, 'deck-fonts.css')

export const syncGraphicLineOverlaysFontBinaries = (fonts: PackFontEntry[]): void => {
  syncPackFontBinariesTo(graphicLineOverlaysCatalogDir, axisPackDir, fonts)
}

export const buildGraphicLineOverlaysTokensCss = (): CatalogTokensBuild =>
  buildCatalogTokensCss({
    catalogDir: graphicLineOverlaysCatalogDir,
    catalogName: 'graphic-line-overlays',
    packDir: axisPackDir,
    rolePrefix: 'axis-deck',
    pack: buildAxisBrandPack(),
    packExtensions: graphicLineOverlaysCatalog.brand?.packExtensions
  })
