/**
 * CLI genérico: genera la oferta económica en Excel brandeado desde un `economica.json`.
 *
 *   pnpm economica:build docs/commercial/tenders/<caso>/economica.json
 *
 * El `.xlsx` se emite junto al JSON (o en `data.output`). El código es reusable — cada licitación
 * es un JSON distinto. Motor: `lib/economic-offer-xlsx.mjs`. Schema del JSON: ver ese archivo.
 */

import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildEconomicOfferXlsx } from './lib/economic-offer-xlsx.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const arg = process.argv[2]

if (!arg) {
  console.error('Uso: pnpm economica:build <ruta a economica.json>')
  console.error('Ej.:  pnpm economica:build docs/commercial/tenders/sky-blog-2026/economica.json')
  process.exit(1)
}

const dataPath = isAbsolute(arg) ? arg : join(REPO, arg)
const data = JSON.parse(await readFile(dataPath, 'utf8'))

const outPath = isAbsolute(data.output ?? '')
  ? data.output
  : join(dirname(dataPath), data.output || 'propuesta-economica.xlsx')

const { rows } = await buildEconomicOfferXlsx({ data, repoRoot: REPO, outPath })

console.log(`✓ Oferta económica brandeada: ${outPath.replace(REPO + '/', '')} (${rows} filas)`)
