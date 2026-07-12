/**
 * Catálogo `deck-axis` — composición del CSS de tokens (TASK-1393 Slices 3b/3c).
 *
 * deck-tokens.css = brand pack `axis` compilado (colores + roles) + las gradient recipes del
 * catálogo. UNA función la produce y DOS consumers la usan: el script `pnpm composer:brand-pack`
 * (escribe/verifica el archivo committeado) y `brand-pack-sync.test.ts` (rompe el build si el
 * archivo diverge). Si script y test compusieran por separado, la sincronía sería una promesa.
 */

import fs from 'node:fs'
import path from 'node:path'

import { compileBrandPack, type ContrastFinding } from '../../brand-pack'
import { buildAxisBrandPack } from '../../brand-packs/axis'
import { compileGradientRecipes, type GradientRecipesFile } from '../../gradient-recipes'
import { deckAxisCatalogDir } from './index'

export const DECK_TOKENS_PATH = path.join(deckAxisCatalogDir, 'deck-tokens.css')
export const GRADIENT_RECIPES_PATH = path.join(deckAxisCatalogDir, 'brand', 'gradient-recipes.json')

export interface DeckAxisTokensBuild {
  css: string
  contrastFindings: ContrastFinding[]
  packName: string
  contrastEnforcement: 'advisory' | 'blocking'
}

export const buildDeckAxisTokensCss = (): DeckAxisTokensBuild => {
  const pack = buildAxisBrandPack()
  const compiled = compileBrandPack(pack, { rolePrefix: 'axis-deck' })

  const recipesFile = JSON.parse(fs.readFileSync(GRADIENT_RECIPES_PATH, 'utf8')) as GradientRecipesFile
  const recipeLines = compileGradientRecipes(recipesFile, { rolePrefix: 'axis-deck', recipePrefix: 'axis-deck' })

  const css = compiled.css.replace(
    /\n\}\n$/,
    `\n\n  /* Gradient recipes del catálogo deck-axis (gradient-recipes.json v${recipesFile.version}) */\n${recipeLines.join('\n')}\n}\n`
  )

  return {
    css,
    contrastFindings: compiled.contrastFindings,
    packName: pack.name,
    contrastEnforcement: pack.contrastEnforcement
  }
}
