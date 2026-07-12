/**
 * CLI del Tender Deck Composer — compone un deck desde un DeckPlan (JSON).
 *
 *   pnpm tsx scripts/commercial/compose-tender-deck.ts <deck-plan.json> [--out <dir>]
 *
 * Es el "resto determinista" del ADR §5-ter: NO llama a ningún LLM. Consume el `DeckPlan` que
 * producen los tres nodos de juicio (orquestador · chapter-authors · verifier) y lo materializa.
 * El mismo plan, dos veces, produce el mismo deck.
 */

import path from 'node:path'
import fs from 'node:fs/promises'

// Barrel del primitive — cero deep-imports (TASK-1393: el motor vive en artifact-composer/).
import { composeArtifact, DeckValidationError, type DeckPlan } from '@/lib/artifact-composer'
import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'

const main = async () => {
  const [planPath, ...rest] = process.argv.slice(2)

  if (!planPath) {
    console.error('uso: pnpm tsx scripts/commercial/compose-tender-deck.ts <deck-plan.json> [--out <dir>]')
    process.exit(1)
  }

  const outFlag = rest.indexOf('--out')
  const outDir = outFlag >= 0 ? rest[outFlag + 1] : path.resolve(process.cwd(), '.captures/tender-deck')

  const deckPlan = JSON.parse(await fs.readFile(planPath, 'utf8')) as DeckPlan

  console.log(`\ncomponiendo "${deckPlan.tenderId}" — ${deckPlan.slides.length} láminas\n`)

  try {
    // El catálogo (plantillas + resolvers + validadores + outputTarget) es DATO del deck-axis;
    // el motor compone cualquier catálogo que satisfaga el contrato.
    const { slidePaths, pdfPath, pdfBytes, warnings } = await composeArtifact(deckAxisCatalog, deckPlan, outDir)

    for (const [i, slidePath] of slidePaths.entries()) {
      const slide = deckPlan.slides[i]!

      console.log(`  ✓ ${slide.contentType.padEnd(20)} → ${slide.template.padEnd(22)} ${path.basename(slidePath)}`)
    }

    // deck-axis emite `pdf-merged`: el PDF siempre existe acá; el guard es por el tipo del contrato.
    if (pdfPath && pdfBytes !== undefined) {
      console.log(`\n  📄 ${path.basename(pdfPath)} — ${slidePaths.length} páginas · ${(pdfBytes / 1_048_576).toFixed(1)} MB`)
    }

    console.log(`  deck-plan.json (artefacto auditable) + láminas PNG → ${outDir}\n`)

    for (const warning of warnings) {
      console.warn(`  ⚠️  ${warning}\n`)
    }
  } catch (error) {
    if (error instanceof DeckValidationError) {
      // El deck NO se emite parcialmente: o pasa entero, o no sale nada.
      console.error(`\n✗ ${error.message}\n`)
      process.exit(1)
    }

    throw error
  }
}

main().catch(error => {
  console.error('\n✗', error instanceof Error ? error.message : error, '\n')
  process.exit(1)
})
