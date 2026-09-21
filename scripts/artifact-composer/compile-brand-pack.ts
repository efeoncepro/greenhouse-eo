/**
 * Compilador del brand pack + recipes → CSS del catálogo (TASK-1393 Slices 3b/3c).
 *
 *   pnpm composer:brand-pack            # compila axis + recipes → catalogs/deck-axis/deck-tokens.css
 *   pnpm composer:brand-pack --check    # falla si el CSS committeado no está sincronizado
 *
 * Gobernado como SCRIPT EXPLÍCITO del repo (no prebuild): el CSS generado se COMMITEA con el
 * catálogo y `__tests__/brand-pack-sync.test.ts` verifica la sincronía en CI (misma función de
 * composición: `buildDeckAxisTokensCss`). El renderer sigue hermético: nunca depende de Figma ni
 * de un paso de build paralelo.
 *
 * El reporte de contraste WCAG se imprime SIEMPRE. Para `axis` es advisory (las violaciones salen
 * como follow-up de diseño, no bloquean el refactor); un pack `blocking` habría abortado adentro
 * del compilador.
 */

import fs from 'node:fs'
import path from 'node:path'

import {
  buildDeckAxisTokensCss,
  syncPackFontBinaries,
  DECK_FONTS_PATH,
  DECK_TOKENS_PATH
} from '@/lib/artifact-composer/catalogs/deck-axis/compile-tokens'
import {
  buildInsightsReportTokensCss,
  syncReportFontBinaries,
  REPORT_FONTS_PATH,
  REPORT_TOKENS_PATH
} from '@/lib/artifact-composer/catalogs/insights-report/compile-tokens'
import {
  buildInsightsDeckTokensCss,
  syncInsightsDeckFontBinaries,
  INSIGHTS_DECK_FONTS_PATH,
  INSIGHTS_DECK_TOKENS_PATH
} from '@/lib/artifact-composer/catalogs/insights-deck/compile-tokens'
import type { CatalogTokensBuild, PackFontEntry } from '@/lib/artifact-composer/compile-catalog-tokens'

/**
 * Los catálogos que compilan marca. La lista es explícita a propósito: un catálogo nuevo se
 * agrega acá o su CSS no existe — y el test de sincronía lo delata. Desde TASK-1847 son dos, y por
 * eso el script dejó de estar atado al primero.
 */
const CATALOGS: {
  name: string
  build: () => CatalogTokensBuild
  tokensPath: string
  fontsPath: string
  syncFonts: (fonts: PackFontEntry[]) => void
}[] = [
  {
    name: 'deck-axis',
    build: buildDeckAxisTokensCss,
    tokensPath: DECK_TOKENS_PATH,
    fontsPath: DECK_FONTS_PATH,
    syncFonts: syncPackFontBinaries
  },
  {
    name: 'insights-deck',
    build: buildInsightsDeckTokensCss,
    tokensPath: INSIGHTS_DECK_TOKENS_PATH,
    fontsPath: INSIGHTS_DECK_FONTS_PATH,
    syncFonts: syncInsightsDeckFontBinaries
  },
  {
    name: 'insights-report',
    build: buildInsightsReportTokensCss,
    tokensPath: REPORT_TOKENS_PATH,
    fontsPath: REPORT_FONTS_PATH,
    syncFonts: syncReportFontBinaries
  }
]

const compileCatalog = (catalog: (typeof CATALOGS)[number], check: boolean): boolean => {
  const { css, fontsCss, fonts, contrastFindings, packName, contrastEnforcement } = catalog.build()

  if (contrastFindings.length > 0) {
    console.log(`\n⚠️  Contraste WCAG AA (pack "${packName}", enforcement=${contrastEnforcement}, catálogo "${catalog.name}"):`)

    for (const finding of contrastFindings) {
      console.log(
        `  ${finding.fg} sobre ${finding.bg}: ${finding.ratio.toFixed(2)}:1 < ${finding.min}:1 — ${finding.context}`
      )
    }

    console.log('  → follow-up de diseño; un refactor no arregla una decisión de marca: la revela.\n')
  } else {
    console.log(`\n✓ Contraste WCAG AA: todos los pares declarados pasan (pack "${packName}", catálogo "${catalog.name}").\n`)
  }

  if (check) {
    const committedTokens = fs.existsSync(catalog.tokensPath) ? fs.readFileSync(catalog.tokensPath, 'utf8') : ''
    const committedFonts = fs.existsSync(catalog.fontsPath) ? fs.readFileSync(catalog.fontsPath, 'utf8') : ''

    if (committedTokens !== css || committedFonts !== fontsCss) {
      console.error(
        `✗ ${catalog.name}: tokens/fonts NO sincronizados. Corre: pnpm composer:brand-pack`
      )

      return false
    }

    console.log(`✓ ${catalog.name}: tokens + fonts sincronizados con el pack.`)

    return true
  }

  fs.writeFileSync(catalog.tokensPath, css, 'utf8')
  fs.writeFileSync(catalog.fontsPath, fontsCss, 'utf8')
  catalog.syncFonts(fonts)
  console.log(`✓ tokens → ${path.relative(process.cwd(), catalog.tokensPath)}`)
  console.log(`✓ ${fonts.length} fuentes del pack → ${catalog.name}/ (render hermético)`)

  return true
}

const main = () => {
  const check = process.argv.includes('--check')
  const results = CATALOGS.map(catalog => compileCatalog(catalog, check))

  if (results.some(ok => !ok)) {
    process.exit(1)
  }
}

main()
