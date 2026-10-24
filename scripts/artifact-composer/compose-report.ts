/**
 * CLI del informe A4 premium — compone un informe desde un plan JSON con el catálogo `insights-report`.
 *
 *   pnpm report:compose <plan.json> [--out <dir>] [--asset <clave>=<archivo>]…
 *
 * El plan declara INTENCIÓN por página (`contentType` + `slots`), nunca plantilla: el selector del catálogo
 * resuelve. Sirve para informes que no salen del pipeline de Insights (auditorías, diagnósticos) y que igual
 * deben verse como el informe aprobado. Es el resto determinista: no llama a ningún LLM ni a la red.
 *
 * `--asset` entrega assets externos autorizados que el plan referencia como `asset-ref:<clave>` (el logo del
 * cliente): el plan sella la referencia y el archivo llega como data URI. Una referencia sin archivo falla.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import { composeArtifact, DeckValidationError, type DeckPlan } from '@/lib/artifact-composer'
import { insightsReportCatalog } from '@/lib/artifact-composer/catalogs/insights-report'

const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
}

const readAsset = async (file: string): Promise<string> => {
  const mime = MIME[path.extname(file).toLowerCase()]

  if (!mime) throw new Error(`Asset «${file}»: formato no soportado (svg, png, jpg o webp).`)

  return `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`
}

const main = async () => {
  const [planPath, ...rest] = process.argv.slice(2)

  if (!planPath) {
    console.error('uso: pnpm report:compose <plan.json> [--out <dir>] [--asset <clave>=<archivo>]…')
    process.exit(1)
  }

  const outFlag = rest.indexOf('--out')
  const outDir = outFlag >= 0 ? path.resolve(rest[outFlag + 1]!) : path.resolve('.captures/report-compose')
  const externalAssets: Record<string, string> = {}

  rest.forEach((arg, index) => {
    if (arg !== '--asset') return

    const pair = rest[index + 1] ?? ''
    const eq = pair.indexOf('=')

    if (eq <= 0) throw new Error(`--asset espera <clave>=<archivo>; recibió «${pair}».`)

    externalAssets[pair.slice(0, eq)] = pair.slice(eq + 1)
  })

  for (const [key, file] of Object.entries(externalAssets)) externalAssets[key] = await readAsset(path.resolve(file))

  const plan = JSON.parse(await fs.readFile(planPath, 'utf8')) as DeckPlan

  console.log(`\ncomponiendo «${plan.tenderId}» — ${plan.slides.length} páginas\n`)

  try {
    const { slidePaths, pdfPath, pdfBytes, warnings } = await composeArtifact(insightsReportCatalog, plan, outDir, { externalAssets })

    slidePaths.forEach((slidePath, index) => {
      console.log(`  ✓ ${plan.slides[index]!.contentType.padEnd(26)} ${path.basename(slidePath)}`)
    })

    if (pdfPath && pdfBytes !== undefined) {
      console.log(`\n  ${path.basename(pdfPath)} — ${slidePaths.length} páginas · ${(pdfBytes / 1_048_576).toFixed(1)} MB → ${outDir}\n`)
    }

    for (const warning of warnings) console.warn(`  ⚠ ${warning}\n`)
  } catch (error) {
    if (error instanceof DeckValidationError) {
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
