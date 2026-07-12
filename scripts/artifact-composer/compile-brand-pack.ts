/**
 * Compilador del brand pack → CSS del catálogo (TASK-1393 Slice 3b).
 *
 *   pnpm composer:brand-pack            # compila brand-packs/axis → catalogs/deck-axis/deck-tokens.css
 *   pnpm composer:brand-pack --check    # falla si el CSS committeado no está sincronizado
 *
 * Gobernado como SCRIPT EXPLÍCITO del repo (no prebuild): el CSS generado se COMMITEA con el
 * catálogo y `__tests__/brand-pack-sync.test.ts` verifica la sincronía en CI. El renderer sigue
 * hermético: nunca depende de Figma ni de un paso de build paralelo.
 *
 * El reporte de contraste WCAG se imprime SIEMPRE. Para `axis` es advisory (las violaciones salen
 * como follow-up de diseño, no bloquean el refactor); un pack `blocking` habría abortado adentro
 * del compilador.
 */

import fs from 'node:fs'
import path from 'node:path'

import { compileBrandPack } from '@/lib/artifact-composer/brand-pack'
import { buildAxisBrandPack } from '@/lib/artifact-composer/brand-packs/axis'
import { deckAxisCatalogDir } from '@/lib/artifact-composer/catalogs/deck-axis'

const OUT_PATH = path.join(deckAxisCatalogDir, 'deck-tokens.css')

const main = () => {
  const check = process.argv.includes('--check')

  const pack = buildAxisBrandPack()
  const { css, contrastFindings } = compileBrandPack(pack, { rolePrefix: 'axis-deck' })

  if (contrastFindings.length > 0) {
    console.log(`\n⚠️  Contraste WCAG AA (pack "${pack.name}", enforcement=${pack.contrastEnforcement}):`)

    for (const finding of contrastFindings) {
      console.log(
        `  ${finding.fg} sobre ${finding.bg}: ${finding.ratio.toFixed(2)}:1 < ${finding.min}:1 — ${finding.context}`
      )
    }

    console.log('  → follow-up de diseño; un refactor no arregla una decisión de marca: la revela.\n')
  } else {
    console.log(`\n✓ Contraste WCAG AA: todos los pares declarados pasan (pack "${pack.name}").\n`)
  }

  if (check) {
    const committed = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : ''

    if (committed !== css) {
      console.error('✗ deck-tokens.css NO está sincronizado con el pack. Corré: pnpm composer:brand-pack')
      process.exit(1)
    }

    console.log('✓ deck-tokens.css sincronizado con el pack.')

    return
  }

  fs.writeFileSync(OUT_PATH, css, 'utf8')
  console.log(`✓ ${pack.colors.length} colores + ${pack.roles.length} roles → ${path.relative(process.cwd(), OUT_PATH)}`)
}

main()
