/**
 * Compilación de los tokens de marca de UN catálogo. DOMAIN-FREE.
 *
 * La marca se compila UNA VEZ desde el brand pack y se materializa por catálogo. No es un detalle
 * de build: dos catálogos que compilan su propia marca por separado son dos marcas que divergen en
 * cuanto una se toca, y el mismo cliente puede recibir un deck y un informe la misma semana. La
 * cohesión entre artefactos que conviven frente a un lector es señal de rigor; la divergencia se
 * lee como collage.
 *
 * Esta función nació como `buildDeckAxisTokensCss`, atada al primer catálogo del repo. El segundo
 * catálogo la destapó: mientras hubo uno solo, "el catálogo es dato" nunca se puso a prueba en esta
 * frontera. El catálogo sigue aportando lo suyo —sus gradient recipes— pero la marca y la
 * tipografía vienen del pack.
 */

import fs from 'node:fs'
import path from 'node:path'

import { compileBrandPack, type BrandPack, type ContrastFinding } from './brand-pack'
import { compileGradientRecipes, type GradientRecipesFile } from './gradient-recipes'

export interface PackFontEntry {
  family: string
  weight: number
  style: 'normal' | 'italic'
  file: string
  sha256: string
  license: string
  embedRights: boolean
}

export interface CatalogTokensBuild {
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

export interface CatalogTokensOptions {
  /** Home del catálogo: dónde se materializan el CSS y los binarios. */
  readonly catalogDir: string

  /** Nombre del catálogo, sólo para el comentario del archivo generado. */
  readonly catalogName: string

  /** Dir del brand pack que aporta colores, roles y fuentes. */
  readonly packDir: string

  /** Prefijo de las custom properties (`--<rolePrefix>-role-*`). */
  readonly rolePrefix: string

  /** El pack ya construido. */
  readonly pack: BrandPack

  /**
   * Recetas de gradiente del catálogo. Son del CATÁLOGO, no del pack: un catálogo nuevo puede no
   * tener ninguna, y eso no es un error — es un catálogo que todavía no las necesita.
   */
  readonly gradientRecipesPath?: string
}

/**
 * La TIPOGRAFÍA es marca: el font pack vive en el BRAND PACK, no en el catálogo. El compilador lo
 * materializa dentro del catálogo (CSS + binarios copiados) para que el render sea hermético — sin
 * red, sin Google Fonts, sin fallback silencioso.
 */
const buildFontsCss = (packDir: string): { fontsCss: string; fonts: PackFontEntry[] } => {
  const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'fonts.json'), 'utf8')) as {
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
export const syncPackFontBinariesTo = (catalogDir: string, packDir: string, fonts: PackFontEntry[]): void => {
  const targetDir = path.join(catalogDir, 'fonts')

  fs.mkdirSync(targetDir, { recursive: true })

  for (const font of fonts) {
    fs.copyFileSync(path.join(packDir, font.file), path.join(catalogDir, font.file))
  }
}

export const buildCatalogTokensCss = (options: CatalogTokensOptions): CatalogTokensBuild => {
  const compiled = compileBrandPack(options.pack, { rolePrefix: options.rolePrefix })
  const { fontsCss, fonts } = buildFontsCss(options.packDir)

  // Type-family roles del pack: una plantilla pide el ROL (display/text), nunca 'Poppins'.
  const typeRoleLines = [
    `  --${options.rolePrefix}-type-display: 'Poppins', sans-serif;`,
    `  --${options.rolePrefix}-type-text: 'Geist', sans-serif;`
  ]

  const recipesBlock = (() => {
    if (!options.gradientRecipesPath) return ''

    const recipesFile = JSON.parse(
      fs.readFileSync(options.gradientRecipesPath, 'utf8')
    ) as GradientRecipesFile

    const recipeLines = compileGradientRecipes(recipesFile, {
      rolePrefix: options.rolePrefix,
      recipePrefix: options.rolePrefix
    })

    return `\n\n  /* Gradient recipes del catálogo ${options.catalogName} (gradient-recipes.json v${recipesFile.version}) */\n${recipeLines.join('\n')}`
  })()

  const css = compiled.css.replace(
    /\n\}\n$/,
    `\n\n  /* Type-family roles del brand pack (la tipografía ES marca) */\n${typeRoleLines.join('\n')}${recipesBlock}\n}\n`
  )

  return {
    css,
    fontsCss,
    fonts,
    contrastFindings: compiled.contrastFindings,
    packName: options.pack.name,
    contrastEnforcement: options.pack.contrastEnforcement
  }
}
