/**
 * Catálogos de Marketing con Manzanitas — font pack del brand pack `axis` con la extensión `manzanitas` (Bricolage
 * variable y Poppins 400/500; la base aporta Poppins 300 y 600–900 con itálicas). Una sola carpeta para los dos
 * catálogos, así que se compila una vez. Los colores y medidas del registro NO salen de aquí: los compila
 * `pnpm manzanitas:tokens` desde `manzanitasRegister` (`manzanitas-tokens.css`).
 */

import path from 'node:path'

import {
  buildCatalogTokensCss,
  syncPackFontBinariesTo,
  type CatalogTokensBuild,
  type PackFontEntry
} from '../../compile-catalog-tokens'
import { buildAxisBrandPack, axisPackDir } from '../../brand-packs/axis'
import { MANZANITAS_PACK_EXTENSIONS, manzanitasCatalogDir } from './brand'

export const MANZANITAS_TOKENS_PATH = path.join(manzanitasCatalogDir, 'deck-tokens.css')
export const MANZANITAS_FONTS_PATH = path.join(manzanitasCatalogDir, 'deck-fonts.css')

export const syncManzanitasFontBinaries = (fonts: PackFontEntry[]): void => {
  syncPackFontBinariesTo(manzanitasCatalogDir, axisPackDir, fonts)
}

export const buildManzanitasTokensCss = (): CatalogTokensBuild =>
  buildCatalogTokensCss({
    catalogDir: manzanitasCatalogDir,
    catalogName: 'manzanitas',
    packDir: axisPackDir,
    rolePrefix: 'axis-deck',
    pack: buildAxisBrandPack(),
    packExtensions: MANZANITAS_PACK_EXTENSIONS
  })
