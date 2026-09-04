/**
 * Genera `src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts` desde el SSOT
 * `public/branding/SVG/isotipo-full-efeonce.svg` (TASK-1829). El emisor corre en Cloud Run sin
 * `public/`, así que el logo viaja como constante bundleada; el test de drift
 * (`pages/brand-assets.test.ts`) señala a este generador cuando el SVG cambia.
 *
 *   pnpm auth-server:brand-assets:generate
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SOURCE = join(ROOT, 'public/branding/SVG/isotipo-full-efeonce.svg')
const TARGET = join(ROOT, 'src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts')

const svg = readFileSync(SOURCE, 'utf8').replace(/^<\?xml[^>]*>\s*/u, '').trim()

const output = `// GENERATED FILE — no editar a mano. Fuente: public/branding/SVG/isotipo-full-efeonce.svg
// Regenerar: pnpm auth-server:brand-assets:generate (TASK-1829)

export const EFEONCE_ISOTIPO_SVG = ${JSON.stringify(svg)}
`

writeFileSync(TARGET, output)
console.log(`[auth-server] brand asset generated → ${TARGET} (${svg.length} chars)`)
