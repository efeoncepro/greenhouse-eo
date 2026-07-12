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

const main = () => {
  const check = process.argv.includes('--check')

  const { css, fontsCss, fonts, contrastFindings, packName, contrastEnforcement } = buildDeckAxisTokensCss()

  if (contrastFindings.length > 0) {
    console.log(`\n⚠️  Contraste WCAG AA (pack "${packName}", enforcement=${contrastEnforcement}):`)

    for (const finding of contrastFindings) {
      console.log(
        `  ${finding.fg} sobre ${finding.bg}: ${finding.ratio.toFixed(2)}:1 < ${finding.min}:1 — ${finding.context}`
      )
    }

    console.log('  → follow-up de diseño; un refactor no arregla una decisión de marca: la revela.\n')
  } else {
    console.log(`\n✓ Contraste WCAG AA: todos los pares declarados pasan (pack "${packName}").\n`)
  }

  if (check) {
    const committedTokens = fs.existsSync(DECK_TOKENS_PATH) ? fs.readFileSync(DECK_TOKENS_PATH, 'utf8') : ''
    const committedFonts = fs.existsSync(DECK_FONTS_PATH) ? fs.readFileSync(DECK_FONTS_PATH, 'utf8') : ''

    if (committedTokens !== css || committedFonts !== fontsCss) {
      console.error('✗ deck-tokens.css/deck-fonts.css NO sincronizados. Corré: pnpm composer:brand-pack')
      process.exit(1)
    }

    console.log('✓ deck-tokens.css + deck-fonts.css sincronizados con el pack + recipes.')

    return
  }

  fs.writeFileSync(DECK_TOKENS_PATH, css, 'utf8')
  fs.writeFileSync(DECK_FONTS_PATH, fontsCss, 'utf8')
  syncPackFontBinaries(fonts)
  console.log(`✓ tokens + recipes → ${path.relative(process.cwd(), DECK_TOKENS_PATH)}`)
  console.log(`✓ ${fonts.length} fuentes del pack → deck-fonts.css + catalogs/deck-axis/fonts/ (render hermético)`)
}

main()
