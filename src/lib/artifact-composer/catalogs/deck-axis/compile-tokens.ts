/**
 * Catálogo `deck-axis` — composición del CSS de tokens (TASK-1393 Slices 3b/3c).
 *
 * deck-tokens.css = brand pack `axis` compilado (colores + roles) + las gradient recipes del
 * catálogo. UNA función la produce y DOS consumers la usan: el script `pnpm composer:brand-pack`
 * (escribe/verifica el archivo committeado) y `brand-pack-sync.test.ts` (rompe el build si el
 * archivo diverge). Si script y test compusieran por separado, la sincronía sería una promesa.
 *
 * Desde TASK-1847 la compilación es genérica (`../../compile-catalog-tokens`) y este módulo sólo
 * aporta los valores de ESTE catálogo. El segundo catálogo del repo destapó que la tubería estaba
 * atada al primero: mientras hubo uno solo, "el catálogo es dato" no se probó en esta frontera.
 * La marca se compila una vez y se materializa por catálogo — dos compilaciones serían dos marcas.
 */

import path from 'node:path'

import {
  buildCatalogTokensCss,
  syncPackFontBinariesTo,
  type CatalogTokensBuild,
  type PackFontEntry
} from '../../compile-catalog-tokens'
import { buildAxisBrandPack, axisPackDir } from '../../brand-packs/axis'
import { deckAxisCatalogDir } from './index'

export { FontEmbedRightsError, type PackFontEntry } from '../../compile-catalog-tokens'

export const DECK_TOKENS_PATH = path.join(deckAxisCatalogDir, 'deck-tokens.css')
export const DECK_FONTS_PATH = path.join(deckAxisCatalogDir, 'deck-fonts.css')
export const GRADIENT_RECIPES_PATH = path.join(deckAxisCatalogDir, 'brand', 'gradient-recipes.json')

export type DeckAxisTokensBuild = CatalogTokensBuild

/** Copia los binarios del pack al catálogo (el catálogo es autocontenido — lección del Slice 1b). */
export const syncPackFontBinaries = (fonts: PackFontEntry[]): void => {
  syncPackFontBinariesTo(deckAxisCatalogDir, axisPackDir, fonts)
}

export const buildDeckAxisTokensCss = (): DeckAxisTokensBuild =>
  buildCatalogTokensCss({
    catalogDir: deckAxisCatalogDir,
    catalogName: 'deck-axis',
    packDir: axisPackDir,
    rolePrefix: 'axis-deck',
    pack: buildAxisBrandPack(),
    gradientRecipesPath: GRADIENT_RECIPES_PATH
  })
