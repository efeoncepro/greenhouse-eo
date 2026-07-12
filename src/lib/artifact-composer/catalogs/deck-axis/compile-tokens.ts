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
import { buildAxisBrandPack, axisPackDir } from '../../brand-packs/axis'
import { compileGradientRecipes, type GradientRecipesFile } from '../../gradient-recipes'
import { deckAxisCatalogDir } from './index'

export const DECK_TOKENS_PATH = path.join(deckAxisCatalogDir, 'deck-tokens.css')
export const DECK_FONTS_PATH = path.join(deckAxisCatalogDir, 'deck-fonts.css')
export const GRADIENT_RECIPES_PATH = path.join(deckAxisCatalogDir, 'brand', 'gradient-recipes.json')

export interface PackFontEntry {
  family: string
  weight: number
  style: 'normal' | 'italic'
  file: string
  sha256: string
  license: string
  embedRights: boolean
}

export interface DeckAxisTokensBuild {
  css: string
  fontsCss: string
  fonts: PackFontEntry[]
  contrastFindings: ContrastFinding[]
  packName: string
  contrastEnforcement: 'advisory' | 'blocking'
}

export class FontEmbedRightsError extends Error {
  constructor(family: string, file: string) {
    super(
      `La fuente "${family}" (${file}) no declara derecho de embebido (embedRights). ` +
        `Un pack no puede embeber una fuente sin derecho — es un problema LEGAL, no técnico: falla al compilar.`
    )
    this.name = 'FontEmbedRightsError'
  }
}

/**
 * La TIPOGRAFÍA es marca: el font pack vive en el BRAND PACK (`brand-packs/axis/fonts/`), no en el
 * catálogo. El compilador lo materializa dentro del catálogo (deck-fonts.css + binarios copiados)
 * para que el render sea hermético — sin red, sin Google Fonts, sin fallback silencioso.
 */
const buildFontsCss = (): { fontsCss: string; fonts: PackFontEntry[] } => {
  const manifest = JSON.parse(fs.readFileSync(path.join(axisPackDir, 'fonts.json'), 'utf8')) as {
    fonts: PackFontEntry[]
  }

  const lines: string[] = [
    '/**',
    ' * GENERADO — NO EDITAR A MANO.',
    ' * Font pack del brand pack "axis" (brand-packs/axis/fonts.json) compilado por',
    ' * `pnpm composer:brand-pack`. Fuentes locales con licencia y checksum declarados:',
    ' * el render bloquea la red — un @import de Google Fonts acá es una regresión.',
    ' */'
  ]

  for (const font of manifest.fonts) {
    if (!font.embedRights) {
      throw new FontEmbedRightsError(font.family, font.file)
    }

    lines.push(
      '@font-face {',
      `  font-family: '${font.family}';`,
      `  font-style: ${font.style};`,
      `  font-weight: ${font.weight};`,
      `  font-display: block;`,
      `  src: url('${font.file}') format('truetype');`,
      '}'
    )
  }

  return { fontsCss: `${lines.join('\n')}\n`, fonts: manifest.fonts }
}

/** Copia los binarios del pack al catálogo (el catálogo es autocontenido — lección del Slice 1b). */
export const syncPackFontBinaries = (fonts: PackFontEntry[]): void => {
  const targetDir = path.join(deckAxisCatalogDir, 'fonts')

  fs.mkdirSync(targetDir, { recursive: true })

  for (const font of fonts) {
    fs.copyFileSync(path.join(axisPackDir, font.file), path.join(deckAxisCatalogDir, font.file))
  }
}

export const buildDeckAxisTokensCss = (): DeckAxisTokensBuild => {
  const pack = buildAxisBrandPack()
  const compiled = compileBrandPack(pack, { rolePrefix: 'axis-deck' })

  const recipesFile = JSON.parse(fs.readFileSync(GRADIENT_RECIPES_PATH, 'utf8')) as GradientRecipesFile
  const recipeLines = compileGradientRecipes(recipesFile, { rolePrefix: 'axis-deck', recipePrefix: 'axis-deck' })
  const { fontsCss, fonts } = buildFontsCss()

  // Type-family roles del pack: una plantilla pide el ROL (display/text), nunca 'Poppins'.
  const typeRoleLines = [
    `  --axis-deck-type-display: 'Poppins', sans-serif;`,
    `  --axis-deck-type-text: 'Geist', sans-serif;`
  ]

  const css = compiled.css.replace(
    /\n\}\n$/,
    `\n\n  /* Type-family roles del brand pack (la tipografía ES marca) */\n${typeRoleLines.join('\n')}\n\n  /* Gradient recipes del catálogo deck-axis (gradient-recipes.json v${recipesFile.version}) */\n${recipeLines.join('\n')}\n}\n`
  )

  return {
    css,
    fontsCss,
    fonts,
    contrastFindings: compiled.contrastFindings,
    packName: pack.name,
    contrastEnforcement: pack.contrastEnforcement
  }
}
