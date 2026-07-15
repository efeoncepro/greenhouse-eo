/**
 * [WRAPPER de compatibilidad] La oferta económica de SKY ahora se genera con el builder REUSABLE.
 *
 * Fuente de datos (SSOT):  docs/commercial/tenders/sky-blog-2026/economica.json
 * Comando canónico:        pnpm economica:build docs/commercial/tenders/sky-blog-2026/economica.json
 *
 * Antes este script tenía las cifras + el layout inline (SKY-hardcodeado). Se refactorizó al builder
 * domain-free `lib/economic-offer-xlsx.mjs` + un `economica.json` por deal — para poder emitir Excel
 * brandeados profesionales de CUALQUIER licitación con el mismo código. Este wrapper se mantiene por
 * compatibilidad y delega en el builder genérico.
 *
 * 🔴 REGLA (seo-aeo-practice → 04_PRICING #2): NUNCA un precio unitario por artículo. El schema no
 *    tiene ese campo; el valor es siempre "valor mensual/de la operación".
 */

import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildEconomicOfferXlsx } from './lib/economic-offer-xlsx.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DATA = join(REPO, 'docs/commercial/tenders/sky-blog-2026/economica.json')

const data = JSON.parse(await readFile(DATA, 'utf8'))
const outPath = join(dirname(DATA), data.output || 'propuesta-economica.xlsx')

await buildEconomicOfferXlsx({ data, repoRoot: REPO, outPath })
console.log(`✓ ${outPath.replace(REPO + '/', '')} (vía builder reusable; fuente: economica.json)`)
