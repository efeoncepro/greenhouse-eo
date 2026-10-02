/**
 * Catálogos de Glitch — font pack del brand pack `axis` con la extensión `glitch` (Bricolage variable 200–800,
 * Poppins 400/500 y Guttery; la base aporta Poppins 300/600/700/800/900). Una sola carpeta para los tres catálogos,
 * así que se compila una vez. Los colores y medidas de Glitch NO salen de aquí: los compila `pnpm glitch:tokens`
 * desde `glitchLine` (`glitch-tokens.css`).
 */

import path from 'node:path'

import {
  buildCatalogTokensCss,
  syncPackFontBinariesTo,
  type CatalogTokensBuild,
  type PackFontEntry
} from '../../compile-catalog-tokens'
import { buildAxisBrandPack, axisPackDir } from '../../brand-packs/axis'
import { GLITCH_PACK_EXTENSIONS, glitchCatalogDir } from './brand'

export const GLITCH_TOKENS_PATH = path.join(glitchCatalogDir, 'deck-tokens.css')
export const GLITCH_FONTS_PATH = path.join(glitchCatalogDir, 'deck-fonts.css')

export const syncGlitchFontBinaries = (fonts: PackFontEntry[]): void => {
  syncPackFontBinariesTo(glitchCatalogDir, axisPackDir, fonts)
}

export const buildGlitchTokensCss = (): CatalogTokensBuild =>
  buildCatalogTokensCss({
    catalogDir: glitchCatalogDir,
    catalogName: 'glitch',
    packDir: axisPackDir,
    rolePrefix: 'axis-deck',
    pack: buildAxisBrandPack(),
    packExtensions: GLITCH_PACK_EXTENSIONS
  })
